(function () {
  "use strict";

  var PRESS_SEL = "a.group.relative.block, a.inline-flex, .vc-card, section[aria-labelledby='sim-title'] button";
  var killTimer = null;

  function replayRise() {
    var nodes = document.querySelectorAll(".vc-rise");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      el.style.animation = "none";
      void el.offsetWidth;
      el.style.animation = "";
    }
  }

  function clearPress() {
    var nodes = document.querySelectorAll(".vc-press");
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].classList.remove("vc-press");
    }
  }

  function clearFocus() {
    var ae = document.activeElement;
    if (!ae || ae === document.body || ae === document.documentElement) return;
    if (typeof ae.blur === "function") {
      try {
        ae.blur();
      } catch (err) {}
    }
  }

  // Force Safari/Chrome to drop sticky :hover after in-site navigations (bfcache).
  function killStickyHover() {
    clearPress();
    clearFocus();
    document.documentElement.classList.add("vc-kill-hover");
    void document.documentElement.offsetHeight;
    window.clearTimeout(killTimer);
    killTimer = window.setTimeout(function () {
      document.documentElement.classList.remove("vc-kill-hover");
    }, 40);
  }

  window.addEventListener("pageshow", function (e) {
    killStickyHover();
    if (e.persisted) replayRise();
  });

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") killStickyHover();
  });

  document.addEventListener(
    "touchstart",
    function (e) {
      clearPress();
      var t = e.target;
      if (!t || !t.closest) return;
      var pressable = t.closest(PRESS_SEL);
      if (pressable) pressable.classList.add("vc-press");
    },
    { passive: true }
  );

  function endTouch() {
    window.setTimeout(function () {
      clearPress();
      clearFocus();
      killStickyHover();
    }, 30);
  }

  document.addEventListener("touchend", endTouch, { passive: true });
  document.addEventListener("touchcancel", endTouch, { passive: true });

  // Mouse leave safety for hybrid devices
  document.addEventListener("mouseup", function () {
    clearPress();
  });
})();
