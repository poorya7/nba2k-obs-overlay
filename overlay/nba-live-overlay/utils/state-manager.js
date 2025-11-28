/**
 * StateManager - Unified state management facade
 * Delegates to specialized managers following Single Responsibility Principle
 * 
 * This provides a single interface to all state managers for backwards compatibility
 * while internally using focused, specialized manager classes
 */

class StateManager {
    constructor() {
        // Initialize specialized managers
        this.gameState = new GameStateManager();
        this.timing = new TimingManager();
        this.mode = new ModeManager();
        this.overlay = new OverlayStateManager();
    }

    // ==================== GAME STATE DELEGATION ====================
    
    hasGameDataChanged(newGameData) {
        return this.gameState.hasGameDataChanged(newGameData);
    }

    setGameData(gameData) {
        this.gameState.setGameData(gameData);
    }

    hasGameStateChanged(newState) {
        return this.gameState.hasGameStateChanged(newState);
    }

    setGameState(state) {
        this.gameState.setGameState(state);
    }

    getGameState() {
        return this.gameState.getGameState();
    }

    hasGameIdChanged(newGameId) {
        return this.gameState.hasGameIdChanged(newGameId);
    }

    setGameId(gameId) {
        // Reset overlay shown flag when game changes
        if (this.gameState.hasGameIdChanged(gameId)) {
            this.overlay.resetOverlayShown();
            this.gameState.setGameId(gameId);
        }
    }

    getGameId() {
        return this.gameState.getGameId();
    }

    hasScoresChanged(homeScore, awayScore) {
        return this.gameState.hasScoresChanged(homeScore, awayScore);
    }

    updateScores(homeScore, awayScore) {
        this.gameState.updateScores(homeScore, awayScore);
    }

    // For backwards compatibility - expose lastGameData
    get lastGameData() {
        return this.gameState.lastGameData;
    }

    // ==================== TIMING DELEGATION ====================
    
    startCountdown(callback) {
        this.timing.startCountdown(callback);
    }

    stopCountdown() {
        this.timing.stopCountdown();
    }

    setCountdownSeconds(seconds) {
        this.timing.setCountdownSeconds(seconds);
    }

    getCountdownSeconds() {
        return this.timing.getCountdownSeconds();
    }

    isCountdownActive() {
        return this.timing.isCountdownActive();
    }

    getTimeMultiplier() {
        return this.timing.getTimeMultiplier();
    }

    setTimeMultiplier(multiplier) {
        this.timing.setTimeMultiplier(multiplier);
    }

    getLastQuarter() {
        return this.timing.getLastQuarter();
    }

    setLastQuarter(quarter) {
        this.timing.setLastQuarter(quarter);
    }

    getVirtualTimeOffset() {
        return this.timing.getVirtualTimeOffset();
    }

    setVirtualTimeOffset(offset) {
        this.timing.setVirtualTimeOffset(offset);
    }

    resetVirtualTimeOffset() {
        this.timing.resetVirtualTimeOffset();
    }

    getQuarterStartTime() {
        return this.timing.getQuarterStartTime();
    }

    setQuarterStartTime(time) {
        this.timing.setQuarterStartTime(time);
    }

    // ==================== MODE DELEGATION ====================
    
    setMode(mode) {
        this.mode.setMode(mode);
    }

    getMode() {
        return this.mode.getMode();
    }

    updateQuarterTracking(quarterStartTime) {
        this.mode.updateQuarterTracking(quarterStartTime);
    }

    markOtherGamesShownThisQuarter() {
        this.mode.markOtherGamesShownThisQuarter();
    }

    hasShownOtherGamesThisQuarter() {
        return this.mode.hasShownOtherGames();
    }

    shouldShowOtherGames(quarterData, timeMultiplier, virtualTimeOffset) {
        return this.mode.shouldShowOtherGames(quarterData, timeMultiplier, virtualTimeOffset);
    }

    // ==================== OVERLAY STATE DELEGATION ====================
    
    resetOverlayShown() {
        this.overlay.resetOverlayShown();
    }

    markOverlayAsShown() {
        this.overlay.markOverlayAsShown();
    }

    isOverlayShown() {
        return this.overlay.isOverlayShown();
    }

    setSimMVPState(state) {
        this.overlay.setSimMVPState(state);
    }

    getSimMVPState() {
        return this.overlay.getSimMVPState();
    }

    // ==================== RESET METHODS ====================
    
    reset() {
        this.gameState.reset();
        this.timing.reset();
    }

    fullReset() {
        this.gameState.fullReset();
        this.timing.reset();
        this.mode.reset();
        this.overlay.reset();
    }
}
