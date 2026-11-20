"""Rebuild a Kala Yoga deck in the kalayoga.co.il visual style.

Layout functions (title, section, quote, numbered list, long text, media link,
image) are driven by the content extracted from the original deck, so the
approved look can be reused for the other decks.
"""
import json, sys, re
from copy import deepcopy
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR, MSO_AUTO_SIZE
from pptx.oxml.ns import qn

SRC, ASSETS, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
content = json.load(open(f"{ASSETS}/content.json"))

# ---- Kala Yoga design tokens (from kalayoga.co.il Elementor kit) ----
PLUM = RGBColor(0xA4, 0x28, 0x58)
PLUM_DEEP = RGBColor(0x7E, 0x1D, 0x43)
DARK = RGBColor(0x23, 0x1F, 0x20)
ORANGE = RGBColor(0xF5, 0x9B, 0x1F)
TEAL = RGBColor(0x2F, 0xB1, 0xB0)
TEAL_DEEP = RGBColor(0x1E, 0x7F, 0x7E)  # for white text (contrast)
CREAM = RGBColor(0xFB, 0xF6, 0xF3)
BLUSH = RGBColor(0xF6, 0xE9, 0xEE)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
MUTED = RGBColor(0x6E, 0x5A, 0x62)
FONT = "Rubik"

HEB = re.compile(r"[֐-׿]")

src = Presentation(SRC)
prs = Presentation(SRC)  # keep same page size / theme, then drop slides
W, H = prs.slide_width, prs.slide_height
sldIdLst = prs.slides._sldIdLst
for sldId in list(sldIdLst):
    prs.part.drop_rel(sldId.rId)
    sldIdLst.remove(sldId)
# drop embedded Tahoma fonts carried over from the original (unused now)
_efl = prs.part._element.find(qn("p:embeddedFontLst"))
if _efl is not None:
    for _rid in [e.get(qn("r:id")) for e in _efl.iter() if e.get(qn("r:id"))]:
        prs.part.drop_rel(_rid)
    _efl.getparent().remove(_efl)
BLANK = [l for l in prs.slide_layouts if l.name.upper() == "BLANK"]
BLANK = BLANK[0] if BLANK else prs.slide_layouts[len(prs.slide_layouts) - 1]


def bg(slide, color):
    f = slide.background.fill
    f.solid()
    f.fore_color.rgb = color


def rect(slide, x, y, w, h, color, shape=MSO_SHAPE.RECTANGLE, radius=None, line=None):
    s = slide.shapes.add_shape(shape, x, y, w, h)
    s.fill.solid()
    s.fill.fore_color.rgb = color
    if line:
        s.line.color.rgb = line
        s.line.width = Pt(1)
    else:
        s.line.fill.background()
    s.shadow.inherit = False
    if radius is not None and shape == MSO_SHAPE.ROUNDED_RECTANGLE:
        s.adjustments[0] = radius
    return s


def set_font(run, size, color, bold=False):
    f = run.font
    f.name = FONT
    f.size = Pt(size)
    f.bold = bold
    f.color.rgb = color
    rPr = run._r.get_or_add_rPr()
    for tag in ("a:ea", "a:cs"):
        el = rPr.find(qn(tag))
        if el is None:
            el = rPr.makeelement(qn(tag), {})
            rPr.append(el)
        el.set("typeface", FONT)
    if HEB.search(run.text or ""):
        rPr.set("lang", "he-IL")


def textbox(slide, x, y, w, h, paras, size=18, color=DARK, bold=False,
            align=None, anchor=MSO_ANCHOR.TOP, spacing=1.15, space_after=6, margin=0.05):
    """paras: list of str or list of (text, overrides) / list of run lists."""
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.word_wrap = True
    tf.auto_size = MSO_AUTO_SIZE.NONE
    tf.vertical_anchor = anchor
    for side in ("left", "right", "top", "bottom"):
        setattr(tf, f"margin_{side}", Inches(margin))
    for i, p in enumerate(paras):
        if isinstance(p, str):
            p = {"runs": [{"t": p}]}
        para = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        text_all = "".join(r["t"] for r in p["runs"])
        rtl = bool(HEB.search(text_all))
        para.alignment = p.get("align", align if align is not None else (PP_ALIGN.RIGHT if rtl else PP_ALIGN.LEFT))
        para.line_spacing = spacing
        para.space_after = Pt(p.get("space_after", space_after))
        if rtl:
            para._p.get_or_add_pPr().set("rtl", "1")
        for r in p["runs"]:
            run = para.add_run()
            run.text = r["t"]
            b = r.get("b")
            if b is None:
                b = p.get("b", bold)
            set_font(run, r.get("size", p.get("size", size)), r.get("color", p.get("color", color)), bool(b))
            if r.get("link"):
                run.hyperlink.address = r["link"]
    return tb


def picture(slide, path, x, y, w=None, h=None):
    return slide.shapes.add_picture(path, x, y, w, h)


def badge(slide, size=Inches(0.62), x=None, y=Inches(0.22)):
    """Kala round logo, top-left (RTL decks keep the heading on the right)."""
    x = Inches(0.3) if x is None else x
    picture(slide, f"{ASSETS}/s1_2.png", x, y, size, size)


def footer(slide, n, on_dark=False):
    c = WHITE if on_dark else MUTED
    textbox(slide, Inches(0.3), H - Inches(0.42), Inches(4), Inches(0.3),
            [{"runs": [{"t": "KALA YOGA  ·  Artistic Vinyasa"}]}], size=9, color=c, align=PP_ALIGN.LEFT)
    textbox(slide, W - Inches(1.3), H - Inches(0.42), Inches(1), Inches(0.3),
            [{"runs": [{"t": str(n)}]}], size=9, color=c, align=PP_ALIGN.RIGHT)


def heading(slide, text_runs, y=Inches(0.38), size=26, w=None):
    w = w or (W - Inches(1.6))
    x = W - Inches(0.5) - w
    textbox(slide, x, y, w, Inches(0.75), [{"runs": text_runs}], size=size, color=PLUM, bold=True,
            anchor=MSO_ANCHOR.MIDDLE)
    # short orange accent bar under heading, aligned right (RTL)
    rect(slide, W - Inches(0.55) - Inches(0.9), y + Inches(0.8), Inches(0.9), Inches(0.06), ORANGE,
         MSO_SHAPE.ROUNDED_RECTANGLE, 0.5)


def light_canvas(slide, n, motif="br"):
    bg(slide, CREAM)
    tw = Inches(2.6)
    if motif == "bl":
        picture(slide, f"{ASSETS}/tree_plum.png", Inches(-0.5), H - tw + Inches(0.4), tw, tw)
    else:
        picture(slide, f"{ASSETS}/tree_plum.png", W - tw + Inches(0.5), H - tw + Inches(0.4), tw, tw)
    badge(slide)
    footer(slide, n)


def copy_notes(dst_slide, src_slide):
    if src_slide.has_notes_slide:
        txt = src_slide.notes_slide.notes_text_frame.text
        if txt.strip():
            dst_slide.notes_slide.notes_text_frame.text = txt


def clean(paras):
    """Drop trailing empty paragraphs; strip stray spaces."""
    out = [p for p in paras if "".join(r["t"] for r in p["runs"]).strip()]
    for p in out:
        for r in p["runs"]:
            r["t"] = r["t"].replace(" ", " ")
        p["runs"][0]["t"] = p["runs"][0]["t"].lstrip()
        p["runs"][-1]["t"] = p["runs"][-1]["t"].rstrip()
    return out


def texts(sl):
    return [d for d in sl["shapes"] if d.get("paras")]


def imgs(sl):
    return [d["img"] for d in sl["shapes"] if d.get("img")]


# ======================= LAYOUTS =======================

def L_title(s, sl, n):
    bg(s, PLUM)
    tw = Inches(4.6)
    picture(s, f"{ASSETS}/tree_white.png", W - tw + Inches(0.9), Inches(-0.4), tw, tw)
    # big logo in white circle (left)
    d = Inches(2.9)
    cx, cy = Inches(0.75), (H - d) / 2 - Inches(0.1)
    rect(s, cx - Inches(0.12), cy - Inches(0.12), d + Inches(0.24), d + Inches(0.24), WHITE, MSO_SHAPE.OVAL)
    picture(s, f"{ASSETS}/{imgs(sl)[1]}", cx, cy, d, d)
    paras = clean(texts(sl)[0]["paras"])
    x, w = Inches(4.3), W - Inches(4.3) - Inches(0.6)
    textbox(s, x, Inches(1.25), w, Inches(0.9), [{"runs": paras[0]["runs"]}], size=44, color=WHITE, bold=True)
    textbox(s, x, Inches(2.1), w, Inches(0.7), [{"runs": paras[1]["runs"]}], size=28, color=WHITE,
            align=PP_ALIGN.RIGHT)
    rect(s, W - Inches(0.65) - Inches(1.1), Inches(2.95), Inches(1.1), Inches(0.07), ORANGE,
         MSO_SHAPE.ROUNDED_RECTANGLE, 0.5)
    textbox(s, x, Inches(3.1), w, Inches(0.5), [{"runs": paras[2]["runs"]}], size=18, color=WHITE,
            align=PP_ALIGN.RIGHT)
    # accreditation logos on white rounded cards (bottom right)
    cw = Inches(0.95)
    for i, im in enumerate([imgs(sl)[0], imgs(sl)[2]]):
        x0 = W - Inches(0.65) - cw - i * (cw + Inches(0.2))
        y0 = H - cw - Inches(0.45)
        rect(s, x0, y0, cw, cw, WHITE, MSO_SHAPE.ROUNDED_RECTANGLE, 0.18)
        pad = Inches(0.1)
        picture(s, f"{ASSETS}/{im}", x0 + pad, y0 + pad, cw - 2 * pad, cw - 2 * pad)


def L_section(s, sl, n):
    bg(s, PLUM)
    tw = Inches(4.2)
    picture(s, f"{ASSETS}/tree_white.png", Inches(-0.8), H - tw + Inches(0.9), tw, tw)
    picture(s, f"{ASSETS}/tree_white.png", W - Inches(2.2), Inches(-1.4), Inches(3), Inches(3))
    paras = clean(texts(sl)[0]["paras"])
    textbox(s, Inches(0.8), Inches(1.75), W - Inches(1.6), Inches(1.3), [{"runs": paras[0]["runs"]}],
            size=36, color=WHITE, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    rect(s, (W - Inches(1.2)) / 2, Inches(3.2), Inches(1.2), Inches(0.07), ORANGE, MSO_SHAPE.ROUNDED_RECTANGLE, 0.5)
    badge(s, Inches(0.7), x=(W - Inches(0.7)) / 2, y=Inches(0.55))
    footer(s, n, on_dark=True)


def L_quote(s, sl, n):
    light_canvas(s, n, motif="bl")
    paras = clean(texts(sl)[0]["paras"])
    heading(s, paras[0]["runs"], size=20)
    # quote card
    x, y, w, h = Inches(0.9), Inches(1.65), W - Inches(1.8), Inches(3.1)
    rect(s, x, y, w, h, WHITE, MSO_SHAPE.ROUNDED_RECTANGLE, 0.09)
    rect(s, x + w - Inches(0.12), y + Inches(0.45), Inches(0.12), h - Inches(0.9), TEAL)  # right accent
    textbox(s, x + w - Inches(1.05), y - Inches(0.05), Inches(0.9), Inches(1.0),
            [{"runs": [{"t": "”"}]}], size=72, color=ORANGE, bold=True, align=PP_ALIGN.RIGHT)
    textbox(s, x + Inches(0.5), y + Inches(0.75), w - Inches(1.2), h - Inches(1.0),
            [{"runs": p["runs"]} for p in paras[1:]], size=20, color=DARK, spacing=1.3,
            anchor=MSO_ANCHOR.TOP)


def L_list(s, sl, n):
    light_canvas(s, n, motif="bl")
    paras = clean(texts(sl)[0]["paras"])
    head = [p for p in paras if not p["num"]][:1]
    items = [p for p in paras if p["num"]]
    heading(s, head[0]["runs"], size=22)
    rows = (len(items) + 1) // 2
    top, gap = Inches(1.5), Inches(0.1)
    ph = (H - top - Inches(0.6) - gap * (rows - 1)) / rows
    colw = (W - Inches(1.0) - Inches(0.25)) / 2
    for i, it in enumerate(items):
        col, row = divmod(i, rows)  # first column = right side (RTL)
        x = W - Inches(0.5) - colw - col * (colw + Inches(0.25))
        y = top + row * (ph + gap)
        rect(s, x, y, colw, ph, WHITE, MSO_SHAPE.ROUNDED_RECTANGLE, 0.5)
        d = ph - Inches(0.12)
        cx = x + colw - d - Inches(0.06)
        rect(s, cx, y + Inches(0.06), d, d, PLUM if i % 2 == 0 else TEAL_DEEP, MSO_SHAPE.OVAL)
        textbox(s, cx, y + Inches(0.06), d, d, [{"runs": [{"t": str(i + 1)}]}], size=12, color=WHITE,
                bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, margin=0)
        textbox(s, x + Inches(0.15), y, colw - d - Inches(0.35), ph, [{"runs": it["runs"]}], size=12.5,
                color=DARK, anchor=MSO_ANCHOR.MIDDLE, spacing=1.0, space_after=0)


def L_longtext(s, sl, n):
    light_canvas(s, n, motif="bl")
    paras = clean(texts(sl)[0]["paras"])
    body = [p for p in paras if not all(r["b"] for r in p["runs"])]
    callout = [p for p in paras if all(r["b"] for r in p["runs"])]
    rect(s, W - Inches(0.62), Inches(0.5), Inches(0.07), Inches(2.9), ORANGE, MSO_SHAPE.ROUNDED_RECTANGLE, 0.5)
    textbox(s, Inches(1.2), Inches(0.42), W - Inches(1.95), Inches(3.1),
            [{"runs": p["runs"]} for p in body], size=16.5, color=DARK, spacing=1.3, space_after=10)
    if callout:
        x, y, w, h = Inches(1.2), Inches(3.6), W - Inches(1.75), Inches(1.15)
        rect(s, x, y, w, h, PLUM, MSO_SHAPE.ROUNDED_RECTANGLE, 0.25)
        textbox(s, x + Inches(0.3), y, w - Inches(0.6), h,
                [{"runs": [dict(r, b=True) for r in p["runs"]]} for p in callout], size=17, color=WHITE,
                anchor=MSO_ANCHOR.MIDDLE, spacing=1.2)


def L_media(s, sl, n):
    light_canvas(s, n)
    ts = texts(sl)
    title = clean(ts[0]["paras"])[0]
    link_paras = clean(ts[1]["paras"])
    url = next(r["link"] for p in link_paras for r in p["runs"] if r.get("link"))
    textbox(s, Inches(0.8), Inches(0.35), W - Inches(1.6), Inches(0.75), [{"runs": title["runs"]}],
            size=28, color=PLUM, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    rect(s, (W - Inches(1.0)) / 2, Inches(1.12), Inches(1.0), Inches(0.06), ORANGE, MSO_SHAPE.ROUNDED_RECTANGLE, 0.5)
    # video card (whole card clickable)
    cw, ch = Inches(5.2), Inches(2.75)
    x, y = (W - cw) / 2, Inches(1.45)
    card = rect(s, x, y, cw, ch, PLUM_DEEP, MSO_SHAPE.ROUNDED_RECTANGLE, 0.08)
    card.click_action.hyperlink.address = url
    picture(s, f"{ASSETS}/tree_white.png", x + cw - Inches(2.2), y + ch - Inches(2.2), Inches(2.4), Inches(2.4))
    d = Inches(1.0)
    circ = rect(s, x + (cw - d) / 2, y + (ch - d) / 2, d, d, WHITE, MSO_SHAPE.OVAL)
    circ.click_action.hyperlink.address = url
    tri = rect(s, x + (cw - d) / 2 + Inches(0.36), y + (ch - d) / 2 + Inches(0.28), Inches(0.36), Inches(0.44),
               PLUM, MSO_SHAPE.ISOSCELES_TRIANGLE)
    tri.rotation = 90
    tri.click_action.hyperlink.address = url
    textbox(s, x, y + ch + Inches(0.12), cw, Inches(0.35),
            [{"runs": [{"t": url, "link": url}]}], size=11, color=TEAL, align=PP_ALIGN.CENTER)


def L_image(s, sl, n):
    light_canvas(s, n)
    paras = clean(texts(sl)[0]["paras"])
    # title block on the right
    x, w = Inches(5.1), W - Inches(5.1) - Inches(0.55)
    textbox(s, x, Inches(1.2), w, Inches(1.5), [{"runs": paras[0]["runs"]}], size=28, color=PLUM, bold=True,
            align=PP_ALIGN.RIGHT, anchor=MSO_ANCHOR.BOTTOM, spacing=1.1)
    rect(s, W - Inches(0.55) - Inches(0.9), Inches(2.85), Inches(0.9), Inches(0.06), ORANGE,
         MSO_SHAPE.ROUNDED_RECTANGLE, 0.5)
    textbox(s, x, Inches(3.0), w, Inches(1.0), [{"runs": p["runs"]} for p in paras[1:]], size=20, color=DARK,
            bold=True, align=PP_ALIGN.RIGHT, spacing=1.1)
    # framed photo on the left, teal offset frame behind
    from PIL import Image as _I
    iw, ih = _I.open(f"{ASSETS}/tree_photo.jpg").size
    ph_h = Inches(4.3)
    ph_w = Emu(int(ph_h * iw / ih))
    px, py = Inches(1.6), (H - ph_h) / 2 - Inches(0.05)
    rect(s, px + Inches(0.16), py + Inches(0.16), ph_w, ph_h, TEAL, MSO_SHAPE.ROUNDED_RECTANGLE, 0.05)
    picture(s, f"{ASSETS}/tree_photo.jpg", px, py, ph_w, ph_h)


LAYOUT_BY_SLIDE = {1: L_title, 2: L_section, 3: L_quote, 4: L_list, 5: L_longtext, 6: L_media, 7: L_image}

for sl, src_slide in zip(content, src.slides):
    s = prs.slides.add_slide(BLANK)
    for ph in list(s.placeholders):
        ph._element.getparent().remove(ph._element)
    LAYOUT_BY_SLIDE[sl["n"]](s, sl, sl["n"])
    copy_notes(s, src_slide)

prs.save(OUT)
print("saved", OUT, len(prs.slides), "slides")
