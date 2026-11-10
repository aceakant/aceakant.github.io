"""Link-preview picture for sharing one game on LinkedIn: play/chart-tricks.html shows this.
    python3 scripts/make_game_og.py"""
from PIL import Image, ImageDraw, ImageFilter
from make_og import font, OUT, ROOT

TEAL, RED, INK, MUTED = (60, 207, 196), (244, 98, 98), (240, 246, 249), (160, 180, 194)


def chart_tricks():
    W, H = 1200, 630
    im = Image.new("RGB", (W, H), (9, 18, 30))
    glow = Image.new("RGB", (W, H), (0, 0, 0))
    g = ImageDraw.Draw(glow)
    g.ellipse((640, -200, 1400, 520), fill=(70, 22, 30)); g.ellipse((-300, 380, 500, 900), fill=(14, 40, 70))
    im = Image.blend(im, glow.filter(ImageFilter.GaussianBlur(150)), 0.9)
    d = ImageDraw.Draw(im)
    for x in range(0, W, 48): d.line([(x, 0), (x, H)], fill=(19, 32, 47))
    for y in range(0, H, 48): d.line([(0, y), (W, y)], fill=(19, 32, 47))
    # left: the hook
    k = "PLAYGROUND · 60-SECOND GAME"
    d.rounded_rectangle((70, 70, 70 + d.textlength(k, font=font("semi", 22)) + 44, 112), radius=21, outline=TEAL, width=2)
    d.text((92, 78), k, font=font("semi", 22), fill=TEAL)
    y = 148
    for ln in ["This chart", "is lying."]:
        d.text((70, y), ln, font=font("bold", 80), fill=INK); y += 90
    d.text((70, y + 6), "Can you tell how?", font=font("bold", 54), fill=RED); y += 86
    for ln in ["Spot the trick behind 4 misleading", "charts before they fool your boss."]:
        d.text((70, y), ln, font=font("reg", 28), fill=MUTED); y += 38
    # right: the lying chart (axis starts at 100)
    x0, x1, top, base = 720, 1120, 120, 470
    d.rounded_rectangle((x0 - 40, top - 70, x1 + 30, base + 50), radius=22, fill=(14, 27, 41), outline=(40, 60, 78), width=2)
    d.text((x0 - 14, top - 52), '"Sales tripled this year!"', font=font("semi", 28), fill=INK)
    lo, hi = 100, 105
    yv = lambda v: base - (v - lo) / (hi - lo) * (base - top - 20)
    for v in range(100, 106):
        yy = yv(v)
        d.line([(x0 + 30, yy), (x1, yy)], fill=(34, 52, 68))
        d.text((x0 + 20, yy), str(v), font=font("reg", 20), fill=MUTED, anchor="rm")
    for i, (lab, v, col) in enumerate([("Last year", 102, (90, 130, 160)), ("This year", 104, TEAL)]):
        bx = x0 + 80 + i * 170
        d.rounded_rectangle((bx, yv(v), bx + 110, base), radius=8, fill=col)
        d.text((bx + 55, yv(v) - 12), str(v), font=font("semi", 26), fill=INK, anchor="mb")
        d.text((bx + 55, base + 12), lab, font=font("reg", 20), fill=MUTED, anchor="mt")
    # red question marks on the axis
    d.ellipse((x0 - 22, base - 22, x0 + 26, base + 22), outline=RED, width=4)  # circle the axis start
    # footer
    d.line([(70, 548), (1130, 548)], fill=(36, 55, 70), width=2)
    av = ROOT / "site" / "static" / "img" / "ajay-avatar.jpg"
    if av.exists():
        a = Image.open(av).convert("RGB").resize((52, 52)); m = Image.new("L", (52, 52), 0)
        ImageDraw.Draw(m).ellipse((0, 0, 51, 51), fill=255); im.paste(a, (70, 562), m)
    d.text((136, 564), "Ajay Kant", font=font("semi", 24), fill=INK)
    d.text((136, 592), "Risk, data and AI", font=font("reg", 19), fill=MUTED)
    d.rounded_rectangle((850, 562, 1130, 610), radius=24, fill=TEAL)
    d.text((990, 586), "Play free  →", font=font("semi", 24), fill=(9, 18, 30), anchor="mm")
    im.save(OUT / "game-chart-tricks.jpg", quality=88, optimize=True)


if __name__ == "__main__":
    chart_tricks()
