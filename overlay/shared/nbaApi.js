// NBA API Integration - ESPN Scoreboard
// Reused from backup dashboard with modifications for overlay

/**
 * Get today's date in YYYYMMDD format for ESPN API
 */
function getTodayDateString() {
  const today = new Date();
  const timezone = window.NBA_CONFIG?.TIMEZONE || 'America/New_York';
  
  const year = today.toLocaleString('en-US', { timeZone: timezone, year: 'numeric' });
  const month = today.toLocaleString('en-US', { timeZone: timezone, month: '2-digit' });
  const day = today.toLocaleString('en-US', { timeZone: timezone, day: '2-digit' });
  
  return `${year}${month}${day}`;
}

/**
 * Fetch today's NBA games from ESPN API
 */
async function fetchTodaysGames() {
  try {
    const todayDate = getTodayDateString();
    const apiUrl = `${window.NBA_CONFIG.ESPN_NBA_SCOREBOARD}?dates=${todayDate}`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`ESPN API returned ${response.status}`);
    }
    
    const data = await response.json();
    return data.events || [];
  } catch (error) {
    console.error('❌ Error fetching NBA games:', error);
    throw error;
  }
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
  
  // ESPN FORMAT: "4:59 - 4th Quarter" OR "31.2 - 4th Quarter" -> "Q4 4:59" or "Q4 31.2"
  // Handle BOTH colon and decimal formats!
  const quarterMatch = statusDetail.match(/([\d:.]+)\s+-\s+(\d+)(?:st|nd|rd|th)\s+Quarter/i);
  if (quarterMatch) {
    return `Q${quarterMatch[2]} ${quarterMatch[1]}`;
  }
  
  // "3:45 - Overtime" OR "31.2 - Overtime" -> "OT 3:45" or "OT 31.2"
  const otMatch = statusDetail.match(/([\d:.]+)\s+-\s+(?:Overtime|OT)/i);
  if (otMatch) {
    return `OT ${otMatch[1]}`;
  }
  
  // Return as-is for other cases (Halftime, Final, etc)
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
    return { 
      status: 'live', 
      text: parseStatusToShortFormat(statusDetail), // Parse to short format!
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

// Export functions
if (typeof window !== 'undefined') {
  window.NBAApi = {
    getTodaysGames: getTodaysGamesParsed,
    getGameById,
    formatGameTime
  };
}

