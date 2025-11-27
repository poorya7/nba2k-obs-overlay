/**
 * AppController - Main orchestration for the game overlay
 * Single Responsibility: Coordinate between data sources, state, and views
 * 
 * This class extracts the massive <script> block from index.html
 * USES existing working utilities from gameUtils.js (detectGameState, formatCountdown, etc.)
 */

class AppController {
    constructor(dependencies) {
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

        // Configuration
        this.baseUpdateInterval = 3000; // 3 seconds base
        this.updateInterval = 3000; // Current interval (adjusted for time multiplier)
        this.simMVPCheckInterval = 1000; // 1 second
        this.lastTimeMultiplier = 1; // Track multiplier changes
        
        // Timers
        this.updateTimer = null;
        this.simMVPTimer = null;
        
        // Other games controller (initialized when needed)
        this.otherGamesController = null;
    }

    /**
     * Start the overlay (call once on page load)
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
            
            // Get time multiplier for fast forward
            const timeMultiplier = isSimMode ? (simData.timeMultiplier || 1) : 1;
            
            // Track multiplier for calculations
            if (timeMultiplier !== this.lastTimeMultiplier) {
                this.lastTimeMultiplier = timeMultiplier;
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
            if (this.stateManager.shouldShowOtherGames(quarterData, timeMultiplier)) {
                await this.showOtherGamesMode(selectedGameId);
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
                game = this.simulationManager.generateGameData(simData.state);
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
            console.error('ERROR in updateFromAPI:', error);
            this.resetAndHideOverlay();
        }
    }

    /**
     * Reset overlay state and hide everything
     */
    resetAndHideOverlay() {
        this.gameView.hide();
        this.mvpView.hide();
        this.mvpIntegration.clearMVPCache();
        
        // Hide other games overlay
        const otherGamesOverlay = document.getElementById('other-games');
        if (otherGamesOverlay) {
            otherGamesOverlay.style.display = 'none';
        }
        if (this.otherGamesController) {
            this.otherGamesController.destroy();
            this.otherGamesController = null;
        }
        
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
                const acceleratedTime = realTimeSinceStart * timeMultiplier;
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
        // USES existing utility from gameUtils.js
        const stateName = window.detectGameState(game);

        // Extract current scores
        const currentHomeScore = parseInt(game.homeTeam.score) || 0;
        const currentAwayScore = parseInt(game.awayTeam.score) || 0;
        
        // Check if scores changed
        const scoreChanges = this.stateManager.hasScoresChanged(currentHomeScore, currentAwayScore);

        // Format data for GameView (with animation flags)
        const formattedData = this.formatGameDataForView(game, stateName, scoreChanges);

        // Update stored scores
        this.stateManager.updateScores(currentHomeScore, currentAwayScore);

        // Create comparison keys for different types of changes
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

        const fullKey = stateKey + scoreKey;

        // Manage countdown interval for pregame state
        if (stateName === 'pregame') {
            if (!this.stateManager.isCountdownActive()) {
                // Start countdown interval that ticks every second
                this.stateManager.startCountdown((seconds) => {
                    if (seconds > 0) {
                        // USES existing utility from gameUtils.js
                        this.gameView.updateCountdown(window.formatCountdown(seconds));
                    } else {
                        // Countdown finished, trigger API update to check if game started
                        this.stateManager.stopCountdown();
                        this.updateFromAPI();
                    }
                });
            }
        } else {
            // Not pregame - clear countdown interval if it exists
            this.stateManager.stopCountdown();
        }

        // Check what changed
        if (!this.stateManager.hasGameDataChanged(fullKey)) {
            return; // Nothing changed
        }

        if (this.stateManager.lastGameData === null) {
            // First load - show instantly without animation
            this.gameView.show();
            this.gameView.switchToState(stateName, formattedData);
            this.stateManager.setGameData(fullKey);

            // Initialize MVP controller with initial state
            this.stateManager.setGameState(stateName);
            this.mvpIntegration.notifyMVPStateChange(
                this.mvpController,
                this.mvpView,
                stateName,
                gameId
            );
        } else {
            // Something changed - determine what
            const lastStateKey = this.stateManager.lastGameData.split('}')[0] + '}';
            const lastScoreKey = this.stateManager.lastGameData.split('}')[1] + '}';

            const stateChanged = stateKey !== lastStateKey;
            const scoresChanged = scoreKey !== lastScoreKey;

            if (stateChanged) {
                // State changed - switch directly without animation
                this.gameView.switchToState(stateName, formattedData);

                // Notify MVP controller of state change
                if (this.stateManager.hasGameStateChanged(stateName)) {
                    this.stateManager.setGameState(stateName);
                    this.mvpIntegration.notifyMVPStateChange(
                        this.mvpController,
                        this.mvpView,
                        stateName,
                        gameId
                    );
                }
            } else if (scoresChanged) {
                // Teams or scores changed
                const teamsChanged = (lastScoreKey.includes(homeAbbr) === false) ||
                    (lastScoreKey.includes(awayAbbr) === false);

                if (teamsChanged) {
                    // Teams changed - switch state to update everything
                    this.gameView.switchToState(stateName, formattedData);

                    // Game changed - notify MVP controller (even if state didn't change)
                    this.stateManager.setGameState(stateName);
                    this.mvpIntegration.notifyMVPStateChange(
                        this.mvpController,
                        this.mvpView,
                        stateName,
                        gameId
                    );
                } else if (stateName === 'live') {
                    // Scores changed in live state - use animate flags from formattedData
                    this.gameView.updateScore('home', homeScore, formattedData.home.animate);
                    this.gameView.updateScore('away', awayScore, formattedData.away.animate);
                    // Also update time silently
                    if (formattedData.time) {
                        const statusElement = document.querySelector('[data-status]');
                        if (statusElement) {
                            statusElement.textContent = `${formattedData.quarter} · ${formattedData.time}`;
                        }
                    }
                } else {
                    // Scores changed in other states (halftime/final) - update without animation
                    this.gameView.updateScore('home', homeScore, false);
                    this.gameView.updateScore('away', awayScore, false);
                }
            } else {
                // Only time changed - update time silently
                if (stateName === 'live' && formattedData.time) {
                    const statusElement = document.querySelector('[data-status]');
                    if (statusElement) {
                        statusElement.textContent = `${formattedData.quarter} · ${formattedData.time}`;
                    }
                }
            }
        }

        // Update tracking
        this.stateManager.setGameData(fullKey);
    }

    /**
     * Format ESPN API game data for GameView
     * USES existing utilities from gameUtils.js
     * @param {Object} game - ESPN game data
     * @param {string} stateName - Game state
     * @param {Object} scoreChanges - { homeChanged, awayChanged }
     * @returns {Object}
     */
    formatGameDataForView(game, stateName, scoreChanges = { homeChanged: false, awayChanged: false }) {
        // Base team data (used by all states)
        const baseData = {
            home: {
                abbr: game.homeTeam.abbreviation,
                logoUrl: game.homeTeam.logo,
                score: parseInt(game.homeTeam.score) || 0,
                animate: scoreChanges.homeChanged // Add animation flag
            },
            away: {
                abbr: game.awayTeam.abbreviation,
                logoUrl: game.awayTeam.logo,
                score: parseInt(game.awayTeam.score) || 0,
                animate: scoreChanges.awayChanged // Add animation flag
            }
        };

        // State-specific formatting
        switch (stateName) {
            case 'pregame':
                // USES existing utility from gameUtils.js
                const secondsUntilGame = window.calculateSecondsUntilStart(game.date);

                // Update state manager's countdown seconds
                this.stateManager.setCountdownSeconds(secondsUntilGame);

                // USES existing utility from gameUtils.js
                return {
                    homeTeam: baseData.home,
                    awayTeam: baseData.away,
                    countdown: window.formatCountdown(secondsUntilGame)
                };

            case 'live':
                // USES existing utility from gameUtils.js
                const liveStatus = window.formatLiveGameStatus(game.statusText);
                return {
                    ...baseData,
                    quarter: liveStatus.quarter,
                    time: liveStatus.time
                };

            case 'halftime':
            case 'final':
                return baseData;

            default:
                return baseData;
        }
    }

    /**
     * Check if simulated MVP should be shown (controlled by dashboard)
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
        } catch (e) {
            // Ignore errors
        }
    }

    /**
     * Show other games mode
     * @param {string} selectedGameId - ID of selected game to exclude
     */
    async showOtherGamesMode(selectedGameId) {
        // Switch to other games mode
        this.stateManager.setMode('OTHER_GAMES');
        this.stateManager.markOtherGamesShownThisQuarter();

        // Hide current game overlay
        this.gameView.hide();
        this.mvpView.hide();

        // Check if simulation mode is enabled
        const simData = await this.api.getSimulation();
        const isSimMode = simData && simData.enabled;
        const timeMultiplier = isSimMode ? (simData.timeMultiplier || 1) : 1;

        let otherGames;
        
        if (isSimMode) {
            // Use sim games
            otherGames = this.simulationManager.getSampleGames();
        } else {
            // Fetch all today's games
            const allGames = await this.nbaApi.getTodaysGames();
            if (!allGames || allGames.length === 0) {
                // No games, return to current game mode
                this.returnToCurrentGameMode();
                return;
            }

            // Filter out the selected game and transform
            otherGames = allGames
                .filter(game => game.id !== selectedGameId)
                .map(game => this.transformGameDataForOtherGames(game));
        }

        if (otherGames.length === 0) {
            // No other games, return to current game mode
            this.returnToCurrentGameMode();
            return;
        }

        // Show other games overlay
        const otherGamesOverlay = document.getElementById('other-games');
        if (otherGamesOverlay) {
            otherGamesOverlay.style.display = 'block';
            otherGamesOverlay.style.opacity = '1';
        }

        // Initialize other games controller with callback
        this.otherGamesController = new OtherGamesController(
            this.otherGamesView,
            () => this.returnToCurrentGameMode(), // Callback when cycling completes
            isSimMode, // Pass sim mode flag
            timeMultiplier // Pass time multiplier for fast forward
        );

        // Start cycling
        this.otherGamesController.init(otherGames);
    }

    /**
     * Return to current game mode
     */
    returnToCurrentGameMode() {
        // Hide other games overlay
        const otherGamesOverlay = document.getElementById('other-games');
        if (otherGamesOverlay) {
            otherGamesOverlay.style.opacity = '0';
            setTimeout(() => {
                otherGamesOverlay.style.display = 'none';
            }, 300);
        }

        // Clean up other games controller
        if (this.otherGamesController) {
            this.otherGamesController.destroy();
            this.otherGamesController = null;
        }

        // Switch back to current game mode
        this.stateManager.setMode('CURRENT_GAME');

        // Show current game overlay again (will be updated on next API poll)
        this.gameView.show();
    }

    /**
     * Transform game data for other games view
     * Uses same logic as other-games-overlay
     */
    transformGameDataForOtherGames(game) {
        const state = window.detectGameState(game);
        
        const baseGame = {
            state: state,
            away: {
                logo: game.awayTeam.logo,
                abbr: game.awayTeam.abbreviation,
                score: parseInt(game.awayTeam.score) || 0
            },
            home: {
                logo: game.homeTeam.logo,
                abbr: game.homeTeam.abbreviation,
                score: parseInt(game.homeTeam.score) || 0
            }
        };
        
        if (state === 'pregame') {
            baseGame.secondsUntilStart = window.calculateSecondsUntilStart(game.date);
        } else if (state === 'live') {
            baseGame.quarter = window.formatLiveGameStatus(game.statusText).formatted;
        } else if (state === 'halftime') {
            baseGame.quarter = 'Halftime';
        } else if (state === 'final') {
            baseGame.status = 'FINAL';
        }
        
        return baseGame;
    }
}

