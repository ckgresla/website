// clock.js — a tappable, offline clock with a settings menu.
//   • tap                → open the menu; tap off a control → back to clock
//   • drag ↕ / pinch     → zoom the time (or date/moon under your finger), live
//   • menu               → Font · Time/Date format · Position · Size · Date size ·
//                          Weight · Moon · Orientation · Theme · Accent · Italic ·
//                          Seconds (all persisted)
//   • font               → Sans (Inter) or Mono (JetBrains Mono), same view
//   • orientation        → Auto / Portrait / Landscape (locks when fullscreen)
//   • theme              → Auto follows the system light/dark mode, animated
//   • wake lock          → keeps the display awake while visible
//   • fullscreen         → installed PWA runs edge-to-edge (manifest display:fullscreen);
//                          in a browser tab, the first tap requests the Fullscreen API
//   • service worker     → loads offline on reload, permanently cached
//
// One view today. The .views flex track is kept so future views (timer, alarm…)
// can be appended without reworking layout.
(function () {
  "use strict";

  var root = document.documentElement;
  var track = document.getElementById("views");
  var menu = document.getElementById("menu");
  var moonEl = document.getElementById("moon");

  var WEIGHTS = { thin: 200, regular: 400, semibold: 600, bold: 700 };
  var PRESETS = ["#8e8cff", "#7ee0b8", "#f2c14e", "#ff6b6b", "#ff7eb6", "#5ac8fa"];
  var POS = {
    tl: ["top", "left"], tc: ["top", "center"], tr: ["top", "right"],
    ml: ["middle", "left"], mc: ["middle", "center"], mr: ["middle", "right"],
    bl: ["bottom", "left"], bc: ["bottom", "center"], br: ["bottom", "right"]
  };

  // --- Settings (persisted) ---------------------------------------------------
  var DEFAULTS = {
    font: "sans", timeFormat: "h12", dateFormat: "long", position: "mc",
    size: 1, dateSize: 1, weight: "auto", italic: false, theme: "auto",
    orientation: "auto", accent: "default", seconds: false,
    moon: "off", moonStyle: "filled", moonPos: "tr", moonSize: 1
  };
  var settings = load("clock.settings", null) || {};
  for (var dk in DEFAULTS) if (!(dk in settings)) settings[dk] = DEFAULTS[dk];
  if (typeof settings.size !== "number") settings.size = 1;       // migrate old s/m/l/xl
  if (typeof settings.dateSize !== "number") settings.dateSize = 1;
  if (typeof settings.moonSize !== "number") settings.moonSize = 1;
  if (settings.font !== "mono") settings.font = "sans";           // migrate old face:quiet/mono
  delete settings.face;

  function load(key, d) { try { var v = localStorage.getItem(key); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function persist() { try { localStorage.setItem("clock.settings", JSON.stringify(settings)); } catch (e) {} }

  // --- Element refs -----------------------------------------------------------
  function q(sel) { return track.querySelector(sel); }
  var el = {
    time: q(".time"), hm: q('[data-role="hm"]'), ampm: q('[data-role="ampm"]'),
    secs: q('[data-role="secs"]'), date: q('[data-role="date"]')
  };

  // --- Apply settings ---------------------------------------------------------
  function applyFont() { track.classList.toggle("font-mono", settings.font === "mono"); }
  function applyPosition() { var p = POS[settings.position] || POS.mc; track.classList.remove("v-top", "v-middle", "v-bottom", "h-left", "h-center", "h-right"); track.classList.add("v-" + p[0], "h-" + p[1]); }
  function applySize() { track.style.setProperty("--scale", settings.size); }
  function applyDateSize() { track.style.setProperty("--date-scale", settings.dateSize); }
  function applyMoonSize() { moonEl.style.setProperty("--moon-scale", settings.moonSize); }

  // Per-item scaling: each resizable element has its own setting, bounds, and
  // apply fn — gestures pick the one under your finger; sliders set them too.
  var SCALERS = {
    time: { key: "size", min: 0.2, max: 1.7, apply: applySize },
    date: { key: "dateSize", min: 0.3, max: 2.2, apply: applyDateSize },
    moon: { key: "moonSize", min: 0.2, max: 2.5, apply: applyMoonSize }
  };
  var SLIDER_APPLY = { size: applySize, dateSize: applyDateSize, moonSize: applyMoonSize };
  function applyWeight() { if (settings.weight === "auto") track.style.removeProperty("--time-weight"); else track.style.setProperty("--time-weight", WEIGHTS[settings.weight]); }
  function applyItalic() { track.classList.toggle("italic", !!settings.italic); }

  function contrastOn(hex) {
    var h = hex.replace("#", ""); if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
    var rgb = [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16) / 255; });
    var lin = rgb.map(function (c) { return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
    var L = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
    return L > 0.5 ? "#0a0a0a" : "#fff";
  }
  function applyAccent() {
    if (settings.accent && settings.accent !== "default") {
      root.style.setProperty("--accent", settings.accent);
      root.style.setProperty("--accent-on", contrastOn(settings.accent));
    } else { root.style.removeProperty("--accent"); root.style.removeProperty("--accent-on"); }
  }

  // --- Orientation + fullscreen (immersive) -----------------------------------
  // Orientation lock only works while the document is fullscreen (browser) or the
  // app is an installed fullscreen/standalone PWA. All calls are best-effort.
  function isStandalone() {
    return (window.matchMedia && (matchMedia("(display-mode: fullscreen)").matches || matchMedia("(display-mode: standalone)").matches)) ||
      navigator.standalone === true;
  }
  function requestFullscreen() {
    var e = document.documentElement;
    var fn = e.requestFullscreen || e.webkitRequestFullscreen;
    if (fn && !document.fullscreenElement && !document.webkitFullscreenElement) {
      try { var p = fn.call(e); if (p && p.catch) p.catch(function () {}); } catch (err) {}
    }
  }
  function applyOrientation() {
    if (!(screen.orientation && screen.orientation.lock)) return;
    try {
      if (settings.orientation === "auto") {
        if (screen.orientation.unlock) screen.orientation.unlock();
      } else {
        var p = screen.orientation.lock(settings.orientation); // "portrait" | "landscape"
        if (p && p.catch) p.catch(function () {});
      }
    } catch (err) {}
  }
  // First user gesture: go fullscreen (browser tabs) so annotations vanish like
  // iOS standalone, then honour the orientation lock.
  var immersed = false;
  function enterImmersive() {
    if (immersed) return; immersed = true;
    if (!isStandalone()) requestFullscreen();
    setTimeout(applyOrientation, 60);
  }

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
  // Is unit point (u,v) lit at phase p? (u right+, disk radius 1) — same
  // terminator math as litPath, used by the blocky "pixel" style.
  function isLit(u, v, p) {
    var w = Math.sqrt(Math.max(0, 1 - v * v));
    var t = Math.cos(2 * Math.PI * p) * w;
    return p < 0.5 ? (u > t) : (u < -t);
  }
  function pixelMoon(p, lit, unlit, r) {
    var n = 13, cell = (2 * r) / n, gap = cell * 0.13, s = "";
    for (var j = 0; j < n; j++) for (var i = 0; i < n; i++) {
      var cx = -r + (i + 0.5) * cell, cy = -r + (j + 0.5) * cell, u = cx / r, v = cy / r;
      if (u * u + v * v > 1.0) continue;
      s += '<rect x="' + (cx - cell / 2 + gap).toFixed(2) + '" y="' + (cy - cell / 2 + gap).toFixed(2) +
        '" width="' + (cell - 2 * gap).toFixed(2) + '" height="' + (cell - 2 * gap).toFixed(2) +
        '" fill="' + (isLit(u, v, p) ? lit : unlit) + '"/>';
    }
    return s;
  }
  function moonSVG(p) {
    // White on dark, ink on light; the fixed 45° tilt is in CSS. The style knob
    // swaps between the solid shape and three "technical" renders.
    var r = 40, dark = root.getAttribute("data-theme") !== "light";
    var lit = dark ? "#ffffff" : "#111114";
    var dim = dark ? "#3a3a42" : "#cfcfd6", unlit = dark ? "#2f2f37" : "#d6d6dd";
    var disc = '<circle cx="0" cy="0" r="' + r + '" fill="none" stroke="' + dim + '" stroke-width="3"/>';
    var inner;
    switch (settings.moonStyle) {
      case "hollow":
        inner = disc + '<path d="' + litPath(r, p) + '" fill="none" stroke="' + lit + '" stroke-width="4.5"/>';
        break;
      case "diagram":
        inner = disc + '<path d="' + litPath(r, p) + '" fill="' + lit + '"/>' +
          '<circle cx="0" cy="0" r="' + r + '" fill="none" stroke="' + lit + '" stroke-width="1.4" opacity="0.5"/>';
        break;
      case "pixel":
        inner = pixelMoon(p, lit, unlit, r);
        break;
      default: // filled — the luminous shape, no disc
        inner = '<path d="' + litPath(r, p) + '" fill="' + lit + '"/>';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 100 100">' + inner + '</svg>';
  }
  function placeMoon() {
    var pos = POS[settings.moonPos] || POS.tr;
    moonEl.classList.remove("mv-top", "mv-middle", "mv-bottom", "mh-left", "mh-center", "mh-right");
    moonEl.classList.add("mv-" + pos[0], "mh-" + pos[1]);
  }
  function renderMoon() {
    if (settings.moon === "off") { moonEl.classList.remove("on"); moonEl.innerHTML = ""; return; }
    placeMoon();
    moonEl.classList.add("on");
    moonEl.innerHTML = moonSVG(settings.moon === "live" ? moonPhaseNow(new Date()) : MOON_P[settings.moon]);
  }

  // --- Theme ------------------------------------------------------------------
  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  function applyTheme() { root.setAttribute("data-theme", settings.theme === "auto" ? (mq.matches ? "dark" : "light") : settings.theme); }
  function onThemeChange() { applyTheme(); renderMoon(); }
  if (mq.addEventListener) mq.addEventListener("change", function () { if (settings.theme === "auto") onThemeChange(); });
  else if (mq.addListener) mq.addListener(function () { if (settings.theme === "auto") onThemeChange(); });

  // --- Time + date formatting -------------------------------------------------
  var DOW3 = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  var DOWC = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var DOWF = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONC = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var MONF = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var ORD_WORD = { 1: "first", 2: "second", 3: "third", 4: "fourth", 5: "fifth", 6: "sixth", 7: "seventh", 8: "eighth", 9: "ninth", 10: "tenth", 11: "eleventh", 12: "twelfth", 13: "thirteenth", 14: "fourteenth", 15: "fifteenth", 16: "sixteenth", 17: "seventeenth", 18: "eighteenth", 19: "nineteenth", 20: "twentieth", 30: "thirtieth" };
  function ordinalWord(n) { if (ORD_WORD[n]) return ORD_WORD[n]; return TENS[Math.floor(n / 10)] + "-" + ORD_WORD[n % 10]; }
  function dayOfYear(now) { return Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(now.getFullYear(), 0, 0)) / 86400000); }
  var ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  var TENS = ["", "", "twenty", "thirty", "forty", "fifty"];
  function p2(n) { return (n < 10 ? "0" : "") + n; }
  function ordinal(n) { var t = n % 100; if (t >= 11 && t <= 13) return n + "th"; switch (n % 10) { case 1: return n + "st"; case 2: return n + "nd"; case 3: return n + "rd"; default: return n + "th"; } }
  function w2(n) { if (n < 20) return ONES[n]; var t = Math.floor(n / 10), o = n % 10; return TENS[t] + (o ? "-" + ONES[o] : ""); }
  function minWords(m) { return m === 0 ? "o'clock" : (m < 10 ? "oh " + w2(m) : w2(m)); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function plainWords(h12, m, ap) { return w2(h12) + " " + minWords(m) + " " + ap; }
  function dayPart(H) { return H < 12 ? "mornin'" : H < 17 ? "afternoon" : H < 21 ? "evenin'" : "night"; }
  function pirate(h12, m, H) { return cap("arr, 'tis " + w2(h12) + " " + minWords(m) + " in the " + dayPart(H)); }
  function wizard(h12, m, H) { return cap("'tis " + w2(h12) + " " + minWords(m) + ", by " + (H >= 6 && H < 18 ? "sun’s light" : "moon’s glow")); }

  function fmt(now) {
    var H = now.getHours(), m = now.getMinutes(), h12 = H % 12 || 12, ap = H < 12 ? "AM" : "PM";
    switch (settings.timeFormat) {
      case "words": return { words: true, main: plainWords(h12, m, ap) };
      case "pirate": return { words: true, main: pirate(h12, m, H) };
      case "wizard": return { words: true, main: wizard(h12, m, H) };
      case "military": return { words: false, H: H, h12: h12, m: m, military: true, ap: "" };
      case "h12ap": return { words: false, H: H, h12: h12, m: m, military: false, ap: ap };
      default: return { words: false, H: H, h12: h12, m: m, military: false, ap: "" };
    }
  }
  function dateStr(now) {
    var Y = now.getFullYear(), M = now.getMonth(), D = now.getDate(), dow = now.getDay();
    switch (settings.dateFormat) {
      case "off": return null;
      case "iso": return Y + "-" + p2(M + 1) + "-" + p2(D) + " " + DOW3[dow];
      case "short": return DOWC[dow] + " " + D + " " + MONC[M];
      case "dotted": return Y + "." + p2(M + 1) + "." + p2(D);
      case "doy": return "Day " + dayOfYear(now) + " · " + Y;
      case "words": return "the " + ordinalWord(D) + " of " + MONF[M];
      case "longd": return DOWC[dow] + " " + MONF[M] + " " + D + " " + Y;               // Mon June 29 2026
      case "longdow": return DOWF[dow] + ", " + MONF[M] + " " + ordinal(D) + " " + Y;    // Monday, June 29th 2026
      default: return MONF[M] + " " + D + " " + Y;                                       // long → June 29 2026
    }
  }
  function spanText(node, t) { if (!node) return; node.textContent = t; node.style.display = t ? "" : "none"; }
  function setDate(node, t) { if (!node) return; if (t === null) node.style.display = "none"; else { node.style.display = ""; node.textContent = t; } }

  function render(now) {
    var f = fmt(now), s = now.getSeconds(), showSecs = settings.seconds && !f.words;
    el.time.classList.toggle("words", f.words);
    if (f.words) { el.hm.textContent = f.main; spanText(el.ampm, ""); spanText(el.secs, ""); }
    else { el.hm.textContent = (f.military ? p2(f.H) : f.h12) + ":" + p2(f.m); spanText(el.ampm, f.ap); spanText(el.secs, showSecs ? p2(s) : ""); }
    setDate(el.date, dateStr(now));
  }
  var tickN = 0;
  function tick() {
    render(new Date());
    if (settings.moon === "live" && (++tickN % 1800) === 0) renderMoon(); // refresh live phase ~every 30 min
    setTimeout(tick, 1000 - (Date.now() % 1000) + 8);
  }

  // --- Menu -------------------------------------------------------------------
  function syncMenu() {
    menu.querySelectorAll("[data-set]").forEach(function (group) {
      var key = group.dataset.set;
      group.querySelectorAll("button[data-val]").forEach(function (b) { b.classList.toggle("on", b.dataset.val === String(settings[key])); });
    });
    var custom = menu.querySelector(".sw-custom");
    if (custom) {
      var isC = settings.accent !== "default" && PRESETS.indexOf(settings.accent) < 0;
      custom.classList.toggle("on", isC);
      custom.style.background = isC ? settings.accent : "";
      var ci = custom.querySelector("input"); if (ci && isC) ci.value = settings.accent;
    }
    menu.querySelectorAll(".switch").forEach(function (sw) { sw.classList.toggle("on", !!settings[sw.dataset.toggle]); });
    menu.querySelectorAll(".slider").forEach(function (sl) { sl.value = settings[sl.dataset.slider]; });
  }
  var menuOpen = false;
  function openMenu() { menuOpen = true; menu.classList.add("open"); menu.setAttribute("aria-hidden", "false"); syncMenu(); }
  function closeMenu() { menuOpen = false; menu.classList.remove("open"); menu.setAttribute("aria-hidden", "true"); }

  function applyKey(key) {
    if (key === "font") applyFont();
    else if (key === "position") applyPosition();
    else if (key === "weight") applyWeight();
    else if (key === "theme") onThemeChange();
    else if (key === "orientation") applyOrientation();
    else if (key === "accent") applyAccent();
    else if (key === "moon" || key === "moonStyle") renderMoon();
    else if (key === "moonPos") placeMoon();
    // timeFormat / dateFormat are reflected by render()
  }
  menu.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-val]");
    if (btn && btn.parentNode.dataset.set) {
      var key = btn.parentNode.dataset.set; settings[key] = btn.dataset.val;
      persist(); applyKey(key); render(new Date()); syncMenu(); return;
    }
    var sw = e.target.closest(".switch");
    if (sw) { settings[sw.dataset.toggle] = !settings[sw.dataset.toggle]; persist(); if (sw.dataset.toggle === "italic") applyItalic(); render(new Date()); syncMenu(); return; }
    if (e.target.closest(".slider, .swatches")) return; // sliders & custom-color: not a dismiss
    closeMenu();
  });
  menu.addEventListener("input", function (e) {
    var sl = e.target.closest(".slider");
    if (sl) { var key = sl.dataset.slider; settings[key] = parseFloat(sl.value); SLIDER_APPLY[key](); persist(); return; }
    var ci = e.target.closest('[data-role="customcolor"]');
    if (ci) { settings.accent = ci.value; persist(); applyAccent(); render(new Date()); syncMenu(); }
  });

  // --- Gestures ---------------------------------------------------------------
  // Vertical drag / pinch resize the element under the finger; a tap opens the
  // menu. There is no horizontal view switch (single view for now).
  var sx = 0, sy = 0, st = 0, baseScale = 1, dragging = false, locked = null, rtarget = "time";
  var pinching = false, pinchStart = 0, pinchBase = 1;
  function setLive(t, v) { var s = SCALERS[t]; settings[s.key] = Math.min(s.max, Math.max(s.min, v)); s.apply(); }
  function tdist(t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY); }
  function hitEl(node, x, y, pad) { if (!node) return false; var r = node.getBoundingClientRect(); return r.width > 0 && x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad; }
  function resizeTarget(x, y) {
    var ms = moonEl.firstElementChild;
    if (settings.moon !== "off" && hitEl(ms, x, y, 14)) return "moon";
    if (el.date && el.date.style.display !== "none" && hitEl(el.date, x, y, 16)) return "date";
    return "time";
  }

  function startPointer(p) { sx = p.clientX; sy = p.clientY; st = Date.now(); dragging = true; locked = null; rtarget = resizeTarget(p.clientX, p.clientY); baseScale = settings[SCALERS[rtarget].key]; }
  function movePointer(e, p) {
    var dx = p.clientX - sx, dy = p.clientY - sy;
    if (locked === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) locked = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    if (locked === "y") { e.preventDefault(); setLive(rtarget, baseScale + (-dy) / 700); }
    // locked === "x": no-op (no horizontal view switch)
  }
  function endPointer(e, p) {
    dragging = false;
    var dx = p.clientX - sx, dy = p.clientY - sy, dt = Date.now() - st;
    if (locked === null && Math.abs(dx) < 10 && Math.abs(dy) < 10 && dt < 350) { openMenu(); return; }
    if (locked === "y") persist(); // size already applied live
  }

  track.addEventListener("touchstart", function (e) {
    if (menuOpen) return;
    enterImmersive();
    if (e.touches.length === 2) {
      pinching = true; dragging = false; pinchStart = tdist(e.touches);
      rtarget = resizeTarget((e.touches[0].clientX + e.touches[1].clientX) / 2, (e.touches[0].clientY + e.touches[1].clientY) / 2);
      pinchBase = settings[SCALERS[rtarget].key]; return;
    }
    startPointer(e.touches[0]);
  }, { passive: true });
  track.addEventListener("touchmove", function (e) {
    if (pinching && e.touches.length === 2) { e.preventDefault(); setLive(rtarget, pinchBase * tdist(e.touches) / pinchStart); return; }
    if (dragging) movePointer(e, e.touches[0]);
  }, { passive: false });
  track.addEventListener("touchend", function (e) {
    if (pinching) { if (e.touches.length < 2) { pinching = false; persist(); } return; }
    if (dragging) endPointer(e, e.changedTouches[0]);
  });
  track.addEventListener("mousedown", function (e) { if (!menuOpen) { enterImmersive(); startPointer(e); } });
  window.addEventListener("mousemove", function (e) { if (dragging) movePointer(e, e); });
  window.addEventListener("mouseup", function (e) { if (dragging) endPointer(e, e); });
  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && menuOpen) closeMenu();
    else if (menuOpen) return;
    else if (e.key === "ArrowUp") { setLive("time", settings.size + 0.06); persist(); }
    else if (e.key === "ArrowDown") { setLive("time", settings.size - 0.06); persist(); }
  });

  // Re-assert the orientation lock when we enter/leave fullscreen.
  document.addEventListener("fullscreenchange", function () { if (document.fullscreenElement) applyOrientation(); });

  // --- Screen wake lock (keeps the display on) --------------------------------
  function acquireWake() { if ("wakeLock" in navigator) navigator.wakeLock.request("screen").catch(function () {}); }
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") acquireWake(); });
  acquireWake();

  // --- Service worker (production only; skip on localhost so dev edits show) ---
  var DEV = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"].indexOf(location.hostname) !== -1;
  if ("serviceWorker" in navigator && !DEV) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("/clock-sw.js").catch(function () {}); });
  }

  // --- Go ---------------------------------------------------------------------
  applyTheme(); applyFont(); applyPosition(); applySize(); applyDateSize(); applyMoonSize();
  applyWeight(); applyItalic(); applyAccent();
  renderMoon(); render(new Date()); tick();
  // Installed PWA is already fullscreen — honour the saved orientation on load.
  if (isStandalone()) applyOrientation();
})();
