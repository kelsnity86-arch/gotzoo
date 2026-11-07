// 저장 코드: 다른 브라우저·기기로 진행을 옮긴다. "ZOO-" + base64(JSON) + "-" + 4자리 검사값
import { normalize, type SaveData } from './state';

function checksum(s: string) { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 10000; return String(h).padStart(4, '0'); }
const toB64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const fromB64 = (b: string) => new TextDecoder().decode(Uint8Array.from(atob(b), (c) => c.charCodeAt(0)));

export function exportCode(s: SaveData): string {
  const body = toB64(JSON.stringify(s));
  return `ZOO-${body}-${checksum(body)}`;
}

export function importCode(code: string): { ok: true; save: SaveData } | { ok: false; error: string } {
  const m = /^ZOO-([A-Za-z0-9+/=]+)-(\d{4})$/.exec(code.trim().replace(/\s+/g, ''));
  if (!m) return { ok: false, error: 'ZOO- 로 시작하는 저장 코드를 붙여 넣어 주세요' };
  if (checksum(m[1]) !== m[2]) return { ok: false, error: '코드 일부가 빠졌거나 바뀌었어요. 다시 복사해 주세요' };
  try { return { ok: true, save: normalize(JSON.parse(fromB64(m[1]))) }; } catch { return { ok: false, error: '코드를 읽을 수 없어요' }; }
}
