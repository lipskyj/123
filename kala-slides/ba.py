import sys, glob
from PIL import Image, ImageDraw
d, out = sys.argv[1], sys.argv[2]
k=lambda f:int(f.rsplit('-',1)[1][:-4])
b=sorted(glob.glob(d+'/gorig-*.png'),key=k); a=sorted(glob.glob(d+'/gfinal-*.png'),key=k)
w,h=Image.open(a[0]).size
pairs_per_row=2; rows=(len(a)+1)//2
cw=2*w+6
sh=Image.new('RGB',(pairs_per_row*cw+30,rows*(h+10)+10),'white'); dr=ImageDraw.Draw(sh)
for i,(x,y) in enumerate(zip(b,a)):
    X=(i%2)*(cw+30); Y=10+(i//2)*(h+10)
    sh.paste(Image.open(x).resize((w,h)),(X,Y)); sh.paste(Image.open(y),(X+w+6,Y))
    dr.rectangle([X,Y,X+20,Y+13],fill='yellow'); dr.text((X+3,Y+1),str(i+1),fill='black')
sh.save(out)
