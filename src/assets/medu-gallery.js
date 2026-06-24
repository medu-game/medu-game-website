/* ─────────────────────────────────────────────────────────────────────────
 * medu.game — media behaviour
 *   1. click-to-play video embeds  (.video-embed[data-src])
 *   2. screenshot gallery + lightbox (.gallery-grid > .gallery-item)
 * No dependencies. Progressive enhancement: without JS the posters/links
 * remain visible and the gallery images stay as static thumbnails.
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

  /* ── 2. gallery + lightbox ───────────────────────────────────────────── */
  var L = document.documentElement.lang === "en"
    ? { close: "close", prev: "previous", next: "next", dialog: "screenshot viewer" }
    : { close: "sluiten", prev: "vorige", next: "volgende", dialog: "screenshot-weergave" };

  var lb, lbImg, lbCaption, lbCount, current = [], index = 0;

  function buildLightbox() {
    lb = document.createElement("div");
    lb.className = "lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", L.dialog);
    lb.innerHTML =
      '<span class="lightbox-count" aria-hidden="true"></span>' +
      '<button class="lightbox-close" aria-label="' + L.close + '">' +
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '<button class="lightbox-btn lightbox-prev" aria-label="' + L.prev + '">' +
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg></button>' +
      '<button class="lightbox-btn lightbox-next" aria-label="' + L.next + '">' +
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button>' +
      '<figure class="lightbox-figure">' +
        '<img class="lightbox-img" alt="" />' +
        '<figcaption class="lightbox-caption"></figcaption>' +
      "</figure>";
    document.body.appendChild(lb);
    lbImg = lb.querySelector(".lightbox-img");
    lbCaption = lb.querySelector(".lightbox-caption");
    lbCount = lb.querySelector(".lightbox-count");

    lb.querySelector(".lightbox-close").addEventListener("click", close);
    lb.querySelector(".lightbox-prev").addEventListener("click", function (e) { e.stopPropagation(); step(-1); });
    lb.querySelector(".lightbox-next").addEventListener("click", function (e) { e.stopPropagation(); step(1); });
    lb.addEventListener("click", function (e) { if (e.target === lb || e.target.closest(".lightbox-figure") === null) close(); });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
    });
  }

  function show() {
    var item = current[index];
    lbImg.src = item.full;
    lbImg.alt = item.alt;
    lbCaption.textContent = item.alt;
    lbCount.textContent = (index + 1) + " / " + current.length;
    var multi = current.length > 1;
    lb.querySelector(".lightbox-prev").style.display = multi ? "" : "none";
    lb.querySelector(".lightbox-next").style.display = multi ? "" : "none";
  }
  function step(dir) { index = (index + dir + current.length) % current.length; show(); }
  function open(items, i) {
    if (!lb) buildLightbox();
    current = items; index = i; show();
    lb.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }
  function close() {
    lb.classList.remove("is-open");
    document.body.style.overflow = "";
    // release the large image after the fade-out
    setTimeout(function () { if (!lb.classList.contains("is-open")) lbImg.removeAttribute("src"); }, 260);
  }

  function initGalleries() {
    document.querySelectorAll(".gallery-grid").forEach(function (grid) {
      var buttons = Array.prototype.slice.call(grid.querySelectorAll(".gallery-item"));
      var items = buttons.map(function (btn) {
        var img = btn.querySelector("img");
        return { full: btn.getAttribute("data-full") || img.getAttribute("src"), alt: img.getAttribute("alt") || "" };
      });
      buttons.forEach(function (btn, i) {
        btn.addEventListener("click", function () { open(items, i); });
      });
    });
  }

  function init() { initVideos(); initGalleries(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

/* ── mobile nav (hamburger) ────────────────────────────────────────────────
 * Toggles the .topnav dropdown on small screens via a .nav-open class on <html>.
 * No-op on pages without a .nav-toggle (e.g. module pages use a back-link). */
(function () {
  "use strict";
  function wire() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.querySelector(".topnav");
    if (!toggle || !nav) return;
    var root = document.documentElement;
    function set(open) {
      root.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    }
    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      set(!root.classList.contains("nav-open"));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) set(false);
    });
    document.addEventListener("click", function (e) {
      if (root.classList.contains("nav-open") && !e.target.closest(".topnav") && !e.target.closest(".nav-toggle")) set(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") set(false);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();
})();
