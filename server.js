// Simple static file server for NBA 2K Overlay

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// In-memory storage for selected game ID
let selectedGameId = null;

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

  // Parse URL
  let filePath = '.' + req.url;
  
  // Default routes
  if (filePath === './') {
    filePath = './overlay/dashboard/index.html';
  } else if (filePath === './dashboard' || filePath === './dashboard/') {
    filePath = './overlay/dashboard/index.html';
  } else if (filePath === './overlay/game-stats' || filePath === './overlay/game-stats/') {
    filePath = './overlay/game-stats/index.html';
  } else if (filePath === './design-test' || filePath === './design-test/') {
    filePath = './overlay/design-test/index.html';
  } else if (filePath === './overlay/design-test' || filePath === './overlay/design-test/') {
    filePath = './overlay/design-test/index.html';
  }

  // Get file extension
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  // Read and serve file
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - File Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + error.code);
      }
    } else {
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
  console.log('🎨 Design Tester: http://localhost:' + PORT + '/design-test');
  console.log('');
  console.log('Press Ctrl+C to stop the server');
});

