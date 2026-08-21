from pathlib import Path

ROOT = Path(r"D:\visual-cards")
files = [
    ROOT / "index.html",
    ROOT / "modules" / "index.html",
    ROOT / "items" / "index.html",
    ROOT / "calculator" / "index.html",
    ROOT / "modules" / "stasis_anchor.html",
]

for path in files:
    text = path.read_text(encoding="utf-8")
    text = text.replace("site-motion.css?v=3", "site-motion.css?v=4")
    text = text.replace("rarity.css?v=3", "rarity.css?v=4")

    is_root = path.parent == ROOT
    js = (
        '<script src="./assets/nav-refresh.js?v=1" defer></script>'
        if is_root
        else '<script src="../assets/nav-refresh.js?v=1" defer></script>'
    )
    if "nav-refresh.js" not in text:
        if "</body>" in text:
            text = text.replace("</body>", js + "</body>", 1)
        else:
            text += js

    path.write_text(text, encoding="utf-8")
    print("updated", path)
