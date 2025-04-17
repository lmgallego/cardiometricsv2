import RRIntCalculator from './RRIntCalculator'

export default class AMo50Calculator extends RRIntCalculator {
  constructor(device, options = {}) {
    super(device, {
      ...options,
      unit: '%',
      precision: 2
    })
  }

  calculate() {
    const recentRrs = this.recentRrs

    if (recentRrs.length === 0) {
      return 0
    }

    const sum = recentRrs.reduce((acc, val) => acc + val, 0)
    const meanRR = sum / recentRrs.length

    const count = recentRrs.filter(rri => Math.abs(rri - meanRR) > 50).length

    return (count / recentRrs.length) * 100
  }
}

