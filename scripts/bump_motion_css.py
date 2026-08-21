from pathlib import Path

files = [
    Path(r"D:/visual-cards/index.html"),
    Path(r"D:/visual-cards/modules/index.html"),
    Path(r"D:/visual-cards/items/index.html"),
    Path(r"D:/visual-cards/calculator/index.html"),
    Path(r"D:/visual-cards/modules/stasis_anchor.html"),
]

for path in files:
    text = path.read_text(encoding="utf-8")
    if "site-motion.css?v=2" in text:
        print("skip", path.name)
        continue
    if "site-motion.css" not in text:
        print("missing", path.name)
        continue
    path.write_text(text.replace("site-motion.css", "site-motion.css?v=2"), encoding="utf-8")
    print("bumped", path.name)
