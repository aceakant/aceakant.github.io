"""Picture cards for the Wednesday no-link insight posts (content/game-posts.yaml `insights`).
    python3 scripts/make_insight_cards.py"""
import pathlib
import sys

import yaml
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from make_og import font, ROOT  # noqa: E402

TEAL, AMBER, INK, MUTED = (60, 207, 196), (246, 190, 80), (240, 246, 249), (160, 180, 194)
W = H = 1200


def wrap(d, text, f, width):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textlength(t, font=f) <= width:
            cur = t
        else:
            lines.append(cur); cur = w
    return lines + [cur]


def card(ins, n, total):
    im = Image.new("RGB", (W, H), (9, 18, 30))
    glow = Image.new("RGB", (W, H)); g = ImageDraw.Draw(glow)
    g.ellipse((600, -300, 1500, 500), fill=(16, 60, 70)); g.ellipse((-300, 800, 600, 1500), fill=(14, 36, 66))
    im = Image.blend(im, glow.filter(ImageFilter.GaussianBlur(160)), 0.9); d = ImageDraw.Draw(im)
    for x in range(0, W, 60): d.line([(x, 0), (x, H)], fill=(17, 30, 44))
    for y in range(0, H, 60): d.line([(0, y), (W, y)], fill=(17, 30, 44))
    d.text((90, 90), "RISK NOTE  ·  " + f"{n:02d}", font=font("semi", 26), fill=TEAL)
    y = 160
    for ln in wrap(d, ins["title"], font("bold", 76), W - 180):
        d.text((90, y), ln, font=font("bold", 76), fill=INK); y += 90
    y += 50
    for i, p in enumerate(ins["points"]):
        d.rounded_rectangle((90, y + 6, 136, y + 52), radius=12, fill=AMBER if i == 2 else TEAL)
        d.text((113, y + 29), str(i + 1), font=font("bold", 28), fill=(9, 18, 30), anchor="mm")
        lines = wrap(d, p, font("reg", 38), W - 280)
        for ln in lines:
            d.text((166, y), ln, font=font("reg", 38), fill=INK if i == 2 else MUTED); y += 50
        y += 34
    d.line([(90, 1060), (1110, 1060)], fill=(36, 55, 70), width=2)
    av = ROOT / "site" / "static" / "img" / "ajay-avatar.jpg"
    a = Image.open(av).convert("RGB").resize((64, 64)); m = Image.new("L", (64, 64), 0)
    ImageDraw.Draw(m).ellipse((0, 0, 63, 63), fill=255); im.paste(a, (90, 1090), m)
    d.text((172, 1094), "Ajay Kant", font=font("semi", 28), fill=INK)
    d.text((172, 1128), "Risk, data and AI", font=font("reg", 21), fill=MUTED)
    out = ROOT / "site" / "static" / "og" / f"insight-{ins['id']}.jpg"
    im.save(out, quality=90)
    return out


if __name__ == "__main__":
    ins = yaml.safe_load((ROOT / "content" / "game-posts.yaml").read_text())["insights"]
    for i, x in enumerate(ins, 1):
        print(card(x, i, len(ins)).name)
