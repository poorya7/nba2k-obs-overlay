# System Architecture

## Overview

The NBA 2K OBS Overlay is a local web application that displays live NBA game statistics as an overlay for OBS streaming. The system consists of three main components that work together to fetch, select, and display real-time NBA game data.

## System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        ESPN NBA API                          │
│          https://site.api.espn.com/.../scoreboard           │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP GET (every refresh)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     Node.js Server                           │
│                    (server.js - Port 3000)                   │
│                                                               │
│  • Serves static files (HTML/CSS/JS)                        │
│  • API: GET/POST /api/selected-game                         │
│  • In-memory storage for selected game ID                   │
└───────────────────┬─────────────────────┬───────────────────┘
                    │                     │
        ┌───────────▼─────────┐  ┌───────▼───────────┐
        │   Control Dashboard  │  │  OBS Game Overlay │
        │   /dashboard         │  │  /overlay/        │
        │                      │  │  game-stats       │
        │  • Game selection UI │  │                   │
        │  • Preview display   │  │  • Live stats     │
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
    ├─> Overlay displays game stats
    │
    └─> Repeats every 10 seconds (auto-refresh)
```

## File Structure

```
nba2k-obs-overlay/
│
├── server.js                    # Node.js HTTP server
│   ├── Static file serving
│   ├── API endpoints for game selection
│   └── In-memory storage
│
├── overlay/
│   ├── shared/                  # Shared utilities
│   │   ├── config.js           # Configuration constants
│   │   └── nbaApi.js           # ESPN API integration
│   │
│   ├── dashboard/              # Control Panel
│   │   ├── index.html         # Dashboard UI
│   │   └── dashboard.js       # Selection logic
│   │
│   └── game-stats/            # OBS Overlay
│       ├── index.html         # Overlay UI
│       ├── styles.css         # Overlay styling
│       └── overlay.js         # Display logic
│
├── docs/                       # Documentation
├── scripts/                    # Windows startup scripts
└── package.json               # Project metadata
```

## Component Details

### Server (`server.js`)

**Purpose:** Central hub that serves files and coordinates game selection between dashboard and overlay.

**Key Features:**
- Simple HTTP server on port 3000
- Serves static HTML/CSS/JS files
- Provides REST API for game selection
- In-memory storage (gameId persists while server runs)

**Routes:**
- `/` or `/dashboard` → Dashboard UI
- `/overlay/game-stats` → OBS Overlay
- `/api/selected-game` → Game selection API

### Shared Utilities (`overlay/shared/`)

#### config.js
Centralized configuration for:
- ESPN API endpoint
- Timezone settings
- Refresh intervals
- Storage keys

#### nbaApi.js
ESPN API integration layer providing:
- `getTodaysGames()` - Fetch all games for today
- `getGameById(id)` - Get specific game details
- `formatGameTime(date)` - Format game times for display
- Data parsing and normalization

### Control Dashboard (`overlay/dashboard/`)

**Purpose:** Web interface for selecting which NBA game to display on stream.

**Features:**
- Dropdown menu with today's NBA games
- Preview of selected game
- Saves selection to server via API
- Auto-selects first live game (if available)

**User Interaction:**
1. Opens in browser (not visible on stream)
2. Shows all games for current day
3. User picks game from dropdown
4. Selection saved immediately
5. Overlay updates on next refresh

### Game Overlay (`overlay/game-stats/`)

**Purpose:** Browser source for OBS that displays live game statistics.

**Features:**
- Transparent background (OBS-ready)
- Team logos, names, records
- Live scores (when game is active)
- Game status (scheduled time, quarter, final)
- Auto-refresh every 10 seconds

**Display States:**
- **No game selected:** Shows prompt to use dashboard
- **Scheduled game:** Shows teams, records, start time
- **Live game:** Shows teams, scores, quarter/time
- **Final game:** Shows teams, final scores
- **Error:** Shows error message

## Technology Stack

### Backend
- **Node.js** - JavaScript runtime
- **http** module - Built-in HTTP server (no Express needed)
- **fs** module - File system operations

### Frontend
- **Vanilla JavaScript** - No frameworks
- **HTML5/CSS3** - Modern web standards
- **Fetch API** - HTTP requests to ESPN and local server

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
```

**Persistence:** Game selection persists while server is running. Resets on restart.

### Client State
- **Dashboard:** Fetches fresh game list on each load
- **Overlay:** Polls server every 10 seconds for updates
- **No localStorage:** Server is source of truth

## Refresh Strategy

### Dashboard
- Fetches games once on page load
- Manual refresh to get updated game list
- Immediately saves selection to server

### Overlay
- **10 second refresh interval**
- Fetches selected gameId from server
- Fetches game data from ESPN API
- Updates display with latest scores/status

### Why 10 seconds?
- Balance between freshness and API load
- ESPN updates scores frequently during live games
- Fast enough for streaming purposes
- Configurable in overlay.js (`setInterval` value)

## Network Communication

### ESPN API Calls
```
Dashboard → ESPN API: GET scoreboard (on page load)
Overlay → ESPN API: GET scoreboard (every 10 seconds)
```

### Internal API Calls
```
Dashboard → Server: POST /api/selected-game (on selection)
Overlay → Server: GET /api/selected-game (every 10 seconds)
```

## Scalability Considerations

### Current Limitations
- Single server instance only
- In-memory state (no database)
- Game selection shared across all overlay instances
- No authentication/multi-user support

### Why These Choices?
- **Simplicity:** Personal streaming tool, not production service
- **No dependencies:** Just Node.js, no npm packages needed
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
- ESPN API down → Display error message
- Server unreachable → Retry on next interval

### Data Errors
- No games today → Dashboard shows "No games today"
- Invalid game ID → Overlay shows error
- Missing data → Use fallback values (e.g., "0" for score)

### Recovery
- Overlay auto-retries every 10 seconds
- No manual intervention needed
- Errors logged to browser console

## Performance

### Optimization Strategies
- **Minimal DOM updates:** Only update when data changes
- **Efficient API calls:** Single fetch per refresh interval
- **Small payload:** ESPN API returns only today's games
- **No heavy libraries:** Vanilla JS keeps bundle small

### Resource Usage
- **CPU:** Negligible (simple HTTP server)
- **Memory:** < 50MB (Node.js + small in-memory state)
- **Network:** ~2KB per API call to ESPN
- **Bandwidth:** Minimal (local server + lightweight API)

## Browser Compatibility

### Requirements
- Modern browser with ES6+ support
- Fetch API support
- CSS3 backdrop-filter support (for blur effects)

### Tested On
- Chrome/Edge (Chromium) - Full support ✅
- OBS Browser Source - Full support ✅
- Firefox - Full support ✅

### OBS Browser Source
- Based on Chromium (CEF)
- Full ES6 support
- Hardware acceleration available
- Transparent background support

