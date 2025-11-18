# 🏀 NBA 2K OBS Overlay

Live NBA game stats overlay for your NBA 2K streams. Shows real-time scores, quarters, and team info from actual NBA games while you play NBA 2K.

## ✨ Features

- **Live Game Stats**: Real-time scores, quarter/time, team logos
- **Control Dashboard**: Easy game selection interface
- **Auto-Updates**: Refreshes every 30 seconds
- **Clean Design**: Professional overlay with transparent background
- **OBS Ready**: Browser source compatible

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

- Select today's game from the dropdown
- Preview will show below
- Selection is saved automatically

### 3. Add Overlay to OBS

1. In OBS, add a **Browser Source**
2. Set URL to: `http://localhost:3000/overlay/game-stats`
3. Set Width: `600` Height: `300` (adjust as needed)
4. Check "Shutdown source when not visible" for better performance
5. Position overlay on your stream!

## 📁 Project Structure

```
overlay/
├── shared/
│   ├── config.js         # Configuration (ESPN API, refresh rates)
│   └── nbaApi.js         # ESPN API integration
├── dashboard/
│   ├── index.html        # Control panel UI
│   └── dashboard.js      # Game selection logic
└── game-stats/
    ├── index.html        # Overlay display
    ├── styles.css        # Overlay styling
    └── overlay.js        # Overlay logic

server.js                 # Local web server
package.json             # NPM configuration
```

## ⚙️ Configuration

Edit `overlay/shared/config.js` to customize:

- **Refresh Intervals**: How often overlay updates
- **Timezone**: Display timezone for game times
- **Storage Keys**: LocalStorage keys (if needed)

## 🎮 How It Works

1. **Dashboard** fetches today's NBA games from ESPN API
2. You select which game to display
3. Selection saved to **localStorage**
4. **Overlay** reads selection and displays live stats
5. Overlay auto-refreshes every 30 seconds

## 📡 Data Source

Uses ESPN's public NBA scoreboard API:
```
https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard
```

No API key needed! ✨

## 🔧 Troubleshooting

**Overlay not updating?**
- Make sure both dashboard and overlay use same localhost URL
- Check browser console for errors (F12)

**No games showing?**
- Check if there are NBA games today
- Try refreshing the dashboard

**Overlay shows "No game selected"?**
- Open dashboard and select a game from dropdown

## 💡 Tips

- Keep dashboard open during stream to monitor game status
- Overlay updates every 30 seconds (configurable)
- Works best with games that are live or scheduled for today
- Can display scheduled games (shows start time instead of score)

## 📝 License

MIT

---

**Made for Silent Basketball (HushSwish)** 🏀🤫

