// 스프라이트: assets/ 아래 PNG가 있으면 그걸 쓰고, 없으면 코드로 그린 임시 도트를 쓴다.
// 이름 규칙 — animal_000 ~ animal_099 (8×8), person_00 ~ person_07 (8×12), staff_collector / staff_keeper (8×12),
// coin_0~3, 그 밖의 타일·아이콘은 tiles.ts / icons에서 정한 이름. GPT 시트를 tools/slice-sheets.py로 자르면 이 이름으로 나온다.
import { ANIMALS, type Shape } from '../data/animals';
import { STAFF } from '../data/staff';

export type Sprite = HTMLCanvasElement | HTMLImageElement;

// GPT 제작 원본(assets/sprites/**, 원본 픽셀 크기, 배경 #FF00FF). 시트(assets/spritesheets)는 쓰지 않는다.
const files = import.meta.glob('../../assets/sprites/**/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
/** 게임 이름 → URL. 동물은 시트 번호·칸 순서대로 animal_000~099 (data/animals.ts 순서와 같다) */
const URLS: Record<string, string> = {};
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
  cache.set(key, s);
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
  const c = cv.getContext('2d')!; c.fillStyle = '#ff00ff'; c.fillRect(0, 0, 8, 8);
  return cv;
}

/** 애니메이션 프레임: PNG가 한 장뿐이면 같은 그림을 쓰고 그리는 쪽에서 통통 튀게 한다 */
export function animalFrame(id: number, frame: number): Sprite {
  const base = `animal_${String(id).padStart(3, '0')}`;
  if (hasPng(base)) return sprite(base);
  return sprite(`animal_${id}_f${frame}`);
}
export function personFrame(kind: number, frame: number): Sprite {
  const base = `person_${String(kind).padStart(2, '0')}`;
  return hasPng(base) ? sprite(base) : sprite(`person_${kind}_f${frame}`);
}
export function staffFrame(kind: string, frame: number): Sprite {
  return hasPng(`staff_${kind}`) ? sprite(`staff_${kind}`) : sprite(`staff_${kind}_f${frame}`);
}
export const WHITE_PX = WHITE;
