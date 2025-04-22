<template>
  <CardWrapper title="Accelerometer">
    <div class="accelerometer-container">
      <div class="chart-controls">
        <div class="control-buttons">
          <div class="median-control">
            <span class="control-label">Median Window: {{ medianWindowSeconds.toFixed(1) }}s</span>
            <input type="range" min="0.1" max="0.5" step="0.1" v-model.number="medianWindowSeconds" class="slider">
          </div>
          
          <!-- Stabilization indicator -->
          <div v-if="!isStabilized" class="stabilizing-indicator">
            <span class="stabilizing-label">Stabilizing...</span>
          </div>
        </div>
      </div>
      <div class="chart-area">
        <div class="chart-scroll-container" ref="scrollContainer">
          <svg 
            ref="accelSvg"
            :width="chartWidth" 
            :height="chartHeight"
            :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
            preserveAspectRatio="none"
            :class="['accel-svg', { 'stabilizing': !isStabilized }]">
            
            <!-- Background grid -->
            <g class="grid-lines">
              <!-- Horizontal grid lines with labels -->
              <g v-for="line in horizontalGridLines" :key="`h-${line.y}`">
                <line x1="0" :x2="chartWidth" 
                      :y1="line.y" :y2="line.y" 
                      :stroke="gridColor" stroke-width="0.5" stroke-dasharray="3,3" />
                <text x="30" :y="line.y - 3" 
                      font-size="8" text-anchor="end" :fill="textColor">
                  {{ line.label }}
                </text>
              </g>
              
              <!-- Vertical grid lines -->
              <line v-for="line in verticalGridLines" :key="`v-${line.x}`"
                    :x1="line.x" :x2="line.x" 
                    :y1="0" :y2="chartHeight" 
                    :stroke="gridColor" stroke-width="0.5" stroke-dasharray="3,3" />
              
              <!-- Time labels -->
              <text v-for="line in verticalGridLines" :key="`t-${line.x}`" 
                    :x="line.x" 
                    :y="chartHeight - 5" 
                    font-size="10" 
                    text-anchor="middle"
                    :fill="textColor">
                {{ line.label }}
              </text>
              
              <!-- Center line (zero acceleration) - highlight it more -->
              <line x1="0" :x2="chartWidth" :y1="chartHeight/2" :y2="chartHeight/2" 
                    :stroke="zeroLineColor" stroke-width="1" />
            </g>
            
            <!-- Median lines -->
            <g class="median-lines">
              <!-- X-axis median line -->
              <path v-for="(path, index) in xMedianPaths" :key="`mx-${index}`"
                    :d="path"
                    fill="none" stroke="red" stroke-width="2" stroke-opacity="0.9" />
              
              <!-- Y-axis median line -->
              <path v-for="(path, index) in yMedianPaths" :key="`my-${index}`"
                    :d="path"
                    fill="none" stroke="lime" stroke-width="2" stroke-opacity="0.9" />
              
              <!-- Z-axis median line -->
              <path v-for="(path, index) in zMedianPaths" :key="`mz-${index}`"
                    :d="path"
                    fill="none" stroke="dodgerblue" stroke-width="2" stroke-opacity="0.9" />
            </g>
            
            <!-- Axis labels -->
            <text x="50" y="15" font-size="12" :fill="textColor">Acceleration (g)</text>
            
            <!-- Legend -->
            <g class="chart-legend" transform="translate(120, 15)">
              <g>
                <line x1="0" y1="0" x2="15" y2="0" stroke="red" stroke-width="2" stroke-opacity="0.9"/>
                <text x="20" y="5" font-size="12" :fill="textColor">X</text>
              </g>
              <g transform="translate(50, 0)">
                <line x1="0" y1="0" x2="15" y2="0" stroke="lime" stroke-width="2" stroke-opacity="0.9"/>
                <text x="20" y="5" font-size="12" :fill="textColor">Y</text>
              </g>
              <g transform="translate(100, 0)">
                <line x1="0" y1="0" x2="15" y2="0" stroke="dodgerblue" stroke-width="2" stroke-opacity="0.9"/>
                <text x="20" y="5" font-size="12" :fill="textColor">Z</text>
              </g>
            </g>
          </svg>
        </div>
      </div>
    </div>
  </CardWrapper>
</template>

<script>
import CardWrapper from './CardWrapper.vue'
import themeManager from '../services/ThemeManager.js'
import { opts } from '../services/store.js'
import Acc from '../services/Acc.js'
import { computed, watch, ref, onMounted, onBeforeUnmount, nextTick } from 'vue'

// Number of data points per polyline segment
const BATCH_SIZE = 100;
// Maximum number of segments to maintain for each axis
const MAX_SEGMENTS = 1000;
// Window size for moving average smoothing
const SMOOTHING_WINDOW = 15;

export default {
  components: {
    CardWrapper
  },
  props: ['device'],
  
  setup(props) {
    // References and state
    const accelSvg = ref(null);
    const scrollContainer = ref(null);
    const chartWidth = ref(800);
    const chartHeight = ref(400);
    
    // Dynamic range tracking
    const yMin = ref(-1);
    const yMax = ref(1);
    
    // Computed property for dynamic history interval
    const historyInterval = computed(() => opts.historyInterval);
    
    // Theme-dependent colors
    const textColor = computed(() => 
      themeManager.isDarkTheme() ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)'
    );
    
    const gridColor = computed(() => 
      themeManager.isDarkTheme() ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
    );
    
    const zeroLineColor = computed(() => 
      themeManager.isDarkTheme() ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'
    );
    
    // Horizontal grid lines
    const horizontalGridLines = computed(() => {
      const lines = [];
      
      // Create grid lines at nice intervals based on current yMin and yMax
      const range = yMax.value - yMin.value;
      
      // Calculate a nice interval (0.01, 0.02, 0.05, 0.1, 0.2, 0.5) based on range
      // Use smaller divisions for finer detail when range is small
      let interval;
      if (range <= 0.05) interval = 0.01;
      else if (range <= 0.1) interval = 0.02;
      else if (range <= 0.2) interval = 0.05;
      else if (range <= 0.5) interval = 0.1;
      else if (range <= 1) interval = 0.2;
      else if (range <= 2) interval = 0.5;
      else interval = Math.ceil(range / 5);
      
      // Find the first grid line above yMin
      let value = Math.ceil(yMin.value / interval) * interval;
      
      // Add grid lines up to yMax
      while (value <= yMax.value) {
        const normalizedValue = (value - yMin.value) / (yMax.value - yMin.value);
        const y = chartHeight.value - (normalizedValue * chartHeight.value);
        
        lines.push({ 
          y, 
          value, 
          label: value === 0 ? '0' : value.toFixed(2) 
        });
        
        value += interval;
      }
      
      return lines;
    });
    
    // Vertical grid lines
    const verticalGridLines = computed(() => {
      const lines = [];
      const interval = historyInterval.value;
      
      // Create grid lines at fixed intervals
      let timeStep;
      
      // Adjust time step based on visible time span for optimal grid density
      if (interval <= 5) timeStep = 0.5;       // 0.5 second steps for small spans
      else if (interval <= 10) timeStep = 1;   // 1 second steps
      else if (interval <= 30) timeStep = 5;   // 5 second steps
      else if (interval <= 60) timeStep = 10;  // 10 second steps
      else timeStep = 30;                      // 30 second steps for large spans
      
      // Add grid lines at nice intervals
      for (let t = 0; t <= interval; t += timeStep) {
        const x = (t / interval) * chartWidth.value;
        lines.push({
          x,
          label: `${t.toFixed(1)}s`
        });
      }
      
      return lines;
    });
    
    // Resize observer
    let resizeObserver = null;
    
    // Function to update chart size based on container
    const updateChartSize = () => {
      if (!accelSvg.value) return;
      
      const container = scrollContainer.value || accelSvg.value.parentElement;
      if (container) {
        const containerWidth = container.clientWidth;
        chartWidth.value = containerWidth;
        chartHeight.value = container.clientHeight;
      }
    };
    
    // Watch for changes in history interval
    watch(historyInterval, () => {
      updateChartSize();
    });
    
    // Set up the resize observer on mount
    onMounted(() => {
      updateChartSize();
      
      // Set up resize observer for responsive sizing
      if (window.ResizeObserver && scrollContainer.value) {
        resizeObserver = new ResizeObserver(updateChartSize);
        resizeObserver.observe(scrollContainer.value);
      }
      
      // Fallback - listen to window resize
      window.addEventListener('resize', updateChartSize);
    });
    
    // Clean up on unmount
    onBeforeUnmount(() => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener('resize', updateChartSize);
    });
    
    return {
      accelSvg,
      scrollContainer,
      chartWidth,
      chartHeight,
      historyInterval,
      yMin,
      yMax,
      textColor,
      gridColor,
      zeroLineColor,
      horizontalGridLines,
      verticalGridLines
    };
  },
  
  data() {
    return {
      timeData: [],
      axData: [],
      ayData: [],
      azData: [],
      medianWindowSeconds: 0.3,
      xMedianPaths: [],
      yMedianPaths: [],
      zMedianPaths: [],
      themeListener: null,
      updateTimer: null,
      accService: null,
      isStabilized: false,
      initialViewFixed: false
    }
  },
  
  methods: {
    // Calculate SVG coordinates for a data point with normalized Y value
    calculateCoords(time, value) {
      // Calculate X position based on time relative to current timeframe
      const latestTime = this.timeData[this.timeData.length - 1] || 0;
      const windowStart = Math.max(0, latestTime - this.historyInterval);
      
      // Normalize time to chart width
      const normalizedX = (time - windowStart) / this.historyInterval;
      const x = normalizedX * this.chartWidth;
      
      // Calculate Y coordinate with dynamic range
      const range = this.yMax - this.yMin;
      const normalizedValue = range !== 0 ? (value - this.yMin) / range : 0.5;
      const y = this.chartHeight - (normalizedValue * this.chartHeight);
      
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    },
    
    updateYRange() {
      // Find min/max values across all axes
      const allValues = [...this.axData, ...this.ayData, ...this.azData];
      if (allValues.length === 0) return;
      
      // Use different approach for initial view vs stable state
      if (!this.isStabilized && !this.initialViewFixed && this.timeData.length > 5) {
        // For non-stabilized data, set a fixed initial range that's reasonable
        // This prevents large initial spikes from skewing the view
        this.initialViewFixed = true;
        this.yMin = -0.5;
        this.yMax = 0.5;
        return;
      }
      
      // Calculate min/max with a sliding window approach for recent data
      const recentWindowSize = 500;
      const xRecent = this.axData.slice(-recentWindowSize);
      const yRecent = this.ayData.slice(-recentWindowSize);
      const zRecent = this.azData.slice(-recentWindowSize);
      
      // Get min/max of recent data
      const recentMin = Math.min(...xRecent, ...yRecent, ...zRecent);
      const recentMax = Math.max(...xRecent, ...yRecent, ...zRecent);
      
      // Get absolute min/max from all data
      const absoluteMin = Math.min(...allValues);
      const absoluteMax = Math.max(...allValues);
      
      // Use a weighted approach that favors recent data but considers all-time extremes
      const weightRecent = this.isStabilized ? 0.9 : 0.7; // Lower weight for unstable data
      let min = recentMin * weightRecent + absoluteMin * (1 - weightRecent);
      let max = recentMax * weightRecent + absoluteMax * (1 - weightRecent);
      
      // Ensure minimum range to prevent flat lines when values are constant
      const minRange = 0.02; 
      if (max - min < minRange) {
        const center = (max + min) / 2;
        min = center - minRange / 2;
        max = center + minRange / 2;
      }
      
      // Add padding
      const range = Math.max(0.05, max - min);
      const padding = range * (this.isStabilized ? 0.08 : 0.15); // More padding for unstable data
      
      // Update the y-range more responsively
      const smoothFactor = this.isStabilized ? 0.4 : 0.2; // Slower updates for unstable data
      this.yMin = this.yMin !== -1 ? 
        this.yMin * (1 - smoothFactor) + (min - padding) * smoothFactor : 
        min - padding;
      
      this.yMax = this.yMax !== 1 ? 
        this.yMax * (1 - smoothFactor) + (max + padding) * smoothFactor : 
        max + padding;
    },
    
    // Update the visualization based on median data
    updateMedianPaths(medianData) {
      if (!medianData || !medianData.times || medianData.times.length < 2) return;
      
      try {
        // Update stabilization state if provided in the data
        if (typeof medianData.isStabilized === 'boolean') {
          this.isStabilized = medianData.isStabilized;
        }
        
        // Process median data for each axis into SVG paths
        const xPath = this.createPathFromPoints(medianData.times, medianData.x);
        const yPath = this.createPathFromPoints(medianData.times, medianData.y);
        const zPath = this.createPathFromPoints(medianData.times, medianData.z);
        
        this.xMedianPaths = xPath ? [xPath] : [];
        this.yMedianPaths = yPath ? [yPath] : [];
        this.zMedianPaths = zPath ? [zPath] : [];
      } catch (error) {
        console.error('Error updating median paths:', error);
      }
    },
    
    // Create SVG path from time series data
    createPathFromPoints(times, values) {
      if (!times || !values || times.length === 0 || values.length === 0) return null;
      
      // Start the path
      let path = '';
      let isFirstPoint = true;
      
      for (let i = 0; i < times.length; i++) {
        const time = times[i];
        const value = values[i];
        
        if (typeof value !== 'number' || isNaN(value)) continue;
        
        const coords = this.calculateCoords(time, value);
        
        // Either move to first point or draw line to subsequent points
        if (isFirstPoint) {
          path = `M${coords}`;
          isFirstPoint = false;
        } else {
          path += ` L${coords}`;
        }
      }
      
      return path.length > 0 ? path : null;
    },
    
    // Create a new AccService and subscribe to its events
    initializeAccService() {
      if (this.accService) {
        this.accService.destroy();
      }
      
      if (!this.device) return;
      
      this.accService = new Acc(this.device);
      
      // Set the median window seconds from our UI
      this.accService.setMedianWindowSeconds(this.medianWindowSeconds);
      
      // Subscribe to processed data for updating y-axis range
      this.accService.getProcessedDataObservable().subscribe(data => {
        this.timeData = this.accService.timeData;
        this.axData = this.accService.axData;
        this.ayData = this.accService.ayData;
        this.azData = this.accService.azData;
        
        // Update stabilization state if available
        if (typeof data.isStabilized === 'boolean') {
          this.isStabilized = data.isStabilized;
        }
        
        this.updateYRange();
      });
      
      // Subscribe to median data for drawing median lines
      this.accService.getMedianDataObservable().subscribe(medianData => {
        this.updateMedianPaths(medianData);
      });
      
      // Start update timer for continuous rendering
      this.updateTimer = setInterval(() => {
        this.$forceUpdate();
      }, 50); // 20fps refresh rate
    }
  },
  
  watch: {
    device: {
      immediate: true,
      handler(newDevice) {
        if (this.accService) {
          this.accService.destroy();
          this.accService = null;
        }
        
        if (this.updateTimer) {
          clearInterval(this.updateTimer);
          this.updateTimer = null;
        }
        
        if (newDevice) {
          this.$nextTick(() => {
            this.initializeAccService();
          });
        }
      }
    },
    
    // Update median window size when it changes
    medianWindowSeconds(newValue) {
      if (this.accService) {
        this.accService.setMedianWindowSeconds(newValue);
      }
    },
    
    // Recompute when history interval changes
    historyInterval() {
      // Force an update of the visualization
      this.$forceUpdate();
    }
  },
  
  mounted() {
    // Initialize the accService if device is already available
    if (this.device) {
      this.initializeAccService();
    }
    
    // Listen for theme changes
    this.themeListener = () => {
      this.$forceUpdate();
    };
    themeManager.addListener(this.themeListener);
  },
  
  beforeUnmount() {
    if (this.accService) {
      this.accService.destroy();
      this.accService = null;
    }
    
    if (this.themeListener) {
      themeManager.removeListener(this.themeListener);
    }
    
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }
}
</script>

<style scoped>
.accelerometer-container {
  width: 100%;
  height: 400px;
  display: flex;
  flex-direction: column;
  font-family: monospace;
  color: var(--text-color);
}

.chart-controls {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  padding: 0 5px;
  font-size: 12px;
}

.control-buttons {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  margin: 8px 0;
}

.toggle-control {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 4px;
  background-color: var(--control-bg);
  user-select: none;
}

.median-control {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  border-radius: 4px;
  background-color: var(--control-bg);
}

.control-label {
  margin-right: 6px;
  white-space: nowrap;
}

.slider {
  width: 100px;
  height: 5px;
}

.stabilizing-indicator {
  display: flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 4px;
  background-color: rgba(255, 165, 0, 0.2);
  border: 1px solid orange;
  animation: pulse 1.5s infinite;
}

.stabilizing-label {
  color: orange;
  font-weight: bold;
}

@keyframes pulse {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
}

.accel-svg.stabilizing path {
  opacity: 0.7;
  stroke-dasharray: 4,2;
}

.chart-area {
  flex: 1;
  min-height: 0;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 4px;
  background: var(--background-color, transparent);
  overflow: hidden;
}

.accel-svg {
  width: 100%;
  height: 100%;
}

.chart-scroll-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}
</style>

