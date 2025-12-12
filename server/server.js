// Simple static file server for NBA 2K Overlay

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = 3000;

// ==================== STATE MANAGEMENT ====================

class StateStore {
  constructor() {
    this.selectedGameId = null;
    this.selectedStyle = 'pill-green';
    this.simulation = {
      enabled: false,
      state: 'pregame',
      showMVP: false,
      timeMultiplier: 1  // 1x normal, 10x for fast forward
    };
    this.quarter = {
      current: null,        // 'Q1', 'Q2', 'Q3', 'Q4', or null
      startTime: null       // timestamp when quarter started
    };
    this.socialsEnabled = true;  // Socials overlay toggle (default: enabled)
    this.chatMessages = [];     // In-memory chat messages storage
    this.maxChatMessages = 200;  // Keep last 200 messages
    this.chatRefreshTrigger = null;  // Timestamp to trigger chat overlay refresh
    this.chatClearTimestamp = null;  // Timestamp when chat was last cleared (for extension to reset tracking)
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
    if (updates.timeMultiplier !== undefined) this.simulation.timeMultiplier = updates.timeMultiplier;
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

  // Socials overlay
  getSocialsEnabled() { return this.socialsEnabled; }
  setSocialsEnabled(enabled) { this.socialsEnabled = enabled; }

  // Chat messages
  addChatMessage(message) {
    // Add timestamp if not present
    if (!message.receivedAt) {
      message.receivedAt = Date.now();
    }
    this.chatMessages.push(message);
    
    // Keep only last maxChatMessages
    if (this.chatMessages.length > this.maxChatMessages) {
      this.chatMessages.shift();
    }
  }

  getChatMessages() {
    return [...this.chatMessages]; // Return copy
  }

  clearChatMessages() {
    this.chatMessages = [];
    this.chatClearTimestamp = Date.now(); // Update timestamp when cleared
  }
  
  getChatClearTimestamp() {
    return this.chatClearTimestamp;
  }

  // Chat refresh trigger
  triggerChatRefresh() {
    this.chatRefreshTrigger = Date.now();
  }

  getChatRefreshTrigger() {
    return this.chatRefreshTrigger;
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
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  res.writeHead(statusCode, headers);
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

// GET /api/socials-enabled
function handleGetSocialsEnabled(req, res) {
  sendJson(res, 200, { enabled: state.getSocialsEnabled() });
}

// POST /api/socials-enabled
async function handlePostSocialsEnabled(req, res) {
  try {
    const data = await parseJsonBody(req);
    state.setSocialsEnabled(data.enabled === true);
    console.log('📱 Socials overlay:', data.enabled ? 'ENABLED' : 'DISABLED');
    sendJson(res, 200, { success: true });
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

// POST /api/chat - Receive chat message from browser extension
async function handlePostChat(req, res) {
  try {
    const message = await parseJsonBody(req);
    
    // Validate required fields (more lenient - allow empty strings if at least one exists)
    const hasText = message.text && message.text.trim().length > 0;
    const hasTextHtml = message.textHtml && message.textHtml.trim().length > 0;
    
    // Only validate username and content - ID is optional (extension handles duplicates)
    if (!message.username || (!hasText && !hasTextHtml)) {
      console.log('❌ Chat rejected - missing fields:', {
        hasUsername: !!message.username,
        hasText: hasText,
        hasTextHtml: hasTextHtml,
        textLength: message.text?.length || 0,
        textHtmlLength: message.textHtml?.length || 0,
        username: message.username
      });
      sendJson(res, 400, { error: 'Missing required fields: username, text/textHtml' });
      return;
    }
    
    // Add message to storage
    state.addChatMessage(message);
    console.log('💬 Chat received:', message.username, '-', (message.text || message.textHtml).substring(0, 50), `[ID: ${message.id}]`);
    
    sendJson(res, 200, { 
      success: true, 
      messageId: message.id,
      serverClearTimestamp: state.getChatClearTimestamp() // Include so extension can detect clears
    });
  } catch (error) {
    console.error('❌ Chat error:', error.message);
    sendJson(res, 400, { error: error.message });
  }
}

// GET /api/chat - Get all chat messages (for testing/display)
function handleGetChat(req, res) {
  const messages = state.getChatMessages();
  const refreshTrigger = state.getChatRefreshTrigger();
  sendJson(res, 200, { messages, count: messages.length, refreshTrigger });
}

// DELETE /api/chat - Clear all chat messages
function handleDeleteChat(req, res) {
  state.clearChatMessages();
  state.triggerChatRefresh(); // Trigger refresh after clearing
  console.log('🗑️ Chat messages cleared');
  sendJson(res, 200, { success: true, message: 'Chat messages cleared' });
}

// POST /api/chat/refresh - Trigger chat overlay refresh
function handlePostChatRefresh(req, res) {
  state.triggerChatRefresh();
  console.log('🔄 Chat refresh triggered');
  sendJson(res, 200, { success: true, message: 'Chat refresh triggered', refreshTrigger: state.getChatRefreshTrigger() });
}

// GET /api/image-proxy?url=... - Proxy images to bypass CORS
function handleGetImageProxy(req, res) {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const imageUrl = urlObj.searchParams.get('url');
  
  if (!imageUrl) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Missing url parameter');
    return;
  }
  
  try {
    // Validate URL
    const targetUrl = new URL(imageUrl);
    
    // Only allow http/https URLs for security
    if (targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Invalid URL protocol');
      return;
    }
    
    // Use https for https URLs, http for http URLs
    const client = targetUrl.protocol === 'https:' ? https : http;
    
    // Fetch the image
    client.get(imageUrl, (imageRes) => {
      // Check if response is successful
      if (imageRes.statusCode !== 200) {
        res.writeHead(imageRes.statusCode || 500, { 'Content-Type': 'text/plain' });
        res.end('Failed to fetch image');
        return;
      }
      
      // Get content type from response or default to image
      const contentType = imageRes.headers['content-type'] || 'image/jpeg';
      
      // Set CORS headers and content type
      const headers = {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      };
      
      res.writeHead(200, headers);
      
      // Pipe the image data to response
      imageRes.pipe(res);
    }).on('error', (error) => {
      console.error('❌ Image proxy error:', error.message);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Failed to fetch image');
    });
  } catch (error) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Invalid URL');
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
  'POST /api/quarter': handlePostQuarter,
  'GET /api/socials-enabled': handleGetSocialsEnabled,
  'POST /api/socials-enabled': handlePostSocialsEnabled,
  'GET /api/chat': handleGetChat,
  'POST /api/chat': handlePostChat,
  'DELETE /api/chat': handleDeleteChat,
  'POST /api/chat/refresh': handlePostChatRefresh,
  'GET /api/image-proxy': handleGetImageProxy
};

/**
 * Route API request to handler
 * @param {http.IncomingMessage} req 
 * @param {http.ServerResponse} res 
 * @returns {boolean} True if route was handled
 */
async function routeApiRequest(req, res) {
  // Normalize URL (remove query string and trailing slash)
  const urlWithoutQuery = req.url.split('?')[0];
  const normalizedUrl = urlWithoutQuery.endsWith('/') && urlWithoutQuery.length > 1
    ? urlWithoutQuery.slice(0, -1)
    : urlWithoutQuery;
  
  // Handle CORS preflight (OPTIONS requests)
  if (req.method === 'OPTIONS') {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400' // 24 hours
    };
    res.writeHead(200, headers);
    res.end();
    return true;
  }
  
  // Match route (try with and without trailing slash)
  const routeKey = `${req.method} ${normalizedUrl}`;
  let handler = API_ROUTES[routeKey];
  
  // If no handler found, try with trailing slash
  if (!handler && !normalizedUrl.endsWith('/')) {
    handler = API_ROUTES[`${req.method} ${normalizedUrl}/`];
  }
  
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
  // Strip query string from URL
  const urlWithoutQuery = req.url.split('?')[0];
  let filePath = '.' + urlWithoutQuery;
  
  // Default routes
  if (filePath === './') {
    filePath = './overlay/_dashboard/index.html';
  } else if (filePath === './dashboard' || filePath === './dashboard/') {
    filePath = './overlay/_dashboard/index.html';
  } else if (filePath === './overlay/game-stats' || filePath === './overlay/game-stats/') {
    filePath = './overlay/game-stats-overlay/core/index.html';
  } else if (filePath === './overlay/nba-live' || filePath === './overlay/nba-live/') {
    filePath = './overlay/nba-live-overlay/index.html';
  } else if (filePath === './overlay/other-games' || filePath === './overlay/other-games/') {
    filePath = './overlay/other-games-overlay/index.html';
  } else if (filePath === './overlay/title' || filePath === './overlay/title/') {
    filePath = './overlay/title-overlay/index.html';
  } else if (filePath === './overlay/socials' || filePath === './overlay/socials/') {
    filePath = './overlay/socials-overlay/index.html';
  } else if (filePath === './overlay/chat' || filePath === './overlay/chat/') {
    filePath = './overlay/chat-overlay/index.html';
  } else if (filePath === './chat-test' || filePath === './chat-test/') {
    filePath = './overlay/chat-overlay/chat-test.html';
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
      const headers = { 'Content-Type': contentType };
      // Add CORS headers for local development
      headers['Access-Control-Allow-Origin'] = '*';
      res.writeHead(200, headers);
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log('🚀 NBA 2K Overlay Server running!');
  console.log('');
  console.log('📺 Control Dashboard: http://localhost:' + PORT + '/dashboard');
  console.log('🏀 Game Overlay (OBS): http://localhost:' + PORT + '/overlay/game-stats');
  console.log('🔴 NBA Live (NEW): http://localhost:' + PORT + '/overlay/nba-live');
  console.log('🎯 Other Games (OBS): http://localhost:' + PORT + '/overlay/other-games');
  console.log('📝 Title Overlay (OBS): http://localhost:' + PORT + '/overlay/title');
  console.log('📱 Socials Overlay (OBS): http://localhost:' + PORT + '/overlay/socials');
    console.log('💬 Chat Overlay (OBS): http://localhost:' + PORT + '/overlay/chat');
    console.log('🧪 Chat Test Page: http://localhost:' + PORT + '/chat-test');
    console.log('🎨 Design Tester: http://localhost:' + PORT + '/design-test');
  console.log('');
  console.log('Press Ctrl+C to stop the server');
});


