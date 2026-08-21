from pathlib import Path

path = Path(r"D:\visual-cards\modules\stasis_anchor.html")
text = path.read_text(encoding="utf-8")
old = 'href="../index.html"'
new = 'href="./index.html"'
if old not in text:
    raise SystemExit("back link not found")
text = text.replace(old, new, 1)
# Keep label clear: modules catalog, not site hub
text = text.replace(">Все карточки</a>", ">Все модули</a>", 1)
path.write_text(text, encoding="utf-8")
print("ok")
