import RRIntCalculator from './RRIntCalculator'
import { mean, std } from 'mathjs'

export default class CvCalculator extends RRIntCalculator {
  constructor(device, options = {}) {
    super(device, {
      ...options,
      unit: '%',
      precision: 2
    })
  }

  calculate() {
    const recentRrs = this.recentRrs

    if (recentRrs.length < 2) {
      return 0
    }

    const meanRR = mean(recentRrs)
    const stdDev = std(recentRrs, 'uncorrected')

    if (meanRR === 0) {
      return 0
    }
    
    return (stdDev / meanRR) * 100
  }
}

