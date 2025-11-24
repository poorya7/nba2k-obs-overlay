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
├── mvp-view.js          # MvpView class
├── styles.css           # MVP styles (lines 459+)
└── index.html           # MVP HTML structure
```

## Usage

### Initialization

```javascript
// Initialize MvpView (typically done at app startup)
const mvpView = new MvpView();
```

### Show MVP Section

```javascript
// Show with player data
mvpView.show({
    name: 'LeBron James',
    photoUrl: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/1966.png',
    pts: 34,
    reb: 8,
    ast: 7
});
```

**What happens**:
1. Player data is updated immediately
2. Box expands (500ms)
3. Delay (300ms)
4. Content fades in + slides from left 15px (300ms)

**Total duration**: ~1100ms

### Hide MVP Section

```javascript
mvpView.hide();
```

**What happens**:
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

### `MvpView` Class

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
    MVP_SECTION_HEIGHT: 174,       // Total content height
    MVP_SECTION_PADDING_TOP: 12,   // Top padding when visible
    MVP_SECTION_MARGIN_TOP: 5      // Top margin when visible
};
```

## Integration Example

### Basic Integration

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
```

## Testing

**Test File**: `overlay/game-stats-overlay/tests/test-mvp-view.html`

Open in a browser to see:
- Toggle button to show/hide MVP
- Sample player data (LeBron James)
- Info panel with usage examples

## When to Show MVP

Based on the design requirements:

✅ **Show during**:
- Timeouts
- Halftime
- End of quarters
- End of game

❌ **Do NOT show during**:
- Live play
- Active game situations

**Recommended display duration**: 6 seconds

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

