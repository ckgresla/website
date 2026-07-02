// wand.js — keeps the browser-tab favicon in sync with the wand logo: a black
// rod with a white cylindrical tip that inverts with the light/dark theme. (The
// earlier per-section "spell" symbols were removed; a richer per-page treatment
// may come back later.)
(function () {
  "use strict";

  function isDark() {
    return document.documentElement.getAttribute("data-mode") === "dark";
  }
  function ink() { return isDark() ? "#f5f5f5" : "#141414"; } // rod
  function tipInk() { return isDark() ? "#0a0a0a" : "#ffffff"; } // white tip

  // The wand drawn in a 0..48 box — same geometry as the inline logo, scaled up.
  // Rod A→B; the tip is a slightly-inset stroke so the rod forms a hairline
  // keyline (keeps a white tip legible on a light tab bar).
  function faviconSVG() {
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">' +
      '<g fill="none" stroke-linecap="round">' +
      '<path d="M10 42 40 12" stroke="' + ink() + '" stroke-width="9.6"/>' +
      '<path d="M34.96 17.04 40 12" stroke="' + tipInk() + '" stroke-width="8.4"/>' +
      "</g></svg>"
    );
  }

  function setFaviconHref(href) {
    var old = document.getElementById("favicon");
    var link = document.createElement("link");
    link.id = "favicon";
    link.rel = "icon";
    link.type = href.indexOf("image/png") !== -1 ? "image/png" : "image/svg+xml";
    link.href = href;
    if (old) old.parentNode.removeChild(old);
    document.head.appendChild(link);
  }

  // Rasterise to PNG so every browser (incl. Safari) accepts the swap without a
  // reload; fall back to the raw SVG if canvas is unavailable.
  function renderFavicon() {
    var svg = faviconSVG();
    var img = new Image();
    img.onload = function () {
      try {
        var size = 64;
        var canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, size, size);
        setFaviconHref(canvas.toDataURL("image/png"));
      } catch (e) {
        setFaviconHref("data:image/svg+xml;base64," + btoa(svg));
      }
    };
    img.onerror = function () {
      setFaviconHref("data:image/svg+xml;base64," + btoa(svg));
    };
    img.src = "data:image/svg+xml;base64," + btoa(svg);
  }

  // Re-render when the user flips dark/light mode.
  var modeObserver = new MutationObserver(renderFavicon);
  modeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-mode"]
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderFavicon);
  } else {
    renderFavicon();
  }
})();
