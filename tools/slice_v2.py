"""월드 그림 v2 (world-life 11장) 자르기 → assets/sprites16/v2/
바닥은 16×16 타일, 길 · 울타리는 48×48 모양 한 덩어리(나중에 8×8 조각으로 이어 붙임), 나머지는 칸마다 도트 그림.
마젠타 바탕 위에 그린 그림자(어두운 자홍)는 반투명 그림자로 바꾼다."""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
sys.path.insert(0, str(Path(__file__).parent))
import slice16 as S

SRC = S.ROOT / 'assets' / 'spritesheets16' / 'world-life'
OUT = S.OUT / 'v2'
# 배경: 거의 순수한 마젠타만. 예전 판정(slice16.bg_mask)은 분홍 · 보라 그림(풍선, 꽃, 구름)까지 배경으로 지워 구멍이 났다
def bg_strict(a: np.ndarray) -> np.ndarray:
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    return (g < 70) & (r > 170) & (b > 170) & (np.abs(r - b) < 45)
S.bg_mask = bg_strict
SH = np.array([1, 254, 1])  # 그림자 표시용 임시 색 (그림에 없는 색)
S.PAL = np.vstack([S.PAL, SH.astype(np.float32)[None]])


def load(rel, s=5.5):
    a = np.array(Image.open(SRC / rel).convert('RGB')).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    shadow = (g < 80) & (r > 80) & (b > 40) & (b - g > 18) & (r - b > 12) & ~S.bg_mask(a.astype(np.uint8))
    a[shadow] = SH
    a = a.astype(np.uint8)
    fg = ~S.bg_mask(a)
    return a, fg, s


def fix_shadow(arr):
    if arr is None: return arr
    m = (arr[..., 0] == 1) & (arr[..., 1] == 254) & (arr[..., 2] == 1)
    arr[m] = (24, 16, 32, 70)
    return arr


TILE = 24  # 월드 1칸 = 3도트 (R = 3): 바닥 타일 8칸 = 24도트


def patch(a, fg, x0, y0, x1, y1, N, th_=0.15, quant=True):
    """칸 안 그림 범위를 N×N 도트로 다시 뜬다 (길 · 울타리 모양)"""
    sub = fg[y0:y1, x0:x1]
    rs, cs = sub.sum(axis=1), sub.sum(axis=0)
    ys = np.nonzero(rs > th_ * rs.max())[0]; xs = np.nonzero(cs > th_ * cs.max())[0]
    bx0, by0, bx1, by1 = x0 + xs.min(), y0 + ys.min(), x0 + xs.max() + 1, y0 + ys.max() + 1
    tw, th = (bx1 - bx0) / N, (by1 - by0) / N
    out = np.zeros((N, N, 4), np.uint8)
    for j in range(N):
        for i in range(N):
            cx0, cy0 = int(bx0 + (i + 0.3) * tw), int(by0 + (j + 0.3) * th)
            cx1, cy1 = max(cx0 + 1, int(bx0 + (i + 0.7) * tw)), max(cy0 + 1, int(by0 + (j + 0.7) * th))
            blk = a[cy0:cy1, cx0:cx1].reshape(-1, 3); fm = fg[cy0:cy1, cx0:cx1].reshape(-1)
            if not blk.size or fm.mean() < 0.5: continue
            col = np.median(blk[fm], axis=0).astype(np.float32)
            if quant or (abs(col - SH) < 8).all():
                k = int(((S.PAL - col) ** 2).sum(axis=1).argmin()); col = S.PAL[k]
            out[j, i, :3] = col; out[j, i, 3] = 255
    return fix_shadow(out)


def cells(rel, cols, rows, mode='sprite', s=5.5, crop=False):
    """mode='tile': 칸마다 TILE×TILE 바닥 타일. 'sprite': 덩어리를 찾아 가운데가 든 칸에 모은 뒤 도트 크기 s로 뜬다"""
    a, fg, _ = load(rel)
    H, W = fg.shape
    if mode == 'tile':
        # 타일 = 네모 덩어리 하나. 가운데가 든 칸에 넣는다 (시트 칸이 고르지 않아도)
        res = [None] * (cols * rows)
        for b in S.components(fg, 4, 0):
            if (b[2] - b[0]) * (b[3] - b[1]) < (W / cols * 0.3) ** 2: continue
            cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
            k = min(rows - 1, int(cy / (H / rows))) * cols + min(cols - 1, int(cx / (W / cols)))
            t = patch(a, fg, b[0], b[1], b[2], b[3], TILE, 0.3, quant=False)
            t[0] = t[1]; t[-1] = t[-2]; t[:, 0] = t[:, 1]; t[:, -1] = t[:, -2]; t[..., 3] = 255
            res[k] = t
    elif crop:
        # 그림끼리 붙어 있는 시트: 칸을 잘라 낸 뒤 칸 안에서만 뜬다
        res = []
        for r in range(rows):
            for c in range(cols):
                x0, y0, x1, y1 = int(c * W / cols), int(r * H / rows), int((c + 1) * W / cols), int((r + 1) * H / rows)
                sa, sf = a[y0:y1, x0:x1], fg[y0:y1, x0:x1]
                bs = [b for b in S.components(sf, 4, 1) if (b[2] - b[0]) * (b[3] - b[1]) >= (s * 2) ** 2]
                if not bs: res.append(None); continue
                # 칸 가장자리에 닿은 조각은 옆 칸 그림이 넘어온 것: 가장 큰 그림과 겹치지 않으면 버린다
                ch_, cw_ = sf.shape
                main = max(bs, key=lambda b: (b[2] - b[0]) * (b[3] - b[1]))
                m_ = s * 2
                edge = lambda b: b[0] <= m_ or b[1] <= m_ or b[2] >= cw_ - m_ or b[3] >= ch_ - m_
                near = lambda b: not (b[2] < main[0] - s * 3 or b[0] > main[2] + s * 3 or b[3] < main[1] - s * 3 or b[1] > main[3] + s * 3)
                bs = [b for b in bs if b is main or not edge(b) or (near(b) and (b[2] - b[0]) * (b[3] - b[1]) > 0.08 * (main[2] - main[0]) * (main[3] - main[1]))]
                # 남은 그림 밖(가장자리 쪽) 픽셀은 지운다 (덩어리 상자 밖 조각이 섞이지 않게)
                keep = np.zeros_like(sf)
                for b in bs: keep[b[1]:b[3], b[0]:b[2]] = True
                sf = sf & keep
                bb = (min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs))
                res.append(extract_raw(sa, sf, bb, s))
    else:
        boxes = S.components(fg, 4, 1)
        groups = {}
        for b in boxes:
            cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
            k = (min(rows - 1, int(cy / (H / rows))), min(cols - 1, int(cx / (W / cols))))
            if (b[2] - b[0]) * (b[3] - b[1]) < (s * 3) ** 2: continue
            g = groups.get(k); groups[k] = b if g is None else (min(g[0], b[0]), min(g[1], b[1]), max(g[2], b[2]), max(g[3], b[3]))
        res = [extract_raw(a, fg, groups[(r, c)], s) if (r, c) in groups else None for r in range(rows) for c in range(cols)]
    print(rel, 'pixel', round(s, 2), [None if c is None else c.shape[:2] for c in res][:6], flush=True)
    return [fix_shadow(c) for c in res], a, fg


def shapes(rel, names):
    """2×2 칸 시트: 칸마다 (3타일)×(3타일) 모양"""
    a, fg, s = load(rel)
    H, W = fg.shape
    for k, n in enumerate(names):
        c, r = k % 2, k // 2
        S.save(patch(a, fg, int(c * W / 2), int(r * H / 2), int((c + 1) * W / 2), int((r + 1) * H / 2), TILE * 3, quant=False), OUT / f'{n}.png')


SEASONS = ['spring', 'summer', 'autumn', 'winter']
HABS = ['grass', 'sand', 'water', 'snow', 'rock', 'cloud']


def run():
    g, _, _ = cells('ground/ground16.png', 4, 4, 'tile')
    for i, t in enumerate(g): S.save(t, OUT / f'ground_{SEASONS[i // 4]}_{i % 4 + 1}.png')
    f, _, _ = cells('floors/penfloor16.png', 4, 6, 'tile')
    for i, t in enumerate(f): S.save(t, OUT / f'floor_{HABS[i // 4]}_{i % 4 + 1}.png')
    shapes('paths/path16.png', ['path_sq', 'path_ring', 'path_sq_w', 'path_ring_w'])
    shapes('fences/fences16_a.png', ['fence0_sq', 'fence0_x', 'fence1_sq', 'fence1_x'])
    shapes('fences/fences16_b.png', ['fence2_sq', 'fence2_x', 'fence3_sq', 'fence3_x'])
    pp, _, _ = cells('enclosure-props/penprops16.png', 6, 6)
    kinds = ['den', 'water', 'food', 'toy', 'plant', 'rock']
    for i, t in enumerate(pp):
        if t is not None: S.save(S.keep_main(t) if kinds[i % 6] != 'food' else t, OUT / f'prop_{HABS[i // 6]}_{kinds[i % 6]}.png')
    names = ['tree', 'pine', 'blossom', 'fruit', 'bush', 'flowerbush', 'lamp', 'bench', 'bin', 'sign', 'planter', 'flowerbed', 'hedge', 'boulder', 'drink', 'picnic', 'balloon', 'pond']
    pk, _, _ = cells('park-props/parkprops16.png', 6, 3)
    for n, t in zip(names, pk):
        if t is not None: S.save(t, OUT / f'park_{n}.png')
    bl, _, _ = cells('buildings/buildings16.png', 6, 3, crop=True)
    bn = ['snack', 'restroom', 'photo', 'fountain', 'bench', 'clinic']
    for i, t in enumerate(bl):
        if t is not None: S.save(t, OUT / f'bld_{bn[i % 6]}_{i // 6}.png')
    va, _, _ = cells('visitor-actions/visitors_act16.png', 8, 4)
    acts = ['watch', 'cheer', 'photo', 'snack', 'point', 'sit', 'toss', 'sad']
    for i, t in enumerate(va):
        if t is not None: S.save(t, OUT / f'va_{i // 8}_{acts[i % 8]}.png')
    st, _, _ = cells('staff-actions/staff_act16.png', 4, 5)
    for i, t in enumerate(st):
        if t is not None: S.save(t, OUT / f'sa_{i // 2:02d}_f{i % 2}.png')
    fx, _, _ = cells('effects/fx_life16.png', 6, 4, s=8.5)
    fxn = ['zzz', 'note', 'heart', 'bigheart', 'sweat', 'anger', 'excl', 'quest', 'sparkle', 'star', 'dust1', 'dust2', 'dust3', 'splash1', 'splash2', 'splash3', 'ripple1', 'ripple2', 'crumbs', 'drops', 'flash', 'stink', 'petals', 'nightzzz']
    for n, t in zip(fxn, fx):
        if t is not None: S.save(t, OUT / f'fx_{n}.png')


def tiles():
    g, _, _ = cells('ground/ground16.png', 4, 4, 'tile')
    for i, t in enumerate(g): S.save(t, OUT / f'ground_{SEASONS[i // 4]}_{i % 4 + 1}.png')
    f, _, _ = cells('floors/penfloor16.png', 4, 6, 'tile')
    for i, t in enumerate(f): S.save(t, OUT / f'floor_{HABS[i // 4]}_{i % 4 + 1}.png')


def gate():
    """입구 게이트 4단계 · 단계별 부품 5종 · 계절 장식(아치 장식 4, 기둥 장식 쌍 4)"""
    global SRC
    old = SRC; SRC = S.ROOT / 'assets' / 'spritesheets16' / 'entrance'
    g, _, _ = cells('gates/gate16.png', 2, 2, crop=True)
    for i, t in enumerate(g):
        if t is not None: S.save(t, OUT / f'gate_{i}.png')
    pt, _, _ = cells('parts/gate_parts16.png', 5, 4)
    names = ['wall', 'post', 'booth', 'turnstile', 'flag']
    for i, t in enumerate(pt):
        if t is not None: S.save(t, OUT / f'gatepart_{i // 5}_{names[i % 5]}.png')
    a, fg, _ = load('seasonal/gate_season16.png')
    H, W = fg.shape
    seasons = ['spring', 'summer', 'autumn', 'winter']
    for k, se in enumerate(seasons):
        x0, x1 = int(k * W / 4), int((k + 1) * W / 4)
        bs = [b for b in S.components(fg[:H // 2, x0:x1], 4, 1) if (b[2] - b[0]) * (b[3] - b[1]) >= 300]
        if bs:
            bb = (min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs))
            S.save(extract_raw(a[:H // 2, x0:x1], fg[:H // 2, x0:x1], bb, 5.5), OUT / f'gatedeco_{se}_arch.png')
        for j in range(2):
            c0, c1 = int((k * 2 + j) * W / 8), int((k * 2 + j + 1) * W / 8)
            sa, sf = a[H // 2:, c0:c1], fg[H // 2:, c0:c1]
            bs = [b for b in S.components(sf, 4, 1) if (b[2] - b[0]) * (b[3] - b[1]) >= 300]
            if bs:
                bb = (min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs))
                S.save(extract_raw(sa, sf, bb, 5.5), OUT / f'gatedeco_{se}_base{j}.png')
    SRC = old


def extract_raw(a, fg, box, s):
    """도트 크기 s로 원래 색 그대로 뜬다 (팔레트에 맞추지 않음: 사람 피부 · 머리색이 바뀌지 않게). 그림자 칸은 그림자로"""
    x0, y0, x1, y1 = box
    best = None
    for ox in np.linspace(0, s, 6, endpoint=False):
        for oy in np.linspace(0, s, 6, endpoint=False):
            gx0, gy0 = x0 - s + ox, y0 - s + oy
            nw, nh = int(np.ceil((x1 - gx0) / s)), int(np.ceil((y1 - gy0) / s))
            err = 0.0
            for j in range(0, nh, 2):
                for i in range(0, nw, 2):
                    cx0, cy0, cx1, cy1 = int(gx0 + (i + 0.2) * s), int(gy0 + (j + 0.2) * s), int(gx0 + (i + 0.8) * s), int(gy0 + (j + 0.8) * s)
                    if cx0 < 0 or cy0 < 0 or cx1 <= cx0 or cy1 <= cy0: continue
                    blk = a[cy0:cy1, cx0:cx1].reshape(-1, 3).astype(np.float32)
                    if len(blk): err += blk.std(axis=0).sum()
            if best is None or err < best[0]: best = (err, gx0, gy0, nw, nh)
    _, gx0, gy0, nw, nh = best
    out = np.zeros((nh, nw, 4), np.uint8)
    for j in range(nh):
        for i in range(nw):
            cx0, cy0 = max(0, int(gx0 + (i + 0.25) * s)), max(0, int(gy0 + (j + 0.25) * s))
            cx1, cy1 = max(cx0 + 1, int(gx0 + (i + 0.75) * s)), max(cy0 + 1, int(gy0 + (j + 0.75) * s))
            blk = a[cy0:cy1, cx0:cx1].reshape(-1, 3); fm = fg[cy0:cy1, cx0:cx1].reshape(-1)
            if blk.size == 0 or fm.mean() < 0.5: continue
            px = blk[fm]
            sh = (px == SH).all(axis=1)
            if sh.mean() > 0.5: out[j, i] = (24, 16, 32, 70); continue
            px = px[~sh]
            out[j, i, :3] = np.median(px, axis=0); out[j, i, 3] = 255
    out = S.keep_main(out)
    al = out[..., 3] > 0
    if not al.any(): return out
    ys, xs = np.nonzero(al)
    return out[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def figures(rel, cols, rows, target_h):
    """사람 시트: 큰 덩어리를 줄 → 왼쪽부터 순서대로 칸에 넣고, 작은 조각(동전 · 효과선)은 가장 가까운 사람에 붙인다"""
    a, fg, _ = load(rel)
    H, W = fg.shape
    boxes = S.components(fg, 4, 1)
    tall = [b for b in boxes if (b[3] - b[1]) > H / rows * 0.35]
    small = [b for b in boxes if b not in tall and (b[2] - b[0]) * (b[3] - b[1]) > 60]
    s = float(np.median([b[3] - b[1] for b in tall])) / target_h
    big = [list(b) for b in tall]
    for b in small:
        cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
        k = min(range(len(big)), key=lambda i: abs((big[i][0] + big[i][2]) / 2 - cx) + abs((big[i][1] + big[i][3]) / 2 - cy) * 1.5)
        g = big[k]
        if abs((g[0] + g[2]) / 2 - cx) < W / cols * 0.6 and abs((g[1] + g[3]) / 2 - cy) < H / rows * 0.6:
            big[k] = [min(g[0], b[0]), min(g[1], b[1]), max(g[2], b[2]), max(g[3], b[3])]
    rws = S.order_rows([tuple(b) for b in big], H / rows * 0.45)
    # 붙어서 한 덩어리가 된 사람들: 너비가 보통의 1.5배 넘으면 그림이 가장 적은 세로줄에서 나눈다
    mw = float(np.median([b[2] - b[0] for row in rws for b in row]))
    def split(b):
        k = int(round((b[2] - b[0]) / mw))
        if k <= 1: return [b]
        colsum = fg[b[1]:b[3], b[0]:b[2]].sum(axis=0)
        cuts, w = [], b[2] - b[0]
        for j in range(1, k):
            c0 = int(w * j / k - w / k * 0.3); c1 = int(w * j / k + w / k * 0.3)
            cuts.append(c0 + int(np.argmin(colsum[c0:c1])))
        xs = [0] + cuts + [w]
        parts = []
        for x0, x1 in zip(xs, xs[1:]):
            sub = fg[b[1]:b[3], b[0] + x0:b[0] + x1]
            ys = np.nonzero(sub.sum(axis=1) > 0)[0]
            if len(ys): parts.append((b[0] + x0, b[1] + ys.min(), b[0] + x1, b[1] + ys.max() + 1))
        return parts
    rws = [[p for b in row for p in split(b)] if len(row) < cols else row for row in rws]
    # 칸보다 많으면 가장 좁은 조각을 옆 사람에 붙인다 (동전 · 효과선 조각)
    for r, row in enumerate(rws):
        row = sorted(row, key=lambda b: b[0])
        while len(row) > cols:
            k = min(range(len(row)), key=lambda i: row[i][2] - row[i][0])
            nb = k - 1 if k == len(row) - 1 or (k > 0 and row[k][0] - row[k - 1][2] < row[k + 1][0] - row[k][2]) else k + 1
            a_, b_ = row[k], row[nb]
            row[min(k, nb)] = (min(a_[0], b_[0]), min(a_[1], b_[1]), max(a_[2], b_[2]), max(a_[3], b_[3]))
            del row[max(k, nb)]
        rws[r] = row
    out = [None] * (cols * rows)
    for r, row in enumerate(rws[:rows]):
        if len(row) != cols: print('  !', rel, 'row', r, 'has', len(row), flush=True)
        for c, b in enumerate(row[:cols]): out[r * cols + c] = extract_raw(a, fg, b, s)
    print(rel, 'pixel', round(s, 2), flush=True)
    return out


from collections import Counter


def est_s(a, fg):
    lum = a.astype(int).sum(axis=2)
    dark = (lum < 200) & fg
    runs = Counter()
    for arr in (dark, dark.T):
        for row in arr[::3]:
            d = np.diff(np.concatenate([[0], row.astype(int), [0]]))
            st, en = np.nonzero(d == 1)[0], np.nonzero(d == -1)[0]
            L = en - st
            runs.update(L[(L >= 3) & (L <= 16)].tolist())
    best = max(runs.items(), key=lambda kv: kv[1] + 0.6 * runs.get(kv[0]-1, 0) + 0.6 * runs.get(kv[0]+1, 0))[0]
    # 1도트 외곽선 두께 = 도트 크기 (가장 흔한 어두운 연속 길이 근처 가중 평균)
    tot = sum(runs.get(k, 0) for k in (best-1, best, best+1))
    return sum(k * runs.get(k, 0) for k in (best-1, best, best+1)) / tot


def auto_s(rel, target_h, cols, rows):
    """시트마다 사람 크기가 달라서, 덩어리 키의 중앙값이 target_h도트가 되는 도트 크기"""
    a, fg, _ = load(rel)
    H, W = fg.shape
    hs = [b[3] - b[1] for b in S.components(fg, 4, 1) if (b[3] - b[1]) > H / rows * 0.4]
    return float(np.median(hs)) / target_h if hs else 5.5


def people():
    """관객 8명: 계절 걷기(8×2) · 계절 자세(8×4 두 장) · VIP(10×4), 직원 걷기(4×5)"""
    global SRC
    old = SRC; SRC = S.ROOT / 'assets' / 'spritesheets16'
    poses = ['watch', 'cheer', 'photo', 'snack', 'point', 'sit', 'toss', 'sad']
    for se in SEASONS:
        for i, t in enumerate(figures(f'people-actions/walk/people_walk16_{se}.png', 8, 2, 40)):
            if t is not None: S.save(t, OUT / f'pw_{se}_{i % 8}_f{i // 8}.png')
        for half, base in (('a', 0), ('b', 4)):
            for i, t in enumerate(figures(f'people-actions/poses/people_pose16_{se}_{half}.png', 8, 4, 40)):
                if t is not None: S.save(t, OUT / f'pp_{se}_{base + i // 8}_{poses[i % 8]}.png')
    for i, t in enumerate(figures('people-actions/vip/vip16.png', 10, 4, 40)):
        if t is not None:
            r, c = i // 10, i % 10
            S.save(t, OUT / (f'vip_{r}_f{c}.png' if c < 2 else f'vip_{r}_{poses[c - 2]}.png'))
    for i, t in enumerate(figures('staff-walk/staff_walk16.png', 4, 5, 42)):
        if t is not None: S.save(t, OUT / f'sw_{i // 2:02d}_f{i % 2}.png')
    SRC = old


def objects(rel, cols, rows, s=None, min_px=None):
    """물체 시트: 칸마다 가장 큰 덩어리를 그 칸의 주인으로 삼고, 나머지 조각은 상자가 가장 가까운 주인에게 붙인다.
    (칸 경계를 넘는 그림 · 옆 칸으로 삐져나온 기둥이 잘리거나 옆 그림에 붙지 않게)"""
    from scipy import ndimage
    a, fg, _ = load(rel)
    if s is None: s = est_s(a, fg)
    H, W = fg.shape
    lab, n = ndimage.label(fg, structure=np.ones((3, 3)))
    objs = ndimage.find_objects(lab)
    sizes = ndimage.sum(np.ones_like(lab), lab, index=range(1, n + 1))
    min_px = min_px or (s * 1.5) ** 2
    comps = [(i + 1, objs[i], sizes[i]) for i in range(n) if sizes[i] >= min_px]
    cw, ch = W / cols, H / rows
    owner = {}
    for lid, sl, sz in comps:
        cy, cx = (sl[0].start + sl[0].stop) / 2, (sl[1].start + sl[1].stop) / 2
        k = (min(rows - 1, int(cy / ch)), min(cols - 1, int(cx / cw)))
        if k not in owner or sz > owner[k][2]: owner[k] = (lid, sl, sz)
    mains = {k: v for k, v in owner.items()}
    groups = {k: [v[0]] for k, v in mains.items()}
    gap = lambda s1, s2: max(0, max(s1[1].start - s2[1].stop, s2[1].start - s1[1].stop)) + max(0, max(s1[0].start - s2[0].stop, s2[0].start - s1[0].stop))
    main_ids = {v[0] for v in mains.values()}
    for lid, sl, sz in comps:
        if lid in main_ids: continue
        k, (d, _) = min(((k, (gap(sl, v[1]), 0)) for k, v in mains.items()), key=lambda kv: kv[1][0])
        if d < min(cw, ch) * 0.25: groups[k].append(lid)
    out = [None] * (cols * rows)
    for (r, c), ids in groups.items():
        m = np.isin(lab, ids)
        ys, xs = np.nonzero(m)
        box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
        out[r * cols + c] = extract_raw(a, m, box, s)
    print(rel, 'pixel', round(s, 2), sum(o is not None for o in out), '/', cols * rows, flush=True)
    return out


def grid(rel, cols, rows, s=None):
    """칸이 고른 시트: 칸마다 잘라서 원래 색 그대로. 도트 크기는 외곽선 두께로"""
    a, fg, _ = load(rel)
    if s is None: s = est_s(a, fg)
    out, _, _ = cells(rel, cols, rows, s=s, crop=True)
    print(rel, 'pixel', round(s, 2), sum(o is not None for o in out), '/', cols * rows, flush=True)
    return out


def final():
    """마지막 묶음: 영웅 · 전설 동물 크게, 계절 소품, 뽑기 화면, 아이콘, 날씨"""
    global SRC
    old = SRC; SRC = S.ROOT / 'assets' / 'spritesheets16'
    import json
    big = json.load(open(sys.argv[2])) if len(sys.argv) > 2 else []
    epic = [b for b in big if b['g'] == 3]; leg = [b for b in big if b['g'] == 4]
    for rel, cols, rows, lst in (('animals-large/big16_1.png', 5, 5, epic[:25]), ('animals-large/big16_2.png', 4, 4, epic[25:]), ('animals-large/big16_3.png', 6, 5, leg)):
        for i, t in enumerate(grid(rel, cols, rows)):
            if t is not None and i < len(lst): S.save(t, OUT / f"big_{lst[i]['id']:03d}.png")
    for se in SEASONS:
        for i, t in enumerate(objects(f'seasonal-decor/decor16_{se}.png', 6, 2)):
            if t is not None: S.save(t, OUT / f'decor_{se}_{i + 1}.png')
    grades = ['common', 'uncommon', 'rare', 'epic', 'legend', 'shiny']
    for i, t in enumerate(grid('gacha-reveal/machines/gacha_machine16.png', 3, 6)):
        if t is not None: S.save(t, OUT / f"gm_{['spring', 'summer', 'autumn', 'winter', 'staff', 'pen'][i // 3]}_{i % 3}.png")
    for i, t in enumerate(grid('gacha-reveal/capsules/gacha_capsule16.png', 4, 6)):
        if t is not None: S.save(t, OUT / f'gc_{grades[i // 4]}_{i % 4}.png')
    fxn = [f'pillar_{g}' for g in grades] + [f'burst_{g}' for g in grades] + ['sparkle', 'star', 'confetti', 'rays', 'smoke', 'hearts']
    for n, t in zip(fxn, grid('gacha-reveal/effects/gacha_fx16.png', 6, 3)):
        if t is not None: S.save(t, OUT / f'gf_{n}.png')
    cn = ['common', 'uncommon', 'rare', 'epic', 'legend', 'back', 'staff', 'pen']
    for n, t in zip(cn, grid('gacha-reveal/cards/cards16.png', 4, 2)):
        if t is not None: S.save(t, OUT / f'card_{n}.png')
    for n, t in zip(['legend', 'epic'], grid('gacha-reveal/banners/gacha_cutin16.png', 1, 2)):
        if t is not None: S.save(t, OUT / f'cutin_{n}.png')
    ia = ['gacha', 'zoo', 'cards', 'manage', 'log', 'paw', 'badge', 'block', 'board', 'shop', 'pot', 'list', 'fuse', 'up', 'slots', 'money',
          'mission', 'dex', 'synergy', 'trophy', 'coin', 'coins', 'ticket', 'food', 'heart', 'visitor', 'sun', 'moon', 'hourglass', 'calendar', 'gear', 'sound',
          'mute', 'zoomin', 'zoomout', 'fit', 'close', 'check', 'lock', 'rival']
    for n, t in zip(ia, grid('ui-weather/icons/icons_ui16_a.png', 8, 5)):
        if t is not None: S.save(t, OUT / f'ui_{n}.png')
    ib = ['grass', 'sand', 'water', 'snow', 'rock', 'cloud', 'spring', 'summer', 'autumn', 'winter', 'star0', 'star1', 'star2', 'star3', 'star4', 'shiny',
          'collector', 'keeper', 'guide', 'janitor', 'ticket2', 'cleaner', 'guard', 'vet', 'promoter', 'performer', 'thermo', 'wrench', 'strike', 'piggy', 'gift', 'party']
    for n, t in zip(ib, grid('ui-weather/icons/icons_ui16_b.png', 8, 4)):
        if t is not None: S.save(t, OUT / f'ui_{n}.png')
    wn = ['rain', 'splash1', 'splash2', 'puddle', 'umbrella', 'raincloud', 'flake1', 'flake2', 'clump', 'petal1', 'petal2', 'petal3',
          'leaf1', 'leaf2', 'ginkgo', 'heat', 'glare', 'gust', 'firefly', 'lamplight', 'window', 'twinkle', 'moon', 'shooting']
    for n, t in zip(wn, grid('ui-weather/weather/weather16.png', 6, 4)):
        if t is not None: S.save(t, OUT / f'wx_{n}.png')
    SRC = old


def buildings_big():
    """큰 관객 건물 6종 × 3단계 → bld_* (작은 건물 그림을 대신한다)"""
    global SRC
    old = SRC; SRC = S.ROOT / 'assets' / 'spritesheets16'
    bn = ['snack', 'restroom', 'photo', 'fountain', 'bench', 'clinic']
    for i, t in enumerate(objects('buildings-large/buildings_big16.png', 6, 3)):
        if t is not None: S.save(t, OUT / f'bld_{bn[i % 6]}_{i // 6}.png')
    SRC = old


def buildings():
    bl = objects('buildings/buildings16.png', 6, 3, s=5.5)
    bn = ['snack', 'restroom', 'photo', 'fountain', 'bench', 'clinic']
    for i, t in enumerate(bl):
        if t is not None: S.save(t, OUT / f'bld_{bn[i % 6]}_{i // 6}.png')


if __name__ == '__main__':
    if sys.argv[1:] == ['buildings']: buildings()
    elif sys.argv[1:] == ['gate']: gate()
    elif sys.argv[1:] == ['people']: people()
    elif sys.argv[1:] == ['buildings_big']: buildings_big()
    elif sys.argv[1:2] == ['final']: final()
    elif sys.argv[1:] == ['park']:
        names = ['tree', 'pine', 'blossom', 'fruit', 'bush', 'flowerbush', 'lamp', 'bench', 'bin', 'sign', 'planter', 'flowerbed', 'hedge', 'boulder', 'drink', 'picnic', 'balloon', 'pond']
        for n, t in zip(names, cells('park-props/parkprops16.png', 6, 3)[0]):
            if t is not None: S.save(t, OUT / f'park_{n}.png')
    elif sys.argv[1:] == ['tiles']:
        tiles(); shapes('paths/path16.png', ['path_sq', 'path_ring', 'path_sq_w', 'path_ring_w'])
    else: run()
