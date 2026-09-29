---
name: Browser contrast values
description: Browser-specific computed-style formats that matter when validating rendered color contrast.
---

Contrast checks that run through Chromium should parse both `color(srgb … / alpha)` and legacy `rgb`/`rgba` values. They should read a specific longhand such as `border-bottom-color` instead of a shorthand like `border-color`, which can serialize multiple colors and cannot be measured as one foreground value.

**Why:** Chromium resolves `color-mix()` and related CSS into modern `color(srgb …)` output, while border shorthands can serialize four separate values. A checker that only handles hex/rgb or reads shorthands can report false failures.

**How to apply:** Keep rendered-state contrast checks in a browser context, composite alpha colors against the tested surface, and use explicit longhand properties for borders and focus states.

Artwork contrast checks should read the computed `background-image` and sample the rendered gradient at the label bounds instead of comparing a gradient declaration to a solid token. Unsupported gradient formats should fail the check rather than silently skipping the artwork.

**Why:** Project metadata is positioned over varying artwork, so a token-only check cannot detect a light gradient stop moving beneath a label.

**How to apply:** Keep artwork sampling scoped to the card and label selectors under test, and include the card plus artwork variant in failure labels.