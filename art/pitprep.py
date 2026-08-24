"""투수 그림 손질 — 머리 떼기 + 던지는 팔 떼기.
   fig_pit.png(원본) → pit_body.png(몸통) + arm_piece.png(던지는 팔)"""
from PIL import Image
from collections import deque
import math

im=Image.open('fig_pit.png').convert('RGBA'); W,H=im.size; px=im.load()

# ── 1. 머리 떼기 ────────────────────────────────────────────
# 새로 얹을 정면 얼굴이 덮는 범위 안쪽만 지운다. 넘치게 지우면 목에 구멍이 난다.
n=0
for y in range(0,77):
    if y<48: x0,x1=193,282
    else:    x0,x1=199,259
    for x in range(x0,x1+1):
        if 0<=x<W and px[x,y][3]:
            px[x,y]=(px[x,y][0],px[x,y][1],px[x,y][2],0); n+=1
print('머리',n)

# ── 2. 던지는 팔 떼기 ───────────────────────────────────────
P=(188.0,84.0); hand=(112.0,122.0)
vx,vy=hand[0]-P[0], hand[1]-P[1]; L=math.hypot(vx,vy); ux,uy=vx/L,vy/L
arm=Image.new('RGBA',(W,H),(0,0,0,0)); ap=arm.load()
cut=0
for y in range(H):
    for x in range(W):
        c=px[x,y]
        if not c[3]: continue
        dx,dy=x-P[0], y-P[1]
        t=dx*ux+dy*uy; d=abs(-dy*ux+dx*uy)
        wid=max(20.0, 36.0-0.15*max(0.0,t))
        if not (-13<=t<=108 and d<=wid): continue
        if math.hypot(dx,dy)<20: continue                 # 어깨 그루터기는 남긴다
        if min(c[0],c[1],c[2])>185 and t<52: continue     # 유니폼 흰 부분은 남긴다
        ap[x,y]=c; px[x,y]=(c[0],c[1],c[2],0); cut+=1
print('팔',cut)

# ── 3. 떨어져 나온 파편 치우기 ──────────────────────────────
seen=[[False]*W for _ in range(H)]; comps=[]
for y0 in range(H):
    for x0 in range(W):
        if seen[y0][x0] or px[x0,y0][3]<40: continue
        q=deque([(x0,y0)]); seen[y0][x0]=True; pts=[]
        while q:
            x,y=q.popleft(); pts.append((x,y))
            for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                nx,ny=x+dx,y+dy
                if 0<=nx<W and 0<=ny<H and not seen[ny][nx] and px[nx,ny][3]>=40:
                    seen[ny][nx]=True; q.append((nx,ny))
        comps.append(pts)
comps.sort(key=len, reverse=True)
g=0
for c in comps[1:]:
    if len(c)<1500:
        for (x,y) in c: px[x,y]=(0,0,0,0); g+=1
print('파편', g)

im.save('pit_body.png')

# ── 4. 팔 조각에서 공 떼기 ──────────────────────────────────
bb=arm.getbbox(); piece=arm.crop(bb); pp=piece.load()
HX,HY=112-bb[0],122-bb[1]
ball=[(x,y) for y in range(piece.height) for x in range(piece.width)
      if pp[x,y][3]>150 and min(pp[x,y][0],pp[x,y][1],pp[x,y][2])>172
         and (x-HX)**2+(y-HY)**2 < 26*26]
bxs=[p[0] for p in ball]; bys=[p[1] for p in ball]
bcx=(min(bxs)+max(bxs))/2; bcy=(min(bys)+max(bys))/2
bd=max(max(bxs)-min(bxs), max(bys)-min(bys))+2
for (x,y) in ball: pp[x,y]=(pp[x,y][0],pp[x,y][1],pp[x,y][2],0)
piece.save('arm_piece.png')
print('팔 상자',bb,'어깨(조각기준) %.0f,%.0f'%(P[0]-bb[0],P[1]-bb[1]))
print('공 %.1f,%.1f 지름 %d'%(bcx,bcy,bd))
