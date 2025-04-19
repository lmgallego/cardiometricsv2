import RRInt from './RRInt'

export default class RMSSD extends RRInt {
  constructor(device, options = {}) {
    super(device, {
      ...options,
      unit: 'ms',
      precision: 2
    })
  }

  calculate() {
    // Use the calculateMetric method to simplify implementation
    return this.calculateMetric(this.calculateRMSSD, this.recentRrs);
  }
} 