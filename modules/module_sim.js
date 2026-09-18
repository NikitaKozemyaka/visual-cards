(function () {
  "use strict";

  // sim_display profiles: combined_pct | split_metrics | command_only | economy

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
    var base = Number((cmd && cmd.cooldown_base_sec) || 0);
    var per = Number((cmd && cmd.cooldown_per_level_sec) || 0);
    var lvl = Math.max(1, level | 0);
    return Math.max(0, base + per * (lvl - 1));
  }

  /** Anchor-style combat charge: min(cap, per_level * level). Matches STW _combat_charge_duration_rounds. */
  function chargeDurationRounds(effect, level) {
    var per = Number((effect && effect.duration_rounds_per_level) || 3);
    var cap = Number((effect && effect.duration_rounds_cap) || 27);
    var L = Math.max(1, level | 0);
    return Math.min(Math.max(1, cap), Math.max(1, per * L));
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
      (active ? "вкл." : "выкл.");
  }

  function applyRing(heroRing, heroValue, ringPct, live, valueText) {
    var fill = live ? clampPct(ringPct) : 0;
    if (heroRing) {
      heroRing.setAttribute("stroke-dasharray", String(CIRC));
      heroRing.setAttribute("stroke-dashoffset", String(CIRC * (1 - fill / 100)));
      heroRing.setAttribute(
        "class",
        "transition-[stroke-dashoffset] duration-500 ease-out " +
          (live && fill > 0 ? "text-ok" : "text-muted-foreground")
      );
    }
    if (heroValue) {
      heroValue.textContent = valueText;
      heroValue.className =
        "font-mono text-4xl font-bold tabular-nums " +
        (live ? "text-ok" : "text-muted-foreground");
    }
  }

  function dash(on, text) {
    return on ? text : "—";
  }

  function unequippedView(slash) {
    return {
      hero: { value: "—", label: "Без модуля", sub: "", ringPct: 0 },
      rows: [
        { label: "Пассив модуля", value: "—", tone: "muted" },
        { label: slash ? "/" + slash : "Команда", value: "—", tone: "muted" },
        { label: "Доп. эффект", value: "—", tone: "muted" },
        { label: "Ещё показатель", value: "—", tone: "muted" },
        { label: "Что даёт модуль", value: "—", tone: "muted", wide: true }
      ],
      bars: [],
      cd: 0
    };
  }

  /** Same-axis % modules (stasis, entangle, kinetic, crit, detox). */
  function packCombinedPct(opts) {
    var cmdOn = !!opts.cmdOn;
    var passN = Number(opts.passN || 0);
    var cmdN = cmdOn ? Number(opts.cmdN || 0) : 0;
    var totalN = passN + cmdN;
    var ring = opts.ringPct != null ? Number(opts.ringPct) : totalN;
    var scale = Math.max(50, passN + Math.max(Number(opts.cmdN || 0), 1), 1);
    var passLabel = opts.passLabel || "Пассив модуля";
    var passBarLabel = opts.passBarLabel || passLabel;

    return {
      hero: {
        value: opts.heroValue,
        label: opts.heroLabel,
        sub: opts.heroSub || "",
        ringPct: clampPct(ring)
      },
      rows: [
        { label: passLabel, value: opts.passText, tone: "fg" },
        {
          label: opts.cmdLabel,
          value: dash(cmdOn, opts.cmdText),
          tone: cmdOn ? "primary" : "muted"
        },
        {
          label: opts.extraLabel,
          value: opts.extraAlways ? opts.extraText : dash(cmdOn, opts.extraText),
          tone: cmdOn || opts.extraAlways ? "fg" : "muted"
        },
        { label: opts.totalLabel, value: opts.totalText, tone: "primary" },
        { label: opts.resultLabel, value: opts.resultText, tone: "ok", wide: true }
      ],
      bars: [
        {
          label: passBarLabel,
          pct: passN,
          max: scale,
          display: opts.passBar || opts.passText,
          tone: "passive"
        },
        {
          label: opts.cmdBarLabel || opts.cmdLabel,
          pct: cmdN,
          max: scale,
          display: dash(cmdOn, opts.cmdBar || opts.cmdText),
          tone: "pin"
        }
      ],
      cd: opts.cd || 0
    };
  }

  var pack = packCombinedPct;

  /** Different units: ring = primary metric only; bars use separate scales. */
  function packSplit(opts) {
    var cmdOn = !!opts.cmdOn;
    var passPct = Number(opts.passBarPct || 0);
    var passMax = Number(opts.passBarMax || 100);
    var cmdPct = cmdOn ? Number(opts.cmdBarPct || 0) : 0;
    var cmdMax = Number(opts.cmdBarMax || 100);
    var passLabel = opts.passLabel || "Пассив модуля";
    var passBarLabel = opts.passBarLabel || passLabel;
    var bars = [];
    if (passMax > 0 && passPct > 0) {
      bars.push({
        label: passBarLabel,
        pct: passPct,
        max: passMax,
        display: opts.passBarDisplay || opts.passText,
        tone: "passive"
      });
    }
    if (cmdMax > 0) {
      bars.push({
        label: opts.cmdBarLabel || opts.cmdLabel,
        pct: cmdPct,
        max: cmdMax,
        display: dash(cmdOn, opts.cmdBarDisplay || opts.cmdText),
        tone: "pin"
      });
    }

    return {
      hero: {
        value: opts.heroValue,
        label: opts.heroLabel,
        sub: opts.heroSub || "",
        ringPct: clampPct(Number(opts.ringPct || 0))
      },
      rows: [
        { label: passLabel, value: opts.passText, tone: "fg" },
        {
          label: opts.cmdLabel,
          value: dash(cmdOn, opts.cmdText),
          tone: cmdOn ? "primary" : "muted"
        },
        {
          label: opts.extraLabel,
          value: dash(cmdOn, opts.extraText),
          tone: cmdOn ? "fg" : "muted"
        },
        { label: opts.totalLabel, value: opts.totalText, tone: "primary" },
        { label: opts.resultLabel, value: opts.resultText, tone: "ok", wide: true }
      ],
      bars: bars,
      cd: opts.cd || 0
    };
  }

  function packCommandOnly(opts) {
    var cmdOn = !!opts.cmdOn;
    var ring = cmdOn ? Number(opts.ringPct || 0) : 0;
    var barPct = cmdOn ? Number(opts.barPct || 0) : 0;
    var barMax = Number(opts.barMax || 100);
    var nowLabel = opts.nowLabel || "Сейчас на встрече";
    var resultLabel = opts.resultLabel || "Что даёт команда";

    return {
      hero: {
        value: opts.heroValue,
        label: opts.heroLabel,
        sub: opts.heroSub || "Только команда на встрече",
        ringPct: clampPct(ring)
      },
      rows: [
        { label: opts.cmdLabel, value: dash(cmdOn, opts.cmdText), tone: cmdOn ? "primary" : "muted" },
        { label: opts.extraLabel, value: dash(cmdOn, opts.extraText), tone: cmdOn ? "fg" : "muted" },
        { label: nowLabel, value: opts.nowText, tone: "primary" },
        { label: resultLabel, value: opts.resultText, tone: "ok", wide: true },
        { label: "Пассив модуля", value: "Нет — только команда", tone: "muted", wide: true }
      ],
      bars: barMax
        ? [
            {
              label: opts.cmdLabel,
              pct: barPct,
              max: barMax,
              display: dash(cmdOn, opts.cmdText),
              tone: "pin"
            }
          ]
        : [],
      cd: opts.cd || 0
    };
  }

  function packEconomy(opts) {
    var cmdOn = !!opts.cmdOn;
    var passN = Number(opts.passBarPct || 0);
    var passMax = Number(opts.passBarMax || 100);
    var cmdFill = cmdOn ? Number(opts.cmdBarPct || 100) : 0;
    var passLabel = opts.passLabel || "Шанс находки (всегда)";
    var nowLabel = opts.nowLabel || "Сейчас";
    var resultLabel = opts.resultLabel || "Что даёт модуль";

    return {
      hero: {
        value: opts.heroValue,
        label: opts.heroLabel,
        sub: opts.heroSub || "",
        ringPct: clampPct(Number(opts.ringPct || 0))
      },
      rows: [
        { label: passLabel, value: opts.passText, tone: "fg" },
        {
          label: opts.cmdLabel,
          value: dash(cmdOn, opts.cmdText),
          tone: cmdOn ? "primary" : "muted"
        },
        { label: opts.extraLabel, value: opts.extraText, tone: "fg" },
        { label: nowLabel, value: opts.nowText, tone: "primary" },
        { label: resultLabel, value: opts.resultText, tone: "ok", wide: true }
      ],
      bars: [
        {
          label: opts.passBarLabel || passLabel,
          pct: passN,
          max: passMax,
          display: opts.passText,
          tone: "passive"
        },
        {
          label: opts.cmdBarLabel || "Заряд команды",
          pct: cmdFill,
          max: 100,
          display: dash(cmdOn, opts.cmdBarDisplay || opts.cmdText),
          tone: "pin"
        }
      ],
      cd: opts.cd || 0
    };
  }

  // --- Stasis (combined_pct, special dodge) ---

  function calcStasis(mod, level, dodge, equipped, cmdOn) {
    var pEff = mod.passive || {};
    var cEff = (mod.command && mod.command.effect) || {};
    var slash = (mod.command && mod.command.slash) || "pin";
    var cd = cooldownSec(mod.command, level);
    if (!equipped) {
      return {
        hero: {
          value: pct(Math.max(0, 100 - dodge), 0),
          label: "Ваш шанс попадания (оценка)",
          sub: "",
          ringPct: Math.max(0, 100 - dodge)
        },
        rows: [
          { label: "−уклонение врага (всегда)", value: "—", tone: "muted" },
          { label: "/" + slash, value: "—", tone: "muted" },
          { label: "Раундов /" + slash, value: "—", tone: "muted" },
          { label: "Суммарный штраф уклонению", value: "—", tone: "muted" },
          {
            label: "Уклонение врага после якоря",
            value: pct(dodge, 0),
            tone: "ok",
            wide: true
          }
        ],
        bars: [],
        cd: 0
      };
    }

    var passive = Number(pEff.enemy_evasion_penalty_per_level || 0.01) * level * 100;
    var pin = cmdOn
      ? Math.min(95, Number(cEff.enemy_evasion_penalty_per_level || 0.05) * level * 100)
      : 0;
    var total = passive + pin;
    var eff = Math.max(0, dodge - total);
    var hit = 100 - eff;
    var rounds = cmdOn ? chargeDurationRounds(cEff, level) : 0;

    return packCombinedPct({
      cmdOn: cmdOn,
      passN: passive,
      cmdN: Math.min(95, Number(cEff.enemy_evasion_penalty_per_level || 0.05) * level * 100),
      ringPct: hit,
      heroValue: pct(hit, 0),
      heroLabel: "Ваш шанс попадания (оценка)",
      passLabel: "−уклонение врага (всегда)",
      passBarLabel: "Пассив",
      passText: "−" + pct(passive, 0),
      cmdLabel: "/" + slash,
      cmdText: "−" + pct(pin, 0),
      extraLabel: "Раундов /" + slash,
      extraText: String(rounds),
      totalLabel: "Суммарный штраф уклонению",
      totalText: "−" + pct(total, 0),
      resultLabel: "Уклонение врага после якоря",
      resultText: pct(eff, 0),
      passBar: "−" + pct(passive, 0),
      cmdBar: "−" + pct(pin, 0),
      cd: cd
    });
  }

  // --- split_metrics ---

  function calcVitalWeave(mod, L, equipped, cmdOn) {
    var p = mod.passive || {};
    var c = (mod.command && mod.command.effect) || {};
    var slash = (mod.command && mod.command.slash) || "stabilize";
    var cd = cooldownSec(mod.command, L);
    if (!equipped) return unequippedView(slash);

    var heal = (c.heal_pct_base + c.heal_pct_per_level * (L - 1)) * 100;
    var hp = p.max_health_per_level != null ? p.max_health_per_level * L : 0;
    var regen = p.health_regen_flat != null ? p.health_regen_flat : 0;
    var hpMaxL9 = (p.max_health_per_level || 10) * 9;

    if (cmdOn) {
      return packSplit({
        cmdOn: true,
        ringPct: heal,
        heroValue: pct(heal, 0),
        heroLabel: "Лечение /" + slash,
        passLabel: "Запас здоровья",
        passBarLabel: "HP",
        passText: "+" + fmtNum(hp, 0) + " HP",
        cmdLabel: "/" + slash,
        cmdText: pct(heal, 0) + " HP",
        extraLabel: "Реген HP за ход (всегда)",
        extraText: regen ? "+" + fmtNum(regen, 0) : "—",
        totalLabel: "Режим",
        totalText: "лечение " + pct(heal, 0),
        resultLabel: "Что даёт модуль",
        resultText:
          "/" + slash + " лечит " + pct(heal, 0) + "; всегда +" + fmtNum(hp, 0) + " HP" +
          (regen ? " и +" + fmtNum(regen, 0) + "/ход" : ""),
        passBarPct: hp,
        passBarMax: hpMaxL9,
        passBarDisplay: "+" + fmtNum(hp, 0) + " HP",
        cmdBarPct: heal,
        cmdBarMax: 100,
        cmdBarDisplay: pct(heal, 0),
        cd: cd
      });
    }

    return packSplit({
      cmdOn: false,
      ringPct: clampPct((hp / hpMaxL9) * 100),
      heroValue: "+" + fmtNum(hp, 0),
      heroLabel: "Запас здоровья",
      passLabel: "Запас здоровья",
      passBarLabel: "HP",
      passText: "+" + fmtNum(hp, 0) + " HP",
      cmdLabel: "/" + slash,
      cmdText: pct(heal, 0) + " HP",
      extraLabel: "Реген HP за ход (всегда)",
      extraText: regen ? "+" + fmtNum(regen, 0) : "—",
      totalLabel: "Режим",
      totalText: "только пассив HP",
      resultLabel: "Что даёт модуль",
      resultText:
        "Всегда +" + fmtNum(hp, 0) + " HP" + (regen ? " и +" + fmtNum(regen, 0) + "/ход" : "") +
        "; /" + slash + " лечит " + pct(heal, 0),
      passBarPct: hp,
      passBarMax: hpMaxL9,
      passBarDisplay: "+" + fmtNum(hp, 0),
      cmdBarPct: 0,
      cmdBarMax: 100,
      cd: cd
    });
  }

  function calcAegisMesh(mod, L, equipped, cmdOn) {
    var p = mod.passive || {};
    var c = (mod.command && mod.command.effect) || {};
    var slash = (mod.command && mod.command.slash) || "aegis";
    var cd = cooldownSec(mod.command, L);
    if (!equipped) return unequippedView(slash);

    var armor = (p.armor_bonus_per_level || 0) * L;
    var armorMaxL9 = (p.armor_bonus_per_level || 0) * 9 || 1;
    var sr = (c.shield_regen_mult_base + c.shield_regen_mult_per_level * (L - 1)) * 100;
    var mr = (c.mythic_regen_mult_base + c.mythic_regen_mult_per_level * (L - 1)) * 100;
    var rounds = chargeDurationRounds(c, L);

    if (cmdOn) {
      return packSplit({
        cmdOn: true,
        ringPct: sr,
        heroValue: "+" + pct(sr, 0),
        heroLabel: "Реген щита /" + slash,
        passLabel: "Броня (всегда)",
        passBarLabel: "Броня",
        passText: "+" + fmtNum(armor, 1),
        cmdLabel: "/" + slash,
        cmdText: "+" + pct(sr, 0) + " реген",
        extraLabel: "Раундов /" + slash,
        extraText: String(rounds),
        totalLabel: "Миф. щит при /" + slash,
        totalText: "+" + pct(mr, 0),
        resultLabel: "Что даёт модуль",
        resultText:
          "Всегда +" +
          fmtNum(armor, 1) +
          " брони; в бою реген щита +" +
          pct(sr, 0) +
          " и миф. +" +
          pct(mr, 0) +
          " на " +
          rounds +
          " раундов",
        passBarPct: armor,
        passBarMax: armorMaxL9,
        passBarDisplay: "+" + fmtNum(armor, 1),
        cmdBarPct: sr,
        cmdBarMax: 100,
        cd: cd
      });
    }

    return packSplit({
      cmdOn: false,
      ringPct: clampPct((armor / armorMaxL9) * 100),
      heroValue: "+" + fmtNum(armor, 1),
      heroLabel: "Броня (всегда)",
      passLabel: "Броня (всегда)",
      passBarLabel: "Броня",
      passText: "+" + fmtNum(armor, 1),
      cmdLabel: "/" + slash,
      cmdText: "+" + pct(sr, 0) + " реген",
      extraLabel: "Раундов /" + slash,
      extraText: String(rounds),
      totalLabel: "Миф. щит при /" + slash,
      totalText: "+" + pct(mr, 0),
      resultLabel: "Что даёт модуль",
      resultText:
        "Всегда +" +
        fmtNum(armor, 1) +
        " брони; /" +
        slash +
        " даёт реген щита +" +
        pct(sr, 0) +
        " и миф. +" +
        pct(mr, 0),
      passBarPct: armor,
      passBarMax: armorMaxL9,
      cmdBarPct: 0,
      cmdBarMax: 100,
      cd: cd
    });
  }

  function calcLoadAnchor(mod, L, equipped, cmdOn) {
    var p = mod.passive || {};
    var c = (mod.command && mod.command.effect) || {};
    var slash = (mod.command && mod.command.slash) || "compress";
    var cd = cooldownSec(mod.command, L);
    if (!equipped) return unequippedView(slash);

    var slots = (p.inventory_slots_per_level || 0) * L;
    var slotsMaxL9 = (p.inventory_slots_per_level || 1) * 9;
    var wr = (c.weight_reduction_base + c.weight_reduction_per_level * (L - 1)) * 100;
    var dur = Number(c.duration_sec || 0);

    if (cmdOn) {
      return packSplit({
        cmdOn: true,
        ringPct: wr,
        heroValue: "−" + pct(wr, 0),
        heroLabel: "Вес груза /" + slash,
        passLabel: "Ячейки инвентаря",
        passBarLabel: "Ячейки",
        passText: slots ? "+" + fmtNum(slots, 0) : "—",
        cmdLabel: "/" + slash,
        cmdText: "−" + pct(wr, 0) + " веса",
        extraLabel: "Длительность /" + slash,
        extraText: fmtCd(dur),
        totalLabel: "Режим",
        totalText: "облегчение активно",
        resultLabel: "Что даёт модуль",
        resultText:
          "Всегда +" +
          fmtNum(slots, 0) +
          " ячеек; /" +
          slash +
          " −" +
          pct(wr, 0) +
          " веса на " +
          fmtCd(dur),
        passBarPct: slots,
        passBarMax: slotsMaxL9,
        cmdBarPct: wr,
        cmdBarMax: 100,
        cd: cd
      });
    }

    return packSplit({
      cmdOn: false,
      ringPct: clampPct((slots / slotsMaxL9) * 100),
      heroValue: "+" + fmtNum(slots, 0),
      heroLabel: "Ячейки инвентаря",
      passLabel: "Ячейки инвентаря",
      passBarLabel: "Ячейки",
      passText: "+" + fmtNum(slots, 0),
      cmdLabel: "/" + slash,
      cmdText: "−" + pct(wr, 0) + " веса",
      extraLabel: "Длительность /" + slash,
      extraText: fmtCd(dur),
      totalLabel: "Режим",
      totalText: "только ячейки",
      resultLabel: "Что даёт модуль",
      resultText:
        "Всегда +" + fmtNum(slots, 0) + " ячеек; /" + slash + " облегчает вес на " + fmtCd(dur),
      passBarPct: slots,
      passBarMax: slotsMaxL9,
      cmdBarPct: 0,
      cmdBarMax: 100,
      cd: cd
    });
  }

  function calcVectorThruster(mod, L, equipped, cmdOn) {
    var p = mod.passive || {};
    var c = (mod.command && mod.command.effect) || {};
    var slash = (mod.command && mod.command.slash) || "teleport";
    var cd = cooldownSec(mod.command, L);
    if (!equipped) return unequippedView(slash);

    var cap = Number(c.uses_cap || 9);
    var uses = Math.min(cap, L);
    var passV =
      p.vigor_step_reduction_per_level != null
        ? p.vigor_step_reduction_per_level * L * 100
        : p.initiative_bonus_per_level != null
          ? p.initiative_bonus_per_level * L * 100
          : 0;
    var passAxis =
      p.vigor_step_reduction_per_level != null
        ? "Тонус за шаг (всегда)"
        : "Инициатива (всегда)";
    var passUnit =
      p.vigor_step_reduction_per_level != null ? "тонуса за шаг" : "инициативы";
    var passValueTxt = passV ? "−" + pct(passV, 1) : "—";

    if (cmdOn) {
      return packSplit({
        cmdOn: true,
        ringPct: (uses / cap) * 100,
        heroValue: String(uses),
        heroLabel: "Прыжков /" + slash,
        passLabel: passAxis,
        passBarLabel: "Тонус",
        passText: passV ? passValueTxt : "—",
        cmdLabel: "/" + slash,
        cmdText: uses + " прыжков",
        extraLabel: "Макс. прыжков (L9)",
        extraText: String(cap),
        totalLabel: "Сессия телепорта",
        totalText: uses + " из " + cap,
        resultLabel: "Что даёт модуль",
        resultText:
          (passV ? "Всегда " + passValueTxt + " " + passUnit + "; " : "") +
          "/" +
          slash +
          " даёт " +
          uses +
          " прыжков за сессию",
        passBarPct: passV,
        passBarMax: 100,
        cmdBarPct: uses,
        cmdBarMax: cap,
        cd: cd
      });
    }

    return packSplit({
      cmdOn: false,
      ringPct: passV,
      heroValue: passValueTxt,
      heroLabel: passAxis,
      passLabel: passAxis,
      passBarLabel: "Тонус",
      passText: passV ? passValueTxt : "—",
      cmdLabel: "/" + slash,
      cmdText: uses + " прыжков",
      extraLabel: "Макс. прыжков (L9)",
      extraText: String(cap),
      totalLabel: "Сессия телепорта",
      totalText: "команда выкл.",
      resultLabel: "Что даёт модуль",
      resultText:
        (passV ? "Всегда " + passValueTxt + " " + passUnit : "—") +
        "; /" +
        slash +
        " до " +
        uses +
        " прыжков",
      passBarPct: passV,
      passBarMax: 100,
      cmdBarPct: 0,
      cmdBarMax: cap,
      cd: cd
    });
  }

  // --- economy ---

  function calcRelicHunter(mod, L, equipped, cmdOn) {
    var p = mod.passive || {};
    var c = (mod.command && mod.command.effect) || {};
    var slash = (mod.command && mod.command.slash) || "prospect";
    var cd = cooldownSec(mod.command, L);
    if (!equipped) return unequippedView(slash);

    var passFind =
      p.rare_find_bonus_per_level != null
        ? p.rare_find_bonus_per_level * L * 100
        : p.bonus_rarity_tier_per_level != null
          ? p.bonus_rarity_tier_per_level * L * 100
          : 0;
    var passMax = Math.max(15, (p.rare_find_bonus_per_level || 0.01) * 9 * 100, passFind, 1);
    var boost = fmtNum(c.rarity_tier_boost, 0);
    var ttl = fmtCd(Number(c.ttl_sec || 0));

    if (cmdOn) {
      return packEconomy({
        cmdOn: true,
        ringPct: 100,
        heroValue: "+" + boost + " к редкости",
        heroLabel: "Заряд /" + slash,
        passLabel: "Шанс редкой находки (всегда)",
        passBarLabel: "Поиск",
        passText: passFind ? "+" + pct(passFind, 1) : "—",
        cmdLabel: "/" + slash,
        cmdText: "+" + boost + " tier",
        extraLabel: "Время заряда /" + slash,
        extraText: ttl,
        nowLabel: "Режим",
        nowText: "пассив поиска + заряд редкости",
        resultLabel: "Что даёт модуль",
        resultText:
          "Всегда +" +
          pct(passFind, 1) +
          " к редким находкам; /" +
          slash +
          " +1 редкость следующей находки",
        passBarPct: passFind,
        passBarMax: passMax,
        cmdBarPct: 100,
        cmdBarDisplay: "+" + boost,
        cd: cd
      });
    }

    return packEconomy({
      cmdOn: false,
      ringPct: passFind,
      heroValue: passFind ? "+" + pct(passFind, 1) : "—",
      heroLabel: "Шанс редкой находки",
      passLabel: "Шанс редкой находки (всегда)",
      passBarLabel: "Поиск",
      passText: passFind ? "+" + pct(passFind, 1) : "—",
      cmdLabel: "/" + slash,
      cmdText: "+" + boost + " tier",
      extraLabel: "Время заряда /" + slash,
      extraText: ttl,
      nowLabel: "Режим",
      nowText: "только пассив поиска",
      resultLabel: "Что даёт модуль",
      resultText:
        "Всегда +" +
        pct(passFind, 1) +
        " к редким находкам; /" +
        slash +
        " поднимает редкость следующей находки",
      passBarPct: passFind,
      passBarMax: passMax,
      cmdBarPct: 0,
      cd: cd
    });
  }

  function calcSalvageLink(mod, L, equipped, cmdOn) {
    var p = mod.passive || {};
    var slash = (mod.command && mod.command.slash) || "instant_search";
    var cd = cooldownSec(mod.command, L);
    if (!equipped) return unequippedView(slash);

    var passOnly = p.base_chance_bonus_per_level != null ? p.base_chance_bonus_per_level * L * 100 : 0;
    var passMax = Math.max(10, (p.base_chance_bonus_per_level || 0.004) * 9 * 100);
    var cdMax = cooldownSec(mod.command, 1);

    if (cmdOn) {
      return packEconomy({
        cmdOn: true,
        ringPct: clampPct((1 - cd / Math.max(cdMax, cd)) * 100),
        heroValue: "Ускорен",
        heroLabel: "Поиск /" + slash,
        passLabel: "Шанс находки (всегда)",
        passBarLabel: "Шанс",
        passText: "+" + pct(passOnly, 1),
        cmdLabel: "/" + slash,
        cmdText: "ускорение поиска",
        extraLabel: "Перезарядка /" + slash,
        extraText: fmtCd(cd),
        nowLabel: "Режим",
        nowText: "текущий поиск ускорен",
        resultLabel: "Что даёт модуль",
        resultText:
          "Всегда +" +
          pct(passOnly, 1) +
          " к шансу находки; /" +
          slash +
          " ускоряет текущий поиск",
        passBarPct: passOnly,
        passBarMax: passMax,
        cmdBarPct: 75,
        cmdBarDisplay: "ускорение",
        cd: cd
      });
    }

    return packEconomy({
      cmdOn: false,
      ringPct: passOnly,
      heroValue: "+" + pct(passOnly, 1),
      heroLabel: "Шанс находки",
      passLabel: "Шанс находки (всегда)",
      passBarLabel: "Шанс",
      passText: "+" + pct(passOnly, 1),
      cmdLabel: "/" + slash,
      cmdText: "ускорение поиска",
      extraLabel: "Перезарядка /" + slash,
      extraText: fmtCd(cd),
      nowLabel: "Режим",
      nowText: "только пассив шанса",
      resultLabel: "Что даёт модуль",
      resultText:
        "Всегда +" +
        pct(passOnly, 1) +
        " к шансу находки; /" +
        slash +
        " ускоряет текущий поиск",
      passBarPct: passOnly,
      passBarMax: passMax,
      cmdBarPct: 0,
      cd: cd
    });
  }

  // --- combined_pct (by effect family) ---

  function calcCombinedPct(mod, L, equipped, cmdOn) {
    var p = mod.passive || {};
    var c = (mod.command && mod.command.effect) || {};
    var slash = (mod.command && mod.command.slash) || "";
    var cd = cooldownSec(mod.command, L);
    if (!equipped) return unequippedView(slash);

    if (c.purge_pct_base != null) {
      var purge = (c.purge_pct_base + c.purge_pct_per_level * (L - 1)) * 100;
      var resist = p.status_resist != null ? p.status_resist * 100 : 0;
      var livePurge = cmdOn ? purge : 0;
      var n2 = p.max_nitrogen_per_level != null ? p.max_nitrogen_per_level * L : 0;
      return packCombinedPct({
        cmdOn: cmdOn,
        passN: resist,
        cmdN: purge,
        ringPct: resist + livePurge > 100 ? 100 : resist + livePurge,
        heroValue: pct(cmdOn ? purge : resist, 0),
        heroLabel: cmdOn ? "Очистка /" + slash : "Сопротивление эффектам",
        passLabel: "Сопротивление эффектам (всегда)",
        passBarLabel: "Сопр.",
        passText: resist ? pct(resist, 0) : "—",
        cmdLabel: "/" + slash,
        cmdText: pct(purge, 0) + " очистка",
        extraLabel: "Запас азота (не в кольце)",
        extraText: n2 ? "+" + fmtNum(n2, 0) : "—",
        extraAlways: true,
        totalLabel: "Сопр. + очистка",
        totalText: pct(resist + livePurge, 0),
        resultLabel: "Что даёт модуль",
        resultText: cmdOn
          ? "Всегда " +
            pct(resist, 0) +
            " к эффектам" +
            (n2 ? ", +" + fmtNum(n2, 0) + " азота" : "") +
            "; /" +
            slash +
            " очищает " +
            pct(purge, 0)
          : "Всегда " +
            pct(resist, 0) +
            " к эффектам" +
            (n2 ? ", +" + fmtNum(n2, 0) + " азота" : "") +
            "; /" +
            slash +
            " — очистка",
        cd: cd
      });
    }

    if (c.damage_mult_base != null) {
      var passDmg = p.damage_pct_per_level != null ? p.damage_pct_per_level * L * 100 : 0;
      var cmdDmg = (c.damage_mult_base + c.damage_mult_per_level * (L - 1)) * 100;
      var liveDmg = cmdOn ? cmdDmg : 0;
      var totalDmg = passDmg + liveDmg;
      var dmgRounds = chargeDurationRounds(c, L);
      var execTxt =
        p.execute_bonus != null ? "; добивание +" + pct(p.execute_bonus * 100, 0) : "";
      return packCombinedPct({
        cmdOn: cmdOn,
        passN: passDmg,
        cmdN: cmdDmg,
        ringPct: totalDmg,
        heroValue: "+" + pct(totalDmg, 1),
        heroLabel: "Бонус к урону",
        passLabel: "Урон постоянно",
        passBarLabel: "Урон",
        passText: "+" + pct(passDmg, 1),
        cmdLabel: "/" + slash,
        cmdText: "+" + pct(cmdDmg, 0),
        extraLabel: "Раундов /" + slash,
        extraText: String(dmgRounds),
        totalLabel: "Урон сумма",
        totalText: "+" + pct(totalDmg, 1),
        resultLabel: "Что даёт модуль",
        resultText: cmdOn
          ? "Всегда +" +
            pct(passDmg, 1) +
            " урона; /" +
            slash +
            " +" +
            pct(cmdDmg, 0) +
            " на " +
            dmgRounds +
            " раундов" +
            execTxt
          : "Всегда +" + pct(passDmg, 1) + " урона" + execTxt + "; /" + slash + " — заряд урона",
        cd: cd
      });
    }

    if (c.crit_chance_base != null) {
      var passCrit =
        p.crit_bonus_per_level != null
          ? p.crit_bonus_per_level * L * 100
          : p.double_tap_per_level != null
            ? p.double_tap_per_level * L * 100
            : 0;
      var passCritName =
        p.crit_bonus_per_level != null ? "Шанс крита постоянно" : "Двойной удар постоянно";
      var cc = (c.crit_chance_base + c.crit_chance_per_level * (L - 1)) * 100;
      var cdmg = (c.crit_damage_base + c.crit_damage_per_level * (L - 1)) * 100;
      var liveCc = cmdOn ? cc : 0;
      var totalCrit = passCrit + liveCc;
      var critRounds = chargeDurationRounds(c, L);
      return packCombinedPct({
        cmdOn: cmdOn,
        passN: passCrit,
        cmdN: cc,
        ringPct: totalCrit,
        heroValue: "+" + pct(totalCrit, 1),
        heroLabel: "Шанс крита",
        passLabel: passCritName,
        passBarLabel: "Крит",
        passText: "+" + pct(passCrit, 1),
        cmdLabel: "/" + slash,
        cmdText: "+" + pct(cc, 0) + " шанс",
        extraLabel: "Раундов /" + slash,
        extraText: String(critRounds),
        totalLabel: "Шанс крита сумма",
        totalText: "+" + pct(totalCrit, 1),
        resultLabel: "Что даёт модуль",
        resultText: cmdOn
          ? "Всегда +" +
            pct(passCrit, 1) +
            "; /" +
            slash +
            " +" +
            pct(cc, 0) +
            " шанса и +" +
            pct(cdmg, 0) +
            " урона крита на " +
            critRounds +
            " раундов"
          : "Всегда +" +
            pct(passCrit, 1) +
            "; /" +
            slash +
            " даёт шанс и +" +
            pct(cdmg, 0) +
            " урона крита",
        cd: cd
      });
    }

    if (c.damage_reduction_base != null) {
      var controlPct = p.control_resist != null ? p.control_resist * 100 : 0;
      var dr = (c.damage_reduction_base + c.damage_reduction_per_level * (L - 1)) * 100;
      var hpBonus = p.max_health_per_level != null ? p.max_health_per_level * L : 0;
      var hpMaxL9 = (p.max_health_per_level || 8) * 9;
      var braceRounds = chargeDurationRounds(c, L);
      var ringPct = cmdOn
        ? dr
        : hpMaxL9 > 0
          ? clampPct((hpBonus / hpMaxL9) * 100)
          : 0;
      return packCombinedPct({
        cmdOn: cmdOn,
        passN: controlPct,
        cmdN: dr,
        ringPct: ringPct,
        heroValue: cmdOn
          ? "−" + pct(dr, 1)
          : hpBonus
            ? "+" + fmtNum(hpBonus, 0)
            : "—",
        heroLabel: cmdOn ? "Меньше входящего урона" : "Запас здоровья",
        passLabel: "К оглушению",
        passBarLabel: "Контроль",
        passText: controlPct ? pct(controlPct, 0) : "—",
        cmdLabel: "/" + slash,
        cmdText: "−" + pct(dr, 1) + " урона",
        extraLabel: "Раундов /" + slash,
        extraText: String(braceRounds),
        totalLabel: "Запас здоровья",
        totalText: hpBonus ? "+" + fmtNum(hpBonus, 0) + " HP" : "—",
        resultLabel: "Что даёт модуль",
        resultText: cmdOn
          ? "В бою: −" +
            pct(dr, 1) +
            " урона на " +
            braceRounds +
            " раундов; всегда +" +
            fmtNum(hpBonus, 0) +
            " HP и " +
            pct(controlPct, 0) +
            " к оглушению"
          : "Всегда +" +
            fmtNum(hpBonus, 0) +
            " HP и " +
            pct(controlPct, 0) +
            " к оглушению; /" +
            slash +
            " даёт −урона на время",
        cd: cd
      });
    }

    if (c.entangle_bonus_base != null) {
      var passEn = p.entangler_per_level != null ? p.entangler_per_level * L * 100 : 0;
      var eb = (c.entangle_bonus_base + c.entangle_bonus_per_level * (L - 1)) * 100;
      var rounds = chargeDurationRounds(c, L);
      var liveEb = cmdOn ? eb : 0;
      var totalEn = passEn + liveEb;
      return packCombinedPct({
        cmdOn: cmdOn,
        passN: passEn,
        cmdN: eb,
        ringPct: totalEn,
        heroValue: "+" + pct(totalEn, 1),
        heroLabel: "Запутывание врага",
        passLabel: "Запутывание постоянно",
        passBarLabel: "Запут.",
        passText: "+" + pct(passEn, 1),
        cmdLabel: "/" + slash,
        cmdText: "+" + pct(eb, 0),
        extraLabel: "Раундов /" + slash,
        extraText: String(rounds),
        totalLabel: "Запутывание сумма",
        totalText: "+" + pct(totalEn, 1),
        resultLabel: "Что даёт модуль",
        resultText: cmdOn
          ? "Всегда +" +
            pct(passEn, 1) +
            "; /" +
            slash +
            " +" +
            pct(eb, 0) +
            " на " +
            rounds +
            " раундов"
          : "Всегда +" + pct(passEn, 1) + " запутывания; /" + slash + " — заряд",
        cd: cd
      });
    }

    return packCombinedPct({
      cmdOn: false,
      passN: 0,
      cmdN: 0,
      ringPct: 0,
      heroValue: "—",
      heroLabel: "Модуль",
      passLabel: "Пассив модуля",
      passText: "—",
      cmdLabel: "/" + slash,
      cmdText: "—",
      extraLabel: "Доп. эффект",
      extraText: "—",
      totalLabel: "Ещё показатель",
      totalText: "—",
      resultLabel: "Что даёт модуль",
      resultText: "—",
      cd: cd
    });
  }

  // --- command_only ---

  function calcCommandOnlyModule(mod, L, equipped, cmdOn) {
    var c = (mod.command && mod.command.effect) || {};
    var slash = (mod.command && mod.command.slash) || "";
    var cd = cooldownSec(mod.command, L);
    if (!equipped) return unequippedView(slash);

    if (c.analysis_cap != null) {
      var alvl = Math.min(Number(c.analysis_cap || 9), L);
      var acap = Number(c.analysis_cap || 9);
      return packCommandOnly({
        cmdOn: cmdOn,
        ringPct: cmdOn ? (alvl / acap) * 100 : 0,
        heroValue: cmdOn ? String(alvl) : "—",
        heroLabel: "Уровень разбора /" + slash,
        cmdLabel: "/" + slash,
        cmdText: "уровень " + alvl,
        extraLabel: "Макс. уровень разбора",
        extraText: String(acap),
        nowLabel: "На этой встрече",
        nowText: cmdOn ? "разбор ур. " + alvl : "команда выкл.",
        resultLabel: "Что даёт команда",
        resultText: cmdOn
          ? "Показывает тактику цели до уровня " + alvl
          : "Включи /" + slash + " на карточке встречи",
        barPct: alvl,
        barMax: acap,
        cd: cd
      });
    }

    if (c.uses_per_two_levels != null) {
      var rUses =
        Number(c.uses_base || 1) + Math.floor(L / 2) * Number(c.uses_per_two_levels || 0);
      var maxUses =
        Number(c.uses_base || 1) + Math.floor(9 / 2) * Number(c.uses_per_two_levels || 0);
      return packCommandOnly({
        cmdOn: cmdOn,
        ringPct: cmdOn ? (rUses / Math.max(1, maxUses)) * 100 : 0,
        heroValue: cmdOn ? String(rUses) : "—",
        heroLabel: "Смен дистанции /" + slash,
        cmdLabel: "/" + slash,
        cmdText: rUses + " смен",
        extraLabel: "Макс. смен на L9",
        extraText: String(maxUses),
        nowLabel: "На этой встрече",
        nowText: cmdOn ? rUses + " смен дистанции" : "команда выкл.",
        resultLabel: "Что даёт команда",
        resultText: cmdOn
          ? "Можно сменить дистанцию " + rUses + " раз(а)"
          : "Включи /" + slash + " на карточке встречи",
        barPct: rUses,
        barMax: maxUses,
        cd: cd
      });
    }

    return packCommandOnly({
      cmdOn: cmdOn,
      ringPct: 0,
      heroValue: "—",
      heroLabel: "Команда",
      cmdLabel: "/" + slash,
      cmdText: "—",
      extraLabel: "Ещё",
      extraText: "—",
      nowText: "—",
      resultText: "—",
      cd: cd
    });
  }

  function calcSplitMetrics(mod, L, equipped, cmdOn) {
    var id = mod.id;
    if (id === "survival_vital_weave") return calcVitalWeave(mod, L, equipped, cmdOn);
    if (id === "defense_aegis_mesh") return calcAegisMesh(mod, L, equipped, cmdOn);
    if (id === "mobility_load_anchor") return calcLoadAnchor(mod, L, equipped, cmdOn);
    if (id === "mobility_vector_thruster") return calcVectorThruster(mod, L, equipped, cmdOn);
    return calcCombinedPct(mod, L, equipped, cmdOn);
  }

  function calcEconomy(mod, L, equipped, cmdOn) {
    if (mod.id === "economy_relic_hunter") return calcRelicHunter(mod, L, equipped, cmdOn);
    if (mod.id === "economy_salvage_link") return calcSalvageLink(mod, L, equipped, cmdOn);
    return calcCombinedPct(mod, L, equipped, cmdOn);
  }

  function calcModuleView(mod, level, dodge, equipped, cmdOn) {
    if (mod.sim_kind === "stasis_anchor") {
      return calcStasis(mod, level, dodge, equipped, cmdOn);
    }
    var display = mod.sim_display || "combined_pct";
    if (display === "split_metrics") return calcSplitMetrics(mod, level, equipped, cmdOn);
    if (display === "command_only") return calcCommandOnlyModule(mod, level, equipped, cmdOn);
    if (display === "economy") return calcEconomy(mod, level, equipped, cmdOn);
    return calcCombinedPct(mod, level, equipped, cmdOn);
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
        var fill = b.tone === "pin" ? "bg-primary" : "bg-muted-foreground/50";
        return (
          '<div class="flex items-center gap-3 py-1 font-mono text-xs">' +
          '<span class="w-14 shrink-0 text-muted-foreground">' +
          b.label +
          "</span>" +
          '<div class="h-2 flex-1 overflow-hidden rounded-full bg-input"><div class="h-full rounded-full ' +
          fill +
          ' transition-[width] duration-500 ease-out" style="width:' +
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
    var heroValue = root.querySelector("[data-hero-value]");
    var heroLabel = root.querySelector("[data-hero-label]");
    var heroSub = root.querySelector("[data-hero-sub]");
    var heroRing = root.querySelector("[data-hero-ring]");
    var statsGrid = root.querySelector("[data-stats-grid]");
    var barsHost = root.querySelector("[data-bars]");
    var cdLine = root.querySelector("[data-cd-line]");

    function showUiError(msg) {
      if (statsGrid) {
        renderStats(statsGrid, [
          { label: "Симулятор", value: msg, tone: "muted", wide: true }
        ]);
      }
      if (barsHost) {
        barsHost.innerHTML = "";
        barsHost.style.display = "none";
      }
    }

    if (!levelGroup || !equipBtn || !cmdBtn) {
      showUiError("Не найдены элементы управления");
      return;
    }

    var levelBtns = Array.prototype.slice.call(levelGroup.querySelectorAll("button"));
    var dodgeExtra = root.querySelector('[data-sim-extra="dodge"]');
    var dodgeGroup = dodgeExtra ? dodgeExtra.querySelector('[aria-label="Уклонение врага"]') : null;
    var dodgeBtns = dodgeGroup
      ? Array.prototype.slice.call(dodgeGroup.querySelectorAll("button"))
      : [];
    var range = dodgeExtra ? dodgeExtra.querySelector('input[type="range"]') : null;
    var dodgeValueEl = dodgeExtra ? dodgeExtra.querySelector("[data-dodge-value]") : null;

    var state = { level: 3, dodge: 20, equipped: true, cmdOn: false };
    var slash = (mod.command && mod.command.slash) || "";

    function setDisabledLook(disabled) {
      levelGroup.style.opacity = disabled ? "0.45" : "";
      levelGroup.style.pointerEvents = disabled ? "none" : "";
      cmdBtn.style.opacity = disabled ? "0.45" : "";
      cmdBtn.style.pointerEvents = disabled ? "none" : "";
    }

    function applyView(view) {
      var live = state.equipped && view.hero.value !== "—";
      applyRing(heroRing, heroValue, view.hero.ringPct, live, view.hero.value);
      if (heroLabel) heroLabel.textContent = view.hero.label;
      if (heroSub) heroSub.textContent = view.hero.sub || "";
      renderStats(statsGrid, view.rows);
      renderBars(barsHost, state.equipped ? view.bars : []);
      if (cdLine) {
        cdLine.textContent = state.equipped && view.cd ? "Перезарядка: " + fmtCd(view.cd) : "";
      }
    }

    function render() {
      try {
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
            ? "Модуль на броне"
            : "Модуль снят — как без него";
        }

        styleSwitch(cmdBtn, state.cmdOn && state.equipped);
        setCmdTitle(cmdBtn, slash, state.equipped && state.cmdOn);
        setDisabledLook(!state.equipped);

        if (range) range.value = String(state.dodge);
        if (dodgeValueEl) dodgeValueEl.textContent = pct(state.dodge, 0);

        applyView(
          calcModuleView(mod, state.level, state.dodge, state.equipped, state.cmdOn)
        );
      } catch (err) {
        console.error(err);
        showUiError("Ошибка расчёта");
      }
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

  function decodeModuleB64(b64) {
    var bin = atob(b64);
    if (typeof TextDecoder !== "undefined") {
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder("utf-8").decode(bytes);
    }
    return bin;
  }

  function parseModuleData(root) {
    var b64 = root.getAttribute("data-stw-module-b64");
    if (b64) {
      try {
        return JSON.parse(decodeModuleB64(b64));
      } catch (err) {
        console.warn("data-stw-module-b64 parse failed", err);
      }
    }
    var embedded = document.getElementById("stw-module-data");
    if (embedded && embedded.textContent) {
      try {
        return JSON.parse(embedded.textContent.trim());
      } catch (err) {
        console.warn("stw-module-data parse failed", err);
      }
    }
    return null;
  }

  function boot() {
    var title = document.getElementById("sim-title");
    if (!title) return;
    var root = title.closest("section");
    if (!root) return;
    var mid = root.getAttribute("data-module-id");
    if (!mid) return;

    function failLoad(err) {
      console.error(err);
      var hero = root.querySelector("[data-hero-value]");
      if (hero) hero.textContent = "!";
      var label = root.querySelector("[data-hero-label]");
      if (label) label.textContent = "Не загрузился баланс";
    }

    function showRuntimeError(err) {
      console.error(err);
      var grid = root.querySelector("[data-stats-grid]");
      if (grid) {
        renderStats(grid, [
          {
            label: "Симулятор",
            value: "Ошибка запуска",
            tone: "muted",
            wide: true
          }
        ]);
      }
      var hero = root.querySelector("[data-hero-value]");
      if (hero) hero.textContent = "!";
      var label = root.querySelector("[data-hero-label]");
      if (label) label.textContent = "Ошибка симулятора";
    }

    function start(mod) {
      if (!mod || mod.id !== mid) {
        throw new Error("module mismatch: " + mid);
      }
      bootModule(mod, root);
    }

    var mod = parseModuleData(root);
    if (mod) {
      try {
        start(mod);
      } catch (err) {
        showRuntimeError(err);
      }
      return;
    }

    var jsonUrl = new URL("../data/modules.json?v=5", window.location.href).href;
    fetch(jsonUrl)
      .then(function (r) {
        if (!r.ok) throw new Error("modules.json " + r.status);
        return r.json();
      })
      .then(function (data) {
        var list = (data && data.modules) || [];
        var found = null;
        for (var i = 0; i < list.length; i++) {
          if (list[i].id === mid) {
            found = list[i];
            break;
          }
        }
        if (!found) throw new Error("module not found: " + mid);
        try {
          start(found);
        } catch (err) {
          showRuntimeError(err);
        }
      })
      .catch(failLoad);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
