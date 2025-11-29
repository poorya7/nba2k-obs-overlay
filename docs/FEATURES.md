# Features

Complete list of features in the NBA 2K OBS Overlay system.

## Dashboard Features

### Game Selection
- **Smart Game List**: Shows all games scheduled for today, plus any games from yesterday that are:
  - Still in progress (live, halftime, end of quarter)
  - Finished within the last 2 hours
- **Real-time Preview**: See team logos, records, scores, and game status
- **Status Indicators**: 🔴 LIVE, ✅ FINAL, ⏰ Scheduled time
- **Auto-refresh**: Updates every 60 seconds
- **Persistent Selection**: Game choice saved to server
- **Quarter Timer**: Displays elapsed time since quarter started, shows when overlays will trigger (e.g., "Other Games shows at 01:00")

### Quarter Tracking & Timer
- **Visual Tracking**: Click quarter buttons (Q1-Q4) to track current game period
- **Elapsed Timer**: Large display showing MM:SS time since quarter started
- **Overlay Indicators**: Shows when overlays will trigger (e.g., "Other Games shows at 01:00")
- **Auto-Reset**: Timer resets when switching quarters
- **Done Button**: Mark stream as complete to hide all overlays

### Simulation Mode
- **Testing Tool**: Enable simulation mode to test overlays without live games
- **State Control**: Use quarter buttons (Q1-Q4) and state buttons (Pre-Game, Halftime, Final) to control game state
- **Fast Forward**: 10x speed button to accelerate time for rapid testing
- **Auto-progression**: Simulated games automatically progress through states
- **Score Animation Testing**: Scores change automatically to test animations (faster in Fast Forward mode)
- **Simulated MVP**: Toggle to show/hide test MVP data in simulation mode
- **Simulated Other Games**: Displays 10 fake games when simulation is active
- **Mode Switching**: Tests both current game and other games display modes with proper timing

## Overlay Features

### Unified NBA Live Overlay
Single overlay that automatically switches between two display modes:

**Current Game Mode:**
- Shows your selected game with live stats
- Team logos, scores, quarter, time remaining
- Clean ASMR pill-style design with smooth animations
- Transparent background integrates seamlessly with OBS
- MVP overlay displays during game breaks

**Other Games Mode:**
- Shows scores from other NBA games (3 per page)
- Cycles through all games automatically
- Appears 1 minute after each quarter starts
- Returns to current game after one full cycle

### Automatic Mode Switching
- **Q1**: Hidden for first 10 seconds, then shows current game until 60s, switches to other games, cycles, returns to current game
- **Q2/Q3/Q4**: Shows current game immediately, switches to other games at 60s, cycles, returns to current game
- **Once Per Quarter**: Other games only show once per quarter automatically
- **Seamless Transitions**: Smooth switching between modes

### Current Game States
Automatically detects and displays:
- **Pre-game**: Countdown timer until tipoff (updates every second)
- **Live**: Real-time scores, quarter, time remaining
- **Halftime**: Halftime indicator with current scores
- **Overtime**: OT indicator with remaining time
- **Final**: Final scores

### Smart Features
- **Adaptive Polling**: 3 seconds in normal mode, 300ms in simulation mode
- **Score Slide Animation**: Smooth slot-machine-style animation when scores change
- **Smart Update Logic**: Only animates what changes (no unnecessary blinking)
- **Time Formatting**: Always displays time as MM:SS (e.g., "08:32" or "00:45")
- **Instant Switching**: No animation when switching between games or modes
- **Graceful Degradation**: Hides overlay when server is down or no game selected
- **Midnight Handling**: Games don't disappear at midnight if still in progress
- **Quarter-based Timing**: Coordinated with dashboard quarter tracking

### Status Parsing
Intelligently handles all ESPN API statuses:
- **Quarter formats**: "4:59 - 4th Quarter" → "Q4 04:59"
- **Decimal time**: "31.2 - 3rd Quarter" → "Q3 00:31" (converts to MM:SS)
- **Halftime**: Multiple variations recognized
- **Overtime**: "3:45 - Overtime" → "OT 03:45"

### MVP Player Overlay
Automatic player spotlight that displays during game breaks (only in current game mode):
- **Auto-Display Logic**: Shows during halftime (10s delay), timeouts (20s delay), end of quarters (3s delay), and final (5s delay)
- **Smart Timing**: Displays for 17 seconds, repeats every 1 minute during halftime and final states (max 3 times)
- **Player Data**: Shows MVP's name, photo, team logo, and key stats (PTS, REB, AST)
- **MVP Calculation**: Automatically determines leading player based on combined PTS + REB + AST from ESPN boxscore
- **Smooth Animations**: Box expands downward, content fades in with horizontal slide
- **Dynamic Font Sizing**: Adjusts player name font size for long names to prevent clipping
- **Data Caching**: Prevents redundant API calls during game breaks
- **Integrated Design**: Matches main game stats box styling and color scheme
- **Mode-Aware**: Only displays when in current game mode (hidden during other games display)

### Other Games Display
Integrated into the unified overlay:
- **Smart Timing**: Appears 1 minute after each quarter starts
- **Proportional Duration**: Display time scales with game count (13s for 3 games, 8.7s for 2 games, 4.3s for 1 game)
- **Pagination**: Groups games 3 per page, cycles through all games once per quarter
- **Once Per Quarter**: After cycling, returns to current game mode automatically
- **Same Position**: Uses the exact same screen position as current game display
- **Simulation Mode**: Shows 10 fake games when simulation is enabled for testing
- **Consistent Sizing**: Box uses hardcoded max heights (476px for 3 games, 316px for 2, 156px for 1)
- **Smooth Transitions**: No resize when same number of games, only when count changes
- **Consistent Styling**: Matches the visual design of current game mode

## Technical Features

### Architecture
- **Unified Modular Design**: Following SOLID/DRY principles
- **Separation of Concerns**: 
  - `app-controller.js`: Main orchestrator managing timing and mode switching
  - `game-view.js`: Current game display controller
  - `other-games-view.js`: Other games display controller
  - `other-games-controller.js`: Other games cycling logic
  - `other-games-container-view.js`: Container visibility
  - `mvp-view.js / mvp-controller.js`: MVP functionality
  - `state-manager.js`: Unified state facade (delegates to 4 specialized managers)
  - `transition-animator.js`: Complex transition animations
  - `simulation-manager.js`: Fake data generation
  - `nbaApi.js`: ESPN API client (shared)
  - `apiClient.js`: Server API client (shared)
  - `config.js`: Configuration (shared)
- **Loose Coupling**: Components interact through well-defined interfaces
- **Single Source of Truth**: Shared files eliminate duplication
- **Single Overlay**: One unified overlay replaces separate game-stats and other-games overlays

### Performance
- **Efficient Polling**: 3-second updates for responsive live data
- **Smart Caching**: Detects changes to avoid unnecessary re-renders
- **Minimal Dependencies**: Vanilla JavaScript, no frameworks
- **Low Resource Usage**: Perfect for streaming PCs
- **No Console Spam**: Clean production build with no debug logs

### Error Handling
- **Network Errors**: Gracefully handles ESPN API failures
- **Invalid Data**: Validates and sanitizes all inputs
- **Missing Games**: Hides overlay instead of showing errors
- **Server Downtime**: Automatic retry every 3 seconds

## OBS Integration

### Browser Source Settings
Recommended settings for OBS:
- **Width**: 1920 pixels
- **Height**: 1080 pixels
- **URL**: `http://localhost:3000/overlay/nba-live`
- **Shutdown source when not visible**: Yes (saves resources)
- **Refresh browser when scene becomes active**: No (maintains state)

### Styling
- **Full Transparency**: No visible background
- **Clean Design**: Professional ASMR-friendly aesthetic
- **Readable Fonts**: High-contrast text for visibility
- **Smooth Animations**: Slide effect for score changes

## Development Features

### Testing & Simulation
- **Dashboard Simulation Mode**: Full overlay testing with quarter controls and state buttons
- **Fast Forward (10x)**: Rapid time acceleration for quick testing
- **MVP Toggle**: Test MVP display in simulation mode
- **Mode Switching**: Test automatic transitions between current game and other games
- **Quarter Controls**: Q1-Q4, Pre-Game, Halftime, Final state buttons

### Configuration
- **Timezone Support**: Configurable timezone for game times
- **Refresh Intervals**: 3-second polling for live data
- **API Endpoints**: Easy to modify ESPN API integration
- **Shared Config**: Single configuration file for all components

### Auto-start
- **Windows Startup**: VBScript for automatic server launch on boot
- **Silent Execution**: Runs in background without console window
- **Easy Setup**: Copy script to Startup folder

## Future Enhancements

Potential features for future development:
- Player stats integration
- Multiple game support (show multiple games at once)
- Custom color themes
- Mobile-responsive dashboard
- Play-by-play integration
- Team-specific branding
