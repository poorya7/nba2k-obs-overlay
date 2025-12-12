# Chat Overlay - Text Wrapping & Font Optimization

A chat message overlay with circular text wrapping around profile pics and smart font shrinking to eliminate orphan words.

## How It Works

### 1. Circular Text Wrapping (CSS)

The text wraps around the profile pic in a **circle shape**, not a rectangle:

```css
.profile-pic {
    float: left;
    shape-outside: circle(30px at 30px 30px);
}
```

- `float: left` - makes text flow around the element
- `shape-outside: circle(30px at 30px 30px)` - defines a circular exclusion zone
  - First `30px` = radius of the circle
  - `at 30px 30px` = center point of the circle (center of a 60px wide element)

### 2. Smart Font Shrinking (JS)

Prevents ugly orphan words (single word alone on last line) by slightly reducing font size:

```js
const baseFontSize = 22;
const minFontSize = 18;

function optimizeFontSize() {
    // Count lines at base font size
    const baseLineCount = getLineCount(chatText);

    // Try smaller fonts (0.5px steps) until line count drops
    for (let fontSize = baseFontSize - 0.5; fontSize >= minFontSize; fontSize -= 0.5) {
        chatText.style.fontSize = fontSize + 'px';
        if (getLineCount(chatText) < baseLineCount) {
            // Orphan word pulled up! Use this size
            return;
        }
    }
}
```

**Logic:** If shrinking the font by a tiny bit causes the text to fit in fewer lines, that means an orphan word got pulled up to the previous line → cleaner look.

### 3. Line Counting

```js
function getLineCount(element) {
    const lineHeight = parseFloat(getComputedStyle(element).lineHeight) ||
                       parseFloat(getComputedStyle(element).fontSize) * 1.5;
    return Math.round(element.offsetHeight / lineHeight);
}
```

Divides element height by line-height to determine how many lines the text occupies.

## Key CSS Properties

| Property | Purpose |
|----------|---------|
| `shape-outside: circle()` | Text wraps in circular path around pic |
| `float: left` | Required for shape-outside to work |
| `word-break: break-all` | Breaks long usernames anywhere |
| `overflow-wrap: break-word` | Breaks long words in chat text |

## Customization

- **Profile pic size:** Change `width`/`height` on `.profile-pic` AND update `shape-outside` circle radius (half of width)
- **Font range:** Adjust `baseFontSize` and `minFontSize` in JS
- **Shrink steps:** Change the `0.5` decrement in the loop for finer/coarser adjustments

## File Structure

```
chat-overlay.html  - Structure (message container, inputs)
chat-overlay.css   - Styling + shape-outside magic
chat-overlay.js    - Font optimization logic
```
