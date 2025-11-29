/**
 * OtherGamesController - Manages cycling and timing for other games overlay
 * Handles business logic, API integration, and display timing
 */

class OtherGamesController {
    constructor(view, onComplete = null, isSimulationMode = false, timeMultiplier = 1, unifiedBoxAnimator = null) {
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
        this.unifiedBoxAnimator = unifiedBoxAnimator;
        
        // Timing calculated dynamically based on games count per page
        this.cycleInterval = null;
        this.countdownInterval = null;
        this.onComplete = onComplete; // Callback when all sets shown
        
        // DOM reference for games container
        this.gamesContainer = document.getElementById('games-container');
        
        // Hardcoded max heights for each game count (measured from all-live games)
        // This prevents tiny resizes when going from 3 games to 3 games with different states
        this.maxHeightCache = {
            1: 156,  // 1 live game
            2: 316,  // 2 live games
            3: 476   // 3 live games
        };
    }

    /**
     * Sort games by priority: FINAL -> LIVE -> PREGAME
     * Within each state, sort by start time (earliest first)
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
            // Sort by state priority first
            if (statePriority[a.state] !== statePriority[b.state]) {
                return statePriority[a.state] - statePriority[b.state];
            }
            
            // Within same state, sort by start time (earliest first)
            return (a.startTime || 0) - (b.startTime || 0);
        });
    }

    /**
     * Initialize controller with games data
     * @param {Array} games - Array of game objects
     * @param {boolean} skipFirstRender - Skip rendering first set (already rendered for measurement)
     */
    init(games, skipFirstRender = false) {
        this.games = this.sortGames(games);
        this.currentSet = 0; // Reset to first set
        
        // Render first set only if not already rendered
        if (!skipFirstRender) {
            this.view.renderGames(this.games, 0, this.gamesPerSet);
        }
        
        // Heights are now hardcoded in constructor - no need to measure first page
        
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
            // Stop cycling and return to current game
            this.stopCycle();
            this.stopCountdown();
            if (this.onComplete) {
                this.onComplete();
            }
            return;
        }
        
        // Calculate next page index
        const startIndex = nextSetIndex * this.gamesPerSet;
        
        // Use animator if available, otherwise fallback to simple fade
        if (this.unifiedBoxAnimator && this.gamesContainer) {
            // Calculate how many games are on this page
            const gamesOnThisPage = Math.min(this.gamesPerSet, this.games.length - startIndex);
            
            // Use hardcoded max height for this game count (no measuring needed!)
            const newHeight = this.maxHeightCache[gamesOnThisPage];
            
            // Check if we need to resize (or if we're already at the correct height)
            const box = document.querySelector('.other-games-box');
            const currentHeight = parseInt(box.style.height) || 180;
            const needsResize = currentHeight !== newHeight;
            
            if (needsResize) {
                // NUMBER OF GAMES CHANGED - Do full resize animation
                const heightDifference = Math.abs(newHeight - currentHeight);
                const TIMING = UnifiedBoxAnimator.TIMING;
                const resizeDuration = Math.min(
                    (heightDifference / TIMING.RESIZE_MAX_HEIGHT_DIFF) * TIMING.RESIZE_MAX_DURATION,
                    TIMING.RESIZE_MAX_DURATION
                );
                const finalResizeDuration = Math.round(resizeDuration / 10) * 10;
                
                // Fade out + resize (staggered)
                const fadeOutPromise = this.unifiedBoxAnimator.fadeOutContent(this.gamesContainer);
                const resizePromise = new Promise(resolve => {
                    setTimeout(async () => {
                        await this.unifiedBoxAnimator.resizeBox(newHeight);
                        resolve();
                    }, 200);
                });
                
                // After fade-out: render new content, wait, then fade in
                await fadeOutPromise;
                this.currentSet = nextSetIndex; // Update current page index!
                this.view.renderGames(this.games, startIndex, this.gamesPerSet);
                await new Promise(r => setTimeout(r, 200));
                
                // Fade-in with same duration as resize
                const fadeInPromise = this.unifiedBoxAnimator.fadeInContent(this.gamesContainer, finalResizeDuration);
                await Promise.all([resizePromise, fadeInPromise]);
            } else {
                // SAME NUMBER OF GAMES - No resize! Just fade content
                const fadeOutPromise = this.unifiedBoxAnimator.fadeOutContent(this.gamesContainer);
                
                // After fade-out: render new content and fade in
                await fadeOutPromise;
                this.currentSet = nextSetIndex; // Update current page index!
                this.view.renderGames(this.games, startIndex, this.gamesPerSet);
                
                // Use fixed 800ms fade-in (matches typical resize duration)
                await this.unifiedBoxAnimator.fadeInContent(this.gamesContainer, 800);
            }
        } else {
            // Fallback: simple fade without resize (shouldn't happen in production)
            await this.view.fadeOut(200);
            this.currentSet = nextSetIndex;
            this.view.renderGames(this.games, startIndex, this.gamesPerSet);
            await this.view.fadeIn(200);
        }
        
        // Restart cycle with new page duration (each page can have different timing based on games count)
        this.startCycle();
    }

    /**
     * Calculate display duration based on number of games on current page
     * @returns {number} Duration in milliseconds
     */
    calculateCurrentPageDuration() {
        const startIndex = this.currentSet * this.gamesPerSet;
        const gamesOnThisPage = Math.min(this.gamesPerSet, this.games.length - startIndex);
        
        // Base duration: TESTING: 5 seconds for 3 games (ORIGINAL: 13000 = 13 seconds)
        const baseDuration = 5000 / this.timeMultiplier;
        
        // Proportional: 1 game = 1/3, 2 games = 2/3, 3 games = full
        return Math.round((baseDuration / 3) * gamesOnThisPage);
    }

    /**
     * Start automatic cycling through game sets
     */
    startCycle() {
        if (this.cycleInterval) {
            clearTimeout(this.cycleInterval);
        }
        
        // Calculate duration for current page based on games count
        const duration = this.calculateCurrentPageDuration();
        
        // Use setTimeout (not setInterval) so each page can have different duration
        this.cycleInterval = setTimeout(() => this.nextSet(), duration);
    }

    /**
     * Stop automatic cycling
     */
    stopCycle() {
        if (this.cycleInterval) {
            clearTimeout(this.cycleInterval);
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
        
        // Restart cycle with new timing (duration recalculated based on current page)
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

