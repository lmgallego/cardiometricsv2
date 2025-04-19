<template>
  <CardWrapper title="ECG Waveform">
    <div ref="ecgChart" style="width: 100%; height: 400px;"></div>
  </CardWrapper>
</template>

<script>
import log from '@/log'
import Plotly from 'plotly.js-dist-min'
import EcgService from '../services/Ecg.js'
import CardWrapper from './CardWrapper.vue'
import themeManager from '../services/ThemeManager.js'

export default {
  components: {
    CardWrapper
  },
  data() {
    return {
      ecgData: [],
      ecgTime: [],
      plotInitialized: false,
      maxPoints: 1000, // Maximum number of points to display
      updateInterval: 200, // Chart update interval in milliseconds
      ecgService: null,
      ecgSubscription: null,
      rPeakSubscription: null,
      qPointSubscription: null,
      tEndSubscription: null,
      rPeaks: [], // For visualization of R peaks
      qPoints: [], // For visualization
      tEndPoints: [], // For visualization
      updateTimer: null, // Timer for scheduled chart updates
      themeListener: null // For theme changes
    }
  },
  props: ['device'],

  watch: {
    device: {
      immediate: true,
      handler(newDevice, oldDevice) {
        this.cleanup();
        
        if (this.device) {
          // Initialize the ECG service
          this.ecgService = new EcgService(this.device);
          
          // Subscribe to ECG data
          this.ecgSubscription = this.ecgService
            .getEcgObservable()
            .subscribe(data => this.handleEcgData(data));
            
          // Subscribe to R peaks for visualization
          this.rPeakSubscription = this.ecgService
            .getRPeakObservable()
            .subscribe(data => this.handleRPeak(data));
            
          // Subscribe to Q points for visualization
          this.qPointSubscription = this.ecgService
            .getQPointObservable()
            .subscribe(data => this.handleQPoint(data));
            
          // Subscribe to T-end points for visualization
          this.tEndSubscription = this.ecgService
            .getTEndObservable()
            .subscribe(data => this.handleTEnd(data));
        }
      }
    }
  },

  mounted() {
    this.initializePlot();
    // Start the timer to update the chart at regular intervals
    this.updateTimer = setInterval(this.updatePlot, this.updateInterval);
    
    // Listen for theme changes
    this.themeListener = (theme) => {
      this.updateTheme();
    };
    themeManager.addListener(this.themeListener);
  },

  beforeDestroy() {
    this.cleanup();
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    
    // Remove theme listener
    if (this.themeListener) {
      themeManager.removeListener(this.themeListener);
    }
  },
  
  methods: {
    getTextColor() {
      return themeManager.isDarkTheme() ? '#FFFFFF' : '#333333';
    },
    
    updateTheme() {
      if (!this.plotInitialized || !this.$refs.ecgChart) return;
      
      const update = {
        'xaxis.color': this.getTextColor(),
        'yaxis.color': this.getTextColor(),
        'font.color': this.getTextColor(),
        'paper_bgcolor': 'rgba(0,0,0,0)',
        'plot_bgcolor': 'rgba(0,0,0,0)'
      };
      
      Plotly.relayout(this.$refs.ecgChart, update);
    },
    
    cleanup() {
      // Clean up subscriptions
      if (this.ecgSubscription) {
        this.ecgSubscription.unsubscribe();
        this.ecgSubscription = null;
      }
      
      if (this.rPeakSubscription) {
        this.rPeakSubscription.unsubscribe();
        this.rPeakSubscription = null;
      }
      
      if (this.qPointSubscription) {
        this.qPointSubscription.unsubscribe();
        this.qPointSubscription = null;
      }
      
      if (this.tEndSubscription) {
        this.tEndSubscription.unsubscribe();
        this.tEndSubscription = null;
      }
      
      // Clean up service
      if (this.ecgService) {
        this.ecgService.destroy();
        this.ecgService = null;
      }
      
      // Reset data arrays
      this.ecgData = [];
      this.ecgTime = [];
      this.rPeaks = [];
      this.qPoints = [];
      this.tEndPoints = [];
    },
    
    handleEcgData(data) {
      // Add new samples to the arrays
      this.ecgData.push(...data.samples);
      this.ecgTime.push(...data.times);
      
      // Limit the length of the data arrays to maxPoints
      if (this.ecgData.length > this.maxPoints) {
        const removeCount = this.ecgData.length - this.maxPoints;
        this.ecgData.splice(0, removeCount);
        this.ecgTime.splice(0, removeCount);
        
        // Also adjust point indices
        this.rPeaks = this.rPeaks.filter(point => point.index >= removeCount)
          .map(point => ({ ...point, index: point.index - removeCount }));
        
        this.qPoints = this.qPoints.filter(point => point.index >= removeCount)
          .map(point => ({ ...point, index: point.index - removeCount }));
        
        this.tEndPoints = this.tEndPoints.filter(point => point.index >= removeCount)
          .map(point => ({ ...point, index: point.index - removeCount }));
      }
    },
    
    handleRPeak(data) {
      // Store R peak for visualization
      const relativeIndex = this.ecgData.length - (this.ecgService.ecgSamples.length - data.index);
      if (relativeIndex >= 0 && relativeIndex < this.ecgData.length) {
        this.rPeaks.push({
          index: relativeIndex,
          time: this.ecgTime[relativeIndex],
          value: this.ecgData[relativeIndex]
        });
        
        // Limit number of points stored
        if (this.rPeaks.length > 10) {
          this.rPeaks.shift();
        }
      }
    },
    
    handleQPoint(data) {
      // Store Q point for visualization
      const relativeIndex = this.ecgData.length - (this.ecgService.ecgSamples.length - data.index);
      if (relativeIndex >= 0 && relativeIndex < this.ecgData.length) {
        this.qPoints.push({
          index: relativeIndex,
          time: this.ecgTime[relativeIndex],
          value: this.ecgData[relativeIndex]
        });
        
        // Limit number of points stored
        if (this.qPoints.length > 5) {
          this.qPoints.shift();
        }
      }
    },
    
    handleTEnd(data) {
      // Store T-end point for visualization
      const relativeIndex = this.ecgData.length - (this.ecgService.ecgSamples.length - data.index);
      if (relativeIndex >= 0 && relativeIndex < this.ecgData.length) {
        this.tEndPoints.push({
          index: relativeIndex,
          time: this.ecgTime[relativeIndex],
          value: this.ecgData[relativeIndex]
        });
        
        // Limit number of points stored
        if (this.tEndPoints.length > 5) {
          this.tEndPoints.shift();
        }
      }
    },

    initializePlot() {
      const ecgTrace = {
        x: this.ecgTime,
        y: this.ecgData,
        type: 'scatter',
        mode: 'lines',
        name: 'ECG Signal',
        line: { color: 'red', width: 1 }
      };
      
      const rPeaksTrace = {
        x: [],
        y: [],
        type: 'scatter',
        mode: 'markers',
        name: 'R Peaks',
        marker: { color: 'purple', size: 10, symbol: 'circle' }
      };
      
      const qPointsTrace = {
        x: [],
        y: [],
        type: 'scatter',
        mode: 'markers',
        name: 'Q Points',
        marker: { color: 'blue', size: 8, symbol: 'circle' }
      };
      
      const tEndPointsTrace = {
        x: [],
        y: [],
        type: 'scatter',
        mode: 'markers',
        name: 'T-end Points',
        marker: { color: 'green', size: 8, symbol: 'circle' }
      };
      
      const layout = {
        title: '',
        margin: { t: 10, r: 10, b: 50, l: 50 },
        xaxis: {
          title: 'Time (s)',
          range: [0, 5], // Initial range
          showgrid: true,
          zeroline: false,
          color: this.getTextColor()
        },
        yaxis: {
          title: 'Amplitude (µV)',
          showgrid: true,
          zeroline: false,
          color: this.getTextColor()
        },
        legend: {
          orientation: 'h'
        },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: {
          color: this.getTextColor()
        }
      };
      
      Plotly.newPlot(this.$refs.ecgChart, [ecgTrace, rPeaksTrace, qPointsTrace, tEndPointsTrace], layout, { responsive: true });
      this.plotInitialized = true;
    },
    
    updatePlot() {
      if (!this.plotInitialized || !this.$refs.ecgChart || this.ecgData.length === 0) return;
      
      const update = {
        x: [this.ecgTime, [], [], []],
        y: [this.ecgData, [], [], []]
      };
      
      // Add R peaks
      update.x[1] = this.rPeaks.map(p => p.time);
      update.y[1] = this.rPeaks.map(p => p.value);
      
      // Add Q points
      update.x[2] = this.qPoints.map(p => p.time);
      update.y[2] = this.qPoints.map(p => p.value);
      
      // Add T-end points
      update.x[3] = this.tEndPoints.map(p => p.time);
      update.y[3] = this.tEndPoints.map(p => p.value);
      
      // Update x-axis range to show the latest 5 seconds of data
      if (this.ecgTime.length > 0) {
        const latestTime = this.ecgTime[this.ecgTime.length - 1];
        const xMin = Math.max(0, latestTime - 5);
        const xMax = latestTime;
        
        Plotly.relayout(this.$refs.ecgChart, {
          'xaxis.range': [xMin, xMax]
        });
      }
      
      Plotly.update(this.$refs.ecgChart, update, {});
    }
  }
}
</script>

<style scoped>
/* Ensure consistent height */
div {
  width: 100%;
}
</style>

