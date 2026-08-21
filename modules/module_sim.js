(function () {
  "use strict";

  var CIRC = 2 * Math.PI * 52;

  function pct(n, digits) {
    var d = digits == null ? 1 : digits;
    var v = Math.round(n * Math.pow(10, d)) / Math.pow(10, d);
    if (d === 0) return v.toFixed(0) + "%";
    return (v % 1 === 0 ? v.toFixed(0) : v.toFixed(d)) + "%";
  }

  function fmtNum(n, digits) {
    var d = digits == null ? 1 : digits;
    var v = Math.round(n * Math.pow(10, d)) / Math.pow(10, d);
    return v % 1 === 0 ? String(v.toFixed(0)) : String(v.toFixed(d));
  }

  function fmtCd(sec) {
    if (!sec || sec <= 0) return "—";
    if (sec < 60) return sec + " с";
    var m = Math.round(sec / 60);
    if (m < 60) return m + " мин";
    var h = Math.floor(m / 60);
    var rm = m % 60;
    return rm ? h + " ч " + rm + " мин" : h + " ч";
  }

  function cooldownSec(cmd, level) {
    var base = Number(cmd.cooldown_base_sec || 0);
    var per = Number(cmd.cooldown_per_level_sec || 0);
    var lvl = Math.max(1, level | 0);
    return Math.max(0, base + per * (lvl - 1));
  }

  function clampPct(n) {
    return Math.max(0, Math.min(100, n));
  }

  function styleChoice(btn, on, compact) {
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    var pad = compact ? "py-2" : "py-2.5";
    btn.className =
      "rounded-lg border " +
      pad +
      " font-mono text-sm font-semibold tabular-nums transition-colors " +
      (on
        ? "border-primary bg-primary/15 text-primary"
        : "border-border bg-secondary text-foreground");
  }

  function styleSwitch(btn, on) {
    btn.setAttribute("aria-checked", on ? "true" : "false");
    btn.className =
      "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors " +
      (on ? "border-primary/50 bg-primary/10" : "border-border bg-secondary");
    var track = btn.querySelector("span.relative");
    var knob = btn.querySelector("span.absolute");
    if (track) {
      track.className =
        "relative h-6 w-11 shrink-0 rounded-full transition-colors " +
        (on ? "bg-primary" : "bg-input");
    }
    if (knob) {
      knob.className =
        "absolute top-0.5 size-5 rounded-full bg-background transition-transform " +
        (on ? "translate-x-[22px]" : "translate-x-0.5");
    }
  }

  function setCmdTitle(btn, slash, active) {
    var title = btn.querySelector(".block.text-sm.font-semibold");
    if (!title) return;
    title.innerHTML =
      'Команда <code class="rounded bg-background/60 px-1 py-0.5 font-mono text-[13px] text-primary">/' +
      slash +
      "</code> " +
      (active ? "активна" : "выкл");
  }

  function applyRing(heroRing, heroValue, ringPct, live, valueText) {
    var fill = live ? clampPct(ringPct) : 0;
    if (heroRing) {
      heroRing.setAttribute("stroke-dasharray", String(CIRC));
      heroRing.setAttribute("stroke-dashoffset", String(CIRC * (1 - fill / 100)));
      heroRing.className =
        "transition-[stroke-dashoffset] duration-500 ease-out " +
        (live && fill > 0 ? "text-ok" : "text-muted-foreground");
    }
    if (heroValue) {
      heroValue.textContent = valueText;
      heroValue.className =
        "font-mono text-4xl font-bold tabular-nums " +
        (live ? "text-ok" : "text-muted-foreground");
    }
  }

  function calcStasis(mod, level, dodge, equipped, cmdOn) {
    var pEff = mod.passive || {};
    var cEff = (mod.command && mod.command.effect) || {};
    var passivePer = Number(pEff.enemy_evasion_penalty_per_level || 0.01);
    var pinPer = Number(cEff.enemy_evasion_penalty_per_level || 0.05);
    var roundsPer = Number(cEff.duration_rounds_per_level || 3);
    var roundsCap = Number(cEff.duration_rounds_cap || 27);
    if (!equipped) {
      return {
        passive: 0,
        pin: 0,
        total: 0,
        eff: dodge,
        hit: Math.max(0, 100 - dodge),
        rounds: 0,
        cd: 0,
        ringPct: Math.max(0, 100 - dodge)
      };
    }
    var passive = passivePer * level * 100;
    var pin = cmdOn ? Math.min(95, pinPer * level * 100) : 0;
    var total = passive + pin;
    var eff = Math.max(0, dodge - total);
    var hit = 100 - eff;
    var rounds = cmdOn ? Math.min(roundsCap, roundsPer * level) : 0;
    return {
      passive: passive,
      pin: pin,
      total: total,
      eff: eff,
      hit: hit,
      rounds: rounds,
      cd: cooldownSec(mod.command, level),
      ringPct: hit
    };
  }

  function primaryPassivePct(p, L) {
    // Main % passive for the ring (0 if none). Prefer combat/economy gauges.
    if (p.damage_pct_per_level != null) return p.damage_pct_per_level * L * 100;
    if (p.entangler_per_level != null) return p.entangler_per_level * L * 100;
    if (p.double_tap_per_level != null) return p.double_tap_per_level * L * 100;
    if (p.crit_bonus_per_level != null) return p.crit_bonus_per_level * L * 100;
    if (p.base_chance_bonus_per_level != null) return p.base_chance_bonus_per_level * L * 100;
    if (p.rare_find_bonus_per_level != null) return p.rare_find_bonus_per_level * L * 100;
    if (p.scrap_bonus_per_level != null) return p.scrap_bonus_per_level * L * 100;
    if (p.matter_find_bonus_per_level != null) return p.matter_find_bonus_per_level * L * 100;
    if (p.bonus_rarity_tier_per_level != null) return p.bonus_rarity_tier_per_level * L * 100;
    if (p.vigor_step_reduction_per_level != null) return p.vigor_step_reduction_per_level * L * 100;
    if (p.initiative_bonus_per_level != null) return p.initiative_bonus_per_level * L * 100;
    if (p.status_resist != null) return p.status_resist * 100;
    if (p.control_resist != null) return p.control_resist * 100;
    if (p.execute_bonus != null) return p.execute_bonus * 100;
    return 0;
  }

  function calcGeneric(mod, level, equipped, cmdOn) {
    var p = mod.passive || {};
    var c = (mod.command && mod.command.effect) || {};
    var L = Math.max(1, level | 0);
    var out = {
      rows: [],
      hero: { value: "—", label: "Главный эффект", sub: "", ringPct: 0 },
      bars: [],
      cd: 0
    };

    function add(label, value, tone, wide) {
      out.rows.push({ label: label, value: value, tone: tone || "fg", wide: !!wide });
    }

    function setHero(value, label, sub, ringPct) {
      out.hero = {
        value: value,
        label: label,
        sub: sub || "",
        ringPct: clampPct(ringPct || 0)
      };
    }

    // Ring = passive% + command% (command only while toggled on).
    function finishHero(opts) {
      var passPct = Number(opts.passivePct || 0);
      var cmdPct = Number(opts.commandPct || 0);
      var liveCmd = cmdOn ? cmdPct : 0;
      var ring = passPct + liveCmd;
      var subBits = [];
      if (passPct > 0) subBits.push("пассив " + pct(passPct, 1));
      if (cmdPct > 0) {
        subBits.push(
          cmdOn ? "/" + slash + " " + pct(cmdPct, 1) : "/" + slash + " выкл (" + pct(cmdPct, 1) + ")"
        );
      }
      if (opts.subExtra) subBits.push(opts.subExtra);
      setHero(opts.value, opts.label, subBits.join(" · "), ring);
    }

    if (!equipped) {
      setHero("—", "Без модуля", "Экипируй, чтобы увидеть цифры", 0);
      add("Пассивы", "—", "muted");
      add("Команда", "—", "muted");
      return out;
    }

    var passivePct = primaryPassivePct(p, L);
    var cmdTone = cmdOn ? "ok" : "muted";

    if (p.max_health_per_level != null) add("Макс. HP", "+" + fmtNum(p.max_health_per_level * L, 0));
    if (p.health_regen_flat != null) add("Реген HP/ход", "+" + fmtNum(p.health_regen_flat, 0));
    if (p.max_nitrogen_per_level != null) add("Лимит азота", "+" + fmtNum(p.max_nitrogen_per_level * L, 0));
    if (p.max_infection_per_level != null) add("Лимит заражения", "+" + fmtNum(p.max_infection_per_level * L, 0));
    if (p.status_resist != null) add("Сопр. статусам", pct(p.status_resist * 100, 0));
    if (p.damage_pct_per_level != null) {
      var dmg = p.damage_pct_per_level * L * 100;
      add("Урон (пассив)", "+" + pct(dmg, 1));
      out.bars.push({ label: "Пасс", pct: dmg, max: 100 });
    }
    if (p.execute_bonus != null) add("Добивание", "+" + pct(p.execute_bonus * 100, 0));
    if (p.double_tap_per_level != null) add("Двойной удар", "+" + pct(p.double_tap_per_level * L * 100, 1));
    if (p.crit_bonus_per_level != null) add("Сила крита (пассив)", "+" + pct(p.crit_bonus_per_level * L * 100, 1));
    if (p.base_chance_bonus_per_level != null)
      add("Шанс находок", "+" + pct(p.base_chance_bonus_per_level * L * 100, 1));
    if (p.scrap_range_bonus_per_level != null)
      add("Лом (диапазон)", "+" + fmtNum(p.scrap_range_bonus_per_level * L, 0));
    if (p.rare_find_bonus_per_level != null)
      add("Редкий лут", "+" + pct(p.rare_find_bonus_per_level * L * 100, 1));
    if (p.scrap_bonus_per_level != null)
      add("Бонус лома", "+" + pct(p.scrap_bonus_per_level * L * 100, 1));
    if (p.matter_find_bonus_per_level != null)
      add("Материя", "+" + pct(p.matter_find_bonus_per_level * L * 100, 1));
    if (p.bonus_rarity_tier_per_level != null)
      add("Шанс +tier", "+" + pct(p.bonus_rarity_tier_per_level * L * 100, 1));
    if (p.vigor_step_reduction_per_level != null)
      add("Тонус за шаг", "−" + pct(p.vigor_step_reduction_per_level * L * 100, 1));
    if (p.initiative_bonus_per_level != null)
      add("Инициатива", "+" + pct(p.initiative_bonus_per_level * L * 100, 1));
    if (p.inventory_slots_per_level != null)
      add("Слоты инвентаря", "+" + fmtNum(p.inventory_slots_per_level * L, 0));
    if (p.max_weight_per_level != null)
      add("Макс. вес", "+" + fmtNum(p.max_weight_per_level * L, 0));
    if (p.armor_bonus_per_level != null)
      add("Броня", "+" + fmtNum(p.armor_bonus_per_level * L, 1));
    if (p.shield_bonus_flat != null) add("Энергощит", "+" + fmtNum(p.shield_bonus_flat, 0));
    if (p.mythic_shield_per_level != null)
      add("Миф. щит", "+" + fmtNum(p.mythic_shield_per_level * L, 0));
    if (p.mythic_shield_regen_per_level != null)
      add("Реген миф. щита", "+" + fmtNum(p.mythic_shield_regen_per_level * L, 0));
    if (p.control_resist != null) add("Сопр. контролю", pct(p.control_resist * 100, 0));
    if (p.entangler_per_level != null)
      add("Запутывание (пассив)", "+" + pct(p.entangler_per_level * L * 100, 1));

    if (!Object.keys(p).length) {
      add("Пассив", "нет", "muted");
    }

    var cd = cooldownSec(mod.command, L);
    out.cd = cd;
    var slash = (mod.command && mod.command.slash) || "";

    if (c.heal_pct_base != null) {
      var heal = (c.heal_pct_base + c.heal_pct_per_level * (L - 1)) * 100;
      add("/" + slash + " хил", pct(heal, 1), cmdTone);
      finishHero({
        value: pct(heal, 1),
        label: "/" + slash + (cmdOn ? " хил" : " + пассив"),
        passivePct: passivePct,
        commandPct: heal,
        subExtra: "от макс. HP"
      });
    } else if (c.purge_pct_base != null) {
      var purge = (c.purge_pct_base + c.purge_pct_per_level * (L - 1)) * 100;
      add("/" + slash, pct(purge, 0), cmdTone);
      finishHero({
        value: pct(purge, 0),
        label: "/" + slash + (cmdOn ? " очистка" : " + пассив"),
        passivePct: passivePct,
        commandPct: purge,
        subExtra: "азот / заражение"
      });
    } else if (c.damage_mult_base != null) {
      var dm = (c.damage_mult_base + c.damage_mult_per_level * (L - 1)) * 100;
      add("/" + slash + " урон", "+" + pct(dm, 0), cmdTone);
      out.bars.push({ label: "/" + slash, pct: cmdOn ? dm : 0, max: 100, display: cmdOn ? "+" + pct(dm, 0) : "—" });
      finishHero({
        value: "+" + pct(passivePct + (cmdOn ? dm : 0), 1),
        label: cmdOn ? "Урон пассив + /" + slash : "Урон (пассив)",
        passivePct: passivePct,
        commandPct: dm
      });
    } else if (c.crit_chance_base != null) {
      var cc = (c.crit_chance_base + c.crit_chance_per_level * (L - 1)) * 100;
      var cdmg = (c.crit_damage_base + c.crit_damage_per_level * (L - 1)) * 100;
      add("/" + slash + " шанс", "+" + pct(cc, 0), cmdTone);
      add("/" + slash + " сила", "+" + pct(cdmg, 0), cmdTone);
      finishHero({
        value: "+" + pct(cc, 0),
        label: "/" + slash + (cmdOn ? " шанс крита" : " + пассив"),
        passivePct: passivePct,
        commandPct: cc,
        subExtra: "сила +" + pct(cdmg, 0)
      });
    } else if (c.damage_reduction_base != null) {
      var dr = (c.damage_reduction_base + c.damage_reduction_per_level * (L - 1)) * 100;
      add("/" + slash + " DR", pct(dr, 1), cmdTone);
      finishHero({
        value: pct(dr, 1),
        label: "/" + slash + (cmdOn ? " DR" : " + пассив"),
        passivePct: passivePct,
        commandPct: dr,
        subExtra: "снижение входящего"
      });
    } else if (c.shield_regen_mult_base != null) {
      var sr = (c.shield_regen_mult_base + c.shield_regen_mult_per_level * (L - 1)) * 100;
      var mr = (c.mythic_regen_mult_base + c.mythic_regen_mult_per_level * (L - 1)) * 100;
      add("/" + slash + " щит", "+" + pct(sr, 0), cmdTone);
      add("/" + slash + " миф", "+" + pct(mr, 0), cmdTone);
      finishHero({
        value: "+" + pct(sr, 0),
        label: "/" + slash + (cmdOn ? " реген щита" : " + пассив"),
        passivePct: passivePct,
        commandPct: sr,
        subExtra: "миф +" + pct(mr, 0)
      });
    } else if (c.weight_reduction_base != null) {
      var wr = (c.weight_reduction_base + c.weight_reduction_per_level * (L - 1)) * 100;
      var dur = Number(c.duration_sec || 0);
      add("/" + slash, "−" + pct(wr, 0), cmdTone);
      add("Длительность", fmtCd(dur), cmdTone);
      finishHero({
        value: "−" + pct(wr, 0),
        label: "/" + slash + (cmdOn ? " вес" : " + пассив"),
        passivePct: passivePct,
        commandPct: wr,
        subExtra: "длительность " + fmtCd(dur)
      });
    } else if (c.entangle_bonus_base != null) {
      var eb = (c.entangle_bonus_base + c.entangle_bonus_per_level * (L - 1)) * 100;
      var rounds = c.duration_rounds_base + c.duration_rounds_per_level * (L - 1);
      add("/" + slash, "+" + pct(eb, 0), cmdTone);
      add("Раундов /" + slash, String(rounds), cmdTone);
      out.bars.push({
        label: "/" + slash,
        pct: cmdOn ? eb : 0,
        max: 100,
        display: cmdOn ? "+" + pct(eb, 0) : "—"
      });
      finishHero({
        value: "+" + pct(passivePct + (cmdOn ? eb : 0), 1),
        label: cmdOn ? "Запутывание пассив + /" + slash : "Запутывание (пассив)",
        passivePct: passivePct,
        commandPct: eb,
        subExtra: rounds + " раунд(ов)"
      });
    } else if (c.uses_equals_level) {
      var cap = Number(c.uses_cap || 9);
      var uses = Math.min(cap, L);
      var usesPct = (uses / cap) * 100;
      add("/" + slash + " uses", String(uses), cmdTone);
      finishHero({
        value: String(uses),
        label: "/" + slash + (cmdOn ? " hops" : " + пассив"),
        passivePct: passivePct,
        commandPct: usesPct,
        subExtra: "использований за сессию"
      });
    } else if (c.uses_per_two_levels != null) {
      var rUses = Number(c.uses_base || 1) + Math.floor(L / 2) * Number(c.uses_per_two_levels || 0);
      var maxUses = Number(c.uses_base || 1) + Math.floor(9 / 2) * Number(c.uses_per_two_levels || 0);
      var rPct = (rUses / Math.max(1, maxUses)) * 100;
      add("/" + slash + " uses", String(rUses), cmdTone);
      finishHero({
        value: String(rUses),
        label: "/" + slash + (cmdOn ? " uses" : " + пассив"),
        passivePct: passivePct,
        commandPct: rPct,
        subExtra: "на карточке встречи"
      });
    } else if (c.analysis_cap != null) {
      var alvl = Math.min(Number(c.analysis_cap || 9), L);
      var acap = Number(c.analysis_cap || 9);
      add("/" + slash, String(alvl), cmdTone);
      finishHero({
        value: String(alvl),
        label: "/" + slash + (cmdOn ? " уровень" : " (выкл)"),
        passivePct: passivePct,
        commandPct: (alvl / acap) * 100,
        subExtra: "детализация разбора"
      });
    } else if (c.rarity_tier_boost != null) {
      add("/" + slash, "+" + fmtNum(c.rarity_tier_boost, 0) + " tier", cmdTone);
      add("TTL заряда", fmtCd(Number(c.ttl_sec || 0)), cmdTone);
      finishHero({
        value: "+" + fmtNum(c.rarity_tier_boost, 0) + " tier",
        label: "/" + slash + (cmdOn ? "" : " + пассив"),
        passivePct: passivePct,
        commandPct: 100,
        subExtra: "TTL " + fmtCd(Number(c.ttl_sec || 0))
      });
    } else if (slash) {
      // Instant / empty effect — ring still carries passive%; command = charged gauge.
      finishHero({
        value: passivePct > 0 ? "+" + pct(passivePct, 1) : fmtCd(cd),
        label: passivePct > 0 ? "Пассив" : "/" + slash + " КД",
        passivePct: passivePct,
        commandPct: 100,
        subExtra: "КД " + fmtCd(cd)
      });
    } else {
      // Passive-only module
      finishHero({
        value: passivePct > 0 ? "+" + pct(passivePct, 1) : "—",
        label: "Пассив",
        passivePct: passivePct,
        commandPct: 0,
        subExtra: "без команды"
      });
    }

    return out;
  }

  function renderStats(grid, rows) {
    if (!grid) return;
    grid.innerHTML = "";
    rows.forEach(function (row) {
      var tone =
        row.tone === "primary"
          ? "text-primary"
          : row.tone === "muted"
            ? "text-muted-foreground"
            : row.tone === "ok"
              ? "text-ok"
              : "text-foreground";
      var wrap = document.createElement("div");
      wrap.className = "rounded-xl border border-border bg-secondary/60 px-4 py-3";
      if (row.wide) wrap.className += " col-span-2 border-ok/25 bg-ok/5";
      wrap.innerHTML =
        '<div class="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">' +
        row.label +
        '</div><div class="mt-1 font-mono text-2xl font-bold tabular-nums ' +
        tone +
        '">' +
        row.value +
        "</div>";
      grid.appendChild(wrap);
    });
  }

  function renderBars(host, bars) {
    if (!host) return;
    if (!bars || !bars.length) {
      host.innerHTML = "";
      host.style.display = "none";
      return;
    }
    host.style.display = "";
    host.innerHTML = bars
      .map(function (b) {
        var w = Math.min(100, (b.pct / (b.max || 100)) * 100);
        return (
          '<div class="flex items-center gap-3 py-1 font-mono text-xs">' +
          '<span class="w-14 shrink-0 text-muted-foreground">' +
          b.label +
          "</span>" +
          '<div class="h-2 flex-1 overflow-hidden rounded-full bg-input"><div class="h-full rounded-full bg-ok/80 transition-[width] duration-500 ease-out" style="width:' +
          w +
          '%"></div></div>' +
          '<span class="w-12 shrink-0 text-right tabular-nums text-muted-foreground">' +
          (b.display || pct(b.pct, 1)) +
          "</span></div>"
        );
      })
      .join("");
  }

  function bootModule(mod, root) {
    var levelGroup = root.querySelector('[aria-label="Уровень модуля"]');
    var equipBtn = document.getElementById("sim-equip");
    var cmdBtn = document.getElementById("sim-cmd");
    if (!levelGroup || !equipBtn || !cmdBtn) return;

    var levelBtns = Array.prototype.slice.call(levelGroup.querySelectorAll("button"));
    var dodgeExtra = root.querySelector('[data-sim-extra="dodge"]');
    var dodgeGroup = dodgeExtra ? dodgeExtra.querySelector('[aria-label="Уклонение врага"]') : null;
    var dodgeBtns = dodgeGroup
      ? Array.prototype.slice.call(dodgeGroup.querySelectorAll("button"))
      : [];
    var range = dodgeExtra ? dodgeExtra.querySelector('input[type="range"]') : null;
    var dodgeValueEl = dodgeExtra ? dodgeExtra.querySelector("[data-dodge-value]") : null;

    var heroValue = root.querySelector("[data-hero-value]");
    var heroLabel = root.querySelector("[data-hero-label]");
    var heroSub = root.querySelector("[data-hero-sub]");
    var heroRing = root.querySelector("[data-hero-ring]");
    var statsGrid = root.querySelector("[data-stats-grid]");
    var barsHost = root.querySelector("[data-bars]");
    var cdLine = root.querySelector("[data-cd-line]");

    var state = { level: 3, dodge: 20, equipped: true, cmdOn: false };
    var slash = (mod.command && mod.command.slash) || "";

    function setDisabledLook(disabled) {
      levelGroup.style.opacity = disabled ? "0.45" : "";
      levelGroup.style.pointerEvents = disabled ? "none" : "";
      cmdBtn.style.opacity = disabled ? "0.45" : "";
      cmdBtn.style.pointerEvents = disabled ? "none" : "";
    }

    function render() {
      levelBtns.forEach(function (btn) {
        var lvl = Number((btn.textContent || "").replace(/\D/g, ""));
        styleChoice(btn, lvl === state.level, false);
      });
      dodgeBtns.forEach(function (btn) {
        var d = Number((btn.textContent || "").replace("%", ""));
        styleChoice(btn, d === state.dodge, true);
      });

      styleSwitch(equipBtn, state.equipped);
      var equipSub = equipBtn.querySelector(".block.text-xs");
      if (equipSub) {
        equipSub.textContent = state.equipped
          ? "Модуль установлен на броню"
          : "Без модуля — базовые параметры";
      }

      styleSwitch(cmdBtn, state.cmdOn && state.equipped);
      setCmdTitle(cmdBtn, slash, state.equipped && state.cmdOn);
      setDisabledLook(!state.equipped);

      if (range) range.value = String(state.dodge);
      if (dodgeValueEl) dodgeValueEl.textContent = pct(state.dodge, 0);

      if (mod.sim_kind === "stasis_anchor") {
        var p = calcStasis(mod, state.level, state.dodge, state.equipped, state.cmdOn);
        applyRing(heroRing, heroValue, p.ringPct, state.equipped, pct(p.hit, 0));
        if (heroLabel) heroLabel.textContent = "Ваш шанс попадания (оценка)";
        if (heroSub) {
          if (!state.equipped) heroSub.textContent = "";
          else if (state.cmdOn) heroSub.textContent = "пассив + /" + slash;
          else heroSub.textContent = "пассив (/" + slash + " выкл)";
        }

        var pinPreview = state.equipped
          ? Math.min(95, Number(((mod.command && mod.command.effect) || {}).enemy_evasion_penalty_per_level || 0.05) * state.level * 100)
          : 0;
        var roundsPreview = state.equipped
          ? Math.min(
              Number(((mod.command && mod.command.effect) || {}).duration_rounds_cap || 27),
              Number(((mod.command && mod.command.effect) || {}).duration_rounds_per_level || 3) * state.level
            )
          : 0;

        var rows = [
          {
            label: "Пассив",
            value: state.equipped ? "−" + pct(p.passive, 0) : "—",
            tone: state.equipped ? "fg" : "muted"
          },
          {
            label: "/" + slash,
            value: state.equipped ? "−" + pct(state.cmdOn ? p.pin : pinPreview, 0) : "—",
            tone: state.equipped && state.cmdOn ? "ok" : "muted"
          },
          {
            label: "Раундов /" + slash,
            value: state.equipped ? String(state.cmdOn ? p.rounds : roundsPreview) : "—",
            tone: state.equipped && state.cmdOn ? "fg" : "muted"
          },
          {
            label: "Суммарный штраф",
            value: state.equipped ? "−" + pct(p.total, 0) : "—",
            tone: state.equipped ? "ok" : "muted"
          },
          {
            label: "Dodge врага после якоря",
            value: pct(p.eff, 0),
            tone: "ok",
            wide: true
          }
        ];
        renderStats(statsGrid, rows);
        if (cdLine) {
          cdLine.textContent = state.equipped
            ? "КД команды: " + fmtCd(p.cd)
            : "";
        }
        var scale = Math.max(50, p.passive + Math.max(pinPreview, 1), 1);
        renderBars(
          barsHost,
          state.equipped
            ? [
                {
                  label: "Пасс",
                  pct: p.passive,
                  max: scale,
                  display: "−" + pct(p.passive, 0)
                },
                {
                  label: "/" + slash,
                  pct: state.cmdOn ? p.pin : 0,
                  max: scale,
                  display: state.cmdOn ? "−" + pct(p.pin, 0) : "—"
                }
              ]
            : []
        );
        return;
      }

      var g = calcGeneric(mod, state.level, state.equipped, state.cmdOn);
      applyRing(
        heroRing,
        heroValue,
        g.hero.ringPct,
        state.equipped && g.hero.ringPct > 0,
        g.hero.value
      );
      if (heroLabel) heroLabel.textContent = g.hero.label;
      if (heroSub) heroSub.textContent = g.hero.sub || "";
      renderStats(statsGrid, g.rows);
      if (cdLine) {
        cdLine.textContent = state.equipped ? "КД команды: " + fmtCd(g.cd) : "";
      }
      renderBars(barsHost, g.bars);
    }

    levelBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!state.equipped) return;
        state.level = Number((btn.textContent || "").replace(/\D/g, "")) || 1;
        render();
      });
    });
    dodgeBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.dodge = Number((btn.textContent || "").replace("%", "")) || 0;
        render();
      });
    });
    if (range) {
      range.addEventListener("input", function () {
        state.dodge = Number(range.value) || 0;
        render();
      });
    }
    equipBtn.addEventListener("click", function () {
      state.equipped = !state.equipped;
      if (!state.equipped) state.cmdOn = false;
      render();
    });
    cmdBtn.addEventListener("click", function () {
      if (!state.equipped) return;
      state.cmdOn = !state.cmdOn;
      render();
    });

    render();
  }

  function boot() {
    var title = document.getElementById("sim-title");
    if (!title) return;
    var root = title.closest("section");
    if (!root) return;
    var mid = root.getAttribute("data-module-id");
    if (!mid) return;

    function fail(err) {
      console.error(err);
      var hero = root.querySelector("[data-hero-value]");
      if (hero) hero.textContent = "!";
      var label = root.querySelector("[data-hero-label]");
      if (label) label.textContent = "Не загрузился баланс";
    }

    function start(mod) {
      if (!mod || mod.id !== mid) throw new Error("module mismatch: " + mid);
      bootModule(mod, root);
    }

    // Prefer in-page embed (no network) — works in Telegram WebView / offline cache.
    var embedded = document.getElementById("stw-module-data");
    if (embedded && embedded.textContent) {
      try {
        start(JSON.parse(embedded.textContent));
        return;
      } catch (err) {
        console.warn("embedded module JSON failed, falling back to fetch", err);
      }
    }

    var jsonUrl = new URL("../data/modules.json?v=3", window.location.href).href;
    fetch(jsonUrl)
      .then(function (r) {
        if (!r.ok) throw new Error("modules.json " + r.status);
        return r.json();
      })
      .then(function (data) {
        var list = (data && data.modules) || [];
        var mod = null;
        for (var i = 0; i < list.length; i++) {
          if (list[i].id === mid) {
            mod = list[i];
            break;
          }
        }
        if (!mod) throw new Error("module not found: " + mid);
        start(mod);
      })
      .catch(fail);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
