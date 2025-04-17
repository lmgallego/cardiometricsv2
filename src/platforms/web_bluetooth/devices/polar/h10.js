import log from '@/log'
import BaseDevice from '../../base_device.js'

const PMD_SERVICE = 'fb005c80-02e7-f387-1cad-8acd2d8df0c8'
const PMD_CONTROL = 'fb005c81-02e7-f387-1cad-8acd2d8df0c8'
const PMD_DATA    = 'fb005c82-02e7-f387-1cad-8acd2d8df0c8'

const acc_timestep = 1000 / 200; // Assuming 200Hz sampling rate
const acc_range    = 0x04; //hex(2) for range of 2G - 4 and 8G available
const acc_rate     = 0xC8; //hex(200) for sampling freqency of 200Hz
const acc2_rate    = 416;  //0xA0;//acc2_rate=208;//26Hz, 52Hz, 104Hz, 208Hz, 416Hz
const acc_res      = 0x10; //hex(16) 16bit resolution
const ACC_START    = [0x02, 0x01, acc_range, 0x00, 0x00, 0x01, acc_rate, 0x00, 0x01, 0x01, acc_res, 0x00]

// ECG sampling rate in Hz (from 0x00, 0x01 = 130Hz)
const ECG_SAMPLING_RATE = 130

const ECG_START =  new Uint8Array([
  0x02, // Start measurement
  0x00, // ECG stream ID
  // Content of the measurement settings (from code_start)
  0x00, 0x01, // Sample rate (130 Hz)
  0x82, 0x00, // Resolution (16 bits)
  0x01, 0x01, // Channels (1 channel)
  0x0E, 0x00  // Range (0x0E for ECG)
])

export default class H10 extends BaseDevice {

  static services = [
    '00001800-0000-1000-8000-00805f9b34fb',
    '00001801-0000-1000-8000-00805f9b34fb',
    '0000180a-0000-1000-8000-00805f9b34fb',
    '0000180d-0000-1000-8000-00805f9b34fb',
    '0000180f-0000-1000-8000-00805f9b34fb',
    '0000feee-0000-1000-8000-00805f9b34fb',
    '6217ff4b-fb31-1140-ad5a-a45545d7ecf3',
    PMD_SERVICE,
  ]

  static chars = [
    PMD_CONTROL,
    PMD_DATA,
  ]

  // Getter for ECG sampling rate
  get ecgSamplingRate() {
    return ECG_SAMPLING_RATE
  }

  observeEcg() {
    return this.observes.ecg ||= this.observeNotifications(PMD_SERVICE, PMD_DATA, {
      init: async () => {
        let charac = await this.fetchCharac(PMD_SERVICE, PMD_CONTROL)
        let unlock = await this.mutex.lock()
        await charac.writeValue(ECG_START)
        unlock()
      },
      handler: (sub, event) => {
        const data = event.target.value;
        const dataView = new DataView(data.buffer);
        const dataType = dataView.getUint8(0);

        if (dataType === 0) { // ECG data type
          // Extract timestamp (bytes 1-8)
          const timestamp = dataView.getBigUint64(1, true);

          // Extract ECG samples starting from byte 10
          const samples = [];
          for (let i = 10; i + 2 < data.byteLength; i += 3) {
            const sampleBytes = [
              dataView.getUint8(i),
              dataView.getUint8(i + 1)
            ]
            const sampleValue = this.wordToSignedInt16LE(sampleBytes)
            samples.push(sampleValue)
          }
          sub.next(samples)
        }
      },
    })
  }

  observeAccelerometer() {
    return this.observes.acc ||= this.observeNotifications(PMD_SERVICE, PMD_DATA, {
      init: async () => {
        let charac = await this.fetchCharac(PMD_SERVICE, PMD_CONTROL)
        let unlock = await this.mutex.lock()
        let init   = [0x02, 2].concat(ACC_START)
        await charac.writeValue(new Uint8Array(init))
        unlock()
      },
      handler: (sub, event) => {
        var dataTime = Date.now();
        var devicename = event.currentTarget.service.device.name
        var data = event.target.value.buffer
        var DataType = Number(new Uint8Array(data.slice(0, 1)))
        // Check if DataType is accelerometer data
        if (DataType == 2) {
          // Process accelerometer data
          let frame_type = Number(new Uint8Array(data.slice(9, 10)))
          if (frame_type == 1) {
            // Frame type 1 (uncompressed data)
            let samples = new Int16Array(data.slice(10))
            let npoints = samples.length / 3
            let ACC = []
            for (let offset = 0; offset < samples.length; offset += 3) {
              let i = offset / 3
              ACC[i] = {
                x: samples[offset],
                y: samples[offset + 1],
                z: samples[offset + 2],
              }
            }
            sub.next(ACC)
          }
        }
      },
    })
  }

  wordToSignedInt16LE(byteArray) {
    const value = (byteArray[1] << 8) | byteArray[0];
    return value >= 32768 ? value - 65536 : value;
  }

}

