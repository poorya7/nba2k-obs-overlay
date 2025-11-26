// ==================== SIMULATION DATA GENERATOR ====================
// Generates fake game data for testing without live API calls

class SimulationManager {
    /**
     * Get sample games for testing
     * @returns {Array} Array of sample game objects
     */
    getSampleGames() {
        return [
            { 
                state: 'pregame', 
                away: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/bos.png', abbr: 'BOS' },
                home: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/mia.png', abbr: 'MIA' },
                secondsUntilStart: 8130 // 2:15:30
            },
            { 
                state: 'live', 
                away: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/den.png', abbr: 'DEN', score: 94 },
                home: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/phx.png', abbr: 'PHX', score: 88 },
                quarter: 'Q4 · 5:23'
            },
            { 
                state: 'final', 
                away: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/dal.png', abbr: 'DAL', score: 112 },
                home: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/sac.png', abbr: 'SAC', score: 108 },
                status: 'FINAL'
            },
            { 
                state: 'pregame', 
                away: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/chi.png', abbr: 'CHI' },
                home: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/mil.png', abbr: 'MIL' },
                secondsUntilStart: 13500 // 3:45:00
            },
            { 
                state: 'live', 
                away: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/mem.png', abbr: 'MEM', score: 55 },
                home: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/nyk.png', abbr: 'NYK', score: 62 },
                quarter: 'Q2 · 8:15'
            },
            { 
                state: 'live', 
                away: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/atl.png', abbr: 'ATL', score: 78 },
                home: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/cle.png', abbr: 'CLE', score: 81 },
                quarter: 'Q3 · 2:34'
            },
            { 
                state: 'final', 
                away: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/utah.png', abbr: 'UTA', score: 98 },
                home: { logo: 'https://a.espncdn.com/i/teamlogos/nba/500/okc.png', abbr: 'OKC', score: 105 },
                status: 'FINAL'
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

