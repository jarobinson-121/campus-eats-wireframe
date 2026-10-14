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
    "sushi":            ["blue sushi", "japanese", "roll", "rolls"],
    "japanese":         ["sushi", "asian"],
    "korean":           ["asian", "cupbop", "korean bbq"],
    "korean bbq":       ["asian", "cupbop"],
    "mac and cheese":   ["ronis", "macaroni"],
    "mac & cheese":     ["ronis", "macaroni"],
    "mac cheese":       ["ronis", "macaroni"],
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
  // Normalize: lowercase, strip punctuation/symbols, collapse whitespace.
  function norm(s) {
    return String(s || "").toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
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
    if (det.where) parts.push(norm(det.where));
    var kw = KEYWORDS[r.id];
    if (kw) kw.forEach(function (k) { parts.push(norm(k)); });
    return parts.join(" ");
  }

  // Split a query into single words plus bi/trigrams for phrase synonym lookup.
  function tokenize(q) {
    var words = norm(q).split(" ").filter(Boolean);
    var terms = words.slice();
    for (var i = 0; i < words.length - 1; i++) {
      terms.push(words[i] + " " + words[i + 1]);
      if (i < words.length - 2) terms.push(words[i] + " " + words[i + 1] + " " + words[i + 2]);
    }
    return terms;
  }

  // Expand a term list through the synonym map (one level deep).
  function expand(terms) {
    var out = terms.slice();
    terms.forEach(function (t) {
      var syns = SYNONYMS[t];
      if (syns) syns.forEach(function (s) { if (out.indexOf(s) === -1) out.push(s); });
    });
    return out;
  }

  // True if the restaurant's corpus contains any expanded query term.
  function matchesQuery(c, query) {
    if (!query) return true;
    return expand(tokenize(query)).some(function (t) { return c.indexOf(t) !== -1; });
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
