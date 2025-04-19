import { Subject } from 'rxjs'
import { mean, std, sqrt } from 'mathjs'
import { metrics } from './store'

/**
 * Base class for all metrics.
 * Provides common functionality for calculating and emitting metrics.
 */
export default class Metric {
  constructor(device, options = {}) {
    this.device = device
    this.options = options
    this.valueSubject = new Subject()
    this.subscription = null
    this.unit = options.unit || 'ms'
    this.precision = options.precision || 2
    this.isSubscribed = false
    this.data = []
    this.maxSamples = options.maxSamples || 1000
    this.pulsesNumber = options.rrIntervals || 100
    this.lastVisibleTime = Date.now()
    this.metricName = this.constructor.name.toLowerCase()
    
    // Track last values for mean calculation
    this.valueHistory = []
    this.maxValueHistory = options.maxValueHistory || 60
    
    // Set up visibility change listener
    if (typeof document !== 'undefined') {
      this.visibilityHandler = this.handleVisibilityChange.bind(this)
      document.addEventListener('visibilitychange', this.visibilityHandler)
    }
  }

  /**
   * Handle visibility change events
   */
  handleVisibilityChange() {
    const now = Date.now();
    
    if (document.hidden) {
      // Tab is now hidden
      this.lastVisibleTime = now;
    } else {
      // Tab is visible again
      // Ensure we only emit an update with the configured number of intervals
      // This prevents the spike by respecting the configured window size
      const value = this.calculate();
      this.updateMetricsStore(value);
      this.valueSubject.next(value);
    }
  }

  /**
   * Initialize and return subscription to metric values.
   */
  subscribe() {
    // Only set up subscription once
    if (!this.isSubscribed && this.device && typeof this.setupSubscription === 'function') {
      this.setupSubscription()
      this.isSubscribed = true
    } else if (!this.device || typeof this.setupSubscription !== 'function') {
      console.error('Device is not available or setupSubscription method not implemented')
    }
    return this.valueSubject
  }

  /**
   * Clean up subscription.
   */
  unsubscribe() {
    if (this.subscription) {
      try {
        // Check if unsubscribe is a function before calling it
        if (typeof this.subscription.unsubscribe === 'function') {
          this.subscription.unsubscribe()
        }
      } catch (e) {
        console.warn('Error unsubscribing metric:', e.message)
      }
      this.subscription = null
      this.isSubscribed = false
    }
  }

  /**
   * Clean up resources.
   */
  destroy() {
    try {
      this.unsubscribe()
      
      // Remove visibility change listener
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', this.visibilityHandler)
      }
      
      // Only complete the subject if it exists and hasn't been completed
      if (this.valueSubject && !this.valueSubject.closed) {
        this.valueSubject.complete()
      }
    } catch (e) {
      console.warn('Error destroying metric:', e.message)
    }
  }

  /**
   * Add data sample to the collection.
   */
  addSample(sample) {
    this.data.push(sample)
    if (this.data.length > this.maxSamples) {
      this.data.shift()
    }
  }
  
  /**
   * Add a calculated value to history for mean calculations.
   */
  addValueToHistory(value) {
    if (typeof value === 'number' && !isNaN(value)) {
      this.valueHistory.push(value)
      if (this.valueHistory.length > this.maxValueHistory) {
        this.valueHistory.shift()
      }
    }
  }

  /**
   * Get recent samples based on pulsesNumber.
   */
  get recentSamples() {
    const n = Math.min(this.pulsesNumber, this.data.length)
    return this.data.slice(-n)
  }
  
  /**
   * Get the appropriate samples for calculating statistics.
   * Can be overridden by subclasses to provide custom sample data.
   */
  getSamplesForStats() {
    return this.valueHistory.length > 0 ? this.valueHistory : this.recentSamples
  }

  /**
   * Calculate mean of samples.
   */
  calculateMean(samples = this.getSamplesForStats()) {
    if (samples.length === 0) return 0
    return mean(samples)
  }

  /**
   * Calculate standard deviation of samples.
   */
  calculateStdDev(samples = this.getSamplesForStats()) {
    // Need at least 2 samples for a meaningful standard deviation
    if (samples.length < 2) return 0
    
    // Use the uncorrected sample standard deviation formula (n divisor instead of n-1)
    // This gives a better estimate for HRV metrics like SDNN
    return std(samples, 'uncorrected')
  }

  /**
   * Calculate differences between consecutive samples.
   */
  calculateDifferences(samples = this.recentSamples, absolute = false) {
    if (samples.length < 2) return []
    return samples.slice(1).map((val, i) => {
      const diff = val - samples[i]
      return absolute ? Math.abs(diff) : diff
    })
  }

  /**
   * Calculate RMSSD (Root Mean Square of Successive Differences).
   */
  calculateRMSSD(samples = this.recentSamples) {
    const diffs = this.calculateDifferences(samples)
    if (diffs.length === 0) return 0
    const squaredDiffs = diffs.map(d => d * d)
    return sqrt(mean(squaredDiffs))
  }

  /**
   * Calculate pNN50 (percentage of successive RR intervals that differ by more than 50ms).
   */
  calculatePNN50(samples = this.recentSamples) {
    const diffs = this.calculateDifferences(samples, true)
    if (diffs.length === 0) return 0
    const count = diffs.filter(d => d > 50).length
    return (count / diffs.length) * 100
  }

  /**
   * Calculate CV (coefficient of variation).
   */
  calculateCV(samples = this.recentSamples) {
    if (samples.length < 2) return 0
    const meanVal = this.calculateMean(samples)
    if (meanVal === 0) return 0
    const stdDev = this.calculateStdDev(samples)
    return (stdDev / meanVal) * 100
  }
  
  /**
   * Generic method to calculate a metric, update store, and return value.
   * Centralizes the pattern used in most metric classes.
   * @param {Function} calculationFn - The function that performs the actual calculation
   * @param {Array} args - Arguments to pass to the calculation function
   * @returns {number} The calculated metric value
   */
  calculateMetric(calculationFn, ...args) {
    // Calculate the metric value
    const value = calculationFn.apply(this, args);
    
    // Add to value history for mean/stddev calculation
    this.addValueToHistory(value);
    
    // Update the centralized metrics store
    this.updateMetricsStore(value);
    
    return value;
  }

  /**
   * Update the centralized metrics store
   */
  updateMetricsStore(value) {
    // Skip if metricName is not set
    if (!this.metricName) return;
    
    // Convert class name to metric name (e.g. SDNN -> sdnn, LFHFRatio -> lfhfRatio)
    let storeKey = this.metricName;
    if (storeKey === 'sdnn' || storeKey === 'rmssd' || storeKey === 'pnn50' || storeKey === 'cv' || 
        storeKey === 'qtc' || storeKey === 'mxdmn' || storeKey === 'amo50' || 
        storeKey === 'totalpower' || storeKey === 'vlfpower' || storeKey === 'lfpower' || 
        storeKey === 'hfpower' || storeKey === 'lfhfratio') {
      
      // Convert to camelCase for the store keys
      storeKey = storeKey.toLowerCase();
      if (storeKey === 'totalpower') storeKey = 'totalPower';
      if (storeKey === 'vlfpower') storeKey = 'vlfPower';
      if (storeKey === 'lfpower') storeKey = 'lfPower';
      if (storeKey === 'hfpower') storeKey = 'hfPower';
      if (storeKey === 'lfhfratio') storeKey = 'lfhfRatio';
      
      // Update the metric value in the store
      if (storeKey in metrics) {
        metrics[storeKey] = value;
        
        // Update mean and standard deviation using value history or samples
        const samples = this.getSamplesForStats();
        if (samples.length > 0) {
          metrics.means[storeKey] = this.calculateMean(samples);
          metrics.stdDevs[storeKey] = this.calculateStdDev(samples);
        }
      }
    }
  }

  // Override in child classes
  setupSubscription() {
    console.warn('setupSubscription method must be implemented in child class')
  }

  // Override in child classes with call to updateMetricsStore
  calculate() {
    console.warn('calculate method must be implemented in child class')
    return 0
  }

  // For backward compatibility
  getMetricObservable() {
    // Initialize subscription if it doesn't exist
    if (!this.subscription) {
      this.subscribe()
    }
    return this.valueSubject
  }
} 