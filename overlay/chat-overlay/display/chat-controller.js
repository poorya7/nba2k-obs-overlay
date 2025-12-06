/**
 * ChatController - Main orchestration for the chat overlay
 * Single Responsibility: Coordinate between data sources, state, and views
 * 
 * @class
 * @param {Object} dependencies - Dependency injection object
 * @param {ChatView} dependencies.chatView - Chat display view
 * @param {ChatStateManager} dependencies.stateManager - State management
 * @param {ChatDataFormatter} dependencies.dataFormatter - Data formatter
 * @param {StageAnimator} dependencies.stageAnimator - Stage animations
 * @param {Object} dependencies.config - Configuration object
 */

class ChatController {
    /**
     * @param {Object} dependencies - Dependency injection object
     */
    constructor(dependencies) {
        // Validate dependencies
        if (!dependencies) {
            throw new Error('ChatController: dependencies object is required');
        }
        
        const required = ['chatView', 'stateManager', 'dataFormatter', 'stageAnimator', 'config'];
        
        for (const dep of required) {
            if (!dependencies[dep]) {
                throw new Error(`ChatController: ${dep} dependency is required`);
            }
        }
        
        // Dependencies (injected for loose coupling)
        this.chatView = dependencies.chatView;
        this.stateManager = dependencies.stateManager;
        this.dataFormatter = dependencies.dataFormatter;
        this.stageAnimator = dependencies.stageAnimator;
        this.config = dependencies.config;
        
        // Server polling
        this.serverPollInterval = null;
        this.displayedMessageIds = new Set(); // Track displayed message IDs to prevent duplicates
    }
    
    /**
     * Start the chat overlay (call once on page load)
     * @returns {void}
     */
    start() {
        this.updateStyles();
        this.updateFadeAnimations();
        
        // Pre-populate initial messages from server
        this.prePopulate();
        
        // Start server polling
        this.serverPollInterval = setInterval(() => {
            this.pollServerMessages();
        }, 200); // 200ms (5 polls per second)
    }
    
    /**
     * Stop the chat overlay (cleanup all timers and resources)
     * @returns {void}
     */
    stop() {
        // Stop server polling interval
        if (this.serverPollInterval) {
            clearInterval(this.serverPollInterval);
            this.serverPollInterval = null;
        }
        
        // Clear stage timeout
        const stageTimeout = this.stateManager.getCurrentStageTimeout();
        if (stageTimeout) {
            clearTimeout(stageTimeout);
            this.stateManager.clearCurrentStageTimeout();
        }
    }
    
    /**
     * Poll server for new chat messages (reuses test page logic)
     * @returns {Promise<void>}
     */
    async pollServerMessages() {
        try {
            const response = await fetch('http://localhost:3000/api/chat');
            const data = await response.json();
            
            if (data.messages && data.messages.length > 0) {
                // Filter out already displayed messages and sort by timestamp (oldest first)
                const newMessages = data.messages
                    .filter(serverMsg => !this.displayedMessageIds.has(serverMsg.id))
                    .sort((a, b) => {
                        const timestampA = a.timestamp || 0;
                        const timestampB = b.timestamp || 0;
                        return timestampA - timestampB; // Oldest first
                    });
                
                // Process each message in timestamp order
                newMessages.forEach(serverMsg => {
                    // Convert server format to overlay format
                    // Use textHtml if available (for emojis), fallback to text
                    const text = serverMsg.textHtml || serverMsg.text || '';
                    
                    // Display the message using existing animation system
                    // Pass the message ID so we can mark it as displayed AFTER successful display
                    const wasDisplayed = this.displayNewChat({
                        username: serverMsg.username,
                        text: text,
                        avatar: serverMsg.avatar || '',
                        badges: serverMsg.badges || null,
                        id: serverMsg.id // Pass ID for tracking
                    });
                    
                    // Only mark as displayed if the message was actually shown
                    // (not skipped due to staging/pause state)
                    if (wasDisplayed && serverMsg.id) {
                        this.displayedMessageIds.add(serverMsg.id);
                        
                        // Keep displayed IDs manageable (only last 500)
                        if (this.displayedMessageIds.size > 500) {
                            const idsArray = Array.from(this.displayedMessageIds);
                            this.displayedMessageIds = new Set(idsArray.slice(-500));
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Error fetching messages from server:', error);
            // Don't break overlay if server is unavailable - just silently fail
        }
    }
    
    /**
     * Calculate dynamic stage time based on text length
     * Base: "put wane back in" (17 chars) = 6 seconds
     * Min: 4 seconds, Max: 10 seconds
     * @param {string} text - Message text (can be HTML)
     * @returns {number} Stage time in milliseconds
     */
    calculateStageTime(text) {
        // Extract plain text length (strip HTML tags)
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text || '';
        const textLength = tempDiv.textContent.length;
        
        // Base: "put wane back in" = 17 characters = 6 seconds (6000ms)
        // Target: "4Worst coach in the NBA" = 24 characters = 6.5 seconds (6500ms)
        // Using linear interpolation: time = a * textLength + b
        // Solving: 6000 = a * 17 + b, 6500 = a * 24 + b
        // a = 500/7 = 71.43, b = 6000 - 71.43*17 = 4785.7
        const minStageTime = 1000; // 1 second minimum
        const maxStageTime = 10000; // 10 seconds maximum
        
        // Linear formula: time = 71.43 * textLength + 4785.7
        const calculatedTime = (71.43 * textLength) + 4785.7;
        
        // Apply min/max constraints
        return Math.max(minStageTime, Math.min(maxStageTime, calculatedTime));
    }
    
    /**
     * Display a new chat message (main public API)
     * @param {Object} chatData - {username, text, avatar, badges, id} or {user, text, avatar, badges, id}
     * @returns {boolean} True if message was displayed, false if skipped
     */
    displayNewChat(chatData) {
        // Normalize chat data (support both 'username' and 'user')
        const msg = {
            user: chatData.username || chatData.user,
            text: chatData.text,
            avatar: chatData.avatar,
            badges: chatData.badges || null
        };
        
        if (this.stateManager.getIsStaging() || this.stateManager.getIsPaused()) {
            return false; // Return false to indicate message was skipped
        }
        
        // Get user color
        const color = this.dataFormatter.getUserColor(this.stateManager.getMsgIdx());
        this.stateManager.incrementMsgIdx();
        
        // Calculate dynamic stage time based on text length
        const dynamicStageTime = this.calculateStageTime(msg.text);
        
        // Create stage message element
        const stageHTML = this.dataFormatter.formatStageHTML(msg, color);
        const messageEl = this.chatView.createStageMessageElement(stageHTML);
        
        this.chatView.appendToCanvas(messageEl);
        
        // Set staging state
        this.stateManager.setIsStaging(true);
        this.stateManager.setStagedMessage(messageEl);
        
        // Animate entry - callback will be called after bubble delay
        this.stageAnimator.animateEntry(messageEl, () => {
            // Set up transition timeout (after bubble delay, wait dynamicStageTime, then transition)
            const timeout = setTimeout(() => {
                // Format list HTML
                const listHTML = this.dataFormatter.formatListHTML(msg, color);
                
                // Transition to list
                this.stageAnimator.transitionToList(messageEl, listHTML, (listMessageEl) => {
                    // Update positions and background
                    this.chatView.updatePositions(this.stateManager.getMessagesList());
                    
                    // Remove old messages if list exceeds max height
                    while (this.chatView.calculateTotalListHeight(this.stateManager.getMessagesList()) > this.config.settings.maxHeight && this.stateManager.getMessagesList().length > 1) {
                        const oldest = this.stateManager.shiftMessagesList();
                        this.chatView.addClass(oldest, 'exiting');
                        setTimeout(() => {
                            this.chatView.removeElement(oldest);
                            this.chatView.updatePositions(this.stateManager.getMessagesList());
                            // Update background after exit animation completes
                            setTimeout(() => {
                                this.chatView.updateBackground(this.stateManager.getMessagesList());
                            }, 50);
                        }, 1200);
                        this.chatView.updatePositions(this.stateManager.getMessagesList());
                    }
                    
                    // Update background
                    this.chatView.updateBackground(this.stateManager.getMessagesList());
                });
            }, dynamicStageTime);
            this.stateManager.setCurrentStageTimeout(timeout);
        });
        
        return true; // Return true to indicate message was successfully displayed
    }
    
    /**
     * Pre-populate chat list with ALL existing messages from server
     * Sorted by message timestamp, added directly to list (no staging animation)
     * @returns {Promise<void>}
     */
    async prePopulate() {
        // Clear existing list messages
        const messagesList = this.stateManager.getMessagesList();
        messagesList.forEach(msg => {
            this.chatView.removeElement(msg);
        });
        this.stateManager.clearMessagesList();
        this.displayedMessageIds.clear();
        
        try {
            // Fetch ALL existing messages from server
            const response = await fetch('http://localhost:3000/api/chat');
            const data = await response.json();
            
            if (data.messages && data.messages.length > 0) {
                // Get current style
                const body = document.body;
                let currentStyle = 'default';
                for (let j = 1; j <= 21; j++) {
                    if (body.classList.contains(`chat-style-option-${j}`)) {
                        currentStyle = `option-${j}`;
                        break;
                    }
                }
                
                // Sort messages by timestamp (oldest first) - use message timestamp, not server time
                const sortedMessages = [...data.messages].sort((a, b) => {
                    const timestampA = a.timestamp || 0;
                    const timestampB = b.timestamp || 0;
                    return timestampA - timestampB; // Oldest first
                });
                
                // Add ALL messages to the list directly (no staging animation)
                sortedMessages.forEach((serverMsg, i) => {
                    // Mark as displayed
                    if (serverMsg.id) {
                        this.displayedMessageIds.add(serverMsg.id);
                    }
                    
                    // Convert server format to overlay format
                    const text = serverMsg.textHtml || serverMsg.text || '';
                    const msg = {
                        user: serverMsg.username,
                        text: text,
                        avatar: serverMsg.avatar || '',
                        badges: serverMsg.badges || null
                    };
                    
                    const color = this.dataFormatter.getUserColor(i);
                    
                    // Format HTML
                    const html = this.dataFormatter.formatListHTML(msg, color, currentStyle);
                    
                    // Create list message element
                    const listMessageEl = this.chatView.createListMessageElement(
                        html,
                        this.config.settings.listY + (i * (50 + this.config.settings.gap))
                    );
                    this.chatView.removeClass(listMessageEl, 'fading-in'); // Make visible immediately
                    
                    this.chatView.appendToCanvas(listMessageEl);
                    this.stateManager.addToMessagesList(listMessageEl);
                });
                
                // Force reflow
                void this.chatView.getCanvas().offsetHeight;
                
                // Update positions and background for all messages
                this.chatView.updatePositions(this.stateManager.getMessagesList());
                
                // Remove old messages if list exceeds max height (same logic as displayNewChat)
                while (this.chatView.calculateTotalListHeight(this.stateManager.getMessagesList()) > this.config.settings.maxHeight && this.stateManager.getMessagesList().length > 1) {
                    const oldest = this.stateManager.shiftMessagesList();
                    this.chatView.addClass(oldest, 'exiting');
                    setTimeout(() => {
                        this.chatView.removeElement(oldest);
                        this.chatView.updatePositions(this.stateManager.getMessagesList());
                        // Update background after exit animation completes
                        setTimeout(() => {
                            this.chatView.updateBackground(this.stateManager.getMessagesList());
                        }, 50);
                    }, 1200);
                    this.chatView.updatePositions(this.stateManager.getMessagesList());
                }
                
                this.chatView.updateBackground(this.stateManager.getMessagesList());
            }
        } catch (error) {
            console.error('Error pre-populating messages from server:', error);
            // Don't break overlay if server is unavailable - just start with empty list
        }
    }
    
    /**
     * Update CSS variables and canvas position
     * @returns {void}
     */
    updateStyles() {
        const canvas = this.chatView.getCanvas();
        // Canvas position is fixed - stage uses this
        canvas.style.right = this.config.settings.listX + 'px';
        canvas.style.top = this.config.settings.listY + 'px';
        
        // List offset is applied separately via CSS variable
        document.documentElement.style.setProperty('--list-offset-x', this.config.settings.listOffsetX + 'px');
        
        document.documentElement.style.setProperty('--stage-x', this.config.settings.stageX + 'px');
        document.documentElement.style.setProperty('--stage-y', this.config.settings.stageY + 'px');
        document.documentElement.style.setProperty('--pic-staged', this.config.settings.picStaged + 'px');
        document.documentElement.style.setProperty('--pic-list', this.config.settings.picList + 'px');
        document.documentElement.style.setProperty('--stage-font-size', this.config.settings.stageFontSize + 'px');
        document.documentElement.style.setProperty('--list-font-size', this.config.settings.listFontSize + 'px');
        document.documentElement.style.setProperty('--entry-gap', this.config.settings.entryGap + 'px');
        document.documentElement.style.setProperty('--bg-padding', this.config.settings.bgPadding + 'px');
        document.documentElement.style.setProperty('--bg-alpha', this.config.settings.bgAlpha);
        
        const hex = this.config.settings.bgColor;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        document.documentElement.style.setProperty('--bg-color-r', r);
        document.documentElement.style.setProperty('--bg-color-g', g);
        document.documentElement.style.setProperty('--bg-color-b', b);
        document.documentElement.style.setProperty('--stage-width', this.config.settings.stageWidth + 'px');
        document.documentElement.style.setProperty('--list-width', this.config.settings.listWidth + 'px');
        document.documentElement.style.setProperty('--bubble-delay', this.config.settings.bubbleDelay + 'ms');
        
        // Update stage background
        const stageBgHex = this.config.settings.stageBgColor;
        const stageBgR = parseInt(stageBgHex.slice(1, 3), 16);
        const stageBgG = parseInt(stageBgHex.slice(3, 5), 16);
        const stageBgB = parseInt(stageBgHex.slice(5, 7), 16);
        document.documentElement.style.setProperty('--stage-bg-r', stageBgR);
        document.documentElement.style.setProperty('--stage-bg-g', stageBgG);
        document.documentElement.style.setProperty('--stage-bg-b', stageBgB);
        document.documentElement.style.setProperty('--stage-bg-alpha', this.config.settings.stageBgAlpha);
        
        // Update positions and background if messages exist
        if (this.stateManager.getMessagesList().length > 0) {
            this.chatView.updatePositions(this.stateManager.getMessagesList());
            this.chatView.updateBackground(this.stateManager.getMessagesList());
        }
    }
    
    /**
     * Update fade animation CSS based on settings
     * @returns {void}
     */
    updateFadeAnimations() {
        const style = document.documentElement.style;
        style.setProperty('--fade-out-duration', this.config.settings.fadeOutDuration + 'ms');
        style.setProperty('--fade-in-duration', this.config.settings.fadeInDuration + 'ms');
        style.setProperty('--move-up-amount', '-' + this.config.settings.moveUpAmount + 'px');
        style.setProperty('--move-down-amount', this.config.settings.moveUpAmount + 'px');
    }
}

