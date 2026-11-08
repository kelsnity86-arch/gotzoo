"""GPT가 그린 16px 시트(도트 1칸이 큰 사각형으로 확대된 그림)를 원래 해상도 스프라이트로 되돌린다.

1) 배경(마젠타 계열)과 그림을 나누고, 붙어 있는 덩어리를 찾아 위→아래, 왼→오 순서로 정렬한다.
2) 시트 전체에서 색이 바뀌는 경계의 간격(자기상관 주기)으로 도트 1칸 크기를 구한다.
3) 덩어리마다 격자 위치(위상)를 맞추고, 칸 가운데 색의 중앙값을 뽑는다.
4) 38색 팔레트로 정리하고, 배경은 투명으로. 정해진 캔버스(예: 16×16)에 맞춘다.

python3 tools/slice16.py  → assets/sprites16/** 에 PNG, reports/SLICE16.json 에 결과
"""
from pathlib import Path
import json, sys
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'assets' / 'spritesheets16'
OUT = ROOT / 'assets' / 'sprites16'
PALETTE = ['#1a1c2c', '#333c57', '#566c86', '#94b0c2', '#f4f4f4', '#2b1d14', '#5d3a24', '#8a5a3b', '#c28a5c', '#e8c39e', '#f6e6c8', '#8b1e2d', '#d83a3a', '#ef7d32', '#f7c948', '#fff3a3', '#e0a526', '#1f5d3a', '#38a35b', '#a7d65b', '#2a9d8f', '#29366f', '#3b5dc9', '#41a6f6', '#73eff7', '#5d275d', '#8e44ad', '#f08cbe', '#ffc8dd', '#c7cfdd', '#ffb7d0', '#b8452e', '#d9822b', '#6b8f2e', '#e9f3ff', '#7fb5d6', '#3e2f5b', '#f2e3a0']
PAL = np.array([tuple(bytes.fromhex(c[1:])) for c in PALETTE], dtype=np.float32)


def bg_mask(a: np.ndarray) -> np.ndarray:
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    return (r > 140) & (b > 140) & (g < 120) & (np.abs(r - b) < 100)


def components(fg: np.ndarray, cell: int, dil: int):
    """덩어리 찾기: cell 크기로 줄여서 dil칸 넓힌 뒤 연결된 묶음"""
    H, W = fg.shape
    h, w = (H + cell - 1) // cell, (W + cell - 1) // cell
    small = np.zeros((h, w), bool)
    pad = np.zeros((h * cell, w * cell), bool); pad[:H, :W] = fg
    small = pad.reshape(h, cell, w, cell).sum(axis=(1, 3)) > cell  # 점 몇 개 노이즈는 무시
    grown = small.copy()
    for _ in range(dil):
        g2 = grown.copy()
        g2[1:] |= grown[:-1]; g2[:-1] |= grown[1:]; g2[:, 1:] |= grown[:, :-1]; g2[:, :-1] |= grown[:, 1:]
        grown = g2
    lab = -np.ones((h, w), int); n = 0; boxes = []
    for y in range(h):
        for x in range(w):
            if not grown[y, x] or lab[y, x] >= 0: continue
            stack = [(y, x)]; lab[y, x] = n; x0 = x1 = x; y0 = y1 = y
            while stack:
                cy, cx = stack.pop()
                x0, x1, y0, y1 = min(x0, cx), max(x1, cx), min(y0, cy), max(y1, cy)
                for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                    if 0 <= ny < h and 0 <= nx < w and grown[ny, nx] and lab[ny, nx] < 0:
                        lab[ny, nx] = n; stack.append((ny, nx))
            # 넓힌 만큼 되돌린 실제 그림 범위
            sub = fg[y0 * cell:(y1 + 1) * cell, x0 * cell:(x1 + 1) * cell]
            ys, xs = np.nonzero(sub)
            if len(ys) > 30:
                boxes.append((x0 * cell + xs.min(), y0 * cell + ys.min(), x0 * cell + xs.max() + 1, y0 * cell + ys.max() + 1))
            n += 1
    return boxes


def order_rows(boxes, tol):
    """위→아래 줄로 묶고 줄 안에서 왼→오"""
    boxes = sorted(boxes, key=lambda b: (b[1] + b[3]) / 2)
    rows = []
    for b in boxes:
        cy = (b[1] + b[3]) / 2
        if rows and abs(cy - rows[-1][0]) < tol: rows[-1][1].append(b); rows[-1][0] = (rows[-1][0] * (len(rows[-1][1]) - 1) + cy) / len(rows[-1][1])
        else: rows.append([cy, [b]])
    return [sorted(r[1], key=lambda b: b[0]) for r in rows]


def pixel_size(a: np.ndarray, fg: np.ndarray, lo=5.0, hi=40.0) -> float:
    """색 경계 간격의 주기 = 도트 1칸 크기 (가로·세로 평균)"""
    f = a.astype(np.float32)
    res = []
    for axis in (1, 0):
        d = np.abs(np.diff(f, axis=axis)).sum(axis=2) > 60
        m = fg[:, 1:] & fg[:, :-1] if axis == 1 else fg[1:, :] & fg[:-1, :]
        prof = (d & m).sum(axis=0 if axis == 1 else 1).astype(np.float32)
        prof -= prof.mean()
        ac = np.correlate(prof, prof, mode='full')[len(prof) - 1:]
        best, bv = lo, -1e18
        for s in np.arange(lo, hi, 0.05):
            # 주기 s의 배수 위치 자기상관 합 (보간)
            v = 0.0
            for k in (1, 2, 3, 4):
                p = s * k; i = int(p); t = p - i
                if i + 1 < len(ac): v += ac[i] * (1 - t) + ac[i + 1] * t
            if v > bv: bv, best = v, s
        res.append(best)
    return float(np.mean(res))


def extract(a: np.ndarray, fg: np.ndarray, box, s: float):
    """덩어리 하나를 도트 격자로: 위상을 맞추고 칸 가운데 중앙값"""
    x0, y0, x1, y1 = box
    best = None
    for ox in np.linspace(0, s, 8, endpoint=False):
        for oy in np.linspace(0, s, 8, endpoint=False):
            gx0, gy0 = x0 - s + ox, y0 - s + oy
            nw, nh = int(np.ceil((x1 - gx0) / s)), int(np.ceil((y1 - gy0) / s))
            err = 0.0
            for j in range(nh):
                for i in range(nw):
                    cx0, cy0 = int(gx0 + i * s + s * 0.2), int(gy0 + j * s + s * 0.2)
                    cx1, cy1 = int(gx0 + (i + 1) * s - s * 0.2), int(gy0 + (j + 1) * s - s * 0.2)
                    if cx1 <= cx0 or cy1 <= cy0 or cx0 < 0 or cy0 < 0: continue
                    blk = a[cy0:cy1, cx0:cx1].reshape(-1, 3).astype(np.float32)
                    if len(blk): err += blk.std(axis=0).sum()
            if best is None or err < best[0]: best = (err, gx0, gy0, nw, nh)
    _, gx0, gy0, nw, nh = best
    out = np.zeros((nh, nw, 4), np.uint8)
    for j in range(nh):
        for i in range(nw):
            cx0, cy0 = int(gx0 + i * s + s * 0.3), int(gy0 + j * s + s * 0.3)
            cx1, cy1 = max(cx0 + 1, int(gx0 + (i + 1) * s - s * 0.3)), max(cy0 + 1, int(gy0 + (j + 1) * s - s * 0.3))
            cx0, cy0 = max(0, cx0), max(0, cy0)
            blk = a[cy0:cy1, cx0:cx1].reshape(-1, 3); fm = fg[cy0:cy1, cx0:cx1].reshape(-1)
            if blk.size == 0 or fm.mean() < 0.5: continue
            c = np.median(blk[fm], axis=0).astype(np.float32)
            k = int(((PAL - c) ** 2).sum(axis=1).argmin())
            out[j, i, :3] = PAL[k]; out[j, i, 3] = 255
    out = keep_main(out)
    # 빈 가장자리 줄 잘라내기
    al = out[..., 3] > 0
    if not al.any(): return out
    ys, xs = np.nonzero(al)
    return out[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def keep_main(out: np.ndarray) -> np.ndarray:
    """옆 칸에서 묻어 온 티끌 지우기: 가장 큰 덩어리와, 그 가까이(6px)에 있거나 충분히 큰 조각만 남긴다"""
    al = out[..., 3] > 0
    H, W = al.shape
    lab = -np.ones((H, W), int); comps = []
    for y in range(H):
        for x in range(W):
            if not al[y, x] or lab[y, x] >= 0: continue
            st = [(y, x)]; lab[y, x] = len(comps); pts = []
            while st:
                cy, cx = st.pop(); pts.append((cy, cx))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < H and 0 <= nx < W and al[ny, nx] and lab[ny, nx] < 0: lab[ny, nx] = len(comps); st.append((ny, nx))
            comps.append(pts)
    if len(comps) <= 1: return out
    main = max(comps, key=len)
    ys = [p[0] for p in main]; xs = [p[1] for p in main]
    y0, y1, x0, x1 = min(ys) - 6, max(ys) + 6, min(xs) - 6, max(xs) + 6
    res = out.copy()
    for c in comps:
        if c is main: continue
        near = any(y0 <= py <= y1 and x0 <= px <= x1 for py, px in c)
        thin = max(p[0] for p in c) - min(p[0] for p in c) <= 1 or max(p[1] for p in c) - min(p[1] for p in c) <= 1
        if (near and len(c) >= 3 and not (thin and len(c) < 8)) or len(c) >= 0.15 * len(main): continue
        for py, px in c: res[py, px] = 0
    return res


def fit(spr: np.ndarray, W: int, H: int, anchor='bottom') -> Image.Image:
    """캔버스 W×H에 맞춘다 (가로 가운데, 세로는 바닥 또는 가운데). 넘치면 가장자리를 자른다"""
    h, w = spr.shape[:2]
    canvas = np.zeros((H, W, 4), np.uint8)
    sx = max(0, (w - W) // 2); sy = max(0, h - H) if anchor == 'bottom' else max(0, (h - H) // 2)
    spr = spr[sy:sy + H, sx:sx + W]; h, w = spr.shape[:2]
    ox = (W - w) // 2; oy = H - h if anchor == 'bottom' else (H - h) // 2
    canvas[oy:oy + h, ox:ox + w] = spr
    return Image.fromarray(canvas, 'RGBA')


def slice_sheet(path: Path, expect: int, size_px=None, tol=None):
    a = np.array(Image.open(path).convert('RGB'))
    fg = ~bg_mask(a)
    s = pixel_size(a, fg)
    cell = max(2, int(s / 2))
    boxes = components(fg, cell, 2)
    rows = order_rows(boxes, tol or s * 6)
    flat = [b for r in rows for b in r]
    return a, fg, s, rows, flat




# ── 격자 시트 일괄 처리 ──
def grid_cells(a, fg, cols, rows, s, mode='sprite', pairs=False):
    """시트를 cols×rows 칸으로 나눠 칸마다 스프라이트. mode='tile'이면 칸 안 그림을 16×16 바닥 타일로"""
    H, W = fg.shape
    cw, ch = W / cols, H / rows
    out = []
    for r in range(rows):
        for c in range(cols):
            x0, y0, x1, y1 = int(c * cw), int(r * ch), int((c + 1) * cw), int((r + 1) * ch)
            sub = fg[y0:y1, x0:x1]
            # 작은 티끌은 빼고 그림 범위
            rs, cs = sub.sum(axis=1), sub.sum(axis=0)
            ys = np.nonzero(rs > max(2, s * 0.6))[0]; xs = np.nonzero(cs > max(2, s * 0.6))[0]
            if not len(ys) or not len(xs): out.append(None); continue
            box = (x0 + xs.min(), y0 + ys.min(), x0 + xs.max() + 1, y0 + ys.max() + 1)
            if mode == 'tile':
                # 바닥 타일: 옆 칸 티끌을 빼려고, 30% 넘게 채워진 줄만 범위로
                ys = np.nonzero(rs > 0.3 * rs.max())[0]; xs = np.nonzero(cs > 0.3 * cs.max())[0]
                box = (x0 + xs.min(), y0 + ys.min(), x0 + xs.max() + 1, y0 + ys.max() + 1)
                bw, bh = box[2] - box[0], box[3] - box[1]
                ts = max(bw, bh) / 16
                arr = np.zeros((16, 16, 4), np.uint8)
                for j in range(16):
                    for i in range(16):
                        cx0, cy0 = int(box[0] + (i + 0.3) * ts), int(box[1] + (j + 0.3) * ts)
                        cx1, cy1 = max(cx0 + 1, int(box[0] + (i + 0.7) * ts)), max(cy0 + 1, int(box[1] + (j + 0.7) * ts))
                        blk = a[cy0:cy1, cx0:cx1].reshape(-1, 3); fm = fg[cy0:cy1, cx0:cx1].reshape(-1)
                        if not blk.size or fm.mean() < 0.5: continue
                        col = np.median(blk[fm], axis=0).astype(np.float32)
                        k = int(((PAL - col) ** 2).sum(axis=1).argmin())
                        arr[j, i, :3] = PAL[k]; arr[j, i, 3] = 255
                out.append(arr)
            else:
                out.append(extract(a, fg, box, s))
    return out


def save(arr, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(arr, 'RGBA').save(path)


# 시트 → (칸, 종류, 저장 이름 규칙)
SHEETS = []
for n in range(1, 13):
    sub = 'permanent' if n <= 10 else 'seasonal'
    SHEETS.append((f'animals/{sub}/animals16_{n:02d}.png', 5, 5, 'sprite', lambda i, n=n: f'a16/src_{(n - 1) * 25 + i:03d}.png'))
for se in ('spring', 'summer', 'autumn', 'winter'):
    SHEETS.append((f'world/people/people16_{se}.png', 8, 4, 'sprite', lambda i, se=se: f'people16/{se}_{i // 2:02d}_f{i % 2}.png'))
    SHEETS.append((f'world/tiles/tiles16_{se}.png', 4, 4, 'tilemix', lambda i, se=se: f'tiles16/{se}_{i + 1:02d}.png'))
SHEETS.append(('world/staff/staff16.png', 4, 5, 'sprite', lambda i: f'staff16/{i // 2:02d}_f{i % 2}.png'))
SHEETS.append(('world/fences/fences16.png', 12, 4, 'sprite', lambda i: f'fences16/raw_t{i // 12}_{i % 12 + 1:02d}.png'))
SHEETS.append(('ui-effects/icons/icons16.png', 8, 5, 'sprite', lambda i: f'icons16/{i + 1:02d}.png'))
SHEETS.append(('ui-effects/effects/fx16.png', 6, 5, 'sprite', lambda i: f'fx16/{i + 1:02d}.png'))


def run():
    report = {}
    for rel, cols, rows, mode, name in SHEETS:
        p = SRC / rel
        a = np.array(Image.open(p).convert('RGB'))
        fg = ~bg_mask(a)
        s = pixel_size(a, fg)
        if mode == 'tilemix':
            # 1~10번은 이어 붙는 바닥 (16×16로), 11~16번은 물체 (도트 그대로)
            tiles = grid_cells(a, fg, cols, rows, s, 'tile')
            objs = grid_cells(a, fg, cols, rows, s, 'sprite')
            cells = [t if i < 10 else objs[i] for i, t in enumerate(tiles)]
            # 바닥 타일: GPT가 그린 가장자리 테두리를 안쪽 색으로 덮어 이음매를 없앤다
            for t in cells[:10]:
                if t is not None and t.shape[:2] == (16, 16):
                    t[0] = t[1]; t[15] = t[14]; t[:, 0] = t[:, 1]; t[:, 15] = t[:, 14]; t[..., 3] = 255
        else:
            cells = grid_cells(a, fg, cols, rows, s, mode)
        sizes = []
        for i, arr in enumerate(cells):
            if arr is None or arr.size == 0: continue
            save(arr, OUT / name(i)); sizes.append(arr.shape[:2])
        report[rel] = {'pixel': round(s, 2), 'count': len(sizes), 'expected': cols * rows, 'h_range': [int(min(x[0] for x in sizes)), int(max(x[0] for x in sizes))], 'w_range': [int(min(x[1] for x in sizes)), int(max(x[1] for x in sizes))]}
        print(rel, report[rel], flush=True)
    fence_tiles()
    (ROOT / 'reports' / 'SLICE16.json').write_text(json.dumps(report, ensure_ascii=False, indent=1))


def fence_tiles():
    """울타리: 가로 · 세로 · 문 · 기둥을 정사각 타일(T×T, T = 가로 조각 폭)로. 세로가 짧으면 위아래로 이어 붙인다"""
    d = OUT / 'fences16'
    for t in range(4):
        ld = lambda n: np.array(Image.open(d / f'raw_t{t}_{n:02d}.png').convert('RGBA'))
        hz, vt, gt, po = ld(1), ld(2), ld(11), ld(12)
        T = max(hz.shape[1], 12)
        def put(src, mode):
            c = np.zeros((T, T, 4), np.uint8)
            h, w = src.shape[:2]
            if mode == 'v':
                x = (T - w) // 2
                for y in range(0, T, max(1, h)):
                    hh = min(h, T - y); c[y:y + hh, max(0, x):max(0, x) + min(w, T)] = src[:hh, :min(w, T)]
            else:
                src = src[:T, :T]; h, w = src.shape[:2]
                y = (T - h) // 2 if mode == 'h' else T - h
                x = (T - w) // 2
                c[y:y + h, x:x + w] = src
            return c
        for name, src, mode in (('h', hz, 'h'), ('v', vt, 'v'), ('g', gt, 'h'), ('p', po, 'p')):
            Image.fromarray(put(src, mode), 'RGBA').save(d / f't{t}_{name}.png')


if __name__ == '__main__':
    run()


def slice_facilities_decor():
    """시설(위 6개 · 아래 입구 4개)과 계절 소품(6×4 × 2장)"""
    p = SRC / 'world/facilities/facilities16.png'
    a = np.array(Image.open(p).convert('RGB')); fg = ~bg_mask(a); s = pixel_size(a, fg)
    H = a.shape[0] // 2
    top = grid_cells(a[:H], fg[:H], 6, 1, s); bot = grid_cells(a[H:], fg[H:], 4, 1, s)
    names = ['snack', 'restroom', 'bench', 'fountain', 'photo', 'clinic']
    for n, arr in zip(names, top): save(keep_main(arr) if arr is not None else arr, OUT / f'fac16/{n}.png')
    for i, arr in enumerate(bot): save(arr, OUT / f'fac16/gate{i}.png')
    for sheet, seasons in (('decor16_1', ('spring', 'summer')), ('decor16_2', ('autumn', 'winter'))):
        p = SRC / f'world/decor/{sheet}.png'
        a = np.array(Image.open(p).convert('RGB')); fg = ~bg_mask(a); s = pixel_size(a, fg)
        cells = grid_cells(a, fg, 6, 4, s)
        for i, arr in enumerate(cells):
            if arr is not None: save(arr, OUT / f'decor16/{seasons[i // 12]}_{i % 12 + 1:02d}.png')
