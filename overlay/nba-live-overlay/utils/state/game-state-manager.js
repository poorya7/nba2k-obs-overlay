/**
 * GameStateManager - Manages game-specific state
 * Single Responsibility: Track game ID, game data, and scores
 * 
 * Extracted from StateManager to follow Single Responsibility Principle
 */

class GameStateManager {
    constructor() {
        // Game tracking state
        this.lastGameData = null;
        this.lastGameState = null;
        this.lastSelectedGameId = null;
        
        // Score tracking for animations
        this.lastHomeScore = null;
        this.lastAwayScore = null;
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
     * Update game ID tracking
     * @param {string} gameId - Game ID
     */
    setGameId(gameId) {
        this.lastSelectedGameId = gameId;
    }

    /**
     * Get current game ID
     * @returns {string}
     */
    getGameId() {
        return this.lastSelectedGameId;
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
     * Reset all state
     */
    reset() {
        this.lastGameData = null;
        this.lastHomeScore = null;
        this.lastAwayScore = null;
    }

    /**
     * Full reset (called when no game selected)
     */
    fullReset() {
        this.reset();
        this.lastGameState = null;
        this.lastSelectedGameId = null;
    }
}

