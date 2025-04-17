<template>
  <div>
    <MetricDisplay 
      label="MxDMn"
      :value="value"
      :meanValue="meanValue"
      :stdDevValue="stdDevValue"
      :unit="unit"
      :precision="precision"
    />
  </div>
</template>

<script>
import MxdmnCalculator from '../services/MxDMnCalculator.js'
import MetricMixin from '../mixins/MetricMixin.js'
import MetricDisplay from './MetricDisplay.vue'

export default {
  components: {
    MetricDisplay
  },
  mixins: [MetricMixin],
  data() {
    return {
      calculatorClass: MxdmnCalculator
    }
  }
}
</script>

<style scoped>
</style>

