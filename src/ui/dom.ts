// DOM 도우미, 토스트, 도트 스프라이트를 정수 배율로 담는 캔버스
import { sprite, type Sprite } from '../render/sprites';

type Child = Node | string | number | null | undefined | false;
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, unknown> = {}, ...kids: Child[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'class') e.className = String(v);
    else if (k === 'style') e.style.cssText = String(v);
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  for (const k of kids) if (k !== null && k !== undefined && k !== false) e.append(typeof k === 'number' ? String(k) : k);
  return e;
}

/** 스프라이트를 px 크기 칸에 정수 배율로 (도트가 고르게) */
export function pix(img: Sprite | string, px: number, cls = 'pix'): HTMLCanvasElement {
  const s = typeof img === 'string' ? sprite(img) : img;
  const dpr = window.devicePixelRatio || 1;
  const k = Math.max(1, Math.floor((px * dpr) / Math.max(s.width, s.height)));
  const cv = document.createElement('canvas');
  cv.width = s.width * k; cv.height = s.height * k;
  const c = cv.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  c.drawImage(s, 0, 0, cv.width, cv.height);
  cv.className = cls;
  cv.style.width = `${cv.width / dpr}px`; cv.style.height = `${cv.height / dpr}px`;
  return cv;
}

let box: HTMLElement | null = null;
export function toast(text: string, kind: 'info' | 'good' | 'bad' | 'gold' = 'info', ms = 1800) {
  if (!box) { box = h('div', { class: 'toasts' }); document.body.append(box); }
  const t = h('div', { class: `toast ${kind}` }, text);
  box.append(t);
  while (box.children.length > 3) box.firstElementChild?.remove();
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => t.remove(), ms + 400);
}

/** 숫자 짧게: 12,345 → 1.2만 */
export function fmt(n: number): string {
  n = Math.floor(n);
  if (n < 10000) return n.toLocaleString('ko-KR');
  const units: [string, number][] = [['조', 1e12], ['억', 1e8], ['만', 1e4]];
  for (const [u, v] of units) if (n >= v) { const x = n / v; return `${x >= 100 ? Math.floor(x) : Math.floor(x * 10) / 10}${u}`; }
  return String(n);
}

/** 그림 자리: 그림을 다 불러온 뒤 fillIcons()로 채운다 (시작할 때 만든 HUD·탭용) */
export function iconSlot(key: string, px: number): HTMLElement {
  return h('span', { class: 'icon-slot', 'data-icon': key, 'data-px': px });
}
export function fillIcons(root: ParentNode = document) {
  for (const el of root.querySelectorAll<HTMLElement>('.icon-slot[data-icon]')) {
    el.replaceChildren(pix(el.dataset.icon!, Number(el.dataset.px)));
  }
}
