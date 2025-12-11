/**
 * SpotlightConfig - Configuration and constants for spotlight chat overlay
 * Single Responsibility: Centralized configuration
 */

const SpotlightConfig = {
    // Display settings
    maxMessages: 15,           // Keep more messages, mask handles visual fade
    styleNum: 13,              // Only style 13 (spotlight)
    
    // Timing
    pollInterval: 200,         // Server poll interval (ms)
    messageDelay: 4000,        // Time between messages (ms) - ASMR pace
    scrollDuration: 1000,      // Smooth scroll animation duration (ms)
    
    // Text limits
    maxTextLength: 110,        // Truncate messages at this length
    charsPerLine: 17,          // Characters that fit on one line
    maxWordLength: 20,         // Words longer than this can break
    
    // Server
    apiEndpoint: 'http://localhost:3000/api/chat',
    
    // Username colors (same as main chat overlay)
    userColors: ['cyan', 'teal', 'blue', 'purple', 'pink']
};

