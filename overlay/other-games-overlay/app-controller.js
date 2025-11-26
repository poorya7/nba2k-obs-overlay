// ==================== APP CONTROLLER ====================
// Main orchestrator for other games overlay
// Uses existing working utilities - not reinventing the wheel

class AppController {
    constructor({ api, nbaApi, view, stateManager, simulationManager }) {
        this.api = api;
        this.nbaApi = nbaApi;
        this.view = view;
        this.stateManager = stateManager;
        this.simulationManager = simulationManager;
        
        this.otherGamesController = null;
        this.updateInterval = null;
    }
    
    /**
     * Start the overlay application
     */
    start() {
        // Initial update
        this.updateFromAPI();
        
        // Start polling every 5 seconds
        this.updateInterval = setInterval(() => this.updateFromAPI(), 5000);
    }
    
    /**
     * Stop the overlay application
     */
    stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        if (this.otherGamesController) {
            this.otherGamesController.destroy();
        }
    }
    
    /**
     * Show overlay with fade-in animation
     */
    showOverlay() {
        const overlay = document.querySelector('.other-games-overlay');
        if (!overlay || this.stateManager.isOverlayVisible()) return;
        
        // Set to display block but transparent
        overlay.style.display = 'block';
        overlay.style.opacity = '0';
        
        // Force reflow
        void overlay.offsetWidth;
        
        // Fade in
        overlay.style.transition = 'opacity 0.3s ease-in';
        overlay.style.opacity = '1';
        
        this.stateManager.setOverlayVisible(true);
    }
    
    /**
     * Hide overlay with fade-out animation
     */
    hideOverlay() {
        const overlay = document.querySelector('.other-games-overlay');
        if (!overlay || !this.stateManager.isOverlayVisible()) return;
        
        // Fade out
        overlay.style.transition = 'opacity 0.3s ease-out';
        overlay.style.opacity = '0';
        
        // After fade completes, set display none
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
        
        this.stateManager.setOverlayVisible(false);
        if (this.otherGamesController) {
            this.otherGamesController.stopCycle();
            this.otherGamesController.stopCountdown();
        }
    }
    
    /**
     * Fetch and update other games data
     */
    async updateFromAPI() {
        try {
            // Check if simulation mode is enabled
            const simState = await this.api.getSimulation();
            const simEnabled = simState && simState.enabled;
            
            // Get selected game ID (even in sim mode, track it for changes)
            const selectionData = await this.api.getSelectedGame();
            const selectedGameId = selectionData ? selectionData.gameId : null;
            
            // Detect simulation mode changes - reset overlay if changed
            if (this.stateManager.hasSimulationStateChanged(simEnabled)) {
                this.hideOverlay();
                this.stateManager.updateSimulationState(simEnabled);
                this.stateManager.resetQuarterTracking(); // Allow it to show again
                // Wait for hide animation to complete before showing again
                setTimeout(() => {
                    this.updateFromAPI(); // Trigger immediate reload with new mode
                }, 400); // 300ms fade + 100ms buffer
                return; // Exit this cycle, let the setTimeout handle the reload
            }
            
            // Detect selected game changes - reset overlay if changed
            if (this.stateManager.hasSelectedGameChanged(selectedGameId)) {
                this.hideOverlay();
                this.stateManager.updateSelectedGame(selectedGameId);
                this.stateManager.resetQuarterTracking(); // Allow it to show again
                // Wait for hide animation to complete before showing again
                setTimeout(() => {
                    this.updateFromAPI(); // Trigger immediate reload with new game
                }, 400); // 300ms fade + 100ms buffer
                return; // Exit this cycle, let the setTimeout handle the reload
            }
            
            // If overlay is already showing, let it finish cycling - don't interrupt it
            if (this.stateManager.isOverlayVisible()) {
                return;
            }
            
            // Determine if overlay should be visible
            let shouldShow;
            if (simEnabled) {
                // In simulation mode, always show (bypass timing checks)
                shouldShow = true;
            } else {
                // In real mode, check quarter timing
                const quarterData = await this.api.getQuarter();
                shouldShow = this.shouldShowOverlay(quarterData);
            }
            
            if (!shouldShow) {
                return; // Not time to show yet
            }
            
            let formattedGames;
            
            if (simEnabled) {
                // SIMULATION MODE: Use sample games
                formattedGames = this.simulationManager.getSampleGames();
            } else {
                // REAL MODE: Fetch from ESPN API
                // Fetch all today's games
                const allGames = await this.nbaApi.getTodaysGames();
                
                // Filter out the selected game
                const otherGames = allGames.filter(game => game.id !== selectedGameId);
                
                if (otherGames.length === 0) {
                    return; // No other games to show
                }
                
                // Transform API data to view format
                formattedGames = otherGames.map(game => this.transformGameData(game));
            }
            
            if (formattedGames.length === 0) {
                return; // No games to show
            }
            
            // Show overlay (we only reach here if !overlayVisible and shouldShow is true)
            this.showOverlay();
            this.stateManager.markAsShownForCurrentQuarter(); // Mark as shown for this quarter
            
            // Create new controller with completion callback and simulation mode flag
            this.otherGamesController = new OtherGamesController(this.view, () => this.hideOverlay(), simEnabled);
            this.otherGamesController.init(formattedGames);
            
        } catch (error) {
            // Silently handle errors
        }
    }
    
    /**
     * Check if overlay should be shown based on quarter timing
     */
    shouldShowOverlay(quarterData) {
        if (!quarterData || !quarterData.current || !quarterData.startTime) {
            this.stateManager.resetQuarterTracking();
            return false;
        }
        
        const timeSinceQuarterStart = Date.now() - quarterData.startTime;
        
        // Track quarter changes - reset flag when quarter changes
        this.stateManager.updateQuarterTracking(quarterData.startTime);
        
        // Don't show if we've already shown it for this quarter
        if (this.stateManager.hasShownThisQuarter()) {
            return false;
        }
        
        // Show overlay if enough time has passed since quarter start
        return timeSinceQuarterStart >= this.stateManager.getShowDelayMs();
    }
    
    /**
     * Transform ESPN API game data to view format
     */
    transformGameData(game) {
        // Use shared utility to determine state
        const state = detectGameState(game);
        
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
            // Use shared utility for countdown calculation
            baseGame.secondsUntilStart = calculateSecondsUntilStart(game.date);
        } else if (state === 'live') {
            // Use shared utility for formatting live status
            baseGame.quarter = formatLiveGameStatus(game.statusText).formatted;
        } else if (state === 'halftime') {
            // Halftime shows as text
            baseGame.quarter = 'Halftime';
        } else if (state === 'final') {
            baseGame.status = 'FINAL';
        }
        
        return baseGame;
    }
}

