# Vercel deployment

This repository contains multiple workspace packages, so the Vercel project
must be configured from the repository root. The root `vercel.json` already
defines the frontend build contract:

- **Framework preset:** Vite
- **Install command:** `pnpm install --frozen-lockfile`
- **Build command:** `pnpm --filter @workspace/framewrk-media run build`
- **Output directory:** `artifacts/framewrk-media/dist/public`
- **Root directory:** repository root (`.`)

The build script supplies the Vite defaults for `PORT` and `BASE_PATH`, so no
manual environment variables or secrets are required for this static frontend.
The API server and PostgreSQL service are not part of this Vercel deployment.

## Branch workflow

1. Keep `main` as the production branch.
2. Create a feature branch for a change.
3. Push the feature branch to GitHub.
4. Vercel creates a preview deployment and URL for that branch or pull request.
5. Review the preview URL on desktop and mobile.
6. Merge the approved pull request into `main`.
7. Vercel creates the production deployment from `main`.

The Vercel-provided `vercel.app` URL should be tested before adding a custom
domain. Do not commit Vercel tokens, credentials, or environment secrets.