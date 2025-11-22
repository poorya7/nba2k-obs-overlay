// Simple static file server for NBA 2K Overlay

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// In-memory storage for selected game ID and style
let selectedGameId = null;
let selectedStyle = 'pill-green'; // default style

// Simulation mode for testing
let simulationEnabled = false;
let simulationState = 'pregame'; // pregame, live, halftime, overtime, final

// MIME types for different file extensions
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  console.log(`📡 ${req.method} ${req.url}`);

  // API endpoints for game selection
  if (req.url === '/api/selected-game' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ gameId: selectedGameId }));
    return;
  }

  if (req.url === '/api/selected-game' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        selectedGameId = data.gameId;
        console.log('✅ Game selected:', selectedGameId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // API endpoints for style selection
  if (req.url === '/api/selected-style' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ style: selectedStyle }));
    return;
  }

  if (req.url === '/api/selected-style' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        selectedStyle = data.style;
        console.log('🎨 Style changed:', selectedStyle);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // API endpoints for simulation mode
  if (req.url === '/api/simulation' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      enabled: simulationEnabled,
      state: simulationState
    }));
    return;
  }

  if (req.url === '/api/simulation' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (data.enabled !== undefined) {
          simulationEnabled = data.enabled;
        }
        if (data.state !== undefined) {
          simulationState = data.state;
        }
        console.log('🎮 Simulation:', simulationEnabled ? 'ON' : 'OFF', '| State:', simulationState);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // Parse URL (server runs from project root)
  let filePath = '.' + req.url;
  
  // Default routes
  if (filePath === './') {
    filePath = './overlay/dashboard/index.html';
  } else if (filePath === './dashboard' || filePath === './dashboard/') {
    filePath = './overlay/dashboard/index.html';
  } else if (filePath === './overlay/game-stats' || filePath === './overlay/game-stats/') {
    filePath = './overlay/game-stats-overlay/core/index.html';
  } else if (filePath === './design-test' || filePath === './design-test/') {
    filePath = './overlay/design-test/index.html';
  } else if (filePath === './overlay/design-test' || filePath === './overlay/design-test/') {
    filePath = './overlay/design-test/index.html';
  } else if (filePath === './variations' || filePath === './variations/') {
    filePath = './overlay/design-test/variations.html';
  }

  // Get file extension
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  // Debug: Log the resolved file path
  console.log('   → Serving:', filePath);

  // Read and serve file
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        console.log('   ❌ File not found:', path.resolve(filePath));
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - File Not Found</h1>', 'utf-8');
      } else {
        console.log('   ❌ Error:', error);
        res.writeHead(500);
        res.end('Server Error: ' + error.code);
      }
    } else {
      console.log('   ✅ Served successfully');
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log('🚀 NBA 2K Overlay Server running!');
  console.log('');
  console.log('📺 Control Dashboard: http://localhost:' + PORT + '/dashboard');
  console.log('🏀 Game Overlay (OBS): http://localhost:' + PORT + '/overlay/game-stats');
  console.log('   (Full path: /overlay/game-stats-overlay/core/index.html)');
  console.log('🎨 Design Tester: http://localhost:' + PORT + '/design-test');
  console.log('');
  console.log('Press Ctrl+C to stop the server');
});


