# Hackmons-Cove upstream tracking

This file is the PRIMARY record of the upstream commit each showdown subtree was last
synced to. `Old_Buttons/Upstream_Sync_Safe.sh` and the nightly checker
(`tirelessgolem-bot/scripts/upstream-sync-check.js`) read the shas below out of
`origin/main`, falling back to the historical `git-subtree-split:` commit-message
trailers only when this file is absent from a given commit. The sync script rewrites
the matching line as part of every sync commit, so the record now survives a
squash-merge that rewrites the commit message — which is exactly what PR #75 did on
2026-08-20: its retitled squash commit kept the file changes but dropped the message
body, and the trailer-only record was lost until the next sync restored it.

The shas must only ever move in the same commit that applies the corresponding
upstream diff. Do not edit them by hand.

## pokemon-showdown

Synced to upstream `master` @ `5e8ead64b366aa55b83be979dd3d1050115e8bfe` (2026-08-22)

## pokemon-showdown-client

Synced to upstream `master` @ `8aac6055f144600a51e4f0c29932f08399122be0` (2026-08-22)
