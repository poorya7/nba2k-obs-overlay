/**
 * AppController - Main orchestration for the game overlay
 * Single Responsibility: Coordinate between data sources, state, and views
 * 
 * This class extracts the massive <script> block from index.html
 * USES existing working utilities from gameUtils.js (detectGameState, formatCountdown, etc.)
 * 
 * @class
 * @param {Object} dependencies - Dependency injection object
 * @param {ApiClient} dependencies.api - Server API client
 * @param {NBAApi} dependencies.nbaApi - ESPN NBA API client
 * @param {GameView} dependencies.gameView - Game display view
 * @param {MvpView} dependencies.mvpView - MVP display view
 * @param {MvpController} dependencies.mvpController - MVP controller
 * @param {MvpIntegration} dependencies.mvpIntegration - MVP integration
 * @param {OtherGamesView} dependencies.otherGamesView - Other games view
 * @param {StateManager} dependencies.stateManager - State management
 * @param {SimulationManager} dependencies.simulationManager - Simulation data
 * @param {GameDataFormatter} dependencies.gameDataFormatter - Data formatter
 * @param {ModeCoordinator} dependencies.modeCoordinator - Mode coordinator
 */

class AppController {
    /**
     * @param {Object} dependencies - Dependency injection object
     */
    constructor(dependencies) {
        // Validate dependencies
        if (!dependencies) {
            throw new Error('AppController: dependencies object is required');
        }
        
        const required = ['api', 'nbaApi', 'gameView', 'mvpView', 'mvpController', 
                         'mvpIntegration', 'otherGamesView', 'stateManager', 
                         'simulationManager', 'gameDataFormatter', 'modeCoordinator'];
        
        for (const dep of required) {
            if (!dependencies[dep]) {
                throw new Error(`AppController: ${dep} dependency is required`);
            }
        }
        
        // Dependencies (injected for loose coupling)
        this.api = dependencies.api;
        this.nbaApi = dependencies.nbaApi;
        this.gameView = dependencies.gameView;
        this.mvpView = dependencies.mvpView;
        this.mvpController = dependencies.mvpController;
        this.mvpIntegration = dependencies.mvpIntegration;
        this.otherGamesView = dependencies.otherGamesView;
        this.stateManager = dependencies.stateManager;
        this.simulationManager = dependencies.simulationManager;
        this.gameDataFormatter = dependencies.gameDataFormatter;
        this.modeCoordinator = dependencies.modeCoordinator;

        // Configuration
        this.baseUpdateInterval = 3000; // 3 seconds base
        this.updateInterval = 3000; // Current interval (adjusted for time multiplier)
        this.simMVPCheckInterval = 1000; // 1 second
        
        // Timers
        this.updateTimer = null;
        this.simMVPTimer = null;
    }

    /**
     * Start the overlay (call once on page load)
     * @returns {void}
     */
    start() {
        // Initial update
        this.updateFromAPI();

        // Auto-refresh (will adjust dynamically based on sim mode)
        this.updateTimer = setInterval(() => this.updateFromAPI(), this.updateInterval);

        // Check simulated MVP state periodically
        this.checkSimulatedMVP();
        this.simMVPTimer = setInterval(() => this.checkSimulatedMVP(), this.simMVPCheckInterval);
    }

    /**
     * Stop the overlay (cleanup)
     * @returns {void}
     */
    stop() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
        if (this.simMVPTimer) {
            clearInterval(this.simMVPTimer);
            this.simMVPTimer = null;
        }
        this.stateManager.stopCountdown();
    }

    /**
     * Main update loop - fetch and display game data
     * @returns {Promise<void>}
     */
    async updateFromAPI() {
        try {
            // Step 1: Check if simulation mode is enabled
            const simData = await this.api.getSimulation();
            const isSimMode = simData && simData.enabled;

            // Step 2: Get selected game ID from server (not needed for sim mode)
            let selectedGameId = null;
            
            if (!isSimMode) {
                const data = await this.api.getSelectedGame();
                if (!data) {
                    throw new Error('Failed to fetch selection');
                }

                selectedGameId = data.gameId;

                // Check if game changed - reset overlay shown flag
                if (this.stateManager.hasGameIdChanged(selectedGameId)) {
                    this.stateManager.setGameId(selectedGameId);
                }

                // No game selected - hide overlay and reset
                if (!selectedGameId) {
                    this.resetAndHideOverlay();
                    this.stateManager.fullReset();
                    return;
                }
            } else {
                // In sim mode, use a fake game ID
                selectedGameId = 'sim-game';
                if (this.stateManager.hasGameIdChanged(selectedGameId)) {
                    this.stateManager.setGameId(selectedGameId);
                }
            }

            // Step 3: Check quarter tracking
            const quarterData = await this.api.getQuarter();
            
            // Detect quarter changes and handle cleanup
            const quarterChanged = quarterData && quarterData.current && 
                                  (this.stateManager.getLastQuarter() !== quarterData.current || 
                                   this.stateManager.getQuarterStartTime() !== quarterData.startTime);
            
            if (quarterChanged) {
                // Quarter changed - hide other games if showing and reset to current game mode
                if (this.stateManager.getMode() === 'OTHER_GAMES') {
                    this.modeCoordinator.returnToCurrentGameMode();
                }
                
                // In sim mode, reset simulation manager
                if (isSimMode) {
                    this.simulationManager.reset();
                }
                
                this.stateManager.setLastQuarter(quarterData.current);
                this.stateManager.resetVirtualTimeOffset();
                this.stateManager.setQuarterStartTime(quarterData.startTime);
            } else if (!quarterData || !quarterData.current) {
                this.stateManager.setLastQuarter(null);
                this.stateManager.resetVirtualTimeOffset();
                this.stateManager.setQuarterStartTime(null);
            }
            
            // Get time multiplier for fast forward
            const timeMultiplier = isSimMode ? (simData.timeMultiplier || 1) : 1;
            
            // Track multiplier changes and adjust virtual time offset
            if (timeMultiplier !== this.stateManager.getTimeMultiplier() && quarterData && quarterData.startTime) {
                // Calculate current virtual elapsed time with old multiplier
                const realElapsed = Date.now() - quarterData.startTime;
                const oldVirtualElapsed = realElapsed * this.stateManager.getTimeMultiplier() + this.stateManager.getVirtualTimeOffset();
                
                // Calculate what the new offset should be to preserve virtual time
                const newOffset = oldVirtualElapsed - (realElapsed * timeMultiplier);
                this.stateManager.setVirtualTimeOffset(newOffset);
                
                this.stateManager.setTimeMultiplier(timeMultiplier);
                
                // Update other games controller if it's active
                this.modeCoordinator.updateTimeMultiplier(timeMultiplier);
            } else if (timeMultiplier !== this.stateManager.getTimeMultiplier()) {
                this.stateManager.setTimeMultiplier(timeMultiplier);
                
                // Update other games controller if it's active
                this.modeCoordinator.updateTimeMultiplier(timeMultiplier);
            }
            
            // In sim mode, always use fast polling (300ms) for responsiveness
            const desiredInterval = isSimMode ? 300 : this.baseUpdateInterval;
            if (this.updateInterval !== desiredInterval && this.updateTimer) {
                this.updateInterval = desiredInterval;
                clearInterval(this.updateTimer);
                this.updateTimer = setInterval(() => this.updateFromAPI(), this.updateInterval);
            }

            if (!this.shouldShowOverlayBasedOnQuarter(quarterData, timeMultiplier)) {
                // Hide overlay and reset (but keep game tracking)
                this.resetAndHideOverlay();
                this.stateManager.resetOverlayShown();
                return;
            }

            // Quarter active - show overlay

            // Step 4: Check if we should show other games
            // In simulation mode: Only show during active live play (not pregame/halftime/final)
            // In live mode: Quarter tracking naturally prevents showing during breaks
            let canShowOtherGames = true;
            if (isSimMode && simData.state && simData.state !== 'live') {
                canShowOtherGames = false; // Don't show during pregame/halftime/final
            }
            
            if (canShowOtherGames && this.stateManager.shouldShowOtherGames(quarterData, timeMultiplier, this.stateManager.getVirtualTimeOffset())) {
                await this.modeCoordinator.showOtherGamesMode(selectedGameId);
                return; // Other games is showing, don't update current game
            }

            // Step 5: Ensure we're in current game mode
            if (this.stateManager.getMode() !== 'CURRENT_GAME') {
                // Shouldn't happen, but safety check
                return;
            }

            // Step 6: Fetch or generate game data
            let game;
            if (isSimMode) {
                game = this.simulationManager.generateGameData(simData.state, timeMultiplier);
            } else {
                game = await this.nbaApi.getGameById(selectedGameId);
            }

            if (!game) {
                this.resetAndHideOverlay();
                return;
            }

            // Step 7: Auto-detect state and update view
            this.detectStateAndUpdate(game, selectedGameId);

        } catch (error) {
            // Controller error handling: log and gracefully degrade
            console.error('[AppController] Error in updateFromAPI:', error.message || error);
            this.resetAndHideOverlay();
        }
    }

    /**
     * Reset overlay state and hide everything
     * @returns {void}
     */
    resetAndHideOverlay() {
        this.gameView.hide();
        this.mvpView.hide();
        this.mvpIntegration.clearMVPCache();
        
        // Cleanup other games mode (without showing current game)
        this.modeCoordinator.cleanupOtherGamesMode();
        
        this.stateManager.reset();
    }

    /**
     * Check if overlay should be shown based on quarter tracking
     * @param {Object} quarterData - Quarter tracking data from server
     * @param {number} timeMultiplier - Time acceleration multiplier (1 = normal, 10 = fast forward)
     * @returns {boolean}
     */
    shouldShowOverlayBasedOnQuarter(quarterData, timeMultiplier = 1) {
        if (!quarterData.current || !quarterData.startTime) {
            return false;
        }

        // Only apply 10-second delay if overlay hasn't been shown yet
        if (!this.stateManager.isOverlayShown()) {
            // Only check delay for Q1 (first quarter of the game)
            if (quarterData.current === 'Q1') {
                const realTimeSinceStart = Date.now() - quarterData.startTime;
                const acceleratedTime = realTimeSinceStart * timeMultiplier + this.stateManager.getVirtualTimeOffset();
                const SHOW_DELAY = 10000; // 10 seconds

                if (acceleratedTime < SHOW_DELAY) {
                    return false; // Not enough time passed
                }
            }
            // If we reach here, overlay will be shown - set flag
            this.stateManager.markOverlayAsShown();
        }

        return true; // Show overlay
    }

    /**
     * Detect game state and update view
     * @param {Object} game - Game data
     * @param {string} gameId - ESPN game ID
     */
    detectStateAndUpdate(game, gameId) {
        // Analyze changes
        const changes = this._analyzeChanges(game, gameId);
        
        // Handle countdown for pregame state
        this._managePregameCountdown(changes.stateName);
        
        // Check if anything changed
        if (!this.stateManager.hasGameDataChanged(changes.fullKey)) {
            return; // Nothing changed
        }

        // Route to appropriate handler based on what changed
        if (this.stateManager.lastGameData === null) {
            this._handleFirstLoad(changes);
        } else {
            const lastStateKey = this.stateManager.lastGameData.split('}')[0] + '}';
            const lastScoreKey = this.stateManager.lastGameData.split('}')[1] + '}';

            const stateChanged = changes.stateKey !== lastStateKey;
            const scoresChanged = changes.scoreKey !== lastScoreKey;

            if (stateChanged) {
                this._handleStateChange(changes);
            } else if (scoresChanged) {
                this._handleScoreChange(changes, lastScoreKey);
            } else {
                this._handleTimeUpdate(changes);
            }
        }

        // Update tracking
        this.stateManager.setGameData(changes.fullKey);
    }

    /**
     * Analyze what changed in the game data
     * @private
     * @param {Object} game - Game data
     * @param {string} gameId - ESPN game ID
     * @returns {Object} Change analysis object
     */
    _analyzeChanges(game, gameId) {
        const stateName = GameUtils.detectGameState(game);

        // Extract current scores
        const currentHomeScore = parseInt(game.homeTeam.score) || 0;
        const currentAwayScore = parseInt(game.awayTeam.score) || 0;
        
        // Check if scores changed
        const scoreChanges = this.stateManager.hasScoresChanged(currentHomeScore, currentAwayScore);

        // Format data for GameView (with animation flags)
        const formattedData = this.gameDataFormatter.formatGameDataForView(game, stateName, scoreChanges);

        // Update stored scores
        this.stateManager.updateScores(currentHomeScore, currentAwayScore);

        // Create comparison keys
        const homeScore = formattedData.home?.score ?? formattedData.homeTeam?.score ?? 0;
        const awayScore = formattedData.away?.score ?? formattedData.awayTeam?.score ?? 0;
        const homeAbbr = formattedData.home?.abbr ?? formattedData.homeTeam?.abbr ?? '';
        const awayAbbr = formattedData.away?.abbr ?? formattedData.awayTeam?.abbr ?? '';

        const stateKey = JSON.stringify({
            state: stateName,
            quarter: formattedData.quarter
        });

        const scoreKey = JSON.stringify({
            homeScore: homeScore,
            awayScore: awayScore,
            homeAbbr: homeAbbr,
            awayAbbr: awayAbbr
        });

        return {
            stateName,
            formattedData,
            homeScore,
            awayScore,
            homeAbbr,
            awayAbbr,
            stateKey,
            scoreKey,
            fullKey: stateKey + scoreKey,
            gameId
        };
    }

    /**
     * Manage countdown interval for pregame state
     * @private
     * @param {string} stateName - Current game state
     */
    _managePregameCountdown(stateName) {
        if (stateName === 'pregame') {
            if (!this.stateManager.isCountdownActive()) {
                this.stateManager.startCountdown((seconds) => {
                    if (seconds > 0) {
                        this.gameView.updateCountdown(GameUtils.formatCountdown(seconds));
                    } else {
                        this.stateManager.stopCountdown();
                        this.updateFromAPI();
                    }
                });
            }
        } else {
            this.stateManager.stopCountdown();
        }
    }

    /**
     * Handle first load of game data
     * @private
     * @param {Object} changes - Change analysis object
     */
    _handleFirstLoad(changes) {
        // Step 1: Render the content first (invisible)
        this.gameView.switchToState(changes.stateName, changes.formattedData);
        
        // Step 2: Measure actual content height and set box size
        this.gameView.setInitialHeightFromContent();
        
        // Step 3: Now show it with fade in
        this.gameView.show();
        
        // Initialize MVP controller with initial state
        this.stateManager.setGameState(changes.stateName);
        this.mvpIntegration.notifyMVPStateChange(
            this.mvpController,
            this.mvpView,
            changes.stateName,
            changes.gameId
        );
    }

    /**
     * Handle game state change (pregame → live, live → halftime, etc.)
     * @private
     * @param {Object} changes - Change analysis object
     */
    _handleStateChange(changes) {
        this.gameView.switchToState(changes.stateName, changes.formattedData);

        // Notify MVP controller of state change
        if (this.stateManager.hasGameStateChanged(changes.stateName)) {
            this.stateManager.setGameState(changes.stateName);
            this.mvpIntegration.notifyMVPStateChange(
                this.mvpController,
                this.mvpView,
                changes.stateName,
                changes.gameId
            );
        }
    }

    /**
     * Handle score changes (with or without team changes)
     * @private
     * @param {Object} changes - Change analysis object
     * @param {string} lastScoreKey - Previous score key for comparison
     */
    _handleScoreChange(changes, lastScoreKey) {
        const teamsChanged = (lastScoreKey.includes(changes.homeAbbr) === false) ||
            (lastScoreKey.includes(changes.awayAbbr) === false);

        if (teamsChanged) {
            // Teams changed - full state switch
            this.gameView.switchToState(changes.stateName, changes.formattedData);
            
            this.stateManager.setGameState(changes.stateName);
            this.mvpIntegration.notifyMVPStateChange(
                this.mvpController,
                this.mvpView,
                changes.stateName,
                changes.gameId
            );
        } else if (changes.stateName === 'live') {
            // Scores changed in live state - animate
            this.gameView.updateScore('home', changes.homeScore, changes.formattedData.home.animate);
            this.gameView.updateScore('away', changes.awayScore, changes.formattedData.away.animate);
            
            if (changes.formattedData.time) {
                this.gameView.updateStatusText(changes.formattedData.quarter, changes.formattedData.time);
            }
        } else {
            // Scores changed in other states - no animation
            this.gameView.updateScore('home', changes.homeScore, false);
            this.gameView.updateScore('away', changes.awayScore, false);
        }
    }

    /**
     * Handle time-only updates (no score or state change)
     * @private
     * @param {Object} changes - Change analysis object
     */
    _handleTimeUpdate(changes) {
        if (changes.stateName === 'live' && changes.formattedData.time) {
            this.gameView.updateStatusText(changes.formattedData.quarter, changes.formattedData.time);
        }
    }


    /**
     * Check if simulated MVP should be shown (controlled by dashboard)
     * @returns {Promise<void>}
     */
    async checkSimulatedMVP() {
        try {
            const simData = await this.api.getSimulation();

            // Only check simulated MVP if simulation mode is on
            if (simData && simData.enabled && simData.showMVP) {
                if (!this.stateManager.getSimMVPState()) {
                    // Just turned on - show MVP
                    this.mvpView.show(this.simulationManager.getSimulatedMVPData());
                    this.stateManager.setSimMVPState(true);
                }
            } else {
                if (this.stateManager.getSimMVPState()) {
                    // Just turned off - hide MVP
                    this.mvpView.hide();
                    this.stateManager.setSimMVPState(false);
                }
            }
        } catch (error) {
            // Silent fail for simulation MVP checks (non-critical feature)
            console.warn('[AppController] Simulation MVP check failed:', error.message || error);
        }
    }

}

