// 연출 설정: 기본은 모든 연출을 보여 준다 (운영체제의 "움직임 줄이기"와 상관없이).
// 설정 > 연출 줄이기를 켠 사람만 흔들림 · 날아감 · 회전을 끈다 (단계 그림과 빛은 남는다).
const KEY = 'bbopzoo.reduceMotion';
function load(): boolean { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } }
export const motion = {
  reduce: load(),
  set(v: boolean) {
    this.reduce = v;
    try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* 저장 못 해도 이번 판엔 적용 */ }
    if (typeof document !== 'undefined') document.body.classList.toggle('reduce-motion', v);
  },
};
if (typeof document !== 'undefined' && document.body) document.body.classList.toggle('reduce-motion', motion.reduce);
