// Dashboard Controller - Game Selection & Preview

let allGames = [];


// Simulation state
const SIMULATION_STATES = ['pregame', 'live', 'halftime', 'overtime', 'final'];
let currentSimulationStateIndex = 0;

/**
 * Initialize dashboard on page load
 */
async function init() {
  // Setup event listeners
  document.getElementById('gameSelect').addEventListener('change', handleGameSelection);
  document.getElementById('simulationToggle').addEventListener('change', handleSimulationToggle);
  document.getElementById('nextStateBtn').addEventListener('click', nextSimulationState);
  
  // Load simulation state
  await loadSimulationState();
  
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
    errorEl.style.display = 'none';
    
    // Fetch games
    allGames = await window.NBAApi.getTodaysGames();
    
    // Populate dropdown
    populateGameSelect(allGames);
    
    // Restore previous selection from server
    const savedGameId = await loadSavedSelection();
    if (savedGameId) {
      selectEl.value = savedGameId;
      updatePreview(savedGameId);
    }
    
  } catch (error) {
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
    return;
  }
  
  // Save selection to server
  await saveGameSelection(gameId);
  
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
  } catch (error) {
    // Silently fail
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
    // Silently fail
  }
  updateStyleDisplay();
}

/**
 * Cycle to next style
 */
async function nextStyle() {
  currentStyleIndex = (currentStyleIndex + 1) % STYLES.length;
  const selectedStyle = STYLES[currentStyleIndex];
  
  // Save to server
  try {
    const response = await fetch('/api/selected-style', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ style: selectedStyle.id })
    });
  } catch (error) {
    // Silently fail
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

/**
 * Load simulation state from server
 */
async function loadSimulationState() {
  try {
    const response = await fetch('/api/simulation');
    if (response.ok) {
      const data = await response.json();
      const toggle = document.getElementById('simulationToggle');
      toggle.checked = data.enabled;
      
      // Find state index
      const stateIndex = SIMULATION_STATES.indexOf(data.state);
      if (stateIndex !== -1) {
        currentSimulationStateIndex = stateIndex;
      }
      
      updateSimulationUI();
    }
  } catch (error) {
    // Silently fail
  }
}

/**
 * Handle simulation toggle
 */
async function handleSimulationToggle(event) {
  const enabled = event.target.checked;
  
  try {
    const response = await fetch('/api/simulation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    
    if (response.ok) {
      updateSimulationUI();
    }
  } catch (error) {
    // Silently fail
  }
}

/**
 * Cycle to next simulation state
 */
async function nextSimulationState() {
  currentSimulationStateIndex = (currentSimulationStateIndex + 1) % SIMULATION_STATES.length;
  const newState = SIMULATION_STATES[currentSimulationStateIndex];
  
  try {
    const response = await fetch('/api/simulation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: newState })
    });
    
    if (response.ok) {
      updateSimulationUI();
    }
  } catch (error) {
    // Silently fail
  }
}

/**
 * Update simulation UI
 */
function updateSimulationUI() {
  const toggle = document.getElementById('simulationToggle');
  const controls = document.getElementById('simulationControls');
  const stateDisplay = document.getElementById('currentState');
  
  // Show/hide controls based on toggle
  if (toggle.checked) {
    controls.style.display = 'block';
  } else {
    controls.style.display = 'none';
  }
  
  // Update state display with nice formatting
  const state = SIMULATION_STATES[currentSimulationStateIndex];
  const stateNames = {
    'pregame': '⏰ Pregame',
    'live': '🔴 Live (Q3 8:32)',
    'halftime': '⏸️ Halftime',
    'overtime': '🔥 Overtime (OT 3:45)',
    'final': '✅ Final'
  };
  stateDisplay.textContent = stateNames[state] || state;
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', init);

