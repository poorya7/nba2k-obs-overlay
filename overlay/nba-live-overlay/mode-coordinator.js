/**
 * ModeCoordinator - Manages switching between CURRENT_GAME and OTHER_GAMES modes
 * Single Responsibility: Handle mode transitions and coordination
 * 
 * Extracted from AppController to reduce its complexity
 * 
 * @class
 * @param {Object} dependencies - Dependency injection object
 * @param {ApiClient} dependencies.api - Server API client
 * @param {NBAApi} dependencies.nbaApi - ESPN NBA API client
 * @param {GameView} dependencies.gameView - Game display view
 * @param {MvpView} dependencies.mvpView - MVP display view
 * @param {OtherGamesView} dependencies.otherGamesView - Other games view
 * @param {OtherGamesContainerView} dependencies.otherGamesContainerView - Container view
 * @param {StateManager} dependencies.stateManager - State management
 * @param {SimulationManager} dependencies.simulationManager - Simulation data
 * @param {GameDataFormatter} dependencies.gameDataFormatter - Data formatter
 * @param {UnifiedBoxAnimator} dependencies.unifiedBoxAnimator - Box animator
 */

class ModeCoordinator {
    /**
     * @param {Object} dependencies - Dependency injection object
     */
    constructor(dependencies) {
        // Validate dependencies
        if (!dependencies) {
            throw new Error('ModeCoordinator: dependencies object is required');
        }
        
        const required = ['api', 'nbaApi', 'gameView', 'mvpView', 'otherGamesView', 
                         'otherGamesContainerView', 'stateManager', 'simulationManager', 
                         'gameDataFormatter', 'unifiedBoxAnimator'];
        
        for (const dep of required) {
            if (!dependencies[dep]) {
                throw new Error(`ModeCoordinator: ${dep} dependency is required`);
            }
        }
        
        // Dependencies
        this.api = dependencies.api;
        this.nbaApi = dependencies.nbaApi;
        this.gameView = dependencies.gameView;
        this.mvpView = dependencies.mvpView;
        this.otherGamesView = dependencies.otherGamesView;
        this.otherGamesContainerView = dependencies.otherGamesContainerView;
        this.stateManager = dependencies.stateManager;
        this.simulationManager = dependencies.simulationManager;
        this.gameDataFormatter = dependencies.gameDataFormatter;
        this.unifiedBoxAnimator = dependencies.unifiedBoxAnimator;
        
        // Other games controller (initialized when needed)
        this.otherGamesController = null;
        
        // DOM element references
        this.currentGameBox = document.getElementById('currentGameBox');
        this.otherGamesBox = document.getElementById('otherGamesBox');
        this.currentGameContent = document.getElementById('currentGameContent');
        this.otherGamesContent = document.getElementById('otherGamesContent');
    }

    /**
     * Show other games mode
     * @param {string} selectedGameId - ID of selected game to exclude
     * @returns {Promise<void>}
     */
    async showOtherGamesMode(selectedGameId) {
        try {
            // DEFENSIVE: Clean up any existing controller first (prevent race conditions)
            if (this.otherGamesController) {
                this.otherGamesController.destroy();
                this.otherGamesController = null;
            }
            
            // Switch to other games mode
            this.stateManager.setMode('OTHER_GAMES');
            this.stateManager.markOtherGamesShownThisQuarter();

            // Hide MVP if showing
            this.mvpView.hide();

            // Check if simulation mode is enabled
            const simData = await this.api.getSimulation();
            const isSimMode = simData && simData.enabled;
            const timeMultiplier = isSimMode ? (simData.timeMultiplier || 1) : 1;

            let otherGames;
            
            if (isSimMode) {
                // Use sim games (mixed states)
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
                    .map(game => this.gameDataFormatter.transformGameDataForOtherGames(game));
            }

            if (otherGames.length === 0) {
                // No other games, return to current game mode
                this.returnToCurrentGameMode();
                return;
            }

            // Initialize other games controller FIRST (this sorts the games)
            this.otherGamesController = new OtherGamesController(
                this.otherGamesView,
                () => this.returnToCurrentGameMode(), // Callback when cycling completes
                isSimMode, // Pass sim mode flag
                timeMultiplier, // Pass time multiplier for fast forward
                this.unifiedBoxAnimator // Pass animator for page transitions
            );

            // Sort and get sorted games (don't render yet)
            const sortedGames = this.otherGamesController.sortGames(otherGames);
            
            // Render first page of SORTED games
            this.otherGamesView.renderGames(sortedGames, 0, 3);
            
            // Use hardcoded max height for the number of games on first page
            const gamesOnFirstPage = Math.min(3, sortedGames.length);
            const maxHeights = { 1: 156, 2: 316, 3: 476 };
            const newHeight = maxHeights[gamesOnFirstPage];

            // Set other games box height before showing
            if (this.otherGamesBox) {
                this.otherGamesBox.style.height = newHeight + 'px';
            }

            // Fade out current game box
            if (this.currentGameBox) {
                this.currentGameBox.style.transition = 'opacity 0.8s ease';
                this.currentGameBox.style.opacity = '0';
                await new Promise(resolve => setTimeout(resolve, 800));
                this.currentGameBox.style.display = 'none';
            }

            // Fade in other games box
            if (this.otherGamesBox) {
                this.otherGamesBox.style.display = 'block';
                this.otherGamesBox.style.opacity = '0';
                this.otherGamesContent.style.display = 'block';
                void this.otherGamesBox.offsetHeight;
                this.otherGamesBox.style.transition = 'opacity 0.8s ease';
                this.otherGamesBox.style.opacity = '1';
                await new Promise(resolve => setTimeout(resolve, 800));
            }

            // Start cycling with sorted games (skip first render since we already rendered above)
            this.otherGamesController.init(sortedGames, true);
        } catch (error) {
            // Controller error handling: log and return to current game
            console.error('[ModeCoordinator] Error in showOtherGamesMode:', error.message || error);
            this.returnToCurrentGameMode();
        }
    }

    /**
     * Cleanup other games mode (without showing current game)
     * Used when resetting or hiding everything (e.g., quarter change, no game selected)
     * @returns {void}
     */
    cleanupOtherGamesMode() {
        // Clean up other games controller
        if (this.otherGamesController) {
            this.otherGamesController.destroy();
            this.otherGamesController = null;
        }

        // Switch back to current game mode
        this.stateManager.setMode('CURRENT_GAME');
        
        // Hide other games box (no animation needed for emergency cleanup)
        if (this.otherGamesBox) {
            this.otherGamesBox.style.display = 'none';
            this.otherGamesBox.style.opacity = '0';
        }
    }

    /**
     * Return to current game mode (full transition with show)
     * Used when transitioning back from other games
     * @returns {Promise<void>}
     */
    async returnToCurrentGameMode() {
        // Clean up controller timers first (before transition)
        if (this.otherGamesController) {
            this.otherGamesController.destroy();
            this.otherGamesController = null;
        }
        
        // Switch state
        this.stateManager.setMode('CURRENT_GAME');
        
        // Fade out other games box
        if (this.otherGamesBox) {
            this.otherGamesBox.style.transition = 'opacity 0.8s ease';
            this.otherGamesBox.style.opacity = '0';
            await new Promise(resolve => setTimeout(resolve, 800));
            this.otherGamesBox.style.display = 'none';
        }
        
        // Clear game data cache to force re-render with fresh data
        // Don't show current game box here - let normal update cycle show it with fresh data
        this.stateManager.setGameData(null);
    }

    /**
     * Update time multiplier in other games controller (for fast forward)
     * @param {number} newMultiplier - New time multiplier value
     * @returns {void}
     */
    updateTimeMultiplier(newMultiplier) {
        if (this.otherGamesController) {
            this.otherGamesController.updateTimeMultiplier(newMultiplier);
        }
    }

    /**
     * Clean up (called when app stops)
     * @returns {void}
     */
    destroy() {
        this.cleanupOtherGamesMode();
    }
}

