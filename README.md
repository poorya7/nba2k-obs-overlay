# 🏀 NBA 2K OBS Overlay

Live NBA game stats overlay for your NBA 2K streams. Shows real-time scores, quarters, and team info from actual NBA games while you play NBA 2K.

## ✨ Features

- **Clean ASMR Design**: Minimalist pill-style overlay with smooth animations
- **Fast Updates**: Game data refreshes every 3 seconds for responsive score changes
- **Smooth Animations**: Score slide animation (slot-machine effect), instant state changes
- **Live Game Stats**: Real-time scores, quarter/time, team logos, records
- **Smart Dashboard**: Easy game selection + simulation mode for testing
- **State Detection**: Pregame (with countdown), live, halftime, overtime, final
- **Simulation Mode**: Test overlay with fake data that cycles through all states
- **Modular Architecture**: Clean, maintainable code following SOLID/DRY principles
- **OBS Ready**: Browser source compatible, hides gracefully when no game selected
- **No Console Spam**: Clean production build with no debug logs
- **Auto-start Support**: Windows scripts for automatic server launch on boot

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
- **OR** enable "Simulation Mode" to test overlay with fake data
- Preview shows team info and scores
- Selection is saved automatically

### 3. Add Overlay to OBS

1. In OBS, add a **Browser Source**
2. Set URL to: `http://localhost:3000/overlay/game-stats`
3. Set Width: `1920` Height: `1080`
4. Check "Shutdown source when not visible" for better performance
5. Position and scale overlay as needed on your stream!

## 📁 Project Structure

```
nba2k-obs-overlay/
├── server/
│   ├── server.js                  # Node.js HTTP server + APIs
│   └── scripts/                   # Windows auto-start scripts
│
├── overlay/
│   ├── shared/                    # Shared utilities (single source of truth)
│   │   ├── config.js              # Configuration
│   │   └── nbaApi.js              # ESPN API client
│   │
│   ├── dashboard/                 # Control panel
│   │   ├── index.html             # Dashboard UI
│   │   └── dashboard.js           # Game selection + simulation
│   │
│   └── game-stats-overlay/        # Modular overlay system
│       ├── core/                  # Production overlay
│       │   ├── index.html         # Production overlay with API integration
│       │   ├── game-view.js       # GameView controller class
│       │   └── styles.css         # All overlay styling
│       │
│       └── tests/                 # Testing pages
│           ├── test-states.html   # Interactive state tester
│           ├── test-simulation.html # Full game simulation
│           └── index-full.html    # Full design preview
│
└── docs/                          # Complete documentation
    ├── FEATURES.md
    ├── ARCHITECTURE.md
    ├── API.md
    ├── DEVELOPMENT.md
    └── SETUP_AUTOSTART.md
```

## 🎨 Design

**Clean ASMR Pill Style**
- Minimalist horizontal pill design
- Smooth slot-machine score animations
- Instant state transitions (no unnecessary fading)
- Transparent background with subtle backdrop blur
- "Upcoming NBA" → "Live NBA" indicator
- Perfect for top-left/right corner placement

## ⚙️ Configuration

Edit `overlay/shared/config.js` to customize:

- **Refresh Intervals**: How often overlay updates (default: 3 seconds)
- **Timezone**: Display timezone for game times (default: Eastern)
- **ESPN API Endpoint**: Change data source if needed

## 🎮 How It Works

1. **Dashboard** fetches today's games + yesterday's live/recent games from ESPN API
2. You select which game to display **OR** enable simulation mode for testing
3. Selection saved to **server** (in-memory)
4. **Overlay** polls server every 3 seconds for selected game
5. Overlay fetches live game data from ESPN API
6. **Smart updates**: Only animates what changed
   - Score changes → Slide animation
   - State changes → Instant content swap
   - Time changes → Silent update
7. Pregame countdown updates every second
8. Graceful handling: overlay hides when no game selected

## 🧪 Simulation Mode

Perfect for testing without waiting for live games!

1. Open dashboard: `http://localhost:3000/dashboard`
2. Check "Enable Simulation Mode"
3. Click "Next State" to cycle through states
4. Overlay shows fake game with:
   - Automatic score changes every poll
   - Realistic team data (Lakers vs Warriors)
   - State progression (pregame → live → halftime → overtime → final)

## 📡 Data Source

Uses ESPN's public NBA scoreboard API:
```
https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard
```

No API key needed! ✨

**Rate Limiting**: 3-second polling = ~1,200 requests per 3-hour stream (well within limits)

## 🔧 Troubleshooting

**Overlay not updating?**
- Make sure server is running (`npm start`)
- Hard refresh overlay (Ctrl+Shift+R) or clear OBS browser cache
- Check browser console for errors (F12)

**No games showing?**
- Check if there are NBA games today (or yesterday if past midnight)
- Try simulation mode to verify overlay works
- Check console for ESPN API errors

**Overlay disappeared?**
- This is normal! It hides when no game selected
- Select a game in dashboard to make it reappear
- Or enable simulation mode for testing

**Time showing as "8.7" instead of "00:08"?**
- Fixed! All times now display as MM:SS format

**Overlay "blinking" or fading unnecessarily?**
- Fixed! Only score numbers animate (slide effect)
- State changes are instant (no fading)

**Games disappeared at midnight?**
- Fixed! Yesterday's live/recent games (< 2hrs) now stay visible

**Server not starting on Windows boot?**
- See `docs/SETUP_AUTOSTART.md` for auto-start setup
- Copy VBScript to Windows Startup folder

## 💡 Tips

- **Fast Response**: 3-second polling means scores update almost immediately
- **Simulation Mode**: Test all states and animations without waiting for live games
- **Test Pages**: Visit `test-states.html` for interactive testing
- **Clean Console**: No debug logs in production for professional setup
- **Midnight Support**: Games from yesterday stay visible if still live or finished < 2 hours ago
- **OBS Setup**: Set browser source to 1920x1080 for best quality, then scale in OBS
- **Countdown Timer**: Pregame countdown updates every second (not just every 3 seconds)
- **Smart Animations**: Only what changes is animated (no unnecessary blinking)

## 📚 Documentation

Complete documentation in `/docs`:
- **FEATURES.md** - Complete feature list
- **ARCHITECTURE.md** - System design and data flow
- **API.md** - Complete API reference
- **DEVELOPMENT.md** - Development guide and customization
- **SETUP_AUTOSTART.md** - Windows auto-start setup

## 🔄 Auto-Start on Windows

1. Copy `server/scripts/start-overlay-server.vbs` to Windows Startup folder
2. Server will launch silently on boot
3. No console window, runs in background
4. See `docs/SETUP_AUTOSTART.md` for detailed instructions

## 📝 License

MIT

---

**Made for Silent Basketball (HushSwish)** 🏀🤫
