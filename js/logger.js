// Campus Eats — click recording.
//
// Every click on a link or button anywhere in the prototype is appended to
// one persistent log in localStorage, so the log survives navigation and
// reloads. Exportable as JSON or CSV from the Click log page.
(function () {
  "use strict";

  var CE = window.CE;
  var LOG_KEY = "ce.clicklog.v1";
  var SESSION_KEY = "ce.session.v1";

  // A browsing session lasts as long as the tab.
  var session;
  try {
    session = window.sessionStorage.getItem(SESSION_KEY);
    if (!session) {
      session = CE.uid("s");
      window.sessionStorage.setItem(SESSION_KEY, session);
    }
  } catch (e) { session = CE.uid("s"); }

  function read() { return CE.store(LOG_KEY, []); }

  function currentRoute() { return window.location.hash || "#/"; }

  function labelOf(el) {
    var label = el.getAttribute("data-label") || el.textContent || el.value || "";
    return label.replace(/\s+/g, " ").trim().slice(0, 120);
  }

  function kindOf(el) {
    return el.getAttribute("data-kind") || (el.tagName === "BUTTON" ? "button" : "link");
  }

  function record(el) {
    var log = read();
    var ctx = CE.test ? CE.test.context() : null;
    var entry = {
      seq: log.length + 1,
      at: new Date().toISOString(),
      session: session,
      mode: ctx ? "test" : "browse",
      participant: ctx ? ctx.participant : "",
      run: ctx ? ctx.runId : "",
      task: ctx ? ctx.taskId : "",
      from: currentRoute(),
      to: el.tagName === "A" ? (el.getAttribute("href") || "") : "",
      kind: kindOf(el),
      label: labelOf(el)
    };
    log.push(entry);
    CE.save(LOG_KEY, log);
    if (CE.test) CE.test.noteClick(entry);
  }

  // Capture phase, so the click is logged before navigation re-renders the page.
  document.addEventListener("click", function (e) {
    var el = e.target.closest("a, button");
    if (!el || el.hasAttribute("data-nolog")) return;
    record(el);
  }, true);

  var FIELDS = ["seq", "at", "session", "mode", "participant", "run", "task", "from", "to", "kind", "label"];

  CE.log = {
    entries: read,
    clear: function () { CE.save(LOG_KEY, []); },
    json: function () { return JSON.stringify(read(), null, 2); },
    csv: function () {
      return CE.csv([FIELDS].concat(read().map(function (e) {
        return FIELDS.map(function (f) { return e[f]; });
      })));
    }
  };
})();
