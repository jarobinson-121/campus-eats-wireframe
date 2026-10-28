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
  // "Start over" goes home with an empty search box.
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-clear-search]")) CE.clearSearch();
  });

  // One filter-token menu open at a time; a click elsewhere or Escape
  // closes it.
  document.addEventListener("click", function (e) {
    Array.prototype.forEach.call(document.querySelectorAll(".pick__menu-wrap[open]"), function (d) {
      if (!d.contains(e.target)) d.open = false;
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      Array.prototype.forEach.call(document.querySelectorAll(".pick__menu-wrap[open]"), function (d) {
        d.open = false;
        d.querySelector("summary").focus();
      });
    }
    if (e.key === "Escape" && devmenu.open) {
      devmenu.open = false;
      devmenu.querySelector("summary").focus();
    }
  });
  var searchState = { query: "" };

  // Test mode empties the box at the start of each task.
  CE.clearSearch = function () { searchState = { query: "" }; };

  // Every new, non-empty query is part of a think-aloud task's path.
  function setQuery(q) {
    if (q && q !== searchState.query) CE.test.noteSearch(q);
    searchState.query = q;
  }

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

  // A restaurant's photo, or a placeholder with its initials when none was
  // found. cls sizes it (rcard__img on cards, rest__photo on its page).
  function photo(rest, cls) {
    var p = D.photos && D.photos[rest.id];
    if (!p) {
      var initials = rest.name.replace(/^The /, "").split(/\s+/).slice(0, 2)
        .map(function (w) { return w.charAt(0); }).join("").toUpperCase();
      return '<div class="' + cls + ' photo--none" aria-hidden="true"><span>' + CE.esc(initials) + "</span></div>";
    }
    return '<img class="' + cls + (p.fit === "contain" ? " photo--contain" : "") + '" src="' + CE.esc(p.hero) +
      '" alt="' + CE.esc(p.alt) + '" loading="lazy">' +
      // Stock dish photos say so, so nobody takes them for the real place.
      (p.generic ? '<span class="photo__badge">Representative photo</span>' : "");
  }

  function subFor(node) {
    if (!node.children) return "";
    return (node.desc ? node.desc + " \u00b7 " : "") + CE.plural(CE.countLeaves(node), "restaurant", "restaurants");
  }

  // --------------------------------------------------------- search helpers
  function hasActiveSearch() {
    return !!searchState.query;
  }

  // A door's row of shortcut links, one per child of the node at the end of
  // trail.
  function opts(children, trail) {
    return '<ul class="door__opts">' + children.map(function (c) {
      return '<li><a class="opt" href="' + CE.hrefFor(trail.concat([c]), trail.length) + '" data-kind="tile" data-label="' +
        CE.esc(c.name) + ' (home shortcut)"' + (c.desc ? ' title="' + CE.esc(c.desc) + '"' : "") + ">" +
        '<span class="opt__label">' + CE.esc(c.name) + "</span></a></li>";
    }).join("") + "</ul>";
  }

  // Door icons: utensils for food type, a map pin for location.
  var DOOR_ICONS = {
    food: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
    place: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'
  };

  function renderDoors() {
    // Each option in a door is its own link, so people can jump straight to
    // a category; the door's heading still opens the view at the top.
    var doors = CE.views.map(function (v) {
      return '<li class="door">' +
        '<a class="door__head" href="#/' + v.key + '" data-kind="tile" data-label="' + CE.esc(v.name) + '">' +
          '<span class="door__icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26" fill="none"' +
            ' stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + DOOR_ICONS[v.key] + "</svg></span>" +
          '<span class="door__text"><span class="door__name">' + CE.esc(v.name) + "</span>" +
          '<span class="door__sub">' + CE.esc(v.blurb) + "</span></span>" +
          '<span class="door__arrow" aria-hidden="true">→</span>' +
        "</a>" +
        (v.grouped ? v.children.map(function (g) {
          return '<div class="door__group">' +
            '<a class="door__grouphead" href="' + CE.hrefFor([v, g], 1) + '" data-kind="tile" data-label="' +
              CE.esc(g.name) + ' (home shortcut)">' + CE.esc(g.name) + "</a>" +
            opts(g.children, [v, g]) + "</div>";
        }).join("") : opts(v.children, [v])) +
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
              ' placeholder="Try \u201ctacos\u201d, \u201cJ Dawgs\u201d, \u201cbakery\u201d, or \u201con campus\u201d"' +
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
    // ?q= lets the restaurant page lead back to these results.
    var href = trails.length ? CE.hrefFor(trails[0], trails[0].length - 1) +
      "?q=" + encodeURIComponent(searchState.query) : "#/";
    var hours = info.hours && info.hours.length ? info.hours[0] : "Hours not listed yet";
    return '<li><a class="rcard" href="' + href + '" data-kind="tile" data-label="' + CE.esc(r.name) + ' (search result)">' +
      photo(r, "rcard__img") +
      '<span class="rcard__go" aria-hidden="true">\u2192</span>' +
      '<span class="rcard__name">' + CE.esc(r.name) + "</span>" +
      '<span class="rcard__meta">' + CE.esc(cuisines.length ? cuisines.join(", ") : "Something different") + "</span>" +
      '<span class="rcard__loc">' + CE.esc(CE.locationName(r)) + "</span>" +
      '<span class="rcard__hours">' + CE.esc(hours) + "</span>" +
    "</a></li>";
  }

  // Offered when a search finds nothing.
  var EXAMPLE_SEARCHES = ["pizza", "hot dog", "bakery", "on campus"];

  function renderSearchResults() {
    var found = CE.search.find(searchState.query, { cuisine: null, campus: null, area: null });
    var results = found.results;
    var q = "\u201c" + searchState.query + "\u201d";
    if (!results.length) {
      return '<div class="search-empty" role="status">' +
        "<strong>No restaurants matched " + CE.esc(q) + ".</strong>" +
        '<p>Try one of these, or browse instead.</p>' +
        '<ul class="chips">' + EXAMPLE_SEARCHES.map(function (x) {
          return '<li><button type="button" class="chip" data-query="' + CE.esc(x) + '" data-kind="search"' +
            ' data-label="Example search: ' + CE.esc(x) + '"><span class="chip__label">' + CE.esc(x) + "</span></button></li>";
        }).join("") + "</ul>" +
        '<p class="search-empty__browse">' + CE.views.map(function (v) {
          return '<a href="#/' + v.key + '" data-kind="tile" data-label="' + CE.esc(v.name) + ' (no results)">' +
            CE.esc(v.name) + " \u2192</a>";
        }).join("") + "</p>" +
      "</div>";
    }
    return '<p class="lede" role="status" aria-live="polite">' +
      (found.closeMatch ? "No exact match. Showing close matches: " : "") +
      CE.esc(CE.plural(results.length, "restaurant", "restaurants")) + " for " + CE.esc(q) + "</p>" +
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
        setQuery(q);
        showSearch(input.selectionStart);
      }, 220);
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearTimeout(timer);
      setQuery(input.value.trim());
      showSearch(null);
    });

    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        clearTimeout(timer);
        searchState = { query: "" };
        showSearch(0);
      });
    }

    // Example searches in the no-results message.
    var browse = document.getElementById("browse");
    if (browse) {
      browse.addEventListener("click", function (e) {
        var b = e.target.closest("[data-query]");
        if (!b) return;
        setQuery(b.getAttribute("data-query"));
        showSearch(null);
      });
    }

  }

  // ------------------------------------------------------------ pages
  // Home and every browse step share one page: the headline and search stay
  // at the top, and only the browse area underneath changes (the two cards,
  // then tabs and columns, restaurant cards, a restaurant). Routes still
  // change per step, so the back button, click log and test mode still work.
  //
  // heading: on browse steps the big headline becomes a compact header that
  // names where you are (Food Type, Asian, Asian · Off Campus, Cupbop), and
  // it's the page's only h1. Leave it out for home.
  function onePage(browseHtml, heading) {
    // Hidden during tree-test tasks to keep their paths clean.
    var noSearch = !CE.test.searchAllowed();
    app.innerHTML =
      (heading ?
        '<section class="hero hero--step"><h1 class="hero__title">' + CE.esc(heading) + "</h1></section>" :
        '<section class="hero">' +
          '<p class="hero__eyebrow">BYU \u00b7 Provo</p>' +
          "<h1 class=\"hero__title\">Hungry? <span class=\"hl\">Let's find food.</span></h1>" +
          '<p class="hero__lede">' + CE.esc(D.tagline) + " Pick a way to look.</p>" +
        "</section>") +
      (noSearch ? "" : renderSearchSection()) +
      '<div class="browse" id="browse" tabindex="-1">' + browseHtml + "</div>";
    if (!noSearch) attachSearchListeners();
  }

  function viewHome() {
    onePage(CE.test.searchAllowed() && hasActiveSearch() ? renderSearchResults() : renderDoors());
  }

  // Header for a browse step: the view on its own ("Food Type"), then the
  // categories chosen ("Asian · Off Campus").
  function stepHeading(trail) {
    return trail.length === 1 ? trail[0].name.replace(/^Browse by /, "") : trailName(trail);
  }

  function viewTabs(current) {
    return '<nav class="tabs" aria-label="Ways to browse">' + CE.views.map(function (v) {
      return '<a class="tab' + (v === current ? " is-current" : "") + '" href="#/' + v.key + '"' +
        (v === current ? ' aria-current="true"' : "") +
        ' data-kind="tab" data-label="' + CE.esc(v.name) + ' (tab)">' +
        '<span class="tab__label">' + CE.esc(v.name) + "</span></a>";
    }).join("") + "</nav>";
  }

  // Choices already made, as filter tokens ("Food type: Asian ▾ ×"). A
  // token opens a menu of its siblings to switch to; × removes that choice
  // (and the ones after it).
  function pickBar(trail) {
    var tokens = trail.slice(1).map(function (n, i) {
      var parentTrail = trail.slice(0, i + 1);
      var parent = parentTrail[parentTrail.length - 1];
      var label = parent.childLabel || parent.name;
      var menu = parent.children.map(function (c) {
        var on = c === n;
        return '<li><a class="pick__opt' + (on ? " is-current" : "") + '" href="' +
          CE.hrefFor(parentTrail.concat([c]), parentTrail.length) + '"' + (on ? ' aria-current="true"' : "") +
          ' data-kind="sibling" data-label="' + CE.esc(c.name) + ' (switch)">' +
          '<span>' + CE.esc(c.name) + '</span><span class="pick__count">' + CE.countLeaves(c) + "</span></a></li>";
      }).join("");
      return '<li class="pick">' +
        '<details class="pick__menu-wrap">' +
          '<summary class="pick__btn" data-kind="filter" data-label="' + CE.esc(label + ": " + n.name) + ' (change)">' +
            '<span class="pick__label">' + CE.esc(label) + "</span>" +
            '<span class="pick__value">' + CE.esc(n.name) + "</span>" +
            '<span class="pick__caret" aria-hidden="true">\u25be</span>' +
          "</summary>" +
          '<ul class="pick__menu">' + menu + "</ul>" +
        "</details>" +
        '<a class="pick__x" href="' + CE.hrefFor(parentTrail, parentTrail.length - 1) + '" aria-label="Remove ' + CE.esc(n.name) + '"' +
          ' data-kind="filter" data-label="Remove ' + CE.esc(n.name) + '">\u00d7</a>' +
      "</li>";
    }).join("");
    return tokens ? '<ul class="pickbar" aria-label="Your choices">' + tokens + "</ul>" : "";
  }

  // The next choice, as a grid of tiles: name, landmark line, count.
  function pickTiles(trail) {
    var node = trail[trail.length - 1];
    var here = CE.hrefFor(trail, trail.length - 1);
    return '<section class="picks">' +
      '<h2 class="picks__q">' + CE.esc(node.childLabel || node.name) + "</h2>" +
      '<ul class="picktiles">' + node.children.map(function (c) {
        return '<li><a class="picktile" href="' + here + "/" + c.key + '" data-kind="tile" data-label="' + CE.esc(c.name) + '">' +
          '<span class="picktile__name">' + CE.esc(c.name) + "</span>" +
          (c.desc ? '<span class="picktile__desc">' + CE.esc(c.desc) + "</span>" : "") +
          '<span class="picktile__count">' + CE.esc(CE.plural(CE.countLeaves(c), "restaurant", "restaurants")) + "</span>" +
          '<span class="picktile__go" aria-hidden="true">\u2192</span>' +
        "</a></li>";
      }).join("") + "</ul></section>";
  }

  // A node whose children are restaurants: the point where columns give way
  // to restaurant cards.
  function listsRestaurants(node) {
    return !!(node.children && node.children[0] && node.children[0].block);
  }

  // Area labels already say "(Off Campus)", so "Off Campus · South of Campus
  // (Off Campus)" drops the first part.
  function namedByChild(n, child) {
    return !!child && child.name.indexOf("(" + n.name + ")") !== -1;
  }

  function trailName(trail) {
    var t = trail.slice(1);
    return t.filter(function (n, i) { return !namedByChild(n, t[i + 1]); })
      .map(function (n) { return n.name; }).join(" · ");
  }

  // The restaurants under a node, as cards with their top-level details.
  function restaurantCards(r) {
    var here = CE.hrefFor(r.trail, r.trail.length - 1);
    // Skip the attribute this view already filtered on; every card would
    // repeat it.
    var byFood = r.view.key === "food";
    return '<div class="pagehead">' +
        (r.node.desc ? '<p class="pagehead__desc">' + CE.esc(r.node.desc) + "</p>" : "") +
        '<p class="lede">' + CE.esc(CE.plural(r.node.children.length, "restaurant", "restaurants")) + ". Pick one for details.</p>" +
      "</div>" +
      '<ul class="rcards">' + r.node.children.map(function (c) {
        var rest = CE.restaurant(c.block);
        var cuisines = CE.cuisineNames(rest);
        var info = CE.details(rest.id);
        return '<li><a class="rcard" href="' + here + "/" + c.key + '" data-kind="tile" data-label="' + CE.esc(c.name) + '">' +
          photo(rest, "rcard__img") +
          '<span class="rcard__go" aria-hidden="true">→</span>' +
          '<span class="rcard__name">' + CE.esc(rest.name) + "</span>" +
          '<span class="rcard__meta">' + CE.esc(byFood ? CE.locationName(rest) :
            (cuisines.length ? cuisines.join(", ") : "Something different")) + "</span>" +
          '<span class="rcard__hours">' + CE.esc(info.hours && info.hours.length ? info.hours.join(" · ") : "Hours not listed yet") + "</span>" +
          "</a></li>";
      }).join("") + "</ul>";
  }

  // Breadcrumbs for a restaurant opened from search: Home › Search: “q” ›
  // the restaurant. The search crumb goes home, where the results show.
  function searchCrumbs(r) {
    var sep = '<span class="crumbs__sep">›</span>';
    return '<nav class="crumbs" aria-label="Breadcrumb">' +
      '<a href="#/" data-kind="crumb" data-label="Home (breadcrumb)">Home</a>' + sep +
      '<a href="#/" data-kind="crumb" data-label="Search results (breadcrumb)">Search: \u201c' + CE.esc(viaSearch) + '\u201d</a>' + sep +
      '<span aria-current="page">' + CE.esc(r.node.name) + "</span></nav>";
  }

  function viewRestaurant(r) {
    onePage(
      viewTabs(viaSearch ? null : r.view) +
      (viaSearch ? searchCrumbs(r) : crumbs(r.trail)) +
      '<div class="restpage">' + detail(r) + restEnd(r) + "</div>", r.node.name);
  }

  // The page ends with a clear way on: back to the list this restaurant was
  // picked from (search results or the browse list), or start over.
  function restEnd(r) {
    var parent = r.trail.slice(0, -1);
    var back = viaSearch ?
      { href: "#/", label: "Back to search results", sub: "\u201c" + viaSearch + "\u201d" } :
      { href: CE.hrefFor(parent, parent.length - 1), label: "Back to results", sub: trailName(parent) };
    return '<nav class="restend" aria-label="Where to next">' +
      '<a class="btn btn--big restend__back" href="' + back.href + '" data-kind="nav" data-label="' + back.label + '">' +
        '<span aria-hidden="true">\u2190</span> ' + back.label +
        (back.sub ? '<span class="restend__sub">' + CE.esc(back.sub) + "</span>" : "") +
      "</a>" +
      '<a class="btn" href="#/" data-clear-search data-kind="nav" data-label="Start over">Start over</a>' +
    "</nav>";
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
    var pics = (D.photos && D.photos[rest.id]) || {};
    return '<section class="rest">' +
      photo(rest, "rest__photo") +
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
      (pics.dishes && pics.dishes.length ?
        '<h3 class="section-h">From the menu</h3><ul class="dishes">' + pics.dishes.map(function (d) {
          return '<li class="dish"><img class="dish__img' + (pics.fit === "contain" ? " photo--contain" : "") + '" src="' + CE.esc(d.src) + '" alt="' + CE.esc(d.caption) + '" loading="lazy">' +
            '<span class="dish__cap">' + CE.esc(d.caption) + "</span></li>";
        }).join("") + "</ul>" : "") +
      (elsewhere.length ?
        '<h3 class="section-h">Also listed under</h3><ul class="chips">' + elsewhere.map(function (t) {
          // Chip names the categories only; the view name is implied by them.
          var tag = t.slice(1, -1).map(function (n) { return n.name; }).join(" · ");
          return '<li><a class="chip" href="' + CE.hrefFor(t, t.length - 2) + '" data-kind="cross" data-label="Also under: ' +
            CE.esc(tag) + '">' + CE.esc(tag) + "</a></li>";
        }).join("") + "</ul>" : "") +
      (info.source ? '<p class="finesrc">Source: ' + CE.esc(info.source) + ", checked October 2026 · ID " + CE.esc(rest.id) + "</p>" : "") +
      (pics.credits ? '<p class="finesrc">Representative photos from Wikimedia Commons, not taken at this restaurant: ' +
        pics.credits.map(function (c) {
          return '<a href="' + CE.esc(c.url) + '" target="_blank" rel="noopener" data-kind="credit" data-label="Photo credit: ' +
            CE.esc(rest.name) + '">' + CE.esc(c.caption) + "</a> by " + CE.esc(c.author) + " (" + CE.esc(c.license) + ")";
        }).join(" \u00b7 ") + "</p>" : "") +
      (pics.credit ? '<p class="finesrc">Photos: <a href="' + CE.esc(pics.creditUrl) + '" target="_blank" rel="noopener" data-kind="credit" data-label="Photo credit: ' +
        CE.esc(rest.name) + '">' + CE.esc(pics.credit) + " \u2197</a></p>" : "") +
      "</section>";
  }

  // Browse steps: the choices made so far as filter tokens, then the next
  // choice as tiles; at the last level the restaurants show as cards. The
  // route still names exactly one node, so the click log, test mode and the
  // back button work as before.
  function viewBrowse(r) {
    if (r.node.block) return viewRestaurant(r);
    var trail = r.trail;
    var atRestaurants = listsRestaurants(r.node);
    onePage(
      viewTabs(r.view) +
      (trail.length === 1 ? '<p class="lede">' + CE.esc(r.view.blurb) + "</p>" : "") +
      crumbs(trail) +
      pickBar(trail) +
      (atRestaurants ? restaurantCards(r) : pickTiles(trail)),
      stepHeading(trail));
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
    D.tasks.concat(D.thinkAloudTasks || []).forEach(function (t) {
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

  // The query a restaurant was opened from, when its route ends in ?q=.
  var viaSearch = "";

  CE.render = function () {
    var hash = window.location.hash || "#/";
    var qAt = hash.indexOf("?q=");
    viaSearch = qAt === -1 ? "" : decodeURIComponent(hash.slice(qAt + 3));
    if (viaSearch) searchState.query = viaSearch;
    var segments = (qAt === -1 ? hash : hash.slice(0, qAt))
      .replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
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
    else if (resolved) viewBrowse(resolved);
    else if (segments[0] === "test" && segments.length === 1) CE.test.renderPage(app);
    else if (INSTRUMENTS[segments[0]] && segments.length === 1 && !running) INSTRUMENTS[segments[0]]();
    else notFound();

    var title = app.querySelector("h1");
    // Home's headline is a slogan, so the tab just says Campus Eats there.
    var name = title && segments.length ? title.textContent : D.title;
    document.title = (name === D.title ? "" : name + " — ") + D.title;

    var choosing = resolved && !resolved.node.block && !listsRestaurants(resolved.node);
    var kind = segments.length === 0 ? "home" : !resolved ? "other" :
      resolved.node.block ? "restaurant" : choosing ? "steps" : "results";

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
  // didn't change (header, tabs, rows you've already picked from) stays
  // still, so there's always something fixed to look at.
  var lastRoute = null;
  var BROWSE = { steps: 1, results: 1, restaurant: 1 };
  var ROWS = { steps: 1, results: 1 };   // pages with filter tokens
  var ONE_PAGE = { home: 1, steps: 1, results: 1, restaurant: 1 };
  function entrance(hash, depth, kind) {
    var prev = lastRoute;
    lastRoute = { hash: hash, depth: depth, kind: kind };
    if (!prev || prev.hash === hash) return;
    var dir = depth > prev.depth ? "fwd" : depth < prev.depth ? "back" : "fade";
    var els;
    if (kind === "steps" && prev.kind === "steps") {
      // Within the steps: the tokens stay, the tiles change.
      els = app.querySelectorAll(".picks");
    } else if (ROWS[kind] && ROWS[prev.kind]) {
      // Between steps and results: the tokens stay, what's under them changes.
      els = app.querySelectorAll(".picks, .pagehead, .rcards");
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
    // The header names the step, so its text changes each time: fade it.
    var title = ONE_PAGE[kind] && app.querySelector(".hero__title");
    if (title) {
      title.classList.add("enter-fade");
      title.addEventListener("animationend", function () { title.classList.remove("enter-fade"); }, { once: true });
    }
    Array.prototype.forEach.call(els, function (el) {
      el.classList.add("enter-" + dir);
      el.addEventListener("animationend", function () { el.classList.remove("enter-" + dir); }, { once: true });
    });
  }

  window.addEventListener("hashchange", CE.render);

  CE.render();
})();
