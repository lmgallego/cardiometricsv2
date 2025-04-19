<template>
  <CardWrapper title="HRV Metrics">
    <div class="grid grid-cols-2 gap-4">
      <!-- SDNN -->
      <div class="p-3 bg-gray-100 dark:bg-gray-800 rounded shadow-sm">
        <div class="flex justify-between">
          <div>
            <span class="text-xl font-bold" :class="getStatusClass('sdnn', sdnn)">{{ sdnn.toFixed(2) }}</span>
            <span class="text-gray-500 dark:text-gray-400 ml-1">ms</span>
          </div>
          <div class="text-sm">SDNN</div>
        </div>
        <div class="text-sm text-gray-500 dark:text-gray-400">{{ getMetricDefinition('sdnn').description }}</div>
        <div class="text-xs mt-1">
          Normal: {{ getMetricDefinition('sdnn').normalRange.min }}-{{ getMetricDefinition('sdnn').normalRange.max }}ms
        </div>
      </div>
      
      <!-- RMSSD -->
      <div class="p-3 bg-gray-100 dark:bg-gray-800 rounded shadow-sm">
        <div class="flex justify-between">
          <div>
            <span class="text-xl font-bold" :class="getStatusClass('rmssd', rmssd)">{{ rmssd.toFixed(2) }}</span>
            <span class="text-gray-500 dark:text-gray-400 ml-1">ms</span>
          </div>
          <div class="text-sm">RMSSD</div>
        </div>
        <div class="text-sm text-gray-500 dark:text-gray-400">{{ getMetricDefinition('rmssd').description }}</div>
        <div class="text-xs mt-1">
          Normal: {{ getMetricDefinition('rmssd').normalRange.min }}-{{ getMetricDefinition('rmssd').normalRange.max }}ms
        </div>
      </div>
      
      <!-- pNN50 -->
      <div class="p-3 bg-gray-100 dark:bg-gray-800 rounded shadow-sm">
        <div class="flex justify-between">
          <div>
            <span class="text-xl font-bold" :class="getStatusClass('pnn50', pnn50)">{{ pnn50.toFixed(2) }}</span>
            <span class="text-gray-500 dark:text-gray-400 ml-1">%</span>
          </div>
          <div class="text-sm">pNN50</div>
        </div>
        <div class="text-sm text-gray-500 dark:text-gray-400">{{ getMetricDefinition('pnn50').description }}</div>
        <div class="text-xs mt-1">
          Normal: {{ getMetricDefinition('pnn50').normalRange.min }}-{{ getMetricDefinition('pnn50').normalRange.max }}%
        </div>
      </div>
      
      <!-- MxDMn -->
      <div class="p-3 bg-gray-100 dark:bg-gray-800 rounded shadow-sm">
        <div class="flex justify-between">
          <div>
            <span class="text-xl font-bold" :class="getStatusClass('mxdmn', mxdmn)">{{ mxdmn.toFixed(2) }}</span>
            <span class="text-gray-500 dark:text-gray-400 ml-1">ms</span>
          </div>
          <div class="text-sm">MxDMn</div>
        </div>
        <div class="text-sm text-gray-500 dark:text-gray-400">{{ getMetricDefinition('mxdmn').description }}</div>
        <div class="text-xs mt-1">
          Normal: {{ getMetricDefinition('mxdmn').normalRange.min }}-{{ getMetricDefinition('mxdmn').normalRange.max }}ms
        </div>
      </div>
      
      <!-- AMo50 -->
      <div class="p-3 bg-gray-100 dark:bg-gray-800 rounded shadow-sm">
        <div class="flex justify-between">
          <div>
            <span class="text-xl font-bold" :class="getStatusClass('amo50', amo50)">{{ amo50.toFixed(2) }}</span>
            <span class="text-gray-500 dark:text-gray-400 ml-1">%</span>
          </div>
          <div class="text-sm">AMo50</div>
        </div>
        <div class="text-sm text-gray-500 dark:text-gray-400">{{ getMetricDefinition('amo50').description }}</div>
        <div class="text-xs mt-1">
          Normal: {{ getMetricDefinition('amo50').normalRange.min }}-{{ getMetricDefinition('amo50').normalRange.max }}%
        </div>
      </div>
      
      <!-- CV -->
      <div class="p-3 bg-gray-100 dark:bg-gray-800 rounded shadow-sm">
        <div class="flex justify-between">
          <div>
            <span class="text-xl font-bold" :class="getStatusClass('cv', cv)">{{ cv.toFixed(2) }}</span>
          </div>
          <div class="text-sm">CV</div>
        </div>
        <div class="text-sm text-gray-500 dark:text-gray-400">{{ getMetricDefinition('cv').description }}</div>
        <div class="text-xs mt-1">
          Normal: {{ getMetricDefinition('cv').normalRange.min }}-{{ getMetricDefinition('cv').normalRange.max }}
        </div>
      </div>
    </div>
    
    <div class="mt-4 text-sm text-gray-600 dark:text-gray-300">
      These metrics analyze heart rate variability from different perspectives, providing insights into autonomic nervous system balance and overall stress levels.
    </div>
  </CardWrapper>
</template>

<script>
import SDNN from '../services/SDNN.js'
import RMSSD from '../services/RMSSD.js'
import PNN50 from '../services/pNN50.js'
import MxDMn from '../services/MxDMn.js'
import AMo50 from '../services/AMo50.js'
import CV from '../services/CV.js'
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
      calculatorClass: SDNN, 
      sdnn: 0,
      rmssd: 0,
      pnn50: 0,
      mxdmn: 0,
      amo50: 0,
      cv: 0,
      metrics: metrics
    }
  },
  mounted() {
    this.initializeCalculators()
    
    // Set up watchers for metrics
    this.setupMetricWatchers()
  },
  computed: {
    metricDefinitions() {
      return MetricDefinitions
    }
  },
  methods: {
    initializeCalculators() {
      if (!this.device) return
      
      // Create calculators and set up subscriptions for all metrics
      this.setupCalculator('sdnn', SDNN)
      this.setupCalculator('rmssd', RMSSD)
      this.setupCalculator('pnn50', PNN50)
      this.setupCalculator('mxdmn', MxDMn)
      this.setupCalculator('amo50', AMo50)
      this.setupCalculator('cv', CV)
      
      // Initialize with current values
      this.sdnn = this.metrics.sdnn || 0
      this.rmssd = this.metrics.rmssd || 0
      this.pnn50 = this.metrics.pnn50 || 0
      this.mxdmn = this.metrics.mxdmn || 0
      this.amo50 = this.metrics.amo50 || 0
      this.cv = this.metrics.cv || 0
    },
    
    setupCalculator(metricName, CalculatorClass) {
      const calculator = new CalculatorClass(this.device)
      
      // Subscribe to calculator updates
      this.safeSubscribe(
        `hrv-${metricName}`,
        calculator.subscribe(),
        (value) => {
          this[metricName] = value
        }
      )
    },
    
    setupMetricWatchers() {
      // Watch global metrics store and update local values
      Object.defineProperty(this, '$watcherSdnn', {
        get: () => this.metrics.sdnn,
        set: () => {}
      })
      
      Object.defineProperty(this, '$watcherRmssd', {
        get: () => this.metrics.rmssd,
        set: () => {}
      })
      
      Object.defineProperty(this, '$watcherPnn50', {
        get: () => this.metrics.pnn50,
        set: () => {}
      })
      
      Object.defineProperty(this, '$watcherMxdmn', {
        get: () => this.metrics.mxdmn,
        set: () => {}
      })
      
      Object.defineProperty(this, '$watcherAmo50', {
        get: () => this.metrics.amo50,
        set: () => {}
      })
      
      Object.defineProperty(this, '$watcherCv', {
        get: () => this.metrics.cv,
        set: () => {}
      })
      
      this.$watch('$watcherSdnn', () => {
        this.sdnn = this.metrics.sdnn || 0
      })
      
      this.$watch('$watcherRmssd', () => {
        this.rmssd = this.metrics.rmssd || 0
      })
      
      this.$watch('$watcherPnn50', () => {
        this.pnn50 = this.metrics.pnn50 || 0
      })
      
      this.$watch('$watcherMxdmn', () => {
        this.mxdmn = this.metrics.mxdmn || 0
      })
      
      this.$watch('$watcherAmo50', () => {
        this.amo50 = this.metrics.amo50 || 0
      })
      
      this.$watch('$watcherCv', () => {
        this.cv = this.metrics.cv || 0
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