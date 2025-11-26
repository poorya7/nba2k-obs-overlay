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
        this.stateManager = dependencies.stateManager;
        this.simulationManager = dependencies.simulationManager;

        // Configuration
        this.updateInterval = 3000; // 3 seconds
        this.simMVPCheckInterval = 1000; // 1 second
        
        // Timers
        this.updateTimer = null;
        this.simMVPTimer = null;
    }

    /**
     * Start the overlay (call once on page load)
     */
    start() {
        // Initial update
        this.updateFromAPI();

        // Auto-refresh every 3 seconds
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

            if (simData && simData.enabled) {
                const fakeGame = this.simulationManager.generateGameData(simData.state);
                this.detectStateAndUpdate(fakeGame);
                return;
            }

            // Step 2: Get selected game ID from server
            const data = await this.api.getSelectedGame();
            if (!data) {
                throw new Error('Failed to fetch selection');
            }

            const selectedGameId = data.gameId;

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

            // Step 2.5: Check quarter tracking
            const quarterData = await this.api.getQuarter();

            if (!this.shouldShowOverlayBasedOnQuarter(quarterData)) {
                // Hide overlay and reset (but keep game tracking)
                this.resetAndHideOverlay();
                this.stateManager.resetOverlayShown();
                return;
            }

            // Quarter active - show overlay

            // Step 3: Fetch game data from ESPN API
            const game = await this.nbaApi.getGameById(selectedGameId);

            if (!game) {
                this.resetAndHideOverlay();
                return;
            }

            // Step 4: Auto-detect state and update view
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
        this.stateManager.reset();
    }

    /**
     * Check if overlay should be shown based on quarter tracking
     * @param {Object} quarterData - Quarter tracking data from server
     * @returns {boolean}
     */
    shouldShowOverlayBasedOnQuarter(quarterData) {
        if (!quarterData.current || !quarterData.startTime) {
            return false;
        }

        // Only apply 10-second delay if overlay hasn't been shown yet
        if (!this.stateManager.isOverlayShown()) {
            // Only check delay for Q1 (first quarter of the game)
            if (quarterData.current === 'Q1') {
                const timeSinceStart = Date.now() - quarterData.startTime;
                const SHOW_DELAY = 10000; // 10 seconds

                if (timeSinceStart < SHOW_DELAY) {
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

        // Format data for GameView
        const formattedData = this.formatGameDataForView(game, stateName);

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
                    // Scores changed in live state - slide animation for scores
                    this.gameView.updateScore('home', homeScore, true);
                    this.gameView.updateScore('away', awayScore, true);
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
     * @returns {Object}
     */
    formatGameDataForView(game, stateName) {
        // Base team data (used by all states)
        const baseData = {
            home: {
                abbr: game.homeTeam.abbreviation,
                logoUrl: game.homeTeam.logo,
                score: parseInt(game.homeTeam.score) || 0
            },
            away: {
                abbr: game.awayTeam.abbreviation,
                logoUrl: game.awayTeam.logo,
                score: parseInt(game.awayTeam.score) || 0
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
}

