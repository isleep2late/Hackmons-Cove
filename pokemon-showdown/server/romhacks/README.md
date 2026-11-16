# ROM Hacks [EXPERIMENTAL]

This folder reads a Pokemon ROM hack and turns it into a battle format.

## What the format does

A player uploads a patch file for a ROM hack. The server applies the patch to its own clean copy of the base game,
reads the hack's Pokemon, moves, abilities, items, type chart, sprites and battle mechanics, and stores the result.
Teams can then be built and battles played with the hack's own data. Only the patch is uploaded, never a ROM.

The result is stored in `databases/romhacks/<sha>.json` (plus `<sha>.full.json` and a sprite folder) and served under
`/romhacks/`. `<sha>` is the SHA-256 of the patch. A stored hack is read again when `HACK_VERSION` in `build.ts`
changes and the patch is uploaded again.

## Supported patches and platforms

Patch formats: IPS, UPS, BPS, xdelta and BSP.

Platforms and base games:

- Game Boy / Game Boy Color: Red, Blue, Yellow, Gold, Silver, Crystal (Generations 1 and 2).
- Game Boy Advance: Ruby, Sapphire, Emerald, FireRed, LeafGreen (Generation 3).
- Nintendo DS: Diamond, Pearl, Platinum, HeartGold, SoulSilver, Black, White, Black 2, White 2 (Generations 4 and 5).

A hack can only be imported when its clean base ROM is present in `config/romhack-bases`.

## Files

- `index.ts`: upload entry point, base selection, storage. `cli.ts`: the child process that does the reading.
- `patch.ts`: the patch formats, including the BSP interpreter.
- `gb.ts`, `prism.ts`, `gen3.ts`, `nds.ts`: data readers per platform.
- `mechanics-gen1.ts`, `mechanics-gen2.ts`, `mechanics-gen3.ts`, `mechanics-nds.ts`, `nds-code.ts`: battle mechanics readers.
- `sprites-*.ts`: sprite extraction.
- `build.ts`: turns what the readers found into the stored data and the notes players see.
- `signatures.ts`: loads the private signature data the readers search with (see Private files).

## Private files

Game ROM content is never committed. The readers find things in a ROM by searching for byte patterns and tables that
come from the original games; those live in a private data file, not in this folder. A server needs these in
`config/`, which git ignores:

- `config/romhack-bases/`: the clean base ROMs (files or symlinks).
- `config/romhack-tools/xdelta3`: the native xdelta tool. Optional; without it only the built-in VCDIFF reader runs.
- `config/romhack-signatures.json`: the signature data, in five sections (`gen1`, `gen2`, `gen3`, `nds`, `anchors`).
  The readers refer to its entries by name. `PHNN_ROMHACK_SIGNATURES` can point to another path.
- `config/romhack-secret`: created by the server itself on first use.

`signatures.ts` reads the signature file once and checks its format number and the shape of every section (the keys,
the nesting and the list lengths, not the values). A missing, unreadable or incomplete file counts as not installed:
every import then fails with "ROM hack signature data is not installed on this server
(config/romhack-signatures.json)" and nothing is stored. `signatureProblem()` gives the exact reason. Stored hacks and
all other formats do not use the file. When an entry is added to or removed from the file, the matching shape value in
`SECTION_SHAPES` has to be updated; changing a value needs no code change.

## How mechanics are read and applied

Each mechanics reader looks at the battle code of the patched ROM and of the clean base the patch was applied to, and
compares the two. A value is emitted only when it was read from code the game really runs and it differs from the base.
A value that was changed but could not be read with confidence is reported as unreadable; the default of the parent
generation is kept and a note tells the player.

`build.ts` stores the emitted values as `mechanics`, with `mechanicsNotes` and `mechanicsReport`. The simulator applies
them in `sim/romhack-mechanics.ts`, inside the hack's own dex, so no other format is affected. A clean base ROM gives
empty mechanics and no type chart differences.

The type chart is stored as the cells that differ from the parent generation's chart, plus full rows for new types.

## Known limitations

- **Prism**: import only. Its battle engine is rewritten, so no battle mechanics are read. Battles use Generation 6
  rules with the hack's type chart. The Prism type is neutral everywhere and Prism's new moves deal plain damage.
  Prism is distributed as a BSP patch, and BSP patches have no result checksum, so the patched ROM cannot be verified
  against a known hash. This risk is accepted. The BSP interpreter is bounded by step, time and memory limits.
- **Polished Crystal**: its battle engine is rewritten and is not read. Data and the type chart are imported; no
  mechanics are applied.
- **CFRU and pokeemerald-expansion hacks** (Radical Red, Unbound, the Emerald expansion hacks): no mechanics are
  emitted. Their engines match the modern generations on everything the reader checks.
- **Type chart rounding**: the simulator's chart only knows immune, resisted, neutral and super effective. A multiplier
  above x1 that is not x2 (x3, x4, x1.2) becomes x2. A multiplier between x0 and x1 that is not x0.5 (x0.3, x0.25)
  becomes x0.5. x0 stays immune. Known cases: Brown (x3, x4, x0.3) and Ghost Grey (x1.2). The hack notes list the
  rounded matchups.
- **Yellow Legacy Plus option**: its critical hit cap and 1/256 miss depend on an option set inside the game. A battle
  cannot see that setting, so neither variant is applied. The same holds for any value a hack gates on a run-time flag.
- **New moves, abilities and items**: one that has no official counterpart has no simulated effect. A new move deals
  plain damage with its power, type, accuracy and PP. A new ability or item does nothing in battle.
- **IPS**: IPS offsets are 24 bits, so an IPS patch cannot change anything past 16 MB. Hacks of larger games need
  another patch format.
- **DS hacks with the Fairy type** stay on their own generation's engine (Generation 4 or 5) with the ROM's type chart.
  They are not moved to a later generation. This is one constant, `DS_FAIRY_KEEPS_BASE_ENGINE` in `nds.ts`.
- **Edited formes**: a forme the hack changed is mapped to the nearest official forme.
- **Stock sprites**: a sprite the patch leaves unchanged is extracted and served publicly like any other sprite.
- **Base ROMs are private**. They live in `config/romhack-bases`, are never served and are never written anywhere
  else. Only data derived from a patched ROM is published.

## Upload limits and safety

All of these are constants at the top of `index.ts`, except the dex cache bound, which is in `sim/dex.ts`.

- **Patch size**: 96 MB. The body is written to a temporary file, not held in memory. It must arrive within 120 s and
  may not pause for more than 20 s.
- **Per address**: 8 uploads per 10 minutes and one upload arriving at a time. An IPv6 address counts as its /64.
- **Whole server**: 2 imports running at once, 300 imports per hour, 32 uploads arriving at once.
- **Other sites**: an upload whose `Origin` header names another site is refused. Requests without an `Origin`
  header (the app, command-line tools) are accepted.
- **Import process**: each import runs in its own child process with a 2048 MB heap limit and is killed after 60 s.
- **xdelta**: the native `xdelta3` runs inside `bwrap` with no network and no file system except the tool, one base
  ROM and the patch, all read-only. Each run is killed after 20 s and all runs of one import after 45 s. Without
  `/usr/bin/bwrap` the native tool is not used and only the built-in VCDIFF reader runs.
- **Store**: at most 1000 hacks and 20 GB in `databases/romhacks`. When full, the hacks unused for the longest time
  are deleted first, but never one used in the last 6 hours; if nothing can be deleted the upload is refused.
  Uploads are also refused when the disk has less than 20 GB or 2,000,000 inodes free. A deleted hack comes back
  when its patch is uploaded again.
- **Simulator memory**: each process keeps at most 64 hack dexes loaded; the least recently used one is dropped.
- **Names**: a hack name that equals an internal condition id (for example Confusion as a new Pokemon) gets the
  suffix " Hack".
