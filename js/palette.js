// Campus Eats — color palettes and the switcher in the bottom-right corner.
//
// Each palette is a set of CSS custom properties applied to <html>; every
// color in style.css comes from these. Loaded in <head> so the saved
// palette applies before first paint. Switcher clicks carry data-nolog so
// they stay out of the click log, and the switcher hides during a test run.
(function () {
  "use strict";

  var KEY = "ce.palette.v1";

  // Each palette is monochromatic: one hue (h, s; l = main lightness, if
  // 36% looks muddy for that hue) supplies every surface,
  // text, line and the main color as tints and shades, plus exactly one
  // contrasting accent, used sparingly (highlights, the place tag, notices).
  var PALETTES = [
    { key: "cougar",    name: "Cougar",     h: 216, s: 62, accent: "#f5b83d", accentInk: "#2e1f00" },
    { key: "tangerine", name: "Tangerine",  h: 22,  s: 85, l: 39, accent: "#e9b949", accentInk: "#2e2100" },
    { key: "matcha",    name: "Matcha",     h: 135, s: 38, accent: "#c8733a", accentInk: "#241003" },
    { key: "grape",     name: "Grape Soda", h: 265, s: 60, accent: "#facc15", accentInk: "#2e2400" },
    { key: "midnight",  name: "Midnight",   h: 222, s: 30, accent: "#22d3ee", accentInk: "#032b33", dark: true }
  ];

  function hsl(h, s, l) { return "hsl(" + h + " " + Math.round(s) + "% " + l + "%)"; }

  // Tints and shades of the one hue; dark palettes flip the lightness scale.
  function varsFor(p) {
    var h = p.h, s = p.s;
    var v = p.dark ? {
      bg: hsl(h, s * .5, 9), surface: hsl(h, s * .45, 13), ink: hsl(h, s * .4, 94),
      muted: hsl(h, s * .3, 68), line: hsl(h, s * .35, 22),
      main: hsl(h, s * 1.6, 74), "main-ink": hsl(h, s, 10), "main-soft": hsl(h, s * .7, 20),
      shade: "0 0% 0%"
    } : {
      bg: hsl(h, s * .5, 97), surface: hsl(h, s * .4, 99.5), ink: hsl(h, s * .7, 14),
      muted: hsl(h, s * .3, 42), line: hsl(h, s * .4, 89),
      main: hsl(h, s, p.l || 36), "main-ink": hsl(h, s * .4, 99.5), "main-soft": hsl(h, s * .8, 93),
      shade: h + " " + Math.round(s * .6) + "% 18%"
    };
    v.accent = p.accent;
    v["accent-ink"] = p.accentInk;
    return v;
  }
  PALETTES.forEach(function (p) { p.vars = varsFor(p); });

  function byKey(k) {
    return PALETTES.filter(function (p) { return p.key === k; })[0] || PALETTES[0];
  }
  function saved() {
    try { return window.localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function remember(k) {
    try { window.localStorage.setItem(KEY, k); } catch (e) { /* private mode: palette lasts this page only */ }
  }

  var root = document.documentElement;
  var current = byKey(saved());

  function apply(p) {
    current = p;
    Object.keys(p.vars).forEach(function (v) { root.style.setProperty("--" + v, p.vars[v]); });
    root.style.colorScheme = p.dark ? "dark" : "light";
    root.setAttribute("data-palette", p.key);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", p.vars.bg);
  }
  apply(current);

  function build() {
    var wrap = document.createElement("div");
    wrap.className = "palette";
    wrap.innerHTML =
      '<div class="palette__panel" id="palette-panel" role="group" aria-label="Color palette" hidden>' +
        '<p class="palette__title">Palette</p>' +
        PALETTES.map(function (p) {
          return '<button type="button" class="palette__opt" data-nolog data-key="' + p.key + '">' +
            '<span class="palette__dots" aria-hidden="true">' +
              ["main-soft", "main", "accent"].map(function (v) {
                return '<i style="background:' + p.vars[v] + '"></i>';
              }).join("") +
            "</span>" + p.name + "</button>";
        }).join("") +
      "</div>" +
      '<button type="button" class="palette__toggle" data-nolog aria-expanded="false" aria-controls="palette-panel">' +
        '<span aria-hidden="true">🎨</span><span class="vh">Change color palette</span></button>';
    document.body.appendChild(wrap);

    var panel = wrap.querySelector(".palette__panel");
    var toggle = wrap.querySelector(".palette__toggle");

    function mark() {
      wrap.querySelectorAll(".palette__opt").forEach(function (b) {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-key") === current.key));
      });
    }
    function open(yes) {
      panel.hidden = !yes;
      toggle.setAttribute("aria-expanded", String(yes));
    }
    mark();

    toggle.addEventListener("click", function () { open(panel.hidden); });
    panel.addEventListener("click", function (e) {
      var b = e.target.closest(".palette__opt");
      if (!b) return;
      apply(byKey(b.getAttribute("data-key")));
      remember(current.key);
      mark();
    });
    document.addEventListener("click", function (e) {
      if (!panel.hidden && !wrap.contains(e.target)) open(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.hidden) { open(false); toggle.focus(); }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
