/**
 * StateRenderer.js
 * 
 * Handles HTML generation for different game states and layout types.
 * Supports: pill, horizontal, and vertical layouts
 */

class StateRenderer {
  // Default values
  static DEFAULT_STATUS_TEXT = 'Q1 12:00';
  static DEFAULT_SCORE = '0';
  static DEFAULT_OT_TIME = 'OT 5:00';
  static LIVE_INDICATOR = '🔴 LIVE';
  
  /**
   * Format countdown time smartly
   * Shows HH:MM:SS when >= 1 hour, MM:SS when < 1 hour
   * @param {number} totalSeconds - Total seconds until game starts
   * @returns {string} Formatted time string
   */
  static formatCountdown(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      // Show hours: "11:24:04"
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      // No hours: "22:11"
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Helper: Generate team logo element
   */
  static _pillLogo(logoUrl, state, position, hiddenClass = '') {
    return `<img src="${logoUrl}" class="logo element ${hiddenClass}" id="${state}Logo${position}">`;
  }

  /**
   * Helper: Generate score element
   */
  static _pillScore(score, state, side, hiddenClass = '') {
    // Live and overtime states use simple IDs for score updates
    let scoreId;
    if (state === 'live') {
      scoreId = side === 'left' ? 'leftScore' : 'rightScore';
    } else if (state === 'overtime') {
      scoreId = side === 'left' ? 'otLeftScore' : 'otRightScore';
    } else {
      scoreId = side === 'left' ? `${state}LeftScore` : `${state}RightScore`;
    }
    return `<span class="score element ${hiddenClass}" id="${scoreId}">${score}</span>`;
  }

  /**
   * Helper: Generate vs divider
   */
  static _pillDivider(state, text = '-', hiddenClass = '') {
    return `<div class="vs element ${hiddenClass}" id="${state}Vs">${text}</div>`;
  }
  /**
   * Render layout based on type
   * @param {Object} gameData - Game data object
   * @param {number} countdown - Seconds until game starts  
   * @param {string} activeState - Current game state
   * @param {string} layoutType - 'pill', 'horizontal', or 'vertical'
   */
  static renderAllStates(gameData, countdown, activeState, layoutType = 'pill') {
    if (layoutType === 'horizontal') {
      return StateRenderer.renderHorizontalLayout(gameData, activeState);
    } else if (layoutType === 'vertical') {
      return StateRenderer.renderVerticalLayout(gameData, activeState);
    } else {
      return StateRenderer.renderPillLayout(gameData, countdown, activeState);
    }
  }
  
  /**
   * PILL LAYOUT - Original pill design
   */
  static renderPillLayout(gameData, countdown, activeState) {
    const timeStr = StateRenderer.formatCountdown(countdown);
    const hidden = (state) => state === activeState ? '' : 'hidden display-none';
    
    // Extract scores and status for reuse
    const awayScore = gameData.awayTeam.score || StateRenderer.DEFAULT_SCORE;
    const homeScore = gameData.homeTeam.score || StateRenderer.DEFAULT_SCORE;
    const awayLogo = gameData.awayTeam.logo;
    const homeLogo = gameData.homeTeam.logo;
    const statusText = gameData.statusText || StateRenderer.DEFAULT_STATUS_TEXT;
    
    return `
      <!-- Pre-game content -->
      <div class="countdown-pill element ${hidden('pregame')}" id="countdown">Starts in ${timeStr}</div>
      <img src="${awayLogo}" class="logo element ${hidden('pregame')}" id="pregameLogo1">
      <div class="vs element ${hidden('pregame')}" id="pregameVs">vs</div>
      <img src="${homeLogo}" class="logo element ${hidden('pregame')}" id="pregameLogo2">
      
      <!-- Live content -->
      <div class="status-pill element ${hidden('live')}" id="liveStatus">${StateRenderer.LIVE_INDICATOR}</div>
      <img src="${awayLogo}" class="logo element ${hidden('live')}" id="liveLogo1">
      <span class="score element ${hidden('live')}" id="leftScore">${awayScore}</span>
      <div class="vs element ${hidden('live')}" id="liveVs">-</div>
      <span class="score element ${hidden('live')}" id="rightScore">${homeScore}</span>
      <img src="${homeLogo}" class="logo element ${hidden('live')}" id="liveLogo2">
      <div class="time-pill element ${hidden('live')}" id="gameTime">${statusText}</div>
      
      <!-- Halftime content -->
      <div class="halftime-pill element ${hidden('halftime')}" id="halftimeStatus">HALFTIME</div>
      <img src="${awayLogo}" class="logo element ${hidden('halftime')}" id="halftimeLogo1">
      <span class="score element ${hidden('halftime')}" id="halftimeLeftScore">${awayScore}</span>
      <div class="vs element ${hidden('halftime')}" id="halftimeVs">-</div>
      <span class="score element ${hidden('halftime')}" id="halftimeRightScore">${homeScore}</span>
      <img src="${homeLogo}" class="logo element ${hidden('halftime')}" id="halftimeLogo2">
      
      <!-- Final content -->
      <div class="final-pill element ${hidden('final')}" id="finalStatus">FINAL</div>
      <img src="${awayLogo}" class="logo element ${hidden('final')}" id="finalLogo1">
      <span class="score element ${hidden('final')}" id="finalLeftScore">${awayScore}</span>
      <div class="vs element ${hidden('final')}" id="finalVs">-</div>
      <span class="score element ${hidden('final')}" id="finalRightScore">${homeScore}</span>
      <img src="${homeLogo}" class="logo element ${hidden('final')}" id="finalLogo2">
      
      <!-- Overtime content -->
      <div class="status-pill element ${hidden('overtime')}" id="otStatus">${StateRenderer.LIVE_INDICATOR}</div>
      <img src="${awayLogo}" class="logo element ${hidden('overtime')}" id="otLogo1">
      <span class="score element ${hidden('overtime')}" id="otLeftScore">${awayScore}</span>
      <div class="vs element ${hidden('overtime')}" id="otVs">-</div>
      <span class="score element ${hidden('overtime')}" id="otRightScore">${homeScore}</span>
      <img src="${homeLogo}" class="logo element ${hidden('overtime')}" id="otLogo2">
      <div class="time-pill overtime-time element ${hidden('overtime')}" id="otTime">${statusText}</div>
    `;
  }
  
  /**
   * HORIZONTAL LAYOUT - Bar design
   */
  static renderHorizontalLayout(gameData, activeState) {
    // Extract common values
    const awayScore = gameData.awayTeam.score || StateRenderer.DEFAULT_SCORE;
    const homeScore = gameData.homeTeam.score || StateRenderer.DEFAULT_SCORE;
    const statusText = gameData.statusText || StateRenderer.DEFAULT_STATUS_TEXT;
    const isLive = activeState === 'live' || activeState === 'overtime';
    const statusClass = isLive ? 'status-live' : (activeState === 'final' ? 'status-final' : 'status-pregame');
    
    // Abbreviate team names for horizontal layout
    const formatTeamName = (name) => {
      return name.replace('LA ', '').replace('Portland ', '').replace(' Blazers', '');
    };
    
    return `
      <div class="game-card">
        ${isLive ? `<div class="live-nba-badge">${StateRenderer.LIVE_INDICATOR}</div>` : ''}
        <div class="teams-container">
          <div class="team">
            <img class="team-logo" src="${gameData.awayTeam.logo}" alt="${gameData.awayTeam.name}">
            <div>
              <div class="team-name">${formatTeamName(gameData.awayTeam.name)}</div>
              <div class="team-record">${gameData.awayTeam.record}</div>
            </div>
            <div class="team-score" id="leftScore">${awayScore}</div>
          </div>
          
          <div class="vs-divider">-</div>
          
          <div class="team">
            <div class="team-score" id="rightScore">${homeScore}</div>
            <div>
              <div class="team-name">${formatTeamName(gameData.homeTeam.name)}</div>
              <div class="team-record">${gameData.homeTeam.record}</div>
            </div>
            <img class="team-logo" src="${gameData.homeTeam.logo}" alt="${gameData.homeTeam.name}">
          </div>
        </div>
        
        <div class="game-status ${statusClass}" id="gameTime">${isLive ? `${StateRenderer.LIVE_INDICATOR} •` : ''} ${statusText}</div>
      </div>
    `;
  }
  
  /**
   * VERTICAL LAYOUT - Sidebar design
   */
  static renderVerticalLayout(gameData, activeState) {
    // Extract common values
    const awayScore = gameData.awayTeam.score || StateRenderer.DEFAULT_SCORE;
    const homeScore = gameData.homeTeam.score || StateRenderer.DEFAULT_SCORE;
    const statusText = gameData.statusText || StateRenderer.DEFAULT_STATUS_TEXT;
    const isLive = activeState === 'live' || activeState === 'overtime';
    const statusClass = isLive ? 'status-live' : (activeState === 'final' ? 'status-final' : 'status-pregame');
    
    return `
      <div class="game-card">
        <div class="teams-container">
          <div class="team">
            <img class="team-logo" src="${gameData.awayTeam.logo}" alt="${gameData.awayTeam.name}">
            <div class="team-name">${gameData.awayTeam.abbreviation || gameData.awayTeam.name}</div>
            <div class="team-record">${gameData.awayTeam.record}</div>
            <div class="team-score" id="leftScore">${awayScore}</div>
          </div>
          
          <div class="vs-divider">-</div>
          
          <div class="team">
            <img class="team-logo" src="${gameData.homeTeam.logo}" alt="${gameData.homeTeam.name}">
            <div class="team-name">${gameData.homeTeam.abbreviation || gameData.homeTeam.name}</div>
            <div class="team-record">${gameData.homeTeam.record}</div>
            <div class="team-score" id="rightScore">${homeScore}</div>
          </div>
        </div>
        
        <div class="game-status ${statusClass}" id="gameTime">${isLive ? `${StateRenderer.LIVE_INDICATOR}<br>` : ''}${statusText}</div>
      </div>
    `;
  }
  
  /**
   * Update scores (works for all layouts)
   */
  static updateScores(awayScore, homeScore) {
    const leftScore = document.getElementById('leftScore');
    const rightScore = document.getElementById('rightScore');
    
    if (leftScore) leftScore.textContent = awayScore;
    if (rightScore) rightScore.textContent = homeScore;
    
    // Also update pill-specific score elements if they exist
    const halftimeLeft = document.getElementById('halftimeLeftScore');
    const halftimeRight = document.getElementById('halftimeRightScore');
    const finalLeft = document.getElementById('finalLeftScore');
    const finalRight = document.getElementById('finalRightScore');
    const otLeft = document.getElementById('otLeftScore');
    const otRight = document.getElementById('otRightScore');
    
    if (halftimeLeft) halftimeLeft.textContent = awayScore;
    if (halftimeRight) halftimeRight.textContent = homeScore;
    if (finalLeft) finalLeft.textContent = awayScore;
    if (finalRight) finalRight.textContent = homeScore;
    if (otLeft) otLeft.textContent = awayScore;
    if (otRight) otRight.textContent = homeScore;
  }
  
  /**
   * Update game time/status text
   */
  static updateGameTime(timeText) {
    const gameTime = document.getElementById('gameTime');
    if (gameTime) {
      // For horizontal/vertical, update just the time part
      if (gameTime.innerHTML.includes('LIVE')) {
        gameTime.innerHTML = `🔴 LIVE • ${timeText}`;
      } else {
        gameTime.textContent = timeText;
      }
    }
    
    // Also update pill-specific time element if it exists
    const otTime = document.getElementById('otTime');
    if (otTime) otTime.textContent = timeText;
  }
  
  /**
   * Update countdown timer (pill layout only)
   */
  static updateCountdown(countdown) {
    const countdownEl = document.getElementById('countdown');
    if (countdownEl) {
      const timeStr = StateRenderer.formatCountdown(countdown);
      countdownEl.textContent = `Starts in ${timeStr}`;
    }
  }
  
  /**
   * Get element IDs for a given state (pill layout)
   */
  static getStateElementIds(state) {
    const elementMap = {
      pregame: ['countdown', 'pregameLogo1', 'pregameVs', 'pregameLogo2'],
      live: ['liveStatus', 'liveLogo1', 'leftScore', 'liveVs', 'rightScore', 'liveLogo2', 'gameTime'],
      halftime: ['halftimeStatus', 'halftimeLogo1', 'halftimeLeftScore', 'halftimeVs', 'halftimeRightScore', 'halftimeLogo2'],
      final: ['finalStatus', 'finalLogo1', 'finalLeftScore', 'finalVs', 'finalRightScore', 'finalLogo2'],
      overtime: ['otStatus', 'otLogo1', 'otLeftScore', 'otVs', 'otRightScore', 'otLogo2', 'otTime']
    };
    
    return elementMap[state] || [];
  }
}

