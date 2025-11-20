/**
 * StateRenderer.js
 * 
 * Handles HTML generation for different game states.
 * Extracted from transition-test.html (lines 354-442)
 * 
 * Key: ALL state elements are rendered at once (like transition-test.html)
 * States are toggled with "hidden" and "display-none" classes
 */

class StateRenderer {
  /**
   * Render ALL state elements at once
   * This matches transition-test.html structure exactly
   * @param {Object} gameData - Game data object
   * @param {number} countdown - Seconds until game starts
   * @param {string} activeState - Which state to show ('pregame', 'live', 'halftime', 'final', 'overtime')
   * @returns {string} Complete HTML string with all states
   */
  static renderAllStates(gameData, countdown, activeState) {
    const minutes = Math.floor(countdown / 60);
    const seconds = countdown % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Helper to add hidden classes if not active
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
   * Update specific elements without re-rendering everything
   */
  static updateScores(awayScore, homeScore) {
    // Update all score elements across all states
    const scoreElements = {
      live: ['leftScore', 'rightScore'],
      halftime: ['halftimeLeftScore', 'halftimeRightScore'],
      final: ['finalLeftScore', 'finalRightScore'],
      overtime: ['otLeftScore', 'otRightScore']
    };
    
    Object.values(scoreElements).flat().forEach((id, idx) => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = idx % 2 === 0 ? awayScore : homeScore;
      }
    });
  }
  
  /**
   * Update countdown timer
   */
  static updateCountdown(countdown) {
    const el = document.getElementById('countdown');
    if (!el) return;
    
    const minutes = Math.floor(countdown / 60);
    const seconds = countdown % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    el.textContent = `Starts in ${timeStr}`;
  }
  
  /**
   * Update game time displays
   */
  static updateGameTime(timeText) {
    const gameTimeEl = document.getElementById('gameTime');
    const otTimeEl = document.getElementById('otTime');
    
    if (gameTimeEl) gameTimeEl.textContent = timeText;
    if (otTimeEl) otTimeEl.textContent = timeText;
  }

  /**
   * Get all element IDs for a specific state
   * Used for transition animations
   */
  static getStateElementIds(state) {
    const elementIds = {
      pregame: ['pregameLogo1', 'pregameVs', 'pregameLogo2', 'countdown'],
      live: ['liveStatus', 'liveLogo1', 'leftScore', 'liveVs', 'rightScore', 'liveLogo2', 'gameTime'],
      halftime: ['halftimeStatus', 'halftimeLogo1', 'halftimeLeftScore', 'halftimeVs', 'halftimeRightScore', 'halftimeLogo2'],
      final: ['finalStatus', 'finalLogo1', 'finalLeftScore', 'finalVs', 'finalRightScore', 'finalLogo2'],
      overtime: ['otStatus', 'otLogo1', 'otLeftScore', 'otVs', 'otRightScore', 'otLogo2', 'otTime']
    };
    
    return elementIds[state] || [];
  }
}

// Make available globally
window.StateRenderer = StateRenderer;

