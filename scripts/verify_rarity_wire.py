from pathlib import Path
import re

t = Path(r"D:/visual-cards/modules/stasis_anchor.html").read_text(encoding="utf-8")
print("links", re.findall(r'href="([^"]*(?:rarity|site-motion)[^"]*)"', t))
print("page", "vc-page-legendary" in t)
print("header", t.count("vc-rarity-legendary"))
print("sim", "vc-rarity-legendary-sim" in t)

c = Path(r"D:/visual-cards/modules/index.html").read_text(encoding="utf-8")
print("catalog rarity css", "rarity.css" in c)
print("catalog class", "vc-rarity-legendary" in c)
