/**
 * PlayByPlayProcessor - Handles play-by-play data processing
 * Single Responsibility: Transform and deduplicate play data from any source (ESPN API or simulation)
 * 
 * Usage:
 *   const processor = new PlayByPlayProcessor();
 *   const teamContext = { homeAbbr: 'LAL', awayAbbr: 'GSW', homeLogo: '...', awayLogo: '...' };
 *   const processedPlay = processor.processPlay(rawPlay, teamContext);
 *   if (processedPlay) { // Not a duplicate
 *       updatePlayByPlay(processedPlay);
 *   }
 */

// NBA team name to abbreviation mapping (for timeout detection)
const TEAM_NAME_TO_ABBR = {
    'SPURS': ['SA', 'SAS'],
    'LAKERS': ['LAL', 'LA'],
    'WARRIORS': ['GS', 'GSW'],
    'CELTICS': ['BOS'],
    'HEAT': ['MIA'],
    'NUGGETS': ['DEN'],
    'BUCKS': ['MIL'],
    'SIXERS': ['PHI'],
    'SUNS': ['PHX', 'PHO'],
    'CLIPPERS': ['LAC', 'LA'],
    'MAVERICKS': ['DAL'],
    'GRIZZLIES': ['MEM'],
    'KINGS': ['SAC'],
    'TIMBERWOLVES': ['MIN'],
    'THUNDER': ['OKC'],
    'TRAIL BLAZERS': ['POR'],
    'JAZZ': ['UTA'],
    'ROCKETS': ['HOU'],
    'PELICANS': ['NO', 'NOP'],
    'HORNETS': ['CHA'],
    'BULLS': ['CHI'],
    'CAVALIERS': ['CLE'],
    'PISTONS': ['DET'],
    'PACERS': ['IND'],
    'KNICKS': ['NYK', 'NY'],
    'MAGIC': ['ORL'],
    '76ERS': ['PHI'],
    'RAPTORS': ['TOR'],
    'WIZARDS': ['WAS', 'WSH'],
    'HAWKS': ['ATL'],
    'NETS': ['BKN', 'BRO']
};

class PlayByPlayProcessor {
    constructor() {
        this.lastPlayKey = null; // Content-based key for dedup (period+clock+player+action)
        this.lastHomeScore = null;
        this.lastAwayScore = null;
        this.lastPlayTimestamp = Date.now();
    }

    /**
     * Generate a unique key from play content for deduplication
     * Uses period + clock + playerName + action (ignores timestamps/IDs)
     * @param {Object} play - Play object (raw or transformed)
     * @returns {string} Unique content key
     */
    _generatePlayKey(play) {
        if (!play) return null;
        
        // Handle both raw API format and transformed format
        const period = play.period || 0;
        const clock = play.clock || '';
        const playerName = play.playerName || play.text?.match(/^([A-Z][a-z]+ [A-Z][a-z]+)/)?.[1] || '';
        const action = play.action || play.text || play.shortText || '';
        
        // Normalize: lowercase, trim, remove extra spaces
        const key = `${period}|${clock}|${playerName}|${action}`.toLowerCase().replace(/\s+/g, ' ').trim();
        return key;
    }

    /**
     * Helper: Convert period number to quarter format
     * @param {number} period - Period number (1-4, or 5+ for OT)
     * @returns {string} Quarter format (Q1-Q4 or OT)
     */
    formatPeriodToQuarter(period) {
        if (period <= 4) {
            return `Q${period}`;
        } else {
            return 'OT';
        }
    }

    /**
     * Helper: Format clock to MM:SS format
     * Uses shared convertToMMSS from nbaApi.js
     * @param {string} clock - Clock value from API
     * @returns {string} Formatted clock in MM:SS format
     */
    formatClock(clock) {
        if (!clock) return '';
        
        // Use shared formatter from nbaApi.js
        if (window.NBAApi && window.NBAApi.convertToMMSS) {
            return window.NBAApi.convertToMMSS(String(clock).trim());
        }
        
        // Fallback if NBAApi not loaded yet
        return String(clock).trim();
    }

    /**
     * Helper: Remove player name variations from text
     * @param {string} text - Play text
     * @param {string} fullName - Player's full name
     * @returns {string} Cleaned text
     */
    _removePlayerNameFromText(text, fullName) {
        let cleanedText = text;

        // Escape special regex characters in the full name
        const escapedFullName = fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const nameParts = fullName.trim().split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : null;

        // Patterns to try (in order of specificity):
        // 1. Full name anywhere in text (word boundaries)
        cleanedText = cleanedText.replace(new RegExp(`\\b${escapedFullName}\\b`, 'gi'), '').trim();

        // 2. First initial + last name (e.g., "L. Doncic" for "Luka Doncic")
        if (lastName && firstName.length > 0) {
            const firstInitial = firstName.charAt(0);
            const initialLastNamePattern = `${firstInitial}\\.?\\s+${lastName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`;
            cleanedText = cleanedText.replace(new RegExp(`\\b${initialLastNamePattern}\\b`, 'gi'), '').trim();
        }

        // 3. Last name only (if it's unique enough - at least 3 chars)
        if (lastName && lastName.length >= 3) {
            const escapedLastName = lastName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            cleanedText = cleanedText.replace(new RegExp(`\\b${escapedLastName}\\b`, 'gi'), '').trim();
        }

        // 4. First name only (if it's unique enough - at least 3 chars and not common words)
        if (firstName && firstName.length >= 3 &&
            !['The', 'And', 'For', 'With', 'From', 'Over', 'On'].includes(firstName)) {
            const escapedFirstName = firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            cleanedText = cleanedText.replace(new RegExp(`\\b${escapedFirstName}\\b`, 'gi'), '').trim();
        }

        // Clean up multiple spaces and trim
        cleanedText = cleanedText.replace(/\s+/g, ' ').trim();

        return cleanedText;
    }

    /**
     * Transform raw API play data to display format
     * @param {Object} apiPlay - Raw play from ESPN API or simulation
     * @param {Object} teamContext - Team context for logo resolution
     * @param {string} teamContext.homeAbbr - Home team abbreviation
     * @param {string} teamContext.awayAbbr - Away team abbreviation
     * @param {string} teamContext.homeLogo - Home team logo URL
     * @param {string} teamContext.awayLogo - Away team logo URL
     * @returns {Object|null} Transformed play object or null
     */
    transformPlayForDisplay(apiPlay, teamContext = {}) {
        if (!apiPlay) return null;

        const { homeAbbr = '', awayAbbr = '', homeLogo = '', awayLogo = '' } = teamContext;

        // Get first participant (usually the main player)
        const participant = apiPlay.participants && apiPlay.participants.length > 0 ? apiPlay.participants[0] : null;
        const athlete = participant?.athlete || participant;

        // Extract player name from text if athlete object only has ID
        let playerName = athlete?.displayName || athlete?.shortName || athlete?.fullName;
        const playerId = athlete?.id;

        // Extract player name from text if not available in athlete object
        let extractedPlayerName = null;
        const playText = apiPlay.text || apiPlay.shortText || '';
        if (playText) {
            // Try to extract player name from start of text (e.g., "Myron Gardner makes...")
            const textMatch = playText.match(/^([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z]\.?)?)/);
            if (textMatch) {
                extractedPlayerName = textMatch[1].trim();
            }
        }

        // Use extracted name if we don't have one from athlete object
        if (!playerName) {
            playerName = extractedPlayerName || 'Player';
        }

        // Get player photo - try multiple possible paths
        let playerPhoto = 'https://a.espncdn.com/i/headshots/nba/players/full/0.png'; // fallback
        if (athlete?.headshot?.href) {
            playerPhoto = athlete.headshot.href;
        } else if (playerId) {
            playerPhoto = `https://a.espncdn.com/i/headshots/nba/players/full/${playerId}.png`;
        }

        // Remove player name from action text (since we display it separately)
        let actionText = playText;
        if (playerName && playerName !== 'Player' && actionText) {
            actionText = this._removePlayerNameFromText(playText, playerName);
        }

        // Check if this is a timeout or other team event (not a player action)
        const text = actionText.toLowerCase();
        const isTimeout = text.includes('timeout');
        const isTeamEvent = isTimeout ||
            text.includes('coach') ||
            text.includes('challenge') ||
            text.includes('coach\'s challenge') ||
            !playerName || playerName === 'Player';

        // Determine icon based on play text (no icon for team events like timeouts, coach's challenge)
        let icon = '⚡'; // default
        if (isTeamEvent) {
            icon = ''; // No icon for team events
        } else if (text.includes('3-point') || text.includes('three') || text.includes('3pt')) {
            icon = '🔥';
        } else if (text.includes('dunk') || text.includes('slam')) {
            icon = '💥';
        } else if (text.includes('free throw') || text.includes('foul')) {
            icon = '🎯';
        }

        // Get team logo for ALL plays (not just team events)
        let teamLogo = null;
        let playTeam = null; // 'home' or 'away'
        
        // Method 1: Check team abbreviation from API play data (works for all plays)
        if (apiPlay.team && apiPlay.team.abbreviation && (homeAbbr || awayAbbr)) {
            const teamAbbr = (apiPlay.team.abbreviation || '').trim().toUpperCase();
            const upperHomeAbbr = homeAbbr.toUpperCase();
            const upperAwayAbbr = awayAbbr.toUpperCase();
            
            if (teamAbbr === upperHomeAbbr) {
                playTeam = 'home';
                teamLogo = homeLogo;
            } else if (teamAbbr === upperAwayAbbr) {
                playTeam = 'away';
                teamLogo = awayLogo;
            }
        }
        
        // For team events (timeouts, etc.), try additional methods if team not yet determined
        let timeoutTeam = null; // 'home' or 'away' (legacy field for timeouts)
        
        if (isTeamEvent && !playTeam && (homeAbbr || awayAbbr)) {
            const upperHomeAbbr = homeAbbr.toUpperCase();
            const upperAwayAbbr = awayAbbr.toUpperCase();
            const upperPlayText = playText.toUpperCase();

            // Method 1: Check team abbreviation from API play data
            let matchedTeam = null;
            if (apiPlay.team && apiPlay.team.abbreviation) {
                const teamAbbr = (apiPlay.team.abbreviation || '').trim().toUpperCase();
                if (teamAbbr === upperHomeAbbr) {
                    matchedTeam = 'home';
                } else if (teamAbbr === upperAwayAbbr) {
                    matchedTeam = 'away';
                }
            }

            // Method 2: Extract from timeout/team event text
            if (!matchedTeam && playText) {
                // Match pattern like "[Team] EVENT" or "Team timeout"
                const bracketMatch = playText.match(/\[([A-Z][a-z]+(?:[\s-][A-Z][a-z]+)*)\]/i);
                if (bracketMatch) {
                    const teamNameFromText = bracketMatch[1].trim().toUpperCase();
                    const possibleAbbrs = TEAM_NAME_TO_ABBR[teamNameFromText] || [];
                    if (upperHomeAbbr && possibleAbbrs.includes(upperHomeAbbr)) {
                        matchedTeam = 'home';
                    } else if (upperAwayAbbr && possibleAbbrs.includes(upperAwayAbbr)) {
                        matchedTeam = 'away';
                    } else if (upperHomeAbbr && upperPlayText.includes(upperHomeAbbr)) {
                        matchedTeam = 'home';
                    } else if (upperAwayAbbr && upperPlayText.includes(upperAwayAbbr)) {
                        matchedTeam = 'away';
                    }
                }
                // Also try timeout pattern like "Spurs timeout" or "Lakers Full Timeout"
                if (!matchedTeam) {
                    const timeoutMatch = playText.match(/^([A-Z][a-z]+(?:[\s-][A-Z][a-z]+)*)\s+(?:Full\s+)?[Tt]imeout/i);
                    if (timeoutMatch) {
                        const teamNameFromText = timeoutMatch[1].trim().toUpperCase();
                        const possibleAbbrs = TEAM_NAME_TO_ABBR[teamNameFromText] || [];
                        if (upperHomeAbbr && possibleAbbrs.includes(upperHomeAbbr)) {
                            matchedTeam = 'home';
                        } else if (upperAwayAbbr && possibleAbbrs.includes(upperAwayAbbr)) {
                            matchedTeam = 'away';
                        } else if (upperHomeAbbr && upperPlayText.includes(upperHomeAbbr)) {
                            matchedTeam = 'home';
                        } else if (upperAwayAbbr && upperPlayText.includes(upperAwayAbbr)) {
                            matchedTeam = 'away';
                        }
                    }
                }
            }

            // Method 3: Fallback - check if text contains team abbreviation anywhere
            if (!matchedTeam) {
                if (upperHomeAbbr && upperPlayText.includes(upperHomeAbbr)) {
                    matchedTeam = 'home';
                } else if (upperAwayAbbr && upperPlayText.includes(upperAwayAbbr)) {
                    matchedTeam = 'away';
                }
            }

            // Get logo for matched team (only if not already set)
            if (!teamLogo) {
                if (matchedTeam === 'home' && homeLogo) {
                    teamLogo = homeLogo;
                    playTeam = 'home';
                } else if (matchedTeam === 'away' && awayLogo) {
                    teamLogo = awayLogo;
                    playTeam = 'away';
                }
            }
            timeoutTeam = playTeam; // Keep for backwards compatibility
        }

        return {
            id: apiPlay.id,
            period: apiPlay.period || 0,
            clock: this.formatClock(apiPlay.clock),
            playerName: playerName,
            playerPhoto: playerPhoto,
            action: actionText,
            icon: icon,
            homeScore: apiPlay.homeScore !== undefined && apiPlay.homeScore !== null ? parseInt(apiPlay.homeScore) : null,
            awayScore: apiPlay.awayScore !== undefined && apiPlay.awayScore !== null ? parseInt(apiPlay.awayScore) : null,
            isScoringPlay: apiPlay.isScoringPlay || false,
            isTimeout: isTimeout,
            isTeamEvent: isTeamEvent,
            teamLogo: teamLogo,
            playTeam: playTeam,
            timeoutTeam: timeoutTeam
        };
    }

    /**
     * Process a play and return it only if it's new (not a duplicate)
     * @param {Object} rawPlay - Raw play data from API or simulation
     * @param {Object} teamContext - Team context for logo resolution
     * @returns {Object|null} Processed play if new, null if duplicate or invalid
     */
    processPlay(rawPlay, teamContext = {}) {
        if (!rawPlay) return null;

        const transformed = this.transformPlayForDisplay(rawPlay, teamContext);
        
        // Validate: must have action and either be a timeout or have a valid player
        if (!transformed || !transformed.action) return null;
        if (!transformed.isTimeout && transformed.playerName === 'Player' && !transformed.action) return null;

        // Generate content-based key for deduplication
        const playKey = this._generatePlayKey(transformed);
        
        // Check for duplicate (same period + clock + player + action)
        if (playKey && playKey === this.lastPlayKey) {
            return null; // Duplicate
        }

        // New play - update tracking
        this.lastPlayKey = playKey;
        this.lastPlayTimestamp = Date.now();

        // Track score changes
        if (transformed.homeScore !== null) {
            this.lastHomeScore = transformed.homeScore;
        }
        if (transformed.awayScore !== null) {
            this.lastAwayScore = transformed.awayScore;
        }

        return transformed;
    }

    /**
     * Find the newest valid play and return it only if it's different from last shown
     * IMPORTANT: Only checks the FIRST valid play - does NOT loop through older plays
     * @param {Array} plays - Array of raw plays (newest first)
     * @param {Object} teamContext - Team context for logo resolution
     * @returns {Object|null} Newest valid play if new, or null if duplicate/invalid
     */
    findNewPlay(plays, teamContext = {}) {
        if (!plays || !Array.isArray(plays) || plays.length === 0) {
            return null;
        }

        // Find the first (newest) VALID play - don't loop through all
        let newestValidPlay = null;
        for (const play of plays) {
            const transformed = this.transformPlayForDisplay(play, teamContext);
            // Check if it's a valid play (has action, and either timeout or real player)
            if (transformed && transformed.action && 
                (transformed.isTimeout || (transformed.playerName !== 'Player' && transformed.action))) {
                newestValidPlay = { raw: play, transformed };
                break; // Stop at first valid play
            }
        }

        if (!newestValidPlay) {
            return null; // No valid plays found
        }

        // Check if this play is a duplicate of the last shown play
        const playKey = this._generatePlayKey(newestValidPlay.transformed);
        if (playKey && playKey === this.lastPlayKey) {
            return null; // Same as last play, nothing new
        }

        // New play! Update tracking and return
        this.lastPlayKey = playKey;
        this.lastPlayTimestamp = Date.now();

        if (newestValidPlay.transformed.homeScore !== null) {
            this.lastHomeScore = newestValidPlay.transformed.homeScore;
        }
        if (newestValidPlay.transformed.awayScore !== null) {
            this.lastAwayScore = newestValidPlay.transformed.awayScore;
        }

        return newestValidPlay.transformed;
    }

    /**
     * Check if a play is a duplicate of the last processed play (content-based)
     * @param {Object} play - Play object to check
     * @returns {boolean} True if duplicate
     */
    isDuplicate(play) {
        const playKey = this._generatePlayKey(play);
        return playKey && playKey === this.lastPlayKey;
    }

    /**
     * Get time since last play was processed
     * @returns {number} Milliseconds since last play
     */
    getTimeSinceLastPlay() {
        return Date.now() - this.lastPlayTimestamp;
    }

    /**
     * Reset tracking state (call when game changes)
     */
    reset() {
        this.lastPlayKey = null;
        this.lastHomeScore = null;
        this.lastAwayScore = null;
        this.lastPlayTimestamp = Date.now();
    }

    /**
     * Get current tracking state (for debugging)
     */
    getState() {
        return {
            lastPlayKey: this.lastPlayKey,
            lastHomeScore: this.lastHomeScore,
            lastAwayScore: this.lastAwayScore,
            lastPlayTimestamp: this.lastPlayTimestamp
        };
    }
}

// Export for use in browser
if (typeof window !== 'undefined') {
    window.PlayByPlayProcessor = PlayByPlayProcessor;
    window.TEAM_NAME_TO_ABBR = TEAM_NAME_TO_ABBR;
}
