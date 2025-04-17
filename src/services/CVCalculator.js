import RRIntCalculator from './RRIntCalculator'

export default class CvCalculator extends RRIntCalculator {
  constructor(device, options = {}) {
    super(device, {
      ...options,
      unit: '%',
      precision: 2
    })
  }

  calculate() {
    // Using the shared method from MetricCalculator
    return this.calculateCV(this.recentRrs)
  }
}

