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
    BOX_RESIZE: 2000  // Testing: 2 seconds to see it clearly
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
     * Duration is proportional to the height change amount
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

            // Check current height
            const currentHeight = parseInt(this.box.style.height) || 180;
            
            // Calculate height difference
            const heightDifference = Math.abs(newHeight - currentHeight);
            
            // If no change, resolve immediately
            if (heightDifference === 0) {
                resolve();
                return;
            }

            // Calculate proportional duration
            // Max expected height difference: ~250px (e.g., 150px pregame to 400px other games)
            // Max duration for biggest resize: 500ms
            const MAX_HEIGHT_DIFF = 250;
            const MAX_DURATION = 500;
            
            // Scale duration based on actual height change
            const duration = Math.min(
                (heightDifference / MAX_HEIGHT_DIFF) * MAX_DURATION,
                MAX_DURATION
            );
            
            // Round to nearest 10ms for cleaner values
            const finalDuration = Math.round(duration / 10) * 10;

            // Set transition with calculated duration
            // Using cubic-bezier for more pronounced ease-out (starts fast, decelerates smoothly)
            this.box.style.transition = `top ${finalDuration / 1000}s cubic-bezier(0.25, 0.46, 0.45, 0.94), height ${finalDuration / 1000}s cubic-bezier(0.25, 0.46, 0.45, 0.94)`;

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
            }, finalDuration + 50);
            
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
     * Resize duration is proportional to height change, fade timings are fixed
     * @param {HTMLElement} oldContent - Content to hide
     * @param {HTMLElement} newContent - Content to show
     * @param {number} newHeight - New box height
     * @returns {Promise} Resolves after full transition completes
     */
    async transitionContent(oldContent, newContent, newHeight) {
        try {
            // Calculate resize duration based on height difference
            const currentHeight = parseInt(this.box.style.height) || 180;
            const heightDifference = Math.abs(newHeight - currentHeight);
            const MAX_HEIGHT_DIFF = 250;
            const MAX_DURATION = 500;
            const resizeDuration = Math.min(
                (heightDifference / MAX_HEIGHT_DIFF) * MAX_DURATION,
                MAX_DURATION
            );
            const finalResizeDuration = Math.round(resizeDuration / 10) * 10;
            
            // START: Fade out old content (don't wait)
            this.fadeOutContent(oldContent);
            
            // START: Resize box IMMEDIATELY (happens together with fade out)
            this.resizeBox(newHeight);
            
            // After fade out completes, swap content visibility
            setTimeout(() => {
                if (oldContent) {
                    oldContent.style.display = 'none';
                }
                if (newContent) {
                    newContent.style.display = 'block';
                    newContent.style.opacity = '0'; // Invisible but ready
                }
            }, TIMING.CONTENT_FADE_OUT); // Swap when fade out finishes (300ms)
            
            // After BOTH fade out AND resize complete, start fading in new content
            const whenToStartFadeIn = Math.max(TIMING.CONTENT_FADE_OUT, finalResizeDuration);
            await new Promise(resolve => {
                setTimeout(async () => {
                    await this.fadeInContent(newContent);
                    resolve();
                }, whenToStartFadeIn);
            });
            
        } catch (error) {
            console.error('UnifiedBoxAnimator: Error during transition:', error);
        }
    }

}

// Export constants for use in other files
UnifiedBoxAnimator.BOX_CENTER_Y = BOX_CENTER_Y;
UnifiedBoxAnimator.TIMING = TIMING;

