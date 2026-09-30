/* 行李收納。單機，星星只存在這支手機。 */
var packCat = null, packLevels = null, PK = null;

function packCSS() {
  if (document.getElementById("pack-css")) return;
  var s = document.createElement("style");
  s.id = "pack-css";
  s.textContent = [
    ".pk-top{display:flex;justify-content:space-between;gap:8px;align-items:baseline}",
    ".pk-top b{font-size:15px}",
    ".pk-meta{font-size:12px;color:var(--ink2);margin-top:4px;line-height:1.45}",
    ".pk-board{position:relative;display:grid;grid-template-columns:repeat(6,1fr);grid-template-rows:repeat(8,1fr);gap:2px;margin:8px auto 0;height:min(28vh,220px);width:auto;aspect-ratio:6/8;touch-action:none;user-select:none}",
    ".pk-cell{background:#EFE9DC;border-radius:2px}",
    ".pk-cell.block{background:#E4D3C4}",
    ".pk-piece{position:absolute;box-sizing:border-box;border:2px solid transparent;border-radius:4px;background:rgba(255,255,255,.55)}",
    ".pk-piece.on{border-color:#9C4221}",
    ".pk-piece img{width:100%;height:100%;object-fit:contain;pointer-events:none}",
    ".pk-tray{display:flex;gap:6px;overflow-x:auto;padding:8px 0 2px}",
    ".pk-tray button{flex:0 0 76px;border:1px solid var(--line);background:#fff;border-radius:4px;padding:4px 2px 6px;font-size:11px;font-weight:700;line-height:1.2}",
    ".pk-tray button.on{border-color:#9C4221}",
    ".pk-tray button.need{color:#9C4221}",
    ".pk-tray img{width:46px;height:46px;object-fit:contain;display:block;margin:0 auto 2px}",
    ".pk-actions{display:flex;gap:6px;margin-top:8px}",
    ".pk-actions button{flex:1;min-height:44px;border:1px solid var(--line2);background:transparent;border-radius:4px;font-weight:700;font-size:14px}",
    ".pk-map{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}",
    ".pk-map button{min-height:56px;border:1px solid var(--line);background:#fff;border-radius:4px;font-weight:700;font-size:13px}",
    ".pk-map button small{display:block;font-weight:400;color:var(--ink3);margin-top:2px}",
    ".pk-map button:disabled{opacity:.38}",
    ".pk-ghost{position:fixed;z-index:50;width:64px;height:64px;pointer-events:none;object-fit:contain}"
  ].join("");
  document.head.appendChild(s);
}
function packStars() {
  try { return JSON.parse(localStorage.getItem("vn6p:pack-stars") || "{}"); } catch (e) { return {}; }
}
function packSaveStar(id, n) {
  var o = packStars();
  if ((o[id] || 0) < n) o[id] = n;
  try { localStorage.setItem("vn6p:pack-stars", JSON.stringify(o)); } catch (e) {}
}
function packStarText(n) {
  n = n || 0;
  return "★★★".slice(0, n) + "☆☆☆".slice(n);
}
function packBest() {
  var el = $("best-packing");
  if (!el) return;
  var o = packStars(), sum = 0;
  Object.keys(o).forEach(function (k) { if (k !== "inf") sum += o[k] || 0; });
  el.textContent = sum ? ("星星 " + sum) : "尚未過關";
}
function packStop() {
  if (!PK) return;
  if (PK.timer) clearTimeout(PK.timer);
  PK.timer = 0;
  PK.drag = null;
  var g = document.getElementById("pk-ghost");
  if (g) g.remove();
}
function packInit() {
  if (!requireMe()) { closeGame(); return; }
  stopLoops();
  packCSS();
  packStop();
  if (packLevels) { packMap(); return; }
  $("g-body").innerHTML = '<div class="d">正在打開行李箱…</div>';
  Promise.all([
    fetch("games/packing/data/items.json").then(function (r) { return r.json(); }),
    fetch("games/packing/data/levels.json").then(function (r) { return r.json(); })
  ]).then(function (xs) {
    packCat = {};
    xs[0].forEach(function (it) { packCat[it.id] = it; });
    packLevels = xs[1];
    packMap();
  }).catch(function () {
    $("g-body").innerHTML = '<div class="d">行李圖載入失敗。連線後再開一次這款。</div>';
  });
}
function packUnlocked(id) {
  if (id === 1) return true;
  var o = packStars();
  if (id === "inf") return (o[12] || 0) > 0;
  return (o[id - 1] || 0) > 0;
}
function packMap() {
  packStop();
  PK = null;
  var o = packStars();
  var h = '<div class="pk-top"><b>行李收納</b></div>';
  h += '<div class="pk-meta">必帶放進箱子，沒有違規就過關。星星存在這支手機。</div><div class="pk-map">';
  packLevels.forEach(function (lv) {
    var open = packUnlocked(lv.id);
    h += '<button ' + (open ? 'onclick="packStart(' + lv.id + ')"' : "disabled") + ">" + lv.id + " " + esc(lv.title) + "<small>" + (o[lv.id] ? packStarText(o[lv.id]) : (open ? "未過" : "鎖定")) + "</small></button>";
  });
  var inf = packUnlocked("inf");
  h += '<button ' + (inf ? 'onclick="packStart(\'inf\')"' : "disabled") + '>無限<small>' + (o.inf ? packStarText(o.inf) : (inf ? "隨機" : "過第12關")) + "</small></button></div>";
  $("g-body").innerHTML = h;
  packBest();
}
function packEndless() {
  var pool = ["passport", "tshirt", "charger", "raincoat", "umbrella", "camera", "power_bank", "power_bank", "sunscreen", "toothpaste", "jeans", "bottle", "socks", "firstaid", "foldbag"];
  var items = ["passport", "raincoat", "tshirt", "camera", "power_bank", "power_bank", "bottle"];
  pool.forEach(function (id) {
    if (items.length >= 8) return;
    if (items.indexOf(id) >= 0 && id !== "power_bank") return;
    if (Math.random() < 0.55) items.push(id);
  });
  return {
    id: "inf", title: "隨機行程",
    hint: "規則全開，限 24 步。水壺不能帶。",
    weightLimit: 18, weightStar: 12, moves: 24,
    liquidMax: 100, heavy: 3,
    blocked: [[0, 0], [5, 7]],
    banned: ["bottle"],
    required: ["passport", "raincoat", "tshirt"],
    items: items
  };
}
function packStart(id) {
  var lv = id === "inf" ? packEndless() : packLevels.filter(function (x) { return x.id === id; })[0];
  if (!lv || !packUnlocked(id)) return;
  var n = {}, pieces = [];
  lv.items.forEach(function (itemId) {
    n[itemId] = (n[itemId] || 0) + 1;
    pieces.push({ uid: n[itemId] === 1 ? itemId : itemId + "#" + n[itemId], id: itemId, x: 0, y: 0, rot: 0, on: 0 });
  });
  PK = { level: lv, pieces: pieces, moves: 0, undo: [], sel: pieces[0].uid, won: 0, timer: 0, drag: null };
  packDraw();
}
function packPiece(uid) {
  return PK.pieces.filter(function (p) { return p.uid === uid; })[0];
}
function packPlaced() {
  return PK.pieces.filter(function (p) { return p.on; });
}
function packPush() {
  PK.undo.push(JSON.stringify({ pieces: PK.pieces, moves: PK.moves }));
  if (PK.undo.length > 30) PK.undo.shift();
}
function packUndo() {
  if (!PK || PK.won || !PK.undo.length) return;
  var s = JSON.parse(PK.undo.pop());
  PK.pieces = s.pieces;
  PK.moves = s.moves;
  packDraw();
}
function packRestart() {
  if (!PK || PK.won) return;
  packStart(PK.level.id);
}
function packRotate() {
  if (!PK || PK.won || !PK.sel) return;
  var p = packPiece(PK.sel);
  if (!p) return;
  packPush();
  p.rot = p.rot ? 0 : 1;
  if (p.on && PackRules.geom(PK.level, packPlaced(), packCat).bad) {
    packUndo();
    toast("轉不過去");
    return;
  }
  packDraw();
  packJudge();
}
function packTake() {
  if (!PK || PK.won || !PK.sel) return;
  var p = packPiece(PK.sel);
  if (!p || !p.on) return;
  packPush();
  p.on = 0;
  PK.moves++;
  packDraw();
  packJudge();
}
function packDrop(uid, x, y) {
  if (!PK || PK.won) return;
  var p = packPiece(uid);
  if (!p) return;
  var prev = { x: p.x, y: p.y, rot: p.rot, on: p.on };
  packPush();
  p.x = x; p.y = y; p.on = 1;
  var bad = PackRules.geom(PK.level, packPlaced(), packCat).bad;
  if (bad) {
    p.x = prev.x; p.y = prev.y; p.rot = prev.rot; p.on = prev.on;
    PK.undo.pop();
    toast(bad === "corner" ? "這個角不能放" : "這裡放不下");
    return;
  }
  PK.sel = uid;
  PK.moves++;
  packDraw();
  packJudge();
}
function packJudge() {
  if (!PK || PK.won) return;
  var ev = PackRules.evaluate(PK.level, packPlaced(), packCat);
  if (ev.bad || ev.errors.length || ev.missing.length) return ev;
  var n = 1;
  if (ev.weight <= PK.level.weightStar) n++;
  if (PK.moves <= PK.level.moves) n++;
  PK.won = n;
  packSaveStar(PK.level.id, n);
  packBest();
  var box = $("g-body");
  var note = document.createElement("div");
  note.className = "pk-meta";
  note.style.color = "#9C4221";
  note.style.fontWeight = "700";
  note.textContent = "過關了 " + packStarText(n);
  box.insertBefore(note, box.firstChild);
  var next = PK.level.id === "inf" ? "inf" : (PK.level.id < 12 ? PK.level.id + 1 : null);
  PK.timer = setTimeout(function () {
    if (next) packStart(next);
    else packMap();
  }, 1500);
  return ev;
}
function packName(id) {
  return (packCat[id] && packCat[id].name) || id;
}
function packDraw() {
  if (!PK) return;
  var lv = PK.level;
  var ev = PackRules.evaluate(lv, packPlaced(), packCat);
  var need = {};
  (lv.required || []).forEach(function (id) { need[id] = (need[id] || 0) + 1; });
  var have = {};
  packPlaced().forEach(function (p) { have[p.id] = (have[p.id] || 0) + 1; });
  var miss = [];
  Object.keys(need).forEach(function (id) {
    for (var i = have[id] || 0; i < need[id]; i++) miss.push(packName(id));
  });
  var bits = ["重量 " + ev.weight + "/" + lv.weightLimit, "步數 " + PK.moves + "/" + lv.moves];
  if (lv.liquidMax != null) bits.push("液體 " + ev.liquid + "/" + lv.liquidMax + " ml");
  var warn = [];
  if (ev.errors.indexOf("weight") >= 0) warn.push("超重了");
  if (ev.errors.indexOf("liquid") >= 0) warn.push("液體超過 100 ml");
  if (ev.errors.indexOf("fragile") >= 0) warn.push("重物壓到易碎品");
  if (ev.errors.indexOf("battery") >= 0) warn.push("行動電源要隔開");
  if (ev.errors.indexOf("banned") >= 0) warn.push("有禁帶物品");
  if (miss.length) warn.push("必帶還缺：" + miss.join("、"));
  var h = '<div class="pk-top"><b>' + esc(lv.title) + '</b><button class="gback" onclick="packMap()">選關</button></div>';
  h += '<div class="pk-meta">' + esc(lv.hint) + "<br>" + bits.join(" · ") + "</div>";
  if (warn.length) h += '<div class="pk-meta" style="color:#9C4221">' + esc(warn.join("。")) + "</div>";
  h += '<div class="pk-board" id="pk-board">';
  var block = {};
  (lv.blocked || []).forEach(function (p) { block[p[0] + "," + p[1]] = 1; });
  for (var y = 0; y < 8; y++) {
    for (var x = 0; x < 6; x++) h += '<div class="pk-cell' + (block[x + "," + y] ? " block" : "") + '"></div>';
  }
  PK.pieces.forEach(function (p) {
    if (!p.on) return;
    var def = packCat[p.id];
    var f = PackRules.footprint(def, p.rot);
    h += '<div class="pk-piece' + (p.uid === PK.sel ? " on" : "") + '" data-uid="' + esc(p.uid) + '" style="left:' + (p.x / 6 * 100) + "%;top:" + (p.y / 8 * 100) + "%;width:" + (f.w / 6 * 100) + "%;height:" + (f.h / 8 * 100) + '%"><img src="games/packing/' + def.asset + '" alt="' + esc(def.name) + '"></div>';
  });
  h += '</div><div class="pk-tray" id="pk-tray">';
  PK.pieces.forEach(function (p) {
    if (p.on) return;
    var def = packCat[p.id];
    var req = (lv.required || []).indexOf(p.id) >= 0;
    h += '<button type="button" class="' + (p.uid === PK.sel ? "on " : "") + (req ? "need" : "") + '" data-uid="' + esc(p.uid) + '"><img src="games/packing/' + def.asset + '" alt=""><span>' + esc(def.name) + (req ? "・必" : "") + "</span></button>";
  });
  h += '</div><div class="pk-actions">';
  h += '<button type="button" onclick="packRotate()">旋轉</button>';
  h += '<button type="button" onclick="packTake()">拿出</button>';
  h += '<button type="button" onclick="packUndo()">悔棋</button>';
  h += '<button type="button" onclick="packRestart()">重開</button></div>';
  $("g-body").innerHTML = h;
  packBind();
}
function packCellAt(clientX, clientY) {
  var board = $("pk-board");
  if (!board) return null;
  var r = board.getBoundingClientRect();
  if (clientX < r.left || clientY < r.top || clientX > r.right || clientY > r.bottom) return null;
  return {
    x: Math.max(0, Math.min(5, Math.floor((clientX - r.left) / r.width * 6))),
    y: Math.max(0, Math.min(7, Math.floor((clientY - r.top) / r.height * 8)))
  };
}
function packBind() {
  var board = $("pk-board");
  if (!board) return;
  board.addEventListener("pointerdown", function (e) {
    var piece = e.target.closest ? e.target.closest(".pk-piece") : null;
    if (piece) {
      PK.sel = piece.getAttribute("data-uid");
      packDragStart(e, PK.sel);
      return;
    }
    var cell = packCellAt(e.clientX, e.clientY);
    if (cell && PK.sel) {
      var p = packPiece(PK.sel);
      if (p && !p.on) packDrop(PK.sel, cell.x, cell.y);
    }
  });
  var tray = $("pk-tray");
  tray.addEventListener("pointerdown", function (e) {
    var btn = e.target.closest ? e.target.closest("button") : null;
    if (!btn) return;
    PK.sel = btn.getAttribute("data-uid");
    packDragStart(e, PK.sel);
  });
}
function packDragStart(e, uid) {
  if (!PK || PK.won) return;
  PK.drag = { uid: uid, x: e.clientX, y: e.clientY, moved: 0 };
  PK.sel = uid;
  function move(ev) {
    if (!PK || !PK.drag) return;
    if (Math.abs(ev.clientX - PK.drag.x) + Math.abs(ev.clientY - PK.drag.y) > 8) PK.drag.moved = 1;
    if (!PK.drag.moved) return;
    var g = document.getElementById("pk-ghost");
    var def = packCat[packPiece(uid).id];
    if (!g) {
      g = document.createElement("img");
      g.id = "pk-ghost";
      g.className = "pk-ghost";
      g.src = "games/packing/" + def.asset;
      document.body.appendChild(g);
    }
    g.style.left = (ev.clientX - 32) + "px";
    g.style.top = (ev.clientY - 32) + "px";
  }
  function up(ev) {
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", up);
    var drag = PK && PK.drag;
    PK.drag = null;
    var g = document.getElementById("pk-ghost");
    if (g) g.remove();
    if (!drag || !drag.moved) { packDraw(); return; }
    var cell = packCellAt(ev.clientX, ev.clientY);
    if (cell) packDrop(uid, cell.x, cell.y);
    else packDraw();
  }
  document.addEventListener("pointermove", move);
  document.addEventListener("pointerup", up);
}
