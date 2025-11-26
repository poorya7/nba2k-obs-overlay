// ==================== STATE MANAGER ====================
// Centralizes all state tracking for other games overlay

class StateManager {
    constructor() {
        // Overlay visibility
        this.overlayVisible = false;
        
        // Quarter tracking
        this.lastQuarterStartTime = null;
        this.hasShownForCurrentQuarter = false;
        
        // Timing configuration
        // Test delay: 5 seconds (change to 120000 for production = 2 minutes)
        this.SHOW_DELAY_MS = 5000;
    }
    
    // Overlay visibility
    setOverlayVisible(visible) {
        this.overlayVisible = visible;
    }
    
    isOverlayVisible() {
        return this.overlayVisible;
    }
    
    // Quarter tracking
    updateQuarterTracking(quarterStartTime) {
        if (quarterStartTime !== this.lastQuarterStartTime) {
            this.lastQuarterStartTime = quarterStartTime;
            this.hasShownForCurrentQuarter = false;
        }
    }
    
    markAsShownForCurrentQuarter() {
        this.hasShownForCurrentQuarter = true;
    }
    
    hasShownThisQuarter() {
        return this.hasShownForCurrentQuarter;
    }
    
    resetQuarterTracking() {
        this.hasShownForCurrentQuarter = false;
    }
    
    getShowDelayMs() {
        return this.SHOW_DELAY_MS;
    }
}

