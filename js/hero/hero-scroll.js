/*
 * Mobile Hero recede fallback (product-owner decision, 2026-10-14).
 *
 * On narrow screens the globe stage stays sticky while the action panel
 * scrolls up over it, and the stage fades to a 25% watermark. Browsers
 * with CSS scroll timelines do that in CSS alone (index.html, the
 * "HERO, MOBILE" block). This script only runs in browsers without
 * them: it sets --hero-recede (0 to 1) on the stage as the panel rises,
 * and the CSS turns that into opacity. It reads layout only -- no
 * network, no storage, no form input.
 */
(function () {
  'use strict';

  if (window.CSS && CSS.supports('animation-timeline: view()')) return;
  if (!window.matchMedia) return;

  const query = window.matchMedia('(max-width:980px) and (min-height:520px)');
  const stage = document.querySelector('.hero-stage');
  const panel = document.querySelector('.hero-copy');
  if (!stage || !panel) return;

  let frame = 0;

  function update() {
    frame = 0;
    if (!query.matches) {
      stage.style.removeProperty('--hero-recede');
      return;
    }
    const viewport = window.innerHeight;
    const top = panel.getBoundingClientRect().top;
    // 0 while the panel is below the fold, 1 once it has fully entered
    // (or risen a full viewport, if it is taller than the screen) --
    // the same range as the CSS "entry 0% entry 100%".
    const distance = Math.min(panel.offsetHeight, viewport) || 1;
    const progress = Math.min(1, Math.max(0, (viewport - top) / distance));
    stage.style.setProperty('--hero-recede', progress.toFixed(3));
  }

  function schedule() {
    if (!frame) frame = window.requestAnimationFrame(update);
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  if (query.addEventListener) query.addEventListener('change', schedule);
  schedule();
})();
