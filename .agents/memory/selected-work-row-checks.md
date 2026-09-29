---
name: Selected Work row checks
description: Durable guidance for testing the Selected Work grid without confusing interaction transforms with layout placement.
---

Selected Work row alignment should be measured with each card's layout offsets (`offsetTop` / `offsetLeft`), while stable states may also compare rendered rectangle tops. Hover and keyboard focus intentionally transform the active card, so rendered top comparisons must be disabled for those interaction states without weakening the base-grid checks.

**Why:** A visual lift changes `getBoundingClientRect().top` but must not change the grid row that the browser assigned. Comparing only rendered rectangles makes a correct hover state look like a layout regression; comparing only offsets would miss default child-index transforms.

**How to apply:** For every filter and responsive breakpoint, assert zero top margins, no default placement transform, and equal row offsets. During focus, hover, preview open, and preview close, keep the offset assertions and compare the card sequence before and after the lifecycle.