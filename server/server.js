// Simple static file server for NBA 2K Overlay

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// ==================== STATE MANAGEMENT ====================

class StateStore {
  constructor() {
    this.selectedGameId = null;
    this.selectedStyle = 'pill-green';
    this.simulation = {
      enabled: false,
      state: 'pregame',
      showMVP: false
    };
    this.quarter = {
      current: null,        // 'Q1', 'Q2', 'Q3', 'Q4', or null
      startTime: null       // timestamp when quarter started
    };
  }

  // Game selection
  getGameId() { return this.selectedGameId; }
  setGameId(id) { this.selectedGameId = id; }

  // Style selection
  getStyle() { return this.selectedStyle; }
  setStyle(style) { this.selectedStyle = style; }

  // Simulation
  getSimulation() { return { ...this.simulation }; }
  setSimulation(updates) {
    if (updates.enabled !== undefined) this.simulation.enabled = updates.enabled;
    if (updates.state !== undefined) this.simulation.state = updates.state;
    if (updates.showMVP !== undefined) this.simulation.showMVP = updates.showMVP;
  }

  // Quarter tracking
  getQuarter() { return { ...this.quarter }; }
  setQuarter(quarter) {
    this.quarter.current = quarter;
    this.quarter.startTime = quarter ? Date.now() : null;
  }
  clearQuarter() {
    this.quarter.current = null;
    this.quarter.startTime = null;
  }
}

const state = new StateStore();

// ==================== UTILITIES ====================

/**
 * Parse JSON body from request
 * @param {http.IncomingMessage} req 
 * @returns {Promise<Object>}
 */
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Send JSON response
 * @param {http.ServerResponse} res 
 * @param {number} statusCode 
 * @param {Object} data 
 */
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// ==================== API ROUTE HANDLERS ====================

// GET /api/selected-game
function handleGetSelectedGame(req, res) {
  sendJson(res, 200, { gameId: state.getGameId() });
}

// POST /api/selected-game
async function handlePostSelectedGame(req, res) {
  try {
    const data = await parseJsonBody(req);
    state.setGameId(data.gameId);
    console.log('✅ Game selected:', data.gameId);
    sendJson(res, 200, { success: true });
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

// GET /api/selected-style
function handleGetSelectedStyle(req, res) {
  sendJson(res, 200, { style: state.getStyle() });
}

// POST /api/selected-style
async function handlePostSelectedStyle(req, res) {
  try {
    const data = await parseJsonBody(req);
    state.setStyle(data.style);
    console.log('🎨 Style changed:', data.style);
    sendJson(res, 200, { success: true });
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

// GET /api/simulation
function handleGetSimulation(req, res) {
  sendJson(res, 200, state.getSimulation());
}

// POST /api/simulation
async function handlePostSimulation(req, res) {
  try {
    const data = await parseJsonBody(req);
    state.setSimulation(data);
    const sim = state.getSimulation();
    console.log('🎮 Simulation:', sim.enabled ? 'ON' : 'OFF', '| State:', sim.state);
    sendJson(res, 200, { success: true });
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

// GET /api/quarter
function handleGetQuarter(req, res) {
  sendJson(res, 200, state.getQuarter());
}

// POST /api/quarter
async function handlePostQuarter(req, res) {
  try {
    const data = await parseJsonBody(req);
    
    if (data.quarter === null || data.quarter === '') {
      // Clear quarter (game done)
      state.clearQuarter();
      console.log('🏁 Quarter cleared');
    } else {
      // Start new quarter
      state.setQuarter(data.quarter);
      console.log('🏀 Quarter started:', data.quarter);
    }
    
    sendJson(res, 200, { success: true, quarter: state.getQuarter() });
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

// ==================== STATIC FILE SERVING ====================

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

// ==================== ROUTING ====================

const API_ROUTES = {
  'GET /api/selected-game': handleGetSelectedGame,
  'POST /api/selected-game': handlePostSelectedGame,
  'GET /api/selected-style': handleGetSelectedStyle,
  'POST /api/selected-style': handlePostSelectedStyle,
  'GET /api/simulation': handleGetSimulation,
  'POST /api/simulation': handlePostSimulation,
  'GET /api/quarter': handleGetQuarter,
  'POST /api/quarter': handlePostQuarter
};

/**
 * Route API request to handler
 * @param {http.IncomingMessage} req 
 * @param {http.ServerResponse} res 
 * @returns {boolean} True if route was handled
 */
async function routeApiRequest(req, res) {
  const routeKey = `${req.method} ${req.url}`;
  const handler = API_ROUTES[routeKey];
  
  if (handler) {
    await handler(req, res);
    return true;
  }
  
  return false;
}

// ==================== HTTP SERVER ====================

const server = http.createServer(async (req, res) => {
  console.log(`📡 ${req.method} ${req.url}`);

  // Try API routes first
  if (await routeApiRequest(req, res)) {
    return;
  }

  // Parse URL (server runs from project root)
  let filePath = '.' + req.url;
  
  // Default routes
  if (filePath === './') {
    filePath = './overlay/_dashboard/index.html';
  } else if (filePath === './dashboard' || filePath === './dashboard/') {
    filePath = './overlay/_dashboard/index.html';
  } else if (filePath === './overlay/game-stats' || filePath === './overlay/game-stats/') {
    filePath = './overlay/game-stats-overlay/core/index.html';
  } else if (filePath === './overlay/other-games' || filePath === './overlay/other-games/') {
    filePath = './overlay/other-games-overlay/index.html';
  } else if (filePath === './overlay/title' || filePath === './overlay/title/') {
    filePath = './overlay/title-overlay/index.html';
  } else if (filePath === './test' || filePath === './test/') {
    filePath = './overlay/_tests/index.html';
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
  console.log('🎯 Other Games (OBS): http://localhost:' + PORT + '/overlay/other-games');
  console.log('📝 Title Overlay (OBS): http://localhost:' + PORT + '/overlay/title');
  console.log('🎨 Design Tester: http://localhost:' + PORT + '/design-test');
  console.log('');
  console.log('Press Ctrl+C to stop the server');
});


