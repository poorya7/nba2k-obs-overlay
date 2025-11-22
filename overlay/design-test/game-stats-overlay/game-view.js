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
            gameStatus: document.querySelector('[data-status]')
        };
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
}

// GameView class is now available globally
// Use: const gameView = new GameView();

