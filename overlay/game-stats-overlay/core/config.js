// NBA 2K OBS Overlay - Configuration

const CONFIG = {
  // ESPN API endpoints
  ESPN_NBA_SCOREBOARD: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
  
  // Refresh intervals (milliseconds)
  OVERLAY_REFRESH_INTERVAL: 30000, // 30 seconds
  DASHBOARD_REFRESH_INTERVAL: 60000, // 1 minute
  
  // LocalStorage keys
  STORAGE_KEY_SELECTED_GAME: 'nba2k_selected_game_id',
  
  // Display settings
  TIMEZONE: 'America/New_York' // Florida/Eastern time
};

// Export for use in other files
if (typeof window !== 'undefined') {
  window.NBA_CONFIG = CONFIG;
}

