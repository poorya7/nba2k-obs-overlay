# System Architecture

## Overview

The NBA 2K OBS Overlay is a local web application that displays live NBA game statistics as an overlay for OBS streaming. The system consists of three main components that work together to fetch, select, and display real-time NBA game data.

## System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        ESPN NBA API                          │
│          https://site.api.espn.com/.../scoreboard           │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP GET (every 3 seconds)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     Node.js Server                           │
│                 (server/server.js - Port 3000)               │
│                                                               │
│  • Serves static files (HTML/CSS/JS)                        │
│  • API: GET/POST /api/selected-game                         │
│  • API: GET /api/simulation                                 │
│  • In-memory storage for selected game ID                   │
└───────────────────┬─────────────────────┬───────────────────┘
                    │                     │
        ┌───────────▼─────────┐  ┌───────▼───────────┐
        │   Control Dashboard  │  │  OBS Game Overlay │
        │   /dashboard         │  │  /overlay/        │
        │                      │  │  game-stats       │
        │  • Game selection UI │  │                   │
        │  • Simulation mode   │  │  • Live stats     │
        │  • Saves to server   │  │  • Auto-refresh   │
        └──────────────────────┘  └───────────────────┘
```

## Data Flow

### 1. Game Selection Flow

```
User opens Dashboard
    │
    ├─> Dashboard fetches today's games from ESPN API
    │   (via NBAApi.getTodaysGames())
    │
    ├─> User selects a game from dropdown
    │
    ├─> Dashboard sends POST /api/selected-game
    │   with gameId
    │
    └─> Server stores gameId in memory
```

### 2. Overlay Display Flow

```
OBS loads Overlay page
    │
    ├─> Overlay fetches GET /api/selected-game
    │
    ├─> Overlay gets gameId from server
    │
    ├─> Overlay fetches game data from ESPN API
    │   (via NBAApi.getGameById(gameId))
    │
    ├─> Overlay displays game stats with animations
    │
    └─> Repeats every 3 seconds (auto-refresh)
```

### 3. Simulation Flow

```
User enables simulation on Dashboard
    │
    ├─> Dashboard sends POST /api/simulation
    │   with {enabled: true, state: 'live'}
    │
    ├─> Overlay fetches GET /api/simulation
    │
    ├─> Overlay generates fake game data
    │
    ├─> Overlay displays simulated game
    │
    └─> User can cycle states on Dashboard
```

## File Structure

```
nba2k-obs-overlay/
│
├── server/
│   ├── server.js                # Node.js HTTP server
│   │   ├── Static file serving
│   │   ├── API endpoints for game/simulation selection
│   │   └── In-memory storage
│   │
│   └── scripts/                 # Windows startup scripts
│       ├── start-overlay-server.vbs
│       └── stop-overlay-server.bat
│
├── overlay/
│   ├── _shared/                 # Shared utilities (single source of truth)
│   │   ├── config.js           # Configuration constants
│   │   └── nbaApi.js           # ESPN API integration
│   │
│   ├── _dashboard/             # Control Panel
│   │   ├── index.html         # Dashboard UI
│   │   ├── dashboard.js       # Selection logic & simulation control
│   │   └── (references _shared/)
│   │
│   └── game-stats-overlay/    # Modular overlay system
│       ├── core/              # Production overlay
│       │   ├── index.html         # Production-ready overlay with API
│       │   ├── game-view.js       # Core GameView controller class
│       │   ├── mvp-view.js        # MVP overlay view controller
│       │   ├── mvp-controller.js  # MVP automatic display logic
│       │   ├── mvp-integration.js # MVP data fetching & caching
│       │   ├── styles.css         # Overlay styling (includes MVP)
│       │   └── (references ../../_shared/)
│       │
│       └── tests/             # Testing pages
│           ├── test-states.html      # Interactive state tester
│           ├── test-simulation.html  # Full game simulation
│           └── index-full.html       # Full design preview
│
├── docs/                       # Documentation
├── backup_old_dashboard/      # Previous implementation (archived)
└── package.json               # Project metadata
```

## Component Details

### Server (`server/server.js`)

**Purpose:** Central hub that serves files and coordinates game selection between dashboard and overlay.

**Key Features:**
- Simple HTTP server on port 3000
- Serves static HTML/CSS/JS files
- Provides REST API for game/simulation selection
- In-memory storage (gameId persists while server runs)

**Routes:**
- `/` or `/dashboard` → Dashboard UI
- `/overlay/game-stats` → OBS Overlay (maps to `/overlay/game-stats-overlay/core/index.html`)
- `/api/selected-game` → Game selection API (GET/POST)
- `/api/simulation` → Simulation control API (GET/POST)

### Shared Utilities (`overlay/_shared/`)

**Philosophy:** Single source of truth - used by both dashboard and overlay

#### config.js
Centralized configuration for:
- ESPN API endpoint
- Timezone settings
- Refresh intervals (3 seconds for overlay)

#### nbaApi.js
ESPN API integration layer providing:
- `getTodaysGames()` - Fetch today's games + live/recent games from yesterday
- `getGameById(id)` - Get specific game details
- `formatGameTime(date)` - Format game times for display
- `parseStatusToShortFormat()` - Parse ESPN status to compact format (Q4 03:06)
- `formatSecondsToMMSS()` - Convert decimal seconds to MM:SS format
- Handles all game states: scheduled, live, halftime, overtime, final
- Data parsing and normalization

**Smart Game Fetching:**
- Shows all games scheduled for today
- Includes yesterday's games if still in progress or finished within last 2 hours
- Prevents games from disappearing at midnight during late streams

### Control Dashboard (`overlay/_dashboard/`)

**Purpose:** Web interface for selecting which NBA game to display and controlling simulation mode.

**Features:**
- Dropdown menu with today's NBA games (+ live/recent from yesterday)
- Preview of selected game with team logos, records, scores
- **Simulation Mode:** Toggle and state control for testing
- Saves selection to server via API
- Auto-refresh every 60 seconds

**User Interaction:**
1. Opens in browser (not visible on stream)
2. Shows all games (today + live from yesterday)
3. User picks game from dropdown
4. Selection saved immediately
5. Overlay updates within 3 seconds

### Game Overlay (`overlay/game-stats-overlay/core/`)

**Purpose:** Browser source for OBS that displays live game statistics with smooth ASMR-friendly animations.

**Architecture:**
- **Modular Design:** Following SOLID/DRY principles
- **GameView class:** Core controller managing all overlay logic
- **Inline integration:** Production HTML includes API polling and simulation logic
- **Shared dependencies:** Uses `../../_shared/` for config and API client

**Key Files:**
- **index.html:** Production overlay with polling logic, simulation support, state detection
- **game-view.js:** GameView class with show/hide, state transitions, score animations
- **styles.css:** All overlay styling (pill design, animations, colors)

**Features:**
- Transparent background (OBS-ready)
- Clean pill-style design
- Team logos, names, records
- Live scores with slide animation (slot-machine effect)
- Game status (scheduled, live, halftime, overtime, final)
- **Fast refresh:** Updates every 3 seconds
- **Smart updates:** Only animates what changed (no unnecessary fading)
- **Pregame countdown:** Updates every second
- Hides completely when server is down or no game selected

**Display States:**
- **Pregame:** Countdown timer with "Upcoming NBA" indicator
- **Live:** Real-time scores, quarter, time remaining with "Live NBA" indicator
- **Halftime:** "Halftime" status with current scores
- **Overtime:** "OT" indicator with time
- **Final:** "Final" status with final scores

**Animation Strategy:**
- **Score changes:** Slide animation only (old score slides up and fades, new score slides in)
- **State changes:** Instant content swap (no fading)
- **First load:** Instant appearance (no animation)
- **Time updates:** Silent (no animation when only time changes)

**Smart Features:**
- Detects game state from ESPN API
- Compares data to determine what changed (state, scores, time)
- Calls appropriate GameView methods based on change type
- Handles midnight rollover (keeps yesterday's live games visible)
- Simulation mode respects dashboard state selection

### Test Pages (`overlay/game-stats-overlay/tests/`)

**Purpose:** Testing tools for development and debugging.

**test-states.html:**
- Interactive buttons to trigger state changes
- Mimics production overlay logic exactly
- Tests all game states and transitions

**test-simulation.html:**
- Full game simulation with auto-progression
- Automatic score changes every few seconds
- Tests all animation scenarios

**index-full.html:**
- Full design preview with video background
- Shows overlay in context with stream branding
- Useful for visual design review

## Technology Stack

### Backend
- **Node.js** - JavaScript runtime
- **http** module - Built-in HTTP server (no Express needed)
- **fs** module - File system operations

### Frontend
- **Vanilla JavaScript** - No frameworks
- **HTML5/CSS3** - Modern web standards
- **Fetch API** - HTTP requests to ESPN and local server
- **ES6 Classes** - GameView controller

### External Services
- **ESPN NBA Scoreboard API** - Live game data (no API key required)

### Streaming
- **OBS Studio** - Browser source integration
- **Transparent background** - CSS-based transparency

## State Management

### Server State
```javascript
// In-memory storage (resets on server restart)
let selectedGameId = null;
let simulationState = { enabled: false, state: 'pregame' };
```

**Persistence:** Game selection persists while server is running. Resets on restart.

### Client State (Overlay)
```javascript
// Tracks last known data to detect changes
let lastGameData = null; // JSON string of {state, quarter, homeScore, awayScore}
let countdownInterval = null; // Pregame countdown timer
let countdownSeconds = 0; // Current countdown value
```

**Update Logic:**
1. Fetch game data from API
2. Create comparison keys (state key + score key)
3. Compare with last known data
4. If state changed → instant switch
5. If only scores changed → slide animation
6. If only time changed → silent update
7. Update lastGameData

## Refresh Strategy

### Dashboard
- Fetches games once on page load
- Auto-refresh every 60 seconds
- Manual refresh available
- Immediately saves selection to server

### Overlay
- **3 second refresh interval** (fast response to score changes)
- Fetches selected gameId from server
- Fetches game data from ESPN API (or generates simulation data)
- Updates display with smart animation logic
- Pregame countdown updates every second (separate interval)

### Why 3 seconds?
- Fast enough for real-time scoring updates
- Stays well under ESPN API rate limits
- Provides smooth streaming experience
- ~1,200 API calls per hour during a 3-hour stream

## Network Communication

### ESPN API Calls
```
Dashboard → ESPN API: GET scoreboard (on page load)
Overlay → ESPN API: GET scoreboard (every 3 seconds)
```

### Internal API Calls
```
Dashboard → Server: POST /api/selected-game (on selection)
Dashboard → Server: POST /api/simulation (on simulation toggle)
Overlay → Server: GET /api/selected-game (every 3 seconds)
Overlay → Server: GET /api/simulation (every 3 seconds)
```

## Scalability Considerations

### Current Limitations
- Single server instance only
- In-memory state (no database)
- Game selection shared across all overlay instances
- No authentication/multi-user support

### Why These Choices?
- **Simplicity:** Personal streaming tool, not production service
- **No dependencies:** Just Node.js core modules
- **Fast setup:** Works immediately after `npm start`
- **Local only:** Designed for localhost usage

### Future Expansion Options
If needed for multiple users:
- Add database for persistent storage
- Add user sessions/authentication
- Support multiple game selections per user
- Deploy to cloud for remote access

## Error Handling

### Network Errors
- ESPN API down → Overlay hides, retries every 3 seconds
- Server unreachable → Overlay hides, retries every 3 seconds

### Data Errors
- No games today → Dashboard shows "No games today"
- Invalid game ID → Overlay hides
- Missing data → Use fallback values (e.g., "0" for score)

### Recovery
- Overlay auto-retries every 3 seconds
- No manual intervention needed
- Clean production (no console spam)

## Performance

### Optimization Strategies
- **Minimal DOM updates:** Only update what changed
- **Efficient API calls:** Single fetch per refresh interval
- **Small payload:** ESPN API returns focused data
- **No heavy libraries:** Vanilla JS keeps bundle small
- **Smart comparison:** JSON string comparison for change detection

### Resource Usage
- **CPU:** Negligible (simple HTTP server + DOM updates)
- **Memory:** < 50MB (Node.js + small in-memory state)
- **Network:** ~2KB per API call to ESPN
- **Bandwidth:** Minimal (local server + lightweight API)

## Browser Compatibility

### Requirements
- Modern browser with ES6+ support
- Fetch API support
- CSS3 animations support

### Tested On
- Chrome/Edge (Chromium) - Full support ✅
- OBS Browser Source - Full support ✅
- Firefox - Full support ✅

### OBS Browser Source
- Based on Chromium (CEF)
- Full ES6 support
- Hardware acceleration available
- Transparent background support
