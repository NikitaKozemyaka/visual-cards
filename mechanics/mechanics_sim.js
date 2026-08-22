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

  function bootStabilizer(root, data) {
    var catalog = data || {};
    var modulesList = catalog.demo_modules || [];
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

    function moduleOptions(selectedId) {
      var html = "";
      for (var i = 0; i < modulesList.length; i++) {
        var m = modulesList[i];
        var sel = m.id === selectedId ? " selected" : "";
        html +=
          '<option value="' +
          m.id +
          '"' +
          sel +
          ">" +
          (m.name || m.id) +
          "</option>";
      }
      return html;
    }

    function renderSlots() {
      var host = document.getElementById("slot-rows");
      if (!host) return;
      host.innerHTML = "";
      for (var i = 0; i < slotCount; i++) {
        if (!slots[i]) {
          slots[i] = defaultSlots[i] || { id: modulesList[0].id, level: 1 };
        }
        var row = document.createElement("div");
        row.className = "rounded-xl border border-border bg-secondary/40 p-4";
        row.innerHTML =
          '<div class="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Слот ' +
          (i + 1) +
          '</div><select class="sim-module-select mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" data-slot="' +
          i +
          '">' +
          moduleOptions(slots[i].id) +
          '</select><div class="flex flex-wrap gap-2 sim-level-pills" data-slot="' +
          i +
          '" role="group" aria-label="Уровень модуля"></div>';
        host.appendChild(row);
        var sel = row.querySelector("select");
        sel.addEventListener("change", function () {
          var idx = parseInt(this.getAttribute("data-slot"), 10);
          slots[idx].id = this.value;
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
  }

  window.STWMechanicsSim = {
    shardsForModule: shardsForModule,
    pickSaveIndex: pickSaveIndex,
    simulateDeath: simulateDeath,
    formatResultLines: formatResultLines,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
