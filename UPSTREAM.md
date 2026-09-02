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

Synced to upstream `master` @ `50408e6f959e7c1f9eea08eb9cb2e764641c4849` (2026-09-01)

**ONE COMMIT IN THIS RANGE WAS DELIBERATELY NOT TAKEN: `833d0da44` "Better translations"
(#12259).** Everything else between `bb179fbf8449` and the sha above is applied. The sha
records how far the *content* sync reached; it does NOT mean the translations rework landed.
Anyone revisiting translations must start from that commit, not from this base.

Why it was excluded: the rework renames `this.tr` to `this.TL` across the server and moves
`translations/<language>/` to ISO codes. Our fork has replaced whole commands in those files
(`savereplay` became `infinitesubmit`, the version command points at Hackmons-Cove, the
pmmodchat block is deleted, a helpticket path is commented out), and our `chat.ts` defines
only `tr()`. Taking it piecemeal left seven files calling `this.TL` against a `TL` that does
not exist, and the directory rename alone would have broken the loader: `chat.ts` skips any
directory matching `/[^a-z0-9]/`, so `zh-cn` and `zh-tw` would be dropped silently, and every
language id would shift from `english`/`german` to `en`/`de`, invalidating stored user
preferences. It is all-or-nothing and needs its own change with a rebuild behind it.

Also excluded as a consequence: the per-language `data/text/*/abilities.ts` Aura Guard entries
(they use `name: null`, which only the rework's nullable schema accepts) and the 18 new
`data/text/**/names.ts` and `tags.ts` files (they reference `TranslationString` and `TagText`,
types the rework introduces). The English `data/text/abilities.ts` Aura Guard entry IS applied.

Verified at the time of the sync: `tsc --noEmit` reports 249 errors both before and after —
zero introduced; `npm run build` exits 0; the sim loads 1854 species and 122 formats, and
`Obliteryx.prevo` resolves to the newly added `Scraptor`. The mocha suite cannot run against
this fork at all (it demands `gen2randombattle`, which our curated format list has never had);
that is pre-existing and unrelated.

## pokemon-showdown-client

Synced to upstream `master` @ `44a0ccde824843ac6b3bf9f3e17ba18b0370c3ad` (2026-08-27)

DECLINED @ `951cc1580bfbb190bb263b285ad9748894659f10`

**DELIBERATELY LEFT BEHIND as of 2026-09-01.** The only unsynced commit is `951cc1580`
"Support translating Preact client" (#2742), which is the client half of the same translations
rework declined on the server side above — see the `## pokemon-showdown` note. The two are a
matched pair: taking the client alone would have it expect translation plumbing the server does
not provide. The nightly checker will keep reporting this subtree as behind, and that report is
correct — it is behind on purpose. Sync both halves together or neither.

## pokemon-showdown-client/showdex  (vendored fork, not a subtree)

Synced to upstream `master` @ `d15974c6d8a29bda8cda2c08200f2731c8282bc5` (2026-08-27)

Version-tagged `v1.4.1`, but the tag is NOT the head: this base is 6 commits past it.
The nightly checker's `checkShowdex` compares `showdex/package.json` version against the
newest upstream TAG, so it reports "current" while unreleased upstream commits pile up —
which is how three real Calcdex crash fixes sat unmerged. Compare against this sha, not
the tag.

## pokemon-showdown-client/damage-calc  (vendored fork, not a subtree)

Synced to upstream `master` @ `2c50a89d9e369289965b1448a6f5c1b7d41520c7` (2026-08-29)
