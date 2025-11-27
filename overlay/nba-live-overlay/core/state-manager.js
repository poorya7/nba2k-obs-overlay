/**
 * StateManager - Centralized state management for the overlay
 * Single Responsibility: Track and manage all overlay state
 * 
 * Replaces scattered global variables with a clean state object
 */

class StateManager {
    constructor() {
        // Game tracking state
        this.lastGameData = null;
        this.lastGameState = null;
        this.lastSelectedGameId = null;
        this.overlayHasBeenShown = false;
        
        // Score tracking for animations
        this.lastHomeScore = null;
        this.lastAwayScore = null;
        
        // Countdown state (for pregame)
        this.countdownInterval = null;
        this.countdownSeconds = 0;
        
        // Simulated MVP state
        this.lastSimMVPState = false;
        
        // Mode tracking (CURRENT_GAME or OTHER_GAMES)
        this.currentMode = 'CURRENT_GAME';
        
        // Other games tracking
        this.lastQuarterStartTime = null;
        this.hasShownOtherGamesThisQuarter = false;
        this.OTHER_GAMES_DELAY_MS = 60000; // 60 seconds
    }

    /**
     * Check if game data has changed
     * @param {string} newGameData - Serialized game data key
     * @returns {boolean}
     */
    hasGameDataChanged(newGameData) {
        return this.lastGameData !== newGameData;
    }

    /**
     * Update game data tracking
     * @param {string} gameData - Serialized game data key
     */
    setGameData(gameData) {
        this.lastGameData = gameData;
    }

    /**
     * Check if game state has changed
     * @param {string} newState - Game state name
     * @returns {boolean}
     */
    hasGameStateChanged(newState) {
        return this.lastGameState !== newState;
    }

    /**
     * Update game state tracking
     * @param {string} state - Game state name
     */
    setGameState(state) {
        this.lastGameState = state;
    }

    /**
     * Check if game ID has changed
     * @param {string} newGameId - Game ID
     * @returns {boolean}
     */
    hasGameIdChanged(newGameId) {
        return this.lastSelectedGameId !== newGameId;
    }

    /**
     * Update game ID tracking and reset overlay shown flag if changed
     * @param {string} gameId - Game ID
     */
    setGameId(gameId) {
        if (this.hasGameIdChanged(gameId)) {
            this.overlayHasBeenShown = false;
            this.lastSelectedGameId = gameId;
        }
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
     * Start countdown interval
     * @param {Function} callback - Called every second with decremented seconds
     */
    startCountdown(callback) {
        if (this.countdownInterval) {
            this.stopCountdown();
        }

        this.countdownInterval = setInterval(() => {
            if (this.countdownSeconds > 0) {
                this.countdownSeconds--;
                callback(this.countdownSeconds);
            }
        }, 1000);
    }

    /**
     * Stop countdown interval
     */
    stopCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }

    /**
     * Set countdown seconds
     * @param {number} seconds
     */
    setCountdownSeconds(seconds) {
        this.countdownSeconds = seconds;
    }

    /**
     * Get countdown seconds
     * @returns {number}
     */
    getCountdownSeconds() {
        return this.countdownSeconds;
    }

    /**
     * Check if countdown is active
     * @returns {boolean}
     */
    isCountdownActive() {
        return this.countdownInterval !== null;
    }

    /**
     * Update simulated MVP state
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
     * Check if scores have changed
     * @param {number} homeScore
     * @param {number} awayScore
     * @returns {Object} { homeChanged: boolean, awayChanged: boolean }
     */
    hasScoresChanged(homeScore, awayScore) {
        const homeChanged = this.lastHomeScore !== null && this.lastHomeScore !== homeScore;
        const awayChanged = this.lastAwayScore !== null && this.lastAwayScore !== awayScore;
        return { homeChanged, awayChanged };
    }

    /**
     * Update stored scores
     * @param {number} homeScore
     * @param {number} awayScore
     */
    updateScores(homeScore, awayScore) {
        this.lastHomeScore = homeScore;
        this.lastAwayScore = awayScore;
    }

    /**
     * Reset all state (called when game changes or overlay hides)
     */
    reset() {
        this.lastGameData = null;
        this.stopCountdown();
        this.countdownSeconds = 0;
        this.lastHomeScore = null;
        this.lastAwayScore = null;
    }

    /**
     * Full reset (called when no game selected)
     */
    fullReset() {
        this.reset();
        this.lastGameState = null;
        this.overlayHasBeenShown = false;
        this.lastSelectedGameId = null;
        this.lastSimMVPState = false;
        this.currentMode = 'CURRENT_GAME';
        this.hasShownOtherGamesThisQuarter = false;
    }

    /**
     * Mode management
     */
    setMode(mode) {
        this.currentMode = mode;
    }

    getMode() {
        return this.currentMode;
    }

    /**
     * Other games quarter tracking
     */
    updateQuarterTracking(quarterStartTime) {
        if (quarterStartTime !== this.lastQuarterStartTime) {
            this.lastQuarterStartTime = quarterStartTime;
            this.hasShownOtherGamesThisQuarter = false;
        }
    }

    markOtherGamesShownThisQuarter() {
        this.hasShownOtherGamesThisQuarter = true;
    }

    hasShownOtherGamesThisQuarter() {
        return this.hasShownOtherGamesThisQuarter;
    }

    shouldShowOtherGames(quarterData, timeMultiplier = 1, virtualTimeOffset = 0) {
        if (!quarterData || !quarterData.current || !quarterData.startTime) {
            return false;
        }

        const realTimeSinceQuarterStart = Date.now() - quarterData.startTime;
        const acceleratedTime = realTimeSinceQuarterStart * timeMultiplier + virtualTimeOffset;
        
        // Track quarter changes
        this.updateQuarterTracking(quarterData.startTime);
        
        // Don't show if we've already shown it for this quarter
        if (this.hasShownOtherGamesThisQuarter) {
            return false;
        }
        
        // Show if enough time has passed (60 seconds accelerated)
        return acceleratedTime >= this.OTHER_GAMES_DELAY_MS;
    }
}

