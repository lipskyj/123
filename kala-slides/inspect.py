import sys
from pptx import Presentation
from pptx.util import Emu
p=Presentation(sys.argv[1])
print("size", p.slide_width, p.slide_height, p.slide_width/914400, p.slide_height/914400)
for i,s in enumerate(p.slides,1):
    print(f"=== slide {i} layout={s.slide_layout.name}")
    for sh in s.shapes:
        t = sh.text_frame.text[:60].replace("\n"," | ") if sh.has_text_frame else ""
        extra=""
        if sh.shape_type==13: extra=f" img={sh.image.content_type} {sh.image.size}"
        print(f"  {sh.shape_type} {sh.name!r} ph={sh.is_placeholder} pos=({sh.left},{sh.top}) size=({sh.width},{sh.height}){extra} :: {t}")
        if sh.has_text_frame:
            for para in sh.text_frame.paragraphs[:2]:
                for r in para.runs[:1]:
                    f=r.font
                    try: c=f.color.rgb if f.color and f.color.type else None
                    except: c='theme'
                    print(f"      run font={f.name} size={f.size.pt if f.size else None} bold={f.bold} color={c} align={para.alignment}")
