---
name: Hero client logo alignment
description: Why the homepage marquee uses alpha-trimmed logo copies rather than the shared client PNGs.
---

The shared client PNGs use the same canvas dimensions, but visible artwork has uneven transparent bounds. The hero marquee uses alpha-trimmed copies so the visible logo artwork can be centered consistently inside its glass tiles. Keep the shared originals for the general client section.

**Why:** CSS alignment centers an image canvas, not its visible pixels. The user noticed optical misalignment, especially where artwork sat high within the source canvas.

**How to apply:** If changing marquee assets or sizing, recheck the visible alpha bounds and verify desktop and mobile screenshots. Do not replace or modify the shared source logos solely to adjust the hero marquee.