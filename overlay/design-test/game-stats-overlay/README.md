# Game Stats Overlay

Clean, modular overlay for displaying NBA game stats with ASMR-friendly Blue Neon theme.

## Structure

```
game-stats-overlay/
├── index.html      - Main overlay (with demo data)
├── test.html       - Interactive test page with controls
├── styles.css      - All visual styling (finalized design)
├── game-view.js    - View layer with clean update methods
└── README.md       - This file
```

## Quick Start

**No server required!** Just open the HTML files directly in your browser.

**Option 1: View with demo data**
- Open `index.html` - Shows Lakers vs Warriors
- Test in console: `gameView.updateScore('home', 100, true)`

**Option 2: Animation testing**
- Open `test.html` - Test different score animations
- Click animation buttons to see effects in real-time
- Choose which animation style you like best

## Architecture

**Separation of Concerns:**
- `styles.css` - Pure presentation (no logic)
- `game-view.js` - Pure view updates (no data fetching)
- `index.html` - Minimal structure with data attributes

**SOLID Principles:**
- Single Responsibility: GameView only handles DOM updates
- Open/Closed: Easy to extend without modifying existing code
- Dependency Inversion: View doesn't depend on data source

## Usage

### Basic Methods

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

Open `index.html` in a browser and try:

```javascript
// Test score animation
gameView.updateScore('home', 100, true);

// Test team switch
gameView.updateTeam('home', 'MIA', 'https://a.espncdn.com/i/teamlogos/nba/500/mia.png');

// Test game status
gameView.updateGameStatus('OT', '2:30');
```

## Next Steps

When ready to add data fetching:
1. Create a `GameDataService` class to fetch NBA data
2. Create a `GameController` to connect service → view
3. Keep `GameView` unchanged (loose coupling achieved!)

## Design Specs

- **Position:** 260px from bottom, 20px from left
- **Size:** 175px wide, auto height
- **Opacity:** 0.7
- **Theme:** Blue Neon with green quarter text

## Available Score Animations

Test them all in `test.html`:

1. **Glow Pulse** - Subtle green glow with scale (default)
2. **NBA Style** - Scale up with golden highlight (like real NBA broadcasts)
3. **Bounce** - Bounces up and down
4. **Flash** - Quick opacity flash
5. **Pop** - Pops in with elastic effect
6. **Slide** - Slides in from left
7. **Shake** - Quick shake effect
8. **Highlight** - Background highlight fade
9. **None** - No animation

