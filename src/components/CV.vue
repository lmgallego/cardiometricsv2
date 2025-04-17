<template>
  <div>
    <MetricDisplay 
      label="CV"
      :value="value"
      :meanValue="meanValue"
      :stdDevValue="stdDevValue"
      :unit="unit"
      :precision="precision"
    />
  </div>
</template>

<script>
import CvCalculator from '../services/CVCalculator.js'
import MetricMixin from '../mixins/MetricMixin.js'
import MetricDisplay from './MetricDisplay.vue'

export default {
  components: {
    MetricDisplay
  },
  mixins: [MetricMixin],
  data() {
    return {
      calculatorClass: CvCalculator
    }
  }
}
</script>

<style scoped>
</style>

