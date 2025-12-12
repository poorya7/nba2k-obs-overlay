/**
 * SpotlightView - Handles all DOM updates for spotlight overlay
 * Single Responsibility: View layer only, no data fetching or business logic
 */

class SpotlightView {
    constructor(config) {
        if (!config) {
            throw new Error('SpotlightView: config is required');
        }
        
        this.config = config;
        
        // Cache DOM elements
        this.elements = {
            wrapper: null,
            container: null
        };
    }
    
    /**
     * Initialize DOM element references
     * @param {number} styleNum - Style number for element IDs
     */
    init(styleNum) {
        this.elements.wrapper = document.querySelector(`#chat-${styleNum} .chat-messages-wrapper`);
        this.elements.container = document.querySelector(`#chat-${styleNum} .chat-messages`);
        
        if (!this.elements.wrapper) {
            throw new Error(`SpotlightView: #chat-${styleNum} .chat-messages-wrapper not found`);
        }
        if (!this.elements.container) {
            throw new Error(`SpotlightView: #chat-${styleNum} .chat-messages not found`);
        }
    }
    
    /**
     * Get wrapper element (for scroll calculations)
     * @returns {HTMLElement}
     */
    getWrapper() {
        return this.elements.wrapper;
    }
    
    /**
     * Get container element
     * @returns {HTMLElement}
     */
    getContainer() {
        return this.elements.container;
    }
    
    /**
     * Create message element from formatted data
     * @param {Object} formattedMsg - Formatted message from data formatter
     * @param {boolean} isNewest - Whether this will be the newest message (gets profile pic)
     * @returns {HTMLElement}
     */
    createMessageElement(formattedMsg, isNewest = true) {
        const div = document.createElement('div');
        div.className = 'chat-message new-message';

        // Include profile picture ONLY for newest message (will be :last-child)
        // Flat structure: profile-pic, username, text as siblings (no wrapper)
        // This allows text to wrap around the floated profile pic using shape-outside
        let avatarHtml = '';
        if (isNewest && formattedMsg.avatar) {
            const avatarUrl = formattedMsg.avatar.trim();
            if (avatarUrl !== '') {
                avatarHtml = `<div class="profile-pic" style="background-image: url('${this._escapeHtml(avatarUrl)}'); background-size: cover; background-position: center;"></div>`;
            }
        }

        // Flat structure - username and text flow naturally around floated profile pic
        div.innerHTML = `${avatarHtml}<span class="chat-username username-${formattedMsg.color}">${formattedMsg.wrappedUsername}</span> <span class="chat-text">${formattedMsg.wrappedText}</span>`;

        return div;
    }
    
    /**
     * Escape HTML to prevent XSS
     * @private
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Append message to container
     * @param {HTMLElement} messageEl - Message element
     */
    appendMessage(messageEl) {
        this.elements.container.appendChild(messageEl);
        
        // Force reflow to ensure DOM is updated before any subsequent operations
        void messageEl.offsetHeight;
    }
    
    /**
     * Remove oldest message if over limit
     * Also removes profile pic from messages that are no longer newest
     * @param {number} maxMessages - Maximum messages to keep
     */
    removeOldMessages(maxMessages) {
        const messages = this.elements.container.querySelectorAll('.chat-message');
        if (messages.length > maxMessages) {
            messages[0].remove();
        }
        
        // Remove profile pics from all messages except the newest (last-child)
        // This ensures only the newest message has a profile pic
        // Use requestAnimationFrame to ensure DOM is fully updated
        requestAnimationFrame(() => {
            const currentMessages = this.elements.container.querySelectorAll('.chat-message');
            if (currentMessages.length > 0) {
                const lastIndex = currentMessages.length - 1;
                const chatOverlay = document.getElementById('chat-13');
                const activeStyle = chatOverlay ? Array.from(chatOverlay.classList).find(c => c.startsWith('profile-style-')) || 'none' : 'none';
                
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/788b04c6-dcca-4fb4-9a29-e41cad1eb37b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'view.js:removeOldMessages',message:'Removing old profile pics',data:{totalMessages:currentMessages.length,lastIndex,activeStyle},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
                
                currentMessages.forEach((msg, index) => {
                    // Keep profile pic only on the last message (newest)
                    if (index !== lastIndex) {
                        // Not the last message - remove profile pic if it exists
                        const profilePic = msg.querySelector('.profile-pic');
                        if (profilePic) {
                            profilePic.remove();
                        }
                    } else {
                        // #region agent log
                        const hasPic = !!msg.querySelector('.profile-pic');
                        fetch('http://127.0.0.1:7242/ingest/788b04c6-dcca-4fb4-9a29-e41cad1eb37b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'view.js:removeOldMessages',message:'Newest message check',data:{index,hasPic,activeStyle},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                        // #endregion
                    }
                });
            }
        });
    }
    
    /**
     * Clear all messages
     */
    clearMessages() {
        this.elements.container.innerHTML = '';
    }
    
    /**
     * Get message count
     * @returns {number}
     */
    getMessageCount() {
        return this.elements.container.querySelectorAll('.chat-message').length;
    }
    
    /**
     * Trigger fade-in animation for message
     * @param {HTMLElement} messageEl - Message element
     */
    fadeInMessage(messageEl) {
        // Force reflow
        void messageEl.offsetHeight;
        
        // Fade in by removing new-message class
        requestAnimationFrame(() => {
            messageEl.classList.remove('new-message');
        });
    }
    
    /**
     * Smooth scroll to bottom of wrapper
     * @param {number} duration - Animation duration in ms
     */
    smoothScrollToBottom(duration) {
        const wrapper = this.elements.wrapper;
        
        // Use double requestAnimationFrame to ensure DOM is fully updated
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const targetScroll = wrapper.scrollHeight - wrapper.clientHeight;
                this._smoothScrollTo(wrapper, targetScroll, duration);
            });
        });
    }
    
    // ========================================
    // Private helpers
    // ========================================
    
    /**
     * Smooth scroll animation - SLOW and gentle for ASMR
     * @param {HTMLElement} element - Element to scroll
     * @param {number} targetScroll - Target scroll position
     * @param {number} duration - Animation duration
     */
    _smoothScrollTo(element, targetScroll, duration) {
        const startScroll = element.scrollTop;
        const distance = targetScroll - startScroll;
        
        // If no distance to scroll, skip
        if (Math.abs(distance) < 1) return;
        
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease-out quad (gentler than cubic)
            const easeOut = 1 - Math.pow(1 - progress, 2);
            
            element.scrollTop = startScroll + (distance * easeOut);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
}

