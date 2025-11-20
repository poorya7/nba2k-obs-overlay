/**
 * StateRenderer.js
 * 
 * Handles HTML generation for different game states and layout types.
 * Supports: pill, horizontal, and vertical layouts
 */

class StateRenderer {
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
    
    const hiddenClass = (state) => state === activeState ? '' : 'hidden display-none';
    
    return `
      <!-- Pre-game content -->
      <div class="element ${hiddenClass('pregame')}" style="background: rgba(255, 152, 0, 0.25); padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; color: #FFA726; white-space: nowrap; min-width: 75px; text-align: center;" id="countdown">Starts in ${timeStr}</div>
      <img src="${gameData.awayTeam.logo}" class="logo element ${hiddenClass('pregame')}" id="pregameLogo1">
      <div class="vs element ${hiddenClass('pregame')}" id="pregameVs">vs</div>
      <img src="${gameData.homeTeam.logo}" class="logo element ${hiddenClass('pregame')}" id="pregameLogo2">
      
      <!-- Live content -->
      <div class="status-pill element ${hiddenClass('live')}" id="liveStatus">🔴 LIVE</div>
      <img src="${gameData.awayTeam.logo}" class="logo element ${hiddenClass('live')}" id="liveLogo1">
      <span class="score element ${hiddenClass('live')}" id="leftScore">${gameData.awayTeam.score || '0'}</span>
      <div class="vs element ${hiddenClass('live')}" id="liveVs">-</div>
      <span class="score element ${hiddenClass('live')}" id="rightScore">${gameData.homeTeam.score || '0'}</span>
      <img src="${gameData.homeTeam.logo}" class="logo element ${hiddenClass('live')}" id="liveLogo2">
      <div class="time-pill element ${hiddenClass('live')}" id="gameTime">${gameData.statusText || 'Q1 12:00'}</div>
      
      <!-- Halftime content -->
      <div class="element ${hiddenClass('halftime')}" style="background: rgba(33, 150, 243, 0.25); padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; color: #42A5F5; white-space: nowrap; min-width: 75px; text-align: center;" id="halftimeStatus">HALFTIME</div>
      <img src="${gameData.awayTeam.logo}" class="logo element ${hiddenClass('halftime')}" id="halftimeLogo1">
      <span class="score element ${hiddenClass('halftime')}" id="halftimeLeftScore">${gameData.awayTeam.score || '0'}</span>
      <div class="vs element ${hiddenClass('halftime')}" id="halftimeVs">-</div>
      <span class="score element ${hiddenClass('halftime')}" id="halftimeRightScore">${gameData.homeTeam.score || '0'}</span>
      <img src="${gameData.homeTeam.logo}" class="logo element ${hiddenClass('halftime')}" id="halftimeLogo2">
      
      <!-- Final content -->
      <div class="element ${hiddenClass('final')}" style="background: rgba(76, 175, 80, 0.25); padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; color: #66BB6A; white-space: nowrap;" id="finalStatus">FINAL</div>
      <img src="${gameData.awayTeam.logo}" class="logo element ${hiddenClass('final')}" id="finalLogo1">
      <span class="score element ${hiddenClass('final')}" id="finalLeftScore">${gameData.awayTeam.score || '0'}</span>
      <div class="vs element ${hiddenClass('final')}" id="finalVs">-</div>
      <span class="score element ${hiddenClass('final')}" id="finalRightScore">${gameData.homeTeam.score || '0'}</span>
      <img src="${gameData.homeTeam.logo}" class="logo element ${hiddenClass('final')}" id="finalLogo2">
      
      <!-- Overtime content -->
      <div class="status-pill element ${hiddenClass('overtime')}" id="otStatus">🔴 LIVE</div>
      <img src="${gameData.awayTeam.logo}" class="logo element ${hiddenClass('overtime')}" id="otLogo1">
      <span class="score element ${hiddenClass('overtime')}" id="otLeftScore">${gameData.awayTeam.score || '0'}</span>
      <div class="vs element ${hiddenClass('overtime')}" id="otVs">-</div>
      <span class="score element ${hiddenClass('overtime')}" id="otRightScore">${gameData.homeTeam.score || '0'}</span>
      <img src="${gameData.homeTeam.logo}" class="logo element ${hiddenClass('overtime')}" id="otLogo2">
      <div class="time-pill element ${hiddenClass('overtime')}" style="background: rgba(156, 39, 176, 0.25); color: #AB47BC;" id="otTime">${gameData.statusText || 'OT 5:00'}</div>
    `;
  }
  
  /**
   * HORIZONTAL LAYOUT - Bar design
   */
  static renderHorizontalLayout(gameData, activeState) {
    const formatTeamName = (name) => {
      // Abbreviate team names for horizontal layout
      return name.replace('LA ', '').replace('Portland ', '').replace(' Blazers', '');
    };
    
    const awayScore = gameData.awayTeam.score || '0';
    const homeScore = gameData.homeTeam.score || '0';
    const statusText = gameData.statusText || 'Q1 12:00';
    const isLive = activeState === 'live' || activeState === 'overtime';
    const statusClass = isLive ? 'status-live' : (activeState === 'final' ? 'status-final' : 'status-pregame');
    
    return `
      <div class="game-card">
        ${isLive ? '<div class="live-nba-badge">🔴 LIVE</div>' : ''}
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
        
        <div class="game-status ${statusClass}" id="gameTime">${isLive ? '🔴 LIVE •' : ''} ${statusText}</div>
      </div>
    `;
  }
  
  /**
   * VERTICAL LAYOUT - Sidebar design
   */
  static renderVerticalLayout(gameData, activeState) {
    const awayScore = gameData.awayTeam.score || '0';
    const homeScore = gameData.homeTeam.score || '0';
    const statusText = gameData.statusText || 'Q1 12:00';
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
        
        <div class="game-status ${statusClass}" id="gameTime">${isLive ? '🔴 LIVE<br>' : ''}${statusText}</div>
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

