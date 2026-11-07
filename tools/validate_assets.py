"""Check exported PNGs against the user's dimensional and palette constraints."""
from pathlib import Path
from PIL import Image,ImageChops,ImageDraw
import hashlib,json

ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'assets/catalog.json').read_text())
color=lambda s:tuple(bytes.fromhex(s.lstrip('#')))
bg=color(data['background']);ink=color('#1a1c2c');palette={color(c) for c in data['palette']}|{bg}
expected_counts=[10,10,10,10,10,6,10,10,2,10,4,8,12,24,18,16,7,12,8]
assert len(data['sheets'])==19
report=[];all_native=[];floor_indices={1,2,3,4,9,10,11,12,13,14}
for n,(sheet,count) in enumerate(zip(data['sheets'],expected_counts),1):
 assert sheet['number']==n
 im=Image.open(ROOT/sheet['path']).convert('RGB')
 assert im.size==(1536,1024),sheet['path']
 assert {c for _,c in im.getcolors(im.width*im.height)}<=palette,sheet['path']
 assert len(sheet['sprites'])==count
 occupied=Image.new('1',im.size,0);draw=ImageDraw.Draw(occupied)
 rects=[]
 for i,s in enumerate(sheet['sprites'],1):
  assert s['index']==i
  native=Image.open(ROOT/s['source']).convert('RGB');all_native.append(s['source'])
  required=(8,12) if n==13 else (24,32) if n==17 else (32,32) if n==18 and i<=2 else (16,16) if n==19 else (8,8)
  assert native.size==required,(s['source'],native.size,required)
  native_colors={c for _,c in native.getcolors(native.width*native.height)}
  assert native_colors<=palette,s['source']
  if 7<=n<=9:
   assert 4<=len(native_colors-{bg})<=5,(s['source'],'rare animals need 4–5 colors including outline')
  x,y,w,h=s['rect'];assert w==native.width*s['scale'] and h==native.height*s['scale']
  assert 0<=x<x+w<=1536 and 0<=y<y+h<=1024
  for a,b,c,d in rects:assert x+w<=a or a+c<=x or y+h<=b or b+d<=y,'Sprite cells overlap'
  rects.append((x,y,w,h));draw.rectangle((x,y,x+w-1,y+h-1),fill=1)
  expected=native.resize((w,h),Image.Resampling.NEAREST)
  assert ImageChops.difference(expected,im.crop((x,y,x+w,y+h))).getbbox() is None,'Non-integer or filtered pixels'
  if n==14 and i in floor_indices:
   assert bg not in native_colors
   assert all(native.getpixel((0,k))==native.getpixel((7,k)) and native.getpixel((k,0))==native.getpixel((k,7)) for k in range(8)),s['source']
  elif n<=12 or n==13 or n==15 or n==16:
   for py in range(native.height):
    for px in range(native.width):
     if native.getpixel((px,py)) in [bg,ink]:continue
     for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)]:
      a,b=px+dx,py+dy
      assert 0<=a<native.width and 0<=b<native.height,(s['source'],'color at clipped edge')
      assert native.getpixel((a,b))!=bg,(s['source'],'missing dark outline',px,py)
  if n==17 and i<7:
   assert native.crop((4,4,20,20)).getcolors()==[(256,color('#f4f4f4'))],'Card window must stay empty 16x16'
  assert hashlib.sha256((ROOT/sheet['path']).read_bytes()).hexdigest()==sheet['sha256']
 outside=Image.composite(Image.new('RGB',im.size,bg),im,occupied)
 assert outside.getcolors(outside.width*outside.height)==[(outside.width*outside.height,bg)],'Non-magenta gutter'
 report.append({'sheet':sheet['filename'],'count':count,'canvas':[1536,1024],'native_dimensions':True,'palette_only':True,'solid_integer_pixels':True,'no_overlap':True,'magenta_gutters':True})
fx=data['sheets'][14]['sprites']
assert len({(ROOT/s['source']).read_bytes() for s in fx[:4]})==4,'Coin spin must have four different frames'
animals=[s for sheet in data['sheets'][:12] for s in sheet['sprites']]
assert len(animals)==100 and len({(ROOT/s['source']).read_bytes() for s in animals})==100,'Animals must not duplicate a sprite'
assert len(all_native)==197 and len(set(all_native))==197
result={'sheets':19,'sprites':197,'animals':100,'automated_checks_passed':True,'checks':report,'seamless_floor_tiles':10,'distinct_coin_frames':4,'rare_animals_with_4_to_5_colors':22,'notes':['Recognition at an 8x8 grid is a visual judgement, not an automated pass.','No image-generation concept pixels are used in production PNGs.']}
(ROOT/'reports').mkdir(exist_ok=True)
(ROOT/'reports/ASSET_VALIDATION.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('PASS: 19 sheets, 197 native sprites, 100 distinct animals, exact palette and integer pixel scaling.')
