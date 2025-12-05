# YouTube Live Chat Reader - Browser Extension

Browser extension that reads YouTube live chat messages from the DOM for the NBA 2K OBS Overlay.

## Setup

1. **Load the extension in Firefox:**
   - Open Firefox and go to `about:debugging`
   - Click "This Firefox" in the left sidebar
   - Click "Load Temporary Add-on..."
   - Select the `manifest.json` file from the `overlay/chat-overlay/browser-extension/` folder

   **Or for Chrome/Edge:**
   - Open Chrome/Edge and go to `chrome://extensions/` (or `edge://extensions/`)
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `overlay/chat-overlay/browser-extension/` folder

2. **Open a YouTube live stream:**
   - Navigate to your YouTube live stream
   - The extension will automatically detect and start reading chat

3. **Check console:**
   - Open DevTools (F12)
   - Go to Console tab
   - You should see: "🎬 YouTube Live Chat Reader loaded"
   - When chat messages appear, they'll be logged to console

## Current Status

✅ **Reading chat from DOM** - Extension scans YouTube page for chat messages

⏳ **TODO:**
- Send messages to local server
- Handle different message types (text, super chat, memberships)
- Better error handling for YouTube DOM changes
- Filtering/processing options

## Files

- `manifest.json` - Extension configuration
- `content-script.js` - Main script that reads chat from DOM
- `README.md` - This file

## Notes

- YouTube's DOM structure can change, so selectors may need updates
- Extension only works when YouTube live stream page is open
- Chat is often in an iframe, which may have CORS restrictions

