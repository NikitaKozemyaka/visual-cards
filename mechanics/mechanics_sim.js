(function () {
  "use strict";

  var SHARD_BASE_BY_RARITY = {
    common: 2,
    uncommon: 3,
    rare: 4,
    epic: 7,
    legendary: 10,
    mythic: 15,
  };

  var RARITY_RANK = {
    common: 0,
    uncommon: 1,
    rare: 2,
    epic: 3,
    legendary: 4,
    mythic: 5,
  };

  function moduleRarity(moduleId, catalog) {
    var items = (catalog && catalog.modules_by_id) || {};
    var meta = items[moduleId] || {};
    var r = String(meta.rarity || "common").toLowerCase();
    return RARITY_RANK.hasOwnProperty(r) ? r : "common";
  }

  function moduleName(moduleId, catalog) {
    var items = (catalog && catalog.modules_by_id) || {};
    var meta = items[moduleId] || {};
    return meta.name || moduleId;
  }

  function shardsForModule(moduleId, level, catalog) {
    var lvl = Math.max(1, parseInt(level, 10) || 1);
    var rarity = moduleRarity(moduleId, catalog);
    var base = SHARD_BASE_BY_RARITY[rarity] || 2;
    var levelBonus = Math.floor((lvl - 1) / 2);
    return Math.max(0, base + levelBonus);
  }

  function pickSaveIndex(slots, catalog) {
    if (!slots || !slots.length) return null;
    var best = null;
    var bestKey = null;
    for (var i = 0; i < slots.length; i++) {
      var slot = slots[i];
      if (!slot || !slot.id) continue;
      var rarity = moduleRarity(slot.id, catalog);
      var rank = RARITY_RANK[rarity] || 0;
      var lvl = Math.max(1, parseInt(slot.level, 10) || 1);
      var key = rank * 10000 + lvl * 100 + (100 - i);
      if (bestKey === null || key > bestKey) {
        bestKey = key;
        best = i;
      }
    }
    return best;
  }

  function simulateDeath(opts) {
    var armed = !!(opts && opts.armed);
    var slots = (opts && opts.slots) || [];
    var catalog = (opts && opts.catalog) || {};
    var report = {
      stabilizer_armed: armed,
      stabilizer_consumed: false,
      stabilizer_burned_empty: false,
      saved_module_id: null,
      saved_module_level: null,
      lost_modules: [],
      lost_module_levels: [],
      shards_gained: 0,
    };

    var active = [];
    for (var i = 0; i < slots.length; i++) {
      var s = slots[i];
      if (s && s.id) {
        active.push({ index: i, id: s.id, level: Math.max(1, parseInt(s.level, 10) || 1) });
      }
    }

    if (!active.length) {
      if (armed) {
        report.stabilizer_consumed = true;
        report.stabilizer_burned_empty = true;
      }
      return report;
    }

    var keepIndex = null;
    if (armed) {
      keepIndex = pickSaveIndex(
        active.map(function (a) {
          return { id: a.id, level: a.level };
        }),
        catalog
      );
      if (keepIndex !== null) {
        var kept = active[keepIndex];
        report.saved_module_id = kept.id;
        report.saved_module_level = kept.level;
      }
      report.stabilizer_consumed = true;
    }

    for (var j = 0; j < active.length; j++) {
      if (armed && j === keepIndex) continue;
      report.lost_modules.push(active[j].id);
      report.lost_module_levels.push(active[j].level);
      report.shards_gained += shardsForModule(active[j].id, active[j].level, catalog);
    }

    return report;
  }

  function formatResultLines(report, catalog) {
    if (!report) return [];
    var lines = [];
    var items = (catalog && catalog.items) || {};
    var shardName =
      (items.module_shards && items.module_shards.name) || "Осколки модулей";

    if (report.saved_module_id) {
      var sname = moduleName(report.saved_module_id, catalog);
      var slvl = report.saved_module_level;
      var lvlS = slvl ? " (ур. " + slvl + ")" : "";
      lines.push({
        kind: "save",
        text: "Стабилизатор сработал: сохранён " + sname + lvlS + ".",
      });
    } else if (report.stabilizer_burned_empty) {
      lines.push({
        kind: "burn",
        text: "Стабилизатор сгорел без модулей на броне.",
      });
    }

    var lost = report.lost_modules || [];
    if (lost.length) {
      var names = lost.map(function (mid) {
        return moduleName(mid, catalog);
      });
      lines.push({
        kind: "lost",
        text: "Уничтожено модулей: " + lost.length + " — " + names.join(", "),
      });
      lines.push({
        kind: "info",
        text: "Уровень уничтоженных модулей сброшен.",
      });
    }

    var shards = parseInt(report.shards_gained, 10) || 0;
    if (shards > 0) {
      lines.push({
        kind: "shards",
        text: "Получено: " + shardName + " ×" + shards,
      });
    } else if (!report.stabilizer_burned_empty && !lost.length && !report.saved_module_id) {
      lines.push({ kind: "info", text: "Осколков не получено." });
    }

    return lines;
  }

  function decodeMechanicsB64(b64) {
    var bin = atob(b64);
    if (typeof TextDecoder !== "undefined") {
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder("utf-8").decode(bytes);
    }
    return bin;
  }

  function parseMechanicsData(root) {
    var b64 = root.getAttribute("data-stw-mechanics-b64");
    if (b64) {
      try {
        return JSON.parse(decodeMechanicsB64(b64));
      } catch (e1) {
        /* fall through */
      }
    }
    var node = document.getElementById("stw-mechanics-data");
    if (node && node.textContent) {
      try {
        return JSON.parse(node.textContent);
      } catch (e2) {
        /* fall through */
      }
    }
    return null;
  }

  function stylePill(btn, on) {
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.className =
      "rounded-lg border py-2 px-3 font-mono text-sm font-semibold tabular-nums transition-colors " +
      (on
        ? "border-primary bg-primary/15 text-primary"
        : "border-border bg-secondary text-foreground");
  }

  function styleSwitch(btn, on) {
    btn.setAttribute("aria-checked", on ? "true" : "false");
    btn.className =
      "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors " +
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

  var RARITY_SLOT_CLASSES = [
    "vc-rarity-common",
    "vc-rarity-uncommon",
    "vc-rarity-rare",
    "vc-rarity-epic",
    "vc-rarity-legendary",
    "vc-rarity-mythic",
  ];

  function normalizeRarity(rarity) {
    var r = String(rarity || "common").toLowerCase();
    return RARITY_SLOT_CLASSES.indexOf("vc-rarity-" + r) >= 0 ? r : "common";
  }

  function cleanModuleName(name) {
    return String(name || "")
      .replace(/^[\s\uFE0F\u200B]+/, "")
      .trim();
  }

  function moduleLabel(mod) {
    if (!mod) return "";
    var emoji = mod.emoji ? mod.emoji + " " : "";
    return emoji + cleanModuleName(mod.name || mod.id);
  }

  function applySlotRarity(row, moduleId, modulesById) {
    if (!row) return;
    var meta = (modulesById && modulesById[moduleId]) || null;
    var rarity = normalizeRarity(meta && meta.rarity);
    row.className =
      "vc-mechanics-slot vc-rarity-" +
      rarity +
      " rounded-xl border p-4 transition-colors";
  }

  function fillModuleSelect(select, selectedId, modulesList) {
    select.innerHTML = "";
    for (var i = 0; i < modulesList.length; i++) {
      var m = modulesList[i];
      var opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = moduleLabel(m);
      if (m.id === selectedId) opt.selected = true;
      select.appendChild(opt);
    }
  }

  function bootStabilizer(root, data) {
    var catalog = data || {};
    var modulesList = catalog.demo_modules || [];
    var modulesById = catalog.modules_by_id || {};
    var defaultSlots = catalog.default_slots || [];

    var armedBtn = document.getElementById("sim-armed");
    var dieBtn = document.getElementById("sim-die");
    var resultHost = document.getElementById("sim-result");
    var placeholder = document.getElementById("sim-placeholder");
    var slotCountSelect = document.getElementById("slot-count");

    if (!dieBtn || !resultHost) return;

    var armed = true;
    var slotCount = 3;
    var slots = [];

    function renderSlots() {
      var host = document.getElementById("slot-rows");
      if (!host) return;
      host.innerHTML = "";
      for (var i = 0; i < slotCount; i++) {
        if (!slots[i]) {
          slots[i] = defaultSlots[i] || { id: modulesList[0].id, level: 1 };
        }
        var row = document.createElement("div");
        applySlotRarity(row, slots[i].id, modulesById);
        row.innerHTML =
          '<div class="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Слот ' +
          (i + 1) +
          '</div><select class="sim-module-select mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" data-slot="' +
          i +
          '"></select><div class="flex flex-wrap gap-2 sim-level-pills" data-slot="' +
          i +
          '" role="group" aria-label="Уровень модуля"></div>';
        host.appendChild(row);
        var sel = row.querySelector("select");
        fillModuleSelect(sel, slots[i].id, modulesList);
        sel.addEventListener("change", function () {
          var idx = parseInt(this.getAttribute("data-slot"), 10);
          slots[idx].id = this.value;
          applySlotRarity(this.closest(".vc-mechanics-slot"), this.value, modulesById);
        });
        var pillsHost = row.querySelector(".sim-level-pills");
        for (var lv = 1; lv <= 9; lv++) {
          (function (slotIdx, level) {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.textContent = "L" + level;
            btn.className = "pill-lv";
            stylePill(btn, slots[slotIdx].level === level);
            btn.addEventListener("click", function () {
              slots[slotIdx].level = level;
              renderSlots();
            });
            pillsHost.appendChild(btn);
          })(i, lv);
        }
      }
    }

    if (armedBtn) {
      styleSwitch(armedBtn, armed);
      armedBtn.addEventListener("click", function () {
        armed = !armed;
        styleSwitch(armedBtn, armed);
      });
    }

    if (slotCountSelect) {
      slotCountSelect.value = String(slotCount);
      slotCountSelect.addEventListener("change", function () {
        slotCount = parseInt(this.value, 10) || 1;
        slots = slots.slice(0, slotCount);
        renderSlots();
      });
    }

    var presetEmpty = document.getElementById("preset-empty");
    if (presetEmpty) {
      presetEmpty.addEventListener("click", function () {
        slotCount = 0;
        slots = [];
        if (slotCountSelect) slotCountSelect.value = "1";
        var host = document.getElementById("slot-rows");
        if (host) host.innerHTML = "";
      });
    }

    function hideResult() {
      resultHost.innerHTML = "";
      resultHost.classList.add("hidden");
      if (placeholder) placeholder.classList.remove("hidden");
    }

    function showResult(report) {
      if (placeholder) placeholder.classList.add("hidden");
      resultHost.classList.remove("hidden");
      resultHost.innerHTML = "";

      var card = document.createElement("section");
      card.className = "vc-rise vc-card rounded-2xl border border-border bg-card p-6";
      card.setAttribute("aria-live", "polite");

      var title = document.createElement("h2");
      title.className =
        "mb-4 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground";
      title.textContent = "Итог смерти";
      card.appendChild(title);

      var lines = formatResultLines(report, catalog);
      var ul = document.createElement("ul");
      ul.className = "flex flex-col gap-3 text-sm leading-relaxed";
      for (var i = 0; i < lines.length; i++) {
        var li = document.createElement("li");
        li.className = "text-foreground";
        if (lines[i].kind === "save") li.className += " text-primary font-medium";
        if (lines[i].kind === "shards") li.className += " text-ok font-medium";
        if (lines[i].kind === "lost") li.className += " text-destructive";
        li.textContent = lines[i].text;
        ul.appendChild(li);
      }
      card.appendChild(ul);

      var craft = catalog.craft_shards_cost || 100;
      var foot = document.createElement("p");
      foot.className = "mt-4 text-xs leading-relaxed text-muted-foreground";
      var q = catalog.quantum_shop || {};
      foot.textContent =
        craft +
        " осколков → 1 стабилизатор (крафт). Квант-шоп: " +
        (q.price || 70) +
        " кредитов / неделя с " +
        (q.min_level || 8) +
        " ур.";
      card.appendChild(foot);

      resultHost.appendChild(card);
    }

    dieBtn.addEventListener("click", function () {
      var activeSlots = [];
      for (var i = 0; i < slotCount; i++) {
        if (slots[i] && slots[i].id) activeSlots.push({ id: slots[i].id, level: slots[i].level });
      }
      var report = simulateDeath({ armed: armed, slots: activeSlots, catalog: catalog });
      showResult(report);
    });

    renderSlots();
    hideResult();
  }

  function computePartyScaleMults(levelSum, nPlayers, partyScale) {
    var n = Math.max(0, parseInt(nPlayers, 10) || 0);
    if (n <= 1) return { hpMult: 1.0, dmgMult: 1.0 };
    var total = Math.max(0, parseInt(levelSum, 10) || 0);
    var cfg = partyScale || {};
    var hpPct = parseFloat(cfg.hp_pct_per_level_sum);
    if (isNaN(hpPct)) hpPct = 1.0;
    var dmgPct = parseFloat(cfg.damage_pct_per_level_sum);
    if (isNaN(dmgPct)) dmgPct = 0.1;
    var hpMult = 1.0 + (total * hpPct) / 100.0;
    var dmgMult = 1.0 + (total * dmgPct) / 100.0;
    return {
      hpMult: Math.max(1.0, hpMult),
      dmgMult: Math.max(1.0, dmgMult),
    };
  }

  function bootGroupSearch(root, data) {
    var catalog = data || {};
    var limits = catalog.limits || {};
    var minPlayers = Math.max(1, parseInt(limits.min_players, 10) || 1);
    var maxPlayers = Math.max(minPlayers, parseInt(limits.max_players, 10) || 5);
    var minLevel = Math.max(1, parseInt(limits.min_level, 10) || 1);
    var maxLevel = Math.max(minLevel, parseInt(limits.max_level, 10) || 60);
    var partyScale = catalog.party_scale || {};
    var demoEnemy = catalog.demo_enemy || { name: "Демо-противник", base_hp: 1000, base_damage: 100 };
    var presets = catalog.presets || [];
    var labels = ["A", "B", "C", "D", "E"];

    var levels = (catalog.default_levels || [40, 30]).slice();
    levels = levels.map(function (lv) {
      var n = parseInt(lv, 10) || minLevel;
      return Math.max(minLevel, Math.min(maxLevel, n));
    });
    if (levels.length < minPlayers) {
      while (levels.length < Math.max(2, minPlayers)) levels.push(10);
    }

    var slotsHost = document.getElementById("party-slots");
    var resultHost = document.getElementById("sim-result");
    var addBtn = document.getElementById("party-add");
    var removeBtn = document.getElementById("party-remove");
    var presetsHost = document.getElementById("party-presets");
    if (!slotsHost || !resultHost) return;

    function clampLevel(v) {
      var n = parseInt(v, 10);
      if (isNaN(n)) n = minLevel;
      return Math.max(minLevel, Math.min(maxLevel, n));
    }

    function renderResult() {
      var n = levels.length;
      var sum = 0;
      for (var i = 0; i < n; i++) sum += levels[i];
      var mults = computePartyScaleMults(sum, n, partyScale);
      var hpPct = ((mults.hpMult - 1) * 100).toFixed(0);
      var dmgPct = ((mults.dmgMult - 1) * 100).toFixed(1);
      if (dmgPct.indexOf(".0") === dmgPct.length - 2) dmgPct = dmgPct.slice(0, -2);

      var baseHp = parseFloat(demoEnemy.base_hp) || 1000;
      var baseDmg = parseFloat(demoEnemy.base_damage) || 100;
      var scaledHp = Math.round(baseHp * mults.hpMult);
      var scaledDmg = Math.round(baseDmg * mults.dmgMult * 10) / 10;

      var note =
        n <= 1
          ? "Один участник — без буста (как в игре для n≤1)."
          : "В бою group search PvE; боссы и рейды этим скейлом не усиливаются.";

      resultHost.innerHTML =
        '<section class="vc-rise vc-card rounded-2xl border border-border bg-card p-5">' +
        '<h3 class="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Итог скейла</h3>' +
        '<ul class="flex flex-col gap-2 text-sm leading-relaxed text-foreground">' +
        "<li>Участников: <strong>" +
        n +
        "</strong> · сумма уровней: <strong>" +
        sum +
        "</strong></li>" +
        "<li>HP мобов: <strong class=\"text-primary\">×" +
        mults.hpMult.toFixed(2) +
        "</strong> (+" +
        hpPct +
        "%)</li>" +
        "<li>Урон мобов: <strong class=\"text-primary\">×" +
        mults.dmgMult.toFixed(2) +
        "</strong> (+" +
        dmgPct +
        "%)</li>" +
        "</ul>" +
        '<div class="mt-4 rounded-xl border border-border bg-secondary/40 p-4 text-sm">' +
        '<div class="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-2">Демо-моб</div>' +
        "<div>" +
        (demoEnemy.name || "Противник") +
        ": HP <span class=\"tabular-nums\">" +
        baseHp +
        " → <strong>" +
        scaledHp +
        "</strong></span> · урон <span class=\"tabular-nums\">" +
        baseDmg +
        " → <strong>" +
        scaledDmg +
        "</strong></span></div>" +
        "</div>" +
        '<p class="mt-3 text-xs leading-relaxed text-muted-foreground">' +
        note +
        "</p>" +
        "</section>";
    }

    function renderSlots() {
      slotsHost.innerHTML = "";
      for (var i = 0; i < levels.length; i++) {
        (function (idx) {
          var row = document.createElement("div");
          row.className = "rounded-xl border border-border bg-secondary/30 p-4";
          var label = "Игрок " + (labels[idx] || String(idx + 1));
          row.innerHTML =
            '<div class="mb-2 flex items-center justify-between gap-2">' +
            '<span class="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">' +
            label +
            "</span>" +
            '<span class="font-mono text-sm tabular-nums text-foreground" data-level-readout>' +
            levels[idx] +
            " ур.</span></div>" +
            '<input type="range" min="' +
            minLevel +
            '" max="' +
            maxLevel +
            '" value="' +
            levels[idx] +
            '" class="w-full accent-primary" data-level-range aria-label="Уровень ' +
            label +
            '"/>' +
            '<div class="mt-2 flex items-center gap-2">' +
            '<input type="number" min="' +
            minLevel +
            '" max="' +
            maxLevel +
            '" value="' +
            levels[idx] +
            '" class="w-20 rounded-lg border border-border bg-background px-2 py-1 font-mono text-sm tabular-nums" data-level-num/>' +
            '<span class="text-xs text-muted-foreground">1–' +
            maxLevel +
            "</span></div>";
          slotsHost.appendChild(row);

          var range = row.querySelector("[data-level-range]");
          var num = row.querySelector("[data-level-num]");
          var readout = row.querySelector("[data-level-readout]");

          function setLevel(v) {
            levels[idx] = clampLevel(v);
            range.value = String(levels[idx]);
            num.value = String(levels[idx]);
            readout.textContent = levels[idx] + " ур.";
            renderResult();
          }

          range.addEventListener("input", function () {
            setLevel(this.value);
          });
          num.addEventListener("change", function () {
            setLevel(this.value);
          });
        })(i);
      }
      if (addBtn) addBtn.disabled = levels.length >= maxPlayers;
      if (removeBtn) removeBtn.disabled = levels.length <= minPlayers;
      renderResult();
    }

    if (presetsHost) {
      presetsHost.innerHTML = "";
      for (var p = 0; p < presets.length; p++) {
        (function (preset) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className =
            "rounded-lg border border-border bg-secondary px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground hover:border-primary/50 hover:text-primary";
          btn.textContent = preset.label || preset.id;
          btn.addEventListener("click", function () {
            levels = (preset.levels || []).map(clampLevel);
            if (levels.length < minPlayers) {
              while (levels.length < Math.max(2, minPlayers)) levels.push(minLevel);
            }
            if (levels.length > maxPlayers) levels = levels.slice(0, maxPlayers);
            renderSlots();
          });
          presetsHost.appendChild(btn);
        })(presets[p]);
      }
    }

    if (addBtn) {
      addBtn.addEventListener("click", function () {
        if (levels.length >= maxPlayers) return;
        levels.push(levels[levels.length - 1] || 10);
        renderSlots();
      });
    }
    if (removeBtn) {
      removeBtn.addEventListener("click", function () {
        if (levels.length <= minPlayers) return;
        levels.pop();
        renderSlots();
      });
    }

    renderSlots();
  }

  function boot() {
    var root = document.querySelector("[data-mechanics-id]");
    if (!root) return;
    var data = parseMechanicsData(root);
    if (!data) {
      var err = document.getElementById("sim-error");
      if (err) {
        err.textContent = "Не загрузились данные сценария.";
        err.classList.remove("hidden");
      }
      return;
    }
    var kind = root.getAttribute("data-mechanics-id");
    if (kind === "death_stabilizer") bootStabilizer(root, data);
    else if (kind === "group_search_party_scale") bootGroupSearch(root, data);
  }

  window.STWMechanicsSim = {
    shardsForModule: shardsForModule,
    pickSaveIndex: pickSaveIndex,
    simulateDeath: simulateDeath,
    formatResultLines: formatResultLines,
    computePartyScaleMults: computePartyScaleMults,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
