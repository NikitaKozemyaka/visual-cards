from pathlib import Path

path = Path(r"D:\visual-cards\modules\stasis_anchor.html")
text = path.read_text(encoding="utf-8")
text = text.replace(" relative min-h-screen vc-page-legendary", " relative min-h-screen")
text = text.replace("rarity.css?v=2", "rarity.css?v=3")
path.write_text(text, encoding="utf-8")

# bump rarity cache on catalog too
cat = Path(r"D:\visual-cards\modules\index.html")
c = cat.read_text(encoding="utf-8")
c2 = c.replace("rarity.css?v=2", "rarity.css?v=3")
if c2 != c:
    cat.write_text(c2, encoding="utf-8")
print("done")
