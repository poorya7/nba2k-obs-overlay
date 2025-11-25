# Title Overlay

Channel branding overlay for OBS Studio - displays the channel name and subtitle.

## Files

- `index.html` - Main overlay HTML
- `styles.css` - Styling for the title/subtitle

## Usage in OBS

1. Add a new **Browser Source**
2. Set URL to: `http://localhost:3000/overlay/title`
3. Set dimensions: 1920x1080
4. Check "Shutdown source when not visible"

## Customization

Edit the text in `index.html`:

```html
<div class="main-text">Silent Basketball</div>
<div class="sub-text">ASMR</div>
```

## Styling

- **Position**: Top-left (20px from top and left)
- **Font**: Russo One
- **Opacity**: Subtle (0.22 for main text, 0.154 for subtitle)
- **Effect**: Text shadow for depth

This overlay is static and always visible when the source is active in OBS.

