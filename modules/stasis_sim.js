(function () {
  "use strict";

  function pct(n) {
    var v = Math.round(n * 10) / 10;
    return (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)) + "%";
  }

  function calc(level, dodge, equipped, pinOn) {
    if (!equipped) {
      return {
        passive: 0,
        pin: 0,
        total: 0,
        eff: dodge,
        hit: Math.max(0, 100 - dodge),
        rounds: 0
      };
    }
    var passive = 0.01 * level * 100;
    var pin = pinOn ? Math.min(95, 0.05 * level * 100) : 0;
    var total = passive + pin;
    var eff = Math.max(0, dodge - total);
    var hit = 100 - eff;
    var rounds = pinOn ? Math.min(27, 3 * level) : 0;
    return { passive: passive, pin: pin, total: total, eff: eff, hit: hit, rounds: rounds };
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

  function findStatValue(root, labelText) {
    var cards = root.querySelectorAll(".rounded-xl.border");
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var label = card.querySelector(".uppercase");
      if (!label) continue;
      if ((label.textContent || "").trim() === labelText) {
        return card.querySelector(".text-2xl");
      }
    }
    return null;
  }

  function styleSwitch(btn, on, titleHtml) {
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
    if (titleHtml) {
      var title = btn.querySelector(".block.text-sm.font-semibold");
      if (title) title.innerHTML = titleHtml;
    }
  }

  function boot() {
    var title = document.getElementById("sim-title");
    if (!title) return;
    var root = title.closest("section");
    if (!root) return;

    var levelGroup = root.querySelector('[aria-label="Уровень модуля"]');
    var dodgeGroup = root.querySelector('[aria-label="Уклонение врага"]');
    var equipBtn = document.getElementById("sim-equip") || root.querySelectorAll('button[role="switch"]')[0];
    var pinBtn = document.getElementById("sim-pin") || root.querySelectorAll('button[role="switch"]')[1];
    var range = root.querySelector('input[type="range"]');
    if (!levelGroup || !dodgeGroup || !equipBtn || !pinBtn || !range) return;

    var levelBtns = Array.prototype.slice.call(levelGroup.querySelectorAll("button"));
    var dodgeBtns = Array.prototype.slice.call(dodgeGroup.querySelectorAll("button"));

    // Defaults: equipped ON, /pin OFF
    var state = { level: 3, dodge: 20, equipped: true, pinOn: false };

    var dodgeValueEl = null;
    var spans = root.querySelectorAll("span.tabular-nums");
    for (var s = 0; s < spans.length; s++) {
      var prev = spans[s].previousElementSibling;
      if (prev && (prev.textContent || "").indexOf("Уклонение") >= 0) {
        dodgeValueEl = spans[s];
        break;
      }
    }

    var hitEl = root.querySelector(".text-4xl.text-ok, .text-ok.text-4xl");
    if (!hitEl) hitEl = root.querySelector(".font-mono.text-4xl");
    var ring = root.querySelector("circle.text-ok");
    var circ = 2 * Math.PI * 52;

    var elPassive = findStatValue(root, "Пассив");
    var elPin = findStatValue(root, "/pin");
    var elRounds = findStatValue(root, "Раундов /pin");
    var elTotal = findStatValue(root, "Суммарный штраф");
    var elEff = findStatValue(root, "Dodge врага после якоря");

    var bars = root.querySelectorAll(".h-full.rounded-full");
    var barLabels = root.querySelectorAll(".w-12.shrink-0");

    function setDisabledLook(disabled) {
      levelGroup.style.opacity = disabled ? "0.45" : "";
      levelGroup.style.pointerEvents = disabled ? "none" : "";
      pinBtn.style.opacity = disabled ? "0.45" : "";
      pinBtn.style.pointerEvents = disabled ? "none" : "";
    }

    function render() {
      var p = calc(state.level, state.dodge, state.equipped, state.pinOn);

      levelBtns.forEach(function (btn) {
        var lvl = Number((btn.textContent || "").replace(/\D/g, ""));
        styleChoice(btn, lvl === state.level, false);
      });
      dodgeBtns.forEach(function (btn) {
        var d = Number((btn.textContent || "").replace("%", ""));
        styleChoice(btn, d === state.dodge, true);
      });

      styleSwitch(
        equipBtn,
        state.equipped,
        state.equipped ? "Экипировать" : "Экипировать"
      );
      var equipSub = equipBtn.querySelector(".block.text-xs");
      if (equipSub) {
        equipSub.textContent = state.equipped
          ? "Модуль установлен на броню"
          : "Без модуля — базовые параметры";
      }

      styleSwitch(
        pinBtn,
        state.pinOn && state.equipped,
        'Команда <code class="rounded bg-background/60 px-1 py-0.5 font-mono text-[13px] text-primary">/pin</code> ' +
          (state.equipped && state.pinOn ? "активна" : "выкл")
      );

      setDisabledLook(!state.equipped);

      range.value = String(state.dodge);
      if (dodgeValueEl) dodgeValueEl.textContent = pct(state.dodge);

      if (hitEl) hitEl.textContent = pct(p.hit);
      if (ring) {
        ring.setAttribute("stroke-dasharray", String(circ));
        ring.setAttribute("stroke-dashoffset", String(circ * (1 - p.hit / 100)));
      }

      if (elPassive) {
        elPassive.textContent = state.equipped ? "\u2212" + pct(p.passive) : "\u2014";
        elPassive.className =
          "mt-1 font-mono text-2xl font-bold tabular-nums " +
          (state.equipped ? "text-foreground" : "text-muted-foreground");
      }
      if (elPin) {
        elPin.textContent = state.equipped && state.pinOn ? "\u2212" + pct(p.pin) : "\u2014";
        elPin.className =
          "mt-1 font-mono text-2xl font-bold tabular-nums " +
          (state.equipped && state.pinOn ? "text-primary" : "text-muted-foreground");
      }
      if (elRounds) {
        elRounds.textContent = state.equipped && state.pinOn ? String(p.rounds) : "\u2014";
        elRounds.className =
          "mt-1 font-mono text-2xl font-bold tabular-nums " +
          (state.equipped && state.pinOn ? "text-foreground" : "text-muted-foreground");
      }
      if (elTotal) {
        elTotal.textContent = state.equipped ? "\u2212" + pct(p.total) : "\u2014";
        elTotal.className =
          "mt-1 font-mono text-2xl font-bold tabular-nums " +
          (state.equipped ? "text-primary" : "text-muted-foreground");
      }
      if (elEff) elEff.textContent = pct(p.eff);

      var scale = Math.max(50, p.passive + p.pin, 1);
      if (bars.length >= 2) {
        bars[0].style.width = (p.passive / scale) * 100 + "%";
        bars[1].style.width = (p.pin / scale) * 100 + "%";
        bars[1].className =
          "h-full rounded-full transition-[width] duration-500 ease-out " +
          (state.equipped && state.pinOn ? "bg-primary" : "bg-muted-foreground/30");
      }
      if (barLabels.length >= 2) {
        barLabels[0].textContent = state.equipped ? "\u2212" + pct(p.passive) : "\u2014";
        barLabels[1].textContent =
          state.equipped && state.pinOn ? "\u2212" + pct(p.pin) : "\u2014";
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
    equipBtn.addEventListener("click", function () {
      state.equipped = !state.equipped;
      if (!state.equipped) state.pinOn = false;
      render();
    });
    pinBtn.addEventListener("click", function () {
      if (!state.equipped) return;
      state.pinOn = !state.pinOn;
      render();
    });
    range.addEventListener("input", function () {
      state.dodge = Number(range.value) || 0;
      render();
    });

    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
