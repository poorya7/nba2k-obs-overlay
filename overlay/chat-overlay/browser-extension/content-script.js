// YouTube Live Chat Reader - Content Script
// Reads chat messages from YouTube live stream DOM

(function() {
    'use strict';
    

    // Check if we're on a YouTube watch page or live page
    function isYouTubeWatchPage() {
        return window.location.hostname === 'www.youtube.com' && 
               (window.location.pathname.startsWith('/watch') || 
                window.location.pathname.startsWith('/live'));
    }

    // Check if this is a live stream (has live indicator)
    function isLiveStream() {
        try {
            // Check for live indicator in page
            const liveIndicator = document.querySelector('ytd-badge-supported-renderer[badge-style="BADGE_STYLE_TYPE_LIVE_NOW"]') ||
                                 document.querySelector('.ytp-live-badge') ||
                                 document.querySelector('[aria-label*="LIVE"]');
            return !!liveIndicator;
        } catch (e) {
            return false;
        }
    }

    // Only initialize if we're on a YouTube watch page
    if (!isYouTubeWatchPage()) {
        return;
    }


    class YouTubeChatReader {
        constructor() {
            this.processedMessageIds = new Set();
            this.addedToOverlayIds = new Set(); // Track messages added to overlay
            this.recentMessagesByContent = new Map(); // Track recent messages by username+text to detect optimistic duplicates
            this.pendingUserSends = new Map(); // Track pending sends for user's own messages (key: contentKey, value: {timeout, messageData})
            this.isActive = false;
            this.observer = null;
            
            // Usernames that need 1-second delay to catch duplicates
            this.userOwnUsernames = ['retrohead', 'silent_basketballl'];
            this.initAttempts = 0;
            this.maxInitAttempts = 30; // Stop trying after 30 seconds
            this.isInitialScan = true; // Track if this is the first scan
            this.overlay = null;
            this.messageCount = 0;
            
            // Server status tracking
            this.serverSentCount = 0;
            this.serverFailedCount = 0;
            this.lastServerError = null;
            this.lastServerSuccess = null;
            this.errorLog = []; // Array of error objects with details
            this.sentMessagesLog = []; // Array of messages sent to server (for debugging)
            this.lastServerClearTimestamp = null; // Track last server clear timestamp to detect when server is cleared
            
            this.init();
        }

        init() {
            try {
                // Wait for page to load, then start watching
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => this.start());
                } else {
                    // Small delay to let page settle
                    setTimeout(() => this.start(), 1000);
                }
            } catch (error) {
            }
        }

    start() {
        if (this.isActive) return;
        
        try {
            // Always try to activate - will work for both live and past streams with chat
            const hasLiveBadge = isLiveStream();
            
            if (hasLiveBadge) {
            } else {
            }
            this.isActive = true;
            
            // Create overlay UI
            this.createOverlay();
            
            // Try to find chat container
            this.setupChatObserver();
            
            // Also watch for initial chat load
            this.watchForChatContainer();
            } catch (error) {
                console.error('[Chat Reader] Error in start():', error);
                this.isActive = false;
            }
    }

    diagnosePage() {
        
        // Look for any elements with "chat" in ID or class
        const chatElements = document.querySelectorAll('[id*="chat"], [class*="chat"], [id*="Chat"], [class*="Chat"]');
        chatElements.forEach((el, idx) => {
            if (idx < 10) { // Only show first 10
            }
        });
        
        // Look for iframes
        const allIframes = document.querySelectorAll('iframe');
        allIframes.forEach((iframe, idx) => {
            const id = iframe.id || '(no id)';
            const src = iframe.src?.substring(0, 80) || '(no src)';
        });
        
        // Look for YouTube-specific chat components in main document
        const ytChatElements = document.querySelectorAll('yt-live-chat-app, yt-live-chat-renderer, ytd-live-chat-frame, ytd-live-chat-renderer, yt-live-chat-text-message-renderer');
        ytChatElements.forEach((el, idx) => {
        });
        
        // Try to access chat iframe
        const chatIframe = document.querySelector('iframe#chatframe');
        if (chatIframe) {
            try {
                const iframeDoc = chatIframe.contentDocument || chatIframe.contentWindow?.document;
                if (iframeDoc) {
                    
                    // Check for messages with different selectors
                    const selectors = [
                        'yt-live-chat-text-message-renderer',
                        'yt-live-chat-replay-text-message-renderer', // For replay/archived streams
                        '#chat-messages',
                        'yt-live-chat-renderer',
                        'yt-live-chat-app',
                        '[id*="message"]',
                        '[class*="message"]'
                    ];
                    
                    selectors.forEach(selector => {
                        try {
                            const elements = iframeDoc.querySelectorAll(selector);
                            if (elements.length > 0) {
                                if (elements.length <= 3) {
                                    elements.forEach((el, idx) => {
                                    });
                                }
                            }
                        } catch (e) {
                            // Skip this selector
                        }
                    });
                    
                    // Check if there's shadow DOM
                    const body = iframeDoc.body;
                    if (body) {
                        
                        // Log all top-level elements
                        Array.from(body.children).slice(0, 5).forEach((child, idx) => {
                            if (child.shadowRoot) {
                                // Try to access shadow DOM
                                try {
                                    const shadowMessages = child.shadowRoot.querySelectorAll('yt-live-chat-text-message-renderer');
                                } catch (e) {
                                }
                            }
                        });
                    }
                    
                    // Try the original message selector
                    const iframeMessages = iframeDoc.querySelectorAll('yt-live-chat-text-message-renderer');
                    if (iframeMessages.length > 0) {
                    }
                } else {
                }
            } catch (e) {
            }
        } else {
        }
        
    }

    watchForChatContainer() {
        // YouTube chat can load dynamically, so we need to watch for it
        let attemptCount = 0;
        const maxAttempts = 30; // 30 seconds
        
        
        // Run diagnostic on first attempt
        setTimeout(() => this.diagnosePage(), 2000);
        
        // Also watch for iframe load events
        const chatIframe = document.querySelector('iframe#chatframe');
        if (chatIframe) {
            chatIframe.addEventListener('load', () => {
                setTimeout(() => {
                    const container = this.findChatContainer();
                    if (container && !this.observer) {
                        this.setupChatObserver();
                    }
                }, 500);
            });
        }
        
        const checkInterval = setInterval(() => {
            try {
                attemptCount++;
                const chatContainer = this.findChatContainer();
                if (chatContainer && !this.observer) {
                    this.setupChatObserver();
                    clearInterval(checkInterval);
                } else if (attemptCount >= maxAttempts) {
                    clearInterval(checkInterval);
                    if (!this.observer) {
                    }
                } else if (attemptCount % 5 === 0) {
                    // Log progress every 5 seconds
                }
            } catch (error) {
                if (attemptCount >= maxAttempts) {
                    clearInterval(checkInterval);
                }
            }
        }, 1000);
    }

    findChatContainer() {
        try {
            // Step 1: Find the chat iframe
            const chatIframe = document.querySelector('iframe#chatframe');
            if (!chatIframe) {
                return null;
            }
            
            // Step 2: Try to access iframe content (may have CORS restrictions)
            try {
                const iframeDoc = chatIframe.contentDocument || chatIframe.contentWindow?.document;
                if (!iframeDoc) {
                    // CORS blocked - we can't access this iframe
                    return null;
                }
                
                // Step 3: Check if we can find ANY chat-related elements (messages or containers)
                // This helps us verify the iframe is loaded even if messages aren't there yet
                const hasAnyChatElements = iframeDoc.querySelector('yt-live-chat-text-message-renderer, #chat-messages, yt-live-chat-renderer, yt-live-chat-app');
                
                // Step 4: Try to find the chat messages container inside iframe
                const chatMessagesContainer = iframeDoc.querySelector('#chat-messages');
                if (chatMessagesContainer) {
                    return chatMessagesContainer;
                }
                
                // Fallback: try to find yt-live-chat-renderer
                const chatRenderer = iframeDoc.querySelector('yt-live-chat-renderer');
                if (chatRenderer) {
                    return chatRenderer;
                }
                
                // Fallback: try yt-live-chat-app
                const chatApp = iframeDoc.querySelector('yt-live-chat-app');
                if (chatApp) {
                    return chatApp;
                }
                
                // If we can access the iframe but no chat elements found yet, return null to keep checking
                // But log that we CAN access it (good sign)
                if (hasAnyChatElements === null) {
                    // No chat elements at all - iframe might still be loading
                    return null;
                }
                
                return null;
                
            } catch (e) {
                // CORS error - we can't access iframe content
                // This is expected for cross-origin iframes
                if (e.message && e.message.includes('cross-origin')) {
                }
                return null;
            }
        } catch (error) {
            return null;
        }
    }

    setupChatObserver() {
        try {
            const chatContainer = this.findChatContainer();
            if (!chatContainer) {
                // DEBUG: Log if chat container not found
                console.warn('[Chat Reader] Chat container not found - chat may not be loaded yet');
                return; // Silently return - chat not available
            }
            
            // DEBUG: Log successful setup
            console.log('[Chat Reader] Chat observer setup successful');

            // Don't create duplicate observers
            if (this.observer) {
                return;
            }

            // Use MutationObserver to watch for new chat messages
            this.observer = new MutationObserver((mutations) => {
                try {
                    this.scanForNewMessages();
                } catch (error) {
                }
            });

            // Observe the chat container for changes
            this.observer.observe(chatContainer, {
                childList: true,
                subtree: true
            });

            // Also do an initial scan
            setTimeout(() => {
                try {
                    this.scanForNewMessages();
                    this.isInitialScan = false; // After first scan, mark as done
                } catch (error) {
                }
            }, 1000);
        } catch (error) {
        }
    }

    scanForNewMessages() {
        try {
            // Find all chat message elements
            const messages = this.findChatMessages();
            
            // DEBUG: Log if we're finding messages
            if (messages.length > 0 && this.isInitialScan) {
                console.log('[Chat Reader] Found', messages.length, 'messages in DOM');
            }
            
            let newCount = 0;
            let processedCount = 0;
            let skippedInScan = 0;
            
            // Track which message IDs we see during this scan (to detect duplicates in same scan)
            const idsSeenInThisScan = new Set();
            
            messages.forEach((messageEl, index) => {
                try {
                    const messageData = this.extractMessageData(messageEl, index);
                    if (!messageData) {
                        // Log all extraction failures for debugging (especially for messages with emojis)
                        const usernameEl = messageEl.querySelector('#author-name');
                        const username = usernameEl?.textContent?.trim() || 'Unknown';
                        const textEl = messageEl.querySelector('#message');
                        const emojiImages = textEl ? textEl.querySelectorAll('img') : [];
                        const hasEmojis = emojiImages.length > 0;
                        
                        return;
                    }
                    
                    // Enhanced logging for user's own messages to debug duplicates
                    const isUserMessage = messageData.username && messageData.username.toLowerCase().includes('retrohead');
                    
                    // Check if we've already seen this ID in this scan (duplicate in DOM)
                    if (idsSeenInThisScan.has(messageData.id)) {
                        skippedInScan++;
                        return;
                    }
                    idsSeenInThisScan.add(messageData.id);
                    
                    // Check if we've already processed this ID in a previous scan
                    if (!this.processedMessageIds.has(messageData.id)) {
                        this.processedMessageIds.add(messageData.id);
                        newCount++;
                        if (isUserMessage) {
                        }
                        this.onNewMessage(messageData);
                    } else {
                        processedCount++;
                    }
                } catch (error) {
                    // Skip this message if there's an error extracting it
                }
            });
            
            if (newCount > 0 || skippedInScan > 0) {
                const skipMsg = skippedInScan > 0 ? `, ${skippedInScan} duplicates in same scan` : '';
                if (this.isInitialScan && newCount > 0) {
                }
            } else if (this.isInitialScan && processedCount === 0) {
            }
        } catch (error) {
        }
    }

    findChatMessages() {
        try {
            const messages = [];
            
            const selectors = [
                'yt-live-chat-text-message-renderer', // Regular text messages
                'yt-live-chat-paid-message-renderer', // Super chat / paid messages
                'yt-live-chat-membership-item-renderer', // Membership messages
            ];
            
            // Chat messages are always inside the iframe, so only search there
            const chatIframe = document.querySelector('iframe#chatframe');
            if (!chatIframe) {
                // DEBUG: Log if iframe not found
                if (this.isInitialScan) {
                    console.warn('[Chat Reader] Chat iframe not found!');
                }
                return [];
            }
            
            try {
                const iframeDoc = chatIframe.contentDocument || chatIframe.contentWindow?.document;
                if (!iframeDoc) {
                    // DEBUG: Log if can't access iframe
                    if (this.isInitialScan) {
                        console.warn('[Chat Reader] Cannot access iframe content (CORS or not loaded yet)');
                    }
                    return [];
                }
                
                for (const selector of selectors) {
                    try {
                        const elements = iframeDoc.querySelectorAll(selector);
                        if (elements.length > 0) {
                            // DEBUG: Log what we found
                            if (this.isInitialScan && messages.length === 0) {
                                console.log('[Chat Reader] Found', elements.length, 'elements with selector:', selector);
                            }
                        }
                        elements.forEach(el => {
                            if (el && !messages.includes(el)) {
                                messages.push(el);
                            }
                        });
                    } catch (e) {
                        continue;
                    }
                }
            } catch (e) {
                // DEBUG: Log iframe access errors
                if (this.isInitialScan) {
                    console.error('[Chat Reader] Error accessing iframe:', e.message);
                }
            }

            // Only log total if we found messages
            if (messages.length > 0) {
            }
            return messages;
        } catch (error) {
            // DEBUG: Log general errors
            if (this.isInitialScan) {
                console.error('[Chat Reader] Error in findChatMessages:', error);
            }
            return [];
        }
    }

    extractMessageData(messageElement, domOrder = null) {
        try {
            // Extract message ID (YouTube uses data attributes or IDs)
            // Extract YouTube's actual message ID - try multiple locations
            let id = messageElement.getAttribute('id');
            let idSource = 'element.id';
            
            // If element ID doesn't look like a YouTube message ID, try other attributes
            if (!id || (!id.startsWith('message-') && !id.startsWith('ChwKGk') && id.length < 10)) {
                id = messageElement.getAttribute('data-id');
                if (id) idSource = 'element.data-id';
            }
            
            // Check internal data attributes that YouTube might use
            if (!id || id.length < 10) {
                // YouTube stores message IDs in various places - check __data or similar
                if (messageElement.__data && messageElement.__data.id) {
                    id = messageElement.__data.id;
                    idSource = '__data.id';
                } else if (messageElement.__data && messageElement.__data.messageId) {
                    id = messageElement.__data.messageId;
                    idSource = '__data.messageId';
                } else if (messageElement.__data && messageElement.__data.clientId) {
                    id = messageElement.__data.clientId;
                    idSource = '__data.clientId';
                }
            }
            
            // Check for message ID in child elements (like the message content area)
            if (!id || id.length < 10) {
                const messageContent = messageElement.querySelector('[id*="message"], [data-id*="message"]');
                if (messageContent) {
                    id = messageContent.getAttribute('id') || messageContent.getAttribute('data-id');
                    if (id) idSource = 'childElement';
                }
            }
            
            // If we still can't find YouTube's ID, skip this message
            if (!id || id.length < 10) {
                return null; // Skip messages without YouTube ID
            }
            
            // Extract username early for user message detection
            const usernameEl = messageElement.querySelector('#author-name');
            const username = usernameEl?.textContent?.trim() || 'Unknown';
            const isUserMessage = username && username.toLowerCase().includes('retrohead');
            

            // Extract message text - exact selector from DOM inspection (span#message)
            // YouTube renders emojis as <img> tags, so we need to extract them properly
            const textEl = messageElement.querySelector('span#message');
            let text = '';
            let textHtml = ''; // HTML version with emoji images preserved
            
            if (textEl) {
                // Build HTML by traversing all child nodes to preserve emoji images
                const htmlParts = [];
                
                const processNode = (node) => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        const textContent = node.textContent || '';
                        htmlParts.push(this.escapeHtml(textContent));
                    } else if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.tagName === 'IMG') {
                            // Emoji image - preserve the image tag
                            // Priority: src attribute > data-src > src property > currentSrc
                            let imgSrc = node.getAttribute('src') || '';
                            
                            // If src attribute exists but is empty or invalid, try other sources
                            if (!imgSrc || imgSrc.trim() === '' || imgSrc === 'undefined' || imgSrc === 'null') {
                                imgSrc = node.getAttribute('data-src') || '';
                            }
                            if (!imgSrc || imgSrc.trim() === '') {
                                imgSrc = (node.src && node.src !== 'undefined') ? node.src : '';
                            }
                            if (!imgSrc || imgSrc.trim() === '' || imgSrc === 'about:blank') {
                                imgSrc = (node.currentSrc && node.currentSrc !== 'undefined') ? node.currentSrc : '';
                            }
                            
                            const imgAlt = node.getAttribute('alt') || 
                                         node.getAttribute('title') || 
                                         node.getAttribute('aria-label') ||
                                         node.getAttribute('shared-tooltip-text') ||
                                         '';
                            
                            // Clean up src - remove whitespace and check if it's a valid URL
                            imgSrc = imgSrc.trim();
                            const isValidSrc = imgSrc && 
                                              imgSrc !== '' && 
                                              imgSrc !== 'undefined' && 
                                              imgSrc !== 'null' &&
                                              imgSrc !== 'about:blank' &&
                                              (imgSrc.startsWith('http://') || imgSrc.startsWith('https://') || imgSrc.startsWith('data:') || imgSrc.startsWith('/'));
                            
                            if (isValidSrc) {
                                // Create emoji image HTML with proper attributes
                                // DO NOT escape imgSrc - it's a URL that must remain intact
                                htmlParts.push(`<img src="${imgSrc.replace(/"/g, '&quot;')}" alt="${this.escapeHtml(imgAlt)}" class="chat-reader-emoji" style="width: auto; height: auto; max-width: 24px; max-height: 24px; vertical-align: middle;">`);
                            } else {
                                // Fallback: use alt text if it's a Unicode emoji, otherwise use default
                                const emojiText = imgAlt && /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(imgAlt) ? imgAlt : (imgAlt || '😀');
                                htmlParts.push(emojiText);
                            }
                        } else {
                            // Process all child nodes recursively
                            for (let child = node.firstChild; child; child = child.nextSibling) {
                                processNode(child);
                            }
                        }
                    }
                };
                
                // Process all children of textEl
                for (let child = textEl.firstChild; child; child = child.nextSibling) {
                    processNode(child);
                }
                
                textHtml = htmlParts.join('').trim();
                
                // Debug: Log if we found emoji images
                const emojiImages = textEl.querySelectorAll('img');
                if (emojiImages.length > 0) {
                    // If we found emoji images but textHtml is empty, something went wrong
                    if (!textHtml || textHtml.trim().length === 0) {
                    }
                }
                
                // Get plain text version (excluding img alt text to avoid duplication)
                // Build text by extracting only from text nodes, not from images
                const textParts = [];
                const extractTextOnly = (node) => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        textParts.push(node.textContent);
                    } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'IMG') {
                        for (let child = node.firstChild; child; child = child.nextSibling) {
                            extractTextOnly(child);
                        }
                    }
                };
                for (let child = textEl.firstChild; child; child = child.nextSibling) {
                    extractTextOnly(child);
                }
                text = textParts.join('').trim();
                
                // If no HTML was built but we have text, use escaped text as HTML
                if (!textHtml && text) {
                    textHtml = this.escapeHtml(text);
                }
                // For emoji-only messages, text will remain empty - that's fine, we use textHtml for the actual content
                // No need to create placeholder text - validation already checks for textHtml
                // Ensure textHtml is never empty if we have content
                if (!textHtml) {
                    textHtml = text ? this.escapeHtml(text) : '';
                }
            } else {
                // No textEl found - this shouldn't happen but handle gracefully
                text = '';
                textHtml = '';
            }

            // Extract avatar/image - exact selector from DOM inspection
            // Try multiple selectors because YouTube may render user's own messages differently
            let avatarEl = messageElement.querySelector('#author-photo img') ||
                          messageElement.querySelector('#author-photo yt-img-shadow img') ||
                          messageElement.querySelector('#author-photo yt-img-shadow') ||
                          messageElement.querySelector('yt-live-chat-author-chip #author-photo img') ||
                          messageElement.querySelector('yt-live-chat-author-chip #author-photo yt-img-shadow img') ||
                          messageElement.querySelector('yt-live-chat-author-chip #author-photo yt-img-shadow');
            
            // Try to get src from various sources
            let avatar = '';
            if (avatarEl) {
                // Try direct src property
                avatar = avatarEl.src || '';
                
                // If no src, try getAttribute
                if (!avatar) {
                    avatar = avatarEl.getAttribute('src') || 
                            avatarEl.getAttribute('data-src') || 
                            avatarEl.getAttribute('data-thumb') || '';
                }
                
                // For yt-img-shadow, try to get the actual img inside
                if (!avatar && avatarEl.tagName === 'YT-IMG-SHADOW') {
                    const innerImg = avatarEl.querySelector('img');
                    if (innerImg) {
                        avatar = innerImg.src || 
                                innerImg.getAttribute('src') || 
                                innerImg.getAttribute('data-src') || '';
                    }
                    
                    // Also try shadowRoot if available
                    if (!avatar && avatarEl.shadowRoot) {
                        try {
                            const shadowImg = avatarEl.shadowRoot.querySelector('img');
                            if (shadowImg) {
                                avatar = shadowImg.src || 
                                        shadowImg.getAttribute('src') || 
                                        shadowImg.getAttribute('data-src') || '';
                            }
                        } catch (e) {
                            // Shadow DOM access might fail
                        }
                    }
                }
            }
            
            // Final fallback: check if there's a background-image style
            if (!avatar) {
                const authorPhoto = messageElement.querySelector('#author-photo');
                if (authorPhoto) {
                    const bgImage = window.getComputedStyle(authorPhoto).backgroundImage;
                    if (bgImage && bgImage !== 'none') {
                        const urlMatch = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
                        if (urlMatch && urlMatch[1]) {
                            avatar = urlMatch[1];
                        }
                    }
                }
            }

            // Extract timestamp display text from DOM (just for display purposes)
            const timestampEl = messageElement.querySelector('#timestamp');
            const timestampText = timestampEl?.textContent?.trim() || '';
            
            // Extract YouTube's actual numeric timestamp (for duplicate detection)
            let timestamp = Date.now(); // Fallback to current time
            if (messageElement.__data) {
                // Try various timestamp properties YouTube might use
                if (messageElement.__data.timestamp) {
                    timestamp = messageElement.__data.timestamp;
                } else if (messageElement.__data.timestampUsec) {
                    timestamp = messageElement.__data.timestampUsec / 1000; // Convert microseconds to milliseconds
                } else if (messageElement.__data.timeUsec) {
                    timestamp = messageElement.__data.timeUsec / 1000; // Convert microseconds to milliseconds
                } else if (messageElement.__data.createdTimestamp) {
                    timestamp = messageElement.__data.createdTimestamp;
                } else if (messageElement.__data.timestampSeconds) {
                    timestamp = messageElement.__data.timestampSeconds * 1000; // Convert seconds to milliseconds
                }
            }
            
            // Also check for timestamp in data attributes
            if (timestamp === Date.now() || !timestamp) { // Only if we still have fallback value
                const dataTimestamp = messageElement.getAttribute('data-timestamp') || 
                                    messageElement.getAttribute('data-time') ||
                                    timestampEl?.getAttribute('data-timestamp');
                if (dataTimestamp) {
                    const parsed = parseInt(dataTimestamp, 10);
                    if (!isNaN(parsed)) {
                        timestamp = parsed > 1000000000000 ? parsed : parsed * 1000; // Handle both seconds and milliseconds
                    }
                }
            }

            // Extract badges - get all badge images/icons next to the username
            const badges = {
                membershipTier: null,  // e.g., "#1", "#2" (crown badge) - extracted separately for special styling
                badgeImages: []        // All other badge images (wrench, hexagon, verified, etc.)
            };

            // Find author chip - this is where badges appear
            const authorChip = messageElement.querySelector('yt-live-chat-author-chip');
            
            // Look for membership tier badge - exact selector from DOM inspection
            // The badge is: <div class="yt-spec-button-shape-next__button-text-content">#1</div>
            const tierBadgeEl = messageElement.querySelector('.yt-spec-button-shape-next__button-text-content');
            if (tierBadgeEl) {
                const tierText = tierBadgeEl.textContent?.trim() || '';
                const tierMatch = tierText.match(/#(\d+)/);
                if (tierMatch) {
                    badges.membershipTier = tierMatch[1];
                }
            }
            
            // Fallback: Search for "#1", "#2" pattern in author area
            if (!badges.membershipTier && usernameEl && usernameEl.parentElement) {
                const authorArea = usernameEl.parentElement;
                const authorAreaText = authorArea.textContent || '';
                const tierMatch = authorAreaText.match(/#(\d+)/);
                if (tierMatch) {
                    badges.membershipTier = tierMatch[1];
                }
            }
            
            // Extract all badge images/icons from the author chip - SIMPLE APPROACH!
            // Skip avatar container (#author-photo) and membership tier - everything else is a badge
            const seenBadgeSrcs = new Set(); // Track to prevent duplicates
            const avatarContainer = messageElement.querySelector('#author-photo');
            
            if (authorChip) {
                // Special logging for @nightbot to debug badge extraction
                const isNightbot = username && username.toLowerCase().includes('nightbot');
                if (isNightbot) {
                    
                    // Check for badge containers
                    const chipBadges = authorChip.querySelector('#chip-badges');
                    const chatBadges = authorChip.querySelector('#chat-badges');
                    
                    // Check for moderator class
                    const authorNameEl = authorChip.querySelector('#author-name');
                    const isModerator = authorNameEl && authorNameEl.classList.contains('moderator');
                }
                
                // Helper function to extract badge source from an element
                const extractBadgeSource = (el) => {
                    let badgeSrc = '';
                    let badgeAlt = '';
                    
                    // For IMG elements
                    if (el.tagName === 'IMG') {
                        badgeSrc = el.src || el.getAttribute('src') || el.getAttribute('data-src') || el.currentSrc || '';
                        badgeAlt = el.alt || el.getAttribute('aria-label') || '';
                    }
                    // For SVG elements
                    else if (el.tagName === 'SVG') {
                        badgeSrc = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(el.outerHTML)));
                        badgeAlt = el.getAttribute('aria-label') || el.getAttribute('title') || '';
                    }
                    // For yt-icon elements (like wrench badge)
                    else if (el.tagName === 'YT-ICON') {
                        badgeAlt = el.getAttribute('aria-label') || el.getAttribute('title') || '';
                        
                        // Try to find SVG - could be nested deep inside (e.g., yt-icon > span > div > svg)
                        let svg = el.querySelector('svg');
                        if (svg) {
                            try {
                                const svgHTML = svg.outerHTML;
                                badgeSrc = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgHTML)));
                                // Also get alt from SVG if available
                                if (!badgeAlt) {
                                    badgeAlt = svg.getAttribute('aria-label') || svg.getAttribute('title') || '';
                                }
                                // Debug: Log SVG path data to identify which icon this is
                                const pathData = svg.querySelector('path')?.getAttribute('d') || 'no path';
                                const viewBox = svg.getAttribute('viewBox') || 'no viewBox';
                            } catch (e) {
                            }
                        }
                        
                        // Try img inside
                        if (!badgeSrc) {
                            const img = el.querySelector('img');
                            if (img) {
                                badgeSrc = img.src || img.getAttribute('src') || img.getAttribute('data-src') || img.currentSrc || '';
                                if (!badgeAlt) {
                                    badgeAlt = img.alt || img.getAttribute('aria-label') || '';
                                }
                            }
                        }
                        
                        // Try shadow DOM
                        if (!badgeSrc && el.shadowRoot) {
                            try {
                                const shadowSvg = el.shadowRoot.querySelector('svg');
                                const shadowImg = el.shadowRoot.querySelector('img');
                                if (shadowSvg) {
                                    badgeSrc = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(shadowSvg.outerHTML)));
                                } else if (shadowImg) {
                                    badgeSrc = shadowImg.src || shadowImg.getAttribute('src') || '';
                                }
                            } catch (e) {
                                // Shadow DOM access might fail
                            }
                        }
                        
                        // If we still don't have a source, log for debugging
                        if (!badgeSrc) {
                        }
                    }
                    
                    return { src: badgeSrc, alt: badgeAlt };
                };
                
                // Get ALL images/icons/SVG from author chip
                // Also explicitly check badge containers
                const chipBadges = authorChip.querySelector('#chip-badges');
                const chatBadges = authorChip.querySelector('#chat-badges');
                
                // Collect yt-icons from multiple sources
                const allYtIcons = new Set();
                authorChip.querySelectorAll('yt-icon').forEach(icon => allYtIcons.add(icon));
                if (chipBadges) {
                    chipBadges.querySelectorAll('yt-icon').forEach(icon => allYtIcons.add(icon));
                }
                if (chatBadges) {
                    chatBadges.querySelectorAll('yt-icon').forEach(icon => allYtIcons.add(icon));
                }
                
                const allImages = authorChip.querySelectorAll('img');
                const allSvgs = authorChip.querySelectorAll('svg');
                
                const ytIconsArray = Array.from(allYtIcons);
                
                if (isNightbot) {
                    ytIconsArray.forEach((icon, idx) => {
                        const ariaLabel = icon.getAttribute('aria-label') || '';
                        const svg = icon.querySelector('svg');
                        const svgPath = svg ? svg.querySelector('path')?.getAttribute('d')?.substring(0, 50) : 'no svg';
                    });
                }
                
                // Helper to check if element should be skipped
                const shouldSkip = (el) => {
                    // Skip if inside avatar container
                    if (avatarContainer && avatarContainer.contains(el)) {
                        return true;
                    }
                    // Skip if inside membership tier container
                    if (badges.membershipTier && el.closest('.yt-spec-button-shape-next__button-text-content')) {
                        return true;
                    }
                    // Skip if SVG is inside a yt-icon (we'll extract from yt-icon itself)
                    if (el.tagName === 'SVG' && el.closest('yt-icon')) {
                        return true;
                    }
                    return false;
                };
                
                // Track processed elements to prevent processing the same element twice
                const processedElements = new Set();
                
                // Process yt-icon elements first
                ytIconsArray.forEach(iconEl => {
                    // Skip if we've already processed this exact element
                    if (processedElements.has(iconEl)) {
                        return;
                    }
                    
                    const ariaLabel = iconEl.getAttribute('aria-label') || '';
                    
                    // Debug: log all yt-icon elements found with full details
                    const svgInside = iconEl.querySelector('svg');
                    const svgPath = svgInside ? svgInside.querySelector('path')?.getAttribute('d')?.substring(0, 50) : 'none';
                    
                    if (shouldSkip(iconEl)) {
                        return;
                    }
                    
                    const { src: badgeSrc, alt: badgeAlt } = extractBadgeSource(iconEl);
                    
                    if (!badgeSrc) {
                        return;
                    }
                    
                    // Check for duplicates BEFORE adding - log full base64 for comparison
                    if (badgeSrc.includes('data:image/gif;base64')) {
                        return;
                    }
                    
                    if (seenBadgeSrcs.has(badgeSrc)) {
                        return;
                    }
                    
                    // Mark element as processed and source as seen
                    processedElements.add(iconEl);
                    seenBadgeSrcs.add(badgeSrc);
                    
                    badges.badgeImages.push({
                        src: badgeSrc,
                        alt: badgeAlt,
                        element: iconEl
                    });
                });
                
                // Process regular images
                allImages.forEach(imgEl => {
                    if (shouldSkip(imgEl)) return;
                    
                    const { src: badgeSrc, alt: badgeAlt } = extractBadgeSource(imgEl);
                    
                    if (!badgeSrc || 
                        badgeSrc.includes('data:image/gif;base64') ||
                        seenBadgeSrcs.has(badgeSrc)) {
                        return;
                    }
                    
                    seenBadgeSrcs.add(badgeSrc);
                    badges.badgeImages.push({
                        src: badgeSrc,
                        alt: badgeAlt,
                        element: imgEl
                    });
                });
                
                // Process standalone SVG elements (not inside yt-icon)
                allSvgs.forEach(svgEl => {
                    if (shouldSkip(svgEl)) return;
                    
                    const { src: badgeSrc, alt: badgeAlt } = extractBadgeSource(svgEl);
                    
                    if (!badgeSrc || 
                        badgeSrc.includes('data:image/gif;base64') ||
                        seenBadgeSrcs.has(badgeSrc)) {
                        return;
                    }
                    
                    seenBadgeSrcs.add(badgeSrc);
                    badges.badgeImages.push({
                        src: badgeSrc,
                        alt: badgeAlt,
                        element: svgEl
                    });
                });
            }

            // Log total badges found for debugging
            if (badges.badgeImages.length > 0) {
            }
            
            // Special logging for @nightbot - ALWAYS log, even if no badges found
            const isNightbotCheck = username && username.toLowerCase().includes('nightbot');
            if (isNightbotCheck) {
                if (badges.badgeImages.length > 0) {
                    badges.badgeImages.forEach((badge, idx) => {
                    });
                } else {
                }
            }
            
            // Ensure textHtml is set (should already be set from extraction)
            if (!textHtml && text) {
                textHtml = this.escapeHtml(text);
            }
            
            // If we have text but textHtml is empty or failed, recreate it from text
            // This handles cases where emoji extraction might have failed but we still have text
            if (text && text.trim().length > 0 && (!textHtml || textHtml.trim().length === 0)) {
                textHtml = this.escapeHtml(text);
            }
            
            // For emoji-only messages, ensure textHtml has content even if text is empty
            if (!textHtml || textHtml.trim().length === 0) {
                // If we have no HTML content at all, check if we should still accept it
            }
            
            // Validate: message must have ID and either text content or HTML content (for emoji-only messages)
            // Allow messages with only HTML content (emoji-only messages)
            if (!id) {
                return null; // Invalid message - no ID
            }
            
            // More lenient validation - accept if we have text OR textHtml with any content
            const hasText = text && text.trim().length > 0;
            const hasHtml = textHtml && textHtml.trim().length > 0;
            
            if (!hasText && !hasHtml) {
                return null; // Invalid message - no content
            }
            
            // Log successful extraction for debugging
            if (hasText && hasHtml) {
            }
            
            const messageData = {
                id,
                username,
                text: text || '', // Plain text version (for search/filtering) - allow empty for emoji-only
                textHtml: textHtml || '', // HTML version with emoji images
                avatar,
                timestamp,
                timestampText,
                badges,
                domOrder: domOrder !== null ? domOrder : undefined // DOM order for tiebreaking when timestamps are equal
            };
            
            // Debug: Log successful extraction for emoji-only messages
            if ((!text || text.trim().length === 0) && textHtml && textHtml.includes('<img')) {
            }
            
            return messageData;
        } catch (error) {
            return null;
        }
    }

    /**
     * Check if message should be processed (unified duplicate detection)
     * Returns object with shouldProcess flag and optional oldIdToRemove for replacement
     * @param {Object} messageData - Message data
     * @returns {Object} {shouldProcess: boolean, oldIdToRemove: string|null}
     */
    checkDuplicateAndShouldProcess(messageData) {
        const messagesContainer = document.getElementById('chat-reader-messages');
        
        // Check if message with same ID already exists in DOM
        if (messagesContainer) {
            const existingById = messagesContainer.querySelector(`[data-message-id="${messageData.id}"]`);
            if (existingById) {
                return { shouldProcess: false, oldIdToRemove: null };
            }
        }
        
        // Content-based duplicate detection (username+text+timestamp within 1000ms)
        let contentForKey = messageData.text && messageData.text.trim().length > 0 
            ? messageData.text 
            : (messageData.textHtml || ''); // For emoji-only messages, use textHtml
        const contentKey = `${messageData.username}:${contentForKey}`;
        const recentMessage = this.recentMessagesByContent.get(contentKey);
        const messageTimestamp = messageData.timestamp;
        const TIME_WINDOW = 1000; // 1000ms - only filter if timestamps are VERY close (optimistic duplicate)
        
        // Check if duplicate within time window and different IDs
        if (recentMessage && Math.abs(messageTimestamp - recentMessage.timestamp) < TIME_WINDOW && recentMessage.id !== messageData.id) {
            // Found a duplicate within time window
            // Check if avatar is a placeholder: data URIs, 1x1 transparent GIFs, or not a valid YouTube CDN URL
            const isPlaceholderAvatar = !messageData.avatar || 
                messageData.avatar.includes('data:image/gif;base64') ||
                messageData.avatar.includes('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7') ||
                !messageData.avatar.match(/https?:\/\/(yt[34]\.ggpht\.com|i\.ytimg\.com)/);
            const existingIsPlaceholder = !recentMessage.avatar || 
                recentMessage.avatar.includes('data:image/gif;base64') ||
                recentMessage.avatar.includes('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7') ||
                !recentMessage.avatar.match(/https?:\/\/(yt[34]\.ggpht\.com|i\.ytimg\.com)/);
            
            if (isPlaceholderAvatar && !existingIsPlaceholder) {
                // New message has placeholder avatar but existing has real avatar - skip the new one
                return { shouldProcess: false, oldIdToRemove: null };
            } else if (!isPlaceholderAvatar && existingIsPlaceholder) {
                // New message has real avatar but existing has placeholder - replace the old one
                // Update tracking
                this.recentMessagesByContent.set(contentKey, {
                    id: messageData.id,
                    username: messageData.username,
                    text: messageData.text,
                    avatar: messageData.avatar,
                    timestamp: messageTimestamp
                });
                return { shouldProcess: true, oldIdToRemove: recentMessage.id };
            } else {
                // Both have same avatar type (both real or both placeholder)
                // Keep the newer one (second message) as it's more likely to be the final/correct version
                // Replace the old one with the new one
                this.recentMessagesByContent.set(contentKey, {
                    id: messageData.id,
                    username: messageData.username,
                    text: messageData.text,
                    avatar: messageData.avatar,
                    timestamp: messageTimestamp
                });
                return { shouldProcess: true, oldIdToRemove: recentMessage.id };
            }
        } else {
            // No recent duplicate found - but check if this is a placeholder that might be replaced soon
            const isPlaceholderAvatar = !messageData.avatar || 
                messageData.avatar.includes('data:image/gif;base64') ||
                messageData.avatar.includes('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7') ||
                !messageData.avatar.match(/https?:\/\/(yt[34]\.ggpht\.com|i\.ytimg\.com)/);
            
            // If this is a placeholder, we'll process it but track it
            // If a real avatar version comes within the time window, it will replace this one
            // Add to tracking
            this.recentMessagesByContent.set(contentKey, {
                id: messageData.id,
                username: messageData.username,
                text: messageData.text,
                avatar: messageData.avatar,
                timestamp: messageTimestamp
            });
            
            // Clean up old entries from the map (older than 10 seconds)
            const now = Date.now();
            for (const [key, value] of this.recentMessagesByContent.entries()) {
                if (now - value.timestamp > 10000) {
                    this.recentMessagesByContent.delete(key);
                }
            }
            
            return { shouldProcess: true, oldIdToRemove: null };
        }
    }

    /**
     * Check if username is one of the user's own usernames (needs delay)
     * @param {string} username - Username to check
     * @returns {boolean}
     */
    isOwnUsername(username) {
        if (!username) return false;
        const usernameLower = username.toLowerCase().replace('@', '');
        return this.userOwnUsernames.some(own => usernameLower === own.toLowerCase());
    }
    
    /**
     * Check if avatar is a placeholder
     * @param {string} avatar - Avatar URL
     * @returns {boolean}
     */
    isPlaceholderAvatar(avatar) {
        return !avatar || 
            avatar.includes('data:image/gif;base64') ||
            avatar.includes('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7') ||
            !avatar.match(/https?:\/\/(yt[34]\.ggpht\.com|i\.ytimg\.com)/);
    }
    
    /**
     * Compare two messages and return the better one
     * Prefers: real avatar over placeholder, newer over older
     * @param {Object} msg1 - First message
     * @param {Object} msg2 - Second message
     * @returns {Object} The better message
     */
    compareMessages(msg1, msg2) {
        const msg1IsPlaceholder = this.isPlaceholderAvatar(msg1.avatar);
        const msg2IsPlaceholder = this.isPlaceholderAvatar(msg2.avatar);
        
        // If one has real avatar and one has placeholder, prefer the real one
        if (msg1IsPlaceholder && !msg2IsPlaceholder) {
            return msg2;
        }
        if (!msg1IsPlaceholder && msg2IsPlaceholder) {
            return msg1;
        }
        
        // Both have same avatar type - prefer the newer one (higher timestamp)
        return (msg2.timestamp || 0) > (msg1.timestamp || 0) ? msg2 : msg1;
    }

    async onNewMessage(messageData) {
        // DEBUG: Log all new messages
        const isOwnUser = this.isOwnUsername(messageData.username);
        if (isOwnUser) {
            console.log('[Chat Reader] 🔍 New message from own user:', {
                id: messageData.id,
                username: messageData.username,
                text: (messageData.text || messageData.textHtml || '').substring(0, 50),
                timestamp: messageData.timestamp,
                avatar: messageData.avatar ? 'has avatar' : 'no avatar'
            });
        }
        
        // Use unified duplicate detection - same logic for both display and server send
        const { shouldProcess, oldIdToRemove } = this.checkDuplicateAndShouldProcess(messageData);
        
        if (!shouldProcess) {
            // Duplicate detected - don't show and don't send to server
            if (isOwnUser) {
                console.log('[Chat Reader] ❌ Duplicate detected, skipping:', messageData.id);
            }
            // Also cancel any pending send for this content
            let contentForKey = messageData.text && messageData.text.trim().length > 0 
                ? messageData.text 
                : (messageData.textHtml || '');
            const contentKey = `${messageData.username}:${contentForKey}`;
            const pending = this.pendingUserSends.get(contentKey);
            if (pending) {
                clearTimeout(pending.timeout);
                this.pendingUserSends.delete(contentKey);
            }
            return;
        }
        
        if (isOwnUser) {
            console.log('[Chat Reader] ✅ Message passed duplicate check, processing:', messageData.id);
        }
        
        // If we need to replace an old message, remove it from overlay first
        if (oldIdToRemove) {
            const messagesContainer = document.getElementById('chat-reader-messages');
            if (messagesContainer) {
                const oldMessageEl = messagesContainer.querySelector(`[data-message-id="${oldIdToRemove}"]`);
                if (oldMessageEl) {
                    oldMessageEl.remove();
                    this.addedToOverlayIds.delete(oldIdToRemove);
                    this.messageCount = Math.max(0, this.messageCount - 1);
                    const countEl = document.getElementById('chat-reader-count');
                    if (countEl) {
                        countEl.textContent = this.messageCount;
                    }
                }
            }
        }
        
        // Show in extension overlay
        this.addMessageToOverlay(messageData);
        
        // Check if this is from user's own username (needs 1-second delay)
        // Note: isOwnUser is already declared at the top of this function
        if (isOwnUser) {
            // Delay sending by 1 second to catch duplicates
            let contentForKey = messageData.text && messageData.text.trim().length > 0 
                ? messageData.text 
                : (messageData.textHtml || '');
            const contentKey = `${messageData.username}:${contentForKey}`;
            
            // Check if there's already a pending send for this content
            const existingPending = this.pendingUserSends.get(contentKey);
            if (existingPending) {
                // Duplicate arrived within the delay window - compare and only send the better one
                console.log('[Chat Reader] 🔄 Duplicate found in delay window, comparing messages');
                clearTimeout(existingPending.timeout);
                const betterMessage = this.compareMessages(existingPending.messageData, messageData);
                this.pendingUserSends.delete(contentKey);
                
                // Send only the better one
                console.log('[Chat Reader] 📤 Sending better message immediately:', betterMessage.id);
                this.sendMessageToServer(betterMessage);
            } else {
                // No duplicate yet - delay sending by 1 second
                console.log('[Chat Reader] ⏳ Scheduling send in 1 second for:', messageData.id);
                const timeout = setTimeout(() => {
                    console.log('[Chat Reader] ⏰ 1-second delay expired, sending:', messageData.id);
                    this.pendingUserSends.delete(contentKey);
                    this.sendMessageToServer(messageData);
                }, 1000);
                
                this.pendingUserSends.set(contentKey, { timeout, messageData });
            }
        } else {
            // Not user's own message - send immediately
            this.sendMessageToServer(messageData);
        }
    }
    
    async sendMessageToServer(messageData) {
        // DEBUG: Log when sending to server
        const isOwnUser = this.isOwnUsername(messageData.username);
        if (isOwnUser) {
            console.log('[Chat Reader] 📤 sendMessageToServer called for:', {
                id: messageData.id,
                username: messageData.username,
                text: (messageData.text || messageData.textHtml || '').substring(0, 50)
            });
        }
        
        // Prepare data to send - clean badges to remove DOM element references
        let cleanedBadges = null;
        if (messageData.badges) {
            cleanedBadges = {
                membershipTier: messageData.badges.membershipTier || null,
                badgeImages: (messageData.badges.badgeImages || []).map(badge => ({
                    src: badge.src || '',
                    alt: badge.alt || ''
                    // Remove 'element' property - can't be cloned by Firefox
                }))
            };
        }
        
        const dataToSend = {
            id: messageData.id,
            username: messageData.username,
            text: messageData.text || '',
            textHtml: messageData.textHtml || '',
            avatar: messageData.avatar || '',
            timestamp: messageData.timestamp,
            timestampText: messageData.timestampText || '',
            badges: cleanedBadges,
            domOrder: messageData.domOrder // DOM order for tiebreaking when timestamps are equal
        };
        
        // Log message being sent
        this.logSentMessage(dataToSend);
        
        // Send to server via background script (required for Firefox)
        try {
            if (isOwnUser) {
                console.log('[Chat Reader] 📡 Sending to background script...');
            }
            const result = await browser.runtime.sendMessage({
                action: 'sendChat',
                data: dataToSend
            });
            
            if (isOwnUser) {
                console.log('[Chat Reader] 📥 Background script response:', result);
            }
            
            if (!result || !result.success) {
                // Server returned error or network error
                if (isOwnUser) {
                    console.log('[Chat Reader] ❌ Server error:', result?.error || 'Unknown error');
                }
                this.serverFailedCount++;
                const error = result?.error || { type: 'UNKNOWN_ERROR', message: 'Unknown error' };
                const errorDetails = {
                    type: error.type || 'NETWORK_ERROR',
                    message: error.message || 'Connection failed',
                    diagnostic: error.diagnostic || '',
                    status: error.status,
                    statusText: error.statusText,
                    body: error.body,
                    stack: error.stack || '',
                    timestamp: new Date().toISOString(),
                    messageId: messageData.id,
                    username: messageData.username,
                    text: (messageData.text || '').substring(0, 50), // Include text for debugging
                    url: 'http://localhost:3000/api/chat',
                    userAgent: navigator.userAgent,
                    browser: this.detectBrowser()
                };
                this.logError(errorDetails);
                this.lastServerError = `${errorDetails.type}: ${errorDetails.message}`;
                this.updateServerStatus('error', this.lastServerError);
                
                // Also log the failed message in sent log with failure flag
                const failedMsg = this.sentMessagesLog.find(m => m.id === messageData.id);
                if (failedMsg) {
                    failedMsg.failed = true;
                    failedMsg.failureReason = errorDetails.message;
                }
            } else {
                // Success!
                if (isOwnUser) {
                    console.log('[Chat Reader] ✅ Server response success for:', messageData.id);
                }
                this.serverSentCount++;
                this.lastServerSuccess = new Date().toLocaleTimeString();
                this.updateServerStatus('success', `Sent at ${this.lastServerSuccess}`);
                
                // Check if server was cleared (serverClearTimestamp is newer than what we last saw)
                if (result.serverClearTimestamp && 
                    result.serverClearTimestamp !== this.lastServerClearTimestamp &&
                    this.lastServerClearTimestamp !== null) {
                    // Server was cleared - reset our tracking so we can re-process messages
                    console.log('[Chat Reader] Server was cleared - resetting message tracking');
                    this.processedMessageIds.clear();
                    this.recentMessagesByContent.clear();
                    this.addedToOverlayIds.clear();
                }
                this.lastServerClearTimestamp = result.serverClearTimestamp || null;
                
                // Mark message as successful in sent log
                const sentMsg = this.sentMessagesLog.find(m => m.id === messageData.id);
                if (sentMsg) {
                    sentMsg.success = true;
                }
            }
        } catch (error) {
            // Error sending message to background script
            if (isOwnUser) {
                console.error('[Chat Reader] ❌ Exception in sendMessageToServer:', error);
            }
            this.serverFailedCount++;
            const errorDetails = {
                type: 'MESSAGE_ERROR',
                message: error.message || 'Failed to communicate with background script',
                stack: error.stack || '',
                timestamp: new Date().toISOString(),
                messageId: messageData.id,
                username: messageData.username,
                browser: this.detectBrowser()
            };
            this.logError(errorDetails);
            this.lastServerError = `MESSAGE_ERROR: ${errorDetails.message}`;
            this.updateServerStatus('error', this.lastServerError);
        }
    }
    
    detectBrowser() {
        const ua = navigator.userAgent;
        if (ua.includes('Firefox')) return 'Firefox';
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Safari')) return 'Safari';
        if (ua.includes('Edge')) return 'Edge';
        return 'Unknown';
    }
    
    async testServerConnection() {
        const btn = document.getElementById('chat-reader-test-connection');
        const originalText = btn.textContent;
        btn.textContent = '⏳ Testing...';
        btn.disabled = true;
        
        try {
            const result = await browser.runtime.sendMessage({
                action: 'testConnection'
            });
            
            if (result && result.success) {
                btn.textContent = '✅ Connected!';
                btn.style.background = 'rgba(74, 222, 128, 0.3)';
                this.updateServerStatus('success', result.message || 'Server reachable');
            } else {
                btn.textContent = '❌ Failed';
                btn.style.background = 'rgba(239, 68, 68, 0.3)';
                this.updateServerStatus('error', result?.message || 'Connection failed');
                
                // Log test error
                this.logError({
                    type: 'CONNECTION_TEST_FAILED',
                    message: result?.message || result?.error || 'Connection test failed',
                    timestamp: new Date().toISOString(),
                    browser: this.detectBrowser()
                });
            }
        } catch (error) {
            btn.textContent = '❌ Failed';
            btn.style.background = 'rgba(239, 68, 68, 0.3)';
            this.updateServerStatus('error', 'Failed to communicate with background script');
            
            // Log test error
            this.logError({
                type: 'CONNECTION_TEST_FAILED',
                message: error.message || 'Failed to communicate with background script',
                timestamp: new Date().toISOString(),
                browser: this.detectBrowser()
            });
        } finally {
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '';
                btn.disabled = false;
            }, 3000);
        }
    }
    
    logError(errorDetails) {
        // Keep last 20 errors
        this.errorLog.push(errorDetails);
        if (this.errorLog.length > 20) {
            this.errorLog.shift();
        }
    }
    
    logSentMessage(messageData) {
        // Keep last 100 sent messages
        this.sentMessagesLog.push({
            ...messageData,
            sentAt: Date.now(),
            sentAtText: new Date().toLocaleTimeString()
        });
        if (this.sentMessagesLog.length > 100) {
            this.sentMessagesLog.shift();
        }
    }
    
    copySentMessagesLogToClipboard() {
        if (this.sentMessagesLog.length === 0) {
            alert('No messages logged yet.');
            return;
        }
        
        const logText = this.sentMessagesLog.map((msg, index) => {
            const status = msg.failed ? `❌ FAILED: ${msg.failureReason || 'Unknown error'}` : (msg.success ? '✅ Success' : '⏳ Pending');
            return `Message #${index + 1}:
Status: ${status}
ID: ${msg.id || 'NO ID'}
Username: ${msg.username || 'NO USERNAME'}
Text: ${(msg.text || '').substring(0, 100)}${(msg.text || '').length > 100 ? '...' : ''}
TextHtml Length: ${(msg.textHtml || '').length}
Avatar: ${msg.avatar ? 'Yes' : 'No'}
Timestamp: ${msg.timestamp}
TimestampText: ${msg.timestampText || ''}
Badges: ${msg.badges ? (msg.badges.membershipTier ? `Tier #${msg.badges.membershipTier}` : '') + (msg.badges.badgeImages ? ` + ${msg.badges.badgeImages.length} images` : '') : 'None'}
Sent At: ${msg.sentAtText}
---
`;
        }).join('\n');
        
        const summary = `Chat Reader - Sent Messages Log
Total Messages Sent: ${this.sentMessagesLog.length}
Server Sent Count: ${this.serverSentCount}
Server Failed Count: ${this.serverFailedCount}

=== SENT MESSAGES ===

${logText}`;
        
        // Copy to clipboard
        navigator.clipboard.writeText(summary).then(() => {
            const btn = document.getElementById('chat-reader-copy-sent-log');
            const originalText = btn.textContent;
            btn.textContent = '✅ Copied!';
            btn.style.background = 'rgba(74, 222, 128, 0.3)';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '';
            }, 2000);
        }).catch(err => {
            alert('Failed to copy to clipboard. Error: ' + err.message);
        });
    }
    
    copyErrorLogToClipboard() {
        if (this.errorLog.length === 0) {
            alert('No errors logged yet.');
            return;
        }
        
        const errorText = this.errorLog.map((error, index) => {
            return `Error #${index + 1}:
Type: ${error.type}
Message: ${error.message}
Timestamp: ${error.timestamp}
${error.diagnostic ? `Diagnostic: ${error.diagnostic}` : ''}
${error.messageId ? `Message ID: ${error.messageId}` : ''}
${error.username ? `Username: ${error.username}` : ''}
${error.status ? `HTTP Status: ${error.status} ${error.statusText || ''}` : ''}
${error.body ? `Response Body: ${error.body}` : ''}
${error.browser ? `Browser: ${error.browser}` : ''}
${error.userAgent ? `User Agent: ${error.userAgent}` : ''}
${error.stack ? `Stack: ${error.stack}` : ''}
${error.url ? `URL: ${error.url}` : ''}
---
`;
        }).join('\n');
        
        const summary = `Chat Reader Error Log
Total Errors: ${this.errorLog.length}
Sent: ${this.serverSentCount}
Failed: ${this.serverFailedCount}
Last Success: ${this.lastServerSuccess || 'Never'}
Last Error: ${this.lastServerError || 'None'}

=== ERROR DETAILS ===

${errorText}`;
        
        // Copy to clipboard
        navigator.clipboard.writeText(summary).then(() => {
            const btn = document.getElementById('chat-reader-copy-errors');
            const originalText = btn.textContent;
            btn.textContent = '✅ Copied!';
            btn.style.background = 'rgba(74, 222, 128, 0.3)';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '';
            }, 2000);
        }).catch(err => {
            alert('Failed to copy to clipboard. Error: ' + err.message);
        });
    }
    
    updateServerStatus(status, message) {
        const indicator = document.getElementById('server-status-indicator');
        const sentCount = document.getElementById('server-sent-count');
        const failedCount = document.getElementById('server-failed-count');
        const lastStatus = document.getElementById('server-last-status');
        const lastStatusText = document.getElementById('server-last-status-text');
        
        if (!indicator) return;
        
        // Update indicator
        indicator.className = `status-indicator status-${status}`;
        
        // Update counts
        if (sentCount) sentCount.textContent = this.serverSentCount;
        if (failedCount) failedCount.textContent = this.serverFailedCount;
        
        // Update collapsed sent count
        const collapsedSentCount = document.getElementById('collapsed-sent-count-value');
        if (collapsedSentCount) {
            collapsedSentCount.textContent = this.serverSentCount || '0';
        }
        
        // Update last status message
        if (lastStatus && lastStatusText) {
            lastStatus.style.display = 'flex';
            lastStatus.className = `status-row ${status}`;
            lastStatusText.textContent = message || '';
        }
    }

    createOverlay() {
        try {
            console.log('[Chat Reader] Creating overlay...');
            // Remove existing overlay if it exists
            const existing = document.getElementById('chat-reader-overlay');
            if (existing) {
                existing.remove();
            }

            // Create overlay container
            const overlay = document.createElement('div');
            overlay.id = 'chat-reader-overlay';
            overlay.innerHTML = `
                <div class="chat-reader-header">
                    <span class="collapsed-sent-count">Sent: <span id="collapsed-sent-count-value">0</span></span>
                    <h3>📺 Chat Reader</h3>
                    <div class="chat-reader-stats">
                        <span id="chat-reader-count">0</span> messages
                    </div>
                    <div class="chat-reader-buttons">
                        <button id="chat-reader-toggle" class="chat-reader-btn">−</button>
                        <button id="chat-reader-clear" class="chat-reader-btn">Clear</button>
                    </div>
                </div>
                <div class="chat-reader-server-status" id="chat-reader-server-status">
                    <div class="server-status-details">
                        <div class="status-row">
                            <span>Sent: <span id="server-sent-count">0</span></span>
                            <span>Failed: <span id="server-failed-count" style="color: #f87171;">0</span></span>
                            <span id="server-status-indicator" class="status-indicator status-unknown">●</span>
                        </div>
                        <div class="status-row" id="server-last-status" style="display: none;">
                            <span id="server-last-status-text"></span>
                        </div>
                    </div>
                    <div class="chat-reader-buttons">
                        <button id="chat-reader-test-connection" class="chat-reader-btn">🔌 Test</button>
                        <button id="chat-reader-copy-errors" class="chat-reader-btn">📋 Errors</button>
                        <button id="chat-reader-copy-sent-log" class="chat-reader-btn">📤 Sent</button>
                    </div>
                </div>
                <div id="chat-reader-messages" class="chat-reader-messages"></div>
            `;

            // Add styles
            const style = document.createElement('style');
            // Import Inter font
            const fontLink = document.createElement('link');
            fontLink.rel = 'stylesheet';
            fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap';
            document.head.appendChild(fontLink);
            
            style.textContent = `
                #chat-reader-overlay {
                    position: fixed;
                    top: 10px;
                    left: 20px;
                    width: 400px;
                    max-height: 600px;
                    background: rgba(10, 20, 40, 1.0);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(59, 130, 246, 0.55);
                    border-radius: 16px;
                    z-index: 999999;
                    font-family: 'Inter', sans-serif;
                    color: #fff;
                    box-shadow: 0 8px 40px rgba(59, 130, 246, 0.34);
                    display: flex; /* Re-enabled for debugging */
                    flex-direction: column;
                }
                #chat-reader-overlay.collapsed {
                    width: auto;
                    min-width: auto;
                    max-width: none;
                    height: auto;
                }
                #chat-reader-overlay.collapsed #chat-reader-messages {
                    display: none;
                }
                #chat-reader-overlay.collapsed .chat-reader-header h3 {
                    display: none;
                }
                #chat-reader-overlay.collapsed .chat-reader-stats {
                    display: none;
                }
                #chat-reader-overlay.collapsed #chat-reader-clear {
                    display: none;
                }
                #chat-reader-overlay.collapsed .chat-reader-server-status {
                    display: none;
                }
                #chat-reader-overlay.collapsed .chat-reader-header {
                    padding: 4px 8px;
                    gap: 6px;
                    min-width: auto;
                }
                #chat-reader-overlay.collapsed .chat-reader-header .collapsed-sent-count {
                    display: inline;
                    font-size: 11px;
                    color: #93c5fd;
                    margin-right: 6px;
                }
                .chat-reader-header .collapsed-sent-count {
                    display: none;
                }
                .chat-reader-header {
                    background: rgba(59, 130, 246, 0.2);
                    padding: 8px 12px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-bottom: 1px solid rgba(59, 130, 246, 0.3);
                    flex-shrink: 0;
                    gap: 8px;
                }
                .chat-reader-header h3 {
                    margin: 0;
                    font-size: 14px;
                    font-weight: 600;
                    color: #60a5fa;
                    flex-shrink: 0;
                    text-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
                }
                .chat-reader-stats {
                    font-size: 11px;
                    color: #93c5fd;
                    flex-shrink: 0;
                }
                .chat-reader-buttons {
                    display: flex;
                    gap: 4px;
                    flex-shrink: 0;
                }
                .chat-reader-btn {
                    background: rgba(59, 130, 246, 0.2);
                    border: 1px solid rgba(59, 130, 246, 0.4);
                    color: #bfdbfe;
                    padding: 4px 8px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 11px;
                    white-space: nowrap;
                    transition: all 0.2s ease;
                }
                .chat-reader-btn:hover {
                    background: rgba(59, 130, 246, 0.3);
                    border-color: rgba(59, 130, 246, 0.6);
                    color: #dbeafe;
                }
                #chat-reader-messages {
                    overflow-y: auto;
                    max-height: 270px;
                    padding: 8px;
                    flex: 1;
                }
                .chat-reader-message {
                    padding: 8px;
                    margin-bottom: 8px;
                    background: rgba(59, 130, 246, 0.08);
                    border-left: 3px solid rgba(59, 130, 246, 0.6);
                    border-radius: 6px;
                    font-size: 13px;
                }
                .chat-reader-message:hover {
                    background: rgba(59, 130, 246, 0.15);
                    border-left-color: rgba(59, 130, 246, 0.8);
                }
                .chat-reader-message-content {
                    display: flex;
                    gap: 10px;
                }
                .chat-reader-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    flex-shrink: 0;
                    object-fit: cover;
                }
                .chat-reader-avatar-placeholder {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.1);
                    flex-shrink: 0;
                }
                .chat-reader-message-body {
                    flex: 1;
                    min-width: 0;
                }
                .chat-reader-message-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 4px;
                }
                .chat-reader-username {
                    color: #60a5fa;
                    font-weight: 600;
                    text-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
                }
                .chat-reader-text {
                    color: #dbeafe;
                    word-wrap: break-word;
                    line-height: 1.4;
                }
                .chat-reader-emoji {
                    display: inline-block;
                    vertical-align: middle;
                    width: 24px !important;
                    height: 24px !important;
                    margin: 0 2px;
                    object-fit: contain;
                }
                .chat-reader-meta {
                    font-size: 11px;
                    color: #888;
                    margin-top: 4px;
                }
                .chat-reader-meta-inline {
                    font-size: 11px;
                    color: #888;
                    margin-left: auto;
                }
                .chat-reader-badge {
                    display: inline-block;
                    font-size: 9px;
                    padding: 1px 4px;
                    margin-left: 3px;
                    font-weight: 500;
                }
                .chat-reader-badge-tier {
                    background: #E0D9F7;
                    color: #000;
                    border: 1px solid #000;
                    border-radius: 16px;
                    font-size: 11px;
                    padding: 3px 10px;
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    height: 18px;
                    line-height: 1;
                }
                .chat-reader-badge-owner {
                    display: inline-flex;
                    align-items: center;
                    font-size: 14px;
                    margin-left: 6px;
                    padding: 0;
                }
                .chat-reader-badge-image {
                    display: inline-block;
                    width: 16px;
                    height: 16px;
                    margin-left: 6px;
                    vertical-align: middle;
                    object-fit: contain;
                }
                .chat-reader-server-status {
                    background: rgba(59, 130, 246, 0.1);
                    border-top: 1px solid rgba(59, 130, 246, 0.3);
                    border-bottom: 1px solid rgba(59, 130, 246, 0.3);
                    padding: 4px 12px;
                    font-size: 11px;
                    flex-shrink: 0;
                }
                .status-indicator {
                    font-size: 12px;
                    margin-left: auto;
                }
                .status-indicator.status-success {
                    color: #86efac;
                }
                .status-indicator.status-error {
                    color: #f87171;
                }
                .status-indicator.status-unknown {
                    color: #93c5fd;
                }
                .server-status-details {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .chat-reader-server-status .chat-reader-buttons {
                    margin-top: 4px;
                }
                .status-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 10px;
                    color: #bfdbfe;
                    gap: 8px;
                }
                .status-row span:first-child {
                    color: #93c5fd;
                }
                #server-last-status {
                    margin-top: 4px;
                    padding-top: 4px;
                    border-top: 1px solid rgba(59, 130, 246, 0.3);
                    font-size: 9px;
                    color: #93c5fd;
                    word-break: break-word;
                }
                #server-last-status.success {
                    color: #86efac;
                }
                #server-last-status.error {
                    color: #f87171;
                }
            `;
            document.head.appendChild(style);
            document.body.appendChild(overlay);
            console.log('[Chat Reader] Overlay created and appended to DOM');

            this.overlay = overlay;

            // Add event listeners
            document.getElementById('chat-reader-toggle').addEventListener('click', () => {
                overlay.classList.toggle('collapsed');
                const btn = document.getElementById('chat-reader-toggle');
                btn.textContent = overlay.classList.contains('collapsed') ? '+' : '−';
            });

            document.getElementById('chat-reader-clear').addEventListener('click', () => {
                document.getElementById('chat-reader-messages').innerHTML = '';
                this.messageCount = 0;
                document.getElementById('chat-reader-count').textContent = '0';
            });
            
            document.getElementById('chat-reader-copy-errors').addEventListener('click', () => {
                this.copyErrorLogToClipboard();
            });
            
            document.getElementById('chat-reader-copy-sent-log').addEventListener('click', () => {
                this.copySentMessagesLogToClipboard();
            });
            
            document.getElementById('chat-reader-test-connection').addEventListener('click', () => {
                this.testServerConnection();
            });

            console.log('[Chat Reader] Overlay setup complete');
        } catch (error) {
            console.error('[Chat Reader] Error creating overlay:', error);
        }
    }

    addMessageToOverlay(messageData) {
        if (!this.overlay) return;

        try {
            // Enhanced logging for user's own messages to debug duplicates
            const isUserMessage = messageData.username && messageData.username.toLowerCase().includes('retrohead');
            
            // Check if we've already added this message ID to overlay
            if (this.addedToOverlayIds.has(messageData.id)) {
                if (isUserMessage) {
                }
                return;
            }
            
            // Debug: Log emoji-only messages for troubleshooting
            const isEmojiOnly = (!messageData.text || messageData.text.trim() === '') && 
                               messageData.textHtml && 
                               messageData.textHtml.includes('<img');
            if (isEmojiOnly) {
            }
            
            const messagesContainer = document.getElementById('chat-reader-messages');
            if (!messagesContainer) return;
            
            // Duplicate detection is now handled in checkDuplicateAndShouldProcess()
            // This method is only called after duplicate check passes, so just display the message

            // Create message element
            const messageEl = document.createElement('div');
            messageEl.className = 'chat-reader-message';
            messageEl.setAttribute('data-message-id', messageData.id);
            
            // Use avatar if available, otherwise show a default placeholder
            const avatarUrl = messageData.avatar || '';
            const avatarHtml = avatarUrl 
                ? `<img src="${avatarUrl.replace(/"/g, '&quot;')}" alt="Avatar" class="chat-reader-avatar" onerror="this.style.display='none'">`
                : '<div class="chat-reader-avatar-placeholder"></div>';
            
            // Build message content structure first
            const messageContent = document.createElement('div');
            messageContent.className = 'chat-reader-message-content';
            
            // Avatar
            if (avatarUrl) {
                const avatarImg = document.createElement('img');
                avatarImg.src = avatarUrl;
                avatarImg.alt = 'Avatar';
                avatarImg.className = 'chat-reader-avatar';
                avatarImg.onerror = () => avatarImg.style.display = 'none';
                messageContent.appendChild(avatarImg);
            } else {
                const avatarPlaceholder = document.createElement('div');
                avatarPlaceholder.className = 'chat-reader-avatar-placeholder';
                messageContent.appendChild(avatarPlaceholder);
            }
            
            // Message body
            const messageBody = document.createElement('div');
            messageBody.className = 'chat-reader-message-body';
            
            // Header
            const messageHeader = document.createElement('div');
            messageHeader.className = 'chat-reader-message-header';
            
            // Username
            const usernameSpan = document.createElement('span');
            usernameSpan.className = 'chat-reader-username';
            usernameSpan.textContent = messageData.username;
            messageHeader.appendChild(usernameSpan);
            
            // Badges - use DOM methods to avoid HTML escaping issues
            if (messageData.badges) {
                // All other badge images (wrench, hexagon, verified, etc.)
                if (messageData.badges.badgeImages && messageData.badges.badgeImages.length > 0) {
                    messageData.badges.badgeImages.forEach((badge, index) => {
                        if (badge.src) {
                            const badgeImg = document.createElement('img');
                            badgeImg.src = badge.src; // Direct assignment - no escaping needed
                            badgeImg.alt = badge.alt || '';
                            badgeImg.className = 'chat-reader-badge-image';
                            badgeImg.title = badge.alt || '';
                            badgeImg.onerror = () => {
                                badgeImg.style.display = 'none';
                            };
                            messageHeader.appendChild(badgeImg);
                        }
                    });
                }
                
                // Membership tier badge (crown + number)
                if (messageData.badges.membershipTier) {
                    const tierBadge = document.createElement('span');
                    tierBadge.className = 'chat-reader-badge chat-reader-badge-tier';
                    tierBadge.textContent = `👑 #${messageData.badges.membershipTier}`;
                    messageHeader.appendChild(tierBadge);
                }
            }
            
            // Timestamp
            const timestampSpan = document.createElement('span');
            timestampSpan.className = 'chat-reader-meta-inline';
            timestampSpan.textContent = messageData.timestampText || new Date(messageData.timestamp).toLocaleTimeString();
            messageHeader.appendChild(timestampSpan);
            
            messageBody.appendChild(messageHeader);
            
            // Message text
            const textDiv = document.createElement('div');
            textDiv.className = 'chat-reader-text';
            if (messageData.textHtml) {
                textDiv.innerHTML = messageData.textHtml;
            } else {
                textDiv.textContent = messageData.text;
            }
            messageBody.appendChild(textDiv);
            
            messageContent.appendChild(messageBody);
            messageEl.appendChild(messageContent);

            // Insert message in timestamp order (oldest first, newest last)
            // Get all existing messages with their timestamps
            const existingMessages = Array.from(messagesContainer.children);
            let inserted = false;
            
            for (let i = 0; i < existingMessages.length; i++) {
                const existingMsg = existingMessages[i];
                const existingTimestamp = existingMsg.getAttribute('data-timestamp');
                
                // If existing message has timestamp and it's newer, insert before it
                if (existingTimestamp && parseInt(existingTimestamp) > messageData.timestamp) {
                    messagesContainer.insertBefore(messageEl, existingMsg);
                    inserted = true;
                    break;
                }
            }
            
            // If not inserted, append to end (newest message)
            if (!inserted) {
                messagesContainer.appendChild(messageEl);
            }
            
            // Store timestamp as data attribute for sorting
            messageEl.setAttribute('data-timestamp', messageData.timestamp);
            
            // Auto-scroll to bottom to show new message
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // Mark this message as added to prevent duplicates
            this.addedToOverlayIds.add(messageData.id);

            // Keep only last 50 messages (remove oldest from top)
            while (messagesContainer.children.length > 50) {
                const removedMsg = messagesContainer.firstChild;
                const removedId = removedMsg?.getAttribute('data-message-id');
                if (removedId) {
                    this.addedToOverlayIds.delete(removedId);
                }
                messagesContainer.removeChild(removedMsg);
            }

            // Update counter
            this.messageCount++;
            document.getElementById('chat-reader-count').textContent = this.messageCount;
        } catch (error) {
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    stop() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.isActive = false;
    }
}

    // Wrap in try-catch to handle any initialization errors
    let chatReader;
    try {
        chatReader = new YouTubeChatReader();
        
        // Expose diagnostic function globally for manual inspection
        window.chatReaderDiagnostic = () => {
            if (chatReader) {
                chatReader.diagnosePage();
            } else {
            }
        };
        
        // Helper function to inspect badge elements in a message
        window.inspectMessageBadges = (messageElement) => {
            if (!messageElement) {
                return;
            }
            
            
            // Find author chip
            const authorChip = messageElement.querySelector('yt-live-chat-author-chip');
            
            if (authorChip) {
                
                // Find all child elements
                const allChildren = authorChip.querySelectorAll('*');
                allChildren.forEach((child, idx) => {
                    if (idx < 20) {
                    }
                });
            }
            
            // Search for badge-like elements
            const badgeSelectors = [
                '[class*="badge"]',
                '[class*="sponsor"]',
                '[class*="member"]',
                '[class*="tier"]',
                '[class*="crown"]',
                '[id*="badge"]',
                '[id*="sponsor"]'
            ];
            
            badgeSelectors.forEach(selector => {
                const elements = messageElement.querySelectorAll(selector);
                if (elements.length > 0) {
                    elements.forEach((el, idx) => {
                        if (idx < 5) {
                        }
                    });
                }
            });
            
            // Check for "#1", "#2" pattern in text
            const allText = messageElement.textContent || '';
            const tierMatches = allText.match(/#(\d+)/g);
            if (tierMatches) {
            }
        };
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            try {
                if (chatReader) {
                    chatReader.stop();
                }
            } catch (e) {
                // Ignore cleanup errors
            }
        });
    } catch (error) {
    }

})();

