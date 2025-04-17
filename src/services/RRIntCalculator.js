import BaseCalculator from './BaseCalculator'

export default class RRIntCalculator extends BaseCalculator {
  constructor(device, options = {}) {
    super(device, options)
    this.pulsesNumber = options.rrIntervals || 100
    this.maxRRIntervals = options.maxRRIntervals || 1000
    this.data = []
    this.unit = options.unit || 'ms'
    this.precision = options.precision || 2
  }

  setupSubscription() {
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
      this.addRrInterval(rri)
      const value = this.calculate()
      this.valueSubject.next(value)
    }
  }

  validateRrInterval(rri) {
    return rri >= 300 && rri <= 2000
  }

  addRrInterval(rri) {
    this.data.push(rri)
    if (this.data.length > this.maxRRIntervals) {
      this.data.shift()
    }
  }

  /**
   * Provides the most recent R-R intervals based on pulsesNumber.
   * Subclasses can access this.recentRrs directly.
   */
  get recentRrs() {
    const n = Math.min(this.pulsesNumber, this.data.length)
    return this.data.slice(-n)
  }

  // Override in child classes
  calculate() {
    throw new Error('calculate() must be implemented by subclass')
    return 0
  }

  // For backward compatibility
  getMetricObservable() {
    // Initialize subscription if it doesn't exist
    if (!this.subscription) {
      this.subscribe()
    }
    return this.valueSubject.asObservable()
  }
}

