/**
 * OtherGamesView - Handles rendering of other games overlay
 * Single Responsibility: View layer only, no business logic
 */

class OtherGamesView {
    constructor() {
        this.gamesContainer = document.getElementById('games-container');
        this.otherGamesContent = document.getElementById('otherGamesContent');
        
        // Validate critical DOM elements exist
        if (!this.gamesContainer) {
            throw new Error('OtherGamesView: #games-container element not found in DOM');
        }
        if (!this.otherGamesContent) {
            throw new Error('OtherGamesView: #otherGamesContent element not found in DOM');
        }
    }

    /**
     * Format countdown time (uses shared utility)
     * @param {number} seconds - Seconds until game starts
     * @returns {string} Formatted time (HH:MM:SS)
     */
    formatCountdown(seconds) {
        return GameUtils.formatCountdown(seconds); // Use shared utility from gameUtils.js
    }

    /**
     * Render games to the DOM
     * @param {Array} games - Array of game objects to render
     * @param {number} startIndex - Starting index in games array
     * @param {number} count - Number of games to render
     */
    renderGames(games, startIndex, count) {
        const gamesToShow = games.slice(startIndex, startIndex + count);
        
        let html = '';
        gamesToShow.forEach((game, index) => {
            const actualGameIndex = startIndex + index;
            
            if (game.state === 'pregame') {
                html += this._renderPregameGame(game, actualGameIndex);
            } else if (game.state === 'live' || game.state === 'halftime') {
                html += this._renderLiveGame(game);
            } else { // final
                html += this._renderFinalGame(game);
            }
            
            // Add divider between games (not after last one)
            if (index < gamesToShow.length - 1) {
                html += '<div class="game-divider thick"></div>';
            }
        });
        
        this.gamesContainer.innerHTML = html;
        
        // Add error handlers to all images
        this._addImageErrorHandlers(gamesToShow);
    }

    /**
     * Measure the actual rendered content height
     * Call this AFTER renderGames() to get the real DOM height
     * @returns {number} Height in pixels including padding
     */
    measureContentHeight() {
        // Make sure content is visible so we can measure it
        const wasHidden = this.otherGamesContent.style.display === 'none';
        
        if (wasHidden) {
            // Temporarily make visible but transparent for measurement
            this.otherGamesContent.style.display = 'block';
            this.otherGamesContent.style.opacity = '0';
        }
        
        // Force layout calculation
        void this.otherGamesContent.offsetHeight;
        
        // Measure actual content height
        const contentHeight = this.otherGamesContent.scrollHeight;
        
        // Add box padding (13px top + 18px bottom from CSS)
        const boxPadding = 31;
        const totalHeight = contentHeight + boxPadding;
        
        console.log('📏 [OtherGamesView] Measured content:', contentHeight, 'px → Total with padding:', totalHeight, 'px');
        
        // If it was hidden, restore that state
        if (wasHidden) {
            this.otherGamesContent.style.display = 'none';
            this.otherGamesContent.style.opacity = '1';
        }
        
        return totalHeight;
    }
    
    /**
     * Add error handlers to images for debugging
     * @private
     */
    _addImageErrorHandlers(games) {
        setTimeout(() => {
            document.querySelectorAll('.compact .team-logo').forEach(img => {
                img.addEventListener('error', function() {
                    // Just hide broken images - the abbreviation below will still show
                    this.style.visibility = 'hidden';
                });
            });
        }, 0);
    }

    /**
     * Render a pregame game
     * @private
     */
    _renderPregameGame(game, gameIndex) {
        const countdown = game.secondsUntilStart !== undefined 
            ? this.formatCountdown(game.secondsUntilStart) 
            : '00:00:00';
        
        return `
            <div class="game-in-card compact">
                <div class="live-indicator">
                    <span class="live-text">Upcoming</span>
                </div>
                <div class="matchup-preview with-names">
                    <div class="preview-team">
                        <img class="preview-logo" src="${game.away.logo}" alt="${game.away.abbr}" crossorigin="anonymous">
                        <span class="preview-abbr">${game.away.abbr}</span>
                    </div>
                    <span class="vs-text">vs</span>
                    <div class="preview-team">
                        <span class="preview-abbr">${game.home.abbr}</span>
                        <img class="preview-logo" src="${game.home.logo}" alt="${game.home.abbr}" crossorigin="anonymous">
                    </div>
                </div>
                <div class="countdown-container">
                    <div class="countdown-label">Starts In</div>
                    <div class="countdown-time countdown-timer" data-game-index="${gameIndex}">${countdown}</div>
                </div>
            </div>
        `;
    }

    /**
     * Render a live game
     * @private
     */
    _renderLiveGame(game) {
        return `
            <div class="game-in-card compact">
                <div class="live-indicator">
                    <div class="live-dot"></div>
                    <span class="live-text">Live</span>
                </div>
                <div class="teams">
                    <div class="team">
                        <div class="team-left">
                            <img class="team-logo" src="${game.away.logo}" alt="${game.away.abbr}" crossorigin="anonymous">
                            <div class="team-abbr">${game.away.abbr}</div>
                        </div>
                        <div class="score">${game.away.score}</div>
                    </div>
                    <div class="team">
                        <div class="team-left">
                            <img class="team-logo" src="${game.home.logo}" alt="${game.home.abbr}" crossorigin="anonymous">
                            <div class="team-abbr">${game.home.abbr}</div>
                        </div>
                        <div class="score">${game.home.score}</div>
                    </div>
                </div>
                <div class="game-status">${game.quarter}</div>
            </div>
        `;
    }

    /**
     * Render a final game
     * @private
     */
    _renderFinalGame(game) {
        return `
            <div class="game-in-card compact">
                <div class="teams">
                    <div class="team">
                        <div class="team-left">
                            <img class="team-logo" src="${game.away.logo}" alt="${game.away.abbr}" crossorigin="anonymous">
                            <div class="team-abbr">${game.away.abbr}</div>
                        </div>
                        <div class="score">${game.away.score}</div>
                    </div>
                    <div class="team">
                        <div class="team-left">
                            <img class="team-logo" src="${game.home.logo}" alt="${game.home.abbr}" crossorigin="anonymous">
                            <div class="team-abbr">${game.home.abbr}</div>
                        </div>
                        <div class="score">${game.home.score}</div>
                    </div>
                </div>
                <div class="game-status final">${game.status}</div>
            </div>
        `;
    }

    /**
     * Update countdown timers for visible pregame games
     * @param {Array} games - All games array
     */
    updateCountdowns(games) {
        document.querySelectorAll('.countdown-timer').forEach(el => {
            const gameIndex = parseInt(el.dataset.gameIndex);
            if (games[gameIndex] && games[gameIndex].secondsUntilStart > 0) {
                games[gameIndex].secondsUntilStart--;
                el.textContent = this.formatCountdown(games[gameIndex].secondsUntilStart);
            }
        });
    }

    /**
     * Fade out the games container
     * @param {number} duration - Fade duration in ms
     * @returns {Promise}
     */
    fadeOut(duration) {
        return new Promise(resolve => {
            this.gamesContainer.style.transition = `opacity ${duration / 1000}s ease`;
            this.gamesContainer.style.opacity = '0';
            setTimeout(resolve, duration);
        });
    }

    /**
     * Fade in the games container
     * @param {number} duration - Fade duration in ms
     * @returns {Promise}
     */
    fadeIn(duration) {
        return new Promise(resolve => {
            this.gamesContainer.style.transition = `opacity ${duration / 1000}s ease`;
            this.gamesContainer.style.opacity = '1';
            setTimeout(resolve, duration);
        });
    }
}

