/**
 * TransitionAnimator - Handles complex transition animations
 * Single Responsibility: Animate transitions between game states
 * 
 * Extracted from GameView to reduce its complexity (784 lines → ~500 lines)
 */

// Transition timing constants (all in milliseconds)
const TRANSITION_TIMING = {
    BOX_EXPAND: 500,
    FADE_OUT: 300,
    FADE_IN: 300,
    CONTENT_FADE_OUT: 250,
    CONTENT_FADE_IN: 300,
    FULL_FADE_OUT: 250,
    FULL_FADE_IN: 300
};

class TransitionAnimator {
    constructor() {
        this.timing = TRANSITION_TIMING;
    }

    /**
     * Special smooth transition from Pre-Game to Live
     * @param {GameView} gameView - GameView instance
     * @param {Object} data - Live game data
     * @returns {Promise} Resolves when transition is complete
     */
    async transitionPreGameToLive(gameView, data) {
        return new Promise((resolve) => {
            const elements = gameView.elements;
            const gameStatsBox = elements.gameStatsBox;
            
            gameStatsBox.classList.add('transitioning');

            // Lock the top position so box expands downward
            const currentTop = gameStatsBox.getBoundingClientRect().top;
            gameStatsBox.style.top = currentTop + 'px';
            gameStatsBox.style.bottom = 'auto';

            // Measure current height
            const currentHeight = gameStatsBox.offsetHeight;

            // Get references to pregame content (keep in place for now!)
            const countdownContainer = gameStatsBox.querySelector('.countdown-container');
            const matchupPreview = gameStatsBox.querySelector('.matchup-preview');
            const liveText = elements.liveIndicator.querySelector('.live-text');

            // Temporarily remove pregame from layout flow (position absolute = no space taken)
            if (countdownContainer) countdownContainer.style.position = 'absolute';
            if (matchupPreview) matchupPreview.style.position = 'absolute';

            // Update state
            gameView.currentState = 'live';

            // Show teams container
            if (elements.teamsContainer) {
                elements.teamsContainer.classList.remove('hidden');
            }

            // Update game data
            gameView.updateAll(data);

            // Hide ALL live content initially
            const teamLogos = gameStatsBox.querySelectorAll('.team-logo');
            const teamAbbrs = gameStatsBox.querySelectorAll('.team-abbr');
            const scores = gameStatsBox.querySelectorAll('.score');
            
            teamLogos.forEach(logo => logo.style.opacity = '0');
            teamAbbrs.forEach(abbr => abbr.style.opacity = '0');
            scores.forEach(score => score.style.opacity = '0');

            // Add game status (hidden)
            const statusHTML = `<div class="game-status" data-status style="opacity: 0">${GameView.formatStatusHTML(data.quarter, data.time)}</div>`;
            elements.teamsContainer.insertAdjacentHTML('afterend', statusHTML);
            elements.gameStatus = document.querySelector('[data-status]');

            // Measure height with ONLY live content (pregame is position:absolute so doesn't affect height)
            const newHeight = gameStatsBox.scrollHeight;

            // Put pregame back in normal flow (still visible during expansion)
            if (countdownContainer) countdownContainer.style.position = '';
            if (matchupPreview) matchupPreview.style.position = '';

            // Step 1: Animate box expansion
            gameStatsBox.style.height = currentHeight + 'px';
            gameStatsBox.classList.add('expanding');
            void gameStatsBox.offsetWidth;
            gameStatsBox.style.height = newHeight + 'px';

            // Step 2: After expansion, fade out pregame content
            setTimeout(() => {
                if (countdownContainer) {
                    countdownContainer.style.transition = `opacity ${this.timing.FADE_OUT}ms ease-in`;
                    countdownContainer.style.opacity = '0';
                }
                if (matchupPreview) {
                    matchupPreview.style.transition = `opacity ${this.timing.FADE_OUT}ms ease-in`;
                    matchupPreview.style.opacity = '0';
                }
                // Fade out entire live indicator ("Upcoming NBA")
                if (elements.liveIndicator) {
                    elements.liveIndicator.style.transition = `opacity ${this.timing.FADE_OUT}ms ease-in`;
                    elements.liveIndicator.style.opacity = '0';
                }

                // Step 3: After fade out, remove pregame and fade in new content together
                setTimeout(() => {
                    // Remove pregame content
                    if (countdownContainer) countdownContainer.remove();
                    if (matchupPreview) matchupPreview.remove();

                    // Change "Upcoming" to "Live"
                    if (liveText) liveText.textContent = 'Live';

                    // Fade in entire live indicator ("Live NBA")
                    if (elements.liveIndicator) {
                        elements.liveIndicator.style.transition = `opacity ${this.timing.FADE_IN}ms ease-out`;
                        elements.liveIndicator.style.opacity = '1';
                    }
                    teamLogos.forEach(logo => {
                        logo.style.transition = `opacity ${this.timing.FADE_IN}ms ease-out`;
                        logo.style.opacity = '1';
                    });
                    teamAbbrs.forEach(abbr => {
                        abbr.style.transition = `opacity ${this.timing.FADE_IN}ms ease-out`;
                        abbr.style.opacity = '1';
                    });
                    scores.forEach(score => {
                        score.style.transition = `opacity ${this.timing.FADE_IN}ms ease-out`;
                        score.style.opacity = '1';
                    });
                    if (elements.gameStatus) {
                        elements.gameStatus.style.transition = `opacity ${this.timing.FADE_IN}ms ease-out`;
                        elements.gameStatus.style.opacity = '1';
                    }

                    // Step 4: Final cleanup after fade in completes
                    setTimeout(() => {
                        // Clean up all inline styles
                        if (elements.liveIndicator) {
                            elements.liveIndicator.style.transition = '';
                            elements.liveIndicator.style.opacity = '';
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
                        if (elements.gameStatus) {
                            elements.gameStatus.style.transition = '';
                            elements.gameStatus.style.opacity = '';
                        }
                        
                        gameStatsBox.classList.remove('transitioning', 'expanding');
                        gameStatsBox.style.height = '';
                        resolve();
                    }, this.timing.FADE_IN);
                }, this.timing.FADE_OUT);
            }, this.timing.BOX_EXPAND);
        });
    }

    /**
     * Content-only fade transition (for live/halftime/final switches)
     * @param {GameView} gameView - GameView instance
     * @param {string} stateName - Target state name
     * @param {Object} data - State data
     * @returns {Promise} Resolves when transition is complete
     */
    async contentFadeTransition(gameView, stateName, data) {
        return new Promise((resolve) => {
            const elements = gameView.elements;
            const gameStatsBox = elements.gameStatsBox;
            
            gameStatsBox.classList.add('transitioning');

            // Smart transition: Only animate what changes
            const teamsContainer = elements.teamsContainer;
            const currentBottomElement = gameStatsBox.querySelector('.game-status, .halftime-banner, .final-banner');
            
            // For Live → Live transitions, DON'T fade teams (score animations handle it)
            // Only fade bottom element (game status)
            const shouldAnimateTeams = false; // Disabled to prevent double animation with score slide
            
            // Fade out elements that will change
            if (shouldAnimateTeams && teamsContainer) {
                teamsContainer.classList.add('content-fade-out');
            }
            if (currentBottomElement) {
                currentBottomElement.classList.add('content-fade-out');
            }

            setTimeout(() => {
                // Switch state (updates teams/scores instantly)
                gameView.switchToState(stateName, data);

                // Get new elements
                const newTeamsContainer = elements.teamsContainer;
                const newBottomElement = gameStatsBox.querySelector('.game-status, .halftime-banner, .final-banner');

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
                    gameStatsBox.classList.remove('transitioning');
                    resolve();
                }, this.timing.CONTENT_FADE_IN);
            }, this.timing.CONTENT_FADE_OUT);
        });
    }

    /**
     * Full box fade transition (default transition)
     * @param {GameView} gameView - GameView instance
     * @param {string} stateName - Target state name
     * @param {Object} data - State data
     * @returns {Promise} Resolves when transition is complete
     */
    async fullBoxTransition(gameView, stateName, data) {
        return new Promise((resolve) => {
            const gameStatsBox = gameView.elements.gameStatsBox;
            
            gameStatsBox.classList.add('transitioning');
            
            // Default: fade the whole overlay for other transitions
            const currentOpacity = window.getComputedStyle(gameStatsBox).opacity;
            
            // Animate to transparent
            gameStatsBox.style.transition = `opacity ${this.timing.FULL_FADE_OUT}ms ease-out`;
            gameStatsBox.style.opacity = '0';

            setTimeout(() => {
                // Switch state
                gameView.switchToState(stateName, data);

                // Fade back in
                gameStatsBox.style.transition = `opacity ${this.timing.FULL_FADE_IN}ms ease-in`;
                gameStatsBox.style.opacity = currentOpacity;

                setTimeout(() => {
                    gameStatsBox.style.transition = '';
                    gameStatsBox.classList.remove('transitioning');
                    resolve();
                }, this.timing.FULL_FADE_IN);
            }, this.timing.FULL_FADE_OUT);
        });
    }
}

