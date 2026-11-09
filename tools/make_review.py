"""현재 버전 평가 보고서 PDF: 무엇이 바뀌었나 · 화면 · 평점 그래프 · 밸런스 시뮬 · 개선 방향.
python3 tools/make_review.py <스크린샷 폴더> → docs/bbopzoo_review_v0.6.pdf
서식(CSS · 표 · 표지 · PDF 출력)은 tools/make_docs.py와 같은 것을 쓴다."""
import math, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
src = (ROOT / 'tools' / 'make_docs.py').read_text()
ns: dict = {'__file__': str(ROOT / 'tools' / 'make_docs.py')}
sys.argv = [sys.argv[0]] + sys.argv[1:]
exec(src.split('# ══════════════════════ 1.')[0], ns)  # CSS · table · shot · page 만
exec('\n'.join(['def render' + src.split('def render', 1)[1].split('\n\nrender(')[0]]), ns)
CSS, table, shot, page, render, e = ns['CSS'], ns['table'], ns['shot'], ns['page'], ns['render'], ns['e']

EXTRA = """
.score { font-family: Jua, sans-serif; font-size: 30pt; color: #38a35b; line-height: 1; }
.chart { display: block; margin: 6px auto 4px; }
.kpi { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 8px 0 12px; }
.kpi div { background: #fffaf0; border: 2px solid #f0dcb4; border-radius: 8px; padding: 6px 8px; text-align: center; }
.kpi b { display: block; font-family: Jua, sans-serif; font-size: 16pt; font-weight: normal; color: #8a5a3b; }
.pri { display: inline-block; font-family: Jua, sans-serif; font-size: 9pt; padding: 0 6px; border-radius: 6px; color: #fff; }
.two .shot { height: 54mm; object-fit: cover; object-position: top; }
.two > div { break-inside: avoid; }
.chart-row { display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: 6px; }
.p1 { background: #c94c4c; } .p2 { background: #d9822b; } .p3 { background: #6b8f4e; }
"""
ns['CSS'] = CSS + EXTRA

# ── 평점 (10점 만점) · 근거 ──
SCORES = [
    ('동전 쓸기 손맛', 8, '닿으면 바로 줍기 · 반짝이 잔상 · 합산 숫자 · 콤보 단계 · 동전 더미 · 황금 동전까지 갖춤'),
    ('뽑기 연출', 8, '기계 흔들림 → 캡슐 → 등급 빛 → 흩뿌린 결과 → 정렬. 전설 이상만 입장식'),
    ('아트 · 통일감', 8, '16px 도트로 통일, 계절마다 문 · 나무 · 소품 교체. 타이틀도 게임 그림으로'),
    ('사운드 · 음악', 7, '계절 · 행사 · 피버 곡, 단계별 악기 층. 효과음은 합성음이라 녹음 파일보다 가벼움'),
    ('UI · 읽기 쉬움', 7, '정보 줄 고정 · 라이벌 게이지 단순화. 패널 안 글이 많고 빼곡함'),
    ('밸런스 · 진행', 6, '열심히 쓸면 8단계까지 감. 느슨하면 첫 동물원 폐원이 잦음 (운 편차는 의도)'),
    ('콘텐츠 양', 7, '동물 · 직원 · 우리 · 신 12 · 영웅 6 · 계절 · 행사 · 폐원 반복. 8단계 뒤 목표는 얇음'),
    ('성능 (폰)', 6, '뽑기 중 뒤 화면 멈춤 · 소리 재사용으로 2배 부드러워짐. 필드 자체는 아직 무거움'),
    ('처음 하는 사람 안내', 5, '첫 단계 안내 글만 있음. 동전 쓸기 · 합성 · 우리 배치를 따로 알려 주지 않음'),
    ('다시 켤 이유', 6, '오프라인 수입 · 미션 · 시즌 대결 · 도감. 장기 목표(업적 · 수집 보상)는 약함'),
]

def radar(items, size=330):
    n, cx, cy, R = len(items), size / 2, size / 2 + 6, size * 0.34
    pt = lambda i, v: (cx + math.sin(2 * math.pi * i / n) * R * v / 10, cy - math.cos(2 * math.pi * i / n) * R * v / 10)
    g = []
    for lv in (2, 4, 6, 8, 10):
        ps = ' '.join(f'{x:.1f},{y:.1f}' for x, y in (pt(i, lv) for i in range(n)))
        g.append(f'<polygon points="{ps}" fill="none" stroke="#e8d6b4" stroke-width="1"/>')
    for i in range(n):
        x, y = pt(i, 10); g.append(f'<line x1="{cx}" y1="{cy}" x2="{x:.1f}" y2="{y:.1f}" stroke="#e8d6b4"/>')
    ps = ' '.join(f'{x:.1f},{y:.1f}' for x, y in (pt(i, s) for i, (_, s, _) in enumerate(items)))
    g.append(f'<polygon points="{ps}" fill="rgba(56,163,91,0.28)" stroke="#38a35b" stroke-width="2.5"/>')
    for i, (name, s, _) in enumerate(items):
        x, y = pt(i, s); g.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3.5" fill="#38a35b"/>')
        lx, ly = pt(i, 12.6)
        anchor = 'middle' if abs(lx - cx) < 20 else ('start' if lx > cx else 'end')
        g.append(f'<text x="{lx:.1f}" y="{ly + 4:.1f}" font-size="10.5" text-anchor="{anchor}" fill="#5d3a24" font-family="Gowun">{e(name)} <tspan font-family="Jua" fill="#38a35b">{s}</tspan></text>')
    return f'<svg class="chart" width="{size + 150}" height="{size + 20}" viewBox="-75 0 {size + 150} {size + 20}">{"".join(g)}</svg>'

def hbars(rows, unit='', maxv=None, w=470, color='#38a35b'):
    maxv = maxv or max(v for _, v, *_ in rows)
    h, g, L = 24, [], (110 if w < 400 else 175)
    for i, (name, v, *rest) in enumerate(rows):
        c = rest[0] if rest else color
        y = i * h; bw = (w - L - 40) * v / maxv
        g.append(f'<text x="{L - 8}" y="{y + 16}" font-size="10.5" text-anchor="end" fill="#5d3a24" font-family="Gowun">{e(name)}</text>')
        g.append(f'<rect x="{L}" y="{y + 4}" width="{w - L - 40}" height="15" rx="3" fill="#f3e7cf"/>')
        g.append(f'<rect x="{L}" y="{y + 4}" width="{bw:.1f}" height="15" rx="3" fill="{c}"/>')
        g.append(f'<text x="{L + bw + 5:.1f}" y="{y + 16}" font-size="10" fill="#5d3a24" font-family="Jua">{v}{unit}</text>')
    return f'<svg class="chart" width="{w}" height="{len(rows) * h + 6}">{"".join(g)}</svg>'

def build():
    avg = sum(s for _, s, _ in SCORES) / len(SCORES)
    s = []
    # 1. 한눈에
    s.append('<h2>1. 한눈에 보기</h2>')
    s.append('<p><b>뽑ZOO</b>는 관객이 떨어뜨린 동전을 손가락(커서)으로 쓸어 담아 캡슐 뽑기를 돌리고, 나온 동물 · 직원 · 우리로 동물원을 키우는 도트 경영 게임이에요. 계절(7일)마다 라이벌 동물원과 규모를 겨루고, 지면 하트를 잃고, 하트가 없으면 폐원해서 데려갈 카드만 챙겨 다시 시작해요.</p>')
    s.append('<div class="flow">낮: 동전 쓸어 담기 (콤보 · 피버 · 황금 동전 · 동전 더미) → 밤: 뽑기 · 배치 · 공사 · 확장 → 7일째 밤 라이벌 대결 → 1년 별 평가 → (지면) 폐원 · 다시 시작 (배속 열림)</div>')
    s.append(f'<div class="kpi"><div><b>{avg:.1f} / 10</b>종합 평점</div><div><b>78 / 78</b>자동 테스트 통과</div><div><b>약 2배</b>뽑기 중 부드러움 개선</div><div><b>3 / 4</b>열심히 할 때 첫 동물원 생존</div></div>')
    # 2. 바뀐 것
    s.append('<h2 class="same">2. 이번 버전에서 바뀐 것</h2>')
    s.append(table(['분야', '내용'], [
        ['동전 쓸기', '동전 그림에 닿으면 바로 줍기 (맵 기준 고정 반경, 확대/축소 따라감) · 자석 · 빨려드는 효과 없앰 · 쓸기 속도 제한 없음'],
        ['손맛', '반투명 도트 반짝이 잔상 · 손가락 옆 합산 숫자 → 코인 칸으로 · 콤보 10/25/50/100 단계 터짐 · 같은 모양 동전이 우르르 떨어지는 동전 더미'],
        ['업그레이드', '쓸어 담기(범위) → <b>황금 동전</b> (값 5배, 확률 1~5%) · 전망대 · 이카로스도 황금 동전 확률로'],
        ['동전 수명', '기본 8초 · 최대 20초 (곧바로 못 주우면 놓침). 늘려 주는 업그레이드 · 관리인 · 쉼터도 함께 줄임'],
        ['배속', '폐원을 한 번 하면 ×2 열림. 전부 2배 (콤보 이어지는 시간만 실제 시간). 시즌 결과 밤엔 ×1로'],
        ['뽑기', '한꺼번에 최대 10회 · 결과를 흩뿌렸다가 한 번 더 누르면 뽑힌 순서대로 칸 정렬 · 전설 이상만 입장식'],
        ['정보 줄', '숫자 · 시계가 바뀌어도 흔들리지 않게 칸 고정 · 라이벌은 초록/빨강 게이지 + 가운데 흰 선 + 남은 날만'],
        ['타이틀', '밤 축제 하늘 · 캡슐 불꽃놀이 · 계절 기계 4대 · 언덕 위 동물원 문(내 이름 · 계절 장식) · 걸어 다니는 동물들'],
        ['앱', '시작 화면 (기본 하얀 화면 → 게임 색 + 로고) · 뽑기 렉 줄임 (뒤 화면 멈춤 · 소리 재사용)'],
    ]))
    # 3. 화면
    s.append('<h2>3. 지금 화면</h2>')
    s.append(shot('tt_pc.png', '타이틀: 밤 축제 + 언덕 위 동물원 (PC)'))
    two = lambda a, b: f'<div class="two"><div>{a}</div><div>{b}</div></div>'
    s.append(two(shot('tt_ph.png', '타이틀 (폰 가로)'), shot('tts_grid.png', '계절마다 바뀌는 아래쪽 (여름 · 가을 · 겨울)')))
    s.append(two(shot('v4_pc_10_a.png', '10장 결과: 흩뿌림'), shot('v4_pc_10_b.png', '한 번 더 누르면 뽑힌 순서대로 정렬')))
    s.append(two(shot('v7_pc.png', '필드: 황금 동전 · 동전 더미 · 라이벌 게이지 (PC)'), shot('v7_ph.png', '필드 (폰 가로)')))
    s.append(shot('hud_all.png', '정보 줄: PC 1366 · 1600 · 1920, 폰 (숫자가 바뀌어도 칸 위치 고정)'))
    # 4. 평점
    s.append('<h2>4. 평점</h2>')
    s.append(f'<p>개발 중인 지금 버전을 10개 항목으로 매겼어요. 점수는 직접 플레이 확인 · 화면 측정 · 시뮬레이션 결과를 근거로 한 내부 평가예요 (외부 사용자 평가 아님). <b>종합 {avg:.1f}점</b>.</p>')
    s.append('<div class="chart-row">' + radar(SCORES, 250) + hbars([(n, v, '#38a35b' if v >= 8 else '#d9a23b' if v >= 7 else '#d9822b' if v >= 6 else '#c94c4c') for n, v, _ in sorted(SCORES, key=lambda x: -x[1])], '점', 10, w=330) + '</div>')
    s.append(table(['항목', '점수', '근거'], [[e(n), f'<b>{v}</b>', e(r)] for n, v, r in SCORES]))
    # 5. 밸런스
    s.append('<h2>5. 밸런스 시뮬레이션</h2>')
    s.append('<p>봇이 실제 규칙으로 뽑기 · 합성 · 배치 · 업그레이드 · 건물을 하고, 동전은 두 가지 방식으로 줍게 했어요. 첫 동물원(데려온 카드 없음) 기준, 황금 동전 · 짧은 동전 수명 포함. 같은 방식도 판마다 운 차이가 커서 여러 판을 돌렸어요.</p>')
    s.append(table(['줍는 방식', '놓친 동전', '끝까지 버팀', '결과'], [
        ['1초마다 다 쓸기, ×1', '0%', '4판 중 3판', '8단계 115~134분 · 1판 3시즌째 폐원'],
        ['3초마다 쓸기 + 35% 자리 비움, ×1', '10~23%', '3판 중 1판', '8단계 140분 · 2판 2 · 5시즌째 폐원'],
        ['1초마다 다 쓸기, ×2', '0%', '2판 중 2판', '실제 43~57분에 7~8단계'],
        ['3초마다 쓸기 + 35% 자리 비움, ×2', '24~26%', '3판 중 2판', '1판 3시즌째 폐원'],
    ]))
    s.append('<h3>끝까지 버틴 비율</h3>')
    s.append(hbars([('열심히 · ×1', 75, '#38a35b'), ('느슨하게 · ×1', 33, '#d9822b'), ('열심히 · ×2', 100, '#38a35b'), ('느슨하게 · ×2', 67, '#d9a23b')], '%', 100))
    s.append('<h3>뽑기 중 부드러움 (느린 폰 흉내: CPU 4배 느리게, 10장 뽑기 9초)</h3>')
    s.append(hbars([('고치기 전 · 그린 횟수', 149, '#c94c4c'), ('고친 뒤 · 그린 횟수', 330, '#38a35b')], '번', 360))
    s.append(hbars([('고치기 전 · 0.05초 넘게 멈춤', 106, '#c94c4c'), ('고친 뒤 · 0.05초 넘게 멈춤', 28, '#38a35b')], '번', 110))
    s.append('<div class="note">읽는 법: 손을 놓지 않으면 동전 수명은 문제가 되지 않고(놓침 0%), 느슨하게 하면 동전의 20~25%를 놓쳐 첫 동물원 생존이 크게 떨어져요. ×2는 ×1보다 어렵지 않고 실제 시간으로 약 2배 빨라요.</div>')
    # 6. 개선 방향
    s.append('<h2>6. 개선 방향</h2>')
    s.append('<p>평점이 낮은 항목부터, 해 볼 만한 순서로 정리했어요. <span class="pri p1">먼저</span> <span class="pri p2">다음</span> <span class="pri p3">나중</span></p>')
    s.append(table(['우선', '항목', '제안', '기대 효과'], [
        ['<span class="pri p1">먼저</span>', '처음 하는 사람 안내 (5점)', '첫 5분 손잡이 안내: 동전 쓸기 → 무료 뽑기 → 배치 → 밤 정비 → 첫 대결을 한 단계씩 손가락 그림으로. 처음 3일은 라이벌을 약하게', '첫 판 이탈 감소, 조작을 몰라 지는 일 없음'],
        ['<span class="pri p1">먼저</span>', '첫 동물원 난이도 (밸런스 6점)', '첫 동물원만 동전 수명 +2초 또는 수집 직원 1명 기본 지급. 두 번째부터 지금 그대로', '느슨한 플레이도 첫 판은 버팀 · 폐원은 두 번째부터 긴장'],
        ['<span class="pri p1">먼저</span>', '성능 (6점)', '필드: 움직이지 않는 층(바닥 · 울타리 · 건물)을 한 장으로 미리 그려 두기, 폰은 해상도 배율 낮추기. 뽑기 기계의 캡슐 달그락 연출 가볍게', '평소 플레이도 부드럽게, 배터리 · 발열 감소'],
        ['<span class="pri p2">다음</span>', '다시 켤 이유 (6점)', '업적(도감 · 콤보 · 시즌 연승) + 보상, 주간 행사 동물, 폐원할 때마다 쌓이는 영구 보너스 표', '장기 목표 · Steam 업적과 바로 연결'],
        ['<span class="pri p2">다음</span>', '콘텐츠 (7점)', '8단계 뒤 목표: 특별 우리(신전 · 수족관), 돈 쓸 곳(장식 · 테마 공원), 라이벌 보스 시즌', '후반 지루함 해소'],
        ['<span class="pri p2">다음</span>', 'UI (7점)', '패널 글 줄이기 · 아이콘화, 라이벌 게이지에 색약용 무늬(우리 쪽 빗금) 추가', '읽기 쉬움 · 접근성'],
        ['<span class="pri p3">나중</span>', '사운드 (7점)', '핵심 효과음(동전 · 뽑기 · 전설)만 녹음 · 제작 음원으로 교체, 기기별 음량 맞춤', '손맛 · 완성도'],
        ['<span class="pri p3">나중</span>', 'Unity 이식', '이식 키트(P1~P3: 규칙 · 시뮬 · 저장) 먼저 → 화면. 지금 웹판은 기준 구현으로 유지', 'Steam 출시 준비'],
    ]))
    s.append('<div class="warn">평점은 내부 평가라 실제 사용자 반응과 다를 수 있어요. 출시 전 소규모 플레이 테스트(5~10명)로 "처음 5분"과 "첫 폐원" 구간을 꼭 확인하는 걸 권해요.</div>')
    toc = ['한눈에 보기', '이번 버전에서 바뀐 것', '지금 화면', '평점', '밸런스 시뮬레이션', '개선 방향']
    return ns['page']('뽑ZOO', '현재 버전 평가 보고서', 'v0.6 · 2026년 11월 9일 · 웹판 기준 (APK 동일)', toc, ''.join(s))

doc = build()
render('bbopzoo_review_v0.6', doc)

# HTML 한 파일: 그림 · 글꼴을 파일 안에 넣어 어디서나 열리게 (화면용으로 가운데 정렬 · 표지 높이 줄임)
import base64, re
from io import BytesIO
def inline(m):
    path = Path(m.group(1))
    if not path.exists(): return m.group(0)
    if path.suffix == '.png':
        try:
            from PIL import Image
            im = Image.open(path).convert('RGB'); im.thumbnail((1400, 1400))
            buf = BytesIO(); im.save(buf, 'JPEG', quality=82); return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()
        except Exception: pass
    mime = {'.woff2': 'font/woff2', '.png': 'image/png'}.get(path.suffix, 'application/octet-stream')
    return f'data:{mime};base64,' + base64.b64encode(path.read_bytes()).decode()
html_doc = re.sub(r'file://([^\'")]+)', inline, doc)
html_doc = html_doc.replace('<title>', '<title>').replace('</style>', '''
body { max-width: 860px; margin: 0 auto; padding: 24px 18px 60px; background: #fffdf8; }
.cover { height: auto; min-height: 60vh; }
h2 { page-break-before: auto; margin-top: 34px; }
img.shot { max-width: 100%; height: auto; }
.chart { max-width: 100%; height: auto; }
@media (max-width: 640px) { .two, .chart-row, .kpi { grid-template-columns: 1fr; } table { font-size: 8.5pt; } }
</style>''', 1).replace('<head>', '<head><meta name="viewport" content="width=device-width, initial-scale=1"><title>뽑ZOO 평가 보고서 v0.6</title>', 1)
(ROOT / 'docs' / 'bbopzoo_review_v0.6.html').write_text(html_doc)
print('HTML', ROOT / 'docs' / 'bbopzoo_review_v0.6.html')
