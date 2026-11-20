# Kala Yoga slide redesign

Restyles Kala Yoga Google Slides decks to match kalayoga.co.il, as a separate twin file. The originals are never touched.

Design tokens (from the site's Elementor kit): plum #A42858, dark #231F20, orange #F59B1F, teal #2FB1B0, cream background, Rubik font, tree motif, rounded cards.

Pipeline (the Google Slides API connector is denied, so we go through Drive):
1. Drive `download_file_content` the original as pptx (and as pdf, for the "before" view).
2. `python3 -I extract.py orig.pptx assets/` extracts the text, notes and images.
3. `python3 -I build.py orig.pptx assets/ new.pptx` rebuilds the deck with layout functions.
4. Drive `create_file` uploads it with conversion. The limit is about 3 MB, so use JPEG for photos.
5. Export the new file to pdf from Drive and check Google's render. LibreOffice previews lack Rubik and get RTL wrong.

Assets needed in assets/: tree_white.png and tree_plum.png (tinted from the site's frame-hero.png), plus the extracted images.
`LAYOUT_BY_SLIDE` in build.py is currently mapped by hand for the pilot deck.

Brand assets live in `brand/`. Copy `tree_white.png`, `tree_plum.png` and `kala_logo_1200.png` into the assets dir. build.py expects the logo as `s1_2.png`; generalize this when rolling out.

Status (2026-11-20): pilot deck done → Drive "Kala Yoga – New Design (twin decks)" folder (id 1QWtfv0rIhicRETsbMdazQcOVhoF9gDiZ), file id 18b0y4LMrOwMI3MstIf-cbudZd3bZrSqSEs2S0bhBUYA. Emailed Shani (shani@kalayoga.co.il, Gmail thread 1a1f883d90b80504) asking: roll out to all ~30 decks, or tweak? Waiting for her reply.

## Generic restyle (use this for new decks)
`python3 -I restyle.py orig.pptx brand/ new.pptx` classifies each slide:
- title: first slide with "קורס" and 3 logos
- section: short text only, no pictures, tables or numbered lists
- closing: the "Rumi" slide with the rotated tree photo
- in place: everything else. Positions, images and tables stay as they are. The slide gets a cream background, plum headings, Rubik font, white cards behind pictures and plum table headers. No footer.

It also shrinks heavy images and drops embedded fonts, so the upload stays under about 3 MB.
Check with Google's PDF render, using `sheet.py` for a contact sheet and `ba.py` for a before/after sheet.

Done 2026-11-20 (Drive folder above):
- pilot: 18b0y4LMrOwMI3MstIf-cbudZd3bZrSqSEs2S0bhBUYA
- session 5 "Golden principles": 1J9weu7WWTZEW495VdCuuMlR44TtGBPvc-V5pTTHurPw
- session 6 "Yama 1": 1ci5ydEPpQxPaTe3qvxlx7Ho03N--T9Es5GVJDdtSDog
