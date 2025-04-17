import RRIntCalculator from './RRIntCalculator'
import { sqrt, mean } from 'mathjs'

export default class RmssdCalculator extends RRIntCalculator {
  constructor(device, options = {}) {
    super(device, {
      ...options,
      unit: 'ms',
      precision: 2
    })
  }

  calculate() {
    const recentRrs = this.recentRrs
    if (recentRrs.length >= 2) {
      const differences = recentRrs.slice(1).map((val, i) => val - recentRrs[i])
      const squaredDifferences = differences.map((diff) => diff * diff)
      const meanOfSquares = mean(squaredDifferences)
      return sqrt(meanOfSquares)
    }
    return 0
  }
}

