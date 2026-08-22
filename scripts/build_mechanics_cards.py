# -*- coding: utf-8 -*-
"""Build visual-cards mechanics demos from STW_GAME stabilizer + modules."""
from __future__ import annotations

import base64
import json
import re
from pathlib import Path

STW = Path(r"D:\STW_GAME")
ROOT = Path(r"D:\visual-cards")
OUT_DATA = ROOT / "data" / "mechanics.json"
OUT_MECH = ROOT / "mechanics"
MODULES_DATA = ROOT / "data" / "modules.json"

SIM_JS_VERSION = "1"
STABILIZER_ID = "module_emergency_stabilizer"
SHARDS_ID = "module_shards"

DEFAULT_SLOTS = [
    {"id": "survival_detox_lattice", "level": 5},
    {"id": "combat_kinetic_driver", "level": 9},
    {"id": "defense_aegis_mesh", "level": 3},
]

CSS_LINKS = """  <link rel="stylesheet" href="../assets/site-motion.css?v=8"/>
  <link rel="stylesheet" href="../assets/compact.css?v=1"/>
  <link rel="stylesheet" href="../assets/touch-safe.css?v=6"/>
  <link rel="stylesheet" href="../assets/rarity.css?v=9"/>
  <link rel="stylesheet" href="../assets/catalog.css?v=3"/>"""

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


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def esc(text: str) -> str:
    return (
        (text or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def extract_emoji(text: str) -> str:
    m = EMOJI_RE.search(text or "")
    return m.group(0) if m else ""


def strip_emoji(text: str) -> str:
    t = EMOJI_RE.sub("", text or "")
    return re.sub(r"\s+", " ", t).strip()


def quantum_stabilizer_offer(shop: dict) -> dict:
    for lot in shop.get("lots") or []:
        if lot.get("id") == STABILIZER_ID or (
            (lot.get("effect") or {}).get("item_id") == STABILIZER_ID
        ):
            return {
                "price": lot.get("price", 70),
                "min_level": lot.get("min_level", 8),
                "period": (lot.get("limit") or {}).get("period", "weekly"),
                "max": (lot.get("limit") or {}).get("max", 1),
            }
    return {"price": 70, "min_level": 8, "period": "weekly", "max": 1}


def build_payload() -> dict:
    global_items = load_json(STW / "global_items.json")["items"]
    modules_payload = load_json(MODULES_DATA)
    shop_path = STW / "data" / "quantum_credits_shop.json"
    quantum = quantum_stabilizer_offer(load_json(shop_path)) if shop_path.is_file() else {}

    stabilizer = global_items.get(STABILIZER_ID) or {}
    shards = global_items.get(SHARDS_ID) or {}

    demo_modules = []
    modules_by_id = {}
    for mod in modules_payload.get("modules") or []:
        mid = mod.get("id")
        if not mid:
            continue
        entry = {
            "id": mid,
            "name": strip_emoji(mod.get("name") or mid),
            "rarity": mod.get("rarity") or "common",
            "emoji": mod.get("emoji") or extract_emoji(mod.get("name") or ""),
        }
        demo_modules.append(entry)
        modules_by_id[mid] = entry

    items_map = {
        STABILIZER_ID: {
            "id": STABILIZER_ID,
            "name": strip_emoji(stabilizer.get("name") or "Стабилизатор"),
            "emoji": extract_emoji(stabilizer.get("name") or ""),
        },
        SHARDS_ID: {
            "id": SHARDS_ID,
            "name": strip_emoji(shards.get("name") or "Осколки модулей"),
            "emoji": extract_emoji(shards.get("name") or ""),
        },
    }
    for mid, meta in modules_by_id.items():
        items_map[mid] = {"id": mid, "name": meta["name"], "rarity": meta["rarity"]}

    return {
        "version": 1,
        "source": "STW_GAME module_death_stabilizer + global_items",
        "mechanics_id": "death_stabilizer",
        "craft_shards_cost": 100,
        "quantum_shop": quantum,
        "items": items_map,
        "modules_by_id": modules_by_id,
        "demo_modules": demo_modules,
        "default_slots": DEFAULT_SLOTS,
        "catalog": {
            "title": "Аварийный стабилизатор и осколки",
            "blurb": (
                "Активируй стабилизатор → умри → один модуль на броне сохранится, "
                "остальные превратятся в осколки. 100 осколков — крафт нового стабилизатора."
            ),
            "emoji": extract_emoji(stabilizer.get("name") or "") or "🛡",
            "rarity": stabilizer.get("rarity") or "epic",
        },
    }


def embed_json(data: dict) -> tuple[str, str]:
    raw = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace(
        "<", "\\u003c"
    )
    b64 = base64.b64encode(raw.encode("utf-8")).decode("ascii")
    return raw, b64


def catalog_html(data: dict) -> str:
    cat = data["catalog"]
    title = cat["title"]
    blurb = cat["blurb"]
    emoji = cat.get("emoji") or "🛡"
    canonical = "https://nikitakozemyaka.github.io/visual-cards/mechanics/"

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
  <title>Механики — Space Text World</title>
  <meta name="description" content="Демо игровых механик Space Text World: стабилизатор модулей и осколки."/>
  <link rel="canonical" href="{canonical}"/>
  <meta property="og:title" content="Механики — Space Text World"/>
  <meta property="og:description" content="Демо игровых механик: стабилизатор и осколки при смерти."/>
  <meta property="og:url" content="{canonical}"/>
  <meta property="og:image" content="https://nikitakozemyaka.github.io/visual-cards/site-preview.png"/>
  <meta property="og:type" content="website"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="Механики — Space Text World"/>
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
          Механики
        </div>
        <span class="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70">сценарии</span>
      </header>

      <section class="vc-rise vc-rise-d2 mt-10">
        <h1 class="text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">Механики игры</h1>
        <p class="mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
          Пошаговые демо: настрой параметры и посмотри итог. Сейчас — 1 сценарий про смерть и модули на броне.
        </p>
      </section>

      <div class="vc-arch-cards mt-10 flex flex-col gap-4">
        <a class="vc-rise vc-rise-d3 vc-mod-card vc-rarity-epic group relative block overflow-hidden rounded-xl border border-border bg-card transition-colors before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-epic/70" href="./stabilizer.html">
          <div class="vc-mod-card-inner p-5 sm:p-6">
            <div class="mb-3 flex flex-wrap items-center gap-2">
              <span class="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Live</span>
              <span class="rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-epic border-epic/40 bg-epic/10">Эпический</span>
            </div>
            <div class="flex items-start gap-3">
              <span class="text-3xl" aria-hidden="true">{esc(emoji)}</span>
              <div>
                <h2 class="text-balance text-xl font-bold tracking-tight text-foreground sm:text-2xl">{esc(title)}</h2>
                <p class="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">{esc(blurb)}</p>
              </div>
            </div>
            <span class="mt-4 inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              Открыть сценарий
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 transition-transform" aria-hidden="true"><path d="M7 7h10v10"></path><path d="M7 17 17 7"></path></svg>
            </span>
          </div>
        </a>
      </div>

      <footer class="mt-16 border-t border-border pt-5">
        <p class="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground/60">Space Text World · механики · 01</p>
      </footer>
    </div>
  </div>
<script src="../assets/nav-refresh.js?v=7" defer></script></body>
</html>
"""


def stabilizer_html(data: dict) -> str:
    cat = data["catalog"]
    title = cat["title"]
    blurb = cat["blurb"]
    raw, b64 = embed_json(data)
    canonical = "https://nikitakozemyaka.github.io/visual-cards/mechanics/stabilizer.html"

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
  <title>{esc(title)} — Space Text World</title>
  <meta name="description" content="{esc(blurb)}"/>
  <link rel="canonical" href="{canonical}"/>
  <meta property="og:title" content="{esc(title)} — Space Text World"/>
  <meta property="og:description" content="{esc(blurb)}"/>
  <meta property="og:url" content="{canonical}"/>
  <meta property="og:image" content="https://nikitakozemyaka.github.io/visual-cards/site-preview.png"/>
  <meta property="og:type" content="article"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="{esc(title)} — Space Text World"/>
  <meta name="twitter:description" content="{esc(blurb)}"/>
  <meta name="twitter:image" content="https://nikitakozemyaka.github.io/visual-cards/site-preview.png"/>
</head>
<body class="font-sans antialiased">
  <div class="relative min-h-screen vc-page-epic">
    <div class="pointer-events-none absolute inset-x-0 top-0 h-[360px] tactical-grid"></div>
    <div class="relative mx-auto w-full max-w-2xl px-5 py-8 sm:py-10">
      <a class="vc-rise inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground transition-colors" href="./index.html">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true"><path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path></svg>
        Все механики
      </a>

      <header class="vc-rise vc-rise-d1 mt-6 rounded-2xl border border-border bg-card p-6 vc-card vc-rarity-epic">
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Live</span>
          <span class="rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-epic border-epic/40 bg-epic/10">Сценарий</span>
        </div>
        <h1 class="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl">{esc(title)}</h1>
        <p class="mt-4 text-pretty leading-relaxed text-muted-foreground">{esc(blurb)}</p>
      </header>

      <section class="vc-rise vc-rise-d2 mt-4 rounded-2xl border border-border bg-card p-6" data-mechanics-id="death_stabilizer" data-stw-mechanics-b64="{b64}">
        <h2 class="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Параметры</h2>

        <div class="flex flex-col gap-5">
          <div>
            <div class="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Стабилизатор</div>
            <button type="button" id="sim-armed" role="switch" aria-checked="true" class="flex w-full items-center justify-between gap-3 rounded-xl border border-primary/50 bg-primary/10 px-4 py-3 text-left">
              <span>
                <span class="block text-sm font-medium text-foreground">Активирован до смерти</span>
                <span class="mt-0.5 block text-xs text-muted-foreground">Заряд сгорит и спасёт один модуль на броне</span>
              </span>
              <span class="relative h-6 w-11 shrink-0 rounded-full bg-primary" aria-hidden="true">
                <span class="absolute top-0.5 size-5 translate-x-[22px] rounded-full bg-background transition-transform"></span>
              </span>
            </button>
          </div>

          <div>
            <div class="mb-2 flex items-center justify-between gap-3">
              <span class="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Модули на броне</span>
              <label class="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                Слотов
                <select id="slot-count" class="rounded-lg border border-border bg-background px-2 py-1 text-foreground">
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3" selected>3</option>
                </select>
              </label>
            </div>
            <div id="slot-rows" class="flex flex-col gap-3"></div>
            <button type="button" id="preset-empty" class="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground underline-offset-2 hover:text-primary hover:underline">0 модулей на броне</button>
          </div>

          <button type="button" id="sim-die" class="inline-flex w-full items-center justify-center rounded-xl border border-primary bg-primary px-4 py-3 font-mono text-sm font-semibold uppercase tracking-[0.14em] text-primary-foreground transition-colors hover:bg-primary/90">
            Погиб
          </button>
        </div>

        <div id="sim-placeholder" class="mt-6 rounded-xl border border-dashed border-border bg-secondary/30 p-5 text-center text-sm text-muted-foreground">
          Настрой параметры и нажми «Погиб» — здесь появится итог.
        </div>
        <div id="sim-result" class="mt-6 hidden"></div>
        <p id="sim-error" class="mt-4 hidden text-sm text-destructive" role="alert"></p>
        <script type="application/json" id="stw-mechanics-data">{raw}</script>
      </section>

      <section class="vc-rise vc-rise-d3 mt-4 rounded-2xl border border-border bg-card p-6">
        <h2 class="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Как это работает в игре</h2>
        <ol class="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
          <li class="flex gap-3"><span class="font-mono text-xs tabular-nums text-primary/70">01</span><span>Крафт или квант-шоп: получи аварийный стабилизатор (в инвентаре максимум 1).</span></li>
          <li class="flex gap-3"><span class="font-mono text-xs tabular-nums text-primary/70">02</span><span>Активируй заряд, пока на экипированной броне есть модули.</span></li>
          <li class="flex gap-3"><span class="font-mono text-xs tabular-nums text-primary/70">03</span><span>При смерти сохранится один модуль (редкость → уровень → слот), остальные дадут осколки.</span></li>
          <li class="flex gap-3"><span class="font-mono text-xs tabular-nums text-primary/70">04</span><span>100 осколков — крафт нового стабилизатора.</span></li>
        </ol>
      </section>

      <footer class="mt-10 border-t border-border pt-5">
        <p class="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground/60">Space Text World · стабилизатор · demo</p>
      </footer>
    </div>
  </div>
  <script src="./mechanics_sim.js?v={SIM_JS_VERSION}" defer></script>
<script src="../assets/nav-refresh.js?v=7" defer></script></body>
</html>
"""


def patch_hub() -> None:
    path = ROOT / "index.html"
    text = path.read_text(encoding="utf-8")
    if "./mechanics/" in text:
        return
    # Hand-edited hub tile is preferred; build only patches section count if needed.


def main() -> None:
    OUT_MECH.mkdir(parents=True, exist_ok=True)
    data = build_payload()
    OUT_DATA.parent.mkdir(parents=True, exist_ok=True)
    OUT_DATA.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (OUT_MECH / "index.html").write_text(catalog_html(data), encoding="utf-8")
    (OUT_MECH / "stabilizer.html").write_text(stabilizer_html(data), encoding="utf-8")
    print("wrote", OUT_DATA)
    print("wrote mechanics/index.html, mechanics/stabilizer.html")


if __name__ == "__main__":
    main()
