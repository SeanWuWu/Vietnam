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

console.log("vn-core tests ok");
