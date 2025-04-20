<template>
  <div class="ecg-chart-container">
    <!-- Time label if needed -->
    <div v-if="showLabel" class="time-label">
      {{ startTime.toFixed(1) }}s - {{ endTime.toFixed(1) }}s
      <span v-if="showPointCount" class="point-count">({{ displayPoints.length }} pts)</span>
    </div>
    
    <svg 
      :width="width" 
      :height="height"
      :viewBox="`0 0 ${width} ${height}`"
      preserveAspectRatio="none"
      class="ecg-svg"
      :class="{ 'history-view': chartType === 'history' }">
      
      <!-- Background for history view -->
      <rect v-if="chartType === 'history'" x="0" y="0" :width="width" :height="height" fill="rgba(0,10,20,0.5)" />
      
      <!-- Grid lines -->
      <g class="grid-lines">
        <!-- Horizontal grid lines -->
        <line v-for="line in horizontalGridLines" :key="`h-${line.y}`"
              x1="0" :x2="width" 
              :y1="line.y" :y2="line.y" 
              :stroke="gridColor" stroke-width="0.5" stroke-dasharray="3,3" />
        
        <!-- Vertical grid lines - only if timeScale is provided -->
        <line v-for="line in verticalGridLines" :key="`v-${line.x}`"
              :x1="line.x" :x2="line.x" 
              :y1="0" :y2="height" 
              :stroke="gridColor" stroke-width="0.5" stroke-dasharray="3,3" />
        
        <!-- Center line -->
        <line x1="0" :x2="width" :y1="height/2" :y2="height/2" 
              :stroke="gridColor" stroke-width="0.5" />
      </g>
      
      <!-- ECG line -->
      <polyline v-if="displayPoints.length > 1" 
                :points="ecgLinePoints" 
                fill="none" stroke="red" :stroke-width="chartType === 'history' ? 1 : 1.5" />
      
      <!-- R peaks -->
      <circle v-if="showMarkers" v-for="(point, index) in displayRPeaks" :key="`r-${index}`"
              :cx="point.x" :cy="point.y" r="3" fill="purple" />
      
      <!-- Q points -->
      <circle v-if="showMarkers" v-for="(point, index) in displayQPoints" :key="`q-${index}`"
              :cx="point.x" :cy="point.y" r="2" fill="blue" />
      
      <!-- T-end points -->
      <circle v-if="showMarkers" v-for="(point, index) in displayTEndPoints" :key="`t-${index}`"
              :cx="point.x" :cy="point.y" r="2" fill="green" />
      
      <!-- Point count for debugging -->
      <text v-if="showPointCount" x="5" y="15" font-size="10" fill="yellow">
        Points: {{ displayPoints.length }}
      </text>
    </svg>
  </div>
</template>

<script>
import themeManager from '../services/ThemeManager.js'
import { computed } from 'vue'

export default {
  name: 'EcgChart',
  
  props: {
    // ECG data
    ecgData: {
      type: Array,
      required: true,
      default: () => []
    },
    // Time points corresponding to each ecgData point
    timeData: {
      type: Array,
      required: true,
      default: () => []
    },
    // Optional R peaks
    rPeaks: {
      type: Array,
      default: () => []
    },
    // Optional Q points
    qPoints: {
      type: Array,
      default: () => []
    },
    // Optional T-end points
    tEndPoints: {
      type: Array,
      default: () => []
    },
    // Start time of the segment to display
    startTime: {
      type: Number,
      default: 0
    },
    // End time of the segment to display
    endTime: {
      type: Number,
      default: 0
    },
    // Optional: Fixed total time duration the width should represent
    fixedTimeWindow: {
        type: Number,
        default: null
    },
    // Width of the chart in pixels
    width: {
      type: Number,
      default: 100
    },
    // Height of the chart in pixels
    height: {
      type: Number,
      default: 100
    },
    // Y-scale factor - controls amplitude of the waveform
    yScale: {
      type: Number,
      default: 0.1
    },
    // Show time label
    showLabel: {
      type: Boolean,
      default: false
    },
    // Show points count (for debugging)
    showPointCount: {
      type: Boolean,
      default: false
    },
    // Chart type: 'realtime' or 'history'
    chartType: {
      type: String,
      default: 'realtime',
      validator: value => ['realtime', 'history'].includes(value)
    },
    // Time scale for vertical grid lines (seconds between lines)
    timeScale: {
      type: Number,
      default: 0.5
    },
    // Show R, Q, and T markers
    showMarkers: {
      type: Boolean,
      default: true
    },
  },
  
  setup(props) {
    const yOffset = computed(() => props.height / 2);
    
    // Get theme-dependent colors
    const gridColor = computed(() => 
      themeManager.isDarkTheme() ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
    );
    
    // Time window duration for scaling, preferring fixed prop
    const timeWindowDuration = computed(() => {
        return props.fixedTimeWindow > 0 ? props.fixedTimeWindow : (props.endTime - props.startTime);
    });

    // Pixels per second based on the effective time window
    const pixelsPerSecond = computed(() => {
        const duration = timeWindowDuration.value;
        if (duration <= 0) return 200; // Avoid division by zero, return default
        return props.width / duration;
    });

    return {
      yOffset,
      gridColor,
      timeWindowDuration,
      pixelsPerSecond // Keep pixelsPerSecond if needed elsewhere, or remove if unused
    };
  },
  
  computed: {
    displayPoints() {
      // Data is now pre-sliced/filtered by parent for history view
      if (!this.ecgData || this.ecgData.length === 0) return [];

      // Simplified: directly use the props
      const points = [];
      const numPoints = this.ecgData.length;
      
      // Simple sampling based on the received number of points if history type
      const samplingStep = this.chartType === 'history' ? Math.max(1, Math.floor(numPoints / 300)) : 1;
      
      // For history view, timeData is already sliced and relative times start near 0
      // For realtime view, timeData contains absolute times
      for (let i = 0; i < numPoints; i += samplingStep) {
           points.push({
             // Use the time value directly as passed in timeData prop
             // For history, it's slice-relative; for realtime, it's absolute.
             time: this.timeData[i],
             value: this.ecgData[i]
           });
      }
       // Ensure the last point is included if sampling skips it
      if (samplingStep > 1 && (numPoints - 1) % samplingStep !== 0 && numPoints > 0) {
          points.push({ time: this.timeData[numPoints - 1], value: this.ecgData[numPoints - 1] });
      }
      
      return points; // No reverse needed if we iterate forwards
    },
    
    ecgLinePoints() {
      if (this.timeWindowDuration <= 0 || this.displayPoints.length < 1) return ''; 

      return this.displayPoints.map(point => {
        // Use absolute point time and subtract startTime for correct positioning
        // within the time window (fixed or dynamic)
        const relativeTime = point.time - this.startTime;
            
        // Clamp relative time to ensure it's within [0, timeWindowDuration]
        const clampedRelativeTime = Math.max(0, Math.min(relativeTime, this.timeWindowDuration));
        const timePosition = clampedRelativeTime / this.timeWindowDuration;
        
        const x = timePosition * this.width;
        const y = this.yOffset - (point.value * this.yScale);
        return `${x.toFixed(2)},${y.toFixed(2)}`; 
      }).join(' ');
    },
    
    displayRPeaks() {
      if (this.timeWindowDuration <= 0) return [];
      // Filter based on absolute time within the chart's start/end window
      const peaksToDisplay = this.rPeaks.filter(peak => 
          peak.time >= this.startTime && peak.time <= this.endTime
      );

      return peaksToDisplay.map(peak => {
          // Calculate position based on absolute time relative to startTime
          const relativeTime = peak.time - this.startTime;
          const clampedRelativeTime = Math.max(0, Math.min(relativeTime, this.timeWindowDuration));
          const timePosition = clampedRelativeTime / this.timeWindowDuration;
          return {
            ...peak,
            x: timePosition * this.width,
            y: this.yOffset - (peak.value * this.yScale)
          };
        });
    },
    
    displayQPoints() {
       if (this.timeWindowDuration <= 0) return [];
       // Filter based on absolute time
       const pointsToDisplay = this.qPoints.filter(point => 
           point.time >= this.startTime && point.time <= this.endTime
       );

       return pointsToDisplay.map(point => {
          // Calculate position based on absolute time relative to startTime
          const relativeTime = point.time - this.startTime; 
          const clampedRelativeTime = Math.max(0, Math.min(relativeTime, this.timeWindowDuration));
          const timePosition = clampedRelativeTime / this.timeWindowDuration;
          return {
            ...point,
            x: timePosition * this.width,
            y: this.yOffset - (point.value * this.yScale)
          };
        });
    },
    
    displayTEndPoints() {
      if (this.timeWindowDuration <= 0) return [];
      // Filter based on absolute time
      const pointsToDisplay = this.tEndPoints.filter(point => 
          point.time >= this.startTime && point.time <= this.endTime
      );

      return pointsToDisplay.map(point => {
          // Calculate position based on absolute time relative to startTime
          const relativeTime = point.time - this.startTime; 
          const clampedRelativeTime = Math.max(0, Math.min(relativeTime, this.timeWindowDuration));
          const timePosition = clampedRelativeTime / this.timeWindowDuration;
          return {
            ...point,
            x: timePosition * this.width,
            y: this.yOffset - (point.value * this.yScale)
          };
        });
    },
    
    horizontalGridLines() {
      const lines = [];
      const lineSpacing = this.chartType === 'history' ? this.height / 4 : 50;
      const count = Math.floor(this.height / lineSpacing);
      
      for (let i = 0; i <= count; i++) {
        lines.push({ y: i * lineSpacing });
      }
      return lines;
    },
    
    verticalGridLines() {
      const lines = [];
      const timeRange = this.timeWindowDuration; // Use computed duration
      if (timeRange <= 0) return [];

      // Grid lines depend on absolute time scale
      const secondsPerLine = this.chartType === 'history' 
        ? Math.max(5, Math.floor(timeRange / 5)) 
        : this.timeScale;
      
      // Calculate grid lines based on absolute start time
      let currentTime = Math.ceil(this.startTime / secondsPerLine) * secondsPerLine;

      // Iterate while the absolute time is within or near the segment
      while (currentTime <= this.endTime + secondsPerLine) { // Check slightly beyond endTime 
        // Calculate relative time for positioning
        const relativeTime = currentTime - this.startTime;
        
        // Check if the relative time falls within the display window [0, timeRange]
        if (relativeTime >= -0.001 && relativeTime <= timeRange + 0.001) { 
            const timePosition = relativeTime / timeRange;
            const x = timePosition * this.width;
             // Ensure position is visually within bounds [0, 1]
             if (timePosition >= 0 && timePosition <= 1) { 
               lines.push({ x });
             }
        }
        // Stop if we've gone significantly past the relevant time range
        if (relativeTime > timeRange + secondsPerLine) break;

        currentTime += secondsPerLine;
      }
      
      return lines;
    }
  }
};
</script>

<style scoped>
.ecg-chart-container {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.time-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
  margin-bottom: 2px;
}

.point-count {
  margin-left: 5px;
  color: yellow;
}

.ecg-svg {
  display: block;
  width: 100%;
  background-color: var(--background-color, rgba(0, 0, 0, 0.05));
}

.ecg-svg.history-view {
  border: 1px solid rgba(100, 100, 255, 0.3);
}
</style> 