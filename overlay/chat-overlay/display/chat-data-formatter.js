/**
 * ChatDataFormatter - Handles HTML generation for chat messages
 * Single Responsibility: Format chat data for display in different styles
 */

class ChatDataFormatter {
    constructor(config) {
        // Validate dependencies
        if (!config) {
            throw new Error('ChatDataFormatter: config is required');
        }
        
        this.config = config;
    }
    
    /**
     * Format HTML for stage message (ghost style)
     * @param {Object} msg - Message object with {user, text, avatar}
     * @param {string} color - User color
     * @returns {string} HTML string
     */
    formatStageHTML(msg, color) {
        return `<img class="profile-pic" src="${msg.avatar}" alt="${msg.user}"><div class="content"><span class="user" style="color:${color}">${msg.user}</span>${msg.text}</div>`;
    }
    
    /**
     * Format HTML for list message (various styles)
     * @param {Object} msg - Message object with {user, text, avatar}
     * @param {string} color - User color
     * @param {string} styleOverride - Optional style override
     * @returns {string} HTML string
     */
    formatListHTML(msg, color, styleOverride = null) {
        // Get current style to determine HTML structure
        const body = document.body;
        let style = styleOverride || 'default';
        
        if (!styleOverride) {
            for (let i = 1; i <= 14; i++) {
                if (body.classList.contains(`chat-style-option-${i}`)) {
                    style = `option-${i}`;
                    break;
                }
            }
        }
        
        // Different HTML structures for different styles
        switch(style) {
            case 'option-10': // Inline compact
                return `<div class="content inline"><span class="user" style="color:${color}">${msg.user}</span><span class="inline-text">${msg.text}</span></div>`;
            case 'option-11': // Vertical timeline
                return `<div class="content timeline-vertical"><div class="timeline-line"></div><span class="user" style="color:${color}">${msg.user}</span>${msg.text}</div>`;
            case 'option-21': // Vertical timeline with colored lines
                return `<div class="content timeline-vertical-colored"><div class="timeline-line-colored" style="background:linear-gradient(to bottom, ${color}, transparent)"></div><span class="user" style="color:${color}">${msg.user}</span>${msg.text}</div>`;
            case 'option-19': // Brackets style
                return `<div class="content brackets-style"><div class="bracket-user-wrapper"><span class="bracket-open" style="color:${color}">[</span><span class="bracket-user" style="color:${color}">${msg.user}</span><span class="bracket-close" style="color:${color}">]</span></div><span class="bracket-text">${msg.text}</span></div>`;
            default:
                return `<div class="content inline"><span class="user" style="color:${color}">${msg.user}</span><span class="inline-text">${msg.text}</span></div>`;
        }
    }
    
    /**
     * Get user color by index
     * @param {number} index - Message index
     * @returns {string} Color hex code
     */
    getUserColor(index) {
        return this.config.userColors[index % this.config.userColors.length];
    }
}

