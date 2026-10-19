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
    "fries":            ["burgers", "chicken"]
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

  // Build the full searchable corpus for one restaurant.
  function corpus(r) {
    var parts = [norm(r.name)];
    r.cuisine.forEach(function (k) {
      var c = D.cuisines.filter(function (x) { return x.key === k; })[0];
      if (c) parts.push(norm(c.name));
    });
    parts.push(norm(CE.locationName(r)));
    parts.push(r.campus === "on" ? "on campus" : "near campus");
    var det = CE.details(r.id);
    if (det.menu) det.menu.forEach(function (m) { parts.push(norm(m)); });
    if (det.where) parts.push(withoutOtherNames(norm(det.where), r));
    var kw = KEYWORDS[r.id];
    if (kw) kw.forEach(function (k) { parts.push(norm(k)); });
    return parts.join(" ");
  }

  // Filler words dropped from multi-word queries ("mac and cheese",
  // "museum of art"), so they don't match nearly every restaurant.
  var STOP_WORDS = ["a", "an", "and", "at", "by", "for", "from", "in", "of",
    "on", "or", "the", "to", "with", "food", "place", "places", "restaurant",
    "restaurants"];

  // Multi-word phrases kept together as one search unit. Every multi-word
  // synonym key counts, plus the campus tags added in corpus().
  var PHRASES = ["on campus", "near campus", "off campus"].concat(
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
  function termMatches(c, t) {
    return [t].concat(SYNONYMS[t] || []).some(function (s) { return c.indexOf(s) !== -1; });
  }

  // A unit matches by itself or its synonyms. A phrase without stop words
  // ("street tacos") may also match by all of its words; one with stop words
  // ("on campus", "mac and cheese") must match as a phrase.
  function unitMatches(c, u) {
    if (termMatches(c, u)) return true;
    var parts = u.split(" ");
    if (parts.length < 2 || parts.some(isStop)) return false;
    return parts.every(function (w) { return termMatches(c, w); });
  }

  // True if the restaurant's corpus matches every unit of the query.
  function matchesQuery(c, query) {
    if (!norm(query)) return true;
    return units(query).every(function (u) { return unitMatches(c, u); });
  }

  // True if the restaurant passes every active filter value.
  function matchesFilters(r, filters) {
    if (filters.cuisine && r.cuisine.indexOf(filters.cuisine) === -1) return false;
    if (filters.campus && r.campus !== filters.campus) return false;
    if (filters.area   && r.area   !== filters.area)   return false;
    return true;
  }

  CE.search = {
    // Returns all matching restaurants, alphabetically sorted.
    // filters: { cuisine: string|null, campus: string|null, area: string|null }
    run: function (query, filters) {
      var corpora = {};
      D.restaurants.forEach(function (r) { corpora[r.id] = corpus(r); });
      return D.restaurants.filter(function (r) {
        return matchesQuery(corpora[r.id], query) && matchesFilters(r, filters);
      }).slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    }
  };
})();
