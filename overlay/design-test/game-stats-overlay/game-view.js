/**
 * GameView - Handles all DOM updates for the game stats overlay
 * Single Responsibility: View layer only, no data fetching or business logic
 * 
 * Usage:
 *   const gameView = new GameView();
 *   gameView.updateScore('home', 85, true);
 *   gameView.updateTeam('away', 'BOS', 'https://...');
 */
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
        
        this.currentState = 'live'; // Default state
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
     * @param {string} animType - Animation type ('glow', 'nba', 'bounce', etc.)
     */
    updateScore(team, newScore, animate = false, animType = 'glow') {
        if (team !== 'home' && team !== 'away') {
            console.error('Invalid team. Must be "home" or "away"');
            return;
        }

        const scoreElement = this.elements[`${team}Score`];
        if (!scoreElement) return;

        const oldScore = parseInt(scoreElement.textContent) || 0;
        const shouldAnimate = animate && newScore > oldScore;

        scoreElement.textContent = newScore;

        if (shouldAnimate) {
            this.playScoreAnimation(scoreElement, animType);
        }
    }

    /**
     * Play animation on a score element
     * @param {HTMLElement} element - Score element to animate
     * @param {string} animType - Animation type
     */
    playScoreAnimation(element, animType = 'glow') {
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
                // Smart transition: Only animate what changes
                const teamsContainer = this.elements.teamsContainer;
                const currentBottomElement = this.elements.gameStatsBox.querySelector('.game-status, .halftime-banner, .final-banner');
                
                // Determine if we need to animate teams (only for Live → Live transitions)
                const shouldAnimateTeams = this.currentState === 'live' && stateName === 'live';
                
                // Fade out elements that will change
                if (shouldAnimateTeams && teamsContainer) {
                    teamsContainer.classList.add('content-fade-out');
                }
                if (currentBottomElement) {
                    currentBottomElement.classList.add('content-fade-out');
                }

                setTimeout(() => {
                    // Switch state (updates teams/scores instantly)
                    this.switchToState(stateName, data);

                    // Get new elements
                    const newTeamsContainer = this.elements.teamsContainer;
                    const newBottomElement = this.elements.gameStatsBox.querySelector('.game-status, .halftime-banner, .final-banner');

                    // Fade in only the elements we faded out
                    if (shouldAnimateTeams && newTeamsContainer) {
                        newTeamsContainer.classList.remove('content-fade-out');
                        newTeamsContainer.style.opacity = '0';
                        void newTeamsContainer.offsetWidth;
                        newTeamsContainer.classList.add('content-fade-in');
                    }
                    
                    if (newBottomElement) {
                        newBottomElement.style.opacity = '0';
                        void newBottomElement.offsetWidth;
                        newBottomElement.classList.add('content-fade-in');
                    }

                    setTimeout(() => {
                        // Clean up
                        if (shouldAnimateTeams && newTeamsContainer) {
                            newTeamsContainer.classList.remove('content-fade-in');
                            newTeamsContainer.style.opacity = '';
                        }
                        if (newBottomElement) {
                            newBottomElement.classList.remove('content-fade-in');
                            newBottomElement.style.opacity = '';
                        }
                        this.elements.gameStatsBox.classList.remove('transitioning');
                        resolve();
                    }, 300); // Match contentFadeIn duration
                }, 250); // Match contentFadeOut duration
            } else {
                // Full box transition (Pre-Game involved)
                
                // Special smooth transition for Pre-Game → Live
                if (this.currentState === 'pregame' && stateName === 'live') {
                    this.transitionPreGameToLive(data).then(resolve);
                    return;
                }
                
                // Default: fade the whole overlay for other transitions
                const currentOpacity = window.getComputedStyle(this.elements.gameStatsBox).opacity;
                
                // Animate to transparent
                this.elements.gameStatsBox.style.transition = 'opacity 0.25s ease-out';
                this.elements.gameStatsBox.style.opacity = '0';

                setTimeout(() => {
                    // Switch state
                    this.switchToState(stateName, data);

                    // Fade back in
                    this.elements.gameStatsBox.style.transition = 'opacity 0.3s ease-in';
                    this.elements.gameStatsBox.style.opacity = currentOpacity;

                    setTimeout(() => {
                        this.elements.gameStatsBox.style.transition = '';
                        this.elements.gameStatsBox.classList.remove('transitioning');
                        resolve();
                    }, 300);
                }, 250);
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

    /**
     * Special smooth transition from Pre-Game to Live
     * @param {Object} data - Live game data
     * @returns {Promise} Resolves when transition is complete
     */
    async transitionPreGameToLive(data) {
        return new Promise((resolve) => {
            this.elements.gameStatsBox.classList.add('transitioning');

            // Lock the top position so box expands downward
            const currentTop = this.elements.gameStatsBox.getBoundingClientRect().top;
            this.elements.gameStatsBox.style.top = currentTop + 'px';
            this.elements.gameStatsBox.style.bottom = 'auto';

            // Measure current height
            const currentHeight = this.elements.gameStatsBox.offsetHeight;

            // Get references to pregame content (keep in place for now!)
            const countdownContainer = this.elements.gameStatsBox.querySelector('.countdown-container');
            const matchupPreview = this.elements.gameStatsBox.querySelector('.matchup-preview');
            const liveText = this.elements.liveIndicator.querySelector('.live-text');

            // Temporarily remove pregame from layout flow (position absolute = no space taken)
            if (countdownContainer) countdownContainer.style.position = 'absolute';
            if (matchupPreview) matchupPreview.style.position = 'absolute';

            // Update state
            this.currentState = 'live';

            // Show teams container
            if (this.elements.teamsContainer) {
                this.elements.teamsContainer.classList.remove('hidden');
            }

            // Update game data
            this.updateAll(data);

            // Hide ALL live content initially
            const teamLogos = this.elements.gameStatsBox.querySelectorAll('.team-logo');
            const teamAbbrs = this.elements.gameStatsBox.querySelectorAll('.team-abbr');
            const scores = this.elements.gameStatsBox.querySelectorAll('.score');
            
            teamLogos.forEach(logo => logo.style.opacity = '0');
            teamAbbrs.forEach(abbr => abbr.style.opacity = '0');
            scores.forEach(score => score.style.opacity = '0');

            // Add game status (hidden)
            const statusHTML = `<div class="game-status" data-status style="opacity: 0">${data.quarter} · ${data.time}</div>`;
            this.elements.teamsContainer.insertAdjacentHTML('afterend', statusHTML);
            this.elements.gameStatus = document.querySelector('[data-status]');

            // Measure height with ONLY live content (pregame is position:absolute so doesn't affect height)
            const newHeight = this.elements.gameStatsBox.scrollHeight;

            // Put pregame back in normal flow (still visible during expansion)
            if (countdownContainer) countdownContainer.style.position = '';
            if (matchupPreview) matchupPreview.style.position = '';

            // Step 1: Animate box expansion (0.5s)
            this.elements.gameStatsBox.style.height = currentHeight + 'px';
            this.elements.gameStatsBox.classList.add('expanding');
            void this.elements.gameStatsBox.offsetWidth;
            this.elements.gameStatsBox.style.height = newHeight + 'px';

            // Step 2: After expansion, fade out pregame content (0.3s)
            setTimeout(() => {
                if (countdownContainer) {
                    countdownContainer.style.transition = 'opacity 0.3s ease-in';
                    countdownContainer.style.opacity = '0';
                }
                if (matchupPreview) {
                    matchupPreview.style.transition = 'opacity 0.3s ease-in';
                    matchupPreview.style.opacity = '0';
                }
                // Fade out entire live indicator ("Upcoming NBA")
                if (this.elements.liveIndicator) {
                    this.elements.liveIndicator.style.transition = 'opacity 0.3s ease-in';
                    this.elements.liveIndicator.style.opacity = '0';
                }

                // Step 3: After fade out, remove pregame and fade in new content together (0.3s)
                setTimeout(() => {
                    // Remove pregame content
                    if (countdownContainer) countdownContainer.remove();
                    if (matchupPreview) matchupPreview.remove();

                    // Change "Upcoming" to "Live"
                    if (liveText) liveText.textContent = 'Live';

                    // Fade in entire live indicator ("Live NBA")
                    if (this.elements.liveIndicator) {
                        this.elements.liveIndicator.style.transition = 'opacity 0.3s ease-out';
                        this.elements.liveIndicator.style.opacity = '1';
                    }
                    teamLogos.forEach(logo => {
                        logo.style.transition = 'opacity 0.3s ease-out';
                        logo.style.opacity = '1';
                    });
                    teamAbbrs.forEach(abbr => {
                        abbr.style.transition = 'opacity 0.3s ease-out';
                        abbr.style.opacity = '1';
                    });
                    scores.forEach(score => {
                        score.style.transition = 'opacity 0.3s ease-out';
                        score.style.opacity = '1';
                    });
                    if (this.elements.gameStatus) {
                        this.elements.gameStatus.style.transition = 'opacity 0.3s ease-out';
                        this.elements.gameStatus.style.opacity = '1';
                    }

                    // Step 4: Final cleanup after fade in completes (0.3s)
                    setTimeout(() => {
                        // Clean up all inline styles
                        if (this.elements.liveIndicator) {
                            this.elements.liveIndicator.style.transition = '';
                            this.elements.liveIndicator.style.opacity = '';
                        }
                        teamLogos.forEach(logo => {
                            logo.style.transition = '';
                            logo.style.opacity = '';
                        });
                        teamAbbrs.forEach(abbr => {
                            abbr.style.transition = '';
                            abbr.style.opacity = '';
                        });
                        scores.forEach(score => {
                            score.style.transition = '';
                            score.style.opacity = '';
                        });
                        if (this.elements.gameStatus) {
                            this.elements.gameStatus.style.transition = '';
                            this.elements.gameStatus.style.opacity = '';
                        }
                        
                        this.elements.gameStatsBox.classList.remove('transitioning', 'expanding');
                        this.elements.gameStatsBox.style.height = '';
                        resolve();
                    }, 300);
                }, 300);
            }, 500);
        });
    }
}

// GameView class is now available globally
// Use: const gameView = new GameView();

