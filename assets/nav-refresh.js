(function () {
  "use strict";

  function replayRise() {
    var nodes = document.querySelectorAll(".vc-rise");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      el.style.animation = "none";
      void el.offsetWidth;
      el.style.animation = "";
    }
  }

  // bfcache / back-forward navigation
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) replayRise();
  });

  // Clear sticky :focus / :hover leftovers after a tap
  function clearStickyFocus() {
    var ae = document.activeElement;
    if (!ae || ae === document.body || ae === document.documentElement) return;
    if (typeof ae.blur === "function") {
      try {
        ae.blur();
      } catch (err) {}
    }
  }

  document.addEventListener(
    "touchend",
    function () {
      window.setTimeout(clearStickyFocus, 50);
    },
    { passive: true }
  );

  document.addEventListener(
    "touchcancel",
    function () {
      window.setTimeout(clearStickyFocus, 50);
    },
    { passive: true }
  );
})();
