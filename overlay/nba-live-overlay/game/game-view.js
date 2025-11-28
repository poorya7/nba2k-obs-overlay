/**
 * GameView - Handles all DOM updates for the game stats overlay
 * Single Responsibility: View layer only, no data fetching or business logic
 * 
 * Usage:
 *   const gameView = new GameView();
 *   gameView.transitionToState('live', gameData);
 *   gameView.updateScore('home', 85, true);
 *   gameView.hide(); // When no game selected
 */

// Default animation for score changes
const DEFAULT_SCORE_ANIMATION = 'slide';

class GameView {
    constructor() {
        // Cache DOM elements for performance
        this.elements = {
            homeAbbr: document.querySelector('[data-abbr="home"]'),
            awayAbbr: document.querySelector('[data-abbr="away"]'),
            homeLogo: document.querySelector('[data-logo="home"]'),
            awayLogo: document.querySelector('[data-logo="away"]'),
            homeScore: document.querySelector('[data-score="home"]'),
            awayScore: document.querySelector('[data-score="away"]'),
            gameStatus: document.querySelector('[data-status]'),
            liveIndicator: document.querySelector('.live-indicator'),
            teamsContainer: document.querySelector('.teams'),
            gameStatsBox: document.querySelector('.game-stats')
        };
        
        // Validate critical DOM elements exist
        if (!this.elements.gameStatsBox) {
            throw new Error('GameView: .game-stats element not found in DOM');
        }
        if (!this.elements.teamsContainer) {
            throw new Error('GameView: .teams element not found in DOM');
        }
        
        this.currentState = null; // No default state - set by first API call
        this.isVisible = false;   // Track visibility
        this.transitionAnimator = new TransitionAnimator(); // Delegate complex transitions
    }

    /**
     * Show the overlay (when game is selected) with fade in
     */
    show() {
        if (this.elements.gameStatsBox && !this.isVisible) {
            // Set to display block but transparent
            this.elements.gameStatsBox.style.display = 'block';
            this.elements.gameStatsBox.style.opacity = '0';
            
            // Force reflow
            void this.elements.gameStatsBox.offsetWidth;
            
            // Fade in
            this.elements.gameStatsBox.style.transition = 'opacity 0.3s ease-in';
            this.elements.gameStatsBox.style.opacity = '1';
            
            this.isVisible = true;
        }
    }

    /**
     * Hide the overlay (when no game selected) with fade out
     */
    hide() {
        if (this.elements.gameStatsBox && this.isVisible) {
            // Fade out
            this.elements.gameStatsBox.style.transition = 'opacity 0.3s ease-out';
            this.elements.gameStatsBox.style.opacity = '0';
            
            // After fade completes, set display none
            setTimeout(() => {
                if (this.elements.gameStatsBox) {
                    this.elements.gameStatsBox.style.display = 'none';
                }
            }, 300);
            
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
            console.error(`Invalid data for state "${stateName}": data is null/undefined`);
            return false;
        }

        switch (stateName) {
            case 'pregame':
                if (!data.homeTeam || !data.awayTeam) {
                    console.error('Pre-game state requires homeTeam and awayTeam');
                    return false;
                }
                if (!data.homeTeam.abbr || !data.homeTeam.logoUrl || !data.awayTeam.abbr || !data.awayTeam.logoUrl) {
                    console.error('Teams must have abbr and logoUrl');
                    return false;
                }
                // countdown is optional
                return true;

            case 'live':
                if (!data.home || !data.away) {
                    console.error('Live state requires home and away team data');
                    return false;
                }
                if (!data.quarter || !data.time) {
                    console.error('Live state requires quarter and time');
                    return false;
                }
                return true;

            case 'halftime':
            case 'final':
                if (!data.home || !data.away) {
                    console.error(`${stateName} state requires home and away team data`);
                    return false;
                }
                return true;

            default:
                console.error(`Unknown state: ${stateName}`);
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
            console.error('Invalid team. Must be "home" or "away"');
            return;
        }

        const abbrElement = this.elements[`${team}Abbr`];
        const logoElement = this.elements[`${team}Logo`];

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
            console.error('Invalid team. Must be "home" or "away"');
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
     * Update game status (quarter and time)
     * @param {string} quarter - Quarter (e.g., 'Q1', 'Q2', 'OT')
     * @param {string} time - Time remaining (e.g., '7:32')
     */
    updateGameStatus(quarter, time) {
        if (this.elements.gameStatus) {
            this.elements.gameStatus.textContent = `${quarter} · ${time}`;
        }
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
        const countdownElement = this.elements.gameStatsBox.querySelector('.countdown-time');
        if (countdownElement) {
            countdownElement.textContent = countdownText;
        }
    }

    /**
     * Update game status text (for live games - time updates)
     * @param {string} quarter - Quarter (e.g., 'Q1', 'Q2', 'OT')
     * @param {string} time - Time remaining (e.g., '7:32')
     */
    updateStatusText(quarter, time) {
        const statusElement = document.querySelector('[data-status]');
        if (statusElement) {
            statusElement.textContent = `${quarter} · ${time}`;
        }
    }

    updateAll(gameData) {
        const { home, away, quarter, time } = gameData;

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
    }

    // ==================== STATE MANAGEMENT ====================

    /**
     * Clear all state-specific elements from the DOM
     */
    clearStateElements() {
        // Remove pregame elements
        const countdown = this.elements.gameStatsBox.querySelector('.countdown-container');
        const matchup = this.elements.gameStatsBox.querySelector('.matchup-preview');
        if (countdown) countdown.remove();
        if (matchup) matchup.remove();

        // Remove halftime/final banners
        const halftimeBanner = this.elements.gameStatsBox.querySelector('.halftime-banner');
        const finalBanner = this.elements.gameStatsBox.querySelector('.final-banner');
        if (halftimeBanner) halftimeBanner.remove();
        if (finalBanner) finalBanner.remove();

        // Remove game status
        if (this.elements.gameStatus) {
            this.elements.gameStatus.remove();
        }
    }

    /**
     * Show Pre-Game state
     * @param {Object} data - {homeTeam: {abbr, logoUrl}, awayTeam: {abbr, logoUrl}, countdown: '02:15:34'}
     */
    showPreGame(data) {
        this.currentState = 'pregame';
        this.clearStateElements();

        // Update live indicator
        const liveText = this.elements.liveIndicator.querySelector('.live-text');
        if (liveText) liveText.textContent = 'Upcoming';

        // Hide teams container and scores
        if (this.elements.teamsContainer) {
            this.elements.teamsContainer.classList.add('hidden');
        }

        // Create matchup preview
        const matchupHTML = `
            <div class="matchup-preview">
                <img class="preview-logo" src="${data.homeTeam.logoUrl}" alt="${data.homeTeam.abbr}">
                <span class="vs-text">vs</span>
                <img class="preview-logo" src="${data.awayTeam.logoUrl}" alt="${data.awayTeam.abbr}">
            </div>
        `;

        // Create countdown
        const countdownHTML = `
            <div class="countdown-container">
                <div class="countdown-label">Game Starts In</div>
                <div class="countdown-time">${data.countdown || '00:00:00'}</div>
            </div>
        `;

        // Insert after live indicator
        this.elements.liveIndicator.insertAdjacentHTML('afterend', matchupHTML);
        const matchupElement = this.elements.gameStatsBox.querySelector('.matchup-preview');
        matchupElement.insertAdjacentHTML('afterend', countdownHTML);
    }

    /**
     * Show Live state (Q1, Q2, Q3, Q4, OT)
     * @param {Object} data - {home: {abbr, logoUrl, score}, away: {abbr, logoUrl, score}, quarter, time}
     */
    showLive(data) {
        this.currentState = 'live';
        this.clearStateElements();

        // Update live indicator
        const liveText = this.elements.liveIndicator.querySelector('.live-text');
        if (liveText) liveText.textContent = 'Live';

        // Show teams container
        if (this.elements.teamsContainer) {
            this.elements.teamsContainer.classList.remove('hidden');
        }

        // Update game data
        this.updateAll(data);

        // Add game status back
        const statusHTML = `<div class="game-status" data-status>${data.quarter} · ${data.time}</div>`;
        this.elements.teamsContainer.insertAdjacentHTML('afterend', statusHTML);
        this.elements.gameStatus = document.querySelector('[data-status]');
    }

    /**
     * Show Halftime state
     * @param {Object} data - {home: {abbr, logoUrl, score}, away: {abbr, logoUrl, score}}
     */
    showHalftime(data) {
        this.currentState = 'halftime';
        this.clearStateElements();

        // Update live indicator
        const liveText = this.elements.liveIndicator.querySelector('.live-text');
        if (liveText) liveText.textContent = 'Live';

        // Show teams container
        if (this.elements.teamsContainer) {
            this.elements.teamsContainer.classList.remove('hidden');
        }

        // Update teams and scores
        this.updateTeam('home', data.home.abbr, data.home.logoUrl);
        this.updateTeam('away', data.away.abbr, data.away.logoUrl);
        this.updateScore('home', data.home.score);
        this.updateScore('away', data.away.score);

        // Add halftime banner
        const bannerHTML = `
            <div class="halftime-banner">
                <div class="halftime-text">Halftime</div>
            </div>
        `;
        this.elements.teamsContainer.insertAdjacentHTML('afterend', bannerHTML);
    }

    /**
     * Show Final state
     * @param {Object} data - {home: {abbr, logoUrl, score}, away: {abbr, logoUrl, score}}
     */
    showFinal(data) {
        this.currentState = 'final';
        this.clearStateElements();

        // Update live indicator (keep as "Live")
        const liveText = this.elements.liveIndicator.querySelector('.live-text');
        if (liveText) liveText.textContent = 'Live';

        // Show teams container
        if (this.elements.teamsContainer) {
            this.elements.teamsContainer.classList.remove('hidden');
        }

        // Update teams and scores
        this.updateTeam('home', data.home.abbr, data.home.logoUrl);
        this.updateTeam('away', data.away.abbr, data.away.logoUrl);
        this.updateScore('home', data.home.score);
        this.updateScore('away', data.away.score);

        // Add final banner
        const bannerHTML = `
            <div class="final-banner">
                <div class="final-text">Final</div>
            </div>
        `;
        this.elements.teamsContainer.insertAdjacentHTML('afterend', bannerHTML);
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
                console.error('State transition aborted due to invalid data');
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
            this.elements.gameStatsBox.classList.add('transitioning');

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
                console.error('Invalid state:', stateName);
        }
    }

}

// GameView class is now available globally
// Use: const gameView = new GameView();

