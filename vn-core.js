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

  var SAFE_TABS = { tl: 1, exp: 1, pl: 1, more: 1, game: 1, card: 1 };
  var LIMITS = {
    title: 120, note: 400, who: 24, id: 64, msg: 80, cat: 32,
    list: 800, scores: 5, activity: 5, dels: 2000, audit: 40
  };
  var SENSITIVE_RE = /護照|护照|passport|身分證|身份证|credit\s*card|cvv|\b[A-Z]{1,2}\d{8,9}\b/i;
  var MEMBERS_FALLBACK = ["Sean", "魚丸", "姆斯", "尼佛", "陳皮", "阿綸"];

  function clipStr(s, n) {
    s = String(s == null ? "" : s);
    if (s.length > n) s = s.slice(0, n);
    return s;
  }
  function looksSensitive(s) {
    return SENSITIVE_RE.test(String(s || ""));
  }
  function ownKeys(obj) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return [];
    return Object.keys(obj).filter(function (k) {
      return k !== "__proto__" && k !== "constructor" && k !== "prototype";
    });
  }
  function copyOwn(src) {
    var out = Object.create(null);
    ownKeys(src).forEach(function (k) { out[k] = src[k]; });
    return out;
  }
  function safeTab(p) {
    p = String(p || "").replace(/^#/, "");
    return SAFE_TABS[p] ? p : "tl";
  }
  function mapsQueryUrl(q) {
    var s = clipStr(q, 200).replace(/[\u0000-\u001f]/g, "");
    if (/^\s*javascript:/i.test(s) || /^\s*data:/i.test(s)) s = "";
    s = s.replace(/^https?:\/\//i, "");
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(s);
  }
  function placeIdUrl(pid) {
    var id = clipStr(pid, 120).replace(/[^A-Za-z0-9_\-]/g, "");
    if (!id) return mapsQueryUrl("");
    return "https://www.google.com/maps/place/?q=place_id:" + encodeURIComponent(id);
  }
  function rateInBand(v) {
    return typeof v === "number" && isFinite(v) && v >= 500 && v <= 1200;
  }
  function newId() {
    try {
      if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        var b = new Uint8Array(16);
        crypto.getRandomValues(b);
        b[6] = (b[6] & 0x0f) | 0x40;
        b[8] = (b[8] & 0x3f) | 0x80;
        var h = [];
        for (var i = 0; i < 16; i++) h.push(("0" + b[i].toString(16)).slice(-2));
        return h.join("").slice(0, 20);
      }
    } catch (e) {}
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
  function sanitizeScore(s, members) {
    if (!s || typeof s !== "object") return null;
    var who = clipStr(s.who, LIMITS.who);
    var allow = members || MEMBERS_FALLBACK;
    if (allow.indexOf(who) < 0) return null;
    var score = Math.round(+s.score);
    if (!isFinite(score) || score < 0 || score > 1e7) return null;
    return { who: who, score: score, t: clipStr(s.t, 8) };
  }
  function sanitizeItem(x, kind) {
    if (!x || typeof x !== "object") return null;
    var id = clipStr(x.id, LIMITS.id);
    if (!id) return null;
    var o = { id: id, who: clipStr(x.who, LIMITS.who), t: clipStr(x.t, 16), upd: +x.upd || 0 };
    if (kind === "tl") {
      o.day = Math.min(6, Math.max(1, +x.day || 1));
      o.time = clipStr(x.time, 24);
      o.title = clipStr(x.title, LIMITS.title);
      o.note = clipStr(x.note, LIMITS.note);
      o.q = clipStr(x.q, 200);
      if (x.flight) o.flight = true;
      if (looksSensitive(o.title + o.note)) return null;
    } else if (kind === "exp") {
      o.title = clipStr(x.title, LIMITS.title);
      o.cat = clipStr(x.cat, LIMITS.cat);
      o.twd = Math.round(+x.twd || 0);
      if (!isFinite(o.twd) || o.twd < 0 || o.twd > 1e8) return null;
      o.cur = x.cur === "VND" ? "VND" : "TWD";
      o.vnd = x.vnd == null ? null : +x.vnd;
      o.rate = +x.rate || 0;
      o.payer = clipStr(x.payer, LIMITS.who);
      o.split = (Array.isArray(x.split) ? x.split : []).map(function (m) { return clipStr(m, LIMITS.who); }).slice(0, 8);
      if (looksSensitive(o.title)) return null;
    } else if (kind === "pl") {
      o.n = clipStr(x.n, LIMITS.title);
      o.note = clipStr(x.note, LIMITS.note);
      o.q = clipStr(x.q, 200);
      o.tags = (Array.isArray(x.tags) ? x.tags : []).map(function (t) { return clipStr(t, LIMITS.cat); }).slice(0, 6);
      if (looksSensitive(o.n + o.note)) return null;
    }
    return o;
  }
  function sanitizeTrip(raw, members) {
    var c = raw && typeof raw === "object" ? raw : {};
    var out = {
      tl: [], exp: [], upl: [], vis: {}, act: [], sc: { pho: [], lantern: [], memory: [], fish: [] },
      del: {}, chk: {}, celeb: {}, audit: [], rev: +c.rev || 0
    };
    (Array.isArray(c.tl) ? c.tl : []).slice(0, LIMITS.list).forEach(function (x) {
      var s = sanitizeItem(x, "tl"); if (s) out.tl.push(s);
    });
    (Array.isArray(c.exp) ? c.exp : []).slice(0, LIMITS.list).forEach(function (x) {
      var s = sanitizeItem(x, "exp"); if (s) out.exp.push(s);
    });
    (Array.isArray(c.upl) ? c.upl : []).slice(0, LIMITS.list).forEach(function (x) {
      var s = sanitizeItem(x, "pl"); if (s) out.upl.push(s);
    });
    ownKeys(c.vis).slice(0, LIMITS.list).forEach(function (k) { out.vis[clipStr(k, LIMITS.title)] = c.vis[k]; });
    ownKeys(c.del).slice(0, LIMITS.dels).forEach(function (k) {
      var t = c.del[k];
      if (t === 1) t = Date.now();
      if (typeof t === "number") out.del[clipStr(k, LIMITS.id)] = t;
    });
    ownKeys(c.chk).forEach(function (k) { out.chk[clipStr(k, 40)] = c.chk[k]; });
    ownKeys(c.celeb).slice(0, 200).forEach(function (k) { if (c.celeb[k]) out.celeb[clipStr(k, LIMITS.title)] = 1; });
    ["pho", "lantern", "memory", "fish"].forEach(function (g) {
      var arr = (c.sc && Array.isArray(c.sc[g])) ? c.sc[g] : [];
      out.sc[g] = arr.map(function (s) { return sanitizeScore(s, members); }).filter(Boolean).slice(0, LIMITS.scores);
    });
    (Array.isArray(c.act) ? c.act : []).slice(0, LIMITS.activity).forEach(function (a) {
      if (!a) return;
      out.act.push({ who: clipStr(a.who, LIMITS.who), msg: clipStr(a.msg, LIMITS.msg), t: clipStr(a.t, 16) });
    });
    (Array.isArray(c.audit) ? c.audit : []).slice(0, LIMITS.audit).forEach(function (a) {
      if (!a) return;
      out.audit.push({ who: clipStr(a.who, LIMITS.who), op: clipStr(a.op, 24), id: clipStr(a.id, LIMITS.id), t: +a.t || 0 });
    });
    return out;
  }
  var XSS_FIXTURE = "<img src=x onerror=alert(1)>\"'><script>alert(1)</script>";

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
    wxKindFromCode: wxKindFromCode,
    SAFE_TABS: SAFE_TABS,
    LIMITS: LIMITS,
    clipStr: clipStr,
    looksSensitive: looksSensitive,
    ownKeys: ownKeys,
    copyOwn: copyOwn,
    safeTab: safeTab,
    mapsQueryUrl: mapsQueryUrl,
    placeIdUrl: placeIdUrl,
    rateInBand: rateInBand,
    newId: newId,
    sanitizeTrip: sanitizeTrip,
    sanitizeItem: sanitizeItem,
    XSS_FIXTURE: XSS_FIXTURE
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.VN = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
