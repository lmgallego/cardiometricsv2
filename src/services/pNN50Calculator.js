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
    const recentRrs = this.recentRrs
    if (recentRrs.length >= 2) {
      const differences = recentRrs.slice(1).map((val, i) => Math.abs(val - recentRrs[i]))
      const count = differences.filter(diff => diff > 50).length
      return (count / differences.length) * 100
    }
    return 0
  }
}

