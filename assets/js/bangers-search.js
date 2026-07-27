// Search for the bangers index: filters songs and artists as you type.
// Matching is diacritic-folded (Tô matches "to") and spans native titles,
// English titles, artist names (both scripts), and the romanized slug.
// The accordion itself is native <details> — this file only does search.
(function () {
  var row = document.querySelector('.bangers-search-row');
  var input = document.querySelector('.bangers-search');
  var clear = document.querySelector('.search-clear');
  var lens = document.querySelector('.search-icon');
  if (!row || !input) return;
  row.hidden = false;

  var groups = Array.prototype.slice.call(document.querySelectorAll('.artist-group'));
  function fold(s) {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  var index = groups.map(function (g) {
    return {
      el: g,
      artist: fold(g.querySelector('.artist-name').textContent),
      items: Array.prototype.slice.call(g.querySelectorAll('li')).map(function (li) {
        return { el: li, text: fold(li.getAttribute('data-search') || '') };
      })
    };
  });

  function apply() {
    var q = fold(input.value.trim());
    // one icon slot: the magnifier gives way to the ✕ while a query is live
    if (clear) clear.hidden = !q;
    if (lens) lens.style.display = q ? 'none' : '';
    index.forEach(function (g) {
      if (!q) {
        g.el.hidden = false;
        g.el.open = false;
        g.items.forEach(function (it) { it.el.hidden = false; });
        return;
      }
      var artistHit = g.artist.indexOf(q) !== -1;
      var any = false;
      g.items.forEach(function (it) {
        var hit = artistHit || it.text.indexOf(q) !== -1;
        it.el.hidden = !hit;
        if (hit) any = true;
      });
      g.el.hidden = !any;
      g.el.open = any; // open matches so results are visible, not just present
    });
  }

  input.addEventListener('input', apply);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { input.value = ''; apply(); input.blur(); }
  });
  if (clear) clear.addEventListener('click', function () {
    input.value = ''; apply(); input.focus();
  });
})();
