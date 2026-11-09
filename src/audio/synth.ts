// 악기: Web Audio로 합성 (외부 음원 없음). 실시간(AudioContext)과 음원 뽑기(OfflineAudioContext) 둘 다 같은 코드로 연주한다.
export type Inst =
  | 'lead' | 'soft' | 'flute' | 'marimba' | 'musicbox' | 'bell' | 'pluck' | 'steel' | 'pad' | 'organ' | 'bass' | 'brass' | 'gayageum'
  | 'kick' | 'snare' | 'hat' | 'shaker' | 'sleigh' | 'tom' | 'cricket' | 'crash' | 'timp' | 'janggu' | 'buk';

export const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** 잔향 · 잡음 소리는 만들기가 무거워서 (특히 폰) 오디오 컨텍스트마다 한 번만 만들어 다시 쓴다 */
const bufCache = new WeakMap<BaseAudioContext, { noise: AudioBuffer; impulse: AudioBuffer; pool: ConvolverNode[]; filling: boolean }>();
function bufsOf(ctx: BaseAudioContext, mk: () => AudioBuffer) {
  let b = bufCache.get(ctx);
  if (!b) {
    const len = ctx.sampleRate, noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noise.getChannelData(0);
    let seed = 1234567;
    for (let i = 0; i < len; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; d[i] = (seed / 0x7fffffff) * 2 - 1; }
    b = { noise, impulse: mk(), pool: [], filling: false };
    bufCache.set(ctx, b);
  }
  return b;
}
/** 잔향 노드는 붙일 때 무거워서, 실시간 재생용은 쉬는 틈에 미리 두 개쯤 만들어 둔다 */
function refill(ctx: BaseAudioContext) {
  const b = bufCache.get(ctx);
  if (!b || b.filling || b.pool.length >= 2 || typeof window === 'undefined' || ctx instanceof OfflineAudioContext) return;
  b.filling = true;
  window.setTimeout(() => { const r = ctx.createConvolver(); r.buffer = b.impulse; b.pool.push(r); b.filling = false; refill(ctx); }, 250);
}

/** 악기 하나를 이 출력(dest)으로 연주하는 도구 묶음 (컨텍스트마다 하나) */
export class Synth {
  /** 소리를 켤 때 미리: 잔향 · 잡음 소리와 잔향 노드를 준비해 둔다 (첫 뽑기에서 멈칫하지 않게) */
  static warm(ctx: BaseAudioContext) { const s = new Synth(ctx, ctx.createGain()); void s; }
  private noise: AudioBuffer;
  readonly out: GainNode;
  readonly wet: GainNode;
  constructor(readonly ctx: BaseAudioContext, dest: AudioNode) {
    // 출력 → (건조) dest, (젖은) 잔향 → dest
    // 출력 앞에 낮은 소리 거르기 (55Hz 아래) — 작은 스피커 · 폰에서 뭉개지지 않게
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 55; hp.connect(dest);
    this.out = ctx.createGain(); this.out.connect(hp);
    const bufs = bufsOf(ctx, () => this.impulse(2.2, 2.6));
    let rev = bufs.pool.pop();
    if (!rev) { rev = ctx.createConvolver(); rev.buffer = bufs.impulse; }
    refill(ctx);
    this.wet = ctx.createGain(); this.wet.gain.value = 0.22;
    this.wet.connect(rev).connect(dest);
    this.noise = bufs.noise;
  }
  /** 잔향: 지수적으로 줄어드는 잡음 (씨앗 고정 → 매번 같은 소리) */
  private impulse(sec: number, decay: number) {
    const c = this.ctx, n = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate);
    let seed = 99;
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; d[i] = ((seed / 0x7fffffff) * 2 - 1) * Math.pow(1 - i / n, decay); } }
    return b;
  }
  private env(t: number, a: number, d: number, s: number, dur: number, r: number, peak: number) {
    const g = this.ctx.createGain(), p = g.gain;
    p.setValueAtTime(0.0001, t);
    p.linearRampToValueAtTime(peak, t + a);
    p.setTargetAtTime(peak * s, t + a, d / 3);
    const end = t + Math.max(dur, a + 0.01);
    p.setTargetAtTime(0.0001, end, r / 4);
    return { g, stop: end + r + 0.05 };
  }
  private osc(type: OscillatorType, f: number, t: number, stop: number, to: AudioNode, detune = 0) {
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
    o.connect(to); o.start(t); o.stop(stop); return o;
  }
  private vibrato(o: OscillatorNode, t: number, stop: number, depth: number, delay = 0.18) {
    const l = this.ctx.createOscillator(), lg = this.ctx.createGain();
    l.frequency.value = 5.2; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(depth, t + delay + 0.2);
    l.connect(lg).connect(o.detune); l.start(t); l.stop(stop);
  }
  private route(node: AudioNode, wet: number) { node.connect(this.out); if (wet > 0) { const w = this.ctx.createGain(); w.gain.value = wet; node.connect(w).connect(this.wet); } }
  private noiseHit(t: number, dur: number, vol: number, hp: number, lp: number, wet = 0.1) {
    const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noise; s.loop = true;
    const h = c.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = hp;
    const l = c.createBiquadFilter(); l.type = 'lowpass'; l.frequency.value = lp;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(h).connect(l).connect(g); this.route(g, wet);
    s.start(t, (t * 7.31) % 0.9); s.stop(t + dur + 0.02);
  }

  /** 음 하나. midi = 음 높이, dur = 초, vel = 0~1 */
  play(inst: Inst, t: number, midi: number, dur: number, vel: number) {
    const f = midiHz(midi), v = vel;
    switch (inst) {
      case 'lead': { // 사각파 멜로디 (칩튠), 부드럽게 깎음
        const e = this.env(t, 0.008, 0.12, 0.65, dur * 0.92, 0.08, 0.16 * v);
        const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
        const o = this.osc('square', f, t, e.stop, lp); this.vibrato(o, t, e.stop, 9);
        lp.connect(e.g); this.route(e.g, 0.25); break;
      }
      case 'soft': { // 둥근 사각파 (밤 멜로디)
        const e = this.env(t, 0.03, 0.2, 0.6, dur * 0.95, 0.25, 0.12 * v);
        const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
        const o = this.osc('square', f, t, e.stop, lp); this.vibrato(o, t, e.stop, 7, 0.3);
        lp.connect(e.g); this.route(e.g, 0.4); break;
      }
      case 'flute': { // 삼각파 + 숨소리
        const e = this.env(t, 0.04, 0.15, 0.8, dur * 0.95, 0.12, 0.3 * v);
        const o = this.osc('triangle', f, t, e.stop, e.g); this.vibrato(o, t, e.stop, 12, 0.22);
        const o2 = this.osc('sine', f * 2, t, e.stop, (() => { const g = this.ctx.createGain(); g.gain.value = 0.15; g.connect(e.g); return g; })());
        void o2; this.route(e.g, 0.3);
        this.noiseHit(t, 0.06, 0.02 * v, 2000, 8000, 0); break;
      }
      case 'marimba': { // 사인 + 4배음, 빨리 사라짐
        const e = this.env(t, 0.003, 0.35, 0.0001, 0.01, 0.4, 0.32 * v);
        this.osc('sine', f, t, e.stop + 0.4, e.g);
        const g4 = this.ctx.createGain(); g4.gain.setValueAtTime(0.35, t); g4.gain.exponentialRampToValueAtTime(0.001, t + 0.08); g4.connect(e.g);
        this.osc('sine', f * 4, t, t + 0.1, g4); this.route(e.g, 0.2); break;
      }
      case 'musicbox': { // 오르골: 사인 + 금속 배음, 길게 울림
        const e = this.env(t, 0.002, 0.9, 0.0001, 0.01, 1.2, 0.22 * v);
        this.osc('sine', f, t, e.stop + 1, e.g);
        const g2 = this.ctx.createGain(); g2.gain.setValueAtTime(0.4, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.25); g2.connect(e.g);
        this.osc('sine', f * 3.01, t, t + 0.3, g2); this.route(e.g, 0.45); break;
      }
      case 'bell': { // 종: 비정수 배음
        const e = this.env(t, 0.002, 1.6, 0.0001, 0.01, 1.8, 0.16 * v);
        this.osc('sine', f, t, e.stop + 1.5, e.g);
        [[2.0, 0.5], [2.76, 0.35], [5.4, 0.15]].forEach(([k, a]) => { const g = this.ctx.createGain(); g.gain.setValueAtTime(a, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.9 / k); g.connect(e.g); this.osc('sine', f * k, t, t + 1, g); });
        this.route(e.g, 0.5); break;
      }
      case 'pluck': { // 기타 느낌: 톱니파 + 닫히는 필터
        const e = this.env(t, 0.003, 0.3, 0.12, dur * 0.8, 0.12, 0.16 * v);
        const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2;
        lp.frequency.setValueAtTime(3600, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.35);
        this.osc('sawtooth', f, t, e.stop, lp); lp.connect(e.g); this.route(e.g, 0.2); break;
      }
      case 'gayageum': { // 가야금 느낌: 뜯는 소리 + 음 끝 살짝 꺾기 (농현)
        const e = this.env(t, 0.002, 0.5, 0.1, dur * 0.9, 0.3, 0.2 * v);
        const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(4200, t); lp.frequency.exponentialRampToValueAtTime(900, t + 0.5);
        const o = this.osc('sawtooth', f, t, e.stop, lp); o.frequency.setValueAtTime(f, t + dur * 0.5); o.frequency.linearRampToValueAtTime(f * 1.03, t + dur * 0.75); o.frequency.linearRampToValueAtTime(f, t + dur);
        lp.connect(e.g); this.route(e.g, 0.3); break;
      }
      case 'steel': { // 스틸드럼
        const e = this.env(t, 0.003, 0.45, 0.05, 0.05, 0.4, 0.22 * v);
        this.osc('sine', f, t, e.stop, e.g);
        [[2, 0.4], [3.9, 0.18]].forEach(([k, a]) => { const g = this.ctx.createGain(); g.gain.value = a; g.connect(e.g); this.osc('sine', f * k, t, e.stop, g); });
        this.route(e.g, 0.25); break;
      }
      case 'pad': { // 두 톱니파 조금 어긋나게 + 낮은 필터, 천천히 나타남
        const e = this.env(t, 0.5, 0.6, 0.85, dur, 0.8, 0.045 * v);
        const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100;
        this.osc('sawtooth', f, t, e.stop, lp, -7); this.osc('sawtooth', f, t, e.stop, lp, 7);
        lp.connect(e.g); this.route(e.g, 0.5); break;
      }
      case 'organ': {
        const e = this.env(t, 0.02, 0.1, 0.9, dur * 0.95, 0.1, 0.06 * v);
        this.osc('sine', f, t, e.stop, e.g); this.osc('sine', f * 2, t, e.stop, e.g); this.osc('triangle', f / 2, t, e.stop, e.g);
        this.route(e.g, 0.35); break;
      }
      case 'brass': { // 팡파르: 톱니 + 열리는 필터
        const e = this.env(t, 0.03, 0.2, 0.75, dur * 0.95, 0.15, 0.13 * v);
        const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(600, t); lp.frequency.linearRampToValueAtTime(2800, t + 0.08);
        this.osc('sawtooth', f, t, e.stop, lp); this.osc('square', f, t, e.stop, lp, 5);
        lp.connect(e.g); this.route(e.g, 0.3); break;
      }
      case 'bass': {
        // 베이스: 삼각파 + 한 옥타브 위 사인 살짝 (작은 스피커에서도 들리게). 아주 낮은 보조음은 넣지 않는다 (뭉개짐)
        const e = this.env(t, 0.006, 0.25, 0.5, dur * 0.9, 0.08, 0.2 * v);
        this.osc('triangle', f, t, e.stop, e.g); this.osc('sine', f * 2, t, e.stop, (() => { const g = this.ctx.createGain(); g.gain.value = 0.25; g.connect(e.g); return g; })());
        e.g.connect(this.out); break;
      }
      case 'kick': {
        const g = this.ctx.createGain(); g.gain.setValueAtTime(0.26 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18); g.connect(this.out);
        const o = this.osc('sine', 140, t, t + 0.22, g); o.frequency.exponentialRampToValueAtTime(60, t + 0.12); break;
      }
      case 'snare': this.noiseHit(t, 0.14, 0.18 * v, 1500, 9000, 0.15); { const g = this.ctx.createGain(); g.gain.setValueAtTime(0.12 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08); g.connect(this.out); this.osc('triangle', 200, t, t + 0.1, g); } break;
      case 'hat': this.noiseHit(t, 0.04, 0.07 * v, 7000, 14000, 0.05); break;
      case 'shaker': this.noiseHit(t, 0.06, 0.05 * v, 4500, 11000, 0.1); break;
      case 'sleigh': for (let i = 0; i < 3; i++) this.noiseHit(t + i * 0.025, 0.05, 0.05 * v, 6500, 15000, 0.2); break;
      case 'tom': { const g = this.ctx.createGain(); g.gain.setValueAtTime(0.35 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4); g.connect(this.out); const w = this.ctx.createGain(); w.gain.value = 0.3; g.connect(w).connect(this.wet); const o = this.osc('sine', f, t, t + 0.45, g); o.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.3); break; }
      case 'crash': this.noiseHit(t, 1.6, 0.16 * v, 3000, 15000, 0.4); this.noiseHit(t, 0.25, 0.12 * v, 800, 6000, 0.2); break;
      case 'timp': { // 팀파니: 낮은 사인 + 쿵
        const g = this.ctx.createGain(); g.gain.setValueAtTime(0.42 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9); g.connect(this.out);
        const w = this.ctx.createGain(); w.gain.value = 0.35; g.connect(w).connect(this.wet);
        const o = this.osc('sine', 98, t, t + 1, g); o.frequency.exponentialRampToValueAtTime(82, t + 0.4);
        this.noiseHit(t, 0.05, 0.08 * v, 200, 2000, 0); break;
      }
      case 'janggu': { // 장구: 궁편(둥) · 채편(따) — midi 낮으면 둥, 높으면 따
        if (midi < 62) { const g = this.ctx.createGain(); g.gain.setValueAtTime(0.3 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); g.connect(this.out); const o = this.osc('sine', 130, t, t + 0.32, g); o.frequency.exponentialRampToValueAtTime(90, t + 0.2); }
        else { this.noiseHit(t, 0.07, 0.16 * v, 1800, 7000, 0.15); const g = this.ctx.createGain(); g.gain.setValueAtTime(0.1 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06); g.connect(this.out); this.osc('triangle', 420, t, t + 0.07, g); }
        break;
      }
      case 'buk': { const g = this.ctx.createGain(); g.gain.setValueAtTime(0.36 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); g.connect(this.out); const o = this.osc('sine', 110, t, t + 0.4, g); o.frequency.exponentialRampToValueAtTime(70, t + 0.25); this.noiseHit(t, 0.04, 0.06 * v, 300, 3000, 0.1); break; }
      case 'cricket': { // 풀벌레: 높은 사인을 빠르게 떨기
        const e = this.env(t, 0.01, 0.05, 1, dur, 0.03, 0.025 * v);
        const am = this.ctx.createGain(); am.gain.value = 0; am.connect(e.g);
        const l = this.ctx.createOscillator(); l.frequency.value = 38; const lg = this.ctx.createGain(); lg.gain.value = 1; l.connect(lg).connect(am.gain); l.start(t); l.stop(e.stop);
        this.osc('sine', f, t, e.stop, am); this.route(e.g, 0.4); break;
      }
    }
  }
}
