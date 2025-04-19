<template>
  <div class="bg-white dark:bg-gray-900 rounded-lg shadow p-4 transition-colors duration-300 border border-gray-100 dark:border-gray-700">
    <div v-if="title" class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold text-gray-800 dark:text-white">{{ title }}</h2>
      <slot name="action"></slot>
    </div>
    <slot></slot>
  </div>
</template>

<script>
export default {
  name: 'CardWrapper',
  props: {
    title: {
      type: String,
      default: ''
    }
  }
}
</script>

<style scoped>
/* Ensure consistent height and overflow behavior */
.card {
  height: 100%;
  overflow: hidden;
}
</style> 