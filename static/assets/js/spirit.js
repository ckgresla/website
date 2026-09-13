// spirit.js — the ckg spirit, drawn live. The Eight Pebbles engine from
// design/logo/family.html (the forms: blob, loop, water, air, fire, earth,
// fire-candle) with a small renderer for the clock: mount a form into an
// <svg>, and it breathes — every instance shares one animation loop, paints
// at most 30 times a second, and the forms that only change on the 8 fps
// drawings (blob, loop, earth) paint only then. A change of form goes the
// page's way: the form closes into the Loop, rests a beat, and the Loop
// opens into the next, which holds still and then eases into its motion.
// A cycle picks the next form at random from a group, every so often.
// Motion off, or prefers-reduced-motion, and every instance holds its
// first drawing.
//
//   var inst = Spirit.mount(svg, { form: 'water', shadow: true, hand: 7 });
//   Spirit.form(inst, 'fire');                 // morph there by way of the Loop
//   Spirit.cycle(inst, ['water', 'fire'], 30); // a random one of these, every ~30 s
//   Spirit.cycle(inst, null);                  // stay
//   Spirit.shadow(inst, false); Spirit.unmount(inst);
//   Spirit.motion(false);                      // hold every instance still
//   Spirit.bake('earth', 0)                    // the 8 path d's of drawing 0, turn 0
//
// The geometry is the page's, verbatim: hand 7 draws exactly the pack's
// spirit-*.svg and the header's mark.
(function () {
  "use strict";
  var CX = 60, CY = 55, RY = 52, TAU = Math.PI * 2, FPS = 8;
  var SHADOW = 'M32 106 C34 100 82 99 86 105 C87 110 36 111 32 106 Z';
  var FORMS = ['blob', 'loop', 'water', 'air', 'fire', 'earth', 'fire-candle'];
  // seconds per clockwise revolution; which rings step round on the frames
  // rather than glide; and how long each form's own motion takes to repeat
  var TURN = { blob: 0, loop: 0, water: 14, air: 16, fire: 9, earth: 18, 'fire-candle': 12 };
  var STEPPED = { fire: 1, earth: 1 };
  var PERIOD = { blob: 3 / FPS, loop: 3 / FPS, earth: 3 / FPS, water: 7, air: 4, fire: 4, 'fire-candle': 8 };
  // a switch: form → Loop, a beat, Loop → next; then still a moment, then the ramp
  var LEG_MS = 420, DWELL_MS = 120, SETTLE_MS = 260, RAMP_MS = 900;

  // mulberry32 — small, seedable, good enough for a hand
  function rng(seed) {
    var t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      var r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  function f(v) { return Math.round(v * 10) / 10; }

  // Catmull-Rom through the points, emitted as cubic béziers; k is the
  // tension — 1/6 is the true Catmull-Rom, 0 makes every edge a straight line
  function crPath(p, closed, k) {
    var n = p.length;
    k = k === undefined ? 1 / 6 : k;
    function at(i) { return closed ? p[((i % n) + n) % n] : p[Math.max(0, Math.min(n - 1, i))]; }
    var segs = closed ? n : n - 1;
    var d = 'M' + f(p[0][0]) + ' ' + f(p[0][1]);
    for (var i = 0; i < segs; i++) {
      var p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      d += ' C' + f(p1[0] + (p2[0] - p0[0]) * k) + ' ' + f(p1[1] + (p2[1] - p0[1]) * k) +
           ' ' + f(p2[0] - (p3[0] - p1[0]) * k) + ' ' + f(p2[1] - (p3[1] - p1[1]) * k) +
           ' ' + f(p2[0]) + ' ' + f(p2[1]);
    }
    return closed ? d + ' Z' : d;
  }

  // ── the unit ─────────────────────────────────────────────────────
  // Points in polar form round the unit's own centre — pts[i] = [angle,
  // radius] — scaled by r (and by sx along the unit's x), turned by rot,
  // placed at x, y. Every form is eight of them.
  function unitPath(u) {
    var out = [], cr = Math.cos(u.rot), sr = Math.sin(u.rot), n = u.pts.length;
    for (var i = 0; i < n; i++) {
      var rr = u.pts[i][1] * u.r, x = rr * Math.cos(u.pts[i][0]) * u.sx, y = rr * Math.sin(u.pts[i][0]);
      out.push([u.x + x * cr - y * sr, u.y + x * sr + y * cr]);
    }
    return crPath(out, true, (1 - (u.sharp || 0)) / 6);
  }

  // A band: one piece of a ring of radius rho, centred at angle a, reaching th
  // either side, with its own half-widths at the start, end and middle, and a
  // crest pushing the middle of its outer edge outward. The Loop, Water, Air
  // and Fire are all bands. The end is the leading end: the ring turns
  // clockwise, so +th is ahead.
  function band(a, rho, th, wS, wE, wM, crest, cy, R, jit, flex, lean, peak, shear) {
    flex = flex || 0; lean = lean || 0; peak = peak || 0; shear = shear || 0;
    var SCALE = 10, UV = [[th + shear, wE + lean], [th - shear, -wE + lean], [-shear, -wM + flex], [-th - shear, -wS - lean], [-th + shear, wS - lean], [peak + shear, wM + crest + flex]], pts = [];
    for (var i = 0; i < 6; i++) {
      var x = (rho + UV[i][1]) * Math.sin(UV[i][0]), y = -((rho + UV[i][1]) * Math.cos(UV[i][0]) - rho);
      var ang = Math.atan2(y, x), target = TAU * i / 6;
      while (ang - target > Math.PI) ang -= TAU;
      while (target - ang > Math.PI) ang += TAU;
      pts.push([ang, Math.hypot(x, y) / SCALE * (1 + (R() - 0.5) * 2 * jit)]);
    }
    return { x: CX + rho * Math.cos(a), y: cy + rho * Math.sin(a), r: SCALE, sx: 1, rot: a + Math.PI / 2, pts: pts };
  }

  // ── the forms ────────────────────────────────────────────────────
  // Each takes a context: t (seconds), fi (frame index — the hand is re-rolled
  // from three seeds), phi (the turn, already stepped for the forms that
  // step), H (the hand), small (drawn at 16 px, so bands thicken).
  var L = {};
  function hand(c) { return rng(c.H * 1000 + (c.fi % 3) * 17); }

  // The eight fused at the centre, nested so the outermost draws the edge.
  L.blob = function (c) {
    var R = hand(c), out = [];
    for (var k = 0; k < 8; k++) {
      var jit = k ? 0.05 : 0.075, pts = [];
      for (var i = 0; i < 6; i++) pts.push([TAU * i / 6 + (R() - 0.5) * (TAU / 6) * 0.35, 1 + (R() - 0.5) * 2 * jit]);
      out.push({ x: CX, y: CY, r: 39 - k * 1.1, sx: 1, rot: TAU * k / 8, pts: pts });
    }
    return out;
  };
  // The stroke: a ring drawn a little past itself, in eight overlapping bands.
  var LOOP_EXT = 0.235, LOOP_H = TAU / 16 + 0.1 * TAU / 8;
  L.loop = function (c) {
    var R = hand(c), out = [], w = c.small ? 4.5 : 2.75;
    for (var k = 0; k < 8; k++) {
      var j = (k + 7) % 8, ck = -Math.PI / 2 + TAU * k / 8 + c.phi;
      var s = ck - LOOP_H - (j === 0 ? LOOP_EXT : 0), e = ck + LOOP_H + (j === 7 ? LOOP_EXT : 0);
      var a = (s + e) / 2 + (R() - 0.5) * 0.03, tt = (j + 0.5) / 8;
      var rho = 37 * (1 + 0.05 * (tt - 0.5)) * (1 + (R() - 0.5) * 0.04);
      out.push(band(a, rho, (e - s) / 2, w, w, w, 0, CY, R, 0.06));
    }
    return out;
  };
  // Water: eight balls of water, each wobbling like jelly — a two-lobed
  // wobble and a three-lobed one travelling round the ball at their own
  // paces. A swell runs round the ring every seven seconds. A lap in fourteen.
  L.water = function (c) {
    return eight(52, c, function (k, q, a, R, t) {
      var swell = Math.sin(TAU * t / 7 - TAU * k / 8), A2 = 0.09 + q.d * 0.06, A3 = 0.05 + q.e * 0.05, p2 = q.p2 / 4 * TAU, p3 = q.p1 / 4 * TAU, pts = [];
      for (var i = 0; i < 12; i++) { var th = TAU * i / 12; pts.push([th, 1 + A2 * Math.sin(2 * th - TAU * t / (7 / 3) + p2) + A3 * Math.sin(3 * th + TAU * t / (7 / 4) + p3)]); }
      return place(a + (q.a - 0.5) * 0.05, 33.5 + (q.b - 0.5) * 1.2 + 1.0 * swell, 8.0 * (0.95 + q.c * 0.1) * (1 + 0.05 * swell), 1, 0, boil(pts, R, 0.01));
    });
  };
  // Air: eight wisps with room between them, heads leading, tails trailing
  // thin; a breath so slow it is almost still.
  L.air = function (c) {
    var R = hand(c), Rh = rng(c.H * 1000 + 6), out = [], t = c.t, wf = c.small ? 1.64 : 1;
    for (var k = 0; k < 8; k++) {
      var al = TAU * k / 8;
      var a = al - Math.PI / 2 + c.phi + (Rh() - 0.5) * 0.1;
      var rho = 34 + (Rh() - 0.5) * 2 + 0.8 * Math.sin(TAU * t / 4 - al);
      var th = (Math.PI / 8) * 0.6 * (1 + 0.06 * Math.sin(TAU * t / 4 + al));
      var wM = (2.6 + 0.3 * Math.sin(TAU * t / 4 + al + 2)) * wf;
      out.push(band(a, rho, th, 0.3 * wM, wM, wM, 0, RY, R, 0.04));
    }
    return out;
  };
  // Fire: the stroke torn into licks — tendrils poof outward and die back at
  // moments of their own, and every four seconds the whole ring flares.
  L.fire = function (c) {
    var R = hand(c), Rh = rng(c.H * 1000 + 5), out = [], t = c.t, wf = c.small ? 1.64 : 1;
    var breath = Math.pow(Math.max(0, Math.sin(TAU * t / 4)), 3);
    function poof(tau) { var u = ((t - tau) % 4 + 4) % 4; return u < 0.7 ? (1 - u / 0.7) * Math.min(1, u / 0.12) : 0; }
    for (var k = 0; k < 8; k++) {
      var al = TAU * k / 8;
      var a = al - Math.PI / 2 + c.phi + (Rh() - 0.5) * 0.1 + (R() - 0.5) * 0.06;
      var pf = Math.max(poof(Rh() * 4), poof(Rh() * 4));
      var rho = 30 + (Rh() - 0.5) * 2 + (R() - 0.5) * 3;
      var th = (Math.PI / 8) * 0.5 * (1 + (R() - 0.5) * 0.5);
      var wM = 3.2 * (1 + (R() - 0.5) * 0.4) * wf;
      var crest = 1 + 1.5 * R() + 4 * breath + 13 * pf;
      out.push(band(a, rho, th, 0.6 * wM, 0.6 * wM, wM, crest, RY, R, 0.14));
    }
    return out;
  };
  function place(a, rho, r, sx, rot, pts) { return { x: CX + rho * Math.cos(a), y: RY + rho * Math.sin(a), r: r, sx: sx, rot: rot, pts: pts }; }
  function boil(pts, R, jit) { for (var i = 0; i < pts.length; i++) pts[i][1] *= 1 + (R() - 0.5) * 2 * jit; return pts; }
  function eight(seed, c, fn) {
    var R = hand(c), Rh = rng(c.H * 1000 + seed), out = [], t = c.t;
    for (var k = 0; k < 8; k++) {
      var q = { a: Rh(), b: Rh(), c: Rh(), d: Rh(), e: Rh(), p1: Rh() * 4, p2: Rh() * 4, p3: Rh() * 4 };
      out.push(fn(k, q, TAU * k / 8 - Math.PI / 2 + c.phi, R, t));
    }
    return out;
  }
  // Candle: the fire's lick, steady — only the tip swaying and the flame's
  // height trembling. Fire's calm.
  function lickRing(c, fn) {
    var R = hand(c), Rh = rng(c.H * 1000 + 5), out = [], t = c.t, wf = c.small ? 1.64 : 1;
    for (var k = 0; k < 8; k++) {
      var q = { a: Rh(), p1: Rh() * 4, p2: Rh() * 4, b: Rh(), c: Rh(), d: Rh(), e: Rh() };
      out.push(fn(k, q, TAU * k / 8 - Math.PI / 2 + c.phi, R, t, wf));
    }
    return out;
  }
  function lick(a, rho, th, wM, crest, R, jit, peak, flex) { return band(a, rho, th, 0.6 * wM, 0.6 * wM, wM, crest, RY, R, jit, flex || 0, 0, peak || 0); }
  L['fire-candle'] = function (c) {
    return lickRing(c, function (k, q, al, R, t, wf) {
      var a = al + (q.a - 0.5) * 0.1, rho = 30 + (q.b - 0.5) * 2;
      var th = (Math.PI / 8) * 0.5 * (0.85 + q.c * 0.3), wM = 3.2 * (0.85 + q.d * 0.3) * wf;
      var sway = Math.sin(TAU * t / (1.6 + q.e * 1.2) + q.p1), tremble = Math.sin(TAU * t / (0.9 + q.d * 0.6) + q.p2);
      return lick(a, rho, th, wM, 3 + 1.2 * q.c + 0.7 * tremble, R, 0.02, 0.35 * th * sway);
    });
  };
  // Earth: eight pebbles round the ring, stepping round.
  L.earth = function (c) {
    var R = hand(c), out = [];
    for (var k = 0; k < 8; k++) {
      var a = TAU * k / 8 - Math.PI / 2 + (R() - 0.5) * 0.22 + c.phi;
      var ring = 30 + (R() - 0.5) * 6, r = 6.5 + R() * 4.5, sx = 1.1 + R() * 0.35, rot = R() * Math.PI, pts = [];
      for (var i = 0; i < 6; i++) pts.push([TAU * i / 6 + (R() - 0.5) * (TAU / 6) * 0.35, 1 + (R() - 0.5) * 2 * 0.14]);
      out.push({ x: CX + ring * Math.cos(a), y: RY + ring * Math.sin(a), r: r, sx: sx, rot: rot, pts: pts });
    }
    return out;
  };
  function layout(name, base) {
    return L[name]({ t: base.t, fi: base.fi, phi: STEPPED[name] ? base.phiHold : base.phi, H: base.H || 7, small: false });
  }
  function bake(name, fi, H) {
    var u = layout(name, { t: fi / FPS, fi: fi, phi: 0, phiHold: 0, H: H || 7 }), ds = [];
    for (var k = 0; k < 8; k++) ds.push(unitPath(u[k]));
    return ds;
  }

  // ── tweening units, not pixels ───────────────────────────────────
  function lerpAngle(a, b, p) { var d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return a + d * p; }
  function ease(p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  // A unit may carry more than six points (the water does); to tween two of
  // different counts, the one with fewer is resampled along its own curve —
  // the same Catmull-Rom the path is drawn with — so its shape is unchanged.
  function cr1(a, b, c, d, t) { return 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t); }
  function resample(u, n) {
    var m = u.pts.length;
    if (m === n) return u;
    var P = [], pts = [], last = -Infinity;
    for (var i = 0; i < m; i++) P.push([u.pts[i][1] * Math.cos(u.pts[i][0]) * u.sx, u.pts[i][1] * Math.sin(u.pts[i][0])]);
    for (var j = 0; j < n; j++) {
      var sj = j * m / n, i0 = Math.floor(sj), fr = sj - i0;
      var p0 = P[(i0 - 1 + m) % m], p1 = P[i0 % m], p2 = P[(i0 + 1) % m], p3 = P[(i0 + 2) % m];
      var x = cr1(p0[0], p1[0], p2[0], p3[0], fr), y = cr1(p0[1], p1[1], p2[1], p3[1], fr);
      var ang = Math.atan2(y, x / u.sx);
      while (ang < last - Math.PI) ang += TAU;   // keep the angles climbing round the centre
      last = ang;
      pts.push([ang, Math.hypot(x / u.sx, y)]);
    }
    return { x: u.x, y: u.y, r: u.r, sx: u.sx, rot: u.rot, pts: pts, sharp: u.sharp };
  }
  function mixUnits(A, B, p) {
    var out = [];
    for (var k = 0; k < 8; k++) {
      var n = Math.max(A[k].pts.length, B[k].pts.length), a = resample(A[k], n), b = resample(B[k], n), pts = [];
      for (var i = 0; i < n; i++) pts.push([a.pts[i][0] + (b.pts[i][0] - a.pts[i][0]) * p, a.pts[i][1] + (b.pts[i][1] - a.pts[i][1]) * p]);
      out.push({ x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, r: a.r + (b.r - a.r) * p,
        sx: a.sx + (b.sx - a.sx) * p, rot: lerpAngle(a.rot, b.rot, p), pts: pts, sharp: (a.sharp || 0) + ((b.sharp || 0) - (a.sharp || 0)) * p });
    }
    return out;
  }

  // ── the renderer ─────────────────────────────────────────────────
  var NS = 'http://www.w3.org/2000/svg';
  var live = [], raf = null, lastPaint = -1;
  var reduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var motion = !reduced;
  var STILL = { blob: 1, loop: 1, earth: 1 };   // change only on the drawings; the rest breathe between them
  function rate(name) { return TURN[name] ? TAU / TURN[name] : 0; }
  function now() { return performance.now() / 1000; }

  function build(inst) {
    var svg = inst.svg;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('viewBox', '0 0 120 120');
    inst.sh = document.createElementNS(NS, 'path');
    inst.sh.setAttribute('d', SHADOW); inst.sh.setAttribute('fill', 'currentColor');
    inst.sh.style.display = inst.shadow ? '' : 'none';
    svg.appendChild(inst.sh);
    var g = document.createElementNS(NS, 'g');
    g.setAttribute('fill', 'currentColor');
    inst.paths = [];
    for (var k = 0; k < 8; k++) { var p = document.createElementNS(NS, 'path'); g.appendChild(p); inst.paths.push(p); }
    svg.appendChild(g);
  }

  // A switch holds the turn still, then the ramp eases it back up to speed.
  function turnScale(inst, t) {
    if (!inst.trans) return 1;
    var el = (t - inst.trans.start) * 1000, legs = inst.trans.legs;
    for (var i = 0; i < legs.length; i++) { if (el < legs[i].dur) return legs[i].ramp ? ease(el / legs[i].dur) : 0; el -= legs[i].dur; }
    return 1;
  }
  // The units to draw now: the form itself, or the leg of a switch we are on.
  // One hand and one turn are used for the switch, so nothing is re-rolled
  // under a tween. A switch made mid-way freezes what is on screen and
  // continues from that.
  function current(inst, base) {
    if (!inst.trans) return layout(inst.form, base);
    var el = (base.t - inst.trans.start) * 1000, legs = inst.trans.legs, i = 0;
    for (; i < legs.length; i++) { if (el < legs[i].dur) break; el -= legs[i].dur; }
    if (i >= legs.length) { inst.trans = null; inst.snap = null; return layout(inst.form, base); }
    var leg = legs[i], lb = { t: base.t, fi: inst.trans.fi0, phi: inst.trans.phi0, phiHold: inst.trans.phi0, H: base.H };
    if (leg.dwell) return layout('loop', lb);
    if (leg.settle) return layout(inst.form, lb);
    if (leg.ramp) return mixUnits(layout(inst.form, lb), layout(inst.form, base), ease(el / leg.dur));
    var A = leg.from === 'snap' ? inst.snap : layout(leg.from, lb);
    return mixUnits(A, layout(leg.to, lb), ease(el / leg.dur));
  }
  function go(inst, to) {
    if (!motion) { inst.form = to; inst.trans = null; inst.snap = null; still(inst); return; }
    var t = now(), fi = Math.floor(t * FPS), base = { t: t, fi: fi, phi: inst.phi, phiHold: inst.phiHold, H: inst.H };
    var from = inst.form, legs = [];
    if (inst.trans) { inst.snap = current(inst, base); from = 'snap'; }
    if (from !== 'loop') legs.push({ from: from, to: 'loop', dur: LEG_MS });
    if (from !== 'loop' && to !== 'loop') legs.push({ dwell: true, dur: DWELL_MS });
    if (to !== 'loop') legs.push({ from: 'loop', to: to, dur: LEG_MS });
    if (legs.length) { legs.push({ settle: true, dur: SETTLE_MS }); legs.push({ ramp: true, dur: RAMP_MS }); }
    inst.trans = legs.length ? { legs: legs, start: t, fi0: fi, phi0: inst.phi } : null;
    inst.form = to;
    wake();
  }
  function paint(inst, t, force) {
    var fi = Math.floor(t * FPS), dt = inst.lastT < 0 ? 0 : Math.max(0, t - inst.lastT);
    inst.lastT = t;
    inst.phi += dt * rate(inst.form) * turnScale(inst, t);
    if (fi !== inst.lastFi) { inst.lastFi = fi; inst.phiHold = inst.phi; }
    else if (STILL[inst.form] && !inst.trans && !force) return;
    var u = current(inst, { t: t, fi: fi, phi: inst.phi, phiHold: inst.phiHold, H: inst.H });
    for (var k = 0; k < 8; k++) inst.paths[k].setAttribute('d', unitPath(u[k]));
  }
  function still(inst) {
    inst.trans = null; inst.snap = null;
    inst.lastT = -1; inst.lastFi = -1; inst.phi = 0; inst.phiHold = 0;
    paint(inst, 0, true);
  }
  function due(inst, t) { return t + inst.cycle.every * (0.75 + Math.random() * 0.5); }
  function turnOver(inst, t) {
    var pool = inst.cycle.forms.filter(function (n) { return n !== inst.form; });
    if (pool.length) go(inst, pool[Math.floor(Math.random() * pool.length)]);
    inst.nextAt = due(inst, t);
  }
  function loop() {
    raf = null;
    var t = now();
    if (t - lastPaint >= 1 / 30 - 0.002) {
      lastPaint = t;
      for (var i = 0; i < live.length; i++) {
        if (live[i].cycle && t >= live[i].nextAt) turnOver(live[i], t);
        paint(live[i], t, false);
      }
    }
    if (motion && live.length) raf = requestAnimationFrame(loop);
  }
  function wake() { if (motion && live.length && !raf) raf = requestAnimationFrame(loop); }

  var Spirit = {
    FORMS: FORMS, SHADOW: SHADOW, bake: bake,
    mount: function (svg, opts) {
      opts = opts || {};
      var inst = { svg: svg, form: FORMS.indexOf(opts.form) >= 0 ? opts.form : 'blob', H: opts.hand || 7,
        shadow: opts.shadow !== false, paths: [], sh: null, phi: 0, phiHold: 0, lastT: -1, lastFi: -1,
        trans: null, snap: null, cycle: null, nextAt: 0 };
      build(inst); live.push(inst);
      if (motion) paint(inst, now(), true); else still(inst);
      wake();
      return inst;
    },
    unmount: function (inst) { var i = live.indexOf(inst); if (i >= 0) live.splice(i, 1); },
    form: function (inst, name) { if (FORMS.indexOf(name) >= 0 && name !== inst.form) go(inst, name); },
    // forms: the group to wander (null to stay); every: about how many seconds between
    cycle: function (inst, forms, every) {
      forms = (forms || []).filter(function (n) { return FORMS.indexOf(n) >= 0; });
      inst.cycle = forms.length ? { forms: forms, every: Math.max(2, every || 30) } : null;
      if (!inst.cycle) return;
      if (forms.indexOf(inst.form) < 0) go(inst, forms[Math.floor(Math.random() * forms.length)]);
      inst.nextAt = due(inst, now());
    },
    shadow: function (inst, on) { inst.shadow = !!on; if (inst.sh) inst.sh.style.display = on ? '' : 'none'; },
    motion: function (on) {
      motion = !!on && !reduced;
      if (!motion) { if (raf) cancelAnimationFrame(raf); raf = null; for (var i = 0; i < live.length; i++) still(live[i]); }
      else { var t = now(); for (var j = 0; j < live.length; j++) if (live[j].cycle) live[j].nextAt = due(live[j], t); wake(); }
    }
  };
  if (typeof window !== 'undefined') window.Spirit = Spirit;
  if (typeof module !== 'undefined' && module.exports) module.exports = Spirit;
})();
