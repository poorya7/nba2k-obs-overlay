/**
 * ModeManager - Manages display mode state
 * Single Responsibility: Track current mode and other games display
 * 
 * Extracted from StateManager to follow Single Responsibility Principle
 */

class ModeManager {
    constructor() {
        // Mode tracking (CURRENT_GAME or OTHER_GAMES)
        this.currentMode = 'CURRENT_GAME';
        
        // Other games tracking
        this.lastQuarterStartTime = null;
        this.hasShownOtherGamesThisQuarter = false;
        this.OTHER_GAMES_DELAY_MS = 60000; // 60 seconds
    }

    /**
     * Set current mode
     * @param {string} mode - 'CURRENT_GAME' or 'OTHER_GAMES'
     */
    setMode(mode) {
        this.currentMode = mode;
    }

    /**
     * Get current mode
     * @returns {string}
     */
    getMode() {
        return this.currentMode;
    }

    /**
     * Update quarter tracking
     * @param {number} quarterStartTime
     */
    updateQuarterTracking(quarterStartTime) {
        if (quarterStartTime !== this.lastQuarterStartTime) {
            this.lastQuarterStartTime = quarterStartTime;
            this.hasShownOtherGamesThisQuarter = false;
        }
    }

    /**
     * Mark other games as shown this quarter
     */
    markOtherGamesShownThisQuarter() {
        this.hasShownOtherGamesThisQuarter = true;
    }

    /**
     * Check if other games have been shown this quarter
     * @returns {boolean}
     */
    hasShownOtherGames() {
        return this.hasShownOtherGamesThisQuarter;
    }

    /**
     * Determine if other games should be shown
     * @param {Object} quarterData - Quarter tracking data
     * @param {number} timeMultiplier - Time acceleration multiplier
     * @param {number} virtualTimeOffset - Virtual time offset
     * @returns {boolean}
     */
    shouldShowOtherGames(quarterData, timeMultiplier = 1, virtualTimeOffset = 0) {
        if (!quarterData || !quarterData.current || !quarterData.startTime) {
            return false;
        }

        const realTimeSinceQuarterStart = Date.now() - quarterData.startTime;
        const acceleratedTime = realTimeSinceQuarterStart * timeMultiplier + virtualTimeOffset;
        
        console.log('⏱️ [ModeManager] shouldShowOtherGames check:');
        console.log('   Real time since quarter start:', realTimeSinceQuarterStart, 'ms');
        console.log('   Time multiplier:', timeMultiplier, 'x');
        console.log('   Virtual time offset:', virtualTimeOffset, 'ms');
        console.log('   Accelerated time:', acceleratedTime, 'ms');
        console.log('   Target delay:', this.OTHER_GAMES_DELAY_MS, 'ms');
        console.log('   Already shown this quarter?', this.hasShownOtherGamesThisQuarter);
        console.log('   Should show?', acceleratedTime >= this.OTHER_GAMES_DELAY_MS && !this.hasShownOtherGamesThisQuarter);
        
        // Track quarter changes
        this.updateQuarterTracking(quarterData.startTime);
        
        // Don't show if we've already shown it for this quarter
        if (this.hasShownOtherGamesThisQuarter) {
            return false;
        }
        
        // Show if enough time has passed (60 seconds accelerated)
        return acceleratedTime >= this.OTHER_GAMES_DELAY_MS;
    }

    /**
     * Reset mode state
     */
    reset() {
        this.currentMode = 'CURRENT_GAME';
        this.hasShownOtherGamesThisQuarter = false;
    }
}

