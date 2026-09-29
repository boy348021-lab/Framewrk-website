# FrameWrk Media — Website Execution Plan (with Tools & Approach)

---

## Phase 0 — Foundation

**Goal:** remove every ambiguity Antigravity would otherwise have to guess at.

| Task | Approach | Tools |
|---|---|---|
| Lock design tokens | Write actual CSS variables / Tailwind theme extension from the brand kit's purple scale, Sora/DM Sans, spacing scale (4/8/16/24/32/64px) | Tailwind CSS config, VS Code (or Antigravity's own editor) |
| Gather logo assets | Export all 4 lockups (wordmark, icon-only, purple bg, black bg) as SVG — SVG scales cleanly for nav/favicon/social share | Figma (if you have source files) or vector-trace the PDF assets in Illustrator/Inkscape |
| Fonts | Self-host or use Google Fonts CDN for Sora + DM Sans, set `font-display: swap` | Google Fonts, or `next/font` if using Next.js (auto-optimizes + self-hosts) |
| Final copy | Pull directly from structure doc; fill gaps (about blurb, service descriptions) now | Google Docs/Notion as a single copy doc, so Antigravity is fed final text, not filler |
| Case-study data model | Define JSON schema: `{name, client, category, challenge, idea, execution, result, coverImage, gallery[]}` | Plain JSON file to start; migrate to CMS in Phase 4 |
| Repo scaffold | `npx create-next-app@latest` (App Router, TypeScript, Tailwind) → install Framer Motion → wire fonts/tokens → deploy empty shell immediately | Next.js, Tailwind, Framer Motion, GitHub (repo), Vercel (first deploy) |

**Antigravity note:** in this phase, give it the token file and copy doc as *attached files* in the prompt, not pasted descriptions — it should read and use them directly.

---

## Phase 1 — Structural Skeleton

**Goal:** every section exists, in order, with real copy but no motion/polish yet.

| Task | Approach | Tools |
|---|---|---|
| Header/Nav | Sticky nav, logo left, anchor links right, `scroll-behavior: smooth` or a scroll library later | Next.js component, native CSS anchor scroll (upgrade to Lenis in Phase 2) |
| Hero (static) | Full-viewport section, headline in Sora, static background image placeholder | Tailwind layout (`h-screen`, flex-center) |
| Trusted-by | Static flex row of grayscale-then-color-on-hover logos | CSS `filter: grayscale(1)` transition |
| Services grid | 4-card CSS grid, icon + title + sub-list per card | Tailwind grid, Lucide/Phosphor icons for placeholder icons if brand icons aren't ready |
| Work grid | CSS grid pulling from the JSON project data, real thumbnails | `next/image` for automatic optimization/lazy-load |
| About | Two-column: team portraits + short bios | Tailwind grid |
| Collaborations | 3-column: Brands / Creators / Founders, logo/portrait grids | Same grid pattern as Trusted-by |
| Contact | Form fields per structure doc, no backend yet | HTML form, no library needed yet |
| Footer | Quick links, social, legal, copyright | Plain component |

**Tools throughout:** Next.js App Router (one `page.tsx` with section components), Tailwind for all layout/spacing, browser DevTools responsive mode for a first mobile pass.

**Test:** `npm run dev`, walk the whole page at 375px, 768px, 1440px widths.

---

## Phase 2 — Interaction & Motion Layer

**Goal:** the "expensive-agency" feel.

| Task | Approach | Tools |
|---|---|---|
| Hero video | Swap static image for `<video autoplay muted loop playsInline>`, compress heavily, add a lighter poster image for slow connections | HandBrake or `ffmpeg` for compression (target <5MB, H.264 MP4), Cloudinary/Bunny CDN or Vercel Blob for hosting the file if it's large |
| Scroll-triggered text reveal | Animate hero headline in on load with a stagger | Framer Motion (`motion.div`, `staggerChildren`) |
| Trusted-by marquee | Infinite horizontal scroll, pause on hover, duplicate the logo array for seamless loop | Framer Motion `animate={{x: [...]}}` loop, or CSS `@keyframes` marquee (lighter-weight, prefer this for performance) |
| Services hover states | Color/scale shift or icon reveal on hover | Tailwind `group-hover:` utilities, small Framer Motion `whileHover` |
| Work grid filtering | Category tabs update visible grid with animated re-layout (`layout` prop) | Framer Motion `AnimatePresence` + `layout` for the grid re-flow — this is the single trickiest animation in the whole site, budget real time for it |
| Scroll reveals | Fade/slide-in as sections enter viewport | Framer Motion `whileInView`, `viewport={{once: true}}` |
| Smooth scroll | Site-wide inertia scroll | Lenis (`@studio-freight/lenis`) wired into a layout-level provider |
| Nav active-state | Highlight current section as user scrolls; nav bg blur on scroll | `IntersectionObserver` (native) or a small hook, Tailwind `backdrop-blur` |

**Antigravity note:** build and test one animated section per prompt — hero reveal, then marquee, then filter grid, then scroll reveals — each as its own run/preview cycle. Bundling all motion into one prompt is where agentic tools drift most.

---

## Phase 3 — Case Study System

**Goal:** clicking a project opens a full case study without leaving the page.

| Task | Approach | Tools |
|---|---|---|
| Overlay component | Full-screen modal, slides/fades in over the current scroll position | Framer Motion `AnimatePresence` for enter/exit |
| Data wiring | Modal reads the same JSON/CMS entry clicked in the Work grid | React state (`useState` for selected project) or URL search param for shareability |
| Gallery inside modal | Image/video carousel for the case study's execution section | `embla-carousel-react` (lightweight, popular for this) or a simple custom scroll-snap gallery with Tailwind (`scroll-snap-x`) |
| Close/return behavior | Scroll-lock body while open (`overflow: hidden`), return to same grid position on close | `body-scroll-lock` npm package, or manual `overflow` toggle |
| Accessibility | Esc key closes, focus trap while open | `focus-trap-react`, or Radix UI's `Dialog` primitive (handles all of this out of the box — recommended over hand-rolling) |

**Recommendation:** use **Radix UI Dialog** (unstyled, accessible) as the modal foundation and layer Framer Motion + Tailwind on top for visuals — this avoids reinventing focus-trap/scroll-lock/Esc handling by hand.

---

## Phase 4 — Forms, Content Wiring, CMS

| Task | Approach | Tools |
|---|---|---|
| Contact form backend | Form posts to an endpoint that emails you / logs to a sheet | **Formspree** or **Resend** (simplest, no backend needed) — or a Next.js API route + Resend if you want full control |
| Form validation | Client-side required-field + email format checks, success/error UI states | `react-hook-form` + `zod` for schema validation |
| CMS for projects | Move project data off static JSON so you can add case studies without touching code | **Sanity** (most flexible, has image pipeline built in) or a simpler markdown-per-project approach with `next-mdx-remote` if you want to stay code-only |
| SEO basics | Meta title/description, Open Graph image, favicon | Next.js `metadata` API (App Router), favicon generated from brand icon lockup via realfavicongenerator.net |

---

## Phase 5 — Polish Pass

| Task | Approach | Tools |
|---|---|---|
| Responsive audit | Walk every section at 3 breakpoints, especially hero video on mobile (consider swapping to poster image on mobile to save bandwidth) | Chrome DevTools device mode, real-device test on your own phone |
| Performance | Compress video/images, lazy-load below-fold, check Core Web Vitals | Lighthouse (Chrome DevTools), `next/image`, `ffmpeg` for video re-compression |
| Cross-browser | Safari especially — check `backdrop-blur`, video autoplay, `position: sticky` quirks | BrowserStack (or just a real iPhone/Mac if available) |
| Accessibility pass | Alt text on all images, contrast check on purple-on-white text, `prefers-reduced-motion` fallback for all Framer Motion animations | axe DevTools (Chrome extension), WebAIM contrast checker |
| Micro-copy | Button labels, loading/empty states | Manual review against copy doc |

---

## Phase 6 — Launch

| Task | Approach | Tools |
|---|---|---|
| Domain + hosting | Point domain to hosting, verify SSL | Vercel (pairs natively with Next.js) or Netlify |
| Analytics | Lightweight, privacy-friendly tracking | Plausible (no cookie banner needed) or GA4 |
| Final review | Swap all placeholder data for real client/project content | — |
| Soft launch | Get 2–3 outside eyes before public announcement | — |

---

## Tool Summary (at a glance)

- **Framework:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind CSS
- **Animation:** Framer Motion (+ Lenis for smooth scroll)
- **Modal/Dialog:** Radix UI Dialog (accessibility handled for you)
- **Forms:** react-hook-form + zod, submitted via Formspree/Resend
- **CMS (optional):** Sanity, or MDX files if staying code-only
- **Video/image compression:** ffmpeg / HandBrake
- **Carousel (case study gallery):** embla-carousel-react
- **Hosting:** Vercel
- **QA:** Chrome DevTools, Lighthouse, axe DevTools, BrowserStack (or real devices)
- **Analytics:** Plausible or GA4

---

## Working with Antigravity across all of this

- One checkbox = one prompt/session. Attach real files (tokens, copy doc, JSON schema) rather than describing them.
- Name the exact library when it matters ("use Framer Motion's `layout` prop for the grid re-flow," "use Radix Dialog for the case study modal") — Antigravity will otherwise pick its own approach, which may not match what's specified above.
- Run/preview after every checkbox before moving on — catching drift early here is far cheaper than catching it in Phase 5.
- For vague aesthetic notes ("make it feel more premium"), translate them yourself into a specific value change (spacing, easing curve, duration) before prompting — specific direction is where agentic tools perform best.
