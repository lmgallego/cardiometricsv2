<template>
  <div>
    <MetricDisplay 
      label="AMo50"
      :value="value"
      :meanValue="meanValue"
      :stdDevValue="stdDevValue"
      :unit="unit"
      :precision="precision"
    />
  </div>
</template>

<script>
import AMo50Calculator from '../services/AMo50Calculator.js'
import MetricMixin from '../mixins/MetricMixin.js'
import MetricDisplay from './MetricDisplay.vue'

export default {
  components: {
    MetricDisplay
  },
  mixins: [MetricMixin],
  data() {
    return {
      calculatorClass: AMo50Calculator
    }
  }
}
</script>

<style scoped>
</style>

