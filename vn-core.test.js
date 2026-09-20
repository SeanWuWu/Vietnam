var assert = require("assert");
var VN = require("./vn-core.js");

assert.strictEqual(VN.pad2(7), "07");
assert.strictEqual(VN.timeKey("08:20→10:30"), 8 * 60 + 20);
assert.strictEqual(VN.timeKey("傍晚"), 1e9);
assert.deepStrictEqual(VN.parseClockRange("08:20→10:30"), { h1: 8, m1: 20, h2: 10, m2: 30 });
assert.strictEqual(VN.formatClockRange(8, 20, 10, 30), "08:20→10:30");
assert.strictEqual(VN.parseAmt("1,000"), 1000);
assert.strictEqual(VN.parseAmt(" 12.5 "), 12.5);
assert.ok(isNaN(VN.parseAmt("")));

var a = [{ id: "1", upd: 1, v: "old" }];
var b = [{ id: "1", upd: 2, v: "new" }, { id: "2", upd: 1, v: "b" }];
var m = VN.unionByIdLWW(a, b);
assert.strictEqual(m.length, 2);
assert.strictEqual(m[0].v, "new");
assert.strictEqual(m[1].v, "b");

var first = VN.unionById(a, [{ id: "1", v: "later" }]);
assert.strictEqual(first[0].v, "old");

var members = ["A", "B", "C"];
var exp = [
  { id: "e1", title: "x", twd: 100, payer: "A", split: ["A", "B", "C"] }
];
var s = VN.settleFromExpenses(exp, members);
assert.strictEqual(s.net.A, 66);
assert.strictEqual(s.net.B, -33);
assert.strictEqual(s.net.C, -33);
assert.strictEqual(s.net.A + s.net.B + s.net.C, 0);
assert.ok(s.transfers.length >= 1);
s.transfers.forEach(function (t) { assert.ok(t.amt >= 1); });

assert.strictEqual(VN.wxKindFromCode(0), "sun");
assert.strictEqual(VN.wxKindFromCode(2), "partly");
assert.strictEqual(VN.wxKindFromCode(3, 40), "wind");
assert.strictEqual(VN.wxKindFromCode(95), "storm");
assert.strictEqual(VN.wxKindFromCode(61), "rain");

var sh = VN.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7]);
assert.strictEqual(sh.length, 16);
assert.strictEqual(sh.slice().sort().join(), "0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7");

assert.strictEqual(VN.safeTab("exp"), "exp");
assert.strictEqual(VN.safeTab("#javascript:alert(1)"), "tl");
assert.ok(VN.mapsQueryUrl("javascript:alert(1)").indexOf("javascript") < 0);
assert.ok(VN.mapsQueryUrl("<img>").indexOf("<") < 0);
assert.strictEqual(VN.rateInBand(780), true);
assert.strictEqual(VN.rateInBand(50), false);
assert.ok(VN.looksSensitive("護照 AB12345678"));
assert.ok(!VN.looksSensitive("河粉"));

var dirty = {
  __proto__: { polluted: 1 },
  tl: [{ id: "x", title: VN.XSS_FIXTURE, note: "ok", day: 1, who: "Sean" }, { title: "no-id" }],
  exp: [{ id: "e", title: "lunch", twd: -9, who: "Sean" }, { id: "e2", title: "ok", twd: 100, payer: "Sean", split: ["Sean"], who: "Sean" }],
  sc: { pho: [{ who: "hacker", score: 9e9, t: "00:00" }, { who: "Sean", score: 12, t: "01:00" }] },
  vis: { __proto__: { x: 1 }, "Pho": { Sean: { v: true, t: 1 } } }
};
var clean = VN.sanitizeTrip(dirty, ["Sean", "魚丸", "姆斯", "尼佛", "陳皮", "阿綸"]);
assert.ok(!clean.polluted);
assert.strictEqual(clean.tl.length, 1);
assert.ok(clean.tl[0].title.indexOf("<script>") < 0 || clean.tl[0].title.indexOf(VN.XSS_FIXTURE.slice(0, 10)) >= 0);
assert.strictEqual(clean.exp.length, 1);
assert.strictEqual(clean.exp[0].id, "e2");
assert.strictEqual(clean.sc.pho.length, 1);
assert.strictEqual(clean.sc.pho[0].who, "Sean");
assert.ok(!Object.prototype.polluted);

console.log("vn-core tests ok");
