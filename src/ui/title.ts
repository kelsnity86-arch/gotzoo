// 타이틀 화면 배경: 밤 축제 (별 · 꼬마전구 · 캡슐 불꽃놀이) + 언덕 위 동물원 (문 · 벚꽃나무 · 회전목마 · 산책길 동물)
// 그림은 모두 게임 도트 그림. 계절마다 나무 · 문 장식 · 소품이 바뀐다.
import { h, pix } from './dom';
import { hasPng } from '../render/sprites';
import { motion } from './motion';

export type SeasonKey = 'spring' | 'summer' | 'autumn' | 'winter';
export const SEASON_KEYS: SeasonKey[] = ['spring', 'summer', 'autumn', 'winter'];

/** 정수배에 묶이지 않고 긴 변을 정확히 size px로 (화면이 작아도 그림 크기가 고르게) */
function fit(key: string, size: number, cls = 'pix') {
  const cv = pix(key, size * 2, cls);
  const r = size / Math.max(cv.width, cv.height);
  cv.style.width = `${Math.round(cv.width * r)}px`; cv.style.height = `${Math.round(cv.height * r)}px`;
  return cv;
}
/** 그림 하나를 바닥 기준으로 놓는다 (x: 화면 폭 비율, bottom: 화면 높이 비율, size: 긴 변 px) */
function put(key: string, x: number, bottom: number, size: number, cls = '') {
  if (!hasPng(key)) return null;
  const cv = fit(key, size, `pix tt-px ${cls}`);
  cv.style.left = `${x * 100}%`; cv.style.bottom = `${bottom * 100}%`;
  return cv;
}

/** 배경 장면. w · h는 #ui 확대를 뺀 화면 크기 */
export function titleScene(season: SeasonKey, w: number, hgt: number, animals: number[]): HTMLElement {
  const u = Math.min(w / 1366, hgt / 768) * 1.0;
  const S = (n: number) => Math.round(n * u);
  const scene = h('div', { class: 'tt-scene' });
  const add = (...els: (HTMLElement | null)[]) => { for (const e of els) if (e) scene.append(e); };
  add(h('div', { class: 'tt-stars' }));
  // 꼬마전구 줄
  const lights = h('div', { class: 'tt-lights' });
  const cols = ['#ff8fc4', '#f7c948', '#73eff7', '#a7d65b'];
  const n = Math.max(8, Math.round(w / 95));
  for (let i = 0; i < n; i++) { const k = (i + 0.5) / n; lights.append(h('i', { style: `left:${k * 100}%; top:${Math.sin(k * Math.PI) * 52 - 4}px; background:${cols[i % 4]}; color:${cols[i % 4]}; animation-delay:${(i % 4) * 0.35}s` })); }
  add(lights);
  add(h('div', { class: 'tt-hill2' }), h('div', { class: 'tt-hill' }));
  // 뒤 언덕: 나무 줄 (어둡게)
  const trees = Math.max(8, Math.round(w / 100));
  for (let i = 0; i < trees; i++) add(put(`t16_${season}_11`, (i + 0.3) / trees, 0.21 + (i % 2) * 0.01, S(84 + (i % 3) * 12), 'tt-back'));
  add(put('v2_bld_carousel_2', 0.16, 0.17, S(176), 'tt-mid'), put('v2_bld_tower_2', 0.85, 0.17, S(180), 'tt-mid'));
  // 울타리
  const fw = S(52);
  for (let x = 0, i = 0; x < w + fw; x += fw, i++) add(put(i % 6 === 0 ? 'f16_1_p' : 'f16_1_h', x / w, 0.165, fw, 'tt-mid'));
  // 가운데 문 + 계절 장식 + 간판 글씨
  const gs = S(250);
  add(put('v2_gate_0', 0.5, 0.1, gs), put(`v2_gatedeco_${season}_arch`, 0.5, 0.1 + (gs * 0.86) / hgt, gs));
  add(h('div', { class: 'tt-gatesign', style: `bottom:calc(10% + ${Math.round(gs * 0.79)}px); font-size:${S(24)}px` }, '뽑ZOO'));
  // 문 옆: 가게 · 분수 · 등불
  add(put('v2_bld_icecream_2', 0.3, 0.1, S(164)), put('v2_bld_fountain_2', 0.7, 0.1, S(166)));
  for (const x of [0.39, 0.61]) { add(h('div', { class: 'tt-glow', style: `left:${x * 100}%; bottom:calc(10% + ${S(40)}px); width:${S(90)}px; height:${S(90)}px` })); add(put(`decor_${season}_6`, x, 0.1, S(90))); }
  // 앞쪽 산책길 + 꽃밭 · 덤불 · 소품
  add(h('div', { class: 'tt-path' }));
  for (const [x, k, sz] of [[0.04, `decor_${season}_2`, 70], [0.1, `t16_${season}_13`, 56], [0.24, `decor_${season}_1`, 84], [0.45, `t16_${season}_12`, 58], [0.55, `t16_${season}_16`, 52],
    [0.77, `decor_${season}_2`, 70], [0.9, `t16_${season}_13`, 56], [0.97, `t16_${season}_12`, 58]] as [number, string, number][]) add(put(k, x, 0.1, S(sz)));
  add(put(`decor_${season}_5`, 0.95, 0.2, S(76)), put(`decor_${season}_9`, 0.05, 0.2, S(76)));
  // 산책길 위 동물들: 천천히 오가며 가끔 폴짝
  const xs = [0.07, 0.15, 0.24, 0.33, 0.67, 0.76, 0.85, 0.93];
  animals.slice(0, xs.length).forEach((id, i) => {
    const key = `animal_${String(id).padStart(3, '0')}`;
    if (!hasPng(key)) return;
    const wrap = h('div', { class: 'tt-ani', style: `left:${xs[i] * 100}%; --d:${(i * 0.7) % 3}s; --walk:${6 + (i % 3) * 2}s` }, fit(key, S(64 + (i % 3) * 8)));
    if (xs[i] > 0.5) wrap.classList.add('flip');
    add(wrap);
  });
  return scene;
}

/** 계절 기계 4대 (가운데 줄). 지금 계절 기계가 조금 더 밝다 */
export function seasonMachines(cur: SeasonKey, size: number): HTMLElement {
  return h('div', { class: 'tt-machines' }, ...SEASON_KEYS.map((k, i) => {
    const key = `v2_gm_${k}_0`;
    return hasPng(key) ? h('div', { class: `tt-gm${k === cur ? ' cur' : ''}`, style: `--d:${i * 0.25}s` }, fit(key, size)) : h('span', {});
  }));
}

/** 캡슐 불꽃놀이: 캡슐이 꼬리를 달고 솟아올라 하늘에서 열리며 등급 색 불꽃. 끝낼 함수를 돌려준다 */
export function startFireworks(scene: HTMLElement, size: number): () => void {
  if (motion.reduce) return () => {};
  const grades: [string, string][] = [['rare', '#41a6f6'], ['legend', '#f7c948'], ['epic', '#c46bd9'], ['uncommon', '#a7d65b'], ['common', '#ff8fc4'], ['shiny', '#73eff7']];
  let alive = true, timer = 0;
  const one = () => {
    if (!alive) return;
    const [g, col] = grades[Math.floor(Math.random() * grades.length)];
    const closed = `v2_gc_${g}_0`, open = `v2_gc_${g}_3`;
    if (hasPng(closed) && hasPng(open)) {
      // 화면 양옆 하늘 (가운데 로고는 비워 둔다)
      const left = Math.random() < 0.5, x = left ? 0.06 + Math.random() * 0.24 : 0.7 + Math.random() * 0.24, y = 0.1 + Math.random() * 0.32;
      const fw = h('div', { class: 'tt-fw', style: `left:${x * 100}%; top:${y * 100}%; --c:${col}; width:${size * 3.6}px; height:${size * 3.6}px` });
      const cap = fit(closed, size, 'pix tt-cap');
      const trail = h('div', { class: 'tt-trail' });
      fw.append(trail, cap);
      scene.append(fw);
      const rise = Math.round(scene.clientHeight * (0.62 - y));
      const up = fw.animate([{ transform: `translateY(${rise}px)` }, { transform: 'translateY(0)' }], { duration: 900, easing: 'cubic-bezier(.2,.7,.4,1)' });
      up.onfinish = () => {
        trail.remove(); cap.replaceWith(fit(open, size, 'pix tt-cap'));
        const ring = h('div', { class: 'tt-ring' }); fw.append(ring);
        ring.animate([{ transform: 'scale(0.2)', opacity: 1 }, { transform: 'scale(1)', opacity: 1, offset: 0.5 }, { transform: 'scale(1.15)', opacity: 0 }], { duration: 1300, easing: 'ease-out' });
        fw.animate([{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: 1400 }).onfinish = () => fw.remove();
      };
    }
    timer = window.setTimeout(one, 900 + Math.random() * 1300);
  };
  timer = window.setTimeout(one, 400);
  return () => { alive = false; clearTimeout(timer); };
}
