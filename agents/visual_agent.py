"""Agent 4 — Visual: builds the STAR image (PNG) used on the website and in the LinkedIn post.
Pure code: no API key needed. (Video is switched off for now.)"""
import pathlib

from PIL import Image, ImageDraw, ImageFont

from common import ROOT, config, load_yaml, log

W, H = 1080, 1350                     # 4:5 portrait — best size for the LinkedIn feed
FONTS = pathlib.Path(__file__).parent / "fonts"
INK, MUTED, PAPER, GOLD = "#E9F1F7", "#97AABC", "#050C17", "#F5C04E"
TEAL, GLASS, LINE = "#2FD3C8", "#0F2340", "#1F3A5C"


def font(weight, size):
    return ImageFont.truetype(str(FONTS / f"Inter-{weight}.otf"), size)


def wrap(draw, text, fnt, width):
    words, lines, line = text.split(), [], ""
    for w in words:
        test = f"{line} {w}".strip()
        if draw.textlength(test, font=fnt) <= width:
            line = test
        else:
            lines.append(line)
            line = w
    if line:
        lines.append(line)
    return lines


def draw_lines(draw, xy, lines, fnt, fill, gap=1.28):
    x, y = xy
    for ln in lines:
        draw.text((x, y), ln, font=fnt, fill=fill)
        y += int(fnt.size * gap)
    return y


def sky():
    """Navy night-sky background with a centre glow and soft teal/gold dots (the site's Constellation look)."""
    import math, random
    img = Image.new("RGB", (W, H), PAPER)
    glow = Image.new("L", (W, H), 0)
    gd = ImageDraw.Draw(glow)
    for r in range(900, 0, -12):
        gd.ellipse([W / 2 - r, H * 0.3 - r * 0.8, W / 2 + r, H * 0.3 + r * 0.8], fill=int(140 * (1 - r / 900) ** 1.6))
    img = Image.composite(Image.new("RGB", (W, H), "#0F294C"), img, glow)
    d = ImageDraw.Draw(img, "RGBA")
    for gx in range(28, W, 56):
        for gy in range(28, H, 56):
            d.point((gx, gy), fill=(150, 190, 230, 40))
    rnd = random.Random(7)
    for _ in range(46):
        x, y = rnd.uniform(0, W), rnd.uniform(0, H)
        col = (245, 192, 78) if rnd.random() < 0.2 else (47, 211, 200)
        for rad, a in ((9, 18), (5, 45), (2.4, 230)):
            d.ellipse([x - rad, y - rad, x + rad, y + rad], fill=col + (a,))
    return img


def frame_base(accent, footer=True):
    img = sky()
    d = ImageDraw.Draw(img, "RGBA")
    d.rectangle([0, 0, W, 10], fill=TEAL)
    if footer:
        cfg = config()["site"]
        d.line([72, H - 120, W - 72, H - 120], fill=LINE, width=2)
        x = 72
        avatar = ROOT / "site" / (load_yaml("content/profile.yaml").get("avatar") or "")
        if avatar.is_file():
            size = 76
            face = Image.open(avatar).convert("RGB").resize((size, size), Image.LANCZOS)
            mask = Image.new("L", (size, size), 0)
            ImageDraw.Draw(mask).ellipse([0, 0, size - 1, size - 1], fill=255)
            img.paste(face, (72, H - 100), mask)
            x = 72 + size + 20
        d.text((x, H - 96), cfg["author"], font=font("SemiBold", 30), fill=INK)
        d.text((x, H - 58), config()["site"].get("weekly_name", "Weekly") + " · Risk, Data & AI", font=font("Regular", 24), fill=MUTED)
    return img, d


def star_card(art, accent, path):
    """One-image STAR summary used on the website and as the LinkedIn image."""
    img, d = frame_base(accent)
    d.text((72, 64), config()["site"].get("weekly_name", "").upper() + " · THIS WEEK'S PROBLEM, SOLVED", font=font("SemiBold", 24), fill=GOLD)
    y = draw_lines(d, (72, 108), wrap(d, art["title"], font("Bold", 50), W - 144)[:3], font("Bold", 50), INK, 1.18)
    y += 26
    labels = [("S", "Situation", "situation"), ("T", "Task", "task"), ("A", "Action", "action"), ("R", "Result", "result")]
    box_h = (H - 150 - y - 3 * 18) // 4
    for letter, name, key in labels:
        d.rounded_rectangle([72, y, W - 72, y + box_h], radius=22, fill=(15, 35, 64, 200), outline=LINE, width=2)
        tile = GOLD if letter == "R" else TEAL
        d.rounded_rectangle([96, y + 24, 172, y + 100], radius=16, fill=tile)
        d.text((134, y + 62), letter, font=font("Bold", 44), fill="#03211F", anchor="mm")
        d.text((196, y + 22), name.upper(), font=font("SemiBold", 22), fill=tile)
        body = wrap(d, art["star"][key], font("Regular", 29), W - 72 - 196 - 28)
        max_lines = max(1, (box_h - 64) // 37)
        if len(body) > max_lines:
            body = body[:max_lines]
            body[-1] = body[-1].rstrip(".,;") + "…"
        draw_lines(d, (196, y + 58), body, font("Regular", 29), INK, 1.25)
        y += box_h + 18
    img.save(path, optimize=True)


def create(art, slug):
    out = ROOT / "content" / "media" / slug
    out.mkdir(parents=True, exist_ok=True)
    card = out / "star-card.png"
    star_card(art, config()["site"]["accent"], card)
    log("visual", f"STAR image → {card.relative_to(ROOT)}")
    return f"media/{slug}/star-card.png"
