/**
 * MvpIntegration - Handles fetching MVP data and coordinating with MvpController
 * Single Responsibility: Bridge between game state changes and MVP display
 * 
 * Manages caching and data fetching for MVP functionality
 */

class MvpIntegration {
    constructor() {
        // Cache MVP data (so we don't spam API during timeouts)
        this.cachedMVPData = null;
        this.cachedMVPGameId = null;
    }

    /**
     * Clear MVP cache (called when game changes)
     */
    clearMVPCache() {
        this.cachedMVPData = null;
        this.cachedMVPGameId = null;
    }

    /**
     * Get MVP player data for current game
     * Fetches from ESPN boxscore and caches result
     * @param {string} gameId - ESPN game ID
     * @returns {Promise<Object|null>} MVP player data
     */
    async getMvpPlayerData(gameId) {
        // Return cached data if same game
        if (this.cachedMVPData && this.cachedMVPGameId === gameId) {
            return this.cachedMVPData;
        }
        
        // Clear cache if different game
        if (this.cachedMVPGameId && this.cachedMVPGameId !== gameId) {
            this.clearMVPCache();
        }
        
        try {
            // Fetch MVP from ESPN boxscore
            const mvpData = await window.NBAApi.getMVPForGame(gameId);
            
            if (mvpData) {
                // Cache it
                this.cachedMVPData = mvpData;
                this.cachedMVPGameId = gameId;
                return mvpData;
            }
            
            return null;
        } catch (error) {
            console.error('Error getting MVP data:', error);
            return null;
        }
    }

    /**
     * Notify MVP controller of game state change (with error handling)
     * @param {MvpController} mvpController - MVP controller instance
     * @param {MvpView} mvpView - MVP view instance
     * @param {string} stateName - Game state
     * @param {string} gameId - ESPN game ID
     */
    async notifyMVPStateChange(mvpController, mvpView, stateName, gameId) {
        try {
            // Hide MVP immediately if it's showing old data from different game
            if (mvpView.getVisibility() && this.cachedMVPGameId && this.cachedMVPGameId !== gameId) {
                mvpView.hide();
            }
            
            const mvpData = await this.getMvpPlayerData(gameId);
            if (mvpData) {
                mvpController.onGameStateChange(stateName, mvpData);
            }
        } catch (error) {
            console.error('Failed to update MVP state:', error);
        }
    }
}

