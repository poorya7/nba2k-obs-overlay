// Simple static file server for NBA 2K Overlay

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const openaiConfig = require('../overlay/nba-live-overlay/config/openai.config.js');

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, 'data');
const PLAY_BY_PLAY_DIR = path.join(DATA_DIR, 'play-by-play');
if (!fs.existsSync(PLAY_BY_PLAY_DIR)) {
  fs.mkdirSync(PLAY_BY_PLAY_DIR, { recursive: true });
}

/**
 * Transform text to sound energetic and enthusiastic like sports announcers
 * @param {string} text - Original text
 * @returns {string} - Energetic version of text
 */
function makeTextEnergetic(text) {
  // Remove excessive punctuation first
  text = text.trim();
  
  // Extract player name - typically at the start, capitalized words
  // Pattern: "FirstName LastName action description"
  const playerNameMatch = text.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
  
  if (playerNameMatch) {
    const playerName = playerNameMatch[1].trim();
    const playerNameUpper = playerName.toUpperCase();
    let restOfText = text.substring(playerNameMatch[0].length).trim();
    
    // Remove player name from action text if it appears there (handles shortened versions)
    // Escape special regex characters in player name
    const escapedPlayerName = playerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameParts = playerName.split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : null;
    
    // Remove full player name if it appears at the start (most common case)
    restOfText = restOfText.replace(new RegExp(`^${escapedPlayerName}\\s+`, 'i'), '').trim();
    
    // Also remove full player name if it appears anywhere else (case insensitive, word boundary)
    restOfText = restOfText.replace(new RegExp(`\\b${escapedPlayerName}\\b`, 'gi'), '').trim();
    
    // Remove first name if it appears at the start
    if (firstName) {
      const escapedFirstName = firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      restOfText = restOfText.replace(new RegExp(`^${escapedFirstName}\\s+`, 'i'), '').trim();
      // Also remove if it appears elsewhere (word boundary)
      restOfText = restOfText.replace(new RegExp(`\\b${escapedFirstName}\\b`, 'gi'), '').trim();
    }
    
    // Remove last name if it appears alone and is different from first name
    if (lastName && lastName !== firstName) {
      const escapedLastName = lastName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      restOfText = restOfText.replace(new RegExp(`^${escapedLastName}\\s+`, 'i'), '').trim();
      // Also remove if it appears elsewhere (word boundary)
      restOfText = restOfText.replace(new RegExp(`\\b${escapedLastName}\\b`, 'gi'), '').trim();
    }
    
    // Clean up extra spaces (multiple spaces, leading/trailing)
    restOfText = restOfText.replace(/\s+/g, ' ').trim();
    
    // Check for three-pointer patterns
    if (restOfText.match(/three|3-?pointer|3-?pt|three-?point/i)) {
      // Style: "LUKA DONCIC... FOR THREE... BANG!!!"
      // Extract opponent if present (e.g., "over Player Name" or "on Player Name")
      const opponentMatch = restOfText.match(/(?:over|on)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
      if (opponentMatch) {
        const opponent = opponentMatch[1].toUpperCase();
        return `${playerNameUpper}... FOR THREE... BANG!!! HE HITS IT OVER ${opponent}!!!`;
      }
      return `${playerNameUpper}... FOR THREE... BANG!!!`;
    }
    
    // Check for scoring plays (makes, scores, drains, hits)
    if (restOfText.match(/makes|scores|drains|hits/i)) {
      // Style: "OH!! LUKA DONCIC DRAINS THE THREE-POINTER!!! WOW!!!"
      const actionVerb = restOfText.match(/(makes|scores|drains|hits)/i)?.[0].toUpperCase();
      const actionDescription = restOfText.replace(/^(makes|scores|drains|hits)\s+/i, '').toUpperCase().replace(/\.$/, '');
      const opponentMatch = restOfText.match(/(?:over|on)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
      
      if (opponentMatch) {
        const opponent = opponentMatch[1].toUpperCase();
        return `OH!! ${playerNameUpper} ${actionVerb} ${actionDescription} ON ${opponent}!!! WOW!!!`;
      }
      return `OH!! ${playerNameUpper} ${actionVerb} ${actionDescription}!!! WOW!!!`;
    }
    
    // Check for plays with opponent mentioned
    const opponentMatch = restOfText.match(/(?:over|on)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
    if (opponentMatch) {
      // Style: "DONCIC — THREE POINTER — YES!!! RIGHT ON LEBRON JAMES!!!"
      const opponent = opponentMatch[1].toUpperCase();
      const actionPart = restOfText.replace(/\s*(?:over|on)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/i, '').toUpperCase().replace(/\.$/, '');
      return `${playerNameUpper} — ${actionPart} — YES!!! RIGHT ON ${opponent}!!!`;
    }
    
    // Default: capitalize player name and action, add enthusiasm
    const actionUpper = restOfText.toUpperCase().replace(/\.$/, '');
    return `${playerNameUpper}... ${actionUpper}!!!`;
  }
  
  // Fallback: uppercase and add exclamation
  text = text.toUpperCase();
  if (!/[.!?]/.test(text.slice(-1))) {
    text += '!!!';
  } else if (text.slice(-1) === '.') {
    text = text.slice(0, -1) + '!!!';
  } else {
    text += '!!';
  }
  
  return text;
}

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
    this.playByPlayData = {};  // Store play-by-play data per game: { gameId: [{period, clock, playerName, action, homeScore, awayScore, ...}, ...] }
    this.gameAnalysisTimestamps = {};  // Track when analysis was last generated per game: { gameId: timestamp }
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
    } else {
      // Start new quarter
      state.setQuarter(data.quarter);
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
      sendJson(res, 400, { error: 'Missing required fields: username, text/textHtml' });
      return;
    }
    
    // Add message to storage
    state.addChatMessage(message);
    
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
  sendJson(res, 200, { success: true, message: 'Chat messages cleared' });
}

// POST /api/chat/refresh - Trigger chat overlay refresh
function handlePostChatRefresh(req, res) {
  state.triggerChatRefresh();
  sendJson(res, 200, { success: true, message: 'Chat refresh triggered', refreshTrigger: state.getChatRefreshTrigger() });
}

// Helper function to enhance text using OpenAI Chat API as energetic sports commentator
// Returns: { enhancedText, systemPrompt, userPrompt }
async function enhanceTextWithAI(originalText) {
  return new Promise((resolve, reject) => {
    const systemPrompt = 'You are an EXTREMELY energetic and enthusiastic NBA sports commentator calling a LIVE game in real-time. The text you receive is already enhanced with excitement markers (BANG!!!, OH!!, exclamation marks, etc.) - YOUR JOB is to PRESERVE and ENHANCE that enthusiasm while making it sound natural. Keep ALL the excitement markers, exclamation marks, and emphasis. Add MORE enthusiasm if possible. Make it sound conversational and exciting - NEVER tone down the excitement. Use words like "just", "now", "immediately" to convey immediacy. Use ALL CAPS for player names. Keep it SHORT and PUNCHY. Stay 100% accurate - only rephrase to sound more natural while INCREASING enthusiasm, never decreasing it.';
    
    const userPrompt = `This NBA play-by-play text is already enhanced with excitement (BANG!!!, OH!!, exclamation marks). Your job is to make it sound MORE natural and conversational while KEEPING or INCREASING the enthusiasm:

"${originalText}"

CRITICAL RULES:
1. PRESERVE all excitement markers (BANG!!!, OH!!, exclamation marks, ALL CAPS player names)
2. INCREASE enthusiasm where possible (don't tone it down!)
3. Make it sound conversational and natural (like you're watching it live)
4. Keep the same energy level or higher

Examples:
- "LUKA DONCIC... FOR THREE... BANG!!!" → "LUKA DONCIC... FOR THREE... BANG!!! HE HITS IT!!!"
- "OH!! LEBRON JAMES DRAINS THE THREE-POINTER!!! WOW!!!" → "OH!! LEBRON JAMES just DRAINS that THREE-POINTER!!! WOW!!! INCREDIBLE!!!"
- Keep the snappy, punchy style - don't make it wordy or subdued

Guidelines:
- Keep ALL exclamation marks and excitement words (BANG, OH, WOW, YES, etc.)
- Use words like "just", "now" to make it sound immediate
- Keep ALL CAPS for player names
- Keep it brief and punchy (1-2 sentences max)
- Sound like you're watching it happen live RIGHT NOW
- NEVER remove excitement markers or make it less enthusiastic

Respond with ONLY the enhanced commentary text, nothing else.`;

    const requestData = JSON.stringify({
      model: 'gpt-4o-mini', // Using mini for speed and cost
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      max_tokens: 100,  // Reduced to keep responses shorter
      temperature: 0.9  // Higher temperature for more creativity and excitement
    });

    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiConfig.openaiApiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      }
    };

    const apiReq = https.request(options, (apiRes) => {
      let responseBody = '';
      
      apiRes.on('data', (chunk) => {
        responseBody += chunk;
      });
      
      apiRes.on('end', () => {
        if (apiRes.statusCode !== 200) {
          // Fallback to original text if enhancement fails
          resolve({
            enhancedText: originalText,
            systemPrompt: systemPrompt,
            userPrompt: userPrompt
          });
          return;
        }
        
        try {
          const chatData = JSON.parse(responseBody);
          const enhancedText = chatData.choices?.[0]?.message?.content?.trim() || originalText;
          resolve({
            enhancedText: enhancedText,
            systemPrompt: systemPrompt,
            userPrompt: userPrompt
          });
        } catch (e) {
          resolve({
            enhancedText: originalText,
            systemPrompt: systemPrompt,
            userPrompt: userPrompt
          });
        }
      });
    });
    
      apiReq.on('error', (error) => {
        resolve({
          enhancedText: originalText,
          systemPrompt: systemPrompt,
          userPrompt: userPrompt
        });
      });
    
    apiReq.write(requestData);
    apiReq.end();
  });
}

// Shared helper function to call OpenAI TTS API
// Returns a Promise that resolves when the audio is piped to the response
function callOpenAITTS(text, voice, model, speed, res, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const requestData = JSON.stringify({
      model: model,
      input: text,
      voice: voice,
      speed: speed
    });
    
    const options = {
      hostname: 'api.openai.com',
      path: '/v1/audio/speech',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiConfig.openaiApiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      }
    };
    
    const apiReq = https.request(options, (apiRes) => {
      if (apiRes.statusCode !== 200) {
        let errorBody = '';
        apiRes.on('data', (chunk) => { errorBody += chunk; });
        apiRes.on('end', () => {
          try {
            const errorData = JSON.parse(errorBody);
            console.error('❌ OpenAI TTS error:', apiRes.statusCode, errorData);
            if (!res.headersSent) {
              const headers = {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                ...extraHeaders
              };
              res.writeHead(apiRes.statusCode, headers);
              res.end(JSON.stringify({ error: `OpenAI API error: ${errorData.error?.message || apiRes.statusMessage}` }));
            }
            reject(new Error(`OpenAI API error: ${errorData.error?.message || apiRes.statusMessage}`));
          } catch (e) {
            if (!res.headersSent) {
              const headers = {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                ...extraHeaders
              };
              res.writeHead(apiRes.statusCode, headers);
              res.end(JSON.stringify({ error: `OpenAI API error: ${apiRes.statusMessage}` }));
            }
            reject(new Error(`OpenAI API error: ${apiRes.statusMessage}`));
          }
        });
        return;
      }
      
      // Stream audio response
      const headers = {
        'Content-Type': 'audio/mpeg',
        'Access-Control-Allow-Origin': '*',
        ...extraHeaders
      };
      res.writeHead(200, headers);
      apiRes.pipe(res);
      apiRes.on('end', () => resolve());
    });
    
    apiReq.on('error', (error) => {
      console.error('❌ TTS request error:', error.message);
      if (!res.headersSent) {
        const headers = {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          ...extraHeaders
        };
        res.writeHead(500, headers);
        res.end(JSON.stringify({ error: error.message }));
      }
      reject(error);
    });
    
    apiReq.write(requestData);
    apiReq.end();
  });
}

// POST /api/text-to-speech - Convert text to speech using OpenAI TTS
async function handlePostTextToSpeech(req, res) {
  try {
    const data = await parseJsonBody(req);
    let { text, voice = 'alloy', model = 'tts-1', speed = 1.0, enhance = false } = data;
    
    if (!text || text.trim().length === 0) {
      const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      };
      res.writeHead(400, headers);
      res.end(JSON.stringify({ error: 'Missing required field: text' }));
      return;
    }
    
    // Store original text for logging
    const originalTextForLog = text;
    let enhancedTextForLog = null;
    
    // Step 1: Always apply rule-based enhancement first (adds excitement, emphasis, snappy patterns)
    text = makeTextEnergetic(text);
    
    // Step 2: If enhance flag is true, also apply AI to make it sound more natural/conversational
    if (enhance) {
      try {
        const aiResult = await enhanceTextWithAI(text); // AI enhances the already-energetic text
        enhancedTextForLog = aiResult.enhancedText;
        text = enhancedTextForLog;
      } catch (error) {
        // If AI fails, keep the rule-based enhanced text (don't lose the excitement)
        console.error('❌ AI enhancement failed, keeping rule-based enhancement:', error.message);
        enhancedTextForLog = text; // text already has rule-based enhancement
      }
    } else {
      // Just rule-based enhancement (no AI)
      enhancedTextForLog = text;
    }
    // Speed must be between 0.25 and 4.0
    const speedValue = Math.max(0.25, Math.min(4.0, parseFloat(speed) || 1.0));
    
    // Prepare extra headers for enhanced text logging
    const extraHeaders = {
      'Access-Control-Expose-Headers': 'X-Enhanced-Text, X-Original-Text'
    };
    if (enhance && enhancedTextForLog) {
      extraHeaders['X-Enhanced-Text'] = Buffer.from(enhancedTextForLog).toString('base64');
      extraHeaders['X-Original-Text'] = Buffer.from(originalTextForLog).toString('base64');
    }
    
    // Use shared TTS function
    await callOpenAITTS(text, voice, model, speedValue, res, extraHeaders);
    
  } catch (error) {
    console.error('❌ TTS error:', error.message);
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    };
    res.writeHead(500, headers);
    res.end(JSON.stringify({ error: error.message }));
  }
}

// POST /api/play-by-play - Store play-by-play data in memory
async function handlePostPlayByPlay(req, res) {
  try {
    const data = await parseJsonBody(req);
    const { gameId, play } = data;
    
    if (!gameId || !play) {
      const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      };
      res.writeHead(400, headers);
      res.end(JSON.stringify({ error: 'Missing required fields: gameId, play' }));
      return;
    }
    
    // Initialize array for this game if it doesn't exist
    if (!state.playByPlayData[gameId]) {
      state.playByPlayData[gameId] = [];
    }
    
    // Add the play to the array (keep all plays from start of game)
    state.playByPlayData[gameId].push(play);
    
    // Also save to file for later simulation/debugging
    const playWithTimestamp = {
      timestamp: new Date().toISOString(),
      ...play
    };
    
    const filePath = path.join(PLAY_BY_PLAY_DIR, `game-${gameId}.json`);
    let playsFile = [];
    
    // Read existing plays if file exists
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        playsFile = JSON.parse(fileContent);
      } catch (e) {
        console.error('❌ Error reading play-by-play file:', e.message);
        playsFile = [];
      }
    }
    
    // Append new play
    playsFile.push(playWithTimestamp);
    
    // Write back to file
    try {
      fs.writeFileSync(filePath, JSON.stringify(playsFile, null, 2), 'utf8');
    } catch (e) {
      console.error('❌ Error writing play-by-play file:', e.message);
    }
    
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    };
    res.writeHead(200, headers);
    res.end(JSON.stringify({ success: true, totalPlays: state.playByPlayData[gameId].length }));
  } catch (error) {
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    };
    res.writeHead(500, headers);
    res.end(JSON.stringify({ error: error.message }));
  }
}

// Helper function to generate game analysis using OpenAI Chat API
async function generateGameAnalysis(plays, homeTeam, awayTeam, currentScore, isShortAnalysis = false) {
  return new Promise((resolve, reject) => {
    const systemPrompt = isShortAnalysis 
      ? 'You are a professional NBA game analyst providing BRIEF, QUICK updates during dead air moments. Keep your analysis SHORT (30-50 words max, 3-6 seconds of speech). Focus only on the most recent key plays. Sound energetic and concise.'
      : 'You are a professional NBA game analyst. You analyze basketball games based on play-by-play data. Provide insightful, engaging commentary about how the game has been going, key moments, standout performances, and overall game flow. Sound like an experienced analyst discussing the game naturally.';
    
    // For short analysis, only use last 20 plays
    const playsToAnalyze = isShortAnalysis ? plays.slice(-20) : plays;
    
    // Format plays for analysis
    let playsText = playsToAnalyze.map((play, index) => {
      let playDesc = '';
      if (play.playerName && play.playerName !== 'Player') {
        playDesc += `${play.playerName} `;
      }
      playDesc += play.action || '';
      if (play.period) {
        playDesc += ` (Q${play.period} ${play.clock || ''})`;
      }
      return `${index + 1}. ${playDesc}`;
    }).join('\n');
    
    const userPrompt = isShortAnalysis
      ? `Quick update during a brief pause in action. Based on the LAST 20 plays from an NBA game between ${homeTeam || 'Home Team'} and ${awayTeam || 'Away Team'}:

Current Score: ${currentScore || 'N/A'}

Recent Plays:
${playsText}

Provide a BRIEF, QUICK analysis (30-50 words max, 3-6 seconds when spoken). Focus only on the most recent key moments. Be concise and energetic.`
      : `Based on the following play-by-play data from an NBA game between ${homeTeam || 'Home Team'} and ${awayTeam || 'Away Team'}, provide a professional game analysis. 

Current Score: ${currentScore || 'N/A'}

Play-by-Play:
${playsText}

Provide a natural, conversational analysis of how the game has been going so far. Discuss key plays, standout performances, game flow, and overall observations. Keep it engaging and professional.`;

    const requestData = JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      max_tokens: isShortAnalysis ? 100 : 500,  // Shorter response for quick updates
      temperature: 0.7
    });

    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiConfig.openaiApiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      }
    };

    const apiReq = https.request(options, (apiRes) => {
      let responseBody = '';
      
      apiRes.on('data', (chunk) => {
        responseBody += chunk;
      });
      
      apiRes.on('end', () => {
        if (apiRes.statusCode !== 200) {
          resolve(null); // Return null on error
          return;
        }
        
        try {
          const chatData = JSON.parse(responseBody);
          const analysisText = chatData.choices?.[0]?.message?.content?.trim() || null;
          resolve(analysisText);
        } catch (e) {
          resolve(null);
        }
      });
    });
    
    apiReq.on('error', (error) => {
      resolve(null); // Return null on error
    });
    
    apiReq.write(requestData);
    apiReq.end();
  });
}

// POST /api/game-analysis - Generate analysis audio for timeout/halftime/dead-air
async function handlePostGameAnalysis(req, res) {
  try {
    const data = await parseJsonBody(req);
    const { gameId, homeTeam, awayTeam, currentScore, forceRegenerate = false, isShortAnalysis = false } = data;
    
    if (!gameId) {
      console.error('❌ Game analysis request missing gameId');
      const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      };
      res.writeHead(400, headers);
      res.end(JSON.stringify({ error: 'Missing required field: gameId' }));
      return;
    }
    
    // Track when analysis was generated (for client-side caching decisions)
    const now = Date.now();
    
    // Always generate and stream audio - let client handle caching on their end
    // (Client checks if analysisAudioUrl exists and is recent before requesting)
    
    // Update timestamp
    state.gameAnalysisTimestamps[gameId] = now;
    
    // Get all plays for this game
    const plays = state.playByPlayData[gameId] || [];
    
    if (plays.length === 0) {
      console.error(`❌ No play-by-play data for game ${gameId}`);
      const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      };
      res.writeHead(400, headers);
      res.end(JSON.stringify({ error: 'No play-by-play data available for this game' }));
      return;
    }
    
    // Generate analysis text using OpenAI Chat API
    let analysisText;
    try {
      analysisText = await generateGameAnalysis(plays, homeTeam, awayTeam, currentScore, isShortAnalysis);
    } catch (genError) {
      console.error('❌ Error generating analysis:', genError);
      const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      };
      res.writeHead(500, headers);
      res.end(JSON.stringify({ error: 'Failed to generate analysis: ' + genError.message }));
      return;
    }
    
    if (!analysisText) {
      console.error('❌ Failed to generate analysis text (returned null/empty)');
      const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      };
      res.writeHead(500, headers);
      res.end(JSON.stringify({ error: 'Failed to generate analysis' }));
      return;
    }
    
    // Convert analysis text to speech using shared TTS function
    const extraHeaders = {
      'X-Generated-At': now.toString()
    };
    await callOpenAITTS(analysisText, 'onyx', 'tts-1', 1.0, res, extraHeaders);
  } catch (error) {
    console.error('❌ Game analysis handler error:', error);
    // Make sure we haven't already sent headers
    if (!res.headersSent) {
      const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      };
      res.writeHead(500, headers);
      res.end(JSON.stringify({ error: error.message || 'Internal server error' }));
    }
  }
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
  'POST /api/text-to-speech': handlePostTextToSpeech,
  'POST /api/play-by-play': handlePostPlayByPlay,
  'POST /api/game-analysis': handlePostGameAnalysis,
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
  
  // Only process API routes (routes starting with /api)
  if (!normalizedUrl.startsWith('/api')) {
    return false;
  }
  
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
  
  // If it's an API route but no handler found, return 404 with CORS
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };
  res.writeHead(404, headers);
  res.end(JSON.stringify({ error: 'API route not found' }));
  return true;
}

// ==================== HTTP SERVER ====================

const server = http.createServer(async (req, res) => {
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
  } else if (filePath === './overlay/color' || filePath === './overlay/color/') {
    filePath = './overlay/color-overlay/index.html';
  } else if (filePath === './chat-test' || filePath === './chat-test/') {
    filePath = './overlay/chat-overlay/chat-test.html';
  } else if (filePath === './test' || filePath === './test/') {
    filePath = './overlay/_tests/index.html';
  } else if (filePath === './test-tts' || filePath === './test-tts/') {
    filePath = './overlay/_tests/test-tts.html';
  } else if (filePath === './test-pbp-animations' || filePath === './test-pbp-animations/') {
    filePath = './overlay/_tests/test-pbp-animations.html';
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
  console.log('🎨 Color Overlay (OBS): http://localhost:' + PORT + '/overlay/color');
    console.log('🧪 Chat Test Page: http://localhost:' + PORT + '/chat-test');
    console.log('🎨 Design Tester: http://localhost:' + PORT + '/design-test');
    console.log('🔊 TTS Test Page: http://localhost:' + PORT + '/test-tts');
    console.log('🎬 PBP Animations Test: http://localhost:' + PORT + '/test-pbp-animations');
  console.log('');
  console.log('Press Ctrl+C to stop the server');
});


