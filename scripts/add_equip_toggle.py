from pathlib import Path

html_path = Path(r"D:\visual-cards\modules\stasis_anchor.html")
text = html_path.read_text(encoding="utf-8")

# Default /pin should be off in static markup
old_pin = (
    'button type="button" role="switch" aria-checked="true" '
    'class="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors border-primary/50 bg-primary/10"'
)
new_pin = (
    'button type="button" role="switch" aria-checked="false" id="sim-pin" '
    'class="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors border-border bg-secondary"'
)
if old_pin not in text:
    # try without exact class match pieces
    raise SystemExit("pin button markup not found")

text = text.replace(old_pin, new_pin, 1)
text = text.replace(
    'Команда<!-- --> <code class="rounded bg-background/60 px-1 py-0.5 font-mono text-[13px] text-primary">/pin</code> <!-- -->активна',
    'Команда<!-- --> <code class="rounded bg-background/60 px-1 py-0.5 font-mono text-[13px] text-primary">/pin</code> <!-- -->выкл',
    1,
)
text = text.replace(
    'class="relative h-6 w-11 shrink-0 rounded-full transition-colors bg-primary" aria-hidden="true"><span class="absolute top-0.5 size-5 rounded-full bg-background transition-transform translate-x-[22px]"></span>',
    'class="relative h-6 w-11 shrink-0 rounded-full transition-colors bg-input" aria-hidden="true"><span class="absolute top-0.5 size-5 rounded-full bg-background transition-transform translate-x-0.5"></span>',
    1,
)

# Default result numbers for L3 equipped, pin off, dodge 20%:
# passive -3%, pin —, rounds 0 or still show duration when pin off?, total -3%, eff dodge 17%, hit 83%
# Looking at original formula: rounds = min(27, 3*level) always from pin duration in cardify even when pin off?
# User said pin off by default. When pin off, pin effect is 0. Rounds of /pin when off should be 0 or still show potential?
# Better: when unequipped - all module effects 0. When equipped pin off - passive only, rounds show potential duration but pin penalty 0.
# Cardify showed rounds even with pin - I'll show rounds only when pin on, else 0 or "—".

equip_block = (
    '<button type="button" role="switch" aria-checked="true" id="sim-equip" '
    'class="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors border-primary/50 bg-primary/10">'
    '<span><span class="block text-sm font-semibold text-foreground">Экипировать</span>'
    '<span class="mt-0.5 block text-xs text-muted-foreground">Модуль установлен на броню</span></span>'
    '<span class="relative h-6 w-11 shrink-0 rounded-full transition-colors bg-primary" aria-hidden="true">'
    '<span class="absolute top-0.5 size-5 rounded-full bg-background transition-transform translate-x-[22px]"></span></span></button>'
)

# Insert equip switch before pin switch
pin_marker = '<button type="button" role="switch" aria-checked="false" id="sim-pin"'
if pin_marker not in text:
    raise SystemExit("pin marker after edit not found")
if 'id="sim-equip"' not in text:
    text = text.replace(pin_marker, equip_block + pin_marker, 1)

# Update default displayed stats for equipped + pin off + dodge 20%
# hit 83%, passive -3%, pin —, rounds —, total -3%, eff 17%
replacements = [
    (
        'stroke-dasharray="326.7256359733385" stroke-dashoffset="6.534512719466776"',
        'stroke-dasharray="326.7256359733385" stroke-dashoffset="55.54335811546755"',  # circ*(1-0.83)
    ),
    (
        '<span class="font-mono text-4xl font-bold tabular-nums text-ok">98%</span>',
        '<span class="font-mono text-4xl font-bold tabular-nums text-ok">83%</span>',
    ),
    (
        '<div class="mt-1 font-mono text-2xl font-bold tabular-nums text-primary">−15%</div>',
        '<div class="mt-1 font-mono text-2xl font-bold tabular-nums text-muted-foreground">—</div>',
    ),
    (
        '<div class="mt-1 font-mono text-2xl font-bold tabular-nums text-foreground">9</div>',
        '<div class="mt-1 font-mono text-2xl font-bold tabular-nums text-muted-foreground">—</div>',
    ),
    (
        '<div class="mt-1 font-mono text-2xl font-bold tabular-nums text-primary">−18%</div>',
        '<div class="mt-1 font-mono text-2xl font-bold tabular-nums text-primary">−3%</div>',
    ),
    (
        '<div class="mt-1 font-mono text-2xl font-bold tabular-nums text-ok">2%</div>',
        '<div class="mt-1 font-mono text-2xl font-bold tabular-nums text-ok">17%</div>',
    ),
    (
        'style="width:30.000000000000004%"',
        'style="width:0%"',
    ),
    (
        '<span class="w-12 shrink-0 text-right tabular-nums text-muted-foreground">−15%</span>',
        '<span class="w-12 shrink-0 text-right tabular-nums text-muted-foreground">—</span>',
    ),
]

for old, new in replacements:
    if old not in text:
        print("WARN missing:", old[:60])
    else:
        text = text.replace(old, new, 1)

html_path.write_text(text, encoding="utf-8")
print("html updated")
