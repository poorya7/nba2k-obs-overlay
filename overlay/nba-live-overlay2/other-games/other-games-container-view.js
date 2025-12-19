/**
 * OtherGamesContainerView - Handles show/hide of other games content
 * Single Responsibility: Manage other games content visibility and transitions
 * 
 * Now works with unified box - only manages content visibility
 */

class OtherGamesContainerView {
    constructor() {
        this.container = document.getElementById('otherGamesContent');
        
        // Validate critical DOM element exists
        if (!this.container) {
            throw new Error('OtherGamesContainerView: #otherGamesContent element not found in DOM');
        }
    }

    /**
     * Show the other games content (fade in)
     */
    show() {
        if (this.container) {
            this.container.style.display = 'block';
            this.container.style.opacity = '0';
            
            // Force reflow
            void this.container.offsetWidth;
            
            // Fade in
            this.container.style.transition = 'opacity 0.3s ease';
            this.container.style.opacity = '1';
        }
    }

    /**
     * Hide the other games content (fade out)
     */
    hide() {
        if (this.container) {
            this.container.style.transition = 'opacity 0.3s ease';
            this.container.style.opacity = '0';
            setTimeout(() => {
                if (this.container) {
                    this.container.style.display = 'none';
                }
            }, 300);
        }
    }

    /**
     * Check if container exists in DOM
     * @returns {boolean}
     */
    exists() {
        return this.container !== null;
    }
}

