# -*- coding: utf-8 -*-
"""Build visual-cards module pages from STW_GAME balance + items."""
from __future__ import annotations

import json
import re
from pathlib import Path

STW = Path(r"D:\STW_GAME")
ROOT = Path(r"D:\visual-cards")
OUT_DATA = ROOT / "data" / "modules.json"
OUT_MODULES = ROOT / "modules"
COVERS = ROOT / "assets" / "covers"

FILENAME_OVERRIDE = {"tactical_stasis_anchor": "stasis_anchor.html"}

ARCHETYPE_ORDER = [
    "survival",
    "combat",
    "economy",
    "mobility",
    "defense",
    "tactical",
]
ARCHETYPE_RU = {
    "survival": "Выживание",
    "combat": "Бой",
    "economy": "Экономика",
    "mobility": "Мобильность",
    "defense": "Защита",
    "tactical": "Тактика",
}
CONTEXT_RU = {
    "out_of_combat": "вне боя",
    "pre_combat_buff": "на карточке встречи до старта боя",
    "gathering": "во время поиска",
    "teleport": "команда телепорта",
    "encounter": "на карточке встречи",
}
RARITY_LABEL = {
    "common": "Common",
    "uncommon": "Uncommon",
    "rare": "Rare",
    "epic": "Epic",
    "legendary": "Legendary",
    "mythic": "Mythic",
}

EMOJI_RE = re.compile(
    "["
    "\U0001F300-\U0001FAFF"
    "\U00002700-\U000027BF"
    "\U0001F000-\U0001F9FF"
    "\u2600-\u26FF"
    "\u2700-\u27BF"
    "]+",
    flags=re.UNICODE,
)

CSS_LINKS = """  <link rel="stylesheet" href="../assets/site-motion.css?v=8"/>
  <link rel="stylesheet" href="../assets/compact.css?v=1"/>
  <link rel="stylesheet" href="../assets/touch-safe.css?v=6"/>
  <link rel="stylesheet" href="../assets/rarity.css?v=9"/>
  <link rel="stylesheet" href="../assets/catalog.css?v=3"/>"""


def extract_emoji(text: str) -> str:
    m = EMOJI_RE.search(text or "")
    return m.group(0) if m else ""


def strip_emoji(text: str) -> str:
    t = EMOJI_RE.sub("", text or "")
    return re.sub(r"\s+", " ", t).strip()


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def arena_modules(catalog: dict) -> dict:
    out = {}
    for lot in catalog.get("lots") or []:
        iid = lot.get("item_id")
        if not iid:
            continue
        out[iid] = {
            "cost": lot.get("cost"),
            "tier": lot.get("tier"),
            "rarity": lot.get("rarity"),
        }
    return out


def build_howto(mod: dict) -> list[str]:
    cmd = mod["command"]
    slash = cmd["slash"]
    ctx = CONTEXT_RU.get(cmd["context"], cmd["context"])
    steps = [
        "Установи модуль на экипированную броню (нужен свободный слот).",
        f"Команда /{slash} доступна {ctx}.",
    ]
    if cmd["cooldown_base_sec"] or cmd["cooldown_per_level_sec"]:
        steps.append(
            "Кулдаун зависит от уровня модуля: "
            "base + per_level × (L−1), как в игре."
        )
    else:
        steps.append("У этой команды нет таймерного кулдауна (лимит — заряды / встреча).")

    mid = mod["id"]
    if mid == "tactical_stasis_anchor":
        steps.append(
            "Пассив −1% уклонения врага за уровень при ваших атаках; "
            "/pin даёт доп. штраф на несколько раундов (кап 27)."
        )
    elif mid == "tactical_stasis_tuner":
        steps.append("Пассивок в бою нет — только /rerange (переброс дистанции на встрече).")
    elif mid == "tactical_recon_lens":
        steps.append("Пассивок в бою нет — только /analyze (разбор цели на встрече).")
    elif mid == "economy_relic_hunter":
        steps.append("/prospect заряжает +1 tier следующего предмета (глубина 5+); КД при успехе.")
    elif mid == "economy_salvage_link":
        steps.append("/instant_search ускоряет текущий поиск; длинный КД — особенность модуля.")
    else:
        steps.append(mod["effect_text"])
    return steps


def build_sources(item: dict, arena: dict | None) -> list[str]:
    src = []
    if item.get("craftable"):
        src.append("Крафт v2 (рецепт модуля)")
    if arena:
        cost = arena.get("cost")
        tier = arena.get("tier") or ""
        bit = f"Магазин арены — {cost} очков"
        if tier:
            bit += f", tier {tier}"
        src.append(bit)
    if not src:
        src.append("Поиск / крафт")
    elif item.get("drop_chance"):
        src.append("Редкий дроп при поиске")
    return src


def catalog_blurb(mod: dict) -> str:
    slash = mod["command"]["slash"]
    if mod["id"] == "tactical_stasis_anchor":
        return (
            "Интерактивная карточка анти-уклонения: уровни L1–L9, /pin, "
            "dodge врага и примерный шанс попадания."
        )
    if not mod["passive"]:
        return f"Интерактивная карточка: L1–L9 и команда /{slash}."
    return f"Интерактивная карточка: пассивы по уровню, /{slash}, экип вкл/выкл."


def cover_rel(mid: str, *, from_modules: bool = True) -> str:
    name = f"{mid}.png?v=2"
    if from_modules:
        return f"../assets/covers/{name}"
    return f"./assets/covers/{name}"


def build_modules() -> list[dict]:
    balance = load_json(STW / "data" / "module_balance.json")
    items_root = load_json(STW / "global_items.json")
    items = items_root.get("items") or items_root
    arena = arena_modules(load_json(STW / "data" / "arena_shop_catalog.json"))

    effects = balance["module_effects"]
    commands = balance["module_commands"]
    modules = []

    for mid in effects:
        item = items.get(mid)
        if not item or item.get("type") != "module":
            raise SystemExit(f"Missing module item: {mid}")
        raw_name = item.get("name") or mid
        cmd_cfg = commands.get(mid) or {}
        filename = FILENAME_OVERRIDE.get(mid, f"{mid}.html")
        mod = {
            "id": mid,
            "filename": filename,
            "emoji": extract_emoji(raw_name),
            "name": strip_emoji(raw_name),
            "rarity": item.get("rarity") or "common",
            "archetype": item.get("module_archetype") or "tactical",
            "slots": int(item.get("slots_required") or 1),
            "description": (item.get("description") or "").strip(),
            "effect_text": (item.get("effect") or "").strip(),
            "cover": cover_rel(mid, from_modules=True),
            "passive": dict(effects.get(mid) or {}),
            "command": {
                "slash": cmd_cfg.get("command") or "",
                "context": cmd_cfg.get("context") or "",
                "cooldown_base_sec": int(cmd_cfg.get("cooldown_base_sec") or 0),
                "cooldown_per_level_sec": int(cmd_cfg.get("cooldown_per_level_sec") or 0),
                "effect": dict(cmd_cfg.get("effect") or {}),
            },
            "sim_kind": "stasis_anchor" if mid == "tactical_stasis_anchor" else "generic",
            "craftable": bool(item.get("craftable")),
            "arena": arena.get(mid),
        }
        mod["howto"] = build_howto(mod)
        mod["sources"] = build_sources(item, mod["arena"])
        mod["catalog_blurb"] = catalog_blurb(mod)
        modules.append(mod)

    modules.sort(
        key=lambda m: (
            ARCHETYPE_ORDER.index(m["archetype"])
            if m["archetype"] in ARCHETYPE_ORDER
            else 99,
            m["name"],
        )
    )
    return modules


def esc(s: str) -> str:
    return (
        (s or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def rarity_badge(rarity: str) -> str:
    label = RARITY_LABEL.get(rarity, rarity.title())
    return (
        f'<span class="rounded-full border px-2.5 py-1 font-mono text-[10px] '
        f'font-semibold uppercase tracking-[0.14em] text-{rarity} '
        f'border-{rarity}/40 bg-{rarity}/10 shadow-[0_0_20px_-8px] '
        f'shadow-{rarity}/60">{esc(label)}</span>'
    )


def chip(text: str) -> str:
    return (
        f'<span class="rounded-full border border-border bg-secondary px-2.5 py-1 '
        f'font-mono text-[10px] font-medium uppercase tracking-[0.14em] '
        f'text-muted-foreground">{esc(text)}</span>'
    )


def level_buttons_html() -> str:
    bits = []
    for i in range(1, 10):
        pressed = "true" if i == 3 else "false"
        cls = (
            "border-primary bg-primary/15 text-primary"
            if i == 3
            else "border-border bg-secondary text-foreground"
        )
        bits.append(
            f'<button type="button" aria-pressed="{pressed}" '
            f'class="rounded-lg border py-2.5 font-mono text-sm font-semibold '
            f'tabular-nums transition-colors {cls}">L{i}</button>'
        )
    return "".join(bits)


def switch_html(sid: str, title: str, sub: str, on: bool) -> str:
    checked = "true" if on else "false"
    border = "border-primary/50 bg-primary/10" if on else "border-border bg-secondary"
    track = "bg-primary" if on else "bg-input"
    knob = "translate-x-[22px]" if on else "translate-x-0.5"
    return (
        f'<button type="button" role="switch" aria-checked="{checked}" id="{sid}" '
        f'class="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 '
        f'text-left transition-colors {border}"><span>'
        f'<span class="block text-sm font-semibold text-foreground">{title}</span>'
        f'<span class="mt-0.5 block text-xs text-muted-foreground">{sub}</span></span>'
        f'<span class="relative h-6 w-11 shrink-0 rounded-full transition-colors {track}" '
        f'aria-hidden="true"><span class="absolute top-0.5 size-5 rounded-full bg-background '
        f'transition-transform {knob}"></span></span></button>'
    )


def dodge_block_html() -> str:
    return """
<div data-sim-extra="dodge">
  <div class="mb-2 flex items-baseline justify-between">
    <span class="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Уклонение врага</span>
    <span class="font-mono text-sm font-semibold tabular-nums text-foreground" data-dodge-value>20%</span>
  </div>
  <div role="group" aria-label="Уклонение врага" class="mb-3 grid grid-cols-4 gap-2">
    <button type="button" aria-pressed="false" class="rounded-lg border py-2 font-mono text-sm font-semibold tabular-nums transition-colors border-border bg-secondary text-foreground">10%</button>
    <button type="button" aria-pressed="true" class="rounded-lg border py-2 font-mono text-sm font-semibold tabular-nums transition-colors border-primary bg-primary/15 text-primary">20%</button>
    <button type="button" aria-pressed="false" class="rounded-lg border py-2 font-mono text-sm font-semibold tabular-nums transition-colors border-border bg-secondary text-foreground">35%</button>
    <button type="button" aria-pressed="false" class="rounded-lg border py-2 font-mono text-sm font-semibold tabular-nums transition-colors border-border bg-secondary text-foreground">50%</button>
  </div>
  <input type="range" min="0" max="60" step="1" aria-label="Уклонение врага проценты" class="w-full accent-primary" value="20"/>
  <div class="mt-1 flex justify-between font-mono text-[11px] text-muted-foreground/70"><span>0%</span><span>60%</span></div>
</div>"""


def hero_shell(kind: str) -> str:
    # Unified SVG ring for all modules (stasis = hit chance; others = command gauge)
    _ = kind
    return """
<div class="relative flex flex-col items-center justify-center rounded-xl border border-border bg-secondary/60 p-5">
  <svg viewBox="0 0 120 120" class="size-40 -rotate-90" aria-hidden="true">
    <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" stroke-width="8" class="text-border"></circle>
    <circle data-hero-ring cx="60" cy="60" r="52" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-dasharray="326.7256359733385" stroke-dashoffset="326.7256359733385" class="text-ok transition-[stroke-dashoffset] duration-500 ease-out"></circle>
  </svg>
  <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-3">
    <span class="font-mono text-4xl font-bold tabular-nums text-ok" data-hero-value>—</span>
    <span class="mt-1 max-w-[8.5rem] text-center text-[11px] leading-tight text-muted-foreground" data-hero-label>Главный эффект</span>
    <span class="mt-0.5 max-w-[8.5rem] text-center text-[10px] leading-tight text-muted-foreground/80" data-hero-sub></span>
  </div>
</div>"""


def stats_grid_placeholder() -> str:
    return (
        '<div class="grid grid-cols-2 gap-3" data-stats-grid></div>'
        '<p class="font-mono text-[11px] text-muted-foreground/80" data-cd-line></p>'
    )


def bars_placeholder() -> str:
    return '<div class="rounded-xl border border-border bg-secondary/60 p-4" data-bars aria-hidden="true"></div>'


def emoji_badge(emoji: str) -> str:
    if not emoji:
        return ""
    return f'<span class="vc-mod-emoji" aria-hidden="true">{emoji}</span>'


def page_html(mod: dict) -> str:
    rarity = mod["rarity"]
    arch = ARCHETYPE_RU.get(mod["archetype"], mod["archetype"])
    slash = mod["command"]["slash"]
    title = mod["name"]
    emoji = mod.get("emoji") or ""
    desc = mod["description"] or mod["effect_text"]
    page_class = f"vc-page-{rarity}" if rarity == "legendary" else ""
    header_rarity = f"vc-rarity-{rarity}"
    sim_rarity = f"vc-rarity-{rarity}-sim"
    border_accent = f"border-{rarity}/40" if rarity != "common" else "border-border"
    cover = mod.get("cover") or cover_rel(mod["id"])

    howto = "".join(
        f'<li class="flex gap-3 text-sm leading-relaxed">'
        f'<span class="mt-1 font-mono text-xs tabular-nums text-primary/70">{i:02d}</span>'
        f'<span class="text-muted-foreground">{esc(step)}</span></li>'
        for i, step in enumerate(mod["howto"], 1)
    )
    sources = "".join(
        f'<li class="flex items-center gap-3 border-l {border_accent} pl-3 text-sm text-muted-foreground">'
        f"{esc(s)}</li>"
        for s in mod["sources"]
    )

    extra = dodge_block_html() if mod["sim_kind"] == "stasis_anchor" else ""
    cmd_title = (
        f'Команда <code class="rounded bg-background/60 px-1 py-0.5 font-mono text-[13px] text-primary">'
        f"/{slash}</code> активна"
    )

    canonical = f"https://nikitakozemyaka.github.io/visual-cards/modules/{mod['filename']}"
    og_desc = esc(mod["catalog_blurb"])
    emoji_html = emoji_badge(emoji)
    # Embed balance in-page so Telegram WebView / strict caches cannot break fetch.
    mod_json = json.dumps(mod, ensure_ascii=False, separators=(",", ":")).replace(
        "<", "\\u003c"
    )

    return f"""<!DOCTYPE html>
<html lang="ru" class="dark bg-background space_grotesk_e6988195-module__RNs2Mq__variable jetbrains_mono_83faaeae-module__xxnQGG__variable">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <link rel="preload" href="../_next/static/immutable/media/0c89a48fa5027cee-s.p.1ii7211jqpzi_.woff2" as="font" crossorigin="" type="font/woff2"/>
  <link rel="preload" href="../_next/static/immutable/media/70bc3e132a0a741e-s.p.269kn9uafm0ti.woff2" as="font" crossorigin="" type="font/woff2"/>
  <link rel="preload" href="../_next/static/immutable/media/cc545e633e20c56d-s.p.2sb9jzhmrh7ny.woff2" as="font" crossorigin="" type="font/woff2"/>
  <link rel="stylesheet" href="../_next/static/immutable/chunks/265wr7d9-g86g.css" data-precedence="next"/>
{CSS_LINKS}
  <meta name="theme-color" content="#060911"/>
  <meta name="color-scheme" content="dark"/>
  <title>{esc(title)} · {RARITY_LABEL.get(rarity, rarity)} — STW Visual Cards</title>
  <meta name="description" content="{og_desc}"/>
  <link rel="canonical" href="{canonical}"/>
  <meta property="og:title" content="{esc(title)} — STW Visual Cards"/>
  <meta property="og:description" content="{og_desc}"/>
  <meta property="og:url" content="{canonical}"/>
  <meta property="og:image" content="https://nikitakozemyaka.github.io/visual-cards/site-preview.png"/>
  <meta property="og:type" content="article"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="{esc(title)} — STW Visual Cards"/>
  <meta name="twitter:description" content="{og_desc}"/>
  <meta name="twitter:image" content="https://nikitakozemyaka.github.io/visual-cards/site-preview.png"/>
</head>
<body class="font-sans antialiased">
  <div class="relative min-h-screen {page_class}">
    <div class="pointer-events-none absolute inset-x-0 top-0 h-[360px] tactical-grid"></div>
    <div class="relative mx-auto w-full max-w-2xl px-5 py-8 sm:py-10">
      <a class="vc-rise inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground transition-colors" href="./index.html">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true"><path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path></svg>
        Все модули
      </a>

      <header class="vc-rise vc-rise-d1 mt-6 rounded-2xl border border-border bg-card p-6 vc-card {header_rarity} vc-mod-page-header">
        <div class="vc-mod-page-top">
          <div class="vc-mod-page-cover">
            <img src="{esc(cover)}" alt="" width="96" height="96" loading="lazy" decoding="async"/>
            {emoji_html}
          </div>
          <div class="vc-mod-page-meta">
            <div class="flex flex-wrap items-center gap-2">
              {rarity_badge(rarity)}
              {chip(arch)}
              {chip(str(mod["slots"]) + " слот")}
              {chip("/" + slash)}
            </div>
            <h1 class="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl">{esc(title)}</h1>
          </div>
        </div>
        <p class="mt-4 text-pretty leading-relaxed text-muted-foreground">{esc(desc)}</p>
      </header>

      <div class="vc-rise vc-rise-d2 mt-4">
        <section aria-labelledby="sim-title" data-module-id="{esc(mod["id"])}" class="rounded-2xl border border-border bg-card {sim_rarity}">
          <div class="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
            <h2 id="sim-title" class="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <span class="size-1.5 rounded-full live-dot" aria-hidden="true"></span>
              Симулятор
            </h2>
            <span class="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60">live</span>
          </div>
          <div class="grid gap-6 p-5 sm:grid-cols-2 sm:p-6">
            <div class="flex flex-col gap-6">
              <p class="text-sm leading-relaxed text-muted-foreground">Выбери уровень модуля — цифры пересчитаются из баланса игры.</p>
              <div>
                <div class="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Уровень модуля</div>
                <div role="group" aria-label="Уровень модуля" class="grid grid-cols-5 gap-2 sm:grid-cols-3">{level_buttons_html()}</div>
              </div>
              {switch_html("sim-equip", "Экипировать", "Модуль установлен на броню", True)}
              {switch_html("sim-cmd", cmd_title, "Заряд / активация команды", True)}
              {extra}
            </div>
            <div class="flex flex-col gap-4">
              {hero_shell(mod["sim_kind"])}
              {stats_grid_placeholder()}
              {bars_placeholder()}
            </div>
          </div>
          <script type="application/json" id="stw-module-data">{mod_json}</script>
        </section>
      </div>

      <section class="vc-rise vc-rise-d3 mt-4 rounded-2xl border border-border bg-card p-6">
        <h2 class="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Как пользоваться</h2>
        <ul class="flex flex-col gap-3">{howto}</ul>
      </section>

      <section class="vc-rise vc-rise-d4 mt-4 rounded-2xl border border-border bg-card p-6">
        <h2 class="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Где взять</h2>
        <ul class="flex flex-col gap-3">{sources}</ul>
      </section>

      <footer class="mt-8 text-center">
        <p class="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground/60">Space Text World · {esc(mod["id"])} · данные из module_balance.json</p>
      </footer>
    </div>
  </div>
  <script src="./module_sim.js?v=6" defer></script>
  <script src="../assets/nav-refresh.js?v=7" defer></script>
</body>
</html>
"""


def catalog_card(mod: dict, delay: str) -> str:
    rarity = mod["rarity"]
    arch = ARCHETYPE_RU.get(mod["archetype"], mod["archetype"])
    slash = mod["command"]["slash"]
    cover = mod.get("cover") or cover_rel(mod["id"])
    emoji = emoji_badge(mod.get("emoji") or "")
    return f"""
          <a class="vc-rise {delay} vc-mod-card vc-rarity-{rarity} group relative block overflow-hidden rounded-xl border border-border bg-card transition-colors before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-{rarity}/70" href="./{esc(mod["filename"])}">
            <div class="vc-mod-card-inner">
              <div class="vc-mod-cover">
                <img src="{esc(cover)}" alt="" width="320" height="200" loading="lazy" decoding="async"/>
                {emoji}
              </div>
              <div class="vc-mod-body">
                <div class="mb-3 flex flex-wrap items-center gap-2">
                  {rarity_badge(rarity)}
                  {chip(arch)}
                  {chip("/" + slash)}
                </div>
                <h3 class="text-balance text-xl font-bold tracking-tight text-foreground sm:text-2xl">{esc(mod["name"])}</h3>
                <p class="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">{esc(mod["catalog_blurb"])}</p>
                <span class="mt-4 inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                  Открыть карточку
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 transition-transform" aria-hidden="true"><path d="M7 7h10v10"></path><path d="M7 17 17 7"></path></svg>
                </span>
              </div>
            </div>
          </a>"""


def write_catalog(modules: list[dict]) -> None:
    sections = []
    for arch in ARCHETYPE_ORDER:
        group = [m for m in modules if m["archetype"] == arch]
        if not group:
            continue
        cards = []
        for i, m in enumerate(group):
            delay = f"vc-rise-d{min(4, 2 + (i % 3))}"
            cards.append(catalog_card(m, delay))
        sections.append(
            f"""
      <section class="vc-arch-section">
        <div class="vc-arch-heading vc-rise vc-rise-d2 flex items-center justify-between border-b border-border">
          <h2 class="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{esc(ARCHETYPE_RU[arch])}</h2>
          <span class="font-mono text-xs tabular-nums text-muted-foreground/60">{len(group):02d} шт.</span>
        </div>
        <div class="vc-arch-cards flex flex-col gap-4">{"".join(cards)}
        </div>
      </section>"""
        )

    n = len(modules)
    html = f"""<!DOCTYPE html>
<html lang="ru" class="dark bg-background space_grotesk_e6988195-module__RNs2Mq__variable jetbrains_mono_83faaeae-module__xxnQGG__variable">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <link rel="preload" href="../_next/static/immutable/media/0c89a48fa5027cee-s.p.1ii7211jqpzi_.woff2" as="font" crossorigin="" type="font/woff2"/>
  <link rel="preload" href="../_next/static/immutable/media/70bc3e132a0a741e-s.p.269kn9uafm0ti.woff2" as="font" crossorigin="" type="font/woff2"/>
  <link rel="preload" href="../_next/static/immutable/media/cc545e633e20c56d-s.p.2sb9jzhmrh7ny.woff2" as="font" crossorigin="" type="font/woff2"/>
  <link rel="stylesheet" href="../_next/static/immutable/chunks/265wr7d9-g86g.css" data-precedence="next"/>
{CSS_LINKS}
  <meta name="theme-color" content="#060911"/>
  <meta name="color-scheme" content="dark"/>
  <title>Модули — STW Visual Cards</title>
  <meta name="description" content="Каталог интерактивных карточек модулей Space Text World."/>
  <link rel="canonical" href="https://nikitakozemyaka.github.io/visual-cards/modules/"/>
  <meta property="og:title" content="Модули — STW Visual Cards"/>
  <meta property="og:description" content="Каталог интерактивных карточек модулей Space Text World."/>
  <meta property="og:url" content="https://nikitakozemyaka.github.io/visual-cards/modules/"/>
  <meta property="og:image" content="https://nikitakozemyaka.github.io/visual-cards/site-preview.png"/>
  <meta property="og:type" content="website"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="Модули — STW Visual Cards"/>
  <meta name="twitter:image" content="https://nikitakozemyaka.github.io/visual-cards/site-preview.png"/>
</head>
<body class="font-sans antialiased">
  <div class="relative min-h-screen">
    <div class="pointer-events-none absolute inset-x-0 top-0 h-[420px] tactical-grid"></div>
    <div class="relative mx-auto w-full max-w-3xl px-5 py-8 sm:py-12">
      <a class="vc-rise inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground transition-colors" href="../index.html">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true"><path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path></svg>
        На главную
      </a>

      <header class="vc-rise vc-rise-d1 mt-8 flex items-center justify-between">
        <div class="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          <span class="size-1.5 rounded-full bg-primary live-dot" aria-hidden="true"></span>
          Модули
        </div>
        <span class="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70">visual-cards</span>
      </header>

      <section class="vc-rise vc-rise-d2 mt-10">
        <h1 class="text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">Каталог модулей</h1>
        <p class="mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
          Открой карточку, потыкай уровни и команды — цифры пересчитаются сразу. Всего {n} модулей.
        </p>
      </section>
{"".join(sections)}

      <footer class="mt-16 border-t border-border pt-5">
        <p class="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground/60">Space Text World · modules · {n:02d}</p>
      </footer>
    </div>
  </div>
<script src="../assets/nav-refresh.js?v=7" defer></script></body>
</html>
"""
    (OUT_MODULES / "index.html").write_text(html, encoding="utf-8")


def patch_hub(n: int) -> None:
    path = ROOT / "index.html"
    text = path.read_text(encoding="utf-8")
    text2 = re.sub(
        r"\d{2} карточек|\d{2} карточка|\d+ карточек|\d+ карточка",
        f"{n:02d} карточек",
        text,
        count=1,
    )
    path.write_text(text2, encoding="utf-8")


def main() -> None:
    COVERS.mkdir(parents=True, exist_ok=True)
    modules = build_modules()
    OUT_DATA.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "version": 2,
        "source": "STW_GAME module_balance + global_items",
        "modules": modules,
    }
    OUT_DATA.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    for mod in modules:
        path = OUT_MODULES / mod["filename"]
        path.write_text(page_html(mod), encoding="utf-8")
        print("wrote", path.name)

    write_catalog(modules)
    patch_hub(len(modules))
    print("catalog + hub ok,", len(modules), "modules")


if __name__ == "__main__":
    main()
