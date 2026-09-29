---
name: Browser focus-visible checks
description: Verify keyboard-only card states with real browser input rather than synthetic focus calls.
---

Assertions for `:focus-visible` styling must drive real Tab or other keyboard input; calling `.focus()` from page JavaScript can move focus without activating Chromium’s keyboard modality heuristic.

**Why:** Synthetic focus checks reported missing glow and outline styles even though the keyboard interaction worked correctly, creating false failures during browser verification.

**How to apply:** Use CDP keyboard events or an equivalent real input path for focus-visible assertions, and read the computed state only after the browser has moved focus through keyboard navigation.