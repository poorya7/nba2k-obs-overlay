// Dashboard Controller - Game Selection & Preview

// ApiClient is now in shared/apiClient.js
const api = new ApiClient();

// ==================== STATE ====================

let allGames = [];
let currentQuarter = null;
let currentSimState = null; // For halftime/final in sim mode

// Quarter Timer
let quarterStartTime = null;
let timerInterval = null;
let currentTimeMultiplier = 1; // For fast forward

/**
 * Initialize dashboard on page load
 */
async function init() {
  // Setup event listeners
  document.getElementById('gameSelect').addEventListener('change', handleGameSelection);
  document.getElementById('liveRadio').addEventListener('change', handleModeChange);
  document.getElementById('simRadio').addEventListener('change', handleModeChange);
  document.getElementById('simMVPToggle').addEventListener('click', toggleSimMVP);
  document.getElementById('fastForwardToggle').addEventListener('click', toggleFastForward);
  
  // Quarter tracking event listeners
  document.querySelectorAll('.quarter-btn').forEach(btn => {
    if (btn.dataset.quarter) {
      btn.addEventListener('click', () => handleQuarterClick(btn.dataset.quarter));
    } else if (btn.dataset.state) {
      btn.addEventListener('click', () => handleSimStateClick(btn.dataset.state));
    }
  });
  document.getElementById('doneBtn').addEventListener('click', handleGameDone);
  
  // Clear server state on dashboard load (fresh start)
  await api.setSelectedGame(null);
  await api.setQuarter(null);
  await api.setSimulation({ timeMultiplier: 1, showMVP: false }); // Reset sim state
  
  // Load state from server
  await loadSimulationState();
  await loadQuarterState();
  
  // Load games (don't restore selection on initial load)
  await loadGames(false);
  
  // Initialize mode UI
  updateModeUI();
  
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
    
    // Start timer if a quarter is active (not 'done')
    if (currentQuarter && currentQuarter !== 'done') {
      startTimer();
    }
  }
}

/**
 * Handle quarter button click
 */
async function handleQuarterClick(quarter) {
  // Check if we're coming from a sim state
  const wasInSimState = currentSimState !== null;
  
  // Clear sim state whenever clicking a quarter button
  currentSimState = null;
  
  // Toggle: if clicking the active quarter (and not coming from sim state), unselect it
  if (currentQuarter === quarter && !wasInSimState) {
    currentQuarter = null;
    await api.setQuarter(null);
    stopTimer();
  } else {
    // Switching quarters - this resets everything
    // The overlay will detect the quarter change and:
    // 1. Hide other games if showing
    // 2. Reset other games shown flag for new quarter
    // 3. Start fresh with current game
    currentQuarter = quarter;
    await api.setQuarter(quarter);
    startTimer();
    
    // If in sim mode, set simulation state to 'live' with this quarter
    const simRadio = document.getElementById('simRadio');
    if (simRadio && simRadio.checked) {
      await api.setSimulation({ state: 'live' });
    }
  }
  updateQuarterUI();
}

/**
 * Handle simulation state button click (pregame/halftime/final)
 */
async function handleSimStateClick(state) {
  // Toggle: if clicking the active state, unselect it
  if (currentSimState === state) {
    currentSimState = null;
    currentQuarter = null;
    await api.setQuarter(null);
    stopTimer();
  } else {
    // Set simulation state
    await api.setSimulation({ state: state });
    
    // Use Q2 to bypass Q1 delay (Q2+ show immediately)
    currentQuarter = 'Q2';
    currentSimState = state;
    await api.setQuarter('Q2');
    
    // Stop timer and just show the state name
    stopTimer();
    const timerElement = document.getElementById('quarterTimer');
    if (timerElement) timerElement.classList.add('show');
    updateTimerDisplay();
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
    currentSimState = null; // Clear sim state
    await api.setQuarter(null); // Send null to server (no active quarter)
    stopTimer();
  }
  updateQuarterUI();
}

/**
 * Update quarter button states
 */
function updateQuarterUI() {
  const doneBtn = document.getElementById('doneBtn');
  
  // Update quarter buttons (Q1, Q2, Q3, Q4)
  // Only highlight if not in a sim state (pregame/halftime/final)
  document.querySelectorAll('.quarter-btn[data-quarter]').forEach(btn => {
    if (btn.dataset.quarter === currentQuarter && !currentSimState) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Update sim state buttons (pregame, halftime, final)
  document.querySelectorAll('.quarter-btn[data-state]').forEach(btn => {
    if (btn.dataset.state === currentSimState) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Done button is only active if currentQuarter is 'done' (not just null)
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
    const simRadio = document.getElementById('simRadio');
    const liveRadio = document.getElementById('liveRadio');
    const mvpBtn = document.getElementById('simMVPToggle');
    const ffBtn = document.getElementById('fastForwardToggle');
    
    // Set radio button based on enabled state
    if (data.enabled) {
      simRadio.checked = true;
      liveRadio.checked = false;
    } else {
      liveRadio.checked = true;
      simRadio.checked = false;
    }
    
    // Set MVP button state
    const showMVP = data.showMVP || false;
    mvpBtn.dataset.state = showMVP ? 'on' : 'off';
    mvpBtn.textContent = 'MVP';
    
    // Set Fast Forward button state
    const timeMultiplier = data.timeMultiplier || 1;
    const isFastForward = timeMultiplier > 1;
    ffBtn.dataset.state = isFastForward ? 'on' : 'off';
    ffBtn.textContent = 'Fast Forward';
    currentTimeMultiplier = timeMultiplier; // Update local state
  }
}

/**
 * Handle mode change (Live vs Simulation)
 */
async function handleModeChange() {
  const simRadio = document.getElementById('simRadio');
  const isSimMode = simRadio.checked;
  
  // Update server
  await api.setSimulation({ enabled: isSimMode });
  
  // Reset quarter and state tracking
  currentQuarter = null;
  currentSimState = null;
  await api.setQuarter(null);
  stopTimer();
  
  // Reset MVP button when switching to live mode
  if (!isSimMode) {
    const mvpBtn = document.getElementById('simMVPToggle');
    mvpBtn.dataset.state = 'off';
    mvpBtn.textContent = 'MVP';
    await api.setSimulation({ showMVP: false });
    
    // Clear game selection when switching to live mode
    const selectEl = document.getElementById('gameSelect');
    selectEl.value = '';
    await api.setSelectedGame(null);
    clearPreview();
  }
  
  // Update UI
  updateModeUI();
  updateQuarterUI();
}

/**
 * Update mode-specific UI sections
 */
function updateModeUI() {
  const simRadio = document.getElementById('simRadio');
  const isSimMode = simRadio.checked;
  
  const liveGameSection = document.getElementById('liveGameSection');
  const simulationSection = document.getElementById('simulationSection');
  const quarterSection = document.getElementById('quarterSection');
  const simStateButtons = document.getElementById('simStateButtons');
  
  if (isSimMode) {
    // Simulation mode
    liveGameSection.style.display = 'none';
    simulationSection.style.display = 'block';
    quarterSection.style.display = 'block';
    if (simStateButtons) simStateButtons.style.display = 'grid';
  } else {
    // Live game mode
    liveGameSection.style.display = 'block';
    simulationSection.style.display = 'none';
    if (simStateButtons) simStateButtons.style.display = 'none';
    
    // Only show quarter section if a game is selected
    const selectEl = document.getElementById('gameSelect');
    if (selectEl.value) {
      quarterSection.style.display = 'block';
    } else {
      quarterSection.style.display = 'none';
    }
  }
}

/**
 * Toggle simulated MVP button
 */
async function toggleSimMVP() {
  const mvpBtn = document.getElementById('simMVPToggle');
  const isOn = mvpBtn.dataset.state === 'on';
  
  // Toggle state
  const newState = !isOn;
  mvpBtn.dataset.state = newState ? 'on' : 'off';
  mvpBtn.textContent = 'MVP';
  
  // Update server
  await api.setSimulation({ showMVP: newState });
}

/**
 * Toggle fast forward button
 */
async function toggleFastForward() {
  const ffBtn = document.getElementById('fastForwardToggle');
  const isOn = ffBtn.dataset.state === 'on';
  
  // Toggle state
  const newState = !isOn;
  ffBtn.dataset.state = newState ? 'on' : 'off';
  ffBtn.textContent = 'Fast Forward';
  
  // Calculate current virtual time before changing multiplier
  if (quarterStartTime) {
    const realElapsed = Date.now() - quarterStartTime;
    const virtualElapsed = realElapsed * currentTimeMultiplier;
    
    // Update multiplier
    const newMultiplier = newState ? 10 : 1;
    
    // Adjust start time to preserve virtual time
    quarterStartTime = Date.now() - (virtualElapsed / newMultiplier);
    
    currentTimeMultiplier = newMultiplier;
    
    // Restart timer with new update interval
    if (timerInterval) {
      clearInterval(timerInterval);
      const updateInterval = 1000 / currentTimeMultiplier;
      timerInterval = setInterval(updateTimerDisplay, updateInterval);
    }
  } else {
    currentTimeMultiplier = newState ? 10 : 1;
  }
  
  // Update server (10x when on, 1x when off)
  await api.setSimulation({ timeMultiplier: currentTimeMultiplier });
}


// ==================== QUARTER TIMER ====================

/**
 * Start the quarter timer
 */
function startTimer() {
  quarterStartTime = Date.now();
  updateTimerDisplay();
  
  // Clear any existing interval
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  
  // Update interval based on multiplier (faster updates for fast forward)
  const updateInterval = 1000 / currentTimeMultiplier; // 100ms when 10x
  timerInterval = setInterval(updateTimerDisplay, updateInterval);
}

/**
 * Stop the quarter timer
 */
function stopTimer() {
  quarterStartTime = null;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  // Hide timer display
  const timerElement = document.getElementById('quarterTimer');
  if (timerElement) {
    timerElement.classList.remove('show');
  }
}

/**
 * Update the timer display
 */
function updateTimerDisplay() {
  if (!quarterStartTime) return;
  
  const timerElement = document.getElementById('quarterTimer');
  const timerValue = document.getElementById('timerValue');
  
  if (!timerElement || !timerValue) return;
  
  // If in special state, show state name instead of timer
  if (currentSimState === 'pregame') {
    timerValue.textContent = 'Pre-Game';
    timerElement.classList.add('show');
    return;
  } else if (currentSimState === 'halftime') {
    timerValue.textContent = 'Halftime';
    timerElement.classList.add('show');
    return;
  } else if (currentSimState === 'final') {
    timerValue.textContent = 'Final';
    timerElement.classList.add('show');
    return;
  }
  
  // Calculate elapsed time (accelerated if fast forward is on)
  const realElapsedMs = Date.now() - quarterStartTime;
  const acceleratedMs = realElapsedMs * currentTimeMultiplier;
  const elapsedSeconds = Math.floor(acceleratedMs / 1000);
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  
  // Format as MM:SS
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  timerValue.textContent = timeStr;
  
  // Show timer
  timerElement.classList.add('show');
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', init);

