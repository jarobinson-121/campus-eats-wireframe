// Campus Eats — client-side search and filter.
//
// Exposes CE.search.run(query, filters) which returns a sorted array of
// restaurant objects from CE_DATA. Every match is done locally; no external
// service is used.
//
// Synonyms and per-restaurant keywords are grounded in the card sort
// vocabulary, the task scenarios in data.js, and the menu highlights in
// details. No restaurant, menu item or address is invented here.
(function () {
  "use strict";

  var CE = window.CE;
  var D = window.CE_DATA;

  // ---------------------------------------------------------------- synonyms
  // Maps a normalized term to additional terms it should also match.
  // Source: card sort category labels ("BBQ", "Healthy", "Asian"), task
  // scenario wording ("mac and cheese", "Korean rice bowl", "street tacos"),
  // and common alternate spellings.
  var SYNONYMS = {
    "bbq":              ["barbecue", "barbeque"],
    "barbecue":         ["bbq", "barbeque"],
    "barbeque":         ["bbq", "barbecue"],
    // Not "roll"/"rolls": those also match bakery sweet rolls. Blue Sushi's
    // own keywords already cover "rolls".
    "sushi":            ["blue sushi", "japanese"],
    "japanese":         ["sushi", "asian"],
    "korean":           ["asian", "cupbop", "korean bbq"],
    "korean bbq":       ["asian", "cupbop"],
    // Not "macaroni": that also matches Aloha Plate's macaroni salad.
    // Roni's own keywords already cover it.
    "mac and cheese":   ["ronis"],
    "mac & cheese":     ["ronis"],
    "mac cheese":       ["ronis"],
    "macaroni":         ["mac and cheese"],
    "grilled cheese":   ["ronis"],
    "hot dog":          ["j dawgs", "hotdog"],
    "hotdog":           ["j dawgs", "hot dog"],
    "dawg":             ["j dawgs"],
    "sandwich":         ["deli", "sub", "blue line"],
    "deli":             ["sandwich", "blue line"],
    "sub":              ["subway", "sandwich"],
    "smoothie":         ["jamba", "juice"],
    "juice":            ["jamba", "smoothie"],
    "acai":             ["jamba", "bowl"],
    "teriyaki":         ["teri gao", "konala", "asian"],
    "tacos":            ["mexican", "taco"],
    "taco":             ["mexican", "tacos"],
    "street taco":      ["don joaquin", "el tio", "taco spot"],
    "street tacos":     ["don joaquin", "el tio", "taco spot"],
    "birria":           ["taco spot", "el tio"],
    "burger":           ["burgers"],
    "burgers":          ["burger"],
    "chicken":          ["fried chicken"],
    "fried chicken":    ["chicken"],
    "wings":            ["chicken"],
    "salad":            ["healthy", "greenhouse"],
    "bowl":             ["healthy", "hawaiian", "asian"],
    "ice cream":        ["creamery", "byu creamery"],
    "creamery":         ["ice cream", "byu creamery"],
    "plate lunch":      ["hawaiian"],
    "plate":            ["hawaiian", "aloha plate"],
    "cougareat":        ["wilkinson", "wilk"],
    "wilkinson":        ["cougareat", "wilk"],
    "wilk":             ["cougareat", "wilkinson"],
    "ribs":             ["bbq"],
    "brisket":          ["bbq", "smoked"],
    "pulled pork":      ["bbq"],
    "buffet":           ["legends grille"],
    "all you can eat":  ["legends grille"],
    "gluten free":      ["konala", "healthy"],
    "protein":          ["konala", "healthy"],
    "ramen":            ["asian", "taco spot"],
    "poke":             ["hawaiian", "asian"],
    "shakes":           ["burgers", "byu creamery"],
    "shake":            ["burgers", "byu creamery"],
    "fries":            ["burgers", "chicken"],
    // Testers looked for pastries under "bakery" and missed the cafes.
    // "cafe bakery" is the category name, so these skip Teri Gao Asian Cafe.
    "pastry":           ["cafe bakery"],
    "pastries":         ["cafe bakery"],
    "croissant":        ["cafe bakery"],
    "muffin":           ["cafe bakery"],
    "donut":            ["cafe bakery"],
    "doughnut":         ["cafe bakery"],
    "coffee":           ["cafe bakery"],
    "coffee shop":      ["cafe bakery"],
    "dessert":          ["cafe bakery", "ice cream"],
    "desserts":         ["cafe bakery", "ice cream"]
  };

  // ------------------------------------------------------- per-restaurant keywords
  // Extra search tokens for restaurants whose cuisine list alone would miss
  // common searches. Grounded in menu highlights and details in data.js.
  var KEYWORDS = {
    "ronis":           ["mac and cheese", "macaroni", "grilled cheese", "build your own"],
    "j-dawgs":         ["hot dog", "hot dogs", "hotdog", "polish dog", "special sauce"],
    "blue-line":       ["deli", "sandwich", "sandwiches", "soup", "breakfast burrito", "tanner"],
    "blue-sushi":      ["sushi", "rolls", "dragon roll", "japanese", "crunchy dragon"],
    "cupbop":          ["korean", "korean bbq", "bulgogi", "rice bowl", "spicy pork"],
    "byu-creamery":    ["ice cream", "creamery", "grill", "shake", "shakes"],
    "konala":          ["teriyaki", "bowl", "gluten free", "protein", "greek"],
    "greenhouse":      ["salad", "salads", "bowl", "salmon", "sriracha"],
    "jamba":           ["smoothie", "smoothies", "juice", "bowl", "acai"],
    "legends-grille":  ["buffet", "all you can eat", "brisket", "ribs", "bbq", "barbecue", "smoked"],
    "y-mountain-bbq":  ["smoked brisket", "ribs", "pulled pork", "mac and cheese", "bbq", "barbecue"],
    "crazy-ds":        ["hot chicken", "tenders", "sliders", "smash burger", "smash burgers"],
    "pendulum-court":  ["student run", "dietetics", "rotating menu", "lunch"],
    "steak-express":   ["steak", "fish and chips", "onion rings"],
    "shirleys":        ["soup", "bread bowl", "croissant", "sweet roll", "bakery", "orange roll", "focaccia"],
    "moa-cafe":        ["museum of art", "brisket", "pasta", "grilled cheese", "italian"],
    "library-cafe":    ["boba", "bagel", "provecho", "tacos", "rice bowl"],
    "mo-bettahs":      ["teriyaki", "kalua pig", "plate lunch", "plate"],
    "aloha-plate":     ["dole whip", "plate lunch", "macaroni salad"],
    "taco-spot":       ["birria", "consome"],
    "el-tio":          ["birria", "shrimp taco", "enchiladas", "horchata"],
    "don-joaquin":     ["street tacos", "asada fries", "burritos", "salsa bar"],
    "costa-vida":      ["sweet pork", "barbacoa", "burrito", "salad"],
    "harveys":         ["hot dog", "tater tots"],
    "sage-pizza":      ["slab pizza"],
    "cougar-crust":    ["stone oven", "delivery", "cougar cash", "heritage halls"],
    "subway":          ["sub", "sandwich", "salad"],
    "raising-canes":   ["chicken fingers", "canes sauce", "crinkle fries", "texas toast"],
    "burgers-supreme": ["western bacon", "belt buster", "gyro", "shakes"],
    "papa-johns":      ["breadsticks"],
    "wendys":          ["frosty", "spicy chicken"],
    "chick-fil-a":     ["nuggets", "waffle fries"],
    "choices":         ["veggie bowl", "vegetarian"],
    "teri-gao":        ["teriyaki", "fried rice"]
  };

  // ------------------------------------------------------------------ engine
  // Normalize: lowercase, drop apostrophes ("Roni's" -> "ronis"), turn other
  // punctuation/symbols into spaces, collapse whitespace.
  function norm(s) {
    return String(s || "").toLowerCase()
      .replace(/['\u2019]/g, "")
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // An address can name a neighbor ("next to Blue Sushi"); drop other
  // restaurants' names so a search for them doesn't match this one.
  function withoutOtherNames(text, r) {
    D.restaurants.forEach(function (o) {
      if (o.id !== r.id) text = (" " + text + " ").split(" " + norm(o.name) + " ").join(" ").trim();
    });
    return text;
  }

  // Build the searchable parts (name, cuisines, location, menu, keywords)
  // for one restaurant.
  function corpusParts(r) {
    var parts = [norm(r.name)];
    r.cuisine.forEach(function (k) {
      var c = D.cuisines.filter(function (x) { return x.key === k; })[0];
      if (c) parts.push(norm(c.name));
    });
    parts.push(norm(CE.locationName(r)));
    parts.push(norm(CE.area(r).desc));
    parts.push(r.campus === "on" ? "on campus" : "near campus off campus");
    // Price words, so "cheap" or "budget" finds the $ places.
    if (r.price === 1) parts.push("cheap budget affordable inexpensive");
    if (r.price >= 2) parts.push("pricier");
    var det = CE.details(r.id);
    if (det.menu) det.menu.forEach(function (m) { parts.push(norm(m)); });
    if (det.where) parts.push(withoutOtherNames(norm(det.where), r));
    var kw = KEYWORDS[r.id];
    if (kw) kw.forEach(function (k) { parts.push(norm(k)); });
    return parts;
  }

  // Spaces removed, so "jdawgs" finds "j dawgs" and "chickfila" finds
  // "chick fil a".
  function squash(s) { return s.replace(/ /g, ""); }

  // Fold sound-alike spellings ("dawgs"/"dogs", "chik"/"chick") and doubled
  // letters, for typo matching only.
  function fold(s) {
    return squash(s).replace(/ph/g, "f").replace(/aw/g, "o").replace(/ck/g, "k")
      .replace(/z/g, "s").replace(/(.)\1+/g, "$1");
  }

  // Everything a query is compared against for one restaurant.
  function index(r) {
    var parts = corpusParts(r);
    var text = parts.join(" ");
    var words = text.split(" ").filter(function (w, i, a) { return w && a.indexOf(w) === i; });
    return {
      text: text,
      squashed: parts.map(squash),
      folded: words.map(fold).concat(parts.map(fold))
    };
  }

  // Filler words dropped from multi-word queries ("mac and cheese",
  // "museum of art"), so they don't match nearly every restaurant.
  var STOP_WORDS = ["a", "an", "and", "at", "by", "for", "from", "in", "of",
    "on", "or", "the", "to", "with", "food", "place", "places", "restaurant",
    "restaurants"];

  // Multi-word phrases kept together as one search unit. Every multi-word
  // synonym key counts, plus the campus tags added in corpusParts().
  // Area names ("south campus", "south of campus") must match as a whole,
  // so one never pulls in the other.
  var AREA_PHRASES = D.areas.map(function (a) { return norm(a.name.replace(/\(.*\)/, "")); })
    .filter(function (a) { return a.indexOf(" ") !== -1; });
  var PHRASES = ["on campus", "near campus", "off campus"].concat(AREA_PHRASES,
    Object.keys(SYNONYMS).filter(function (k) { return k.indexOf(" ") !== -1; }));
  SYNONYMS["off campus"] = ["near campus"];

  function isStop(w) { return STOP_WORDS.indexOf(w) !== -1; }

  // Split a query into units that must all match. Known phrases (longest
  // first) stay together; other words stand alone, minus stop words. If the
  // query is nothing but stop words, keep them so it still searches.
  function units(q) {
    var words = norm(q).split(" ").filter(Boolean);
    var out = [];
    for (var i = 0; i < words.length; ) {
      var found = null;
      for (var n = Math.min(4, words.length - i); n >= 2 && !found; n--) {
        var p = words.slice(i, i + n).join(" ");
        if (PHRASES.indexOf(p) !== -1) found = p;
      }
      if (found) { out.push(found); i += found.split(" ").length; }
      else { if (!isStop(words[i])) out.push(words[i]); i++; }
    }
    return out.length ? out : words;
  }

  // A term matches if it or one of its synonyms (one level deep) is in the corpus.
  function termMatches(idx, t) {
    return [t].concat(SYNONYMS[t] || []).some(function (s) { return idx.text.indexOf(s) !== -1; });
  }

  // A unit matches by itself or its synonyms, or with its spaces removed.
  // A phrase without stop words ("street tacos") may also match by all of
  // its words; one with stop words ("on campus", "mac and cheese") must
  // match as a phrase.
  function unitMatches(idx, u) {
    if (termMatches(idx, u)) return true;
    var sq = squash(u);
    if (sq.length >= 4 && idx.squashed.some(function (p) { return p.indexOf(sq) !== -1; })) return true;
    var parts = u.split(" ");
    if (parts.length < 2 || parts.some(isStop) || AREA_PHRASES.indexOf(u) !== -1) return false;
    return parts.every(function (w) { return termMatches(idx, w); });
  }

  // Edit distance (with swapped letters counting as one edit), giving up
  // once it passes max.
  function distance(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev2 = [], prev = [], cur;
    for (var j = 0; j <= b.length; j++) prev[j] = j;
    for (var i = 1; i <= a.length; i++) {
      cur = [i];
      var best = i;
      for (j = 1; j <= b.length; j++) {
        var cost = a[i - 1] === b[j - 1] ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
          cur[j] = Math.min(cur[j], prev2[j - 2] + 1);
        if (cur[j] < best) best = cur[j];
      }
      if (best > max) return max + 1;
      prev2 = prev; prev = cur;
    }
    return prev[b.length];
  }

  // Typos allowed for a word of this length: none under 4 letters, one up
  // to 6, two beyond.
  function typosAllowed(n) { return n < 4 ? 0 : n < 7 ? 1 : 2; }

  // Typo-tolerant match ("jdogs", "costa vita", "chikfila"): the folded unit
  // is within a few edits of a word or part, or of the start of a longer one
  // ("resturan" for a partly typed name).
  function fuzzyMatches(idx, u) {
    var f = fold(u);
    var k = typosAllowed(f.length);
    if (!k) return false;
    return idx.folded.some(function (x) {
      if (distance(f, x, k) <= k) return true;
      return f.length >= 5 && x.length > f.length && distance(f, x.slice(0, f.length), k) <= k;
    });
  }

  // True if the restaurant passes every active filter value.
  function matchesFilters(r, filters) {
    if (filters.cuisine && r.cuisine.indexOf(filters.cuisine) === -1) return false;
    if (filters.campus && r.campus !== filters.campus) return false;
    if (filters.area   && r.area   !== filters.area)   return false;
    return true;
  }

  CE.search = {
    // Returns all matching restaurants, name matches first, then
    // alphabetical.
    // filters: { cuisine: string|null, campus: string|null, area: string|null }
    run: function (query, filters) { return CE.search.find(query, filters).results; },

    // Returns { results, closeMatch }. A unit that matches no restaurant
    // exactly is matched with typo tolerance instead (closeMatch: true), so
    // fuzzy matches never crowd out exact ones. If a multi-word query still
    // finds nothing, it's tried as one squashed word ("jay dawgs" ->
    // "jaydawgs").
    find: function (query, filters) {
      var idx = {};
      D.restaurants.forEach(function (r) { idx[r.id] = index(r); });
      var closeMatch = false;
      function matchAll(us) {
        closeMatch = false;
        var plan = us.map(function (u) {
          var exact = D.restaurants.some(function (r) { return unitMatches(idx[r.id], u); });
          if (!exact) closeMatch = true;
          return { u: u, test: exact ? unitMatches : fuzzyMatches };
        });
        return D.restaurants.filter(function (r) {
          return matchesFilters(r, filters) &&
            plan.every(function (p) { return p.test(idx[r.id], p.u); });
        });
      }
      var us = norm(query) ? units(query) : [];
      var results = matchAll(us);
      if (!results.length && us.length > 1) results = matchAll([us.join("")]);
      // Restaurants whose name matches come first ("roni" -> Roni's before
      // Aloha Plate's macaroni salad), then alphabetical.
      var q = squash(norm(query)), fq = fold(norm(query));
      function byName(r) {
        var n = squash(norm(r.name));
        if (!q) return 1;
        if (n.indexOf(q) !== -1) return 0;
        var k = typosAllowed(fq.length), fn = fold(n);
        if (!k) return 1;
        return distance(fq, fn, k) <= k || distance(fq, fn.slice(0, fq.length), k) <= k ? 0 : 1;
      }
      results.sort(function (a, b) {
        return byName(a) - byName(b) || a.name.localeCompare(b.name);
      });
      return { results: results, closeMatch: closeMatch && results.length > 0 };
    }
  };
})();
