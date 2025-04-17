import { Subject } from 'rxjs'

export default class BaseCalculator {
  constructor(device, options = {}) {
    this.device = device
    this.options = options
    this.valueSubject = new Subject()
    this.subscription = null
    this.unit = options.unit || 'ms'
    this.precision = options.precision || 2
    this.isSubscribed = false
  }

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

  unsubscribe() {
    if (this.subscription) {
      this.subscription.unsubscribe()
      this.subscription = null
      this.isSubscribed = false
    }
  }

  destroy() {
    this.unsubscribe()
    this.valueSubject.complete()
  }

  // Override in child classes
  setupSubscription() {
    console.warn('setupSubscription method must be implemented in child class')
  }

  // Override in child classes
  calculate(data) {
    console.warn('calculate method must be implemented in child class')
    return 0
  }
} 