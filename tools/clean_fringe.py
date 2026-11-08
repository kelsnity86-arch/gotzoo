"""잘라 낸 그림 가장자리에 남은 마젠타 배경 찌꺼기(보라 · 자홍 테두리 점)를 지운다.
투명한 곳에 닿아 있는 자홍빛 점만 지우고, 외곽선(진한 색)을 만나면 멈춘다. 여러 번 돌려도 같다."""
import sys
from pathlib import Path
import numpy as np
from PIL import Image

def clean(arr: np.ndarray) -> int:
    removed = 0
    for _ in range(3):
        r, g, b, a = [arr[..., i].astype(int) for i in range(4)]
        mag = (a > 0) & (r > 90) & (b > 90) & (g < 0.3 * np.minimum(r, b)) & (np.abs(r - b) < 70)
        tr = a == 0
        pad = np.pad(tr, 1, constant_values=True)
        near = pad[:-2, 1:-1] | pad[2:, 1:-1] | pad[1:-1, :-2] | pad[1:-1, 2:]
        kill = mag & near
        n = int(kill.sum())
        if not n: break
        arr[kill] = 0; removed += n
    return removed

if __name__ == '__main__':
    root = Path(sys.argv[1] if len(sys.argv) > 1 else 'assets/sprites16/v2')
    total = 0
    for p in sorted(root.glob('*.png')):
        arr = np.array(Image.open(p).convert('RGBA'))
        n = clean(arr)
        if n: Image.fromarray(arr, 'RGBA').save(p); total += n; print(p.name, n)
    print('total', total)
