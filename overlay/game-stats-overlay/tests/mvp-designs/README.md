# MVP Player Overlay - Integrated Design Exploration

## 📍 Current Status: Integrated Design Phase

We're designing an MVP player overlay **integrated inside the game stats box**. This will slide in during appropriate moments (timeouts, halftime, end of quarters) and stay visible for ~6 seconds before sliding out.

## 🎨 Integrated Design Options

All designs are integrated directly inside the main game stats box, maintaining visual consistency with the blue theme and opacity.

### Available Options:

1. **option-4-inside-blue.html** - Original reference (horizontal, bottom position)
2. **option-4a-top-horizontal.html** - MVP at top with horizontal layout, divider below
3. **option-4b-bottom-vertical.html** - MVP at bottom with vertical card style, centered
4. **option-4c-middle-compact.html** - MVP between teams and status, compact with badge
5. **option-4d-stats-focused.html** - Large emphasized stats numbers in columns
6. **option-4e-badge-style.html** - Contained design with golden MVP badge and background
7. **option-4f-minimal.html** - Clean minimal style, no borders or dividers
8. **option-4g-side-by-side.html** - Side-by-side layout with stat boxes grid
9. **option-4h-trophy.html** - Trophy icon with golden gradient theme

## 🎯 Key Design Features

All designs include:
1. **Player Photo**: Circular headshot (28-40px)
2. **MVP Indicator**: Star, badge, trophy, or label clearly showing "MVP"
3. **Player Name**: Clear identification
4. **Key Stats**: Points, Rebounds, Assists (PTS, REB, AST)
5. **Consistent Theme**: Matching blue color scheme with the game stats box
6. **Compact Size**: Fits inside the existing overlay without overwhelming

## 📊 Data Source

**API**: BallDontLie API (free)
- Endpoint: `https://api.balldontlie.io/v1/stats`
- Updates: Every ~5 minutes
- Data: Player stats including points, rebounds, assists

**MVP Determination**: Highest points scorer in the game

## 🎬 Animation Behavior

- **Trigger**: Manual or automatic at appropriate game moments
  - Timeouts
  - Halftime
  - End of quarters
  - End of game
  - **NOT during live play**
  
- **Duration**: Show for ~6 seconds then slide out
- **Animation**: Slide/fade in, then slide/fade out

## 🔧 Implementation Plan (Next Steps)

### 1. User Selects Design ✅ (In Progress)
- Review all 9 integrated options
- Pick favorite layout and visual style

### 2. Create Production Component
Based on selected design:
- Integrate into `overlay/game-stats-overlay/core/game-view.js`
- Add MVP HTML structure to `index.html`
- Add slide in/out animations to `styles.css`
- Create `showMVP()` and `hideMVP()` methods

### 3. Integrate BallDontLie API
- Add to `overlay/shared/nbaApi.js` or create `mvpApi.js`
- Fetch player stats for current game
- Parse and determine MVP (highest scorer)
- Get player headshot URL

### 4. Server API Endpoint
- Add `/api/mvp` endpoint to `server/server.js`
- Store MVP trigger state
- Dashboard button to trigger MVP display

### 5. Dashboard Controls
Add to `overlay/dashboard/index.html`:
- "Show MVP" button
- Auto-trigger toggle (enable/disable automatic display)
- Frequency setting (how often to show during game)

### 6. Overlay Logic
Update `overlay/game-stats-overlay/core/index.html`:
- Poll `/api/mvp` endpoint
- When triggered, fetch player data
- Animate MVP in
- After 6 seconds, animate out
- Reset trigger state

## 🎨 How to View Designs

1. Start server: `npm start`
2. Navigate to: `http://localhost:3000/overlay/game-stats-overlay/tests/mvp-designs/option-4X.html`
3. Each page shows:
   - Main game stats box with integrated MVP section
   - Video background and branding
   - Live game state context

## 💡 Design Variations Summary

### Position Variations
- **Top**: option-4a (above teams)
- **Middle**: option-4c (between teams and status)
- **Bottom**: option-4, option-4b, option-4d, option-4e, option-4f, option-4g, option-4h

### Layout Variations
- **Horizontal**: option-4, option-4a, option-4f
- **Vertical**: option-4b (centered card)
- **Compact**: option-4c (with badge)
- **Grid**: option-4g (side-by-side with stat boxes)

### Visual Style Variations
- **Stats Focused**: option-4d (large numbers in columns)
- **Badge Style**: option-4e (contained with golden badge)
- **Minimal**: option-4f (clean, no borders)
- **Trophy**: option-4h (trophy icon with golden theme)

## 🚀 Recommended Next Session

1. **Review all 9 designs** and pick 1-2 favorites
2. **Discuss final choice**: Position, layout, and visual style preferences
3. **Discuss auto-trigger logic**: When exactly should MVP show?
4. **Start implementation** with selected design
5. **Test with real API data** from BallDontLie

## 📝 Technical Specs

**MVP Display Data:**
```javascript
{
  playerName: "LeBron James",
  playerPhoto: "https://...",
  points: 34,
  rebounds: 8,
  assists: 7,
  teamAbbr: "LAL"
}
```

**Animation Timing:**
- Slide in: 0.5s ease-out
- Display duration: 6s
- Slide out: 0.5s ease-in
- Total: ~7s

**Colors (matching game stats):**
- Background: `rgba(10, 20, 40, 0.85)`
- Border: `rgba(59, 130, 246, 0.4)`
- Text: `#bfdbfe` (primary), `#93c5fd` (secondary)
- Accent: `#60a5fa`
- MVP Gold: `#fbbf24`
- Opacity: `0.7`

---

## 🏗️ Production Implementation

### Refactored Architecture (SOLID/DRY)

The finalized MVP design has been refactored into a production-ready module:

**Location**: `overlay/game-stats-overlay/core/`

**Files**:
- `mvp-view.js` - MvpView class (view controller)
- `styles.css` - MVP section styles (lines 459+)
- `index.html` - MVP HTML structure

**Class**: `MvpView`
- **Single Responsibility**: Manages MVP section view only
- **Separation of Concerns**: Content, styles, and animations are decoupled
- **Loose Coupling**: No dependencies on game logic or data fetching

**API**:
```javascript
const mvpView = new MvpView();

// Show with player data
mvpView.show({
    name: 'LeBron James',
    photoUrl: 'https://...',
    pts: 34,
    reb: 8,
    ast: 7
});

// Hide
mvpView.hide();

// Update without animation
mvpView.updatePlayer(playerData);

// Check visibility
mvpView.getVisibility(); // returns boolean
```

**Animation Timings** (preserved from design phase):
```javascript
const MVP_ANIMATION_TIMING = {
    BOX_EXPAND_DURATION: 500,      // Box expansion
    CONTENT_DELAY: 300,            // Delay before content appears
    CONTENT_FADE_IN_DURATION: 300, // Content fade + slide
    SLIDE_AMOUNT_PX: 15,           // Horizontal slide distance
    CONTENT_FADE_OUT_DURATION: 350,// Content fade out
    BOX_SHRINK_DELAY: 300,         // Delay before box shrinks
    BOX_SHRINK_DURATION: 500       // Box shrink
};
```

**Animation Sequence**:
- **Opening**: Box expands (500ms) → delay (300ms) → content fades in + slides from left (300ms)
- **Closing**: Content fades out (350ms) → delay (300ms) → box shrinks (500ms) → position resets

**Test File**: `overlay/game-stats-overlay/tests/test-mvp-view.html`

---

**Last Updated**: 2025-11-24
**Status**: Production-ready, refactored to SOLID/DRY principles
