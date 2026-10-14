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
  // always: show on every screen size (the columns only need them on phones).
  function crumbs(trail, always) {
    var parts = ['<a href="#/" data-kind="crumb" data-label="Home (breadcrumb)">Home</a>'];
    trail.forEach(function (n, i) {
      if (i === trail.length - 1) {
        parts.push('<span aria-current="page">' + CE.esc(n.name) + "</span>");
      } else {
        parts.push('<a href="' + CE.hrefFor(trail, i) + '" data-kind="crumb" data-label="' +
          CE.esc(n.name) + ' (breadcrumb)">' + CE.esc(n.name) + "</a>");
      }
    });
    return '<nav class="crumbs' + (always ? "" : " miller-crumbs") + '" aria-label="Breadcrumb">' + parts.join('<span class="crumbs__sep">›</span>') + "</nav>";
  }

  function subFor(node) {
    return node.children ? CE.plural(CE.countLeaves(node), "restaurant", "restaurants") : "";
  }

  // ------------------------------------------------------------ pages
  function viewHome() {
    // Each option in a door is its own link, so people can jump straight to
    // a category; the door's heading still opens the view at the top.
    var tiles = CE.views.map(function (v) {
      return '<li><div class="tile tile--door">' +
        '<a class="tile__head" href="#/' + v.key + '" data-kind="tile" data-label="' + CE.esc(v.name) + '">' +
          '<span class="tile__name">' + CE.esc(v.name) + "</span>" +
          '<span class="tile__sub">' + CE.esc(v.blurb) + "</span>" +
        "</a>" +
        '<ul class="tile__list">' + v.children.map(function (c) {
          return '<li><a class="tile__opt" href="' + CE.hrefFor([v, c], 1) + '" data-kind="tile" data-label="' +
            CE.esc(c.name) + ' (home shortcut)">' + CE.esc(c.name) + "</a></li>";
        }).join("") + "</ul>" +
        "</div></li>";
    }).join("");
    app.innerHTML =
      "<h1>" + CE.esc(D.title) + "</h1>" +
      '<p class="lede">' + CE.esc(D.tagline) + " Two ways to look:</p>" +
      '<ul class="tiles tiles--doors">' + tiles + "</ul>";
  }

  // Browse pages are Finder-style columns: one column per level along the
  // route, the chosen item in each column marked, and the restaurant's
  // details in a final panel. The route still names exactly one node, so
  // the click log, test mode and the back button work as before.
  function viewTabs(current) {
    return '<nav class="tabs" aria-label="Ways to browse">' + CE.views.map(function (v) {
      return '<a class="tab' + (v === current ? " is-current" : "") + '" href="#/' + v.key + '"' +
        (v === current ? ' aria-current="true"' : "") +
        ' data-kind="tab" data-label="' + CE.esc(v.name) + ' (tab)">' + CE.esc(v.name) + "</a>";
    }).join("") + "</nav>";
  }

  function column(trail, selectedKey, isCurrent) {
    var node = trail[trail.length - 1];
    var here = CE.hrefFor(trail, trail.length - 1);
    // Name the parent too: "On Campus" alone is ambiguous two levels down.
    var heading = trail.length === 1 ? node.short :
      (trail.length > 2 ? trail[trail.length - 2].name + " · " : "") + node.name;
    var items = node.children.map(function (c) {
      var selected = c.key === selectedKey;
      return '<li><a class="colitem' + (selected ? " is-selected" : "") + '" href="' + here + "/" + c.key + '"' +
        (selected ? ' aria-current="true"' : "") +
        ' data-kind="tile" data-label="' + CE.esc(c.name) + '">' +
        '<span class="colitem__name">' + CE.esc(c.name) + "</span>" +
        (c.children ? '<span class="colitem__sub">' + CE.esc(subFor(c)) + '</span><span class="colitem__go" aria-hidden="true">›</span>' : "") +
        "</a></li>";
    }).join("");
    return '<section class="miller__col' + (isCurrent ? " is-current" : "") + '">' +
      '<h2 class="miller__head">' + CE.esc(heading) + "</h2>" +
      '<ul class="collist">' + items + "</ul></section>";
  }

  // A node whose children are restaurants: the point where columns give way
  // to restaurant cards.
  function listsRestaurants(node) {
    return !!(node.children && node.children[0] && node.children[0].block);
  }

  function trailName(trail) {
    return trail.slice(1).map(function (n) { return n.name; }).join(" · ");
  }

  // Sibling categories as chips, so people can switch (e.g. On Campus ↔
  // Near Campus) without backing out.
  function siblingChips(trail) {
    var parentTrail = trail.slice(0, -1);
    var parent = parentTrail[parentTrail.length - 1];
    var current = trail[trail.length - 1];
    if (!parent || parent.children.length < 2) return "";
    return '<nav aria-label="Other choices under ' + CE.esc(parent.name) + '"><ul class="chips chips--siblings">' +
      parent.children.map(function (c) {
        var on = c === current;
        return '<li><a class="chip' + (on ? " is-current" : "") + '" href="' + CE.hrefFor(parentTrail.concat([c]), parentTrail.length) + '"' +
          (on ? ' aria-current="true"' : "") +
          ' data-kind="sibling" data-label="' + CE.esc(c.name) + ' (switch)">' + CE.esc(c.name) + "</a></li>";
      }).join("") + "</ul></nav>";
  }

  function viewResults(r) {
    var trail = r.trail;
    var here = CE.hrefFor(trail, trail.length - 1);
    // Skip the attribute this view already filtered on; every card would
    // repeat it.
    var byFood = r.view.key === "food";
    var cards = r.node.children.map(function (c) {
      var rest = CE.restaurant(c.block);
      var cuisines = CE.cuisineNames(rest);
      var info = CE.details(rest.id);
      return '<li><a class="rcard" href="' + here + "/" + c.key + '" data-kind="tile" data-label="' + CE.esc(c.name) + '">' +
        '<span class="rcard__name">' + CE.esc(rest.name) + "</span>" +
        '<span class="rcard__meta">' + CE.esc(byFood ? CE.locationName(rest) :
          (cuisines.length ? cuisines.join(", ") : "—")) + "</span>" +
        '<span class="rcard__hours">' + CE.esc(info.hours && info.hours.length ? info.hours.join(" · ") : "Hours not found") + "</span>" +
        '<span class="rcard__go">See details ›</span>' +
        "</a></li>";
    }).join("");
    app.innerHTML =
      viewTabs(r.view) +
      crumbs(trail, true) +
      "<h1>" + CE.esc(trailName(trail)) + "</h1>" +
      '<p class="lede">' + CE.esc(CE.plural(r.node.children.length, "restaurant", "restaurants")) + ". Pick one for details.</p>" +
      siblingChips(trail) +
      '<ul class="rcards">' + cards + "</ul>";
  }

  function viewRestaurant(r) {
    var listTrail = r.trail.slice(0, -1);
    app.innerHTML =
      viewTabs(r.view) +
      crumbs(r.trail, true) +
      '<h1 class="vh">' + CE.esc(r.node.name) + "</h1>" +
      '<div class="restpage">' + detail(r) + "</div>" +
      '<p><a href="' + CE.hrefFor(listTrail, listTrail.length - 1) + '" data-kind="nav" data-label="Back to ' +
        CE.esc(trailName(listTrail)) + '">‹ Back to ' + CE.esc(trailName(listTrail)) + "</a></p>";
  }

  function detail(r) {
    var rest = CE.restaurant(r.node.block);
    var here = CE.hrefFor(r.trail, r.trail.length - 1);
    var elsewhere = CE.trailsTo(rest.id).filter(function (t) {
      return CE.hrefFor(t, t.length - 1) !== here;
    });
    var cuisines = CE.cuisineNames(rest);
    var info = CE.details(rest.id);
    return '<section>' +
      '<div class="endstate" role="status">' +
        '<p class="endstate__label">You selected</p>' +
        '<p class="endstate__name">' + CE.esc(rest.name) + "</p>" +
      "</div>" +
      '<table class="attrs"><tbody>' +
        "<tr><th>Food type</th><td>" + (cuisines.length ? CE.esc(cuisines.join(", ")) : "—") + "</td></tr>" +
        "<tr><th>Location</th><td>" + CE.esc(CE.locationName(rest)) + "</td></tr>" +
        "<tr><th>Where</th><td>" + CE.esc(info.where || "Not found") + "</td></tr>" +
        "<tr><th>Block ID</th><td>" + CE.esc(rest.id) + "</td></tr>" +
      "</tbody></table>" +
      infoList("Hours", info.hours) + infoList("Menu highlights", info.menu) +
      (info.note ? '<p class="detail__note">' + CE.esc(info.note) + "</p>" : "") +
      placeholder("Map / directions") +
      (info.source ? '<p class="detail__src">Source: ' + CE.esc(info.source) + ". Checked October 2026.</p>" : "") +
      (elsewhere.length ?
        '<h3 class="detail__h">Also listed under</h3><ul class="chips">' + elsewhere.map(function (t) {
          // Chip names the categories only; the view name is implied by them.
          var tag = t.slice(1, -1).map(function (n) { return n.name; }).join(" · ");
          return '<li><a class="chip" href="' + CE.hrefFor(t, t.length - 2) + '" data-kind="cross" data-label="Also under: ' +
            CE.esc(tag) + '">' + CE.esc(tag) + "</a></li>";
        }).join("") + "</ul>" : "") +
      "</section>";
  }

  function viewColumns(r) {
    var trail = r.trail;
    var isLeaf = !!r.node.block;
    // Columns only for choosing categories; once the list is restaurants,
    // switch to cards with their top-level details.
    if (isLeaf) return viewRestaurant(r);
    if (listsRestaurants(r.node)) return viewResults(r);
    var cols = [];
    trail.forEach(function (node, i) {
      if (!node.children) return;
      var deepest = i === trail.length - 1;
      cols.push(column(trail.slice(0, i + 1), deepest ? null : trail[i + 1].key, deepest));
    });
    cols.push('<div class="miller__ghost" aria-hidden="true">Choose one to see more ←</div>');
    app.innerHTML =
      '<h1 class="vh">' + CE.esc(r.view.name) + "</h1>" +
      viewTabs(r.view) +
      '<p class="lede">' + CE.esc(r.view.blurb) + "</p>" +
      crumbs(trail) +
      '<div class="miller" id="miller">' + cols.join("") + "</div>";
    var miller = document.getElementById("miller");
    miller.scrollLeft = miller.scrollWidth;
  }

  // A researched list (hours, menu), or a plain "not found" when the
  // research came up empty, so the gap is visible rather than faked.
  function infoList(label, items) {
    return '<h3 class="detail__h">' + CE.esc(label) + "</h3>" +
      (items && items.length ?
        '<ul class="detail__list">' + items.map(function (i) { return "<li>" + CE.esc(i) + "</li>"; }).join("") + "</ul>" :
        '<p class="detail__none">Not found yet.</p>');
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
    else if (resolved) viewColumns(resolved);
    else if (segments[0] === "test" && segments.length === 1) CE.test.renderPage(app);
    else if (INSTRUMENTS[segments[0]] && segments.length === 1 && !running) INSTRUMENTS[segments[0]]();
    else notFound();

    var title = app.querySelector("h1");
    var name = title ? title.textContent : D.title;
    document.title = (name === D.title ? "" : name + " — ") + D.title + " (wireframe)";

    // Moving between columns of the same view keeps the screen still;
    // anything else (including restaurant lists and pages) is a new screen
    // and starts at the top.
    var inColumns = resolved && !resolved.node.block && !listsRestaurants(resolved.node);
    var viewKey = resolved ? (inColumns ? resolved.view.key : hash) : null;
    if (!viewKey || viewKey !== lastViewKey) {
      window.scrollTo(0, 0);
      app.focus({ preventScroll: true });
    }
    lastViewKey = viewKey;
  };
  var lastViewKey = null;

  window.addEventListener("hashchange", CE.render);
  setInterval(CE.test.tick, 1000);
  CE.render();
})();
