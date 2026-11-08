// 배경음: 악보(멜로디 · 화음 진행) → 음 목록으로 바꾸고, 앞서서 예약해 끊김 없이 반복 재생한다.
// 같은 악보를 OfflineAudioContext로 연주하면 음원 파일(OGG)도 뽑을 수 있다 (tools/render-music.cjs).
import { Synth, type Inst } from './synth';

/** 반주 방식 */
export type Role = 'mel' | 'counter' | 'bass' | 'pad' | 'arp' | 'drums' | 'chime' | 'fx';
export interface Part {
  inst: Inst; role: Role;
  /** 동물원 규모 단계(0~3) 이상일 때만 소리 (작은 동물원은 악기가 적다) */
  layer?: number;
  vol?: number;
  /** 반주 모양 (role마다 다름) */
  style?: string;
  /** 옥타브 옮기기 (12 = 한 옥타브) */
  shift?: number;
}
export interface Section {
  /** 마디마다 화음. 한 마디에 둘이면 공백으로 ("F G") */
  chords: string[];
  /** 멜로디: 8분음표 단위 토큰 ('c5' 음 · '.' 쉼 · '-' 이어짐 · 'c5/e5' 16분음표 둘), 마디는 '|' */
  mel?: string;
  counter?: string;
  /** 다른 구간을 그대로 쓰되 멜로디를 꾸민다 (반복 때 질리지 않게) */
  from?: string; vary?: boolean;
}
export interface Song {
  id: string; title: string; bpm: number;
  /** 한 마디 박 수 (4 = 4/4, 3 = 3/4) */
  beats: 3 | 4;
  swing?: number;
  /** 조 옮기기 (반음) */
  key?: number;
  form: string[];
  sections: Record<string, Section>;
  parts: Part[];
  /** 반복하지 않는 징글 */
  once?: boolean;
  /** 짧게 반복하는 곡 (이벤트 · 화면용, 25초 이상) */
  short?: boolean;
  /** 전체 음량 */
  gain?: number;
}

interface Ev { t: number; part: number; midi: number; dur: number; vel: number }
export interface Compiled { song: Song; events: Ev[]; beats: number; spb: number }

const NOTE: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
export function noteMidi(tok: string): number {
  const m = /^([a-g])([#b]?)(-?\d)$/.exec(tok);
  if (!m) throw new Error(`음 이름 오류: ${tok}`);
  return 12 * (Number(m[3]) + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
const QUAL: Record<string, number[]> = {
  '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], sus4: [0, 5, 7], sus2: [0, 2, 7],
  add9: [0, 4, 7, 14], dim: [0, 3, 6], aug: [0, 4, 8], '6': [0, 4, 7, 9], m6: [0, 3, 7, 9],
};
/** 'F#m7' → 근음(반음 0~11) · 구성음 */
export function chord(name: string): { root: number; tones: number[] } {
  const m = /^([A-G])([#b]?)(.*)$/.exec(name);
  if (!m || !(m[3] in QUAL)) throw new Error(`화음 이름 오류: ${name}`);
  const root = (NOTE[m[1].toLowerCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
  return { root, tones: QUAL[m[3]] };
}

/** 멜로디 문자열 → [박 위치, 음, 길이(박)] */
function parseMel(s: string, beats: number, startBeat: number, label: string): [number, number, number][] {
  const out: [number, number, number][] = [];
  const bars = s.split('|').map((b) => b.trim()).filter((b) => b.length);
  let last: [number, number, number] | null = null;
  bars.forEach((bar, bi) => {
    const toks = bar.split(/\s+/);
    if (toks.length !== beats * 2) throw new Error(`${label} ${bi + 1}마디: 8분음표 ${toks.length}개 (필요 ${beats * 2})`);
    toks.forEach((tk, i) => {
      const at = startBeat + bi * beats + i * 0.5;
      if (tk === '-') { if (last) last[2] += 0.5; return; }
      if (tk === '.') { last = null; return; }
      const sub = tk.split('/');
      sub.forEach((n, k) => { last = [at + (k * 0.5) / sub.length, noteMidi(n), 0.5 / sub.length]; out.push(last); });
    });
  });
  return out;
}
/** 반복 구간 꾸미기: 긴 음 앞에 꾸밈음, 일부 음은 한 옥타브 위 메아리 */
function vary(notes: [number, number, number][]): [number, number, number][] {
  const out: [number, number, number][] = [];
  notes.forEach(([t, m, d], i) => {
    if (d >= 1 && i % 2 === 0) { out.push([t, m + 2, 0.125]); out.push([t + 0.125, m, d - 0.125]); }
    else out.push([t, m, d]);
  });
  return out;
}

const SEEDED = (n: number) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };

export function compile(song: Song): Compiled {
  const B = song.beats, key = song.key ?? 0;
  const ev: Ev[] = [];
  let beat = 0;
  const push = (part: number, t: number, midi: number, dur: number, vel: number) => {
    const p = song.parts[part];
    ev.push({ t, part, midi: midi + key + (p.shift ?? 0), dur, vel: vel * (p.vol ?? 1) });
  };
  for (const name of song.form) {
    const raw = song.sections[name];
    if (!raw) throw new Error(`${song.id}: 구간 ${name} 없음`);
    const sec = raw.from ? { ...song.sections[raw.from], ...raw, chords: raw.chords.length ? raw.chords : song.sections[raw.from].chords, mel: raw.mel ?? song.sections[raw.from].mel, counter: raw.counter ?? song.sections[raw.from].counter } : raw;
    const bars = sec.chords.length;
    song.parts.forEach((p, pi) => {
      if (p.role === 'mel' || p.role === 'counter') {
        const src = p.role === 'mel' ? sec.mel : sec.counter;
        if (!src) return;
        let notes = parseMel(src, B, beat, `${song.id}/${name}/${p.role}`);
        if (raw.vary && p.role === 'mel') notes = vary(notes);
        notes.forEach(([t, m, d], i) => push(pi, t, m, d, (i % 4 === 0 ? 0.95 : 0.8) + SEEDED(t * 7 + pi) * 0.1));
        return;
      }
      sec.chords.forEach((cs, bi) => {
        const names = cs.split(/\s+/);
        names.forEach((cn, ci) => {
          const ch = chord(cn), len = B / names.length, t0 = beat + bi * B + ci * len;
          const R = 36 + ch.root, tones = ch.tones;
          const ctone = (k: number, base: number) => base + ch.root + tones[k % tones.length] + 12 * Math.floor(k / tones.length);
          const st = p.style ?? '';
          if (p.role === 'bass') {
            if (st === 'soft') push(pi, t0, R, len, 0.8);
            else if (st === 'waltz') { push(pi, t0, R, 1, 0.9); }
            else if (st === 'pulse') { for (let k = 0; k < len * 2; k++) push(pi, t0 + k * 0.5, k % 4 === 3 ? R + 12 : R, 0.45, k % 2 ? 0.6 : 0.85); }
            else if (st === 'walk') { const w = [0, tones[1], tones[2], tones[1] + 0]; for (let k = 0; k < len; k++) push(pi, t0 + k, R + w[k % 4], 0.9, k === 0 ? 0.9 : 0.7); }
            else { push(pi, t0, R, len >= 2 ? 1.4 : len * 0.7, 0.9); if (len >= 2) push(pi, t0 + len / 2, R + 7, 1.4, 0.75); } // root5
          } else if (p.role === 'pad') {
            tones.slice(0, 3).forEach((tn) => push(pi, t0, 60 + ch.root + tn - (ch.root > 6 ? 12 : 0), len, 0.8));
          } else if (p.role === 'arp') {
            const base = 60 - (ch.root > 6 ? 12 : 0);
            if (st === 'waltz') { [1, 2].forEach((b) => { if (b < len) tones.slice(0, 3).forEach((tn) => push(pi, t0 + b, base + ch.root + tn, 0.5, 0.6)); }); }
            else if (st === 'alberti') { const ord = [0, 2, 1, 2]; for (let k = 0; k < len * 2; k++) push(pi, t0 + k * 0.5, ctone(ord[k % 4], base), 0.45, 0.65); }
            else if (st === 'slow') { for (let k = 0; k < len; k++) push(pi, t0 + k, ctone(k % 3 + (k === len - 1 ? 1 : 0), base + 12), 1.4, 0.55); }
            else if (st === 'broken16') { const ord = [0, 1, 2, 3, 2, 1]; for (let k = 0; k < len * 4; k++) push(pi, t0 + k * 0.25, ctone(ord[k % 6], base), 0.22, k % 4 ? 0.5 : 0.7); }
            else { for (let k = 0; k < len * 2; k++) push(pi, t0 + k * 0.5, ctone(k % 4 === 3 ? 1 : k % 4, base), 0.45, k % 2 ? 0.55 : 0.7); } // up8
          } else if (p.role === 'chime') {
            if (bi % 2 === 0 && ci === 0) push(pi, t0 + (bi % 4 === 2 ? 0.5 : 0), 84 + ch.root + tones[(bi / 2) % tones.length] - (ch.root > 6 ? 12 : 0), 2, 0.7);
          } else if (p.role === 'drums') {
            const hit = (inst: number, tt: number, v: number) => ev.push({ t: tt, part: pi, midi: inst, dur: 0.1, vel: v * (p.vol ?? 1) });
            for (let k = 0; k < len * 2; k++) {
              const tt = t0 + k * 0.5, onBeat = k % 2 === 0, b = Math.floor(k / 2);
              if (st === 'pop') { if (b % 2 === 0 && onBeat) hit(0, tt, 0.9); if (b % 2 === 1 && onBeat) hit(1, tt, 0.8); hit(2, tt, onBeat ? 0.7 : 0.45); }
              else if (st === 'march') { if (onBeat) hit(b % 2 ? 1 : 0, tt, 0.8); if (!onBeat && b === len - 1) hit(1, tt, 0.5); hit(2, tt, 0.4); }
              else if (st === 'waltz') { if (onBeat && b === 0) hit(0, tt, 0.7); if (onBeat && b > 0) hit(2, tt, 0.6); }
              else if (st === 'shaker') { hit(3, tt, onBeat ? 0.5 : 0.8); if (onBeat && b === 0) hit(0, tt, 0.45); }
              else if (st === 'sleigh') { hit(4, tt, onBeat ? 0.8 : 0.5); if (onBeat && b === 0) hit(0, tt, 0.5); }
              else if (st === 'soft') { if (onBeat && b === 0) hit(0, tt, 0.5); if (!onBeat) hit(3, tt, 0.35); }
              else if (st === 'tick') { hit(2, tt, onBeat ? 0.6 : 0.4); hit(2, tt + 0.25, 0.3); if (onBeat && b % 2 === 0) hit(0, tt, 0.7); }
              else if (st === 'epic') {
                // 장렬: 첫 마디 스네어 롤이 커지고, 둘째 마디 박마다 팀파니, 마지막 마디 첫 박에 심벌 · 팀파니
                const last = bi === bars - 1;
                if (bi === 0) { hit(1, tt, 0.35 + 0.6 * (k / (len * 2))); hit(1, tt + 0.25, 0.3 + 0.6 * (k / (len * 2))); }
                else if (!last) { if (onBeat) { hit(6, tt, 0.9); hit(0, tt, 0.6); } hit(1, tt + 0.25, 0.25); }
                else if (k === 0) { hit(5, tt, 1); hit(6, tt, 1); hit(0, tt, 0.9); }
              }
              else if (st === 'janggu') { // 세마치 느낌: 덩 · 따 · 쿵따
                const pat = [[8, 0.9, 1], [0, 0, 0], [7, 0.6, 0], [7, 0.4, 0], [8, 0.6, 1], [7, 0.5, 0], [0, 0, 0], [7, 0.5, 0]][k % 8];
                if (pat[0]) { ev.push({ t: tt, part: pi, midi: pat[0] === 8 ? 7 : 7, dur: pat[2] ? 0.3 : 0.1, vel: pat[1] * (p.vol ?? 1) }); if (pat[2]) hit(8, tt, 0.7); }
              }
              else if (st === 'spooky') { if (onBeat && b % 2 === 0) hit(6, tt, 0.5); if (!onBeat && b % 2 === 1) hit(2, tt, 0.5); }
              else if (st === 'roll') { hit(1, tt, 0.4 + 0.5 * (k / (len * 2))); hit(1, tt + 0.25, 0.35 + 0.5 * (k / (len * 2))); }
            }
          } else if (p.role === 'fx') {
            // 풀벌레: 마디 첫 박 · 셋째 박 가끔
            if (ci === 0) { push(pi, t0 + 0.5, 100 + (bi % 3), 0.8, 0.8); if (bi % 2) push(pi, t0 + 2.5, 102, 0.6, 0.6); }
          }
        });
      });
    });
    beat += bars * B;
  }
  return { song, events: ev.sort((a, b) => a.t - b.t), beats: beat, spb: 60 / song.bpm };
}

const DRUM: Inst[] = ['kick', 'snare', 'hat', 'shaker', 'sleigh', 'crash', 'timp', 'janggu', 'buk'];
/** 박 위치 → 초 (스윙: 뒷 8분음표를 늦춘다) */
const when = (c: Compiled, t: number) => { const sw = c.song.swing ?? 0, frac = t % 1; return (t + (Math.abs(frac - 0.5) < 1e-6 ? sw * 0.5 : 0)) * c.spb; };
function fire(s: Synth, c: Compiled, e: Ev, at: number, layer: number, shift: number) {
  const p = c.song.parts[e.part];
  if ((p.layer ?? 0) > layer) return;
  const inst = p.role === 'drums' ? DRUM[e.midi] : p.inst;
  s.play(inst, at, p.role === 'drums' ? (e.midi === 7 ? (e.dur > 0.15 ? 50 : 70) : 60) : e.midi + shift, e.dur * c.spb, e.vel);
}

/** 실시간 재생기: 앞서서 예약 · 반복 · 페이드 */
export class Player {
  private timer = 0;
  private next = 0; private loopStart = 0; private idx = 0;
  readonly gain: GainNode;
  private synth: Synth;
  layer = 3; shift = 0;
  constructor(private ctx: AudioContext, dest: AudioNode, readonly c: Compiled, vol: number) {
    this.gain = ctx.createGain(); this.gain.gain.value = 0.0001; this.gain.connect(dest);
    this.synth = new Synth(ctx, this.gain);
    this.synth.out.gain.value = c.song.gain ?? 1;
    void vol;
  }
  get loopSec() { return this.c.beats * this.c.spb; }
  start(fade: number, vol: number) {
    const t = this.ctx.currentTime + 0.05;
    this.loopStart = t; this.idx = 0;
    this.gain.gain.cancelScheduledValues(t); this.gain.gain.setValueAtTime(0.0001, t); this.gain.gain.linearRampToValueAtTime(vol, t + Math.max(0.05, fade));
    const tick = () => this.pump();
    this.pump(); this.timer = window.setInterval(tick, 60);
  }
  private pump() {
    const ahead = this.ctx.currentTime + 0.35;
    const ev = this.c.events;
    while (true) {
      if (this.idx >= ev.length) { if (this.c.song.once) { window.clearInterval(this.timer); return; } this.idx = 0; this.loopStart += this.loopSec; }
      const e = ev[this.idx], at = this.loopStart + when(this.c, e.t);
      if (at > ahead) break;
      if (at >= this.ctx.currentTime - 0.05) fire(this.synth, this.c, e, at, this.layer, this.shift);
      this.idx++;
    }
    void this.next;
  }
  setVol(v: number, sec = 0.3) { const t = this.ctx.currentTime; this.gain.gain.cancelScheduledValues(t); this.gain.gain.setValueAtTime(Math.max(0.0001, this.gain.gain.value), t); this.gain.gain.linearRampToValueAtTime(Math.max(0.0001, v), t + sec); }
  stop(fade: number) {
    this.setVol(0.0001, fade);
    window.setTimeout(() => { window.clearInterval(this.timer); this.gain.disconnect(); }, (fade + 0.4) * 1000);
  }
}

/** 음원 뽑기: 반복 곡은 두 바퀴 연주하고 둘째 바퀴만 잘라 이음매 없이 (첫 바퀴 잔향이 이어짐), 징글은 끝 잔향까지 */
export async function renderSong(c: Compiled, layer = 3, sampleRate = 44100): Promise<AudioBuffer> {
  const loop = c.beats * c.spb, once = !!c.song.once;
  const len = once ? loop + 2.5 : loop * 2;
  const ctx = new OfflineAudioContext(2, Math.ceil(len * sampleRate), sampleRate);
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; comp.connect(ctx.destination);
  const master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp);
  const s = new Synth(ctx, master); s.out.gain.value = c.song.gain ?? 1;
  for (let k = 0; k < (once ? 1 : 2); k++) for (const e of c.events) fire(s, c, e, k * loop + when(c, e.t) + 0.001, layer, 0);
  const buf = await ctx.startRendering();
  if (once) return buf;
  const out = new AudioBuffer({ numberOfChannels: 2, length: Math.round(loop * sampleRate), sampleRate });
  for (let ch = 0; ch < 2; ch++) out.copyToChannel(buf.getChannelData(ch).subarray(Math.round(loop * sampleRate), Math.round(loop * sampleRate) * 2), ch);
  return out;
}
/** AudioBuffer → WAV (16비트) */
export function wav(b: AudioBuffer): ArrayBuffer {
  const n = b.length, ch = b.numberOfChannels, out = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); out.setUint32(4, 36 + n * ch * 2, true); w(8, 'WAVEfmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true);
  out.setUint32(24, b.sampleRate, true); out.setUint32(28, b.sampleRate * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, n * ch * 2, true);
  const data = Array.from({ length: ch }, (_, i) => b.getChannelData(i));
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) out.setInt16(44 + (i * ch + c) * 2, Math.max(-1, Math.min(1, data[c][i])) * 32767, true);
  return out.buffer;
}
