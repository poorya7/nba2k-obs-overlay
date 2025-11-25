/**
 * OtherGamesView - Handles rendering of other games overlay
 * Single Responsibility: View layer only, no business logic
 */

class OtherGamesView {
    constructor() {
        this.gamesContainer = document.getElementById('games-container');
    }

    /**
     * Format countdown time
     * @param {number} seconds - Seconds until game starts
     * @returns {string} Formatted time (HH:MM:SS)
     */
    formatCountdown(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
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
            } else if (game.state === 'live') {
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
     * Add error handlers to images for debugging
     * @private
     */
    _addImageErrorHandlers(games) {
        setTimeout(() => {
            document.querySelectorAll('.other-game-logo').forEach(img => {
                img.addEventListener('error', function() {
                    console.error('Failed to load image:', this.src, 'Alt:', this.alt);
                    // Just hide broken images - the abbreviation below will still show
                    this.style.visibility = 'hidden';
                });
                img.addEventListener('load', function() {
                    console.log('Successfully loaded image:', this.alt);
                });
            });
        }, 0);
    }

    /**
     * Render a pregame game
     * @private
     */
    _renderPregameGame(game, gameIndex) {
        return `
            <div class="game-in-card">
                <div class="other-game-teams">
                    <div class="other-game-team">
                        <div class="other-game-team-left">
                            <img class="other-game-logo" src="${game.away.logo}" alt="${game.away.abbr}" crossorigin="anonymous">
                            <span class="other-game-abbr">${game.away.abbr}</span>
                            <span style="margin: 0 4px; color: #94a3b8; font-size: 10px;">@</span>
                            <img class="other-game-logo" src="${game.home.logo}" alt="${game.home.abbr}" crossorigin="anonymous">
                            <span class="other-game-abbr">${game.home.abbr}</span>
                        </div>
                    </div>
                </div>
                <div class="other-game-status pregame countdown-timer" data-game-index="${gameIndex}">
                    Starts in ${this.formatCountdown(game.secondsUntilStart)}
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
            <div class="game-in-card">
                <div class="other-game-status live">LIVE</div>
                <div class="other-game-teams">
                    <div class="other-game-team">
                        <div class="other-game-team-left">
                            <img class="other-game-logo" src="${game.away.logo}" alt="${game.away.abbr}" crossorigin="anonymous">
                            <span class="other-game-abbr">${game.away.abbr}</span>
                        </div>
                        <span class="other-game-score">${game.away.score}</span>
                    </div>
                    <div class="other-game-team">
                        <div class="other-game-team-left">
                            <img class="other-game-logo" src="${game.home.logo}" alt="${game.home.abbr}" crossorigin="anonymous">
                            <span class="other-game-abbr">${game.home.abbr}</span>
                        </div>
                        <span class="other-game-score">${game.home.score}</span>
                    </div>
                </div>
                <div class="other-game-status">
                    <span class="game-time" style="color: #4ade80;">${game.quarter}</span>
                </div>
            </div>
        `;
    }

    /**
     * Render a final game
     * @private
     */
    _renderFinalGame(game) {
        return `
            <div class="game-in-card">
                <div class="other-game-teams">
                    <div class="other-game-team">
                        <div class="other-game-team-left">
                            <img class="other-game-logo" src="${game.away.logo}" alt="${game.away.abbr}" crossorigin="anonymous">
                            <span class="other-game-abbr">${game.away.abbr}</span>
                        </div>
                        <span class="other-game-score">${game.away.score}</span>
                    </div>
                    <div class="other-game-team">
                        <div class="other-game-team-left">
                            <img class="other-game-logo" src="${game.home.logo}" alt="${game.home.abbr}" crossorigin="anonymous">
                            <span class="other-game-abbr">${game.home.abbr}</span>
                        </div>
                        <span class="other-game-score">${game.home.score}</span>
                    </div>
                </div>
                <div class="other-game-status final">${game.status}</div>
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
                el.textContent = 'Starts in ' + this.formatCountdown(games[gameIndex].secondsUntilStart);
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

