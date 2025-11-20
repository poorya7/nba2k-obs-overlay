# 🏀 NBA 2K OBS Overlay

Live NBA game stats overlay for your NBA 2K streams. Shows real-time scores, quarters, and team info from actual NBA games while you play NBA 2K.

## ✨ Features

- **13 Different Styles**: Pill, horizontal, and vertical layouts with multiple color schemes
- **Live Game Stats**: Real-time scores, quarter/time, team logos, records
- **Smart Dashboard**: Easy game selection + style switcher
- **Auto-Updates**: Game data every 10 seconds, style changes within 2 seconds
- **State Detection**: Pregame, live, halftime, end of quarter, overtime, final
- **Midnight Support**: Games from yesterday stay visible if still live or recently finished
- **Modular Architecture**: Clean, maintainable code following SOLID/DRY principles
- **Clean Design**: Professional overlay with transparent/solid background options
- **OBS Ready**: Browser source compatible, hides gracefully on errors

## 🚀 Quick Start

### 1. Start the Server

```bash
npm start
```

Server will run at `http://localhost:3000`

### 2. Open Control Dashboard

Open in your browser:
```
http://localhost:3000/dashboard
```

- Select today's game from the dropdown (includes yesterday's live/recent games)
- Click "Next Style" to cycle through 13 different overlay designs
- Preview shows team info, scores, and current style
- Selections are saved automatically

### 3. Add Overlay to OBS

1. In OBS, add a **Browser Source**
2. Set URL to: `http://localhost:3000/overlay/game-stats`
3. Set Width: `1920` Height: `1080`
4. Check "Shutdown source when not visible" for better performance
5. Position and scale overlay as needed on your stream!

**Tip**: Use the style switcher in the dashboard to preview different designs live on your stream!

## 📁 Project Structure

```
overlay/
├── shared/
│   ├── config.js         # Configuration (ESPN API, refresh rates)
│   └── nbaApi.js         # ESPN API integration + smart fetching
├── dashboard/
│   ├── index.html        # Control panel UI
│   ├── dashboard.js      # Game selection + style switcher
│   └── styles.css        # Dashboard styling
├── design-test/
│   ├── designs.css       # All 13 overlay styles
│   └── preview.js        # Design preview logic
└── game-stats/
    ├── index.html        # Overlay display
    ├── styles.css        # Base overlay styling
    ├── pill-colors.css   # Pill color variations
    ├── layout-scaling.css# Horizontal/vertical scaling
    ├── overlay.js        # Main entry point
    ├── GameOverlay.js    # Main controller (modular)
    ├── StateRenderer.js  # HTML generation (3 layouts)
    └── StateTransitions.js # Animation logic

server.js                 # Local web server + APIs
package.json             # NPM configuration
```

## 🎨 Available Styles

**Pill Layouts (5 colors)**
- Green, Red, Blue, Purple, Gold
- Compact horizontal design
- Perfect for top-left/right corner
- 15% larger than original

**Horizontal Bars (4 styles)**
- Classic Green, Neon Cyan, Red, White
- Wide format for bottom/top of screen
- 20% larger for visibility

**Vertical Sidebars (4 styles)**
- Green, Purple, Blue, Gold
- Tall format for left/right side
- 20% larger for visibility

**Live Switching**: Use the dashboard button to cycle through all styles in real-time!

## ⚙️ Configuration

Edit `overlay/shared/config.js` to customize:

- **Refresh Intervals**: How often overlay updates
- **Timezone**: Display timezone for game times
- **ESPN API Endpoint**: Change data source if needed

## 🎮 How It Works

1. **Dashboard** fetches today's games + yesterday's live/recent games from ESPN API
2. You select which game to display and which style to use
3. Selections saved to **server** (in-memory)
4. **Overlay** reads selections and displays live stats with chosen style
5. Overlay auto-refreshes game data every 10 seconds, checks for style changes every 2 seconds
6. Smart state detection: pregame, live, halftime, end of quarter, overtime, final
7. Graceful handling: overlay hides when server is down or no game selected

## 📡 Data Source

Uses ESPN's public NBA scoreboard API:
```
https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard
```

No API key needed! ✨

## 🔧 Troubleshooting

**Overlay not updating?**
- Make sure server is running (`npm start`)
- Hard refresh overlay (Ctrl+Shift+R) or clear OBS browser cache
- Check browser console for errors (F12)

**No games showing?**
- Check if there are NBA games today (or yesterday if past midnight)
- Try clicking "Refresh Games" in dashboard
- Check console for ESPN API errors

**Overlay disappeared?**
- This is normal! It hides when server is down or no game selected
- Select a game in dashboard to make it reappear

**Style changes not working?**
- Hard refresh overlay page (Ctrl+Shift+R)
- In OBS: Right-click browser source → Refresh
- Check console logs for "🎨 Style changed to"

**"End of Quarter" showing as scheduled?**
- Fixed! Now properly detects STATUS_END_PERIOD as live

**Games disappeared at midnight?**
- Fixed! Yesterday's live/recent games (< 2hrs) now stay visible

## 💡 Tips

- **Style Switcher**: Click "Next Style" in dashboard to cycle through all 13 designs live on stream
- **Midnight Support**: Games from yesterday stay visible if still live or finished < 2 hours ago
- **Fast Updates**: Game data refreshes every 10 seconds, style changes apply within 2 seconds
- **OBS Setup**: Set browser source to 1920x1080 for best quality, then scale in OBS
- **Error Handling**: Overlay automatically hides if server is down or no game selected
- **Design Tester**: Visit `http://localhost:3000/design-test` to preview all styles with real data

## 📝 License

MIT

---

**Made for Silent Basketball (HushSwish)** 🏀🤫

