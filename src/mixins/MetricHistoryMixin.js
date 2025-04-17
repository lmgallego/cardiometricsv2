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
    }
  },
  methods: {
    addMetricValue(value) {
      this.rawHistory.push(value)
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
      if (this.rawHistory.length > 1) {
        this.stdDevValue = std(this.rawHistory)
      } else {
        this.stdDevValue = 0
      }
    },

    reconstructHistory() {
      this.history = []
      this.currentPeriod = []
      this.totalArrays = 0

      const interval = this.opts.rrIntervals
      const totalValues = this.rawHistory.length

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
      this.reconstructHistory()
    }
  }
}

