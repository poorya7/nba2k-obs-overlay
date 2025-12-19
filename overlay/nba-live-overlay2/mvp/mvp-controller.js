/**
 * MvpController - Manages automatic MVP display based on game states
 * Handles timing and logic for when to show/hide MVP section
 * 
 * Usage:
 *   const mvpController = new MvpController(mvpView);
 *   mvpController.onGameStateChange('halftime', playerData);
 */

// MVP Display timing constants (matching real NBA broadcasts)
const MVP_DISPLAY_TIMING = {
    // How long MVP stays visible
    DISPLAY_DURATION: 17000, // 17 seconds
    
    // Delays before showing MVP (feels more natural)
    DELAY_BEFORE_SHOW: {
        TIMEOUT: 20000,        // 20 seconds into timeout
        HALFTIME: 10000,       // 10 seconds into halftime (first show)
        END_QUARTER: 3000,     // 3 seconds after quarter ends
        END_GAME: 5000         // 5 seconds after game ends
    },
    
    // For halftime, show multiple times
    HALFTIME_REPEAT_INTERVAL: 60000, // Show again every 1 minute during halftime
    HALFTIME_MAX_SHOWS: 3,             // Show max 3 times during halftime
    
    // For final, show multiple times
    FINAL_REPEAT_INTERVAL: 60000,    // Show again every 1 minute after game ends
    FINAL_MAX_SHOWS: 3                 // Show max 3 times after final
};

class MvpController {
    constructor(mvpView, stateManager = null) {
        // Validate dependencies
        if (!mvpView) {
            throw new Error('MvpController: mvpView is required');
        }
        
        this.mvpView = mvpView;
        this.stateManager = stateManager; // Optional: for checking current mode
        this.currentGameState = null;
        this.previousGameState = null;
        this.showTimer = null;
        this.hideTimer = null;
        this.repeatTimers = [];
        this.halftimeShowCount = 0;
        this.finalShowCount = 0;
    }

    /**
     * Call this when game state changes
     * @param {string} newState - 'pregame', 'live', 'halftime', 'final', 'overtime'
     * @param {Object} mvpPlayerData - {name, photoUrl, pts, reb, ast}
     */
    onGameStateChange(newState, mvpPlayerData = null) {
        this.previousGameState = this.currentGameState;
        this.currentGameState = newState;

        // Clear any pending timers
        this.clearAllTimers();

        // Determine if we should show MVP
        if (this.shouldShowMvp(newState)) {
            this.scheduleMvpDisplay(newState, mvpPlayerData);
        } else if (newState === 'live' || newState === 'pregame') {
            // Hide MVP if returning to live play or pregame
            if (this.mvpView.getVisibility()) {
                this.mvpView.hide();
            }
        }
    }

    /**
     * Determine if MVP should be shown for this state
     * @param {string} state - Game state
     * @returns {boolean}
     */
    shouldShowMvp(state) {
        // Show MVP during:
        // - Halftime
        // - End of quarters (transitioning from live to a break)
        // - End of game (final)
        // - Timeouts would be detected as mini-breaks, but NBA API might not expose them
        
        switch (state) {
            case 'halftime':
                return true;
            case 'final':
                return true;
            // Note: Timeouts and end-of-quarters are tricky with NBA API
            // They might show as 'live' state. You may need additional logic
            // based on time remaining or status text
            default:
                return false;
        }
    }

    /**
     * Schedule MVP display with appropriate timing
     * @param {string} state - Game state
     * @param {Object} mvpPlayerData - Player data
     */
    scheduleMvpDisplay(state, mvpPlayerData) {
        if (!mvpPlayerData) {
            return;
        }

        const timing = MVP_DISPLAY_TIMING;

        switch (state) {
            case 'halftime':
                this.scheduleHalftimeMvp(mvpPlayerData);
                break;

            case 'final':
                this.scheduleEndGameMvp(mvpPlayerData);
                break;

            default:
                // Generic display (fallback)
                this.scheduleGenericMvp(mvpPlayerData, timing.DELAY_BEFORE_SHOW.TIMEOUT);
                break;
        }
    }

    /**
     * Schedule MVP for halftime (show multiple times)
     * @param {Object} mvpPlayerData
     */
    scheduleHalftimeMvp(mvpPlayerData) {
        const timing = MVP_DISPLAY_TIMING;
        this.halftimeShowCount = 0;

        // First show after 25 seconds
        this.showTimer = setTimeout(() => {
            this.showMvpWithAutoHide(mvpPlayerData);
            this.halftimeShowCount++;

            // Schedule repeat shows during halftime
            if (this.halftimeShowCount < timing.HALFTIME_MAX_SHOWS) {
                this.scheduleHalftimeRepeats(mvpPlayerData);
            }
        }, timing.DELAY_BEFORE_SHOW.HALFTIME);
    }

    /**
     * Schedule repeat MVP displays during halftime
     * @param {Object} mvpPlayerData
     */
    scheduleHalftimeRepeats(mvpPlayerData) {
        const timing = MVP_DISPLAY_TIMING;
        
        // Schedule next show
        const repeatTimer = setTimeout(() => {
            // Only show if still in halftime
            if (this.currentGameState === 'halftime') {
                this.showMvpWithAutoHide(mvpPlayerData);
                this.halftimeShowCount++;

                // Schedule another if under max
                if (this.halftimeShowCount < timing.HALFTIME_MAX_SHOWS) {
                    this.scheduleHalftimeRepeats(mvpPlayerData);
                }
            }
        }, timing.HALFTIME_REPEAT_INTERVAL);

        this.repeatTimers.push(repeatTimer);
    }

    /**
     * Schedule MVP for end of game (show multiple times)
     * @param {Object} mvpPlayerData
     */
    scheduleEndGameMvp(mvpPlayerData) {
        const timing = MVP_DISPLAY_TIMING;
        this.finalShowCount = 0;
        
        // First show after 5 seconds
        this.showTimer = setTimeout(() => {
            this.showMvpWithAutoHide(mvpPlayerData);
            this.finalShowCount++;
            
            // Schedule repeat shows after final
            if (this.finalShowCount < timing.FINAL_MAX_SHOWS) {
                this.scheduleFinalRepeats(mvpPlayerData);
            }
        }, timing.DELAY_BEFORE_SHOW.END_GAME);
    }
    
    /**
     * Schedule repeat MVP displays after final
     * @param {Object} mvpPlayerData
     */
    scheduleFinalRepeats(mvpPlayerData) {
        const timing = MVP_DISPLAY_TIMING;
        
        // Schedule next show
        const repeatTimer = setTimeout(() => {
            // Only show if still in final state
            if (this.currentGameState === 'final') {
                this.showMvpWithAutoHide(mvpPlayerData);
                this.finalShowCount++;
                
                // Schedule another if under max
                if (this.finalShowCount < timing.FINAL_MAX_SHOWS) {
                    this.scheduleFinalRepeats(mvpPlayerData);
                }
            }
        }, timing.FINAL_REPEAT_INTERVAL);
        
        this.repeatTimers.push(repeatTimer);
    }

    /**
     * Generic MVP display with delay
     * @param {Object} mvpPlayerData
     * @param {number} delay - Delay in ms
     */
    scheduleGenericMvp(mvpPlayerData, delay) {
        this.showTimer = setTimeout(() => {
            this.showMvpWithAutoHide(mvpPlayerData);
        }, delay);
    }

    /**
     * Show MVP and auto-hide after display duration
     * @param {Object} mvpPlayerData
     */
    showMvpWithAutoHide(mvpPlayerData) {
        // Don't show MVP during other games mode
        if (this.stateManager && this.stateManager.getMode() === 'OTHER_GAMES') {
            return; // Block display, don't show
        }
        
        // Show MVP
        this.mvpView.show(mvpPlayerData);

        // Schedule auto-hide
        this.hideTimer = setTimeout(() => {
            this.mvpView.hide();
        }, MVP_DISPLAY_TIMING.DISPLAY_DURATION);
    }

    /**
     * Manually trigger MVP display (for testing or manual control)
     * @param {Object} mvpPlayerData
     */
    manualShow(mvpPlayerData) {
        this.showMvpWithAutoHide(mvpPlayerData);
    }

    /**
     * Manually hide MVP
     */
    manualHide() {
        this.clearAllTimers();
        if (this.mvpView.getVisibility()) {
            this.mvpView.hide();
        }
    }

    /**
     * Clear all pending timers
     */
    clearAllTimers() {
        if (this.showTimer) {
            clearTimeout(this.showTimer);
            this.showTimer = null;
        }
        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
            this.hideTimer = null;
        }
        this.repeatTimers.forEach(timer => clearTimeout(timer));
        this.repeatTimers = [];
        this.halftimeShowCount = 0;
        this.finalShowCount = 0;
    }

    /**
     * Destroy controller (cleanup all resources)
     */
    destroy() {
        this.clearAllTimers();
    }

    /**
     * Get current game state
     * @returns {string}
     */
    getCurrentState() {
        return this.currentGameState;
    }
}

