// NBA Game Stats Overlay - OBS Browser Source

let currentGameId = null;
let refreshInterval = null;

/**
 * Initialize overlay
 */
async function init() {
  console.log('🏀 NBA Overlay initialized');
  
  // Start refresh loop
  await updateOverlay();
  
  // Auto-refresh every 10 seconds (faster updates)
  refreshInterval = setInterval(updateOverlay, 10000);
}

/**
 * Update overlay with latest game data
 */
async function updateOverlay() {
  try {
    // Fetch selected game ID from server
    const response = await fetch('/api/selected-game');
    if (!response.ok) {
      throw new Error('Failed to fetch selection');
    }
    
    const data = await response.json();
    const selectedGameId = data.gameId;
    
    if (!selectedGameId) {
      showNoGameSelected();
      return;
    }
    
    // Fetch game data
    console.log('📡 Fetching game data:', selectedGameId);
    const game = await window.NBAApi.getGameById(selectedGameId);
    
    if (!game) {
      showError('Selected game not found');
      return;
    }
    
    // Display game
    displayGame(game);
    
  } catch (error) {
    console.error('❌ Error updating overlay:', error);
    showError(error.message);
  }
}

/**
 * Display game stats
 */
function displayGame(game) {
  const container = document.getElementById('overlay');
  
  // Determine status display
  let statusClass, statusText;
  
  if (game.isLive) {
    statusClass = 'status-live';
    statusText = `🔴 ${game.statusText}`;
  } else if (game.isFinal) {
    statusClass = 'status-final';
    statusText = '✅ FINAL';
  } else {
    statusClass = 'status-scheduled';
    statusText = window.NBAApi.formatGameTime(game.date);
  }
  
  // Show scores only for live or final games
  const showScores = game.isLive || game.isFinal;
  
  // Split team names for 2-line display
  const formatTeamName = (name) => {
    const words = name.split(' ');
    if (words.length === 2) return `${words[0]}<br>${words[1]}`;
    if (words.length === 3) return `${words[0]} ${words[1]}<br>${words[2]}`;
    return name.replace(' ', '<br>'); // fallback
  };
  
  // Build HTML
  container.innerHTML = `
    <div class="game-card">
      <div class="teams-container">
        <div class="team">
          <img class="team-logo" src="${game.awayTeam.logo}" alt="${game.awayTeam.name}">
          <div class="team-name">${formatTeamName(game.awayTeam.name)}</div>
          <div class="team-record">${game.awayTeam.record}</div>
          ${showScores ? `<div class="team-score">${game.awayTeam.score}</div>` : ''}
        </div>
        
        <div class="vs-divider">${showScores ? '-' : 'vs'}</div>
        
        <div class="team">
          <img class="team-logo" src="${game.homeTeam.logo}" alt="${game.homeTeam.name}">
          <div class="team-name">${formatTeamName(game.homeTeam.name)}</div>
          <div class="team-record">${game.homeTeam.record}</div>
          ${showScores ? `<div class="team-score">${game.homeTeam.score}</div>` : ''}
        </div>
      </div>
      
      <div class="game-status ${statusClass}">${statusText}</div>
    </div>
  `;
  
  console.log('✅ Overlay updated:', game.shortName);
}

/**
 * Show "No game selected" state
 */
function showNoGameSelected() {
  const container = document.getElementById('overlay');
  
  container.innerHTML = `
    <div class="no-game">
      <div class="no-game-icon">🏀</div>
      <div class="no-game-text">No Game Selected</div>
      <div class="no-game-hint">
        Open the control dashboard to select a game
      </div>
    </div>
  `;
  
  console.log('ℹ️ No game selected');
}

/**
 * Show loading state
 */
function showLoading() {
  const container = document.getElementById('overlay');
  
  container.innerHTML = `
    <div class="loading">
      <div class="loading-spinner">⏳</div>
      <div class="loading-text">Loading game data...</div>
    </div>
  `;
}

/**
 * Show error state
 */
function showError(message) {
  const container = document.getElementById('overlay');
  
  container.innerHTML = `
    <div class="error">
      <div class="error-icon">⚠️</div>
      <div class="error-text">
        <strong>Error:</strong><br>
        ${message}
      </div>
    </div>
  `;
  
  console.error('❌ Error displayed:', message);
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', init);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});

