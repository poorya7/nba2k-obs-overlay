/**
 * Chat Message Box Auto-Fit Font Size
 * Reduces font size only if it can pull an orphan word up to the previous line
 */

const baseFontSize = 22;
const minFontSize = 18;

function optimizeMessageFontSize() {
    // First, reset all non-last messages to base font size (safety check)
    const allMessages = document.querySelectorAll('.chat-style-13 .chat-message');
    allMessages.forEach((msg, index) => {
        if (index < allMessages.length - 1) {
            // Not the last message - reset font sizes
            const text = msg.querySelector('.chat-text');
            const username = msg.querySelector('.chat-username');
            if (text) text.style.fontSize = '';
            if (username) username.style.fontSize = '';
        }
    });

    // Get the last (newest) chat message
    const chatMessage = document.querySelector('.chat-style-13 .chat-message:last-child');
    if (!chatMessage) return;

    const chatUsername = chatMessage.querySelector('.chat-username');
    const chatText = chatMessage.querySelector('.chat-text');
    if (!chatText) return;

    // Keep username at base font size always
    if (chatUsername) {
        chatUsername.style.fontSize = baseFontSize + 'px';
    }

    // Get line count at base font size
    chatText.style.fontSize = baseFontSize + 'px';
    const baseLineCount = getLineCount(chatText);

    let bestFontSize = baseFontSize;

    for (let fontSize = baseFontSize - 0.5; fontSize >= minFontSize; fontSize -= 0.5) {
        chatText.style.fontSize = fontSize + 'px';
        const newLineCount = getLineCount(chatText);

        // Only use smaller font if it reduces line count (pulls orphan word up)
        if (newLineCount < baseLineCount) {
            bestFontSize = fontSize;
            break;
        }
    }

    chatText.style.fontSize = bestFontSize + 'px';
}

function getLineCount(element) {
    const lineHeight = parseFloat(getComputedStyle(element).lineHeight) ||
                       parseFloat(getComputedStyle(element).fontSize) * 1.5;
    return Math.round(element.offsetHeight / lineHeight);
}

// Run on page load
document.addEventListener('DOMContentLoaded', optimizeMessageFontSize);

// Observe for new messages being added - only watch the messages container
const observer = new MutationObserver((mutations) => {
    let shouldOptimize = false;
    for (const mutation of mutations) {
        // Only trigger if a message element was added/removed, not text changes
        if (mutation.type === 'childList') {
            // Check if any added/removed nodes are chat messages
            const hasMessageChanges = 
                Array.from(mutation.addedNodes).some(node => 
                    node.nodeType === 1 && node.classList && node.classList.contains('chat-message')
                ) ||
                Array.from(mutation.removedNodes).some(node => 
                    node.nodeType === 1 && node.classList && node.classList.contains('chat-message')
                );
            if (hasMessageChanges) {
                shouldOptimize = true;
                break;
            }
        }
    }
    if (shouldOptimize) {
        // Small delay to ensure DOM is fully updated
        setTimeout(optimizeMessageFontSize, 10);
    }
});

// Start observing when DOM is ready - only watch the messages container, not the whole chat overlay
document.addEventListener('DOMContentLoaded', () => {
    const chatMessagesContainer = document.querySelector('.chat-style-13 .chat-messages');
    if (chatMessagesContainer) {
        observer.observe(chatMessagesContainer, {
            childList: true,
            subtree: false // Don't watch subtree, only direct children
        });
    }
});
