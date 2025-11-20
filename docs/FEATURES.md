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

### Style Switcher
- **13 Different Styles**: Cycle through all overlay designs in real-time
- **Instant Updates**: Overlay changes within 2 seconds of button click
- **Style Categories**:
  - **Pill (5 colors)**: Green, Red, Blue, Purple, Gold
  - **Horizontal (4 styles)**: Classic Green, Neon Cyan, Red, White
  - **Vertical (4 styles)**: Green, Purple, Blue, Gold
- **Live Testing**: See style changes on your stream without restarting

## Overlay Features

### Display Options
- **Multiple Layouts**:
  - **Pill**: Compact horizontal design, perfect for top-left corner
  - **Horizontal Bar**: Wide format for bottom of screen
  - **Vertical Sidebar**: Tall format for side of screen
- **Scalable**: Pill is 15% larger, horizontal/vertical are 20% larger than design-test
- **Transparent Background**: Integrates seamlessly with OBS
- **Customizable Position**: Place anywhere on your stream

### Game States
Automatically detects and displays:
- **Pre-game**: Countdown timer until tipoff
- **Live**: Real-time scores, quarter, time remaining
- **Halftime**: Halftime indicator with current scores
- **End of Quarter**: Shows "Q# End" when clock hits 0:00
- **Overtime**: OT indicator with remaining time
- **Final**: Final scores

### Smart Features
- **Auto-refresh**: Updates game data every 10 seconds
- **Style polling**: Checks for style changes every 2 seconds
- **Score Animations**: Glowing effect when scores change (pill layout)
- **Smooth Transitions**: Animated state changes (pill layout)
- **Graceful Degradation**: Hides overlay when server is down or no game selected
- **Midnight Handling**: Games don't disappear at midnight if still in progress

### Status Parsing
Intelligently handles all ESPN API statuses:
- **Quarter formats**: "4:59 - 4th Quarter" → "Q4 4:59"
- **Decimal time**: "31.2 - 3rd Quarter" → "Q3 31.2"
- **End of period**: "End of 3rd Quarter" → "Q3 End"
- **Halftime**: Multiple variations recognized
- **Overtime**: "3:45 - Overtime" → "OT 3:45"

## Technical Features

### Architecture
- **Modular Design**: Following SOLID/DRY principles
- **Separation of Concerns**: 
  - `GameOverlay.js`: Main controller
  - `StateRenderer.js`: HTML generation for all layouts
  - `StateTransitions.js`: Animation logic
- **Loose Coupling**: Components interact through well-defined interfaces
- **Reusable Code**: Same codebase for all 13 styles

### Performance
- **Efficient Polling**: Only polls necessary data
- **Smart Caching**: Avoids unnecessary re-renders
- **Minimal Dependencies**: Vanilla JavaScript, no frameworks
- **Low Resource Usage**: Perfect for streaming PCs

### Error Handling
- **Network Errors**: Gracefully handles ESPN API failures
- **Invalid Data**: Validates and sanitizes all inputs
- **Missing Games**: Shows appropriate fallback states
- **Server Downtime**: Overlay disappears instead of showing errors

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
- **Clean Design**: Professional look for streams
- **Readable Fonts**: Google Fonts (Inter, Poppins)
- **High Contrast**: Scores and text are clearly visible

## Development Features

### Design Tester
- **Live Preview**: Test all 13 styles with real game data
- **Side-by-side Comparison**: See all designs at once
- **Quick Iteration**: Make changes and see results immediately
- **Stream Background**: Preview on realistic game footage

### Configuration
- **Timezone Support**: Configurable timezone for game times
- **Refresh Intervals**: Adjustable polling rates
- **API Endpoints**: Easy to modify ESPN API integration
- **Storage Keys**: Configurable local storage

### Debugging
- **Console Logging**: Detailed logs for all API calls and state changes
- **Status Indicators**: Visual feedback in dashboard
- **Error Messages**: Clear error descriptions for troubleshooting
- **Version Detection**: Logs confirm when new code is loaded

## Future Enhancements

Potential features for future development:
- Player stats integration
- Multiple game support (show multiple games at once)
- Custom color themes
- Animation customization
- Playoff bracket integration
- Historical game lookup
- Mobile-responsive dashboard

