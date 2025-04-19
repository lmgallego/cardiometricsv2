import RRInt from './RRInt'

export default class SDNN extends RRInt {
  constructor(device, options = {}) {
    super(device, {
      ...options,
      unit: 'ms',
      precision: 2
    })
  }

  calculate() {
    // Use the calculateMetric method to simplify implementation
    return this.calculateMetric(this.calculateStdDev, this.recentRrs);
  }
} 