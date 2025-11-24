# MVP View - Integration Guide

## Overview

The `MvpView` class manages the MVP (Most Valuable Player) section of the game stats overlay. It handles all animations, DOM updates, and visual transitions while maintaining strict separation of concerns.

## Architecture

### Design Principles

✅ **Single Responsibility**: MvpView only handles MVP section view updates
✅ **Separation of Concerns**: Content, styles, and animations are decoupled
✅ **DRY**: No repeated code, all constants centralized
✅ **Loose Coupling**: No dependencies on game logic or data fetching
✅ **SOLID**: Follows all SOLID principles

### File Structure

```
overlay/game-stats-overlay/core/
├── mvp-view.js          # MvpView class (view layer)
├── mvp-controller.js    # MvpController class (automatic display logic)
├── mvp-integration.js   # MVP data fetching & caching
├── styles.css           # MVP styles (lines 459+)
└── index.html           # MVP HTML structure + integration
```

## Usage

### Automatic Mode (Recommended)

The MVP section automatically displays during game breaks with realistic NBA broadcast timing:

```javascript
// Initialize MVP system (done at app startup)
const mvpView = new MvpView();
const mvpController = new MvpController(mvpView);

// Notify controller when game state changes
mvpController.onGameStateChange('halftime', mvpPlayerData);
```

**Automatic Display Timing:**
- **Halftime**: Shows 10s after halftime starts, displays for 15s, repeats every 2 minutes (max 3 times)
- **End of Game (Final)**: Shows 5s after game ends, displays for 15s, repeats every 2 minutes (max 3 times)
- **Timeouts**: Shows 20s into timeout, displays for 15s (if timeout state available)
- **End of Quarters**: Shows 3s after quarter ends, displays for 15s
- **Live Play**: Automatically hides if visible

This matches real NBA broadcast behavior!

### Manual Mode

For manual control (testing, special cases):

```javascript
// Initialize MvpView only
const mvpView = new MvpView();

// Show with player data
mvpView.show({
    name: 'LeBron James',
    photoUrl: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/1966.png',
    pts: 34,
    reb: 8,
    ast: 7,
    teamLogo: 'https://a.espncdn.com/i/teamlogos/nba/500/lal.png'
});

// Hide
mvpView.hide();
```

**Show Animation**:
1. Player data is updated immediately
2. Box expands (500ms)
3. Delay (300ms)
4. Content fades in + slides from left 15px (300ms)

**Total duration**: ~1100ms

**Hide Animation**:
1. Content fades out (350ms) - no horizontal movement
2. Delay (300ms)
3. Box shrinks (500ms)
4. Position resets for next show

**Total duration**: ~1150ms

### Update Player Data

```javascript
// Update without triggering animation
mvpView.updatePlayer({
    name: 'Stephen Curry',
    photoUrl: 'https://...',
    pts: 28,
    reb: 5,
    ast: 11
});
```

Use this when MVP section is already visible and you want to update the player info.

### Check Visibility

```javascript
if (mvpView.getVisibility()) {
    console.log('MVP section is visible');
}
```

## API Reference

### `MVPIntegration` Module

Handles MVP data fetching and caching. Available as `window.MVPIntegration`.

#### Methods

##### `notifyMVPStateChange(mvpController, mvpView, stateName, gameId)`
Fetches MVP data and notifies the controller of state change.

**Parameters**:
- `mvpController` (MvpController): MVP controller instance
- `mvpView` (MvpView): MVP view instance
- `stateName` (string): Game state ('live', 'halftime', 'final', etc.)
- `gameId` (string): ESPN game ID

**Returns**: `Promise<void>`

##### `getMvpPlayerData(gameId)`
Fetches and caches MVP player data from ESPN boxscore API.

**Parameters**:
- `gameId` (string): ESPN game ID

**Returns**: `Promise<Object | null>` - MVP player data with caching

##### `clearMVPCache()`
Clears cached MVP data (called when game changes).

**Returns**: `void`

---

### `MvpController` Class (Recommended)

#### Constructor
```javascript
new MvpController(mvpView)
```
Initializes the MVP controller with automatic display logic.

**Parameters**:
- `mvpView` (MvpView): Instance of MvpView

#### Methods

##### `onGameStateChange(newState, mvpPlayerData)`
Call when game state changes to trigger automatic MVP display.

**Parameters**:
- `newState` (string): 'pregame', 'live', 'halftime', 'final', 'overtime'
- `mvpPlayerData` (Object): Player data (name, photoUrl, pts, reb, ast)

**Returns**: `void`

**Behavior**:
- **halftime**: Shows MVP after 25s, repeats up to 3 times
- **final**: Shows MVP after 5s
- **live/pregame**: Hides MVP if visible

##### `manualShow(mvpPlayerData)`
Manually trigger MVP display (bypasses automatic timing).

**Parameters**: Same as show()

**Returns**: `void`

##### `manualHide()`
Manually hide MVP and clear all timers.

**Returns**: `void`

##### `getCurrentState()`
Get current game state.

**Returns**: `string` - Current state

---

### `MvpView` Class (Low-Level)

#### Constructor
```javascript
new MvpView()
```
Initializes the MVP view controller and caches DOM elements.

#### Methods

##### `show(playerData)`
Shows the MVP section with animation.

**Parameters**:
- `playerData` (Object):
  - `name` (string): Player name
  - `photoUrl` (string): Player photo URL
  - `pts` (number): Points
  - `reb` (number): Rebounds
  - `ast` (number): Assists
  - `teamLogo` (string): Team logo URL

**Returns**: `void`

##### `hide()`
Hides the MVP section with animation.

**Returns**: `void`

##### `updatePlayer(playerData)`
Updates player data without animation.

**Parameters**: Same as `show()`

**Returns**: `void`

##### `getVisibility()`
Returns current visibility state.

**Returns**: `boolean` - `true` if visible, `false` if hidden

## Animation Timing

All timing values are preserved from the original design phase and should **not be changed** without extensive testing.

```javascript
const MVP_ANIMATION_TIMING = {
    // Opening sequence
    BOX_EXPAND_DURATION: 500,      // Box expansion duration
    CONTENT_DELAY: 300,            // Delay before content appears
    CONTENT_FADE_IN_DURATION: 300, // Content fade + slide duration
    SLIDE_AMOUNT_PX: 15,           // Horizontal slide distance
    
    // Closing sequence
    CONTENT_FADE_OUT_DURATION: 350,// Content fade out duration
    BOX_SHRINK_DELAY: 300,         // Delay before box shrinks
    BOX_SHRINK_DURATION: 500,      // Box shrink duration
    
    // Layout constants
    MVP_SECTION_HEIGHT: 185,       // Total content height (increased for team logo)
    MVP_SECTION_PADDING_TOP: 12,   // Top padding when visible
    MVP_SECTION_MARGIN_TOP: 5      // Top margin when visible
};
```

## Display Timing

**MVP Display Duration**: 15 seconds (matches real NBA broadcasts)

**Automatic Display Delays** (`mvp-controller.js`):
```javascript
const MVP_DISPLAY_TIMING = {
    DISPLAY_DURATION: 15000,       // MVP stays visible for 15 seconds
    
    DELAY_BEFORE_SHOW: {
        TIMEOUT: 20000,            // Show 20s into timeout
        HALFTIME: 10000,           // Show 10s into halftime
        END_QUARTER: 3000,         // Show 3s after quarter ends
        END_GAME: 5000             // Show 5s after game ends
    },
    
    // Halftime & Final repeat logic
    HALFTIME_REPEAT_INTERVAL: 120000,  // Show again every 2 minutes
    HALFTIME_MAX_SHOWS: 3,              // Max 3 times during halftime
    FINAL_REPEAT_INTERVAL: 120000,     // Show again every 2 minutes
    FINAL_MAX_SHOWS: 3                  // Max 3 times during final
};
```

**Why delays?**  
Real NBA broadcasts don't show stats immediately when breaks start. They wait 10-20 seconds to show replays first, then display player stats. This creates a more natural, broadcast-quality feel.

## Integration Example

### Automatic Integration (Recommended)

```javascript
// Initialize MVP system
const mvpView = new MvpView();
const mvpController = new MvpController(mvpView);

// When game state changes (from your game update logic)
function onGameDataUpdate(gameData) {
    const gameState = determineGameState(gameData); // 'live', 'halftime', 'final'
    const mvpPlayer = getLeadingScorer(gameData);   // Get MVP player data
    
    // Automatically handles timing and display
    mvpController.onGameStateChange(gameState, mvpPlayer);
}
```

### Basic Integration (Manual)

```javascript
// Initialize view
const mvpView = new MvpView();

// Show MVP during timeout
function onTimeout() {
    const leadingScorer = getLeadingScorer(); // Your logic
    mvpView.show({
        name: leadingScorer.name,
        photoUrl: leadingScorer.photoUrl,
        pts: leadingScorer.points,
        reb: leadingScorer.rebounds,
        ast: leadingScorer.assists
    });
    
    // Auto-hide after 6 seconds
    setTimeout(() => {
        mvpView.hide();
    }, 6000);
}
```

### With Game State Management

```javascript
class GameController {
    constructor() {
        this.gameView = new GameView();
        this.mvpView = new MvpView();
        this.currentState = null;
    }
    
    handleTimeout() {
        // Game state change
        this.currentState = 'timeout';
        
        // Show MVP
        this.showCurrentMVP();
    }
    
    handleLivePlay() {
        // Game state change
        this.currentState = 'live';
        
        // Hide MVP if visible
        if (this.mvpView.getVisibility()) {
            this.mvpView.hide();
        }
    }
    
    showCurrentMVP() {
        // Fetch or calculate MVP player
        fetchMVPPlayer().then(player => {
            this.mvpView.show(player);
            
            // Auto-hide after display duration
            setTimeout(() => {
                if (this.currentState === 'timeout') {
                    this.mvpView.hide();
                }
            }, 6000);
        });
    }
}
```

## Styling

All MVP styles are in `styles.css` starting at line 459. The styles follow the same blue neon theme as the game stats box.

**CSS Variables** (if needed for customization):
```css
.mvp-content .player-pic {
    width: 86px;    /* Player photo size */
    height: 86px;
}

.mvp-label {
    font-size: 10px;    /* MVP label size */
    color: #fbbf24;     /* Gold color */
}

.mvp-content .player-name {
    font-size: 11.5px;  /* Player name size */
}

.mvp-content .stat-value {
    font-size: 15px;    /* Stat numbers size */
}

.mvp-team-logo {
    width: 24px;        /* Team logo size */
    height: 24px;
    margin-right: 4px;
}
```

**Dynamic Font Sizing**:
The MVP view automatically adjusts player name font size based on length to prevent clipping:
- Names > 18 chars: 9.5px
- Names > 15 chars: 10.5px
- Default: 11.5px

## Testing

**Test File**: `overlay/game-stats-overlay/tests/test-mvp-view.html`

Open in a browser to see:
- Toggle button to show/hide MVP
- Sample player data (LeBron James)
- Info panel with usage examples

## When to Show MVP

Based on real NBA broadcast behavior:

✅ **Automatically shows during**:
- **Halftime**: After 10s, displays for 15s, repeats every 2 minutes (max 3 times total)
- **End of Game (Final)**: After 5s, displays for 15s, repeats every 2 minutes (max 3 times total)
- **Timeouts**: After 20s, displays for 15s (if timeout state is available from API)
- **End of Quarters**: After 3s, displays for 15s (if quarter transition is detected)

❌ **Automatically hides during**:
- Live play
- Pregame
- Any active game situations

**Display duration**: 15 seconds (matches real NBA broadcast timing)

**MVP Determination**: The MVP is determined as the player with the highest combined PTS + REB + AST, fetched from ESPN's boxscore API.

## Performance Considerations

- DOM elements are cached on initialization for fast access
- Animations use CSS transitions (GPU accelerated)
- No layout thrashing - all style changes are batched
- Minimal JavaScript execution during animations

## Error Handling

The class includes basic error handling:
- Checks if DOM elements exist before operations
- Logs errors to console if elements not found
- Gracefully handles missing player data

```javascript
// Safe usage - won't crash if elements missing
mvpView.show(playerData); // Will log error and return early
```

## Future Enhancements

Potential additions (not implemented):
- Multiple animation profiles (fast/slow)
- Custom easing functions
- Different slide directions
- Callbacks on animation complete
- Queue management for rapid show/hide calls

---

**Version**: 1.0.0  
**Last Updated**: 2025-11-24  
**Author**: NBA 2K OBS Overlay Team

