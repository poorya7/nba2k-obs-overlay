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
     * @param {Object} msg - Message object with {user, text, avatar, badges}
     * @param {string} color - User color
     * @returns {string} HTML string
     */
    formatStageHTML(msg, color) {
        // Format badges (reuse test page logic)
        let badgesHtml = '';
        if (msg.badges) {
            // Badge images (moderator, verified, etc.)
            if (msg.badges.badgeImages && msg.badges.badgeImages.length > 0) {
                msg.badges.badgeImages.forEach(badge => {
                    if (badge.src) {
                        badgesHtml += `<img src="${this.escapeHtml(badge.src)}" alt="${this.escapeHtml(badge.alt || '')}" class="chat-badge-image" title="${this.escapeHtml(badge.alt || '')}" onerror="this.style.display='none'" style="width: 16px; height: 16px; vertical-align: middle; margin-left: 4px;">`;
                    }
                });
            }
            
            // Membership tier badge (crown + number)
            if (msg.badges.membershipTier) {
                badgesHtml += `<span class="chat-badge-tier" style="margin-left: 4px; font-size: 12px;">👑 #${this.escapeHtml(msg.badges.membershipTier)}</span>`;
            }
        }
        
        return `<img class="profile-pic" src="${msg.avatar}" alt="${msg.user}"><div class="content"><span class="user" style="color:${color}">${msg.user}</span>${badgesHtml}${msg.text}</div>`;
    }
    
    /**
     * Format HTML for list message (various styles)
     * @param {Object} msg - Message object with {user, text, avatar, badges}
     * @param {string} color - User color
     * @param {string} styleOverride - Optional style override
     * @returns {string} HTML string
     */
    formatListHTML(msg, color, styleOverride = null) {
        // Format badges (reuse test page logic)
        let badgesHtml = '';
        if (msg.badges) {
            // Badge images (moderator, verified, etc.)
            if (msg.badges.badgeImages && msg.badges.badgeImages.length > 0) {
                msg.badges.badgeImages.forEach(badge => {
                    if (badge.src) {
                        badgesHtml += `<img src="${this.escapeHtml(badge.src)}" alt="${this.escapeHtml(badge.alt || '')}" class="chat-badge-image" title="${this.escapeHtml(badge.alt || '')}" onerror="this.style.display='none'" style="width: 14px; height: 14px; vertical-align: middle; margin-left: 3px;">`;
                    }
                });
            }
            
            // Membership tier badge (crown + number)
            if (msg.badges.membershipTier) {
                badgesHtml += `<span class="chat-badge-tier" style="margin-left: 3px; font-size: 11px;">👑 #${this.escapeHtml(msg.badges.membershipTier)}</span>`;
            }
        }
        
        // Get current style to determine HTML structure
        const body = document.body;
        let style = styleOverride || 'default';
        
        if (!styleOverride) {
            for (let i = 1; i <= 21; i++) {
                if (body.classList.contains(`chat-style-option-${i}`)) {
                    style = `option-${i}`;
                    break;
                }
            }
        }
        
        // Different HTML structures for different styles
        switch(style) {
            case 'option-10': // Inline compact
                return `<div class="content inline"><span class="user" style="color:${color}">${msg.user}</span>${badgesHtml}<span class="inline-text">${msg.text}</span></div>`;
            case 'option-11': // Vertical timeline
                return `<div class="content timeline-vertical"><div class="timeline-line"></div><span class="user" style="color:${color}">${msg.user}</span>${badgesHtml}${msg.text}</div>`;
            case 'option-21': // Vertical timeline with colored lines
                return `<div class="content timeline-vertical-colored"><div class="timeline-line-colored" style="background:linear-gradient(to bottom, ${color}, transparent)"></div><span class="user" style="color:${color}">${msg.user}</span>${badgesHtml}${msg.text}</div>`;
            case 'option-19': // Brackets style
                return `<div class="content brackets-style"><div class="bracket-user-wrapper"><span class="bracket-open" style="color:${color}">[</span><span class="bracket-user" style="color:${color}">${msg.user}</span>${badgesHtml}<span class="bracket-close" style="color:${color}">]</span></div><span class="bracket-text">${msg.text}</span></div>`;
            default:
                return `<div class="content inline"><span class="user" style="color:${color}">${msg.user}</span>${badgesHtml}<span class="inline-text">${msg.text}</span></div>`;
        }
    }
    
    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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

