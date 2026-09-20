/* Pure helpers shared by the trip handbook and unit tests. */
(function (root) {
  function pad2(n) {
    return ("0" + n).slice(-2);
  }
  function timeKey(t) {
    var m = /(\d{1,2}):(\d{2})/.exec(String(t || ""));
    return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 1e9;
  }
  function parseClock(t) {
    var m = /(\d{1,2}):(\d{2})/.exec(String(t || ""));
    return m ? { h: +m[1], m: +m[2] } : null;
  }
  function parseClockRange(t) {
    var m = /(\d{1,2}):(\d{2})\s*[→~\-–]\s*(\d{1,2}):(\d{2})/.exec(String(t || ""));
    if (m) return { h1: +m[1], m1: +m[2], h2: +m[3], m2: +m[4] };
    var c = parseClock(t);
    return c ? { h1: c.h, m1: c.m, h2: null, m2: null } : null;
  }
  function formatClockRange(h1, m1, h2, m2) {
    var a = pad2(h1) + ":" + pad2(m1);
    if (h2 != null && m2 != null) a += "→" + pad2(h2) + ":" + pad2(m2);
    return a;
  }
  function parseAmt(s) {
    var n = parseFloat(String(s == null ? "" : s).replace(/,/g, "").replace(/\s/g, "").trim());
    return isFinite(n) ? n : NaN;
  }
  function unionById(a, b) {
    var seen = {}, out = [];
    (a || []).concat(b || []).forEach(function (x) {
      if (!x || !x.id || seen[x.id]) return;
      seen[x.id] = 1;
      out.push(x);
    });
    return out;
  }
  function unionByIdLWW(a, b) {
    var map = {}, order = [];
    function put(x) {
      if (!x || !x.id) return;
      var prev = map[x.id];
      if (!prev) {
        map[x.id] = x;
        order.push(x.id);
        return;
      }
      if ((x.upd || 0) > (prev.upd || 0)) map[x.id] = x;
    }
    (a || []).forEach(put);
    (b || []).forEach(put);
    return order.map(function (id) { return map[id]; });
  }
  function shuffle(arr) {
    var a = arr.slice(), i, j, t;
    for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function settleFromExpenses(expenses, members) {
    var names = (members || []).slice();
    (expenses || []).forEach(function (e) {
      if (e.payer && names.indexOf(e.payer) < 0) names.push(e.payer);
      (e.split || []).forEach(function (m) {
        if (names.indexOf(m) < 0) names.push(m);
      });
    });
    var net = {};
    names.forEach(function (m) { net[m] = 0; });
    (expenses || []).forEach(function (e) {
      var twd = Math.round(e.twd || 0);
      net[e.payer] += twd;
      var n = (e.split || []).length;
      if (!n) return;
      var base = Math.floor(twd / n), rem = twd - base * n;
      e.split.forEach(function (m, i) { net[m] -= base + (i < rem ? 1 : 0); });
    });
    var deb = [], cre = [];
    names.forEach(function (m) {
      var v = Math.round(net[m]);
      net[m] = v;
      if (v < 0) deb.push([m, -v]);
      else if (v > 0) cre.push([m, v]);
    });
    deb.sort(function (a, b) { return b[1] - a[1]; });
    cre.sort(function (a, b) { return b[1] - a[1]; });
    var out = [], di = 0, ci = 0;
    while (di < deb.length && ci < cre.length) {
      var pay = Math.min(deb[di][1], cre[ci][1]);
      out.push({ from: deb[di][0], to: cre[ci][0], amt: pay });
      deb[di][1] -= pay;
      cre[ci][1] -= pay;
      if (deb[di][1] < 1) di++;
      if (cre[ci][1] < 1) ci++;
    }
    return { net: net, transfers: out };
  }
  function wxKindFromCode(code, windMax) {
    var c = code == null || code === "" ? 3 : +code;
    if (windMax != null && windMax >= 32 && c <= 3) return "wind";
    if (c === 0) return "sun";
    if (c <= 2) return "partly";
    if (c <= 48) return "cloud";
    if (c >= 95) return "storm";
    if (c >= 51) return "rain";
    return "cloud";
  }
  var api = {
    pad2: pad2,
    timeKey: timeKey,
    parseClock: parseClock,
    parseClockRange: parseClockRange,
    formatClockRange: formatClockRange,
    parseAmt: parseAmt,
    unionById: unionById,
    unionByIdLWW: unionByIdLWW,
    shuffle: shuffle,
    settleFromExpenses: settleFromExpenses,
    wxKindFromCode: wxKindFromCode
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.VN = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
