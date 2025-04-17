<template>
  <div>
    <h4>ECG</h4>
    <div ref="ecgChart"></div>
  </div>
</template>

<script>
import log from '@/log'
import Plotly from 'plotly.js-dist-min'
import EcgService from '../services/Ecg.js'

export default {
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
      updateTimer: null // Timer for scheduled chart updates
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
  },

  beforeDestroy() {
    this.cleanup();
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
  },
  
  methods: {
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
        title: 'ECG Waveform with Q, R & T Points',
        xaxis: {
          title: 'Time (s)',
          range: [0, 5], // Initial range
          showgrid: true,
          zeroline: false
        },
        yaxis: {
          title: 'Amplitude (µV)',
          showgrid: true,
          zeroline: false
        },
        legend: {
          orientation: 'h'
        }
      };
      
      Plotly.newPlot(this.$refs.ecgChart, [ecgTrace, rPeaksTrace, qPointsTrace, tEndPointsTrace], layout, { responsive: true });
      this.plotInitialized = true;
    },

    updatePlot() {
      if (!this.plotInitialized || this.ecgData.length === 0) {
        return; // Nothing to update
      }

      // Prepare point data for plotting
      const rPeaksX = this.rPeaks.map(p => p.time);
      const rPeaksY = this.rPeaks.map(p => p.value);
      
      const qPointsX = this.qPoints.map(p => p.time);
      const qPointsY = this.qPoints.map(p => p.value);
      
      const tEndPointsX = this.tEndPoints.map(p => p.time);
      const tEndPointsY = this.tEndPoints.map(p => p.value);

      // Update the chart with new data
      const update = {
        x: [this.ecgTime, rPeaksX, qPointsX, tEndPointsX],
        y: [this.ecgData, rPeaksY, qPointsY, tEndPointsY]
      };

      // Update the x-axis range to keep the latest data in view
      const latestTime = this.ecgTime[this.ecgTime.length - 1];
      const xRangeStart = Math.max(0, latestTime - 5);
      const xRangeEnd = latestTime;

      try {
        Plotly.update(this.$refs.ecgChart, update, {
          xaxis: {
            range: [xRangeStart, xRangeEnd]
          }
        });
      } catch (error) {
        console.error('Error updating Plotly chart:', error);
      }
    }
  }
}
</script>

