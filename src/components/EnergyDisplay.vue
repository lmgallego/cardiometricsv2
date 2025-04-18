<template>
  <div class="bg-white rounded-xl shadow-md p-4">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold">Energy Level</h2>
      <div class="text-right">
        <div :class="energyLevelColorClass" class="text-2xl font-bold">
          {{ energyValue }}%
        </div>
        <div class="text-sm">{{ energyLevelLabel }}</div>
      </div>
    </div>

    <!-- Optional: Display contributing raw metrics -->
    <div class="grid grid-cols-4 gap-2 pt-3 border-t border-gray-200">
      <div class="text-center">
        <div class="text-xs text-gray-600">PSNS Score</div>
        <div class="font-bold">{{ psnsValue }}</div>
      </div>
      <div class="text-center">
        <div class="text-xs text-gray-600">SDNN</div>
        <div class="font-bold">{{ sdnnValue }}ms</div>
      </div>
      <div class="text-center">
        <div class="text-xs text-gray-600">RMSSD</div>
        <div class="font-bold">{{ rmssdValue }}ms</div>
      </div>
      <div class="text-center">
        <div class="text-xs text-gray-600">Total Power</div>
        <div class="font-bold">{{ totalPowerValue }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import EnergyIndex from '../services/EnergyIndex' // Import the new EnergyIndex service
import MetricMixin from '../mixins/MetricMixin'

export default {
  name: 'EnergyDisplay',

  mixins: [MetricMixin],

  data() {
    return {
      energyValue: 0,
      // Store contributing metrics if needed for display
      psnsValue: 0,
      sdnnValue: 0,
      rmssdValue: 0,
      totalPowerValue: 0,
      calculatorClass: EnergyIndex // Use the EnergyIndex calculator
    }
  },

  computed: {
    energyLevelColorClass() {
      // Define classes based on energy levels (adjust thresholds as needed)
      if (this.energyValue < 35) return 'text-red-500'
      if (this.energyValue < 70) return 'text-orange-500'
      return 'text-green-500'
    },

    energyLevelLabel() {
      // Define labels based on energy levels
      if (this.energyValue < 35) return 'Low'
      if (this.energyValue < 70) return 'Medium'
      return 'High'
    }
  },

  methods: {
    updateMetrics(calculator) {
      // Get the main energy value
      this.value = calculator.value || 0;
      this.energyValue = Math.round(this.value);

      // Get detailed metrics from the calculator's history if available
      if (calculator.metricHistory) {
        const history = calculator.metricHistory;
        this.psnsValue = history.psns && history.psns.length > 0 ?
          Math.round(history.psns[history.psns.length - 1]) : 0;
        this.sdnnValue = history.sdnn && history.sdnn.length > 0 ?
          Math.round(history.sdnn[history.sdnn.length - 1]) : 0;
        this.rmssdValue = history.rmssd && history.rmssd.length > 0 ?
          Math.round(history.rmssd[history.rmssd.length - 1]) : 0;
        this.totalPowerValue = history.totalPower && history.totalPower.length > 0 ?
          Math.round(history.totalPower[history.totalPower.length - 1]) : 0;

        // Note: You might want to add more sophisticated ways to get these values
        // if the history might be empty or calculation hasn't run yet.
      }
    }
  }
}
</script> 