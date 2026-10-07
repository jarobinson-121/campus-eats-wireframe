// Campus Eats — router and page rendering.
//
// Routes:
//   #/                     home: the two ways in
//   #/food/...  #/place/... browse pages, resolved against CE.views
//   #/map                  site map of both views
//   #/check                coverage check (every restaurant reachable?)
//   #/log                  click log + export
//   #/test  #/results      test mode + results
(function () {
  "use strict";

  var CE = window.CE;
  var D = window.CE_DATA;
  var app = document.getElementById("app");
  var testbar = document.getElementById("testbar");
  var utilNav = document.getElementById("util-nav");
  var homeLink = document.getElementById("top-home");

  // ------------------------------------------------------------ fragments
  function crumbs(trail) {
    var parts = ['<a href="#/" data-kind="crumb" data-label="Home (breadcrumb)">Home</a>'];
    trail.forEach(function (n, i) {
      if (i === trail.length - 1) {
        parts.push('<span aria-current="page">' + CE.esc(n.name) + "</span>");
      } else {
        parts.push('<a href="' + CE.hrefFor(trail, i) + '" data-kind="crumb" data-label="' +
          CE.esc(n.name) + ' (breadcrumb)">' + CE.esc(n.name) + "</a>");
      }
    });
    return '<nav class="crumbs" aria-label="Breadcrumb">' + parts.join('<span class="crumbs__sep">›</span>') + "</nav>";
  }

  function tile(href, name, sub, isLeaf) {
    return '<li><a class="tile' + (isLeaf ? " tile--leaf" : "") + '" href="' + href +
      '" data-kind="tile" data-label="' + CE.esc(name) + '">' +
      '<span class="tile__name">' + CE.esc(name) + "</span>" +
      (sub ? '<span class="tile__sub">' + CE.esc(sub) + "</span>" : "") +
      '<span class="tile__go" aria-hidden="true">' + (isLeaf ? "Select" : "›") + "</span>" +
      "</a></li>";
  }

  function subFor(node) {
    return node.children ? CE.plural(CE.countLeaves(node), "restaurant", "restaurants") : "";
  }

  // ------------------------------------------------------------ pages
  function viewHome() {
    var tiles = CE.views.map(function (v) {
      return '<li><a class="tile tile--door" href="#/' + v.key + '" data-kind="tile" data-label="' + CE.esc(v.name) + '">' +
        '<span class="tile__name">' + CE.esc(v.name) + "</span>" +
        '<span class="tile__sub">' + CE.esc(v.blurb) + "</span>" +
        '<span class="tile__list">' + v.children.map(function (c) { return CE.esc(c.name); }).join("<br>") + "</span>" +
        "</a></li>";
    }).join("");
    app.innerHTML =
      "<h1>" + CE.esc(D.title) + "</h1>" +
      '<p class="lede">' + CE.esc(D.tagline) + " Two ways to look:</p>" +
      '<ul class="tiles tiles--doors">' + tiles + "</ul>";
  }

  function viewBranch(r) {
    var node = r.node;
    var tiles = node.children.map(function (c) {
      return tile(CE.hrefFor(r.trail, r.trail.length - 1) + "/" + c.key, c.name, subFor(c), !!c.block);
    }).join("");
    var leafLevel = node.children[0] && node.children[0].block;
    var prompt = leafLevel ? "Choose a restaurant." : (r.trail.length === 1 ? node.blurb : "Narrow it down.");
    // "On Campus" alone is ambiguous two levels down, so name the parent too.
    var parent = r.trail.length > 2 ? r.trail[r.trail.length - 2] : null;
    app.innerHTML =
      crumbs(r.trail) +
      (parent ? '<p class="eyebrow">' + CE.esc(parent.name) + "</p>" : "") +
      "<h1>" + CE.esc(node.name) + "</h1>" +
      '<p class="lede">' + CE.esc(prompt) + "</p>" +
      '<ul class="tiles">' + tiles + "</ul>";
  }

  function viewLeaf(r) {
    var rest = CE.restaurant(r.node.block);
    var here = CE.hrefFor(r.trail, r.trail.length - 1);
    var elsewhere = CE.trailsTo(rest.id).filter(function (t) {
      return CE.hrefFor(t, t.length - 1) !== here;
    });
    var cuisines = CE.cuisineNames(rest);
    app.innerHTML =
      crumbs(r.trail) +
      '<div class="endstate" role="status">' +
        '<p class="endstate__label">You selected</p>' +
        '<p class="endstate__name">' + CE.esc(rest.name) + "</p>" +
      "</div>" +
      '<table class="attrs"><tbody>' +
        "<tr><th>Food type</th><td>" + (cuisines.length ? CE.esc(cuisines.join(", ")) : "—") + "</td></tr>" +
        "<tr><th>Location</th><td>" + CE.esc(CE.locationName(rest)) + "</td></tr>" +
        "<tr><th>Block ID</th><td>" + CE.esc(rest.id) + "</td></tr>" +
      "</tbody></table>" +
      '<div class="phgrid">' +
        placeholder("Hours") + placeholder("Menu highlights") + placeholder("Map / directions") +
      "</div>" +
      (elsewhere.length ?
        '<h2>Also listed under</h2><ul class="chips">' + elsewhere.map(function (t) {
          // Chip names the categories only; the view name is implied by them.
          var tag = t.slice(1, -1).map(function (n) { return n.name; }).join(" · ");
          return '<li><a class="chip" href="' + CE.hrefFor(t, t.length - 2) + '" data-kind="cross" data-label="Also under: ' +
            CE.esc(tag) + '">' + CE.esc(tag) + "</a></li>";
        }).join("") + "</ul>" : "");
  }

  function placeholder(label) {
    return '<div class="ph"><p class="ph__label">' + CE.esc(label) + " (placeholder)</p>" +
      '<div class="bar bar--80"></div><div class="bar bar--60"></div><div class="bar bar--40"></div></div>';
  }

  function treeList(node, trail) {
    var t = trail.concat([node]);
    var link = '<a href="' + CE.hrefFor(t, t.length - 1) + '" data-kind="map" data-label="Map: ' +
      CE.esc(node.name) + '">' + CE.esc(node.name) + "</a>";
    if (!node.children) return "<li>" + link + "</li>";
    return "<li>" + link + "<ul>" + node.children.map(function (c) { return treeList(c, t); }).join("") + "</ul></li>";
  }

  function viewMap() {
    var cov = coverage();
    app.innerHTML =
      '<p class="eyebrow">Instrument</p>' +
      "<h1>Site map</h1>" +
      '<p class="lede">Both ways in, over the same ' + D.restaurants.length + " restaurants. " +
      '<a href="#/check" data-label="Coverage check">Coverage: ' + cov.reachable + " of " + D.restaurants.length +
      " reachable" + (cov.problems.length ? ", " + CE.plural(cov.problems.length, "problem", "problems") : "") + "</a></p>" +
      '<div class="cols">' + CE.views.map(function (v) {
        return '<div class="col"><ul class="tree">' + treeList(v, []) + "</ul></div>";
      }).join("") + "</div>";
  }

  // ------------------------------------------------------------ coverage
  function coverage() {
    var problems = [];
    var reachable = 0;
    var rows = D.restaurants.map(function (r) {
      var perView = CE.views.map(function (v) {
        return CE.trailsTo(r.id).filter(function (t) { return t[0] === v; });
      });
      var any = perView.some(function (p) { return p.length; });
      if (any) reachable++;
      else problems.push(r.name + " is not reachable in any view.");
      return { r: r, perView: perView };
    });
    CE.emptyCategories.forEach(function (c) { problems.push("Empty category hidden: " + c + "."); });
    CE.views.forEach(function (v) {
      if (CE.depth(v) < 2) problems.push(v.name + " has fewer than two levels.");
    });
    D.tasks.forEach(function (t) {
      t.expect.forEach(function (id) {
        if (!CE.restaurant(id)) problems.push(t.id + " expects unknown restaurant “" + id + "”.");
        else if (!CE.trailsTo(id).length) problems.push(t.id + " expects " + id + ", which is unreachable.");
      });
    });
    return { rows: rows, reachable: reachable, problems: problems };
  }

  function viewCheck() {
    var cov = coverage();
    var unverified = D.restaurants.filter(function (r) { return !r.verified; }).length;
    app.innerHTML =
      '<p class="eyebrow">Instrument</p>' +
      "<h1>Coverage check</h1>" +
      '<p class="lede">' + cov.reachable + " of " + D.restaurants.length + " restaurants reachable in at least one view. " +
      CE.plural(unverified, "restaurant has", "restaurants have") + " unverified location data.</p>" +
      (cov.problems.length ?
        '<ul class="stack">' + cov.problems.map(function (p) { return "<li>" + CE.esc(p) + "</li>"; }).join("") + "</ul>" :
        '<p class="notice">No problems found.</p>') +
      '<div class="scrollx"><table class="logtable"><thead><tr><th>Restaurant</th>' +
      CE.views.map(function (v) { return "<th>" + CE.esc(v.name) + "</th>"; }).join("") +
      "<th>Verified</th></tr></thead><tbody>" +
      cov.rows.map(function (row) {
        return "<tr><td>" + CE.esc(row.r.name) + "</td>" +
          row.perView.map(function (trails) {
            return "<td>" + (trails.length ? trails.map(function (t) {
              return CE.esc(t.slice(1, -1).map(function (n) { return n.name; }).join(" › "));
            }).join("<br>") : "—") + "</td>";
          }).join("") +
          "<td>" + (row.r.verified ? "Yes" : "No") + "</td></tr>";
      }).join("") +
      "</tbody></table></div>";
  }

  // ------------------------------------------------------------ click log
  function viewLog() {
    var entries = CE.log.entries();
    var shown = entries.slice(-200).reverse();
    app.innerHTML =
      '<p class="eyebrow">Instrument</p>' +
      "<h1>Click log</h1>" +
      '<p class="lede">' + CE.plural(entries.length, "click", "clicks") + " recorded in this browser" +
      (entries.length > 200 ? ", newest 200 shown" : "") + ".</p>" +
      '<div class="tools">' +
        '<button type="button" id="lg-json" data-label="Download log JSON">Download JSON</button>' +
        '<button type="button" id="lg-csv" data-label="Download log CSV">Download CSV</button>' +
        '<button type="button" id="lg-copy" data-label="Copy log JSON">Copy JSON</button>' +
        '<button type="button" id="lg-clear" data-label="Clear click log">Clear log</button>' +
        '<span class="hint" id="lg-status" role="status"></span>' +
      "</div>" +
      (shown.length ?
        '<div class="scrollx"><table class="logtable"><thead><tr>' +
        "<th>#</th><th>Time</th><th>Mode</th><th>Task</th><th>Clicked</th><th>From</th><th>To</th>" +
        "</tr></thead><tbody>" +
        shown.map(function (e) {
          return "<tr>" +
            '<td class="num">' + e.seq + "</td>" +
            '<td class="num">' + CE.esc(new Date(e.at).toLocaleTimeString()) + "</td>" +
            "<td>" + CE.esc(e.mode) + "</td>" +
            "<td>" + CE.esc(e.task) + "</td>" +
            "<td>" + CE.esc(e.label) + "</td>" +
            "<td>" + CE.esc(e.from) + "</td>" +
            "<td>" + CE.esc(e.to) + "</td>" +
          "</tr>";
        }).join("") + "</tbody></table></div>" :
        '<p class="empty">No clicks yet. Browse the site and come back.</p>');

    document.getElementById("lg-json").addEventListener("click", function () {
      CE.download("campus-eats-clicks-" + CE.stamp() + ".json", CE.log.json(), "application/json");
    });
    document.getElementById("lg-csv").addEventListener("click", function () {
      CE.download("campus-eats-clicks-" + CE.stamp() + ".csv", CE.log.csv(), "text/csv");
    });
    document.getElementById("lg-copy").addEventListener("click", function () {
      CE.copy(CE.log.json(), "lg-status");
    });
    document.getElementById("lg-clear").addEventListener("click", function () {
      if (!window.confirm("Clear all " + entries.length + " recorded clicks? Download first if you need them.")) return;
      CE.log.clear();
      CE.render();
    });
  }

  function notFound() {
    app.innerHTML =
      "<h1>Page not found</h1>" +
      '<p class="lede">That address doesn\'t match anything in Campus Eats.</p>' +
      '<p><a href="#/" data-label="Home (not found)">Go to the home page</a></p>';
  }

  // ------------------------------------------------------------ router
  var INSTRUMENTS = { map: viewMap, check: viewCheck, log: viewLog, results: function () { CE.test.renderResults(app); } };

  CE.render = function () {
    var hash = window.location.hash || "#/";
    var segments = hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
    var running = CE.test.isActive();

    // During a run, the participant only sees the site and the test cards.
    utilNav.hidden = running;
    homeLink.classList.toggle("is-inert", running && !CE.test.inTask());

    var landing = CE.test.landing();
    if (landing && hash !== landing) { window.location.hash = landing; return; }

    var resolved = segments.length ? CE.resolve(segments) : null;
    if (segments.length === 0 || resolved) {
      if (CE.test.onRoute(hash, resolved)) return;
    }

    CE.test.renderBar(testbar);

    if (segments.length === 0) viewHome();
    else if (resolved && resolved.node.block) viewLeaf(resolved);
    else if (resolved) viewBranch(resolved);
    else if (segments[0] === "test" && segments.length === 1) CE.test.renderPage(app);
    else if (INSTRUMENTS[segments[0]] && segments.length === 1 && !running) INSTRUMENTS[segments[0]]();
    else notFound();

    var title = app.querySelector("h1, .endstate__name");
    var name = title ? title.textContent : D.title;
    document.title = (name === D.title ? "" : name + " — ") + D.title + " (wireframe)";
    window.scrollTo(0, 0);
    app.focus({ preventScroll: true });
  };

  window.addEventListener("hashchange", CE.render);
  setInterval(CE.test.tick, 1000);
  CE.render();
})();
