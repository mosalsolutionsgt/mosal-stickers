/* ==========================================================================
   MOSAL STICKERS - REALISTIC SURFACE MOCKUP CONTROLLER
   Positions and transforms the sticker on real surfaces (MacBook, Bottle, etc.)
   ========================================================================== */

import { store } from './state.js';

export function initMockupSwitcher() {
  const surfaceButtons = document.querySelectorAll('.surface-btn');
  const stageCanvas = document.getElementById('stageCanvas');
  const overlayContainers = document.querySelectorAll('.surface-overlay-container');

  surfaceButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const surface = btn.dataset.surface;
      store.updateSticker({ surface });
    });
  });

  // Subscribe to state changes to update the visual mockup stage
  store.subscribe(state => {
    const currentSurface = state.sticker.surface;

    // Update active button state
    surfaceButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.surface === currentSurface);
    });

    // Update surface overlay visibility
    overlayContainers.forEach(container => {
      const isMatch = container.dataset.surface === currentSurface;
      container.classList.toggle('active', isMatch);
    });

    // If transparent vinyl is selected and surface is studio, enable grid
    if (state.sticker.material === 'transparent' && currentSurface === 'studio') {
      stageCanvas?.classList.add('mode-transparent');
    } else {
      stageCanvas?.classList.remove('mode-transparent');
    }
  });
}
