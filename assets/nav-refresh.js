(function () {
  "use strict";

  function replayRise() {
    var nodes = document.querySelectorAll(".vc-rise");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      el.style.animation = "none";
      // force reflow
      void el.offsetWidth;
      el.style.animation = "";
    }
  }

  // bfcache / back-forward: replay entrance so pages don't look "dead"
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) replayRise();
  });
})();
