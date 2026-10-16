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

  // Dev options dropdown: close it after a pick, on a click outside, or Esc.
  var devmenu = document.getElementById("devmenu");
  document.addEventListener("click", function (e) {
    if (!devmenu.open) return;
    if (!devmenu.contains(e.target) || e.target.closest(".devmenu__panel a")) devmenu.open = false;
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && devmenu.open) {
      devmenu.open = false;
      devmenu.querySelector("summary").focus();
    }
  });
  var searchState = { query: "" };

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

  // --------------------------------------------------------- search helpers
  function hasActiveSearch() {
    return !!searchState.query;
  }

  function renderDoors() {
    // Each option in a door is its own link, so people can jump straight to
    // a category; the door's heading still opens the view at the top.
    var doors = CE.views.map(function (v) {
      return '<li class="door">' +
        '<a class="door__head" href="#/' + v.key + '" data-kind="tile" data-label="' + CE.esc(v.name) + '">' +
          '<span class="door__text"><span class="door__name">' + CE.esc(v.name) + "</span>" +
          '<span class="door__sub">' + CE.esc(v.blurb) + "</span></span>" +
          '<span class="door__arrow" aria-hidden="true">→</span>' +
        "</a>" +
        '<ul class="door__opts">' + v.children.map(function (c) {
          return '<li><a class="opt" href="' + CE.hrefFor([v, c], 1) + '" data-kind="tile" data-label="' +
            CE.esc(c.name) + ' (home shortcut)">' +
            '<span class="opt__label">' + CE.esc(c.name) + "</span></a></li>";
        }).join("") + "</ul>" +
        "</li>";
    }).join("");
    return '<ul class="doors">' + doors + "</ul>";
  }

  function renderSearchSection() {
    var q = CE.esc(searchState.query);
    var anyActive = hasActiveSearch();

    return '<section class="search-section">' +
      '<form class="searchbar" role="search" id="search-form" novalidate>' +
        '<label class="vh" for="search-input">Search restaurants by name, food type, or location</label>' +
        '<div class="searchbar__wrap">' +
          // The × sits inside the field and clears the search. It's
          // always rendered so it can appear as soon as typing starts.
          '<div class="searchbar__field">' +
            '<input type="search" id="search-input" class="searchbar__input"' +
              ' placeholder="Search by food, restaurant, or location\u2026"' +
              ' value="' + q + '" autocomplete="off" spellcheck="false">' +
            '<button type="button" id="search-clear" class="searchbar__x"' + (anyActive ? "" : " hidden") +
              ' aria-label="Clear search" data-kind="search" data-label="Clear search">' +
              '<span aria-hidden="true">\u00d7</span></button>' +
          "</div>" +
          '<button type="submit" class="searchbar__btn" data-kind="search" data-label="Search button">Search</button>' +
        "</div>" +
      "</form>" +
    "</section>";
  }

  function renderSearchCard(r) {
    var cuisines = CE.cuisineNames(r);
    var info = CE.details(r.id);
    var trails = CE.trailsTo(r.id);
    var href = trails.length ? CE.hrefFor(trails[0], trails[0].length - 1) : "#/";
    var hours = info.hours && info.hours.length ? info.hours[0] : "Hours not listed yet";
    return '<li><a class="rcard" href="' + href + '" data-kind="tile" data-label="' + CE.esc(r.name) + ' (search result)">' +
      '<span class="rcard__go" aria-hidden="true">\u2192</span>' +
      '<span class="rcard__name">' + CE.esc(r.name) + "</span>" +
      '<span class="rcard__meta">' + CE.esc(cuisines.length ? cuisines.join(", ") : "Something different") + "</span>" +
      '<span class="rcard__loc">' + CE.esc(CE.locationName(r)) + "</span>" +
      '<span class="rcard__hours">' + CE.esc(hours) + "</span>" +
    "</a></li>";
  }

  function renderSearchResults() {
    var results = CE.search.run(searchState.query, { cuisine: null, campus: null, area: null });
    if (!results.length) {
      return '<p class="search-empty" role="status">' +
        '<strong>No restaurants matched.</strong> Try different keywords.' +
      "</p>";
    }
    return '<p class="lede" role="status" aria-live="polite">' +
      CE.esc(CE.plural(results.length, "restaurant", "restaurants")) + " found</p>" +
      '<ul class="rcards">' + results.map(renderSearchCard).join("") + "</ul>";
  }

  // Search results live on home, so a search typed on a browse step goes
  // back there; clearing the field on a browse step just refreshes the bar.
  // pendingSearchFocus is the caret position to restore after the re-render.
  var pendingSearchFocus = null;
  function isHome() {
    var h = window.location.hash;
    return !h || h === "#" || h === "#/";
  }
  function showSearch(caret) {
    pendingSearchFocus = caret;
    if (isHome()) { viewHome(); focusSearch(); }
    else if (searchState.query) window.location.hash = "#/";   // CE.render restores focus
    else CE.render();
  }
  function focusSearch() {
    var caret = pendingSearchFocus;
    pendingSearchFocus = null;
    var input = document.getElementById("search-input");
    if (!input || caret === null) return;
    input.focus({ preventScroll: true });
    try { input.setSelectionRange(caret, caret); } catch (e) { /* not all inputs allow it */ }
  }

  function attachSearchListeners() {
    var form = document.getElementById("search-form");
    var input = document.getElementById("search-input");
    if (!form || !input) return;

    var timer;
    var clearBtn = document.getElementById("search-clear");
    input.addEventListener("input", function () {
      // Show or hide the × right away, not after the search re-renders.
      if (clearBtn) clearBtn.hidden = !input.value.trim();
      clearTimeout(timer);
      timer = setTimeout(function () {
        var q = input.value.trim();
        if (q === searchState.query) return;
        searchState.query = q;
        showSearch(input.selectionStart);
      }, 220);
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearTimeout(timer);
      searchState.query = input.value.trim();
      showSearch(null);
    });

    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        clearTimeout(timer);
        searchState = { query: "" };
        showSearch(0);
      });
    }

  }

  // ------------------------------------------------------------ pages
  // Home and every browse step share one page: the headline and search stay
  // at the top, and only the browse area underneath changes (the two cards,
  // then tabs and columns, restaurant cards, a restaurant). Routes still
  // change per step, so the back button, click log and test mode still work.
  function onePage(browseHtml, isHome) {
    // Hide search during an active test task to keep tree-test paths clean.
    var inTestTask = CE.test && CE.test.inTask && CE.test.inTask();
    // The headline is the page's h1 only on home; browse steps keep their own.
    var tag = isHome ? "h1" : "p";
    app.innerHTML =
      '<section class="hero">' +
        '<p class="hero__eyebrow">BYU \u00b7 Provo</p>' +
        "<" + tag + " class=\"hero__title\">Hungry? <span class=\"hl\">Let's find food.</span></" + tag + ">" +
        '<p class="hero__lede">' + CE.esc(D.tagline) + " Pick a way to look.</p>" +
      "</section>" +
      (inTestTask ? "" : renderSearchSection()) +
      '<div class="browse" id="browse" tabindex="-1">' + browseHtml + "</div>";
    if (!inTestTask) attachSearchListeners();
  }

  function viewHome() {
    var inTestTask = CE.test && CE.test.inTask && CE.test.inTask();
    onePage(!inTestTask && hasActiveSearch() ? renderSearchResults() : renderDoors(), true);
  }


  // Browse pages are Finder-style columns: one column per level along the
  // route, the chosen item in each column marked, and the restaurant's
  // details in a final panel. The route still names exactly one node, so
  // the click log, test mode and the back button work as before.
  function viewTabs(current) {
    return '<nav class="tabs" aria-label="Ways to browse">' + CE.views.map(function (v) {
      return '<a class="tab' + (v === current ? " is-current" : "") + '" href="#/' + v.key + '"' +
        (v === current ? ' aria-current="true"' : "") +
        ' data-kind="tab" data-label="' + CE.esc(v.name) + ' (tab)">' +
        '<span class="tab__label">' + CE.esc(v.name) + "</span></a>";
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
          ' data-kind="sibling" data-label="' + CE.esc(c.name) + ' (switch)">' +
          '<span class="chip__label">' + CE.esc(c.name) + "</span></a></li>";
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
        '<span class="rcard__go" aria-hidden="true">→</span>' +
        '<span class="rcard__name">' + CE.esc(rest.name) + "</span>" +
        '<span class="rcard__meta">' + CE.esc(byFood ? CE.locationName(rest) :
          (cuisines.length ? cuisines.join(", ") : "Something different")) + "</span>" +
        '<span class="rcard__hours">' + CE.esc(info.hours && info.hours.length ? info.hours.join(" · ") : "Hours not listed yet") + "</span>" +
        "</a></li>";
    }).join("");
    onePage(
      viewTabs(r.view) +
      crumbs(trail, true) +
      '<div class="pagehead"><div>' +
        "<h1>" + CE.esc(trailName(trail)) + "</h1>" +
        '<p class="lede">' + CE.esc(CE.plural(r.node.children.length, "restaurant", "restaurants")) + ". Pick one for details.</p>" +
      "</div></div>" +
      siblingChips(trail) +
      '<ul class="rcards">' + cards + "</ul>");
  }

  function viewRestaurant(r) {
    var listTrail = r.trail.slice(0, -1);
    onePage(
      viewTabs(r.view) +
      crumbs(r.trail, true) +
      '<h1 class="vh">' + CE.esc(r.node.name) + "</h1>" +
      '<div class="restpage">' + detail(r) + "</div>" +
      '<p><a class="backlink" href="' + CE.hrefFor(listTrail, listTrail.length - 1) + '" data-kind="nav" data-label="Back to ' +
        CE.esc(trailName(listTrail)) + '">‹ Back to ' + CE.esc(trailName(listTrail)) + "</a></p>");
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
        infoCard("Hours", info.hours) +
        infoCard("Menu highlights", info.menu,
          info.menuUrl ?
            '<a class="infocard__link" href="' + CE.esc(info.menuUrl) + '" target="_blank" rel="noopener" data-kind="menu" data-label="Menu: ' +
              CE.esc(rest.name) + '">' + CE.esc(info.menuLabel || "Full menu") + " ↗</a>" :
            '<p class="infocard__none">No online menu found.</p>') +
        '<div class="infocard infocard--where"><h3 class="infocard__h">Where</h3>' +
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
    cols.push('<div class="miller__ghost" aria-hidden="true">← Pick one to keep going</div>');
    onePage(
      '<h1 class="vh">' + CE.esc(r.view.name) + "</h1>" +
      viewTabs(r.view) +
      '<p class="lede">' + CE.esc(r.view.blurb) + "</p>" +
      crumbs(trail) +
      '<div class="miller" id="miller">' + cols.join("") + "</div>");
    var miller = document.getElementById("miller");
    miller.scrollLeft = miller.scrollWidth;
  }

  // A researched list (hours, menu), or a plain "not listed" when the
  // research came up empty, so the gap is visible rather than faked.
  // footer: optional markup under the list (e.g. the full-menu link).
  function infoCard(label, items, footer) {
    return '<div class="infocard"><h3 class="infocard__h">' + CE.esc(label) + "</h3>" +
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

    var inColumns = resolved && !resolved.node.block && !listsRestaurants(resolved.node);
    var kind = segments.length === 0 ? "home" : !resolved ? "other" :
      resolved.node.block ? "restaurant" : inColumns ? "columns" : "results";

    // Within the one-page flow the screen doesn't jump to the top: it only
    // scrolls if the browse area has gone above the fold, and just enough to
    // bring it back. Instrument pages are separate and start at the top.
    var browse = document.getElementById("browse");
    if (lastRoute && lastRoute.hash !== hash) {
      if (browse && ONE_PAGE[kind] && ONE_PAGE[lastRoute.kind]) {
        var top = browse.getBoundingClientRect().top;
        if (top < 0) window.scrollBy(0, top - 16);
        browse.focus({ preventScroll: true });
      } else {
        window.scrollTo(0, 0);
        app.focus({ preventScroll: true });
      }
    }
    entrance(hash, segments.length, kind);
    if (pendingSearchFocus !== null) focusSearch();
  };

  // Only what's new animates, sliding a little from the side you're heading
  // toward: deeper comes in from the right, back from the left, and a
  // sideways switch (another tab, pill or row) just fades. Anything that
  // didn't change (header, tabs, columns you've already picked from) stays
  // still, so there's always something fixed to look at.
  var lastRoute = null;
  var BROWSE = { columns: 1, results: 1, restaurant: 1 };
  var ONE_PAGE = { home: 1, columns: 1, results: 1, restaurant: 1 };
  function entrance(hash, depth, kind) {
    var prev = lastRoute;
    lastRoute = { hash: hash, depth: depth, kind: kind };
    if (!prev || prev.hash === hash) return;
    var dir = depth > prev.depth ? "fwd" : depth < prev.depth ? "back" : "fade";
    var els;
    if (kind === "columns" && prev.kind === "columns") {
      // Within the columns: the newest column (and the empty hint) comes in;
      // backing out only redraws the hint.
      els = app.querySelectorAll(dir === "back" ? ".miller__ghost" : ".miller__col.is-current, .miller__ghost");
    } else if (kind === "results" && prev.kind === "results") {
      // Switching pills: the pills stay, the heading and cards change.
      els = app.querySelectorAll(".pagehead, .rcards");
    } else {
      // A new kind of page: the browse area (never the headline or search
      // above it), except the tabs and breadcrumbs, which stay put when
      // moving between browse steps.
      var keep = BROWSE[kind] && BROWSE[prev.kind];
      var area = document.getElementById("browse") || app;
      els = Array.prototype.filter.call(area.children, function (el) {
        return !(keep && el.matches(".tabs, .crumbs"));
      });
    }
    Array.prototype.forEach.call(els, function (el) {
      el.classList.add("enter-" + dir);
      el.addEventListener("animationend", function () { el.classList.remove("enter-" + dir); }, { once: true });
    });
  }

  window.addEventListener("hashchange", CE.render);

  setInterval(CE.test.tick, 1000);
  CE.render();
})();
