<template>
  <div>
    <MetricDisplay 
      label="QTc"
      :value="value"
      :meanValue="meanValue"
      :stdDevValue="stdDevValue"
      :unit="unit"
      :precision="precision"
    />
  </div>
</template>

<script>
import QtcCalculator from '../services/QTcCalculator.js'
import MetricMixin from '../mixins/MetricMixin.js'
import MetricDisplay from './MetricDisplay.vue'

export default {
  components: {
    MetricDisplay
  },
  mixins: [MetricMixin],
  data() {
    return {
      calculatorClass: QtcCalculator
    }
  }
}
</script>

<style scoped>
</style> 