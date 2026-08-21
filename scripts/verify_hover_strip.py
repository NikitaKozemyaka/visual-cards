from pathlib import Path
import re

for name in ["index.html", "modules/index.html", "modules/stasis_anchor.html"]:
    t = Path(r"D:/visual-cards") / name
    text = t.read_text(encoding="utf-8")
    hovers = re.findall(r"hover:[^\s\"]+", text)
    ghovers = re.findall(r"group-hover:[^\s\"]+", text)
    print(name, "hover", len(hovers), "group-hover", len(ghovers))
    print("  touch-safe v2", "touch-safe.css?v=2" in text)
    print("  nav v3", "nav-refresh.js?v=3" in text)
    print("  motion v6", "site-motion.css?v=6" in text)
