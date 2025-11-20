# API Reference

Complete technical reference for all APIs in the NBA 2K OBS Overlay system.

## Table of Contents

- [Server API](#server-api)
- [NBAApi Client](#nbaapi-client)
- [ESPN API Integration](#espn-api-integration)
- [Configuration](#configuration)
- [Data Structures](#data-structures)

---

## Server API

The Node.js server provides a simple REST API for coordinating game selection between the dashboard and overlay.

### Base URL
```
http://localhost:3000
```

### Endpoints

#### GET /api/selected-game

**Description:** Retrieve the currently selected game ID.

**Request:**
```http
GET /api/selected-game
```

**Response:**
```json
{
  "gameId": "401585136"
}
```

**Response (no game selected):**
```json
{
  "gameId": null
}
```

**Status Codes:**
- `200 OK` - Success

**Example (JavaScript):**
```javascript
const response = await fetch('/api/selected-game');
const data = await response.json();
console.log(data.gameId); // "401585136" or null
```

---

#### POST /api/selected-game

**Description:** Set the currently selected game ID.

**Request:**
```http
POST /api/selected-game
Content-Type: application/json

{
  "gameId": "401585136"
}
```

**Response:**
```json
{
  "success": true
}
```

**Error Response (invalid JSON):**
```json
{
  "error": "Invalid JSON"
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid JSON payload

**Example (JavaScript):**
```javascript
const response = await fetch('/api/selected-game', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ gameId: '401585136' })
});

const data = await response.json();
console.log(data.success); // true
```

---

#### GET /api/selected-style

**Description:** Retrieve the currently selected overlay style.

**Request:**
```http
GET /api/selected-style
```

**Response:**
```json
{
  "style": "pill-green"
}
```

**Status Codes:**
- `200 OK` - Success

**Example (JavaScript):**
```javascript
const response = await fetch('/api/selected-style');
const data = await response.json();
console.log(data.style); // "pill-green", "horizontal-cyan", etc.
```

---

#### POST /api/selected-style

**Description:** Set the currently selected overlay style.

**Request:**
```http
POST /api/selected-style
Content-Type: application/json

{
  "style": "horizontal-cyan"
}
```

**Available Styles:**
- Pill: `pill-green`, `pill-red`, `pill-blue`, `pill-purple`, `pill-gold`
- Horizontal: `horizontal-green`, `horizontal-cyan`, `horizontal-red`, `horizontal-white`
- Vertical: `vertical-green`, `vertical-purple`, `vertical-blue`, `vertical-gold`

**Response:**
```json
{
  "success": true
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid JSON payload

**Example (JavaScript):**
```javascript
const response = await fetch('/api/selected-style', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ style: 'horizontal-cyan' })
});
```

---

## NBAApi Client

JavaScript client for interacting with ESPN's NBA API. Available globally as `window.NBAApi`.

### Methods

#### getTodaysGames()

**Description:** Fetch NBA games for today, plus any games from yesterday that are still live or finished within the last 2 hours. This prevents games from disappearing when streaming past midnight.

**Signature:**
```javascript
async function getTodaysGames(): Promise<Game[]>
```

**Returns:** Array of [Game objects](#game-object)

**Smart Fetching Logic:**
- All games scheduled for today
- Yesterday's games if STATUS_IN_PROGRESS, STATUS_HALFTIME, or STATUS_END_PERIOD
- Yesterday's games if STATUS_FINAL and game started < 5 hours ago (finished < 2 hours ago)

**Example:**
```javascript
const games = await window.NBAApi.getTodaysGames();
console.log(games.length); // e.g., 8 (or more if late games from yesterday)
console.log(games[0].name); // "Los Angeles Lakers at Golden State Warriors"
```

**Error Handling:**
```javascript
try {
  const games = await window.NBAApi.getTodaysGames();
} catch (error) {
  console.error('Failed to fetch games:', error);
}
```

---

#### getGameById(gameId)

**Description:** Fetch details for a specific game by its ID.

**Signature:**
```javascript
async function getGameById(gameId: string): Promise<Game | null>
```

**Parameters:**
- `gameId` (string) - ESPN game ID (e.g., "401585136")

**Returns:** [Game object](#game-object) or `null` if not found

**Example:**
```javascript
const game = await window.NBAApi.getGameById('401585136');
if (game) {
  console.log(game.awayTeam.name); // "Los Angeles Lakers"
  console.log(game.homeTeam.name); // "Golden State Warriors"
}
```

---

#### formatGameTime(dateString)

**Description:** Format a game's start time for display in the configured timezone.

**Signature:**
```javascript
function formatGameTime(dateString: string): string
```

**Parameters:**
- `dateString` (string) - ISO 8601 date string (e.g., "2024-03-15T02:00Z")

**Returns:** Formatted time string (e.g., "7:00 PM")

**Example:**
```javascript
const time = window.NBAApi.formatGameTime("2024-03-15T02:00Z");
console.log(time); // "7:00 PM" (in configured timezone)
```

---

## ESPN API Integration

The system uses ESPN's public NBA Scoreboard API.

### Endpoint

```
https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard
```

### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `dates` | string | Date in YYYYMMDD format | `20240315` |

### Example Request

```http
GET https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=20240315
```

### Response Structure

ESPN returns a complex JSON structure. Key fields used:

```json
{
  "events": [
    {
      "id": "401585136",
      "name": "Los Angeles Lakers at Golden State Warriors",
      "shortName": "LAL @ GSW",
      "date": "2024-03-15T02:00Z",
      "competitions": [
        {
          "status": {
            "type": {
              "name": "STATUS_IN_PROGRESS",
              "detail": "Q3 8:32"
            }
          },
          "competitors": [
            {
              "homeAway": "away",
              "team": {
                "displayName": "Los Angeles Lakers",
                "abbreviation": "LAL",
                "logo": "https://..."
              },
              "score": "82",
              "records": [
                {
                  "summary": "35-31"
                }
              ]
            },
            {
              "homeAway": "home",
              "team": {
                "displayName": "Golden State Warriors",
                "abbreviation": "GSW",
                "logo": "https://..."
              },
              "score": "78",
              "records": [
                {
                  "summary": "32-34"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### Status Types

| Status | Description |
|--------|-------------|
| `STATUS_SCHEDULED` | Game not started yet |
| `STATUS_IN_PROGRESS` | Game currently live |
| `STATUS_FINAL` | Game completed |

---

## Configuration

Configuration is defined in `overlay/shared/config.js`.

### Config Object

```javascript
window.NBA_CONFIG = {
  // ESPN API endpoint
  ESPN_NBA_SCOREBOARD: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
  
  // Timezone for game time display
  TIMEZONE: 'America/New_York',
  
  // Refresh interval (milliseconds)
  REFRESH_INTERVAL: 10000, // 10 seconds
  
  // Storage key for selected game
  STORAGE_KEY: 'nba-overlay-selected-game'
};
```

### Configuration Options

#### ESPN_NBA_SCOREBOARD
- **Type:** String (URL)
- **Default:** `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard`
- **Purpose:** ESPN API endpoint for NBA games
- **Note:** No API key required

#### TIMEZONE
- **Type:** String (IANA timezone)
- **Default:** `America/New_York` (Eastern Time)
- **Purpose:** Display game times in this timezone
- **Examples:** 
  - `America/Los_Angeles` (Pacific)
  - `America/Chicago` (Central)
  - `America/Denver` (Mountain)

#### REFRESH_INTERVAL
- **Type:** Number (milliseconds)
- **Default:** `10000` (10 seconds)
- **Purpose:** How often overlay updates
- **Configurable in:** `overlay/game-stats/overlay.js`

---

## Data Structures

### Game Object

Normalized game data used throughout the application.

```typescript
interface Game {
  // Game identification
  id: string;                    // ESPN game ID
  name: string;                  // Full name: "Team A at Team B"
  shortName: string;             // Short name: "TEA @ TEB"
  date: string;                  // ISO 8601 date string
  
  // Away team
  awayTeam: {
    name: string;                // Full name: "Los Angeles Lakers"
    abbreviation: string;        // "LAL"
    logo: string;                // URL to team logo
    score: string;               // Current score (or "0" if not started)
    record: string;              // Season record: "35-31"
  };
  
  // Home team
  homeTeam: {
    name: string;                // Full name: "Golden State Warriors"
    abbreviation: string;        // "GSW"
    logo: string;                // URL to team logo
    score: string;               // Current score (or "0" if not started)
    record: string;              // Season record: "32-34"
  };
  
  // Game status
  status: string;                // "scheduled" | "live" | "final"
  statusText: string;            // Human-readable: "Q3 8:32" | "7:00 PM" | "Final"
  isLive: boolean;               // True if game in progress
  isFinal: boolean;              // True if game completed
}
```

### Example Game Object

```json
{
  "id": "401585136",
  "name": "Los Angeles Lakers at Golden State Warriors",
  "shortName": "LAL @ GSW",
  "date": "2024-03-15T02:00Z",
  "awayTeam": {
    "name": "Los Angeles Lakers",
    "abbreviation": "LAL",
    "logo": "https://a.espncdn.com/i/teamlogos/nba/500/lal.png",
    "score": "82",
    "record": "35-31"
  },
  "homeTeam": {
    "name": "Golden State Warriors",
    "abbreviation": "GSW",
    "logo": "https://a.espncdn.com/i/teamlogos/nba/500/gsw.png",
    "score": "78",
    "record": "32-34"
  },
  "status": "live",
  "statusText": "Q3 8:32",
  "isLive": true,
  "isFinal": false
}
```

### Team Object

Part of Game object, represents a single team.

```typescript
interface Team {
  name: string;                  // Full display name
  abbreviation: string;          // 2-3 letter abbreviation
  logo: string;                  // URL to team logo (PNG, 500x500)
  score: string;                 // Current score as string
  record: string;                // Win-loss record: "W-L"
}
```

### Status Info

Internal representation of game status.

```typescript
interface StatusInfo {
  status: 'scheduled' | 'live' | 'final' | 'unknown';
  text: string;                  // Display text
  isLive: boolean;
  isFinal: boolean;
}
```

---

## Usage Examples

### Complete Dashboard Flow

```javascript
// 1. Load today's games
const games = await window.NBAApi.getTodaysGames();

// 2. Display in dropdown
const selector = document.getElementById('game-selector');
games.forEach(game => {
  const option = document.createElement('option');
  option.value = game.id;
  option.textContent = `${game.awayTeam.name} @ ${game.homeTeam.name}`;
  selector.appendChild(option);
});

// 3. When user selects a game
selector.addEventListener('change', async (e) => {
  const gameId = e.target.value;
  
  // Save to server
  await fetch('/api/selected-game', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameId })
  });
});
```

### Complete Overlay Flow

```javascript
// 1. Get selected game from server
const response = await fetch('/api/selected-game');
const { gameId } = await response.json();

if (!gameId) {
  console.log('No game selected');
  return;
}

// 2. Fetch game data
const game = await window.NBAApi.getGameById(gameId);

if (!game) {
  console.log('Game not found');
  return;
}

// 3. Display game
console.log(`${game.awayTeam.abbreviation} ${game.awayTeam.score}`);
console.log(`${game.homeTeam.abbreviation} ${game.homeTeam.score}`);
console.log(`Status: ${game.statusText}`);

// 4. Set up auto-refresh
setInterval(async () => {
  const updatedGame = await window.NBAApi.getGameById(gameId);
  // Update display...
}, 10000);
```

### Error Handling Best Practices

```javascript
async function updateOverlay() {
  try {
    // Fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('/api/selected-game', {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const { gameId } = await response.json();
    
    // Continue with game data...
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Request timeout');
    } else {
      console.error('Update failed:', error);
    }
    
    // Show error state
    showError(error.message);
  }
}
```

---

## Rate Limiting

### ESPN API
- **No official rate limit** documented
- **Best practice:** Don't refresh more than once per 5 seconds
- **Current implementation:** 10 second refresh (safe)

### Local Server
- **No rate limiting** implemented
- **Not needed:** Localhost only, single user

---

## CORS Considerations

### ESPN API
- **CORS enabled** for browser requests
- **No proxy needed** for client-side fetching

### Local Server
- **No CORS headers** needed
- **Same-origin:** Dashboard and overlay on same server

---

## Testing APIs

### Test ESPN API Manually

```bash
curl "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=20240315"
```

### Test Server API Manually

```bash
# Get selected game
curl http://localhost:3000/api/selected-game

# Set selected game
curl -X POST http://localhost:3000/api/selected-game \
  -H "Content-Type: application/json" \
  -d '{"gameId":"401585136"}'
```

### Test in Browser Console

```javascript
// Test NBAApi
const games = await window.NBAApi.getTodaysGames();
console.table(games);

// Test server API
const res = await fetch('/api/selected-game');
console.log(await res.json());
```

