import MetricCalculator from './MetricCalculator'
import { sqrt } from 'mathjs'
import EcgService from './Ecg.js'

export default class QtcCalculator extends MetricCalculator {
  constructor(device, options = {}) {
    super(device, {
      ...options,
      unit: 'ms',
      precision: 0
    })
    
    this.pulsesNumber = options.rrIntervals || 100
    
    // Initialize services
    this.ecgService = null
    
    // Data storage
    this.rrIntervals = []
    this.qtIntervals = []
    
    // Additional subscription
    this.qtIntervalSubscription = null
  }

  setupSubscription() {
    // Initialize ECG service
    this.ecgService = new EcgService(this.device)
    
    // Subscribe to QT interval observable
    this.qtIntervalSubscription = this.ecgService
      .getQtIntervalObservable()
      .subscribe(data => {
        this.handleQtInterval(data.qtInterval)
      })
    
    // Subscribe to RR interval observable
    if (this.device && this.device.observeRRInterval) {
      this.subscription = this.device
        .observeRRInterval()
        .subscribe((rri) => this.handleRrInterval(rri))
    } else {
      console.error('Device does not support observeRRInterval().')
    }
  }

  handleRrInterval(rri) {
    if (this.validateRrInterval(rri)) {
      this.rrIntervals.push(rri)
      
      // Keep only the most recent RR intervals based on pulsesNumber
      if (this.rrIntervals.length > this.pulsesNumber) {
        this.rrIntervals.shift()
      }
      
      // If we have QT intervals, calculate QTc
      if (this.qtIntervals && this.qtIntervals.length > 0) {
        const value = this.calculate()
        this.valueSubject.next(value)
      }
    }
  }
  
  handleQtInterval(qtInterval) {
    if (!this.qtIntervals) {
      this.qtIntervals = []
    }
    
    this.qtIntervals.push(qtInterval)
    if (this.qtIntervals.length > this.pulsesNumber) {
      this.qtIntervals.shift()
    }
    
    // If we have RR intervals, calculate QTc
    if (this.rrIntervals && this.rrIntervals.length > 0) {
      const value = this.calculate()
      this.valueSubject.next(value)
    }
  }

  validateRrInterval(rri) {
    return rri >= 300 && rri <= 2000
  }

  calculate() {
    // Need both QT intervals and RR intervals to calculate QTc
    if (!this.qtIntervals || !this.rrIntervals || 
        this.qtIntervals.length === 0 || this.rrIntervals.length === 0) {
      return 0
    }
    
    // Get the most recent QT and RR interval
    const recentQtInterval = this.qtIntervals[this.qtIntervals.length - 1]
    const recentRrInterval = this.rrIntervals[this.rrIntervals.length - 1]
    
    // Bazett's formula: QTc = QT / √(RR)
    // RR is in ms, so convert to seconds
    const rrInSeconds = recentRrInterval / 1000
    return recentQtInterval / sqrt(rrInSeconds)
  }

  destroy() {
    // Clean up QT interval subscription
    if (this.qtIntervalSubscription) {
      this.qtIntervalSubscription.unsubscribe()
      this.qtIntervalSubscription = null
    }
    
    // Destroy ECG service
    if (this.ecgService) {
      this.ecgService.destroy()
      this.ecgService = null
    }
    
    // Call parent destroy to clean up other resources
    super.destroy()
  }
} 