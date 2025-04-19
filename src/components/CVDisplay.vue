<template>
  <div class="bg-gray-900 text-white p-4 rounded-lg">
    <div class="flex items-center justify-between">
      <div>
        <span class="text-2xl font-bold text-red-500">{{ cv }}</span>
        <span class="text-red-500 ml-2">CV</span>
        <span class="ml-2">+</span>
      </div>
      <div class="rounded-full bg-gray-700 p-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    </div>
    <div class="text-sm text-red-500">{{ cvStatus }}</div>
    <div class="text-gray-400">Normal range: 5.3—7.8</div>
    
    <div class="mt-6">
      <div class="relative h-24 mb-6">
        <!-- Timeline graph visualization -->
        <svg width="100%" height="100%" class="relative z-10">
          <polyline
            :points="graphPoints"
            fill="none"
            stroke="#10B981"
            stroke-width="2"
          />
          <!-- Red point at the beginning -->
          <circle cx="10" cy="20" r="4" fill="#EF4444" />
        </svg>
        <div class="absolute inset-x-0 bottom-0 h-px bg-gray-600"></div>
        <!-- Timeline labels -->
        <div class="absolute bottom-0 left-0 transform translate-y-2 text-xs text-gray-400">14:15<br/>Apr10</div>
        <div class="absolute bottom-0 right-0 transform translate-y-2 text-xs text-gray-400">21:19<br/>Today</div>
      </div>
    </div>
    
    <div class="mt-6">
      <p>
        Your variability is likely on the low end. This can happen when you're really tired, sick, or under a lot of physical or emotional stress.
      </p>
    </div>
  </div>
</template>

<script>
import CV from '../services/CV.js'
import MetricMixin from '../mixins/MetricMixin.js'

export default {
  mixins: [MetricMixin],
  props: {
    device: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      cvCalculator: new CV(),
      cv: 0,
      cvHistory: [6.6, 4.3, 6.2, 5.8, 5.3, 5.7, 5.4, 5.7, 5.4, 5.8]
    }
  },
  mounted() {
    this.device.addEventListener('hrv', this.updateValues)
  },
  beforeDestroy() {
    this.device.removeEventListener('hrv', this.updateValues)
  },
  computed: {
    cvStatus() {
      if (this.cv < 4.5) return 'Strained'
      if (this.cv < 5.3) return 'Below average'
      if (this.cv < 6.5) return 'Normal'
      if (this.cv < 7.8) return 'Good'
      return 'High'
    },
    graphPoints() {
      // Generate SVG polyline points based on history
      const height = 75
      const width = 450
      const pointCount = this.cvHistory.length
      const xStep = width / (pointCount - 1)
      
      return this.cvHistory.map((value, index) => {
        // Normalize value between 0 and 1, assuming range 0-15
        const normalizedValue = Math.min(Math.max(value, 0), 15) / 15
        // Invert Y (SVG coordinate system has 0,0 at top-left)
        const y = height - (normalizedValue * height)
        const x = index * xStep
        return `${x},${y}`
      }).join(' ')
    }
  },
  methods: {
    updateValues(event) {
      const hrvData = event.detail
      this.cv = Math.round(this.cvCalculator.calculate(hrvData) * 10) / 10
      
      // Update history (in a real implementation, you'd store and retrieve this properly)
      this.cvHistory = [this.cv, ...this.cvHistory.slice(0, 9)]
    }
  }
}
</script>

<style scoped>
</style> 