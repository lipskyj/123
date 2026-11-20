import sys, glob
from PIL import Image, ImageDraw
prefix, out, cols = sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv)>3 else 3
fs=sorted(glob.glob(prefix+'-*.png'), key=lambda f:int(f.rsplit('-',1)[1][:-4]))
ims=[Image.open(f) for f in fs]; w,h=ims[0].size
rows=(len(ims)+cols-1)//cols
sh=Image.new('RGB',(cols*(w+8),rows*(h+8)),'white'); d=ImageDraw.Draw(sh)
for i,im in enumerate(ims):
    x,y=(i%cols)*(w+8),(i//cols)*(h+8); sh.paste(im,(x,y)); d.rectangle([x,y,x+22,y+14],fill='yellow'); d.text((x+3,y+2),str(i+1),fill='black')
sh.save(out)
