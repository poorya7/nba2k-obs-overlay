/**
 * SpotlightController - Main orchestration for spotlight chat overlay
 * Single Responsibility: Coordinate between data sources, state, and views
 */

class SpotlightController {
    /**
     * @param {Object} dependencies - Dependency injection object
     * @param {SpotlightView} dependencies.view - View layer
     * @param {SpotlightStateManager} dependencies.stateManager - State management
     * @param {SpotlightDataFormatter} dependencies.dataFormatter - Data formatting
     * @param {Object} dependencies.config - Configuration object
     */
    constructor(dependencies) {
        if (!dependencies) {
            throw new Error('SpotlightController: dependencies object is required');
        }
        
        const required = ['view', 'stateManager', 'dataFormatter', 'config'];
        for (const dep of required) {
            if (!dependencies[dep]) {
                throw new Error(`SpotlightController: ${dep} dependency is required`);
            }
        }
        
        // Dependencies (injected for loose coupling)
        this.view = dependencies.view;
        this.stateManager = dependencies.stateManager;
        this.dataFormatter = dependencies.dataFormatter;
        this.config = dependencies.config;
    }
    
    /**
     * Start the overlay (call once on page load)
     */
    start() {
        // Initialize view with style number
        this.view.init(this.config.styleNum);
        
        // Pre-populate initial messages
        this.prePopulate();
        
        // Start server polling
        const interval = setInterval(() => {
            this.pollServerMessages();
        }, this.config.pollInterval);
        
        this.stateManager.setPollInterval(interval);
    }
    
    /**
     * Stop the overlay (cleanup)
     */
    stop() {
        this.stateManager.clearPollInterval();
        this.stateManager.clearActiveTimeout();
        this.stateManager.clearSpotlightTimeout();
    }
    
    /**
     * Pre-populate with existing messages from server
     */
    async prePopulate() {
        // Reset state completely (clear everything including displayed message tracking)
        this.view.clearMessages();
        this.stateManager.reset();

        try {
            const response = await fetch(this.config.apiEndpoint);
            const data = await response.json();

            // Initialize lastRefreshTrigger on first load to prevent immediate re-trigger
            if (data.refreshTrigger && this.stateManager.getLastRefreshTrigger() === null) {
                this.stateManager.setLastRefreshTrigger(data.refreshTrigger);
            }

            if (data.messages && data.messages.length > 0) {
                // Sort messages by timestamp (oldest first)
                const sortedMessages = this._sortMessages(data.messages);

                // Deduplicate messages by ID (same as pollServerMessages does)
                const seenIds = new Set();
                const uniqueMessages = sortedMessages.filter(msg => {
                    if (!msg.id || seenIds.has(msg.id)) {
                        return false;
                    }
                    seenIds.add(msg.id);
                    return true;
                });

                // Add unique messages to queue (will be shown one at a time)
                // Mark as displayed when enqueued to prevent re-adding from pollServerMessages
                uniqueMessages.forEach(serverMsg => {
                    const messageId = serverMsg.id || `${serverMsg.username || ''}_${serverMsg.text || serverMsg.textHtml || ''}_${serverMsg.timestamp || ''}`;
                    this.stateManager.markMessageDisplayed(messageId);
                    this.stateManager.enqueueMessage(serverMsg);
                });

                // Start processing queue
                this._startQueueProcessing();
            }
        } catch (error) {
            // Silently handle errors
        }
    }
    
    /**
     * Poll server for new messages
     */
    async pollServerMessages() {
        try {
            const response = await fetch(this.config.apiEndpoint);
            const data = await response.json();
            
            // Check if refresh is triggered
            if (data.refreshTrigger && data.refreshTrigger !== this.stateManager.getLastRefreshTrigger()) {
                this.stateManager.setLastRefreshTrigger(data.refreshTrigger);
                await this.prePopulate();
                return;
            }
            
            if (data.messages && data.messages.length > 0) {
                // Filter out already displayed messages and sort
                // Also check if message is already in queue to prevent duplicates
                const newMessages = data.messages
                    .filter(msg => {
                        // Use same ID generation logic as when marking as displayed
                        const messageId = msg.id || `${msg.username || ''}_${msg.text || msg.textHtml || ''}_${msg.timestamp || ''}`;
                        const isDisplayed = this.stateManager.hasDisplayedMessage(messageId);
                        const isInQueue = this.stateManager.isMessageInQueue(msg);
                        
                        return !isDisplayed && !isInQueue;
                    })
                    .sort((a, b) => this._compareMessages(a, b));

                // Add new messages to queue
                newMessages.forEach(serverMsg => {
                    this._addToQueue(serverMsg);
                });
            }
        } catch (error) {
            // Silently handle errors
        }
    }
    
    // ========================================
    // Queue processing (one message at a time)
    // ========================================
    
    /**
     * Add message to queue and start processing
     */
    _addToQueue(serverMsg) {
        // Clear spotlight timeout since new message is coming
        this.stateManager.clearSpotlightTimeout();

        this.stateManager.enqueueMessage(serverMsg);
        this._startQueueProcessing();
    }
    
    /**
     * Start processing if not already
     */
    _startQueueProcessing() {
        if (!this.stateManager.getIsProcessing() && 
            !this.stateManager.getIsScheduled() && 
            this.stateManager.getQueueLength() > 0) {
            this.stateManager.setIsScheduled(true);
            this._processQueue();
        }
    }
    
    /**
     * Process message queue one at a time
     */
    _processQueue() {
        // Lock check - prevent race conditions
        if (this.stateManager.getLock()) {
            return;
        }
        
        // Set lock immediately
        this.stateManager.setLock(true);
        
        // Check other conditions
        if (this.stateManager.getIsProcessing() || this.stateManager.getQueueLength() === 0) {
            this.stateManager.setLock(false);
            return;
        }
        
        // Set processing flag
        this.stateManager.setIsProcessing(true);
        this.stateManager.setIsScheduled(false);
        
        const serverMsg = this.stateManager.dequeueMessage();

        if (!serverMsg) {
            this.stateManager.setIsProcessing(false);
            this.stateManager.setLock(false);
            return;
        }

        // Mark as displayed (use content-based ID if message has no ID)
        const messageId = serverMsg.id || `${serverMsg.username || ''}_${serverMsg.text || serverMsg.textHtml || ''}_${serverMsg.timestamp || ''}`;
        this.stateManager.markMessageDisplayed(messageId);
        
        // Get message text for duration calculation
        const messageText = serverMsg.textHtml || serverMsg.text || '';
        
        // Calculate dynamic duration based on message length
        const messageDuration = this._calculateMessageDuration(messageText);
        
        // Show the message
        this._showMessage(serverMsg);
        
        // Clear any existing timeout
        this.stateManager.clearActiveTimeout();
        
        // Wait before showing next message (dynamic duration based on text length)
        const timeoutId = setTimeout(() => {
            this.stateManager.setActiveTimeout(null);
            this.stateManager.setIsProcessing(false);
            this.stateManager.setLock(false);

            // Process next if queue has more
            if (this.stateManager.getQueueLength() > 0 && !this.stateManager.getIsScheduled()) {
                this.stateManager.setIsScheduled(true);
                setTimeout(() => this._processQueue(), 0);
            } else {
                // No more messages in queue - start spotlight timeout (total time - message duration)
                this._startSpotlightTimeout(messageDuration);
            }
        }, messageDuration);

        this.stateManager.setActiveTimeout(timeoutId);
    }
    
    /**
     * Show a single message
     */
    _showMessage(serverMsg) {
        // Format the message
        const formattedMsg = this.dataFormatter.formatMessage(serverMsg, this.stateManager);
        
        // Create and append element (newest message gets profile pic)
        const messageEl = this.view.createMessageElement(formattedMsg, true);
        
        this.view.appendMessage(messageEl);
        
        // Wait for profile pic to load before showing message (prevents layout shifts and ensures pic is visible)
        // Same logic as old chat overlay
        const profilePic = messageEl.querySelector('.profile-pic');
        
        const showMessage = () => {
            // Ensure profile pic is added if missing (fallback)
            const lastMessage = this.view.getContainer().querySelector('.chat-message:last-child');
            if (lastMessage === messageEl && formattedMsg.avatar && formattedMsg.avatar.trim() !== '') {
                const existingPic = lastMessage.querySelector('.profile-pic');
                if (!existingPic) {
                    const newPic = document.createElement('img');
                    newPic.className = 'profile-pic';
                    // Use proxy URL to bypass CORS
                    const proxyUrl = `http://localhost:3000/api/image-proxy?url=${encodeURIComponent(formattedMsg.avatar)}`;
                    newPic.src = proxyUrl;
                    newPic.alt = '';
                    newPic.onerror = function() { this.style.display = 'none'; };
                    lastMessage.insertBefore(newPic, lastMessage.firstChild);
                }
            }
            
            // Fade in
            this.view.fadeInMessage(messageEl);
            
            // Smooth scroll
            this.view.smoothScrollToBottom(this.config.scrollDuration);
            
            // Remove old messages (and their profile pics)
            this.view.removeOldMessages(this.config.maxMessages);
        };
        
        // Wait for avatar image to load, or start immediately if already loaded or no image
        // Same logic as old chat overlay - but give browser a frame to start loading
        if (!profilePic || !profilePic.src || profilePic.src.trim() === '') {
            // No profile pic or empty src, start immediately
            showMessage();
        } else {
            // Give browser one frame to start loading the image, then check
            requestAnimationFrame(() => {
                if (profilePic.complete && profilePic.naturalHeight !== 0) {
                    // Image already loaded (cached or loaded very quickly)
                    showMessage();
                } else {
                    // Wait for image to load (with timeout fallback to prevent infinite waiting)
                    let messageShown = false;
                    const safeShow = () => {
                        // Only show once (prevent race conditions)
                        if (!messageShown) {
                            messageShown = true;
                            showMessage();
                        }
                    };
                    profilePic.addEventListener('load', safeShow, { once: true });
                    profilePic.addEventListener('error', safeShow, { once: true }); // Show even if image fails to load
                    // Fallback timeout: show message after 1000ms max wait (increased from 500ms)
                    // This gives images more time to load, especially on first load (not cached)
                    setTimeout(safeShow, 1000);
                }
            });
        }
    }
    
    // ========================================
    // Spotlight timeout
    // ========================================

    /**
     * Start spotlight auto-clear timeout
     * @param {number} messageDuration - Duration the message was displayed for
     */
    _startSpotlightTimeout(messageDuration) {
        // Clear any existing timeout
        this.stateManager.clearSpotlightTimeout();

        // Calculate remaining time: total spotlight time - message duration already shown
        const remainingTime = Math.max(0, this.config.totalSpotlightTime - messageDuration);

        // Start new timeout
        const timeoutId = setTimeout(() => {
            this.stateManager.setSpotlightTimeout(null);
            this._clearSpotlight();
        }, remainingTime);

        this.stateManager.setSpotlightTimeout(timeoutId);
    }

    /**
     * Clear spotlight (remove profile pic from last message)
     */
    _clearSpotlight() {
        this.view.clearSpotlight();
    }

    // ========================================
    // Helpers
    // ========================================
    
    /**
     * Calculate dynamic message duration based on text length
     * Formula: time = 1800 + (44 × charCount) ms
     * @param {string} text - Message text (can be HTML)
     * @returns {number} Duration in milliseconds
     */
    _calculateMessageDuration(text) {
        // Extract plain text length (strip HTML tags)
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text || '';
        const textLength = tempDiv.textContent.length;
        
        // Count emoji images (each <img> tag counts as 1 character)
        const emojiCount = tempDiv.querySelectorAll('img').length;
        
        // Total length = text characters + emojis
        const totalLength = textLength + emojiCount;
        
        // For emoji-only messages (no text), treat as 0 length → clamped to minimum
        const calculationLength = textLength === 0 ? 0 : totalLength;
        
        // Formula: time = 1800 + (44 × charCount) ms
        const calculatedTime = 1800 + (44 * calculationLength);
        
        // Apply min/max constraints
        const finalTime = Math.max(
            this.config.minMessageTime,
            Math.min(this.config.maxMessageTime, calculatedTime)
        );
        
        return finalTime;
    }
    
    _sortMessages(messages) {
        return [...messages].sort((a, b) => this._compareMessages(a, b));
    }
    
    _compareMessages(a, b) {
        const timestampA = a.timestamp || 0;
        const timestampB = b.timestamp || 0;
        
        if (timestampA !== timestampB) {
            return timestampA - timestampB; // Oldest first
        }
        
        // Timestamps equal - use DOM order as tiebreaker
        const domOrderA = a.domOrder !== undefined ? a.domOrder : Infinity;
        const domOrderB = b.domOrder !== undefined ? b.domOrder : Infinity;
        return domOrderA - domOrderB;
    }
    
}

