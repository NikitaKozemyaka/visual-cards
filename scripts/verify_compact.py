from pathlib import Path
import re

for p in [
    Path(r"D:/visual-cards/index.html"),
    Path(r"D:/visual-cards/modules/index.html"),
    Path(r"D:/visual-cards/modules/stasis_anchor.html"),
]:
    t = p.read_text(encoding="utf-8")
    print(p.name, re.findall(r'href="[^"]*compact[^"]*"', t))
