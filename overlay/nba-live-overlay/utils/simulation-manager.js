/**
 * SimulationManager - Generates fake game data for testing
 * Single Responsibility: Create realistic simulation data without ESPN API calls
 * 
 * Extracts the generateSimulationData() function into a clean class
 */

class SimulationManager {
    /**
     * @param {Object} options - Configuration options
     * @param {Object} options.homeTeam - Home team configuration
     * @param {string} options.homeTeam.abbreviation - Home team abbreviation
     * @param {string} options.homeTeam.logo - Home team logo URL
     * @param {Object} options.awayTeam - Away team configuration
     * @param {string} options.awayTeam.abbreviation - Away team abbreviation
     * @param {string} options.awayTeam.logo - Away team logo URL
     */
    constructor(options = {}) {
        // Default simulation data
        this.simulationData = {
            homeScore: 0,
            awayScore: 0,
            quarter: 'Q1',
            timeSeconds: 720, // 12:00 in seconds
            state: 'live'
        };

        // Configuration with defaults
        this.config = {
            homeTeam: options.homeTeam || {
                abbreviation: 'LAL',
                logo: 'https://a.espncdn.com/i/teamlogos/nba/500/lal.png'
            },
            awayTeam: options.awayTeam || {
                abbreviation: 'GSW',
                logo: 'https://a.espncdn.com/i/teamlogos/nba/500/gsw.png'
            }
        };
        
        // Score update timing (independent of polling rate)
        this.lastScoreUpdate = Date.now();
        this.scoreUpdateInterval = 3000; // Update scores every 3 seconds
    }

    /**
     * Generate fake game data based on server-provided state
     * @param {string} serverState - State from dashboard ('pregame', 'live', 'halftime', 'final')
     * @param {number} timeMultiplier - Time acceleration multiplier (1 = normal, 10 = fast forward)
     * @returns {Object} Fake game object matching ESPN API format
     */
    generateGameData(serverState, timeMultiplier = 1) {
        // Update scores only if enough time has passed (adjusted for time multiplier)
        const now = Date.now();
        const adjustedInterval = this.scoreUpdateInterval / timeMultiplier;
        if (now - this.lastScoreUpdate >= adjustedInterval) {
            this._updateScores();
            this.lastScoreUpdate = now;
        }

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
     * Set teams for simulation
     * @param {Object} homeTeam - {abbreviation, logo}
     * @param {Object} awayTeam - {abbreviation, logo}
     * @returns {void}
     */
    setTeams(homeTeam, awayTeam) {
        if (homeTeam) {
            this.config.homeTeam = {
                abbreviation: homeTeam.abbreviation || this.config.homeTeam.abbreviation,
                logo: homeTeam.logo || this.config.homeTeam.logo
            };
        }
        if (awayTeam) {
            this.config.awayTeam = {
                abbreviation: awayTeam.abbreviation || this.config.awayTeam.abbreviation,
                logo: awayTeam.logo || this.config.awayTeam.logo
            };
        }
    }

    /**
     * Reset simulation data (for new simulation session)
     * @returns {void}
     */
    reset() {
        this.simulationData = {
            homeScore: 0,
            awayScore: 0,
            quarter: 'Q1',
            timeSeconds: 720,
            state: 'live'
        };
        this.lastScoreUpdate = Date.now();
        this.resetPlayByPlay();
    }

    // ==================== PLAY-BY-PLAY SIMULATION ====================

    /**
     * Load play-by-play data from server JSON file
     * @param {string} gameId - Game ID (used to find the JSON file)
     * @returns {Promise<boolean>} True if loaded successfully
     */
    async loadPlayByPlayData(gameId = 'game-401810240') {
        try {
            const response = await fetch(`http://localhost:3000/server/data/play-by-play/${gameId}.json`);
            if (!response.ok) {
                console.warn('⚠️ Could not load play-by-play data:', response.status);
                return false;
            }
            
            const plays = await response.json();
            
            // Deduplicate plays based on period+clock+player+action
            const seenKeys = new Set();
            this.pbpPlays = plays.filter(play => {
                const key = `${play.period}|${play.clock}|${play.playerName}|${play.action}`.toLowerCase();
                if (seenKeys.has(key)) {
                    return false; // Skip duplicate
                }
                seenKeys.add(key);
                return true;
            });
            
            this.pbpIndex = 0;
            this.pbpLastPlayTime = Date.now();
            console.log(`✅ Loaded ${this.pbpPlays.length} unique plays (from ${plays.length} total)`);
            return true;
        } catch (error) {
            console.error('❌ Error loading play-by-play data:', error);
            return false;
        }
    }

    /**
     * Get the next play in sequence (if enough time has passed)
     * Returns plays at ~3-5 second intervals to simulate real game pace
     * @param {number} minIntervalMs - Minimum time between plays (default 3000ms)
     * @returns {Object|null} Next play object or null if not ready/no more plays
     */
    getNextPlay(minIntervalMs = 3000) {
        // No plays loaded
        if (!this.pbpPlays || this.pbpPlays.length === 0) {
            return null;
        }
        
        // All plays exhausted - loop back to start
        if (this.pbpIndex >= this.pbpPlays.length) {
            this.pbpIndex = 0;
        }
        
        // Check if enough time has passed since last play
        const now = Date.now();
        if (now - this.pbpLastPlayTime < minIntervalMs) {
            return null; // Not time yet
        }
        
        // Get next play and advance index
        const play = this.pbpPlays[this.pbpIndex];
        this.pbpIndex++;
        this.pbpLastPlayTime = now;
        
        // Transform to match ESPN API format expected by processor
        return {
            id: `sim-${this.pbpIndex}`,
            text: `${play.playerName} ${play.action}`,
            shortText: play.action,
            period: play.period,
            clock: play.clock,
            homeScore: play.homeScore,
            awayScore: play.awayScore,
            isScoringPlay: false,
            team: null,
            participants: [{
                athlete: {
                    displayName: play.playerName
                }
            }],
            // Pass through original fields too
            isTimeout: play.isTimeout || false,
            playerName: play.playerName,
            action: play.action
        };
    }

    /**
     * Reset play-by-play to start
     */
    resetPlayByPlay() {
        this.pbpPlays = [];
        this.pbpIndex = 0;
        this.pbpLastPlayTime = 0;
    }

    /**
     * Check if play-by-play data is loaded
     * @returns {boolean}
     */
    hasPlayByPlayData() {
        return this.pbpPlays && this.pbpPlays.length > 0;
    }

    /**
     * Get play-by-play progress info
     * @returns {Object} {current, total, percentComplete}
     */
    getPlayByPlayProgress() {
        const total = this.pbpPlays?.length || 0;
        const current = this.pbpIndex;
        return {
            current,
            total,
            percentComplete: total > 0 ? Math.round((current / total) * 100) : 0
        };
    }

    // ==================== END PLAY-BY-PLAY SIMULATION ====================

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

    /**
     * Get sample other games for testing (ALL LIVE - for measuring max heights)
     * @returns {Array} Array of all live game objects
     */
    getSampleGamesAllLive() {
        const now = Date.now();
        return [
            { 
                state: 'live', 
                away: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/dal.png', abbr: 'DAL', score: 112 },
                home: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/sac.png', abbr: 'SAC', score: 108 },
                quarter: 'Q2 · 3:45',
                startTime: now - 1800000 // Started 30 min ago (earliest)
            },
            { 
                state: 'live', 
                away: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/mem.png', abbr: 'MEM', score: 55 },
                home: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/nyk.png', abbr: 'NYK', score: 62 },
                quarter: 'Q2 · 8:15',
                startTime: now - 2700000 // Started 45 min ago
            },
            { 
                state: 'live', 
                away: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/bos.png', abbr: 'BOS', score: 87 },
                home: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/mia.png', abbr: 'MIA', score: 92 },
                quarter: 'Q3 · 8:15',
                startTime: now - 3600000 // Started 1 hour ago
            },
            { 
                state: 'live', 
                away: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/chi.png', abbr: 'CHI', score: 76 },
                home: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/mil.png', abbr: 'MIL', score: 83 },
                quarter: 'Q3 · 11:20',
                startTime: now - 4500000 // Started 1 hour 15 min ago
            },
            { 
                state: 'live', 
                away: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/den.png', abbr: 'DEN', score: 94 },
                home: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/phx.png', abbr: 'PHX', score: 88 },
                quarter: 'Q4 · 5:23',
                startTime: now - 5400000 // Started 1.5 hours ago (latest in Q4)
            },
            { 
                state: 'live', 
                away: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/atl.png', abbr: 'ATL', score: 78 },
                home: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/cle.png', abbr: 'CLE', score: 81 },
                quarter: 'Q3 · 2:34'
            },
            { 
                state: 'live', 
                away: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/utah.png', abbr: 'UTA', score: 98 },
                home: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/okc.png', abbr: 'OKC', score: 105 },
                quarter: 'Q4 · 1:12'
            },
            { 
                state: 'live', 
                away: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/por.png', abbr: 'POR', score: 64 },
                home: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/lac.png', abbr: 'LAC', score: 71 },
                quarter: 'Q2 · 6:40'
            },
            { 
                state: 'live', 
                away: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/min.png', abbr: 'MIN', score: 42 },
                home: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/ind.png', abbr: 'IND', score: 38 },
                quarter: 'Q1 · 4:52'
            },
            { 
                state: 'live', 
                away: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/det.png', abbr: 'DET', score: 87 },
                home: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/tor.png', abbr: 'TOR', score: 92 },
                quarter: 'OT · 3:25'
            }
        ];
    }

    /**
     * Get sample other games for testing (MIXED STATES - original)
     * @returns {Array} Array of sample game objects
     */
    getSampleGames() {
        const now = Date.now();
        return [
            { 
                state: 'final', 
                away: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/dal.png', abbr: 'DAL', score: 112 },
                home: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/sac.png', abbr: 'SAC', score: 108 },
                status: 'FINAL',
                startTime: now - 7200000 // Finished 2 hours ago
            },
            { 
                state: 'live', 
                away: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/den.png', abbr: 'DEN', score: 94 },
                home: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/phx.png', abbr: 'PHX', score: 88 },
                quarter: 'Q4 · 5:23',
                startTime: now - 5400000 // Started 1.5 hours ago
            },
            { 
                state: 'live', 
                away: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/mem.png', abbr: 'MEM', score: 55 },
                home: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/nyk.png', abbr: 'NYK', score: 62 },
                quarter: 'Q2 · 8:15',
                startTime: now - 3600000 // Started 1 hour ago
            },
            { 
                state: 'pregame', 
                away: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/bos.png', abbr: 'BOS' },
                home: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/mia.png', abbr: 'MIA' },
                secondsUntilStart: 8130, // 2:15:30
                startTime: now + 8130000 // Starts in 2:15:30
            },
            { 
                state: 'pregame', 
                away: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/chi.png', abbr: 'CHI' },
                home: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/mil.png', abbr: 'MIL' },
                secondsUntilStart: 13500, // 3:45:00
                startTime: now + 13500000 // Starts in 3:45:00
            },
            { 
                state: 'live', 
                away: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/atl.png', abbr: 'ATL', score: 78 },
                home: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/cle.png', abbr: 'CLE', score: 81 },
                quarter: 'Q3 · 2:34',
                startTime: now - 4500000 // Started 1 hour 15 min ago
            },
            { 
                state: 'final', 
                away: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/utah.png', abbr: 'UTA', score: 98 },
                home: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/okc.png', abbr: 'OKC', score: 105 },
                status: 'FINAL',
                startTime: now - 9000000 // Finished 2.5 hours ago
            },
            { 
                state: 'pregame', 
                away: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/por.png', abbr: 'POR' },
                home: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/lac.png', abbr: 'LAC' },
                secondsUntilStart: 15615 // 4:20:15
            },
            { 
                state: 'live', 
                away: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/min.png', abbr: 'MIN', score: 42 },
                home: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/ind.png', abbr: 'IND', score: 38 },
                quarter: 'Q1 · 4:52'
            },
            { 
                state: 'final', 
                away: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/det.png', abbr: 'DET', score: 87 },
                home: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/tor.png', abbr: 'TOR', score: 92 },
                status: 'FINAL'
            }
        ];
    }
}

