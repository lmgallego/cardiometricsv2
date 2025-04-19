import RRInt from './RRInt'

export default class CV extends RRInt {
  constructor(device, options = {}) {
    super(device, {
      ...options,
      unit: '%',
      precision: 2
    })
  }

  calculate() {
    // Use the calculateMetric method to simplify implementation
    return this.calculateMetric(this.calculateCV, this.recentRrs);
  }
} 