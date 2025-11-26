/**
 * SimulationManager - Generates fake game data for testing
 * Single Responsibility: Create realistic simulation data without ESPN API calls
 * 
 * Extracts the generateSimulationData() function into a clean class
 */

class SimulationManager {
    constructor() {
        // Default simulation data
        this.simulationData = {
            homeScore: 0,
            awayScore: 0,
            quarter: 'Q1',
            timeSeconds: 720, // 12:00 in seconds
            state: 'live'
        };

        // Configuration
        this.config = {
            homeTeam: {
                abbreviation: 'LAL',
                logo: 'https://a.espncdn.com/i/teamlogos/nba/500/lal.png'
            },
            awayTeam: {
                abbreviation: 'GSW',
                logo: 'https://a.espncdn.com/i/teamlogos/nba/500/gsw.png'
            }
        };
    }

    /**
     * Generate fake game data based on server-provided state
     * @param {string} serverState - State from dashboard ('pregame', 'live', 'halftime', 'final')
     * @returns {Object} Fake game object matching ESPN API format
     */
    generateGameData(serverState) {
        // Update scores (randomly)
        this._updateScores();

        // Update state/quarter/time based on dashboard state
        if (serverState) {
            this._updateFromServerState(serverState);
        } else {
            this._autoProgressState();
        }

        // Format and return game object
        return this._createGameObject();
    }

    /**
     * Randomly increment scores
     * @private
     */
    _updateScores() {
        if (Math.random() < 0.5) {
            this.simulationData.homeScore += Math.random() < 0.7 ? 2 : 3; // 2pt or 3pt
        } else {
            this.simulationData.awayScore += Math.random() < 0.7 ? 2 : 3;
        }
    }

    /**
     * Update state based on dashboard-selected state
     * @param {string} serverState
     * @private
     */
    _updateFromServerState(serverState) {
        this.simulationData.state = serverState;

        switch (serverState) {
            case 'pregame':
                this.simulationData.quarter = 'Q1';
                this.simulationData.timeSeconds = 720;
                break;

            case 'live':
                // Keep current quarter or default to Q3 if not set
                if (!this.simulationData.quarter || this.simulationData.quarter === 'Q1') {
                    this.simulationData.quarter = 'Q3';
                }
                if (this.simulationData.timeSeconds <= 0) {
                    this.simulationData.timeSeconds = 420; // 7:00
                }
                // Tick down time
                this.simulationData.timeSeconds -= Math.floor(Math.random() * 15) + 5;
                break;

            case 'halftime':
                this.simulationData.quarter = 'Q2';
                this.simulationData.timeSeconds = 0;
                break;

            case 'overtime':
                this.simulationData.quarter = 'OT';
                this.simulationData.timeSeconds -= Math.floor(Math.random() * 15) + 5;
                if (this.simulationData.timeSeconds <= 0) {
                    this.simulationData.timeSeconds = 300; // 5:00
                }
                break;

            case 'final':
                this.simulationData.quarter = 'Q4';
                this.simulationData.timeSeconds = 0;
                break;
        }
    }

    /**
     * Auto-progress through game states (when no dashboard state provided)
     * @private
     */
    _autoProgressState() {
        // Tick down time
        this.simulationData.timeSeconds -= Math.floor(Math.random() * 15) + 5;

        // Handle quarter transitions
        if (this.simulationData.timeSeconds <= 0) {
            switch (this.simulationData.quarter) {
                case 'Q1':
                    this.simulationData.quarter = 'Q2';
                    this.simulationData.timeSeconds = 720;
                    break;

                case 'Q2':
                    this.simulationData.state = 'halftime';
                    this.simulationData.timeSeconds = 0;
                    break;

                case 'Q3':
                    this.simulationData.quarter = 'Q4';
                    this.simulationData.timeSeconds = 720;
                    break;

                case 'Q4':
                    this.simulationData.state = 'final';
                    this.simulationData.timeSeconds = 0;
                    break;
            }
        } else if (this.simulationData.state === 'halftime') {
            // Coming back from halftime
            this.simulationData.state = 'live';
            this.simulationData.quarter = 'Q3';
            this.simulationData.timeSeconds = 720;
        }
    }

    /**
     * Format time as MM:SS
     * @returns {string}
     * @private
     */
    _formatTime() {
        const minutes = Math.floor(this.simulationData.timeSeconds / 60);
        const seconds = this.simulationData.timeSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Get status text based on current state
     * @returns {string}
     * @private
     */
    _getStatusText() {
        switch (this.simulationData.state) {
            case 'pregame':
                return 'Scheduled';
            case 'halftime':
                return 'Halftime';
            case 'final':
                return 'Final';
            default:
                // Live or overtime
                return `${this.simulationData.quarter} ${this._formatTime()}`;
        }
    }

    /**
     * Create game object matching ESPN API format
     * @returns {Object}
     * @private
     */
    _createGameObject() {
        return {
            id: 'simulation',
            homeTeam: {
                abbreviation: this.config.homeTeam.abbreviation,
                logo: this.config.homeTeam.logo,
                score: this.simulationData.homeScore
            },
            awayTeam: {
                abbreviation: this.config.awayTeam.abbreviation,
                logo: this.config.awayTeam.logo,
                score: this.simulationData.awayScore
            },
            isLive: this.simulationData.state === 'live' || 
                    this.simulationData.state === 'overtime' || 
                    this.simulationData.state === 'halftime',
            isFinal: this.simulationData.state === 'final',
            statusText: this._getStatusText(),
            date: new Date().toISOString()
        };
    }

    /**
     * Reset simulation data (for new simulation session)
     */
    reset() {
        this.simulationData = {
            homeScore: 0,
            awayScore: 0,
            quarter: 'Q1',
            timeSeconds: 720,
            state: 'live'
        };
    }

    /**
     * Get simulated MVP data (hardcoded for testing)
     * @returns {Object}
     */
    getSimulatedMVPData() {
        return {
            name: 'Giannis Antetokounmpo',
            photoUrl: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/3032977.png',
            pts: 32,
            reb: 11,
            ast: 6,
            teamLogo: 'https://a.espncdn.com/i/teamlogos/nba/500/mil.png'
        };
    }
}

