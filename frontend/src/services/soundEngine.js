// Web Audio API Ambient Sound & Focus Notification Engine
// 100% offline, zero external dependencies, zero network requests

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.ambientGain = null;
    this.activeNodes = [];
    this.currentSound = null;
    this.volume = 0.5;
  }

  initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  // Play peaceful meditation bell chime on sprint/break completion
  playChime() {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const frequencies = [528, 1056, 1584]; // 528Hz Solfeggio / Tibetan singing bowl harmonics
      const gains = [0.25, 0.08, 0.03];

      frequencies.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        gainNode.gain.setValueAtTime(gains[idx] * this.volume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);

        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 3.2);
      });
    } catch (e) {
      console.warn("Could not play timer chime:", e);
    }
  }

  // Generate pink noise buffer for rain/waves
  createPinkNoiseBuffer() {
    const bufferSize = this.ctx.sampleRate * 5; // 5-second looping buffer
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  startAmbient(soundType = "zen", vol = 0.5) {
    this.stopAmbient();
    this.volume = vol;
    this.initCtx();
    if (!this.ctx) return;

    this.currentSound = soundType;
    const now = this.ctx.currentTime;

    // Master ambient gain with smooth fade in
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.001, now);
    this.ambientGain.gain.linearRampToValueAtTime(this.volume, now + 1.5);
    this.ambientGain.connect(this.ctx.destination);

    if (soundType === "zen") {
      // Peaceful warm Maj9 ambient instrumental chords (C3, G3, B3, E4, D5)
      const chord = [130.81, 196.0, 246.94, 329.63, 587.33];
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(450, now);

      // Slow LFO to breathe warmth into the filter cutoff
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(0.08, now); // 0.08 Hz slow breathing cycle
      lfoGain.gain.setValueAtTime(150, now);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start(now);
      this.activeNodes.push(lfo);

      chord.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();

        osc.type = idx % 2 === 0 ? "sine" : "triangle";
        // Gentle micro-detuning for lush natural chorus
        osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 0.6, now);

        oscGain.gain.setValueAtTime(0.08 / chord.length, now);
        osc.connect(oscGain);
        oscGain.connect(filter);

        osc.start(now);
        this.activeNodes.push(osc);
      });

      filter.connect(this.ambientGain);
      this.activeNodes.push(filter, this.ambientGain);

    } else if (soundType === "rain") {
      // Soothing gentle rain
      const noiseBuffer = this.createPinkNoiseBuffer();
      const source = this.ctx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(950, now);

      source.connect(filter);
      filter.connect(this.ambientGain);
      source.start(now);

      this.activeNodes.push(source, filter, this.ambientGain);

    } else if (soundType === "waves") {
      // Relaxing ocean tide swell
      const noiseBuffer = this.createPinkNoiseBuffer();
      const source = this.ctx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(600, now);

      // Swell LFO to simulate rolling ocean waves
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(0.07, now); // ~14-second wave cycle
      lfoGain.gain.setValueAtTime(0.25, now);
      lfo.connect(lfoGain);

      const waveGain = this.ctx.createGain();
      waveGain.gain.setValueAtTime(0.15, now);
      lfoGain.connect(waveGain.gain);

      source.connect(filter);
      filter.connect(waveGain);
      waveGain.connect(this.ambientGain);

      source.start(now);
      lfo.start(now);

      this.activeNodes.push(source, lfo, filter, waveGain, this.ambientGain);
    }
  }

  stopAmbient() {
    if (this.ambientGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.ambientGain.gain.linearRampToValueAtTime(0.001, now + 0.8);
      } catch (e) {
        // Safe fallback
      }
    }

    setTimeout(() => {
      this.activeNodes.forEach((node) => {
        try {
          if (node.stop) node.stop();
          if (node.disconnect) node.disconnect();
        } catch (e) {
          // Ignored
        }
      });
      this.activeNodes = [];
      this.ambientGain = null;
      this.currentSound = null;
    }, 900);
  }

  setVolume(newVol) {
    this.volume = Math.max(0, Math.min(1, newVol));
    if (this.ambientGain && this.ctx) {
      try {
        this.ambientGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      } catch (e) {
        // Safe fallback
      }
    }
  }
}

const soundEngine = new SoundEngine();
export default soundEngine;
