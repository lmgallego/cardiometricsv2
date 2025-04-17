<template>
  <div>
    <MetricDisplay 
      label="pNN50"
      :value="value"
      :meanValue="meanValue"
      :stdDevValue="stdDevValue"
      :unit="unit"
      :precision="precision"
    />
  </div>
</template>

<script>
import pNN50Calculator from '../services/pNN50Calculator.js'
import MetricMixin from '../mixins/MetricMixin.js'
import MetricDisplay from './MetricDisplay.vue'

export default {
  components: {
    MetricDisplay
  },
  mixins: [MetricMixin],
  data() {
    return {
      calculatorClass: pNN50Calculator
    }
  }
}
</script>

<style scoped>
</style>

