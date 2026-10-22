// Live clock (mono, brutalist sites love a clock)
(function () {
  var els = document.querySelectorAll("#clock");
  if (!els.length) return;

  function tick() {
    var t = new Date().toLocaleTimeString("en-GB", {
      hour12: false,
      timeZone: "Europe/Tallinn"
    });
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

// Landing: magnetic "More" button — the signature micro-interaction
(function () {
  var btn = document.querySelector("[data-magnetic]");
  if (!btn) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!window.matchMedia("(hover: hover)").matches) return;

  var raf = null;
  var tx = 0;
  var ty = 0;

  function apply() {
    btn.style.transform = "translate(" + tx.toFixed(2) + "px," + ty.toFixed(2) + "px)";
    raf = null;
  }

  btn.addEventListener("mousemove", function (e) {
    var r = btn.getBoundingClientRect();
    var mx = e.clientX - (r.left + r.width / 2);
    var my = e.clientY - (r.top + r.height / 2);
    tx = mx * 0.28;
    ty = my * 0.5;
    if (!raf) raf = requestAnimationFrame(apply);
  });

  btn.addEventListener("mouseleave", function () {
    tx = 0;
    ty = 0;
    if (!raf) raf = requestAnimationFrame(apply);
  });
})();

// Contact: POST the form to the backend, with a mailto fallback
(function () {
  var form = document.querySelector(".contact-form");
  if (!form) return;

  var note = form.querySelector("[data-form-note]");
  var submit = form.querySelector(".contact-submit");
  var address = form.getAttribute("data-mailto");

  function openMailApp(data) {
    var body = data.message + "\n\n— " + data.name + " (" + data.email + ")";
    window.location.href = "mailto:" + address +
      "?subject=" + encodeURIComponent(data.subject) +
      "&body=" + encodeURIComponent(body);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var data = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      subject: form.elements.subject.value.trim(),
      message: form.elements.message.value.trim()
    };

    if (!data.name || !data.email || !data.subject || !data.message) {
      if (note) note.textContent = "Please fill in every field before sending.";
      return;
    }

    if (note) note.textContent = "Sending...";
    if (submit) submit.disabled = true;

    fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })
      .then(function (res) {
        return res.json().then(function (json) {
          return { ok: res.ok, json: json };
        });
      })
      .then(function (r) {
        if (r.ok && r.json.ok) {
          if (note) note.textContent = "Thanks — your message is on its way.";
          form.reset();
        } else {
          if (note) note.textContent = (r.json && r.json.error) || "Something went wrong.";
        }
      })
      .catch(function () {
        if (note) note.textContent = "Server unreachable — opening your email app instead...";
        openMailApp(data);
      })
      .finally(function () {
        if (submit) submit.disabled = false;
      });
  });
})();

// Home: reveal sections as they scroll into view
(function () {
  var items = document.querySelectorAll(".reveal");
  if (!items.length) return;

  if (!("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    items.forEach(function (el) { el.classList.add("is-visible"); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      io.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0.1 });

  items.forEach(function (el) { io.observe(el); });
})();
