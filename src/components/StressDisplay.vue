<template>
  <div class="bg-white rounded-xl shadow-md p-4">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold">Stress Index</h2>
      <div class="text-right">
        <div :class="stressLevelColorClass" class="text-2xl font-bold">
          {{ stressValue }}%
        </div>
        <div class="text-sm">{{ stressLevelLabel }}</div>
      </div>
    </div>
    
    <div class="mb-4">
      <h3 class="text-lg font-semibold mb-2">Nervous System Balance</h3>
      <div class="space-y-2">
        <div class="flex items-center">
          <div class="w-10 font-bold">SNS</div>
          <div class="flex-grow h-3 bg-gray-200 rounded-full mx-2 overflow-hidden">
            <div class="h-full bg-orange-500 rounded-full" :style="{ width: `${snsPercentage}%` }"></div>
          </div>
          <div class="w-8 text-right font-bold">{{ snsValue }}</div>
        </div>
        
        <div class="flex items-center">
          <div class="w-10 font-bold">PSNS</div>
          <div class="flex-grow h-3 bg-gray-200 rounded-full mx-2 overflow-hidden">
            <div class="h-full bg-blue-500 rounded-full" :style="{ width: `${psnsPercentage}%` }"></div>
          </div>
          <div class="w-8 text-right font-bold">{{ psnsValue }}</div>
        </div>
      </div>
      
      <div :class="balanceColorClass" class="mt-2 p-2 rounded-md bg-gray-100 text-center text-sm">
        <div v-if="isBalanced">Your nervous system is balanced</div>
        <div v-else-if="isSnsDominant">Sympathetic dominance (fight-or-flight)</div>
        <div v-else>Parasympathetic dominance (rest-and-digest)</div>
      </div>
    </div>
    
    <div class="grid grid-cols-3 gap-2 pt-3 border-t border-gray-200">
      <div class="text-center">
        <div class="text-xs text-gray-600">LF/HF Ratio</div>
        <div class="font-bold">{{ lfhfRatio }}</div>
      </div>
      <div class="text-center">
        <div class="text-xs text-gray-600">SDNN</div>
        <div class="font-bold">{{ sdnnValue }}ms</div>
      </div>
      <div class="text-center">
        <div class="text-xs text-gray-600">RMSSD</div>
        <div class="font-bold">{{ rmssdValue }}ms</div>
      </div>
    </div>
  </div>
</template>

<script>
import StressIndex from '../services/StressIndex'
import MetricMixin from '../mixins/MetricMixin'

export default {
  name: 'StressDisplay',
  
  mixins: [MetricMixin],
  
  data() {
    return {
      stressValue: 0,
      snsValue: 0,
      psnsValue: 0,
      lfhfRatio: 0,
      sdnnValue: 0,
      rmssdValue: 0,
      calculatorClass: StressIndex
    }
  },
  
  computed: {
    stressLevelColorClass() {
      if (this.stressValue < 30) return 'text-green-500'
      if (this.stressValue < 60) return 'text-orange-500'
      return 'text-red-500'
    },
    
    stressLevelLabel() {
      if (this.stressValue < 30) return 'Low'
      if (this.stressValue < 60) return 'Moderate'
      return 'High'
    },
    
    snsPercentage() {
      // Scale to fit in UI (max 100%)
      return Math.min(this.snsValue, 100)
    },
    
    psnsPercentage() {
      // Scale to fit in UI (max 100%)
      return Math.min(this.psnsValue, 100)
    },
    
    isBalanced() {
      const diff = Math.abs(this.snsValue - this.psnsValue)
      return diff < 15
    },
    
    isSnsDominant() {
      return this.snsValue > this.psnsValue + 15
    },
    
    balanceColorClass() {
      if (this.isBalanced) return 'text-green-600'
      if (this.isSnsDominant) return 'text-orange-600'
      return 'text-blue-600'
    }
  },
  
  methods: {
    updateMetrics(calculator) {
      // Get the main stress value
      this.value = calculator.value || 0;
      this.stressValue = Math.round(this.value);
      
      // Get the detailed metrics
      if (calculator.metricHistory) {
        // Access the raw metrics from the calculator
        const recentRrs = calculator.recentRrs;
        if (recentRrs && recentRrs.length > 5) {
          // Calculate SNS and PSNS values
          const lfPower = calculator.calculateBandPower(recentRrs, 0.04, 0.15);
          const hfPower = calculator.calculateBandPower(recentRrs, 0.15, 0.4);
          const totalPower = calculator.calculateBandPower(recentRrs, 0.003, 0.4);
          
          // Time domain metrics
          this.sdnnValue = Math.round(calculator.calculateStdDev(recentRrs));
          this.rmssdValue = Math.round(calculator.calculateRMSSD(recentRrs));
          
          // LF/HF ratio
          this.lfhfRatio = (lfPower && hfPower) ? 
            parseFloat((lfPower / hfPower).toFixed(2)) : 1;
          
          // Get normalized metrics
          const normalizedLFHF = calculator.normalizeLFHF(this.lfhfRatio);
          const normalizedSDNN = calculator.normalizeSDNN(this.sdnnValue);
          const normalizedRMSSD = calculator.normalizeRMSSD(this.rmssdValue);
          const normalizedTotalPower = calculator.normalizeTotalPower(totalPower);
          
          // Calculate SNS and PSNS values (0-100)
          this.snsValue = Math.round(calculator.calculateSNS(
            normalizedLFHF, normalizedSDNN, normalizedRMSSD
          ));
          
          this.psnsValue = Math.round(calculator.calculatePSNS(
            normalizedLFHF, normalizedSDNN, normalizedRMSSD, normalizedTotalPower
          ));
        }
      }
    }
  }
}
</script> 