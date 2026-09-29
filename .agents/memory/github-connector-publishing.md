---
name: GitHub connector publishing
description: How to publish a verified workspace tree when the local GitHub remote cannot authenticate.
---

When the local HTTPS Git remote rejects authentication, a connected GitHub integration can publish the complete current tree through the Git database API: upload blobs, create one tree and commit on top of the remote branch, then update the branch ref without force-pushing.

**Why:** The workspace remote may not have usable Git credentials even though the user has authorized GitHub through Replit. The connector can safely perform the API writes without exposing a token.

**How to apply:** Confirm the target repository and current branch SHA first. Preserve the current tree and verify the updated ref afterward. Be explicit that this publishes the current state as a commit rather than transferring the local commit history.

In this workspace, `git ls-remote` timed out while the authorized GitHub API connection remained usable. Treat a bounded Git transport timeout as unavailable transport; read the current branch ref through the connector instead of retrying indefinitely.

**Why:** A slow or blocked Git transport should not prevent safe publishing when the authenticated connector can verify and update the branch directly.

**How to apply:** After one bounded Git read timeout, verify the remote ref through the connector and continue only with an API commit that has the verified ref as its parent.

For binary blobs, avoid concatenating independently base64-encoded chunks unless every chunk boundary is divisible by three; prefer direct text reads for text files and bounded temporary base64 chunks for larger binaries.

**Why:** Large shell output can truncate or corrupt API-uploaded blobs without making the GitHub write itself fail, which can surface later as a deployment asset or lockfile error.

**How to apply:** Verify important blob SHAs or downstream build checks after API publication, especially for lockfiles and assets validated by prebuild scripts.

When comparing Git trees through CodeExecution's shell callback, use printable delimiters rather than NUL-delimited output, and trim a trailing carriage return from each line.

**Why:** That callback may strip NUL and tab bytes and return CRLF line endings, making paths appear absent on the remote even when their blobs match.

**How to apply:** Compare blob SHA and mode for the pre-change local tree, current local tree, and current GitHub tree before creating a commit; abort or merge overlapping remote edits instead of treating the malformed paths as additions.

Local ahead/behind status only compares against cached remote-tracking refs; GitHub's live branch can have advanced independently.

**Why:** A Git transport timeout can leave the tracking ref stale while API-based commits continue to update the actual branch.

**How to apply:** Resolve the live GitHub ref and tree before publishing. Compare them with the local tree and common base rather than inferring remote state from `git status`.

Git blob creation is content-addressed, so a transient connector timeout during upload can be retried without moving the branch. Do not update the branch until every uploaded blob SHA matches the local content.

**Why:** A connector timeout interrupted a multi-file upload after several blobs had succeeded, while the branch still pointed to the old commit.

**How to apply:** Retry only missing or uncertain blob uploads, verify their hashes, then create one tree and advance the ref without force.

The GitHub Git Blobs API can reject large base64 uploads with a 422 size error even when smaller blobs upload successfully.

**Why:** Connector-mediated Git Data API uploads do not necessarily support every object size that normal Git transport accepts.

**How to apply:** Verify large files are needed, do not move the branch ref until every required blob is available, and never silently omit a referenced asset. If a required blob exceeds the API limit, use another upload route or ask the user how to proceed.

Git LFS-managed files have two different representations: the worktree contains the expanded media, while the Git tree stores a small pointer blob. Uploading that pointer does not upload the LFS payload.

**Why:** A tree can match its expected Git SHA while clones or deployments still lack the referenced media.

**How to apply:** Inspect `.gitattributes` and `git lfs ls-files` before publishing. Confirm each LFS object is present in the destination's LFS storage or get the user's approval to omit that path; never hash the expanded worktree bytes as if they were the Git pointer.

Git Data API writes can return 409 when the remote repository has no commit. Initialize the default branch with a real tracked project file through the Contents API, then add the verified full tree in a normal fast-forward commit.

**Why:** An empty repository may reject blob creation before any tree or commit can be assembled.

**How to apply:** Verify the seeded ref, include that file in the final tree, and update the branch only after all required blobs and tree entries match the local snapshot.

An API-based update to the linked GitHub branch can trigger Vercel's automatic production deployment. Check for the exact commit in a READY production deployment before attempting a separate Vercel deployment.

**Why:** The connected Vercel project built the API-published commit automatically; a manual deployment would have duplicated that work.

**How to apply:** After the GitHub ref changes, verify Vercel's production target, commit SHA, ready state, and live page before reporting success.