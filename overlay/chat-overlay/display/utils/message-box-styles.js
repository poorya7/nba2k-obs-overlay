/**
 * Chat Message Box Auto-Fit Font Size
 * Reduces font size only if it can pull an orphan word up to the previous line
 */

const baseFontSize = 22;
const minFontSize = 18;

function optimizeMessageFontSize() {
    // First, reset all non-spotlight messages to base font size (safety check)
    const allMessages = document.querySelectorAll('.chat-style-13 .chat-message');
    allMessages.forEach((msg) => {
        if (!msg.classList.contains('spotlight')) {
            // Not a spotlight message - reset font sizes
            const text = msg.querySelector('.chat-text');
            const username = msg.querySelector('.chat-username');
            if (text) text.style.fontSize = '';
            if (username) username.style.fontSize = '';
        }
    });

    // Get the spotlight chat message
    const chatMessage = document.querySelector('.chat-style-13 .chat-message.spotlight');
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
        // Trigger if a message element was added/removed
        if (mutation.type === 'childList') {
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
        // Trigger if spotlight class was added/removed from a message
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const target = mutation.target;
            if (target.classList && target.classList.contains('chat-message')) {
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

// Start observing when DOM is ready - watch the messages container and class changes on children
document.addEventListener('DOMContentLoaded', () => {
    const chatMessagesContainer = document.querySelector('.chat-style-13 .chat-messages');
    if (chatMessagesContainer) {
        observer.observe(chatMessagesContainer, {
            childList: true,
            subtree: true, // Watch subtree to catch class changes on messages
            attributes: true, // Watch attribute changes
            attributeFilter: ['class'] // Only watch class attribute
        });
    }
});
