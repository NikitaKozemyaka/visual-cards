from pathlib import Path
import re

ROOT = Path(r"D:\visual-cards")
files = [
    ROOT / "index.html",
    ROOT / "modules" / "index.html",
    ROOT / "items" / "index.html",
    ROOT / "calculator" / "index.html",
    ROOT / "modules" / "stasis_anchor.html",
]


def strip_hover_classes(class_value: str) -> str:
    parts = class_value.split()
    kept = [
        p
        for p in parts
        if not p.startswith("hover:") and not p.startswith("group-hover:")
    ]
    return " ".join(kept)


for path in files:
    text = path.read_text(encoding="utf-8")

    def repl(m):
        return 'class="' + strip_hover_classes(m.group(1)) + '"'

    text2 = re.sub(r'class="([^"]*)"', repl, text)

    # bump caches
    text2 = text2.replace("site-motion.css?v=5", "site-motion.css?v=6")
    text2 = text2.replace("touch-safe.css?v=1", "touch-safe.css?v=2")
    text2 = text2.replace("nav-refresh.js?v=2", "nav-refresh.js?v=3")
    text2 = text2.replace("rarity.css?v=5", "rarity.css?v=6")

    path.write_text(text2, encoding="utf-8")
    print(path.name, "hover stripped", text != text2)
