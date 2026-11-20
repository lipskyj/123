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
