// Dashboard Controller - Game Selection & Preview

// ApiClient is now in shared/apiClient.js
const api = new ApiClient();

// ==================== STATE ====================

let allGames = [];
let currentQuarter = null;

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
  
  // Quarter tracking event listeners
  document.querySelectorAll('.quarter-btn').forEach(btn => {
    btn.addEventListener('click', () => handleQuarterClick(btn.dataset.quarter));
  });
  document.getElementById('doneBtn').addEventListener('click', handleGameDone);
  
  // Clear server state on dashboard load (fresh start)
  await api.setSelectedGame(null);
  await api.setQuarter(null);
  
  // Load state from server
  await loadSimulationState();
  await loadQuarterState();
  
  // Load games (don't restore selection on initial load)
  await loadGames(false);
  
  // Auto-refresh every minute
  setInterval(refreshGames, window.NBA_CONFIG.DASHBOARD_REFRESH_INTERVAL);
}

/**
 * Load today's games from ESPN API
 * @param {boolean} restoreSelection - Whether to restore previous selection (for auto-refresh)
 */
async function loadGames(restoreSelection = false) {
  const selectEl = document.getElementById('gameSelect');
  const errorEl = document.getElementById('error');
  
  try {
    errorEl.style.display = 'none';
    
    // Save current selection before refresh
    const currentSelection = selectEl.value;
    
    // Fetch games from ESPN
    allGames = await window.NBAApi.getTodaysGames();
    
    // Populate dropdown
    populateGameSelect(allGames);
    
    // Restore selection if requested (during auto-refresh)
    if (restoreSelection && currentSelection) {
      selectEl.value = currentSelection;
      if (selectEl.value) {
        updatePreview(selectEl.value);
        showQuarterSection();
      }
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
    clearPreview();
    hideQuarterSection();
    await api.setSelectedGame(null);
    return;
  }
  
  // Reset quarter tracking when new game selected
  currentQuarter = null;
  await api.setQuarter(null);
  
  // Save to server and update preview
  await api.setSelectedGame(gameId);
  updatePreview(gameId);
  showQuarterSection();
  updateQuarterUI();
}

/**
 * Show quarter tracking section
 */
function showQuarterSection() {
  document.getElementById('quarterSection').style.display = 'block';
  updateQuarterUI();
}

/**
 * Hide quarter tracking section
 */
function hideQuarterSection() {
  document.getElementById('quarterSection').style.display = 'none';
  // Clear button states when hiding
  document.querySelectorAll('.quarter-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('doneBtn').classList.remove('active');
}

/**
 * Load quarter state from server
 */
async function loadQuarterState() {
  const data = await api.getQuarter();
  if (data) {
    currentQuarter = data.current;
    updateQuarterUI();
  }
}

/**
 * Handle quarter button click
 */
async function handleQuarterClick(quarter) {
  // Toggle: if clicking the active quarter, unselect it
  if (currentQuarter === quarter) {
    currentQuarter = null;
    await api.setQuarter(null);
  } else {
    // Clear 'done' state if switching from done to a quarter
    currentQuarter = quarter;
    await api.setQuarter(quarter);
  }
  updateQuarterUI();
}

/**
 * Handle game done button click
 */
async function handleGameDone() {
  // Toggle: if already done, clear it
  if (currentQuarter === 'done') {
    currentQuarter = null;
    await api.setQuarter(null);
  } else {
    currentQuarter = 'done';
    await api.setQuarter(null); // Send null to server (no active quarter)
  }
  updateQuarterUI();
}

/**
 * Update quarter button states
 */
function updateQuarterUI() {
  const doneBtn = document.getElementById('doneBtn');
  
  // Update quarter buttons
  document.querySelectorAll('.quarter-btn').forEach(btn => {
    if (btn.dataset.quarter === currentQuarter) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Done button is only active if currentQuarter is 'done' (not just null)
  // We need to track this as a separate state
  if (currentQuarter === 'done') {
    doneBtn.classList.add('active');
  } else {
    doneBtn.classList.remove('active');
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
        ${showScores ? `<div class="preview-team-score">${game.awayTeam.score}</div>` : ''}
      </div>
      <div class="preview-vs">${showScores ? '-' : 'vs'}</div>
      <div class="preview-team">
        <img src="${game.homeTeam.logo}" alt="${game.homeTeam.name}">
        <div class="preview-team-name">${game.homeTeam.name}</div>
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
 * Refresh games list (auto-refresh, keep selection)
 */
async function refreshGames() {
  await loadGames(true); // Restore selection during auto-refresh
}

/**
 * Load current style from server
 */
async function loadCurrentStyle() {
  const data = await api.get('/api/selected-style');
  if (data) {
    const styleIndex = STYLES.findIndex(s => s.id === data.style);
    if (styleIndex !== -1) {
      currentStyleIndex = styleIndex;
    }
  }
  updateStyleDisplay();
}

/**
 * Cycle to next style
 */
async function nextStyle() {
  currentStyleIndex = (currentStyleIndex + 1) % STYLES.length;
  const selectedStyle = STYLES[currentStyleIndex];
  await api.post('/api/selected-style', { style: selectedStyle.id });
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
  const data = await api.getSimulation();
  if (data) {
    const toggle = document.getElementById('simulationToggle');
    toggle.checked = data.enabled;
    
    const stateIndex = SIMULATION_STATES.indexOf(data.state);
    if (stateIndex !== -1) {
      currentSimulationStateIndex = stateIndex;
    }
    
    updateSimulationUI();
  }
}

/**
 * Handle simulation toggle
 */
async function handleSimulationToggle(event) {
  const enabled = event.target.checked;
  await api.setSimulation({ enabled });
  updateSimulationUI();
}

/**
 * Cycle to next simulation state
 */
async function nextSimulationState() {
  currentSimulationStateIndex = (currentSimulationStateIndex + 1) % SIMULATION_STATES.length;
  const newState = SIMULATION_STATES[currentSimulationStateIndex];
  await api.setSimulation({ state: newState });
  updateSimulationUI();
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

