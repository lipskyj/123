import sys, json, os
from pptx import Presentation
p=Presentation(sys.argv[1]); out=sys.argv[2]; os.makedirs(out,exist_ok=True)
data=[]
for i,s in enumerate(p.slides,1):
    sl={"n":i,"shapes":[]}
    for j,sh in enumerate(s.shapes):
        d={"name":sh.name,"pos":[sh.left,sh.top,sh.width,sh.height]}
        if sh.shape_type==13:
            fn=f"s{i}_{j}.{sh.image.ext}"; open(f"{out}/{fn}","wb").write(sh.image.blob); d["img"]=fn
        if sh.has_text_frame:
            paras=[]
            for para in sh.text_frame.paragraphs:
                runs=[{"t":r.text,"b":r.font.bold,"link":(r.hyperlink.address if r.hyperlink and r.hyperlink.address else None)} for r in para.runs]
                pPr=para._p.pPr
                num = pPr is not None and pPr.find('{http://schemas.openxmlformats.org/drawingml/2006/main}buAutoNum') is not None
                paras.append({"runs":runs,"num":num,"lvl":para.level})
            d["paras"]=paras
        sl["shapes"].append(d)
    data.append(sl)
json.dump(data,open(f"{out}/content.json","w"),ensure_ascii=False,indent=1)
for sl in data:
    print("== slide",sl["n"])
    for d in sl["shapes"]:
        if "img" in d: print("  IMG",d["img"])
        for pp in d.get("paras",[]):
            print("  ", "#" if pp["num"] else "-", repr("".join(("**"+r["t"]+"**") if r["b"] else r["t"] for r in pp["runs"])), [r["link"] for r in pp["runs"] if r["link"]])
