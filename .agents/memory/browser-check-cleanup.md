---
name: Browser check cleanup
description: Headless Chromium regression scripts can pass assertions while occasionally racing temp-profile cleanup.
---

The FrameWrk headless browser checks can report `ENOTEMPTY` while removing a Chromium temporary profile even after all viewport assertions pass. One clean rerun may still hit the same race.

**Why:** Chromium child processes can continue touching profile files briefly after the parent process exits, so cleanup can fail independently of the browser assertions.

**How to apply:** Rerun once to distinguish a transient failure. If it repeats, use bounded `maxRetries` and `retryDelay` on recursive profile removal, then rerun the full suite.