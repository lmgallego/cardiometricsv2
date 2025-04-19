<template>
  <div>
    <MetricDisplay 
      label="SDNN"
      :value="sharedValue"
      :meanValue="sharedMeanValue"
      :stdDevValue="sharedStdDevValue"
      :unit="unit"
      :precision="precision"
    />
  </div>
</template>

<script>
import SDNN from '../services/SDNN.js'
import MetricMixin from '../mixins/MetricMixin.js'
import MetricDisplay from './MetricDisplay.vue'

export default {
  components: {
    MetricDisplay
  },
  mixins: [MetricMixin],
  data() {
    return {
      calculatorClass: SDNN
    }
  }
}
</script>

<style scoped>
</style>

