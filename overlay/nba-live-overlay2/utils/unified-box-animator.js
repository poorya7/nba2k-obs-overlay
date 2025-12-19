/**
 * UnifiedBoxAnimator - Manages unified overlay box animations
 * Single Responsibility: Handle box resize and content fade transitions
 * 
 * Implements center-based resizing where the box expands/contracts from its center point
 * without vertical jumping. Based on test-resize.html pattern.
 * 
 * @class
 */

// Fixed center point (CSS top value - transform: translateY(-50%) handles the centering)
const BOX_CENTER_Y = 470;

// Animation timing (in milliseconds)
const TIMING = {
    CONTENT_FADE_OUT: 300,
    CONTENT_FADE_IN: 300,
    // Box resize timing (proportional to height change)
    RESIZE_MAX_HEIGHT_DIFF: 250,  // Max expected height difference in pixels
    RESIZE_MAX_DURATION: 800       // Max duration for largest resize (800ms)
};

class UnifiedBoxAnimator {
    constructor() {
        this.otherGamesBox = null;
    }

    /**
     * Initialize the animator with the other games box element
     * @param {HTMLElement} otherGamesBoxElement - The other games box element
     */
    init(otherGamesBoxElement) {
        if (!otherGamesBoxElement) {
            throw new Error('UnifiedBoxAnimator: otherGamesBoxElement is required');
        }
        
        this.otherGamesBox = otherGamesBoxElement;
        
        // Note: Transition timing is set dynamically in resizeBox() based on height change
    }

    /**
     * Resize the box from its center point
     * Duration is proportional to the height change amount
     * @param {number} newHeight - New height in pixels
     * @returns {Promise} Resolves after resize animation completes
     */
    resizeBox(newHeight) {
        return new Promise((resolve) => {
            if (!this.otherGamesBox) {
                resolve();
                return;
            }

            // Check current height
            const currentHeight = parseInt(this.otherGamesBox.style.height) || 180;
            
            // Calculate height difference
            const heightDifference = Math.abs(newHeight - currentHeight);
            
            // If no change, resolve immediately
            if (heightDifference === 0) {
                resolve();
                return;
            }

            // Calculate proportional duration using centralized constants
            const duration = Math.min(
                (heightDifference / TIMING.RESIZE_MAX_HEIGHT_DIFF) * TIMING.RESIZE_MAX_DURATION,
                TIMING.RESIZE_MAX_DURATION
            );
            
            // Round to nearest 10ms for cleaner values
            const finalDuration = Math.round(duration / 10) * 10;

            // Set transition with calculated duration
            // Using cubic-bezier for more pronounced ease-out (starts fast, decelerates smoothly)
            this.otherGamesBox.style.transition = `top ${finalDuration / 1000}s cubic-bezier(0.25, 0.46, 0.45, 0.94), height ${finalDuration / 1000}s cubic-bezier(0.25, 0.46, 0.45, 0.94)`;

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
            this.otherGamesBox.addEventListener('transitionend', handleEnd, { once: true });
            
            // Fallback timeout in case transitionend doesn't fire
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    this.otherGamesBox.removeEventListener('transitionend', handleEnd);
                    resolve();
                }
            }, finalDuration + 50);
            
            // Set new height (CSS transform keeps it centered automatically!)
            this.otherGamesBox.style.height = newHeight + 'px';
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
     * @param {number} duration - Custom duration in ms (optional, defaults to TIMING.CONTENT_FADE_IN)
     * @returns {Promise} Resolves after fade completes
     */
    fadeInContent(contentElement, duration = TIMING.CONTENT_FADE_IN) {
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
            }, duration + 50);

            contentElement.style.transition = `opacity ${duration / 1000}s ease`;
            contentElement.style.opacity = '1';
        });
    }

    /**
     * Fade out the entire box (background + content)
     * @param {number} duration - Fade duration in ms (optional, defaults to TIMING.CONTENT_FADE_OUT)
     * @returns {Promise} Resolves after fade completes
     */
    fadeOutBox(duration = TIMING.CONTENT_FADE_OUT) {
        return new Promise((resolve) => {
            if (!this.box) {
                resolve();
                return;
            }

            // Check if already faded out
            const currentOpacity = parseFloat(window.getComputedStyle(this.box).opacity);
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

            this.otherGamesBox.addEventListener('transitionend', handleEnd, { once: true });
            
            // Fallback timeout
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    this.otherGamesBox.removeEventListener('transitionend', handleEnd);
                    resolve();
                }
            }, duration + 50);

            this.otherGamesBox.style.transition = `opacity ${duration / 1000}s ease`;
            this.otherGamesBox.style.opacity = '0';
        });
    }

    /**
     * Fade in the entire box (background + content)
     * @param {number} duration - Fade duration in ms (optional, defaults to TIMING.CONTENT_FADE_IN)
     * @returns {Promise} Resolves after fade completes
     */
    fadeInBox(duration = TIMING.CONTENT_FADE_IN) {
        return new Promise((resolve) => {
            if (!this.box) {
                resolve();
                return;
            }

            // Check if already faded in
            const currentOpacity = parseFloat(window.getComputedStyle(this.box).opacity);
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

            this.otherGamesBox.addEventListener('transitionend', handleEnd, { once: true });
            
            // Fallback timeout
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    this.otherGamesBox.removeEventListener('transitionend', handleEnd);
                    resolve();
                }
            }, duration + 50);

            this.otherGamesBox.style.transition = `opacity ${duration / 1000}s ease`;
            this.otherGamesBox.style.opacity = '1';
        });
    }

    /**
     * Full transition: fade out old content, resize box, fade in new content
     * Resize duration is proportional to height change, fade timings are fixed
     * @param {HTMLElement} oldContent - Content to hide
     * @param {HTMLElement} newContent - Content to show
     * @param {number} newHeight - New box height
     * @returns {Promise} Resolves after full transition completes
     */
    async transitionContent(oldContent, newContent, newHeight) {
        try {
            // Calculate resize duration FIRST (so we can match fade-in to it)
            const currentHeight = parseInt(this.otherGamesBox.style.height) || 180;
            const heightDifference = Math.abs(newHeight - currentHeight);
            const resizeDuration = Math.min(
                (heightDifference / TIMING.RESIZE_MAX_HEIGHT_DIFF) * TIMING.RESIZE_MAX_DURATION,
                TIMING.RESIZE_MAX_DURATION
            );
            const finalResizeDuration = Math.round(resizeDuration / 10) * 10;
            
            // START: Fade out immediately, resize starts slightly after (200ms stagger)
            const fadeOutPromise = this.fadeOutContent(oldContent);
            const resizePromise = new Promise(resolve => {
                setTimeout(async () => {
                    await this.resizeBox(newHeight);
                    resolve();
                }, 200);
            });
            
            // After fade-out completes: swap content and start fade-in (with 200ms delay)
            // Fade-in duration MATCHES resize duration for smooth synchronized movement!
            const fadeInPromise = new Promise(resolve => {
                setTimeout(async () => {
                    // Swap DOM visibility
                    if (oldContent) {
                        oldContent.style.display = 'none';
                    }
                    if (newContent) {
                        newContent.style.display = 'block';
                        newContent.style.opacity = '0';
                    }
                    
                    // Wait 200ms before starting fade-in
                    await new Promise(r => setTimeout(r, 200));
                    
                    // Fade-in with same duration as resize (they move together!)
                    await this.fadeInContent(newContent, finalResizeDuration);
                    resolve();
                }, TIMING.CONTENT_FADE_OUT);
            });
            
            // Wait for all animations to complete
            await Promise.all([fadeOutPromise, resizePromise, fadeInPromise]);
            
        } catch (error) {
            // Silent error handling
        }
    }

    /**
     * Mode transition: fade out entire box, resize + swap content instantly, fade in entire box
     * Used when switching between CURRENT_GAME and OTHER_GAMES modes
     * @param {HTMLElement} oldContent - Content to hide
     * @param {HTMLElement} newContent - Content to show
     * @param {number} newHeight - New box height
     * @returns {Promise} Resolves after full transition completes
     */
    async transitionModes(oldContent, newContent, newHeight) {
        try {
            const MODE_TRANSITION_DURATION = 800; // Slower fade for mode transitions (800ms)
            
            // Fade out entire box (background + content)
            await this.fadeOutBox(MODE_TRANSITION_DURATION);
            
            // While invisible: swap content and resize box instantly
            if (oldContent) {
                oldContent.style.display = 'none';
            }
            if (newContent) {
                newContent.style.display = 'block';
                newContent.style.opacity = '1'; // Content should be visible when box fades in
            }
            
            // NOTE: transitionModes is no longer used with the two-box system
            // Keeping for backwards compatibility but this method should not be called
            
        } catch (error) {
            // Silent error handling
        }
    }

}

// Export constants for use in other files
UnifiedBoxAnimator.BOX_CENTER_Y = BOX_CENTER_Y;
UnifiedBoxAnimator.TIMING = TIMING;

