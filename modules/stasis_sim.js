(function () {
  "use strict";

  function pct(n) {
    var v = Math.round(n * 10) / 10;
    return (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)) + "%";
  }

  function calc(level, dodge, pinOn) {
    var passive = 0.01 * level * 100;
    var pin = pinOn ? Math.min(95, 0.05 * level * 100) : 0;
    var total = passive + pin;
    var eff = Math.max(0, dodge - total);
    var hit = 100 - eff;
    var rounds = Math.min(27, 3 * level);
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
        : "border-border bg-secondary text-foreground hover:border-primary/40");
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

  function boot() {
    var title = document.getElementById("sim-title");
    if (!title) return;
    var root = title.closest("section");
    if (!root) return;

    var levelGroup = root.querySelector('[aria-label="Уровень модуля"]');
    var dodgeGroup = root.querySelector('[aria-label="Уклонение врага"]');
    var pinBtn = root.querySelector('button[role="switch"]');
    var range = root.querySelector('input[type="range"]');
    if (!levelGroup || !dodgeGroup || !pinBtn || !range) return;

    var levelBtns = Array.prototype.slice.call(levelGroup.querySelectorAll("button"));
    var dodgeBtns = Array.prototype.slice.call(dodgeGroup.querySelectorAll("button"));

    var state = { level: 3, dodge: 20, pinOn: true };

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

    function render() {
      var p = calc(state.level, state.dodge, state.pinOn);

      levelBtns.forEach(function (btn) {
        var lvl = Number((btn.textContent || "").replace(/\D/g, ""));
        styleChoice(btn, lvl === state.level, false);
      });
      dodgeBtns.forEach(function (btn) {
        var d = Number((btn.textContent || "").replace("%", ""));
        styleChoice(btn, d === state.dodge, true);
      });

      pinBtn.setAttribute("aria-checked", state.pinOn ? "true" : "false");
      pinBtn.className =
        "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors " +
        (state.pinOn ? "border-primary/50 bg-primary/10" : "border-border bg-secondary");
      var track = pinBtn.querySelector("span.relative");
      var knob = pinBtn.querySelector("span.absolute");
      if (track) {
        track.className =
          "relative h-6 w-11 shrink-0 rounded-full transition-colors " +
          (state.pinOn ? "bg-primary" : "bg-input");
      }
      if (knob) {
        knob.className =
          "absolute top-0.5 size-5 rounded-full bg-background transition-transform " +
          (state.pinOn ? "translate-x-[22px]" : "translate-x-0.5");
      }
      var pinTitle = pinBtn.querySelector(".block.text-sm.font-semibold");
      if (pinTitle) {
        pinTitle.innerHTML =
          'Команда <code class="rounded bg-background/60 px-1 py-0.5 font-mono text-[13px] text-primary">/pin</code> ' +
          (state.pinOn ? "активна" : "выкл");
      }

      range.value = String(state.dodge);
      if (dodgeValueEl) dodgeValueEl.textContent = pct(state.dodge);

      if (hitEl) hitEl.textContent = pct(p.hit);
      if (ring) {
        ring.setAttribute("stroke-dasharray", String(circ));
        ring.setAttribute("stroke-dashoffset", String(circ * (1 - p.hit / 100)));
      }

      if (elPassive) elPassive.textContent = "\u2212" + pct(p.passive);
      if (elPin) {
        elPin.textContent = state.pinOn ? "\u2212" + pct(p.pin) : "\u2014";
        elPin.className =
          "mt-1 font-mono text-2xl font-bold tabular-nums " +
          (state.pinOn ? "text-primary" : "text-muted-foreground");
      }
      if (elRounds) elRounds.textContent = String(p.rounds);
      if (elTotal) elTotal.textContent = "\u2212" + pct(p.total);
      if (elEff) elEff.textContent = pct(p.eff);

      var scale = Math.max(50, p.passive + p.pin, 1);
      if (bars.length >= 2) {
        bars[0].style.width = (p.passive / scale) * 100 + "%";
        bars[1].style.width = (p.pin / scale) * 100 + "%";
        bars[1].className =
          "h-full rounded-full transition-[width] duration-500 ease-out " +
          (state.pinOn ? "bg-primary" : "bg-muted-foreground/30");
      }
      if (barLabels.length >= 2) {
        barLabels[0].textContent = "\u2212" + pct(p.passive);
        barLabels[1].textContent = state.pinOn ? "\u2212" + pct(p.pin) : "\u2014";
      }
    }

    levelBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
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
    pinBtn.addEventListener("click", function () {
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
