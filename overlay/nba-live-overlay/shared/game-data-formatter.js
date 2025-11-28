/**
 * GameDataFormatter - Handles data transformation for views
 * Single Responsibility: Format ESPN API data for display in views
 * 
 * Extracted from AppController to follow Single Responsibility Principle
 */

class GameDataFormatter {
    constructor(stateManager) {
        this.stateManager = stateManager;
    }

    /**
     * Format ESPN API game data for GameView
     * USES existing utilities from game-utils.js
     * @param {Object} game - ESPN game data
     * @param {string} stateName - Game state
     * @param {Object} scoreChanges - { homeChanged, awayChanged }
     * @returns {Object}
     */
    formatGameDataForView(game, stateName, scoreChanges = { homeChanged: false, awayChanged: false }) {
        // Base team data (used by all states)
        const baseData = {
            home: {
                abbr: game.homeTeam.abbreviation,
                logoUrl: game.homeTeam.logo,
                score: parseInt(game.homeTeam.score) || 0,
                animate: scoreChanges.homeChanged // Add animation flag
            },
            away: {
                abbr: game.awayTeam.abbreviation,
                logoUrl: game.awayTeam.logo,
                score: parseInt(game.awayTeam.score) || 0,
                animate: scoreChanges.awayChanged // Add animation flag
            }
        };

        // State-specific formatting
        switch (stateName) {
            case 'pregame':
                // USES existing utility from game-utils.js
                const secondsUntilGame = window.calculateSecondsUntilStart(game.date);

                // Update state manager's countdown seconds
                this.stateManager.setCountdownSeconds(secondsUntilGame);

                // USES existing utility from game-utils.js
                return {
                    homeTeam: baseData.home,
                    awayTeam: baseData.away,
                    countdown: window.formatCountdown(secondsUntilGame)
                };

            case 'live':
                // USES existing utility from game-utils.js
                const liveStatus = window.formatLiveGameStatus(game.statusText);
                return {
                    ...baseData,
                    quarter: liveStatus.quarter,
                    time: liveStatus.time
                };

            case 'halftime':
            case 'final':
                return baseData;

            default:
                return baseData;
        }
    }

    /**
     * Transform game data for other games view
     * Uses same logic as other-games-overlay
     */
    transformGameDataForOtherGames(game) {
        const state = window.detectGameState(game);
        
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
            baseGame.secondsUntilStart = window.calculateSecondsUntilStart(game.date);
        } else if (state === 'live') {
            baseGame.quarter = window.formatLiveGameStatus(game.statusText).formatted;
        } else if (state === 'halftime') {
            baseGame.quarter = 'Halftime';
        } else if (state === 'final') {
            baseGame.status = 'FINAL';
        }
        
        return baseGame;
    }
}

