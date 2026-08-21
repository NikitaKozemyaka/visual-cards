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

for path in files:
    text = path.read_text(encoding="utf-8")
    text = text.replace("site-motion.css?v=4", "site-motion.css?v=5")
    text = text.replace("rarity.css?v=4", "rarity.css?v=5")
    text = text.replace("nav-refresh.js?v=1", "nav-refresh.js?v=2")
    text = text.replace("stasis_sim.js?v=2", "stasis_sim.js?v=3")

    is_root = path.parent == ROOT
    css = (
        '<link rel="stylesheet" href="./assets/touch-safe.css?v=1"/>'
        if is_root
        else '<link rel="stylesheet" href="../assets/touch-safe.css?v=1"/>'
    )

    if "touch-safe.css" not in text:
        # insert after compact or motion
        for needle in [
            '<link rel="stylesheet" href="./assets/compact.css?v=1"/>',
            '<link rel="stylesheet" href="../assets/compact.css?v=1"/>',
            '<link rel="stylesheet" href="./assets/site-motion.css?v=5"/>',
            '<link rel="stylesheet" href="../assets/site-motion.css?v=5"/>',
        ]:
            if needle in text:
                sep = "" if path.name == "stasis_anchor.html" else "\n  "
                text = text.replace(needle, needle + sep + css, 1)
                break
        else:
            raise SystemExit(f"cannot insert touch-safe into {path}")

    path.write_text(text, encoding="utf-8")
    print("ok", path)
