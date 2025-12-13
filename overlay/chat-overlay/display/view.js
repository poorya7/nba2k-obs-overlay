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
            stage: null,
            stageBox: null  // Persistent stage message box
        };
        
        // Track if box is visible
        this.isBoxVisible = false;
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
        
        // Create persistent stage box
        this._createPersistentStageBox();
        
        // Initialize stage position
        this.updateStagePosition();
    }
    
    /**
     * Create the persistent stage message box (called once on init)
     * @private
     */
    _createPersistentStageBox() {
        const box = document.createElement('div');
        box.className = 'chat-stage-message hidden';
        this.elements.stage.appendChild(box);
        this.elements.stageBox = box;
        this.isBoxVisible = false;
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
     * Create stage content element (goes inside the persistent box)
     * @param {Object} formattedMsg - Formatted message from data formatter
     * @returns {HTMLElement}
     */
    createStageContent(formattedMsg) {
        const content = document.createElement('div');
        content.className = 'stage-content content-enter';

        // Include profile picture
        let avatarHtml = '';
        if (formattedMsg.avatar) {
            const avatarUrl = formattedMsg.avatar.trim();
            if (avatarUrl !== '') {
                const proxyUrl = this._getProxyUrl(avatarUrl);
                avatarHtml = `<div class="profile-pic" style="background-image: url('${this._escapeHtml(proxyUrl)}');"></div>`;
            }
        }

        content.innerHTML = `${avatarHtml}<span class="chat-username username-${formattedMsg.color}">${formattedMsg.wrappedUsername}</span> <span class="chat-text">${formattedMsg.wrappedText}</span>`;

        return content;
    }
    
    /**
     * @deprecated Use createStageContent instead
     */
    createStageMessage(formattedMsg) {
        return this.createStageContent(formattedMsg);
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
     * Show stage content (adds content to persistent box)
     * @param {HTMLElement} contentEl - Stage content element
     * @param {Function} callback - Called when enter animation completes
     */
    showStageContent(contentEl, callback) {
        const box = this.elements.stageBox;
        if (!box) return;
        
        // Don't remove existing content - let it finish its exit animation
        // Both contents can coexist briefly (old fading out, new fading in)
        
        // Show the box if hidden
        if (!this.isBoxVisible) {
            box.classList.remove('hidden');
            this.isBoxVisible = true;
        }
        
        // Remove animation class temporarily - we'll add it after layout
        contentEl.classList.remove('content-enter');
        
        // Make invisible but layoutable (not display:none)
        contentEl.style.visibility = 'hidden';
        contentEl.style.opacity = '0';
        
        // Add to DOM for layout calculation
        box.appendChild(contentEl);
        
        // Force reflow - let browser fully layout text wrapping etc
        void contentEl.offsetHeight;
        
        // Measure and set height for smooth transitions
        const newHeight = contentEl.offsetHeight;
        box.style.height = newHeight + 'px';
        
        // Update stage position
        this.updateStagePosition();
        
        // Now make visible and trigger animation
        // Use setTimeout instead of RAF for OBS browser source compatibility
        setTimeout(() => {
            contentEl.style.visibility = '';
            contentEl.style.opacity = '';
            contentEl.classList.add('content-enter');
            
            // Callback after animation completes
            if (callback) {
                const animDuration = 900;
                setTimeout(callback, animDuration);
            }
        }, 0);
    }
    
    /**
     * @deprecated Use showStageContent instead
     */
    showStageMessage(stageEl) {
        this.showStageContent(stageEl);
    }
    
    /**
     * Exit stage content (animate content out, keep box)
     * @param {HTMLElement} contentEl - Content element to exit (optional, exits current if not provided)
     * @param {Function} callback - Called when exit animation completes
     */
    exitStageContent(contentEl, callback) {
        const box = this.elements.stageBox;
        if (!box) {
            if (callback) callback();
            return;
        }
        
        // Find content to exit
        const content = contentEl || box.querySelector('.stage-content');
        if (!content) {
            if (callback) callback();
            return;
        }
        
        // Make exiting content absolutely positioned so it doesn't affect layout
        // This allows new content to enter without being pushed down
        content.style.position = 'absolute';
        content.style.top = '0';
        content.style.left = '0';
        content.style.right = '0';
        
        // Animate content out
        content.classList.remove('content-enter');
        content.classList.add('content-exit');
        
        // Remove content after animation, but keep box
        const exitDuration = 700; // Match CSS exit animation duration
        setTimeout(() => {
            if (content.parentNode) {
                content.remove();
            }
            if (callback) callback();
        }, exitDuration);
    }
    
    /**
     * @deprecated Use exitStageContent instead  
     */
    exitStageMessage(stageEl, callback) {
        this.exitStageContent(stageEl, callback);
    }
    
    /**
     * Swap stage content - exit current, enter new (with smooth box resize)
     * @param {HTMLElement} newContentEl - New content element
     * @param {Function} callback - Called when swap is complete
     */
    swapStageContent(newContentEl, callback) {
        const box = this.elements.stageBox;
        if (!box) {
            if (callback) callback();
            return;
        }
        
        const currentContent = box.querySelector('.stage-content');
        
        if (!currentContent) {
            // No current content, just show new
            this.showStageContent(newContentEl, callback);
            return;
        }
        
        // Exit current content
        this.exitStageContent(currentContent, () => {
            // After exit, measure and animate to new size
            this._animateBoxToNewContent(newContentEl, callback);
        });
    }
    
    /**
     * Animate box size to fit new content, then show it
     * @private
     */
    _animateBoxToNewContent(newContentEl, callback) {
        const box = this.elements.stageBox;
        
        // Temporarily add content invisibly to measure
        newContentEl.style.visibility = 'hidden';
        newContentEl.style.position = 'absolute';
        box.appendChild(newContentEl);
        
        // Force reflow and measure - scrollHeight includes padding
        void newContentEl.offsetHeight;
        const newHeight = newContentEl.offsetHeight;
        
        // Reset positioning
        newContentEl.style.visibility = '';
        newContentEl.style.position = '';
        
        // Animate box height
        box.style.height = newHeight + 'px';
        
        // Show content with enter animation
        newContentEl.classList.add('content-enter');
        
        // Update stage position
        this.updateStagePosition();
        
        if (callback) {
            const animDuration = 900;
            setTimeout(callback, animDuration);
        }
    }
    
    /**
     * Hide the stage box completely
     * @param {Function} callback - Called when box is hidden
     */
    hideStageBox(callback) {
        const box = this.elements.stageBox;
        if (!box) {
            if (callback) callback();
            return;
        }
        
        // First exit any content
        const content = box.querySelector('.stage-content');
        if (content) {
            this.exitStageContent(content, () => {
                box.classList.add('hidden');
                box.style.height = '';
                this.isBoxVisible = false;
                if (callback) callback();
            });
        } else {
            box.classList.add('hidden');
            box.style.height = '';
            this.isBoxVisible = false;
            if (callback) callback();
        }
    }
    
    /**
     * Clear stage content (but keep box)
     */
    clearStage() {
        const box = this.elements.stageBox;
        if (box) {
            box.innerHTML = '';
        }
    }
    
    /**
     * Get current stage content element
     * @returns {HTMLElement|null}
     */
    getCurrentStageContent() {
        const box = this.elements.stageBox;
        return box ? box.querySelector('.stage-content') : null;
    }
    
    /**
     * Append message to list container (no scroll adjustment here)
     * @param {HTMLElement} messageEl - Message element
     */
    appendMessage(messageEl) {
        // Add the message
        this.elements.container.appendChild(messageEl);
        
        // Force reflow to ensure DOM is updated
        void messageEl.offsetHeight;
    }
    
    /**
     * Add message to list with coordinated smooth scroll and fade
     * Message starts with no height, then expands + fades in via CSS transition
     * @param {HTMLElement} messageEl - Message element
     * @param {number} scrollDuration - Duration for scroll animation
     */
    addMessageWithSmoothScroll(messageEl, scrollDuration) {
        const wrapper = this.elements.wrapper;
        const container = this.elements.container;
        
        // Add the message (invisible AND takes no space due to new-message class)
        container.appendChild(messageEl);
        
        // Force reflow so browser registers the initial state
        void messageEl.offsetHeight;
        
        // Remove new-message class to trigger CSS transition (height + opacity)
        // The message will smoothly grow into existence
        // Use setTimeout instead of RAF for OBS browser source compatibility
        setTimeout(() => {
            messageEl.classList.remove('new-message');
            
            // Continuously scroll to bottom as the message expands
            this._scrollDuringExpand(wrapper, scrollDuration);
        }, 0);
    }
    
    /**
     * Keep scrolling to bottom during message expand animation
     * Also updates stage position continuously as content grows
     * Uses setInterval instead of RAF for OBS browser source compatibility
     * @private
     */
    _scrollDuringExpand(wrapper, duration) {
        const startTime = performance.now();
        const startScroll = wrapper.scrollTop;
        const intervalMs = 16; // ~60fps
        
        const intervalId = setInterval(() => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Keep scrolling to bottom as content grows
            const targetScroll = wrapper.scrollHeight - wrapper.clientHeight;
            
            // Calculate distance from start to current target
            const distance = targetScroll - startScroll;
            
            // Ease the scroll - interpolate from start to target
            const easeInOutSine = -(Math.cos(Math.PI * progress) - 1) / 2;
            
            wrapper.scrollTop = startScroll + (distance * easeInOutSine);
            
            // Update stage position as content grows
            this.updateStagePosition();
            
            if (progress >= 1) {
                clearInterval(intervalId);
            }
        }, intervalMs);
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
     * Clear all messages and reset stage
     */
    clearMessages() {
        this.elements.container.innerHTML = '';
        
        // Reset the stage box
        if (this.elements.stageBox) {
            this.elements.stageBox.innerHTML = '';
            this.elements.stageBox.classList.add('hidden');
            this.elements.stageBox.style.height = '';
            this.isBoxVisible = false;
        }
        
        this.updateStagePosition();
    }

    /**
     * Clear spotlight (hides the stage box)
     */
    clearSpotlight() {
        this.hideStageBox();
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
        
        // Use setTimeout instead of RAF for OBS browser source compatibility
        setTimeout(() => {
            // Remove new-message class to trigger animation
            messageEl.classList.remove('new-message');
        }, 0);
    }
    
    /**
     * Smooth scroll to bottom of wrapper
     * @param {number} duration - Animation duration in ms
     */
    smoothScrollToBottom(duration) {
        const wrapper = this.elements.wrapper;
        
        // Use setTimeout instead of RAF for OBS browser source compatibility
        setTimeout(() => {
            const targetScroll = wrapper.scrollHeight - wrapper.clientHeight;
            this._smoothScrollTo(wrapper, targetScroll, duration);
        }, 0);
    }
    
    // ========================================
    // Private helpers
    // ========================================
    
    /**
     * Smooth scroll animation - SLOW and gentle for ASMR
     * Uses setInterval instead of RAF for OBS browser source compatibility
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
        const intervalMs = 16; // ~60fps
        
        const intervalId = setInterval(() => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease-in-out sine - very smooth and gentle, no sudden movements
            const easeInOutSine = -(Math.cos(Math.PI * progress) - 1) / 2;
            
            element.scrollTop = startScroll + (distance * easeInOutSine);
            
            if (progress >= 1) {
                clearInterval(intervalId);
            }
        }, intervalMs);
    }
}

