/* PACT Hand — page behaviour (no dependencies) */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) document.documentElement.classList.add("reduced");

  /* ---------- mobile nav ---------- */
  var toggle = document.getElementById("navtoggle"), links = document.getElementById("navlinks");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") { links.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); }
    });
  }

  /* ---------- active section in nav ---------- */
  var navA = Array.prototype.slice.call(document.querySelectorAll(".nav-links a"));
  var secs = navA.map(function (a) { return document.querySelector(a.getAttribute("href")); });
  var ticking = false;
  function markNav() {
    ticking = false;
    var y = window.scrollY + window.innerHeight * 0.35, cur = -1;
    secs.forEach(function (s, i) { if (s && s.getBoundingClientRect().top + window.scrollY <= y) cur = i; });
    navA.forEach(function (a, i) { a.classList.toggle("active", i === cur); });
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(markNav); } }, { passive: true });
  window.addEventListener("resize", markNav);
  markNav();

  /* ---------- lazy, in-view video playback ---------- */
  var playIcon = '<svg viewBox="0 0 54 54" aria-hidden="true"><circle cx="27" cy="27" r="26" fill="rgba(0,0,0,.55)"/><path d="M21 16l17 11-17 11z" fill="#fff"/></svg>';
  function load(v) {
    if (!v.dataset.loaded) { v.src = v.dataset.src; v.dataset.loaded = "1"; }
  }
  function tryPlay(v) {
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
  }
  var vids = Array.prototype.slice.call(document.querySelectorAll("video[data-src]"));
  vids.forEach(function (v) {
    if (v.id === "stagevid") return;
    v.loop = true;
    var media = v.parentElement;
    var btn = document.createElement("button");
    btn.className = "play"; btn.type = "button"; btn.setAttribute("aria-label", "Play"); btn.innerHTML = playIcon;
    media.appendChild(btn);
    function toggleV() {
      load(v);
      if (v.paused) { v.dataset.userPaused = ""; tryPlay(v); } else { v.dataset.userPaused = "1"; v.pause(); }
    }
    btn.addEventListener("click", toggleV);
    v.addEventListener("click", toggleV);
    v.addEventListener("play", function () { btn.style.display = "none"; });
    v.addEventListener("pause", function () { if (reduce) btn.style.display = ""; });
  });
  if ("IntersectionObserver" in window) {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting) {
          load(v);
          if (!reduce && !v.dataset.userPaused) tryPlay(v);
        } else if (!v.paused) {
          v.pause();
        }
      });
    }, { rootMargin: "120px 0px", threshold: 0.2 });
    vids.forEach(function (v) { vio.observe(v); });
  } else {
    vids.forEach(load);
  }

  /* ---------- stage animation scrubber ---------- */
  var sv = document.getElementById("stagevid");
  if (sv) {
    var range = document.getElementById("stagerange"), pp = document.getElementById("stagepp"),
        icon = document.getElementById("ppicon"), ticks = Array.prototype.slice.call(document.querySelectorAll("#stageticks button")),
        ladder = Array.prototype.slice.call(document.querySelectorAll("#ladder li"));
    var bounds = [[0, 0], [3.5, 1], [7.0, 3], [10.5, 5], [14.37, 6]];
    sv.loop = true;
    function stageAt(t) { var s = 0; bounds.forEach(function (b) { if (t >= b[0] - 0.01) s = b[1]; }); return s; }
    function paint() {
      var t = sv.currentTime || 0, max = parseFloat(range.max);
      range.value = t;
      range.style.setProperty("--p", (100 * t / max).toFixed(2) + "%");
      var s = stageAt(t);
      ticks.forEach(function (b, i) { b.classList.toggle("on", bounds[i][1] === s); });
      ladder.forEach(function (li) { li.classList.toggle("on", parseInt(li.dataset.s, 10) <= s); });
      icon.setAttribute("d", sv.paused ? "M2 1l11 6-11 6z" : "M2 1h3.6v12H2zM8.4 1H12v12H8.4z");
    }
    var raf = null;
    function loop() { paint(); raf = sv.paused ? null : requestAnimationFrame(loop); }
    sv.addEventListener("play", function () { if (!raf) raf = requestAnimationFrame(loop); });
    sv.addEventListener("pause", paint);
    sv.addEventListener("seeked", paint);
    sv.addEventListener("loadedmetadata", function () { range.max = sv.duration.toFixed(2); paint(); });
    range.addEventListener("input", function () {
      load(sv); sv.dataset.userPaused = "1"; sv.pause(); sv.currentTime = parseFloat(range.value); paint();
    });
    ticks.forEach(function (b) {
      b.addEventListener("click", function () {
        load(sv); sv.dataset.userPaused = "1"; sv.pause(); sv.currentTime = parseFloat(b.dataset.t) + 0.05; paint();
      });
    });
    pp.addEventListener("click", function () {
      load(sv);
      if (sv.paused) { sv.dataset.userPaused = ""; tryPlay(sv); } else { sv.dataset.userPaused = "1"; sv.pause(); }
    });
    sv.addEventListener("click", function () { pp.click(); });
    paint();
  }

  /* ---------- object tabs ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tabs [role="tab"]'));
  function selectTab(tab) {
    tabs.forEach(function (t) {
      var on = t === tab, panel = document.getElementById(t.getAttribute("aria-controls"));
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      if (on) { panel.removeAttribute("hidden"); }
      else {
        panel.setAttribute("hidden", "");
        Array.prototype.forEach.call(panel.querySelectorAll("video"), function (v) { v.pause(); });
      }
    });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { selectTab(t); });
    t.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (d) { var n = tabs[(i + d + tabs.length) % tabs.length]; selectTab(n); n.focus(); e.preventDefault(); }
    });
  });

  /* ---------- PACT / LEAP skeleton toggle ---------- */
  var skelBtns = Array.prototype.slice.call(document.querySelectorAll("[data-skel]"));
  skelBtns.forEach(function (b) {
    b.addEventListener("click", function () {
      skelBtns.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      document.getElementById("skel-pact").classList.toggle("hide", b.dataset.skel !== "pact");
      document.getElementById("skel-leap").classList.toggle("hide", b.dataset.skel !== "leap");
    });
  });

  /* ---------- 3D viewer: printed-parts highlight ---------- */
  var mv = document.getElementById("hand3d"), orig = null;
  if (mv) {
    if (reduce) mv.removeAttribute("auto-rotate");
    mv.addEventListener("load", function () {
      if (!mv.model) return;
      orig = mv.model.materials.map(function (m) {
        return { m: m, c: m.pbrMetallicRoughness.baseColorFactor.slice(), a: m.getAlphaMode ? m.getAlphaMode() : "OPAQUE" };
      });
    });
    var modeBtns = Array.prototype.slice.call(document.querySelectorAll("[data-mode]"));
    modeBtns.forEach(function (b) {
      b.addEventListener("click", function () {
        modeBtns.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        var sw = document.getElementById("sw-printed");
        if (sw) sw.style.background = b.dataset.mode === "printed" ? "#2d6aa3" : "#b3bfcc";
        if (!orig) return;
        orig.forEach(function (o) {
          var pbr = o.m.pbrMetallicRoughness;
          if (b.dataset.mode === "printed") {
            if (o.m.name === "servo") { o.m.setAlphaMode("BLEND"); pbr.setBaseColorFactor([o.c[0], o.c[1], o.c[2], 0.12]); }
            else if (o.m.name === "printed") { pbr.setBaseColorFactor("#2d6aa3"); }
          } else {
            o.m.setAlphaMode(o.a); pbr.setBaseColorFactor(o.c);
          }
        });
      });
    });
  }

  /* ---------- copy BibTeX ---------- */
  var copy = document.getElementById("copybib");
  if (copy) {
    copy.addEventListener("click", function () {
      var txt = document.getElementById("bib").textContent;
      function done() { copy.textContent = "Copied"; setTimeout(function () { copy.textContent = "Copy"; }, 1600); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () {});
      else { var r = document.createRange(); r.selectNodeContents(document.getElementById("bib")); var s = getSelection(); s.removeAllRanges(); s.addRange(r); document.execCommand("copy"); s.removeAllRanges(); done(); }
    });
  }
})();
