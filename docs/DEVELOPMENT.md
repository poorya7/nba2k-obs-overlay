# Development Guide

Complete guide for developing, modifying, and extending the NBA 2K OBS Overlay.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Organization](#code-organization)
- [Modifying the Overlay Design](#modifying-the-overlay-design)
- [Adding New Features](#adding-new-features)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## Getting Started

### Prerequisites

- **Node.js** v14+ installed
- Basic knowledge of HTML/CSS/JavaScript
- Code editor (VS Code recommended)
- Web browser with DevTools
- OBS Studio (for testing overlay)

### Initial Setup

1. **Clone/Download the project**
   ```bash
   cd nba2k-obs-overlay
   ```

2. **No dependencies to install!**
   - Project uses only Node.js built-in modules
   - No `npm install` needed

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Open in browser**
   - Dashboard: `http://localhost:3000/dashboard`
   - Overlay: `http://localhost:3000/overlay/game-stats`

### Project Structure Overview

```
overlay/
├── shared/              # Shared code (used by both dashboard & overlay)
│   ├── config.js       # Configuration constants
│   └── nbaApi.js       # ESPN API client
├── dashboard/          # Control panel for game selection
│   ├── index.html     
│   └── dashboard.js   
└── game-stats/         # OBS overlay display
    ├── index.html     
    ├── styles.css      # Overlay styling (customize here!)
    └── overlay.js     
```

---

## Development Workflow

### Live Development

The server serves static files, so changes are reflected immediately:

1. **Edit files** in your code editor
2. **Refresh browser** to see changes
3. **No build step required!**

### Typical Development Cycle

```bash
# Terminal 1: Keep server running
npm start

# Make changes to files
# → Edit overlay/game-stats/styles.css
# → Refresh browser to see changes

# Test in OBS
# → Add browser source: http://localhost:3000/overlay/game-stats
# → Right-click → Interact to open DevTools
```

### Quick Testing Workflow

```
Dashboard:
1. Open http://localhost:3000/dashboard
2. F12 to open DevTools
3. Check Console for logs/errors
4. Select a game

Overlay:
1. Open http://localhost:3000/overlay/game-stats
2. F12 to open DevTools  
3. Check Console for update logs
4. Watch auto-refresh every 10 seconds
```

---

## Code Organization

### File Responsibilities

#### `server.js`
- **Purpose:** HTTP server and API
- **When to modify:** 
  - Adding new routes
  - Changing port
  - Adding new API endpoints
  - Modifying MIME types

#### `overlay/shared/config.js`
- **Purpose:** Centralized configuration
- **When to modify:**
  - Changing timezone
  - Updating ESPN API URL
  - Adjusting refresh intervals
  - Adding config options

#### `overlay/shared/nbaApi.js`
- **Purpose:** ESPN API integration
- **When to modify:**
  - Changing data parsing logic
  - Adding new API methods
  - Modifying date/time formatting
  - Handling new ESPN data fields

#### `overlay/dashboard/dashboard.js`
- **Purpose:** Game selection UI logic
- **When to modify:**
  - Changing dropdown behavior
  - Adding preview features
  - Modifying game filtering
  - Adding new dashboard features

#### `overlay/game-stats/overlay.js`
- **Purpose:** Overlay display logic
- **When to modify:**
  - Changing refresh interval
  - Modifying display logic
  - Adding animations
  - Changing data display

#### `overlay/game-stats/styles.css`
- **Purpose:** Overlay visual design
- **When to modify:** 
  - Changing colors/fonts
  - Adjusting layout
  - Adding animations
  - Customizing appearance

---

## Modifying the Overlay Design

### Changing Colors

Edit `overlay/game-stats/styles.css`:

```css
/* Main accent color (scores, borders) */
.team-score {
  color: #4CAF50;  /* ← Change this */
  text-shadow: 0 0 10px rgba(76, 175, 80, 0.5);
}

/* Background */
.game-card {
  background: rgba(0, 0, 0, 0.45);  /* ← Adjust transparency */
  backdrop-filter: blur(10px);       /* ← Adjust blur */
}

/* Border accent */
.game-card {
  border-bottom: 3px solid #4CAF50;  /* ← Change color */
}
```

### Changing Fonts

1. **Add font to HTML** (`overlay/game-stats/index.html`):
```html
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@700;900&display=swap" rel="stylesheet">
```

2. **Use font in CSS**:
```css
.team-name {
  font-family: 'Roboto', sans-serif;
}
```

### Changing Layout

#### Make it horizontal instead of vertical:

```css
/* Change from column to row */
.teams-container {
  flex-direction: row;  /* was: column */
  gap: 40px;
}
```

#### Adjust sizing:

```css
/* Larger team logos */
.team-logo {
  width: 60px;   /* was: 50px */
  height: 60px;
}

/* Bigger scores */
.team-score {
  font-size: 48px;  /* was: 36px */
}
```

### Adding Animations

```css
/* Pulse effect for live games */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.status-live {
  animation: pulse 2s infinite;
}

/* Glow effect */
@keyframes glow {
  0%, 100% { box-shadow: 0 0 10px rgba(76, 175, 80, 0.5); }
  50% { box-shadow: 0 0 20px rgba(76, 175, 80, 1); }
}

.game-card {
  animation: glow 2s infinite;
}
```

### Common Customizations

#### Remove team records:

```javascript
// In overlay/game-stats/overlay.js
// Comment out or remove these lines:
// <div class="team-record">${game.awayTeam.record}</div>
```

#### Show abbreviation instead of full name:

```javascript
// In overlay/game-stats/overlay.js, replace:
<div class="team-name">${formatTeamName(game.awayTeam.name)}</div>

// With:
<div class="team-name">${game.awayTeam.abbreviation}</div>
```

#### Always show scores (even before game starts):

```javascript
// In overlay/game-stats/overlay.js, change:
const showScores = game.isLive || game.isFinal;

// To:
const showScores = true;
```

---

## Adding New Features

### Example: Add Team Colors

1. **Extend ESPN data parsing** (`overlay/shared/nbaApi.js`):

```javascript
function parseGameData(game) {
  // ... existing code ...
  
  awayTeam: {
    // ... existing fields ...
    color: awayTeam.team.color || '000000',  // ← Add this
  }
}
```

2. **Use in overlay** (`overlay/game-stats/styles.css`):

```css
.team-logo {
  border: 3px solid;
  border-color: var(--team-color);
}
```

3. **Apply dynamically** (`overlay/game-stats/overlay.js`):

```javascript
// In displayGame() function:
container.innerHTML = `
  <div class="team" style="--team-color: #${game.awayTeam.color}">
    <!-- team content -->
  </div>
`;
```

### Example: Add Sound on Score Change

1. **Add audio file** to project root:
   ```
   sounds/score.mp3
   ```

2. **Load sound** (`overlay/game-stats/overlay.js`):

```javascript
let lastScore = { away: 0, home: 0 };

function displayGame(game) {
  // Check if score changed
  if (game.awayTeam.score > lastScore.away || 
      game.homeTeam.score > lastScore.home) {
    playSound();
  }
  
  // Update last score
  lastScore = {
    away: game.awayTeam.score,
    home: game.homeTeam.score
  };
  
  // ... rest of display logic
}

function playSound() {
  const audio = new Audio('/sounds/score.mp3');
  audio.volume = 0.3;
  audio.play();
}
```

### Example: Add Game Clock Countdown

1. **Extract clock from status** (`overlay/shared/nbaApi.js`):

```javascript
function getGameStatus(competition) {
  const detail = competition.status.type.detail;
  
  // Parse "Q3 8:32" format
  const match = detail.match(/Q(\d)\s+(\d+:\d+)/);
  
  return {
    // ... existing fields ...
    quarter: match ? match[1] : null,
    clock: match ? match[2] : null
  };
}
```

2. **Display separately** (`overlay/game-stats/overlay.js`):

```html
<div class="game-clock">${game.quarter} • ${game.clock}</div>
```

### Example: Add Multiple Game Display

1. **Modify server** to store array of games:

```javascript
// In server.js, change:
let selectedGameIds = [];  // instead of single gameId
```

2. **Modify overlay** to fetch multiple:

```javascript
// In overlay.js:
const games = await Promise.all(
  selectedGameIds.map(id => window.NBAApi.getGameById(id))
);

// Display in grid
games.forEach(game => {
  // Append each game card
});
```

---

## Testing

### Testing in Browser

```javascript
// Open browser console on overlay page

// Test API manually
const games = await window.NBAApi.getTodaysGames();
console.table(games);

// Test specific game
const game = await window.NBAApi.getGameById('401585136');
console.log(game);

// Monitor refresh cycle
setInterval(() => {
  console.log('Refresh tick:', new Date().toLocaleTimeString());
}, 10000);
```

### Testing in OBS

1. **Add Browser Source**
   - URL: `http://localhost:3000/overlay/game-stats`
   - Width: 600, Height: 800 (adjust as needed)

2. **Enable Interact Mode**
   - Right-click source → Interact
   - Opens embedded browser with DevTools

3. **Test Transparency**
   - Use chroma key if needed
   - Verify transparent background works

4. **Test Refresh**
   - Watch overlay update every 10 seconds
   - Verify no flicker or layout shift

### Testing Error States

```javascript
// In overlay.js, temporarily add:

// Test "no game selected"
// Comment out the gameId check

// Test "game not found"  
const game = await window.NBAApi.getGameById('invalid-id');

// Test network error
// Disconnect internet, watch error handling
```

### Performance Testing

```javascript
// Monitor memory usage
console.log(performance.memory);

// Monitor API timing
const start = performance.now();
await window.NBAApi.getTodaysGames();
const end = performance.now();
console.log(`API took ${end - start}ms`);
```

---

## Troubleshooting

### Common Issues

#### Overlay Shows "No game selected"

**Cause:** Dashboard hasn't saved a game selection yet.

**Fix:**
1. Open `http://localhost:3000/dashboard`
2. Select a game from dropdown
3. Refresh overlay

#### Overlay Not Updating

**Cause:** JavaScript error breaking refresh loop.

**Debug:**
1. F12 → Console
2. Look for errors
3. Check if interval is still running:
   ```javascript
   console.log(refreshInterval); // Should be a number
   ```

#### ESPN API Not Responding

**Cause:** ESPN API down or rate limiting.

**Debug:**
1. Test API manually:
   ```bash
   curl "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard"
   ```
2. Check browser Network tab for failed requests
3. Look for CORS errors

#### Server Port Already in Use

**Cause:** Another app using port 3000.

**Fix:**
```javascript
// In server.js, change:
const PORT = 3001;  // Use different port
```

#### Transparent Background Not Working

**Cause:** Browser doesn't support backdrop-filter.

**Fix:**
```css
/* Fallback background */
.game-card {
  background: rgba(0, 0, 0, 0.8);  /* More opaque */
  backdrop-filter: blur(10px);
}

/* Or remove blur entirely */
.game-card {
  background: rgba(0, 0, 0, 0.8);
  /* Remove backdrop-filter */
}
```

### Debugging Tips

#### Enable Verbose Logging

```javascript
// In overlay.js, add detailed logs:
console.log('🔄 Updating overlay...', new Date().toISOString());
console.log('📡 Selected game ID:', selectedGameId);
console.log('📊 Game data:', game);
console.log('✅ Display updated');
```

#### Watch Network Requests

```javascript
// Browser DevTools → Network tab
// Filter by: Fetch/XHR
// Monitor:
// - ESPN API calls (every 10 seconds)
// - Local API calls (/api/selected-game)
```

#### Monitor Refresh Interval

```javascript
// Track refresh timing
let lastUpdate = Date.now();

async function updateOverlay() {
  const now = Date.now();
  console.log(`Time since last update: ${now - lastUpdate}ms`);
  lastUpdate = now;
  
  // ... rest of function
}
```

---

## Best Practices

### Code Style

```javascript
// ✅ Good: Clear function names
async function fetchTodaysGames() { }

// ❌ Bad: Unclear names  
async function get() { }

// ✅ Good: Comments explain WHY
// Convert team name to 2-line format for vertical display
const formatTeamName = (name) => { }

// ❌ Bad: Comments explain WHAT (obvious from code)
// Split name by space
const formatTeamName = (name) => name.split(' ');
```

### Error Handling

```javascript
// ✅ Good: Specific error handling
try {
  const game = await NBAApi.getGameById(id);
} catch (error) {
  if (error.name === 'NetworkError') {
    showNetworkError();
  } else {
    showGenericError();
  }
}

// ❌ Bad: Silent failures
try {
  const game = await NBAApi.getGameById(id);
} catch (error) {
  // Do nothing
}
```

### Performance

```javascript
// ✅ Good: Cache data when possible
let cachedGames = null;
let cacheTime = 0;

async function getTodaysGames() {
  const now = Date.now();
  if (cachedGames && now - cacheTime < 60000) {
    return cachedGames;
  }
  cachedGames = await fetchGames();
  cacheTime = now;
  return cachedGames;
}

// ❌ Bad: Fetch on every access
async function getTodaysGames() {
  return await fetchGames();  // Called many times
}
```

### DOM Updates

```javascript
// ✅ Good: Minimal DOM manipulation
const html = buildGameHTML(game);
container.innerHTML = html;  // Single update

// ❌ Bad: Multiple DOM updates
container.querySelector('.score').textContent = game.score;
container.querySelector('.status').textContent = game.status;
// ... many more updates
```

### Configuration

```javascript
// ✅ Good: Use config constants
const REFRESH_INTERVAL = window.NBA_CONFIG.REFRESH_INTERVAL;
setInterval(update, REFRESH_INTERVAL);

// ❌ Bad: Magic numbers
setInterval(update, 10000);  // What is 10000?
```

---

## Advanced Topics

### Custom Refresh Strategy

Instead of fixed interval, refresh based on game state:

```javascript
function getRefreshInterval(game) {
  if (game.isLive) {
    return 5000;   // 5 seconds for live games
  } else if (game.isFinal) {
    return 60000;  // 1 minute for final games
  } else {
    return 30000;  // 30 seconds for scheduled
  }
}

async function updateOverlay() {
  const game = await fetchGame();
  displayGame(game);
  
  // Schedule next update based on game state
  const interval = getRefreshInterval(game);
  setTimeout(updateOverlay, interval);
}
```

### Server-Sent Events (SSE)

Push updates instead of polling:

```javascript
// Server side (server.js)
const clients = [];

app.get('/api/game-updates', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache'
  });
  
  clients.push(res);
  
  // Send update to all clients
  function broadcastUpdate(gameData) {
    clients.forEach(client => {
      client.write(`data: ${JSON.stringify(gameData)}\n\n`);
    });
  }
});

// Client side (overlay.js)
const eventSource = new EventSource('/api/game-updates');
eventSource.onmessage = (event) => {
  const game = JSON.parse(event.data);
  displayGame(game);
};
```

### Multiple Overlays

Run different overlays simultaneously:

1. Create new folder: `overlay/compact-stats/`
2. Copy game-stats files
3. Modify styling for compact view
4. Add route in `server.js`:
   ```javascript
   if (filePath === './compact') {
     filePath = './overlay/compact-stats/index.html';
   }
   ```
5. Use in OBS: `http://localhost:3000/compact`

---

## Deployment Considerations

### Running on System Startup

See `docs/SETUP_AUTOSTART.md` for Windows auto-start configuration.

### Remote Access

To access from other devices on your network:

1. **Find your local IP:**
   ```bash
   ipconfig  # Windows
   ifconfig  # Mac/Linux
   ```

2. **Update server binding:**
   ```javascript
   // In server.js, change:
   server.listen(PORT, '0.0.0.0', () => {
     console.log('Server accessible from network');
   });
   ```

3. **Access from other device:**
   ```
   http://YOUR_IP:3000/overlay/game-stats
   ```

**Security Note:** Only do this on trusted networks!

---

## Contributing

When making changes:

1. ✅ Test in browser first
2. ✅ Test in OBS
3. ✅ Check console for errors
4. ✅ Verify auto-refresh still works
5. ✅ Test with no games, scheduled games, live games
6. ✅ Update documentation if needed

## Getting Help

- Check browser console for errors (F12)
- Review `docs/ARCHITECTURE.md` for system overview
- Review `docs/API.md` for API reference
- Test ESPN API directly to verify it's working
- Check if games are actually scheduled for today

