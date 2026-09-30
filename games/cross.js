/* 河內過馬路。單機，車流現算，星星只存在這支手機。 */
var CX = null;
var CROSS_W = { moto: 1.2, taxi: 1.55, cyclo: 1.5, bus: 2.2 };

function crossCSS() {
  if (document.getElementById("cross-css")) return;
  var s = document.createElement("style");
  s.id = "cross-css";
  s.textContent = [
    ".x-top{display:flex;justify-content:space-between;gap:8px;align-items:baseline}",
    ".x-meta{font-size:12px;color:var(--ink2);margin:4px 0 8px;line-height:1.45}",
    ".x-road{position:relative;height:min(32vh,230px);border:1px solid var(--line);border-radius:4px;overflow:hidden;touch-action:none;background:#E7E0D4}",
    ".x-row{position:absolute;left:0;right:0}",
    ".x-row.walk{background:#EFE6D6 center/auto 70% repeat-x url(games/crossing/assets/sprites/crosswalk.webp)}",
    ".x-row.island{background:#E7D7C0 center/auto 80% repeat-x url(games/crossing/assets/sprites/island.webp)}",
    ".x-row.road{background:#D9CDB8}",
    ".x-car,.x-player{position:absolute;object-fit:contain;pointer-events:none}",
    ".x-player{z-index:3}",
    ".x-rain{position:absolute;inset:0;background:rgba(90,110,120,.28);pointer-events:none;z-index:4}",
    ".x-actions{display:grid;grid-template-columns:1fr 1.4fr 1fr;gap:6px;margin-top:8px}",
    ".x-actions button,.x-wide{min-height:48px;border:1px solid var(--line2);background:#fff;border-radius:4px;font-weight:700;font-size:15px;touch-action:manipulation}",
    ".x-wide{display:block;width:100%;margin-top:6px}",
    ".x-map{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:10px}",
    ".x-map button{min-height:56px;border:1px solid var(--line);background:#fff;border-radius:4px;font-weight:700}",
    ".x-map button small{display:block;font-weight:400;color:var(--ink3);margin-top:2px}",
    ".x-map button:disabled{opacity:.38}",
    ".x-fail{margin-top:8px;font-weight:700;color:#9C4221}"
  ].join("");
  document.head.appendChild(s);
}
function crossStars() {
  try { return JSON.parse(localStorage.getItem("vn6p:cross-stars") || "{}"); } catch (e) { return {}; }
}
function crossSaveStar(id, n) {
  var o = crossStars();
  if ((o[id] || 0) < n) o[id] = n;
  try { localStorage.setItem("vn6p:cross-stars", JSON.stringify(o)); } catch (e) {}
}
function crossStarText(n) {
  n = n || 0;
  return "★★★".slice(0, n) + "☆☆☆".slice(n);
}
function crossBest() {
  var el = $("best-crossing");
  if (!el) return;
  var o = crossStars(), sum = 0;
  Object.keys(o).forEach(function (k) { sum += o[k] || 0; });
  el.textContent = sum ? ("星星 " + sum) : "尚未過關";
}
function crossStop() {
  if (!CX) return;
  CX.playing = 0;
  if (CX.raf) cancelAnimationFrame(CX.raf);
  CX.raf = 0;
  if (CX.hold) clearTimeout(CX.hold);
  CX.hold = 0;
  if (CX.timer) clearTimeout(CX.timer);
  CX.timer = 0;
}
function crossInit() {
  if (!requireMe()) { closeGame(); return; }
  stopLoops();
  crossCSS();
  crossStop();
  if (CX && CX.levels) { crossMap(); return; }
  $("g-body").innerHTML = '<div class="d">正在看馬路…</div>';
  fetch("games/crossing/data/levels.json").then(function (r) { return r.json(); }).then(function (levels) {
    CX = { levels: levels, playing: 0, raf: 0, cars: [], hold: 0, timer: 0 };
    crossMap();
  }).catch(function () {
    $("g-body").innerHTML = '<div class="d">過馬路載入失敗。連線後再開一次這款。</div>';
  });
}
function crossUnlocked(id) {
  if (id === 1) return true;
  return (crossStars()[id - 1] || 0) > 0;
}
function crossMap() {
  crossStop();
  var o = crossStars();
  var h = '<div class="x-top"><b>河內過馬路</b></div><div class="x-meta">點一下前進。被車碰到就重來。星星存在這支手機。</div><div class="x-map">';
  CX.levels.forEach(function (lv) {
    var open = crossUnlocked(lv.id);
    h += '<button ' + (open ? 'onclick="crossStart(' + lv.id + ')"' : "disabled") + ">" + lv.id + " " + esc(lv.title) + "<small>" + (o[lv.id] ? crossStarText(o[lv.id]) : (open ? "未過" : "鎖定")) + "</small></button>";
  });
  h += "</div>";
  $("g-body").innerHTML = h;
  crossBest();
}
function crossStart(id) {
  var lv = CX.levels.filter(function (x) { return x.id === id; })[0];
  if (!lv || !crossUnlocked(id)) return;
  crossStop();
  CX.level = lv;
  CX.col = 2;
  CX.row = 0;
  CX.cars = [];
  CX.stays = 0;
  CX.t0 = 0;
  CX.playing = 1;
  CX.dead = 0;
  CX.won = 0;
  CX.waited = 0;
  CX.stepLock = 0;
  CX.last = 0;
  lv.lanes.forEach(function (lane) { lane.acc = Math.random() * (lane.gap || 1); });
  crossDraw();
  CX.raf = requestAnimationFrame(crossFrame);
}
function crossDraw() {
  var lv = CX.level;
  var h = '<div class="x-top"><b>' + esc(lv.title) + '</b><button class="gback" onclick="crossMap()">選關</button></div>';
  h += '<div class="x-meta" id="x-meta">' + esc(lv.hint) + "</div>";
  h += '<div class="x-road" id="x-road">';
  var n = lv.lanes.length;
  for (var i = n - 1; i >= 0; i--) {
    var lane = lv.lanes[i];
    var top = (n - 1 - i) / n * 100;
    h += '<div class="x-row ' + lane.kind + '" style="top:' + top + "%;height:" + (100 / n) + '%"></div>';
  }
  h += '<img class="x-player" id="x-player" alt="" src="games/crossing/assets/sprites/player.webp">';
  if (lv.rain) h += '<div class="x-rain"></div>';
  h += '</div>';
  h += '<div class="x-actions">';
  h += '<button type="button" onclick="crossSide(-1)">左</button>';
  h += '<button type="button" id="x-go">前進</button>';
  h += '<button type="button" onclick="crossSide(1)">右</button>';
  h += '</div>';
  h += '<button type="button" class="x-wide" onclick="crossWait()">等一下</button>';
  h += '<button type="button" class="x-wide" onclick="crossStart(' + lv.id + ')">重來</button>';
  h += '<div class="x-fail" id="x-fail"></div>';
  $("g-body").innerHTML = h;
  var go = $("x-go");
  go.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    if (CX.hold) clearTimeout(CX.hold);
    CX.sprinted = 0;
    if (lv.sprint) {
      CX.hold = setTimeout(function () { CX.sprinted = 1; crossStep(2); }, 320);
    }
  });
  go.addEventListener("pointerup", function () {
    if (CX.hold) clearTimeout(CX.hold);
    CX.hold = 0;
    if (!CX.sprinted) crossStep(1);
  });
  go.addEventListener("pointerleave", function () {
    if (CX.hold) clearTimeout(CX.hold);
    CX.hold = 0;
  });
  go.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  crossPlacePlayer();
  crossPaintCars();
}
function crossLaneH() {
  var road = $("x-road");
  if (!road) return 48;
  return road.clientHeight / CX.level.lanes.length;
}
function crossPlacePlayer() {
  var img = $("x-player");
  var road = $("x-road");
  if (!img || !road) return;
  var n = CX.level.lanes.length;
  var h = crossLaneH();
  img.style.width = (road.clientWidth / 6 * 0.7) + "px";
  img.style.height = (h * 0.86) + "px";
  img.style.left = ((CX.col + 0.15) / 6 * road.clientWidth) + "px";
  img.style.top = ((n - 1 - CX.row) * h + h * 0.07) + "px";
  img.src = "games/crossing/assets/sprites/" + (CX.step % 2 ? "player_step" : "player") + ".webp";
}
function crossSprite(car) {
  if (car.type === "moto") return car.dir < 0 ? "moto_l" : "moto_r";
  return car.type;
}
function crossPaintCars() {
  var road = $("x-road");
  if (!road) return;
  var old = road.querySelectorAll(".x-car");
  for (var i = 0; i < old.length; i++) old[i].remove();
  var h = crossLaneH();
  var w = road.clientWidth;
  CX.cars.forEach(function (car) {
    var idx = CX.level.lanes.indexOf(car.lane);
    if (idx < 0) return;
    var img = document.createElement("img");
    img.className = "x-car";
    img.alt = "";
    img.src = "games/crossing/assets/sprites/" + crossSprite(car) + ".webp";
    img.style.width = (car.w / 6 * w) + "px";
    img.style.height = (h * 0.82) + "px";
    img.style.left = (car.x / 6 * w) + "px";
    img.style.top = ((CX.level.lanes.length - 1 - idx) * h + h * 0.09) + "px";
    road.appendChild(img);
  });
}
function crossMeta() {
  var el = $("x-meta");
  if (!el || !CX || !CX.level) return;
  var sec = CX.t0 ? Math.round((performance.now() - CX.t0) / 1000) : 0;
  el.textContent = CX.level.hint + "  ·  停留 " + CX.stays + "  ·  " + sec + " 秒";
}
function crossHit(col, row) {
  var lane = CX.level.lanes[row];
  if (!lane || lane.kind !== "road") return false;
  return CX.cars.some(function (car) {
    return car.lane === lane && car.x < col + 0.8 && car.x + car.w > col;
  });
}
function crossBegin() {
  if (!CX.t0) CX.t0 = performance.now();
}
function crossSide(d) {
  if (!CX || !CX.playing || CX.dead || CX.won) return;
  var col = CX.col + d;
  if (col < 0 || col > 5) return;
  if (crossHit(col, CX.row)) { crossDie(); return; }
  crossBegin();
  CX.col = col;
  CX.step = (CX.step || 0) + 1;
  CX.waited = 0;
  crossPlacePlayer();
}
function crossStep(n) {
  if (!CX || !CX.playing || CX.dead || CX.won) return;
  if (CX.level.slow && performance.now() < CX.stepLock) return;
  crossBegin();
  CX.waited = 0;
  for (var i = 0; i < n; i++) {
    if (CX.row >= CX.level.lanes.length - 1) break;
    var nr = CX.row + 1;
    if (crossHit(CX.col, nr)) { CX.row = nr; crossPlacePlayer(); crossDie(); return; }
    CX.row = nr;
    CX.step = (CX.step || 0) + 1;
  }
  if (CX.level.slow) CX.stepLock = performance.now() + 420;
  crossPlacePlayer();
  if (CX.level.lanes[CX.row].goal) crossWin();
}
function crossWait() {
  if (!CX || !CX.playing || CX.dead || CX.won) return;
  crossBegin();
  CX.stays++;
  CX.waited = CX.level.lanes[CX.row].kind === "road" ? 1 : 0;
  crossMeta();
}
function crossDie() {
  if (!CX || CX.dead || CX.won) return;
  CX.dead = 1;
  CX.playing = 0;
  var el = $("x-fail");
  if (el) el.textContent = CX.waited ? "不要突然停在車流中間" : "被車碰到了";
}
function crossWin() {
  if (!CX || CX.won || CX.dead) return;
  CX.won = 1;
  CX.playing = 0;
  var sec = (performance.now() - CX.t0) / 1000;
  var n = 1;
  if (CX.stays <= CX.level.stayMax) n++;
  if (sec <= CX.level.timeMax) n++;
  crossSaveStar(CX.level.id, n);
  crossBest();
  var el = $("x-fail");
  if (el) { el.style.color = "#2F6B4F"; el.textContent = "過關了 " + crossStarText(n); }
  var next = CX.level.id < CX.levels.length ? CX.level.id + 1 : 0;
  CX.timer = setTimeout(function () {
    if (next && crossUnlocked(next)) crossStart(next);
    else crossMap();
  }, 1200);
}
function crossSpawn(lane) {
  if (CX.cars.length >= 12) return;
  var type = lane.types[Math.floor(Math.random() * lane.types.length)];
  var w = CROSS_W[type] || 1.2;
  CX.cars.push({
    lane: lane, type: type, w: w, dir: lane.dir,
    x: lane.dir > 0 ? -w : 6,
    shift: !!(lane.shift && Math.random() < 0.4),
    cool: 1.4
  });
}
function crossFrame(t) {
  if (!CX || !CX.playing) return;
  var dt = CX.last ? Math.min(0.05, (t - CX.last) / 1000) : 0.016;
  CX.last = t;
  var lanes = CX.level.lanes;
  lanes.forEach(function (lane) {
    if (lane.kind !== "road") return;
    lane.acc = (lane.acc || 0) + dt;
    if (lane.acc >= lane.gap) { lane.acc = 0; crossSpawn(lane); }
  });
  CX.cars.forEach(function (car) {
    car.x += car.dir * car.lane.speed * dt;
    if (car.shift) {
      car.cool -= dt;
      if (car.cool <= 0) {
        car.cool = 1.7;
        var i = lanes.indexOf(car.lane);
        var alt = null;
        for (var d = 1; d < lanes.length && !alt; d++) {
          if (lanes[i + d] && lanes[i + d].kind === "road") alt = lanes[i + d];
          else if (lanes[i - d] && lanes[i - d].kind === "road") alt = lanes[i - d];
        }
        if (alt) car.lane = alt;
      }
    }
  });
  CX.cars = CX.cars.filter(function (car) { return car.x < 8 && car.x > -car.w - 2; });
  if (crossHit(CX.col, CX.row)) crossDie();
  else {
    crossPaintCars();
    crossMeta();
    CX.raf = requestAnimationFrame(crossFrame);
  }
  if (CX.dead) crossPaintCars();
}
