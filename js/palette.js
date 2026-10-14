// Campus Eats — color palettes and the switcher in the bottom-right corner.
//
// Each palette is a set of CSS custom properties applied to <html>; every
// color in style.css comes from these. Loaded in <head> so the saved
// palette applies before first paint. Switcher clicks carry data-nolog so
// they stay out of the click log, and the switcher hides during a test run.
(function () {
  "use strict";

  var KEY = "ce.palette.v1";

  var PALETTES = [
    { key: "cougar", name: "Cougar", dark: false, vars: {
      bg: "#f5f7fb", surface: "#ffffff", ink: "#0f1d33", muted: "#5b6b82", line: "#dfe5ee",
      accent: "#0b3d91", "accent-ink": "#ffffff", "accent-soft": "#e3ecfa", pop: "#ffb547", "pop-ink": "#3a2600" } },
    { key: "tangerine", name: "Tangerine", dark: false, vars: {
      bg: "#fff8f1", surface: "#ffffff", ink: "#2b1a0e", muted: "#7d6555", line: "#f1e2d4",
      accent: "#e8590c", "accent-ink": "#ffffff", "accent-soft": "#ffe8d6", pop: "#12b5a6", "pop-ink": "#032e2a" } },
    { key: "matcha", name: "Matcha", dark: false, vars: {
      bg: "#f4f7f1", surface: "#ffffff", ink: "#18261a", muted: "#5e6f60", line: "#dde7d9",
      accent: "#2f7a3e", "accent-ink": "#ffffff", "accent-soft": "#e0efdc", pop: "#ef6f97", "pop-ink": "#3d0a1b" } },
    { key: "grape", name: "Grape Soda", dark: false, vars: {
      bg: "#f8f5ff", surface: "#ffffff", ink: "#1f1535", muted: "#6b6185", line: "#e6def7",
      accent: "#6d28d9", "accent-ink": "#ffffff", "accent-soft": "#ede4ff", pop: "#ffc23d", "pop-ink": "#3a2a00" } },
    { key: "midnight", name: "Midnight", dark: true, vars: {
      bg: "#101219", surface: "#1a1d27", ink: "#eef0f6", muted: "#9aa1b5", line: "#2a2e3c",
      accent: "#7dd3fc", "accent-ink": "#08131c", "accent-soft": "#16303d", pop: "#f9a8d4", "pop-ink": "#3b0a24" } }
  ];

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
              ['bg', 'accent', 'pop'].map(function (v) {
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
