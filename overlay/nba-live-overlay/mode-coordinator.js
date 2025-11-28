/**
 * ModeCoordinator - Manages switching between CURRENT_GAME and OTHER_GAMES modes
 * Single Responsibility: Handle mode transitions and coordination
 * 
 * Extracted from AppController to reduce its complexity
 */

class ModeCoordinator {
    constructor(dependencies) {
        // Validate dependencies
        if (!dependencies) {
            throw new Error('ModeCoordinator: dependencies object is required');
        }
        
        const required = ['api', 'nbaApi', 'gameView', 'mvpView', 'otherGamesView', 
                         'otherGamesContainerView', 'stateManager', 'simulationManager', 
                         'gameDataFormatter'];
        
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
        
        // Other games controller (initialized when needed)
        this.otherGamesController = null;
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
                .map(game => this.gameDataFormatter.transformGameDataForOtherGames(game));
        }

        if (otherGames.length === 0) {
            // No other games, return to current game mode
            this.returnToCurrentGameMode();
            return;
        }

        // Show other games overlay
        this.otherGamesContainerView.show();

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
     * Cleanup other games mode (without showing current game)
     * Used when resetting or hiding everything
     */
    cleanupOtherGamesMode() {
        // Hide other games overlay
        this.otherGamesContainerView.hide();

        // Clean up other games controller
        if (this.otherGamesController) {
            this.otherGamesController.destroy();
            this.otherGamesController = null;
        }

        // Switch back to current game mode
        this.stateManager.setMode('CURRENT_GAME');
    }

    /**
     * Return to current game mode (full transition with show)
     * Used when transitioning back from other games
     */
    returnToCurrentGameMode() {
        this.cleanupOtherGamesMode();
        
        // Show current game overlay again (will be updated on next API poll)
        this.gameView.show();
    }

    /**
     * Clean up (called when app stops)
     */
    destroy() {
        this.cleanupOtherGamesMode();
    }
}

