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

### Simulation Mode
- **Testing Tool**: Enable simulation mode to test overlay without live games
- **State Control**: Cycle through pregame, live, halftime, overtime, and final states
- **Auto-progression**: Simulated games automatically progress through states
- **Score Animation Testing**: Scores change automatically to test animations

## Overlay Features

### Display
- **Clean ASMR Design**: Minimalist pill-style design with smooth animations
- **Transparent Background**: Integrates seamlessly with OBS
- **Scalable**: Optimized for 1920x1080 streams
- **Customizable Position**: Place anywhere on your stream

### Game States
Automatically detects and displays:
- **Pre-game**: Countdown timer until tipoff (updates every second)
- **Live**: Real-time scores, quarter, time remaining
- **Halftime**: Halftime indicator with current scores
- **Overtime**: OT indicator with remaining time
- **Final**: Final scores

### Smart Features
- **Fast Updates**: Refreshes game data every 3 seconds
- **Score Slide Animation**: Smooth slot-machine-style animation when scores change
- **Smart Update Logic**: Only animates what changes (no unnecessary blinking)
- **Time Formatting**: Always displays time as MM:SS (e.g., "08:32" or "00:45")
- **Instant Switching**: No animation when switching between games
- **Graceful Degradation**: Hides overlay when server is down or no game selected
- **Midnight Handling**: Games don't disappear at midnight if still in progress

### Status Parsing
Intelligently handles all ESPN API statuses:
- **Quarter formats**: "4:59 - 4th Quarter" → "Q4 04:59"
- **Decimal time**: "31.2 - 3rd Quarter" → "Q3 00:31" (converts to MM:SS)
- **Halftime**: Multiple variations recognized
- **Overtime**: "3:45 - Overtime" → "OT 03:45"

## Technical Features

### Architecture
- **Modular Design**: Following SOLID/DRY principles
- **Separation of Concerns**: 
  - `game-view.js`: Core overlay controller
  - `index.html`: Production-ready overlay with API integration
  - `nbaApi.js`: ESPN API client (shared)
  - `config.js`: Configuration (shared)
- **Loose Coupling**: Components interact through well-defined interfaces
- **Single Source of Truth**: Shared files eliminate duplication

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
- **URL**: `http://localhost:3000/overlay/game-stats`
- **Shutdown source when not visible**: Yes (saves resources)
- **Refresh browser when scene becomes active**: No (maintains state)

### Styling
- **Full Transparency**: No visible background
- **Clean Design**: Professional ASMR-friendly aesthetic
- **Readable Fonts**: High-contrast text for visibility
- **Smooth Animations**: Slide effect for score changes

## Development Features

### Test Pages
- **State Tester**: Interactive buttons to test all game states
- **Game Simulation**: Full game simulation with automatic score changes
- **Full Preview**: Design preview with video background and branding

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
