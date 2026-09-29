---
name: Header logo sizing
description: The supplied header logo files include substantial transparent padding around the visible mark.
---

Header logo dimensions must be judged from the visible mark, not only the image element’s CSS width; the supplied PNG canvas contains generous transparent margins, so modest width increases can still look nearly unchanged.

**Why:** The brand assets are intentionally preserved and cannot be cropped for this header treatment, which makes the rendered image bounds the practical sizing control.

**How to apply:** Increase the bounded responsive image width enough to make the visible mark clear, then verify desktop, tablet, narrow mobile, theme switching, and the open mobile menu for fit.

For full wordmark placements, center the unmodified PNG inside a bounded overflow-hidden frame instead of cropping or rebuilding the asset.

**Why:** The transparent margins are part of the supplied brand files, but allowing the raw canvas to define layout height makes the wordmark either too small or visually disruptive.

**How to apply:** Size the frame to the surrounding section, center the full image within it, and keep the header and footer frame widths responsive independently.

The supplied black wordmark PNG is not a matching horizontal variant for the header/footer treatment. Reuse the verified white wordmark and apply a black contrast filter in light mode instead.

**Why:** The black file has a different visible geometry, which makes the light-theme header/footer wordmark disappear or stop matching the dark-theme brand treatment.

**How to apply:** Keep the white wordmark as the source asset for these placements and use a CSS-only contrast treatment such as `brightness(0)` for light mode; keep the separate horizontal about-surface assets unchanged.