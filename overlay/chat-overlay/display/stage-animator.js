/**
 * StageAnimator - Handles stage entry and transition animations
 * Single Responsibility: Animate stage entry/exit and transitions to list
 */

class StageAnimator {
    constructor(config, chatView, stateManager) {
        // Validate dependencies
        if (!config) {
            throw new Error('StageAnimator: config is required');
        }
        if (!chatView) {
            throw new Error('StageAnimator: chatView is required');
        }
        if (!stateManager) {
            throw new Error('StageAnimator: stateManager is required');
        }
        
        this.config = config;
        this.chatView = chatView;
        this.stateManager = stateManager;
    }
    
    /**
     * Animate message entry to stage
     * @param {HTMLElement} messageEl - Message element
     * @param {Function} onStaged - Callback when message is staged (after bubble delay)
     */
    animateEntry(messageEl, onStaged) {
        // Force layout calculation to ensure correct size before fade-in
        void messageEl.offsetWidth;
        void messageEl.offsetHeight;
        
        setTimeout(() => {
            this.chatView.removeClass(messageEl, 'entering');
            this.chatView.addClass(messageEl, 'staged');
            this.stateManager.setMessageStagedTime(Date.now()); // Track when profile pic appears
            
            // Start stage timer AFTER bubble delay
            // Sequence: Profile pic appears → wait bubbleDelay → text appears → wait stageTime → transition to list
            setTimeout(() => {
                this.stateManager.setStageStartTime(Date.now()); // Stage timer starts after bubble delay
                this.stateManager.setTimeRemaining(this.config.settings.stageTime);
                
                // Call onStaged callback so controller can set up transition timeout
                if (onStaged) {
                    onStaged();
                }
            }, this.config.settings.bubbleDelay);
        }, 50);
    }
    
    /**
     * Transition staged message to list
     * @param {HTMLElement} messageEl - Staged message element
     * @param {string} listHTML - Formatted HTML for list message
     * @param {Function} onComplete - Callback when transition completes
     */
    transitionToList(messageEl, listHTML, onComplete) {
        if (!messageEl || !messageEl.parentNode) return;
        
        // Calculate position for new list message (before removing staged)
        let targetY = this.config.settings.listY;
        const messagesList = this.stateManager.getMessagesList();
        for (let i = 0; i < messagesList.length; i++) {
            targetY += messagesList[i].offsetHeight + this.config.settings.gap;
        }
        
        // Create new message element directly in list position (starts invisible)
        const listMessageEl = this.chatView.createListMessageElement(listHTML, targetY);
        
        this.chatView.appendToCanvas(listMessageEl);
        this.stateManager.addToMessagesList(listMessageEl);
        
        // Force reflow to ensure element is in DOM before starting fade
        void listMessageEl.offsetHeight;
        
        // Start fade out
        this.chatView.addClass(messageEl, 'fading-out');
        
        // Wait for fade in delay before starting fade in
        setTimeout(() => {
            // Trigger fade in by removing fading-in class (CSS will handle the transition)
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this.chatView.removeClass(listMessageEl, 'fading-in');
                });
            });
        }, this.config.settings.fadeInDelay);
        
        // Remove staged message after fade out completes
        setTimeout(() => {
            this.chatView.removeElement(messageEl);
            if (this.stateManager.getStagedMessage() === messageEl) {
                this.stateManager.clearStagedMessage();
            }
        }, this.config.settings.fadeOutDuration);
        
        // Clear staging flag so new messages can appear (after fade completes)
        setTimeout(() => {
            this.stateManager.resetStagingState();
        }, this.config.settings.fadeOutDuration);
        
        // Call onComplete callback with listMessageEl for position/background updates
        if (onComplete) {
            // Update positions and background immediately
            onComplete(listMessageEl);
            
            // Update background again after fade animations complete
            setTimeout(() => {
                onComplete(listMessageEl);
            }, this.config.settings.fadeOutDuration + this.config.settings.fadeInDuration);
        }
    }
}

