import RRIntCalculator from './RRIntCalculator'

export default class MxdmnCalculator extends RRIntCalculator {
  constructor(device, options = {}) {
    super(device, {
      ...options,
      unit: 'ms',
      precision: 2
    })
  }

  calculate() {
    const recentRrs = this.recentRrs

    if (recentRrs.length < 2) {
      return 0
    }

    const mean = this.calculateMean(recentRrs)
    const deviations = recentRrs.map(rri => Math.abs(rri - mean))
    return deviations.reduce((acc, val) => acc + val, 0) / deviations.length
  }
}

