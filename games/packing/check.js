/* Suitcase rules. No DOM. Grid is 6 wide by 8 tall, y=0 at the top. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.PackRules = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var COLS = 6, ROWS = 8;
  function footprint(def, rot) {
    return rot ? { w: def.h, h: def.w } : { w: def.w, h: def.h };
  }
  function cellsOf(def, x, y, rot) {
    var f = footprint(def, rot), out = [];
    for (var dy = 0; dy < f.h; dy++) {
      for (var dx = 0; dx < f.w; dx++) out.push([x + dx, y + dy]);
    }
    return out;
  }
  function blockedSet(level) {
    var s = {};
    (level.blocked || []).forEach(function (p) { s[p[0] + "," + p[1]] = 1; });
    return s;
  }
  function geom(level, placed, catalog) {
    var block = blockedSet(level);
    var occ = {};
    var bad = "";
    placed.forEach(function (p) {
      var def = catalog[p.id];
      if (!def) { bad = "unknown"; return; }
      cellsOf(def, p.x, p.y, p.rot).forEach(function (c) {
        var k = c[0] + "," + c[1];
        if (c[0] < 0 || c[1] < 0 || c[0] >= COLS || c[1] >= ROWS) bad = "bounds";
        else if (block[k]) bad = "corner";
        else if (occ[k]) bad = "overlap";
        else occ[k] = p;
      });
    });
    return { bad: bad, occ: occ };
  }
  function near(a, b) {
    return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) <= 1;
  }
  function evaluate(level, placed, catalog) {
    var g = geom(level, placed, catalog);
    var errors = [];
    var weight = 0, liquid = 0;
    var counts = {};
    placed.forEach(function (p) {
      var def = catalog[p.id];
      if (!def) return;
      weight += def.weight || 0;
      if ((def.tags || []).indexOf("liquid") >= 0) liquid += def.ml || 0;
      counts[p.id] = (counts[p.id] || 0) + 1;
      if ((level.banned || []).indexOf(p.id) >= 0 && errors.indexOf("banned") < 0) errors.push("banned");
    });
    if (level.weightLimit != null && weight > level.weightLimit) errors.push("weight");
    if (level.liquidMax != null && liquid > level.liquidMax) errors.push("liquid");
    var heavy = level.heavy == null ? 3 : level.heavy;
    placed.forEach(function (p) {
      var def = catalog[p.id];
      if (!def || (def.tags || []).indexOf("fragile") < 0) return;
      cellsOf(def, p.x, p.y, p.rot).forEach(function (c) {
        var above = g.occ[c[0] + "," + (c[1] - 1)];
        if (above && above !== p) {
          var ad = catalog[above.id];
          if (ad && (ad.weight || 0) >= heavy && errors.indexOf("fragile") < 0) errors.push("fragile");
        }
      });
    });
    var bats = placed.filter(function (p) {
      var def = catalog[p.id];
      return def && (def.tags || []).indexOf("battery") >= 0;
    });
    for (var i = 0; i < bats.length && errors.indexOf("battery") < 0; i++) {
      for (var j = i + 1; j < bats.length; j++) {
        var A = cellsOf(catalog[bats[i].id], bats[i].x, bats[i].y, bats[i].rot);
        var B = cellsOf(catalog[bats[j].id], bats[j].x, bats[j].y, bats[j].rot);
        var hit = 0;
        A.forEach(function (a) { B.forEach(function (b) { if (near(a, b)) hit = 1; }); });
        if (hit) { errors.push("battery"); break; }
      }
    }
    var need = {};
    (level.required || []).forEach(function (id) { need[id] = (need[id] || 0) + 1; });
    var missing = [];
    Object.keys(need).forEach(function (id) {
      var have = counts[id] || 0;
      for (var n = have; n < need[id]; n++) missing.push(id);
    });
    return { bad: g.bad, errors: errors, weight: weight, liquid: liquid, missing: missing };
  }
  return { COLS: COLS, ROWS: ROWS, footprint: footprint, cellsOf: cellsOf, geom: geom, evaluate: evaluate };
});
