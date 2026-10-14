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
    var doors = CE.views.map(function (v) {
      return '<li class="door">' +
        '<a class="door__head" href="#/' + v.key + '" data-kind="tile" data-label="' + CE.esc(v.name) + '">' +
          icon(v.icon, "door__icon") +
          '<span class="door__text"><span class="door__name"' + vt("view-" + v.key) + ">" + CE.esc(v.name) + "</span>" +
          '<span class="door__sub">' + CE.esc(v.blurb) + "</span></span>" +
          '<span class="door__arrow" aria-hidden="true">→</span>' +
        "</a>" +
        '<ul class="door__opts">' + v.children.map(function (c) {
          return '<li><a class="opt" href="' + CE.hrefFor([v, c], 1) + '"' + vt("cat-" + v.key + "-" + c.key) + ' data-kind="tile" data-label="' +
            CE.esc(c.name) + ' (home shortcut)">' + icon(c.icon, "opt__icon") + CE.esc(c.name) + "</a></li>";
        }).join("") + "</ul>" +
        "</li>";
    }).join("");
    app.innerHTML =
      '<section class="hero">' +
        '<p class="hero__eyebrow">BYU · Provo</p>' +
        "<h1 class=\"hero__title\">Hungry? <span class=\"hl\">Let's find food.</span></h1>" +
        '<p class="hero__lede">' + CE.esc(D.tagline) + " Pick a way to look.</p>" +
      "</section>" +
      '<ul class="doors">' + doors + "</ul>";
  }

  // Shared view-transition names pair an element on the home page with its
  // counterpart on the browse page (door title ↔ tab, category chip ↔
  // first-column row or sibling pill), so the move between them animates.
  function vt(name) {
    return ' style="view-transition-name: vt-' + name + '; view-transition-class: morph"';
  }

  function icon(glyph, cls) {
    return glyph ? '<span class="' + cls + '" aria-hidden="true">' + glyph + "</span>" : "";
  }

  // Browse pages are Finder-style columns: one column per level along the
  // route, the chosen item in each column marked, and the restaurant's
  // details in a final panel. The route still names exactly one node, so
  // the click log, test mode and the back button work as before.
  function viewTabs(current) {
    return '<nav class="tabs" aria-label="Ways to browse">' + CE.views.map(function (v) {
      return '<a class="tab' + (v === current ? " is-current" : "") + '" href="#/' + v.key + '"' +
        (v === current ? ' aria-current="true"' : "") + vt("view-" + v.key) +
        ' data-kind="tab" data-label="' + CE.esc(v.name) + ' (tab)">' + icon(v.icon, "tab__icon") + CE.esc(v.name) + "</a>";
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
        (trail.length === 1 ? vt("cat-" + node.key + "-" + c.key) : "") +
        ' data-kind="tile" data-label="' + CE.esc(c.name) + '">' +
        icon(c.icon, "colitem__icon") +
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
          (parentTrail.length === 1 ? vt("cat-" + parent.key + "-" + c.key) : "") +
          ' data-kind="sibling" data-label="' + CE.esc(c.name) + ' (switch)">' + icon(c.icon, "chip__icon") + CE.esc(c.name) + "</a></li>";
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
        '<span class="rcard__top">' + icon(CE.iconFor(rest), "rcard__icon") +
          '<span class="rcard__go" aria-hidden="true">→</span></span>' +
        '<span class="rcard__name">' + CE.esc(rest.name) + "</span>" +
        '<span class="rcard__meta">' + CE.esc(byFood ? CE.locationName(rest) :
          (cuisines.length ? cuisines.join(", ") : "Something different")) + "</span>" +
        '<span class="rcard__hours">' + CE.esc(info.hours && info.hours.length ? info.hours.join(" · ") : "Hours not listed yet") + "</span>" +
        "</a></li>";
    }).join("");
    app.innerHTML =
      viewTabs(r.view) +
      crumbs(trail, true) +
      '<div class="pagehead">' + icon(trail[1].icon, "pagehead__icon") + "<div>" +
        "<h1>" + CE.esc(trailName(trail)) + "</h1>" +
        '<p class="lede">' + CE.esc(CE.plural(r.node.children.length, "restaurant", "restaurants")) + ". Pick one for details.</p>" +
      "</div></div>" +
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
      '<p><a class="backlink" href="' + CE.hrefFor(listTrail, listTrail.length - 1) + '" data-kind="nav" data-label="Back to ' +
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
    // Maps search on the name plus address; opens outside the prototype.
    var mapsUrl = "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(rest.name + ", " + (info.where || "") + ", Provo, UT");
    return '<section class="rest">' +
      '<div class="rest__hero" role="status">' +
        icon(CE.iconFor(rest), "rest__icon") +
        "<div>" +
          '<p class="rest__label">You selected</p>' +
          '<p class="rest__name">' + CE.esc(rest.name) + "</p>" +
          '<ul class="tags">' +
            cuisines.map(function (n) { return '<li class="tag">' + CE.esc(n) + "</li>"; }).join("") +
            '<li class="tag tag--place">' + CE.esc(CE.locationName(rest)) + "</li>" +
          "</ul>" +
        "</div>" +
      "</div>" +
      '<div class="rest__grid">' +
        infoCard("🕒", "Hours", info.hours) +
        infoCard("🍽️", "Menu highlights", info.menu,
          info.menuUrl ?
            '<a class="infocard__link" href="' + CE.esc(info.menuUrl) + '" target="_blank" rel="noopener" data-kind="menu" data-label="Menu: ' +
              CE.esc(rest.name) + '">' + CE.esc(info.menuLabel || "Full menu") + " ↗</a>" :
            '<p class="infocard__none">No online menu found.</p>') +
        '<div class="infocard infocard--where"><h3 class="infocard__h">' + icon("📍", "infocard__icon") + "Where</h3>" +
          '<p class="infocard__text">' + CE.esc(info.where || "Address not found yet.") + "</p>" +
          (info.where ? '<a class="btn btn--main" href="' + mapsUrl + '" target="_blank" rel="noopener" data-kind="maps" data-label="Map: ' +
            CE.esc(rest.name) + '">Open in Maps ↗</a>' : "") +
        "</div>" +
      "</div>" +
      (info.note ? '<p class="callout">' + CE.esc(info.note) + "</p>" : "") +
      (elsewhere.length ?
        '<h3 class="section-h">Also listed under</h3><ul class="chips">' + elsewhere.map(function (t) {
          // Chip names the categories only; the view name is implied by them.
          var tag = t.slice(1, -1).map(function (n) { return n.name; }).join(" · ");
          return '<li><a class="chip" href="' + CE.hrefFor(t, t.length - 2) + '" data-kind="cross" data-label="Also under: ' +
            CE.esc(tag) + '">' + CE.esc(tag) + "</a></li>";
        }).join("") + "</ul>" : "") +
      (info.source ? '<p class="finesrc">Source: ' + CE.esc(info.source) + ", checked October 2026 · ID " + CE.esc(rest.id) + "</p>" : "") +
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
    cols.push('<div class="miller__ghost" aria-hidden="true"><span class="miller__ghosticon">👈</span>Pick one to keep going</div>');
    app.innerHTML =
      '<h1 class="vh">' + CE.esc(r.view.name) + "</h1>" +
      viewTabs(r.view) +
      '<p class="lede">' + CE.esc(r.view.blurb) + "</p>" +
      crumbs(trail) +
      '<div class="miller" id="miller">' + cols.join("") + "</div>";
    var miller = document.getElementById("miller");
    miller.scrollLeft = miller.scrollWidth;
  }

  // A researched list (hours, menu), or a plain "not listed" when the
  // research came up empty, so the gap is visible rather than faked.
  // footer: optional markup under the list (e.g. the full-menu link).
  function infoCard(glyph, label, items, footer) {
    return '<div class="infocard"><h3 class="infocard__h">' + icon(glyph, "infocard__icon") + CE.esc(label) + "</h3>" +
      (items && items.length ?
        '<ul class="infocard__list">' + items.map(function (i) { return "<li>" + CE.esc(i) + "</li>"; }).join("") + "</ul>" :
        '<p class="infocard__none">Not listed yet.</p>') +
      (footer ? '<div class="infocard__foot">' + footer + "</div>" : "") +
      "</div>";
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
    document.body.classList.toggle("is-testing", running);
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
    // Home's headline is a slogan, so the tab just says Campus Eats there.
    var name = title && segments.length ? title.textContent : D.title;
    document.title = (name === D.title ? "" : name + " — ") + D.title;

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

  // Home → browse: the door titles glide up into the tab switcher and the
  // category chips slide into the first column. The click is still logged
  // (capture phase, in logger.js) and the page still renders through the
  // normal hashchange; the transition just waits for that render. Browsers
  // without view transitions, or with reduced motion on, navigate as usual.
  var calm = window.matchMedia("(prefers-reduced-motion: reduce)");
  document.addEventListener("click", function (e) {
    var link = e.target.closest(".door__head, .opt");
    if (!link || !document.startViewTransition || calm.matches) return;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    var target = link.getAttribute("href");
    // Stagger the chips of the chosen door so they land in the column one
    // after another; the delays need a stylesheet (pseudo-elements only).
    var stagger = document.createElement("style");
    stagger.textContent = Array.prototype.map.call(link.closest(".door").querySelectorAll(".opt"), function (o, i) {
      var name = o.style.viewTransitionName;
      return name ? "::view-transition-group(" + name + ") { animation-delay: " + (i * 25) + "ms; }" : "";
    }).join("\n");
    document.head.appendChild(stagger);
    document.documentElement.classList.add("vt-home");
    var t = document.startViewTransition(function () {
      return new Promise(function (done) {
        window.addEventListener("hashchange", function () { done(); }, { once: true });
        setTimeout(done, 600);   // never hang if the hash doesn't change
        window.location.hash = target;
      });
    });
    t.finished.finally(function () {
      document.documentElement.classList.remove("vt-home");
      stagger.remove();
    });
  });
  setInterval(CE.test.tick, 1000);
  CE.render();
})();
