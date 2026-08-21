from pathlib import Path

path = Path(r"D:\visual-cards\modules\stasis_anchor.html")
text = path.read_text(encoding="utf-8")

css_tag = '<link rel="stylesheet" href="../assets/site-motion.css"/>'
needle = '<link rel="stylesheet" href="../_next/static/immutable/chunks/265wr7d9-g86g.css" data-precedence="next"/>'
if css_tag not in text:
    if needle not in text:
        raise SystemExit("css link not found")
    text = text.replace(needle, needle + css_tag, 1)

# Add rise classes to key blocks without breaking layout.
replacements = [
    (
        'href="./index.html"><svg',
        'href="./index.html" class="vc-rise inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"><svg',
    ),
]
# The back link already has classes; inject vc-rise into existing class list.
old_back = 'class="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground" href="./index.html"'
new_back = 'class="vc-rise inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground" href="./index.html"'
if old_back in text:
    text = text.replace(old_back, new_back, 1)

old_header = 'class="mt-6 rounded-2xl border border-border bg-card p-6"'
new_header = 'class="vc-rise vc-rise-d1 mt-6 rounded-2xl border border-border bg-card p-6 vc-card"'
if old_header in text:
    text = text.replace(old_header, new_header, 1)

old_sim_wrap = 'class="mt-4"><section aria-labelledby="sim-title"'
new_sim_wrap = 'class="vc-rise vc-rise-d2 mt-4"><section aria-labelledby="sim-title"'
if old_sim_wrap in text:
    text = text.replace(old_sim_wrap, new_sim_wrap, 1)

# Soften subsequent sections
text = text.replace(
    'class="mt-4 rounded-2xl border border-border bg-card p-6"><h2 class="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Как пользоваться</h2>',
    'class="vc-rise vc-rise-d3 mt-4 rounded-2xl border border-border bg-card p-6"><h2 class="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Как пользоваться</h2>',
    1,
)
text = text.replace(
    'class="mt-4 rounded-2xl border border-border bg-card p-6"><h2 class="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Где взять</h2>',
    'class="vc-rise vc-rise-d4 mt-4 rounded-2xl border border-border bg-card p-6"><h2 class="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Где взять</h2>',
    1,
)

path.write_text(text, encoding="utf-8")
print("stasis motion wired:", css_tag in path.read_text(encoding="utf-8"))
