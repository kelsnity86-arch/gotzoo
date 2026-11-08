"""Unity 이식용 스프라이트 목록: assets/sprites16 의 모든 PNG → unity/Data/sprites.json
게임 안 이름(key) = sprites16 기준 경로에서 .png 뺀 것 (src/render/sprites.ts 와 같다).
pivot 은 발밑 가운데(0.5, 0) — 필드에 세우는 그림 기준."""
import json, pathlib
from PIL import Image
root = pathlib.Path(__file__).resolve().parent.parent
src = root / 'assets' / 'sprites16'
out = []
for p in sorted(src.rglob('*.png')):
    w, h = Image.open(p).size
    key = p.relative_to(src).with_suffix('').as_posix()
    out.append({'key': key, 'file': 'sprites16/' + p.relative_to(src).as_posix(), 'w': w, 'h': h, 'pivot': [0.5, 0.0]})
(root / 'unity' / 'Data' / 'sprites.json').write_text(json.dumps({'ppu': 16, 'filter': 'point', 'sprites': out}, ensure_ascii=False, indent=0) + '\n')
print(len(out), 'sprites')
