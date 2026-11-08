// 스프라이트: assets/ 아래 PNG가 있으면 그걸 쓰고, 없으면 코드로 그린 임시 도트를 쓴다.
// 이름 규칙 — animal_000 ~ animal_099 (8×8), person_00 ~ person_07 (8×12), staff_collector / staff_keeper (8×12),
// coin_0~3, 그 밖의 타일·아이콘은 tiles.ts / icons에서 정한 이름. GPT 시트를 tools/slice-sheets.py로 자르면 이 이름으로 나온다.
import { ANIMALS, sheetIndex, type Shape } from '../data/animals';
import { STAFF } from '../data/staff';

export type Sprite = HTMLCanvasElement | HTMLImageElement;

// GPT 제작 원본(assets/sprites/**, 원본 픽셀 크기, 배경 #FF00FF). 시트(assets/spritesheets)는 쓰지 않는다.
const files = import.meta.glob('../../assets/sprites/**/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
/** 게임 이름 → URL. 동물은 시트 번호·칸 순서대로 animal_000~099 (data/animals.ts 순서와 같다) */
const URLS: Record<string, string> = {};
/** 크게 다시 그린 영웅 · 전설 동물 (필드에서 도트 그대로 그린다) */
export const BIG = new Set<number>();
{
  const num = (p: string, re: RegExp) => Number(re.exec(p)?.[1] ?? 0);
  const animals = Object.keys(files).filter((p) => p.includes('/sprites/animals/'))
    .sort((a, b) => num(a, /animals_(\d+)/) - num(b, /animals_(\d+)/) || num(a, /\/(\d+)_[^/]+\.png$/) - num(b, /\/(\d+)_[^/]+\.png$/));
  animals.forEach((p, i) => { URLS[`animal_${String(i).padStart(3, '0')}`] = files[p]; });
  const STAFF_AT: Record<number, string> = { 9: 'staff_collector', 10: 'staff_keeper', 11: 'staff_guide', 12: 'staff_janitor' };
  for (const [p, url] of Object.entries(files)) {
    const idx = num(p, /\/(\d+)_[^/]+\.png$/);
    const group = /\/sprites\/[^/]+\/([^/]+)\//.exec(p)?.[1] ?? '';
    if (p.includes('/sprites/people/')) URLS[idx <= 8 ? `person_${String(idx - 1).padStart(2, '0')}` : STAFF_AT[idx]] = url;
    else if (p.includes('/sprites/effects/') && idx <= 4) URLS[`coin_${idx - 1}`] = url;
    if (!p.includes('/sprites/animals/')) URLS[`${group}_${String(idx).padStart(2, '0')}`] = url; // tiles_01, icons_05, cards_07 …
  }
}

// 16px 시트에서 잘라 낸 그림 (tools/slice16.py → assets/sprites16, 배경 투명). 있으면 위 8px 그림보다 먼저 쓴다
const files16 = import.meta.glob('../../assets/sprites16/**/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
{
  const byName = new Map<string, string>();
  for (const [p, url] of Object.entries(files16)) byName.set(p.replace(/^.*\/sprites16\//, '').replace(/\.png$/, ''), url);
  // 동물: 시트 칸 번호 → 동물 번호
  for (const a of ANIMALS) { const u = byName.get(`a16/src_${String(sheetIndex(a.id)).padStart(3, '0')}`); if (u) URLS[`animal_${String(a.id).padStart(3, '0')}`] = u; }
  for (const [k, u] of byName) {
    let m: RegExpExecArray | null;
    if ((m = /^people16\/(\w+)_(\d+)_f(\d)$/.exec(k))) URLS[`p16_${m[1]}_${Number(m[2])}_f${m[3]}`] = u;
    else if ((m = /^staff16\/(\d+)_f(\d)$/.exec(k)) && STAFF[Number(m[1])]) URLS[`s16_${STAFF[Number(m[1])].kind}_f${m[2]}`] = u;
    else if ((m = /^tiles16\/(\w+)_(\d+)$/.exec(k))) URLS[`t16_${m[1]}_${Number(m[2])}`] = u;
    else if ((m = /^fences16\/t(\d)_([hvgp])$/.exec(k))) URLS[`f16_${m[1]}_${m[2]}`] = u;
    else if ((m = /^icons16\/(\d+)$/.exec(k))) URLS[`icons_${m[1]}`] = u;
    else if ((m = /^fac16\/(\w+)$/.exec(k))) URLS[`fac_${m[1]}`] = u;
    else if ((m = /^decor16\/(\w+)_(\d+)$/.exec(k))) URLS[`decor_${m[1]}_${Number(m[2])}`] = u;
    else if ((m = /^v2\/(\w+)$/.exec(k))) URLS[`v2_${m[1]}`] = u;
    else if ((m = /^fx16\/(\d+)$/.exec(k))) { URLS[`fx_${m[1]}`] = u; if (Number(m[1]) <= 4) URLS[`coin_${Number(m[1]) - 1}`] = u; }
  }
  // 새 그림이 있으면 예전 그림 대신: 영웅 · 전설 동물(크게), 계절 소품
  for (const [k, u] of byName) {
    let m: RegExpExecArray | null;
    if ((m = /^v2\/big_(\d{3})$/.exec(k))) { URLS[`animal_${m[1]}`] = u; BIG.add(Number(m[1])); }
    else if ((m = /^v2\/decor_(\w+)_(\d+)$/.exec(k))) URLS[`decor_${m[1]}_${Number(m[2])}`] = u;
  }
}

const cache = new Map<string, Sprite>();
export const hasPng = (key: string) => key in URLS;

/** 배경색(#FF00FF)을 투명으로 바꾼 캔버스 */
function keyed(img: HTMLImageElement): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = img.naturalWidth; cv.height = img.naturalHeight;
  const c = cv.getContext('2d')!;
  c.drawImage(img, 0, 0);
  const d = c.getImageData(0, 0, cv.width, cv.height);
  for (let i = 0; i < d.data.length; i += 4) if (d.data[i] > 240 && d.data[i + 1] < 16 && d.data[i + 2] > 240) d.data[i + 3] = 0;
  c.putImageData(d, 0, 0);
  return cv;
}

export async function preloadPngs(onProgress?: (p: number) => void) {
  const list = Object.entries(URLS);
  let done = 0;
  await Promise.all(list.map(([key, url]) => new Promise<void>((res) => {
    const img = new Image();
    img.onload = () => { cache.set(key, keyed(img)); done++; onProgress?.(done / list.length); res(); };
    img.onerror = () => { done++; res(); };
    img.src = url;
  })));
}

const OUTLINE = '#1a1c2c', EYE = '#1a1c2c', WHITE = '#f4f4f4';

// 8×8 모양 틀 (왼쪽을 본다). B 몸 · A 포인트 · E 눈 · . 빈칸. 테두리는 자동으로 두른다.
// 프레임 2개: 다리·날개가 바뀐다.
const MASKS: Record<Shape, [string[], string[]]> = {
  quad: [
    ['........', '.A......', '.BB.....', 'EBBBBBA.', '.BBBBBB.', '..BBBB..', '..B..B..', '........'],
    ['........', '.A......', '.BB.....', 'EBBBBBA.', '.BBBBBB.', '..BBBB..', '.B....B.', '........']],
  small: [
    ['........', '.A..A...', '.BBBB...', 'EBBBBB..', 'BBAABB..', '.BBBBB..', '.B..B...', '........'],
    ['........', '.A..A...', '.BBBB...', 'EBBBBB..', 'BBAABB..', '.BBBBB..', '..BB....', '........']],
  bird: [
    ['........', '..BB....', '.EBBB...', 'ABBBBB..', '..BBBBB.', '..BBBB..', '...A.A..', '........'],
    ['........', '..BB....', '.EBBB...', 'ABBBBBB.', '..BBBB.B', '..BBBB..', '...AA...', '........']],
  fish: [
    ['........', '...BB...', '.BBBBB.A', 'EBBBBBAA', 'BAABBBBA', '.BBBBB..', '........', '........'],
    ['........', '...BB...', '.BBBBB..', 'EBBBBBAA', 'BAABBBAA', '.BBBBB.A', '........', '........']],
  reptile: [
    ['........', '........', '.BBA....', 'EBBBBAB.', 'BBBBBBBA', '.B.B.B..', '........', '........'],
    ['........', '........', '.BBA....', 'EBBBBAB.', 'BBBBBBBA', 'B.B.B...', '........', '........']],
  bug: [
    ['........', '..A.A...', '..BBB...', '.EBABA..', '.BABAB..', '..BBB...', '..B.B...', '........'],
    ['........', '.A...A..', '..BBB...', '.EBABA..', '.BABAB..', '..BBB...', '.B...B..', '........']],
  tall: [
    ['.A......', '.BB.....', 'EBB.....', '.BB.....', '.BBBBBA.', '.BBBBB..', '.B...B..', '.B...B..'],
    ['.A......', '.BB.....', 'EBB.....', '.BB.....', '.BBBBBA.', '.BBBBB..', '..B.B...', '.B...B..']],
  big: [
    ['........', '.BBBB...', 'EBBBBBB.', 'ABBBBBBB', 'ABBBBBBB', '.BBBBBB.', '.BB..BB.', '........'],
    ['........', '.BBBB...', 'EBBBBBB.', 'ABBBBBBB', 'ABBBBBBB', '.BBBBBB.', 'BB....BB', '........']],
  myth: [
    ['A.......', '.BB...A.', 'EBBB.AA.', '.BBBBBB.', '.BBBBBBA', '..BBBB..', '..B..B..', '........'],
    ['A.....A.', '.BB..AA.', 'EBBB.A..', '.BBBBBB.', '.BBBBBBA', '..BBBB..', '.B....B.', '........']],
};

function fromMask(rows: string[], body: string, accent: string, w = 8, h = 8): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d')!;
  const filled = (x: number, y: number) => y >= 0 && y < rows.length && x >= 0 && x < rows[y].length && rows[y][x] !== '.';
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ch = rows[y]?.[x] ?? '.';
    let col: string | null = null;
    if (ch === 'B') col = body; else if (ch === 'A') col = accent; else if (ch === 'E') col = EYE;
    else if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) col = OUTLINE;
    if (col) { c.fillStyle = col; c.fillRect(x, y, 1, 1); }
  }
  return cv;
}

// 사람 8×12: H 머리카락 · S 피부 · B 옷 · A 포인트(가방·모자 등)
const PERSON: [string[], string[]] = [
  ['..HHH...', '.HHHHH..', '.HSSSH..', '.SESSS..', '..SSS...', '.BBBBB..', 'SBBBBBS.', '.BBABB..', '.BBBBB..', '..L.L...', '..L.L...', '........'],
  ['..HHH...', '.HHHHH..', '.HSSSH..', '.SESSS..', '..SSS...', '.BBBBB..', 'SBBBBBS.', '.BBABB..', '.BBBBB..', '.L...L..', '.L...L..', '........']];
const VISITOR_LOOKS: [string, string, string][] = [
  ['#d83a3a', '#5d3a24', '#f7c948'], ['#f7c948', '#2b1d14', '#ef7d32'], ['#3b5dc9', '#8a5a3b', '#94b0c2'], ['#38a35b', '#e0a526', '#f6e6c8'],
  ['#566c86', '#c7cfdd', '#5d3a24'], ['#8e44ad', '#2b1d14', '#41a6f6'], ['#f08cbe', '#5d3a24', '#ffc8dd'], ['#2a9d8f', '#1a1c2c', '#f4f4f4'],
];
export const VISITOR_KINDS = VISITOR_LOOKS.length;

function person(frame: number, cloth: string, hair: string, acc: string): HTMLCanvasElement {
  const rows = PERSON[frame];
  const cv = document.createElement('canvas');
  cv.width = 8; cv.height = 12;
  const c = cv.getContext('2d')!;
  const map: Record<string, string> = { H: hair, S: '#e8c39e', E: EYE, B: cloth, A: acc, L: '#333c57' };
  const filled = (x: number, y: number) => rows[y]?.[x] !== undefined && rows[y][x] !== '.';
  for (let y = 0; y < 12; y++) for (let x = 0; x < 8; x++) {
    const ch = rows[y][x];
    const col = ch !== '.' ? map[ch] : (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) ? OUTLINE : null;
    if (col) { c.fillStyle = col; c.fillRect(x, y, 1, 1); }
  }
  return cv;
}

function coin(frame: number): HTMLCanvasElement {
  const shapes = [
    ['..AAA...', '.ABBBA..', 'ABBCBBA.', 'ABBCBBA.', 'ABBCBBA.', '.ABBBA..', '..AAA...', '........'],
    ['...AA...', '..ABBA..', '.ABCBBA.', '.ABCBBA.', '.ABCBBA.', '..ABBA..', '...AA...', '........'],
    ['...A....', '...AA...', '...AB...', '...AB...', '...AB...', '...AA...', '...A....', '........'],
    ['...AA...', '..ABBA..', '.ABBCBA.', '.ABBCBA.', '.ABBCBA.', '..ABBA..', '...AA...', '........']];
  const rows = shapes[frame];
  const cv = document.createElement('canvas'); cv.width = 8; cv.height = 8;
  const c = cv.getContext('2d')!;
  const map: Record<string, string> = { A: '#8a5a3b', B: '#f7c948', C: '#fff3a3' };
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const ch = rows[y][x]; if (ch !== '.') { c.fillStyle = map[ch]; c.fillRect(x, y, 1, 1); } }
  return cv;
}

/** 이름으로 스프라이트. 없으면 임시 도트를 만든다 */
export function sprite(key: string): Sprite {
  let s = cache.get(key);
  if (s) return s;
  s = make(key);
  // PNG가 아직 안 불러졌으면 임시 그림을 저장해 두지 않는다 (불러온 뒤 진짜 그림이 쓰이게)
  if (!(key in URLS)) cache.set(key, s);
  return s;
}

function make(key: string): HTMLCanvasElement {
  let m = /^animal_(\d+)(?:_f(\d))?$/.exec(key);
  if (m) {
    const a = ANIMALS[Number(m[1])] ?? ANIMALS[0];
    return fromMask(MASKS[a.shape][Number(m[2] ?? 0)], a.body, a.accent);
  }
  m = /^person_(\d+)(?:_f(\d))?$/.exec(key);
  if (m) { const [b, hr, ac] = VISITOR_LOOKS[Number(m[1]) % VISITOR_LOOKS.length]; return person(Number(m[2] ?? 0), b, hr, ac); }
  m = /^staff_(\w+?)(?:_f(\d))?$/.exec(key);
  if (m) { const st = STAFF.find((x) => x.kind === m![1]) ?? STAFF[0]; return person(Number(m[2] ?? 0), st.body, '#5d3a24', st.accent); }
  m = /^coin_(\d)$/.exec(key);
  if (m) return coin(Number(m[1]) % 4);
  const cv = document.createElement('canvas'); cv.width = 8; cv.height = 8;
  return cv; // 빈 그림 (불러오는 중이거나 없는 그림)
}

/** 애니메이션 프레임: PNG가 한 장뿐이면 같은 그림을 쓰고 그리는 쪽에서 통통 튀게 한다 */
export function animalFrame(id: number, frame: number): Sprite {
  const base = `animal_${String(id).padStart(3, '0')}`;
  if (hasPng(base)) return sprite(base);
  return sprite(`animal_${id}_f${frame}`);
}
/** 16px 관람객 (계절 옷). 없으면 null. 그림은 오른쪽을 본다 */
export function person16(season: string, kind: number, frame: number): Sprite | null {
  const k = `p16_${season}_${kind}_f${frame}`;
  return hasPng(k) ? sprite(k) : null;
}
/** 16px 직원. 없으면 null. 그림은 오른쪽을 본다 */
export function staff16(kind: string, frame: number): Sprite | null {
  const k = `s16_${kind}_f${frame}`;
  return hasPng(k) ? sprite(k) : null;
}
export function personFrame(kind: number, frame: number): Sprite {
  kind = kind % 8;
  const base = `person_${String(kind).padStart(2, '0')}`;
  return hasPng(base) ? sprite(base) : sprite(`person_${kind}_f${frame}`);
}
export function staffFrame(kind: string, frame: number): Sprite {
  return hasPng(`staff_${kind}`) ? sprite(`staff_${kind}`) : sprite(`staff_${kind}_f${frame}`);
}
export const WHITE_PX = WHITE;

/** 반짝이 변종: 색상환을 돌리고 채도를 올린 그림 (원본별로 한 번만 만든다) */
const shinyCache = new WeakMap<object, HTMLCanvasElement>();
export function shinyOf(img: Sprite): Sprite {
  const hit = shinyCache.get(img);
  if (hit) return hit;
  const w = img.width, h = img.height;
  if (!w || !h) return img;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d')!;
  c.drawImage(img, 0, 0);
  const d = c.getImageData(0, 0, w, h), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    if (p[i + 3] === 0) continue;
    let r = p[i] / 255, g = p[i + 1] / 255, b = p[i + 2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    // 외곽선(진한 색) · 흰색 · 회색은 그대로: 바꾸면 도트가 튀어 보인다
    if (l < 0.28 || (max - min < 0.12 && l > 0.8) || max - min < 0.06) continue;
    let hh = 0, ss = 0;
    const dd = max - min;
    if (dd) { ss = l > 0.5 ? dd / (2 - max - min) : dd / (max + min); hh = max === r ? (g - b) / dd + (g < b ? 6 : 0) : max === g ? (b - r) / dd + 2 : (r - g) / dd + 4; hh /= 6; }
    hh = (hh + 0.42) % 1; ss = Math.min(1, ss * 1.15 + (ss > 0.25 ? 0.1 : 0));
    const q = l < 0.5 ? l * (1 + ss) : l + ss - l * ss, pp = 2 * l - q;
    const f = (t: number) => { t = (t + 1) % 1; return t < 1 / 6 ? pp + (q - pp) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? pp + (q - pp) * (2 / 3 - t) * 6 : pp; };
    r = f(hh + 1 / 3); g = f(hh); b = f(hh - 1 / 3);
    p[i] = r * 255; p[i + 1] = g * 255; p[i + 2] = b * 255;
  }
  c.putImageData(d, 0, 0);
  shinyCache.set(img, cv);
  return cv;
}

/** 도트 그림 축소: 목표 칸마다 가장 많은 색 (외곽선이 1/3 넘게 있으면 외곽선), 덜 찬 칸은 투명. 원본·크기별로 한 번만 만든다 */
const downCache = new WeakMap<object, Map<string, HTMLCanvasElement>>();
export function pixelDown(img: Sprite, tw: number, th: number): Sprite {
  tw = Math.max(1, Math.round(tw)); th = Math.max(1, Math.round(th));
  if (tw >= img.width && th >= img.height) return img;
  let m = downCache.get(img);
  if (!m) { m = new Map(); downCache.set(img, m); }
  const key = `${tw}x${th}`;
  const hit = m.get(key);
  if (hit) return hit;
  const sw = img.width, sh = img.height;
  const src = document.createElement('canvas'); src.width = sw; src.height = sh;
  const sc = src.getContext('2d')!; sc.drawImage(img, 0, 0);
  const sd = sc.getImageData(0, 0, sw, sh).data;
  const cv = document.createElement('canvas'); cv.width = tw; cv.height = th;
  const c = cv.getContext('2d')!;
  const out = c.createImageData(tw, th);
  for (let y = 0; y < th; y++) {
    const y0 = Math.floor((y * sh) / th), y1 = Math.max(y0 + 1, Math.floor(((y + 1) * sh) / th));
    for (let x = 0; x < tw; x++) {
      const x0 = Math.floor((x * sw) / tw), x1 = Math.max(x0 + 1, Math.floor(((x + 1) * sw) / tw));
      const counts = new Map<number, number>();
      let opaque = 0, total = 0, dark = 0, darkKey = 0;
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
        total++;
        const i = (yy * sw + xx) * 4;
        if (sd[i + 3] < 128) continue;
        opaque++;
        const k = (sd[i] << 16) | (sd[i + 1] << 8) | sd[i + 2];
        counts.set(k, (counts.get(k) ?? 0) + 1);
        if (sd[i] + sd[i + 1] + sd[i + 2] < 150) { dark++; darkKey = k; }
      }
      if (opaque < total * 0.45) continue;
      let best = 0, bk = 0;
      for (const [k, n] of counts) if (n > best) { best = n; bk = k; }
      if (dark >= opaque * 0.34) bk = darkKey;
      const o = (y * tw + x) * 4;
      out.data[o] = bk >> 16; out.data[o + 1] = (bk >> 8) & 255; out.data[o + 2] = bk & 255; out.data[o + 3] = 255;
    }
  }
  c.putImageData(out, 0, 0);
  m.set(key, cv);
  return cv;
}
/** 그림의 평균 색 (투명 제외) */
const avgCache = new WeakMap<object, string>();
export function avgColor(img: Sprite): string {
  const hit = avgCache.get(img);
  if (hit) return hit;
  const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
  const c = cv.getContext('2d')!; c.drawImage(img, 0, 0);
  const d = c.getImageData(0, 0, cv.width, cv.height).data;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 128) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
  const col = n ? `rgb(${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)})` : '#4c8a3c';
  avgCache.set(img, col);
  return col;
}

// ── 올림푸스 네임드: 전용 그림(v2_god_N · v2_god_N_aw · v2_godp_N, v2_hero_N_f0/f1 · _aw_f0/f1 · v2_herop_N)이 없으면 바탕 종/직원 그림 ──
export function godFrame(id: number, awake: boolean, base: number): Sprite {
  const k = `v2_god_${id}${awake ? '_aw' : ''}`;
  if (hasPng(k)) return sprite(k);
  const b = animalFrame(base, 0);
  return awake ? shinyOf(b) : b;
}
export function godPortrait(id: number, awake: boolean, base: number): Sprite {
  return hasPng(`v2_godp_${id}`) ? sprite(`v2_godp_${id}`) : godFrame(id, awake, base);
}
export function heroFrame(id: number, awake: boolean, kind: string, frame: number): Sprite {
  const k = `v2_hero_${id}${awake ? '_aw' : ''}_f${frame}`;
  if (hasPng(k)) return sprite(k);
  const b = staffFrame(kind, frame);
  return awake ? shinyOf(b) : b;
}
export function heroPortrait(id: number, awake: boolean, kind: string): Sprite {
  return hasPng(`v2_herop_${id}`) ? sprite(`v2_herop_${id}`) : heroFrame(id, awake, kind, 0);
}
