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
     * @returns {HTMLElement}
     */
    createMessageElement(formattedMsg) {
        const div = document.createElement('div');
        div.className = 'chat-message new-message';
        
        const separator = formattedMsg.needsLineBreak ? '<br>' : ' ';
        
        div.innerHTML = `<span class="chat-username username-${formattedMsg.color}">${formattedMsg.wrappedUsername}</span>${separator}<span class="chat-text">${formattedMsg.wrappedText}</span>`;
        
        return div;
    }
    
    /**
     * Append message to container
     * @param {HTMLElement} messageEl - Message element
     */
    appendMessage(messageEl) {
        this.elements.container.appendChild(messageEl);
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

