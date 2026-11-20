"""Generic Kala Yoga restyle: keeps every slide's structure, re-skins it in the
kalayoga.co.il look. Title / section / closing slides get the full layouts from
the pilot; every other slide is restyled in place (same positions, same images,
same tables).

usage: python3 -I restyle.py orig.pptx brand_dir out.pptx
"""
import io, sys, re
from PIL import Image
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE, MSO_SHAPE_TYPE, PP_PLACEHOLDER
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR, MSO_AUTO_SIZE
from pptx.opc.packuri import PackURI
from pptx.oxml.ns import qn

SRC, BRAND, OUT = sys.argv[1], sys.argv[2], sys.argv[3]

PLUM = RGBColor(0xA4, 0x28, 0x58)
PLUM_DEEP = RGBColor(0x7E, 0x1D, 0x43)
DARK = RGBColor(0x23, 0x1F, 0x20)
ORANGE = RGBColor(0xF5, 0x9B, 0x1F)
TEAL = RGBColor(0x2F, 0xB1, 0xB0)
TEAL_DEEP = RGBColor(0x1E, 0x7F, 0x7E)
CREAM = RGBColor(0xFB, 0xF6, 0xF3)
BLUSH = RGBColor(0xF6, 0xE9, 0xEE)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
MUTED = RGBColor(0x6E, 0x5A, 0x62)
LINE = RGBColor(0xE6, 0xD6, 0xDC)
FONT = "Rubik"
SIZE_FACTOR = 0.94  # Rubik sets a little wider than Arial/Tahoma
HEB = re.compile(r"[֐-׿]")

prs = Presentation(SRC)
W, H = prs.slide_width, prs.slide_height
TREE_W, TREE_P, LOGO = f"{BRAND}/tree_white.png", f"{BRAND}/tree_plum.png", f"{BRAND}/kala_logo_1200.png"


# ---------------------------------------------------------------- helpers
def hexrgb(c):
    return "%02X%02X%02X" % (c[0], c[1], c[2])


def bg(slide, color):
    f = slide.background.fill
    f.solid()
    f.fore_color.rgb = color


def rect(slide, x, y, w, h, color, shape=MSO_SHAPE.RECTANGLE, radius=None):
    s = slide.shapes.add_shape(shape, x, y, w, h)
    s.fill.solid()
    s.fill.fore_color.rgb = color
    s.line.fill.background()
    s.shadow.inherit = False
    if radius is not None and shape == MSO_SHAPE.ROUNDED_RECTANGLE:
        s.adjustments[0] = radius
    return s


def send_to_back(slide, shape, index=0):
    tree = slide.shapes._spTree
    el = shape._element
    tree.remove(el)
    tree.insert(2 + index, el)  # after nvGrpSpPr and grpSpPr


def put_before(slide, shape, ref):
    el = shape._element
    el.getparent().remove(el)
    ref._element.addprevious(el)


def rpr_font(rPr, color=None):
    for tag in ("a:latin", "a:ea", "a:cs"):
        el = rPr.find(qn(tag))
        if el is None:
            el = rPr.makeelement(qn(tag), {})
            # latin/ea/cs must come after fills; append keeps schema order mostly fine
            rPr.append(el)
        el.set("typeface", FONT)
    if color is not None:
        for t in ("a:solidFill", "a:gradFill", "a:noFill", "a:schemeClr"):
            for e in rPr.findall(qn(t)):
                rPr.remove(e)
        sf = rPr.makeelement(qn("a:solidFill"), {})
        clr = sf.makeelement(qn("a:srgbClr"), {"val": hexrgb(color)})
        sf.append(clr)
        # solidFill must precede latin/ea/cs/hlinkClick
        anchor = None
        for t in ("a:effectLst", "a:highlight", "a:uLnTx", "a:uLn", "a:uFillTx", "a:uFill", "a:latin", "a:ea", "a:cs",
                  "a:sym", "a:hlinkClick", "a:hlinkMouseOver", "a:rtl", "a:extLst"):
            anchor = rPr.find(qn(t))
            if anchor is not None:
                break
        if anchor is not None:
            anchor.addprevious(sf)
        else:
            rPr.append(sf)


PPR_AFTER_BUCLR = ("a:buSzTx", "a:buSzPct", "a:buSzPts", "a:buFontTx", "a:buFont", "a:buNone", "a:buAutoNum",
                   "a:buChar", "a:buBlip", "a:tabLst", "a:defRPr", "a:extLst")


def bullet_color(pPr, color):
    for t in ("a:buClr", "a:buClrTx"):
        for e in pPr.findall(qn(t)):
            pPr.remove(e)
    bc = pPr.makeelement(qn("a:buClr"), {})
    bc.append(bc.makeelement(qn("a:srgbClr"), {"val": hexrgb(color)}))
    for t in PPR_AFTER_BUCLR:
        a = pPr.find(qn(t))
        if a is not None:
            a.addprevious(bc)
            return
    pPr.append(bc)


def restyle_textframe(tf, heading_first=False, color=DARK, head_color=PLUM, scale=True):
    """Recolour + refont every run. Optionally colour the first non-empty paragraph as heading."""
    seen_first = False
    for para in tf.paragraphs:
        txt = "".join(r.text for r in para.runs)
        is_head = False
        if heading_first and not seen_first and txt.strip():
            seen_first = True
            is_head = True
        pPr = para._p.get_or_add_pPr()
        if HEB.search(txt):
            pPr.set("rtl", "1")
        bullet_color(pPr, PLUM)
        for r in para.runs:
            rPr = r._r.get_or_add_rPr()
            c = head_color if is_head else color
            if r.hyperlink and r.hyperlink.address:
                c = TEAL_DEEP
            rpr_font(rPr, c)
            if scale and r.font.size:
                r.font.size = Pt(max(8, round(r.font.size.pt * SIZE_FACTOR * 2) / 2))
            if HEB.search(r.text or ""):
                rPr.set("lang", "he-IL")
        # end-of-paragraph run props (affects empty lines / new typing)
        epr = para._p.find(qn("a:endParaRPr"))
        if epr is not None:
            rpr_font(epr, color)


def textbox(slide, x, y, w, h, runs_paras, size=18, color=DARK, bold=False, align=None,
            anchor=MSO_ANCHOR.TOP, spacing=1.15, margin=0.05):
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.word_wrap = True
    tf.auto_size = MSO_AUTO_SIZE.NONE
    tf.vertical_anchor = anchor
    for side in ("left", "right", "top", "bottom"):
        setattr(tf, f"margin_{side}", Inches(margin))
    for i, runs in enumerate(runs_paras):
        para = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        t = "".join(r[0] for r in runs)
        rtl = bool(HEB.search(t))
        para.alignment = align if align is not None else (PP_ALIGN.RIGHT if rtl else PP_ALIGN.LEFT)
        para.line_spacing = spacing
        if rtl:
            para._p.get_or_add_pPr().set("rtl", "1")
        for text, b in runs:
            r = para.add_run()
            r.text = text
            r.font.size = Pt(size)
            r.font.bold = bool(bold or b)
            r.font.color.rgb = color
            rpr_font(r._r.get_or_add_rPr())
            if HEB.search(text):
                r._r.get_or_add_rPr().set("lang", "he-IL")
    return tb


def footer(slide, n, on_dark=False):
    c = WHITE if on_dark else MUTED
    textbox(slide, Inches(0.3), H - Inches(0.36), Inches(3.5), Inches(0.28),
            [[("KALA YOGA  ·  Artistic Vinyasa", False)]], size=8, color=c, align=PP_ALIGN.LEFT)
    textbox(slide, W - Inches(0.9), H - Inches(0.36), Inches(0.6), Inches(0.28),
            [[(str(n), False)]], size=8, color=c, align=PP_ALIGN.RIGHT)


def paras_of(shape):
    out = []
    for p in shape.text_frame.paragraphs:
        runs = [(r.text, bool(r.font.bold)) for r in p.runs]
        t = "".join(r[0] for r in runs).strip()
        if t:
            # trim
            runs[0] = (runs[0][0].lstrip(), runs[0][1])
            runs[-1] = (runs[-1][0].rstrip(), runs[-1][1])
            out.append(runs)
    return out


def clear(slide):
    for sh in list(slide.shapes):
        sh._element.getparent().remove(sh._element)


def is_logo(sh):
    """Small square-ish picture near the top edge = a logo badge."""
    if sh.shape_type != MSO_SHAPE_TYPE.PICTURE:
        return False
    w, h = sh.width, sh.height
    return w < Inches(1.9) and h < Inches(1.9) and 0.7 < w / max(h, 1) < 1.4 and sh.top < Inches(1.3)


def pictures(slide):
    return [sh for sh in slide.shapes if sh.shape_type == MSO_SHAPE_TYPE.PICTURE]


def all_text(slide):
    return "\n".join(sh.text_frame.text for sh in slide.shapes if sh.has_text_frame).strip()


# ---------------------------------------------------------------- slide types
def classify(i, slide):
    pics = pictures(slide)
    content_pics = [p for p in pics if not is_logo(p)]
    tables = [sh for sh in slide.shapes if getattr(sh, "has_table", False) and sh.has_table]
    text = all_text(slide)
    nonempty = [l for l in text.split("\n") if l.strip()]
    if i == 0 and "קורס" in text and len(pics) >= 3:
        return "title"
    if "Rumi" in text and any(p.rotation for p in pics):
        return "closing"
    numbered = any(p._p.find(".//" + qn("a:buAutoNum")) is not None
                   for sh in slide.shapes if sh.has_text_frame for p in sh.text_frame.paragraphs)
    numbered = numbered or sum(bool(re.match(r"\s*\d+\s*[.)]", l)) for l in nonempty) >= 2
    if not content_pics and not tables and not numbered and 0 < len(nonempty) <= 6 and len(text) <= 190:
        return "section"
    return "inplace"


def L_title(slide, n):
    pics = sorted(pictures(slide), key=lambda p: p.left)
    blobs = [(p.image.blob, p.image.ext) for p in pics]
    texts = [paras_of(sh) for sh in slide.shapes if sh.has_text_frame]
    paras = [p for t in texts for p in t]
    clear(slide)
    bg(slide, PLUM)
    tw = Inches(4.6)
    slide.shapes.add_picture(TREE_W, W - tw + Inches(0.9), Inches(-0.4), tw, tw)
    d = Inches(2.9)
    cx, cy = Inches(0.75), (H - d) / 2 - Inches(0.1)
    rect(slide, cx - Inches(0.12), cy - Inches(0.12), d + Inches(0.24), d + Inches(0.24), WHITE, MSO_SHAPE.OVAL)
    slide.shapes.add_picture(io.BytesIO(blobs[1][0]), cx, cy, d, d)
    x, w = Inches(4.3), W - Inches(4.3) - Inches(0.6)
    textbox(slide, x, Inches(1.25), w, Inches(0.9), [paras[0]], size=44, color=WHITE, bold=True)
    textbox(slide, x, Inches(2.1), w, Inches(0.7), [paras[1]], size=28, color=WHITE, align=PP_ALIGN.RIGHT)
    rect(slide, W - Inches(1.75), Inches(2.95), Inches(1.1), Inches(0.07), ORANGE, MSO_SHAPE.ROUNDED_RECTANGLE, 0.5)
    if len(paras) > 2:
        textbox(slide, x, Inches(3.1), w, Inches(0.5), paras[2:], size=18, color=WHITE, align=PP_ALIGN.RIGHT)
    cw = Inches(0.95)
    for k, (blob, _) in enumerate([blobs[0], blobs[2]]):
        x0 = W - Inches(0.65) - cw - k * (cw + Inches(0.2))
        y0 = H - cw - Inches(0.45)
        rect(slide, x0, y0, cw, cw, WHITE, MSO_SHAPE.ROUNDED_RECTANGLE, 0.18)
        pad = Inches(0.1)
        slide.shapes.add_picture(io.BytesIO(blob), x0 + pad, y0 + pad, cw - 2 * pad, cw - 2 * pad)


def L_section(slide, n):
    paras = [p for sh in slide.shapes if sh.has_text_frame for p in paras_of(sh)]
    clear(slide)
    bg(slide, PLUM)
    tw = Inches(4.2)
    slide.shapes.add_picture(TREE_W, Inches(-0.8), H - tw + Inches(0.9), tw, tw)
    slide.shapes.add_picture(TREE_W, W - Inches(2.2), Inches(-1.4), Inches(3), Inches(3))
    total = sum(len("".join(r[0] for r in p)) for p in paras)
    size = 36 if total <= 40 else 30 if total <= 80 else 24 if total <= 130 else 20
    box_h = Inches(2.6)
    textbox(slide, Inches(0.9), Inches(1.25), W - Inches(1.8), box_h, paras, size=size, color=WHITE, bold=True,
            align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, spacing=1.2)
    rect(slide, (W - Inches(1.2)) / 2, Inches(4.0), Inches(1.2), Inches(0.07), ORANGE, MSO_SHAPE.ROUNDED_RECTANGLE, 0.5)
    b = Inches(0.7)
    slide.shapes.add_picture(LOGO, (W - b) / 2, Inches(0.4), b, b)
    footer(slide, n, on_dark=True)


def L_closing(slide, n):
    pics = pictures(slide)
    photo = max(pics, key=lambda p: p.width * p.height)
    im = Image.open(io.BytesIO(photo.image.blob)).convert("RGB")
    w0, h0 = im.size
    im = im.crop((int(w0 * photo.crop_left), int(h0 * photo.crop_top),
                  int(w0 * (1 - photo.crop_right)), int(h0 * (1 - photo.crop_bottom))))
    if photo.rotation:
        im = im.rotate(-photo.rotation, expand=True)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=86, optimize=True)
    buf.seek(0)
    paras = [p for sh in slide.shapes if sh.has_text_frame for p in paras_of(sh)]
    clear(slide)
    bg(slide, CREAM)
    tw = Inches(2.6)
    slide.shapes.add_picture(TREE_P, W - tw + Inches(0.5), H - tw + Inches(0.4), tw, tw)
    b = Inches(0.62)
    slide.shapes.add_picture(LOGO, Inches(0.3), Inches(0.22), b, b)
    x, w = Inches(5.1), W - Inches(5.65)
    textbox(slide, x, Inches(1.2), w, Inches(1.5), [paras[0]], size=28, color=PLUM, bold=True,
            align=PP_ALIGN.RIGHT, anchor=MSO_ANCHOR.BOTTOM, spacing=1.1)
    rect(slide, W - Inches(1.45), Inches(2.85), Inches(0.9), Inches(0.06), ORANGE, MSO_SHAPE.ROUNDED_RECTANGLE, 0.5)
    textbox(slide, x, Inches(3.0), w, Inches(1.0), paras[1:], size=20, color=DARK, bold=True,
            align=PP_ALIGN.RIGHT, spacing=1.1)
    iw, ih = im.size
    ph_h = Inches(4.3)
    ph_w = Emu(int(ph_h * iw / ih))
    px, py = Inches(1.6), (H - ph_h) / 2 - Inches(0.05)
    rect(slide, px + Inches(0.16), py + Inches(0.16), ph_w, ph_h, TEAL, MSO_SHAPE.ROUNDED_RECTANGLE, 0.05)
    slide.shapes.add_picture(buf, px, py, ph_w, ph_h)
    footer(slide, n)


def restyle_table(tbl_shape):
    tbl = tbl_shape.table
    for ri, row in enumerate(tbl.rows):
        for cell in row.cells:
            cell.fill.solid()
            cell.fill.fore_color.rgb = PLUM if ri == 0 else (WHITE if ri % 2 else BLUSH)
            restyle_textframe(cell.text_frame, color=WHITE if ri == 0 else DARK)
            if ri == 0:
                for p in cell.text_frame.paragraphs:
                    for r in p.runs:
                        r.font.bold = True
            # soft borders (lnL, lnR, lnT, lnB must come first in tcPr, before the fill)
            tcPr = cell._tc.get_or_add_tcPr()
            lns = [tcPr.makeelement(qn(t), {"w": "9525"}) for t in ("a:lnL", "a:lnR", "a:lnT", "a:lnB")]
            for e in list(tcPr):
                if e.tag in [qn(t) for t in ("a:lnL", "a:lnR", "a:lnT", "a:lnB")]:
                    tcPr.remove(e)
            for k, ln in enumerate(lns):
                sf = ln.makeelement(qn("a:solidFill"), {})
                sf.append(sf.makeelement(qn("a:srgbClr"), {"val": hexrgb(LINE)}))
                ln.append(sf)
                tcPr.insert(k, ln)


def L_inplace(slide, n):
    bg(slide, CREAM)
    shapes = list(slide.shapes)
    # text
    for sh in shapes:
        if sh.has_text_frame:
            ph_title = sh.is_placeholder and sh.placeholder_format.type in (
                PP_PLACEHOLDER.TITLE, PP_PLACEHOLDER.CENTER_TITLE)
            paras = [p for p in sh.text_frame.paragraphs if "".join(r.text for r in p.runs).strip()]
            first_bold_short = bool(paras) and all(r.font.bold for r in paras[0].runs if r.text.strip()) \
                and len("".join(r.text for r in paras[0].runs)) <= 80
            restyle_textframe(sh.text_frame, heading_first=ph_title or first_bold_short)
            if ph_title:
                for p in sh.text_frame.paragraphs:
                    for r in p.runs:
                        rpr_font(r._r.get_or_add_rPr(), PLUM)
        elif getattr(sh, "has_table", False) and sh.has_table:
            restyle_table(sh)
    # white rounded cards behind content pictures
    for p in pictures(slide):
        if is_logo(p) or p.rotation:
            continue
        pad = Inches(0.08)
        card = rect(slide, p.left - pad, p.top - pad, p.width + 2 * pad, p.height + 2 * pad, WHITE,
                    MSO_SHAPE.ROUNDED_RECTANGLE, 0.04)
        put_before(slide, card, p)
    # faint tree motif bottom-left, at the very back
    tw = Inches(2.4)
    t = slide.shapes.add_picture(TREE_P, Inches(-0.5), H - tw + Inches(0.4), tw, tw)
    send_to_back(slide, t)
    # thin plum band on the right edge (RTL reading start)
    band = rect(slide, W - Inches(0.08), 0, Inches(0.08), H, PLUM)
    send_to_back(slide, band, 1)
    # no footer on in-place slides: their content often reaches the bottom edge


# ---------------------------------------------------------------- run
kinds = []
for i, slide in enumerate(prs.slides):
    k = classify(i, slide)
    kinds.append(k)
    {"title": L_title, "section": L_section, "closing": L_closing, "inplace": L_inplace}[k](slide, i + 1)


# shrink heavy images so the upload stays under ~3 MB
def has_alpha(im):
    if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
        a = im.convert("RGBA").getchannel("A")
        return a.getextrema()[0] < 250
    return False


seen = set()
for slide in prs.slides:
    for rel in slide.part.rels.values():
        part = rel._target if not rel.is_external else None
        if part is None or not part.content_type.startswith("image/") or id(part) in seen:
            continue
        seen.add(id(part))
        blob = part.blob
        if len(blob) < 250_000:
            continue
        im = Image.open(io.BytesIO(blob))
        im.load()
        im.thumbnail((1600, 1600))
        buf = io.BytesIO()
        if has_alpha(im):
            im.save(buf, "PNG", optimize=True)
        else:
            im.convert("RGB").save(buf, "JPEG", quality=85, optimize=True)
            part._content_type = "image/jpeg"
            part.partname = PackURI(re.sub(r"\.\w+$", ".jpeg", str(part.partname)))
        if buf.tell() < len(blob):
            part._blob = buf.getvalue()

# drop embedded fonts carried over from the original
efl = prs.part._element.find(qn("p:embeddedFontLst"))
if efl is not None:
    for rid in [e.get(qn("r:id")) for e in efl.iter() if e.get(qn("r:id"))]:
        prs.part.drop_rel(rid)
    efl.getparent().remove(efl)

prs.save(OUT)
print("saved", OUT, "|", " ".join(f"{i+1}:{k[0]}" for i, k in enumerate(kinds)))
