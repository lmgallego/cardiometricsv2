import RRInt from './RRInt'

export default class AMo50 extends RRInt {
  constructor(device, options = {}) {
    super(device, {
      ...options,
      unit: '%',
      precision: 2
    })
  }
  
  // Calculate AMo50 - percentage of intervals in the modal bin (50ms width)
  calculateAMo50(samples) {
    if (!samples || samples.length < 2) {
      return 0;
    }
    
    // Mode is the most common RR interval value
    // We need to group values into 50ms bins
    const binSize = 50;
    const bins = {};
    
    // Create histogram with 50ms bins
    samples.forEach(rr => {
      const bin = Math.floor(rr / binSize) * binSize;
      bins[bin] = (bins[bin] || 0) + 1;
    });
    
    // Find the most frequent bin (mode)
    let modeCount = 0;
    let modeValue = 0;
    Object.entries(bins).forEach(([bin, count]) => {
      if (count > modeCount) {
        modeCount = count;
        modeValue = parseInt(bin);
      }
    });
    
    // Amplitude of mode (AMo) - percentage of intervals in the modal bin
    return (modeCount / samples.length) * 100;
  }
  
  calculate() {
    // Use the calculateMetric method with our custom calculation function
    return this.calculateMetric(this.calculateAMo50, this.recentRrs);
  }
} 