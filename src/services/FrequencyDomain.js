import RRInt from './RRInt'
import Spline from 'cubic-spline'
import FFT from 'fft.js' // Import the FFT library

/**
 * Base class for frequency domain HRV metrics
 * Provides shared functionality for LF power, HF power and LF/HF ratio calculations
 */
export default class FrequencyDomain extends RRInt {
  constructor(device, options = {}) {
    super(device, {
      ...options,
      unit: options.unit || 'ms²',
      precision: 2
    })
    this.resamplingFrequency = 4; // Hz, common for HRV analysis
    this.fftCache = {}; // Cache FFT instances for performance
  }

  /**
   * Find the next power of 2 >= n
   * @param {Number} n 
   * @returns {Number} next power of 2
   */
  _nextPowerOf2(n) {
    if (n <= 0) return 1; // Or handle error
    return Math.pow(2, Math.ceil(Math.log2(n)));
  }

  /**
   * Hann window function
   * @param {Number} N - Length of the window
   * @returns {Array} - Hann window values
   */
  _hannWindow(N) {
    const window = [];
    for (let i = 0; i < N; i++) {
      window.push(0.5 * (1 - Math.cos(2 * Math.PI * i / (N - 1))));
    }
    return window;
  }

  /**
   * Calculate power in a specific frequency band using FFT.
   * The accuracy and stability of the result improve significantly as more data becomes available
   * (ideally >= 30 intervals for reasonable spectral resolution).
   * For small datasets (e.g., 5-29 intervals), the FFT is still computed, but the result
   * should be considered a very rough approximation due to poor frequency resolution.
   * 
   * @param {Array} rrSeries - Array of RR intervals in milliseconds (provided by recentRrs, limited by opts.rrIntervals)
   * @param {Number} minFreq - Lower frequency bound in Hz (inclusive)
   * @param {Number} maxFreq - Upper frequency bound in Hz (exclusive)
   * @returns {Number} - Power in specified band (ms²)
   */
  calculateBandPower(rrSeries, minFreq, maxFreq) {
    const N_input = rrSeries ? rrSeries.length : 0;

    // Minimum intervals required to attempt the analysis pipeline without errors.
    const minIntervalsRequired = 5; 
    if (N_input < minIntervalsRequired) {
      // console.log('FFT Stage: Not enough data (<5)');
      return 0; 
    }

    // --- Remove Stage 2 (Variance Approximation Block) --- 
    // const minIntervalsForFFT = 30; 
    // if (N_input < minIntervalsForFFT) { ... variance code ... }

    // --- Always proceed with FFT-based calculation (formerly Stage 3) ---
    // Note: Results are less reliable for N_input < 30 
    // console.log(`FFT Stage: (${N_input} samples)`);
    
    // 1. Create Time Vector (cumulative time in seconds) from RR intervals (ms)
    const timeVector = [0];
    const rrVector = []; 
    let cumulativeTime = 0;
    for (let i = 0; i < rrSeries.length; i++) {
      cumulativeTime += rrSeries[i] / 1000; 
      timeVector.push(cumulativeTime);
      rrVector.push(rrSeries[i]);
    }
    if (timeVector.length !== rrVector.length + 1) {
        console.error("Time and RR vector length mismatch for spline construction");
        return 0;
    }

    // 2. Create Uniform Time Grid for Resampling
    const startTime = timeVector[0];
    const endTime = timeVector[timeVector.length - 1];
    const step = 1 / this.resamplingFrequency; 
    const timeGrid = [];
    const gridStart = startTime === 0 ? step / 100 : startTime;
    for (let t = gridStart; t <= endTime; t += step) {
      timeGrid.push(t);
    }
    if (timeGrid.length === 0) return 0; 

    // 3. Interpolate RR Intervals onto Uniform Grid
    const spline = new Spline(timeVector, [rrSeries[0], ...rrVector]); 
    const interpolatedRR = timeGrid.map(t => spline.at(t));
    const N_original = interpolatedRR.length; 
    if (N_original < 2) return 0; // Need at least 2 points for windowing/FFT

    // 4. Detrend the Interpolated Signal
    const meanRR_interpolated = interpolatedRR.reduce((a, b) => a + b, 0) / N_original;
    const detrendedRR = interpolatedRR.map(rr => rr - meanRR_interpolated);

    // 5. Apply Window Function and Pad for FFT
    const N_fft = this._nextPowerOf2(N_original); 
    const window = this._hannWindow(N_original); 
    const paddedSignal = new Array(N_fft).fill(0); 
    for (let i = 0; i < N_original; i++) {
      paddedSignal[i] = detrendedRR[i] * window[i];
    }
    
    // 6. Compute Fast Fourier Transform (FFT)
    if (!this.fftCache[N_fft]) {
        this.fftCache[N_fft] = new FFT(N_fft);
    }
    const fft = this.fftCache[N_fft];
    const spectrum = fft.createComplexArray(); 
    fft.realTransform(spectrum, paddedSignal); 

    // 7. Calculate Power Spectral Density (PSD)
    const fs = this.resamplingFrequency; 
    const frequencyResolution = fs / N_fft; 
    const windowSumSq = window.reduce((sum, w) => sum + w * w, 0);
    if (windowSumSq === 0) return 0; 
    
    const psd = []; 
    const frequencies = []; 
    
    for (let k = 0; k < N_fft / 2; k++) { 
      const freq = k * frequencyResolution;
      const real = spectrum[k * 2];
      const imag = spectrum[k * 2 + 1];
      let power = real * real + imag * imag;

      power = power / (fs * windowSumSq); 

      if (k > 0) { 
        power *= 2;
      }

      psd.push(power);
      frequencies.push(freq);
    }

    // 8. Integrate Power within the Specified Band
    let bandPower = 0;
    for (let i = 0; i < frequencies.length; i++) {
      if (frequencies[i] >= minFreq && frequencies[i] < maxFreq) { 
        bandPower += psd[i] * frequencyResolution;
      }
    }

    return bandPower;
  }

  /**
   * Calculate the mean of an RR interval series
   * @param {Array} rrSeries - Array of RR intervals
   * @returns {Number} - Mean value
   */
  calculateMean(rrSeries) {
    if (!rrSeries || rrSeries.length === 0) {
      return 0;
    }
    return rrSeries.reduce((sum, val) => sum + val, 0) / rrSeries.length;
  }

  /**
   * Calculate the standard deviation of RR intervals (SDNN)
   * @param {Array} rrSeries - Array of RR intervals
   * @returns {Number} - Standard deviation
   */
  calculateStdDev(rrSeries) {
    if (!rrSeries || rrSeries.length < 2) {
      return 0;
    }
    
    const mean = this.calculateMean(rrSeries);
    const variance = rrSeries.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / rrSeries.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate the root mean square of successive differences (RMSSD)
   * @param {Array} rrSeries - Array of RR intervals
   * @returns {Number} - RMSSD value
   */
  calculateRMSSD(rrSeries) {
    if (!rrSeries || rrSeries.length < 2) {
      return 0;
    }
    
    let sumSquaredDiff = 0;
    for (let i = 1; i < rrSeries.length; i++) {
      const diff = rrSeries[i] - rrSeries[i-1];
      sumSquaredDiff += diff * diff;
    }
    
    return Math.sqrt(sumSquaredDiff / (rrSeries.length - 1));
  }

  // Override in child classes
  calculate() {
    throw new Error('calculate() must be implemented by subclass')
  }
} 