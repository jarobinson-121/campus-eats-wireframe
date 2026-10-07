// Campus Eats — send test results to the team's Google Sheet.
//
// Rows are queued in localStorage first, then POSTed to the Apps Script web
// app in data.js (sheet.url). A batch leaves the queue only when the script
// replies {"ok":true}; anything else (offline, access denied, wrong token)
// leaves it queued, records the error, and it is retried on the next page
// load, when the browser comes back online, or via "Sync now".
// The local results store is untouched, so export/import still works.
(function () {
  "use strict";

  var CE = window.CE;
  var cfg = window.CE_DATA.sheet || {};
  var QUEUE_KEY = "ce.syncqueue.v1";
  var flushing = false;
  var listener = null;
  var lastError = "";

  function readQueue() { return CE.store(QUEUE_KEY, []); }
  function writeQueue(q) { CE.save(QUEUE_KEY, q); }
  function changed() { if (listener) listener(); }

  // Apps Script can't answer a CORS preflight, so this must be a "simple"
  // request (text/plain). Its JSON reply is still readable.
  function post(batch) {
    return fetch(cfg.url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ token: cfg.token, kind: batch.kind, rows: batch.rows })
    }).then(function (res) {
      return res.json().catch(function () { return {}; });
    }, function () {
      throw new Error("Couldn't reach the Google Sheet (offline, or the web app isn't public).");
    }).then(function (reply) {
      if (!reply.ok) throw new Error("The Google Sheet script refused the data (check the token in data.js).");
    });
  }

  function flush() {
    if (!cfg.url || flushing) return Promise.resolve();
    flushing = true;
    function next() {
      var q = readQueue();
      if (!q.length) return Promise.resolve();
      return post(q[0]).then(function () {
        lastError = "";
        writeQueue(readQueue().filter(function (b) { return b.id !== q[0].id; }));
        changed();
        return next();
      });
    }
    return next().catch(function (err) { lastError = err.message; })
      .then(function () { flushing = false; changed(); });
  }

  CE.sync = {
    enabled: !!cfg.url,

    // kind is the Sheet tab name; every row in a batch must share the same keys.
    send: function (kind, rows) {
      if (!cfg.url || !rows.length) return;
      var q = readQueue();
      q.push({ id: CE.uid("b"), kind: kind, rows: rows });
      writeQueue(q);
      changed();
      flush();
    },

    pending: function () {
      return readQueue().reduce(function (n, b) { return n + b.rows.length; }, 0);
    },

    error: function () { return lastError; },
    flush: flush,
    // One listener: the Results page, re-registered each time it renders.
    onChange: function (fn) { listener = fn; }
  };

  window.addEventListener("online", flush);
  flush();
})();
