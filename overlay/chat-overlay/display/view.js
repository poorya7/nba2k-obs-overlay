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
            container: null,
            stage: null
        };
    }
    
    /**
     * Initialize DOM element references
     * @param {number} styleNum - Style number for element IDs
     */
    init(styleNum) {
        this.elements.wrapper = document.querySelector(`#chat-${styleNum} .chat-messages-wrapper`);
        this.elements.container = document.querySelector(`#chat-${styleNum} .chat-messages`);
        this.elements.stage = document.querySelector(`#chat-${styleNum} .chat-stage`);
        
        if (!this.elements.wrapper) {
            throw new Error(`SpotlightView: #chat-${styleNum} .chat-messages-wrapper not found`);
        }
        if (!this.elements.container) {
            throw new Error(`SpotlightView: #chat-${styleNum} .chat-messages not found`);
        }
        if (!this.elements.stage) {
            throw new Error(`SpotlightView: #chat-${styleNum} .chat-stage not found`);
        }
        
        // Initialize stage position
        this.updateStagePosition();
    }
    
    /**
     * Get stage element
     * @returns {HTMLElement}
     */
    getStage() {
        return this.elements.stage;
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
     * Update stage position to appear right after the last message
     * Called after messages are added/removed
     */
    updateStagePosition() {
        const wrapper = this.elements.wrapper;
        const container = this.elements.container;
        const stage = this.elements.stage;
        
        if (!wrapper || !container || !stage) return;
        
        // Get actual content height (messages)
        const contentHeight = container.scrollHeight;
        
        // Get wrapper height
        const wrapperHeight = wrapper.clientHeight;
        
        // Stage should appear at min(contentHeight, wrapperHeight)
        const stageTop = Math.min(contentHeight, wrapperHeight);
        
        // Apply as margin-top (offset from where flexbox would place it)
        // Since stage is after wrapper in flexbox, and wrapper has fixed height,
        // we need negative margin to pull it up when content is less than wrapper height
        const pullUp = wrapperHeight - stageTop;
        stage.style.marginTop = pullUp > 0 ? `-${pullUp}px` : '0px';
    }
    
    /**
     * Create stage message element (separate from list)
     * @param {Object} formattedMsg - Formatted message from data formatter
     * @returns {HTMLElement}
     */
    createStageMessage(formattedMsg) {
        const div = document.createElement('div');
        div.className = 'chat-stage-message stage-enter';

        // Include profile picture
        let avatarHtml = '';
        if (formattedMsg.avatar) {
            const avatarUrl = formattedMsg.avatar.trim();
            if (avatarUrl !== '') {
                const proxyUrl = this._getProxyUrl(avatarUrl);
                avatarHtml = `<div class="profile-pic" style="background-image: url('${this._escapeHtml(proxyUrl)}');"></div>`;
            }
        }

        div.innerHTML = `${avatarHtml}<span class="chat-username username-${formattedMsg.color}">${formattedMsg.wrappedUsername}</span> <span class="chat-text">${formattedMsg.wrappedText}</span>`;

        return div;
    }
    
    /**
     * Create list message element (separate from stage)
     * @param {Object} formattedMsg - Formatted message from data formatter
     * @returns {HTMLElement}
     */
    createListMessage(formattedMsg) {
        const div = document.createElement('div');
        div.className = 'chat-message new-message';

        // No profile pic in list
        div.innerHTML = `<span class="chat-username username-${formattedMsg.color}">${formattedMsg.wrappedUsername}</span> <span class="chat-text">${formattedMsg.wrappedText}</span>`;

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
     * Convert avatar URL to proxy URL to bypass CORS
     * @private
     */
    _getProxyUrl(avatarUrl) {
        if (!avatarUrl || avatarUrl.trim() === '') {
            return '';
        }
        // Use local server proxy to bypass CORS
        return `http://localhost:3000/api/image-proxy?url=${encodeURIComponent(avatarUrl)}`;
    }
    
    /**
     * Show stage message (separate from list)
     * @param {HTMLElement} stageEl - Stage message element
     */
    showStageMessage(stageEl) {
        // Clear any existing stage message
        this.clearStage();
        
        this.elements.stage.appendChild(stageEl);
        
        // Force reflow
        void stageEl.offsetHeight;
        
        // Update stage position to follow messages
        this.updateStagePosition();
    }
    
    /**
     * Exit stage message (animate out)
     * @param {HTMLElement} stageEl - Stage message element
     * @param {Function} callback - Called when exit animation completes
     */
    exitStageMessage(stageEl, callback) {
        if (!stageEl || !stageEl.parentNode) {
            if (callback) callback();
            return;
        }
        
        stageEl.classList.remove('stage-enter');
        stageEl.classList.add('stage-exit');
        
        // Remove after animation
        const duration = 1000; // Max animation duration
        setTimeout(() => {
            if (stageEl.parentNode) {
                stageEl.remove();
            }
            if (callback) callback();
        }, duration);
    }
    
    /**
     * Clear stage (remove all stage messages)
     */
    clearStage() {
        this.elements.stage.innerHTML = '';
    }
    
    /**
     * Append message to list container
     * @param {HTMLElement} messageEl - Message element
     */
    appendMessage(messageEl) {
        // Save current scroll position BEFORE adding message
        const wrapper = this.elements.wrapper;
        const scrollBefore = wrapper.scrollTop;
        
        // Add the message
        this.elements.container.appendChild(messageEl);
        
        // Force reflow to ensure DOM is updated
        void messageEl.offsetHeight;
        
        // Restore scroll position to prevent browser auto-jump
        wrapper.scrollTop = scrollBefore;
    }
    
    /**
     * Remove oldest message if over limit
     * @param {number} maxMessages - Maximum messages to keep
     */
    removeOldMessages(maxMessages) {
        const messages = this.elements.container.querySelectorAll('.chat-message');
        if (messages.length > maxMessages) {
            messages[0].remove();
        }
    }
    
    /**
     * Clear all messages
     */
    clearMessages() {
        this.elements.container.innerHTML = '';
        this.updateStagePosition();
    }

    /**
     * Clear spotlight (no longer needed - stage and list are separate)
     */
    clearSpotlight() {
        // Stage and list are now separate, so this is handled by exitStageMessage
    }
    
    /**
     * Get message count
     * @returns {number}
     */
    getMessageCount() {
        return this.elements.container.querySelectorAll('.chat-message').length;
    }
    
    /**
     * Trigger fade-in animation for list message
     * @param {HTMLElement} messageEl - Message element
     */
    fadeInMessage(messageEl) {
        // Force reflow to ensure initial state is applied
        void messageEl.offsetHeight;
        
        // Use double requestAnimationFrame for smooth animation start
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                // Remove new-message class to trigger animation
                messageEl.classList.remove('new-message');
            });
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
            
            // Ease-in-out sine - very smooth and gentle, no sudden movements
            const easeInOutSine = -(Math.cos(Math.PI * progress) - 1) / 2;
            
            element.scrollTop = startScroll + (distance * easeInOutSine);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
}

