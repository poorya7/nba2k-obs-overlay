/**
 * OverlayStateManager - Manages overlay visibility state
 * Single Responsibility: Track overlay visibility and flags
 * 
 * Extracted from StateManager to follow Single Responsibility Principle
 */

class OverlayStateManager {
    constructor() {
        // Overlay visibility state
        this.overlayHasBeenShown = false;
        
        // Simulated MVP state
        this.lastSimMVPState = false;
    }

    /**
     * Reset overlay shown flag
     */
    resetOverlayShown() {
        this.overlayHasBeenShown = false;
    }

    /**
     * Mark overlay as shown
     */
    markOverlayAsShown() {
        this.overlayHasBeenShown = true;
    }

    /**
     * Check if overlay has been shown
     * @returns {boolean}
     */
    isOverlayShown() {
        return this.overlayHasBeenShown;
    }

    /**
     * Set simulated MVP state
     * @param {boolean} state
     */
    setSimMVPState(state) {
        this.lastSimMVPState = state;
    }

    /**
     * Get simulated MVP state
     * @returns {boolean}
     */
    getSimMVPState() {
        return this.lastSimMVPState;
    }

    /**
     * Reset all overlay state
     */
    reset() {
        this.overlayHasBeenShown = false;
        this.lastSimMVPState = false;
    }
}

