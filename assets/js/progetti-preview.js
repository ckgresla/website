(() => {
  const params = new URLSearchParams(window.location.search);
  const layouts = new Set(['shelf', 'grid', 'ledger', 'stagger']);
  const layout = params.get('layout') || 'shelf';

  document.documentElement.dataset.projectLayout = layouts.has(layout) ? layout : 'shelf';

  // Runtime-only SVG movement: the source icons stay untouched. Any element
  // can opt in by calling wiggle(element); the shared filter is created once.
  function wiggle(element) {
    if (!element) return () => {};

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
          <filter id="doodle-wiggle-filter" x="-12%" y="-18%" width="124%" height="136%">
            <feTurbulence type="fractalNoise" baseFrequency="0.010 0.014" numOctaves="2" seed="7" result="noise">
              <animate attributeName="baseFrequency"
                values="0.010 0.014;0.016 0.010;0.012 0.018;0.010 0.014"
                dur="2.8s" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.4"
              xChannelSelector="R" yChannelSelector="B">
              <animate attributeName="scale" values="1.8;3.8;2.4;3.4;1.8"
                dur="2.2s" repeatCount="indefinite" />
            </feDisplacementMap>
          </filter>
        </defs>`;
      document.body.append(bank);
      filter = bank.querySelector('filter');
    }

    element.classList.add('is-wiggling');
    return () => element.classList.remove('is-wiggling');
  }

  window.wiggle = wiggle;

  if (params.get('wiggle') === '1' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.progetto-viz > svg').forEach(wiggle);
  }
})();
