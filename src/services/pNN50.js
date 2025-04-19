import RRInt from './RRInt'

export default class PNN50 extends RRInt {
  constructor(device, options = {}) {
    super(device, {
      ...options,
      unit: '%',
      precision: 2
    })
  }

  calculate() {
    // Use the calculateMetric method to simplify implementation
    return this.calculateMetric(this.calculatePNN50, this.recentRrs);
  }
} 