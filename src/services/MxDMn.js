import RRInt from './RRInt'

export default class MxDMn extends RRInt {
  constructor(device, options = {}) {
    super(device, {
      ...options,
      unit: 'ms',
      precision: 2
    })
  }

  // Calculate MxDMn - difference between max and min RR intervals
  calculateMxDMn(samples) {
    if (!samples || samples.length < 2) {
      return 0;
    }
    
    const max = Math.max(...samples);
    const min = Math.min(...samples);
    
    return max - min;
  }

  calculate() {
    // Use the calculateMetric method with our custom calculation function
    return this.calculateMetric(this.calculateMxDMn, this.recentRrs);
  }
} 