/**
 * ChatView - Handles all DOM updates for the chat overlay
 * Single Responsibility: View layer only, no data fetching or business logic
 */

class ChatView {
    constructor(config) {
        // Validate dependencies
        if (!config) {
            throw new Error('ChatView: config is required');
        }
        
        this.config = config;
        
        // Cache DOM elements for performance
        this.elements = {
            canvas: document.getElementById('ghost-chat'),
            listBackground: document.getElementById('chat-list-bg')
        };
        
        // Validate critical DOM elements exist
        if (!this.elements.canvas) {
            throw new Error('ChatView: #ghost-chat element not found in DOM');
        }
    }
    
    /**
     * Get canvas element
     * @returns {HTMLElement}
     */
    getCanvas() {
        return this.elements.canvas;
    }
    
    /**
     * Create stage message element
     * @param {string} html - HTML content
     * @returns {HTMLElement} Message element
     */
    createStageMessageElement(html) {
        const messageEl = document.createElement('div');
        messageEl.className = 'message entering ghost-style';
        messageEl.innerHTML = `<div class="entry">${html}</div>`;
        return messageEl;
    }
    
    /**
     * Create list message element
     * @param {string} html - HTML content
     * @param {number} top - Top position
     * @returns {HTMLElement} Message element
     */
    createListMessageElement(html, top) {
        const listMessageEl = document.createElement('div');
        listMessageEl.className = 'message in-list ghost-style fading-in';
        listMessageEl.style.top = top + 'px';
        listMessageEl.style.left = this.config.settings.listOffsetX + 'px';
        listMessageEl.innerHTML = `<div class="entry">${html}</div>`;
        return listMessageEl;
    }
    
    /**
     * Append element to canvas
     * @param {HTMLElement} element - Element to append
     */
    appendToCanvas(element) {
        this.elements.canvas.appendChild(element);
    }
    
    /**
     * Remove element from DOM
     * @param {HTMLElement} element - Element to remove
     */
    removeElement(element) {
        if (element && element.parentNode) {
            element.remove();
        }
    }
    
    /**
     * Add class to element
     * @param {HTMLElement} element - Element
     * @param {string} className - Class name
     */
    addClass(element, className) {
        if (element) {
            element.classList.add(className);
        }
    }
    
    /**
     * Remove class from element
     * @param {HTMLElement} element - Element
     * @param {string} className - Class name
     */
    removeClass(element, className) {
        if (element) {
            element.classList.remove(className);
        }
    }
    
    /**
     * Check if element has class
     * @param {HTMLElement} element - Element
     * @param {string} className - Class name
     * @returns {boolean}
     */
    hasClass(element, className) {
        return element ? element.classList.contains(className) : false;
    }
    
    /**
     * Calculate total list height
     * @param {Array} messagesList - Array of message elements
     * @returns {number} Total height in pixels
     */
    calculateTotalListHeight(messagesList) {
        let total = 0;
        messagesList.forEach((el, index) => {
            if (!this.hasClass(el, 'exiting')) {
                total += el.offsetHeight;
                if (index < messagesList.length - 1) {
                    total += this.config.settings.gap;
                }
            }
        });
        return total;
    }
    
    /**
     * Update list message positions
     * @param {Array} messagesList - Array of message elements
     */
    updatePositions(messagesList) {
        let currentY = this.config.settings.listY;
        
        messagesList.forEach((el) => {
            if (!this.hasClass(el, 'exiting')) {
                el.style.top = currentY + 'px';
                el.style.left = this.config.settings.listOffsetX + 'px';
                el.style.position = 'absolute';
                currentY += el.offsetHeight + this.config.settings.gap;
            }
        });
    }
    
    /**
     * Update list background
     * @param {Array} messagesList - Array of message elements
     */
    updateBackground(messagesList) {
        const bgEl = this.elements.listBackground;
        if (!bgEl) return;
        
        // Get all visible messages (not exiting)
        const visibleMessages = messagesList.filter(el => !this.hasClass(el, 'exiting'));
        
        if (visibleMessages.length === 0) {
            bgEl.style.display = 'none';
            return;
        }
        
        // Get positions after animation completes - use exact positions
        const firstMessage = visibleMessages[0];
        const lastMessage = visibleMessages[visibleMessages.length - 1];
        
        const firstTop = parseFloat(firstMessage.style.top) || this.config.settings.listY;
        const lastTop = parseFloat(lastMessage.style.top) || this.config.settings.listY;
        const lastHeight = lastMessage.offsetHeight;
        
        // Calculate exact height: from first message top to last message bottom
        const totalHeight = visibleMessages.length === 1 
            ? firstMessage.offsetHeight 
            : (lastTop - firstTop) + lastHeight;
        
        if (totalHeight <= 0) {
            bgEl.style.display = 'none';
            return;
        }
        
        // Get background color values
        const hex = this.config.settings.bgColor;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        
        // Show and size the background with padding and alpha
        bgEl.style.display = 'block';
        bgEl.style.top = (firstTop - this.config.settings.listBgPadding) + 'px';
        bgEl.style.left = (this.config.settings.listOffsetX - this.config.settings.listBgPadding) + 'px';
        bgEl.style.width = (this.config.settings.listWidth + (this.config.settings.listBgPadding * 2)) + 'px';
        bgEl.style.height = (totalHeight + (this.config.settings.listBgPadding * 2)) + 'px';
        bgEl.style.padding = this.config.settings.listBgPadding + 'px';
        bgEl.style.background = `rgba(${r}, ${g}, ${b}, ${this.config.settings.listBgAlpha})`;
    }
}

