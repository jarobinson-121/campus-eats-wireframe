// Campus Eats — shared helpers and the two browse trees.
//
// Both views are built here from the attributes in data.js. A view is a
// tree of { key, name, children } nodes; leaves carry { block: id }.
// Routes are the keys along the path: #/food/pizza/on/papa-johns.
(function () {
  "use strict";

  var D = window.CE_DATA;
  var CE = (window.CE = {});

  // ---------------------------------------------------------------- utils
  CE.esc = function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  };

  CE.store = function (key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  };
  CE.save = function (key, value) {
    try { window.localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  };
  CE.remove = function (key) {
    try { window.localStorage.removeItem(key); } catch (e) { /* ignore */ }
  };

  CE.uid = function (prefix) {
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  };

  CE.plural = function (n, one, many) { return n + " " + (n === 1 ? one : many); };

  CE.stamp = function () {
    var d = new Date();
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes());
  };

  CE.download = function (filename, text, mime) {
    var blob = new Blob([text], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  };

  CE.csv = function (rows) {
    return rows.map(function (r) {
      return r.map(function (v) {
        var s = v == null ? "" : String(v);
        return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(",");
    }).join("\r\n");
  };

  // Copies text; reports the outcome into the element with id statusId.
  CE.copy = function (text, statusId) {
    function say(msg) {
      var el = document.getElementById(statusId);
      if (el) el.textContent = msg;
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(
        function () { say("Copied to clipboard."); },
        function () { say("Copy failed. Use a download button instead."); }
      );
    } else {
      var ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      ta.remove();
      say(ok ? "Copied to clipboard." : "Copy failed. Use a download button instead.");
    }
  };

  // --------------------------------------------------------------- lookups
  function byKey(list, key) {
    return list.filter(function (x) { return x.key === key; })[0];
  }
  CE.restaurant = function (id) {
    return D.restaurants.filter(function (r) { return r.id === id; })[0];
  };
  CE.task = function (id) {
    return D.tasks.filter(function (t) { return t.id === id; })[0];
  };
  CE.cuisineNames = function (r) {
    return r.cuisine.map(function (k) { return byKey(D.cuisines, k).name; });
  };
  CE.locationName = function (r) {
    if (r.campus === "on") {
      return byKey(D.locations, "on-campus").name + " › " + byKey(D.campusAreas, r.area).name;
    }
    return byKey(D.locations, r.area).name;
  };

  // ----------------------------------------------------------------- trees
  function leaves(filter) {
    return D.restaurants.filter(filter)
      .slice()
      .sort(function (a, b) { return a.name.localeCompare(b.name); })
      .map(function (r) { return { key: r.id, name: r.name, block: r.id }; });
  }
  function nonEmpty(node) { return node.children.length > 0; }

  // Categories that end up empty are dropped from the tree and reported by
  // the coverage check, so a participant never clicks into nothing.
  CE.emptyCategories = [];
  function keepOrReport(viewName, node) {
    if (nonEmpty(node)) return true;
    CE.emptyCategories.push(viewName + " › " + node.name);
    return false;
  }

  var foodView = {
    key: "food",
    name: "Browse by Food Type",
    blurb: "Pick what you're hungry for, then on or near campus.",
    children: D.cuisines.map(function (c) {
      return {
        key: c.key,
        name: c.name,
        children: D.campus.map(function (cp) {
          return {
            key: cp.key,
            name: cp.name,
            children: leaves(function (r) {
              return r.cuisine.indexOf(c.key) !== -1 && r.campus === cp.key;
            })
          };
        }).filter(nonEmpty)
      };
    }).filter(function (n) { return keepOrReport("Browse by Food Type", n); })
  };

  var placeView = {
    key: "place",
    name: "Browse by Location",
    blurb: "Pick where you are, then a restaurant there.",
    children: D.locations.map(function (l) {
      if (l.campus === "on") {
        return {
          key: l.key,
          name: l.name,
          children: D.campusAreas.map(function (a) {
            return {
              key: a.key,
              name: a.name,
              children: leaves(function (r) { return r.campus === "on" && r.area === a.key; })
            };
          }).filter(function (n) { return keepOrReport("Browse by Location › " + l.name, n); })
        };
      }
      return {
        key: l.key,
        name: l.name,
        children: leaves(function (r) { return r.campus === "near" && r.area === l.key; })
      };
    }).filter(function (n) { return keepOrReport("Browse by Location", n); })
  };

  CE.views = [foodView, placeView];

  // Walks a route's segments down the trees.
  // Returns { view, trail: [view, ...nodes], node } or null if no match.
  CE.resolve = function (segments) {
    var view = byKey(CE.views, segments[0]);
    if (!view) return null;
    var trail = [view];
    var node = view;
    for (var i = 1; i < segments.length; i++) {
      if (!node.children) return null;
      node = byKey(node.children, segments[i]);
      if (!node) return null;
      trail.push(node);
    }
    return { view: view, trail: trail, node: node };
  };

  CE.hrefFor = function (trail, uptoIndex) {
    var keys = trail.slice(0, uptoIndex + 1).map(function (n) { return n.key; });
    return "#/" + keys.join("/");
  };

  // Every route (as a trail of nodes) where a restaurant can be reached.
  CE.trailsTo = function (blockId) {
    var found = [];
    function walk(node, trail) {
      var t = trail.concat([node]);
      if (node.block === blockId) found.push(t);
      (node.children || []).forEach(function (c) { walk(c, t); });
    }
    CE.views.forEach(function (v) { walk(v, []); });
    return found;
  };

  CE.depth = function (node) {
    if (!node.children) return 0;
    return 1 + Math.max.apply(null, node.children.map(CE.depth).concat([0]));
  };

  CE.countLeaves = function (node) {
    if (!node.children) return 1;
    return node.children.reduce(function (n, c) { return n + CE.countLeaves(c); }, 0);
  };
})();
