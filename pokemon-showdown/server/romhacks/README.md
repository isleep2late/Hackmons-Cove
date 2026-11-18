# ROM Hacks [EXPERIMENTAL]

This folder reads a Pokemon ROM hack and turns it into a battle format.

## What the format does

A player uploads a patch file for a ROM hack. The server applies the patch to its own clean copy of the base game,
reads the hack's Pokemon, moves, movesets, abilities, items, type chart, sprites and battle mechanics, and stores the
result.
Teams can then be built and battles played with the hack's own data. Only the patch is uploaded, never a ROM.

The result is stored in `databases/romhacks/<id>.json` (plus `<id>.full.json` and a sprite folder) and served under
`/romhacks/`. `<id>` is the SHA-256 of the patch, except for an IPS patch whose base game the uploader chose (see
Choosing the base game of an IPS patch). It is always 64 lowercase hex digits. A stored hack is read again when
`HACK_VERSION` in `build.ts` changes and the patch is uploaded again.

## The three formats

A hack can be played in three ways. All three need an uploaded patch, use the same hack data and battle mechanics, and
only let two players battle when both uploaded the identical patch.

| Format id | Name | What it allows |
| --- | --- | --- |
| `gen9romhacksregularexperimental` | [Gen 9] ROM Hacks Regular [EXPERIMENTAL] | What the game itself allows. |
| `gen9romhackshackmonsexperimental` | [Gen 9] ROM Hacks Hackmons [EXPERIMENTAL] | Pure Hackmons inside the hack. |
| `gen9romhacksdisguisesexperimental` | [Gen 9] ROM Hacks Disguises [EXPERIMENTAL] | Custom Disguises inside the hack. |
| `gen9romhacksexperimental` | [Gen 9] ROM Hacks [EXPERIMENTAL] | The earlier id. Same rules as Disguises. |

The earlier id is hidden from the format lists and is kept so that saved teams, challenges and replays still work.
`sim/romhack-formats.ts` is the one place that knows these ids: `romHackMode(format)` gives `regular`, `hackmons`,
`disguises` or `null`, `romHackIdOf(formatid)` gives the hack id of a format string, and
`isCustomDisguisesFormat(formatid)` is true for the Custom Disguises formats and for the two Disguises ids.
`romHackRuleId(rules)` reads the id out of a list of custom rules; the challenge check and the simulator both use it,
so they always agree on the hack.

The hack is named by the custom rule `ROM Hack = <id>`, for example
`gen9romhacksregularexperimental@@@ROM Hack = <64 hex digits>`. Without that rule every team is refused with "This
format needs a ROM patch: upload one in the teambuilder, then challenge someone who uploaded the same patch."
The rule is only accepted in these four formats ("The rule "ROM Hack" can only be used in the ROM Hacks formats."). A
format that names two different hacks, for example with an override rule (`!! ROM Hack = ...`), counts as naming none.

Each hack runs on one generation's engine (`parentMod`, `gen1` to `gen9`). Regular and Hackmons take their limits from
that generation, so the rules are completed when the hack is known (`getRuleTable` in `sim/dex-formats.ts`).

| | Regular | Hackmons | Disguises |
| --- | --- | --- | --- |
| Pokemon | in the hack | in the hack | in the hack |
| Team size | 6 | 6 | 24 |
| Moves | 4, only moves the Pokemon learns in the hack | 4, any move of the hack | 24, any move of the hack |
| Level | 1 to 100 | 1 to 100 (Generation 1: 1 to 255) | 1 to 9999 |
| Ability | one of the Pokemon's own (Generation 3 and later; none before) | any ability of the hack; Generation 3 engine: one of the Pokemon's own; none before | any abilities of the hack, several allowed |
| Item | one item of the hack (Generation 2 and later) | one item of the hack (Generation 2 and later) | any items of the hack, several allowed |
| EVs | Generation 1 and 2: up to 255 each; later: 255 each, 510 in total | as [Gen N] Pure Hackmons: 255 each; Generation 6 also 510 in total; Generation 9 no limit | no limit |
| IVs / DVs | Generation 1 and 2: DVs, HP follows the others, one Special DV in Generation 2 | the same, except Generation 9 | free |
| Disguise, custom typing, starting status, custom HP, stat overrides, custom PP | no | no | yes |
| Battle-only formes | must start as the base forme | as [Gen N] Pure Hackmons | free |
| Team Preview | Generation 5 and later | Generation 5 and later | no |

- **Regular** has the rules `-Nonexistent`, `Obtainable Formes`, `ROM Hack Legality` and `ROM Hack Regular`, plus
  `EV Limit = 510` from Generation 3 and `Team Preview` from Generation 5. Where a Pokemon was caught, events, Poke
  Balls and egg move combinations are not checked.
- **Hackmons** takes the ruleset, bans and unbans of this server's `[Gen N] Pure Hackmons` format, N being the
  generation of the hack's engine, and adds `ROM Hack Legality`. Nothing of the hack counts as nonexistent.
- **Disguises** is the Custom Disguises ruleset with `Default Level = 100` and `ROM Hack Legality`.
- In Regular and Hackmons a held item is refused in Generation 1, and an ability on a set is dropped without a
  message in Generations 1 and 2, as in the official formats of those generations (a packed team always names one).
- In Disguises the same holds for a hack that has no abilities: the main ability is dropped without a message, and
  extra abilities are refused. Items and extra items that are not in the hack are refused in every generation.
- A cosmetic forme (Unown-B, Shellos-East, Burmy-Sandy, Deerling-Summer and the like) counts as being in the hack
  when its base Pokemon is, whether or not the game has a separate row for it.
- Regular refuses a set with the same move twice.

## Bot accounts

A battle bot cannot upload every patch its opponents use, so a short list of trusted bot accounts counts as holding
every hack that is already stored on this server. The list is `Config.romhackbots` (`config/config-example.js`), by
default `['multibot']`; an empty list, or any value that is not a list (`false`, `null`, a string), switches this
off. `userHoldsRomHack(user, id)` in `index.ts` is the one check, and `server/ladders.ts` uses it where a challenge is
made and where it is accepted.

- The account must be logged in as a registered name (`user.registered`, set only when the login server signed the
  name after a password login). A guest or an unregistered user who takes a listed name gets nothing.
- The hack must be stored (`hackExists`). An id nobody uploaded is refused for the bot like for everyone else.
- Only challenges are covered. The other player still has to upload the patch and send `/romhack have`, tournament
  and ladder battles still need the proof from everyone, and the four formats stay off the ladder (`searchShow: false`).
- The bot does nothing to get this: no upload and no `/romhack have`. It only has to bring a team that is valid for
  the hack and the mode named in the challenge, and it can read the hack from `/romhacks/<id>.full.json`.

## Movesets

The readers (`learnsets-gb.ts`, `learnsets-gen3.ts`, `learnsets-nds.ts`) read each Pokemon's level-up moves, TM and HM
compatibility, tutor moves, egg moves and its earlier evolution from the patched ROM. `build.ts` turns the game's move
numbers into move ids, adds the moves of every earlier evolution and stores the result in the hack.

- A clean base game reads the movesets of that game. They were compared with the decompilations and with the
  simulator's own data for that generation.
- If any part cannot be read with confidence the whole hack is marked `learnsetStatus: "unreadable"` with the reason in
  `learnsetNote`. Regular then refuses every team with "Regular is not available for this hack: its movesets could not
  be read. Use Hackmons or Disguises." Nothing is guessed and nothing is allowed by default.
- A Pokemon without a readable list in a hack that was read cannot be used in Regular. A forme the game lists
  without data of its own (the Vivillon patterns in Gaia) and a cosmetic forme use the list of their base Pokemon.
- A Pokemon inherits from every earlier evolution the game's evolution table names, not only the first.
- A Pokemon that learns Sketch may have any move of the hack in Regular, except the moves Sketch cannot copy in the
  hack's generation (`learnsets.noSketch`).
- In the Generation 3 reader a list that fails the strict check is read again leniently (blank entries are skipped, a
  level of 0 counts as level 1) instead of dropping the Pokemon.
- Level-up moves above level 100 are left out.
- Not read, so Regular is stricter than the game for them: moves taught by scripts or events instead of a table
  (Draco Meteor and the starter moves in Generations 4 and 5, Secret Sword, Relic Song, the Rotom appliance moves),
  Pichu's Volt Tackle, tutors a hack adds outside the game's own tables (the Kanto Expansion Pak tradeback tutor, the
  extra Crystal Clear tutors), and Mew learning every teachable move in pokeemerald-expansion hacks.
- Without the clean base, binary FireRed hacks cannot be followed and come out unreadable.
- Unreadable among the tested hacks: Prism (TM compatibility is stored outside the base stats), Elite Redux (rewritten
  data layout), Inclement Emerald (TM compatibility does not decode, no tutor table), Vega (its level-up table uses
  moves the move reader does not find), Un-Nerf HeartGold and SoulSilver (the code cannot be unpacked), and a hack
  uploaded as an IPS patch of a game larger than 16 MB.

## What clients read

`/romhacks/<id>.json` (also the body of a successful upload, with `proof` added) and `/romhacks/<id>.full.json` both
carry:

```
"learnsetStatus": "read",
"learnsets": {
  "moves": ["tackle", "growl", "vinewhip"],
  "species": {"bulbasaur": [0, 1, 2], "ivysaur": [0, 1, 2]}
}
```

- `learnsetStatus` is `"read"` or `"unreadable"`. When it is `"unreadable"` there is no `learnsets`, `learnsetNote`
  holds the reason, and Regular is not available.
- `learnsets.moves` is a list of move ids. `learnsets.species[<species id>]` lists every move that Pokemon may have
  in Regular, earlier evolutions included, as positions in `learnsets.moves`. A Pokemon that is missing there cannot
  be used in Regular.
- `learnsets.noSketch` (only when the hack has Sketch) lists the move ids Sketch cannot copy. A Pokemon whose list
  has `sketch` may have every other move of the hack.
- `<id>.json` also has `learnsets.own[<species id>]`: the Pokemon's own lists `levelup` (pairs of level and move
  position), `machines`, `tutor`, `egg`, sometimes `other` (moves learned on evolving), and `prevos` (species ids).
  The Cove clients leave `own` out of what they keep in browser storage, and keep at most four hacks there.
- Abilities: `<id>.full.json` has `pokemon[<species id>].abilities` (`0`, `1`, `H`, `S`). In `<id>.json` the same
  object is in `Pokedex[<species id>].abilities` when the hack changed it; otherwise the abilities of that Pokemon in
  the generation named by `parentMod` apply. In Regular the ability has to be one of these.
- `parentMod` (`gen1` to `gen9`) is the generation whose limits Regular and Hackmons use.

In the simulator the same data is `dex.romHack.learnsetStatus`, `dex.romHack.learnsets` and, in the usual format,
`dex.species.getLearnsetData(id)` and `dex.data.Learnsets` of the hack's dex (sources `<gen>L<level>`, `<gen>M`,
`<gen>T`, `<gen>E`). A hack without readable movesets keeps the learnsets of its parent generation there.

## Supported patches and platforms

Patch formats: IPS, UPS, BPS, xdelta and BSP.

Platforms and base games:

- Game Boy / Game Boy Color: Red, Blue, Yellow, Gold, Silver, Crystal (Generations 1 and 2).
- Game Boy Advance: Ruby, Sapphire, Emerald, FireRed, LeafGreen (Generation 3).
- Nintendo DS: Diamond, Pearl, Platinum, HeartGold, SoulSilver, Black, White, Black 2, White 2 (Generations 4 and 5).

A hack can only be imported when its clean base ROM is present in `config/romhack-bases`.

## Choosing the base game of an IPS patch

An IPS patch carries no checksum of its base game. When the server cannot work the base out, the upload is refused
and the refusal lists the games the uploader can choose from. The client then sends the same file again with the
chosen game.

Request: `POST /romhacks/upload?base=<id>`, the body being the patch file as before. `base` is optional.

Refusals are JSON with HTTP status 400. Three of them carry a `code` and the list `bases`:

```
{"error": "The base game of this IPS patch could not be determined. ...",
 "code": "IPS_BASE_UNKNOWN",
 "bases": [{"id": "red", "name": "Pokemon Red"}, {"id": "firered-rev1", "name": "Pokemon FireRed (rev 1)"}]}
```

- `IPS_BASE_UNKNOWN`: no `base` was sent and the base could not be worked out.
- `IPS_BASE_MISFIT`: the patch does not fit the chosen game. It changes nothing inside it, the result equals the
  clean game, the result is no longer a game of that platform (or a Game Boy game above 8 MB), or it cannot be read.
- `UNKNOWN_BASE`: `base` is not one of the offered ids. A value that is not 1 to 32 characters of `a-z`, `0-9` and
  `-` is refused before the patch is read, and that refusal has no `bases`.

The ids are the fixed slugs in `BASE_CHOICES` in `index.ts` (`red`, `blue`, `yellow`, `gold`, `silver`, `crystal`,
`crystal-rev1`, `ruby`, `ruby-rev1`, `ruby-rev2`, `sapphire`, `sapphire-rev1`, `sapphire-rev2`, `emerald`, `firered`,
`firered-rev1`, `leafgreen`, `leafgreen-rev1`). Only the games this server has are offered, in that order. File names
and paths are never sent.

What `base` does:

- BPS, UPS, xdelta and BSP patches ignore it, as long as it is an offered id.
- For an IPS patch the server first finds out what it would have chosen without `base`. That answer is kept
  with the hack (`autoBase`) or, for a patch it could not place, in `databases/romhacks/.unplaced.json` (a cache of
  refused patch hashes; losing it changes no result, only the time). So the retry after a refusal applies the patch
  to the chosen game only and takes one to three seconds. A first upload that already carries `base` runs the full
  guess and can take as long as a refused one.
- When the chosen game is the one the server works out by itself, the plain patch SHA-256 stays the id and the hack
  is stored as if no `base` had been sent. Hacks imported without `base` are stored with `autoBase`, the id of the
  game that was worked out; for a hack stored before that field existed the base is worked out again when somebody
  sends `base` for the same patch.
- Otherwise the hack id is `sha256(<patch sha256 in lowercase hex> + ":" + <base id>)`, in lowercase hex. The stored
  hack then also has `patchSha256` (the SHA-256 of the file) and `pickedBase` (`{id, name}`), and a note names the
  chosen game. The same patch with two different chosen games gives two ids, two stored hacks and two proofs, so
  those players cannot battle each other.
- The id depends only on the file, the chosen game and the games this server has, not on who uploaded first or in
  which order. Uploading the same file with the same `base` again returns the stored hack.
- A patch that the server reads as one of two versions with identical data (Red and Blue, for example) keeps the
  plain id only for the version it names; choosing the other one gives a chosen-base id.
- A wrong choice is usually not refused: most small patches apply to any game of the same platform. The hack is
  then stored under its own id with meaningless data, and only the uploader's choice decides.

The upload limits below apply to every upload, with or without `base`.

## Files

- `index.ts`: upload entry point, base selection, storage. `cli.ts`: the child process that does the reading.
- `patch.ts`: the patch formats, including the BSP interpreter.
- `gb.ts`, `prism.ts`, `gen3.ts`, `nds.ts`: data readers per platform.
- `learnsets-gb.ts`, `learnsets-gen3.ts`, `learnsets-nds.ts`: moveset readers per platform.
- `mechanics-gen1.ts`, `mechanics-gen2.ts`, `mechanics-gen3.ts`, `mechanics-nds.ts`, `nds-code.ts`: battle mechanics readers.
- `sprites-*.ts`: sprite extraction.
- `build.ts`: turns what the readers found into the stored data and the notes players see.
- `signatures.ts`: loads the private signature data the readers search with (see Private files).
- `sim/romhack-formats.ts`: the format ids and modes, shared by the simulator and the server.
- `data/rulesets.ts`: the rules `ROM Hack`, `ROM Hack Legality` and `ROM Hack Regular`.

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
- **IPS base game**: an IPS patch carries no checksum of its base game, so the base has to be worked out, and an
  upload is refused when it cannot be. Only Game Boy and Game Boy Advance bases are tried; an IPS patch of a DS game is
  refused. An IPS patch with no records is refused, and a truncated one is reported as truncated.
  - *Checksum*: for Game Boy games the base is the game whose patched result has valid header and global checksums,
    provided the patch changed the global checksum. If that hack then cannot be read, the upload is refused with the
    reason and no other base is tried.
  - *Fit*: otherwise a base is a candidate only when no record of the patch begins or ends on a byte the base already
    has (the joins between records that continue one another are not counted), the patched game differs from the base
    and it can be read. Candidates whose Pokemon, moves, abilities, items, type chart or battle mechanics read
    differently from their own clean base are kept; they must also build.
  - *One answer*: one candidate has to win against every other. Two candidates count as the same answer when the
    patched games are identical, or when they read the same data and their bases are versions of one game (fewer than
    one byte in eight differs: Red and Blue, Gold and Silver, Ruby and Sapphire, revisions); the first by file name is
    then taken and a note says so. Otherwise the bytes of the patch are compared at the places where the two bases
    differ. Between versions of one game, a base wins when the patch repeats its bytes at least four times as often as
    the other's, plus eight. Between unrelated games at least 256 such places are needed, and a base wins when it
    leads by that margin and the patch repeats its bytes in more than one place of eight (unchanged bytes inside merged
    records), or, over at least 2048 places, when the patch repeats its bytes in fewer than one place of 1024 while
    repeating the other's at least eight times and in at most one place of eight (an exact diff of that base).
  - *Nothing readable changed* (text, graphics, maps): accepted only when the unrelated bases average at least eight
    record edges that equal their own bytes, the candidate wins against every other and at least half of the
    battle-engine checks still read as stock.
  - A small patch made with a hex editor, without a checksum fix, usually fits several games and is refused; Yellow
    cannot be told from Red and Blue by a few changed stats. BPS and UPS patches name their base by checksum and are
    always the safer upload. The refusal offers the list of games, and the uploader can choose one (see Choosing the
    base game of an IPS patch).
  - A chosen game is trusted. A patch applied to the wrong game is refused only when it does not fit; otherwise it is
    stored under the id of that choice, with data that makes no sense, and nobody who chose the right game can meet it.
- **Expanded Generation 1 hacks** (more than 151 Pokemon or more than 190 index slots, such as Kanto Expansion Pak):
  read when the hack keeps the 10-byte name table, a one-byte index-to-Pokedex table (at most 255 slots) and 28-byte
  base stat records. The game cuts names at 10 letters, so a Pokemon whose official name is longer (Sandy Shocks as
  "SANDY SHOX") is imported as a new Pokemon under the game's spelling. Regional forms carry the same name as the
  original and are matched to the official forme by stats and types.
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
  The address is the connecting one. `X-Forwarded-For` is read only when the connection comes from a proxy listed in
  `Config.proxyip`, and then the last entry that is not such a proxy counts.
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
