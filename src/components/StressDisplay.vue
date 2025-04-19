<template>
  <CardWrapper title="Stress Index">
    <!-- Stress Index Value -->
    <div class="flex justify-between items-center mb-4">
      <div class="text-sm text-gray-500 dark:text-gray-400">Current Status</div>
      <div class="text-right">
        <div :class="stressLevelColorClass" class="text-3xl font-bold">
          {{ stressValue }}%
        </div>
        <div class="text-sm text-gray-600 dark:text-gray-300">{{ stressLevelLabel }}</div>
      </div>
    </div>

    <!-- Stress Level Bar -->
    <div class="mb-4">
      <div class="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-500"
          :style="{ width: `${stressValue}%` }"
          :class="stressLevelBarColorClass"
        ></div>
      </div>
    </div>

    <!-- Nervous System Balance -->
    <div class="mb-4">
      <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nervous System Balance</h3>
      
      <div class="flex justify-between gap-2">
        <!-- SNS Activity (Fight or Flight) -->
        <div class="flex-1">
          <div class="flex justify-between items-center mb-1">
            <div class="text-xs text-gray-500 dark:text-gray-400">Fight or Flight (SNS)</div>
            <div class="text-xs font-semibold text-gray-800 dark:text-gray-100">{{ snsValue }}%</div>
          </div>
          <div class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              class="h-full bg-red-500 rounded-full transition-all duration-500"
              :style="{ width: `${snsValue}%` }"
            ></div>
          </div>
        </div>
        
        <!-- PSNS Activity (Rest & Digest) -->
        <div class="flex-1">
          <div class="flex justify-between items-center mb-1">
            <div class="text-xs text-gray-500 dark:text-gray-400">Rest & Digest (PSNS)</div>
            <div class="text-xs font-semibold text-gray-800 dark:text-gray-100">{{ psnsValue }}%</div>
          </div>
          <div class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              class="h-full bg-green-500 rounded-full transition-all duration-500"
              :style="{ width: `${psnsValue}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- HRV Metrics -->
    <div class="border-t border-gray-200 dark:border-gray-700 pt-3">
      <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contributing Factors</h3>
      
      <div class="grid grid-cols-2 gap-3">
        <!-- SDNN -->
        <div class="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div class="text-xs text-gray-500 dark:text-gray-400">SDNN</div>
          <div class="font-bold text-gray-800 dark:text-gray-100">{{ sdnn }}ms</div>
        </div>
        
        <!-- RMSSD -->
        <div class="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div class="text-xs text-gray-500 dark:text-gray-400">RMSSD</div>
          <div class="font-bold text-gray-800 dark:text-gray-100">{{ rmssd }}ms</div>
        </div>
        
        <!-- LF/HF Ratio -->
        <div class="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div class="text-xs text-gray-500 dark:text-gray-400">LF/HF Ratio</div>
          <div class="font-bold text-gray-800 dark:text-gray-100">{{ lfhf }}</div>
        </div>
        
        <!-- Heart Rate -->
        <div class="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div class="text-xs text-gray-500 dark:text-gray-400">Heart Rate</div>
          <div class="font-bold text-gray-800 dark:text-gray-100">{{ heartRate }}bpm</div>
        </div>
      </div>
    </div>
  </CardWrapper>
</template>

<script>
import StressIndex from '../services/StressIndex'
import CardWrapper from './CardWrapper.vue'
import MetricMixin from '../mixins/MetricMixin'
import { metrics } from '../services/store.js' // Import central metrics store

export default {
  name: 'StressDisplay',
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
      calculatorClass: StressIndex,
      metrics: metrics // Add metrics store to data
    }
  },
  
  computed: {
    // Get stress value directly from the central metrics store
    stressValue() {
      return Math.round(this.metrics.stressLevel || 0);
    },

    // SNS and PSNS values from the central metrics store
    snsValue() {
      return Math.round(this.metrics.snsActivity || 0);
    },
    
    psnsValue() {
      return Math.round(this.metrics.psnsActivity || 0);
    },
    
    // Get supporting metrics from the central store
    sdnn() {
      return Math.round(this.metrics.sdnn || 0);
    },
    
    rmssd() {
      return Math.round(this.metrics.rmssd || 0);
    },
    
    lfhf() {
      return this.metrics.lfhfRatio ? parseFloat(this.metrics.lfhfRatio.toFixed(2)) : 0;
    },
    
    heartRate() {
      return Math.round(this.metrics.heartRate || 0);
    },
    
    stressLevelBarColorClass() {
      if (this.stressValue < 30) return 'bg-green-500'
      if (this.stressValue < 60) return 'bg-orange-500'
      return 'bg-red-500'
    },
    
    stressLevelColorClass() {
      if (this.stressValue < 30) return 'text-green-500'
      if (this.stressValue < 60) return 'text-orange-500'
      return 'text-red-500'
    },
    
    stressLevelLabel() {
      if (this.stressValue < 30) return 'Low'
      if (this.stressValue < 60) return 'Moderate'
      return 'High'
    },
    
    isBalanced() {
      const diff = Math.abs(this.snsValue - this.psnsValue)
      return diff < 15
    },
    
    isSnsDominant() {
      return this.snsValue > this.psnsValue + 15
    },
    
    balanceColorClass() {
      if (this.isBalanced) return 'text-green-600'
      if (this.isSnsDominant) return 'text-orange-600'
      return 'text-blue-600'
    }
  },
  
  methods: {
    // We need the updateMetrics method back for compatibility with the mixin
    updateMetrics(calculator) {
      if (!calculator) return;

      // Calculate SNS and PSNS values if needed
      if (calculator.getSnsPower && calculator.getPsnsPower) {
        // These are already updated in the central store by StressIndex class
      }
    }
  }
}
</script> 