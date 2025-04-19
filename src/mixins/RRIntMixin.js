import { opts, metrics } from '../services/store'
import log from '@/log'
import SubscriptionMixin from './SubscriptionMixin'

export default {
  mixins: [SubscriptionMixin],
  
  data() {
    return {
      opts: opts,
      metrics: metrics,
      value: 0,
      calculator: null,
      unit: '',
      precision: 2,
      calculatorInitialized: false
    }
  },
  
  props: ['device'],
  
  computed: {
    // Map calculator class to metrics store key
    metricKey() {
      if (!this.calculatorClass) return null;
      
      // Get class name and convert to store key format
      const className = this.calculatorClass.name.toLowerCase();
      
      if (className === 'sdnn') return 'sdnn';
      if (className === 'rmssd') return 'rmssd';
      if (className === 'pnn50') return 'pnn50';
      if (className === 'cv') return 'cv';
      if (className === 'qtc') return 'qtc';
      if (className === 'mxdmn') return 'mxdmn';
      if (className === 'amo50') return 'amo50';
      if (className === 'totalpower') return 'totalPower';
      if (className === 'vlfpower') return 'vlfPower';
      if (className === 'lfpower') return 'lfPower';
      if (className === 'hfpower') return 'hfPower';
      if (className === 'lfhfratio') return 'lfhfRatio';
      
      return null;
    },
    
    // Check if the metric value is already available in the store
    isMetricAvailable() {
      return this.metricKey && 
        this.metricKey in this.metrics && 
        this.metrics[this.metricKey] !== 0;
    }
  },
  
  watch: {
    device: {
      immediate: true,
      handler(newDevice, oldDevice) {
        // Clean up old device resources
        if (oldDevice) {
          this.cleanupDevice(oldDevice)
        }
        
        // Set up new device
        this.setupDevice(newDevice)
      },
    },
  },
  
  methods: {
    setupDevice(device) {
      // Skip if no device or no calculator class defined
      if (!device || !this.calculatorClass) {
        return
      }
      
      try {
        // Check if another component has already initialized this calculator
        // or if the value already exists in the metrics store
        const calculatorName = this.calculatorClass.name;
        
        // Initialize calculator only if needed (first instance or no value in store)
        if (!this.isMetricAvailable || !this.calculatorInitialized) {
          log.debug(`RRIntMixin: Setting up ${calculatorName} with device`)
          
          // Create calculator with current device
          this.calculator = new this.calculatorClass(device, this.opts)
          this.unit = this.calculator.unit
          this.precision = this.calculator.precision
          this.calculatorInitialized = true
          
          // Subscribe to metric updates using safeSubscribe from SubscriptionMixin
          this.safeSubscribe(
            // Unique key for this subscription
            `calculator-${calculatorName}`,
            
            // The observable
            this.calculator.subscribe(),
            
            // Next handler - receives metric updates
            (metric) => {
              this.value = metric
              
              // Call addMetricValue if the component uses MetricHistoryMixin
              if (typeof this.addMetricValue === 'function') {
                this.addMetricValue(metric)
              }
              
              // Call custom update method if the component defines it
              if (typeof this.updateMetrics === 'function') {
                this.updateMetrics(this.calculator)
              }
            }
          )
        } else {
          // Just set the unit and precision from the metrics store if calculator is already initialized
          log.debug(`RRIntMixin: Using existing ${calculatorName} from metrics store`)
          
          // Create a temporary calculator just to get the unit and precision
          const tempCalculator = new this.calculatorClass(device, this.opts)
          this.unit = tempCalculator.unit
          this.precision = tempCalculator.precision
          tempCalculator.destroy()
        }
      } catch (error) {
        log.debug('RRIntMixin: Error setting up device:', error)
      }
    },
    
    cleanupDevice(device) {
      // Clean up previous calculator
      this.destroyCalculator()
      
      // All subscriptions are automatically managed by SubscriptionMixin
    },
    
    destroyCalculator() {
      // Safely destroy calculator
      if (this.calculator) {
        try {
          this.calculator.destroy()
        } catch (e) {
          log.debug('RRIntMixin: Error destroying calculator:', e)
        }
        this.calculator = null
        this.calculatorInitialized = false
      }
    },
  },
  
  // Support for HMR
  beforeCreate() {
    if (import.meta.hot) {
      import.meta.hot.accept(() => {
        log.debug(`RRIntMixin: HMR triggered in component using ${this.calculatorClass?.name || 'unknown calculator'}`)
      })
    }
  },
  
  beforeDestroy() {
    // Destroy the calculator
    this.destroyCalculator()
    
    // No need to manually unsubscribe here since SubscriptionMixin handles it
  },
  
  created() {
    if (!this.calculatorClass) {
      console.error('RRIntMixin requires "calculatorClass" to be defined in the component.')
    }
  },
} 