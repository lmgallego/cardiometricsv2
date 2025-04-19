<template>
  <CardWrapper title="Energy Level">
    <!-- Energy Level Value -->
    <div class="flex justify-between items-center mb-4">
      <div class="text-sm text-gray-500 dark:text-gray-400">Current Status</div>
      <div class="text-right">
        <div :class="energyLevelColorClass" class="text-3xl font-bold">
          {{ energyValue }}%
        </div>
        <div class="text-sm text-gray-600 dark:text-gray-300">{{ energyLevelLabel }}</div>
      </div>
    </div>

    <!-- Energy Level Bar -->
    <div class="mb-4">
      <div class="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-500"
          :style="{ width: `${energyValue}%` }"
          :class="energyLevelBarColorClass"
        ></div>
      </div>
    </div>

    <!-- Energy Components -->
    <div class="mb-4">
      <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Energy Components</h3>
      
      <div class="grid grid-cols-2 gap-3">
        <!-- PSNS Score -->
        <div class="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div class="text-xs text-gray-500 dark:text-gray-400">PSNS Activity</div>
          <div class="font-bold text-gray-800 dark:text-gray-100">{{ psnsValue }}</div>
        </div>
        
        <!-- Total Power -->
        <div class="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div class="text-xs text-gray-500 dark:text-gray-400">Total Power</div>
          <div class="font-bold text-gray-800 dark:text-gray-100">{{ Math.round(totalPowerValue) }}</div>
        </div>
      </div>
    </div>

    <!-- HRV Metrics -->
    <div class="border-t border-gray-200 dark:border-gray-700 pt-3">
      <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">HRV Metrics</h3>
      
      <div class="grid grid-cols-2 gap-3">
        <!-- SDNN -->
        <div class="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div class="text-xs text-gray-500 dark:text-gray-400">SDNN</div>
          <div class="font-bold text-gray-800 dark:text-gray-100">{{ sdnnValue }} ms</div>
        </div>
        
        <!-- RMSSD -->
        <div class="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div class="text-xs text-gray-500 dark:text-gray-400">RMSSD</div>
          <div class="font-bold text-gray-800 dark:text-gray-100">{{ rmssdValue }} ms</div>
        </div>
      </div>
    </div>
  </CardWrapper>
</template>

<script>
import EnergyIndex from '../services/EnergyIndex'
import MetricMixin from '../mixins/MetricMixin'
import CardWrapper from './CardWrapper.vue'
import { metrics } from '../services/store.js' // Added import for central metrics store

export default {
  name: 'EnergyDisplay',
  components: {
    CardWrapper
  },
  mixins: [MetricMixin],
  props: {
    device: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      energyValue: 0,
      // Store contributing metrics if needed for display
      psnsValue: 0,
      sdnnValue: 0,
      rmssdValue: 0,
      totalPowerValue: 0,
      calculatorClass: EnergyIndex, // Use the EnergyIndex calculator
      metrics: metrics // Added metrics store to data
    }
  },
  mounted() { // Added mounted hook
    // Initialize from central store
    this.totalPowerValue = this.metrics.totalPower || 0;
    this.energyValue = Math.round(this.metrics.energyLevel || 0);
    
    // Watch the central store for changes to totalPower
    // Define computed properties to watch for changes in the store
    Object.defineProperty(this, '$watcherTotalPower', {
      get: () => this.metrics.totalPower,
      set: () => {}
    });
    Object.defineProperty(this, '$watcherEnergyLevel', {
      get: () => this.metrics.energyLevel,
      set: () => {}
    });
    
    // Setup watchers for changes in the metrics store
    this.$watch('$watcherTotalPower', () => {
      this.totalPowerValue = this.metrics.totalPower || 0;
    });
    
    this.$watch('$watcherEnergyLevel', () => {
      this.energyValue = Math.round(this.metrics.energyLevel || 0);
    });
  },
  computed: {
    energyLevelColorClass() {
      // Define classes based on energy levels (adjust thresholds as needed)
      if (this.energyValue < 35) return 'text-red-500'
      if (this.energyValue < 70) return 'text-orange-500'
      return 'text-green-500'
    },
    energyLevelLabel() {
      // Define labels based on energy levels
      if (this.energyValue < 35) return 'Low'
      if (this.energyValue < 70) return 'Medium'
      return 'High'
    },
    energyLevelBarColorClass() {
      // Define classes based on energy levels (adjust thresholds as needed)
      if (this.energyValue < 35) return 'bg-red-500'
      if (this.energyValue < 70) return 'bg-orange-500'
      return 'bg-green-500'
    }
  },
  methods: {
    updateMetrics(calculator) {
      // Get the main energy value - REMOVED direct value setting
      // this.value = calculator.value || 0;
      // this.energyValue = Math.round(this.value);

      // Get detailed metrics from the calculator's history if available
      if (calculator.metricHistory) {
        const history = calculator.metricHistory;
        this.psnsValue = history.psns && history.psns.length > 0 ?
          Math.round(history.psns[history.psns.length - 1]) : 0;
        this.sdnnValue = history.sdnn && history.sdnn.length > 0 ?
          Math.round(history.sdnn[history.sdnn.length - 1]) : 0;
        this.rmssdValue = history.rmssd && history.rmssd.length > 0 ?
          Math.round(history.rmssd[history.rmssd.length - 1]) : 0;
      }
    }
  }
}
</script> 