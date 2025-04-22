<template>
  <CardWrapper title="Accelerometer">
    <div class="accelerometer-container">
      <div class="chart-controls">
        <div>History ({{ historyInterval }}s)</div>
        <div class="control-buttons">
          <div class="toggle-control" @click="enableMedianFilter = !enableMedianFilter">
            <span class="control-label">Median: {{ enableMedianFilter ? 'ON' : 'OFF' }}</span>
          </div>
          <div v-if="enableMedianFilter" class="smoothing-control">
            <span class="control-label">Window: {{ medianWindowSize }}</span>
            <input class="slider" type="range" min="3" max="11" step="2" v-model.number="medianWindowSize" />
          </div>
          <label class="toggle-control">
            <input type="checkbox" v-model="enableInterpolation" checked>
            <span class="control-label">Interp</span>
          </label>
        </div>
      </div>
      <div class="chart-area">
        <div class="chart-scroll-container" ref="scrollContainer">
          <svg 
            ref="accelSvg"
            :width="chartWidth" 
            :height="chartHeight"
            :viewBox="`${scrollX} 0 ${visibleWidth} ${chartHeight}`"
            preserveAspectRatio="none"
            class="accel-svg">
            
            <!-- Background grid -->
            <g class="grid-lines">
              <!-- Horizontal grid lines with labels -->
              <g v-for="line in horizontalGridLines" :key="`h-${line.y}`">
                <line x1="0" :x2="totalChartWidth" 
                      :y1="line.y" :y2="line.y" 
                      :stroke="gridColor" stroke-width="0.5" stroke-dasharray="3,3" />
                <text :x="scrollX + 30" :y="line.y - 3" 
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
              <line x1="0" :x2="totalChartWidth" :y1="chartHeight/2" :y2="chartHeight/2" 
                    :stroke="zeroLineColor" stroke-width="1" />
            </g>
            
            <!-- X-axis acceleration line segments -->
            <g class="accel-lines x-lines">
              <polyline v-for="(segmentPoints, index) in xSegments" :key="`x-${index}`"
                        :points="segmentPoints"
                        fill="none" stroke="red" stroke-width="1.5" />
            </g>
            
            <!-- Y-axis acceleration line segments -->
            <g class="accel-lines y-lines">
              <polyline v-for="(segmentPoints, index) in ySegments" :key="`y-${index}`"
                        :points="segmentPoints"
                        fill="none" stroke="green" stroke-width="1.5" />
            </g>
            
            <!-- Z-axis acceleration line segments -->
            <g class="accel-lines z-lines">
              <polyline v-for="(segmentPoints, index) in zSegments" :key="`z-${index}`"
                        :points="segmentPoints"
                        fill="none" stroke="blue" stroke-width="1.5" />
            </g>
            
            <!-- Axis labels -->
            <text :x="scrollX + 50" y="15" font-size="12" :fill="textColor">Acceleration (g)</text>
            
            <!-- Legend -->
            <g class="chart-legend" :transform="`translate(${scrollX + 120}, 15)`">
              <g>
                <line x1="0" y1="0" x2="15" y2="0" stroke="red" stroke-width="1.5"/>
                <text x="20" y="5" font-size="12" :fill="textColor">X</text>
              </g>
              <g transform="translate(50, 0)">
                <line x1="0" y1="0" x2="15" y2="0" stroke="green" stroke-width="1.5"/>
                <text x="20" y="5" font-size="12" :fill="textColor">Y</text>
              </g>
              <g transform="translate(100, 0)">
                <line x1="0" y1="0" x2="15" y2="0" stroke="blue" stroke-width="1.5"/>
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
import { computed, watch, ref, onMounted, onBeforeUnmount, nextTick } from 'vue'

// Number of data points per polyline segment
const BATCH_SIZE = 100;
// Interpolation factor - higher means smoother curves but more computation
const INTERP_FACTOR = 0.2;
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
    const visibleWidth = ref(800);
    const totalChartWidth = ref(5000);
    const scrollX = ref(0);
    
    // Line segments for each axis
    const xSegments = ref([]);
    const ySegments = ref([]);
    const zSegments = ref([]);
    
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
    
    // Update vertical grid lines to make intervals more sensible in scrolling mode
    const verticalGridLines = computed(() => {
      const lines = [];
      
      // Always create grid lines at fixed intervals for scrolling mode
      const pixelsPerSecond = 100; // Match the data value in this.pixelsPerSecond
      let timeStep;
      
      // Calculate visible time span
      const visibleTimeSpan = visibleWidth.value / pixelsPerSecond;
      
      // Adjust time step based on visible time span for optimal grid density
      if (visibleTimeSpan <= 5) timeStep = 0.5;       // 0.5 second steps for small spans
      else if (visibleTimeSpan <= 10) timeStep = 1;   // 1 second steps
      else if (visibleTimeSpan <= 30) timeStep = 5;   // 5 second steps
      else if (visibleTimeSpan <= 60) timeStep = 10;  // 10 second steps
      else timeStep = 30;                             // 30 second steps for large spans
      
      // Calculate the time value at the left edge of the visible area
      const leftEdgeTime = scrollX.value / pixelsPerSecond;
      
      // Round to nearest multiple of timeStep
      const firstGridTime = Math.ceil(leftEdgeTime / timeStep) * timeStep;
      
      // Calculate right edge time
      const rightEdgeTime = (scrollX.value + visibleWidth.value) / pixelsPerSecond;
      
      // Add grid lines from first grid time to right edge
      for (let t = firstGridTime; t <= rightEdgeTime; t += timeStep) {
        const x = t * pixelsPerSecond;
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
        visibleWidth.value = containerWidth;
        chartHeight.value = container.clientHeight;
      }
    };
    
    // Watch for changes in history interval
    watch(historyInterval, () => {
      // When interval changes, don't clear segments - just let them adjust visually
      // No need to reset data, just trigger a re-render with new time scaling
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
      visibleWidth,
      totalChartWidth,
      scrollX,
      historyInterval,
      xSegments,
      ySegments,
      zSegments,
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
      accData: [], // Array to store received accelerometer data
      axData: [],  // X-axis values
      ayData: [],  // Y-axis values
      azData: [],  // Z-axis values
      timeData: [], // Timestamps for each data point
      startTime: null,
      subscription: null,
      themeListener: null,
      scaleFactor: 0.01,
      sampleIndex: 0,
      baselineValues: null,
      calibrationCount: 20,
      // Processed batches tracking
      lastProcessedBatch: { x: [], y: [], z: [], time: [] },
      lastDataTime: 0,
      updateTimer: null,
      enableMedianFilter: true,
      enableInterpolation: true,
      medianWindowSize: 5,
      // Fixed time scale for scrolling mode (pixels per second)
      pixelsPerSecond: 100
    }
  },
  
  methods: {
    // Calculate SVG coordinates for a data point with normalized Y value
    calculateCoords(time, value, axis) {
      // Always use fixed time scale for scrolling mode
      // Calculate X position based on absolute time
      const x = time * this.pixelsPerSecond;
      
      // Calculate Y coordinate with dynamic range
      const range = this.yMax - this.yMin;
      const normalizedValue = range !== 0 ? (value - this.yMin) / range : 0.5;
      const y = this.chartHeight - (normalizedValue * this.chartHeight);
      
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    },
    
    // Update the segments for a specific axis
    updateAxisSegments(axis, data, times) {
      const segmentArray = axis === 'x' ? this.xSegments : 
                           axis === 'y' ? this.ySegments : this.zSegments;
      
      if (data.length === 0 || times.length === 0) return;
      
      // Keep track if this is new data that appends to existing
      const isAppending = this.lastProcessedBatch[axis].length > 0 && 
                         this.lastProcessedBatch.time.length > 0;
      
      // Calculate points for each segment
      for (let i = 0; i < data.length; i += BATCH_SIZE) {
        let segmentStr = '';
        const end = Math.min(i + BATCH_SIZE, data.length);
        
        // Include the last point of the previous segment or batch for continuity
        if (i > 0) {
          segmentStr += this.calculateCoords(times[i-1], data[i-1], axis);
          segmentStr += ' ';
        } 
        // If this is the first segment but we have previous data points, use the last one
        else if (isAppending) {
          const lastIdx = this.lastProcessedBatch[axis].length - 1;
          segmentStr += this.calculateCoords(
            this.lastProcessedBatch.time[lastIdx], 
            this.lastProcessedBatch[axis][lastIdx],
            axis
          );
          segmentStr += ' ';
        }
        
        // Add the actual data points with optional simple interpolation
        if (this.enableInterpolation) {
          // With interpolation: add midpoints between each pair of data points
          for (let j = i; j < end - 1; j++) {
            // Add the current point
            segmentStr += this.calculateCoords(times[j], data[j], axis);
            segmentStr += ' ';
            
            // Add a simple interpolated point midway between points
            // This creates smoother lines with less complexity
            const midTime = (times[j] + times[j+1]) / 2;
            const midValue = (data[j] + data[j+1]) / 2;
            segmentStr += this.calculateCoords(midTime, midValue, axis);
            segmentStr += ' ';
          }
          
          // Add the final point of the segment
          if (end > i) {
            segmentStr += this.calculateCoords(times[end-1], data[end-1], axis);
          }
        } else {
          // Without interpolation: just connect the raw data points
          for (let j = i; j < end; j++) {
            segmentStr += this.calculateCoords(times[j], data[j], axis);
            if (j < end - 1) segmentStr += ' ';
          }
        }
        
        if (segmentStr) {
          // Add segment to array - never remove old segments to keep all history
          segmentArray.push(segmentStr);
        }
      }
      
      // Update lastProcessedBatch with the most recent points
      if (data.length > 0) {
        this.lastProcessedBatch[axis] = [data[data.length - 1]];
        this.lastProcessedBatch.time = [times[times.length - 1]];
      }
    },
    
    // Process and update all acceleration data
    processAccelerometerData() {
      if (!this.accData || this.accData.length === 0) {
        return;
      }
      
      // Get the batch of data to process
      const dataToProcess = [...this.accData];
      this.accData = [];
      
      if (Array.isArray(dataToProcess) && dataToProcess.length > 0) {
        // Set up time tracking if not already done
        if (!this.startTime) {
          this.startTime = Date.now();
          console.log('Accelerometer tracking started at:', new Date(this.startTime).toISOString());
        }
        
        const newXData = [];
        const newYData = [];
        const newZData = [];
        const newTimeData = [];
        
        // Process each reading in the batch
        dataToProcess.forEach((reading, index) => {
          if (!reading || typeof reading !== 'object' || !('x' in reading) || !('y' in reading) || !('z' in reading)) {
            return;
          }
          
          // Scale the values down to a reasonable range
          let x = reading.x * this.scaleFactor;
          let y = reading.y * this.scaleFactor;
          let z = reading.z * this.scaleFactor;
          
          // Calculate time relative to start
          const now = Date.now();
          const elapsedSeconds = (now - this.startTime) / 1000;
          
          // Add data with real elapsed time (no resets)
          let timePoint = elapsedSeconds;
          
          // Add small offsets for multiple points in a batch to prevent overlap
          if (index > 0) {
            timePoint += (index * 0.01);
          }
          
          // Store in temporary arrays
          newTimeData.push(timePoint);
          newXData.push(x);
          newYData.push(y);
          newZData.push(z);
          
          this.sampleIndex++;
        });
        
        // Try to calculate baseline values if we don't have them yet
        if (!this.baselineValues && this.sampleIndex >= this.calibrationCount) {
          this.calculateBaseline();
        }
        
        // Apply baseline normalization if available
        if (this.baselineValues) {
          for (let i = 0; i < newXData.length; i++) {
            newXData[i] -= this.baselineValues.x;
            newYData[i] -= this.baselineValues.y;
            newZData[i] -= this.baselineValues.z;
          }
        }
        
        // Step 0: Merge points with identical timestamps
        const { mergedTimes, mergedXData, mergedYData, mergedZData } = this.mergePointsAtSameTime(
          newTimeData, newXData, newYData, newZData
        );
        
        // Step 1: Remove outliers
        const cleanedXData = this.removeOutliers(mergedXData);
        const cleanedYData = this.removeOutliers(mergedYData);
        const cleanedZData = this.removeOutliers(mergedZData);
        
        // Step 2: Apply median filter to reduce noise
        const smoothedXData = this.applyMedianFilter(cleanedXData);
        const smoothedYData = this.applyMedianFilter(cleanedYData);
        const smoothedZData = this.applyMedianFilter(cleanedZData);
        
        // Add to main data arrays (use smoothed data)
        this.timeData.push(...mergedTimes);
        this.axData.push(...smoothedXData);
        this.ayData.push(...smoothedYData);
        this.azData.push(...smoothedZData);
        
        // Debug info occasionally
        if (this.sampleIndex % 100 === 0) {
          console.log(`Accelerometer: ${this.timeData.length} points, time range ${this.timeData[0].toFixed(1)} to ${this.timeData[this.timeData.length-1].toFixed(1)} seconds`);
        }
        
        // Update the Y range based on new data
        this.updateYRange();
        
        // Update the SVG line segments with the new data
        this.updateAxisSegments('x', smoothedXData, mergedTimes);
        this.updateAxisSegments('y', smoothedYData, mergedTimes);
        this.updateAxisSegments('z', smoothedZData, mergedTimes);
        
        // Keep all historical data
        this.pruneOldData();
        
        // Update the scroll position to keep latest data visible
        this.$nextTick(() => {
          this.updateScrollPosition();
        });
      }
    },
    
    // Merge data points with identical timestamps
    mergePointsAtSameTime(times, xData, yData, zData) {
      if (!times || times.length === 0) {
        return { mergedTimes: [], mergedXData: [], mergedYData: [], mergedZData: [] };
      }
      
      // Group data by timestamp (rounded to 3 decimal places to avoid floating point issues)
      const timeGroups = {};
      
      for (let i = 0; i < times.length; i++) {
        // Round to 3 decimal places to handle tiny floating point differences
        const roundedTime = Math.round(times[i] * 1000) / 1000;
        
        if (!timeGroups[roundedTime]) {
          timeGroups[roundedTime] = {
            x: [],
            y: [],
            z: []
          };
        }
        
        if (typeof xData[i] === 'number' && !isNaN(xData[i])) timeGroups[roundedTime].x.push(xData[i]);
        if (typeof yData[i] === 'number' && !isNaN(yData[i])) timeGroups[roundedTime].y.push(yData[i]);
        if (typeof zData[i] === 'number' && !isNaN(zData[i])) timeGroups[roundedTime].z.push(zData[i]);
      }
      
      // Create merged arrays using the median values for each timestamp
      const mergedTimes = [];
      const mergedXData = [];
      const mergedYData = [];
      const mergedZData = [];
      
      Object.entries(timeGroups).forEach(([time, values]) => {
        const timeValue = parseFloat(time);
        mergedTimes.push(timeValue);
        
        // For each axis, take the median of all values at this timestamp
        mergedXData.push(values.x.length > 0 ? this.calculateMedian(values.x) : NaN);
        mergedYData.push(values.y.length > 0 ? this.calculateMedian(values.y) : NaN);
        mergedZData.push(values.z.length > 0 ? this.calculateMedian(values.z) : NaN);
      });
      
      // Sort by timestamp to ensure correct order
      const indices = mergedTimes.map((_, i) => i).sort((a, b) => mergedTimes[a] - mergedTimes[b]);
      
      const sortedTimes = indices.map(i => mergedTimes[i]);
      const sortedXData = indices.map(i => mergedXData[i]);
      const sortedYData = indices.map(i => mergedYData[i]);
      const sortedZData = indices.map(i => mergedZData[i]);
      
      return {
        mergedTimes: sortedTimes,
        mergedXData: sortedXData,
        mergedYData: sortedYData,
        mergedZData: sortedZData
      };
    },
    
    // Remove statistical outliers from data
    removeOutliers(data, windowSize = 5, threshold = 2.0) {
      if (!data || data.length < windowSize) return data; // Not enough data

      const result = [...data];
      const halfWindow = Math.floor(windowSize / 2);

      for (let i = 0; i < data.length; i++) {
        const currentValue = data[i];
        if (typeof currentValue !== 'number' || isNaN(currentValue)) continue; // Skip non-numbers

        // Define local window indices, excluding the current point
        let windowValues = [];
        for (let j = -halfWindow; j <= halfWindow; j++) {
          if (j === 0) continue; // Skip the point itself
          const idx = i + j;
          if (idx >= 0 && idx < data.length) {
             const val = data[idx];
             if (typeof val === 'number' && !isNaN(val)) {
                 windowValues.push(val);
             }
          }
        }

        if (windowValues.length < 2) continue; // Need at least 2 neighbors to calculate std dev

        // Calculate mean and standard deviation of the window
        const sum = windowValues.reduce((acc, val) => acc + val, 0);
        const mean = sum / windowValues.length;
        const variance = windowValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / windowValues.length;
        const stdDev = Math.sqrt(variance);

        // If the point is too far from the local mean, mark it as NaN
        if (stdDev > 0 && Math.abs(currentValue - mean) > threshold * stdDev) {
          result[i] = NaN; // Mark as outlier
        }
      }
      return result;
    },
    
    pruneOldData() {
      // Disabled - keep ALL data
      return;
    },
    
    calculateBaseline() {
      // Make sure we have enough data
      if (this.axData.length < this.calibrationCount) {
        return;
      }
      
      // Calculate average of first N samples as baseline
      let sumX = 0, sumY = 0, sumZ = 0;
      for (let i = 0; i < this.calibrationCount; i++) {
        sumX += this.axData[i];
        sumY += this.ayData[i];
        sumZ += this.azData[i];
      }
      
      this.baselineValues = {
        x: sumX / this.calibrationCount,
        y: sumY / this.calibrationCount,
        z: sumZ / this.calibrationCount
      };
      
      console.log('Established baseline values:', this.baselineValues);
    },
    
    resetDataArrays() {
      this.axData = [];
      this.ayData = [];
      this.azData = [];
      this.timeData = [];
      this.startTime = null;
      this.sampleIndex = 0;
      this.baselineValues = null;
      this.lastProcessedBatch = { x: [], y: [], z: [], time: [] };
      
      // Clear segments
      this.xSegments = [];
      this.ySegments = [];
      this.zSegments = [];
    },
    
    subscribeToAccelerometer() {
      if (this.device && this.device.observeAccelerometer) {
        console.log('Subscribing to accelerometer data stream...');
        
        this.accData = [];
        this.resetDataArrays();
        
        this.subscription = this.device.observeAccelerometer().subscribe(accBatch => {
          if (Array.isArray(accBatch)) {
            this.accData = accBatch;
            this.processAccelerometerData();
          } else {
            this.accData = [accBatch];
            this.processAccelerometerData();
          }
        });
        
        // Start update timer for continuous rendering and periodic scale adjustment
        let updateCount = 0;
        this.updateTimer = setInterval(() => {
          // Force update for smooth continuous animation even when no new data
          this.$forceUpdate();
          
          // Update the Y scale more frequently to ensure it adapts quickly
          // Changed from every 10 updates to every 2 updates (roughly every 100ms)
          updateCount++;
          if (updateCount % 2 === 0) {
            this.updateYRange();
          }
        }, 50); // 20fps refresh rate
        
        setTimeout(() => {
          if (this.sampleIndex === 0) {
            console.warn('No accelerometer data received after 3 seconds');
          }
        }, 3000);
      } else {
        console.error('Device does not support observeAccelerometer()');
      }
    },
    
    // Apply a median filter to remove noise and spikes
    applyMedianFilter(data) {
      if (!this.enableMedianFilter || data.length === 0) return data;
      
      const result = [...data];
      const windowSize = this.medianWindowSize;
      const halfWindow = Math.floor(windowSize / 2);
      
      // Apply the filter
      for (let i = 0; i < data.length; i++) {
        // Create a window of appropriate size, handle edge cases properly
        const windowValues = [];
        for (let j = -halfWindow; j <= halfWindow; j++) {
          const idx = i + j;
          if (idx >= 0 && idx < data.length) {
            // Only include valid numbers in the window
            if (typeof data[idx] === 'number' && !isNaN(data[idx])) {
              windowValues.push(data[idx]);
            }
          }
        }
        
        // Calculate median only if the window has valid numbers
        if (windowValues.length > 0) {
          result[i] = this.calculateMedian(windowValues);
        } else {
          // Keep original value if window had no valid numbers
          result[i] = data[i];
        }
      }
      
      return result;
    },
    
    // Calculate median of an array efficiently (assumes input is a non-empty array of numbers)
    calculateMedian(arr) {
      // No need for length checks or filtering here, handled by applyMedianFilter
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    },
    
    // Update the SVG viewBox to scroll with new data
    updateScrollPosition() {
      if (this.timeData.length === 0) return;
      
      // Get latest time and calculate its position
      const latestTime = this.timeData[this.timeData.length - 1];
      const latestPosition = latestTime * this.pixelsPerSecond;
      
      // Update total chart width to include all data plus some padding
      this.totalChartWidth = Math.max(this.visibleWidth, latestPosition + 200);
      
      // Calculate new scroll position to keep latest data visible
      // We want the latest data point to be slightly inset from the right edge
      const rightEdgeInset = 50; // pixels from right edge
      this.scrollX = Math.max(0, latestPosition - this.visibleWidth + rightEdgeInset);
      
      // Also update the Y range when scrolling
      this.updateYRange();
    },
    
    // Update Y-scale dynamically based on current data
    updateYRange() {
      // Find min/max values across all axes
      const allValues = [...this.axData, ...this.ayData, ...this.azData];
      if (allValues.length === 0) return;
      
      // Calculate min/max with a sliding window approach for recent data
      // This makes the chart more responsive to recent changes
      const recentWindowSize = 500; // Consider the most recent 500 points for immediate scaling
      const xRecent = this.axData.slice(-recentWindowSize);
      const yRecent = this.ayData.slice(-recentWindowSize);
      const zRecent = this.azData.slice(-recentWindowSize);
      
      // Get min/max of recent data
      const recentMin = Math.min(
        ...xRecent,
        ...yRecent,
        ...zRecent
      );
      
      const recentMax = Math.max(
        ...xRecent,
        ...yRecent,
        ...zRecent
      );
      
      // Get absolute min/max from all data
      const absoluteMin = Math.min(...allValues);
      const absoluteMax = Math.max(...allValues);
      
      // Use a weighted approach that favors recent data but considers all-time extremes
      const weightRecent = 0.9; // 90% weight to recent data (increased from 70%)
      let min = recentMin * weightRecent + absoluteMin * (1 - weightRecent);
      let max = recentMax * weightRecent + absoluteMax * (1 - weightRecent);
      
      // Ensure minimum range to prevent flat lines when values are constant
      // Reduced from 0.05 to 0.02 to make scale tighter
      const minRange = 0.02; 
      if (max - min < minRange) {
        const center = (max + min) / 2;
        min = center - minRange / 2;
        max = center + minRange / 2;
      }
      
      // Add padding to ensure values don't touch the edges
      // Reduced padding from 15% to 8% to make scale tighter
      const range = Math.max(0.05, max - min);
      const padding = range * 0.08;
      
      // Update the y-range more responsively
      // Increased smoothFactor from 0.2 to 0.4 for faster adaptation
      const smoothFactor = 0.4;
      this.yMin = this.yMin !== -1 ? 
        this.yMin * (1 - smoothFactor) + (min - padding) * smoothFactor : 
        min - padding;
      
      this.yMax = this.yMax !== 1 ? 
        this.yMax * (1 - smoothFactor) + (max + padding) * smoothFactor : 
        max + padding;
    }
  },
  
  watch: {
    device: {
      immediate: true,
      handler(newDevice, oldDevice) {
        if (this.subscription) {
          this.subscription.unsubscribe();
          this.subscription = null;
        }
        
        if (this.updateTimer) {
          clearInterval(this.updateTimer);
          this.updateTimer = null;
        }
        
        this.resetDataArrays();
        
        if (newDevice) {
          this.$nextTick(() => {
            this.subscribeToAccelerometer();
          });
        }
      }
    },
    
    // Watch for changes in timeData length
    'timeData.length'() {
      // Update scroll position whenever new data comes in
      this.$nextTick(() => {
        this.updateScrollPosition();
      });
    },
    
    // Watch for changes in scrolling mode
    enableScrolling(newValue) {
      // Rebuild all segments when scrolling mode changes to apply new coord calculations
      this.xSegments = [];
      this.ySegments = [];
      this.zSegments = [];
      
      this.$nextTick(() => {
        // Redraw all existing data with new coordinate system
        this.updateAxisSegments('x', this.axData, this.timeData);
        this.updateAxisSegments('y', this.ayData, this.timeData);
        this.updateAxisSegments('z', this.azData, this.timeData);
        this.updateScrollPosition();
      });
    }
  },
  
  mounted() {
    // Subscribe to accelerometer if device is already available
    if (this.device) {
      this.subscribeToAccelerometer();
    }
    
    // Listen for theme changes
    this.themeListener = () => {
      this.$forceUpdate();
    };
    themeManager.addListener(this.themeListener);
  },
  
  beforeUnmount() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
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

.smoothing-control {
  display: flex;
  align-items: center;
  gap: 10px;
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

