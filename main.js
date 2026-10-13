// Live clock (mono, brutalist sites love a clock)
(function () {
  var els = document.querySelectorAll("#clock");
  if (!els.length) return;

  function tick() {
    var t = new Date().toLocaleTimeString("en-GB", { hour12: false });
    els.forEach(function (el) { el.textContent = t; });
  }

  tick();
  setInterval(tick, 1000);
})();

// Landing: quick fade before navigating to the main page
(function () {
  var link = document.querySelector("[data-enter]");
  if (!link) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  link.addEventListener("click", function (e) {
    if (reduced) return; // let the browser navigate normally
    e.preventDefault();
    document.body.classList.add("is-leaving");
    setTimeout(function () { window.location.href = link.href; }, 250);
  });
})();
