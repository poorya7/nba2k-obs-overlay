// NBA API Integration - ESPN Scoreboard
// Reused from backup dashboard with modifications for overlay

/**
 * Get date string in YYYYMMDD format for ESPN API
 * @param {number} daysOffset - Days to offset from today (0 = today, -1 = yesterday, etc.)
 */
function getDateString(daysOffset = 0) {
  const timezone = window.NBA_CONFIG?.TIMEZONE || 'America/New_York';
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  
  const year = date.toLocaleString('en-US', { timeZone: timezone, year: 'numeric' });
  const month = date.toLocaleString('en-US', { timeZone: timezone, month: '2-digit' });
  const day = date.toLocaleString('en-US', { timeZone: timezone, day: '2-digit' });
  
  return `${year}${month}${day}`;
}

/**
 * Get today's date in YYYYMMDD format for ESPN API
 */
function getTodayDateString() {
  return getDateString(0);
}

/**
 * Fetch today's NBA games from ESPN API
 * Also includes games from yesterday that are still live (past midnight games)
 */
async function fetchTodaysGames() {
  try {
    const todayDate = getTodayDateString();
    const yesterdayDate = getDateString(-1);
    
    
    // Fetch both today's games and yesterday's games
    const [todayResponse, yesterdayResponse] = await Promise.all([
      fetch(`${window.NBA_CONFIG.ESPN_NBA_SCOREBOARD}?dates=${todayDate}`),
      fetch(`${window.NBA_CONFIG.ESPN_NBA_SCOREBOARD}?dates=${yesterdayDate}`)
    ]);
    
    if (!todayResponse.ok || !yesterdayResponse.ok) {
      throw new Error('ESPN API returned error');
    }
    
    const todayData = await todayResponse.json();
    const yesterdayData = await yesterdayResponse.json();
    
    const todayGames = todayData.events || [];
    const yesterdayGames = yesterdayData.events || [];
    
    // Filter yesterday's games: include if live/in-progress OR finished within last hour
    const relevantYesterdayGames = yesterdayGames.filter(game => {
      const competition = game.competitions[0];
      const status = competition.status.type.name;
      
      // Include if in progress, halftime, or end of period
      if (status === 'STATUS_IN_PROGRESS' || 
          status === 'STATUS_HALFTIME' || 
          status === 'STATUS_END_PERIOD' ||
          status.includes('END')) {
        return true;
      }
      
      // If final, check if it finished within the last 2 hours
      if (status === 'STATUS_FINAL') {
        const gameDate = new Date(game.date);
        const now = new Date();
        const hoursSinceGame = (now - gameDate) / (1000 * 60 * 60);
        
        // Game typically lasts 2.5 hours, so if game started < 4.5 hours ago, it finished < 2 hours ago
        return hoursSinceGame < 5;
      }
      
      // Don't include scheduled games from yesterday
      return false;
    });
    
    
    // Combine: yesterday's games first (so live/recent games appear at top), then today's games
    return [...relevantYesterdayGames, ...todayGames];
  } catch (error) {
    throw error;
  }
}

/**
 * Convert time to MM:SS format
 * Handles both "8:32" (already MM:SS) and "8.7" (decimal seconds)
 */
function convertToMMSS(timeStr) {
  // If it already has a colon, assume it's MM:SS format
  if (timeStr.includes(':')) {
    // Ensure 2-digit padding
    const [min, sec] = timeStr.split(':');
    return `${min.padStart(2, '0')}:${sec.padStart(2, '0')}`;
  }
  
  // Otherwise it's decimal seconds (e.g., "8.7" or "31.2")
  const totalSeconds = Math.floor(parseFloat(timeStr));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Parse ESPN status to SHORT format (matching transition-test.html)
 * "1st Quarter 8:32" -> "Q1 8:32"
 * "4th Quarter 3:45" -> "Q4 3:45"
 * "Overtime 2:30" -> "OT 2:30"
 */
function parseStatusToShortFormat(statusDetail) {
  // Already short? Return as-is
  if (/^Q\d+\s+[\d:.]+/.test(statusDetail) || /^OT\s+[\d:.]+/.test(statusDetail)) {
    return statusDetail;
  }
  
  // Halftime variations
  if (/halftime|half\s+time|half$/i.test(statusDetail)) {
    return 'Halftime';
  }
  
  // End of Quarter: "End of 3rd Quarter" -> "Q3 End"
  const endQuarterMatch = statusDetail.match(/End\s+of\s+(\d+)(?:st|nd|rd|th)\s+Quarter/i);
  if (endQuarterMatch) {
    return `Q${endQuarterMatch[1]} End`;
  }
  
  // "0:00 - 3rd Quarter" -> "Q3 0:00" (but show as End)
  const zeroTimeMatch = statusDetail.match(/0:00\s+-\s+(\d+)(?:st|nd|rd|th)\s+Quarter/i);
  if (zeroTimeMatch) {
    return `Q${zeroTimeMatch[1]} End`;
  }
  
  // ESPN FORMAT: "4:59 - 4th Quarter" OR "31.2 - 4th Quarter" -> "Q4 4:59" or "Q4 00:31"
  // Convert decimal seconds to MM:SS format for consistency
  const quarterMatch = statusDetail.match(/([\d:.]+)\s+-\s+(\d+)(?:st|nd|rd|th)\s+Quarter/i);
  if (quarterMatch) {
    const time = convertToMMSS(quarterMatch[1]);
    return `Q${quarterMatch[2]} ${time}`;
  }
  
  // "3:45 - Overtime" OR "31.2 - Overtime" -> "OT 3:45" or "OT 00:31"
  const otMatch = statusDetail.match(/([\d:.]+)\s+-\s+(?:Overtime|OT)/i);
  if (otMatch) {
    const time = convertToMMSS(otMatch[1]);
    return `OT ${time}`;
  }
  
  // Return as-is for other cases
  return statusDetail;
}

/**
 * Get game status information
 */
function getGameStatus(competition) {
  const status = competition.status.type.name;
  const statusDetail = competition.status.type.detail;
  
  
  if (status === 'STATUS_SCHEDULED') {
    return { 
      status: 'scheduled', 
      text: 'Scheduled', 
      isLive: false,
      isFinal: false
    };
  } else if (status === 'STATUS_IN_PROGRESS') {
    const parsedStatus = parseStatusToShortFormat(statusDetail);
    // Halftime is still "in progress" technically, so set isLive: true
    return { 
      status: 'live', 
      text: parsedStatus,
      isLive: true, // Halftime counts as "live"
      isFinal: false
    };
  } else if (status === 'STATUS_HALFTIME') {
    // ESPN might have a separate halftime status
    return { 
      status: 'live', 
      text: 'Halftime',
      isLive: true, // Halftime is still live!
      isFinal: false
    };
  } else if (status === 'STATUS_END_PERIOD') {
    // End of quarter - game is still live!
    const parsedStatus = parseStatusToShortFormat(statusDetail);
    return { 
      status: 'live', 
      text: parsedStatus,
      isLive: true, // End of quarter is still live!
      isFinal: false
    };
  } else if (status.includes('END') || statusDetail.toLowerCase().includes('end of')) {
    // Any other "END" status (end of period, end of quarter, etc.)
    const parsedStatus = parseStatusToShortFormat(statusDetail);
    return { 
      status: 'live', 
      text: parsedStatus,
      isLive: true,
      isFinal: false
    };
  } else if (status === 'STATUS_FINAL') {
    return { 
      status: 'final', 
      text: 'Final',
      isLive: false,
      isFinal: true
    };
  }
  
  // Unknown status - log it and treat as not live
  return { 
    status: 'unknown', 
    text: parseStatusToShortFormat(statusDetail),
    isLive: false,
    isFinal: false
  };
}

/**
 * Parse game data into clean format for overlay
 */
function parseGameData(game) {
  const competition = game.competitions[0];
  const awayTeam = competition.competitors.find(t => t.homeAway === 'away');
  const homeTeam = competition.competitors.find(t => t.homeAway === 'home');
  const statusInfo = getGameStatus(competition);
  
  return {
    id: game.id,
    name: game.name, // e.g., "Lakers at Warriors"
    shortName: game.shortName, // e.g., "LAL @ GSW"
    date: game.date,
    
    awayTeam: {
      name: awayTeam.team.displayName,
      abbreviation: awayTeam.team.abbreviation,
      logo: awayTeam.team.logo,
      score: awayTeam.score || '0',
      record: awayTeam.records?.[0]?.summary || ''
    },
    
    homeTeam: {
      name: homeTeam.team.displayName,
      abbreviation: homeTeam.team.abbreviation,
      logo: homeTeam.team.logo,
      score: homeTeam.score || '0',
      record: homeTeam.records?.[0]?.summary || ''
    },
    
    status: statusInfo.status,
    statusText: statusInfo.text,
    isLive: statusInfo.isLive,
    isFinal: statusInfo.isFinal
  };
}

/**
 * Get all today's games in parsed format
 */
async function getTodaysGamesParsed() {
  const games = await fetchTodaysGames();
  return games.map(game => parseGameData(game));
}

/**
 * Get specific game by ID
 */
async function getGameById(gameId) {
  const games = await getTodaysGamesParsed();
  return games.find(game => game.id === gameId) || null;
}

/**
 * Format game time for display
 */
function formatGameTime(dateString) {
  const date = new Date(dateString);
  const timezone = window.NBA_CONFIG?.TIMEZONE || 'America/New_York';
  
  return date.toLocaleTimeString('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Fetch game boxscore from ESPN API
 * @param {string} gameId - ESPN game ID
 * @returns {Promise<Object|null>} Boxscore data or null
 */
async function fetchGameBoxscore(gameId) {
  try {
    // Try summary endpoint first (has game leaders)
    const summaryUrl = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${gameId}`;
    const response = await fetch(summaryUrl);
    
    if (!response.ok) {
      console.warn('ESPN summary API request failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching boxscore:', error);
    return null;
  }
}

/**
 * Parse player stats from ESPN stats array
 * @param {Array} stats - Stats array from ESPN
 * @param {Array} labels - Stat labels from ESPN
 * @returns {Object} Parsed stats object
 */
function parsePlayerStats(stats, labels) {
  const parsed = { pts: 0, reb: 0, ast: 0 };
  
  if (!stats || !labels || stats.length !== labels.length) {
    return parsed;
  }
  
  // Find indices by label name (more robust than hardcoded indices)
  labels.forEach((label, index) => {
    const statValue = parseInt(stats[index]) || 0;
    
    if (label === 'PTS') {
      parsed.pts = statValue;
    } else if (label === 'REB') {
      parsed.reb = statValue;
    } else if (label === 'AST') {
      parsed.ast = statValue;
    }
  });
  
  return parsed;
}

/**
 * Get leading player (MVP) from boxscore data
 * @param {Object} boxscoreData - Boxscore data from ESPN
 * @returns {Object|null} MVP player data or null
 */
function getLeadingPlayer(boxscoreData) {
  if (!boxscoreData || !boxscoreData.boxscore || !boxscoreData.boxscore.players) {
    return null;
  }
  
  let leadingPlayer = null;
  let highestScore = -1;
  
  // Loop through both teams
  boxscoreData.boxscore.players.forEach(team => {
    if (!team.statistics || !team.statistics[0]) {
      return;
    }
    
    const statGroup = team.statistics[0];
    const labels = statGroup.labels || [];
    const athletes = statGroup.athletes || [];
    const teamInfo = team.team || {};
    
    // Loop through players
    athletes.forEach(athlete => {
      if (!athlete.stats || !athlete.athlete) {
        return;
      }
      
      // Parse stats using labels (more robust)
      const stats = parsePlayerStats(athlete.stats, labels);
      
      // Calculate game score: PTS + REB + AST (simple metric)
      const gameScore = stats.pts + stats.reb + stats.ast;
      
      if (gameScore > highestScore) {
        highestScore = gameScore;
        leadingPlayer = {
          name: athlete.athlete.displayName || athlete.athlete.shortName || 'Unknown Player',
          photoUrl: athlete.athlete.headshot?.href || `https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/${athlete.athlete.id}.png`,
          teamLogo: teamInfo.logo || '',
          teamAbbr: teamInfo.abbreviation || '',
          pts: stats.pts,
          reb: stats.reb,
          ast: stats.ast
        };
      }
    });
  });
  
  return leadingPlayer;
}

/**
 * Parse team statistics from boxscore data
 * @param {Object} boxscoreData - Boxscore data from ESPN
 * @returns {Object|null} Team stats object with home and away stats or null
 */
function parseTeamStats(boxscoreData) {
  if (!boxscoreData || !boxscoreData.boxscore) {
    console.warn('parseTeamStats: No boxscore data');
    return null;
  }

  // ESPN API structure: boxscore.boxscore.teams contains team stats
  // Check both boxscore.teams and boxscore.boxscore.teams
  const innerBoxscore = boxscoreData.boxscore.boxscore;
  let teams = (innerBoxscore && innerBoxscore.teams) || boxscoreData.boxscore.teams;

  if (!teams || !Array.isArray(teams) || teams.length < 2) {
    console.warn('parseTeamStats: teams array not found or invalid', {
      hasInnerBoxscore: !!innerBoxscore,
      hasBoxscoreTeams: !!boxscoreData.boxscore.teams,
      hasPlayers: !!boxscoreData.boxscore.players
    });
    return null;
  }

  // Find home and away teams - homeAway is at root level of team object, not inside t.team
  const homeTeam = teams.find(t => t.homeAway === 'home');
  const awayTeam = teams.find(t => t.homeAway === 'away');

  if (!homeTeam || !awayTeam) {
    console.warn('parseTeamStats: home or away team not found', {
      teamsLength: teams.length,
      teams: teams.map((t, idx) => ({
        index: idx,
        homeAway: t.homeAway || null,
        abbreviation: t.team ? t.team.abbreviation : null
      }))
    });
    return null;
  }

  // Team statistics are directly in the statistics array - each element is {name, displayValue}
  const homeStatsArray = homeTeam.statistics;
  const awayStatsArray = awayTeam.statistics;

  if (!homeStatsArray || !Array.isArray(homeStatsArray) || homeStatsArray.length === 0 ||
      !awayStatsArray || !Array.isArray(awayStatsArray) || awayStatsArray.length === 0) {
    console.warn('parseTeamStats: team statistics arrays not found');
    return null;
  }

  // Helper to find stat value by name in the statistics array
  const findStat = (statsArray, statName) => {
    if (!statsArray || !Array.isArray(statsArray)) return null;
    const stat = statsArray.find(s => s && s.name === statName);
    return stat ? stat.displayValue : null;
  };

  // Helper to parse "made-attempted" format (e.g., "28-47")
  const parseMadeAttempted = (value) => {
    if (!value) return { made: 0, attempted: 0 };
    if (typeof value === 'string' && value.includes('-')) {
      const parts = value.split('-');
      return {
        made: parseInt(parts[0]) || 0,
        attempted: parseInt(parts[1]) || 0
      };
    }
    return { made: 0, attempted: 0 };
  };

  // Helper to calculate percentage
  const calculatePercentage = (made, attempted) => {
    if (!attempted || attempted === 0) return '0.0';
    return ((made / attempted) * 100).toFixed(1);
  };

  // Parse home team stats
  const homeFgStr = findStat(homeStatsArray, 'fieldGoalsMade-fieldGoalsAttempted') || '';
  const homeFg = parseMadeAttempted(homeFgStr);
  
  const home3ptStr = findStat(homeStatsArray, 'threePointFieldGoalsMade-threePointFieldGoalsAttempted') || '';
  const home3pt = parseMadeAttempted(home3ptStr);
  
  const homeFtStr = findStat(homeStatsArray, 'freeThrowsMade-freeThrowsAttempted') || '';
  const homeFt = parseMadeAttempted(homeFtStr);
  
  const homeReb = findStat(homeStatsArray, 'totalRebounds') || '0';
  const homeOffReb = findStat(homeStatsArray, 'offensiveRebounds') || '0';
  const homeAst = findStat(homeStatsArray, 'assists') || '0';
  const homeTo = findStat(homeStatsArray, 'turnovers') || '0';

  // Parse away team stats
  const awayFgStr = findStat(awayStatsArray, 'fieldGoalsMade-fieldGoalsAttempted') || '';
  const awayFg = parseMadeAttempted(awayFgStr);
  
  const away3ptStr = findStat(awayStatsArray, 'threePointFieldGoalsMade-threePointFieldGoalsAttempted') || '';
  const away3pt = parseMadeAttempted(away3ptStr);
  
  const awayFtStr = findStat(awayStatsArray, 'freeThrowsMade-freeThrowsAttempted') || '';
  const awayFt = parseMadeAttempted(awayFtStr);
  
  const awayReb = findStat(awayStatsArray, 'totalRebounds') || '0';
  const awayOffReb = findStat(awayStatsArray, 'offensiveRebounds') || '0';
  const awayAst = findStat(awayStatsArray, 'assists') || '0';
  const awayTo = findStat(awayStatsArray, 'turnovers') || '0';

  return {
    home: {
      fgm: homeFg.made,
      fga: homeFg.attempted,
      fgPct: calculatePercentage(homeFg.made, homeFg.attempted),
      reb: parseInt(homeReb) || 0,
      offReb: parseInt(homeOffReb) || 0,
      ast: parseInt(homeAst) || 0,
      to: parseInt(homeTo) || 0,
      threePtMade: home3pt.made,
      threePtAttempted: home3pt.attempted,
      threePtPct: calculatePercentage(home3pt.made, home3pt.attempted),
      ftMade: homeFt.made,
      ftAttempted: homeFt.attempted,
      ftPct: calculatePercentage(homeFt.made, homeFt.attempted)
    },
    away: {
      fgm: awayFg.made,
      fga: awayFg.attempted,
      fgPct: calculatePercentage(awayFg.made, awayFg.attempted),
      reb: parseInt(awayReb) || 0,
      offReb: parseInt(awayOffReb) || 0,
      ast: parseInt(awayAst) || 0,
      to: parseInt(awayTo) || 0,
      threePtMade: away3pt.made,
      threePtAttempted: away3pt.attempted,
      threePtPct: calculatePercentage(away3pt.made, away3pt.attempted),
      ftMade: awayFt.made,
      ftAttempted: awayFt.attempted,
      ftPct: calculatePercentage(awayFt.made, awayFt.attempted)
    }
  };
}

/**
 * Get team statistics for a game (fetches boxscore and parses team stats)
 * @param {string} gameId - ESPN game ID
 * @returns {Promise<Object|null>} Team stats data or null
 */
async function getTeamStatsForGame(gameId) {
  try {
    const boxscore = await fetchGameBoxscore(gameId);
    if (!boxscore) {
      console.warn('getTeamStatsForGame: No boxscore data returned');
      return null;
    }
    
    // Log structure for debugging (only in dev)
    if (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost') {
    // Remove verbose logging in production
    }
    
    const teamStats = parseTeamStats(boxscore);
    if (!teamStats) {
      console.warn('getTeamStatsForGame: parseTeamStats returned null for gameId', gameId);
    }
    return teamStats;
  } catch (error) {
    console.error('Error getting team stats for game', gameId, ':', error);
    return null;
  }
}

/**
 * Get MVP player for a game (fetches boxscore and finds leading player)
 * @param {string} gameId - ESPN game ID
 * @returns {Promise<Object|null>} MVP player data or null
 */
async function getMVPForGame(gameId) {
  try {
    const boxscore = await fetchGameBoxscore(gameId);
    if (!boxscore) {
      return null;
    }
    
    return getLeadingPlayer(boxscore);
  } catch (error) {
    console.error('Error getting MVP for game', gameId, ':', error);
    return null;
  }
}

/**
 * Get play-by-play data for a game
 * @param {string} gameId - ESPN game ID
 * @returns {Promise<Array|null>} Array of recent plays or null
 */
async function getPlayByPlay(gameId) {
  try {
    const summary = await fetchGameBoxscore(gameId);
    if (!summary || !summary.commentary || !summary.commentary.plays) {
      return null;
    }
    
    // Get the plays array
    const plays = summary.commentary.plays;
    
    // Return the most recent plays (last 10-20 for live updates)
    // Plays are typically in chronological order
    const recentPlays = plays.slice(-20).reverse(); // Get last 20, reverse so newest is first
    
    // Parse plays into a cleaner format
    return recentPlays.map(play => ({
      id: play.id,
      text: play.text || play.shortText || '',
      shortText: play.shortText || '',
      period: play.period?.number || 0,
      clock: play.clock?.displayValue || '',
      homeScore: play.scoringPlay ? (play.homeScore || 0) : null,
      awayScore: play.scoringPlay ? (play.awayScore || 0) : null,
      isScoringPlay: play.scoringPlay || false,
      team: play.team ? {
        id: play.team.id,
        abbreviation: play.team.abbreviation,
        name: play.team.displayName
      } : null,
      participants: play.participants || []
    }));
  } catch (error) {
    console.error('Error getting play-by-play for game', gameId, ':', error);
    return null;
  }
}

// Export functions
if (typeof window !== 'undefined') {
  window.NBAApi = {
    getTodaysGames: getTodaysGamesParsed,
    getGameById,
    formatGameTime,
    getMVPForGame,
    getTeamStatsForGame,
    getPlayByPlay
  };
}

