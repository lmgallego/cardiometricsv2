import RRIntCalculator from './RRIntCalculator'

export default class Pnn50Calculator extends RRIntCalculator {
  constructor(device, options = {}) {
    super(device, {
      ...options,
      unit: '%',
      precision: 2
    })
  }

  calculate() {
    // Using the shared method from MetricCalculator
    return this.calculatePNN50(this.recentRrs)
  }
}

