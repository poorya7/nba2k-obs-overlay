/**
 * GameOverlay.js
 * 
 * Main controller for the NBA game overlay.
 * Combines existing overlay.js logic with StateRenderer and StateTransitions.
 * 
 * Usage:
 *   const overlay = new GameOverlay('#overlay');
 *   overlay.start(); // Auto-refresh mode
 * 
 * Or manual control:
 *   overlay.setState('live', gameData);
 */

class GameOverlay {
  constructor(containerSelector) {
    this.container = document.querySelector(containerSelector);
    if (!this.container) {
      throw new Error(`Container element not found: ${containerSelector}`);
    }
    
    this.pillBox = null;
    this.transitions = null;
    this.refreshInterval = null;
    this.countdownInterval = null;
    
    // State tracking
    this.currentState = null;
    this.currentGameData = null;
    this.lastScores = { away: 0, home: 0 };
    this.countdown = 0; // seconds until game starts
    
    // Initialize pill structure
    this._initializePillStructure();
  }

  /**
   * Initialize the pill box structure
   */
  _initializePillStructure() {
    this.container.innerHTML = `
      <div class="overlay-pill expand-smooth content-fade">
        <div class="pill pregame" id="pillBox"></div>
      </div>
    `;
    
    this.pillBox = document.getElementById('pillBox');
    this.transitions = new StateTransitions(this.pillBox);
  }

  /**
   * Start automatic mode (fetches from API and auto-refreshes)
   * This is the existing behavior from overlay.js
   */
  async start() {
    console.log('🏀 NBA Overlay initialized');
    
    // Initial update
    await this._updateFromAPI();
    
    // Auto-refresh every 10 seconds
    this.refreshInterval = setInterval(() => {
      this._updateFromAPI();
    }, 10000);
  }

  /**
   * Stop automatic updates
   */
  stop() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  /**
   * Fetch game data from API and update overlay
   * Extracted from overlay.js updateOverlay()
   */
  async _updateFromAPI() {
    try {
      // Fetch selected game ID from server
      const response = await fetch('/api/selected-game');
      if (!response.ok) {
        throw new Error('Failed to fetch selection');
      }
      
      const data = await response.json();
      const selectedGameId = data.gameId;
      
      if (!selectedGameId) {
        this.showNoGameSelected();
        return;
      }
      
      // Fetch game data
      console.log('📡 Fetching game data:', selectedGameId);
      const game = await window.NBAApi.getGameById(selectedGameId);
      
      if (!game) {
        this.showError('Selected game not found');
        return;
      }
      
      // Determine state and update
      this._autoDetectAndSetState(game);
      
    } catch (error) {
      console.error('❌ Error updating overlay:', error);
      this.showError(error.message);
    }
  }

  /**
   * Auto-detect game state from game data and transition if needed
   */
  _autoDetectAndSetState(game) {
    let newState = 'pregame';
    
    // Determine state based on game data
    if (game.isFinal) {
      newState = 'final';
    } else if (game.isLive) {
      // Check if halftime
      if (game.statusText.toLowerCase().includes('halftime')) {
        newState = 'halftime';
      }
      // Check if overtime
      else if (game.statusText.startsWith('OT')) {
        newState = 'overtime';
      }
      else {
        newState = 'live';
      }
    } else {
      // Scheduled - calculate countdown
      const gameTime = new Date(game.date).getTime();
      const now = Date.now();
      this.countdown = Math.max(0, Math.floor((gameTime - now) / 1000));
      newState = 'pregame';
    }
    
    // Detect score changes for animation
    if (game.isLive || game.isFinal) {
      const awayScore = parseInt(game.awayTeam.score) || 0;
      const homeScore = parseInt(game.homeTeam.score) || 0;
      
      if (awayScore > this.lastScores.away) {
        this.transitions.animateScoreChange('leftScore');
      }
      if (homeScore > this.lastScores.home) {
        this.transitions.animateScoreChange('rightScore');
      }
      
      this.lastScores = { away: awayScore, home: homeScore };
    }
    
    // Set state (statusText already parsed in nbaApi.js)
    this.setState(newState, game);
  }

  /**
   * Set game state manually
   * @param {string} state - 'pregame', 'live', 'halftime', 'final', 'overtime'
   * @param {Object} gameData - Game data object
   */
  setState(state, gameData) {
    const validStates = ['pregame', 'live', 'halftime', 'final', 'overtime'];
    if (!validStates.includes(state)) {
      console.error(`Invalid state: ${state}`);
      return;
    }
    
    // If game data changed or first time, re-render all states
    const gameChanged = !this.currentGameData || 
                        this.currentGameData.id !== gameData.id;
    
    if (gameChanged) {
      this.currentGameData = gameData;
      this._renderAllStates(gameData);
    } else {
      // Just update scores and time
      this.currentGameData = gameData;
      StateRenderer.updateScores(gameData.awayTeam.score, gameData.homeTeam.score);
      StateRenderer.updateGameTime(gameData.statusText);
    }
    
    // If first time, show the state
    if (!this.currentState) {
      this.currentState = state;
      this._showState(state);
      return;
    }
    
    // If same state, do nothing (already updated scores/time above)
    if (this.currentState === state) {
      return;
    }
    
    // State changed - transition
    console.log(`🔄 Transitioning from ${this.currentState} to ${state}`);
    this._transitionToState(this.currentState, state, gameData);
    this.currentState = state;
  }

  /**
   * Render all states at once (like transition-test.html)
   * Only call this once during initialization or when game changes
   */
  _renderAllStates(gameData) {
    const html = StateRenderer.renderAllStates(gameData, this.countdown, this.currentState || 'pregame');
    this.pillBox.innerHTML = html;
    console.log('✅ All states rendered');
  }
  
  /**
   * Show a specific state (toggle visibility only)
   */
  _showState(state) {
    // Set correct pill class
    this.pillBox.className = `pill ${this._getPillClass(state)}`;
    
    // Hide all states first
    const allStates = ['pregame', 'live', 'halftime', 'final', 'overtime'];
    allStates.forEach(s => {
      const elementIds = StateRenderer.getStateElementIds(s);
      elementIds.forEach(id => {
        const el = document.getElementById(id);
        if (el && s !== state) {
          el.classList.add('hidden', 'display-none');
        }
      });
    });
    
    // Show active state elements
    const elementIds = StateRenderer.getStateElementIds(state);
    elementIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.remove('hidden', 'display-none');
      }
    });
    
    // Start countdown timer if pregame
    if (state === 'pregame') {
      this._startCountdownTimer();
    }
    
    console.log('✅ Showing state:', state);
  }

  /**
   * Transition from one state to another with animation
   */
  _transitionToState(fromState, toState, gameData) {
    // Stop countdown if running
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    
    const fromElementIds = StateRenderer.getStateElementIds(fromState);
    const toElementIds = StateRenderer.getStateElementIds(toState);
    
    // Choose appropriate transition
    if (fromState === 'pregame' && toState === 'live') {
      this.transitions.transitionToLive(fromElementIds, toElementIds);
    }
    else if (fromState === 'live' && toState === 'final') {
      this.transitions.transitionToFinal(fromElementIds, toElementIds);
    }
    else if (fromState === 'live' && toState === 'halftime') {
      this.transitions.transitionToHalftime(fromElementIds, toElementIds);
    }
    else if (fromState === 'live' && toState === 'overtime') {
      this.transitions.transitionToOT(fromElementIds, toElementIds);
    }
    else if (fromState === 'overtime' && toState === 'final') {
      this.transitions.transitionOTToFinal(fromElementIds, toElementIds);
    }
    else {
      // Default: just show new state
      this._showState(toState);
    }
  }

  /**
   * Get pill class for a state
   */
  _getPillClass(state) {
    if (state === 'pregame') return 'pregame';
    if (state === 'live' || state === 'overtime') return 'live';
    if (state === 'halftime' || state === 'final') return 'final';
    return 'pregame';
  }


  /**
   * Start countdown timer for pregame state
   */
  _startCountdownTimer() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    
    this.countdownInterval = setInterval(() => {
      this.countdown--;
      
      if (this.countdown <= 0) {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
        return;
      }
      
      // Update countdown display
      const countdownEl = document.getElementById('countdown');
      if (countdownEl) {
        const minutes = Math.floor(this.countdown / 60);
        const seconds = this.countdown % 60;
        const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        countdownEl.textContent = `Starts in ${timeStr}`;
      }
    }, 1000);
  }

  /**
   * Show "No game selected" state
   * From overlay.js
   */
  showNoGameSelected() {
    this.currentState = null;
    this.container.innerHTML = `
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
   * Show error state
   * From overlay.js
   */
  showError(message) {
    this.currentState = null;
    this.container.innerHTML = `
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

  /**
   * Cleanup on destroy
   */
  destroy() {
    this.stop();
    this.container.innerHTML = '';
  }
}

// Make available globally
window.GameOverlay = GameOverlay;

