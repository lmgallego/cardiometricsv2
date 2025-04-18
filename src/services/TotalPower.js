import FrequencyDomain from './FrequencyDomain'

export default class TotalPower extends FrequencyDomain {
  constructor(device, options = {}) {
    super(device, options)
  }

  calculate() {
    // Calculate total power by calling calculateBandPower once for the full range (VLF+LF+HF).
    // This avoids redundant calculations compared to summing separate band powers.
    // Note: Standard Total Power often includes 0-0.4Hz or similar.
    return this.calculateBandPower(this.recentRrs, 0.003, 0.4);
  }
} 