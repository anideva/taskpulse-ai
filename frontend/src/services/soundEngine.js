// Web Audio API Ambient Sound & Focus Notification Engine
// 100% offline, procedural generation, plays continuously without cutting out

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.activeNodes = [];
    this.progressionInterval = null;
    this.currentSound = null;
    this.volume = 0.5;
    this.isPlaying = false;
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
      // 528Hz Solfeggio / Tibetan singing bowl harmonics
      const frequencies = [528, 1056, 1584];
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
    const bufferSize = this.ctx.sampleRate * 6; // 6-second seamless looping buffer
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

  // Starts continuous ambient sound that plays without interruption
  startAmbient(soundType = "zen", vol = 0.5) {
    this.stopAmbient(false); // Stop prior sound immediately without delayed wipe
    this.volume = vol;
    this.initCtx();
    if (!this.ctx) return;

    this.isPlaying = true;
    this.currentSound = soundType;
    const now = this.ctx.currentTime;

    // Master ambient gain with smooth fade in
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.001, now);
    this.masterGain.gain.linearRampToValueAtTime(this.volume, now + 1.2);
    this.masterGain.connect(this.ctx.destination);

    if (soundType === "zen") {
      // Evolving Ambient Instrumental Chord Progression
      // Loops continuously across 4 peaceful chords: Cmaj9 -> Fmaj7 -> Am9 -> Gsus4
      const chordProgression = [
        [130.81, 196.0, 246.94, 329.63, 587.33], // Cmaj9: C3, G3, B3, E4, D5
        [174.61, 261.63, 329.63, 392.0, 523.25], // Fmaj7: F3, C4, E4, G4, C5
        [110.0, 164.81, 246.94, 329.63, 493.88],  // Am9: A2, E3, B3, E4, B4
        [196.0, 261.63, 293.66, 392.0, 587.33],  // Gsus4: G3, C4, D4, G4, D5
      ];

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(450, now);

      // Slow LFO to breathe warmth into the filter cutoff continuously
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(0.06, now); // 0.06 Hz slow breathing cycle
      lfoGain.gain.setValueAtTime(160, now);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start(now);

      filter.connect(this.masterGain);
      this.activeNodes.push(lfo, lfoGain, filter);

      let currentChordIdx = 0;
      let activeOscs = [];

      const playChord = (chordFreqs, isFirst = false) => {
        if (!this.isPlaying || !this.ctx) return;
        const chordNow = this.ctx.currentTime;
        const fadeDuration = isFirst ? 1.0 : 3.0;

        // Create individual gain for this chord to crossfade smoothly
        const chordGain = this.ctx.createGain();
        chordGain.gain.setValueAtTime(0.001, chordNow);
        chordGain.gain.linearRampToValueAtTime(0.09 / chordFreqs.length, chordNow + fadeDuration);
        chordGain.connect(filter);

        const newOscs = [];

        chordFreqs.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          osc.type = idx % 2 === 0 ? "sine" : "triangle";
          // Gentle micro-detuning for lush natural chorus
          osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 0.8, chordNow);
          osc.connect(chordGain);
          osc.start(chordNow);
          newOscs.push(osc);
          this.activeNodes.push(osc);
        });

        this.activeNodes.push(chordGain);

        // Fade out prior active chord
        if (activeOscs.length > 0) {
          const oldGain = activeOscs[0].gainNode;
          if (oldGain) {
            try {
              oldGain.gain.setValueAtTime(oldGain.gain.value, chordNow);
              oldGain.gain.linearRampToValueAtTime(0.0001, chordNow + fadeDuration);
              setTimeout(() => {
                activeOscs.forEach((item) => {
                  try {
                    item.osc.stop();
                    item.osc.disconnect();
                  } catch (e) {}
                });
              }, fadeDuration * 1000 + 100);
            } catch (e) {}
          }
        }

        activeOscs = newOscs.map((o) => ({ osc: o, gainNode: chordGain }));
      };

      // Play first chord immediately
      playChord(chordProgression[0], true);

      // Advance chord every 8 seconds for continuous peaceful harmonic movement
      this.progressionInterval = setInterval(() => {
        if (!this.isPlaying) return;
        currentChordIdx = (currentChordIdx + 1) % chordProgression.length;
        playChord(chordProgression[currentChordIdx], false);
      }, 8000);

    } else if (soundType === "rain") {
      // Continuous gentle rain scape
      const noiseBuffer = this.createPinkNoiseBuffer();
      const source = this.ctx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(900, now);

      source.connect(filter);
      filter.connect(this.masterGain);
      source.start(now);

      this.activeNodes.push(source, filter);

    } else if (soundType === "waves") {
      // Continuous ocean tide swell
      const noiseBuffer = this.createPinkNoiseBuffer();
      const source = this.ctx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(550, now);

      // Swell LFO to simulate continuous rolling ocean waves
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(0.065, now); // ~15-second natural wave cycle
      lfoGain.gain.setValueAtTime(0.25, now);
      lfo.connect(lfoGain);

      const waveGain = this.ctx.createGain();
      waveGain.gain.setValueAtTime(0.18, now);
      lfoGain.connect(waveGain.gain);

      source.connect(filter);
      filter.connect(waveGain);
      waveGain.connect(this.masterGain);

      source.start(now);
      lfo.start(now);

      this.activeNodes.push(source, lfo, filter, waveGain);
    }
  }

  stopAmbient(fade = true) {
    this.isPlaying = false;
    if (this.progressionInterval) {
      clearInterval(this.progressionInterval);
      this.progressionInterval = null;
    }

    const nodesToStop = [...this.activeNodes];
    const gainToFade = this.masterGain;
    this.activeNodes = [];
    this.masterGain = null;
    this.currentSound = null;

    if (gainToFade && this.ctx && fade) {
      try {
        const now = this.ctx.currentTime;
        gainToFade.gain.setValueAtTime(gainToFade.gain.value, now);
        gainToFade.gain.linearRampToValueAtTime(0.0001, now + 0.8);
      } catch (e) {
        // Safe fallback
      }
      setTimeout(() => {
        nodesToStop.forEach((node) => {
          try {
            if (node.stop) node.stop();
            if (node.disconnect) node.disconnect();
          } catch (e) {}
        });
      }, 900);
    } else {
      nodesToStop.forEach((node) => {
        try {
          if (node.stop) node.stop();
          if (node.disconnect) node.disconnect();
        } catch (e) {}
      });
    }
  }

  setVolume(newVol) {
    this.volume = Math.max(0, Math.min(1, newVol));
    if (this.masterGain && this.ctx) {
      try {
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      } catch (e) {
        // Safe fallback
      }
    }
  }
}

const soundEngine = new SoundEngine();
export default soundEngine;
