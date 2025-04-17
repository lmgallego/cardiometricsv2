import { mean, std } from 'mathjs'

export default {
  data() {
    return {
      rawHistory:    [],
      history:       [],
      currentPeriod: [],
      totalArrays:   0,
      meanValue:     0,
      stdDevValue:   0,
      maxHistorySize: 300, // Store max 5x the typical RR intervals count
    }
  },
  methods: {
    addMetricValue(value) {
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
    },

    calculateMean() {
      if (this.rawHistory.length > 0) {
        this.meanValue = mean(this.rawHistory)
      } else {
        this.meanValue = 0
      }
    },

    calculateStdDev() {
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

