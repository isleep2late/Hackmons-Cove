# Universal "Desync" export/import format (Gen 1 Pure Hackmons)

The canonical text format for the three custom attributes — **sprite (disguise)**,
**custom typing**, and **starting status** — shared identically by:
- Pokémon Showdown (teambuilder Export/Import) — IMPLEMENTED
- hackmons.com `/pokemon-generator`
- the Un-Nerf Compendium PKHeX (Showdown set export/import)

It extends the standard Pokémon Showdown set text with three optional lines.

## The three lines

Placed **immediately after the `Ability:` line** (or after the first line if there
is no ability), in **exactly this order**:

```
Sprite: <Species Name>
Types: <Type1>[ / <Type2>]
Status: <Burn|Paralysis|Sleep|Poison|Freeze>
```

- **`Sprite:`** — the disguise: the species whose sprite is shown to opponents and
  spectators. The REAL species stays in the first line, e.g. `Snorlax` or
  `Nick (Snorlax)`. Value is the species' display name (e.g. `Sprite: Mew`).
  Omit the line entirely if there is no disguise.
- **`Types:`** — the Pokémon's actual battle typing. One or two types, each
  capitalized (`Fire`, `Flying`, …), separated by ` / ` (space–slash–space).
  E.g. `Types: Fire` or `Types: Fire / Flying`. Omit if the Pokémon uses its
  default typing.
- **`Status:`** — the status the Pokémon enters battle already afflicted with.
  Exactly one of the five capitalized words below. Omit if none.

## Status word ⇄ internal code (canonical)

| Export word | Showdown/PKHeX code |
|---|---|
| Burn | brn |
| Paralysis | par |
| Sleep | slp |
| Poison | psn |
| Freeze | frz |

Emitters MUST write the capitalized word. Parsers MUST accept the word
case-insensitively, and SHOULD also accept the raw 3-letter code, mapping either
to the internal code.

## Full example

```
Snorlax @ Leftovers
Ability: Thick Fat
Sprite: Mew
Types: Fire / Flying
Status: Sleep
Level: 100
- Body Slam
- Earthquake
- Rest
- Self-Destruct
```

A real Snorlax that the opponent sees as a Mew, battles as Fire/Flying, and comes
in asleep.

## Parsing rules (all platforms)

- Lines are matched by their `Label: ` prefix and are order-independent on import
  (the order above is the emit order, for consistency).
- Unknown/empty values are ignored (treated as "not set"), never an error.
- Backward compatible: a set without these lines parses exactly as before.

## Reference implementation (Showdown, done)

`pokemon-showdown-client/play.pokemonshowdown.com/src/oldclient/storage.js`:
- `Storage.exportTeam` emits the three lines (set fields `disguise`, `phType`, `startStatus`).
- `Storage.importTeam` parses them back. Round-trip verified.
