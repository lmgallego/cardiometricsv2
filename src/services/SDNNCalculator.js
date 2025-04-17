import RRIntCalculator from './RRIntCalculator'
import { std } from 'mathjs'

export default class SdnnCalculator extends RRIntCalculator {
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
      return std(recentRrs, 'uncorrected')
    }
    return 0
  }
}

