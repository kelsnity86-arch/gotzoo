// 효과음 · 배경음 (Web Audio 합성, 외부 음원 없음). 첫 터치 후에 켜진다.
import { compile, Player, type Compiled } from '../audio/music';
import { songById } from '../audio/songs';
type Sfx = 'coin' | 'tip' | 'draw' | 'reveal' | 'rare' | 'fuseWin' | 'fuseFail' | 'buy' | 'click' | 'deny' | 'feed' | 'legend' | 'event';
const KEY = 'bbopzoo.settings';
class Audio {
  private ctx: AudioContext | null = null;
  private last = 0;
  muted = false;
  /** 효과음 음량 */
  volume = 0.8;
  /** 배경음 음량 (0이면 끔) */
  bgmVolume = 0.55;
  private bgmBus: GainNode | null = null;
  private cur: { id: string; p: Player } | null = null;
  private wantId: string | null = null;
  private layer = 3;
  private duck = 1;
  private cache = new Map<string, Compiled>();
  constructor() { try { const v = JSON.parse(localStorage.getItem(KEY) ?? '{}'); this.muted = !!v.muted; this.volume = typeof v.volume === 'number' ? v.volume : 0.8; this.bgmVolume = typeof v.bgm === 'number' ? v.bgm : 0.55; } catch { /* 저장소 없음 */ } }
  setSettings(p: { muted?: boolean; volume?: number; bgmVolume?: number }) {
    Object.assign(this, p);
    try { localStorage.setItem(KEY, JSON.stringify({ muted: this.muted, volume: this.volume, bgm: this.bgmVolume })); } catch { /* 저장소 없음 */ }
    this.cur?.p.setVol(this.bgmLevel());
  }
  unlock() {
    if (!this.ctx) try { this.ctx = new AudioContext(); const comp = this.ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; comp.connect(this.ctx.destination); this.bgmBus = comp as unknown as GainNode; } catch { /* 미지원 */ }
    else void this.ctx.resume();
    if (this.wantId && !this.cur) this.bgm(this.wantId, 1.5);
  }
  private bgmLevel() { return this.muted ? 0.0001 : Math.max(0.0001, this.bgmVolume * this.duck); }
  private compiled(id: string) { let c = this.cache.get(id); if (!c) { const s = songById(id); if (!s) return null; c = compile(s); this.cache.set(id, c); } return c; }
  /** 배경음 바꾸기 (같은 곡이면 그대로). fade초 동안 엇갈려 넘어간다 */
  bgm(id: string | null, fade = 2) {
    this.wantId = id;
    if (!this.ctx || !this.bgmBus) return;
    if (this.cur?.id === id) return;
    this.cur?.p.stop(fade);
    this.cur = null;
    if (!id) return;
    const c = this.compiled(id); if (!c) return;
    const p = new Player(this.ctx, this.bgmBus, c, this.bgmLevel());
    p.layer = this.layer;
    p.start(fade, this.bgmLevel());
    this.cur = { id, p };
  }
  /** 동물원 규모 단계 (0~3): 커질수록 악기가 늘어난다 */
  setLayer(l: number) { this.layer = l; if (this.cur) this.cur.p.layer = l; }
  /** 뽑기 동안 배경음을 낮춘다 */
  setDuck(on: boolean) { this.duck = on ? 0.18 : 1; this.cur?.p.setVol(this.bgmLevel(), on ? 0.25 : 1.2); }
  private gachaP: Player | null = null;
  /** 뽑기: 기계 곡 (기계 등급마다 반음 올림) */
  gachaStart(tier: number) {
    if (!this.ctx || !this.bgmBus || this.muted) return;
    this.setDuck(true);
    this.gachaP?.stop(0.1);
    const c = this.compiled('gacha'); if (!c) return;
    const p = new Player(this.ctx, this.bgmBus, c, this.bgmLevel());
    p.shift = [0, 2, 4, 7][tier] ?? 0;
    p.start(0.15, Math.max(0.0001, this.bgmVolume * 0.9));
    this.gachaP = p;
  }
  /** 결과 징글 (common · rare · legend · mythic) */
  jingle(kind: 'common' | 'rare' | 'legend' | 'mythic') {
    this.gachaP?.stop(0.25); this.gachaP = null;
    if (!this.ctx || !this.bgmBus || this.muted) return;
    const c = this.compiled(`jingle_${kind}`); if (!c) return;
    const p = new Player(this.ctx, this.bgmBus, c, 1);
    p.start(0.02, Math.max(0.0001, Math.min(1, this.bgmVolume * 1.2 + 0.15)));
    window.setTimeout(() => p.stop(0.5), (c.beats * c.spb + 2.5) * 1000);
  }
  gachaEnd() { this.gachaP?.stop(0.4); this.gachaP = null; this.setDuck(false); }
  /** 앱이 뒤로 가면 멈춤 */
  suspend(on: boolean) { if (!this.ctx) return; if (on) void this.ctx.suspend(); else void this.ctx.resume(); }
  private tone(t: number, f: number, d: number, v: number, type: OscillatorType = 'square', f2?: number) {
    const c = this.ctx!; const o = c.createOscillator(); const g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(Math.max(0.0002, v * this.volume * 1.4), t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.02);
  }
  /** 뽑기 연출용 짧은 소리: 드르륵(손잡이) · 달그락(캡슐) · 통(떨어짐) · 쩍(금) · 덜컹 */
  fx(kind: 'crank' | 'rattle' | 'bounce' | 'crack' | 'clunk' | 'whoosh', step = 0) {
    const c = this.ctx; if (!c || this.muted) return;
    const t = c.currentTime;
    if (kind === 'crank') { for (let i = 0; i < 3; i++) this.tone(t + i * 0.035, 180 + i * 30, 0.025, 0.05, 'square'); }
    else if (kind === 'rattle') this.tone(t, 500 + step * 70 + Math.random() * 80, 0.03, 0.035, 'triangle');
    else if (kind === 'bounce') this.tone(t, 260 - step * 40, 0.08, 0.07, 'sine', 140 - step * 20);
    else if (kind === 'crack') { this.tone(t, 1400 + step * 200, 0.02, 0.05, 'square'); this.tone(t + 0.02, 900 + step * 150, 0.03, 0.04, 'square'); }
    else if (kind === 'clunk') { this.tone(t, 120, 0.12, 0.09, 'square', 70); this.tone(t + 0.05, 240, 0.06, 0.05, 'triangle'); }
    else if (kind === 'whoosh') this.tone(t, 300, 0.25, 0.04, 'sawtooth', 1200);
  }
  /** (시안 loop) 콤보 동전: 이어질수록 음이 올라간다 */
  coinCombo(n: number) {
    const c = this.ctx; if (!c || this.muted) return;
    const t = c.currentTime; if (t - this.last < 0.035) return; this.last = t;
    const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
    const f = 440 * Math.pow(2, (84 + scale[Math.min(scale.length - 1, Math.floor(n / 2))] - 69) / 12);
    this.tone(t, f, 0.06, 0.05); this.tone(t + 0.03, f * 1.5, 0.06, 0.03);
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
      case 'legend': [0, 4, 7, 12, 16, 19, 24].forEach((d, i) => this.tone(t + i * 0.09, m(60 + d), 0.4, 0.08, 'triangle')); break;
      case 'event': [0, 7, 12].forEach((d, i) => this.tone(t + i * 0.08, m(72 + d), 0.12, 0.06)); break;
      case 'feed': this.tone(t, m(72), 0.06, 0.05, 'triangle'); this.tone(t + 0.07, m(76), 0.08, 0.05, 'triangle'); break;
    }
  }
}
export const audio = new Audio();
