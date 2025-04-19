import FrequencyDomain from './FrequencyDomain'
import LFPower from './LFPower'
import HFPower from './HFPower'

export default class LFHFRatio extends FrequencyDomain {
  constructor(device, options = {}) {
    super(device, {
      ...options,
      unit: '',  // No unit for ratio
      precision: 2
    })
    
    // Initialize metric calculators
    this.lfPowerCalculator = new LFPower(device, options)
    this.hfPowerCalculator = new HFPower(device, options)
    
    // Initialize value
    this.value = 0;
  }

  handleRrInterval(rri) {
    // Make sure RRInt's handleRrInterval is called to manage data
    super.handleRrInterval(rri);
    
    // Calculate and emit new value on every RR interval as long as we have enough data
    if (this.recentRrs && this.recentRrs.length >= 5) {
      this.value = this.calculate();
      this.valueSubject.next(this.value);
    }
  }

  // Calculate LF/HF ratio using the power in each band
  calculateLFHFRatio(samples) {
    if (!samples || samples.length < this.minRRIntervals) {
      return 0;
    }

    // Calculate the powers in the LF and HF bands
    const lfPower = this.calculateBandPower(samples, 0.04, 0.15);
    const hfPower = this.calculateBandPower(samples, 0.15, 0.40);

    // Safety check to avoid division by zero
    if (hfPower === 0) {
      return 0;
    }

    // Calculate the LF/HF ratio
    return lfPower / hfPower;
  }

  calculate() {
    // Use the calculateMetric method with our custom calculation function
    return this.calculateMetric(this.calculateLFHFRatio, this.recentRrs);
  }
  
  // Clean up all resources
  destroy() {
    try {
      super.destroy();
      
      // Clean up calculator instances
      if (this.lfPowerCalculator) this.lfPowerCalculator.destroy();
      if (this.hfPowerCalculator) this.hfPowerCalculator.destroy();
    } catch (e) {
      console.warn('Error destroying LFHFRatio:', e.message);
    }
  }
} 