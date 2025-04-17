import { reactive } from 'vue'

/**
 * Application-wide settings
 * 
 * rrIntervals: Number of R-R intervals to use for metric calculations
 * - Controls the window size for all HRV metrics
 * - Affects all standard deviation calculations
 * - Lower values (20-30) provide more responsive metrics but higher variability
 * - Higher values (60-120) provide more stable metrics but slower response to changes
 * - Recommended range: 30-60 for real-time monitoring
 * 
 * qtcFormula: Formula to use for QTc calculation
 * - 'bazett': Traditional Bazett's formula (QTc = QT/√RR)
 * - 'fridericia': Fridericia's formula (QTc = QT/∛RR), less heart rate dependent
 * - Fridericia is generally more accurate across different heart rates
 */
export const opts = reactive({
  rrIntervals: 60, // Number of R-R intervals for calculations
  qtcFormula: 'fridericia', // Formula for QTc calculation (bazett or fridericia)
})

