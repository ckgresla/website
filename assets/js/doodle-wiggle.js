(() => {
  const params = new URLSearchParams(window.location.search);
  let wiggleTimer;
  const wiggling = new Set();

  // Apply the site's hand-drawn displacement effect to one SVG. Components
  // normally opt in declaratively with data-wiggle, but the function remains
  // public for one-off interactive uses.
  function wiggle(element) {
    if (!element || wiggling.has(element)) return () => {};

    let filter = document.querySelector('#doodle-wiggle-filter');
    if (!filter) {
      const ns = 'http://www.w3.org/2000/svg';
      const bank = document.createElementNS(ns, 'svg');
      bank.setAttribute('aria-hidden', 'true');
      bank.setAttribute('width', '0');
      bank.setAttribute('height', '0');
      bank.classList.add('wiggle-filter-bank');
      bank.innerHTML = `
        <defs>
          <filter id="doodle-wiggle-filter" x="-16%" y="-20%" width="132%" height="140%"
                  color-interpolation-filters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2"
                          seed="55" stitchTiles="stitch" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="4.9"
                               xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>`;
      document.body.append(bank);
      filter = bank.querySelector('filter');
    }

    element.classList.add('is-wiggling');
    wiggling.add(element);

    if (!wiggleTimer) {
      // A new noise seed reads as a fresh hand-drawn frame. Keep frequency
      // fixed and vary scale only slightly rather than smoothly morphing it.
      wiggleTimer = window.setInterval(() => {
        const turbulence = document.querySelector('#doodle-wiggle-filter feTurbulence');
        const displacement = document.querySelector('#doodle-wiggle-filter feDisplacementMap');
        if (!turbulence || !displacement) return;
        turbulence.setAttribute('seed', String(Math.floor(Math.random() * 1000)));
        displacement.setAttribute('scale', (4.75 + Math.random() * 0.5).toFixed(3));
      }, 110);
    }

    return () => {
      element.classList.remove('is-wiggling');
      wiggling.delete(element);
      if (!wiggling.size && wiggleTimer) {
        window.clearInterval(wiggleTimer);
        wiggleTimer = undefined;
      }
    };
  }

  window.wiggle = wiggle;

  // Optional pressed-state behavior for doodles with an emphasized layer.
  document.querySelectorAll('[data-wiggle-toggle]').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const pressed = toggle.getAttribute('aria-pressed') === 'true';
      toggle.setAttribute('aria-pressed', String(!pressed));
    });
  });

  if (params.get('wiggle') === '0' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // A data-wiggle hook may sit directly on an SVG or on a component that owns
  // one or more SVGs, such as the thumbnail icon strip.
  document.querySelectorAll('[data-wiggle]').forEach((component) => {
    const targets = component.matches('svg') ? [component] : component.querySelectorAll('svg');
    targets.forEach(wiggle);
  });
})();
