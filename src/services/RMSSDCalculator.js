import RRIntCalculator from './RRIntCalculator'

export default class RmssdCalculator extends RRIntCalculator {
  constructor(device, options = {}) {
    super(device, {
      ...options,
      unit: 'ms',
      precision: 2
    })
  }

  calculate() {
    // Using the shared method from MetricCalculator
    return this.calculateRMSSD(this.recentRrs)
  }
}

