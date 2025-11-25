/**
 * Shared Game Utility Functions
 * Used by multiple overlays to avoid code duplication
 */

/**
 * Format countdown time (HH:MM:SS or MM:SS)
 * @param {number} totalSeconds - Total seconds remaining
 * @returns {string} Formatted time string
 */
function formatCountdown(totalSeconds) {
    if (totalSeconds === undefined || isNaN(totalSeconds)) {
        return '00:00:00';
    }
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

/**
 * Detect game state from API data
 * @param {Object} game - Game object from API
 * @returns {string} State: 'pregame', 'live', 'halftime', or 'final'
 */
function detectGameState(game) {
    if (game.isFinal) {
        return 'final';
    } else if (game.isLive) {
        // Check if halftime
        if (game.statusText && game.statusText.toLowerCase().includes('halftime')) {
            return 'halftime';
        }
        return 'live';
    } else {
        // Scheduled game
        return 'pregame';
    }
}

/**
 * Calculate seconds until game starts
 * @param {string} gameDate - ISO date string from API
 * @returns {number} Seconds until game starts (0 if already started)
 */
function calculateSecondsUntilStart(gameDate) {
    const gameTime = new Date(gameDate).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((gameTime - now) / 1000));
}

/**
 * Format quarter and time for live games
 * @param {string} statusText - Status text from API (e.g., "Q3 8:32")
 * @returns {Object} { quarter: 'Q3', time: '8:32', formatted: 'Q3 · 8:32' }
 */
function formatLiveGameStatus(statusText) {
    const parts = statusText.split(' ');
    const quarter = parts[0] || 'Q1';
    const time = parts[1] || '12:00';
    
    return {
        quarter: quarter,
        time: time,
        formatted: `${quarter} · ${time}`
    };
}

