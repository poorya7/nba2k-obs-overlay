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
        │                      │  │  nba-live         │
        │  • Game/mode select  │  │                   │
        │  • Quarter controls  │  │  • Unified view   │
        │  • Simulation mode   │  │  • Current game   │
        │  • Saves to server   │  │  • Other games    │
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
│   │   ├── nbaApi.js           # ESPN API integration
│   │   └── apiClient.js        # Server API client
│   │
│   ├── _dashboard/             # Control Panel
│   │   ├── index.html         # Dashboard UI
│   │   ├── dashboard.js       # Mode selection, quarter controls, simulation
│   │   └── (references _shared/)
│   │
│   ├── nba-live-overlay/      # Unified modular overlay system
│   │   ├── game/              # Current game feature
│   │   │   └── game-view.js   # Game display & animations
│   │   ├── mvp/               # MVP feature
│   │   │   ├── mvp-view.js
│   │   │   ├── mvp-controller.js
│   │   │   └── mvp-integration.js
│   │   ├── other-games/       # Other games feature
│   │   │   ├── other-games-view.js
│   │   │   ├── other-games-controller.js
│   │   │   └── other-games-container-view.js
│   │   ├── utils/             # Utility functions
│   │   │   ├── game-utils.js            # GameUtils class (static methods)
│   │   │   ├── state-manager.js         # Unified state facade
│   │   │   ├── state/                   # State managers (SOLID)
│   │   │   │   ├── game-state-manager.js
│   │   │   │   ├── timing-manager.js
│   │   │   │   ├── mode-manager.js
│   │   │   │   └── overlay-state-manager.js
│   │   │   ├── transition-animator.js   # Transition animations
│   │   │   ├── simulation-manager.js
│   │   │   └── game-data-formatter.js
│   │   ├── app-controller.js  # Main orchestrator
│   │   ├── mode-coordinator.js # Mode switching
│   │   ├── index.html         # Production overlay
│   │   ├── styles.css         # All styling
│   │   └── (references ../_shared/)
│   │
│   └── _tests/                # Social media overlay tests
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
- `/overlay/nba-live` → Unified OBS Overlay (maps to `/overlay/nba-live-overlay/index.html`)
- `/api/selected-game` → Game selection API (GET/POST)
- `/api/quarter` → Quarter tracking API (GET/POST)
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

### Unified NBA Live Overlay (`overlay/nba-live-overlay/`)

**Purpose:** Single browser source for OBS that displays both current game stats and other games with automatic timing-based switching.

**Architecture:**
- **Unified Design:** Combines game-stats and other-games functionality in one overlay
- **Two Display Modes:** Current game view and other games view (automatic switching)
- **Modular Components:** GameView, OtherGamesView, MvpView, Controllers, State/Simulation managers
- **AppController orchestration:** Manages mode switching, timing, and data flow
- **Shared dependencies:** Uses `../../_shared/` for config and API client

**Key Files:**
- **index.html:** Production overlay with both views (current game + other games)
- **app-controller.js:** Main orchestrator managing timing, mode switching, data fetching
- **game-view.js:** Current game display with state transitions and animations
- **other-games-view.js:** Other games rendering and cycling
- **other-games-controller.js:** Other games timing and cycle management
- **mvp-view.js / mvp-controller.js / mvp-integration.js:** MVP functionality
- **state-manager.js:** Centralized state tracking (mode, quarters, scores, timing)
- **simulation-manager.js:** Fake data generation for testing
- **styles.css:** All overlay styling (pill design, animations, colors)

**Two Display Modes:**

**1. Current Game Mode:**
- Shows selected game with live stats
- Team logos, scores, quarter, time
- Score slide animations (slot-machine effect)
- MVP overlay when appropriate
- States: Pregame (countdown), Live, Halftime, Final

**2. Other Games Mode:**
- Shows other NBA games (3 at a time)
- Cycles through all games
- Proportional duration: 13s for 3 games, 8.7s for 2 games, 4.3s for 1 game (scales with game count)
- Appears at 60s mark each quarter (once per quarter)
- After cycling, returns to current game mode
- Box uses hardcoded max heights to prevent resizing when same game count

**Timing Logic:**

**Q1:**
- 0-10s: Hidden
- 10-60s: Current game mode
- 60s: Other games mode (cycles through all, then back to current game)
- Rest of quarter: Current game mode

**Q2/Q3/Q4:**
- 0-60s: Current game mode (shows immediately, no delay)
- 60s: Other games mode (cycles through all, then back to current game)
- Rest of quarter: Current game mode

**Animation Strategy:**
- **Score changes:** Slide animation (old score slides up, new score slides in from bottom)
- **Mode switching:** Smooth overlapping transitions (fade-out/resize parallel, fade-in overlaps with resize end)
- **Box resize:** Proportional timing up to 800ms max, with 200ms stagger before resize starts
- **Content transitions:** Fade-out (300ms) → 200ms delay → Fade-in (matches resize duration)
- **State changes:** Instant content swap
- **First load:** Instant appearance
- **Time updates:** Silent updates
- **Other games pages:** No resize when same game count (uses hardcoded max heights: 476/316/156px)

**Smart Features:**
- Quarter-based timing (controlled from dashboard)
- Automatic mode switching at 60s mark
- Other games show once per quarter only
- Detects quarter changes and resets accordingly
- Simulation mode with fast forward (10x time acceleration)
- Responsive polling (300ms in sim mode, 3s in normal mode)

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
