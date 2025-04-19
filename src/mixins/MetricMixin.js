import RRIntMixin from './RRIntMixin.js'
import MetricHistoryMixin from './MetricHistoryMixin.js'
import { metrics } from '../services/store.js'

export default {
  mixins: [RRIntMixin, MetricHistoryMixin],
  
  data() {
    return {
      metrics: metrics,
      useSharedMetrics: true // Enable shared metrics by default
    }
  },
  
  computed: {
    // Map metric name to metrics store key
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
    
    // Get value from centralized store if available
    sharedValue() {
      if (this.useSharedMetrics && this.metricKey && this.metricKey in this.metrics) {
        return this.metrics[this.metricKey];
      }
      return this.value;
    },
    
    // Get mean value from centralized store if available
    sharedMeanValue() {
      if (this.useSharedMetrics && this.metricKey && this.metrics.means && this.metricKey in this.metrics.means) {
        return this.metrics.means[this.metricKey];
      }
      return this.meanValue;
    },
    
    // Get standard deviation value from centralized store if available
    sharedStdDevValue() {
      if (this.useSharedMetrics && this.metricKey && this.metrics.stdDevs && this.metricKey in this.metrics.stdDevs) {
        return this.metrics.stdDevs[this.metricKey];
      }
      return this.stdDevValue;
    }
  }
}
