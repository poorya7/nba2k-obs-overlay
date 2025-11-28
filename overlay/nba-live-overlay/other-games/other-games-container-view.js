/**
 * OtherGamesContainerView - Handles show/hide of other games overlay container
 * Single Responsibility: Manage container visibility and transitions
 * 
 * This extracts DOM manipulation from ModeCoordinator
 */

class OtherGamesContainerView {
    constructor() {
        this.container = document.getElementById('other-games');
        
        // Validate critical DOM element exists
        if (!this.container) {
            throw new Error('OtherGamesContainerView: #other-games element not found in DOM');
        }
    }

    /**
     * Show the other games overlay container
     */
    show() {
        if (this.container) {
            this.container.style.display = 'block';
            this.container.style.opacity = '1';
        }
    }

    /**
     * Hide the other games overlay container with fade
     */
    hide() {
        if (this.container) {
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

