"""
Generates DEMO product imagery for SLEEP TALK from the client's own artwork.

Draws simple flat-lay garment silhouettes (tee, hoodie, jacket, shirt, pants,
tracksuit) in brand colourways and places the supplied logo artwork on them.
These are development placeholders only - replace with real product photography
before launch (see src/content/demo-assets.ts).

Usage:  python -I scripts/generate-demo-images.py
Output: public/images/demo/<garment>-<colourway>-<view>.jpg
"""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageChops

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "images", "demo")
BRAND = os.path.join(ROOT, "public", "brand")
os.makedirs(OUT, exist_ok=True)

W, H = 1000, 1250  # 4:5 product ratio
SS = 2  # supersampling factor for anti-aliasing

COLOURWAYS = {
    # name: (top fill, bottom fill, background, art variant)
    "black": ((22, 22, 22), (22, 22, 22), (236, 231, 222), "light"),
    "cream": ((232, 224, 208), (232, 224, 208), (52, 50, 47), "dark"),
    "charcoal": ((64, 64, 66), (64, 64, 66), (231, 226, 216), "light"),
    "block": ((232, 224, 208), (22, 22, 22), (214, 207, 195), "dark"),
}


def S(pts):
    return [(x * SS, y * SS) for x, y in pts]


def tee_shapes():
    body = [(380, 170), (620, 170), (790, 230), (890, 420), (790, 470), (735, 400),
            (735, 1080), (265, 1080), (265, 400), (210, 470), (110, 420), (210, 230)]
    neck = (420, 135, 580, 235)
    return body, neck, []


def hoodie_shapes():
    body = [(360, 230), (640, 230), (800, 300), (900, 900), (905, 1010), (820, 1020),
            (745, 560), (745, 1110), (255, 1110), (255, 560), (180, 1020), (95, 1010),
            (100, 900), (200, 300)]
    hood = (360, 110, 640, 360)
    details = [("pocket", [(340, 820), (660, 820), (700, 1000), (300, 1000)]),
               ("cuffband", (255, 1060, 745, 1110))]
    return body, hood, details


def jacket_shapes():
    body = [(360, 200), (640, 200), (800, 270), (900, 880), (905, 990), (820, 1000),
            (745, 540), (745, 1090), (255, 1090), (255, 540), (180, 1000), (95, 990),
            (100, 880), (200, 270)]
    collar = (400, 160, 600, 260)
    details = [("zip", (497, 240, 503, 1090)), ("cuffband", (255, 1040, 745, 1090))]
    return body, collar, details


def shirt_shapes():
    body = [(370, 190), (630, 190), (800, 260), (890, 900), (890, 990), (815, 1000),
            (740, 540), (740, 1100), (260, 1100), (260, 540), (185, 1000), (110, 990),
            (110, 900), (200, 260)]
    collar = [(400, 175), (500, 290), (600, 175), (560, 150), (500, 200), (440, 150)]
    details = [("placket", (488, 260, 512, 1100)), ("collar", collar)]
    return body, None, details


def pants_shapes():
    body = [(320, 150), (680, 150), (720, 1150), (540, 1150), (500, 470), (460, 1150),
            (280, 1150)]
    details = [("waist", (318, 150, 682, 215)), ("cargo", (305, 640, 385, 790)),
               ("cargo", (615, 640, 695, 790))]
    return body, None, details


def build_mask(body, extra_ellipse=None):
    m = Image.new("L", (W * SS, H * SS), 0)
    d = ImageDraw.Draw(m)
    d.polygon(S(body), fill=255)
    if extra_ellipse:
        x0, y0, x1, y1 = extra_ellipse
        d.ellipse((x0 * SS, y0 * SS, x1 * SS, y1 * SS), fill=255)
    return m


def place_art(canvas, art_path, box_w, center, opacity=1.0):
    art = Image.open(art_path).convert("RGBA")
    ratio = (box_w * SS) / art.width
    art = art.resize((int(art.width * ratio), int(art.height * ratio)), Image.LANCZOS)
    if opacity < 1:
        a = art.getchannel("A").point(lambda v: int(v * opacity))
        art.putalpha(a)
    cx, cy = center
    canvas.alpha_composite(art, (int(cx * SS - art.width / 2), int(cy * SS - art.height / 2)))


def render_garment(kind, colourway, view, scale=1.0, offset=(0, 0), canvas=None, bg=None):
    top, bottom, bgc, art_variant = COLOURWAYS[colourway]
    if canvas is None:
        canvas = Image.new("RGBA", (W * SS, H * SS), (*bgc, 255))

    shapes = {"tee": tee_shapes, "hoodie": hoodie_shapes, "jacket": jacket_shapes,
              "shirt": shirt_shapes, "pants": pants_shapes}[kind]()
    body, head, details = shapes

    # Transform points for scale/offset (used for tracksuit composite plates)
    def tf(pts):
        return [(x * scale + offset[0], y * scale + offset[1]) for x, y in pts]

    def tfbox(b):
        x0, y0, x1, y1 = b
        return (x0 * scale + offset[0], y0 * scale + offset[1], x1 * scale + offset[0], y1 * scale + offset[1])

    body_t = tf(body)
    head_t = tfbox(head) if (head and kind in ("hoodie",)) else None
    mask = build_mask(body_t, head_t)

    # Soft drop shadow
    shadow = mask.filter(ImageFilter.GaussianBlur(18 * SS))
    shadow = ImageChops.offset(shadow, 0, 14 * SS).point(lambda v: int(v * 0.35))
    canvas.paste((0, 0, 0, 255), (0, 0), shadow)

    # Colour fill (colour-block: top colour above split line, bottom below)
    split = (offset[1] + 560 * scale) * SS
    fill = Image.new("RGBA", canvas.size, (*top, 255))
    if bottom != top:
        d = ImageDraw.Draw(fill)
        d.rectangle((0, split, canvas.width, canvas.height), fill=(*bottom, 255))
    canvas.paste(fill, (0, 0), mask)

    d = ImageDraw.Draw(canvas)
    seam = tuple(max(0, c - 28) for c in top) if sum(top) > 200 else tuple(min(255, c + 26) for c in top)
    seam_b = tuple(max(0, c - 28) for c in bottom) if sum(bottom) > 200 else tuple(min(255, c + 26) for c in bottom)

    if kind == "tee" and head:
        x0, y0, x1, y1 = tfbox(head)
        d.ellipse((x0 * SS, y0 * SS, x1 * SS, y1 * SS), fill=(*bgc, 255))
        d.arc((x0 * SS, y0 * SS, x1 * SS, y1 * SS), 0, 180, fill=(*seam, 255), width=10 * SS)
    if kind == "hoodie" and head:
        x0, y0, x1, y1 = tfbox(head)
        inset = 45 * scale
        d.ellipse(((x0 + inset) * SS, (y0 + inset + 20 * scale) * SS, (x1 - inset) * SS, (y1 - inset) * SS),
                  fill=(*seam, 255))
        for sx in (470, 530):
            p = tf([(sx, 330), (sx + (-8 if sx < 500 else 8), 520)])
            d.line(S(p), fill=(*seam, 255), width=5 * SS)
    if kind == "jacket" and head:
        x0, y0, x1, y1 = tfbox(head)
        d.rounded_rectangle((x0 * SS, y0 * SS, x1 * SS, y1 * SS), radius=30 * SS, fill=(*seam, 255))

    for name, geo in details:
        colour = seam_b if name in ("cuffband", "pocket", "cargo") and bottom != top else seam
        if name in ("pocket", "collar"):
            d.polygon(S(tf(geo)), outline=(*colour, 255), width=4 * SS)
        else:
            x0, y0, x1, y1 = tfbox(geo)
            if name == "zip":
                d.rectangle((x0 * SS, y0 * SS, x1 * SS, y1 * SS), fill=(*colour, 255))
            elif name == "placket":
                d.rectangle((x0 * SS, y0 * SS, x1 * SS, y1 * SS), outline=(*colour, 255), width=3 * SS)
                cy = y0 + 40 * scale
                while cy < y1 - 20 * scale:
                    r = 6 * scale
                    d.ellipse(((x0 + x1) / 2 * SS - r * SS, cy * SS - r * SS, (x0 + x1) / 2 * SS + r * SS, cy * SS + r * SS),
                              fill=(*colour, 255))
                    cy += 110 * scale
            else:
                d.rectangle((x0 * SS, y0 * SS, x1 * SS, y1 * SS), outline=(*colour, 255), width=4 * SS)

    # Artwork placement (front: emblem/wordmark; back: lockup or wordmark)
    is_top_dark_art = "dark" if sum(top) > 400 else "light"
    lockup = os.path.join(BRAND, f"emblem-lockup-{is_top_dark_art}.png")
    wordmark = os.path.join(BRAND, f"wordmark-{is_top_dark_art}.png")
    moon = os.path.join(BRAND, f"moon-mark-{is_top_dark_art}.png")
    emblem = os.path.join(BRAND, f"emblem-{is_top_dark_art}.png")

    def c(x, y):
        return (x * scale + offset[0], y * scale + offset[1])

    if kind in ("tee", "hoodie"):
        if view == "front":
            place_art(canvas, lockup, 230 * scale, c(500, 500 if kind == "tee" else 530))
        else:
            place_art(canvas, wordmark, 330 * scale, c(500, 430))
    elif kind == "jacket":
        if view == "front":
            place_art(canvas, moon, 70 * scale, c(620, 420))
        else:
            place_art(canvas, lockup, 300 * scale, c(500, 560))
    elif kind == "shirt":
        if view == "front":
            place_art(canvas, emblem, 90 * scale, c(620, 420))
        else:
            place_art(canvas, lockup, 280 * scale, c(500, 560))
    elif kind == "pants":
        art_on_bottom = "dark" if sum(bottom) > 400 else "light"
        if view == "front":
            place_art(canvas, os.path.join(BRAND, f"moon-mark-{art_on_bottom}.png"), 60 * scale, c(380, 330))
        else:
            place_art(canvas, os.path.join(BRAND, f"wordmark-{art_on_bottom}.png"), 150 * scale, c(600, 320))
    return canvas


def save(canvas, name):
    img = canvas.resize((W, H), Image.LANCZOS).convert("RGB")
    path = os.path.join(OUT, name)
    img.save(path, quality=84, optimize=True, progressive=True)
    return path


def main():
    count = 0
    for kind in ("tee", "hoodie", "jacket", "shirt", "pants"):
        for cw in COLOURWAYS:
            for view in ("front", "back"):
                cv = render_garment(kind, cw, view)
                save(cv, f"{kind}-{cw}-{view}.jpg")
                count += 1
    # Tracksuit composite plates: top + matching pants
    for cw in COLOURWAYS:
        for view in ("front", "back"):
            top, bottom, bgc, _ = COLOURWAYS[cw]
            canvas = Image.new("RGBA", (W * SS, H * SS), (*bgc, 255))
            # For sets, colour-block applies across the set: cream top, black pants
            set_top = cw if cw != "block" else "cream"
            set_bottom = cw if cw != "block" else "black"
            # temporarily render each piece with its own colourway onto shared canvas
            COLOURWAYS["_tmp_top"] = (*COLOURWAYS[set_top][:2], bgc, COLOURWAYS[set_top][3])
            COLOURWAYS["_tmp_bottom"] = (*COLOURWAYS[set_bottom][:2], bgc, COLOURWAYS[set_bottom][3])
            render_garment("hoodie" if view == "front" else "jacket", "_tmp_top", view, scale=0.58,
                           offset=(10, 150), canvas=canvas)
            render_garment("pants", "_tmp_bottom", view, scale=0.62, offset=(460, 230), canvas=canvas)
            del COLOURWAYS["_tmp_top"], COLOURWAYS["_tmp_bottom"]
            save(canvas, f"tracksuit-{cw}-{view}.jpg")
            count += 1
    # Detail crops from the supplied garment artwork photography
    art = Image.open(os.path.join(BRAND, "garment-back-artwork.jpg"))
    aw, ah = art.size
    crop = art.crop((int(aw * 0.20), 0, int(aw * 0.75), int(aw * 0.55 * 1.25)))
    crop.resize((W, H), Image.LANCZOS).save(os.path.join(OUT, "detail-emblem.jpg"), quality=84, optimize=True)
    front = Image.open(os.path.join(BRAND, "garment-front-wordmark.jpg"))
    fw, fh = front.size
    fc = front.crop((int(fw * 0.22), int(fh * 0.12), int(fw * 0.78), int(fh * 0.12) + int(fw * 0.56 * 1.25)))
    fc.resize((W, H), Image.LANCZOS).save(os.path.join(OUT, "detail-wordmark.jpg"), quality=84, optimize=True)
    print(f"Generated {count + 2} demo images in {OUT}")


if __name__ == "__main__":
    main()
