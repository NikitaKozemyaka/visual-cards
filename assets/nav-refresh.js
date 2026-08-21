(function () {
  "use strict";

  var PRESS_SEL =
    "a.group.relative.block, a.vc-mod-card, a.inline-flex, .vc-card, section[aria-labelledby='sim-title'] button";
  var MIN_PRESS_MS = 170;
  var killTimer = null;
  var pressClearTimer = null;
  var pressStartedAt = 0;

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
    window.clearTimeout(pressClearTimer);
    clearPress();
    clearFocus();
    document.documentElement.classList.add("vc-kill-hover");
    void document.documentElement.offsetHeight;
    window.clearTimeout(killTimer);
    killTimer = window.setTimeout(function () {
      document.documentElement.classList.remove("vc-kill-hover");
    }, 40);
  }

  function schedulePressClear() {
    window.clearTimeout(pressClearTimer);
    var elapsed = Date.now() - pressStartedAt;
    var wait = Math.max(MIN_PRESS_MS - elapsed, 40);
    pressClearTimer = window.setTimeout(function () {
      clearPress();
      clearFocus();
    }, wait);
  }

  function startPress(target) {
    if (!target || !target.closest) return;
    var pressable = target.closest(PRESS_SEL);
    if (!pressable) return;
    window.clearTimeout(pressClearTimer);
    clearPress();
    pressable.classList.add("vc-press");
    // Force a paint so a quick tap still flashes before navigation.
    void pressable.offsetWidth;
    pressStartedAt = Date.now();
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
      startPress(e.target);
    },
    { passive: true }
  );

  document.addEventListener(
    "pointerdown",
    function (e) {
      if (e.pointerType === "mouse") return;
      startPress(e.target);
    },
    { passive: true }
  );

  document.addEventListener("touchend", schedulePressClear, { passive: true });
  document.addEventListener("touchcancel", schedulePressClear, { passive: true });

  document.addEventListener(
    "pointerup",
    function (e) {
      if (e.pointerType === "mouse") return;
      schedulePressClear();
    },
    { passive: true }
  );

  document.addEventListener("mouseup", function () {
    window.clearTimeout(pressClearTimer);
    clearPress();
  });
})();
