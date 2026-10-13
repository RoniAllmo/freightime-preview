/*
 * Hero Composer: the description field next to "בואו נבדוק".
 *
 * Product-owner decision (2026-10-13): the text typed here is handed to
 * the assessment's existing product-name field (#irProductName) when the
 * primary CTA is clicked. Nothing else changes: the CTA still opens the
 * assessment through its own existing click handler in
 * import-readiness-controller.js, and the matching engine reads the field
 * exactly as if the user had typed it there. The text never leaves the
 * page and is not stored.
 */
(function () {
  'use strict';

  const input = document.getElementById('heroComposerInput');
  const startButton = document.getElementById('readinessStartButton');
  const productName = document.getElementById('irProductName');
  if (!input || !startButton) return;

  startButton.addEventListener('click', () => {
    const text = input.value.trim();
    if (!text || !productName) return;
    productName.value = text;
    productName.dispatchEvent(new Event('input', { bubbles: true }));
  });

  // Enter in the field acts like the CTA (Shift+Enter is ignored too: the
  // field is a one-line description that only wraps visually).
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.isComposing) return;
    event.preventDefault();
    startButton.click();
  });
})();
