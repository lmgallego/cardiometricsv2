import { mean, std } from 'mathjs'
import { metrics } from '../services/store'

export default {
  data() {
    return {
      metrics: metrics,
      rawHistory:    [],
      history:       [],
      currentPeriod: [],
      totalArrays:   0,
      meanValue:     0,
      stdDevValue:   0,
      maxHistorySize: 300, // Store max 5x the typical RR intervals count
    }
  },
  
  computed: {
    // Map metric name to metrics store key for components using MetricMixin
    metricKey() {
      if (!this.calculatorClass) return null;
      
      // Get class name and convert to store key format
      const className = this.calculatorClass.name.toLowerCase();
      
      if (className === 'sdnn') return 'sdnn';
      if (className === 'rmssd') return 'rmssd';
      if (className === 'pnn50') return 'pnn50';
      if (className === 'cv') return 'cv';
      if (className === 'qtc') return 'qtc';
      if (className === 'mxdmn') return 'mxdmn';
      if (className === 'amo50') return 'amo50';
      if (className === 'totalpower') return 'totalPower';
      if (className === 'vlfpower') return 'vlfPower';
      if (className === 'lfpower') return 'lfPower';
      if (className === 'hfpower') return 'hfPower';
      if (className === 'lfhfratio') return 'lfhfRatio';
      
      return null;
    },
    
    // Check if the metric values are already available in the store
    isMetricAvailable() {
      return this.metricKey && 
        this.metricKey in this.metrics && 
        this.metrics[this.metricKey] !== 0;
    }
  },
  
  methods: {
    addMetricValue(value) {
      // Check if we can use the store for this metric
      if (this.isMetricAvailable && this.metricKey) {
        // Get values from store
        this.meanValue = this.metrics.means[this.metricKey] || 0;
        this.stdDevValue = this.metrics.stdDevs[this.metricKey] || 0;
      } else {
        // Otherwise maintain local history for calculations
        this.rawHistory.push(value)
        
        // Limit raw history size to prevent excessive memory usage
        // and to keep standard deviation more relevant to recent values
        if (this.rawHistory.length > this.maxHistorySize) {
          this.rawHistory.shift()
        }
        
        this.currentPeriod.push(value)
        if (this.currentPeriod.length === this.opts.rrIntervals) {
          this.history.push([...this.currentPeriod])
          this.totalArrays = this.history.length
          this.currentPeriod = []
        }
        this.calculateMean()
        this.calculateStdDev()
      }
    },

    calculateMean() {
      // Use store value if available
      if (this.isMetricAvailable && this.metricKey) {
        this.meanValue = this.metrics.means[this.metricKey] || 0;
        return;
      }
      
      // Otherwise calculate locally
      if (this.rawHistory.length > 0) {
        this.meanValue = mean(this.rawHistory)
      } else {
        this.meanValue = 0
      }
    },

    calculateStdDev() {
      // Use store value if available
      if (this.isMetricAvailable && this.metricKey) {
        this.stdDevValue = this.metrics.stdDevs[this.metricKey] || 0;
        return;
      }
      
      // Only use the most recent values matching the calculator window
      const recentValues = this.getRecentValues(this.opts.rrIntervals)
      if (recentValues.length > 1) {
        this.stdDevValue = std(recentValues)
      } else {
        this.stdDevValue = 0
      }
    },
    
    getRecentValues(count) {
      const n = Math.min(count, this.rawHistory.length)
      return this.rawHistory.slice(-n)
    },

    reconstructHistory() {
      // Skip if we can use store values instead
      if (this.isMetricAvailable && this.metricKey) {
        return;
      }
      
      this.history = []
      this.currentPeriod = []
      this.totalArrays = 0
      this.maxHistorySize = this.opts.rrIntervals * 5
      
      const interval = this.opts.rrIntervals
      const totalValues = this.rawHistory.length

      // Trim rawHistory if needed after rrIntervals change
      if (this.rawHistory.length > this.maxHistorySize) {
        this.rawHistory = this.rawHistory.slice(-this.maxHistorySize)
      }

      for (let i = 0; i < totalValues; i += interval) {
        const slice = this.rawHistory.slice(i, i + interval)
        if (slice.length === interval) {
          this.history.push([...slice])
          this.totalArrays += 1
        } else {
          this.currentPeriod = [...slice]
        }
      }

      this.calculateMean()
      this.calculateStdDev()
    },

    resetHistory() {
      this.rawHistory = []
      this.history = []
      this.currentPeriod = []
      this.totalArrays = 0
      this.meanValue = 0
      this.stdDevValue = 0
    }
  },
  watch: {
    'opts.rrIntervals'(newVal) {
      this.maxHistorySize = newVal * 5
      this.reconstructHistory()
    }
  },
  created() {
    this.maxHistorySize = this.opts?.rrIntervals * 5 || 300
  }
}

