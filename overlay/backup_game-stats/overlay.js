/**
 * NBA Game Stats Overlay - OBS Browser Source
 * 
 * Simplified entry point using modular GameOverlay class.
 * All logic has been extracted into:
 * - StateRenderer.js - HTML generation
 * - StateTransitions.js - Animation transitions
 * - GameOverlay.js - Main controller
 */

let overlay = null;

/**
 * Initialize overlay on page load
 */
function init() {
  // Create overlay instance
  overlay = new GameOverlay('#overlay');
  
  // Start automatic mode (fetches from API and auto-refreshes every 10s)
  overlay.start();
}

/**
 * Cleanup on page unload
 */
function cleanup() {
  if (overlay) {
    overlay.destroy();
  }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', init);

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);
