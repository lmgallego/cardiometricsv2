<template>
  <div>
    <MetricDisplay 
      label="RMSSD"
      :value="sharedValue"
      :meanValue="sharedMeanValue"
      :stdDevValue="sharedStdDevValue"
      :unit="unit"
      :precision="precision"
    />
  </div>
</template>

<script>
import RMSSD from '../services/RMSSD.js'
import MetricMixin from '../mixins/MetricMixin.js'
import MetricDisplay from './MetricDisplay.vue'

export default {
  components: {
    MetricDisplay
  },
  mixins: [MetricMixin],
  data() {
    return {
      calculatorClass: RMSSD
    }
  }
}
</script>

<style scoped>
</style>

