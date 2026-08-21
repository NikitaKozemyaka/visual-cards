from pathlib import Path
import re

html_path = Path(r"D:\visual-cards\modules\stasis_anchor.html")
html = html_path.read_text(encoding="utf-8")

# Keep CSS/fonts; drop Next runtime scripts so they cannot fight vanilla sim.
html = re.sub(
    r'<script[^>]*src="\.\./_next/static/[^"]+"[^>]*></script>',
    "",
    html,
)
html = re.sub(
    r'<link[^>]*as="script"[^>]*href="\.\./_next/static/[^"]+"[^>]*/?>',
    "",
    html,
)
# Drop RSC flight payload scripts (inline next_f).
html = re.sub(
    r'<script>\(self\.__next_f=self\.__next_f\|\|\[\]\)\.push\(\[0\]\)</script>',
    "",
    html,
)
html = re.sub(
    r'<script>self\.__next_f\.push\(\[1,"[\s\S]*?"\]\)</script>',
    "",
    html,
)

if "stasis_sim.js" not in html:
    html = html.replace("</body>", '<script src="./stasis_sim.js" defer></script></body>', 1)

html_path.write_text(html, encoding="utf-8")

# Sanity
t = html_path.read_text(encoding="utf-8")
print("has_css", "265wr7d9-g86g.css" in t)
print("has_sim", "stasis_sim.js" in t)
print("next_script_tags", t.count("/_next/static/immutable/chunks/") - t.count(".css"))
print("aria_level", "Уровень модуля" in t)
print("aria_dodge", "Уклонение врага" in t)
