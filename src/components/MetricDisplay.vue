<template>
  <div class="metric-display">
    <p>
      <b>{{ label }}:</b>
      {{ value.toFixed(precision) }}{{ unit }} - Mean: {{ meanValue.toFixed(precision) }}{{ unit }} - StdDev: {{ stdDevValue.toFixed(precision) }}{{ unit }}
    </p>
  </div>
</template>

<script>
export default {
  props: {
    label: {
      type: String,
      required: true
    },
    value: {
      type: Number,
      required: true
    },
    meanValue: {
      type: Number,
      required: true
    },
    stdDevValue: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      default: ''
    },
    precision: {
      type: Number,
      default: 2
    }
  }
}
</script>

<style scoped>
.metric-display {
  margin-bottom: 8px;
}
</style> 