import { Observable } from 'rxjs'
import { interval } from 'rxjs'
import { switchMap, startWith } from 'rxjs/operators'

import log from '@/log'
import Mutex from './mutex'

export default class BaseDevice {

  constructor(connection) {
    this.connection = connection
    this.services   = {}
    this.characs    = {}
    this.observes   = {}
    this.mutex      = new Mutex
  }

  name() {
    return this.connection.device.name
  }

  disconnect() {
    this.connection.disconnect()
  }

  onDisconnect(handler) {
    this.connection.device.addEventListener('gattserverdisconnected', handler)
  }

  async getBatteryLevel() {
    const charac = await this.fetchCharac('battery_service', 'battery_level')
    const bl     = await charac.readValue()
    return bl.getUint8(0)
  }

  observeBatteryLevel(intsecs = 60) {
    return interval(intsecs * 1000).pipe(
      startWith(this.getBatteryLevel()),
      switchMap(v => this.getBatteryLevel())
    )
  }

  observeHeartRate() {
    return this.observes.hrm ||= this.observeNotifications('heart_rate', 'heart_rate_measurement', {
      handler: (sub, event) => {
        sub.next(event.target.value.getUint8(1))
      }
    })
  }

  observeRRInterval() {
    return this.observes.rri ||= this.observeNotifications('heart_rate', 'heart_rate_measurement', {
      handler: (sub, event) => {
        const value = event.target.value
        let offset  = 0
        const flags = value.getUint8(offset++)

        const hrFormatUint16       =  flags & 0x01
        const sensorContactStatus  = (flags & 0x06) >> 1
        const energyExpendedStatus = (flags & 0x08) >> 3
        const rrIntervalPresent    = (flags & 0x10) >> 4

        offset += (hrFormatUint16) ? 2 : 1

        let rrInterval = null
        if (rrIntervalPresent) {
          const rr = value.getUint16(offset, /* littleEndian= */ true)
          rrInterval = rr // in units of 1/1024 seconds
          rrInterval = rrInterval * 1000 / 1024 // Convert to milliseconds
          offset += 2
        }

        sub.next(rrInterval)
      }
    })
  }

  observeNotifications(service, charac, {handler, init}) {
    return new Observable(async sub => {
      charac = await this.fetchCharac(service, charac)

      if (init) await init()

      await charac.startNotifications()
      function handleNotifications(event) { handler(sub, event) }
      charac.addEventListener('characteristicvaluechanged', handleNotifications)

      return () => {
        if (charac.isNotifying) charac.stopNotifications()
        charac.removeEventListener('characteristicvaluechanged', handleNotifications)
      }
    })
  }

  async fetchService(service) {
    return this.services[service] ||= await this.connection.getPrimaryService(service)
  }

  async fetchCharac(service, charac) {
    return this.characs[charac] ||= await (await this.fetchService(service)).getCharacteristic(charac)
  }

  /**
   * Returns the device's ECG sampling rate in Hz.
   * Must be implemented by device subclasses that support ECG.
   * @throws {Error} If the device doesn't support ECG or if the subclass doesn't implement this method.
   * @returns {number} The ECG sampling rate in Hz.
   */
  get ecgSamplingRate() {
    throw new Error('ecgSamplingRate getter must be implemented by device classes that support ECG functionality')
  }

}

