/**
 * OtherGamesController - Manages cycling and timing for other games overlay
 * Handles business logic, API integration, and display timing
 */

class OtherGamesController {
    constructor(view, onComplete = null, isSimulationMode = false, timeMultiplier = 1) {
        // Validate dependencies
        if (!view) {
            throw new Error('OtherGamesController: view is required');
        }
        
        this.view = view;
        this.games = [];
        this.currentSet = 0;
        this.gamesPerSet = 3;
        this.isSimulationMode = isSimulationMode;
        this.timeMultiplier = timeMultiplier;
        
        // Timing: Base times divided by multiplier for fast forward
        const baseDuration = isSimulationMode ? 12000 : 18000;
        this.displayDuration = baseDuration / timeMultiplier; // Faster with FF
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
            // Stop cycling and hide overlay
            this.stopCycle();
            this.stopCountdown();
            if (this.onComplete) {
                this.onComplete();
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
     * Update time multiplier (for fast forward toggle mid-cycle)
     * @param {number} newMultiplier - New time multiplier value
     */
    updateTimeMultiplier(newMultiplier) {
        if (newMultiplier === this.timeMultiplier) {
            return; // No change needed
        }
        
        this.timeMultiplier = newMultiplier;
        
        // Recalculate display duration
        const baseDuration = this.isSimulationMode ? 12000 : 18000;
        this.displayDuration = baseDuration / this.timeMultiplier;
        
        // Restart cycle with new timing
        if (this.cycleInterval) {
            this.stopCycle();
            this.startCycle();
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

