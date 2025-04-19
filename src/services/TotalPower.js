import FrequencyDomain from './FrequencyDomain'

export default class TotalPower extends FrequencyDomain {
  constructor(device, options = {}) {
    super(device, options)
  }

  calculate() {
    // Total power across all frequency bands (0.003-0.4 Hz)
    // This reflects the overall autonomic activity
    return this.calculateMetric(this.calculateBandPower, this.recentRrs, 0.003, 0.4);
  }
} 