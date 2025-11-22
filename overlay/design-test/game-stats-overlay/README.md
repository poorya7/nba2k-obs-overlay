# Game Stats Overlay

Clean, modular overlay for displaying NBA game stats with ASMR-friendly Blue Neon theme.

## Structure

```
game-stats-overlay/
├── index.html          - Main overlay (with demo data)
├── test-states.html    - Interactive state transition tester
├── styles.css          - All visual styling (finalized design)
├── game-view.js        - View layer with state management
└── README.md           - This file
```

## Quick Start

**No server required!** Just open the HTML files directly in your browser.

**Option 1: View with demo data**
- Open `index.html` - Shows Lakers vs Warriors in Live state
- Test in console: `gameView.updateScore('home', 100, true)`

**Option 2: Test state transitions**
- Open `test-states.html` - Interactive state switcher
- Click buttons to switch between Pre-Game, Live, Halftime, Final
- See smooth transitions in action with video background

## Architecture

**Separation of Concerns:**
- `styles.css` - Pure presentation (no logic)
- `game-view.js` - Pure view updates (no data fetching)
- `index.html` - Minimal structure with data attributes

**SOLID Principles:**
- Single Responsibility: GameView only handles DOM updates
- Open/Closed: Easy to extend without modifying existing code
- Dependency Inversion: View doesn't depend on data source

## Game States

The overlay supports 4 different game states with smooth transitions:

1. **Pre-Game** - Countdown timer with team matchup preview
2. **Live** - Active gameplay (Q1, Q2, Q3, Q4, OT, 2OT...)
3. **Halftime** - Shows "Halftime" banner with current scores
4. **Final** - Shows "Final" banner with final scores

### State Transition Logic

**Smart Animations:** Only animates what changes
- Live ↔ Halftime/Final: Only bottom element fades (teams/scores stay visible)
- Live → Live (Q1→Q3): Full content fades (for score/quarter updates)
- Pre-Game ↔ anything: Full box fades (size changes)

## Usage

### State Management Methods

```javascript
// Transition to Pre-Game state
await gameView.transitionToState('pregame', {
    homeTeam: { abbr: 'LAL', logoUrl: 'https://...' },
    awayTeam: { abbr: 'GSW', logoUrl: 'https://...' },
    countdown: '02:15:34'
});

// Transition to Live state
await gameView.transitionToState('live', {
    home: { abbr: 'LAL', logoUrl: 'https://...', score: 67 },
    away: { abbr: 'GSW', logoUrl: 'https://...', score: 64 },
    quarter: 'Q3',
    time: '8:42'
});

// Transition to Halftime
await gameView.transitionToState('halftime', {
    home: { abbr: 'LAL', logoUrl: 'https://...', score: 54 },
    away: { abbr: 'GSW', logoUrl: 'https://...', score: 48 }
});

// Transition to Final
await gameView.transitionToState('final', {
    home: { abbr: 'LAL', logoUrl: 'https://...', score: 112 },
    away: { abbr: 'GSW', logoUrl: 'https://...', score: 108 }
});

// Get current state
const currentState = gameView.getCurrentState(); // 'pregame', 'live', 'halftime', 'final'
```

### Basic Update Methods

```javascript
// Update team info
gameView.updateTeam('home', 'LAL', 'https://a.espncdn.com/i/teamlogos/nba/500/lal.png');
gameView.updateTeam('away', 'BOS', 'https://a.espncdn.com/i/teamlogos/nba/500/bos.png');

// Update scores (with optional animation)
gameView.updateScore('home', 85, true);  // Animate score change
gameView.updateScore('away', 82, false); // No animation

// Update game status
gameView.updateGameStatus('Q4', '3:45');

// Update everything at once
gameView.updateAll({
    home: {
        abbr: 'LAL',
        logoUrl: 'https://a.espncdn.com/i/teamlogos/nba/500/lal.png',
        score: 85,
        animate: true
    },
    away: {
        abbr: 'BOS',
        logoUrl: 'https://a.espncdn.com/i/teamlogos/nba/500/bos.png',
        score: 82,
        animate: false
    },
    quarter: 'Q4',
    time: '3:45'
});

// Reset to default state
gameView.reset();
```

### Testing in Browser Console

Open `index.html` or `test-states.html` in a browser and try:

```javascript
// Test score animation
gameView.updateScore('home', 100, true);

// Test team switch
gameView.updateTeam('home', 'MIA', 'https://a.espncdn.com/i/teamlogos/nba/500/mia.png');

// Test state transition
await gameView.transitionToState('halftime', {
    home: { abbr: 'LAL', logoUrl: 'https://a.espncdn.com/i/teamlogos/nba/500/lal.png', score: 54 },
    away: { abbr: 'GSW', logoUrl: 'https://a.espncdn.com/i/teamlogos/nba/500/gsw.png', score: 48 }
});

// Check current state
console.log(gameView.getCurrentState());
```

## Next Steps

**State Management:** ✅ Complete!
- 4 game states (Pre-Game, Live, Halftime, Final)
- Smooth transitions with smart content-only animations
- Ready for real-time data integration

**When ready to add live data:**
1. Create a `GameDataService` class to fetch NBA API data
2. Create a `GameController` to connect service → view
3. Poll API and call `gameView.transitionToState()` when state changes
4. Keep `GameView` unchanged (loose coupling achieved!)

## Design Specs

- **Position:** 260px from bottom, 20px from left
- **Size:** 175px wide, auto height
- **Opacity:** 0.7
- **Theme:** Blue Neon with green quarter text

## Available Score Animations

When scores update (via `updateScore()` with `animate: true`), you can choose from:

1. **Slide** - Slot reel effect (old score slides up, new slides in from bottom) ✨ **Chosen default**
2. **Glow** - Subtle green glow with scale
3. **NBA Style** - Scale up with golden highlight
4. **Bounce** - Bounces up and down
5. **Flash** - Quick opacity flash
6. **Pop** - Pops in with elastic effect
7. **Shake** - Quick shake effect
8. **Highlight** - Background highlight fade

Set animation type via: `gameView.currentAnimation = 'slide'` (or 'glow', 'nba', etc.)

