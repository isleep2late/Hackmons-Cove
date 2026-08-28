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

Synced to upstream `master` @ `bb179fbf8449e3c31632bd56f671ffb4404fa6e7` (2026-08-27)

## pokemon-showdown-client

Synced to upstream `master` @ `44a0ccde824843ac6b3bf9f3e17ba18b0370c3ad` (2026-08-27)

## pokemon-showdown-client/showdex  (vendored fork, not a subtree)

Synced to upstream `master` @ `d15974c6d8a29bda8cda2c08200f2731c8282bc5` (2026-08-27)

Version-tagged `v1.4.1`, but the tag is NOT the head: this base is 6 commits past it.
The nightly checker's `checkShowdex` compares `showdex/package.json` version against the
newest upstream TAG, so it reports "current" while unreleased upstream commits pile up —
which is how three real Calcdex crash fixes sat unmerged. Compare against this sha, not
the tag.

## pokemon-showdown-client/damage-calc  (vendored fork, not a subtree)

Synced to upstream `master` @ `920c5b8a4d015a236b0fbaeb8bd8b1e5ca008043` (2026-08-27)
