/**
 * OtherGamesController - Manages cycling and timing for other games overlay
 * Handles business logic, API integration, and display timing
 */

class OtherGamesController {
    constructor(view, onComplete = null, isSimulationMode = false) {
        this.view = view;
        this.games = [];
        this.currentSet = 0;
        this.gamesPerSet = 3;
        this.isSimulationMode = isSimulationMode;
        
        // Timing: Fast for simulation, slow for production
        this.displayDuration = isSimulationMode ? 12000 : 18000; // 12s sim, 18s production
        this.fadeDuration = 200; // 0.2 seconds
        this.cycleInterval = null;
        this.countdownInterval = null;
        this.onComplete = onComplete; // Callback when all sets shown
    }

    /**
     * Sort games by priority: FINAL -> LIVE -> PREGAME
     * @param {Array} games - Unsorted games array
     * @returns {Array} Sorted games array
     */
    sortGames(games) {
        const statePriority = {
            'final': 1,
            'live': 2,
            'pregame': 3
        };
        
        return [...games].sort((a, b) => {
            // Sort by state priority
            if (statePriority[a.state] !== statePriority[b.state]) {
                return statePriority[a.state] - statePriority[b.state];
            }
            
            // Keep original order within same state
            return 0;
        });
    }

    /**
     * Initialize controller with games data
     * @param {Array} games - Array of game objects
     */
    init(games) {
        this.games = this.sortGames(games);
        this.currentSet = 0; // Reset to first set
        
        // Render first set
        this.view.renderGames(this.games, 0, this.gamesPerSet);
        
        // Start cycling and countdown
        this.startCycle();
        this.startCountdown();
    }

    /**
     * Move to next set of games
     */
    async nextSet() {
        const totalSets = Math.ceil(this.games.length / this.gamesPerSet);
        const nextSetIndex = this.currentSet + 1;
        
        // Check if we've shown all sets
        if (nextSetIndex >= totalSets) {
            if (this.isSimulationMode) {
                // Simulation mode: Loop back to start
                await this.view.fadeOut(this.fadeDuration);
                this.currentSet = 0;
                this.view.renderGames(this.games, 0, this.gamesPerSet);
                await this.view.fadeIn(this.fadeDuration);
            } else {
                // Production mode: Stop cycling and hide overlay
                this.stopCycle();
                this.stopCountdown();
                if (this.onComplete) {
                    this.onComplete();
                }
            }
            return;
        }
        
        // Continue to next set
        await this.view.fadeOut(this.fadeDuration);
        this.currentSet = nextSetIndex;
        this.view.renderGames(this.games, this.currentSet * this.gamesPerSet, this.gamesPerSet);
        await this.view.fadeIn(this.fadeDuration);
    }

    /**
     * Start automatic cycling through game sets
     */
    startCycle() {
        if (this.cycleInterval) {
            clearInterval(this.cycleInterval);
        }
        this.cycleInterval = setInterval(() => this.nextSet(), this.displayDuration);
    }

    /**
     * Stop automatic cycling
     */
    stopCycle() {
        if (this.cycleInterval) {
            clearInterval(this.cycleInterval);
            this.cycleInterval = null;
        }
    }

    /**
     * Start countdown timer (updates every second)
     */
    startCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        this.countdownInterval = setInterval(() => {
            this.view.updateCountdowns(this.games);
        }, 1000);
    }

    /**
     * Stop countdown timer
     */
    stopCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }

    /**
     * Clean up timers
     */
    destroy() {
        this.stopCycle();
        this.stopCountdown();
    }
}

