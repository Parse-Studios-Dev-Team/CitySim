/** Tiny Web Audio synth — no asset files, mobile-safe. */

type SfxKind = 'place' | 'zone' | 'bulldoze' | 'click' | 'reward' | 'fire' | 'monster' | 'win' | 'error';

export class Sfx {
  enabled = true;
  private ctx: AudioContext | null = null;
  private last = 0;

  toggle(): boolean {
    this.enabled = !this.enabled;
    if (this.enabled) this.resume();
    return this.enabled;
  }

  resume(): void {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (ctx.state === 'suspended') void ctx.resume();
  }

  play(kind: SfxKind): void {
    if (!this.enabled) return;
    const now = performance.now();
    if (now - this.last < 40 && kind !== 'win' && kind !== 'reward') return;
    this.last = now;
    const ctx = this.ensure();
    if (ctx.state === 'suspended') void ctx.resume();

    switch (kind) {
      case 'click':
        this.tone(ctx, 720, 0.04, 0.05, 'square');
        break;
      case 'place':
        this.tone(ctx, 420, 0.07, 0.07, 'triangle');
        this.tone(ctx, 640, 0.05, 0.04, 'square', 0.03);
        break;
      case 'zone':
        this.tone(ctx, 380, 0.08, 0.06, 'sine');
        break;
      case 'bulldoze':
        this.noise(ctx, 0.09, 0.12);
        break;
      case 'reward':
        this.tone(ctx, 523, 0.12, 0.08, 'triangle');
        this.tone(ctx, 659, 0.12, 0.08, 'triangle', 0.1);
        this.tone(ctx, 784, 0.18, 0.1, 'triangle', 0.2);
        break;
      case 'fire':
        this.noise(ctx, 0.22, 0.1);
        this.tone(ctx, 180, 0.25, 0.08, 'sawtooth');
        break;
      case 'monster':
        this.tone(ctx, 90, 0.4, 0.16, 'sawtooth');
        this.tone(ctx, 70, 0.5, 0.12, 'square', 0.12);
        break;
      case 'win':
        this.tone(ctx, 523, 0.16, 0.1, 'triangle');
        this.tone(ctx, 659, 0.16, 0.1, 'triangle', 0.12);
        this.tone(ctx, 784, 0.16, 0.1, 'triangle', 0.24);
        this.tone(ctx, 1046, 0.28, 0.12, 'triangle', 0.38);
        break;
      case 'error':
        this.tone(ctx, 160, 0.12, 0.09, 'square');
        break;
      default: {
        const _exhaustive: never = kind;
        return _exhaustive;
      }
    }
  }

  private ensure(): AudioContext {
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
    }
    return this.ctx;
  }

  private tone(
    ctx: AudioContext,
    freq: number,
    dur: number,
    gain: number,
    type: OscillatorType,
    delay = 0,
  ): void {
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(ctx: AudioContext, dur: number, gain: number): void {
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    src.buffer = buf;
    g.gain.value = gain;
    src.connect(g);
    g.connect(ctx.destination);
    src.start();
  }
}
