/**
 * SpotlightDataFormatter - Handles text/HTML formatting for spotlight overlay
 * Single Responsibility: Format message data for display
 */

class SpotlightDataFormatter {
    constructor(config) {
        if (!config) {
            throw new Error('SpotlightDataFormatter: config is required');
        }
        this.config = config;
    }
    
    /**
     * Truncate text to max length with ellipsis (preserves emojis)
     * @param {string} text - Text that may contain HTML (emojis)
     * @param {number} maxLength - Maximum plain text length
     * @returns {string} Truncated text
     */
    truncateText(text, maxLength = null) {
        if (!text) return '';
        
        const limit = maxLength || this.config.maxTextLength;
        
        // Get plain text length for comparison
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        const plainText = tempDiv.textContent || tempDiv.innerText || '';
        
        if (plainText.length <= limit) {
            return text; // Return ORIGINAL text with HTML/emojis intact
        }
        
        // Need to truncate - strip to plain text and truncate
        return plainText.substring(0, limit) + '...';
    }
    
    /**
     * Wrap words to prevent mid-word breaks (preserves HTML tags like emoji <img>)
     * @param {string} text - Text that may contain HTML
     * @returns {string} Text with word wrapping spans
     */
    wrapWords(text) {
        if (!text) return '';
        
        // Check if text contains HTML tags (like emoji <img>)
        const hasHtml = /<[^>]+>/.test(text);
        
        if (hasHtml) {
            return this._wrapWordsWithHtml(text);
        }
        
        // No HTML - simple word wrapping
        return this._wrapPlainText(text);
    }
    
    /**
     * Color @mentions with the mentioned user's color
     * @param {string} text - Text that may contain @mentions
     * @param {SpotlightStateManager} stateManager - State manager for user colors
     * @returns {string} Text with colored mentions
     */
    colorMentions(text, stateManager) {
        if (!text) return '';
        
        // Match @username patterns (alphanumeric, underscores, hyphens)
        const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
        
        return text.replace(mentionRegex, (match, username) => {
            // Get or assign color for the mentioned user
            const color = stateManager.getUserColor(username, this.config.userColors);
            return `<span class="username-${color}" style="font-weight:600">@${username}</span>`;
        });
    }
    
    /**
     * Format message for display
     * @param {Object} serverMsg - Server message object
     * @param {SpotlightStateManager} stateManager - State manager for user colors
     * @returns {Object} Formatted message data
     */
    formatMessage(serverMsg, stateManager) {
        // Remove @ from username if present
        let username = serverMsg.username || '';
        username = username.replace(/^@/, '');
        
        // Get user color
        const color = stateManager.getUserColor(username, this.config.userColors);
        
        // Process text
        const rawText = serverMsg.textHtml || serverMsg.text || '';
        const truncatedText = this.truncateText(rawText);
        const coloredText = this.colorMentions(truncatedText, stateManager);
        const wrappedText = this.wrapWords(coloredText);
        
        // Calculate if message needs line break
        // Strategy: Always use space separator, let CSS handle wrapping naturally
        // This way:
        // - New message (22px font): Text may wrap to new line if long (that's fine)
        // - List message (14px font): Text will naturally fit on same line as username
        // The browser will handle wrapping based on available width and font size
        const needsLineBreak = false; // Always use space, let CSS wrap naturally
        
        // Wrap username if short enough
        const wrappedUsername = username.length <= this.config.maxWordLength
            ? `<span style="white-space:nowrap">${username}</span>`
            : username;
        
        return {
            username,
            wrappedUsername,
            wrappedText,
            color,
            needsLineBreak
        };
    }
    
    // ========================================
    // Private helpers
    // ========================================
    
    _wrapWordsWithHtml(text) {
        const parts = [];
        const tagRegex = /(<[^>]+>)/g;
        let lastIndex = 0;
        let match;
        
        while ((match = tagRegex.exec(text)) !== null) {
            // Text before this tag
            if (match.index > lastIndex) {
                const textPart = text.substring(lastIndex, match.index);
                parts.push(this._wrapPlainText(textPart));
            }
            // The tag itself (don't wrap)
            parts.push(match[1]);
            lastIndex = tagRegex.lastIndex;
        }
        
        // Remaining text after last tag
        if (lastIndex < text.length) {
            parts.push(this._wrapPlainText(text.substring(lastIndex)));
        }
        
        return parts.join('');
    }
    
    _wrapPlainText(text) {
        if (!text) return '';
        
        const words = text.split(' ');
        const wrapped = words.map(word => {
            if (!word) return '';
            // If word is too long, let it break naturally
            if (word.length > this.config.maxWordLength) {
                return word;
            }
            // Wrap normal words in nowrap span to keep them together
            return `<span style="white-space:nowrap">${word}</span>`;
        });
        
        return wrapped.join(' ');
    }
}

