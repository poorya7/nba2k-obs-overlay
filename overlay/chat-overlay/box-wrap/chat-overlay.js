const usernameInput = document.getElementById('usernameInput');
const textInput = document.getElementById('textInput');
const username = document.getElementById('username');
const chatText = document.getElementById('chatText');
const chatMessage = document.getElementById('chatMessage');

const baseFontSize = 22;
const minFontSize = 18;

function updateText() {
    username.textContent = usernameInput.value || 'TestUser123';
    chatText.textContent = textInput.value || 'This is a test message for the chat overlay!';
    optimizeFontSize();
}

function optimizeFontSize() {
    // Only apply font sizing to chat text, not username
    username.style.fontSize = baseFontSize + 'px';

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

usernameInput.addEventListener('input', updateText);
textInput.addEventListener('input', updateText);
