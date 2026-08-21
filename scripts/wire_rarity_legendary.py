from pathlib import Path

ROOT = Path(r"D:\visual-cards")

# --- stasis_anchor.html ---
stasis = ROOT / "modules" / "stasis_anchor.html"
text = stasis.read_text(encoding="utf-8")

if "rarity.css" not in text:
    text = text.replace(
        "site-motion.css?v=2",
        "site-motion.css?v=2\"/><link rel=\"stylesheet\" href=\"../assets/rarity.css?v=1",
        1,
    )
    # If replace produced broken tag, fix carefully
    if 'rarity.css?v=1"/>' not in text and "rarity.css" in text:
        pass

# Safer inject if previous pattern weird
if "assets/rarity.css" not in text:
    needle = '<link rel="stylesheet" href="../assets/site-motion.css?v=2"/>'
    if needle not in text:
        # try without query
        needle = '<link rel="stylesheet" href="../assets/site-motion.css"/>'
    if needle in text:
        text = text.replace(
            needle,
            needle + '<link rel="stylesheet" href="../assets/rarity.css?v=1"/>',
            1,
        )
    else:
        raise SystemExit("cannot find motion css link in stasis")

# Fix accidental double-broken link from first attempt
text = text.replace(
    'site-motion.css?v=2"/><link rel="stylesheet" href="../assets/rarity.css?v=1"/>',
    'site-motion.css?v=2"/><link rel="stylesheet" href="../assets/rarity.css?v=1"/>',
)

# page wrapper legendary wash
text = text.replace(
    'class="relative min-h-screen"',
    'class="relative min-h-screen vc-page-legendary"',
    1,
)

# header card
text = text.replace(
    'class="vc-rise vc-rise-d1 mt-6 rounded-2xl border border-border bg-card p-6 vc-card"',
    'class="vc-rise vc-rise-d1 mt-6 rounded-2xl border border-border bg-card p-6 vc-card vc-rarity-legendary"',
    1,
)

# simulator section
text = text.replace(
    'class="rounded-2xl border border-border bg-card"><div class="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6"><h2 id="sim-title"',
    'class="rounded-2xl border border-border bg-card vc-rarity-legendary-sim"><div class="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6"><h2 id="sim-title"',
    1,
)

stasis.write_text(text, encoding="utf-8")
print("stasis ok", "rarity.css" in stasis.read_text(encoding="utf-8"), "vc-rarity-legendary" in stasis.read_text(encoding="utf-8"))

# --- modules/index.html catalog tile ---
catalog = ROOT / "modules" / "index.html"
c = catalog.read_text(encoding="utf-8")
if "rarity.css" not in c:
    c = c.replace(
        '<link rel="stylesheet" href="../assets/site-motion.css?v=2"/>',
        '<link rel="stylesheet" href="../assets/site-motion.css?v=2"/>\n  <link rel="stylesheet" href="../assets/rarity.css?v=1"/>',
        1,
    )
old_a = 'class="vc-rise vc-rise-d3 group relative block overflow-hidden rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-card/80 before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-legendary/70" href="./stasis_anchor.html"'
new_a = 'class="vc-rise vc-rise-d3 vc-rarity-legendary group relative block overflow-hidden rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-card/80 before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-legendary/70" href="./stasis_anchor.html"'
if old_a not in c:
    raise SystemExit("catalog tile class not found")
c = c.replace(old_a, new_a, 1)
catalog.write_text(c, encoding="utf-8")
print("catalog ok")
