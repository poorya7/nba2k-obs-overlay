// Design Test Preview Page
let allGames = [];
let selectedGameData = null;
let currentDesign = null;

const designs = [
  {
    id: 'horizontal-green',
    name: 'Horizontal - Classic Green',
    description: 'Wide bar across top, classic green accents',
    class: 'design-horizontal-green'
  },
  {
    id: 'horizontal-cyan',
    name: 'Horizontal - Neon Cyan',
    description: 'Wide bar with electric cyan glow',
    class: 'design-horizontal-cyan'
  },
  {
    id: 'horizontal-red',
    name: 'Horizontal - Fire Red',
    description: 'Wide bar with fiery red highlights',
    class: 'design-horizontal-red'
  },
  {
    id: 'horizontal-white',
    name: 'Horizontal - Clean White',
    description: 'Wide bar with minimal white glass effect',
    class: 'design-horizontal-white'
  },
  {
    id: 'vertical-green',
    name: 'Vertical - Classic Green',
    description: 'Thin sidebar, classic green accents',
    class: 'design-vertical-green'
  },
  {
    id: 'vertical-purple',
    name: 'Vertical - Neon Purple',
    description: 'Thin sidebar with purple glow',
    class: 'design-vertical-purple'
  },
  {
    id: 'vertical-blue',
    name: 'Vertical - Electric Blue',
    description: 'Thin sidebar with bright blue accents',
    class: 'design-vertical-blue'
  },
  {
    id: 'vertical-gold',
    name: 'Vertical - Golden Yellow',
    description: 'Thin sidebar with gold highlights',
    class: 'design-vertical-gold'
  }
];

/**
 * Initialize the test page
 */
async function init() {
  console.log('🎨 Design Test Page Initialized');
  
  // Load today's games
  await loadGames();
  
  // Render design previews
  renderDesignGrid();
  
  // Set up event listeners
  setupEventListeners();
}

/**
 * Load today's NBA games
 */
async function loadGames() {
  try {
    updateStatus('Loading games...', 'loading');
    
    const games = await window.NBAApi.getTodaysGames();
    allGames = games;
    
    console.log('📅 Loaded games:', games.length);
    
    // Populate game selector
    const selector = document.getElementById('game-selector');
    selector.innerHTML = '';
    
    if (games.length === 0) {
      selector.innerHTML = '<option value="">No games today</option>';
      updateStatus('No games today', 'idle');
      return;
    }
    
    games.forEach(game => {
      const option = document.createElement('option');
      option.value = game.id;
      option.textContent = `${game.awayTeam.name} @ ${game.homeTeam.name}`;
      if (game.isLive) {
        option.textContent += ' (LIVE)';
      }
      selector.appendChild(option);
    });
    
    // Auto-select first live game or first game
    const liveGame = games.find(g => g.isLive) || games[0];
    selector.value = liveGame.id;
    selectedGameData = liveGame;
    
    renderDesignGrid();
    updateStatus('Ready', 'ready');
    
  } catch (error) {
    console.error('❌ Error loading games:', error);
    updateStatus('Error loading games', 'error');
  }
}

/**
 * Update status indicator
 */
function updateStatus(text, state) {
  const status = document.getElementById('status');
  const dot = status.querySelector('.dot');
  const textEl = status.querySelector('.text');
  
  textEl.textContent = text;
  
  // Update dot color based on state
  if (state === 'loading') {
    dot.style.background = '#FFA500';
  } else if (state === 'error') {
    dot.style.background = '#f44336';
  } else {
    dot.style.background = '#4CAF50';
  }
}

/**
 * Render design grid with all variations
 */
function renderDesignGrid() {
  const grid = document.getElementById('design-grid');
  
  if (!selectedGameData) {
    grid.innerHTML = '<p style="color: #999; text-align: center; grid-column: 1 / -1;">Select a game to preview designs</p>';
    return;
  }
  
  grid.innerHTML = '';
  
  designs.forEach(design => {
    const card = document.createElement('div');
    card.className = 'design-card';
    card.onclick = () => showFullPreview(design.id);
    
    card.innerHTML = `
      <h3>${design.name}</h3>
      <p>${design.description}</p>
      <div class="design-preview ${design.class}">
        ${renderOverlay(selectedGameData, design.class)}
      </div>
    `;
    
    grid.appendChild(card);
  });
}

/**
 * Render overlay HTML for a game
 */
function renderOverlay(game, designClass) {
  // FORCE LIVE GAME VIEW FOR PREVIEW
  const statusClass = 'status-live';
  const statusText = '🔴 Q3 8:32';
  const showScores = true;
  
  // Mock scores for preview
  const awayScore = '82';
  const homeScore = '78';
  
  // Extract just team name (no city)
  const getShortTeamName = (fullName) => {
    const words = fullName.split(' ');
    // Return last word (team name)
    return words[words.length - 1];
  };
  
  // Format team name for display (split if needed)
  const formatTeamName = (name, singleLine = false) => {
    const shortName = getShortTeamName(name);
    if (singleLine) return shortName;
    // For vertical, return as single line since it's already short
    return shortName;
  };
  
  // HORIZONTAL BAR layout
  if (designClass.startsWith('design-horizontal')) {
    return `
      <div class="game-card">
        <div class="teams-container">
          <div class="team">
            <img class="team-logo" src="${game.awayTeam.logo}" alt="${game.awayTeam.name}">
            <div>
              <div class="team-name">${formatTeamName(game.awayTeam.name, true)}</div>
              <div class="team-record">${game.awayTeam.record}</div>
            </div>
            <div class="team-score">${awayScore}</div>
          </div>
          
          <div class="vs-divider">-</div>
          
          <div class="team">
            <div class="team-score">${homeScore}</div>
            <div>
              <div class="team-name">${formatTeamName(game.homeTeam.name, true)}</div>
              <div class="team-record">${game.homeTeam.record}</div>
            </div>
            <img class="team-logo" src="${game.homeTeam.logo}" alt="${game.homeTeam.name}">
          </div>
        </div>
        
        <div class="game-status ${statusClass}">🔴 LIVE • ${statusText}</div>
      </div>
    `;
  }
  
  // VERTICAL SIDEBAR layout
  return `
    <div class="game-card">
      <div class="teams-container">
        <div class="team">
          <img class="team-logo" src="${game.awayTeam.logo}" alt="${game.awayTeam.name}">
          <div class="team-name">${formatTeamName(game.awayTeam.name)}</div>
          <div class="team-record">${game.awayTeam.record}</div>
          <div class="team-score">${awayScore}</div>
        </div>
        
        <div class="vs-divider">-</div>
        
        <div class="team">
          <img class="team-logo" src="${game.homeTeam.logo}" alt="${game.homeTeam.name}">
          <div class="team-name">${formatTeamName(game.homeTeam.name)}</div>
          <div class="team-record">${game.homeTeam.record}</div>
          <div class="team-score">${homeScore}</div>
        </div>
      </div>
      
      <div class="game-status ${statusClass}">🔴 LIVE<br>${statusText}</div>
    </div>
  `;
}

/**
 * Show full preview modal with design on stream background
 */
function showFullPreview(designId) {
  if (!selectedGameData) return;
  
  currentDesign = designs.find(d => d.id === designId);
  const modal = document.getElementById('preview-modal');
  const container = document.getElementById('modal-overlay-container');
  
  // Render the design in the modal
  container.className = currentDesign.class;
  container.innerHTML = renderOverlay(selectedGameData, currentDesign.class);
  
  // Show modal
  modal.classList.add('active');
  
  console.log('👁️ Previewing design:', currentDesign.name);
}

/**
 * Close preview modal
 */
function closePreview() {
  const modal = document.getElementById('preview-modal');
  modal.classList.remove('active');
  currentDesign = null;
}

/**
 * Apply selected design (save to localStorage and show confirmation)
 */
async function applyDesign() {
  if (!currentDesign) return;
  
  try {
    // Save design preference
    localStorage.setItem('overlay-design', currentDesign.id);
    
    // Show success message
    alert(`✅ ${currentDesign.name} design saved!\n\nRefresh your OBS browser source to see the changes.`);
    
    closePreview();
    
    console.log('💾 Design applied:', currentDesign.name);
    
  } catch (error) {
    console.error('❌ Error applying design:', error);
    alert('Error saving design. Check console for details.');
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Game selector change
  const selector = document.getElementById('game-selector');
  selector.addEventListener('change', (e) => {
    const gameId = e.target.value;
    selectedGameData = allGames.find(g => g.id === gameId);
    renderDesignGrid();
    console.log('🎮 Game changed:', selectedGameData?.shortName);
  });
  
  // Close modal on overlay click
  const modalOverlay = document.querySelector('.modal-overlay');
  modalOverlay.addEventListener('click', closePreview);
  
  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePreview();
    }
  });
}

// Make functions global for onclick handlers
window.closePreview = closePreview;
window.applyDesign = applyDesign;

// Initialize on page load
window.addEventListener('DOMContentLoaded', init);

