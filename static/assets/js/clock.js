// clock.js — the clock's face, its items, and the editor.
//   • the face       → items in nine cells (top/middle/bottom × left/center/
//                      right); items sharing a cell stack in order. Kinds:
//                      time, date (each in any time zone), moon, spirit (the
//                      ckg spirit, drawn live by spirit.js), weather (Open-Meteo,
//                      the doodle pack's skies), sun (sunrise and sunset, computed
//                      offline), text.
//   • viewing        → nothing to touch: no drags, no pinches. A tap opens
//                      the editor.
//   • editing        → every item outlined. Tap one for its own sheet
//                      (format, size, position, …, Remove); tap empty space
//                      to add an item there; Clock (top right) for the whole
//                      face — font, background, accent, orientation, motion,
//                      drift (burn-in care), night dim; Done to leave.
//   • location       → one place for weather and sun: the phone's, or a city
//                      searched by name (Open-Meteo geocoding); stored, never sent
//                      anywhere else. Weather refreshes every 15 min when online
//                      and keeps its last reading otherwise.
//   • wake lock      → keeps the display awake while visible
//   • fullscreen     → installed (iOS Add to Home Screen, Android Install)
//                      it runs edge-to-edge; in a browser tab the first touch
//                      asks for fullscreen, then honours the orientation lock
//   • service worker → loads offline
//   • settings       → localStorage clock.v2; the old clock.settings migrates
//                      on first run
(function () {
  "use strict";

  var root = document.documentElement, body = document.body;
  var face = document.getElementById("face"), bar = document.getElementById("bar");
  var sheet = document.getElementById("sheet"), sheetTitle = sheet.querySelector(".sheet-title");
  var sheetRemove = sheet.querySelector(".sheet-remove"), sheetBody = sheet.querySelector(".sheet-body");
  var Spirit = window.Spirit || null;

  var CELLS = ["tl", "tc", "tr", "ml", "mc", "mr", "bl", "bc", "br"];
  var WEIGHTS = { thin: 200, regular: 400, semibold: 600, bold: 700 }, WEIGHT_KEYS = ["auto", "thin", "regular", "semibold", "bold"];
  var PRESETS = ["#8e8cff", "#7ee0b8", "#f2c14e", "#ff6b6b", "#ff7eb6", "#5ac8fa"];
  var TIME_FORMATS = ["military", "h12", "h12ap", "words", "pirate", "wizard"];
  var DATE_FORMATS = ["iso", "long", "longd", "longdow", "short", "dotted", "doy", "words"];
  var MOON_PHASES = ["live", "new", "cres", "quarter", "gibbous", "full"], MOON_STYLES = ["filled", "hollow", "diagram", "pixel"];
  var SPIRIT_FORMS = Spirit ? Spirit.FORMS : ["blob", "loop", "water", "air", "fire", "earth", "fire-candle"];
  var SPIRIT_NAMES = { blob: "Blob", loop: "Loop", water: "Water", air: "Air", fire: "Fire", earth: "Earth", "fire-candle": "Candle" };
  var KIND_NAMES = { time: "Time", date: "Date", moon: "Moon", spirit: "Spirit", weather: "Weather", sun: "Sun", text: "Text" };
  var SIZE = { time: [0.2, 1.7], date: [0.3, 2.2], moon: [0.2, 2.5], spirit: [0.2, 2.5], weather: [0.4, 3], sun: [0.3, 2.5], text: [0.3, 3] };
  var ZONES = [["local", "Local"], ["UTC", "UTC"], ["America/New_York", "New York"], ["America/Los_Angeles", "Los Angeles"], ["Europe/London", "London"], ["Europe/Rome", "Rome"], ["Asia/Tokyo", "Tokyo"], ["Australia/Sydney", "Sydney"]];
  function validZone(z) { if (!z || z === "local") return "local"; try { new Intl.DateTimeFormat("en", { timeZone: z }); return z; } catch (e) { return "local"; } }
  var EVERY = [10, 30, 60, 300, 900]; // seconds between a cycling spirit's turns
  var BGS = ["white", "black", "system"]; // any other bg is a hex color

  // --- Settings ---------------------------------------------------------------
  var uidN = 0;
  function uid() { return "i" + Date.now().toString(36) + (uidN++).toString(36); }
  function load(key) { try { var v = localStorage.getItem(key); return v === null ? null : JSON.parse(v); } catch (e) { return null; } }
  function persist() { try { localStorage.setItem("clock.v2", JSON.stringify(S)); } catch (e) {} }
  function num(v, d, lo, hi) { v = typeof v === "number" && isFinite(v) ? v : d; return Math.min(hi, Math.max(lo, v)); }
  function pick(v, list, d) { return list.indexOf(v) >= 0 ? v : d; }
  function isObj(v) { return v && typeof v === "object" && !Array.isArray(v); }

  function newItem(kind, cell) {
    var it = { id: uid(), kind: kind, cell: cell || "mc", size: 1 };
    if (kind === "time") { it.format = "h12"; it.seconds = false; it.weight = "auto"; it.italic = false; it.zone = "local"; }
    else if (kind === "date") { it.format = "long"; it.italic = false; it.zone = "local"; }
    else if (kind === "weather") { it.unit = (navigator.language || "").toLowerCase() === "en-us" ? "f" : "c"; it.show = "both"; it.wobble = true; }
    else if (kind === "sun") { it.format = "12"; it.show = "both"; it.marks = "icons"; it.wobble = true; }
    else if (kind === "text") { it.text = "hello"; it.weight = "auto"; it.italic = false; }
    else if (kind === "moon") { it.phase = "live"; it.style = "filled"; }
    else if (kind === "spirit") { it.mode = "one"; it.form = "blob"; it.forms = SPIRIT_FORMS.slice(); it.every = 30; it.shadow = true; }
    return it;
  }
  // A stored item, made safe: unknown kinds drop, enums fall back, sizes clamp.
  function clean(it) {
    if (!isObj(it) || !(it.kind in KIND_NAMES)) return null;
    var d = newItem(it.kind, pick(it.cell, CELLS, "mc"));
    if (typeof it.id === "string" && it.id) d.id = it.id;
    d.size = num(it.size, 1, SIZE[it.kind][0], SIZE[it.kind][1]);
    if (it.kind === "time") { d.format = pick(it.format, TIME_FORMATS, "h12"); d.seconds = !!it.seconds; d.weight = pick(it.weight, WEIGHT_KEYS, "auto"); d.italic = !!it.italic; d.zone = validZone(it.zone); }
    else if (it.kind === "date") { d.format = pick(it.format, DATE_FORMATS, "long"); d.italic = !!it.italic; d.zone = validZone(it.zone); }
    else if (it.kind === "moon") { d.phase = pick(it.phase, MOON_PHASES, "live"); d.style = pick(it.style, MOON_STYLES, "filled"); }
    else if (it.kind === "weather") { d.unit = pick(it.unit, ["c", "f"], d.unit); d.show = pick(it.show, ["both", "icon", "temp"], "both"); d.wobble = it.wobble !== false; }
    else if (it.kind === "sun") { d.format = pick(it.format, ["12", "24"], "12"); d.show = pick(it.show, ["both", "rise", "set"], "both"); d.marks = pick(it.marks, ["icons", "sunmoon", "arrows"], "arrows"); d.wobble = it.wobble !== false; }
    else if (it.kind === "text") { d.text = typeof it.text === "string" ? it.text.slice(0, 80) : "hello"; d.weight = pick(it.weight, WEIGHT_KEYS, "auto"); d.italic = !!it.italic; }
    else {
      d.mode = pick(it.mode, ["one", "cycle"], "one"); d.form = pick(it.form, SPIRIT_FORMS, "blob");
      d.forms = Array.isArray(it.forms) ? it.forms.filter(function (n) { return SPIRIT_FORMS.indexOf(n) >= 0; }) : SPIRIT_FORMS.slice();
      if (!d.forms.length) d.forms = SPIRIT_FORMS.slice();
      d.every = EVERY.indexOf(it.every) >= 0 ? it.every : 30; d.shadow = it.shadow !== false;
    }
    return d;
  }
  function defaults() {
    return { bg: "system", accent: "default", font: "sans", orientation: "auto", motion: true, loc: null, drift: false, dim: 0, items: [newItem("time", "mc"), newItem("date", "mc")] };
  }
  // The first clock's settings (one time, one date, one moon) become items.
  function migrate(v1) {
    var pos = pick(v1.position, CELLS, "mc"), items = [];
    var t = newItem("time", pos);
    t.format = pick(v1.timeFormat, TIME_FORMATS, "h12"); t.seconds = !!v1.seconds; t.weight = pick(v1.weight, WEIGHT_KEYS, "auto"); t.italic = !!v1.italic; t.size = num(v1.size, 1, 0.2, 1.7);
    items.push(t);
    if (v1.dateFormat !== "off") {
      var d = newItem("date", pos);
      d.format = pick(v1.dateFormat, DATE_FORMATS, "long"); d.italic = !!v1.italic; d.size = num(v1.dateSize, 1, 0.3, 2.2);
      items.push(d);
    }
    if (v1.moon && v1.moon !== "off") {
      var m = newItem("moon", pick(v1.moonPos, CELLS, "tr"));
      m.phase = pick(v1.moon, MOON_PHASES, "live"); m.style = pick(v1.moonStyle, MOON_STYLES, "filled"); m.size = num(v1.moonSize, 1, 0.2, 2.5);
      items.push(m);
    }
    return { bg: v1.theme === "light" ? "white" : v1.theme === "dark" ? "black" : "system", accent: v1.accent, font: v1.font, orientation: v1.orientation, motion: true, items: items };
  }
  function sane(s) {
    var d = defaults();
    if (!isObj(s)) s = d;
    var bg = s.bg !== undefined ? s.bg : (s.theme === "light" ? "white" : s.theme === "dark" ? "black" : "system"); // an earlier clock.v2 had theme
    s.bg = BGS.indexOf(bg) >= 0 ? bg : (typeof bg === "string" && /^#[0-9a-f]{6}$/i.test(bg) ? bg.toLowerCase() : "system");
    delete s.theme;
    s.font = pick(s.font, ["sans", "mono"], "sans");
    s.orientation = pick(s.orientation, ["auto", "portrait", "landscape"], "auto");
    s.accent = typeof s.accent === "string" && /^#[0-9a-f]{6}$/i.test(s.accent) ? s.accent.toLowerCase() : "default";
    s.motion = s.motion !== false;
    s.loc = isObj(s.loc) && isFinite(s.loc.lat) && isFinite(s.loc.lon) ? { lat: +s.loc.lat, lon: +s.loc.lon, name: String(s.loc.name || "Somewhere").slice(0, 60), tz: validZone(s.loc.tz) } : null;
    s.drift = !!s.drift;
    s.dim = num(s.dim, 0, 0, 0.8);
    s.items = Array.isArray(s.items) ? s.items.map(clean).filter(Boolean) : d.items;
    var ids = {};
    s.items.forEach(function (it) { while (ids[it.id]) it.id = uid(); ids[it.id] = 1; });
    return s;
  }
  var S = (function () {
    var v2 = load("clock.v2"), v1 = load("clock.settings");
    return sane(isObj(v2) ? v2 : isObj(v1) ? migrate(v1) : defaults());
  })();
  persist(); // a migrated or repaired state is stored as read

  // --- The face ---------------------------------------------------------------
  var cells = {}, nodes = {}, insts = {};
  CELLS.forEach(function (c) { var d = document.createElement("div"); d.className = "cell " + c; cells[c] = d; face.appendChild(d); });
  function itemById(id) { for (var i = 0; i < S.items.length; i++) if (S.items[i].id === id) return S.items[i]; return null; }
  function nodeFor(it) {
    var n = nodes[it.id];
    if (n) return n;
    n = document.createElement("div");
    n.className = "item " + it.kind; n.dataset.id = it.id; n.setAttribute("role", "button"); n.tabIndex = -1;
    if (it.kind === "time") n.innerHTML = '<span class="num" data-role="hm"></span><span class="ampm" data-role="ampm"></span><span class="secs num" data-role="secs"></span>';
    else if (it.kind === "text") n.classList.add("num");
    else if (it.kind === "spirit") {
      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("aria-hidden", "true"); n.appendChild(svg);
      if (Spirit) insts[it.id] = Spirit.mount(svg, { form: it.form, shadow: it.shadow });
    }
    nodes[it.id] = n;
    return n;
  }
  function dropNode(id) {
    var n = nodes[id]; if (!n) return;
    if (insts[id] && Spirit) Spirit.unmount(insts[id]);
    delete insts[id]; delete nodes[id];
    if (n.parentNode) n.parentNode.removeChild(n);
  }
  // Place every item in its cell, in order; forget the nodes of items gone.
  function layoutFace() {
    CELLS.forEach(function (c) { while (cells[c].firstChild) cells[c].removeChild(cells[c].firstChild); });
    var keep = {};
    S.items.forEach(function (it) { keep[it.id] = 1; cells[it.cell].appendChild(nodeFor(it)); styleItem(it); });
    Object.keys(nodes).forEach(function (id) { if (!keep[id]) dropNode(id); });
    render(new Date());
  }
  function styleItem(it) {
    var n = nodes[it.id]; if (!n) return;
    n.style.setProperty("--s", it.size);
    n.classList.toggle("italic", !!it.italic);
    n.setAttribute("aria-label", label(it));
    if (it.weight && it.weight !== "auto") n.style.setProperty("--w", WEIGHTS[it.weight]); else n.style.removeProperty("--w");
    if (it.kind === "moon") n.innerHTML = moonSVG(it);
    if (it.kind === "spirit" && insts[it.id]) applySpirit(it);
  }
  // One form, or a cycle: a random one of the chosen forms, every so often.
  function applySpirit(it) {
    var inst = insts[it.id];
    Spirit.shadow(inst, it.shadow);
    if (it.mode === "cycle") Spirit.cycle(inst, it.forms, it.every);
    else { Spirit.cycle(inst, null); Spirit.form(inst, it.form); }
  }
  function label(it) { return it.kind === "spirit" ? "Spirit · " + (it.mode === "cycle" ? "cycle" : SPIRIT_NAMES[it.form]) : KIND_NAMES[it.kind]; }

  // --- Whole-face settings ----------------------------------------------------
  function applyFont() { body.classList.toggle("font-mono", S.font === "mono"); }
  function contrastOn(hex) {
    var h = hex.replace("#", "");
    var rgb = [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16) / 255; });
    var lin = rgb.map(function (c) { return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
    var L = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
    return L > 0.5 ? "#0a0a0a" : "#fff";
  }
  function applyAccent() {
    if (S.accent !== "default") { root.style.setProperty("--accent", S.accent); root.style.setProperty("--accent-on", contrastOn(S.accent)); }
    else { root.style.removeProperty("--accent"); root.style.removeProperty("--accent-on"); }
  }
  // The background: white, black, the system's choice, or any color — then
  // the ink is whichever of white and near-black reads on it, and the muted,
  // control and hairline tokens are mixed from the two.
  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  function hexRgb(h) { h = h.replace("#", ""); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
  function rgbHex(c) { return "#" + c.map(function (v) { v = Math.round(Math.min(255, Math.max(0, v))); return (v < 16 ? "0" : "") + v.toString(16); }).join(""); }
  function mix(a, b, p) { var A = hexRgb(a), B = hexRgb(b); return rgbHex([0, 1, 2].map(function (i) { return A[i] + (B[i] - A[i]) * p; })); }
  function applyBg() {
    var custom = BGS.indexOf(S.bg) < 0;
    var dark = S.bg === "black" || (S.bg === "system" && mq.matches) || (custom && contrastOn(S.bg) === "#fff");
    root.setAttribute("data-theme", dark ? "dark" : "light");
    ["--bg", "--fg", "--muted", "--ctl", "--line"].forEach(function (k) { root.style.removeProperty(k); });
    if (custom) {
      var fg = dark ? "#ffffff" : "#0b0b0b";
      root.style.setProperty("--bg", S.bg); root.style.setProperty("--fg", fg);
      root.style.setProperty("--muted", mix(S.bg, fg, 0.5)); root.style.setProperty("--ctl", mix(S.bg, fg, 0.62)); root.style.setProperty("--line", mix(S.bg, fg, 0.2));
    }
  }
  if (mq.addEventListener) mq.addEventListener("change", function () { if (S.bg === "system") applyBg(); });
  else if (mq.addListener) mq.addListener(function () { if (S.bg === "system") applyBg(); });
  function applyMotion() { if (Spirit) Spirit.motion(S.motion); syncBoil(); }

  // --- Orientation + fullscreen (immersive) -----------------------------------
  // Orientation lock only works while the document is fullscreen (browser) or
  // the app is installed. All calls are best-effort.
  function isStandalone() {
    return (window.matchMedia && (matchMedia("(display-mode: fullscreen)").matches || matchMedia("(display-mode: standalone)").matches)) || navigator.standalone === true;
  }
  function requestFullscreen() {
    var e = root, fn = e.requestFullscreen || e.webkitRequestFullscreen;
    if (fn && !document.fullscreenElement && !document.webkitFullscreenElement) {
      try { var p = fn.call(e, { navigationUI: "hide" }); if (p && p.catch) p.catch(function () {}); } catch (err) {}
    }
  }
  function applyOrientation() {
    if (!(screen.orientation && screen.orientation.lock)) return;
    try {
      if (S.orientation === "auto") { if (screen.orientation.unlock) screen.orientation.unlock(); }
      else { var p = screen.orientation.lock(S.orientation); if (p && p.catch) p.catch(function () {}); }
    } catch (err) {}
  }
  // First touch in a browser tab: go fullscreen (touch devices only — a desktop
  // click should not hijack the tab), then honour the orientation lock.
  var immersed = false;
  function enterImmersive() {
    if (immersed) return; immersed = true;
    var coarse = window.matchMedia && matchMedia("(pointer: coarse)").matches;
    if (!isStandalone() && coarse) requestFullscreen();
    setTimeout(applyOrientation, 60);
  }
  document.addEventListener("fullscreenchange", function () { if (document.fullscreenElement) applyOrientation(); });

  // --- Moon -------------------------------------------------------------------
  var MOON_P = { new: 0, cres: 0.12, quarter: 0.25, gibbous: 0.38, full: 0.5 };
  var SYNODIC = 29.530588853, NEW_MOON_REF = Date.UTC(2000, 0, 6, 18, 14) / 86400000;
  function moonPhaseNow(date) { var age = ((date.getTime() / 86400000 - NEW_MOON_REF) % SYNODIC + SYNODIC) % SYNODIC; return age / SYNODIC; }
  function litPath(r, p) {
    var c = Math.cos(2 * Math.PI * p), rx = Math.abs(c) * r, waxing = p < 0.5;
    var limbSweep = waxing ? 1 : 0, termSweep = waxing ? (c > 0 ? 0 : 1) : (c > 0 ? 1 : 0);
    return "M0 " + (-r) + " A" + r + " " + r + " 0 0 " + limbSweep + " 0 " + r +
      " A" + rx.toFixed(2) + " " + r + " 0 0 " + termSweep + " 0 " + (-r) + " Z";
  }
  function isLit(u, v, p) { var w = Math.sqrt(Math.max(0, 1 - v * v)), t = Math.cos(2 * Math.PI * p) * w; return p < 0.5 ? (u > t) : (u < -t); }
  function pixelMoon(p, lit, unlit, r) {
    var n = 13, cell = (2 * r) / n, gap = cell * 0.13, s = "";
    for (var j = 0; j < n; j++) for (var i = 0; i < n; i++) {
      var cx = -r + (i + 0.5) * cell, cy = -r + (j + 0.5) * cell, u = cx / r, v = cy / r;
      if (u * u + v * v > 1.0) continue;
      s += '<rect x="' + (cx - cell / 2 + gap).toFixed(2) + '" y="' + (cy - cell / 2 + gap).toFixed(2) +
        '" width="' + (cell - 2 * gap).toFixed(2) + '" height="' + (cell - 2 * gap).toFixed(2) + '" fill="' + (isLit(u, v, p) ? lit : unlit) + '"/>';
    }
    return s;
  }
  function moonSVG(it) {
    var p = it.phase === "live" ? moonPhaseNow(new Date()) : MOON_P[it.phase];
    var r = 40, lit = "currentColor", dim = "var(--line)", unlit = "var(--line)"; // the ink and hairline of whatever background
    var disc = '<circle cx="0" cy="0" r="' + r + '" fill="none" stroke="' + dim + '" stroke-width="3"/>', inner;
    switch (it.style) {
      case "hollow": inner = disc + '<path d="' + litPath(r, p) + '" fill="none" stroke="' + lit + '" stroke-width="4.5"/>'; break;
      case "diagram": inner = disc + '<path d="' + litPath(r, p) + '" fill="' + lit + '"/><circle cx="0" cy="0" r="' + r + '" fill="none" stroke="' + lit + '" stroke-width="1.4" opacity="0.5"/>'; break;
      case "pixel": inner = pixelMoon(p, lit, unlit, r); break;
      default: inner = '<path d="' + litPath(r, p) + '" fill="' + lit + '"/>';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 100 100" aria-hidden="true">' + inner + '</svg>';
  }

  // --- Time + date formatting -------------------------------------------------
  var DOW3 = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"], DOWC = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var DOWF = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONC = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var MONF = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var ORD_WORD = { 1: "first", 2: "second", 3: "third", 4: "fourth", 5: "fifth", 6: "sixth", 7: "seventh", 8: "eighth", 9: "ninth", 10: "tenth", 11: "eleventh", 12: "twelfth", 13: "thirteenth", 14: "fourteenth", 15: "fifteenth", 16: "sixteenth", 17: "seventeenth", 18: "eighteenth", 19: "nineteenth", 20: "twentieth", 30: "thirtieth" };
  var ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  var TENS = ["", "", "twenty", "thirty", "forty", "fifty"];
  function ordinalWord(n) { return ORD_WORD[n] || TENS[Math.floor(n / 10)] + "-" + ORD_WORD[n % 10]; }
  function dayOfYear(p) { return Math.floor((Date.UTC(p.Y, p.M, p.D) - Date.UTC(p.Y, 0, 0)) / 86400000); }
  // The wall clock's parts — hours, minutes, seconds, year, month (0-based),
  // day, weekday (0 = Sunday) — here, or in any IANA zone.
  var DTF = {}, DOWN = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  function parts(now, zone) {
    if (!zone || zone === "local") return { H: now.getHours(), m: now.getMinutes(), s: now.getSeconds(), Y: now.getFullYear(), M: now.getMonth(), D: now.getDate(), dow: now.getDay() };
    try {
      var f = DTF[zone] || (DTF[zone] = new Intl.DateTimeFormat("en-US", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric", weekday: "short" }));
      var o = {}; f.formatToParts(now).forEach(function (x) { o[x.type] = x.value; });
      return { H: +o.hour % 24, m: +o.minute, s: +o.second, Y: +o.year, M: +o.month - 1, D: +o.day, dow: DOWN[o.weekday] || 0 };
    } catch (e) { return parts(now, "local"); }
  }
  function isWords(format) { return format === "words" || format === "pirate" || format === "wizard"; }
  function p2(n) { return (n < 10 ? "0" : "") + n; }
  function ordinal(n) { var t = n % 100; if (t >= 11 && t <= 13) return n + "th"; switch (n % 10) { case 1: return n + "st"; case 2: return n + "nd"; case 3: return n + "rd"; default: return n + "th"; } }
  function w2(n) { if (n < 20) return ONES[n]; var t = Math.floor(n / 10), o = n % 10; return TENS[t] + (o ? "-" + ONES[o] : ""); }
  function minWords(m) { return m === 0 ? "o'clock" : (m < 10 ? "oh " + w2(m) : w2(m)); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function dayPart(H) { return H < 12 ? "mornin'" : H < 17 ? "afternoon" : H < 21 ? "evenin'" : "night"; }
  function fmt(format, p) {
    var H = p.H, m = p.m, h12 = H % 12 || 12, ap = H < 12 ? "AM" : "PM";
    switch (format) {
      case "words": return { words: true, main: w2(h12) + " " + minWords(m) + " " + ap };
      case "pirate": return { words: true, main: cap("arr, 'tis " + w2(h12) + " " + minWords(m) + " in the " + dayPart(H)) };
      case "wizard": return { words: true, main: cap("'tis " + w2(h12) + " " + minWords(m) + ", by " + (H >= 6 && H < 18 ? "sun’s light" : "moon’s glow")) };
      case "military": return { words: false, H: H, h12: h12, m: m, military: true, ap: "" };
      case "h12ap": return { words: false, H: H, h12: h12, m: m, military: false, ap: ap };
      default: return { words: false, H: H, h12: h12, m: m, military: false, ap: "" };
    }
  }
  function dateStr(format, p) {
    var Y = p.Y, M = p.M, D = p.D, dow = p.dow;
    switch (format) {
      case "iso": return Y + "-" + p2(M + 1) + "-" + p2(D) + " " + DOW3[dow];
      case "short": return DOWC[dow] + " " + D + " " + MONC[M];
      case "dotted": return Y + "." + p2(M + 1) + "." + p2(D);
      case "doy": return "Day " + dayOfYear(p) + " · " + Y;
      case "words": return "the " + ordinalWord(D) + " of " + MONF[M];
      case "longd": return DOWC[dow] + " " + MONF[M] + " " + D + " " + Y;               // Mon June 29 2026
      case "longdow": return DOWF[dow] + ", " + MONF[M] + " " + ordinal(D) + " " + Y;    // Monday, June 29th 2026
      default: return MONF[M] + " " + D + " " + Y;                                       // long → June 29 2026
    }
  }
  function spanText(node, t) { node.textContent = t; node.style.display = t ? "" : "none"; }
  function renderItem(it, now) {
    var n = nodes[it.id]; if (!n) return;
    if (it.kind === "time") {
      var p = parts(now, it.zone), f = fmt(it.format, p), showSecs = it.seconds && !f.words;
      n.classList.toggle("words", f.words);
      var hm = n.querySelector('[data-role="hm"]'), ap = n.querySelector('[data-role="ampm"]'), sc = n.querySelector('[data-role="secs"]');
      if (f.words) { hm.textContent = f.main; spanText(ap, ""); spanText(sc, ""); }
      else { hm.textContent = (f.military ? p2(f.H) : f.h12) + ":" + p2(f.m); spanText(ap, f.ap); spanText(sc, showSecs ? p2(p.s) : ""); }
    } else if (it.kind === "date") n.textContent = dateStr(it.format, parts(now, it.zone));
    else if (it.kind === "text") n.textContent = it.text || "…";
    else if (it.kind === "weather") renderWeather(it, n);
    else if (it.kind === "sun") renderSun(it, n, now);
  }

  // --- Weather (Open-Meteo: free, no key) and the sun ---------------------------
  var WX = { data: load("clock.weather"), busy: false };
  if (!isObj(WX.data) || !isFinite(WX.data.tempC)) WX.data = null;
  function locKey() { return S.loc ? S.loc.lat.toFixed(3) + "," + S.loc.lon.toFixed(3) : ""; }
  function hasKind(k) { for (var i = 0; i < S.items.length; i++) if (S.items[i].kind === k) return true; return false; }
  // WMO weather codes → the pack's twelve skies
  function sky(code, isDay) {
    if (code <= 1) return isDay ? "clear" : "clear-night";
    if (code === 2) return isDay ? "partly-cloudy" : "cloudy";
    if (code === 3) return "overcast";
    if (code === 45 || code === 48) return "fog";
    if (code >= 51 && code <= 57) return "drizzle";
    if (code === 61 || code === 63 || code === 80 || code === 81) return "rain";
    if (code === 65 || code === 82) return "heavy-rain";
    if (code === 66 || code === 67) return "sleet";
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
    if (code >= 95) return "thunder";
    return "cloudy";
  }
  // A sky: its three hand frames in one svg, data-f saying which shows; the
  // boil timer turns data-f on every wobbling item at 8 fps.
  function skySVG(key, boil) {
    var W = window.WeatherIcons, fr = W && W[key]; if (!fr) return "";
    var gs = ""; for (var i = 0; i < fr.length; i++) gs += '<g data-f="' + i + '">' + fr[i] + '</g>';
    return '<svg viewBox="0 0 120 120" aria-hidden="true" data-f="0"' + (boil ? ' data-boil' : '') + '>' + gs + '</svg>';
  }
  var boilTimer = null, boilFi = 0;
  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function syncBoil() {
    var want = S.motion && !reducedMotion && !!face.querySelector(".item svg[data-boil]");
    if (want && !boilTimer) boilTimer = setInterval(function () {
      boilFi = (boilFi + 1) % 3;
      var svgs = face.querySelectorAll(".item svg[data-boil]");
      for (var i = 0; i < svgs.length; i++) svgs[i].setAttribute("data-f", boilFi);
    }, 125);
    if (!want && boilTimer) { clearInterval(boilTimer); boilTimer = null; face.querySelectorAll(".item svg[data-f]").forEach(function (s) { s.setAttribute("data-f", "0"); }); }
  }
  function fetchWeather(force) {
    if (!S.loc || WX.busy || !hasKind("weather")) return;
    if (!force && WX.data && WX.data.loc === locKey() && Date.now() - WX.data.at < 900000) return;
    WX.busy = true;
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + S.loc.lat + "&longitude=" + S.loc.lon + "&current=temperature_2m,weather_code,is_day";
    fetch(url, { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (j) {
      var c = j && j.current; if (!c || !isFinite(c.temperature_2m)) return;
      WX.data = { code: +c.weather_code, isDay: !!c.is_day, tempC: +c.temperature_2m, at: Date.now(), loc: locKey() };
      try { localStorage.setItem("clock.weather", JSON.stringify(WX.data)); } catch (e) {}
      render(new Date());
    }).catch(function () {}).then(function () { WX.busy = false; });
  }
  function renderWeather(it, n) {
    if (!S.loc) { n.innerHTML = '<span class="note">Set a location</span>'; return; }
    var w = WX.data;
    if (!w || w.loc !== locKey()) { n.innerHTML = '<span class="note">Fetching the weather…</span>'; fetchWeather(); return; }
    var key = sky(w.code, w.isDay), t = Math.round(it.unit === "f" ? w.tempC * 9 / 5 + 32 : w.tempC) + "°";
    var age = Date.now() - w.at, stale = age > 7200000 ? '<span class="age">' + Math.round(age / 3600000) + ' h ago</span>' : "";
    n.innerHTML = (it.show !== "temp" ? skySVG(key, it.wobble) : "") + (it.show !== "icon" ? '<span class="temp num">' + t + '</span>' : "") + stale;
    n.setAttribute("aria-label", "Weather: " + key.replace("-", " ") + ", " + t);
    syncBoil();
  }
  // Sunrise and sunset for the day, from the sunrise equation (about a minute
  // off, which is plenty for a bedside clock). Null in the polar day or night.
  function sunTimes(date, lat, lon, tz) {
    var rad = Math.PI / 180;
    var q = parts(date, tz), JD = Date.UTC(q.Y, q.M, q.D) / 86400000 + 2440587.5;   // midnight, the location's date
    var n = Math.ceil(JD - 2451545.0 + 0.0008), Js = n - lon / 360;   // days since J2000 (noon), as the sunrise equation counts them
    var M = ((357.5291 + 0.98560028 * Js) % 360 + 360) % 360;
    var C = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
    var L = ((M + C + 180 + 102.9372) % 360 + 360) % 360;
    var Jt = 2451545.0 + Js + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * L * rad);
    var dec = Math.asin(Math.sin(L * rad) * Math.sin(23.4397 * rad));
    var cosW = (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * Math.sin(dec)) / (Math.cos(lat * rad) * Math.cos(dec));
    if (cosW > 1 || cosW < -1) return null;
    var w = Math.acos(cosW) / (2 * Math.PI);
    function at(J) { return new Date((J - 2440587.5) * 86400000); }
    return { rise: at(Jt - w), set: at(Jt + w) };
  }
  function renderSun(it, n, now) {
    if (!S.loc) { n.innerHTML = '<span class="note">Set a location</span>'; return; }
    var st = sunTimes(now, S.loc.lat, S.loc.lon, S.loc.tz);
    if (!st) { n.innerHTML = '<span class="note">No sunrise today</span>'; return; }
    function f(d) { var q = parts(d, S.loc.tz), H = q.H, m = q.m; return it.format === "24" ? p2(H) + ":" + p2(m) : (H % 12 || 12) + ":" + p2(m) + (H < 12 ? " am" : " pm"); }
    var up = it.marks === "icons" ? skySVG("sunrise", it.wobble) : it.marks === "sunmoon" ? skySVG("clear", it.wobble) : "↑ ";
    var down = it.marks === "icons" ? skySVG("sunset", it.wobble) : it.marks === "sunmoon" ? skySVG("clear-night", it.wobble) : "↓ ";
    n.innerHTML = (it.show !== "set" ? '<span class="num">' + up + f(st.rise) + '</span>' : "") + (it.show !== "rise" ? '<span class="num">' + down + f(st.set) + '</span>' : "");
    n.setAttribute("aria-label", "Sunrise " + f(st.rise) + ", sunset " + f(st.set));
    syncBoil();
  }
  // Drift: a few pixels every three minutes, for screens that burn in. Dim: a
  // veil over the face for the night, under the editor.
  var driftTimer = null;
  function applyDrift() {
    clearInterval(driftTimer); driftTimer = null;
    if (!S.drift) { face.style.removeProperty("--dx"); face.style.removeProperty("--dy"); return; }
    function step() { face.style.setProperty("--dx", (Math.random() * 16 - 8).toFixed(1) + "px"); face.style.setProperty("--dy", (Math.random() * 16 - 8).toFixed(1) + "px"); }
    step(); driftTimer = setInterval(step, 180000);
  }
  function applyDim() { root.style.setProperty("--dim", S.dim); }
  function render(now) { for (var i = 0; i < S.items.length; i++) renderItem(S.items[i], now); }
  function perSecond() {
    for (var i = 0; i < S.items.length; i++) { var it = S.items[i]; if (it.kind === "time" && it.seconds && !isWords(it.format)) return true; }
    return false;
  }
  // The scheduler aligns to second boundaries only while some time shows
  // seconds; otherwise it sleeps to the next minute (battery). retick()
  // re-renders NOW and realigns — when a setting changes the cadence, and
  // when the tab wakes (a throttled pending timeout may be minutes stale).
  var tickTimer = null, lastMoon = 0;
  function tick() {
    var now = new Date();
    render(now);
    if (now.getTime() - lastMoon > 1800000) { // the live moon, about every 30 min
      lastMoon = now.getTime();
      S.items.forEach(function (it) { if (it.kind === "moon" && it.phase === "live" && nodes[it.id]) nodes[it.id].innerHTML = moonSVG(it); });
    }
    fetchWeather();
    tickTimer = setTimeout(tick, perSecond() ? (1000 - (Date.now() % 1000) + 8) : (60000 - (Date.now() % 60000) + 8));
  }
  function retick() { clearTimeout(tickTimer); tick(); }

  // --- The editor -------------------------------------------------------------
  var editing = false, mode = null, picked = null, addCell = "mc";
  function enterEdit() {
    if (editing) return;
    editing = true; body.classList.add("editing"); bar.setAttribute("aria-hidden", "false");
    S.items.forEach(function (it) { if (nodes[it.id]) nodes[it.id].tabIndex = 0; });
  }
  function exitEdit() {
    closeSheet();
    if (!editing) return;
    editing = false; body.classList.remove("editing"); bar.setAttribute("aria-hidden", "true");
    S.items.forEach(function (it) { if (nodes[it.id]) nodes[it.id].tabIndex = -1; });
  }
  function setPicked(id) {
    if (picked && nodes[picked]) nodes[picked].classList.remove("picked");
    picked = id;
    if (id && nodes[id]) nodes[id].classList.add("picked");
  }
  function openSheet(m) {
    mode = m;
    sheetBody.scrollTop = 0;
    body.style.setProperty("--sheet-h", sheet.offsetHeight + "px"); // the face keeps clear of the sheet
    sheet.classList.add("open"); sheet.setAttribute("aria-hidden", "false"); body.classList.add("sheet-open");
  }
  function closeSheet() {
    if (!mode) return;
    mode = null; setPicked(null);
    sheet.classList.remove("open"); sheet.setAttribute("aria-hidden", "true"); body.classList.remove("sheet-open");
  }

  // Controls, in the site's language.
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; }
  function field(lbl, node) { var f = el("div", "field"); f.appendChild(el("span", "lbl", lbl)); f.appendChild(node); return f; }
  function choice(cls, options, value, onPick) {
    var box = el("div", cls);
    options.forEach(function (o) {
      var b = el("button"); b.type = "button";
      if (o.svg) b.innerHTML = o.svg;
      b.appendChild(document.createTextNode(o.label));
      b.classList.toggle("on", o.value === value);
      b.setAttribute("aria-pressed", o.value === value ? "true" : "false");
      b.addEventListener("click", function () { onPick(o.value); });
      box.appendChild(b);
    });
    return box;
  }
  function opts(pairs) { return pairs.map(function (p) { return { value: p[0], label: p[1] }; }); }
  // Like choice, but any number may be on; each click toggles one.
  function multi(cls, options, values, onToggle) {
    var box = el("div", cls);
    options.forEach(function (o) {
      var b = el("button"), on = values.indexOf(o.value) >= 0; b.type = "button";
      if (o.svg) b.innerHTML = o.svg;
      b.appendChild(document.createTextNode(o.label));
      b.classList.toggle("on", on); b.setAttribute("aria-pressed", on ? "true" : "false");
      b.addEventListener("click", function () { onToggle(o.value); });
      box.appendChild(b);
    });
    return box;
  }
  var CELL_NAMES = { tl: "top left", tc: "top center", tr: "top right", ml: "middle left", mc: "center", mr: "middle right", bl: "bottom left", bc: "bottom center", br: "bottom right" };
  function gridPick(value, onPick) {
    var g = el("div", "grid");
    CELLS.forEach(function (c) {
      var b = el("button"); b.type = "button"; b.setAttribute("aria-label", CELL_NAMES[c]); b.appendChild(el("i"));
      b.classList.toggle("on", c === value);
      b.addEventListener("click", function () { onPick(c); });
      g.appendChild(b);
    });
    return g;
  }
  function slider(lbl, lo, hi, value, onInput, onChange) {
    var s = el("input", "slider"); s.type = "range"; s.min = lo; s.max = hi; s.step = 0.01; s.value = value; s.setAttribute("aria-label", lbl);
    s.addEventListener("input", function () { onInput(parseFloat(s.value)); });
    s.addEventListener("change", onChange);
    return s;
  }
  function switchRow(lbl, on, onToggle) {
    var r = el("div", "row"); r.appendChild(el("span", "lbl", lbl));
    var b = el("button", "switch" + (on ? " on" : "")); b.type = "button"; b.setAttribute("role", "switch"); b.setAttribute("aria-checked", on ? "true" : "false"); b.setAttribute("aria-label", lbl);
    b.addEventListener("click", onToggle);
    r.appendChild(b);
    return r;
  }
  function swatches(value, onPick) {
    var box = el("div", "swatches");
    var def = el("button", "sw sw-default"); def.type = "button"; def.setAttribute("aria-label", "Default"); def.classList.toggle("on", value === "default");
    def.addEventListener("click", function () { onPick("default"); }); box.appendChild(def);
    PRESETS.forEach(function (c) {
      var b = el("button", "sw"); b.type = "button"; b.style.setProperty("--c", c); b.setAttribute("aria-label", c); b.classList.toggle("on", value === c);
      b.addEventListener("click", function () { onPick(c); }); box.appendChild(b);
    });
    var custom = el("label", "sw sw-custom"), isC = value !== "default" && PRESETS.indexOf(value) < 0;
    custom.setAttribute("aria-label", "Custom color"); custom.classList.toggle("on", isC); if (isC) custom.style.background = value;
    var inp = el("input"); inp.type = "color"; if (isC) inp.value = value;
    inp.addEventListener("input", function () { pickCustom(box, custom, inp.value); onPick(inp.value, true); });
    custom.appendChild(inp); box.appendChild(custom);
    return box;
  }
  // The picker stays open while a custom color is dragged, so the row updates
  // in place rather than being rebuilt under it.
  function pickCustom(box, custom, v) {
    box.querySelectorAll(".on").forEach(function (n) { n.classList.remove("on"); n.setAttribute("aria-pressed", "false"); });
    custom.classList.add("on"); custom.style.background = v;
  }
  function bgPicker(value, onPick) {
    var box = el("div", "pills"), isC = BGS.indexOf(value) < 0;
    opts([["white", "White"], ["black", "Black"], ["system", "System"]]).forEach(function (o) {
      var b = el("button"); b.type = "button"; b.textContent = o.label;
      b.classList.toggle("on", value === o.value); b.setAttribute("aria-pressed", value === o.value ? "true" : "false");
      b.addEventListener("click", function () { onPick(o.value); });
      box.appendChild(b);
    });
    var custom = el("label", "sw sw-custom");
    custom.setAttribute("aria-label", "Custom color"); custom.classList.toggle("on", isC); if (isC) custom.style.background = value;
    var inp = el("input"); inp.type = "color"; inp.value = isC ? value : (mq.matches ? "#000000" : "#ffffff");
    inp.addEventListener("input", function () { pickCustom(box, custom, inp.value); onPick(inp.value, true); });
    custom.appendChild(inp); box.appendChild(custom);
    return box;
  }
  function button(lbl, onClick) { var b = el("button", "btn", lbl); b.type = "button"; b.addEventListener("click", onClick); return b; }
  function textInput(value, placeholder, max, onInput) {
    var inp = el("input"); inp.type = "text"; inp.value = value || ""; inp.placeholder = placeholder; inp.maxLength = max;
    inp.setAttribute("autocomplete", "off"); inp.setAttribute("autocapitalize", "off"); inp.setAttribute("spellcheck", "false");
    if (onInput) inp.addEventListener("input", function () { onInput(inp.value); });
    return inp;
  }
  function zoneField(it) {
    var box = el("div", "stackf");
    box.appendChild(choice("pills", opts(ZONES), it.zone, function (v) { change(it, "zone", v); }));
    var row = el("div", "pair"), known = ZONES.some(function (z) { return z[0] === it.zone; });
    var inp = textInput(known ? "" : it.zone, "Any zone, e.g. Asia/Kolkata", 60, null);
    var set = button("Set", function () { change(it, "zone", validZone(inp.value.trim())); });
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); set.click(); } });
    row.appendChild(inp); row.appendChild(set); box.appendChild(row);
    return field("Time zone", box);
  }
  // One place for the weather and the sun: the phone's, or a city by name.
  function setLoc(loc, then) { S.loc = loc; persist(); WX.data = null; render(new Date()); fetchWeather(true); then(); }
  function locField(then) {
    var box = el("div", "stackf");
    box.appendChild(el("div", "loc-name", S.loc ? S.loc.name : "No location yet"));
    var mine = button(navigator.geolocation ? "Use my location" : "Location unavailable", function () {
      if (!navigator.geolocation) return;
      mine.textContent = "Asking…";
      navigator.geolocation.getCurrentPosition(function (pos) {
        setLoc({ lat: +pos.coords.latitude.toFixed(4), lon: +pos.coords.longitude.toFixed(4), name: "My location", tz: "local" }, then);
      }, function () { mine.textContent = "Not allowed"; }, { timeout: 15000, maximumAge: 600000 });
    });
    box.appendChild(mine);
    var row = el("div", "pair"), results = el("div", "pills");
    var inp = textInput("", "Or a city", 60, null);
    function search() {
      var q = inp.value.trim(); if (!q) return;
      results.innerHTML = ""; results.appendChild(el("span", "lbl", "Searching…"));
      fetch("https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(q) + "&count=5&language=en&format=json").then(function (r) { return r.json(); }).then(function (j) {
        results.innerHTML = "";
        (j.results || []).forEach(function (r) {
          var b = el("button"); b.type = "button";
          b.textContent = r.name + (r.admin1 && r.admin1 !== r.name ? ", " + r.admin1 : "") + (r.country ? " · " + r.country : "");
          b.addEventListener("click", function () { setLoc({ lat: +r.latitude.toFixed(4), lon: +r.longitude.toFixed(4), name: r.name + (r.country_code ? ", " + r.country_code : ""), tz: validZone(r.timezone) }, then); });
          results.appendChild(b);
        });
        if (!results.children.length) results.appendChild(el("span", "lbl", "Nothing found"));
      }).catch(function () { results.innerHTML = ""; results.appendChild(el("span", "lbl", "No network")); });
    }
    var go = button("Search", search);
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); search(); } });
    row.appendChild(inp); row.appendChild(go); box.appendChild(row); box.appendChild(results);
    return field("Location", box);
  }
  var ICONS = {};
  function spiritIcon(form) {
    if (!Spirit) return "";
    if (!ICONS[form]) ICONS[form] = '<svg viewBox="0 0 120 120" aria-hidden="true"><g fill="currentColor">' + Spirit.bake(form, 0).map(function (d) { return '<path d="' + d + '"/>'; }).join("") + '</g></svg>';
    return ICONS[form];
  }

  // An item's sheet: its own settings, then size, position, order; Remove in the head.
  function openItem(id) {
    var it = itemById(id); if (!it) return;
    setPicked(id);
    sheetRemove.hidden = false;
    buildItemSheet(it);
    openSheet("item");
  }
  function refreshItem(it) { var top = sheetBody.scrollTop; buildItemSheet(it); sheetBody.scrollTop = top; }
  function change(it, key, v) {
    it[key] = v; persist(); styleItem(it); renderItem(it, new Date());
    if (key === "format" || key === "seconds") retick();
    refreshItem(it);
  }
  function buildItemSheet(it) {
    sheetTitle.textContent = label(it);
    sheetBody.innerHTML = "";
    var add = function (n) { sheetBody.appendChild(n); };
    if (it.kind === "time") {
      add(field("Format", choice("pills", opts([["military", "24h"], ["h12", "12h"], ["h12ap", "12h AM/PM"], ["words", "Words"], ["pirate", "Pirate"], ["wizard", "Wizard"]]), it.format, function (v) { change(it, "format", v); })));
      if (!isWords(it.format)) add(switchRow("Seconds", it.seconds, function () { change(it, "seconds", !it.seconds); }));
      add(zoneField(it));
      add(field("Weight", choice("seg", opts([["auto", "Auto"], ["thin", "Thin"], ["regular", "Reg"], ["semibold", "Semi"], ["bold", "Bold"]]), it.weight, function (v) { change(it, "weight", v); })));
      add(switchRow("Italic", it.italic, function () { change(it, "italic", !it.italic); }));
    } else if (it.kind === "date") {
      add(field("Format", choice("pills", opts([["iso", "ISO"], ["long", "Long"], ["longd", "Long Mon"], ["longdow", "Long Monday"], ["short", "Short"], ["dotted", "Dotted"], ["doy", "Day"], ["words", "Words"]]), it.format, function (v) { change(it, "format", v); })));
      add(switchRow("Italic", it.italic, function () { change(it, "italic", !it.italic); }));
      add(zoneField(it));
    } else if (it.kind === "weather") {
      add(field("Unit", choice("seg", opts([["c", "°C"], ["f", "°F"]]), it.unit, function (v) { change(it, "unit", v); })));
      add(field("Show", choice("pills", opts([["both", "Sky and temperature"], ["icon", "Sky"], ["temp", "Temperature"]]), it.show, function (v) { change(it, "show", v); })));
      add(switchRow("Wobble", it.wobble, function () { change(it, "wobble", !it.wobble); }));
      add(locField(function () { refreshItem(it); }));
    } else if (it.kind === "sun") {
      add(field("Format", choice("seg", opts([["12", "12h"], ["24", "24h"]]), it.format, function (v) { change(it, "format", v); })));
      add(field("Show", choice("pills", opts([["both", "Sunrise and sunset"], ["rise", "Sunrise"], ["set", "Sunset"]]), it.show, function (v) { change(it, "show", v); })));
      add(field("Marks", choice("seg", opts([["icons", "Rise, set"], ["sunmoon", "Sun, moon"], ["arrows", "Arrows"]]), it.marks, function (v) { change(it, "marks", v); })));
      if (it.marks !== "arrows") add(switchRow("Wobble", it.wobble, function () { change(it, "wobble", !it.wobble); }));
      add(locField(function () { refreshItem(it); }));
    } else if (it.kind === "text") {
      var inp = textInput(it.text, "Say something", 80, function (v) { it.text = v; persist(); renderItem(it, new Date()); });
      add(field("Text", inp));
      add(field("Weight", choice("seg", opts([["auto", "Auto"], ["thin", "Thin"], ["regular", "Reg"], ["semibold", "Semi"], ["bold", "Bold"]]), it.weight, function (v) { change(it, "weight", v); })));
      add(switchRow("Italic", it.italic, function () { change(it, "italic", !it.italic); }));
    } else if (it.kind === "moon") {
      add(field("Phase", choice("pills", opts([["live", "Live"], ["new", "New"], ["cres", "Crescent"], ["quarter", "Quarter"], ["gibbous", "Gibbous"], ["full", "Full"]]), it.phase, function (v) { change(it, "phase", v); })));
      add(field("Style", choice("pills", opts([["filled", "Filled"], ["hollow", "Hollow"], ["diagram", "Diagram"], ["pixel", "Pixel"]]), it.style, function (v) { change(it, "style", v); })));
    } else {
      var formOpts = SPIRIT_FORMS.map(function (f) { return { value: f, label: SPIRIT_NAMES[f], svg: spiritIcon(f) }; });
      add(field("Mode", choice("seg", opts([["one", "One"], ["cycle", "Cycle"]]), it.mode, function (v) { change(it, "mode", v); })));
      if (it.mode === "cycle") {
        add(field("Wander between", multi("pills", formOpts, it.forms, function (v) {
          var i = it.forms.indexOf(v);
          if (i >= 0) { if (it.forms.length > 1) it.forms.splice(i, 1); } else it.forms.push(v);
          change(it, "forms", it.forms);
        })));
        add(field("Every", choice("pills", opts([[10, "10 s"], [30, "30 s"], [60, "1 min"], [300, "5 min"], [900, "15 min"]]), it.every, function (v) { change(it, "every", v); })));
      } else add(field("Form", choice("pills", formOpts, it.form, function (v) { change(it, "form", v); })));
      add(switchRow("Shadow", it.shadow, function () { change(it, "shadow", !it.shadow); }));
    }
    add(field("Size", slider("Size", SIZE[it.kind][0], SIZE[it.kind][1], it.size, function (v) { it.size = v; styleItem(it); }, persist)));
    add(field("Position", gridPick(it.cell, function (c) { it.cell = c; persist(); layoutFace(); refreshItem(it); })));
    var mates = S.items.filter(function (o) { return o.cell === it.cell; });
    if (mates.length > 1) {
      var pair = el("div", "pair");
      pair.appendChild(button("Move up", function () { reorder(it, -1); }));
      pair.appendChild(button("Move down", function () { reorder(it, 1); }));
      add(field("Order in its cell", pair));
    }
  }
  // Swap with the neighbour that shares the cell, up (earlier) or down (later).
  function reorder(it, dir) {
    var i = S.items.indexOf(it), j = i + dir;
    while (j >= 0 && j < S.items.length && S.items[j].cell !== it.cell) j += dir;
    if (j < 0 || j >= S.items.length) return;
    S.items.splice(i, 1); S.items.splice(j, 0, it);
    persist(); layoutFace(); refreshItem(it);
  }
  sheetRemove.addEventListener("click", function () {
    if (!picked) return;
    var id = picked;
    S.items = S.items.filter(function (o) { return o.id !== id; });
    persist(); closeSheet(); layoutFace(); retick();
  });

  // The add sheet: a kind, placed in the cell that was tapped.
  function openAdd(cell) {
    addCell = cell; setPicked(null);
    sheetTitle.textContent = "Add · " + CELL_NAMES[cell];
    sheetRemove.hidden = true;
    sheetBody.innerHTML = "";
    var g = el("div", "adds");
    function addBtn(lbl, icon, kind, form) {
      var b = el("button"); b.type = "button"; b.innerHTML = icon; b.appendChild(document.createTextNode(lbl));
      b.addEventListener("click", function () { addItem(kind, form); });
      g.appendChild(b);
    }
    addBtn("Time", "<i>9:41</i>", "time"); addBtn("Date", "<i>29</i>", "date"); addBtn("Moon", "<i>☾</i>", "moon");
    addBtn("Spirit", spiritIcon("blob"), "spirit");
    addBtn("Weather", skySVG("partly-cloudy", false) || "<i>☁</i>", "weather"); addBtn("Sun", skySVG("sunrise", false) || "<i>↑↓</i>", "sun"); addBtn("Text", "<i>Aa</i>", "text");
    sheetBody.appendChild(g);
    openSheet("add");
  }
  function addItem(kind, form) {
    var it = newItem(kind, addCell); if (form) it.form = form;
    S.items.push(it); persist(); layoutFace(); retick();
    openItem(it.id);
  }

  // The clock's own sheet: what applies to the whole face.
  function openClock() {
    setPicked(null); sheetRemove.hidden = true;
    buildClockSheet();
    openSheet("clock");
  }
  function refreshClock() { var top = sheetBody.scrollTop; buildClockSheet(); sheetBody.scrollTop = top; }
  function buildClockSheet() {
    sheetTitle.textContent = "Clock";
    sheetBody.innerHTML = "";
    var add = function (n) { sheetBody.appendChild(n); };
    add(field("Font", choice("seg", opts([["sans", "Sans"], ["mono", "Mono"]]), S.font, function (v) { S.font = v; persist(); applyFont(); refreshClock(); })));
    add(field("Background", bgPicker(S.bg, function (v, live) { S.bg = v; persist(); applyBg(); if (!live) refreshClock(); })));
    add(field("Accent", swatches(S.accent, function (v, live) { S.accent = v; persist(); applyAccent(); if (!live) refreshClock(); })));
    add(field("Orientation", choice("seg", opts([["auto", "Auto"], ["portrait", "Portrait"], ["landscape", "Landscape"]]), S.orientation, function (v) { S.orientation = v; persist(); applyOrientation(); refreshClock(); })));
    add(switchRow("Motion", S.motion, function () { S.motion = !S.motion; persist(); applyMotion(); refreshClock(); }));
    add(switchRow("Drift (burn-in care)", S.drift, function () { S.drift = !S.drift; persist(); applyDrift(); refreshClock(); }));
    add(field("Night dim", slider("Night dim", 0, 0.8, S.dim, function (v) { S.dim = v; applyDim(); }, persist)));
    var armed = false, reset = button("Reset the clock", function () {
      if (!armed) { armed = true; reset.textContent = "Tap again to reset"; reset.classList.add("on"); return; }
      S = defaults(); persist(); closeSheet();
      applyBg(); applyFont(); applyAccent(); applyMotion(); applyDrift(); applyDim(); layoutFace(); retick();
    });
    add(reset);
  }

  // --- Taps and keys ----------------------------------------------------------
  face.addEventListener("pointerdown", function () { enterImmersive(); });
  face.addEventListener("click", function (e) {
    var n = e.target.closest(".item");
    if (!editing) { enterEdit(); return; }
    if (n) { openItem(n.dataset.id); return; }
    if (mode) { closeSheet(); return; }
    openAdd(cellAt(e.clientX, e.clientY));
  });
  function cellAt(x, y) {
    var r = face.getBoundingClientRect(), cx = (x - r.left) / r.width, cy = (y - r.top) / r.height;
    return (cy < 1 / 3 ? "t" : cy < 2 / 3 ? "m" : "b") + (cx < 1 / 3 ? "l" : cx < 2 / 3 ? "c" : "r");
  }
  bar.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-act]"); if (!b) return;
    if (b.dataset.act === "done") exitEdit();
    else if (mode === "clock") closeSheet();
    else openClock();
  });
  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { if (mode) closeSheet(); else if (editing) exitEdit(); return; }
    var onItem = editing && e.target.classList && e.target.classList.contains("item");
    if ((e.key === "Enter" || e.key === " ") && !editing && e.target === face) { e.preventDefault(); enterEdit(); }
    else if ((e.key === "Enter" || e.key === " ") && onItem) { e.preventDefault(); openItem(e.target.dataset.id); }
  });
  // A field in the sheet may pull the page up under the keyboard; settle it after.
  document.addEventListener("focusout", function () { setTimeout(function () { window.scrollTo(0, 0); }, 60); });
  window.addEventListener("online", function () { fetchWeather(true); });
  // No pinch-zoom of the page (a browser tab on iOS ignores user-scalable=no).
  document.addEventListener("touchmove", function (e) { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  document.addEventListener("gesturestart", function (e) { e.preventDefault(); });

  // --- Screen wake lock (keeps the display on) --------------------------------
  function acquireWake() { if ("wakeLock" in navigator) navigator.wakeLock.request("screen").catch(function () {}); }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "visible") return;
    acquireWake();
    retick(); // timers are throttled while hidden — show the correct time immediately
    fetchWeather();
  });
  acquireWake();

  // --- Service worker (production only; skip on localhost so dev edits show) ---
  var DEV = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"].indexOf(location.hostname) !== -1;
  if ("serviceWorker" in navigator && !DEV) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("/clock-sw.js").catch(function () {}); });
  }

  // --- Go ---------------------------------------------------------------------
  applyBg(); applyFont(); applyAccent(); applyMotion(); applyDrift(); applyDim();
  layoutFace(); tick();
  if (isStandalone()) applyOrientation();
})();
