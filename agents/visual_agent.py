"""Agent 4 — Visual: builds the STAR image (PNG) used on the website and in the LinkedIn post.
Pure code: no API key needed. (Video is switched off for now.)"""
import pathlib

from PIL import Image, ImageDraw, ImageFont

from common import ROOT, config, load_yaml, log

W, H = 1080, 1350                     # 4:5 portrait — best size for the LinkedIn feed
FONTS = pathlib.Path(__file__).parent / "fonts"
INK, MUTED, PAPER, GOLD = "#0B1B26", "#56666F", "#F2F5F6", "#B9770E"


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


def frame_base(accent, footer=True):
    img = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 14], fill=accent)
    if footer:
        cfg = config()["site"]
        d.line([72, H - 120, W - 72, H - 120], fill="#E3E8EC", width=2)
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
        d.text((x, H - 58), "Weekly insight · Risk, Data & AI", font=font("Regular", 24), fill=MUTED)
    return img, d


def star_card(art, accent, path):
    """One-image STAR summary used on the website and as the LinkedIn image."""
    img, d = frame_base(accent)
    d.text((72, 64), "THIS WEEK'S PROBLEM, SOLVED", font=font("SemiBold", 24), fill=GOLD)
    y = draw_lines(d, (72, 108), wrap(d, art["title"], font("Bold", 50), W - 144)[:3], font("Bold", 50), INK, 1.18)
    y += 26
    labels = [("S", "Situation", "situation"), ("T", "Task", "task"), ("A", "Action", "action"), ("R", "Result", "result")]
    box_h = (H - 150 - y - 3 * 18) // 4
    for letter, name, key in labels:
        d.rounded_rectangle([72, y, W - 72, y + box_h], radius=22, fill="#FFFFFF", outline="#E3E8EC", width=2)
        d.rounded_rectangle([96, y + 24, 172, y + 100], radius=16, fill=accent)
        d.text((134, y + 62), letter, font=font("Bold", 44), fill="#FFFFFF", anchor="mm")
        d.text((196, y + 22), name.upper(), font=font("SemiBold", 22), fill=accent)
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
