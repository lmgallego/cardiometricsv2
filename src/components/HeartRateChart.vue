<template>
  <CardWrapper title="Heart Rate Over Time">
    <div ref="chart" style="width: 100%; height: 400px;"></div>
  </CardWrapper>
</template>

<script>
import Plotly from 'plotly.js-dist-min' // Ensure Plotly is installed via npm or yarn
import CardWrapper from './CardWrapper.vue'
import themeManager from '../services/ThemeManager.js'

export default {
  name: 'HeartRateChart',
  components: {
    CardWrapper
  },
  props: {
    device: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      heartRateData: [],
      timeData: [],
      startTime: null,
      plotInitialized: false,
      layout: {
        title: '',
        margin: { t: 10, r: 10, b: 50, l: 50 },
        xaxis: {
          title: 'Time (s)',
          range: [0, 300],
          showgrid: false,
          color: this.getTextColor()
        },
        yaxis: {
          title: 'Heart Rate (bpm)',
          range: [50, 220],
          showgrid: false,
          color: this.getTextColor()
        },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: {
          color: this.getTextColor()
        },
        shapes: [
          // Resting Zone
          {
            type: 'rect',
            xref: 'paper',
            x0: 0,
            x1: 1,
            y0: 50,
            y1: 100,
            fillcolor: 'rgba(173, 216, 230, 0.2)', // Light Blue
            line: { width: 0 },
            layer: 'below'
          },
          // Fat Burn Zone
          {
            type: 'rect',
            xref: 'paper',
            x0: 0,
            x1: 1,
            y0: 100,
            y1: 140,
            fillcolor: 'rgba(144, 238, 144, 0.2)', // Light Green
            line: { width: 0 },
            layer: 'below'
          },
          // Cardio Zone
          {
            type: 'rect',
            xref: 'paper',
            x0: 0,
            x1: 1,
            y0: 140,
            y1: 180,
            fillcolor: 'rgba(255, 160, 122, 0.2)', // Light Salmon
            line: { width: 0 },
            layer: 'below'
          },
          // Peak Zone
          {
            type: 'rect',
            xref: 'paper',
            x0: 0,
            x1: 1,
            y0: 180,
            y1: 220,
            fillcolor: 'rgba(255, 255, 102, 0.2)', // Light Yellow
            line: { width: 0 },
            layer: 'below'
          }
        ],
        annotations: [
          {
            xref: 'paper',
            yref: 'y',
            x: 0.02,
            y: 75,
            text: 'Resting',
            showarrow: false,
            font: { color: this.getTextColor(), size: 12 }
          },
          {
            xref: 'paper',
            yref: 'y',
            x: 0.02,
            y: 120,
            text: 'Fat Burn',
            showarrow: false,
            font: { color: this.getTextColor(), size: 12 }
          },
          {
            xref: 'paper',
            yref: 'y',
            x: 0.02,
            y: 160,
            text: 'Cardio',
            showarrow: false,
            font: { color: this.getTextColor(), size: 12 }
          },
          {
            xref: 'paper',
            yref: 'y',
            x: 0.02,
            y: 200,
            text: 'Peak',
            showarrow: false,
            font: { color: this.getTextColor(), size: 12 }
          }
        ]
      },
      plotData: [
        {
          x: [],
          y: [],
          type: 'scatter',
          mode: 'lines',
          name: 'Heart Rate',
          line: { color: '#17BECF' }
        },
        {
          x: [],
          y: [],
          type: 'scatter',
          mode: 'markers',
          name: 'Current Heart Rate',
          marker: { symbol: 'heart', size: 12, color: 'red' }
        }
      ],
      config: { 
        responsive: true, 
        displayModeBar: false 
      },
      subscription: null,
      themeListener: null
    }
  },
  methods: {
    getTextColor() {
      return themeManager.isDarkTheme() ? '#FFFFFF' : '#333333'
    },
    
    updateTheme() {
      // Update colors for dark/light theme
      this.layout.font.color = this.getTextColor()
      this.layout.xaxis.color = this.getTextColor()
      this.layout.yaxis.color = this.getTextColor()
      
      // Update annotation colors
      this.layout.annotations.forEach(annotation => {
        annotation.font.color = this.getTextColor()
      })
      
      // Redraw the plot if initialized
      if (this.plotInitialized) {
        Plotly.react(this.$refs.chart, this.plotData, this.layout, this.config)
      }
    },
    
    initializePlot() {
      Plotly.newPlot(this.$refs.chart, this.plotData, this.layout, this.config)
      this.plotInitialized = true
    },
    
    updateChart(hr) {
      const now = Date.now()
      if (!this.startTime) this.startTime = now
      const elapsedTime = (now - this.startTime) / 1000 // seconds

      this.heartRateData.push(hr)
      this.timeData.push(elapsedTime)

      // Keep only the last 300 seconds of data
      while (this.timeData.length > 300) {
        this.timeData.shift()
        this.heartRateData.shift()
      }

      // Update Heart Rate Trace
      this.plotData[0].x = [...this.timeData]
      this.plotData[0].y = [...this.heartRateData]

      // Update Current Heart Rate Marker
      this.plotData[1].x = [elapsedTime]
      this.plotData[1].y = [hr]

      // Adjust x-axis range to show the latest 300 seconds
      const xMin = Math.max(0, elapsedTime - 300)
      const xMax = xMin + 300
      this.layout.xaxis.range = [xMin, xMax]

      // Redraw the plot if initialized
      if (this.plotInitialized) {
        Plotly.react(this.$refs.chart, this.plotData, this.layout, this.config)
      } else {
        // If not initialized, initialize plot
        this.initializePlot()
      }
    },
    
    subscribeToHeartRate() {
      if (this.device && this.device.observeHeartRate) {
        this.subscription = this.device.observeHeartRate().subscribe(hr => {
          this.updateChart(hr)
        })
      } else {
        console.error('Device does not support observeHeartRate()')
      }
    },
    
    resetChart() {
      this.heartRateData = []
      this.timeData = []
      this.startTime = null
      this.plotData[0].x = []
      this.plotData[0].y = []
      this.plotData[1].x = []
      this.plotData[1].y = []
      this.layout.xaxis.range = [0, 300]

      if (this.plotInitialized) {
        Plotly.react(this.$refs.chart, this.plotData, this.layout, this.config)
      }
    }
  },
  watch: {
    device: {
      immediate: false,
      handler(newDevice) {
        this.resetChart()
        if (newDevice) {
          this.$nextTick(() => {
            this.initializePlot()
            this.subscribeToHeartRate()
          })
        }
      }
    }
  },
  mounted() {
    // If device is already provided at mount
    if (this.device) {
      this.initializePlot()
      this.subscribeToHeartRate()
    }
    
    // Listen for theme changes
    this.themeListener = (theme) => {
      this.updateTheme()
    }
    themeManager.addListener(this.themeListener)
  },
  beforeUnmount() {
    if (this.subscription) {
      this.subscription.unsubscribe()
      this.subscription = null
    }
    
    // Remove theme listener
    if (this.themeListener) {
      themeManager.removeListener(this.themeListener)
    }
    
    Plotly.purge(this.$refs.chart)
  }
}
</script>

<style scoped>
/* Optional: Customize the plot container */
div {
  width: 100%;
  height: 400px;
}
</style>
