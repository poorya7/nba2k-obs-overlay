# Development Guide

Complete guide for developing, modifying, and extending the NBA 2K OBS Overlay.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Organization](#code-organization)
- [Modifying the Overlay](#modifying-the-overlay)
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
   cd "nba2k obs overlay"
   ```

2. **No dependencies to install!**
   - Project uses only Node.js built-in modules
   - No `npm install` needed

3. **Start the development server**
   ```bash
   npm start
   ```
   
   Or from the server folder:
   ```bash
   cd server
   node server.js
   ```

4. **Open in browser**
   - Dashboard: `http://localhost:3000/dashboard`
   - Overlay: `http://localhost:3000/overlay/game-stats`

### Project Structure Overview

```
nba2k-obs-overlay/
├── server/
│   ├── server.js           # Node.js HTTP server
│   └── scripts/            # Auto-start scripts
│
├── overlay/
│   ├── _shared/            # Shared utilities (single source of truth)
│   │   ├── config.js       # Configuration constants
│   │   └── nbaApi.js       # ESPN API client
│   │
│   ├── _dashboard/         # Control panel
│   │   ├── index.html      # Dashboard UI
│   │   └── dashboard.js    # Game selection & simulation logic
│   │
│   └── game-stats-overlay/ # Modular overlay system
│       ├── core/           # Production overlay
│       │   ├── index.html  # Production overlay with API integration
│       │   ├── game-view.js # GameView controller class
│       │   └── styles.css  # All overlay styling
│       │
│       └── tests/          # Testing pages
│           ├── test-states.html      # Interactive state tester
│           ├── test-simulation.html  # Full game simulation
│           └── index-full.html       # Full design preview
│
└── docs/                   # Documentation
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
# Terminal: Keep server running
npm start

# Make changes to files
# → Edit overlay/game-stats-overlay/core/styles.css
# → Refresh browser to see changes

# Test in OBS
# → Add browser source: http://localhost:3000/overlay/game-stats
# → Right-click → Interact to open DevTools
```

### Quick Testing Workflow

```
Dashboard:
1. Open http://localhost:3000/dashboard
2. F12 to open DevTools (check Console tab)
3. Select a game or enable simulation mode

Overlay:
1. Open http://localhost:3000/overlay/game-stats
2. F12 to open DevTools
3. Watch auto-refresh every 3 seconds
4. Check that animations are smooth
```

---

## Code Organization

### File Responsibilities

#### `server/server.js`
- **Purpose:** HTTP server and API
- **When to modify:** 
  - Adding new routes
  - Changing port
  - Adding new API endpoints (game selection, simulation)
  - Modifying file serving logic

#### `overlay/_shared/config.js`
- **Purpose:** Centralized configuration (used by both dashboard & overlay)
- **When to modify:**
  - Changing timezone
  - Updating ESPN API URL
  - Adjusting refresh intervals

#### `overlay/_shared/nbaApi.js`
- **Purpose:** ESPN API integration (used by both dashboard & overlay)
- **When to modify:**
  - Changing data parsing logic
  - Adding new API methods
  - Modifying date/time formatting (e.g., MM:SS conversion)
  - Handling new ESPN data fields

#### `overlay/_dashboard/dashboard.js`
- **Purpose:** Game selection UI and simulation control
- **When to modify:**
  - Changing dropdown behavior
  - Adding preview features
  - Modifying game filtering
  - Adding simulation controls

#### `overlay/game-stats-overlay/core/game-view.js`
- **Purpose:** Core GameView controller class
- **When to modify:**
  - Changing animation logic (score slide, state transitions)
  - Modifying show/hide behavior
  - Adding new state rendering methods
  - Adjusting animation timings

#### `overlay/game-stats-overlay/core/index.html`
- **Purpose:** Production overlay with API integration
- **When to modify:**
  - Changing HTML structure
  - Modifying API polling logic
  - Adjusting simulation data generation
  - Changing data comparison/update logic

#### `overlay/game-stats-overlay/core/styles.css`
- **Purpose:** All overlay visual design
- **When to modify:** 
  - Changing colors/fonts
  - Adjusting layout
  - Modifying animations (slide, fade)
  - Customizing appearance

---

## Modifying the Overlay

### Changing Colors

Edit `overlay/game-stats-overlay/core/styles.css`:

```css
/* Main accent color */
:root {
  --accent-color: #4CAF50;  /* ← Change this for green theme */
}

/* Background */
.game-stats {
  background: rgba(0, 0, 0, 0.45);  /* ← Adjust transparency */
  backdrop-filter: blur(10px);       /* ← Adjust blur */
}

/* Border accent */
.game-stats {
  border-bottom: 3px solid var(--accent-color);
}
```

### Changing Fonts

1. **Add font to HTML** (`overlay/game-stats-overlay/core/index.html`):
```html
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@600;800&display=swap" rel="stylesheet">
```

2. **Use font in CSS**:
```css
.team-name {
  font-family: 'Roboto', sans-serif;
}
```

### Adjusting Animations

```css
/* Modify slide animation timing */
.score-slide-out {
  animation-duration: 0.35s;  /* Fade out speed */
}

.score-slide-in {
  animation-duration: 0.3s;   /* Slide in speed */
  animation-delay: 0.08s;     /* Delay before slide in */
}
```

### Changing Refresh Interval

Edit `overlay/_shared/config.js`:

```javascript
// Change from 3 seconds to 5 seconds
const REFRESH_INTERVAL = 5000;
```

Then update the `setInterval` call in `overlay/game-stats-overlay/core/index.html`:

```javascript
setInterval(updateFromAPI, 5000); // Match config value
```

---

## Adding New Features

### Example: Add Team Colors to Border

1. **Extend data parsing** (`overlay/_shared/nbaApi.js`):

```javascript
// In parseGameData function, add:
awayTeam: {
  // ... existing fields ...
  color: awayTeam.team.color || '000000',
}
```

2. **Use in GameView** (`overlay/game-stats-overlay/core/game-view.js`):

```javascript
// In showLive method, add:
const homeColor = data.home.color;
const awayColor = data.away.color;

this.elements.homeTeam.style.borderColor = `#${homeColor}`;
this.elements.awayTeam.style.borderColor = `#${awayColor}`;
```

### Example: Add Sound on Score Change

1. **Add audio file** to `overlay/game-stats-overlay/core/sounds/`:
   ```
   sounds/score.mp3
   ```

2. **Modify score update logic** (`overlay/game-stats-overlay/core/index.html`):

```javascript
// In detectStateAndUpdate, when scores change:
if (scoresChanged) {
  // Play sound
  const audio = new Audio('sounds/score.mp3');
  audio.volume = 0.3;
  audio.play();
  
  // Update scores
  gameView.updateScore('home', homeScore, true);
  gameView.updateScore('away', awayScore, true);
}
```

---

## Testing

### Using Test Pages

**test-states.html** - Interactive state tester:
```
http://localhost:3000/overlay/game-stats-overlay/tests/test-states.html

• Buttons to trigger each state (pregame, live, halftime, etc.)
• Score increment buttons
• Mimics production overlay logic exactly
• Great for testing animations
```

**test-simulation.html** - Full game simulation:
```
http://localhost:3000/overlay/game-stats-overlay/tests/test-simulation.html

• Automatic score changes
• State progression
• Tests all animation scenarios
```

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
}, 3000);
```

### Testing in OBS

1. **Add Browser Source**
   - URL: `http://localhost:3000/overlay/game-stats`
   - Width: 1920, Height: 1080

2. **Enable Interact Mode**
   - Right-click source → Interact
   - Opens embedded browser with DevTools

3. **Test Transparency**
   - Verify transparent background works
   - Check chroma key if needed

4. **Test Refresh**
   - Watch overlay update every 3 seconds
   - Verify smooth animations (no blinking)

### Testing Simulation Mode

1. Open dashboard: `http://localhost:3000/dashboard`
2. Check "Enable Simulation Mode"
3. Click "Next State" to cycle through states
4. Watch overlay respond with animations
5. Verify scores change automatically in simulation

---

## Troubleshooting

### Common Issues

#### Overlay Shows "No game selected"

**Cause:** Dashboard hasn't saved a game selection yet.

**Fix:**
1. Open `http://localhost:3000/dashboard`
2. Select a game from dropdown (or enable simulation)
3. Refresh overlay

#### Overlay Not Updating

**Cause:** JavaScript error breaking refresh loop.

**Debug:**
1. F12 → Console
2. Look for errors (red text)
3. Check Network tab for failed requests

#### Overlay "Blinking" or Fading Unnecessarily

**Cause:** Incorrect update logic.

**Debug:**
1. Check that `lastGameData` comparison is working correctly
2. Verify only scores are animating (not entire overlay)
3. Ensure `switchToState` is used for state changes (not `transitionToState`)

#### ESPN API Not Responding

**Cause:** ESPN API down or network issue.

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
// In server/server.js, change:
const PORT = 3001;  // Use different port
```

#### Time Showing as "8.7" Instead of "00:08"

**Cause:** ESPN returns decimal seconds for times under 1 minute.

**Fix:**
- This should already be handled by `formatSecondsToMMSS` in `nbaApi.js`
- If not working, check that function is being called correctly

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
// ✅ Good: Graceful degradation
try {
  const game = await NBAApi.getGameById(id);
  displayGame(game);
} catch (error) {
  hideOverlay(); // Don't show broken/error state
}

// ❌ Bad: Show error to viewer
try {
  const game = await NBAApi.getGameById(id);
} catch (error) {
  showError("API ERROR: " + error); // Bad for streaming!
}
```

### Performance

```javascript
// ✅ Good: Update only what changed
if (scoresChanged) {
  gameView.updateScore('home', homeScore, true);
  gameView.updateScore('away', awayScore, true);
}

// ❌ Bad: Full re-render for every change
gameView.transitionToState(stateName, formattedData);
```

### Modularity

```javascript
// ✅ Good: Reuse shared files
<script src="../../_shared/nbaApi.js"></script>

// ❌ Bad: Duplicate code
// Copy-pasting nbaApi.js into each folder
```

---

## Advanced Topics

### Custom Animation Timings

Modify `overlay/game-stats-overlay/core/game-view.js`:

```javascript
// In updateScore method:
const FADE_OUT_DURATION = 350;  // ms
const SLIDE_IN_DURATION = 300;  // ms
const SLIDE_DELAY = 80;         // ms between fade out and slide in
```

### Server Auto-start on Windows

See `docs/SETUP_AUTOSTART.md` for detailed instructions.

Quick summary:
1. Copy `server/scripts/start-overlay-server.vbs` to Windows Startup folder
2. Server will launch silently on boot

### Remote Access

To access from other devices on your network:

1. **Find your local IP:**
   ```bash
   ipconfig  # Windows
   ```

2. **Update server binding:**
   ```javascript
   // In server/server.js:
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

## Getting Help

- Check browser console for errors (F12)
- Review `docs/ARCHITECTURE.md` for system overview
- Review `docs/API.md` for API reference
- Test ESPN API directly to verify it's working
- Use test pages to isolate issues
- Enable simulation mode for testing without live games
