<template>
  <div>
    <MetricDisplay 
      label="SDNN"
      :value="value"
      :meanValue="meanValue"
      :stdDevValue="stdDevValue"
      :unit="unit"
      :precision="precision"
    />
  </div>
</template>

<script>
import SdnnCalculator from '../services/SDNNCalculator.js'
import MetricMixin from '../mixins/MetricMixin.js'
import MetricDisplay from './MetricDisplay.vue'

export default {
  components: {
    MetricDisplay
  },
  mixins: [MetricMixin],
  data() {
    return {
      calculatorClass: SdnnCalculator
    }
  }
}
</script>

<style scoped>
</style>

