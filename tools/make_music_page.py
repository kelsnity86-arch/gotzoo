"""배경음 미리 듣기 페이지: OGG를 data URI로 넣은 HTML 한 장 (아티팩트용).
python3 tools/make_music_page.py <ogg 폴더> <출력 html>"""
import base64, sys, subprocess
from pathlib import Path

src, out = Path(sys.argv[1]), Path(sys.argv[2])
TRACKS = [
    ('title', '뽑ZOO 테마', '타이틀', 'C장조 · 120 BPM', '게임 전체에 숨겨 둔 "솔 도 미 솔" 동기의 원곡. 사각파 멜로디 · 마림바 · 종'),
    ('spring_day', '벚꽃 산책', '봄 · 낮', 'G장조 · 108 BPM', '피리와 마림바가 걷는 듯한 봄 산책. B 구간에 타이틀 동기'),
    ('spring_night', '꽃잎 자장가', '봄 · 밤', 'F장조 · 3/4박 · 76 BPM', '오르골 자장가. 규모가 커지면 하프 반주와 종이 더해짐'),
    ('summer_day', '햇살 퍼레이드', '여름 · 낮', 'D장조 · 128 BPM', '스틸드럼 멜로디와 셰이커, 엇박 리듬의 여름 행진'),
    ('summer_night', '반딧불 연못', '여름 · 밤', 'A단조 · 76 BPM', '종소리 멜로디 · 풀벌레 · 잔잔한 패드'),
    ('autumn_day', '단풍 소풍', '가을 · 낮', 'B♭장조 · 스윙 · 96 BPM', '피리와 기타 반주, 걷는 베이스. C 구간에 타이틀 동기'),
    ('autumn_night', '달빛 정원', '가을 · 밤', 'D단조 · 70 BPM', '낮은 멜로디와 오르골, 쓸쓸하지만 아늑하게'),
    ('winter_day', '눈송이 왈츠', '겨울 · 낮', 'C장조 · 3/4박 · 138 BPM', '종과 썰매 방울의 왈츠. C 구간에 타이틀 동기'),
    ('winter_night', '난롯가', '겨울 · 밤', 'E♭장조 · 64 BPM', '따뜻한 패드와 오르골, 가장 느리고 조용한 곡'),
    ('gacha', '기계 돌리기', '뽑기', 'C단조 · 140 BPM · 반복', '손잡이를 돌리는 동안. 은 · 금 · 무지개 기계면 음이 2 · 4 · 7반음 올라감'),
    ('jingle_common', '결과: 일반', '뽑기 징글', '1.4초', '짧은 확인음'),
    ('jingle_rare', '결과: 희귀 · 영웅', '뽑기 징글', '3초', '반짝이는 상승음과 종'),
    ('jingle_legend', '결과: 전설', '뽑기 징글', '6초', '금관 팡파르와 행진 북'),
    ('jingle_mythic', '결과: 신화', '뽑기 징글', '10초', '타이틀 동기를 금관 · 종 · 팀파니로 웅장하게 (올림푸스 신)'),
]

def dur(p):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(p)]).decode().strip())

rows = []
for i, (tid, name, tag, meta, desc) in enumerate(TRACKS):
    f = src / f'{tid}.ogg'
    if not f.exists(): continue
    d = dur(f)
    b64 = base64.b64encode(f.read_bytes()).decode()
    loop = '' if tid.startswith('jingle') else ' loop'
    rows.append(f'''<li class="track" data-kind="{'jingle' if tid.startswith('jingle') else 'gacha' if tid == 'gacha' else 'loop'}">
  <button class="play" id="b-{tid}" aria-label="{name} 재생" data-target="a-{tid}"><span class="tri"></span></button>
  <div class="info"><div class="row1"><span class="tag">{tag}</span><b>{name}</b><span class="len">{int(d // 60)}:{int(d % 60):02d}</span></div>
  <div class="meta">{meta}</div><div class="desc">{desc}</div>
  <div class="bar"><i id="p-{tid}"></i></div></div>
  <audio id="a-{tid}" preload="none"{loop} src="data:audio/ogg;base64,{b64}"></audio>
</li>''')

html = f'''<title>뽑ZOO 사운드트랙</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jua&family=Gowun+Dodum&display=swap">
<style>
/* 레이아웃: 카세트 라벨 같은 곡 목록 한 줄 — 왼쪽 재생 버튼, 오른쪽 곡 정보와 진행 막대 */
:root {{
  --bg: #f3f6ec; --card: #ffffff; --ink: #2b2a1f; --muted: #6c6a55; --leaf: #3f8f52; --sun: #e9b53c; --line: #dde3cf;
  --display: 'Jua', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; --body: 'Gowun Dodum', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --bg: #171a14; --card: #20251c; --ink: #eef0e3; --muted: #a6a88f; --leaf: #6cc27e; --sun: #f2c75a; --line: #343b2c; color-scheme: dark; }} }}
:root[data-theme="dark"] {{ --bg: #171a14; --card: #20251c; --ink: #eef0e3; --muted: #a6a88f; --leaf: #6cc27e; --sun: #f2c75a; --line: #343b2c; color-scheme: dark; }}
body {{ background: var(--bg); color: var(--ink); font-family: var(--body); line-height: 1.55; }}
.wrap {{ max-width: 760px; margin: 0 auto; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 28px 48px; }}
h1 {{ font-family: var(--display); font-weight: 400; font-size: 2.1rem; margin: 0; color: var(--leaf); text-wrap: balance; }}
h1 span {{ color: var(--sun); }}
.lead {{ color: var(--muted); margin: 6px 0 18px; max-width: 62ch; }}
.note {{ font-size: .88rem; color: var(--muted); border-left: 3px solid var(--sun); padding: 4px 10px; margin: 0 0 20px; }}
h2 {{ font-family: var(--display); font-weight: 400; font-size: 1.15rem; margin: 22px 0 8px; letter-spacing: .02em; }}
ul {{ list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }}
.track {{ display: grid; grid-template-columns: 52px 1fr; gap: 12px; align-items: center; background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; }}
.info {{ min-width: 0; }}
.row1 {{ display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }}
.row1 b {{ font-family: var(--display); font-weight: 400; font-size: 1.12rem; }}
.tag {{ font-size: .74rem; color: var(--leaf); border: 1px solid var(--leaf); border-radius: 99px; padding: 0 8px; letter-spacing: .03em; }}
.len {{ margin-left: auto; font-variant-numeric: tabular-nums; color: var(--muted); font-size: .85rem; }}
.meta {{ font-size: .8rem; color: var(--muted); }}
.desc {{ font-size: .9rem; }}
.bar {{ height: 4px; background: var(--line); border-radius: 2px; margin-top: 6px; overflow: hidden; }}
.bar i {{ display: block; height: 100%; width: 0; background: var(--sun); }}
.play {{ width: 52px; height: 52px; border-radius: 50%; border: 0; background: var(--leaf); cursor: pointer; display: grid; place-items: center; }}
.play:focus-visible {{ outline: 3px solid var(--sun); outline-offset: 2px; }}
.tri {{ width: 0; height: 0; border-left: 15px solid var(--card); border-top: 10px solid transparent; border-bottom: 10px solid transparent; margin-left: 4px; }}
.play.on .tri {{ width: 14px; height: 16px; border: 0; margin: 0; background: linear-gradient(90deg, var(--card) 0 35%, transparent 35% 65%, var(--card) 65%); }}
</style>
<div class="wrap">
  <h1>뽑<span>ZOO</span> 사운드트랙</h1>
  <p class="lead">1차 배경음 14곡. 전부 직접 작곡한 칩튠으로, 게임에 들어간 것과 같은 악보를 음원으로 뽑았습니다. 반복 곡은 끝과 처음이 이어지게 잘라 두었어요.</p>
  <p class="note">게임에서는 동물원이 커질수록 악기가 하나씩 더해집니다. 여기 음원은 가장 큰 동물원(모든 악기) 기준이에요.</p>
  <ul id="list">{''.join(rows)}</ul>
</div>
<script>
let cur = null;
document.querySelectorAll('.play').forEach((btn) => {{
  const a = document.getElementById(btn.dataset.target), bar = document.getElementById('p-' + btn.dataset.target.slice(2));
  btn.addEventListener('click', () => {{
    if (cur && cur !== a) {{ cur.pause(); cur.currentTime = 0; }}
    if (a.paused) {{ a.play().catch(() => {{}}); cur = a; }} else a.pause();
  }});
  a.addEventListener('play', () => btn.classList.add('on'));
  a.addEventListener('pause', () => btn.classList.remove('on'));
  a.addEventListener('ended', () => {{ btn.classList.remove('on'); bar.style.width = '0'; }});
  a.addEventListener('timeupdate', () => {{ if (a.duration) bar.style.width = (a.currentTime / a.duration * 100) + '%'; }});
}});
</script>
'''
out.write_text(html)
print(out, round(out.stat().st_size / 1e6, 1), 'MB', len(rows), 'tracks')
