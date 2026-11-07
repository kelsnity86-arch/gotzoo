// 효과음 (Web Audio 합성, 외부 음원 없음). 첫 터치 후에 켜진다.
type Sfx = 'coin' | 'tip' | 'draw' | 'reveal' | 'rare' | 'fuseWin' | 'fuseFail' | 'buy' | 'click' | 'deny' | 'feed';
class Audio {
  private ctx: AudioContext | null = null;
  private last = 0;
  muted = false;
  unlock() { if (!this.ctx) try { this.ctx = new AudioContext(); } catch { /* 미지원 */ } else void this.ctx.resume(); }
  private tone(t: number, f: number, d: number, v: number, type: OscillatorType = 'square', f2?: number) {
    const c = this.ctx!; const o = c.createOscillator(); const g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.02);
  }
  sfx(id: Sfx) {
    const c = this.ctx; if (!c || this.muted) return;
    const t = c.currentTime;
    const m = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
    switch (id) {
      case 'coin': if (t - this.last < 0.04) return; this.last = t; this.tone(t, m(88), 0.05, 0.05); this.tone(t + 0.04, m(95), 0.07, 0.04); break;
      case 'tip': break;
      case 'draw': [0, 4, 7].forEach((d, i) => this.tone(t + i * 0.06, m(67 + d), 0.1, 0.06)); break;
      case 'reveal': this.tone(t, m(79), 0.08, 0.05); break;
      case 'rare': [0, 4, 7, 12, 16].forEach((d, i) => this.tone(t + i * 0.07, m(72 + d), 0.16, 0.07, 'triangle')); break;
      case 'fuseWin': [0, 7, 12, 19].forEach((d, i) => this.tone(t + i * 0.09, m(67 + d), 0.2, 0.07, 'triangle')); break;
      case 'fuseFail': [0, -3, -7].forEach((d, i) => this.tone(t + i * 0.12, m(64 + d), 0.2, 0.06, 'triangle')); break;
      case 'buy': this.tone(t, m(76), 0.06, 0.06); this.tone(t + 0.06, m(88), 0.12, 0.06); break;
      case 'click': this.tone(t, m(84), 0.03, 0.04); break;
      case 'deny': this.tone(t, 150, 0.12, 0.06); break;
      case 'feed': this.tone(t, m(72), 0.06, 0.05, 'triangle'); this.tone(t + 0.07, m(76), 0.08, 0.05, 'triangle'); break;
    }
  }
}
export const audio = new Audio();
