<template>
  <CardWrapper title="Frequency analysis">
    <div class="mb-6">
      <div class="flex items-center justify-between">
        <div>
          <span class="text-2xl font-bold" :class="getStatusClass('totalPower', totalPower)">{{ Math.round(totalPower) }}ms²</span>
          <span class="ml-2">{{ getMetricDefinition('totalPower').name }}</span>
        </div>
        <div class="rounded-full bg-gray-200 dark:bg-gray-700 p-1">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
      <div class="text-sm" :class="getStatusClass('totalPower', totalPower)">
        {{ getStatusText('totalPower', totalPower) }}
      </div>
      <div class="text-gray-500 dark:text-gray-400">
        Normal range: {{ getMetricDefinition('totalPower').normalRange.min }}—{{ getMetricDefinition('totalPower').normalRange.max }} ms²
      </div>
    </div>
    
    <div class="relative h-48 mb-6 bg-gray-100 dark:bg-gray-800 rounded">
      <!-- Simplified frequency spectrum graph -->
      <div class="absolute inset-0 flex items-end p-2">
        <div class="bg-red-400 w-1/5 h-1/4 rounded-t-sm"></div>
        <div class="bg-blue-500 w-1/5 h-3/4 rounded-t-sm"></div>
        <div class="bg-yellow-300 w-3/5 h-1/6 rounded-t-sm"></div>
      </div>
      <div class="absolute bottom-0 left-0 w-full h-px bg-gray-400 dark:bg-gray-600"></div>
      <div class="absolute bottom-0 left-0 w-px h-full bg-gray-400 dark:bg-gray-600"></div>
      <div class="absolute bottom-0 left-2 text-xs text-gray-500 dark:text-gray-400 transform translate-y-4">0,0</div>
      <div class="absolute bottom-0 right-2 text-xs text-gray-500 dark:text-gray-400 transform translate-y-4">0,4</div>
    </div>
    
    <div class="space-y-4">
      <div class="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded">
        <div class="flex items-center">
          <div class="w-16 h-1 bg-red-400 mr-2"></div>
          <span>{{ getMetricDefinition('vlfPower').name.split(' ')[0] }}</span>
        </div>
        <span :class="getStatusClass('vlfPower', vlfPower)">{{ Math.round(vlfPower) }}ms²</span>
      </div>
      
      <div class="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded">
        <div class="flex items-center">
          <div class="w-16 h-1 bg-blue-500 mr-2"></div>
          <span>{{ getMetricDefinition('lfPower').name.split(' ')[0] }}</span>
        </div>
        <span :class="getStatusClass('lfPower', lfPower)">{{ Math.round(lfPower) }}ms²</span>
      </div>
      
      <div class="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded">
        <div class="flex items-center">
          <div class="w-16 h-1 bg-yellow-300 mr-2"></div>
          <span>{{ getMetricDefinition('hfPower').name.split(' ')[0] }}</span>
        </div>
        <span :class="getStatusClass('hfPower', hfPower)">{{ Math.round(hfPower) }}ms²</span>
      </div>
    </div>
    
    <div class="mt-6">
      <h3 class="text-lg mb-2">Conclusion</h3>
      <p class="text-gray-700 dark:text-gray-300">
        Your spectral power is {{ getStatusText('totalPower', totalPower).toLowerCase() }}. 
        {{ getSpectralAnalysisConclusion }}
      </p>
    </div>
  </CardWrapper>
</template>

<script>
import TotalPower from '../services/TotalPower.js'
import VLFPower from '../services/VLFPower.js'
import LFPower from '../services/LFPower.js'
import HFPower from '../services/HFPower.js'
import { metrics } from '../services/store.js'
import { MetricDefinitions, getMetricStatus, getMetricStatusClass } from '../services/MetricDefinitions.js'
import SubscriptionMixin from '../mixins/SubscriptionMixin.js'
import CardWrapper from './CardWrapper.vue'

export default {
  components: {
    CardWrapper
  },
  mixins: [SubscriptionMixin],
  props: {
    device: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      // Dummy calculator class to satisfy RRIntMixin requirements
      calculatorClass: TotalPower,
      totalPower: 0,
      vlfPower: 0,
      lfPower: 0,
      hfPower: 0,
      metrics: metrics
    }
  },
  mounted() {
    this.initializeCalculators()
    this.setupMetricWatchers()
  },
  computed: {
    getSpectralAnalysisConclusion() {
      const lfhfRatio = this.lfPower / this.hfPower
      
      if (this.totalPower < MetricDefinitions.totalPower.normalRange.min) {
        return "This often means that something's not right. Your measurement is heavy on the LF waves, and low on HF waves. This could be a sign of stress, but there's not enough information to make a definite conclusion."
      }
      
      if (lfhfRatio > MetricDefinitions.lfhfRatio.normalRange.max) {
        return "Your measurement shows higher LF activity compared to HF, which could indicate sympathetic nervous system dominance, often associated with stress response."
      }
      
      if (lfhfRatio < MetricDefinitions.lfhfRatio.normalRange.min) {
        return "Your measurement shows higher HF activity compared to LF, which could indicate parasympathetic nervous system dominance, often associated with rest and recovery."
      }
      
      return "Your LF and HF components are relatively balanced, which often indicates a healthy autonomic nervous system balance."
    }
  },
  methods: {
    initializeCalculators() {
      if (!this.device) return
      
      // Create calculators and set up subscriptions for all metrics
      this.setupCalculator('totalPower', TotalPower)
      this.setupCalculator('vlfPower', VLFPower)
      this.setupCalculator('lfPower', LFPower)
      this.setupCalculator('hfPower', HFPower)
      
      // Initialize with current values
      this.totalPower = this.metrics.totalPower || 0
      this.vlfPower = this.metrics.vlfPower || 0
      this.lfPower = this.metrics.lfPower || 0
      this.hfPower = this.metrics.hfPower || 0
    },
    
    setupCalculator(metricName, CalculatorClass) {
      const calculator = new CalculatorClass(this.device)
      
      // Subscribe to calculator updates
      this.safeSubscribe(
        `frequency-${metricName}`,
        calculator.subscribe(),
        (value) => {
          this[metricName] = value
        }
      )
    },
    
    setupMetricWatchers() {
      // Watch global metrics store and update local values
      Object.defineProperty(this, '$watcherTotalPower', {
        get: () => this.metrics.totalPower,
        set: () => {}
      })
      
      Object.defineProperty(this, '$watcherVlfPower', {
        get: () => this.metrics.vlfPower,
        set: () => {}
      })
      
      Object.defineProperty(this, '$watcherLfPower', {
        get: () => this.metrics.lfPower,
        set: () => {}
      })
      
      Object.defineProperty(this, '$watcherHfPower', {
        get: () => this.metrics.hfPower,
        set: () => {}
      })
      
      this.$watch('$watcherTotalPower', () => {
        this.totalPower = this.metrics.totalPower || 0
      })
      
      this.$watch('$watcherVlfPower', () => {
        this.vlfPower = this.metrics.vlfPower || 0
      })
      
      this.$watch('$watcherLfPower', () => {
        this.lfPower = this.metrics.lfPower || 0
      })
      
      this.$watch('$watcherHfPower', () => {
        this.hfPower = this.metrics.hfPower || 0
      })
    },
    
    // Get metric definition by key
    getMetricDefinition(key) {
      return MetricDefinitions[key] || {}
    },
    
    // Get status text for metric
    getStatusText(metricKey, value) {
      return getMetricStatus(metricKey, value)
    },
    
    // Get CSS class for metric status
    getStatusClass(metricKey, value) {
      return getMetricStatusClass(metricKey, value)
    }
  }
}
</script>

<style scoped>
</style> 