/**
 * Procedural Web Audio synthesizer with real-time VibePitch semitone shifting
 * and an AnalyserNode feeding the MemeForge Frequency Visualizer.
 */
export type SfxName =
  | 'attack'
  | 'hit'
  | 'crit'
  | 'shadow'
  | 'adblock'
  | 'ascendant'
  | 'levelup'
  | 'airhorn'
  | 'boom'
  | 'violin'
  | 'splash'
  | 'jump'
  | 'telegraph'
  | 'vibe';

export class RealmAudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private freqBins: Uint8Array<ArrayBuffer> | null = null;
  private semitones = 0;
  private pitchMult = 1.0;
  private muted = false;

  public unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume().catch(() => {});
      }
      return;
    }
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.45;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 64;
    this.freqBins = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
    this.master.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(mute ? 0 : 0.45, this.ctx.currentTime, 0.02);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setPitchSemitones(st: number): void {
    this.semitones = Math.max(-12, Math.min(12, Math.round(st)));
    this.pitchMult = Math.pow(2, this.semitones / 12);
  }

  public getPitchSemitones(): number {
    return this.semitones;
  }

  public getPitchMultiplier(): number {
    return this.pitchMult;
  }

  public getFrequencyData(): Uint8Array | null {
    if (!this.analyser || !this.freqBins) return null;
    this.analyser.getByteFrequencyData(this.freqBins);
    return this.freqBins;
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType = 'triangle',
    vol = 0.2,
    delay = 0,
    endFreq?: number,
  ): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx || !this.master) return;
    try {
      const now = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const jitter = 0.96 + Math.random() * 0.08;
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(32, freq * this.pitchMult * jitter), now);
      if (endFreq !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(32, endFreq * this.pitchMult * jitter),
          now + dur,
        );
      }
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    } catch {
      // Ignore audio errors on headless browsers without audio hardware
    }
  }

  public play(name: SfxName): void {
    switch (name) {
      case 'attack':
        this.tone(330, 0.11, 'triangle', 0.18, 0, 95);
        break;
      case 'hit':
        this.tone(175, 0.09, 'sawtooth', 0.17, 0, 58);
        break;
      case 'crit':
        this.tone(240, 0.14, 'sawtooth', 0.24, 0, 620);
        this.tone(620, 0.12, 'triangle', 0.18, 0.04, 180);
        break;
      case 'shadow':
        this.tone(110, 0.34, 'sawtooth', 0.22, 0, 410);
        this.tone(165, 0.3, 'triangle', 0.14, 0.05, 75);
        break;
      case 'adblock':
        this.tone(540, 0.09, 'sine', 0.18, 0);
        this.tone(880, 0.16, 'sine', 0.2, 0.08);
        this.tone(1180, 0.14, 'triangle', 0.14, 0.15);
        break;
      case 'ascendant':
        this.tone(72, 0.52, 'sawtooth', 0.26, 0, 290);
        this.tone(145, 0.48, 'triangle', 0.18, 0.08, 460);
        break;
      case 'levelup':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
          this.tone(f, 0.22, 'triangle', 0.18, i * 0.08),
        );
        break;
      case 'airhorn':
        this.tone(440, 0.42, 'sawtooth', 0.22, 0);
        this.tone(447, 0.42, 'sawtooth', 0.22, 0);
        this.tone(554, 0.42, 'sawtooth', 0.16, 0);
        break;
      case 'boom':
        this.tone(135, 0.52, 'sine', 0.36, 0, 34);
        break;
      case 'violin':
        this.tone(587.3, 0.32, 'sawtooth', 0.14, 0, 554.4);
        this.tone(523.3, 0.46, 'sawtooth', 0.14, 0.32, 493.9);
        break;
      case 'splash':
        this.tone(480, 0.15, 'sine', 0.15, 0, 175);
        break;
      case 'jump':
        this.tone(190, 0.13, 'triangle', 0.14, 0, 390);
        break;
      case 'telegraph':
        this.tone(220, 0.28, 'sawtooth', 0.16, 0, 520);
        break;
      case 'vibe':
        this.tone(261.6, 0.26, 'sine', 0.22, 0, 523.3);
        this.tone(392.0, 0.32, 'triangle', 0.18, 0.05, 784.0);
        break;
    }
  }

  public playBardNote(hz: number): void {
    this.tone(hz, 0.42, 'triangle', 0.22, 0);
    this.tone(hz * 1.5, 0.32, 'sine', 0.11, 0.02);
  }
}
