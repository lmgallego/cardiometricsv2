<template>
  <CardWrapper title="Accelerometer">
    <div ref="accelerometerChart" style="width: 100%; height: 400px;"></div>
  </CardWrapper>
</template>

<script>
import Plotly from 'plotly.js-dist-min'
import CardWrapper from './CardWrapper.vue'
import themeManager from '../services/ThemeManager.js'

export default {
  components: {
    CardWrapper
  },
  props: ['device'],
  data() {
    return {
      axData: [],
      ayData: [],
      azData: [],
      timeData: [],
      startTime: null,
      plotInitialized: false,
      layout: {
        title: '',
        margin: { t: 10, r: 10, b: 50, l: 50 },
        xaxis: {
          title: 'Time (s)',
          range: [0, 10],
          showgrid: true,
          zeroline: true,
          color: this.getTextColor()
        },
        yaxis: {
          title: 'Acceleration (g)',
          range: [-2, 2],
          showgrid: true,
          zeroline: true,
          color: this.getTextColor()
        },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: {
          color: this.getTextColor()
        },
        legend: {
          orientation: 'h'
        }
      },
      plotData: [
        {
          x: [],
          y: [],
          type: 'scatter',
          mode: 'lines',
          name: 'X',
          line: { color: 'red' }
        },
        {
          x: [],
          y: [],
          type: 'scatter',
          mode: 'lines',
          name: 'Y',
          line: { color: 'green' }
        },
        {
          x: [],
          y: [],
          type: 'scatter',
          mode: 'lines',
          name: 'Z',
          line: { color: 'blue' }
        }
      ],
      config: { responsive: true, displayModeBar: false },
      subscription: null,
      themeListener: null
    }
  },
  
  methods: {
    getTextColor() {
      return themeManager.isDarkTheme() ? '#FFFFFF' : '#333333'
    },
    
    updateTheme() {
      if (!this.plotInitialized || !this.$refs.accelerometerChart) return
      
      const update = {
        'xaxis.color': this.getTextColor(),
        'yaxis.color': this.getTextColor(),
        'font.color': this.getTextColor(),
        'paper_bgcolor': 'rgba(0,0,0,0)',
        'plot_bgcolor': 'rgba(0,0,0,0)'
      }
      
      Plotly.relayout(this.$refs.accelerometerChart, update)
    },
    
    initializePlot() {
      Plotly.newPlot(this.$refs.accelerometerChart, this.plotData, this.layout, this.config)
      this.plotInitialized = true
    },
    
    updateChart(data) {
      const now = Date.now()
      if (!this.startTime) this.startTime = now
      const elapsedTime = (now - this.startTime) / 1000 // seconds

      this.axData.push(data.x)
      this.ayData.push(data.y)
      this.azData.push(data.z)
      this.timeData.push(elapsedTime)

      // Keep only the last 100 data points
      if (this.timeData.length > 100) {
        this.timeData.shift()
        this.axData.shift()
        this.ayData.shift()
        this.azData.shift()
      }

      // Update traces
      this.plotData[0].x = [...this.timeData]
      this.plotData[0].y = [...this.axData]
      this.plotData[1].x = [...this.timeData]
      this.plotData[1].y = [...this.ayData]
      this.plotData[2].x = [...this.timeData]
      this.plotData[2].y = [...this.azData]

      // Adjust x-axis range to show the latest 10 seconds
      if (this.timeData.length > 0) {
        const latestTime = this.timeData[this.timeData.length - 1]
        const xMin = Math.max(0, latestTime - 10)
        const xMax = latestTime
        this.layout.xaxis.range = [xMin, xMax]
      }

      // Redraw the plot if initialized
      if (this.plotInitialized) {
        Plotly.react(this.$refs.accelerometerChart, this.plotData, this.layout, this.config)
      } else {
        this.initializePlot()
      }
    },
    
    subscribeToAccelerometer() {
      if (this.device && this.device.observeAccelerometer) {
        this.subscription = this.device.observeAccelerometer().subscribe(data => {
          this.updateChart(data)
        })
      } else {
        console.error('Device does not support observeAccelerometer()')
      }
    },
    
    resetChart() {
      this.axData = []
      this.ayData = []
      this.azData = []
      this.timeData = []
      this.startTime = null
      this.plotData[0].x = []
      this.plotData[0].y = []
      this.plotData[1].x = []
      this.plotData[1].y = []
      this.plotData[2].x = []
      this.plotData[2].y = []
      this.layout.xaxis.range = [0, 10]

      if (this.plotInitialized) {
        Plotly.react(this.$refs.accelerometerChart, this.plotData, this.layout, this.config)
      }
    }
  },
  
  watch: {
    device: {
      immediate: true,
      handler(newDevice, oldDevice) {
        // Clean up previous device
        if (this.subscription) {
          this.subscription.unsubscribe()
          this.subscription = null
        }
        
        this.resetChart()
        
        if (newDevice) {
          this.$nextTick(() => {
            this.initializePlot()
            this.subscribeToAccelerometer()
          })
        }
      }
    }
  },
  
  mounted() {
    // Initialize plot
    this.initializePlot()
    
    // Subscribe to accelerometer if device is already available
    if (this.device) {
      this.subscribeToAccelerometer()
    }
    
    // Listen for theme changes
    this.themeListener = (theme) => {
      this.updateTheme()
    }
    themeManager.addListener(this.themeListener)
  },
  
  beforeDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe()
      this.subscription = null
    }
    
    // Remove theme listener
    if (this.themeListener) {
      themeManager.removeListener(this.themeListener)
    }
    
    if (this.plotInitialized && this.$refs.accelerometerChart) {
      Plotly.purge(this.$refs.accelerometerChart)
    }
  }
}
</script>

<style scoped>
/* Ensure consistent sizing */
div {
  width: 100%;
}
</style>

