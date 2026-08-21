from pathlib import Path

ROOT = Path(r"D:\visual-cards")
files = [
    ROOT / "index.html",
    ROOT / "modules" / "index.html",
    ROOT / "items" / "index.html",
    ROOT / "calculator" / "index.html",
    ROOT / "modules" / "stasis_anchor.html",
]

tag_root = '<link rel="stylesheet" href="./assets/compact.css?v=1"/>'
tag_up = '<link rel="stylesheet" href="../assets/compact.css?v=1"/>'

for path in files:
    text = path.read_text(encoding="utf-8")
    if "compact.css" in text:
        print("already", path.name)
        continue
    if path.parent == ROOT:
        # after site-motion
        needle = '<link rel="stylesheet" href="./assets/site-motion.css?v=3"/>'
        if needle not in text:
            raise SystemExit(f"missing motion in {path}")
        text = text.replace(needle, needle + "\n  " + tag_root, 1)
    else:
        # modules/items/calculator/stasis
        if "site-motion.css?v=3" in text:
            needle = '<link rel="stylesheet" href="../assets/site-motion.css?v=3"/>'
            text = text.replace(needle, needle + tag_up if path.name == "stasis_anchor.html" else needle + "\n  " + tag_up, 1)
        else:
            raise SystemExit(f"missing motion in {path}")
    path.write_text(text, encoding="utf-8")
    print("wired", path)
