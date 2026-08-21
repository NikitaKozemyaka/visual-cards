from pathlib import Path

replacements = {
    "site-motion.css?v=2": "site-motion.css?v=3",
    "rarity.css?v=1": "rarity.css?v=2",
}

files = [
    Path(r"D:/visual-cards/index.html"),
    Path(r"D:/visual-cards/modules/index.html"),
    Path(r"D:/visual-cards/items/index.html"),
    Path(r"D:/visual-cards/calculator/index.html"),
    Path(r"D:/visual-cards/modules/stasis_anchor.html"),
]

for path in files:
    text = path.read_text(encoding="utf-8")
    original = text
    for old, new in replacements.items():
        text = text.replace(old, new)
    if text != original:
        path.write_text(text, encoding="utf-8")
        print("bumped", path)
    else:
        print("unchanged", path)
