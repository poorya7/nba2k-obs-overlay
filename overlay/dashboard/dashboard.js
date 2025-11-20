// Dashboard Controller - Game Selection & Preview

let allGames = [];

// Available styles - ALL from design-test
const STYLES = [
  { id: 'pill-green', name: 'Pill - Green' },
  { id: 'pill-red', name: 'Pill - Red' },
  { id: 'pill-blue', name: 'Pill - Blue' },
  { id: 'pill-purple', name: 'Pill - Purple' },
  { id: 'pill-gold', name: 'Pill - Gold' },
  { id: 'horizontal-green', name: 'Horizontal - Classic Green' },
  { id: 'horizontal-cyan', name: 'Horizontal - Neon Cyan' },
  { id: 'horizontal-red', name: 'Horizontal - Red' },
  { id: 'horizontal-white', name: 'Horizontal - White' },
  { id: 'vertical-green', name: 'Vertical - Green' },
  { id: 'vertical-purple', name: 'Vertical - Purple' },
  { id: 'vertical-blue', name: 'Vertical - Blue' },
  { id: 'vertical-gold', name: 'Vertical - Gold' }
];

let currentStyleIndex = 0;

/**
 * Initialize dashboard on page load
 */
async function init() {
  console.log('🎮 Initializing dashboard...');
  
  // Setup event listeners
  document.getElementById('gameSelect').addEventListener('change', handleGameSelection);
  document.getElementById('refreshBtn').addEventListener('click', refreshGames);
  document.getElementById('nextStyleBtn').addEventListener('click', nextStyle);
  
  // Load saved style
  await loadCurrentStyle();
  
  // Load games
  await loadGames();
  
  // Auto-refresh every minute
  setInterval(refreshGames, window.NBA_CONFIG.DASHBOARD_REFRESH_INTERVAL);
}

/**
 * Load today's games from ESPN API
 */
async function loadGames() {
  const selectEl = document.getElementById('gameSelect');
  const errorEl = document.getElementById('error');
  
  try {
    console.log('📡 Fetching today\'s games...');
    errorEl.style.display = 'none';
    
    // Fetch games
    allGames = await window.NBAApi.getTodaysGames();
    console.log(`✅ Found ${allGames.length} games`);
    
    // Populate dropdown
    populateGameSelect(allGames);
    
    // Restore previous selection from server
    const savedGameId = await loadSavedSelection();
    if (savedGameId) {
      selectEl.value = savedGameId;
      updatePreview(savedGameId);
    }
    
  } catch (error) {
    console.error('❌ Failed to load games:', error);
    errorEl.textContent = `Error loading games: ${error.message}`;
    errorEl.style.display = 'block';
    
    selectEl.innerHTML = '<option value="">Failed to load games</option>';
  }
}

/**
 * Populate game select dropdown
 */
function populateGameSelect(games) {
  const selectEl = document.getElementById('gameSelect');
  
  if (games.length === 0) {
    selectEl.innerHTML = '<option value="">No games today 🏀</option>';
    return;
  }
  
  // Build options
  let options = '<option value="">-- Select a game --</option>';
  
  games.forEach(game => {
    const time = window.NBAApi.formatGameTime(game.date);
    const statusBadge = game.isLive ? '🔴 LIVE' : game.isFinal ? '✅ FINAL' : `⏰ ${time}`;
    options += `<option value="${game.id}">${statusBadge} - ${game.shortName}</option>`;
  });
  
  selectEl.innerHTML = options;
}

/**
 * Handle game selection change
 */
async function handleGameSelection(event) {
  const gameId = event.target.value;
  
  if (!gameId) {
    // No game selected
    clearPreview();
    await saveGameSelection(null);
    console.log('🚫 Game selection cleared');
    return;
  }
  
  // Save selection to server
  await saveGameSelection(gameId);
  console.log('💾 Saved game selection:', gameId);
  
  // Update preview
  updatePreview(gameId);
}

/**
 * Save game selection to server
 */
async function saveGameSelection(gameId) {
  try {
    const response = await fetch('/api/selected-game', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ gameId })
    });
    
    if (!response.ok) {
      throw new Error('Failed to save selection');
    }
    
    console.log('✅ Selection saved to server');
  } catch (error) {
    console.error('❌ Failed to save selection:', error);
  }
}

/**
 * Load saved game selection from server
 */
async function loadSavedSelection() {
  try {
    const response = await fetch('/api/selected-game');
    if (!response.ok) {
      throw new Error('Failed to load selection');
    }
    
    const data = await response.json();
    return data.gameId;
  } catch (error) {
    console.error('❌ Failed to load saved selection:', error);
    return null;
  }
}

/**
 * Update preview card with selected game
 */
function updatePreview(gameId) {
  const game = allGames.find(g => g.id === gameId);
  
  if (!game) {
    clearPreview();
    return;
  }
  
  const loadingEl = document.getElementById('loading');
  const previewEl = document.getElementById('preview');
  
  loadingEl.style.display = 'none';
  previewEl.classList.add('show');
  
  // Build preview HTML
  const time = window.NBAApi.formatGameTime(game.date);
  const statusClass = game.isLive ? 'status-live' : game.isFinal ? 'status-final' : 'status-scheduled';
  const statusText = game.isLive ? `🔴 ${game.statusText}` : game.isFinal ? '✅ Final' : `⏰ ${time}`;
  
  const showScores = game.isLive || game.isFinal;
  
  previewEl.innerHTML = `
    <div class="preview-header">
      <div class="preview-time">${game.name}</div>
      <div class="preview-status ${statusClass}">${statusText}</div>
    </div>
    <div class="preview-teams">
      <div class="preview-team">
        <img src="${game.awayTeam.logo}" alt="${game.awayTeam.name}">
        <div class="preview-team-name">${game.awayTeam.name}</div>
        <div class="preview-team-record">${game.awayTeam.record}</div>
        ${showScores ? `<div class="preview-team-score">${game.awayTeam.score}</div>` : ''}
      </div>
      <div class="preview-vs">${showScores ? '-' : 'vs'}</div>
      <div class="preview-team">
        <img src="${game.homeTeam.logo}" alt="${game.homeTeam.name}">
        <div class="preview-team-name">${game.homeTeam.name}</div>
        <div class="preview-team-record">${game.homeTeam.record}</div>
        ${showScores ? `<div class="preview-team-score">${game.homeTeam.score}</div>` : ''}
      </div>
    </div>
  `;
}

/**
 * Clear preview card
 */
function clearPreview() {
  const loadingEl = document.getElementById('loading');
  const previewEl = document.getElementById('preview');
  
  loadingEl.style.display = 'block';
  previewEl.classList.remove('show');
  previewEl.innerHTML = '';
}

/**
 * Refresh games list
 */
async function refreshGames() {
  console.log('🔄 Refreshing games...');
  await loadGames();
}

/**
 * Load current style from server
 */
async function loadCurrentStyle() {
  try {
    const response = await fetch('/api/selected-style');
    if (response.ok) {
      const data = await response.json();
      const styleIndex = STYLES.findIndex(s => s.id === data.style);
      if (styleIndex !== -1) {
        currentStyleIndex = styleIndex;
      }
    }
  } catch (error) {
    console.error('❌ Failed to load style:', error);
  }
  updateStyleDisplay();
}

/**
 * Cycle to next style
 */
async function nextStyle() {
  currentStyleIndex = (currentStyleIndex + 1) % STYLES.length;
  const selectedStyle = STYLES[currentStyleIndex];
  
  console.log('🎨 Button clicked! Cycling to:', selectedStyle.name, '(', selectedStyle.id, ')');
  
  // Save to server
  try {
    const response = await fetch('/api/selected-style', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ style: selectedStyle.id })
    });
    
    if (response.ok) {
      console.log('✅ Style saved to server:', selectedStyle.id);
    } else {
      console.error('❌ Server returned error:', response.status);
    }
  } catch (error) {
    console.error('❌ Failed to save style:', error);
  }
  
  updateStyleDisplay();
}

/**
 * Update style display
 */
function updateStyleDisplay() {
  const currentStyle = STYLES[currentStyleIndex];
  document.getElementById('currentStyle').textContent = currentStyle.name;
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', init);

