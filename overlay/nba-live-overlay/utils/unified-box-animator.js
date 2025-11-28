/**
 * UnifiedBoxAnimator - Manages unified overlay box animations
 * Single Responsibility: Handle box resize and content fade transitions
 * 
 * Implements center-based resizing where the box expands/contracts from its center point
 * without vertical jumping. Based on test-resize.html pattern.
 * 
 * @class
 */

// Height constants for different content types
const BOX_HEIGHTS = {
    // Current game states
    PREGAME: 150,
    LIVE: 180,
    LIVE_WITH_MVP: 365,  // Live + MVP section (180 + 185)
    HALFTIME: 180,
    FINAL: 180,
    
    // Other games (by count)
    OTHER_GAMES_1: 120,
    OTHER_GAMES_2: 250,
    OTHER_GAMES_3: 380
};

// Fixed center point (CSS top value - transform: translateY(-50%) handles the centering)
const BOX_CENTER_Y = 470;

// Animation timing (in milliseconds)
const TIMING = {
    CONTENT_FADE_OUT: 300,
    CONTENT_FADE_IN: 300,
    BOX_RESIZE: 400
};

class UnifiedBoxAnimator {
    constructor() {
        this.box = null;
    }

    /**
     * Initialize the animator with the box element
     * @param {HTMLElement} boxElement - The unified overlay box element
     */
    init(boxElement) {
        if (!boxElement) {
            throw new Error('UnifiedBoxAnimator: boxElement is required');
        }
        
        this.box = boxElement;
        
        // Set up CSS transitions on the box
        this.box.style.transition = `top ${TIMING.BOX_RESIZE / 1000}s ease-out, height ${TIMING.BOX_RESIZE / 1000}s ease-out`;
    }

    /**
     * Resize the box from its center point
     * @param {number} newHeight - New height in pixels
     * @returns {Promise} Resolves after resize animation completes
     */
    resizeBox(newHeight) {
        return new Promise((resolve) => {
            if (!this.box) {
                console.error('UnifiedBoxAnimator: Box not initialized');
                resolve();
                return;
            }

            // Check if already at target height
            const currentHeight = parseInt(this.box.style.height) || 180;
            if (currentHeight === newHeight) {
                resolve();
                return;
            }

            // Set up transitionend listener with fallback timeout
            let resolved = false;
            const handleEnd = (e) => {
                // Only respond to height property transitions
                if (e && e.propertyName !== 'height') return;
                
                if (!resolved) {
                    resolved = true;
                    resolve();
                }
            };

            // Listen for transition end
            this.box.addEventListener('transitionend', handleEnd, { once: true });
            
            // Fallback timeout in case transitionend doesn't fire
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    this.box.removeEventListener('transitionend', handleEnd);
                    resolve();
                }
            }, TIMING.BOX_RESIZE + 50);
            
            // Set new height (CSS transform keeps it centered automatically!)
            this.box.style.height = newHeight + 'px';
        });
    }

    /**
     * Fade out content
     * @param {HTMLElement} contentElement - Content to fade out
     * @returns {Promise} Resolves after fade completes
     */
    fadeOutContent(contentElement) {
        return new Promise((resolve) => {
            if (!contentElement) {
                resolve();
                return;
            }

            // Check if already faded out
            const currentOpacity = parseFloat(window.getComputedStyle(contentElement).opacity);
            if (currentOpacity === 0) {
                resolve();
                return;
            }

            // Set up transitionend listener with fallback
            let resolved = false;
            const handleEnd = (e) => {
                if (e && e.propertyName !== 'opacity') return;
                
                if (!resolved) {
                    resolved = true;
                    resolve();
                }
            };

            contentElement.addEventListener('transitionend', handleEnd, { once: true });
            
            // Fallback timeout
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    contentElement.removeEventListener('transitionend', handleEnd);
                    resolve();
                }
            }, TIMING.CONTENT_FADE_OUT + 50);

            contentElement.style.transition = `opacity ${TIMING.CONTENT_FADE_OUT / 1000}s ease`;
            contentElement.style.opacity = '0';
        });
    }

    /**
     * Fade in content
     * @param {HTMLElement} contentElement - Content to fade in
     * @returns {Promise} Resolves after fade completes
     */
    fadeInContent(contentElement) {
        return new Promise((resolve) => {
            if (!contentElement) {
                resolve();
                return;
            }

            // Check if already faded in
            const currentOpacity = parseFloat(window.getComputedStyle(contentElement).opacity);
            if (currentOpacity === 1) {
                resolve();
                return;
            }

            // Set up transitionend listener with fallback
            let resolved = false;
            const handleEnd = (e) => {
                if (e && e.propertyName !== 'opacity') return;
                
                if (!resolved) {
                    resolved = true;
                    resolve();
                }
            };

            contentElement.addEventListener('transitionend', handleEnd, { once: true });
            
            // Fallback timeout
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    contentElement.removeEventListener('transitionend', handleEnd);
                    resolve();
                }
            }, TIMING.CONTENT_FADE_IN + 50);

            contentElement.style.transition = `opacity ${TIMING.CONTENT_FADE_IN / 1000}s ease`;
            contentElement.style.opacity = '1';
        });
    }

    /**
     * Full transition: fade out old content, resize box, fade in new content
     * @param {HTMLElement} oldContent - Content to hide
     * @param {HTMLElement} newContent - Content to show
     * @param {number} newHeight - New box height
     * @returns {Promise} Resolves after full transition completes
     */
    async transitionContent(oldContent, newContent, newHeight) {
        try {
            // Step 1: Fade out old content
            await this.fadeOutContent(oldContent);
            
            // Step 2: Swap visibility (hide old, prepare new)
            if (oldContent) {
                oldContent.style.display = 'none';
            }
            if (newContent) {
                newContent.style.display = 'block';
                newContent.style.opacity = '0'; // Invisible but ready
            }
            
            // Step 3: Resize box from center
            await this.resizeBox(newHeight);
            
            // Step 4: Fade in new content
            await this.fadeInContent(newContent);
            
        } catch (error) {
            console.error('UnifiedBoxAnimator: Error during transition:', error);
        }
    }

    /**
     * Get height constant for a given number of other games
     * @param {number} gameCount - Number of games (1-3)
     * @returns {number} Height in pixels
     */
    static getOtherGamesHeight(gameCount) {
        if (gameCount === 1) return BOX_HEIGHTS.OTHER_GAMES_1;
        if (gameCount === 2) return BOX_HEIGHTS.OTHER_GAMES_2;
        return BOX_HEIGHTS.OTHER_GAMES_3;
    }

    /**
     * Get height constant for current game state
     * @param {string} stateName - Game state name
     * @param {boolean} hasMVP - Whether MVP is visible
     * @returns {number} Height in pixels
     */
    static getCurrentGameHeight(stateName, hasMVP = false) {
        if (hasMVP && stateName === 'live') {
            return BOX_HEIGHTS.LIVE_WITH_MVP;
        }
        
        switch (stateName) {
            case 'pregame':
                return BOX_HEIGHTS.PREGAME;
            case 'live':
                return BOX_HEIGHTS.LIVE;
            case 'halftime':
                return BOX_HEIGHTS.HALFTIME;
            case 'final':
                return BOX_HEIGHTS.FINAL;
            default:
                return BOX_HEIGHTS.LIVE; // Default fallback
        }
    }
}

// Export constants for use in other files
UnifiedBoxAnimator.BOX_HEIGHTS = BOX_HEIGHTS;
UnifiedBoxAnimator.BOX_CENTER_Y = BOX_CENTER_Y;
UnifiedBoxAnimator.TIMING = TIMING;

