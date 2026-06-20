# [Gen 1] Pure Hackmons (No Nerfs) — Implementation Design

Status: DESIGN ONLY (no feature code written). Targets the fork at
`/srv/phnn/pokemon-showdown` (server) and `/srv/phnn/pokemon-showdown-client` (client).

This format recreates the RBY save-edit hackmons experience: custom typing, a disguise
sprite, pre-applied status, and fog-of-war so the opponent only ever learns the sprite
(disguise) + status — never the real species or real typing.

---

## 0. Key codebase facts established by research

- **PokemonSet + packer**: `sim/teams.ts`. Interface at L19-117. `pack()` L120-213,
  `unpack()` L215-346. The trailing "misc" group is comma-separated and currently holds
  6 fields: `happiness, hpType, pokeball, gigantamax, dynamaxLevel, teraType`
  (pack L202-209, unpack L333-339). The misc group is only emitted when any of those
  fields is set, and `unpack` parses it with `split(',', 6)`.
- **Client packer mirror**: `pokemon-showdown-client/play.pokemonshowdown.com/src/battle-teams.ts`
  (compiled to `js/battle-teams.js`, pack L60-129, misc block L118-125). MUST be kept
  byte-for-byte compatible with the server packer or teams won't round-trip.
- **Per-side protocol split is a first-class mechanism**:
  - `Battle#add()` (`sim/battle.ts` L3114-3136) accepts a *function* part that returns
    `{side, secret, shared}`. `addSplit()` (L3104-3112) emits `|split|pN` then the
    secret line then the shared line.
  - `extractChannelMessages()` (L33-59): after `|split|pN`, channel == player N (and the
    omniscient channel -1) get the **secret** line; everyone else gets the **shared** line.
  - The switch line is produced at `sim/battle-actions.ts` L146/L148:
    `this.battle.add(isDrag?'drag':'switch', pokemon, pokemon.getFullDetails)`.
  - `Pokemon#getFullDetails` (`sim/pokemon.ts` L545-555) already returns
    `{side, secret, shared}` and is the existing precedent (Illusion sends a different
    `details` string to the secret vs shared channel). This is the exact hook for the
    species disguise.
- **Types in engine**: `Pokemon` ctor sets `this.types = this.baseSpecies.types`
  (`sim/pokemon.ts` L446-452, inside `clearVolatile`). `setType()` L2109-2129,
  `getTypes()` L2138-2146. `teraType` precedent shows how a per-set string override flows
  from set -> Pokemon.
- **Client type/species derivation for the opponent comes only from the `|switch|`
  details string**: `parseDetails()` (`battle.ts` L3282-3312) sets `speciesForme` from
  `details`. `Pokemon#getTypes` (L508-525) falls back to `getSpecies(serverPokemon).types`;
  `getSpecies(undefined)` uses `this.speciesForme`. So if the opponent's switch line carries
  the disguise species, the client *automatically* shows the disguise sprite, name and
  typing with no further client change. The owner has a `serverPokemon` (from `|request|`)
  and the secret switch line, so the owner sees real data.
- **Client already supports a protocol-driven type override**: `|-start|<poke>|typechange|
  <TYPE>|[from] format:<x>` sets `poke.moddedType` (`battle.ts` L2640-2656). This is how we
  reveal the *real* type to the *owner only* (sent on the secret line via split).
- **`-status` is global, not split**: emitted by callers (e.g. `sim/battle-stream.ts` L284
  re-shows gen1 slp/frz; move handlers). `setStatus()` (`sim/pokemon.ts` L1685-1750) only
  mutates state. Status is therefore visible to the opponent by default — which is exactly
  the requirement (opponent sees status).
- **Team Preview leaks species**: `data/rulesets.ts` `teampreview` rule (L634-665) emits
  `this.add('poke', side, details, '')` UN-split, i.e. to everyone with real species.
  The fallback path in `sim/battle.ts` L1988-2000 *does* split (`addSplit`). For this format
  we must NOT use the stock Team Preview rule (it would reveal the real team to the
  opponent). See §5.
- **Validator**: `sim/team-validator.ts`. `format.onValidateSet` runs at L1102-1103;
  `teraType` validated/normalized at L711-721. Unknown set fields pass through untouched.
- **Mods are auto-discovered** from `data/mods/*` (`sim/dex.ts` L475). Existing fork mods
  `phnn`, `gen3phnn`, `gen7phnn` each have `scripts.ts` with `inherit: '<parent>'`.

---

## 1. Per-requirement approach

### R1 — Rename + recategorize the format  (Complexity: TRIVIAL, Risk: LOW)
File: `config/formats.ts`.
- The existing entry (currently L278-282):
  ```
  { name: "[Gen 1] Pure Hackmons", desc: "...", mod: 'gen1',
    ruleset: ['-Nonexistent','Team Preview','HP Percentage Mod','Cancel Mod','Endless Battle Clause','Max Level = 255'] }
  ```
  Rename to `"[Gen 1] Pure Hackmons (Smogon)"`, leave it under the `"All Gens PH"` section
  (L274) unchanged otherwise.
- Add the NEW format under the `"No Nerfs"` section block (insert near L272, after
  "[Gen 7] Pure Hackmons No Nerfs", still inside that section, before the
  `{ section: "All Gens PH" }` marker at L273):
  ```
  {
    name: "[Gen 1] Pure Hackmons",
    desc: "RBY save-edit hackmons: pick a custom type, a disguise sprite, and a starting status. Your opponent only sees the disguise and the status.",
    mod: 'gen1phnn',
    ruleset: ['-Nonexistent','HP Percentage Mod','Cancel Mod','Endless Battle Clause','Max Level = 255','Disguise Team Preview'],
    onValidateSet(set) { /* validate phType / disguise / startStatus — see §3, §6 */ },
    onSwitchIn(pokemon) { /* apply custom type reveal to owner + pre-status — see §4 */ },
  }
  ```
  Note: `Team Preview` is deliberately replaced by a custom `Disguise Team Preview` rule
  (§5) so preview does not leak the real species. Order in the file controls UI ordering;
  putting it last in the "No Nerfs" section is fine.

### R2 — Custom typing per Pokémon  (Complexity: MEDIUM, Risk: MEDIUM)
New set field `phType?: string` (one or two types joined by `/`, e.g. `"Fire"` or
`"Fire/Flying"`). Chosen in teambuilder (§7), packed (§2), validated (onValidateSet),
applied in the engine (§4). In battle the type drives STAB and weakness because we call
`pokemon.setType(realTypes, true)` at switch-in so all of gen1's damage code
(`data/mods/gen1/scripts.ts` L916-917 iterates `target.types`) uses it.

### R3 — Custom sprite / disguise per Pokémon  (Complexity: MEDIUM-HIGH, Risk: MEDIUM)
New set field `disguise?: string` = the *displayed* gen1 species id. The real species
(`set.species`) still defines stats/moves/the owner's reality. The disguise only changes
the `details` string sent on the **shared** (opponent) channel. Implemented in
`Pokemon#getFullDetails` override (§4) and the custom Team Preview rule (§5). The client
needs no change to render it because it derives everything from `details` (§0).

### R4 — Pre-status (remove Cleric Clause)  (Complexity: MEDIUM, Risk: MEDIUM)
New set field `startStatus?: string` in {`psn`,`par`,`slp`,`brn`,`frz`}. There is no Cleric
Clause in the existing `[Gen 1] Pure Hackmons` ruleset, so nothing to remove; we only add
the ability to start statused. Applied at first switch-in via `setStatus(..., ignoreImmunities=true)`
plus an explicit `this.add('-status', pokemon, status)` so it shows for both sides
(this is the desired info-leak: status IS shown). A pre-asleep mon is already asleep, so
`setStatus('slp')` from Spore returns false at `sim/pokemon.ts` L1699-1707 — this naturally
"counters Spore" exactly as the user describes, no extra logic needed.

### R5 — Information hiding / fog of war  (Complexity: HIGH, Risk: HIGH) — see §4, §5.

### R6 — "Desync"  — NEEDS CLARIFICATION, see §9.

---

## 2. Team-data-format extension design

Add three optional fields to `PokemonSet` (`sim/teams.ts` L19-117) and mirror in the client
team type:
```
phType?: string;       // e.g. "Fire" or "Fire/Flying"
disguise?: string;     // displayed species id, e.g. "gengar"
startStatus?: string;  // 'psn' | 'par' | 'slp' | 'brn' | 'frz'
```

### Packing strategy — APPEND to the misc group (backward compatible)
The misc group is positional and parsed with `split(',', 6)`. Appending three more
comma-separated fields after `teraType` keeps every existing field at the same index, so
old teams (6 fields) still parse; new teams add indices 6,7,8.

`pack()` (`sim/teams.ts` L202-209) — change the guard and append:
```
if (set.pokeball || set.hpType || set.gigantamax ||
    (set.dynamaxLevel !== undefined && set.dynamaxLevel !== 10) || set.teraType ||
    set.phType || set.disguise || set.startStatus) {
    buf += `,${set.hpType || ''}`;
    buf += `,${this.packName(set.pokeball || '')}`;
    buf += `,${set.gigantamax ? 'G' : ''}`;
    buf += `,${set.dynamaxLevel !== undefined && set.dynamaxLevel !== 10 ? set.dynamaxLevel : ''}`;
    buf += `,${set.teraType || ''}`;
    buf += `,${(set.phType || '').replace('/', '-')}`;   // '/' is unsafe in this CSV-ish format; encode it
    buf += `,${this.packName(set.disguise || '')}`;
    buf += `,${set.startStatus || ''}`;
}
```
NOTE on the `/` in `phType`: the misc group is comma-delimited and the set is `|`/`]`
delimited, so `/` is technically safe, BUT to be defensive store dual types as `Fire-Flying`
(hyphen) and split on `-` at unpack. Decide once and keep server+client identical.

`unpack()` (`sim/teams.ts` L333-339) — bump the split width and read new indices:
```
if (misc) {   // misc = buf.substring(...).split(',', 9);   // was 6
    set.happiness = (misc[0] ? Number(misc[0]) : 255);
    set.hpType = misc[1] || '';
    set.pokeball = this.unpackName(misc[2] || '', Dex.items);
    set.gigantamax = !!misc[3];
    set.dynamaxLevel = (misc[4] ? Number(misc[4]) : 10);
    set.teraType = misc[5];
    if (misc[6]) set.phType = misc[6].replace('-', '/');
    if (misc[7]) set.disguise = this.unpackName(misc[7], Dex.species);
    if (misc[8]) set.startStatus = misc[8];
}
```
Update the two `split(',', 6)` calls at L329 and L331 to `split(',', 9)`.

### Client packer mirror — REQUIRED
Mirror identical changes in `play.pokemonshowdown.com/src/battle-teams.ts` (`pack`
misc block ≈ L118-125, and `unpack`) AND re-build to `js/battle-teams.js`. If only the
server packer changes, exported/imported teams desync. Also extend the client
`PokemonSet`-equivalent type (in `battle-teams.ts` / `battle-dex.ts`) with the 3 fields.

### Export/import text (optional, nice-to-have)
`sim/teams.ts` `export`/`import` (L400-545) — add lines like
`PHNN Type: Fire/Flying`, `Disguise: Gengar`, `Status: slp` for human-readable team text.
Not required for the format to work (packed format is what's transmitted). Mark as P2.

---

## 3. Validator design

In the format's `onValidateSet(set)` (`config/formats.ts`); runs via
`sim/team-validator.ts` L1102-1103:
- `phType`: split on `/`, each part must be `this.dex.types.get(t).exists` and be a gen1
  type (Normal, Fighting, Flying, Poison, Ground, Rock, Bug, Ghost, Fire, Water, Grass,
  Electric, Psychic, Ice, Dragon). Reject Dark/Steel/Fairy/`???`/Stellar. 1 or 2 types.
- `disguise`: must be a real gen1 species (`this.dex.species.get(set.disguise).exists` and
  `gen <= 1` / num <= 151). Optional; default = real species (no disguise).
- `startStatus`: must be one of psn/par/slp/brn/frz (or empty).
Return `string[]` problems. Because these are extra fields, the *core* validator
(`validateSet` L564+) ignores them; only our format hook inspects them.

Do NOT rely on the stock `teraType` normalization path (L711-721) — gen1 has no Tera; we
own the phType validation entirely.

---

## 4. Battle engine + info-hiding design (the riskiest part)

The design splits cleanly because **the engine already has a per-side channel and the
client already derives opponent info purely from the protocol**. We put all logic in the
new `gen1phnn` mod (`data/mods/gen1phnn/scripts.ts`, `inherit: 'gen1'`, `gen: 1`).

### 4a. Apply real type + pre-status (owner-true reality)
Override `Pokemon#clearVolatile` (or do it from the format's `onSwitchIn`) so that after
the base sets `this.types = this.baseSpecies.types`, we overwrite with the custom type:
```
// in mods/gen1phnn scripts.ts -> pokemon.clearVolatile (inherit:true), after super():
if (this.set.phType) this.setType(this.set.phType.split('/'), true);
```
`setType(..., enforce=true)` (`sim/pokemon.ts` L2109) bypasses the Arceus/tera guards and
sets `this.types`, `this.apparentType`, `knownType`. All gen1 damage math reads
`target.types` (`data/mods/gen1/scripts.ts` L916-917) so STAB + weaknesses use phType.

Pre-status on the first switch-in (format `onSwitchIn(pokemon)` or mod `runSwitch`):
```
if (pokemon.set.startStatus && !pokemon.statusApplied) {
    pokemon.setStatus(pokemon.set.startStatus, pokemon, null, /*ignoreImmunities*/ true);
    pokemon.statusApplied = true;
}
```
`-status` is emitted (global) so the opponent sees it. (Spore vs pre-sleep handled by
`setStatus` early-return, §R4.)

### 4b. Hide real species from opponent — override `getFullDetails`
Override `Pokemon#getFullDetails` in the mod (it's an arrow-fn property; redefine in the
mod's `pokemon` table). Reuse the Illusion pattern (`sim/pokemon.ts` L545-555):
```
getFullDetails() {
    const health = this.getHealth();
    const realDetails = this.details;                       // owner sees real species
    const disguiseSpecies = this.set.disguise
        ? this.battle.dex.species.get(this.set.disguise).name : this.species.name;
    const fakeDetails = realDetails.replace(this.species.name, disguiseSpecies);
    return {
        side: health.side,
        secret: `${realDetails}|${health.secret}`,          // -> owner + omniscient (-1)
        shared: `${fakeDetails}|${health.shared}`,          // -> opponent
    };
}
```
Because `switch`/`drag` is emitted through `Battle#add(..., getFullDetails)` (the function
branch, `sim/battle.ts` L3114-3136), the opponent's `|switch|` line carries the disguise
species. The client's `parseDetails` then sets the opponent Pokemon's `speciesForme` to the
disguise, so sprite + name + (disguise) typing all render from the disguise with NO client
change. The owner's secret line + their `|request|` (`getSwitchRequestData`,
`sim/pokemon.ts` L1154-1191, sent only to the owner via `Side#getRequestData` L343-353)
carry the real species.

### 4c. Reveal the REAL type to the OWNER only (not the opponent)
The opponent must see the *disguise's* type (derived from the disguise species — correct by
default). The owner should see their *real* phType. Use the existing client hook
`|-start|<poke>|typechange|<TYPE>|[from] format:gen1phnn` (`battle.ts` L2640-2656 sets
`moddedType`) emitted ONLY on the secret channel. Emit it via a split add at switch-in:
```
this.add('-start', pokemon, 'typechange', pokemon.set.phType, '[silent]', `[from] format:gen1phnn`, () => ({
    side: pokemon.side.id, secret: '<full line>', shared: '',   // shared empty -> opponent gets nothing
}));
```
Practically, model this after the existing split helpers: emit the typechange line wrapped
so only the owner's channel receives it (shared = ''; extractChannelMessages skips empty
shared lines, L52). RESULT: owner tooltip shows real type; opponent tooltip shows disguise
type. (The gen7 "reveal real type" code at `sim/battle.ts` L1709-1721 must be skipped for
gen1 — it's `gen >= 7` gated, so it does not fire here. Good.)

### 4d. Things that could leak the real species/type — audit + mitigations
- **Team Preview** — leaks. Replace with custom split preview (§5).
- **`|request|` / switch request** — owner-only by construction (`Side#getRequestData`).
  No leak. Opponent never receives the other side's request.
- **`|move|` lines / `-supereffective` / `-resisted`** — type effectiveness *messages*
  reflect phType vs the move. The opponent sees "super effective" which leaks that the real
  type is weak — but this is acceptable / inherent (same as Illusion). Document as
  intentional partial information (you learn type relationships by attacking, like RBY).
- **`-start typechange`** for the OWNER must be on the secret channel only (§4c) else it
  leaks the real type to the opponent.
- **Transform / Conversion / move-based type reads** — gen1 moves like Conversion copy
  types; ensure they read `getTypes()` (already do). These reveal type via normal play,
  acceptable.
- **`detailschange`** (`sim/pokemon.ts` L1444-1447, `sim/battle.ts` L2585) — gen1 has no
  forme changes in practice; if any path fires `detailschange` it would send real species
  to both sides (it's a plain `this.add`, not split). Audit: in gen1 the only formechange is
  none. Low risk, but add a guard or override `getUpdatedDetails`/the detailschange emission
  to apply the disguise if it ever fires. Mark as a test case.
- **Faint / `|faint|`** — sends only the ident (slot+nickname), not species. No leak.
- **End-of-battle full team reveal** — PS does not auto-reveal losing teams in the protocol;
  the replay shows whatever was sent. Disguise persists. OK. (Confirm `win()` path.)

### Feasibility verdict
**Per-side protocol filtering IS achievable and is the intended PS mechanism.** The
`|split|` channel system + `getFullDetails` is literally how Illusion (Zoroark) already
shows a different species to the opponent. The disguise is a strict generalization of
Illusion (arbitrary chosen species instead of "last party member"), and the type-hiding
reuses the `moddedType` typechange hook. No core protocol changes are required; everything
lives in the gen1phnn mod + the format + the packer + the teambuilder UI.

---

## 5. Custom "Disguise Team Preview" rule  (Complexity: MEDIUM, Risk: MEDIUM)

Add a rule in `data/rulesets.ts` (model on `teampreview` L634-665, but use `addSplit` like
the fallback at `sim/battle.ts` L1991-1998 so each `|poke|` is per-side):
```
disguiseteampreview: {
  effectType: 'Rule', name: 'Disguise Team Preview',
  onTeamPreview() {
    this.add('clearpoke');
    for (const pokemon of this.getAllPokemon()) {
      const real = pokemon.details.replace(', shiny','');
      const disg = pokemon.set.disguise
        ? real.replace(pokemon.species.name, this.dex.species.get(pokemon.set.disguise).name)
        : real;
      // secret -> owner sees real; shared -> opponent sees disguise
      this.addSplit(pokemon.side.id, ['poke', pokemon.side.id, real, ''], ['poke', pokemon.side.id, disg, '']);
    }
    this.makeRequest('teampreview');
  },
}
```
If we prefer NO team preview at all (RBY had none), simply omit Team Preview from the
ruleset; then the engine fallback (`sim/battle.ts` L1988-2000) already splits per-side and
shows each player only their own team privately — but that fallback uses real
`pokemon.details`, so for the opponent's view we still rely on switch-time disguise (which
is fine since there's no preview). RECOMMENDED: no team preview (more RBY-authentic) +
disguise applied at switch. Keep `Disguise Team Preview` as an optional variant.

DECISION POINT: "no preview" vs "disguise preview" — pick one (see §8 build order, treat as
a small toggle).

---

## 6. Client teambuilder UI  (Complexity: MEDIUM, Risk: MEDIUM)

File: `pokemon-showdown-client/play.pokemonshowdown.com/src/oldclient/client-teambuilder.js`.
Hook points: `updateDetailsForm` (L2902-3005) builds the detail form; `detailsChange`
(L3006-3115) reads it back into `set` and calls `this.save()` (which packs via
`battle-teams.js`). The `hpType`/`teraType` dropdowns (L2976-2997 build; L3066-3080 read)
are the exact pattern to copy.

Add, gated on `this.curTeam.format` containing `gen1` AND being this PHNN format
(detect by format id, e.g. `this.curTeam.format === 'gen1phnn'` or
`.includes('puurehackmons')`-style check — use the resolved format id):
1. **Custom Type** — two `<select name="phtype1">` / `<select name="phtype2">` (second
   includes a blank "(none)" option) populated from gen1 `Dex.types.all()` filtered to gen1
   types. On read: `set.phType = [t1, t2].filter(Boolean).join('/')` or delete if empty.
2. **Disguise sprite** — `<select name="disguise">` of gen1 species (num 1-151), plus a
   "(none — show real)" option; on read set/delete `set.disguise`. Optionally render a live
   sprite preview using the existing `updatePokemonSprite()` (called at end of
   `detailsChange`, L3114) but keyed on the disguise so the builder previews the disguise.
3. **Starting Status** — `<select name="startstatus">` with options
   (none / Poison / Paralysis / Sleep / Burn / Freeze) -> set/delete `set.startStatus`.

Also update the read-back detail-cell summary (`detailsChange` L3082-3111) to show the
chosen type/disguise/status, mirroring the Tera Type cell at L3107-3109.

`this.save()` already re-packs through the (extended) client packer — no extra wiring.

NOTE: there is ALSO a newer React teambuilder (`src/battle-team-editor.tsx`,
`src/panel-teambuilder-team.tsx`) and the compiled `js/battle-team-editor.js`. Confirm which
teambuilder this deployment serves (the fork ships `oldclient/`), and implement in whichever
is live. Most likely the oldclient one given the deploy setup. VERIFY before coding.

---

## 7. Client battle display  (Complexity: LOW, Risk: LOW)

Largely **no change needed**:
- Opponent's sprite/name/type derive from the disguise species in the `|switch|` shared
  line (§4b) via `parseDetails` -> `speciesForme` -> `getSpecies`/`getTypes`
  (`battle.ts` L508-525, L573-579). Disguise sprite renders automatically.
- Opponent's tooltip type uses `getPokemonTypes(pokemon)` ->
  `pokemon.getTypeList(undefined)` (`battle-tooltips.ts` L2796-2802) -> disguise type.
- Owner's real type shows via `moddedType` set by the secret-channel typechange (§4c).
- Status icon shows for both via global `-status` (`battle.ts` L2208 `-status` handler).
Optional polish: ensure no UI surface prints the *real* species for the opponent (e.g.
search/`searchid` is built from the opponent's received `details`, which is the disguise —
fine). Add a battle-room rule banner via `onBegin` raw HTML like other PHNN formats
(`config/formats.ts` L36 pattern) explaining the disguise mechanic.

---

## 8. Complexity / risk summary + recommended build order

| Piece | Complexity | Risk | Notes |
|---|---|---|---|
| R1 rename/recategorize | Trivial | Low | formats.ts only |
| New gen1phnn mod skeleton | Low | Low | dir + scripts.ts inherit gen1 |
| Set fields + server packer | Low | Med | index discipline; split width 6->9 |
| Client packer mirror + rebuild | Low | Med | must match server exactly |
| Validator (onValidateSet) | Low | Low | gen1-type/species/status checks |
| Custom type apply (setType) | Med | Med | clearVolatile/onSwitchIn ordering |
| Pre-status apply | Med | Med | ignoreImmunities; once per battle |
| getFullDetails disguise | Med | High | core info-hiding; mirror Illusion |
| Owner-only real-type reveal | Med | High | secret-channel typechange split |
| Disguise/(no) Team Preview | Med | Med | leak audit |
| Teambuilder UI (3 controls) | Med | Med | oldclient vs react: verify |
| Battle display | Low | Low | mostly free |
| Leak audit / tests | Med | High | detailschange, replays, transform |

**Recommended build order**
1. R1 format rename + add new format entry pointing at `gen1phnn` mod (no behavior yet).
2. Create `data/mods/gen1phnn/{scripts.ts}` with `inherit:'gen1', gen:1` (empty override).
3. Extend `PokemonSet` + server `pack`/`unpack` (fields phType/disguise/startStatus).
4. Mirror client packer + extend client set type + rebuild client JS. Round-trip test
   export/import of a team with all 3 fields.
5. Teambuilder UI controls; verify `set` gets the fields and they survive save/reload.
6. Validator in `onValidateSet`.
7. Engine: apply phType via `setType` at switch; verify STAB/weakness in a local battle
   (both players controlled).
8. Pre-status apply; verify Spore-vs-presleep no-op.
9. Info-hiding: `getFullDetails` disguise on the shared channel; verify opponent sees the
   disguise sprite/name/type and owner sees real (use two browser sessions / spectator =
   omniscient -1 should see real per current convention — DECISION: do spectators see real
   or disguise? See §9/§8 note below).
10. Owner-only real-type reveal via secret typechange.
11. Team Preview decision (none vs disguise preview).
12. Full leak audit + automated sim tests in `test/` (assert opponent channel never
    contains real species/type; assert owner channel does).

NOTE (spectators / replays): channel -1 (omniscient) currently receives the *secret* line
(`extractChannelMessages` L51: `channelId === -1` gets secret). That means spectators and
saved replays would see the REAL species. For a fog-of-war format this is likely WRONG.
DECISION REQUIRED: either (a) accept spectators see real (simplest, matches Illusion where
-1 sees through illusion), or (b) add format-specific handling so the omniscient/replay
channel also gets the disguise. Option (b) is more invasive (touches the split semantics or
requires emitting disguise on -1 too). Recommend (a) for v1, document it, revisit.

---

## 9. OPEN QUESTION — "Desync"  (NEEDS CLARIFICATION — do not implement on assumption)

The user referenced the RBY "desync" glitch. In real RBY link battles, "desync" is an
emulation/cartridge-link artifact: the two Game Boys' RNG/battle state diverge (commonly via
the unstable-RNG + speed-tie / move-order / data-corruption edge cases), producing
different game states on each side. **This is fundamentally incompatible with PS's
architecture:** PS runs ONE authoritative `Battle` instance on the server and streams a
filtered view to each client. There is no per-side independent simulation that could
diverge; both clients render the same server truth. The "desync glitch" as a faithful
RNG-divergence does not exist to reproduce.

Possible interpretations the user MIGHT mean (must confirm which, if any):
1. A cosmetic "desync" where each player is shown *different* battle info (an extension of
   the fog-of-war: e.g. opponent sees disguised damage/type interactions). Partially already
   true via the disguise. Achievable via the split channel.
2. The specific RBY mechanic where being statused/transformed mid-link could let a player
   send illegal data — i.e. they want a particular *exploit-as-feature* (e.g. a move/state
   that behaves illegally). Would need an exact rule spec.
3. A meme/aesthetic "desync screen" effect. Out of scope of the simulator.
4. They simply listed it as flavor and want NO mechanic.

**ACTION:** Ask the user for the exact observable behavior/rule they want under "desync"
(what each player should see/experience, and the trigger). Do not implement until specified.
A literal RNG desync is assessed as INFEASIBLE in PS without rearchitecting to dual
authoritative simulations, which is out of scope.

---

## 10. Critical files for implementation

Server (`/srv/phnn/pokemon-showdown`):
- `config/formats.ts` — rename existing format; add new "[Gen 1] Pure Hackmons" under No Nerfs.
- `sim/teams.ts` — PokemonSet fields + pack/unpack misc-group extension.
- `sim/pokemon.ts` — getFullDetails disguise override + setType/pre-status hooks (via mod).
- `data/mods/gen1phnn/scripts.ts` (NEW) — `inherit:'gen1'`; pokemon overrides for type/status/disguise.
- `data/rulesets.ts` — optional `Disguise Team Preview` rule.
- `sim/team-validator.ts` — only as reference; validation lives in format `onValidateSet`.

Client (`/srv/phnn/pokemon-showdown-client`):
- `play.pokemonshowdown.com/src/battle-teams.ts` (+ rebuilt `js/battle-teams.js`) — mirror packer.
- `play.pokemonshowdown.com/src/oldclient/client-teambuilder.js` — type/disguise/status UI
  (`updateDetailsForm` L2902, `detailsChange` L3006).
- `play.pokemonshowdown.com/src/battle.ts` — verify (likely no change) `parseDetails`/
  `getTypes`/`moddedType` paths handle disguise + owner type reveal.
