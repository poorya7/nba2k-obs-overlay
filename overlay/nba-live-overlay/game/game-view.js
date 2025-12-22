/**
 * GameView - Handles all DOM updates for the game stats overlay
 * Single Responsibility: View layer only, no data fetching or business logic
 * 
 * Usage:
 *   const gameView = new GameView();
 *   gameView.transitionToState('live', gameData);
 *   gameView.updateScore('home', 85, true);
 *   gameView.hide(); // When no game selected
 * 
 * @class
 */

// Default animation for score changes
const DEFAULT_SCORE_ANIMATION = 'slide';

class GameView {
    /**
     * Format game status HTML (quarter above time)
     * Static method - can be called without instance
     * @param {string} quarter - Quarter (e.g., 'Q1', 'Q2', 'OT')
     * @param {string} time - Time remaining (e.g., '7:32')
     * @returns {string} HTML string
     */
    static formatStatusHTML(quarter, time) {
        return `<div>${quarter}</div><div>${time}</div>`;
    }

    /**
     * Initialize GameView and cache DOM elements
     * @param {UnifiedBoxAnimator} unifiedBoxAnimator - Box animator for height control
     */
    constructor(unifiedBoxAnimator = null) {
        // Cache DOM elements for performance
        this.elements = {
            homeAbbr: document.querySelector('[data-abbr="home"]'),
            awayAbbr: document.querySelector('[data-abbr="away"]'),
            homeLogo: document.querySelector('[data-logo="home"]'),
            awayLogo: document.querySelector('[data-logo="away"]'),
            homeScore: document.querySelector('[data-score="home"]'),
            awayScore: document.querySelector('[data-score="away"]'),
            gameStatus: document.querySelector('[data-status]'),
            teamsContainer: document.querySelector('.teams'),
            currentGameBox: document.getElementById('currentGameBox'),
            currentGameContent: document.getElementById('currentGameContent')
        };
        
        // Validate critical DOM elements exist
        if (!this.elements.currentGameBox) {
            throw new Error('GameView: #currentGameBox element not found in DOM');
        }
        if (!this.elements.currentGameContent) {
            throw new Error('GameView: #currentGameContent element not found in DOM');
        }
        if (!this.elements.teamsContainer) {
            throw new Error('GameView: .teams element not found in DOM');
        }
        
        this.currentState = null; // No default state - set by first API call
        this.isVisible = false;   // Track visibility
        this.transitionAnimator = new TransitionAnimator(); // Delegate complex transitions
        this.unifiedBoxAnimator = unifiedBoxAnimator; // For height control
        
        // Time tracking to prevent reverting to older times
        this.lastQuarterNum = 0;
        this.lastTimeSeconds = Infinity; // Start high so any time is "newer"
    }

    /**
     * Show the overlay (when game is selected) with fade in
     * Shows both the unified box and fades in the current game content
     * @returns {void}
     */
    show() {
        // Show current game box
        if (this.elements.currentGameBox) {
            this.elements.currentGameBox.style.display = 'block';
            // Fade in box
            this.elements.currentGameBox.style.transition = 'opacity 0.3s ease-in';
            this.elements.currentGameBox.style.opacity = '1';
        }
        
        // Show and fade in current game content
        if (this.elements.currentGameContent) {
            // Ensure it's visible
            this.elements.currentGameContent.style.display = 'block';
            
            // Fade in content
            this.elements.currentGameContent.style.transition = 'opacity 0.3s ease-in';
            this.elements.currentGameContent.style.opacity = '1';
        }
        
        this.isVisible = true;
    }

    /**
     * Measure and set the initial box height based on actual DOM content
     * Call this AFTER content is rendered (via switchToState) but BEFORE showing
     * @returns {void}
     */
    setInitialHeightFromContent() {
        // Current game box doesn't need explicit height - it grows naturally with content
        // Just make sure it's ready to display
        if (!this.elements.currentGameBox || !this.elements.currentGameContent) {
            return;
        }
        
        // Make elements visible but transparent so initial render is ready
        this.elements.currentGameBox.style.display = 'block';
        this.elements.currentGameBox.style.opacity = '0';
        this.elements.currentGameContent.style.display = 'block';
        this.elements.currentGameContent.style.opacity = '0';
        
        // Force browser to calculate layout
        void this.elements.currentGameContent.offsetHeight;
    }

    /**
     * Hide the overlay (when no game selected) with fade out
     * Hides both the content and the unified box
     * @param {boolean} force - If true, hide even if isVisible is false (for cleanup)
     * @returns {void}
     */
    hide(force = false) {
        if (this.isVisible || force) {
            // Fade out content first
            if (this.elements.currentGameContent) {
                this.elements.currentGameContent.style.transition = 'opacity 0.3s ease-out';
                this.elements.currentGameContent.style.opacity = '0';
            }
            
            // After fade completes, hide everything
            setTimeout(() => {
                if (this.elements.currentGameContent) {
                    this.elements.currentGameContent.style.display = 'none';
                }
                if (this.elements.currentGameBox) {
                    this.elements.currentGameBox.style.display = 'none';
                }
            }, force ? 0 : 300); // Instant hide if forced
            
            this.isVisible = false;
            this.currentState = null;
        }
    }

    /**
     * Validate state data has required fields
     * @param {string} stateName - State name
     * @param {Object} data - State data
     * @returns {boolean} True if valid
     */
    validateStateData(stateName, data) {
        if (!data) {
            return false;
        }

        switch (stateName) {
            case 'pregame':
                if (!data.homeTeam || !data.awayTeam) {
                    return false;
                }
                if (!data.homeTeam.abbr || !data.homeTeam.logoUrl || !data.awayTeam.abbr || !data.awayTeam.logoUrl) {
                    return false;
                }
                // countdown is optional
                return true;

            case 'live':
                if (!data.home || !data.away) {
                    return false;
                }
                if (!data.quarter || !data.time) {
                    return false;
                }
                return true;

            case 'halftime':
            case 'final':
                if (!data.home || !data.away) {
                    return false;
                }
                return true;

            default:
                return false;
        }
    }

    /**
     * Update a team's information
     * @param {string} team - 'home' or 'away'
     * @param {string} abbr - Team abbreviation (e.g., 'LAL')
     * @param {string} logoUrl - URL to team logo
     */
    updateTeam(team, abbr, logoUrl) {
        if (team !== 'home' && team !== 'away') {
            return;
        }

        const abbrElement = this.elements[`${team}Abbr`];
        const logoElement = this.elements[`${team}Logo`];

        // Update team name (works with both .team-name and .team-abbr for backwards compatibility)
        if (abbrElement) abbrElement.textContent = abbr;
        if (logoElement) {
            logoElement.src = logoUrl;
            logoElement.alt = abbr;
        }
    }

    /**
     * Update a team's score with optional animation
     * @param {string} team - 'home' or 'away'
     * @param {number} newScore - New score value
     * @param {boolean} animate - Whether to play animation
     * @param {string} animType - Animation type ('slide', 'glow', 'nba', 'bounce', etc.)
     */
    updateScore(team, newScore, animate = false, animType = DEFAULT_SCORE_ANIMATION) {
        if (team !== 'home' && team !== 'away') {
            return;
        }

        const scoreElement = this.elements[`${team}Score`];
        if (!scoreElement) return;

        const oldScore = parseInt(scoreElement.textContent) || 0;
        const shouldAnimate = animate && newScore > oldScore;

        if (shouldAnimate) {
            // Use special method for slide animation (needs old value)
            this.playScoreAnimationWithValue(scoreElement, animType, newScore);
        } else {
            // No animation - just update the text
            scoreElement.textContent = newScore;
        }
    }

    /**
     * Play animation on a score element
     * @param {HTMLElement} element - Score element to animate
     * @param {string} animType - Animation type
     */
    playScoreAnimation(element, animType = DEFAULT_SCORE_ANIMATION) {
        // Remove all animation classes
        const animClasses = ['anim-glow', 'anim-nba', 'anim-bounce', 'anim-flash', 
                            'anim-pop', 'anim-slide-in', 'anim-shake', 'anim-highlight'];
        element.classList.remove(...animClasses);
        
        if (animType === 'none') return;
        
        // Force reflow to restart animation
        void element.offsetWidth;
        
        // Add the selected animation
        element.classList.add('anim-' + animType);

        // Remove class after animation completes
        const duration = animType === 'highlight' ? 800 : 600;
        setTimeout(() => {
            element.classList.remove('anim-' + animType);
        }, duration);
    }

    /**
     * Play animation with a new value (useful for slide animation)
     * @param {HTMLElement} element - Score element to animate
     * @param {string} animType - Animation type
     * @param {number} newValue - New score value
     */
    playScoreAnimationWithValue(element, animType, newValue) {
        if (animType !== 'slide') {
            element.textContent = newValue;
            this.playScoreAnimation(element, animType);
            return;
        }

        // Special handling for slide animation (old slides out, new slides in)
        const rect = element.getBoundingClientRect();
        
        // Create clone for old score sliding out
        const clone = element.cloneNode(true);
        clone.style.position = 'absolute';
        clone.style.left = rect.left + 'px';
        clone.style.top = rect.top + 'px';
        clone.style.width = rect.width + 'px';
        clone.style.height = rect.height + 'px';
        clone.style.textAlign = 'right';
        clone.style.margin = '0';
        clone.style.zIndex = '1000';
        clone.classList.add('anim-slide-out');
        document.body.appendChild(clone);
        
        // Update element with new score and animate it in
        element.textContent = newValue;
        element.classList.add('anim-slide-in');
        
        // Clean up after animations complete (0.08s delay + 0.3s animation)
        setTimeout(() => {
            if (clone.parentNode) {
                document.body.removeChild(clone);
            }
            element.classList.remove('anim-slide-in');
            element.style.opacity = ''; // Reset opacity
        }, 400);
    }

    /**
     * Update game status (quarter and time) - used by state transitions
     * Always updates and resets time tracking (state changes are authoritative)
     * @param {string} quarter - Quarter (e.g., 'Q1', 'Q2', 'OT')
     * @param {string} time - Time remaining (e.g., '7:32')
     */
    updateGameStatus(quarter, time) {
        if (this.elements.gameStatus) {
            this.elements.gameStatus.innerHTML = GameView.formatStatusHTML(quarter, time);
        }
        // Update time tracking so subsequent updateStatusText calls compare correctly
        this.lastQuarterNum = this.parseQuarterToNumber(quarter);
        this.lastTimeSeconds = this.parseTimeToSeconds(time);
    }

    /**
     * Update both teams at once
     * @param {Object} homeTeam - {abbr, logoUrl}
     * @param {Object} awayTeam - {abbr, logoUrl}
     */
    updateBothTeams(homeTeam, awayTeam) {
        this.updateTeam('home', homeTeam.abbr, homeTeam.logoUrl);
        this.updateTeam('away', awayTeam.abbr, awayTeam.logoUrl);
    }

    /**
     * Update all game data at once
     * @param {Object} gameData - Complete game data object
     */
    /**
     * Update countdown timer (for pregame state)
     * @param {string} countdownText - Formatted countdown string (e.g., "02:15:34")
     */
    updateCountdown(countdownText) {
        // Update countdown in game status only (scores stay as 0)
        if (this.elements.gameStatus) {
            this.elements.gameStatus.textContent = `Game Starts In: ${countdownText}`;
        }
    }

    /**
     * Parse quarter string to comparable number
     * @param {string} quarter - Quarter string (e.g., 'Q1', 'Q2', 'OT', 'OT2')
     * @returns {number} Quarter as number (1-4 for quarters, 5+ for overtime)
     */
    parseQuarterToNumber(quarter) {
        if (!quarter) return 0;
        const q = quarter.toUpperCase().trim();
        if (q.startsWith('Q')) {
            return parseInt(q.substring(1)) || 0;
        }
        if (q.startsWith('OT')) {
            const otNum = parseInt(q.substring(2)) || 1;
            return 4 + otNum; // OT = 5, OT2 = 6, etc.
        }
        return 0;
    }

    /**
     * Parse time string to seconds remaining
     * @param {string} time - Time string (e.g., '7:32', '0:45.2')
     * @returns {number} Seconds remaining
     */
    parseTimeToSeconds(time) {
        if (!time) return Infinity;
        // Handle formats like "7:32" or "0:45.2"
        const parts = time.split(':');
        if (parts.length !== 2) return Infinity;
        const minutes = parseInt(parts[0]) || 0;
        const seconds = parseFloat(parts[1]) || 0;
        return minutes * 60 + seconds;
    }

    /**
     * Check if new time is newer (further along in game) than current
     * @param {string} newQuarter - New quarter
     * @param {string} newTime - New time
     * @returns {boolean} True if new time is newer
     */
    isNewerTime(newQuarter, newTime) {
        const newQuarterNum = this.parseQuarterToNumber(newQuarter);
        const newTimeSeconds = this.parseTimeToSeconds(newTime);
        
        // Higher quarter = definitely newer
        if (newQuarterNum > this.lastQuarterNum) {
            return true;
        }
        
        // Same quarter, less time remaining = newer
        if (newQuarterNum === this.lastQuarterNum && newTimeSeconds < this.lastTimeSeconds) {
            return true;
        }
        
        return false;
    }

    /**
     * Reset time tracking (call when game changes)
     */
    resetTimeTracking() {
        this.lastQuarterNum = 0;
        this.lastTimeSeconds = Infinity;
    }

    /**
     * Update game status text (for live games - time updates)
     * Only updates if new time is newer to prevent reverting from play-by-play
     * @param {string} quarter - Quarter (e.g., 'Q1', 'Q2', 'OT')
     * @param {string} time - Time remaining (e.g., '7:32')
     * @param {boolean} force - Force update even if not newer (for state changes)
     */
    updateStatusText(quarter, time, force = false) {
        const statusElement = document.querySelector('[data-status]');
        if (!statusElement) return;
        
        // Check if this is actually newer time
        if (!force && !this.isNewerTime(quarter, time)) {
            return; // Skip - would revert to older time
        }
        
        // Update tracking
        this.lastQuarterNum = this.parseQuarterToNumber(quarter);
        this.lastTimeSeconds = this.parseTimeToSeconds(time);
        
        // Update display - stacked vertically
        statusElement.innerHTML = GameView.formatStatusHTML(quarter, time);
    }

    updateAll(gameData) {
        const { home, away, quarter, time, teamStats } = gameData;

        if (home) {
            if (home.abbr !== undefined && home.logoUrl !== undefined) {
                this.updateTeam('home', home.abbr, home.logoUrl);
            }
            if (home.score !== undefined) {
                this.updateScore('home', home.score, home.animate);
            }
        }

        if (away) {
            if (away.abbr !== undefined && away.logoUrl !== undefined) {
                this.updateTeam('away', away.abbr, away.logoUrl);
            }
            if (away.score !== undefined) {
                this.updateScore('away', away.score, away.animate);
            }
        }

        if (quarter !== undefined && time !== undefined) {
            this.updateGameStatus(quarter, time);
        }

        // Update team stats if available
        if (teamStats) {
            this.updateTeamStats(teamStats);
        }
    }

    /**
     * Reset the overlay to default state
     */
    reset() {
        this.updateTeam('home', '---', '');
        this.updateTeam('away', '---', '');
        this.updateScore('home', 0);
        this.updateScore('away', 0);
        this.updateGameStatus('Q1', '12:00');
        this.resetTimeTracking();
    }

    // ==================== STATE MANAGEMENT ====================

    /**
     * Clear all state-specific elements from the DOM
     */
    clearStateElements() {
        // Remove pregame elements
        const countdown = this.elements.currentGameContent.querySelector('.countdown-container');
        const matchup = this.elements.currentGameContent.querySelector('.matchup-preview');
        if (countdown) countdown.remove();
        if (matchup) matchup.remove();

        // Remove halftime/final banners
        const halftimeBanner = this.elements.currentGameContent.querySelector('.halftime-banner');
        const finalBanner = this.elements.currentGameContent.querySelector('.final-banner');
        if (halftimeBanner) halftimeBanner.remove();
        if (finalBanner) finalBanner.remove();

        // Don't remove game status - it's now permanent in HTML, just update it
    }

    /**
     * Show Pre-Game state
     * @param {Object} data - {homeTeam: {abbr, logoUrl}, awayTeam: {abbr, logoUrl}, countdown: '02:15:34'}
     */
    showPreGame(data) {
        this.currentState = 'pregame';
        this.clearStateElements();

        // Show teams container (same layout as live game)
        if (this.elements.teamsContainer) {
            this.elements.teamsContainer.classList.remove('hidden');
        }

        // Update teams with logos and abbreviations
        if (data.homeTeam) {
            this.updateTeam('home', data.homeTeam.abbr, data.homeTeam.logoUrl);
        }
        if (data.awayTeam) {
            this.updateTeam('away', data.awayTeam.abbr, data.awayTeam.logoUrl);
        }

        // Show 0 for scores (not countdown - countdown goes in status only)
        if (this.elements.homeScore) {
            this.elements.homeScore.textContent = '0';
        }
        if (this.elements.awayScore) {
            this.elements.awayScore.textContent = '0';
        }

        // Update game status to show countdown
        const countdownText = data.countdown || '00:00:00';
        if (this.elements.gameStatus) {
            this.elements.gameStatus.textContent = `Game Starts In: ${countdownText}`;
        }

        // Hide team stats
        const teamStats = this.elements.currentGameContent.querySelector('.team-stats');
        if (teamStats) {
            teamStats.style.display = 'none';
        }
    }

    /**
     * Show Live state (Q1, Q2, Q3, Q4, OT)
     * @param {Object} data - {home: {abbr, logoUrl, score}, away: {abbr, logoUrl, score}, quarter, time}
     */
    showLive(data) {
        this.currentState = 'live';
        this.clearStateElements();

        // Show teams container
        if (this.elements.teamsContainer) {
            this.elements.teamsContainer.classList.remove('hidden');
        }

        // Show team stats
        const teamStats = this.elements.currentGameContent.querySelector('.team-stats');
        if (teamStats) {
            teamStats.style.display = 'block';
        }

        // Update game data
        this.updateAll(data);

        // Update game status
        if (this.elements.gameStatus) {
            this.elements.gameStatus.innerHTML = GameView.formatStatusHTML(data.quarter, data.time);
        }

        // Update team stats if available
        if (data.teamStats) {
            this.updateTeamStats(data.teamStats);
        }
    }

    /**
     * Show Halftime state
     * @param {Object} data - {home: {abbr, logoUrl, score}, away: {abbr, logoUrl, score}}
     */
    showHalftime(data) {
        this.currentState = 'halftime';
        this.clearStateElements();

        // Show teams container
        if (this.elements.teamsContainer) {
            this.elements.teamsContainer.classList.remove('hidden');
        }

        // Show team stats
        const teamStats = this.elements.currentGameContent.querySelector('.team-stats');
        if (teamStats) {
            teamStats.style.display = 'block';
        }

        // Update teams and scores
        this.updateTeam('home', data.home.abbr, data.home.logoUrl);
        this.updateTeam('away', data.away.abbr, data.away.logoUrl);
        this.updateScore('home', data.home.score);
        this.updateScore('away', data.away.score);

        // Update game status
        if (this.elements.gameStatus) {
            this.elements.gameStatus.textContent = 'Halftime';
        }

        // Update team stats if available
        if (data.teamStats) {
            this.updateTeamStats(data.teamStats);
        }
    }

    /**
     * Show Final state
     * @param {Object} data - {home: {abbr, logoUrl, score}, away: {abbr, logoUrl, score}}
     */
    showFinal(data) {
        this.currentState = 'final';
        this.clearStateElements();

        // Show teams container
        if (this.elements.teamsContainer) {
            this.elements.teamsContainer.classList.remove('hidden');
        }

        // Show team stats
        const teamStats = this.elements.currentGameContent.querySelector('.team-stats');
        if (teamStats) {
            teamStats.style.display = 'block';
        }

        // Update teams and scores
        this.updateTeam('home', data.home.abbr, data.home.logoUrl);
        this.updateTeam('away', data.away.abbr, data.away.logoUrl);
        this.updateScore('home', data.home.score);
        this.updateScore('away', data.away.score);

        // Update game status
        if (this.elements.gameStatus) {
            this.elements.gameStatus.textContent = 'Final';
        }

        // Update team stats if available
        if (data.teamStats) {
            this.updateTeamStats(data.teamStats);
        }
    }

    /**
     * Update team statistics display
     * @param {Object} teamStats - { home: {...}, away: {...} }
     */
    updateTeamStats(teamStats) {
        if (!teamStats || !teamStats.home || !teamStats.away) {
            return;
        }

        const statsContainer = this.elements.currentGameContent.querySelector('.team-stats');
        if (!statsContainer) {
            return;
        }

        const statsRows = statsContainer.querySelectorAll('.stats-row');
        if (statsRows.length < 5) {
            return;
        }

        // Helper to format percentage
        const formatPercent = (pct) => {
            return pct ? `(${pct}%)` : '';
        };

        // Row 0: FGM/FGA
        const fgRow = statsRows[0];
        const fgValues = fgRow.querySelectorAll('.stat-value');
        if (fgValues.length >= 2) {
            fgValues[0].textContent = `${teamStats.home.fgm}/${teamStats.home.fga}`;
            fgValues[1].textContent = `${teamStats.away.fgm}/${teamStats.away.fga}`;
        }

        // Row 1: REB/OFF
        const rebRow = statsRows[1];
        const rebValues = rebRow.querySelectorAll('.stat-value');
        if (rebValues.length >= 2) {
            rebValues[0].textContent = `${teamStats.home.reb}/${teamStats.home.offReb}`;
            rebValues[1].textContent = `${teamStats.away.reb}/${teamStats.away.offReb}`;
        }

        // Row 2: AST/TO
        const astRow = statsRows[2];
        const astValues = astRow.querySelectorAll('.stat-value');
        if (astValues.length >= 2) {
            astValues[0].textContent = `${teamStats.home.ast}/${teamStats.home.to}`;
            astValues[1].textContent = `${teamStats.away.ast}/${teamStats.away.to}`;
        }

        // Row 3: 3-PT
        const threePtRow = statsRows[3];
        const threePtValues = threePtRow.querySelectorAll('.stat-value');
        if (threePtValues.length >= 2) {
            threePtValues[0].textContent = `${teamStats.home.threePtMade}/${teamStats.home.threePtAttempted} ${formatPercent(teamStats.home.threePtPct)}`;
            threePtValues[1].textContent = `${teamStats.away.threePtMade}/${teamStats.away.threePtAttempted} ${formatPercent(teamStats.away.threePtPct)}`;
        }

        // Row 4: FT
        const ftRow = statsRows[4];
        const ftValues = ftRow.querySelectorAll('.stat-value');
        if (ftValues.length >= 2) {
            ftValues[0].textContent = `${teamStats.home.ftMade}/${teamStats.home.ftAttempted} ${formatPercent(teamStats.home.ftPct)}`;
            ftValues[1].textContent = `${teamStats.away.ftMade}/${teamStats.away.ftAttempted} ${formatPercent(teamStats.away.ftPct)}`;
        }
    }

    /**
     * Get current state
     * @returns {string} Current state name
     */
    getCurrentState() {
        return this.currentState;
    }

    // ==================== TRANSITIONS ====================

    /**
     * Transition to a new state with smooth fade effect
     * @param {string} stateName - 'pregame', 'live', 'halftime', 'final'
     * @param {Object} data - State-specific data
     * @returns {Promise} Resolves when transition is complete
     */
    transitionToState(stateName, data) {
        return new Promise((resolve) => {
            // Validate data first
            if (!this.validateStateData(stateName, data)) {
                resolve();
                return;
            }

            // Show overlay if hidden
            this.show();

            // Don't transition if already in this state (but allow live to live transitions)
            if (this.currentState === stateName && stateName !== 'live') {
                resolve();
                return;
            }

            // Add transitioning class to prevent interactions
            this.elements.unifiedBox.classList.add('transitioning');

            // Determine if this is a content-only transition (Live/Halftime/Final) or full transition (Pre-Game involved)
            const currentIsGameState = ['live', 'halftime', 'final'].includes(this.currentState);
            const newIsGameState = ['live', 'halftime', 'final'].includes(stateName);
            const isContentOnlyTransition = currentIsGameState && newIsGameState;

            if (isContentOnlyTransition) {
                // Delegate to TransitionAnimator
                this.transitionAnimator.contentFadeTransition(this, stateName, data).then(resolve);
            } else {
                // Full box transition (Pre-Game involved)
                
                // Special smooth transition for Pre-Game → Live
                if (this.currentState === 'pregame' && stateName === 'live') {
                    this.transitionAnimator.transitionPreGameToLive(this, data).then(resolve);
                    return;
                }
                
                // Default: full box transition
                this.transitionAnimator.fullBoxTransition(this, stateName, data).then(resolve);
            }
        });
    }

    /**
     * Internal method to switch to a state without transitions
     * @param {string} stateName - State name
     * @param {Object} data - State data
     */
    switchToState(stateName, data) {
        switch (stateName) {
            case 'pregame':
                this.showPreGame(data);
                break;
            case 'live':
                this.showLive(data);
                break;
            case 'halftime':
                this.showHalftime(data);
                break;
            case 'final':
                this.showFinal(data);
                break;
            default:
                break;
        }
    }

}

// GameView class is now available globally
// Use: const gameView = new GameView();

