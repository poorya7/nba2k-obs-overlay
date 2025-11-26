// ==================== STATE MANAGER ====================
// Centralizes all state tracking for other games overlay

class StateManager {
    constructor() {
        // Overlay visibility
        this.overlayVisible = false;
        
        // Quarter tracking
        this.lastQuarterStartTime = null;
        this.hasShownForCurrentQuarter = false;
        
        // Simulation mode tracking
        this.lastSimulationEnabled = null;
        
        // Selected game tracking
        this.lastSelectedGameId = null;
        
        // Timing configuration
        // Production: 2 minutes after quarter starts
        this.SHOW_DELAY_MS = 120000; // 2 minutes
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
    
    // Simulation mode tracking
    hasSimulationStateChanged(currentSimEnabled) {
        if (this.lastSimulationEnabled === null) {
            this.lastSimulationEnabled = currentSimEnabled;
            return false;
        }
        return this.lastSimulationEnabled !== currentSimEnabled;
    }
    
    updateSimulationState(simEnabled) {
        this.lastSimulationEnabled = simEnabled;
    }
    
    // Selected game tracking
    hasSelectedGameChanged(currentGameId) {
        if (this.lastSelectedGameId === null) {
            this.lastSelectedGameId = currentGameId;
            return false;
        }
        return this.lastSelectedGameId !== currentGameId;
    }
    
    updateSelectedGame(gameId) {
        this.lastSelectedGameId = gameId;
    }
}

