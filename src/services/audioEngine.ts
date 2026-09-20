/**
 * RAD X Audio & Synth Engine
 * High-performance Web Audio API engine with procedural techno synth playback,
 * FFT frequency analyzer, crossfade mixing, and waveform telemetry
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private isRunning: boolean = false;
  private loopInterval: number | null = null;
  private currentStep: number = 0;
  private bpm: number = 145;
  private volume: number = 0.8;
  private crossfade: number = 0.5; // 0 (Deck A) to 1 (Deck B)

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(12000, this.ctx.currentTime);
      this.filterNode.Q.setValueAtTime(4, this.ctx.currentTime);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.82;

      this.filterNode.connect(this.masterGain);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public playTrack(bpmHint = 145, genre = 'Industrial Techno') {
    this.initContext();
    this.bpm = bpmHint || 145;
    this.stopPlayback();
    this.isRunning = true;
    this.currentStep = 0;

    const stepDurationMs = (60 / this.bpm / 4) * 1000;

    this.loopInterval = window.setInterval(() => {
      if (!this.isRunning || !this.ctx) return;
      this.triggerAudioStep(this.currentStep, genre);
      this.currentStep = (this.currentStep + 1) % 16;
    }, stepDurationMs);
  }

  public pausePlayback() {
    this.isRunning = false;
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
  }

  public stopPlayback() {
    this.isRunning = false;
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
    this.currentStep = 0;
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public setCrossfade(val: number) {
    this.crossfade = Math.max(0, Math.min(1, val));
  }

  public getFrequencyData(dataArray: Uint8Array<ArrayBufferLike>): void {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(dataArray as any);
    } else {
      dataArray.fill(0);
    }
  }

  public getWaveformData(dataArray: Uint8Array<ArrayBufferLike>): void {
    if (this.analyser) {
      this.analyser.getByteTimeDomainData(dataArray as any);
    } else {
      dataArray.fill(128);
    }
  }

  public getPlaybackState() {
    return {
      isPlaying: this.isRunning,
      bpm: this.bpm,
      volume: this.volume,
      step: this.currentStep
    };
  }

  // Authentic procedural industrial techno rhythm & acid synthesizer
  private triggerAudioStep(step: number, genre: string) {
    if (!this.ctx || !this.filterNode) return;
    const now = this.ctx.currentTime;

    // 4/4 Heavy Industrial Kick on steps 0, 4, 8, 12
    if (step % 4 === 0) {
      const kickOsc = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();

      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(140, now);
      kickOsc.frequency.exponentialRampToValueAtTime(36, now + 0.12);

      kickGain.gain.setValueAtTime(0.9, now);
      kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      kickOsc.connect(kickGain);
      kickGain.connect(this.filterNode);

      kickOsc.start(now);
      kickOsc.stop(now + 0.23);
    }

    // Industrial Metallic Rim / Clap on steps 4, 12
    if (step === 4 || step === 12) {
      const clapOsc = this.ctx.createOscillator();
      const clapGain = this.ctx.createGain();
      clapOsc.type = 'triangle';
      clapOsc.frequency.setValueAtTime(320, now);
      clapGain.gain.setValueAtTime(0.35, now);
      clapGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

      clapOsc.connect(clapGain);
      clapGain.connect(this.filterNode);

      clapOsc.start(now);
      clapOsc.stop(now + 0.09);
    }

    // Offbeat Open Hi-Hat on steps 2, 6, 10, 14
    if (step % 4 === 2) {
      const hatOsc = this.ctx.createOscillator();
      const hatGain = this.ctx.createGain();
      hatOsc.type = 'highpass' as any; // fallback to sawtooth with high pitch
      hatOsc.type = 'sawtooth';
      hatOsc.frequency.setValueAtTime(8000, now);
      hatGain.gain.setValueAtTime(0.18, now);
      hatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      hatOsc.connect(hatGain);
      hatGain.connect(this.filterNode);

      hatOsc.start(now);
      hatOsc.stop(now + 0.07);
    }

    // Acid 303 Rolling Bassline Sequence on selected 16th steps
    const acidSteps = [0, 3, 6, 8, 11, 14];
    if (acidSteps.includes(step)) {
      const acidOsc = this.ctx.createOscillator();
      const acidGain = this.ctx.createGain();
      const acidFilter = this.ctx.createBiquadFilter();

      const notes = [65.41, 77.78, 87.31, 98.0, 110.0, 130.81]; // C2, Eb2, F2, G2, A2, C3
      const freq = notes[(step * 3) % notes.length];

      acidOsc.type = genre.includes('EBM') || genre.includes('Synthwave') ? 'square' : 'sawtooth';
      acidOsc.frequency.setValueAtTime(freq, now);

      acidFilter.type = 'lowpass';
      acidFilter.Q.setValueAtTime(8, now);
      acidFilter.frequency.setValueAtTime(450, now);
      acidFilter.frequency.exponentialRampToValueAtTime(1800, now + 0.08);
      acidFilter.frequency.exponentialRampToValueAtTime(300, now + 0.16);

      acidGain.gain.setValueAtTime(0.28, now);
      acidGain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

      acidOsc.connect(acidFilter);
      acidFilter.connect(acidGain);
      acidGain.connect(this.filterNode);

      acidOsc.start(now);
      acidOsc.stop(now + 0.2);
    }
  }
}

export const audioEngine = new AudioEngine();
