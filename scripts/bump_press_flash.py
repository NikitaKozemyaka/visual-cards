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
    text2 = text.replace("nav-refresh.js?v=3", "nav-refresh.js?v=4")
    text2 = text2.replace("touch-safe.css?v=2", "touch-safe.css?v=3")
    path.write_text(text2, encoding="utf-8")
    print(path.name, text != text2)
