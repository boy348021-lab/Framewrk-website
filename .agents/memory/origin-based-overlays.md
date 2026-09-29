---
name: Origin-based overlays
description: UX rule for previews opened from cards across the FrameWrk Media site.
---

Card previews should finish centered in the viewport while expanding from the exact card that triggered them. Backdrop pointer-down should close the preview immediately and restore the triggering card's focus.

**Why:** a shared right-origin animation makes unrelated cards feel like they open from the wrong place and delays the basic outside-dismissal interaction.

**How to apply:** measure the trigger's viewport center at activation, translate a small centered preview from that point to the final centered panel, and preserve focus restoration for mouse and keyboard activation.