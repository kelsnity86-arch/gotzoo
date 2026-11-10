# BbopZOO 동물 카드 목록 (등급별)

뽑ZOO(BbopZOO) 게임의 동물 카드 전체 목록이다. 게임 데이터(src/data/animals.ts)에서 그대로 뽑았다. GPT 등 다른 도구가 읽고 그림 명령서 · 기획 · 밸런스 검토에 쓰기 위한 문서.

## 읽는 법

- 등급 5단계: 일반(common) → 고급(uncommon) → 희귀(rare) → 영웅(epic) → 전설(legend). 뽑기에서 높은 등급일수록 드물고, 동물원 매력이 높다.
- 각 줄: `번호 | 한국어 이름 | 영어 이름 | 서식지 | 계절`
- 서식지: 동물이 사는 우리 바닥 종류 (풀밭 · 사막 · 물 · 눈 · 바위산 · 하늘). 같은 서식지 우리에 넣으면 보너스.
- 계절: 비어 있으면 상시 동물(언제나 뽑힘). 계절이 적혀 있으면 계절 한정(그 계절 뽑기 기계에서만 나옴).
- 번호는 게임 안 동물 번호(0~299). 그림 파일 이름(animal_000 등)과 같다.
- 별도로 "네임드(신)" 카드 12종이 있다. 맨 아래 표 참고.

## 등급 요약

| 등급 | 영어 | 뽑기 확률(동물 카드 중) | 기본 매력 | 상시 | 계절 한정 | 합계 |
|---|---|---|---|---|---|---|
| 일반 | common | 60% | 20 | 80 | 0 | 80 |
| 고급 | uncommon | 25% | 32 | 65 | 17 | 82 |
| 희귀 | rare | 10% | 55 | 55 | 16 | 71 |
| 영웅 | epic | 4% | 90 | 32 | 9 | 41 |
| 전설 | legend | 1% | 140 | 18 | 8 | 26 |
| 합계 | | | | 250 | 50 | 300 |

## 일반 (common) · 80종

```
000 | 토끼 | rabbit | 풀밭 grass | 상시
001 | 오리 | duck | 물 water | 상시
002 | 닭 | chicken | 풀밭 grass | 상시
003 | 병아리 | baby chick | 풀밭 grass | 상시
004 | 햄스터 | hamster | 풀밭 grass | 상시
005 | 다람쥐 | squirrel | 풀밭 grass | 상시
006 | 생쥐 | mouse | 풀밭 grass | 상시
007 | 고양이 | cat | 풀밭 grass | 상시
008 | 강아지 | puppy | 풀밭 grass | 상시
009 | 비둘기 | pigeon | 풀밭 grass | 상시
010 | 참새 | sparrow | 풀밭 grass | 상시
011 | 개구리 | frog | 물 water | 상시
012 | 거북이 | tortoise | 풀밭 grass | 상시
013 | 달팽이 | snail | 풀밭 grass | 상시
014 | 돼지 | pig | 풀밭 grass | 상시
015 | 양 | sheep | 풀밭 grass | 상시
016 | 염소 | goat | 바위산 rock | 상시
017 | 젖소 | dairy cow | 풀밭 grass | 상시
018 | 조랑말 | pony | 풀밭 grass | 상시
019 | 당나귀 | donkey | 풀밭 grass | 상시
020 | 거위 | goose | 물 water | 상시
021 | 칠면조 | turkey | 풀밭 grass | 상시
022 | 기니피그 | guinea pig | 풀밭 grass | 상시
023 | 고슴도치 | hedgehog | 풀밭 grass | 상시
024 | 너구리 | raccoon | 풀밭 grass | 상시
025 | 금붕어 | goldfish | 물 water | 상시
026 | 잉꼬 | budgie parakeet | 풀밭 grass | 상시
027 | 오소리 | badger | 풀밭 grass | 상시
028 | 두더지 | mole | 사막 sand | 상시
029 | 꿀벌 | honeybee | 풀밭 grass | 상시
150 | 메추라기 | quail | 풀밭 grass | 상시
151 | 까치 | magpie | 풀밭 grass | 상시
152 | 까마귀 | crow | 풀밭 grass | 상시
153 | 박쥐 | bat | 바위산 rock | 상시
154 | 무당벌레 | ladybug | 풀밭 grass | 상시
155 | 나비 | butterfly | 풀밭 grass | 상시
156 | 잠자리 | dragonfly | 물 water | 상시
157 | 개미 | ant | 사막 sand | 상시
158 | 가재 | crayfish | 물 water | 상시
159 | 꽃게 | crab | 물 water | 상시
160 | 소라게 | hermit crab | 물 water | 상시
161 | 도롱뇽 | salamander | 물 water | 상시
162 | 도마뱀 | lizard | 사막 sand | 상시
163 | 유혈목이 | garter snake | 풀밭 grass | 상시
164 | 친칠라 | chinchilla | 바위산 rock | 상시
165 | 페럿 | ferret | 풀밭 grass | 상시
166 | 족제비 | weasel | 풀밭 grass | 상시
167 | 롭이어토끼 | lop-eared rabbit | 풀밭 grass | 상시
168 | 고라니 | water deer | 풀밭 grass | 상시
169 | 멧돼지 | wild boar | 풀밭 grass | 상시
170 | 황소 | ox | 풀밭 grass | 상시
171 | 물소 | water buffalo | 물 water | 상시
172 | 말 | horse | 풀밭 grass | 상시
173 | 라마 | llama | 바위산 rock | 상시
174 | 메뚜기 | grasshopper | 풀밭 grass | 상시
175 | 귀뚜라미 | cricket | 풀밭 grass | 상시
176 | 반딧불이 | firefly | 풀밭 grass | 상시
177 | 해파리 | jellyfish | 물 water | 상시
178 | 불가사리 | starfish | 물 water | 상시
179 | 새우 | shrimp | 물 water | 상시
180 | 송사리 | killifish | 물 water | 상시
181 | 메기 | catfish | 물 water | 상시
182 | 갈매기 | seagull | 물 water | 상시
183 | 백로 | egret | 물 water | 상시
184 | 제비 | swallow | 하늘 cloud | 상시
185 | 딱따구리 | woodpecker | 풀밭 grass | 상시
186 | 오목눈이 | long-tailed tit | 눈 snow | 상시
187 | 저빌 | gerbil | 사막 sand | 상시
188 | 도마뱀붙이 | gecko | 사막 sand | 상시
189 | 쇠똥구리 | dung beetle | 사막 sand | 상시
190 | 전갈 | scorpion | 사막 sand | 상시
191 | 북극토끼 | arctic hare | 눈 snow | 상시
192 | 레밍 | lemming | 눈 snow | 상시
193 | 하프물범 새끼 | harp seal pup | 눈 snow | 상시
194 | 산양 | mountain goat | 바위산 rock | 상시
195 | 마멋 | marmot | 바위산 rock | 상시
196 | 우는토끼 | pika | 바위산 rock | 상시
197 | 부엉이 새끼 | baby owlet | 풀밭 grass | 상시
198 | 올빼미나방 | moth | 풀밭 grass | 상시
199 | 청개구리 | tree frog | 물 water | 상시
```

## 고급 (uncommon) · 82종

```
030 | 여우 | red fox | 풀밭 grass | 상시
031 | 펭귄 | penguin | 눈 snow | 상시
032 | 코알라 | koala | 풀밭 grass | 상시
033 | 꽃사슴 | spotted deer | 풀밭 grass | 상시
034 | 알파카 | alpaca | 바위산 rock | 상시
035 | 수달 | river otter | 물 water | 상시
036 | 비버 | beaver | 물 water | 상시
037 | 미어캣 | meerkat | 사막 sand | 상시
038 | 캥거루 | kangaroo | 사막 sand | 상시
039 | 원숭이 | monkey | 풀밭 grass | 상시
040 | 부엉이 | owl | 풀밭 grass | 상시
041 | 마코앵무 | scarlet macaw | 풀밭 grass | 상시
042 | 물범 | harbor seal | 물 water | 상시
043 | 오리너구리 | platypus | 물 water | 상시
044 | 아르마딜로 | armadillo | 사막 sand | 상시
045 | 나무늘보 | sloth | 풀밭 grass | 상시
046 | 스컹크 | skunk | 풀밭 grass | 상시
047 | 늑대 | gray wolf | 눈 snow | 상시
048 | 불곰 | brown bear | 풀밭 grass | 상시
049 | 얼룩말 | zebra | 풀밭 grass | 상시
050 | 낙타 | camel | 사막 sand | 상시
051 | 타조 | ostrich | 사막 sand | 상시
052 | 악어 | crocodile | 물 water | 상시
053 | 하마 | hippo | 물 water | 상시
054 | 개미핥기 | anteater | 풀밭 grass | 상시
055 | 큰부리새 | toucan | 풀밭 grass | 상시
200 | 코요테 | coyote | 사막 sand | 상시
201 | 자칼 | jackal | 사막 sand | 상시
202 | 하이에나 | hyena | 사막 sand | 상시
203 | 바다사자 | sea lion | 물 water | 상시
204 | 해달 | sea otter | 물 water | 상시
205 | 펠리컨 | pelican | 물 water | 상시
206 | 두루미 | red-crowned crane | 물 water | 상시
207 | 황새 | stork | 물 water | 상시
208 | 코카투 | cockatoo | 하늘 cloud | 상시
209 | 왜가리 | heron | 물 water | 상시
210 | 독수리 | vulture | 바위산 rock | 상시
211 | 매 | falcon | 하늘 cloud | 상시
212 | 원앙 | mandarin duck | 물 water | 상시
213 | 백조 | swan | 물 water | 상시
214 | 순록 | reindeer | 눈 snow | 상시
215 | 북극여우 | arctic fox | 눈 snow | 상시
216 | 담비 | marten | 풀밭 grass | 상시
217 | 코아티 | coati | 풀밭 grass | 상시
218 | 웜뱃 | wombat | 풀밭 grass | 상시
219 | 왈라비 | wallaby | 사막 sand | 상시
220 | 슈가글라이더 | sugar glider | 하늘 cloud | 상시
221 | 날다람쥐 | flying squirrel | 하늘 cloud | 상시
222 | 이구아나 | iguana | 사막 sand | 상시
223 | 늑대거북 | snapping turtle | 물 water | 상시
224 | 아홀로틀 | axolotl | 물 water | 상시
225 | 가오리 | stingray | 물 water | 상시
226 | 복어 | pufferfish | 물 water | 상시
227 | 해마 | seahorse | 물 water | 상시
228 | 랍스터 | lobster | 물 water | 상시
229 | 야크 | yak | 눈 snow | 상시
230 | 들소 | bison | 풀밭 grass | 상시
231 | 사향소 | musk ox | 눈 snow | 상시
232 | 호저 | porcupine | 바위산 rock | 상시
233 | 에뮤 | emu | 사막 sand | 상시
234 | 키위새 | kiwi bird | 풀밭 grass | 상시
235 | 뿔도마뱀 | horned lizard | 사막 sand | 상시
236 | 방울뱀 | rattlesnake | 사막 sand | 상시
237 | 목도리도마뱀 | frilled lizard | 사막 sand | 상시
238 | 과일박쥐 | fruit bat | 하늘 cloud | 상시
100 | 꽃토끼 | rabbit wearing a flower crown | 풀밭 grass | 봄 spring
101 | 민들레 햄스터 | dandelion hamster | 풀밭 grass | 봄 spring
102 | 개나리 참새 | forsythia sparrow | 풀밭 grass | 봄 spring
103 | 무지개 송어 | rainbow trout | 물 water | 봄 spring
113 | 수박 거북 | watermelon turtle | 물 water | 여름 summer
114 | 선글라스 물개 | seal with sunglasses | 물 water | 여름 summer
115 | 해바라기 앵무 | sunflower parrot | 풀밭 grass | 여름 summer
116 | 튜브 오리 | duck in a swim ring | 물 water | 여름 summer
125 | 도토리 다람쥐 | acorn squirrel | 풀밭 grass | 가을 autumn
126 | 단풍 너구리 | maple raccoon | 바위산 rock | 가을 autumn
127 | 허수아비 까마귀 | scarecrow crow | 풀밭 grass | 가을 autumn
128 | 버섯 두꺼비 | mushroom toad | 바위산 rock | 가을 autumn
129 | 낙엽 고양이 | leaf pile kitten | 풀밭 grass | 가을 autumn
138 | 털모자 펭귄 | penguin in a knit hat | 눈 snow | 겨울 winter
139 | 눈사람 곰 | snowman bear cub | 눈 snow | 겨울 winter
140 | 목도리 수달 | otter with a scarf | 물 water | 겨울 winter
141 | 눈꽃 토끼 | snowflake rabbit | 눈 snow | 겨울 winter
```

## 희귀 (rare) · 71종

```
056 | 카피바라 | capybara | 물 water | 상시
057 | 레서판다 | red panda | 풀밭 grass | 상시
058 | 플라밍고 | flamingo | 물 water | 상시
059 | 판다 | giant panda | 풀밭 grass | 상시
060 | 기린 | giraffe | 사막 sand | 상시
061 | 코끼리 | elephant | 사막 sand | 상시
062 | 사자 | lion | 사막 sand | 상시
063 | 호랑이 | tiger | 풀밭 grass | 상시
064 | 표범 | leopard | 풀밭 grass | 상시
065 | 치타 | cheetah | 사막 sand | 상시
066 | 고릴라 | gorilla | 풀밭 grass | 상시
067 | 오랑우탄 | orangutan | 풀밭 grass | 상시
068 | 북극곰 | polar bear | 눈 snow | 상시
069 | 코뿔소 | rhino | 사막 sand | 상시
070 | 돌고래 | dolphin | 물 water | 상시
071 | 범고래 | orca | 물 water | 상시
072 | 바다거북 | sea turtle | 물 water | 상시
073 | 문어 | octopus | 물 water | 상시
074 | 카멜레온 | chameleon | 풀밭 grass | 상시
075 | 사막여우 | fennec fox | 사막 sand | 상시
076 | 쿼카 | quokka | 풀밭 grass | 상시
077 | 맥 | tapir | 풀밭 grass | 상시
239 | 무스 | moose | 눈 snow | 상시
240 | 재규어 | jaguar | 풀밭 grass | 상시
241 | 퓨마 | cougar | 바위산 rock | 상시
242 | 스라소니 | lynx | 눈 snow | 상시
243 | 서벌 | serval | 사막 sand | 상시
244 | 카라칼 | caracal | 사막 sand | 상시
245 | 바다코끼리 | walrus | 눈 snow | 상시
246 | 매너티 | manatee | 물 water | 상시
247 | 듀공 | dugong | 물 water | 상시
248 | 귀상어 | hammerhead shark | 물 water | 상시
249 | 쥐가오리 | manta ray | 물 water | 상시
250 | 일각고래 | narwhal | 눈 snow | 상시
251 | 벨루가 | beluga whale | 눈 snow | 상시
252 | 황제펭귄 | emperor penguin | 눈 snow | 상시
253 | 흰올빼미 | snowy owl | 눈 snow | 상시
254 | 큰뿔양 | bighorn sheep | 바위산 rock | 상시
255 | 아이벡스 | ibex | 바위산 rock | 상시
256 | 안데스콘도르 | andean condor | 하늘 cloud | 상시
257 | 화식조 | cassowary | 풀밭 grass | 상시
258 | 안경곰 | spectacled bear | 바위산 rock | 상시
259 | 반달가슴곰 | asiatic black bear | 바위산 rock | 상시
260 | 말레이곰 | sun bear | 풀밭 grass | 상시
261 | 침팬지 | chimpanzee | 풀밭 grass | 상시
262 | 맨드릴 | mandrill | 풀밭 grass | 상시
263 | 알락꼬리여우원숭이 | ring-tailed lemur | 풀밭 grass | 상시
264 | 늘보로리스 | slow loris | 풀밭 grass | 상시
265 | 긴팔원숭이 | gibbon | 풀밭 grass | 상시
266 | 비단뱀 | python | 풀밭 grass | 상시
267 | 갈라파고스땅거북 | galapagos tortoise | 사막 sand | 상시
268 | 아나콘다 | anaconda | 물 water | 상시
269 | 바실리스크도마뱀 | basilisk lizard | 물 water | 상시
270 | 저어새 | spoonbill | 물 water | 상시
271 | 겜스복 | gemsbok | 사막 sand | 상시
104 | 벚꽃사슴 | cherry blossom deer | 풀밭 grass | 봄 spring
105 | 꿀벌 여왕 | queen bee | 풀밭 grass | 봄 spring
106 | 새싹 거북 | sprout turtle | 풀밭 grass | 봄 spring
107 | 봄비 개구리 | rain frog with leaf umbrella | 물 water | 봄 spring
117 | 반딧불 여우 | firefly fox | 풀밭 grass | 여름 summer
118 | 산호 문어 | coral octopus | 물 water | 여름 summer
119 | 서핑 돌고래 | surfing dolphin | 물 water | 여름 summer
120 | 무지개 해파리 | rainbow jellyfish | 물 water | 여름 summer
130 | 호박 고슴도치 | pumpkin hedgehog | 풀밭 grass | 가을 autumn
131 | 은행잎 사슴 | ginkgo deer | 바위산 rock | 가을 autumn
132 | 망토 박쥐 | caped bat | 바위산 rock | 가을 autumn
133 | 갈대 두루미 | reed crane | 물 water | 가을 autumn
142 | 루돌프 순록 | red-nosed reindeer | 눈 snow | 겨울 winter
143 | 얼음 여우 | ice fox | 눈 snow | 겨울 winter
144 | 고드름 고슴도치 | icicle hedgehog | 눈 snow | 겨울 winter
145 | 산타 북극곰 | santa polar bear | 눈 snow | 겨울 winter
```

## 영웅 (epic) · 41종

```
078 | 백호 | white tiger | 눈 snow | 상시
079 | 눈표범 | snow leopard | 눈 snow | 상시
080 | 공작 | peacock | 풀밭 grass | 상시
081 | 흑표범 | black panther | 바위산 rock | 상시
082 | 흰머리수리 | bald eagle | 바위산 rock | 상시
083 | 오카피 | okapi | 풀밭 grass | 상시
084 | 코모도왕도마뱀 | komodo dragon | 사막 sand | 상시
085 | 백사자 | white lion | 사막 sand | 상시
086 | 고래상어 | whale shark | 물 water | 상시
087 | 혹등고래 | humpback whale | 물 water | 상시
088 | 황금원숭이 | golden snub-nosed monkey | 바위산 rock | 상시
089 | 아이아이 | aye-aye | 풀밭 grass | 상시
090 | 천산갑 | pangolin | 사막 sand | 상시
091 | 극락조 | bird of paradise | 풀밭 grass | 상시
272 | 아무르표범 | amur leopard | 눈 snow | 상시
273 | 대왕고래 | blue whale | 물 water | 상시
274 | 백상아리 | great white shark | 물 water | 상시
275 | 대왕오징어 | giant squid | 물 water | 상시
276 | 하피수리 | harpy eagle | 하늘 cloud | 상시
277 | 검독수리 | golden eagle | 바위산 rock | 상시
278 | 흰공작 | white peacock | 풀밭 grass | 상시
279 | 은여우 | silver fox | 눈 snow | 상시
280 | 갈기늑대 | maned wolf | 풀밭 grass | 상시
281 | 실버백고릴라 | silverback gorilla | 풀밭 grass | 상시
282 | 도도새 | dodo | 풀밭 grass | 상시
283 | 매머드 | woolly mammoth | 눈 snow | 상시
284 | 검치호랑이 | saber-toothed cat | 눈 snow | 상시
285 | 털코뿔소 | woolly rhino | 눈 snow | 상시
286 | 주머니늑대 | thylacine | 풀밭 grass | 상시
287 | 모아 | moa | 풀밭 grass | 상시
288 | 알비노악어 | albino alligator | 물 water | 상시
289 | 프르제발스키말 | przewalski horse | 사막 sand | 상시
108 | 벚꽃 여우 | cherry blossom fox | 풀밭 grass | 봄 spring
109 | 장미 공작 | rose peacock | 풀밭 grass | 봄 spring
110 | 은방울 학 | lily crane | 물 water | 봄 spring
121 | 태양 사자 | sun lion | 사막 sand | 여름 summer
122 | 황금 만타 | golden manta | 물 water | 여름 summer
134 | 달토끼 | moon rabbit | 하늘 cloud | 가을 autumn
135 | 유령 고양이 | ghost cat | 바위산 rock | 가을 autumn
146 | 오로라 고래 | aurora whale | 물 water | 겨울 winter
147 | 서리 늑대 | frost wolf | 눈 snow | 겨울 winter
```

## 전설 (legend) · 26종

```
092 | 유니콘 | unicorn | 하늘 cloud | 상시
093 | 불사조 | phoenix | 하늘 cloud | 상시
094 | 황금 용 | golden dragon | 하늘 cloud | 상시
095 | 그리핀 | griffin | 하늘 cloud | 상시
096 | 페가수스 | pegasus | 하늘 cloud | 상시
097 | 구미호 | nine-tailed fox | 하늘 cloud | 상시
098 | 해태 | haetae | 하늘 cloud | 상시
099 | 삼족오 | three-legged sun crow | 하늘 cloud | 상시
290 | 청룡 | azure dragon | 하늘 cloud | 상시
291 | 주작 | vermilion bird | 하늘 cloud | 상시
292 | 현무 | black tortoise | 물 water | 상시
293 | 기린(麒麟) | qilin | 하늘 cloud | 상시
294 | 크라켄 | kraken | 물 water | 상시
295 | 설인 | yeti | 눈 snow | 상시
296 | 썬더버드 | thunderbird | 하늘 cloud | 상시
297 | 케르베로스 | cerberus | 바위산 rock | 상시
298 | 히포그리프 | hippogriff | 하늘 cloud | 상시
299 | 이무기 | imugi | 물 water | 상시
111 | 꽃기린 | flower qilin | 하늘 cloud | 봄 spring
112 | 봄바람 용 | spring breeze dragon | 하늘 cloud | 봄 spring
123 | 해신 고래 | sea god whale | 물 water | 여름 summer
124 | 무지개 뱀 | rainbow serpent | 하늘 cloud | 여름 summer
136 | 황금 추수 황소 | golden harvest ox | 풀밭 grass | 가을 autumn
137 | 호박등 드래곤 | jack-o-lantern dragon | 하늘 cloud | 가을 autumn
148 | 얼음 용 | ice dragon | 눈 snow | 겨울 winter
149 | 겨울 정령 사슴 | winter spirit stag | 하늘 cloud | 겨울 winter
```

## 네임드 카드 (12신, 띠 동물)

전설보다 위의 특별 카드. 그리스 신 + 띠 동물을 합친 캐릭터. 해당 계절 기계에서 아주 드물게 나온다. 일반 · 각성 두 모습이 있다.

| 이름 | 띠 동물 | 원래 신 | 칭호 | 계절 |
|---|---|---|---|---|
| 아레호 | 호랑이 | 아레스 | 전쟁의 신 | 봄 spring |
| 아프로토 | 토끼 | 아프로디테 | 사랑의 신 | 봄 spring |
| 제우룡 | 용 | 제우스 | 신들의 왕 | 봄 spring |
| 아테나가 | 뱀 | 아테나 | 지혜의 신 | 여름 summer |
| 포세이마 | 말 | 포세이돈 | 바다의 신 | 여름 summer |
| 아폴양 | 양 | 아폴론 | 태양의 신 | 여름 summer |
| 헤르몽 | 원숭이 | 헤르메스 | 전령의 신 | 가을 autumn |
| 헤라꼬 | 닭 | 헤라 | 신들의 여왕 | 가을 autumn |
| 아르테멍 | 개 | 아르테미스 | 사냥의 신 | 가을 autumn |
| 디오꿀 | 돼지 | 디오니소스 | 축제의 신 | 겨울 winter |
| 헤파찍 | 쥐 | 헤파이스토스 | 대장장이 신 | 겨울 winter |
| 데메음 | 소 | 데메테르 | 풍요의 신 | 겨울 winter |
