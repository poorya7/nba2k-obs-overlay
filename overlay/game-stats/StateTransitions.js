/**
 * StateTransitions.js
 * 
 * Handles smooth animated transitions between game states.
 * Extracted from transition-test.html (lines 538-938)
 * 
 * Timing constants:
 * - Fade out: 400ms
 * - Box resize: 600ms
 * - Fade in delay: 650ms
 */

class StateTransitions {
  constructor(pillBoxElement) {
    this.pillBox = pillBoxElement;
  }

  /**
   * Helper: Get all DOM elements by IDs
   */
  _getElements(ids) {
    return ids.map(id => document.getElementById(id)).filter(el => el !== null);
  }

  /**
   * Helper: Fade out elements
   */
  _fadeOut(elements) {
    elements.forEach(el => el.classList.add('hidden'));
  }

  /**
   * Helper: Hide elements with display:none
   */
  _hide(elements) {
    elements.forEach(el => el.classList.add('display-none'));
  }

  /**
   * Helper: Show elements (remove display:none)
   */
  _show(elements) {
    elements.forEach(el => el.classList.remove('display-none'));
  }

  /**
   * Helper: Fade in elements
   */
  _fadeIn(elements) {
    elements.forEach(el => el.classList.remove('hidden'));
  }

  /**
   * Helper: Reset elements to visible state
   */
  _reset(elements) {
    elements.forEach(el => el.classList.remove('display-none', 'hidden'));
  }

  /**
   * Transition from pre-game to live
   * Extracted from transition-test.html lines 538-565
   */
  transitionToLive(pregameElementIds, liveElementIds, onComplete) {
    const pregameElements = this._getElements(pregameElementIds);
    const liveElements = this._getElements(liveElementIds);
    
    // Fade out pre-game elements
    this._fadeOut(pregameElements);
    
    // Wait for fade out, then hide with display:none and expand box
    setTimeout(() => {
      this._hide(pregameElements);
      this.pillBox.classList.remove('pregame');
      this.pillBox.classList.add('live');
      
      // Show live content AFTER box fully expands (600ms is the box transition time)
      setTimeout(() => {
        // First remove display:none
        this._show(liveElements);
        // Force reflow
        void this.pillBox.offsetWidth;
        // Then fade in
        this._fadeIn(liveElements);
        
        if (onComplete) onComplete();
      }, 650);
    }, 400);
  }

  /**
   * Transition from live to final
   * Extracted from transition-test.html lines 637-665
   */
  transitionToFinal(liveElementIds, finalElementIds, onComplete) {
    const liveElements = this._getElements(liveElementIds);
    const finalElements = this._getElements(finalElementIds);
    
    // Fade out live elements
    this._fadeOut(liveElements);
    
    // Wait for fade out, then hide with display:none and shrink box
    setTimeout(() => {
      this._hide(liveElements);
      this.pillBox.classList.remove('live');
      this.pillBox.classList.add('final');
      
      // Show final content AFTER box fully shrinks (600ms is the box transition time)
      setTimeout(() => {
        // First remove display:none
        this._show(finalElements);
        // Force reflow
        void this.pillBox.offsetWidth;
        // Then fade in
        this._fadeIn(finalElements);
        
        if (onComplete) onComplete();
      }, 650);
    }, 400);
  }

  /**
   * Transition from live to halftime
   * Extracted from transition-test.html lines 730-758
   */
  transitionToHalftime(liveElementIds, halftimeElementIds, onComplete) {
    const liveElements = this._getElements(liveElementIds);
    const halftimeElements = this._getElements(halftimeElementIds);
    
    // Fade out live elements
    this._fadeOut(liveElements);
    
    // Wait for fade out, then hide with display:none and shrink box
    setTimeout(() => {
      this._hide(liveElements);
      this.pillBox.classList.remove('live');
      this.pillBox.classList.add('final');
      
      // Show halftime content AFTER box fully shrinks
      setTimeout(() => {
        // First remove display:none
        this._show(halftimeElements);
        // Force reflow
        void this.pillBox.offsetWidth;
        // Then fade in
        this._fadeIn(halftimeElements);
        
        if (onComplete) onComplete();
      }, 650);
    }, 400);
  }

  /**
   * Transition from live to overtime
   * Extracted from transition-test.html lines 833-855
   */
  transitionToOT(liveElementIds, otElementIds, onComplete) {
    const liveElements = this._getElements(liveElementIds);
    const otElements = this._getElements(otElementIds);
    
    // Fade out live elements
    this._fadeOut(liveElements);
    
    // Wait for fade out, then switch content (no box size change, stays live width)
    setTimeout(() => {
      this._hide(liveElements);
      
      // Show OT content
      setTimeout(() => {
        this._show(otElements);
        void this.pillBox.offsetWidth;
        this._fadeIn(otElements);
        
        if (onComplete) onComplete();
      }, 100);
    }, 400);
  }

  /**
   * Transition from overtime to final
   * Extracted from transition-test.html lines 858-883
   */
  transitionOTToFinal(otElementIds, finalElementIds, onComplete) {
    const otElements = this._getElements(otElementIds);
    const finalElements = this._getElements(finalElementIds);
    
    // Fade out OT elements
    this._fadeOut(otElements);
    
    // Wait for fade out, then shrink box
    setTimeout(() => {
      this._hide(otElements);
      this.pillBox.classList.remove('live');
      this.pillBox.classList.add('final');
      
      // Show final content after box shrinks
      setTimeout(() => {
        this._show(finalElements);
        void this.pillBox.offsetWidth;
        this._fadeIn(finalElements);
        
        if (onComplete) onComplete();
      }, 650);
    }, 400);
  }

  /**
   * Reverse transition: live back to pregame (for resets)
   */
  transitionToPregame(liveElementIds, pregameElementIds, onComplete) {
    const liveElements = this._getElements(liveElementIds);
    const pregameElements = this._getElements(pregameElementIds);
    
    // Hide live elements
    this._fadeOut(liveElements);
    
    setTimeout(() => {
      this._hide(liveElements);
      
      // Shrink box back
      this.pillBox.classList.remove('live');
      this.pillBox.classList.add('pregame');
      
      // Show pre-game elements
      setTimeout(() => {
        this._reset(pregameElements);
        if (onComplete) onComplete();
      }, 300);
    }, 400);
  }

  /**
   * Trigger score animation (glow pulse)
   * From OVERLAY_FEATURES.md - Animation #7
   */
  animateScoreChange(scoreElementId) {
    const scoreElement = document.getElementById(scoreElementId);
    if (!scoreElement) return;
    
    // Add animation class
    scoreElement.classList.add('anim-glow');
    
    // Remove after animation completes (600ms)
    setTimeout(() => {
      scoreElement.classList.remove('anim-glow');
    }, 600);
  }
}

// Make available globally
window.StateTransitions = StateTransitions;

