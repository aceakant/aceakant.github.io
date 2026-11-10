"""Makes the link-preview pictures (1200 x 630) that LinkedIn, WhatsApp and X show when a page is shared.
One per Workbench tool, lab, main section and article without its own image. Run it after adding a tool or lab:
    python3 scripts/make_og.py
The pictures are saved in site/static/og/ and committed; the site build only looks them up."""
import pathlib
import textwrap

import yaml
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "site" / "static" / "og"
FONTS = ["/usr/share/fonts/opentype/inter/{}.otf", "/usr/share/fonts/truetype/dejavu/{}.ttf"]
ACCENTS = {"teal": (60, 207, 196), "amber": (240, 180, 76), "violet": (167, 139, 250), "rose": (244, 114, 182), "blue": (96, 165, 250)}


def font(weight, size):
    names = {"bold": ["InterDisplay-Bold", "DejaVuSans-Bold"], "semi": ["Inter-SemiBold", "DejaVuSans-Bold"], "reg": ["Inter-Regular", "DejaVuSans"]}[weight]
    for pattern, name in zip(FONTS, names):
        p = pathlib.Path(pattern.format(name))
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def card(key, kicker, title, blurb, accent=(60, 207, 196)):
    W, H = 1200, 630
    im = Image.new("RGB", (W, H), (9, 18, 30))
    glow = Image.new("RGB", (W, H), (0, 0, 0))
    d = ImageDraw.Draw(glow)
    d.ellipse((700, -250, 1450, 420), fill=tuple(int(c * 0.35) for c in accent))
    d.ellipse((-300, 380, 500, 900), fill=(14, 40, 70))
    im = Image.blend(im, glow.filter(ImageFilter.GaussianBlur(140)), 0.9)
    d = ImageDraw.Draw(im)
    for x in range(0, W, 48):  # faint grid
        d.line([(x, 0), (x, H)], fill=(20, 34, 50))
    for y in range(0, H, 48):
        d.line([(0, y), (W, y)], fill=(20, 34, 50))
    d.rounded_rectangle((70, 70, 70 + 12 + d.textlength(kicker.upper(), font=font("semi", 24)) + 24, 116), radius=23, outline=accent, width=2)
    d.text((94, 79), kicker.upper(), font=font("semi", 24), fill=accent)
    size = 74 if len(title) < 34 else 62 if len(title) < 52 else 54
    lines = textwrap.wrap(title, width=int(1500 / size))[:3]
    y = 150
    for ln in lines:
        d.text((70, y), ln, font=font("bold", size), fill=(240, 246, 249))
        y += int(size * 1.15)
    for ln in textwrap.wrap(blurb, width=58)[:3]:
        d.text((70, y + 18), ln, font=font("reg", 30), fill=(170, 190, 202))
        y += 42
    d.line([(70, 540), (1130, 540)], fill=(36, 55, 70), width=2)
    av = ROOT / "site" / "static" / "img" / "ajay-avatar.jpg"
    if av.exists():
        a = Image.open(av).convert("RGB").resize((56, 56))
        m = Image.new("L", (56, 56), 0); ImageDraw.Draw(m).ellipse((0, 0, 55, 55), fill=255)
        im.paste(a, (70, 558), m)
    d.text((140, 562), "Ajay Kant", font=font("semi", 26), fill=(240, 246, 249))
    d.text((140, 592), "Risk, data and AI", font=font("reg", 20), fill=(150, 170, 182))
    d.text((1130, 574), "aceakant.github.io", font=font("semi", 26), fill=accent, anchor="ra")
    im.save(OUT / f"{key}.jpg", quality=86, optimize=True)
    return key


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    cfg = yaml.safe_load((ROOT / "config.yaml").read_text())
    made = [card("workbench", "Workbench", "Tools for risk, fraud and model work",
                 "Maker-checker AI tools and free simulators for credit, fraud and model risk.")]
    for t in yaml.safe_load((ROOT / "content" / "tools.yaml").read_text())["tools"]:
        made.append(card("tool-" + t["id"], "Workbench · " + ("AI tool" if t.get("style") == "ai" else "free tool"), t["name"], t["blurb"],
                         ACCENTS["teal"] if t.get("style") == "ai" else ACCENTS["amber"]))
    for lab in yaml.safe_load((ROOT / "content" / "labs.yaml").read_text())["labs"]:
        made.append(card("lab-" + lab["slug"], "Playground", lab["name"], lab.get("teaches", ""), ACCENTS.get(lab.get("color"), ACCENTS["violet"])))
    weekly = cfg["site"].get("weekly_name", "VertexNode")
    made.append(card("updates", weekly, "One real problem, solved in public every week",
                     "Fact-checked analysis on fraud, credit and AI in banking, with a game and an ROI calculator in every piece.", ACCENTS["blue"]))
    made.append(card("pulse", "Pulse", "Who visits, what they play, and how the AI is checked",
                     "Live, anonymous numbers for the site, the games and the maker-checker AI.", ACCENTS["teal"]))
    for f in sorted((ROOT / "content" / "articles").glob("*.md")):
        meta = yaml.safe_load(f.read_text().split("---")[1])
        if meta.get("status") == "published" and not meta.get("image"):
            made.append(card("article-" + meta["slug"], f"{weekly} · {meta.get('market', '')}".strip(" ·"), meta["title"], meta.get("summary", ""), ACCENTS["blue"]))
    print(f"{len(made)} preview pictures in {OUT}")


if __name__ == "__main__":
    main()
