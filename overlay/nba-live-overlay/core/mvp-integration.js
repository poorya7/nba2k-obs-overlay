/**
 * MVP Integration Module
 * Handles fetching MVP data and coordinating with MvpController
 * 
 * This module bridges the gap between game state changes and MVP display,
 * managing caching and data fetching.
 */

// Cache MVP data (so we don't spam API during timeouts)
let cachedMVPData = null;
let cachedMVPGameId = null;

/**
 * Clear MVP cache (called when game changes)
 */
function clearMVPCache() {
    cachedMVPData = null;
    cachedMVPGameId = null;
}

/**
 * Get MVP player data for current game
 * Fetches from ESPN boxscore and caches result
 * @param {string} gameId - ESPN game ID
 * @returns {Promise<Object|null>} MVP player data
 */
async function getMvpPlayerData(gameId) {
    // Return cached data if same game
    if (cachedMVPData && cachedMVPGameId === gameId) {
        return cachedMVPData;
    }
    
    // Clear cache if different game
    if (cachedMVPGameId && cachedMVPGameId !== gameId) {
        clearMVPCache();
    }
    
    try {
        // Fetch MVP from ESPN boxscore
        const mvpData = await window.NBAApi.getMVPForGame(gameId);
        
        if (mvpData) {
            // Cache it
            cachedMVPData = mvpData;
            cachedMVPGameId = gameId;
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
async function notifyMVPStateChange(mvpController, mvpView, stateName, gameId) {
    try {
        // Hide MVP immediately if it's showing old data from different game
        if (mvpView.getVisibility() && cachedMVPGameId && cachedMVPGameId !== gameId) {
            mvpView.hide();
        }
        
        const mvpData = await getMvpPlayerData(gameId);
        if (mvpData) {
            mvpController.onGameStateChange(stateName, mvpData);
        }
    } catch (error) {
        console.error('Failed to update MVP state:', error);
    }
}

// Export functions
if (typeof window !== 'undefined') {
    window.MVPIntegration = {
        clearMVPCache,
        getMvpPlayerData,
        notifyMVPStateChange
    };
}

