---
name: Selected Work visibility and focus
description: Keep project card visibility and close-state decoration stable across React dialog rerenders.
---

Selected Work cards should keep their visible bookshelf state in React-owned/rendered styling rather than relying on an observer-added class that React can remove during dialog state changes. Restored focus should preserve keyboard focus without reusing hover lift, glow, or outline decoration.

**Why:** React rerenders can overwrite DOM-only visibility classes when the case-study dialog opens or closes, hiding a card; restored focus can also make the card look hovered after close.

**How to apply:** Keep cards visibly rendered through open/scroll/close transitions. Separate hover transforms from focus styling, and use a temporary non-class marker when restored focus needs decoration suppressed without losing the focus target.