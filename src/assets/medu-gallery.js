/* ─────────────────────────────────────────────────────────────────────────
 * medu.game — media behaviour
 *   1. click-to-play video embeds  (.video-embed[data-src])
 *   2. switchers + count-up (see the block at the end of this file)
 * No dependencies. Progressive enhancement: without JS the posters/links
 * remain visible and every switcher shows its first state.
 * ───────────────────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  /* ── 1. click-to-play video ──────────────────────────────────────────── */
  function mimeFor(src) {
    if (/\.webm($|\?)/i.test(src)) return "video/webm";
    if (/\.mp4($|\?)/i.test(src)) return "video/mp4";
    if (/\.mov($|\?)/i.test(src)) return "video/quicktime";
    return "";
  }

  function initVideos() {
    document.querySelectorAll(".video-embed[data-src]").forEach(function (embed) {
      embed.addEventListener("click", function play() {
        if (embed.classList.contains("is-playing")) return;
        var video = document.createElement("video");
        video.controls = true;
        video.autoplay = true;
        video.playsInline = true;
        var poster = embed.getAttribute("data-poster");
        if (poster) video.poster = poster;
        // Build ordered <source> list. webm first (smaller, Chrome/Firefox),
        // mp4 second so Safari — which can't play VP9/webm — falls through to it.
        var srcs = [];
        if (embed.getAttribute("data-src")) srcs.push(embed.getAttribute("data-src"));
        if (embed.getAttribute("data-src-mp4")) srcs.push(embed.getAttribute("data-src-mp4"));
        srcs.forEach(function (s) {
          var source = document.createElement("source");
          source.src = s;
          var t = mimeFor(s);
          if (t) source.type = t;
          video.appendChild(source);
        });
        embed.classList.add("is-playing");
        embed.appendChild(video);
        var p = video.play();
        if (p && typeof p.catch === "function") p.catch(function () {});
      });
    });
  }

  function init() { initVideos(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

/* ── nav (mobile hamburger + desktop "modules" submenu) ─────────────────────
 * Mobile: a .nav-open class on <html> toggles the full-screen .topnav dropdown.
 * Desktop submenu: an .is-open class on .has-sub is the single source of truth
 * (hover on mouse devices, focus for keyboard, click for touch) — deliberately
 * NOT CSS :hover/:focus-within, which leaves a "sticky" open menu after a click
 * on Windows/Edge. No-op on pages without a .nav-toggle / .has-sub. */
(function () {
  "use strict";
  function wire() {
    var root = document.documentElement;

    /* mobile hamburger */
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.querySelector(".topnav");
    if (toggle && nav) {
      var setMenu = function (open) {
        root.classList.toggle("nav-open", open);
        toggle.setAttribute("aria-expanded", String(open));
      };
      toggle.addEventListener("click", function (e) {
        e.stopPropagation();
        setMenu(!root.classList.contains("nav-open"));
      });
      nav.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
      document.addEventListener("click", function (e) {
        if (root.classList.contains("nav-open") && !e.target.closest(".topnav") && !e.target.closest(".nav-toggle")) setMenu(false);
      });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
    }

    /* desktop submenu(s) */
    var groups = document.querySelectorAll(".topnav .has-sub");
    if (!groups.length) return;
    var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    function closeGroups(except) {
      groups.forEach(function (g) {
        if (g === except) return;
        g.classList.remove("is-open");
        var b = g.querySelector(".sub-trigger");
        if (b) b.setAttribute("aria-expanded", "false");
      });
    }
    function setGroup(group, open) {
      group.classList.toggle("is-open", open);
      var b = group.querySelector(".sub-trigger");
      if (b) b.setAttribute("aria-expanded", String(open));
      if (open) closeGroups(group);
    }
    groups.forEach(function (group) {
      var btn = group.querySelector(".sub-trigger");
      if (canHover) {
        group.addEventListener("mouseenter", function () { setGroup(group, true); });
        group.addEventListener("mouseleave", function () { setGroup(group, false); });
      }
      group.addEventListener("focusin", function () { setGroup(group, true); });
      group.addEventListener("focusout", function (e) { if (!group.contains(e.relatedTarget)) setGroup(group, false); });
      if (btn) btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (!canHover) setGroup(group, !group.classList.contains("is-open"));
      });
    });
    document.addEventListener("click", function () { closeGroups(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeGroups(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();
})();

/* ── switchers (hero video, module picker, devices, testimonials) ────────────
 * Markup-driven, no copy in JS (all text stays in the bilingual HTML):
 *   [data-switch]                  root; gets data-active="<key>"
 *     [data-switch-auto="ms"]      optional auto-advance until the user picks
 *   [data-switch-to="<key>"]       trigger (button or link; links are hijacked)
 *   [data-switch-panel="<key>"]    shown while <key> is active (CSS hides others)
 *   [data-switch-step="1|-1"]      next / previous
 *   video[data-src] in a panel     src is set on first show; plays only while the
 *                                  panel is active, on screen, and motion is allowed
 * Plus [data-count-to="N"]: counts up once when scrolled into view.
 * Without JS the first panel stays visible (it carries .is-active in the markup). */
(function () {
  "use strict";
  var root = document.documentElement;
  root.classList.add("js");
  var motionOK = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var io = "IntersectionObserver" in window;

  function syncVideo(v) {
    var panel = v.closest("[data-switch-panel]");
    var active = !panel || panel.classList.contains("is-active");
    // Only fetch the file when it is about to play: until then the poster shows.
    if (active && motionOK && v._inView === true) {
      if (!v.getAttribute("src") && v.getAttribute("data-src")) v.src = v.getAttribute("data-src");
      v.muted = true;
      var p = v.play();
      if (p && typeof p.catch === "function") p.catch(function () {});
    } else if (!v.paused) {
      v.pause();
    }
  }

  function initSwitch(sw) {
    var triggers = Array.prototype.slice.call(sw.querySelectorAll("[data-switch-to]"));
    var keys = [];
    triggers.forEach(function (t) { var k = t.getAttribute("data-switch-to"); if (keys.indexOf(k) < 0) keys.push(k); });
    if (!keys.length) return;
    var current = null, timer = null, userPicked = false;

    function activate(key) {
      current = key;
      sw.setAttribute("data-active", key);
      var idx = keys.indexOf(key);
      triggers.forEach(function (t) {
        var on = t.getAttribute("data-switch-to") === key;
        t.classList.toggle("is-before", keys.indexOf(t.getAttribute("data-switch-to")) < idx);
        t.classList.toggle("is-active", on);
        if (t.getAttribute("role") === "tab") t.setAttribute("aria-selected", String(on));
        else t.setAttribute("aria-pressed", String(on));
      });
      sw.querySelectorAll("[data-switch-panel]").forEach(function (p) {
        p.classList.toggle("is-active", p.getAttribute("data-switch-panel") === key);
      });
      sw.querySelectorAll("video[data-src]").forEach(syncVideo);
    }
    function step(dir) { activate(keys[(keys.indexOf(current) + dir + keys.length) % keys.length]); }
    function stopAuto() { if (timer) { clearInterval(timer); timer = null; } }

    triggers.forEach(function (t) {
      t.addEventListener("click", function (e) {
        e.preventDefault();
        userPicked = true; stopAuto();
        activate(t.getAttribute("data-switch-to"));
      });
    });
    sw.querySelectorAll("[data-switch-step]").forEach(function (b) {
      b.addEventListener("click", function () {
        userPicked = true; stopAuto();
        step(parseInt(b.getAttribute("data-switch-step"), 10) || 1);
      });
    });

    var first = triggers.filter(function (t) { return t.classList.contains("is-active"); })[0];
    activate(first ? first.getAttribute("data-switch-to") : keys[0]);

    var ms = parseInt(sw.getAttribute("data-switch-auto"), 10);
    if (ms && motionOK) {
      var start = function () { if (!userPicked && !timer) timer = setInterval(function () { step(1); }, ms); };
      start();
      sw.addEventListener("mouseenter", stopAuto);
      sw.addEventListener("mouseleave", start);
      sw.addEventListener("focusin", stopAuto);
      sw.addEventListener("focusout", function (e) { if (!sw.contains(e.relatedTarget)) start(); });
    }
  }

  function initVideosInView() {
    var vids = document.querySelectorAll("video[data-src]");
    if (!io) { vids.forEach(function (v) { v._inView = true; syncVideo(v); }); return; }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target._inView = en.isIntersecting; syncVideo(en.target); });
    }, { threshold: 0.25 });
    vids.forEach(function (v) { v._inView = false; obs.observe(v); });
  }

  function initCounters() {
    var els = document.querySelectorAll("[data-count-to]");
    if (!els.length || !motionOK || !io) return;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        obs.unobserve(en.target);
        var el = en.target, to = parseInt(el.getAttribute("data-count-to"), 10) || 0;
        var suffix = el.getAttribute("data-count-suffix") || "";
        var t0 = null, dur = 1200;
        var tick = function (ts) {
          if (t0 === null) t0 = ts;
          var k = Math.min(1, (ts - t0) / dur);
          el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))) + suffix;
          if (k < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    els.forEach(function (el) { obs.observe(el); });
  }

  function init() {
    initVideosInView();
    document.querySelectorAll("[data-switch]").forEach(initSwitch);
    initCounters();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
