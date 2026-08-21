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

Synced to upstream `master` @ `71bf477231321ed23da9e78f855e1a1c019bd7e7` (2026-08-20)

## pokemon-showdown-client

Synced to upstream `master` @ `daa28cfeb19775dea9f19f90a8c8f1418bac316a` (2026-08-17)
