---
name: Contact route parity
description: Why the enquiry endpoint needs separate preview and deployed entry points.
---

Replit's local `/api` traffic reaches the API Server artifact, while the Vercel deployment runs its serverless function. A contact form can work in production but receive a 404 in preview even when it posts to the same URL path.

**Why:** The deployed contact endpoint existed, but the local preview had no matching API Server route.

**How to apply:** Keep validation and delivery in one shared handler for both entry points. When changing the contact form, check the proxied local route and deployed route separately rather than assuming one proves the other.