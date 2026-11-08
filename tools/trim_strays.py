"""물체 그림(건물 · 소품 · 꾸미기 · 게이트) 좌우 끝에 붙어 온 옆 칸 조각을 자른다.
완전히 빈 세로줄로 떨어진 쪽이 전체의 12%보다 작으면 그 쪽을 버린다."""
import sys
from pathlib import Path
import numpy as np
from PIL import Image

def trim(arr):
    a = arr[..., 3] > 0
    if not a.any(): return arr, False
    cols = a.sum(axis=0)
    tot = cols.sum()
    changed = False
    empty = np.nonzero(cols == 0)[0]
    xs = np.nonzero(cols)[0]; x0, x1 = xs.min(), xs.max()
    gaps = [e for e in empty if x0 < e < x1]
    if gaps:
        # 가장 큰 덩어리를 품은 구간만 남긴다
        cuts = [x0] + gaps + [x1 + 1]
        segs = [(cuts[i], cuts[i + 1]) for i in range(len(cuts) - 1) if cols[cuts[i]:cuts[i + 1]].sum() > 0]
        big = max(segs, key=lambda s: cols[s[0]:s[1]].sum())
        for s0, s1 in segs:
            if (s0, s1) != big and cols[s0:s1].sum() < 0.12 * tot: arr[:, s0:s1] = 0; changed = True
    if changed:
        a = arr[..., 3] > 0; ys, xs = np.nonzero(a)
        arr = arr[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    return arr, changed

if __name__ == '__main__':
    root = Path('assets/sprites16/v2')
    for pat in sys.argv[1:] or ['bld_*', 'decor_*', 'park_*', 'prop_*', 'gate_*', 'gatepart_*', 'gatedeco_*']:
        for p in sorted(root.glob(pat + '.png')):
            arr = np.array(Image.open(p).convert('RGBA'))
            out, ch = trim(arr)
            if ch: Image.fromarray(out, 'RGBA').save(p); print('trimmed', p.name, arr.shape[:2], '->', out.shape[:2])


def drop_outside(arr, frac=0.06):
    """가장 큰 덩어리 상자 밖에 있는 작은 조각(옆 그림의 효과선 등)을 지운다"""
    from scipy import ndimage
    a = arr[..., 3] > 0
    lab, n = ndimage.label(a, structure=np.ones((3, 3)))
    if n <= 1: return arr, False
    sizes = ndimage.sum(a, lab, range(1, n + 1))
    big = int(np.argmax(sizes)) + 1
    sl = ndimage.find_objects(lab)[big - 1]
    changed = False
    for i in range(1, n + 1):
        if i == big or sizes[i - 1] >= frac * sizes[big - 1]: continue
        s2 = ndimage.find_objects(lab)[i - 1]
        inside = s2[1].start >= sl[1].start - 1 and s2[1].stop <= sl[1].stop + 1 and s2[0].start >= sl[0].start - 1 and s2[0].stop <= sl[0].stop + 1
        if not inside: arr[lab == i] = 0; changed = True
    if changed:
        ys, xs = np.nonzero(arr[..., 3] > 0); arr = arr[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    return arr, changed
