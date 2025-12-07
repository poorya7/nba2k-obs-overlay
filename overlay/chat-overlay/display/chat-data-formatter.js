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
            
            // Membership tier badge (crown + number) - oval style like extension overlay
            if (msg.badges.membershipTier) {
                badgesHtml += `<span class="chat-badge-tier" style="background: #E0D9F7; color: #000; border: 1px solid #000; border-radius: 16px; font-size: 11px; padding: 3px 10px; display: inline-flex; align-items: center; gap: 4px; height: 18px; line-height: 1; margin-left: 4px;">👑 #${this.escapeHtml(msg.badges.membershipTier)}</span>`;
            }
        }
        
        return `<img class="profile-pic" src="${msg.avatar}" alt="${msg.user}"><div class="content"><span class="user" style="color:${color}">${msg.user}${badgesHtml}</span> ${msg.text}</div>`;
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
            
            // Membership tier badge (crown + number) - oval style like extension overlay
            if (msg.badges.membershipTier) {
                badgesHtml += `<span class="chat-badge-tier" style="background: #E0D9F7; color: #000; border: 1px solid #000; border-radius: 16px; font-size: 11px; padding: 3px 10px; display: inline-flex; align-items: center; gap: 4px; height: 18px; line-height: 1; margin-left: 3px;">👑 #${this.escapeHtml(msg.badges.membershipTier)}</span>`;
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
                return `<div class="content inline"><span class="user" style="color:${color}">${msg.user}</span> <span class="inline-text">${badgesHtml} ${msg.text}</span></div>`;
            case 'option-11': // Vertical timeline
                return `<div class="content timeline-vertical"><div class="timeline-line"></div><span class="user" style="color:${color}">${msg.user}</span> ${badgesHtml} ${msg.text}</div>`;
            case 'option-21': // Vertical timeline with colored lines
                return `<div class="content timeline-vertical-colored"><div class="timeline-line-colored" style="background:linear-gradient(to bottom, ${color}, transparent)"></div><span class="user" style="color:${color}">${msg.user}</span> ${badgesHtml} ${msg.text}</div>`;
            case 'option-19': // Brackets style
                return `<div class="content brackets-style"><div class="bracket-user-wrapper"><span class="bracket-open" style="color:${color}">[</span><span class="bracket-user" style="color:${color}">${msg.user}</span><span class="bracket-close" style="color:${color}">]</span></div><span class="bracket-text">${badgesHtml} ${msg.text}</span></div>`;
            default:
                return `<div class="content inline"><span class="user" style="color:${color}">${msg.user}</span> <span class="inline-text">${badgesHtml} ${msg.text}</span></div>`;
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
     * Get user color by username (with fallback to index-based assignment for new users)
     * @param {string} username - Username
     * @param {number} index - Message index (for new users)
     * @param {ChatStateManager} stateManager - State manager to access color map
     * @returns {string} Color hex code
     */
    getUserColor(username, index, stateManager, messagesList = null) {
        // STEP 1: Check if user already has a color assigned (from before)
        // If yes, reuse it for consistency - even if it conflicts with visible users
        const existingColor = stateManager.getUserColor(username);
        if (existingColor) {
            return existingColor;
        }
        
        // STEP 2: New user - get colors of currently visible users in chat list
        // We only care about the last 8 visible messages (the ones that actually stay on screen)
        // Don't check ALL messages - only the ones that are actually visible
        const visibleColors = new Set();
        if (messagesList && messagesList.length > 0) {
            // Only check the LAST 8 messages (these are the ones that stay visible)
            // Slice from the end, not the beginning
            const visibleMessages = messagesList.slice(-8);
            
            visibleMessages.forEach(msgEl => {
                // Skip if message is exiting/fading out
                if (msgEl.classList.contains('exiting') || msgEl.classList.contains('fading-out')) {
                    return;
                }
                
                const userEl = msgEl.querySelector('.user');
                if (userEl) {
                    // Get username - try multiple methods to extract it reliably
                    let visibleUsername = null;
                    
                    // Method 1: Check if there's a direct text node (username before badges)
                    for (let node of userEl.childNodes) {
                        if (node.nodeType === 3) { // Text node
                            visibleUsername = node.textContent.trim();
                            break;
                        } else if (node.nodeType === 1 && node.tagName === 'SPAN') {
                            // If username is in a span
                            visibleUsername = node.textContent.trim();
                            break;
                        }
                    }
                    
                    // Method 2: Get text content and try to extract username (before badges)
                    if (!visibleUsername) {
                        const fullText = userEl.textContent.trim();
                        // Try to find username pattern (starts with @ or is first part before space/special chars)
                        const match = fullText.match(/^(@?[^\s@]+)/);
                        if (match) {
                            visibleUsername = match[1].replace(/^@/, '');
                        } else {
                            visibleUsername = fullText;
                        }
                    }
                    
                    if (visibleUsername && visibleUsername !== username) {
                        // Get color assigned to this visible user from state manager
                        const userColor = stateManager.getUserColor(visibleUsername);
                        if (userColor) {
                            visibleColors.add(userColor.toUpperCase());
                        } else {
                            // Fallback: get color from inline style
                            const colorStyle = userEl.style.color;
                            if (colorStyle) {
                                const hexColor = this.normalizeColorToHex(colorStyle);
                                if (hexColor) {
                                    visibleColors.add(hexColor.toUpperCase());
                                }
                            }
                        }
                    }
                }
            });
        }
        
        // STEP 3: Find first color from palette that's NOT currently visible
        let assignedColor = null;
        for (const color of this.config.userColors) {
            const colorUpper = color.toUpperCase();
            if (!visibleColors.has(colorUpper)) {
                assignedColor = color;
                break;
            }
        }
        
        // STEP 4: If all colors are in use (shouldn't happen with 7-8 users and 12+ colors),
        // pick the least recently used or use hash for consistency
        if (!assignedColor) {
            // This should rarely happen, but if it does, use hash
            let hash = 5381;
            for (let i = 0; i < username.length; i++) {
                hash = ((hash << 5) + hash) + username.charCodeAt(i);
            }
            const colorIndex = Math.abs(hash) % this.config.userColors.length;
            assignedColor = this.config.userColors[colorIndex];
        }
        
        // Store the color for this user (they'll keep it even when they scroll out)
        stateManager.setUserColor(username, assignedColor);
        
        return assignedColor;
    }
    
    // Helper to normalize any color format to hex
    normalizeColorToHex(color) {
        if (!color) return null;
        
        // If already hex format
        if (color.startsWith('#')) {
            return color;
        }
        
        // If rgb/rgba format like "rgb(255, 0, 0)" or "rgba(255, 0, 0, 1)"
        const rgbMatch = color.match(/\d+/g);
        if (rgbMatch && rgbMatch.length >= 3) {
            const r = parseInt(rgbMatch[0]);
            const g = parseInt(rgbMatch[1]);
            const b = parseInt(rgbMatch[2]);
            return '#' + [r, g, b].map(x => {
                const hex = x.toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            }).join('').toUpperCase();
        }
        
        return null;
    }
}

