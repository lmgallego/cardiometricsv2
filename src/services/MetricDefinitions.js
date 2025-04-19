/**
 * Centralized definitions for all metrics including normal ranges and descriptions
 */

export const MetricDefinitions = {
  sdnn: {
    name: 'SDNN',
    description: 'Standard Deviation of NN Intervals',
    unit: 'ms',
    precision: 2,
    normalRange: {
      min: 30,
      max: 70,
      belowText: 'Low',
      normalText: 'Normal',
      aboveText: 'High'
    }
  },
  rmssd: {
    name: 'RMSSD',
    description: 'Root Mean Square of Successive Differences',
    unit: 'ms',
    precision: 2,
    normalRange: {
      min: 20,
      max: 60,
      belowText: 'Low',
      normalText: 'Normal',
      aboveText: 'High'
    }
  },
  pnn50: {
    name: 'pNN50',
    description: 'Percentage of NN intervals > 50ms',
    unit: '%',
    precision: 2,
    normalRange: {
      min: 5,
      max: 25,
      belowText: 'Low',
      normalText: 'Normal',
      aboveText: 'High'
    }
  },
  mxdmn: {
    name: 'MxDMn',
    description: 'Difference between max and min NN intervals',
    unit: 'ms',
    precision: 2,
    normalRange: {
      min: 100,
      max: 300,
      belowText: 'Low',
      normalText: 'Normal',
      aboveText: 'High'
    }
  },
  amo50: {
    name: 'AMo50',
    description: 'Amplitude of the mode with 50ms intervals',
    unit: '%',
    precision: 2,
    normalRange: {
      min: 20,
      max: 50,
      belowText: 'Low variability',
      normalText: 'Normal',
      aboveText: 'High variability'
    }
  },
  cv: {
    name: 'CV',
    description: 'Coefficient of Variation',
    unit: '',
    precision: 2,
    normalRange: {
      min: 5.3,
      max: 7.8,
      belowText: 'Strained',
      normalText: 'Normal',
      aboveText: 'High'
    }
  },
  totalPower: {
    name: 'Total Power',
    description: 'Total power of frequency spectrum',
    unit: 'ms²',
    precision: 0,
    normalRange: {
      min: 2999,
      max: 7999,
      belowText: 'Very poor',
      normalText: 'Normal',
      aboveText: 'Excellent'
    }
  },
  vlfPower: {
    name: 'VLF Power',
    description: 'Very Low Frequency power (Long-term Regulation)',
    unit: 'ms²',
    precision: 0,
    normalRange: {
      min: 300,
      max: 3000,
      belowText: 'Low',
      normalText: 'Normal',
      aboveText: 'High'
    }
  },
  lfPower: {
    name: 'LF Power',
    description: 'Low Frequency power (Sympathetic and Parasympathetic)',
    unit: 'ms²',
    precision: 0,
    normalRange: {
      min: 500,
      max: 2500,
      belowText: 'Low',
      normalText: 'Normal',
      aboveText: 'High'
    }
  },
  hfPower: {
    name: 'HF Power',
    description: 'High Frequency power (Parasympathetic)',
    unit: 'ms²',
    precision: 0,
    normalRange: {
      min: 100,
      max: 1000,
      belowText: 'Low',
      normalText: 'Normal',
      aboveText: 'High'
    }
  },
  lfhfRatio: {
    name: 'LF/HF Ratio',
    description: 'Ratio of Low to High Frequency power',
    unit: '',
    precision: 2,
    normalRange: {
      min: 0.5,
      max: 2.5,
      belowText: 'Parasympathetic dominance',
      normalText: 'Balanced',
      aboveText: 'Sympathetic dominance'
    }
  },
  qtc: {
    name: 'QTc',
    description: 'Corrected QT interval',
    unit: 'ms',
    precision: 0,
    normalRange: {
      min: 350,
      max: 450,
      belowText: 'Short',
      normalText: 'Normal',
      aboveText: 'Prolonged'
    }
  }
}

/**
 * Get the status text based on the value and normal range
 * @param {string} metricKey - The metric key
 * @param {number} value - The value to check
 * @returns {string} The status text
 */
export function getMetricStatus(metricKey, value) {
  const metric = MetricDefinitions[metricKey]
  if (!metric || !metric.normalRange) return ''
  
  const { min, max, belowText, normalText, aboveText } = metric.normalRange
  
  if (value < min) return belowText
  if (value > max) return aboveText
  return normalText
}

/**
 * Get the CSS class for a metric value based on normal range
 * @param {string} metricKey - The metric key
 * @param {number} value - The value to check
 * @returns {string} The CSS class name
 */
export function getMetricStatusClass(metricKey, value) {
  const metric = MetricDefinitions[metricKey]
  if (!metric || !metric.normalRange) return ''
  
  const { min, max } = metric.normalRange
  
  if (value < min) return 'text-red-500'
  if (value > max) return 'text-yellow-500'
  return 'text-green-500'
} 