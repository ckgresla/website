// orrery.js — an interactive, offline solar-system view.
//   • Orrery (heliocentric map) ⇄ Sky (geocentric zodiac wheel)
//   • real positions from Keplerian elements — no network, fully offline
//   • drag the timeline to run time; ▶ to play; pinch/drag to zoom & pan
//   • tap a body for live readouts; gear for settings
(function () {
  "use strict";
  var D2R = Math.PI / 180, R2D = 180 / Math.PI, J2000 = 2451545;
  var root = document.documentElement;

  // --- Keplerian elements -----------------------------------------------------
  // Planets: JPL approximate elements (a,e,I,L,ϖ,Ω) + per-century rates.
  var EL = {
    Mercury: [0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593, 0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081],
    Venus: [0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255, 0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418],
    Earth: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0, 0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0],
    Mars: [1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891, 0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
    Jupiter: [5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909, -0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106],
    Saturn: [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448, -0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794],
    Uranus: [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503, -0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589],
    Neptune: [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574, 0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664]
  };
  // Small bodies: fixed J2000 elements [a,e,i,Ω,ω,M0], propagated by mean motion.
  var SMALL = {
    Pluto: [39.482, 0.2488, 17.16, 110.30, 113.76, 14.86],
    Ceres: [2.7691, 0.0760, 10.594, 80.33, 73.92, 77.37],
    Eris: [67.86, 0.441, 44.04, 35.95, 150.98, 204.16],
    Haumea: [43.18, 0.191, 28.21, 122.1, 238.7, 218.0],
    Makemake: [45.43, 0.159, 28.98, 79.37, 295.15, 153.8],
    Halley: [17.834, 0.96714, 162.26, 58.42, 111.33, 66.4]
  };
  var DIAM = { Sun: 1391000, Mercury: 4879, Venus: 12104, Earth: 12742, Mars: 6779, Jupiter: 139820, Saturn: 116460, Uranus: 50724, Neptune: 49244, Pluto: 2376, Ceres: 940, Eris: 2326, Haumea: 1560, Makemake: 1430, Halley: 11 };
  var PLANETS = ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"];
  var DWARFS = ["Pluto", "Ceres", "Eris", "Haumea", "Makemake"];
  var COMETS = ["Halley"];
  var TYPE = {}; PLANETS.forEach(function (n) { TYPE[n] = "Planet"; }); DWARFS.forEach(function (n) { TYPE[n] = "Dwarf planet"; }); TYPE.Halley = "Comet"; TYPE.Sun = "Star"; TYPE.Moon = "Moon";

  function norm360(x) { x %= 360; return x < 0 ? x + 360 : x; }
  function solveKepler(Mdeg, e) {
    var M = norm360(Mdeg); if (M > 180) M -= 360;
    var E = M + R2D * e * Math.sin(M * D2R);
    for (var i = 0; i < 10; i++) { var dE = (M - (E - R2D * e * Math.sin(E * D2R))) / (1 - e * Math.cos(E * D2R)); E += dE; if (Math.abs(dE) < 1e-7) break; }
    return E;
  }
  function toXYZ(a, e, iDeg, Odeg, wdeg, Mdeg) {
    var E = solveKepler(Mdeg, e) * D2R;
    var xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
    var w = wdeg * D2R, O = Odeg * D2R, I = iDeg * D2R;
    var cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(O), sO = Math.sin(O), ci = Math.cos(I), si = Math.sin(I);
    var x = (cw * cO - sw * sO * ci) * xp + (-sw * cO - cw * sO * ci) * yp;
    var y = (cw * sO + sw * cO * ci) * xp + (-sw * sO + cw * cO * ci) * yp;
    var z = (sw * si) * xp + (cw * si) * yp;
    return { a: a, x: x, y: y, z: z, r: Math.hypot(x, y, z), lon: norm360(Math.atan2(y, x) * R2D) };
  }
  function bodyPos(name, jd) {
    if (EL[name]) {
      var T = (jd - J2000) / 36525, el = EL[name];
      var a = el[0] + el[6] * T, e = el[1] + el[7] * T, I = el[2] + el[8] * T, L = el[3] + el[9] * T, p = el[4] + el[10] * T, O = el[5] + el[11] * T;
      return toXYZ(a, e, I, O, p - O, L - p);
    }
    var s = SMALL[name], n = 0.9856076686 / (s[0] * Math.sqrt(s[0]));
    return toXYZ(s[0], s[1], s[2], s[3], s[4], s[5] + n * (jd - J2000));
  }

  // --- Canvas / state ---------------------------------------------------------
  var canvas = document.getElementById("view"), ctx = canvas.getContext("2d");
  var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2.5);
  function resize() { W = canvas.clientWidth; H = canvas.clientHeight; canvas.width = W * DPR; canvas.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); }
  window.addEventListener("resize", resize);

  var DEFAULTS = { view: "orrery", level: "1", labels: true, orbits: true, theme: "auto" };
  var S = load("orrery.settings", null) || {};
  for (var k in DEFAULTS) if (!(k in S)) S[k] = DEFAULTS[k];
  function load(key, d) { try { var v = localStorage.getItem(key); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function save() { try { localStorage.setItem("orrery.settings", JSON.stringify(S)); } catch (e) {} }

  var cam = { zoom: 1, px: 0, py: 0 };       // orrery pan/zoom
  var offsetDays = 0, playing = false, playSpeed = 3; // time scrub
  var selected = null;
  var screenPos = {};                          // name -> {x,y,r} for hit-testing

  function activeBodies() {
    var lvl = parseInt(S.level, 10);
    var list = PLANETS.slice();
    if (lvl >= 2) list = list.concat(DWARFS);
    if (lvl >= 3) list = list.concat(COMETS);
    return list;
  }
  function nowJD() { return Date.now() / 86400000 + 2440587.5 + offsetDays; }
  function logA(a) { return Math.log10(a); }
  var LA0 = logA(0.39), LA1 = logA(72), RMIN = 0.12, RMAX = 0.92;
  function ringR(a, base) { return (RMIN + (logA(a) - LA0) / (LA1 - LA0) * (RMAX - RMIN)) * base; }
  function discR(d) { return Math.max(2, 2 + 2.5 * (Math.log10(d) - Math.log10(2300))); }
  function col(name) { return name === "Earth" ? css("--accent") : (selected === name ? css("--accent") : css("--fg")); }
  function css(v) { return getComputedStyle(root).getPropertyValue(v).trim(); }

  // --- Render -----------------------------------------------------------------
  function render() {
    ctx.clearRect(0, 0, W, H);
    var jd = nowJD();
    var pos = {}; activeBodies().forEach(function (n) { pos[n] = bodyPos(n, jd); });
    pos.Earth = pos.Earth || bodyPos("Earth", jd);
    screenPos = {};
    if (S.view === "sky") renderSky(pos); else renderOrrery(pos);
    updateHUD(jd);
  }

  function renderOrrery(pos) {
    var cx = W / 2 + cam.px, cy = H / 2 + cam.py, base = Math.min(W, H) * cam.zoom;
    var fg = css("--fg"), line = css("--line"), muted = css("--muted"), accent = css("--accent");
    var lvl = parseInt(S.level, 10);

    // belts
    if (lvl >= 2) {
      ctx.strokeStyle = muted; ctx.globalAlpha = 0.35;
      [[2.7, 4], [43, 5]].forEach(function (b) { ctx.setLineDash([1, b[1]]); ctx.lineWidth = b[1] + 1; ring(cx, cy, ringR(b[0], base)); });
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    // orbit rings
    if (S.orbits) {
      ctx.strokeStyle = line; ctx.lineWidth = 1;
      activeBodies().forEach(function (n) { if (DIAM[n]) ring(cx, cy, ringR(pos[n].a, base)); });
    }
    // zodiac ticks
    ctx.strokeStyle = muted; ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
    for (var i = 0; i < 12; i++) { var a = i * 30 * D2R, r0 = RMAX * base + 6, r1 = RMAX * base + 13; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy - Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy - Math.sin(a) * r1); ctx.stroke(); }
    ctx.globalAlpha = 1;
    // sun
    var sr = 9 * Math.sqrt(cam.zoom);
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, sr * 2.6); g.addColorStop(0, fg); g.addColorStop(0.5, fg); g.addColorStop(1, "rgba(127,127,127,0)");
    ctx.fillStyle = g; disc(cx, cy, sr * 2.6); ctx.fillStyle = fg; disc(cx, cy, sr);
    // bodies
    activeBodies().forEach(function (n) {
      var p = pos[n], a = p.lon * D2R, R = ringR(p.a, base);
      var x = cx + Math.cos(a) * R, y = cy - Math.sin(a) * R, dr = discR(DIAM[n]);
      ctx.fillStyle = col(n); disc(x, y, dr);
      if (selected === n) { ctx.strokeStyle = accent; ctx.lineWidth = 1.5; ring(x, y, dr + 5); }
      screenPos[n] = { x: x, y: y, r: dr };
      if (S.labels) { ctx.fillStyle = n === "Earth" ? accent : muted; ctx.font = "11px Inter, sans-serif"; ctx.textBaseline = "middle"; ctx.fillText(n, x + dr + 4, y); }
    });
    // Earth's moon (a small companion dot)
    if (pos.Earth) {
      var ea = pos.Earth.lon * D2R, ER = ringR(pos.Earth.a, base), ex = cx + Math.cos(ea) * ER, ey = cy - Math.sin(ea) * ER;
      var m = bodyMoon(nowJD()), mx = ex + Math.cos(m) * 9, my = ey - Math.sin(m) * 9;
      ctx.fillStyle = muted; disc(mx, my, 1.8); screenPos.Moon = { x: mx, y: my, r: 4 };
    }
  }

  function renderSky(pos) {
    var cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.40;
    var fg = css("--fg"), line = css("--line"), muted = css("--muted"), accent = css("--accent");
    var E = pos.Earth;
    // ecliptic ring + zodiac ticks
    ctx.strokeStyle = line; ctx.lineWidth = 1; ring(cx, cy, R);
    ctx.strokeStyle = muted; ctx.globalAlpha = 0.5;
    for (var i = 0; i < 12; i++) { var a = i * 30 * D2R; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (R - 7), cy - Math.sin(a) * (R - 7)); ctx.lineTo(cx + Math.cos(a) * R, cy - Math.sin(a) * R); ctx.stroke(); }
    ctx.globalAlpha = 1;
    // Earth at center
    ctx.fillStyle = accent; disc(cx, cy, 5);
    if (S.labels) { ctx.fillStyle = accent; ctx.font = "11px Inter, sans-serif"; ctx.textBaseline = "middle"; ctx.fillText("Earth", cx + 9, cy); }
    // Sun + bodies at geocentric longitude
    function place(name, lon, dr) {
      var a = lon * D2R, x = cx + Math.cos(a) * R, y = cy - Math.sin(a) * R;
      ctx.fillStyle = name === "Sun" ? fg : col(name); disc(x, y, dr);
      if (selected === name) { ctx.strokeStyle = accent; ctx.lineWidth = 1.5; ring(x, y, dr + 5); }
      screenPos[name] = { x: x, y: y, r: dr };
      if (S.labels) { ctx.fillStyle = muted; ctx.font = "10px Inter, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(name, x + Math.cos(a) * 14, y - Math.sin(a) * 14); ctx.textAlign = "left"; }
    }
    place("Sun", norm360(Math.atan2(-E.y, -E.x) * R2D), 7);
    activeBodies().forEach(function (n) { if (n === "Earth") return; var gx = pos[n].x - E.x, gy = pos[n].y - E.y; place(n, norm360(Math.atan2(gy, gx) * R2D), discR(DIAM[n])); });
  }

  function bodyMoon(jd) { // crude geocentric lunar ecliptic longitude (rad), for the companion dot
    var d = jd - J2000, L = norm360(218.316 + 13.176396 * d), M = norm360(134.963 + 13.064993 * d);
    return norm360(L + 6.289 * Math.sin(M * D2R)) * D2R;
  }
  function ring(x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, 7); ctx.stroke(); }
  function disc(x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, 7); ctx.fill(); }

  // --- HUD / info -------------------------------------------------------------
  var elDate = document.getElementById("vdate"), elTitle = document.getElementById("vtitle"), info = document.getElementById("info");
  function p2(n) { return (n < 10 ? "0" : "") + n; }
  function updateHUD(jd) {
    elTitle.textContent = S.view === "sky" ? "SKY" : "ORRERY";
    var dt = new Date((jd - 2440587.5) * 86400000);
    var rel = offsetDays === 0 ? "now" : (offsetDays > 0 ? "+" : "−") + relSpan(Math.abs(offsetDays));
    elDate.textContent = dt.getUTCFullYear() + "-" + p2(dt.getUTCMonth() + 1) + "-" + p2(dt.getUTCDate()) + "  ·  " + rel;
    if (selected) refreshInfo(jd);
  }
  function relSpan(days) { if (days < 60) return Math.round(days) + "d"; if (days < 730) return Math.round(days / 30.44) + "mo"; return (days / 365.25).toFixed(1) + "y"; }
  function refreshInfo(jd) {
    var name = selected; if (name === "Sun" || name === "Moon") { var p0 = null; }
    var e = bodyPos("Earth", jd);
    info.querySelector('[data-role="nm"]').textContent = name;
    info.querySelector('[data-role="ty"]').textContent = TYPE[name] || "Body";
    if (name === "Sun") {
      info.querySelector('[data-role="rsun"]').textContent = "—";
      info.querySelector('[data-role="rearth"]').textContent = e.r.toFixed(3) + " AU";
      info.querySelector('[data-role="lon"]').textContent = norm360(Math.atan2(-e.y, -e.x) * R2D).toFixed(1) + "°";
    } else if (name === "Moon") {
      info.querySelector('[data-role="rsun"]').textContent = "—";
      info.querySelector('[data-role="rearth"]').textContent = "0.0026 AU";
      info.querySelector('[data-role="lon"]').textContent = (bodyMoon(jd) * R2D).toFixed(1) + "°";
    } else {
      var p = bodyPos(name, jd), gx = p.x - e.x, gy = p.y - e.y, gz = p.z - e.z;
      info.querySelector('[data-role="rsun"]').textContent = p.r.toFixed(3) + " AU";
      info.querySelector('[data-role="rearth"]').textContent = Math.hypot(gx, gy, gz).toFixed(3) + " AU";
      info.querySelector('[data-role="lon"]').textContent = (S.view === "sky" ? norm360(Math.atan2(gy, gx) * R2D) : p.lon).toFixed(1) + "°";
    }
  }
  function selectBody(name) { selected = name; if (name) { info.classList.add("on"); refreshInfo(nowJD()); } else info.classList.remove("on"); }

  // --- Interactions: canvas ---------------------------------------------------
  var ptr = { down: false, x: 0, y: 0, sx: 0, sy: 0, moved: 0, t: 0 };
  var pinch = { on: false, d0: 0, z0: 1, mx: 0, my: 0 };
  function dist2(t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY); }
  canvas.addEventListener("touchstart", function (e) {
    if (e.touches.length === 2 && S.view === "orrery") { pinch.on = true; pinch.d0 = dist2(e.touches); pinch.z0 = cam.zoom; pinch.mx = (e.touches[0].clientX + e.touches[1].clientX) / 2; pinch.my = (e.touches[0].clientY + e.touches[1].clientY) / 2; return; }
    cdown(e.touches[0]);
  }, { passive: true });
  canvas.addEventListener("touchmove", function (e) {
    if (pinch.on && e.touches.length === 2) { e.preventDefault(); setZoom(pinch.z0 * dist2(e.touches) / pinch.d0, pinch.mx, pinch.my); return; }
    if (ptr.down) { e.preventDefault(); cmove(e.touches[0]); }
  }, { passive: false });
  canvas.addEventListener("touchend", function (e) { if (pinch.on) { if (e.touches.length < 2) pinch.on = false; return; } cup(e.changedTouches[0]); });
  canvas.addEventListener("mousedown", function (e) { cdown(e); });
  window.addEventListener("mousemove", function (e) { if (ptr.down) cmove(e); });
  window.addEventListener("mouseup", function (e) { if (ptr.down) cup(e); });
  canvas.addEventListener("wheel", function (e) { e.preventDefault(); if (S.view === "orrery") setZoom(cam.zoom * (e.deltaY < 0 ? 1.1 : 0.9), e.clientX, e.clientY); }, { passive: false });
  function cdown(p) { ptr.down = true; ptr.x = ptr.sx = p.clientX; ptr.y = ptr.sy = p.clientY; ptr.moved = 0; ptr.t = Date.now(); }
  function cmove(p) {
    var dx = p.clientX - ptr.x, dy = p.clientY - ptr.y; ptr.moved += Math.abs(dx) + Math.abs(dy); ptr.x = p.clientX; ptr.y = p.clientY;
    if (S.view === "orrery") { cam.px += dx; cam.py += dy; }
  }
  function cup(p) {
    ptr.down = false;
    if (ptr.moved < 8 && Date.now() - ptr.t < 350) hitTest(p.clientX, p.clientY);
  }
  function setZoom(z, ox, oy) {
    z = Math.min(6, Math.max(0.4, z)); var cx = W / 2 + cam.px, cy = H / 2 + cam.py;
    var k = z / cam.zoom; cam.px = ox - (ox - cx) * k - W / 2; cam.py = oy - (oy - cy) * k - H / 2; cam.zoom = z;
  }
  function hitTest(x, y) {
    var best = null, bd = 22;
    for (var n in screenPos) { var s = screenPos[n], d = Math.hypot(x - s.x, y - s.y); if (d < Math.max(s.r + 8, 14) && d < bd) { bd = d; best = n; } }
    selectBody(best);
  }

  // --- Interactions: scrubber + play ------------------------------------------
  var track = document.getElementById("track"), knob = document.getElementById("knob"), nowBtn = document.getElementById("now"), playBtn = document.getElementById("play"), playIcon = document.getElementById("playicon");
  var RANGE = 365 * 3; // days each side
  function knobFromOffset() { var w = track.clientWidth; knob.style.left = (w / 2 + Math.max(-1, Math.min(1, offsetDays / RANGE)) * (w / 2 - 9)) + "px"; }
  function offsetFromX(clientX) { var r = track.getBoundingClientRect(), f = (clientX - r.left - 9) / (r.width - 18); offsetDays = Math.max(-1, Math.min(1, (f - 0.5) * 2)) * RANGE; }
  var tdown = false;
  function tStart(e) { tdown = true; setPlaying(false); offsetFromX((e.touches ? e.touches[0] : e).clientX); knobFromOffset(); }
  function tMove(e) { if (!tdown) return; e.preventDefault(); offsetFromX((e.touches ? e.touches[0] : e).clientX); knobFromOffset(); }
  function tEnd() { tdown = false; }
  track.addEventListener("touchstart", tStart, { passive: true });
  track.addEventListener("touchmove", tMove, { passive: false });
  track.addEventListener("touchend", tEnd);
  track.addEventListener("mousedown", function (e) { tStart(e); });
  window.addEventListener("mousemove", function (e) { tMove(e); });
  window.addEventListener("mouseup", tEnd);
  nowBtn.addEventListener("click", function () { offsetDays = 0; setPlaying(false); knobFromOffset(); });
  playBtn.addEventListener("click", function () { setPlaying(!playing); });
  function setPlaying(p) { playing = p; playIcon.innerHTML = p ? '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>' : '<path d="M7 5l12 7-12 7z"/>'; }
  function updateNowBtn() { nowBtn.classList.toggle("idle", offsetDays === 0); }

  // --- Menu -------------------------------------------------------------------
  var menu = document.getElementById("menu");
  document.getElementById("gear").addEventListener("click", function () { menu.classList.add("open"); syncMenu(); });
  function syncMenu() {
    menu.querySelectorAll("[data-set]").forEach(function (g) { var key = g.dataset.set; g.querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", b.dataset.val === String(S[key])); }); });
    menu.querySelectorAll(".switch").forEach(function (sw) { sw.classList.toggle("on", !!S[sw.dataset.toggle]); });
  }
  menu.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-val]");
    if (b && b.parentNode.dataset.set) { var key = b.parentNode.dataset.set; S[key] = b.dataset.val; save(); if (key === "theme") applyTheme(); syncMenu(); return; }
    var sw = e.target.closest(".switch");
    if (sw) { S[sw.dataset.toggle] = !S[sw.dataset.toggle]; save(); syncMenu(); return; }
    menu.classList.remove("open");
  });

  // --- Theme / wake lock / SW -------------------------------------------------
  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  function applyTheme() { root.setAttribute("data-theme", S.theme === "auto" ? (mq.matches ? "dark" : "light") : S.theme); }
  (mq.addEventListener ? mq.addEventListener.bind(mq, "change") : mq.addListener.bind(mq))(function () { if (S.theme === "auto") applyTheme(); });
  function acquireWake() { if ("wakeLock" in navigator) navigator.wakeLock.request("screen").catch(function () {}); }
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") acquireWake(); });
  var DEV = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"].indexOf(location.hostname) !== -1;
  if ("serviceWorker" in navigator && !DEV) window.addEventListener("load", function () { navigator.serviceWorker.register("/orrery-sw.js").catch(function () {}); });

  // --- Loop -------------------------------------------------------------------
  function frame() {
    if (playing) { offsetDays += playSpeed; if (offsetDays > RANGE) offsetDays = RANGE, setPlaying(false); knobFromOffset(); }
    updateNowBtn();
    render();
    requestAnimationFrame(frame);
  }
  applyTheme(); resize(); knobFromOffset(); setPlaying(false); acquireWake(); frame();
})();
