from pathlib import Path

ROOT = Path(r"D:\visual-cards")
HTML = ROOT / "modules" / "stasis_anchor.html"
JS = ROOT / "modules" / "stasis_sim.js"

JS_CODE = r"""(function () {
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

  function setPressed(buttons, predicate) {
    buttons.forEach(function (btn) {
      var on = predicate(btn);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.className =
        "rounded-lg border py-2.5 font-mono text-sm font-semibold tabular-nums transition-colors " +
        (on
          ? "border-primary bg-primary/15 text-primary"
          : "border-border bg-secondary text-foreground hover:border-primary/40");
      if (btn.textContent.indexOf("%") >= 0) {
        btn.className =
          "rounded-lg border py-2 font-mono text-sm font-semibold tabular-nums transition-colors " +
          (on
            ? "border-primary bg-primary/15 text-primary"
            : "border-border bg-secondary text-foreground hover:border-primary/40");
      }
    });
  }

  function boot() {
    var section = document.getElementById("sim-title");
    if (!section) return;
    var root = section.closest("section");
    if (!root) return;

    var levelGroup = root.querySelector('[aria-label="Уровень модуля"]');
    var dodgeGroup = root.querySelector('[aria-label="Уклонение врага"]');
    var pinBtn = root.querySelector('button[role="switch"]');
    var range = root.querySelector('input[type="range"]');
    if (!levelGroup || !dodgeGroup || !pinBtn || !range) return;

    var levelBtns = Array.prototype.slice.call(levelGroup.querySelectorAll("button"));
    var dodgeBtns = Array.prototype.slice.call(dodgeGroup.querySelectorAll("button"));

    var state = { level: 3, dodge: 20, pinOn: true };

    var dodgeLabel = range.parentElement
      ? range.parentElement.querySelector(".tabular-nums")
      : null;
    // Prefer the header "Уклонение врага" value span.
    var dodgeHeader = root.querySelectorAll("span.font-mono.text-sm.font-semibold.tabular-nums");
    if (dodgeHeader && dodgeHeader.length) dodgeLabel = dodgeHeader[0];

    var hitEl = root.querySelector(".text-ok.font-mono.text-4xl");
    var ring = root.querySelector("circle.text-ok");
    var circ = 2 * Math.PI * 52;

    var statCards = root.querySelectorAll(".grid.grid-cols-2 > div");
    // Expected order: Пассив, /pin, Раундов /pin, Суммарный штраф, Dodge после
    function cardValue(card) {
      return card ? card.querySelector(".text-2xl") : null;
    }

    var bars = root.querySelectorAll(".h-full.rounded-full");
    var barLabels = root.querySelectorAll(".w-12.shrink-0");

    function render() {
      var p = calc(state.level, state.dodge, state.pinOn);

      setPressed(levelBtns, function (btn) {
        return Number((btn.textContent || "").replace(/\D/g, "")) === state.level;
      });
      setPressed(dodgeBtns, function (btn) {
        return Number((btn.textContent || "").replace("%", "")) === state.dodge;
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
      if (dodgeLabel) dodgeLabel.textContent = pct(state.dodge);

      if (hitEl) hitEl.textContent = pct(p.hit);
      if (ring) {
        ring.setAttribute("stroke-dasharray", String(circ));
        ring.setAttribute("stroke-dashoffset", String(circ * (1 - p.hit / 100)));
      }

      if (statCards.length >= 5) {
        var v0 = cardValue(statCards[0]);
        var v1 = cardValue(statCards[1]);
        var v2 = cardValue(statCards[2]);
        var v3 = cardValue(statCards[3]);
        var v4 = cardValue(statCards[4]);
        if (v0) v0.textContent = "−" + pct(p.passive).replace("%", "") + "%";
        if (v1) {
          v1.textContent = state.pinOn ? "−" + pct(p.pin).replace("%", "") + "%" : "—";
          v1.className =
            "mt-1 font-mono text-2xl font-bold tabular-nums " +
            (state.pinOn ? "text-primary" : "text-muted-foreground");
        }
        if (v2) v2.textContent = String(p.rounds);
        if (v3) {
          v3.textContent = "−" + pct(p.total).replace("%", "") + "%";
          v3.className = "mt-1 font-mono text-2xl font-bold tabular-nums text-primary";
        }
        if (v4) {
          v4.textContent = pct(p.eff);
          v4.className = "mt-1 font-mono text-2xl font-bold tabular-nums text-ok";
        }
      }

      var scale = Math.max(50, p.passive + p.pin, 1);
      if (bars.length >= 2) {
        bars[0].style.width = (p.passive / scale) * 100 + "%";
        bars[1].style.width = (p.pin / scale) * 100 + "%";
        bars[1].className =
          "h-full rounded-full transition-[width] duration-500 ease-out " +
          (state.pinOn ? "bg-primary" : "bg-muted-foreground/30");
      }
      if (barLabels.length >= 2) {
        barLabels[0].textContent = "−" + pct(p.passive).replace("%", "") + "%";
        barLabels[1].textContent = state.pinOn
          ? "−" + pct(p.pin).replace("%", "") + "%"
          : "—";
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
"""

JS.write_text(JS_CODE, encoding="utf-8")

html = HTML.read_text(encoding="utf-8")
tag = '<script src="./stasis_sim.js" defer></script>'
if "stasis_sim.js" not in html:
    if "</body>" in html:
        html = html.replace("</body>", tag + "</body>", 1)
    else:
        html += tag
    HTML.write_text(html, encoding="utf-8")
    print("injected")
else:
    print("already injected")
print("js bytes", JS.stat().st_size)
