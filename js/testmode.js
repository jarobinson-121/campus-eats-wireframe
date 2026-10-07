// Campus Eats — test mode (tree-test instrument for Part 2).
//
// Facilitator enters a participant ID; the 10 tasks are shuffled. For each
// task: scenario card → OK starts the timer → participant browses → reaching
// any restaurant (a leaf) records the endpoint and moves to the next card.
// "Give up" records a failure. Runs persist in localStorage; an interrupted
// run (reload, closed tab) can be resumed from the task it was on.
(function () {
  "use strict";

  var CE = window.CE;
  var D = window.CE_DATA;
  var ACTIVE_KEY = "ce.testrun.active.v1";
  var RUNS_KEY = "ce.testruns.v1";

  var active = CE.store(ACTIVE_KEY, null);
  var interrupted = false;
  var justFinished = null;   // runId of the run completed this page-load

  // A task in progress when the page was reloaded is restarted from its card,
  // so its time and clicks are never a mix of two attempts.
  if (active) {
    interrupted = true;
    if (active.phase === "task") {
      active.phase = "card";
      active.restarts = (active.restarts || 0) + 1;
      active.lastAnswer = "";
      active.notice = "The page was reloaded mid-task, so this task starts over.";
      CE.save(ACTIVE_KEY, active);
    }
  }

  function persist() { CE.save(ACTIVE_KEY, active); }
  function readRuns() { return CE.store(RUNS_KEY, []); }
  function saveRuns(runs) { CE.save(RUNS_KEY, runs); }

  function go(hash) {
    if (window.location.hash === hash) CE.render();
    else window.location.hash = hash;
  }

  function shuffled(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function currentTaskId() { return active ? active.order[active.index] : ""; }
  function inTask() { return !!(active && active.phase === "task"); }

  function elapsed() {
    return inTask() ? (Date.now() - active.task.startedAt) / 1000 : 0;
  }
  function clock(seconds) {
    var s = Math.floor(seconds);
    return Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60);
  }

  // ------------------------------------------------------------ run control
  function startRun(participant) {
    active = {
      runId: CE.uid("run"),
      participant: participant,
      startedAt: new Date().toISOString(),
      order: shuffled(D.tasks.map(function (t) { return t.id; })),
      index: 0,
      phase: "card",
      restarts: 0,
      results: []
    };
    interrupted = false;
    justFinished = null;
    persist();
    go("#/test");
  }

  function beginTask() {
    active.phase = "task";
    active.notice = "";
    active.task = { startedAt: Date.now(), clicks: 0, path: ["#/"], firstClick: "" };
    persist();
    go("#/");
  }

  function finishTask(blockId, trail) {
    var t = CE.task(currentTaskId());
    var r = blockId ? CE.restaurant(blockId) : null;
    var result = {
      position: active.index + 1,
      taskId: t.id,
      scenario: t.scenario,
      expect: t.expect.slice(),
      endpoint: blockId || "",
      endpointName: r ? r.name : "",
      endpointRoute: trail ? CE.hrefFor(trail, trail.length - 1) : "",
      correct: !!blockId && t.expect.indexOf(blockId) !== -1,
      gaveUp: !blockId,
      seconds: Math.round(elapsed() * 10) / 10,
      clicks: active.task.clicks,
      firstClick: active.task.firstClick,
      path: active.task.path.slice(),
      startedAt: new Date(active.task.startedAt).toISOString()
    };
    active.results.push(result);
    CE.sync.send("Attempts", [sheetRow(active, result)]);
    active.lastAnswer = r ? "You chose " + r.name + "." : "You gave up on that one. That's useful too.";
    active.index += 1;
    active.phase = "card";
    delete active.task;

    if (active.index >= active.order.length) {
      closeRun(true);
    } else {
      persist();
    }
    go("#/test");
  }

  function closeRun(complete) {
    if (active.results.length) {
      var runs = readRuns();
      runs.push({
        runId: active.runId,
        participant: active.participant,
        startedAt: active.startedAt,
        finishedAt: new Date().toISOString(),
        complete: complete,
        restarts: active.restarts || 0,
        order: active.order,
        results: active.results
      });
      saveRuns(runs);
      CE.sync.send("Clicks", CE.log.entries().filter(function (e) { return e.run === active.runId; }));
      justFinished = { runId: active.runId, participant: active.participant, complete: complete };
    }
    active = null;
    interrupted = false;
    CE.remove(ACTIVE_KEY);
  }

  // ------------------------------------------------------------ hooks used by app/logger
  CE.test = {
    isActive: function () { return !!active; },
    inTask: inTask,

    context: function () {
      return active ? { participant: active.participant, runId: active.runId, taskId: currentTaskId() } : null;
    },

    noteClick: function (entry) {
      // Only navigation counts; the Give up button is recorded in the log, not here.
      if (!inTask() || entry.kind === "button") return;
      active.task.clicks += 1;
      if (!active.task.firstClick) active.task.firstClick = entry.label;
      persist();
    },

    // Called by the router before rendering a browse route. Returns true if
    // test mode took over (the participant reached a restaurant).
    onRoute: function (hash, resolved) {
      if (!inTask()) return false;
      var path = active.task.path;
      if (path[path.length - 1] !== hash) path.push(hash);
      persist();
      if (resolved && resolved.node.block) {
        finishTask(resolved.node.block, resolved.trail);
        return true;
      }
      return false;
    },

    // While a run is open, everything except browsing goes to the card.
    landing: function () { return active && active.phase === "card" ? "#/test" : null; },

    renderBar: function (el) {
      if (!inTask()) { el.hidden = true; el.innerHTML = ""; return; }
      var t = CE.task(currentTaskId());
      el.hidden = false;
      el.innerHTML =
        '<div class="testbar__row">' +
          '<span class="testbar__count">Task ' + (active.index + 1) + " of " + active.order.length + "</span>" +
          '<span class="testbar__task">' + CE.esc(t.scenario) + "</span>" +
          '<span class="testbar__clock" id="tb-clock">' + clock(elapsed()) + "</span>" +
          '<button type="button" class="btn" id="tb-giveup" data-label="Give up (' + t.id + ')">Give up</button>' +
        "</div>";
      document.getElementById("tb-giveup").addEventListener("click", function () {
        finishTask(null, null);
      });
    },

    tick: function () {
      var c = document.getElementById("tb-clock");
      if (c && inTask()) c.textContent = clock(elapsed());
    },

    renderPage: function (el) {
      if (justFinished && !active) return renderDone(el);
      if (active && interrupted) return renderResume(el);
      if (active) return renderCard(el);
      return renderIntro(el);
    },

    renderResults: renderResults
  };

  // ------------------------------------------------------------ test pages
  function renderIntro(el) {
    el.innerHTML =
      '<p class="eyebrow">Test mode</p>' +
      "<h1>Start a test session</h1>" +
      '<p class="lede">The participant will get ' + D.tasks.length + " short scenarios in random order. " +
      "For each one they read the scenario, click OK, and then browse the site to the restaurant they would pick. " +
      "Choosing a restaurant ends that task and starts the next one. The timer and every click are recorded.</p>" +
      '<form class="card" id="start-form">' +
        '<label class="field__label" for="pid">Participant ID</label>' +
        '<input class="field" id="pid" name="pid" autocomplete="off" placeholder="e.g. P01" required>' +
        '<p class="hint">Use a code, not a name.</p>' +
        '<button type="submit" class="btn btn--big" data-label="Start test session">Start session</button>' +
      "</form>" +
      '<p class="hint">Facilitator: hand over the screen after pressing Start. Results are on the ' +
      '<a href="#/results" data-label="Results (from test intro)">Results</a> page.</p>';
    document.getElementById("start-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var pid = document.getElementById("pid").value.trim();
      if (pid) startRun(pid);
    });
  }

  function renderCard(el) {
    var t = CE.task(currentTaskId());
    el.innerHTML =
      (active.lastAnswer ? '<p class="notice">Recorded. ' + CE.esc(active.lastAnswer) + "</p>" : "") +
      (active.notice ? '<p class="notice">' + CE.esc(active.notice) + "</p>" : "") +
      '<div class="card">' +
        '<p class="card__count">Task ' + (active.index + 1) + " of " + active.order.length + "</p>" +
        '<p class="card__scenario">' + CE.esc(t.scenario) + "</p>" +
        '<p class="hint">Click OK, then find the restaurant you would pick. ' +
        "The task ends as soon as you choose a restaurant.</p>" +
        '<button type="button" class="btn btn--big" id="card-ok" data-label="OK (start ' + t.id + ')">OK</button>' +
      "</div>" +
      '<p class="hint"><button type="button" class="linkbtn" id="card-end" data-label="End session early">' +
      "End session early (saves what's done)</button></p>";
    document.getElementById("card-ok").addEventListener("click", beginTask);
    document.getElementById("card-end").addEventListener("click", function () {
      if (window.confirm("End this session now? Finished tasks are saved.")) {
        closeRun(false);
        go("#/test");
      }
    });
    document.getElementById("card-ok").focus();
  }

  function renderResume(el) {
    el.innerHTML =
      '<p class="eyebrow">Test mode</p>' +
      "<h1>Unfinished session</h1>" +
      '<div class="card">' +
        "<p>Participant <strong>" + CE.esc(active.participant) + "</strong> finished " +
        CE.plural(active.results.length, "task", "tasks") + " of " + active.order.length + ".</p>" +
        '<button type="button" class="btn btn--big" id="rs-resume" data-label="Resume session">Resume at task ' +
        (active.index + 1) + "</button> " +
        '<button type="button" class="btn" id="rs-end" data-label="End session and save partial">End and save what\'s done</button> ' +
        '<button type="button" class="btn" id="rs-discard" data-label="Discard session">Discard</button>' +
      "</div>";
    document.getElementById("rs-resume").addEventListener("click", function () {
      interrupted = false;
      CE.render();
    });
    document.getElementById("rs-end").addEventListener("click", function () {
      closeRun(false);
      CE.render();
    });
    document.getElementById("rs-discard").addEventListener("click", function () {
      if (!window.confirm("Discard this session? Its results will not be saved.")) return;
      active = null;
      interrupted = false;
      CE.remove(ACTIVE_KEY);
      CE.render();
    });
  }

  function renderDone(el) {
    var done = justFinished;
    el.innerHTML =
      '<p class="eyebrow">Test mode</p>' +
      "<h1>" + (done.complete ? "All done. Thank you!" : "Session ended") + "</h1>" +
      '<p class="lede">Results for <strong>' + CE.esc(done.participant) + "</strong> are saved in this browser.</p>" +
      '<p><a class="btn" href="#/results" data-label="View results">View results</a> ' +
      '<button type="button" class="btn" id="dn-new" data-label="Start another session">Start another session</button></p>';
    document.getElementById("dn-new").addEventListener("click", function () {
      justFinished = null;
      CE.render();
    });
  }

  // ------------------------------------------------------------ results
  function median(nums) {
    if (!nums.length) return null;
    var a = nums.slice().sort(function (x, y) { return x - y; });
    var m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }
  function pct(n, d) { return d ? Math.round((100 * n) / d) + "%" : "–"; }
  function names(ids) {
    return ids.map(function (id) { var r = CE.restaurant(id); return r ? r.name : id; }).join(" | ");
  }

  // One Attempts-tab row. Keys become the Sheet's header row, so keep them stable.
  function sheetRow(run, r) {
    return {
      sentAt: new Date().toISOString(),
      runId: run.runId,
      participant: run.participant,
      runStartedAt: run.startedAt,
      position: r.position,
      taskId: r.taskId,
      scenario: r.scenario,
      expected: names(r.expect),
      endpoint: r.endpoint,
      endpointName: r.endpointName,
      correct: r.correct,
      gaveUp: r.gaveUp,
      seconds: r.seconds,
      clicks: r.clicks,
      firstClick: r.firstClick,
      path: r.path.join(" > ")
    };
  }

  var CSV_HEAD = ["runId", "participant", "runStartedAt", "runComplete", "position", "taskId", "scenario",
    "expected", "endpoint", "endpointName", "correct", "gaveUp", "seconds", "clicks", "firstClick", "path"];

  function resultsCsv(runs) {
    var rows = [CSV_HEAD];
    runs.forEach(function (run) {
      run.results.forEach(function (r) {
        rows.push([run.runId, run.participant, run.startedAt, run.complete, r.position, r.taskId, r.scenario,
          names(r.expect), r.endpoint, r.endpointName, r.correct, r.gaveUp, r.seconds, r.clicks,
          r.firstClick, r.path.join(" > ")]);
      });
    });
    return CE.csv(rows);
  }

  function summaryRows(runs) {
    return D.tasks.map(function (t) {
      var rs = [];
      runs.forEach(function (run) {
        run.results.forEach(function (r) { if (r.taskId === t.id) rs.push(r); });
      });
      var ok = rs.filter(function (r) { return r.correct; }).length;
      var gave = rs.filter(function (r) { return r.gaveUp; }).length;
      var firsts = {};
      rs.forEach(function (r) { if (r.firstClick) firsts[r.firstClick] = (firsts[r.firstClick] || 0) + 1; });
      var top = Object.keys(firsts).sort(function (a, b) { return firsts[b] - firsts[a]; })[0];
      var med = median(rs.map(function (r) { return r.seconds; }));
      var avgClicks = rs.length ? rs.reduce(function (n, r) { return n + r.clicks; }, 0) / rs.length : null;
      return "<tr>" +
        '<td class="num">' + t.id + "</td>" +
        "<td>" + CE.esc(t.scenario) + "</td>" +
        '<td class="num">' + rs.length + "</td>" +
        '<td class="num">' + pct(ok, rs.length) + "</td>" +
        '<td class="num">' + gave + "</td>" +
        '<td class="num">' + (med == null ? "–" : med.toFixed(1) + "s") + "</td>" +
        '<td class="num">' + (avgClicks == null ? "–" : avgClicks.toFixed(1)) + "</td>" +
        "<td>" + (top ? CE.esc(top) + " (" + firsts[top] + ")" : "–") + "</td>" +
      "</tr>";
    }).join("");
  }

  function runDetail(run) {
    var ok = run.results.filter(function (r) { return r.correct; }).length;
    return '<li><details>' +
      "<summary><strong>" + CE.esc(run.participant) + "</strong> · " +
      CE.esc(new Date(run.startedAt).toLocaleString()) + " · " +
      ok + " of " + run.results.length + " correct" + (run.complete ? "" : " · ended early") +
      "</summary>" +
      '<div class="scrollx"><table class="logtable"><thead><tr>' +
      "<th>#</th><th>Task</th><th>Chosen</th><th>Correct</th><th>Time</th><th>Clicks</th><th>Path</th>" +
      "</tr></thead><tbody>" +
      run.results.map(function (r) {
        return "<tr>" +
          '<td class="num">' + r.position + "</td>" +
          '<td class="num">' + r.taskId + "</td>" +
          "<td>" + (r.gaveUp ? "<em>Gave up</em>" : CE.esc(r.endpointName)) + "</td>" +
          "<td>" + (r.correct ? "Yes" : "No") + "</td>" +
          '<td class="num">' + r.seconds + "s</td>" +
          '<td class="num">' + r.clicks + "</td>" +
          "<td>" + CE.esc(r.path.join(" › ")) + "</td>" +
        "</tr>";
      }).join("") +
      "</tbody></table></div></details></li>";
  }

  function renderResults(el) {
    var runs = readRuns();
    var attempts = runs.reduce(function (n, r) { return n + r.results.length; }, 0);
    el.innerHTML =
      '<p class="eyebrow">Instrument</p>' +
      "<h1>Test results</h1>" +
      '<p class="lede">' + CE.plural(runs.length, "session", "sessions") + ", " +
      CE.plural(attempts, "task attempt", "task attempts") + ". Stored in this browser only. " +
      "Export to keep them, or import a teammate's export to merge.</p>" +
      '<div class="tools">' +
        '<button type="button" id="rx-json" data-label="Download results JSON">Download JSON</button>' +
        '<button type="button" id="rx-csv" data-label="Download results CSV">Download CSV</button>' +
        '<button type="button" id="rx-copy" data-label="Copy results JSON">Copy JSON</button>' +
        '<label class="filebtn">Import JSON…<input type="file" id="rx-import" accept="application/json,.json"></label>' +
        '<button type="button" id="rx-clear" data-label="Clear all results">Clear all</button>' +
        (CE.sync.enabled ? '<button type="button" id="rx-sync" data-label="Sync to Google Sheet">Sync now</button>' : "") +
        '<span class="hint" id="rx-status" role="status"></span>' +
      "</div>" +
      (runs.length ?
        "<h2>By task</h2>" +
        '<div class="scrollx"><table class="logtable"><thead><tr>' +
        "<th>Task</th><th>Scenario</th><th>Attempts</th><th>Success</th><th>Gave up</th>" +
        "<th>Median time</th><th>Avg clicks</th><th>Most common first click</th>" +
        "</tr></thead><tbody>" + summaryRows(runs) + "</tbody></table></div>" +
        "<h2>By session</h2>" +
        '<ul class="runlist">' + runs.slice().reverse().map(runDetail).join("") + "</ul>"
        : '<p class="empty">No sessions yet. Start one from <a href="#/test" data-label="Test mode (from results)">Test mode</a>.</p>');

    function status(msg) { document.getElementById("rx-status").textContent = msg; }
    function syncStatus() {
      if (!CE.sync.enabled || !document.getElementById("rx-status")) return;
      var n = CE.sync.pending();
      var err = CE.sync.error();
      status(!n ? "Google Sheet up to date." :
        CE.plural(n, "row", "rows") + " waiting to send to the Google Sheet." + (err ? " " + err : ""));
    }
    syncStatus();
    CE.sync.onChange(syncStatus);
    if (CE.sync.enabled) {
      document.getElementById("rx-sync").addEventListener("click", function () {
        status("Sending…");
        CE.sync.flush();
      });
    }

    document.getElementById("rx-json").addEventListener("click", function () {
      CE.download("campus-eats-results-" + CE.stamp() + ".json", JSON.stringify(readRuns(), null, 2), "application/json");
    });
    document.getElementById("rx-csv").addEventListener("click", function () {
      CE.download("campus-eats-results-" + CE.stamp() + ".csv", resultsCsv(readRuns()), "text/csv");
    });
    document.getElementById("rx-copy").addEventListener("click", function () {
      CE.copy(JSON.stringify(readRuns(), null, 2), "rx-status");
    });
    document.getElementById("rx-clear").addEventListener("click", function () {
      if (!runs.length) return;
      if (!window.confirm("Delete all " + runs.length + " saved sessions from this browser? Export first if you need them.")) return;
      saveRuns([]);
      CE.render();
    });
    document.getElementById("rx-import").addEventListener("change", function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var incoming;
        try { incoming = JSON.parse(reader.result); } catch (err) { status("That file isn't valid JSON."); return; }
        if (!Array.isArray(incoming) || !incoming.every(function (r) { return r && r.runId && Array.isArray(r.results); })) {
          status("That file isn't a Campus Eats results export.");
          return;
        }
        var current = readRuns();
        var seen = {};
        current.forEach(function (r) { seen[r.runId] = true; });
        var added = incoming.filter(function (r) { return !seen[r.runId]; });
        saveRuns(current.concat(added));
        CE.render();
        status("Imported " + CE.plural(added.length, "new session", "new sessions") +
          (incoming.length - added.length ? " (" + (incoming.length - added.length) + " already here)." : "."));
      };
      reader.readAsText(file);
    });
  }
})();
