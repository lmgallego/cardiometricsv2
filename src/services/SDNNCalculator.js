import RRIntCalculator from './RRIntCalculator'

export default class SdnnCalculator extends RRIntCalculator {
  constructor(device, options = {}) {
    super(device, {
      ...options,
      unit: 'ms',
      precision: 2
    })
  }

  calculate() {
    // Using the shared method from MetricCalculator
    return this.calculateStdDev(this.recentRrs)
  }
}

