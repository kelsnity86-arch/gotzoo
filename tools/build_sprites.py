"""Author discrete indexed-pixel sprites; never resample the generated concept.

Every production pixel is specified on its native integer grid. The rejected
image-generation concept is retained, unchanged, outside production assets.
"""
from pathlib import Path
from collections import deque
import json, hashlib, re
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
BG='#FF00FF'
COLORS={
 'X':'#1a1c2c','h':'#333c57','s':'#566c86','a':'#94b0c2','w':'#f4f4f4',
 'D':'#2b1d14','d':'#5d3a24','b':'#8a5a3b','t':'#c28a5c','c':'#e8c39e','C':'#f6e6c8',
 'R':'#8b1e2d','r':'#d83a3a','o':'#ef7d32','y':'#f7c948','Y':'#fff3a3','G':'#e0a526',
 'j':'#1f5d3a','g':'#38a35b','l':'#a7d65b','q':'#2a9d8f','n':'#29366f','u':'#3b5dc9','v':'#41a6f6','i':'#73eff7',
 'P':'#5d275d','m':'#8e44ad','p':'#f08cbe','f':'#ffc8dd','k':'#c7cfdd'}
RGB=lambda h:tuple(bytes.fromhex(h.lstrip('#')))
PALETTE={k:RGB(v) for k,v in COLORS.items()}
INK=PALETTE['X'];MAGENTA=RGB(BG)
CATALOG=[]

# Each hand-authored animal has at most 6x6 colored pixels, surrounded by one
# native dark pixel. Eyes share the outline ink; these are not image crops.
ANIMALS={
'rabbit':       ['w.w...','w.w...','wwww..','Xwww..','wwwwww','.ww.w.'],
'duck':         ['.CC...','CXCC..','yyCC..','.CCC.C','.CCCCC','..y.y.'],
'chicken':      ['.r....','.w....','yXww..','.wwwww','.wwww.','..y.y.'],
'baby_chick':   ['..y...','.yyyy.','yXyyy.','oyyyyy','.yyyy.','..o.o.'],
'hamster':      ['.t..t.','.tttt.','tXtttt','tCCttt','.CCCtt','..t.t.'],
'squirrel':     ['.b..bb','bb..bb','Xbb.bb','Cbb.b.','.bbb..','bb.b..'],
'mouse':        ['.kk...','kkkk..','kXkk..','pkkkk.','.kkk.p','..p.p.'],
'cat':          ['w..w..','wwww..','Xwww.w','wkkw.w','.kkwww','.w.w..'],
'puppy':        ['dd....','cdd...','Xcdddd','ccddd.','.dddd.','.c.c..'],
'pigeon':       ['.ss...','sXss..','asqs..','.sssss','.assss','..r.r.'],
'sparrow':      ['.bb...','bXbb..','yCbb..','.Cbbbb','.CCbb.','..b.b.'],
'frog':         ['g..g..','XggX..','ggggg.','.lggg.','gggggg','g....g'],
'tortoise':     ['..ggg.','..glgg','gXgggg','gggggg','.g.g.g','......'],
'snail':        ['g.g...','gX.yyy','gg.yyG','.gyGyG','ggyyyy','gggggg'],
'pig':          ['.p.p..','pppp..','Xp.ppp','pppppp','.pppp.','.p..p.'],
'sheep':        ['.wwww.','wwwwww','sXwwww','sswwww','.wwww.','.s..s.'],
'goat':         ['C.C...','.cc...','Xcccc.','ccc.cc','.ccccc','.c..c.'],
'dairy_cow':    ['C..C..','.ww...','XwXwww','ccwXXw','.wwwww','.X..X.'],
'pony':         ['.b....','.db...','Xdbbb.','cdbbbb','..bbbd','..b.b.'],
'donkey':       ['s.s...','s.s...','sXs...','Csssss','..ssss','..s.s.'],
'goose':        ['.ww...','yXw...','..w...','..ww.w','.wwwww','..y.y.'],
'turkey':       ['..b.b.','.bbybb','.rbbyb','yXbbbb','.rbbb.','..y.y.'],
'guinea_pig':   ['......','.c..c.','.cccc.','cXcccc','CccCCC','.CC.C.'],
'hedgehog':     ['..d.d.','.ddddd','cXdddd','ccdddd','.cddd.','..c.c.'],
'raccoon':      ['.a..a.','aa.aaa','aXaaa.','waasaa','.asaa.','.a.a..'],
'goldfish':     ['......','...o.o','.ooooo','oXyooo','.ooooo','...o.o'],
'budgie':       ['.yy...','yXyy..','oygg..','.gggg.','..gggg','..y.g.'],
'badger':       ['.s..s.','wwssss','Xswwss','wwssss','.sssss','.s..s.'],
'mole':         ['......','..ddd.','.Xdddd','pddddd','.ccddd','..c.c.'],
'honeybee':     ['..w.w.','.wwwww','yXyXy.','yyXyXX','.yXy..','......'],
'red_fox':      ['o..o..','ooCo..','Xooo..','CCoooo','.ooooC','.o.o.C'],
'penguin':      ['.hhh..','hXhh..','yChh..','hCChh.','.CCh..','.y.y..'],
'koala':        ['aa.aa.','aaaaa.','.Xaaa.','.aXaa.','..aaa.','..a.a.'],
'spotted_deer': ['c.c...','.cc...','Xccccc','cccCcc','..cCcc','..c.c.'],
'alpaca':       ['w.w...','.ww...','Xww...','.ww...','.wwwww','.w..w.'],
'river_otter':  ['......','.bb...','XbCb..','CCbbbb','.bbbbb','..b..b'],
'beaver':       ['......','.bb...','Xbbb..','Cwbbbb','.bbbbb','..bbdd'],
'meerkat':      ['.cc...','cXc...','.cc...','.Ccc..','cCcc..','.c.c..'],
'kangaroo':     ['c.c...','.cc...','Xcc...','.Ccc..','..cccc','.cc..c'],
'monkey':       ['.dd.d.','dCCdd.','CXCdd.','.dd.dd','..dddd','..d.d.'],
'owl':          ['b..b..','bbbb..','wXwX..','bbob..','.CbC..','.b.b..'],
'scarlet_macaw':['.rr...','rXyr..','yrur..','.rruu.','..ruu.','..y.u.'],
'harbor_seal':  ['......','.aaa..','aXaa..','waaaa.','.aaaas','aa..ss'],
'platypus':     ['......','...bb.','ccXbbb','cccbbb','.bbbbb','..c.c.'],
'armadillo':    ['..sss.','.sassa','cXssss','ccassa','.cssss','..c.c.'],
'sloth':        ['..b..b','.bbbb.','CXCCbb','.CbCbb','..bbbb','..b.b.'],
'skunk':        ['s..ww.','.ssws.','Xwwss.','wsssss','.sssss','.s.s..'],
'gray_wolf':    ['s..s..','ssas..','Xsss..','aassss','.sssss','.s.s.s'],
'brown_bear':   ['b..b..','bbbbb.','Xbbbb.','CCbbbb','.bbbbb','.b..b.'],
'zebra':        ['.w....','.Xw...','XwXwX.','wwXwXw','..wXwX','..X.X.'],
'camel':        ['.c....','cXc...','cc.c.c','.ccccc','..cccc','..c.c.'],
'ostrich':      ['.a....','yXa...','..a...','..ahhh','..hhhh','..y.y.'],
'crocodile':    ['....g.','...ggg','ggXggg','llgggg','.ggggg','.g..g.'],
'hippo':        ['a..a..','.aaaa.','aXaaaa','aaaaaa','wwaaaa','.a..a.'],
'anteater':     ['......','...ddd','..dXdd','ccdCdd','.ccddd','..c.c.'],
'toucan':       ['.hhh..','yyXh..','ooCh..','..hhh.','..hhhh','..y.hh'],
'capybara':     ['..t.t.','.tttt.','tXtttt','Cctttt','.ttttt','.t..t.'],
'red_panda':    ['C..C..','oooo..','CXCo.o','CoCoCo','.ooooo','.h.h.o'],
'flamingo':     ['.pf...','Xpp...','..p...','.ppfp.','.ppppp','..R.R.'],
'giant_panda':  ['h..h..','wwwww.','hXwwh.','whCwhh','.whhhh','.h..h.'],
'giraffe':      ['b.b...','.yy...','Xy....','.yb...','.cyyby','.b..b.'],
'elephant':     ['..aaa.','.aaaas','aXaass','aCaass','a.aaaa','a.a.a.'],
'lion':         ['.ooo..','oCooo.','Xyoyy.','oyoyyy','.yyyyb','.y..y.'],
'tiger':        ['o..o..','ohooo.','Xohoho','Coohoo','.ohoho','.o..o.'],
'leopard':      ['y..y..','.yyyy.','Xyhyhy','Cyhyhy','.yhyhy','.y..y.'],
'cheetah':      ['y.y...','yXy...','Xhyyyy','.Cyhyh','..yhy.','..y.y.'],
'gorilla':      ['.hhh..','hsXh..','haSh..','hhshh.','hhhhh.','h.h.h.'],
'orangutan':    ['.ooo..','ocXo..','oCCo..','ooco..','ooooo.','o.o.o.'],
'polar_bear':   ['w..w..','wwwww.','Xwwwww','Cwwwww','.wwwww','.s..s.'],
'rhino':        ['......','.s..s.','CsXsss','ssasss','.sssss','.s..s.'],
'dolphin':      ['...s..','..ss..','.sXsis','sssass','..aas.','...s.s'],
'orca':         ['...h..','..hh..','.hXwih','hhhwhh','..wwh.','...h.h'],
'sea_turtle':   ['...g..','.ggggg','gXblbg','gglblg','.ggggg','...g..'],
'octopus':      ['.rppr.','rrXfrr','.rrrr.','rprrrr','r.rr.r','p.r.pr'],
'chameleon':    ['.gg...','gXgg..','lggqgg','.ggg.q','..g.qg','..g.g.'],
'fennec_fox':   ['c...c.','cb.bc.','ccccc.','CXccc.','.CCcc.','.c.c.c'],
'quokka':       ['c..c..','cbcbc.','CXccc.','.CCcc.','..cccc','.c.c.c'],
'tapir':        ['.h..h.','hhhhh.','hXwCCh','hhwCCh','h.hhCC','..h.h.'],
'white_tiger':  ['w..w..','whwww.','Xwhwhw','Cwwhww','.whwhw','.w..w.'],
'snow_leopard': ['w..w..','.wwww.','Xwswsw','Cwswsw','.wswsw','.w..w.'],
'peacock':      ['g.g.g.','qgqgqg','ggqggg','uXuqgg','uuuqgq','.u.u..'],
'black_panther':['h..h..','hhh...','yXh..h','shhhhh','.hhhhh','.h.h..'],
'bald_eagle':   ['.ww...','yXw...','..wwdd','..dddd','.ddddd','..y.y.'],
'okapi':        ['c.c...','.cc...','Xcb...','cbbbbb','..bwbw','..w.w.'],
'komodo_dragon':['....b.','...bbb','bbXbbb','ccbbbb','.bbbbb','.b..b.'],
'white_lion':   ['.CCC..','CwCCC.','XwCww.','CwCwww','.wwwwC','.w..w.'],
'whale_shark':  ['...u..','..uu..','.auaua','uXuuuu','uaauaa','..uu.u'],
'humpback_whale':['......','...s..','.sssss','sXssss','ssssas','.aa..s'],
'golden_snub_nosed_monkey':['.yy.y.','yCCyy.','CXvyy.','.yy.yy','..yyyy','..y.y.'],
'aye_aye':      ['cc.cc.','cccccc','.hXhh.','.hChh.','..hhh.','..c.c.'],
'pangolin':     ['...t..','..tbt.','tXtbtb','cctbtb','.ctbtb','..t.t.'],
'bird_of_paradise':['.rr...','yXr...','..royy','.royoy','..royy','..r.yy'],
'unicorn':      ['y.w...','.Cw...','XCwp..','Cwppww','..wwwp','..y.y.'],
'phoenix':      ['..r..r','.ry.rr','yXyrry','.rrrry','..ryry','..y.ry'],
'golden_dragon':['y..y.y','.yy.yy','Xyoyyo','yyoyyY','..yyyy','..y.y.'],
'griffin':      ['.w..y.','yXwyy.','.wwyyy','..yyyy','..yoyy','..y.y.'],
'pegasus':      ['.w..w.','.Cwww.','XCwwww','CwwwCw','..www.','..y.y.'],
'nine_tailed_fox':['w..y.y','ww.CyC','XwwyCy','CwwwyC','.wwwCy','.w.w.y'],
'haetae':       ['y.y...','yyy...','XiYyy.','yyYyyy','.yyyyy','.y..y.'],
'three_legged_sun_crow':['..y.y.','.yhyhy','yXhyhy','.hhhh.','..hhhh','.h.h.h'],
}
# A neutral face highlight alias is kept in source masks for gorilla readability.
ANIMALS['gorilla']=[r.replace('S','s') for r in ANIMALS['gorilla']]
# Inset a leading eye by one colored pixel so it does not merge into the
# left silhouette. This edits the authored grid, not any generated image.
for name,rows in ANIMALS.items():
 for i,row in enumerate(rows):
  first=next((k for k,c in enumerate(row) if c!='.'),None)
  if first is not None and row[first]=='X' and first+1<6 and row[first+1] not in '.X':
   chars=list(row);chars[first],chars[first+1]=chars[first+1],chars[first];rows[i]=''.join(chars)

def canvas(w,h):return Image.new('RGB',(w,h),MAGENTA)
def dot(im,x,y,c):
 if 0<=x<im.width and 0<=y<im.height:im.putpixel((x,y),PALETTE[c])
def box(im,xy,c):ImageDraw.Draw(im).rectangle(xy,fill=PALETTE[c])
def ellipse(im,xy,c):ImageDraw.Draw(im).ellipse(xy,fill=PALETTE[c])
def line(im,xy,c):ImageDraw.Draw(im).line(xy,fill=PALETTE[c],width=1)
def tiny(rows):
 assert len(rows)==6 and all(len(row)==6 for row in rows),rows
 im=canvas(8,8);body={}
 for y,row in enumerate(rows,1):
  for x,c in enumerate(row,1):
   if c!='.':assert c in PALETTE;c and body.update({(x,y):c})
 for x,y in body:
  for dx,dy in [(0,-1),(1,0),(0,1),(-1,0)]:dot(im,x+dx,y+dy,'X')
 for (x,y),c in body.items():dot(im,x,y,c)
 # Enclosed one-pixel gaps are ink, never accidental magenta body pixels.
 outer=set();todo=deque([(0,y) for y in range(8)]+[(7,y) for y in range(8)]+[(x,0) for x in range(8)]+[(x,7) for x in range(8)])
 while todo:
  x,y=todo.popleft()
  if (x,y) in outer or not (0<=x<8 and 0<=y<8) or im.getpixel((x,y))!=MAGENTA:continue
  outer.add((x,y));todo.extend([(x-1,y),(x+1,y),(x,y-1),(x,y+1)])
 for y in range(8):
  for x in range(8):
   if im.getpixel((x,y))==MAGENTA and (x,y) not in outer:dot(im,x,y,'X')
 return im

def perimeter(im):
 body={(x,y):im.getpixel((x,y)) for y in range(im.height) for x in range(im.width) if im.getpixel((x,y))!=MAGENTA}
 for x,y in body:
  for dx,dy in [(0,-1),(1,0),(0,1),(-1,0)]:
   q=(x+dx,y+dy)
   if q not in body:dot(im,*q,'X')
 return im

def person(index):
 im=canvas(8,12)
 # Two colored rows plus their outline make the four-pixel head.
 box(im,(2,1,5,2),'c');dot(im,1,2,'c');dot(im,2,2,'X')
 hair=['d','y','d','D','a','b','b','d','o','c','m','s'][index]
 box(im,(3,1,5,1),hair);dot(im,5,2,hair)
 shirt=['r','y','u','g','c','q','p','C','o','c','m','s'][index]
 box(im,(3,3,4,3),'c');box(im,(3,4,4,7),shirt)
 for x in [2,5]:dot(im,x,5,shirt);dot(im,x,6,'c')
 for x in [3,5]:line(im,[(x,8),(x,9)],'n');dot(im,x,10,'h')
 if index in [0,1]:
  for x in [3,5]:im.putpixel((x,10),MAGENTA);dot(im,x,9,'h')
 if index==1:box(im,(2,1,5,1),'y');box(im,(2,7,5,7),'y')
 if index==3:box(im,(2,7,5,8),'g')
 if index==4:box(im,(1,1,5,1),'t');line(im,[(1,6),(1,10)],'b')
 if index==5:box(im,(6,4,6,7),'r')
 if index==7:box(im,(1,5,3,6),'h');dot(im,2,5,'a')
 if index==8:box(im,(1,1,5,1),'o');box(im,(1,7,2,8),'t')
 if index==9:box(im,(1,1,5,1),'c');box(im,(1,7,2,8),'s');dot(im,1,7,'g')
 if index==10:line(im,[(1,2),(1,8)],'t');box(im,(2,2,2,3),'m')
 if index==11:line(im,[(1,4),(1,9)],'b');box(im,(1,10,2,10),'y');dot(im,3,6,'s')
 return perimeter(im)

def tile(index):
 floors={0:'g',1:'g',2:'t',3:'a',8:'l',9:'c',10:'v',11:'w',12:'s',13:'C'}
 if index in floors:
  im=Image.new('RGB',(8,8),PALETTE[floors[index]])
  details={0:[(2,2,'l'),(5,5,'j')],1:[(2,2,'y'),(3,2,'w'),(2,3,'w'),(5,5,'p')],2:[(2,3,'b'),(5,6,'c')],3:[(2,2,'k'),(2,3,'s'),(5,5,'s')],8:[(2,3,'g'),(3,2,'g'),(5,6,'g')],9:[(2,2,'t'),(5,5,'Y')],10:[(2,2,'i'),(3,2,'i'),(5,5,'u'),(6,5,'u')],11:[(2,3,'k'),(3,3,'k'),(6,6,'i')],12:[(2,2,'a'),(3,2,'a'),(5,5,'h')],13:[(2,2,'w'),(3,2,'w'),(2,3,'w'),(5,5,'Y')]}
  for x,y,c in details[index]:dot(im,x,y,c)
  return im
 if index in [4,5,6,7]:
  im=canvas(8,8)
  if index==4:
   box(im,(0,2,7,5),'X');box(im,(0,3,7,4),'b');box(im,(1,0,2,7),'X');box(im,(5,0,6,7),'X');line(im,[(1,1),(1,6)],'t');line(im,[(5,1),(5,6)],'t')
  elif index==5:
   box(im,(2,0,5,7),'X');box(im,(3,0,4,7),'b');box(im,(1,1,6,2),'X');box(im,(1,5,6,6),'X');line(im,[(2,1),(5,1)],'t');line(im,[(2,5),(5,5)],'t')
  elif index==6:
   box(im,(2,0,4,5),'X');box(im,(2,3,7,5),'X');line(im,[(3,0),(3,4),(7,4)],'t')
  else:
   box(im,(0,1,1,7),'X');box(im,(6,1,7,7),'X');box(im,(1,2,6,5),'X');box(im,(2,3,5,4),'b');dot(im,5,4,'y')
  return im
 masks={14:['..gg..','.gggg.','gglggg','gggggg','..dd..','..dd..'],15:['......','..gg..','.glgg.','gggggg','.gggg.','......'],16:['y...p.','.w.p..','..g...','g.g.g.','.ggg..','..g...'],17:['......','bbbbbb','b....b','bbbbbb','.d..d.','.d..d.'],18:['bbbbbb','bCCCCb','bCCCCb','bbbbbb','..bb..','..bb..'],19:['......','......','s....s','srrrrs','.ssss.','......'],20:['.ssss.','ssssss','.ssss.','.shhs.','.ssss.','......'],21:['..g...','.ggg..','..g...','rrrrrr','.rrrr.','..rr..'],22:['..yy..','..YY..','..dd..','..dd..','..dd..','.dddd.'],23:['.gggg.','gvvvvg','gvivvg','gvvvig','.gvvg.','..gg..']}
 return tiny(masks[index])

def coin(frame=0):
 return tiny([
  ['..yy..','.yYyy.','.yYGy.','.yYGy.','.yyyy.','..yy..'],
  ['..yy..','..Yy..','..Yy..','..Yy..','..yG..','..yy..'],
  ['...G..','...y..','...y..','...y..','...G..','...G..'],
  ['..yy..','..yY..','..yY..','..yY..','..Gy..','..yy..']
 ][frame])

FX={
5:['......','..yy..','.yyyy.','yyGyyy','yGyyGy','yyyyyy'],
6:['......','......','..Y...','.YYY..','..Y...','......'],
7:['..Y...','..w...','YwwwY.','.www..','..w...','..Y...'],
8:['Y....Y','......','..Y...','......','Y....Y','......'],
9:['pp.pp.','pppppp','pppppp','.pppp.','..pp..','......'],
10:['...ww.','..rww.','.rrr..','wrr...','ww....','......'],
11:['....v.','.vvvvv','vXvvv.','.vvvvv','....v.','......'],
12:['...g.g','....g.','...oo.','..oo..','.oo...','o.....'],
13:['..g.g.','.glggg','gglgg.','.gggg.','..gg..','..g...'],
14:['..y...','yyyyyy','.yyyy.','..yyy.','.yy.yy','......'],
15:['..rr..','..rr..','..rr..','......','..rr..','......'],
16:['..hhhh','..h..h','..h..h','.hh.hh','hhh.hh','.h....'],
17:['..ww..','.wwww.','wwwwww','.wwwww','..www.','......']}
def effect(index):
 if index<4:return coin(index)
 if index==4:
  return tiny(['.yyyy.','yyYyyy','yYyyyy','yYyGyy','yyyyyy','.yyyy.'])
 return tiny(FX[index])

ICONS={
1:FX[9],2:['..aa..','..aa..','......','.aaaa.','aaaaaa','..aa..'],3:FX[14],
4:['hhhhhh','haaaah','hahhah','hahhah','hahhah','hhhhhh'],
5:['yyyyyy','yYYYYy','.yyyy.','yYYYYy','yyyyyy','......'],
6:['..aa..','.aaaa.','aaXXaa','aaXXaa','aaaaaa','.aaaa.'],
7:['r....r','r....r','r....r','r....r','.rrrr.','..rr..'],
8:['ww.ww.','ww.ww.','..y...','..y...','.wwww.','.wwww.'],
9:['.tttt.','.t..t.','bbbbbb','bCCCbb','bttttb','bbbbbb'],
10:['.sss..','s...s.','s...s.','yyyyyy','yyXXyy','yyyyyy'],
11:['.rrrr.','rrrrrr','rrrrrr','wwwwww','wwwwww','.wwww.'],
12:['..g...','.ggg..','ggggg.','..g...','..g...','..g...'],
13:['.s..s.','ssssss','.sXXs.','.sXXs.','ssssss','.s..s.'],
14:['.....g','....gg','g..gg.','gggg..','.gg...','......'],
15:['r....r','.r..r.','..rr..','..rr..','.r..r.','r....r']}
def icon(index):return coin() if index==0 else tiny(ICONS[index])

def card(index):
 im=canvas(24,32);edge=['a','g','u','m','G','o','j'][index]
 box(im,(0,1,23,30),'X');box(im,(1,0,22,31),'X');box(im,(1,2,22,29),edge);box(im,(2,1,21,30),edge)
 if index==6:
  box(im,(3,3,20,28),'h');box(im,(4,4,19,27),'j')
  for x,y in [(7,11),(11,9),(15,10),(17,13)]:box(im,(x,y,x+1,y+2),'c')
  box(im,(9,16,16,20),'c');box(im,(10,14,14,21),'c')
  for x,y in [(4,5),(18,6),(5,25),(18,25)]:dot(im,x,y,'q')
  return im
 box(im,(2,2,21,29),'C');box(im,(3,3,20,20),edge);box(im,(4,4,19,19),'w')
 box(im,(3,23,20,28),edge);box(im,(4,24,19,27),'C')
 if index in [2,3,4]:
  for x,y in [(2,2),(21,2),(2,29),(21,29)]:
   dot(im,x,y,'Y' if index==4 else 'i' if index==2 else 'p')
 if index in [3,4]:
  for x,y in [(2,6),(21,6),(2,26),(21,26)]:dot(im,x,y,edge);dot(im,x+(1 if x==2 else -1),y,edge)
 if index==4:
  for x in [8,11,14]:dot(im,x,0,'X');dot(im,x,1,'Y');dot(im,x,2,'G')
  for x,y in [(1,11),(22,17),(5,30)]:dot(im,x,y,'Y')
 if index==5:box(im,(10,20,13,22),'X');box(im,(11,20,12,21),'o')
 return im

def machine(shaking=False):
 im=canvas(32,32);shift=1 if shaking else 0
 ellipse(im,(5+shift,0,25+shift,19),'X');ellipse(im,(6+shift,1,24+shift,18),'a');ellipse(im,(7+shift,2,23+shift,16),'i')
 for x,y,c in [(11,7,'g'),(17,5,'y'),(20,9,'m'),(8,12,'r'),(14,12,'u'),(19,14,'o')]:
  ellipse(im,(x+shift,y,x+3+shift,y+3),'X');dot(im,x+1+shift,y+1,c);dot(im,x+2+shift,y+1,c);dot(im,x+1+shift,y+2,'w');dot(im,x+2+shift,y+2,'w')
 line(im,[(10+shift,4),(9+shift,6)],'w')
 box(im,(4,16,27,28),'X');box(im,(5,17,26,27),'r');box(im,(5,26,26,27),'R')
 box(im,(8,18,12,19),'X');line(im,[(9,18),(11,18)],'y')
 box(im,(7,23,14,26),'X');box(im,(8,24,13,25),'D')
 ellipse(im,(19,19,24,24),'X');ellipse(im,(20,20,23,23),'a')
 line(im,[(21,21),(24,18) if shaking else (26,21)],'X');dot(im,24 if shaking else 26,18 if shaking else 21,'y')
 for x,y in [(14,19),(15,18),(17,18),(18,19)]:dot(im,x,y,'C')
 box(im,(15,20,17,21),'C');dot(im,16,22,'C')
 box(im,(5,29,9,30),'X');box(im,(22,29,26,30),'X');box(im,(4,31,10,31),'X');box(im,(21,31,27,31),'X')
 return im
def capsule(color,opened):
 if not opened:return tiny(['.'+color*4+'.',color*6,color*6,'w'*6,'w'*6,'.wwww.'])
 return tiny(['.'+color*4+'.',color*6,'......','..YY..','wwwwww','.wwww.'])

def ui(index):
 im=canvas(16,16);border=['b','j','j','j','s','b','b','j'][index];fill=['C','h','g','j','a','C','c','h'][index]
 box(im,(0,1,15,14),'X');box(im,(1,0,14,15),'X');box(im,(1,1,14,14),border);box(im,(2,2,13,13),fill)
 if index==0:
  line(im,[(2,1),(13,1)],'t');line(im,[(2,14),(13,14)],'d');dot(im,1,4,'d');dot(im,14,11,'d')
 if index==2:line(im,[(3,2),(12,2)],'l');line(im,[(3,13),(12,13)],'j')
 if index==3:box(im,(2,2,13,2),'X');box(im,(2,3,13,13),'j');line(im,[(3,3),(12,3)],'g')
 if index in [5,6]:
  box(im,(0,12,15,15),fill);line(im,[(0,12),(0,15)],'X');line(im,[(15,12),(15,15)],'X');line(im,[(0,15),(15,15)],'X')
 if index==7:box(im,(3,5,12,10),'X');box(im,(4,6,11,9),'h');box(im,(4,6,8,9),'g');line(im,[(4,6),(8,6)],'l')
 return im

GROUPS=[
list(ANIMALS)[0:10],list(ANIMALS)[10:20],list(ANIMALS)[20:30],list(ANIMALS)[30:40],list(ANIMALS)[40:50],list(ANIMALS)[50:56],list(ANIMALS)[56:66],list(ANIMALS)[66:76],list(ANIMALS)[76:78],list(ANIMALS)[78:88],list(ANIMALS)[88:92],list(ANIMALS)[92:100],
['child_red','child_raincoat','adult_blue','adult_green_dress','elder_cane','teen_backpack','parent_pink','tourist_camera','coin_collector','zookeeper','guide','janitor'],
['grass','grass_flowers','dirt_path','stone_path','fence_horizontal','fence_vertical','fence_corner','fence_gate','floor_short_grass','floor_sand','floor_water','floor_snow','floor_rock','floor_magic_clouds','tree','bush','flowers','bench','blank_sign','food_bowl','trash_bin','potted_plant','lamp_post','pond_edge'],
['coin_front','coin_turn','coin_edge','coin_turn_back','coin_big','coin_pile','sparkle_small','sparkle_big','sparkle_fade','heart','meat','fish','carrot','leaf_bundle','star','exclamation','music_note','dust'],
['coin','heart','visitors','zoo_stage','enclosure_capacity','ticket','staff_badge','pickup_magnet','fusion','backpack','padlock','gacha_capsule','upgrade','settings','check','close'],
['common','uncommon','rare','epic','legendary','staff','back'],
['machine_idle','machine_shaking','capsule_gray','capsule_green','capsule_blue','capsule_purple','capsule_gold','opened_gray','opened_green','opened_blue','opened_purple','opened_gold'],
['wood_panel','dark_green_panel','button_normal','button_pressed','button_disabled','tab_selected','tab_unselected','progress_bar']]

def make_sheet(s):
 n=s['number'];names=GROUPS[n-1];sheet=canvas(1536,1024);records=[]
 for i,name in enumerate(names):
  if n<=12:im=tiny(ANIMALS[name]);cols=5;rows=1 if n in [9,11] else 2;scale=24
  elif n==13:im=person(i);cols=6;rows=2;scale=24
  elif n==14:im=tile(i);cols=6;rows=4;scale=24
  elif n==15:im=effect(i);cols=6;rows=3;scale=24
  elif n==16:im=icon(i);cols=8;rows=2;scale=16
  elif n==17:im=card(i);cols=4;rows=2;scale=12
  elif n==18:im=machine(i==1) if i<2 else capsule(['a','g','u','m','G'][(i-2)%5],i>=7);scale=12 if i<2 else 24
  else:im=ui(i);cols=4;rows=2;scale=16
  if n==18:
   cx=384+768*i if i<2 else 256+256*((i-2)%5);cy=240 if i<2 else 600 if i<7 else 856
  else:cx=round((i%cols+.5)*1536/cols);cy=round((i//cols+.5)*1024/rows)
  x=cx-im.width*scale//2;y=cy-im.height*scale//2
  native=Path(s['path']).parent.relative_to('assets/spritesheets')/s['filename'].removesuffix('.png')/(f'{i+1:02d}_'+name+'.png')
  native_path=ROOT/'assets/sprites'/native;native_path.parent.mkdir(parents=True,exist_ok=True);im.save(native_path)
  # Exact integer pixel replication, never filtered resizing or AI-image editing.
  enlarged=canvas(im.width*scale,im.height*scale);draw=ImageDraw.Draw(enlarged)
  for py in range(im.height):
   for px in range(im.width):draw.rectangle((px*scale,py*scale,(px+1)*scale-1,(py+1)*scale-1),fill=im.getpixel((px,py)))
  sheet.paste(enlarged,(x,y))
  records.append({'index':i+1,'id':name,'source':str(native_path.relative_to(ROOT)),'native_size':list(im.size),'scale':scale,'rect':[x,y,enlarged.width,enlarged.height]})
 path=ROOT/s['path'];path.parent.mkdir(parents=True,exist_ok=True);sheet.save(path)
 CATALOG.append({'number':n,'filename':s['filename'],'path':s['path'],'size':[1536,1024],'sprites':records,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})

def main():
 brief=json.loads((ROOT/'docs/briefs/sheets.json').read_text())
 for s in brief['sheets']:make_sheet(s)
 (ROOT/'assets/catalog.json').write_text(json.dumps({'schema':1,'background':BG,'palette':list(COLORS.values()),'sheets':CATALOG},indent=2)+'\n')
 print(f'{len(CATALOG)} sheets / {sum(len(s["sprites"]) for s in CATALOG)} native sprites')

if __name__=='__main__':main()
