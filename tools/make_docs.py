"""기획서 PDF 만들기: 게임 데이터(unity/Data/*.json)에서 숫자를 바로 읽어 HTML을 만들고, Chromium으로 PDF를 뽑는다.
python3 tools/make_docs.py <스크린샷 폴더> → docs/bbopzoo_gdd_v0.5.pdf · docs/bbopzoo_unity_plan_v1.pdf"""
import json, sys, subprocess, html
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
D = lambda n: json.loads((ROOT / 'unity' / 'Data' / f'{n}.json').read_text())
SHOT = Path(sys.argv[1]) if len(sys.argv) > 1 else None
OUT = ROOT / 'docs'
FONT = ROOT / 'node_modules' / '@fontsource'
e = html.escape

CSS = f"""
@font-face {{ font-family: Jua; src: url('file://{FONT}/jua/files/jua-korean-400-normal.woff2'); }}
@font-face {{ font-family: Jua; src: url('file://{FONT}/jua/files/jua-latin-400-normal.woff2'); unicode-range: U+0000-00FF; }}
@font-face {{ font-family: Gowun; src: url('file://{FONT}/gowun-dodum/files/gowun-dodum-korean-400-normal.woff2'); }}
@font-face {{ font-family: Gowun; src: url('file://{FONT}/gowun-dodum/files/gowun-dodum-latin-400-normal.woff2'); unicode-range: U+0000-00FF; }}
@page {{ size: A4; margin: 16mm 15mm 18mm; }}
* {{ box-sizing: border-box; }}
body {{ font-family: Gowun, sans-serif; font-size: 10.5pt; line-height: 1.6; color: #2b1d14; margin: 0; }}
h1, h2, h3, .cover-title {{ font-family: Jua, sans-serif; font-weight: normal; }}
.cover {{ height: 255mm; display: flex; flex-direction: column; justify-content: center; page-break-after: always; }}
.cover-title {{ font-size: 44pt; color: #38a35b; margin: 0; }}
.cover-sub {{ font-size: 15pt; margin: 6px 0 24px; }}
.cover-meta {{ color: #8a5a3b; font-size: 10pt; }}
.toc {{ columns: 2; font-size: 10.5pt; margin-top: 26px; }}
.toc div {{ break-inside: avoid; }}
h2 {{ font-size: 19pt; color: #38a35b; border-bottom: 3px solid #f7c948; padding-bottom: 2px; margin: 0 0 8px; page-break-before: always; }}
h2.same {{ page-break-before: auto; margin-top: 18px; }}
h3 {{ font-size: 13pt; color: #8a5a3b; margin: 14px 0 4px; }}
p {{ margin: 4px 0 8px; }}
table {{ border-collapse: collapse; width: 100%; margin: 6px 0 10px; font-size: 9.5pt; page-break-inside: auto; }}
tr {{ page-break-inside: avoid; }}
th {{ background: #f6e6c8; font-family: Jua, sans-serif; font-weight: normal; text-align: left; }}
th, td {{ border: 1px solid #e0c9a3; padding: 3px 6px; vertical-align: top; }}
.flow {{ background: #fffaf0; border: 2px solid #f7c948; border-radius: 8px; padding: 6px 10px; font-family: Jua, sans-serif; margin: 6px 0 10px; }}
.note {{ background: #eef6e6; border-left: 4px solid #38a35b; padding: 4px 10px; margin: 6px 0 10px; font-size: 9.5pt; }}
.warn {{ background: #fff0e6; border-left: 4px solid #d9822b; padding: 4px 10px; margin: 6px 0 10px; font-size: 9.5pt; }}
.shot {{ width: 100%; border: 2px solid #e0c9a3; border-radius: 6px; margin: 4px 0 2px; }}
.two {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }}
.cap {{ font-size: 8.5pt; color: #8a5a3b; margin-bottom: 8px; }}
ul {{ margin: 2px 0 8px; padding-left: 18px; }} li {{ margin: 1px 0; }}
code {{ font-family: monospace; font-size: 9pt; background: #f6efe1; padding: 0 3px; border-radius: 3px; }}
.done {{ color: #38a35b; }} .todo {{ color: #d9822b; }}
"""

def table(head, rows):
    h = ''.join(f'<th>{e(str(x))}</th>' for x in head)
    b = ''.join('<tr>' + ''.join(f'<td>{x}</td>' for x in r) + '</tr>' for r in rows)
    return f'<table><tr>{h}</tr>{b}</table>'

def shot(name, cap):
    if not SHOT or not (SHOT / name).exists(): return ''
    return f'<img class="shot" src="file://{SHOT / name}"><div class="cap">{e(cap)}</div>'

def pct(v, d=0): return f'{v * 100:.{d}f}%'
def fmt(n): return f'{int(n):,}'

def page(title, sub, meta, toc, body):
    t = ''.join(f'<div>{i + 1}. {e(x)}</div>' for i, x in enumerate(toc))
    return f'<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>{CSS}</style></head><body><div class="cover"><div class="cover-title">{e(title)}</div><div class="cover-sub">{e(sub)}</div><div class="cover-meta">{meta}</div><div class="toc">{t}</div></div>{body}</body></html>'


# ══════════════════════ 1. 기획서 v0.5 ══════════════════════
def gdd():
    g = D('grades'); b = D('balance'); u = D('upgrades'); f = D('facilities'); ev = D('events'); st = D('staff'); pc = D('pieces')
    se = D('seasons'); rv = D('rivals'); ol = D('olympus'); lk = D('luck'); syn = D('synergy'); dex = D('dex'); an = D('animals')
    V = b['visitor']; nm = ol['named']
    s = []
    s.append('<h2>1. 개요</h2>')
    s.append('<p><b>뽑ZOO</b>는 관객이 떨어뜨린 동전을 주워 캡슐 뽑기를 돌리고, 나온 동물·직원·우리로 동물원을 키우는 픽셀 아트 경영 게임이에요. 계절(7일)마다 라이벌 동물원과 규모를 겨루고, 해마다 별 등급 평가를 받아요.</p>')
    s.append('<div class="flow">낮 영업 (동전 쓸어 담기 · 콤보 · 피버) → 하루 정산 (입장료 − 월급 − 유지비) → 밤 정비 (뽑기 · 배치 · 공사 · 규모 확장) → 개장 → … → 7일째 밤 라이벌 대결</div>')
    s.append(table(['항목', '내용'], [
        ['플랫폼', 'Steam (PC) 우선. 폰은 가로 화면. 웹판(HTML 한 파일)은 시안 · 검증용'],
        ['엔진', '현재 웹(Vite + TypeScript + Canvas). <b>Unity로 이식 결정</b> (별도 이식 계획서)'],
        ['과금', '실제 돈 결제 없음. 뽑기 재화는 모두 게임 안에서 번다'],
        ['연출', '기본값은 모든 연출 켜짐. 줄이기는 설정에서만 (OS 설정 무시)'],
        ['그래픽', '16px 도트. GPT 생성 원본 시트를 도구로 잘라 씀 (잘린 그림 1,726장)'],
        ['글꼴', 'Jua (제목) · Gowun Dodum (본문), 둘 다 OFL'],
    ]))
    s.append(shot('mn_home.png', '홈 탭: 뽑기 · 규모 확장 · 배치 · 오늘 미션이 한 페이지에'))

    s.append('<h2>2. 화면 · UI</h2>')
    s.append('<h3>정보 줄 (위)</h3><p>동물원 이름 · 돈 · 코인(뽑기 게이지) · 분당 수입 · 계절/날짜/시계 · 라이벌 VS(평판 하트 ❤️/💔 · 라이벌 이름 · 컨디션 😴🙂🔥 · 남은 날) · 확대/축소/전체 · 설정. 좁은 화면에서는 덜 중요한 것부터 줄인다.</p>')
    s.append('<h3>오른쪽 패널: 탭 5개</h3>')
    s.append(table(['탭', '안에 있는 것'], [
        ['홈', '캡슐 뽑기(1회 · 10회 · 확률 보기) · 규모 확장(조건 막대 · 손님 정원 · 공사비, 밤에만) · 배치(기다리는 동물 · 빈 칸 채우기 · 최대 수익 배치 · 놓지 않은 우리) · 오늘 미션 · 계절 안내'],
        ['동물원', '부지(우리 조각 놓기) · 시설(관객 건물 12종) · 꾸미기(계절 소품 · 울타리/입구 단계)'],
        ['카드', '동물(보관함 · 합성) · 직원 · 우리'],
        ['운영', '업그레이드(동물원 · 줍기/피버 · 뽑기 · 운영 4묶음) · 직원 배치 · 돈(수입/지출 내역)'],
        ['기록', '미션 · 도감 · 신전(올림푸스) · 시너지 · 라이벌'],
    ]))
    s.append('<p>패널을 접으면 탭 아이콘 줄만 남고, 필드 왼쪽 위에 <b>미션 칩</b>("미션 2/3")이 뜬다. 필드는 드래그로 이동, 휠/두 손가락으로 확대, "전체"로 한눈에.</p>')
    s.append('<div class="two"><div>' + shot('mn_name.png', '처음 시작: 동물원 이름 (8자, 추천 · 랜덤)') + '</div><div>' + shot('mn_closed.png', '패널 접힘: 미션 칩') + '</div></div>')

    s.append('<h2>3. 하루 · 두 재화</h2>')
    d = b['day']
    s.append(table(['단계', '내용'], [
        ['낮', f'{d["dayLen"]}초 (마지막 {d["duskLen"]}초는 저녁). 손님이 입장해 관객 길을 걷고, 우리 앞에서 멈춰 구경하며 동전을 떨어뜨린다'],
        ['정산', '입장료 수입 − 직원 월급 − 우리 유지비 − 사료비 − 냉난방비 − 시설 유지비. 남은 동전은 관리인이 일부 회수'],
        ['밤', '시간 제한 없음. 뽑기 · 배치 · 합성 · 공사 · 규모 확장. "개장하기"로 다음 날'],
    ]))
    s.append(table(['재화', '얻는 곳', '쓰는 곳'], [
        ['돈', '입장료 (손님이 들어올 때 자동)', '업그레이드 · 시설 · 규모 확장 공사비 · 월급 · 유지비 (모자라면 빚 → 3일이면 직원 파업)'],
        ['코인', '바닥 동전 (손으로 쓸어 담기) · 피버 동전 비', '캡슐 뽑기 전용'],
        ['뽑기권', '행운의 동전 · 미션 · 시즌 승리', '뽑기 1회'],
    ]))
    s.append('<h3>손님 · 정원 · 동전</h3>')
    s.append(table(['규칙', '값'], [
        ['손님 수요 (분당)', f'{V["basePerMin"]} + 매력도 × {V["perAttract"]} (× 손님 배율)'],
        ['손님 정원 (분당 최대 입장)', f'부지 칸 수 × {V["capPerCell"]} × 입장 게이트(+%) × (1 + 화장실) × (1 + 포세이마). <b>동물원을 넓혀야 손님이 는다</b>'],
        ['인기 보너스', f'수요가 정원을 넘으면 투척액 × (1 + {V["overflowK"]} × log2(수요/정원)), 최대 ×{V["overflowMaxMul"]}'],
        ['투척액', f'{V["tipMin"]}~{V["tipMax"]} × 관객의 질 × 단계 배율 × 인기 보너스 × 직원·시설·신 효과. 코인 = 투척액 × {V["tokenShare"]}'],
        ['행운의 동전', f'{pct(V["luckyChance"], 1)} (주우면 뽑기권)'],
        ['콤보', '1.2초 안에 계속 주우면 이어지고, 끝나면 보너스 (최대 +50%)'],
        ['피버 타임', f'손으로 동전 {V["fever"]["need"]}개(콤보면 더 빨리) → {V["fever"]["sec"]}초 동안 동전 ×{V["fever"]["coinMul"]}, 하늘에서 동전 비 ({V["fever"]["rainEvery"]}초마다). 게이지만 표시'],
    ]))

    s.append('<h2>4. 캡슐 뽑기</h2>')
    dk = b['drawKind']
    s.append(f'<p>뽑기는 하나로 합쳤다. 코인을 넣고 손잡이를 돌리면 <b>동물 {pct(dk["animal"])} · 직원 {pct(dk["staff"])} · 우리 {pct(dk["pen"])}</b>, 나온 것 안에서 등급을 굴린다. 기계 색은 매번 무작위(계절 기계는 지금 계절, 가끔 은 · 금 · 무지개).</p>')
    s.append(table(['등급', '확률', '기본 매력'], [[x['name'], pct(x['chance']), x['attract']] for x in g]))
    s.append(table(['기계', '확률', '희귀 이상 운', '반짝이'], [[m['name'], pct(m['chance'], 1), f'+{pct(m["luck"])}p', f'×{m["shiny"]}'] for m in b['machineTiers']]))
    s.append(table(['단계'] + [str(i + 1) for i in range(len(b['gacha']['price']))], [['1회 가격 (코인)'] + [fmt(x) for x in b['gacha']['price']]]))
    s.append(f'<ul><li>계절 한정 동물: 그 계절 기계에서 고급 이상이 나오면 {pct(se["fx"]["limitedShare"])}(계절 픽업 업그레이드로 최대 35%) 확률로 한정 풀에서</li><li>반짝이: 기본 1% (반짝이 연구로 최대 2%), 매력 · 규모 ×1.5</li><li>기계 정비 업그레이드: 특별 기계 확률 ×1~2.5 (마지막 단계는 별 2개부터) · 별 4개: 무지개 +0.5%p</li><li>연출: 기계 조립(몸통 · 돔 · 손잡이 4각도 · 출구 뚜껑) → 흔들림 → 덜컹 → 캡슐 → 등급 빛기둥 · 컷인. 결과에 직원/우리가 섞이면 기계가 바뀐다</li></ul>')

    s.append('<h2>5. 올림푸스 12지신 · 신화 영웅 (네임드)</h2>')
    s.append(f'<p>올림푸스 신 × 12지 동물. 12지의 계절 배치(봄 寅卯辰 · 여름 巳午未 · 가을 申酉戌 · 겨울 亥子丑)대로 계절마다 3신, <b>그 계절 기계에서만</b> 나온다. 전시(우리에 배치)해야 능력이 켜진다. 등급 표시는 "신화" (매력 · 규모는 전설 × {nm["attractMul"]}).</p>')
    seas = {x['key']: x['icon'] + x['name'] for x in se['seasons']}
    s.append(table(['계절', '이름 · 칭호', '신 × 띠', '능력 (일반 / 각성)'], [[seas[x['season']], f'<b>{e(x["name"])}</b> · {e(x["title"])}', f'{e(x["god"])} × {e(x["zodiac"])}', f'{e(x["descNormal"])}<br><small>각성: {e(x["descAwake"])}</small>'] for x in ol['gods']]))
    s.append(table(['이름 · 칭호', '직원 종류', '능력 (일반 / 각성)'], [[f'<b>{e(x["name"])}</b> · {e(x["title"])}', e(next(y['name'] for y in st['staff'] if y['kind'] == x['staff'])), f'{e(x["descNormal"])}<br><small>각성: {e(x["descAwake"])}</small>'] for x in ol['heroes']]))
    s.append(table(['규칙', '값'], [
        ['신 확률', f'동물이 나올 때 {pct(nm["god"], 1)} × 기계 배율 (금빛 ×{nm["machineMul"][2]:g} · 무지개 ×{nm["machineMul"][3]:g}). 한 판(약 150분)에 2~3번'],
        ['영웅 확률', f'직원이 나올 때 {pct(nm["hero"])} × 기계 배율'],
        ['각성', f'네임드가 나올 때 {pct(nm["awake"])}: 전용 각성 그림 · 무지개 후광 · 능력 ×{nm["awakeMul"]} · 컷인 한 번 더'],
        ['중복', f'코인 = 뽑기 가격 × {nm["dupDraws"]}. 일반을 가진 채 각성이 나오면 각성으로 바뀜'],
        ['신전', '기록 탭. 받침대 12 + 영웅 6: 실루엣 → 만남 → 각성(금빛). <b>폐원해도 남는다</b>'],
        ['올림푸스 완성', f'12신을 모두 만나면 손님 +{pct(nm["templeVisitors"])} · 입구가 신전(대리석 매표소 · 월계관 깃발 · 올리브 기둥)으로'],
        ['확정 없음', '네임드를 확정으로 주는 보상은 없다'],
    ]))
    s.append('<div class="two"><div>' + shot('oly_reveal.png', '신화 컷인 (각성)') + '</div><div>' + shot('gate_temple_zoom.png', '올림푸스 완성: 신전 입구 (명판에 동물원 이름)') + '</div></div>')
    s.append(shot('oly_temple.png', '필드의 신 · 영웅 (이름표 · 구름 받침) / 기록 → 신전'))

    s.append('<h2>6. 동물 · 우리 · 합성 · 시너지</h2>')
    s.append(table(['항목', '내용'], [
        ['동물', f'{len(an["animals"])}종 (서식지 6: 풀밭 · 사막 · 물가 · 설원 · 바위산 · 구름, 계절 한정 포함). 영웅 · 전설은 크게 다시 그린 그림'],
        ['우리 조각', f'{len(pc["pieces"])}종 (모양 · 등급 · 서식지 · 특수옵션). 부지 격자에 끼워 넣는다. 칸 수만큼 동물이 들어감'],
        ['합성', '같은 등급 동물 여러 장 → 확률로 다음 등급 (10장이면 확정)'],
        ['시너지', f'조합 세트 {len(syn["sets"])}종 · 서식지 단계 · 같은 종 · 등급 무지개/동급 · 왕의 무리 · 계절. 처음 발동하면 도감에 기록'],
        ['도감', f'세트 {len(dex)}종 완성 보상'],
    ]))

    s.append('<h2>7. 규모 확장 · 별 등급</h2>')
    rows = []
    for i, name in enumerate(b['stageNames']):
        w, h = pc['board'][min(i, len(pc['board']) - 1)]
        req = b['stageReq'][i - 1] if i > 0 else None
        rows.append([f'{i + 1}. {name}', f'{w}×{h}', fmt(w * h * V['capPerCell']), f'전시 {req[0]} · 매력 {fmt(req[1])}' if req else '처음', fmt(b['expandCost'][i - 1]) if i > 0 else '-'])
    w, h = pc['board'][-1]
    rows.append(['특별 확장 (별 3개)', f'{w}×{h}', fmt(w * h * V['capPerCell']), '세계 동물원 + ★3', fmt(b['expandCost'][-1])])
    s.append('<p>승급 = 부지 확장. 조건(전시 동물 수 · 총 매력도)을 채우고 <b>밤에</b> 공사비(돈)를 내면 다음 단계. 확장할 때마다 일반 우리 하나를 선물, 단계 배율(투척액 ×1.12/단계)이 오른다.</p>')
    s.append(table(['단계', '부지', '기본 정원(명/분)', '조건', '공사비'], rows))
    stars = b['starNeed']
    s.append('<h3>별 등급 (1년 = 4시즌, 겨울을 이기면 평가)</h3>')
    s.append('<p>규모(라이벌 대비) · 도감 · 손님 만족 · 꾸밈 · 특별함 5항목 × 20점. 별은 <b>올라가기만</b> 한다.</p>')
    s.append(table(['별', '필요 점수', '보상'], [
        ['★1', stars[0], '입구 간판에 별 · 손님 +5%'], ['★2', stars[1], '기계 정비 마지막 단계'], ['★3', stars[2], '특별 확장 24×6'], ['★4', stars[3], '무지개 기계 +0.5%p'], ['★5', stars[4], '손님 +15% · 황금 별 간판']]))
    s.append(shot('se_year.png', '올해의 동물원 평가'))

    s.append('<h2>8. 시설 · 업그레이드 · 직원</h2>')
    s.append(f'<p>관객 건물 12종 × 5단계. 입구 양옆으로 어깨를 맞대고 늘어선다. 단계 효과 = 3단계 값 × 단계/3, 4 · 5단계는 단계마다 +15% (그림은 3단계 + 별). 짓는 값 = 뽑기 가격 × 시설 값 × 단계 배율 {f["lvPrice"]}.</p>')
    s.append(table(['시설', '3단계 효과'], [[e(x['name']), e(x['descMax'])] for x in f['facilities']]))
    grp = dict(u['groups'])
    s.append(table(['묶음', '업그레이드', '단계 · 효과'], [[e(grp.get(x.get('group'), '숨김')), e(x['name']), e(' → '.join(dict.fromkeys([x['descByLevel'][0], x['descByLevel'][-1]])))] for x in u['upgrades'] if x.get('group') != 'hidden']))
    s.append(table(['직원', '효과 (일반 → 전설)'], [[e(x['name']), e(x['descByGrade'][0] + ' → ' + x['descByGrade'][-1])] for x in st['staff']]))
    s.append(f'<p>직원 특수옵션 {len(st["opts"])}종 (등급이 높을수록 많이): {e(", ".join(o["name"] for o in st["opts"]))}. 월급은 등급 · 단계 비용 단위에 따라.</p>')

    s.append('<h2>9. 라이벌 · 평판 하트 · 막판 대목</h2>')
    s.append('<p><b>실력보다 운</b>: 운이 좋으면 쉽게, 나쁘면 질 수도 있다. 시즌(7일) 마지막 날 밤 동물원 규모를 라이벌과 비교한다.</p>')
    s.append(table(['컨디션', '확률', '라이벌 규모', '승률 목표 (봇)'], [[c['icon'] + ' ' + c['name'], pct(c['chance']), f'×{c["mul"]}', t] for c, t in zip(lk['rivalCond'], ['80%', '60%', '35%'])]))
    s.append(f'<ul><li>1시즌은 항상 부진(배우는 시즌). 아테나가는 절호조 확률을 보통으로 옮긴다</li><li>라이벌 소식: 2일째부터 아침마다 {pct(lk["rivalEventChance"])} 확률 — ' + e(' / '.join(f'{x["text"]} ({"+" if x["mul"] > 1 else "−"}{abs(x["mul"] - 1) * 100:.0f}%)' for x in lk['rivalEvents'])) + '</li>')
    s.append('<li>라이벌 목표 규모: ' + ', '.join(fmt(x) for x in rv['scaleTarget']) + f' → 그 뒤 시즌마다 ×{rv["scaleGrowth"]}. 시즌 안에서 목표의 80% → 100%로 자란다</li></ul>')
    ls = lk['lastStand']
    s.append(table(['상황', '결과'], [
        ['이김', f'마지막 날 입장료 × {rv["season"]["winDays"]} + 뽑기권 {rv["season"]["winTickets"]} (1주년이면 더) · 평판 하트 회복'],
        ['처음 짐 (하트 ❤️)', '하트가 깨진다(💔). 보상 없이 다음 시즌 = <b>최후의 기회</b>'],
        ['최후의 기회 마지막 날, 지고 있으면', f'<b>막판 대목</b>: 피버 게이지 ×{ls["feverCharge"]:g} · 동전 비 ×{ls["rain"]:g} · 손으로 주운 동전마다 응원 점수(목표 × {ls["cheerPerCoin"]}, 피버 중 2배, 최대 목표의 {pct(ls["cheerMax"])}) → 규모에 더함. 아레호가 더 강하게'],
        ['최후의 기회에서 또 짐', '폐원'],
    ]))
    s.append('<div class="two"><div>' + shot('se_vs.png', '시즌 결과: 색을 바꾼 라이벌 아치') + '</div><div>' + shot('oly_survive.png', '처음 진 시즌: 하트가 깨지고 최후의 기회') + '</div></div>')

    s.append('<h2>10. 폐원 · 데려가기</h2>')
    c = lk['carry']
    s.append(table(['규칙', '값'], [
        ['남는 것', '도감 · 기록 · 올림푸스 신전 · 동물원 이름'],
        ['처음부터', '돈 · 코인 · 우리 · 건물 · 업그레이드 · 별'],
        ['동물 칸', f'{c["base"]}칸 + 지나온 시즌 {c["perSeasons"]}번마다 1칸 (최대 {c["max"]}칸). 직접 고른다'],
        ['칸 비용', f'일반 {c["grade"][0]} · 고급 {c["grade"][1]} · 희귀 {c["grade"][2]} · 영웅 {c["grade"][3]} · 전설 {c["grade"][4]} · 신화 {c["named"]} · 반짝이 +{c["shiny"]}'],
        ['직원', '따로 1명 (네임드 영웅도 가능). 새 동물원 첫 슬롯에 바로 배치'],
    ]))
    s.append(shot('oly_closure.png', '폐원: 데려갈 동물 · 직원 고르기'))

    s.append('<h2>11. 이벤트 · 사고 · 미션 · 입구</h2>')
    s.append(f'<p>이벤트 {len(ev)}종 (계절 이벤트 포함): {e(", ".join(x["name"] for x in ev))}. 손님 수 · 투척액 · 서식지 매력 · VIP · 비/눈 연출이 바뀌고, 손님 행동(사진 · 환호 · 실망)이 따라간다.</p>')
    s.append('<p>사고: 하루 60% 확률로 소매치기(경비원이 막음) 또는 동물 감기(수의사 · 동물병원이 막음). 미션: 하루 3개(손님 · 줍기 · 수입 · 먹이), 다 하면 뽑기권 보너스.</p>')
    s.append('<p>입구: 가운데에서 손님이 들어와 좌우로 구경하고 다시 가운데로 나간다. 울타리/입구 꾸미기 4단계 + 계절 장식, 지붕 간판에 동물원 이름과 별. 올림푸스를 완성하면 신전 입구.</p>')

    s.append('<h2>12. 밸런스 (시뮬레이션 봇)</h2>')
    s.append('<p>봇이 뽑기 · 합성 · 최대 수익 배치 · 업그레이드 · 시설 · 확장을 하고 바닥 동전의 70%를 손으로 줍는다고 가정. <code>SIM=economy npm run sim</code></p>')
    s.append(table(['지표', '목표', '결과 (봇 4~8판)'], [
        ['세계 동물원 도달', '2~3시간', '124~152분'],
        ['90분 보유 돈', '다음 확장비의 1~2배 이하', '12만~23만 (다음 확장 18만)'],
        ['운별 승률 (부진 / 보통 / 절호조)', '80 / 60 / 35%', '100 / 62 / 40%'],
        ['최후의 기회 승률', '기회는 주되 보장 안 함', '67% (9번 중 6번)'],
        ['170분 안에 폐원', '-', '8판 중 3판'],
    ]))
    s.append('<div class="warn">운 좋을 때 승률이 100%로 목표보다 높다. 사람은 봇보다 덜 최적이라 실제로는 낮을 수 있어 그대로 둠. 플레이 테스트 후 부진 배율로 조정.</div>')

    s.append('<h2>13. 그래픽 · 남은 작업</h2>')
    s.append('<p>원본 시트(마젠타 배경)를 <code>tools/slice_v2.py</code>로 잘라 <code>assets/sprites16</code>에 1,726장. 동물 300종 · 큰 영웅/전설 · 손님 계절 옷/자세/VIP · 직원 걷기/일 · 관객 건물 12종 × 3단계 · 입구 4단계 + 부속 · 계절 장식 · 뽑기 기계 부품 · 캡슐 · 카드 · 효과 · 날씨 · UI 아이콘 · 올림푸스 12신(일반/각성/초상) · 영웅 6(걷기/각성/초상) · 신전 소품 · 신전 입구 세트.</p>')
    s.append(table(['남은 작업', '내용'], [
        ['Unity 이식', '별도 계획서 · 명령서 (규칙 → 필드 시뮬 → 저장 → 화면 → 연출 → 소리 → Steam)'],
        ['소리', '효과음을 코드 합성에서 녹음 파일로 · 배경음악 · 신화 컷인/하트/막판 대목 전용 소리'],
        ['튜토리얼', '하트 · 라이벌 컨디션 · 신전 · 데려가기 첫 안내'],
        ['후반 돈 쓸 곳', '꾸밈 단계 확장 등 (다 지은 뒤 돈이 쌓임)'],
        ['네임드 행동', '손님이 신 앞에 모여 사진 찍기'],
        ['Steam', '설정(키 · 음량 분리 · 글자 크기), 번역(영어), 업적 · 클라우드 저장'],
        ['플레이 테스트', '운 승률 · 최후의 기회 · 폐원 빈도를 사람 기준으로 다시 조정'],
    ]))
    toc = ['개요', '화면 · UI', '하루 · 두 재화', '캡슐 뽑기', '올림푸스 12지신 · 신화 영웅', '동물 · 우리 · 합성 · 시너지', '규모 확장 · 별 등급', '시설 · 업그레이드 · 직원', '라이벌 · 평판 하트 · 막판 대목', '폐원 · 데려가기', '이벤트 · 사고 · 미션 · 입구', '밸런스', '그래픽 · 남은 작업']
    return page('뽑ZOO', '동전을 주워 캡슐을 돌리고, 계절마다 라이벌과 겨루는 픽셀 아트 동물원', '기획서 v0.5 · 2026년 11월 8일 · 현재 빌드 기준<br>v0.4 이후: 뽑기 통합 · 두 재화 · 규모 확장 · 별 등급 · 홈 탭 · 동물원 이름 · 손님 정원 · 시설 5단계 · 올림푸스 12지신 · 신화 영웅 · 평판 하트 · 라이벌 운 · 막판 대목 · 폐원 데려가기 · 신전 입구', toc, ''.join(s))


# ══════════════════════ 2. Unity 이식 · 화면 구성 계획 ══════════════════════
def unity():
    s = []
    s.append('<h2>1. 목표 · 원칙</h2>')
    s.append(table(['항목', '결정'], [
        ['엔진', 'Unity 2022.3 LTS (또는 6000 LTS), 2D URP, C# 9'],
        ['목표 플랫폼', 'Steam (Windows 우선 · macOS) → 폰 가로는 나중'],
        ['기준', '웹판이 정답. 규칙은 <b>숫자 하나 안 바꾸고</b> 옮기고, 씨앗 난수로 웹판과 결과를 대조해 증명'],
        ['구조', '규칙(순수 C#, UnityEngine 없음) ↔ 화면(MonoBehaviour)을 완전히 분리. 규칙은 Unity 없이 테스트'],
        ['데이터', '밸런스 숫자는 전부 JSON (웹판에서 내보내기). 코드에 숫자를 박지 않는다'],
        ['연출', '기본값 전부 켜짐 · 줄이기는 설정에서만'],
    ]))
    s.append('<h2 class="same">2. 지금 키트 상태</h2>')
    s.append(table(['부분', '상태'], [
        ['데이터 JSON 16개 · 그림 1,726장 · 목록', '<span class="done">완료</span>'],
        ['뽑기 (네임드 · 각성 · 중복 · 신 능력)', '<span class="done">완료 · 웹판 대조</span>'],
        ['올림푸스 능력 · 신전 / 라이벌 운 · 하트 · 막판 대목 / 폐원 데려가기', '<span class="done">완료 · 웹판 대조</span>'],
        ['규모 확장 · 별 계산', '<span class="done">핵심만</span>'],
        ['저장 데이터 (웹판 저장 JSON 그대로 읽음)', '<span class="done">키트가 쓰는 필드</span>'],
        ['대조 테스트 (unity/Tests, .NET 8)', '<span class="done">22,916개 항목 통과</span>'],
        ['나머지 규칙 · 필드 · 화면 · 연출 · 소리 · Steam', '<span class="todo">이 계획서</span>'],
    ]))

    s.append('<h2>3. 구조 (어셈블리)</h2>')
    s.append(table(['어셈블리 (asmdef)', '내용', 'UnityEngine'], [
        ['<code>BbopZoo.Core</code>', 'Data(JSON 모델) · Rules(웹판 rules.ts) · Save · Olympus · RivalLuck · Carry', '쓰지 않음'],
        ['<code>BbopZoo.Sim</code>', 'World: 하루 흐름 · 손님 · 동물 · 직원 · 동전 · 콤보 · 피버 · 이벤트 · 사고 (웹판 world.ts). 고정 dt로 진행, 이벤트 큐로 화면에 알림', '쓰지 않음'],
        ['<code>BbopZoo.View</code>', '필드 그리기 · 카메라 · 입력 · 연출 · 소리', '씀'],
        ['<code>BbopZoo.UI</code>', 'UI Toolkit 화면 (정보 줄 · 패널 · 창)', '씀'],
        ['<code>BbopZoo.Editor</code>', '그림 가져오기 설정 · 데이터 다시 읽기 메뉴', 'Editor'],
        ['<code>BbopZoo.Tests</code>', 'Unity Test Framework (EditMode) + 웹판 대조 fixtures', '-'],
    ]))
    s.append('<div class="flow">입력(클릭 · 드래그) → View가 Sim/Rules 호출 → Sim이 상태 변경 + 이벤트(WorldEvent) 발행 → View/UI가 이벤트를 받아 연출 · 소리 · 화면 갱신</div>')

    s.append('<h2>4. 단계별 계획</h2>')
    phases = [
        ('P1. 나머지 규칙', 'rules.ts 남은 함수 전부', [
            '부지 · 우리: penCells · canPlacePen · placePen · removePen · autoArrangePens · boardGrid · capOfCells · totalCap',
            '배치: placeAnimal · unplace · autoPlace · optimizePlacement · placedSet',
            '매력: penSets · penTheme · penDetail · penAttract · totalAttract · 시너지 발견 · 도감 보너스',
            '합성: fusionChance · fusionCandidates · autoFusionPick · fuse · 우리 합성',
            '직원: staffDraw · fireStaff · staffPay · assignStaff · staffSum · optSum · 효과 함수들',
            '시설 · 꾸미기: facPrice · buyFacility · 소품 배치 · penItemBonus',
            '업그레이드 · 비용: upgradeCost · buyUpgrade · dailyCosts · zooScale · visitorMul · staffTipMul',
            '미션 · 도감 · 1년 평가 · 자리 비움 수익 · 확장(promote) 전체'],
          '함수마다 웹판 fixture (씨앗 난수 · 여러 저장 상태)와 C# 결과 일치'),
        ('P2. 필드 시뮬레이션', 'world.ts', [
            '하루: 낮 180초 · 저녁 · 밤, 개장 · 정산 리포트(DayReport)',
            '손님: 수요 · 정원 · 입장 · 걷기 · 우리 앞 자세(구경 · 환호 · 사진 · 간식 · 실망) · 투척',
            '동전: 떨어짐 · 합쳐짐 · 수명 · 줍기(손 · 직원) · 콤보 · 피버 · 행운의 동전',
            '동물 행동(자기 · 먹기 · 놀기 · 첨벙 · 떨기) · 직원 AI · 이벤트 · 사고 · 라이벌 소식 · 막판 대목'],
          '같은 씨앗 · 같은 입력(줍기 좌표 기록)으로 3일 돌렸을 때 DayReport가 웹판과 일치 · 경제 봇(tools/sim) C# 이식 결과가 웹판 범위 안'),
        ('P3. 저장', 'state.ts · savecode.ts', [
            'JSON 저장(같은 모양) · 옛 저장 고치기(normalize) · 저장 코드 내보내기/가져오기',
            'Steam 클라우드 저장 대비: 파일 하나 · 버전 번호'],
          '웹판 저장 코드를 Unity에서 불러와 같은 화면'),
        ('P4. 필드 화면', 'render/field.ts · sprites.ts', [
            'Pixel Perfect Camera (PPU 16), 드래그 이동 · 휠/핀치 확대 · 전체 보기',
            'Tilemap: 잔디 · 관객 길 · 우리 바닥(서식지 6) · 울타리(꾸미기 4단계) 자동 이음',
            '정렬: y 기준 (SortingGroup). 건물 줄(zoneRow) · 입구(4단계 · 신전) · 소품 · 나무',
            '동물(작은/큰 그림 · 반짝이 · 신 이름표 · 구름 받침) · 손님(계절 옷 · VIP) · 직원(영웅 이름표)',
            '동전 · 떠오르는 글자 · 감정 아이콘 · 날씨(비 · 눈) · 계절 색 · 피버 화면 효과'],
          '같은 저장을 웹판과 Unity에서 띄운 스크린샷 비교 (배치 · 크기 · 겹침 순서)'),
        ('P5. UI', 'ui/panel.ts · main.ts', [
            '정보 줄 · 오른쪽 패널(탭 5 · 하위 탭) · 패널 접기 · 미션 칩 · 토스트',
            '창: 하루 정산 · 시즌 결과(아치 VS) · 1년 평가 · 하트 깨짐 · 막판 대목 · 폐원(데려가기) · 이름 짓기 · 설정 · 자리 비움 수익',
            '카드 모양(프레임 · 등급 · 신화 테두리) · 확률 보기'],
          '모든 창을 웹판 스크린샷과 나란히 비교'),
        ('P6. 연출', 'ui/reveal.ts · styles.css', [
            '뽑기: 기계 조립 · 손잡이 4각도 · 돔 속 캡슐 · 흔들림 · 덜컹 · 캡슐 통통 · 금 · 펑 · 빛기둥 · 컷인 · 기계 등급 후광 · 직원/우리 기계로 변신',
            '신화 컷인(하늘 갈라짐 · 기둥 · 초상 · 이름) · 각성 무지개',
            '피버 · 하트 깨짐 · 막판 대목 · 확장 · 시즌 결과'],
          '타이밍(ms)을 웹판과 같은 표로 맞춤 · 연출 줄이기 설정'),
        ('P7. 소리', 'ui/audio.ts', ['효과음 목록(현재 코드 합성)을 녹음 파일로 · 배경음악(계절 4 · 밤) · 음량 분리'], '모든 이벤트에 소리 연결 확인'),
        ('P8. Steam', '-', ['Steamworks.NET · 업적 · 클라우드 저장 · 해상도/전체화면 · 키 설정 · 영어 번역 · 빌드 파이프라인'], 'Steam 테스트 빌드'),
    ]
    for name, src, items, ok in phases:
        s.append(f'<h3>{e(name)} <small>(웹판: {e(src)})</small></h3><ul>' + ''.join(f'<li>{e(x)}</li>' for x in items) + f'</ul><div class="note">완료 기준: {e(ok)}</div>')

    s.append('<h2>5. 화면 구성</h2>')
    s.append('<p>기준 해상도 1920×1080 (PC), 최소 1280×720. 필드는 픽셀 정수 배율, UI는 따로 크기 조절(글자 크기 설정). 레이아웃은 웹판과 같다.</p>')
    s.append(table(['영역', '구성'], [
        ['정보 줄 (위, 높이 ~64)', '동물원 이름 · 돈 · 코인(+뽑기 게이지) · 분당 수입 · 날짜/시계 막대 · 라이벌 칩(하트 · 이름 · 컨디션 · 규모 막대 · 막판 대목) · 확대/축소/전체 · 설정'],
        ['필드 (가운데)', '바깥 숲 → 담장 · 입구 → 관객 길 · 건물 줄 → 부지(우리). 개장 버튼은 밤에 필드 아래 가운데'],
        ['오른쪽 패널 (폭 ~400)', '탭 5(홈 · 동물원 · 카드 · 운영 · 기록) + 하위 탭. 접으면 아이콘 줄(폭 ~56)'],
        ['미션 칩', '패널이 접혔을 때 필드 왼쪽 위'],
        ['창 (가운데 오버레이)', '정산 · 시즌 · 평가 · 하트 · 막판 대목 · 폐원 · 이름 · 설정 · 뽑기 결과'],
        ['토스트', '필드 위 가운데, 순서대로 쌓임'],
    ]))
    s.append(table(['탭 / 하위', '요소'], [
        ['홈', '캡슐 뽑기 상자 · 규모 확장 상자 · 배치 상자 · 오늘 미션 상자 · 계절 띠'],
        ['동물원 / 부지 · 시설 · 꾸미기', '부지 격자(우리 조각 끌어 놓기 · 돌리기) / 시설 12종 줄(단계 점 · 값) / 계절 소품 · 울타리 단계'],
        ['카드 / 동물 · 직원 · 우리', '보관함(정렬 · 잠금) · 합성 모드 / 직원 카드(옵션 · 월급 · 해고) / 우리 카드(합성)'],
        ['운영 / 업그레이드 · 직원 배치 · 돈', '4묶음 칩 · 단계 · 값 · 잠김 조건 / 슬롯 / 수입 · 지출'],
        ['기록 / 미션 · 도감 · 신전 · 시너지 · 라이벌', '미션 목록 / 도감 세트 / 받침대 12 + 영웅 6 / 시너지 목록 / 라이벌 기록'],
    ]))
    s.append(shot('mn_home.png', '참고: 웹판 화면 (정보 줄 · 필드 · 오른쪽 패널 홈 탭)'))

    s.append('<h2>6. 검증 · 위험</h2>')
    s.append(table(['검증', '방법'], [
        ['규칙', '웹판 fixture 대조 (지금 방식 확장). 웹판 규칙을 바꾸면 fixture를 다시 뽑고 C#이 따라오는지 CI에서 확인'],
        ['경제', '시뮬레이션 봇을 C#으로 옮겨 웹판과 같은 지표(도달 시간 · 보유 돈 · 승률) 비교'],
        ['화면', '같은 저장으로 웹판/Unity 스크린샷 비교'],
    ]))
    s.append(table(['위험 · 결정', '제안'], [
        ['UI Toolkit vs uGUI', 'UI Toolkit (탭 · 목록이 많은 화면에 유리). 픽셀 글꼴은 Jua · Gowun Dodum(OFL) 그대로'],
        ['연출 도구', 'DOTween(무료판) 또는 직접 만든 시퀀서. 웹판 WAAPI 타이밍 표를 그대로 옮김'],
        ['효과음', '지금은 코드로 합성 → 녹음 파일 제작 필요 (외주 또는 생성)'],
        ['그림 정렬', '웹판은 캔버스에 직접 그림 → Unity는 SpriteRenderer + SortingGroup. 기준점(발밑 가운데)을 sprites.json으로 통일'],
        ['범위', 'P1~P3(규칙 · 시뮬 · 저장)을 먼저 끝내고 화면으로. 규칙이 흔들리면 화면이 계속 고쳐진다'],
    ]))
    toc = ['목표 · 원칙', '지금 키트 상태', '구조 (어셈블리)', '단계별 계획 P1~P8', '화면 구성', '검증 · 위험']
    return page('뽑ZOO → Unity', '이식 계획 · 화면 구성', 'v1 · 2026년 11월 8일 · 작업 명령서: docs/briefs/unity-port-brief.md', toc, ''.join(s))


def render(name, doc):
    h = OUT / f'{name}.html'
    h.write_text(doc)
    js = f"""const {{ chromium }} = require('playwright');
(async () => {{ const b = await chromium.launch(); const p = await b.newPage(); await p.goto('file://{h}'); await p.waitForTimeout(800);
await p.pdf({{ path: '{OUT / (name + ".pdf")}', format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>',
footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#8a5a3b"><span class="pageNumber"></span> / <span class="totalPages"></span></div>', margin: {{ top: '16mm', bottom: '18mm', left: '15mm', right: '15mm' }} }});
await b.close(); }})();"""
    subprocess.run(['node', '-e', js], check=True)
    h.unlink()
    print('PDF', OUT / f'{name}.pdf')


render('bbopzoo_gdd_v0.5', gdd())
render('bbopzoo_unity_plan_v1', unity())
