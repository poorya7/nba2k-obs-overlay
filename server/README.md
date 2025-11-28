# NBA 2K Overlay Server

This folder contains all server-related files for the NBA 2K OBS Overlay system.

## Structure

```
server/
├── server.js                            # Main Node.js HTTP server
├── scripts/                             # Startup/shutdown scripts
│   ├── start-overlay-server.vbs         # Silent startup script (no console)
│   ├── stop-overlay-server.bat          # Stop server script
│   └── nba2k obs overlay server.lnk     # Desktop shortcut (optional)
└── README.md                            # This file
```

## Running the Server

### From Project Root
```bash
npm start
# or
node server/server.js
```

### Using the Silent Startup Script
Double-click `scripts/start-overlay-server.vbs` to run the server in the background without a console window.

### Stopping the Server
Run `scripts/stop-overlay-server.bat` to stop the server.

## What the Server Does

1. **Serves Static Files**: Delivers HTML, CSS, JS, images, and other assets for the overlay and dashboard
2. **Provides API Endpoints**:
   - `/api/selected-game` (GET/POST) - Game selection
   - `/api/quarter` (GET/POST) - Quarter tracking
   - `/api/simulation` (GET/POST) - Simulation mode for testing

3. **Default Routes**:
   - `http://localhost:3000/` → Dashboard
   - `http://localhost:3000/dashboard` → Dashboard
   - `http://localhost:3000/overlay/nba-live` → NBA Live Overlay (unified, for OBS)
   - `http://localhost:3000/overlay/title` → Title Overlay (channel branding)

## Configuration

- **Port**: 3000 (hardcoded in server.js)
- **MIME Types**: Defined in MIME_TYPES object for proper content delivery
- **In-memory Storage**: Game selection and simulation state stored while server runs

## Notes

- The server runs from the `server/` directory but serves files from the parent directory (project root)
- No external dependencies required - uses only Node.js built-in modules (http, fs, path)
- In-memory storage resets on server restart (game selection is not persistent)
- Designed for single-user localhost usage (not production-ready for public deployment)

