# Windows Auto-Start Setup 🪟

This guide will set up the overlay server to start automatically when Windows boots, running silently in the background.

## 📋 Prerequisites

- Node.js must be installed and in your PATH
- Project files in a permanent location (not Desktop or Downloads)

## 🚀 Setup Steps

### Option 1: Add to Startup Folder (Recommended)

1. **Create a shortcut to the VBS script:**
   - Right-click `scripts/start-overlay-server.vbs`
   - Click "Create shortcut"

2. **Open Windows Startup folder:**
   - Press `Win + R` to open Run dialog
   - Type: `shell:startup`
   - Press Enter

3. **Move the shortcut:**
   - Drag the shortcut you created into the Startup folder
   - That's it! The server will now start automatically when you log in to Windows

### Option 2: Task Scheduler (Advanced)

If you want more control (like running as administrator or on a schedule):

1. Open Task Scheduler (search in Start menu)
2. Click "Create Basic Task"
3. Name: `NBA 2K Overlay Server`
4. Trigger: `When I log on`
5. Action: `Start a program`
6. Program: `wscript.exe`
7. Arguments: `"FULL_PATH_TO\scripts\start-overlay-server.vbs"`
   - Replace `FULL_PATH_TO` with your actual project path
8. Finish and test by right-clicking the task → "Run"

## 🛑 Stopping the Server

### Manual Stop:
- Double-click `scripts/stop-overlay-server.bat`
- This will kill all Node.js processes (be careful if you have other Node apps running!)

### Check if Running:
- Open Task Manager (Ctrl+Shift+Esc)
- Look for `node.exe` in the Processes tab
- Or open browser to `http://localhost:3000/dashboard` to test

## ✅ Verify It's Working

1. **Reboot your computer** (to test auto-start)
2. After login, wait 5-10 seconds
3. Open browser to `http://localhost:3000/dashboard`
4. If it loads, you're all set! 🎉

If not, check:
- Is Node.js installed? (Run `node --version` in Command Prompt)
- Is the VBS script shortcut in the Startup folder?
- Check Task Manager for `node.exe` process

## 🎮 Daily Usage

Once setup is complete:

1. **Start streaming**: Server is already running!
2. **Select game**: Open `http://localhost:3000/dashboard`
3. **Add to OBS**: Browser source → `http://localhost:3000/overlay/game-stats`
4. **Done!** No terminal windows, no manual starting!

## 🔧 Troubleshooting

**Server doesn't start:**
- Check if Node.js is in your PATH (run `node --version` in Command Prompt)
- Try running `scripts/start-overlay-server.vbs` manually (double-click it)
- Check Windows Event Viewer for errors

**Multiple Node processes:**
- Run `scripts/stop-overlay-server.bat` to clean up
- Only run one instance of the server

**Port 3000 already in use:**
- Another app is using port 3000
- Stop that app, or change the port in `server.js`

## 🗑️ Uninstall Auto-Start

1. Press `Win + R`
2. Type: `shell:startup`
3. Delete the VBS shortcut
4. Done!

---

**Questions?** Check the main README.md or project documentation.

