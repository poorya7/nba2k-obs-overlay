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
    this.currentStyle = null;
    this.currentLayoutType = 'pill';
    this.lastScores = { away: 0, home: 0 };
    this.countdown = 0; // seconds until game starts
    
    // Initialize pill structure
    this._initializePillStructure();
  }

  /**
   * Initialize the overlay structure (layout-agnostic container)
   */
  _initializePillStructure() {
    this.container.innerHTML = `
      <div class="overlay-wrapper" id="overlayWrapper">
        <div class="overlay-content" id="overlayContent"></div>
      </div>
    `;
    
    this.overlayWrapper = document.getElementById('overlayWrapper');
    this.overlayContent = document.getElementById('overlayContent');
    this.pillBox = null; // Will be set when pill layout is rendered
    this.transitions = null;
  }

  /**
   * Start automatic mode (fetches from API and auto-refreshes)
   * This is the existing behavior from overlay.js
   */
  async start() {
    console.log('🏀 NBA Overlay initialized');
    
    // Load selected style
    await this._loadSelectedStyle();
    
    // Initial update
    await this._updateFromAPI();
    
    // Auto-refresh game data every 10 seconds
    this.refreshInterval = setInterval(() => {
      this._updateFromAPI();
    }, 10000);
    
    // Check for style changes every 2 seconds (more responsive)
    this.styleCheckInterval = setInterval(() => {
      this._loadSelectedStyle();
    }, 2000);
  }
  
  /**
   * Load selected style from server
   */
  async _loadSelectedStyle() {
    try {
      const response = await fetch('/api/selected-style');
      if (response.ok) {
        const data = await response.json();
        // Apply style on first load OR when it changes
        if (this.currentStyle !== data.style) {
          this.currentStyle = data.style;
          console.log('🎨 Style changed to:', data.style);
          this._applyStyle(data.style);
        } else if (!this.currentStyle) {
          // First load - apply initial style
          this.currentStyle = data.style;
          this._applyStyle(data.style);
        }
      }
    } catch (error) {
      console.error('❌ Failed to load style:', error);
    }
  }
  
  /**
   * Apply visual style to overlay
   */
  _applyStyle(styleId) {
    console.log('🎨 Applying style:', styleId);
    
    const className = styleId || 'pill-green';
    const layoutType = this._getLayoutType(styleId);
    
    // Pill styles: just "pill-blue" (no prefix) - apply to wrapper
    // Horizontal/Vertical: "design-horizontal-green" (with prefix) - apply to content
    if (layoutType === 'pill') {
      if (this.overlayWrapper) this.overlayWrapper.className = `overlay-wrapper ${className}`;
      if (this.overlayContent) this.overlayContent.className = 'overlay-content';
    } else {
      // For horizontal/vertical, apply design class to content (not wrapper)
      if (this.overlayWrapper) this.overlayWrapper.className = 'overlay-wrapper';
      if (this.overlayContent) this.overlayContent.className = `overlay-content design-${className}`;
    }
    
    console.log('✅ Class applied:', layoutType === 'pill' ? className : `design-${className}`);
    
    // Re-render with new layout if layout type changed
    if (this.currentLayoutType !== layoutType) {
      this.currentLayoutType = layoutType;
      console.log('🔄 Layout type changed to:', layoutType);
      
      // Force re-render with new layout
      if (this.currentGameData) {
        this._renderAllStates(this.currentGameData);
      }
    }
  }
  
  /**
   * Get layout type from style ID
   */
  _getLayoutType(styleId) {
    if (styleId.startsWith('horizontal')) return 'horizontal';
    if (styleId.startsWith('vertical')) return 'vertical';
    return 'pill';
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
    if (this.styleCheckInterval) {
      clearInterval(this.styleCheckInterval);
      this.styleCheckInterval = null;
    }
  }

  /**
   * Fetch game data from API and update overlay
   * Extracted from overlay.js updateOverlay()
   */
  async _updateFromAPI() {
    try {
      // Check if simulation mode is enabled
      const simResponse = await fetch('/api/simulation');
      if (simResponse.ok) {
        const simData = await simResponse.json();
        
        if (simData.enabled) {
          // Use mock data in simulation mode
          const mockGame = this._generateMockGameData(simData.state);
          this._autoDetectAndSetState(mockGame);
          return;
        }
      }
      
      // Normal mode - fetch real game data
      const response = await fetch('/api/selected-game');
      if (!response.ok) {
        throw new Error('Failed to fetch selection');
      }
      
      const data = await response.json();
      const selectedGameId = data.gameId;
      
      if (!selectedGameId) {
        this.hide();
        return;
      }
      
      // Fetch game data
      console.log('📡 Fetching game data:', selectedGameId);
      const game = await window.NBAApi.getGameById(selectedGameId);
      
      if (!game) {
        this.hide();
        return;
      }
      
      // Determine state and update
      this._autoDetectAndSetState(game);
      
    } catch (error) {
      console.error('❌ Error updating overlay:', error);
      this.hide(); // Hide instead of showing error
    }
  }

  /**
   * Auto-detect game state from game data and transition if needed
   */
  _autoDetectAndSetState(game) {
    let newState = 'pregame';
    
    console.log('🔍 State detection:', { isLive: game.isLive, isFinal: game.isFinal, statusText: game.statusText });
    
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
    
    console.log('🎯 Detected state:', newState);
    
    // Detect score changes for animation (pill layout only)
    if (game.isLive || game.isFinal) {
      const awayScore = parseInt(game.awayTeam.score) || 0;
      const homeScore = parseInt(game.homeTeam.score) || 0;
      
      if (this.transitions) {
        if (awayScore > this.lastScores.away) {
          this.transitions.animateScoreChange('leftScore');
        }
        if (homeScore > this.lastScores.home) {
          this.transitions.animateScoreChange('rightScore');
        }
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
    
    // Show overlay if hidden
    this.show();
    
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
   * Render all states at once (supports all layout types)
   * Only call this once during initialization or when game changes
   */
  _renderAllStates(gameData) {
    const layoutType = this.currentLayoutType || 'pill';
    const html = StateRenderer.renderAllStates(gameData, this.countdown, this.currentState || 'pregame', layoutType);
    
    // For pill layout, wrap in pill container
    if (layoutType === 'pill') {
      this.overlayContent.innerHTML = `
        <div class="overlay-pill expand-smooth content-fade">
          <div class="pill ${this._getPillClass(this.currentState || 'pregame')}" id="pillBox">
            ${html}
          </div>
        </div>
      `;
      this.pillBox = document.getElementById('pillBox');
      this.transitions = new StateTransitions(this.pillBox);
    } else {
      // For horizontal/vertical, render directly
      this.overlayContent.innerHTML = html;
      this.pillBox = null;
      this.transitions = null;
    }
    
    console.log('✅ All states rendered (layout:', layoutType, ')');
  }
  
  /**
   * Show a specific state (toggle visibility only)
   */
  _showState(state) {
    // Only for pill layout
    if (this.currentLayoutType === 'pill' && this.pillBox) {
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
    }
    
    console.log('✅ Showing state:', state, '(layout:', this.currentLayoutType, ')');
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
    
    // For non-pill layouts, just re-render (no animations)
    if (this.currentLayoutType !== 'pill') {
      this._renderAllStates(gameData);
      return;
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
        const timeStr = StateRenderer.formatCountdown(this.countdown);
        countdownEl.textContent = `Starts in ${timeStr}`;
      }
    }, 1000);
  }

  /**
   * Hide overlay (for errors, no game selected, etc.)
   */
  hide() {
    this.currentState = null;
    this.container.innerHTML = '';
    this.container.style.display = 'none';
  }
  
  /**
   * Show overlay
   */
  show() {
    this.container.style.display = 'block';
  }

  /**
   * Generate mock game data for simulation mode
   */
  _generateMockGameData(state) {
    const baseGame = {
      id: 'simulation-game',
      name: 'Los Angeles Lakers at Golden State Warriors',
      shortName: 'LAL @ GSW',
      awayTeam: {
        name: 'Los Angeles Lakers',
        abbreviation: 'LAL',
        logo: 'https://a.espncdn.com/i/teamlogos/nba/500/lal.png',
        score: '0',
        record: '35-31'
      },
      homeTeam: {
        name: 'Golden State Warriors',
        abbreviation: 'GSW',
        logo: 'https://a.espncdn.com/i/teamlogos/nba/500/gsw.png',
        score: '0',
        record: '32-34'
      }
    };
    
    // Customize based on state
    switch (state) {
      case 'pregame':
        // Game starts in 23 minutes
        const futureDate = new Date(Date.now() + 23 * 60 * 1000);
        return {
          ...baseGame,
          date: futureDate.toISOString(),
          status: 'scheduled',
          statusText: 'Starts in 23:00',
          isLive: false,
          isFinal: false
        };
        
      case 'live':
        return {
          ...baseGame,
          date: new Date().toISOString(),
          awayTeam: { ...baseGame.awayTeam, score: '82' },
          homeTeam: { ...baseGame.homeTeam, score: '78' },
          status: 'live',
          statusText: 'Q3 8:32',
          isLive: true,
          isFinal: false
        };
        
      case 'halftime':
        return {
          ...baseGame,
          date: new Date().toISOString(),
          awayTeam: { ...baseGame.awayTeam, score: '58' },
          homeTeam: { ...baseGame.homeTeam, score: '55' },
          status: 'live',
          statusText: 'Halftime',
          isLive: true,
          isFinal: false
        };
        
      case 'overtime':
        return {
          ...baseGame,
          date: new Date().toISOString(),
          awayTeam: { ...baseGame.awayTeam, score: '112' },
          homeTeam: { ...baseGame.homeTeam, score: '112' },
          status: 'live',
          statusText: 'OT 3:45',
          isLive: true,
          isFinal: false
        };
        
      case 'final':
        return {
          ...baseGame,
          date: new Date().toISOString(),
          awayTeam: { ...baseGame.awayTeam, score: '118' },
          homeTeam: { ...baseGame.homeTeam, score: '115' },
          status: 'final',
          statusText: 'Final',
          isLive: false,
          isFinal: true
        };
        
      default:
        return baseGame;
    }
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

