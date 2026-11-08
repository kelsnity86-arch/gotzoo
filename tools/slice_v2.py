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
                bs = [b for b in S.components(sf, 4, 1) if (b[2] - b[0]) * (b[3] - b[1]) >= (s * 3) ** 2]
                if not bs: res.append(None); continue
                bb = (min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs))
                res.append(S.extract(sa, sf, bb, s))
    else:
        boxes = S.components(fg, 4, 1)
        groups = {}
        for b in boxes:
            cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
            k = (min(rows - 1, int(cy / (H / rows))), min(cols - 1, int(cx / (W / cols))))
            if (b[2] - b[0]) * (b[3] - b[1]) < (s * 3) ** 2: continue
            g = groups.get(k); groups[k] = b if g is None else (min(g[0], b[0]), min(g[1], b[1]), max(g[2], b[2]), max(g[3], b[3]))
        res = [S.extract(a, fg, groups[(r, c)], s) if (r, c) in groups else None for r in range(rows) for c in range(cols)]
    print(rel, 'pixel', round(s, 2), [None if c is None else c.shape[:2] for c in res][:6], flush=True)
    return [fix_shadow(c) for c in res], a, fg


def shapes(rel, names):
    """2×2 칸 시트: 칸마다 (3타일)×(3타일) 모양"""
    a, fg, s = load(rel)
    H, W = fg.shape
    for k, n in enumerate(names):
        c, r = k % 2, k // 2
        S.save(patch(a, fg, int(c * W / 2), int(r * H / 2), int((c + 1) * W / 2), int((r + 1) * H / 2), TILE * 3, quant=not rel.startswith('paths')), OUT / f'{n}.png')


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
            S.save(fix_shadow(S.extract(a[:H // 2, x0:x1], fg[:H // 2, x0:x1], bb, 5.5)), OUT / f'gatedeco_{se}_arch.png')
        for j in range(2):
            c0, c1 = int((k * 2 + j) * W / 8), int((k * 2 + j + 1) * W / 8)
            sa, sf = a[H // 2:, c0:c1], fg[H // 2:, c0:c1]
            bs = [b for b in S.components(sf, 4, 1) if (b[2] - b[0]) * (b[3] - b[1]) >= 300]
            if bs:
                bb = (min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs))
                S.save(fix_shadow(S.extract(sa, sf, bb, 5.5)), OUT / f'gatedeco_{se}_base{j}.png')
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


def buildings():
    bl, _, _ = cells('buildings/buildings16.png', 6, 3, crop=True)
    bn = ['snack', 'restroom', 'photo', 'fountain', 'bench', 'clinic']
    for i, t in enumerate(bl):
        if t is not None: S.save(t, OUT / f'bld_{bn[i % 6]}_{i // 6}.png')


if __name__ == '__main__':
    if sys.argv[1:] == ['buildings']: buildings()
    elif sys.argv[1:] == ['gate']: gate()
    elif sys.argv[1:] == ['people']: people()
    elif sys.argv[1:] == ['tiles']:
        tiles(); shapes('paths/path16.png', ['path_sq', 'path_ring', 'path_sq_w', 'path_ring_w'])
    else: run()
