import { type MoveName } from '@smogon/calc';
import { getDexForFormat, getMaxMove } from '@showdex/utils/dex';
import phnnData from './phnn-data';

const toPhnnId = (text: string): string => String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

const PHNN_TYPELESS_MOVES = ['seismictoss', 'nightshade', 'sonicboom', 'counter', 'bide'];

const PLATE_TYPES: Record<string, string> = {
  flameplate: 'Fire',
  splashplate: 'Water',
  zapplate: 'Electric',
  meadowplate: 'Grass',
  icicleplate: 'Ice',
  fistplate: 'Fighting',
  toxicplate: 'Poison',
  earthplate: 'Ground',
  skyplate: 'Flying',
  mindplate: 'Psychic',
  insectplate: 'Bug',
  stoneplate: 'Rock',
  spookyplate: 'Ghost',
  dracoplate: 'Dragon',
  dreadplate: 'Dark',
  ironplate: 'Steel',
  pixieplate: 'Fairy',
};

export type PhnnKey = keyof typeof phnnData;

export const detectPhnnKey = (format: string): PhnnKey | null => {
  if (!format) {
    return null;
  }

  const f = format.toLowerCase();

  const genMatch = f.match(/gen(\d+)/);
  const gen = genMatch ? Number(genMatch[1]) : 9;

  // fork mods first, most specific wins
  if (f.includes('spaceworld')) {
    return ('spaceworld' in phnnData ? 'spaceworld' : null) as PhnnKey | null;
  }

  if (f.includes('customdisguises')) {
    return ('gen9customdisguises' in phnnData ? 'gen9customdisguises' : null) as PhnnKey | null;
  }

  if (f.includes('champions')) {
    return ('champions' in phnnData ? 'champions' : null) as PhnnKey | null;
  }

  if (gen === 2 && (f.includes('gs') || f.includes('goldsilver'))) {
    return ('gen2gs' in phnnData ? 'gen2gs' : null) as PhnnKey | null;
  }

  if (gen === 8 && f.includes('unified')) {
    return ('gen8unified' in phnnData ? 'gen8unified' : null) as PhnnKey | null;
  }

  if (f.includes('phnn') || f.includes('nonerfs') || f.includes('unified')) {
    const key = `gen${gen}phnn` as PhnnKey;

    if (key in phnnData) {
      return key;
    }
  }

  // every other format still needs its generation's own chart, which is where the
  // fork's Shadow / ??? / Bird rows live that @smogon/calc has no data for
  const genKey = `gen${gen}` as PhnnKey;

  return (genKey in phnnData ? genKey : null);
};

export const detectMaxEvsFormat = (format: string): boolean => {
  if (!format) {
    return false;
  }

  const f = format.toLowerCase();

  if (f.includes('phnn') || f.includes('nonerfs') || f.includes('unified')) {
    return true;
  }

  if (f.includes('disguises') || f.includes('statuses') || f.includes('glitches') || f.includes('nolimit')) {
    return true;
  }

  if (f.includes('customgame')) {
    return true;
  }

  if (f.includes('anyability') && !f.includes('almostanyability')) {
    return true;
  }

  if (!f.includes('hackmons') || f.includes('hackmonscup')) {
    return false;
  }

  const genMatch = f.match(/gen(\d+)/);
  const gen = genMatch ? Number(genMatch[1]) : 9;

  return gen !== 6;
};

// in hackmons-style formats any Pokemon can carry any ability, so the dex's first ability is a
// guess with no evidence behind it -- and guessing wrong silently doubles or halves the damage
export const isPhnnAnyAbilityFormat = (format: string): boolean => {
  if (!format) {
    return false;
  }

  const f = format.toLowerCase();

  return /hackmons|nonerfs|customgame|customdisguise|disguise|status|anyability|nolimit|unified|bh/.test(f);
};

export const detectDisguiseFormat = (format: string): boolean => {
  if (!format) {
    return false;
  }

  return format.toLowerCase().includes('disguise');
};

export const getMaxStatEv = (format: string | number): number => (
  typeof format === 'string' && format.toLowerCase().includes('letsgo') ? 200 : 252
);

export const getPhnnMoveOverrides = (
  format: string,
  moveName: string,
  ivs?: Record<string, number>,
): Record<string, unknown> => {
  const key = detectPhnnKey(format);

  if (!key) {
    return {};
  }

  const id = toPhnnId(moveName);
  const move = (phnnData[key].moves as Record<string, Record<string, unknown>>)[id];
  const out: Record<string, unknown> = {};

  if (move) {
    if (typeof move.basePower === 'number') {
      out.basePower = move.basePower;
    }

    if (move.type) {
      out.type = move.type;
    }

    if (move.category) {
      out.category = move.category;
    }

    if (move.overrideDefensiveStat) {
      out.defensiveStat = move.overrideDefensiveStat;
    }

    if (move.overrideOffensiveStat) {
      out.offensiveStat = move.overrideOffensiveStat;
    }
  }

  if (PHNN_TYPELESS_MOVES.includes(id)) {
    out.type = '???';
  }

  if (ivs && id.startsWith('hiddenpower') && key !== 'spaceworld') {
    const bit = (value: number): number => Math.floor(((Number(value) || 0) % 4) / 2);
    const power = bit(ivs.atk) + 2 * bit(ivs.def) + 4 * bit(ivs.spe) + 8 * bit(ivs.spa) + 16 * bit(ivs.spd) + 32 * bit(ivs.hp);
    out.basePower = Math.floor((power * 40) / 63 + 30);
  }

  return out;
};

const PHNN_FIXED_GMAX = ['gmaxdrumsolo', 'gmaxfireball', 'gmaxhydrosnipe'];

const phnnGmaxBasePower = (
  dexMove: { basePower?: number; maxMove?: { basePower?: number } },
  gmaxId: string,
  gmaxDexBasePower?: number,
): number => {
  if (!dexMove?.maxMove?.basePower) {
    return dexMove?.basePower || 100;
  }

  if (!PHNN_FIXED_GMAX.includes(gmaxId)) {
    return dexMove.maxMove.basePower;
  }

  return gmaxDexBasePower || dexMove.basePower || 100;
};

export const getPhnnGmaxMoveOverride = (
  format: string,
  moveName: string,
  pokemon?: { speciesForme?: string; altFormes?: string[]; ability?: string; dirtyAbility?: string },
  physical?: boolean,
): Record<string, unknown> | null => {
  if (!format || !moveName || !detectMaxEvsFormat(format)) {
    return null;
  }

  const id = toPhnnId(moveName);

  if (id.startsWith('gmax')) {
    if (PHNN_FIXED_GMAX.includes(id)) {
      return null;
    }
    return { basePower: 10 };
  }

  const speciesForme = pokemon?.speciesForme;

  if (!speciesForme?.includes('-Gmax')) {
    return null;
  }

  const dex = getDexForFormat(format);
  const dexMove = dex?.moves.get(moveName);

  if (!dexMove?.exists || dexMove.category === 'Status') {
    return null;
  }

  const gmaxName = getMaxMove(moveName as MoveName, {
    moveType: dexMove.type,
    speciesForme,
    altFormes: pokemon?.altFormes,
    ability: (pokemon?.dirtyAbility ?? pokemon?.ability) as Parameters<typeof getMaxMove>[1]['ability'],
  });

  if (!gmaxName || !/^G-Max/.test(gmaxName)) {
    return null;
  }

  return {
    basePower: phnnGmaxBasePower(dexMove, toPhnnId(gmaxName), dex?.moves.get(gmaxName)?.basePower),
    category: dexMove.category,
  };
};

export const getPhnnBaseStats = (
  format: string,
  speciesForme: string,
): Record<string, number> | null => {
  const key = detectPhnnKey(format);

  if (!key || !speciesForme) {
    return null;
  }

  return (phnnData[key].baseStats as Record<string, Record<string, number>>)[speciesForme] || null;
};

export const getPhnnTypeChart = (
  format: string,
): Record<string, Record<string, number>> | null => {
  const key = detectPhnnKey(format);

  if (!key) {
    return null;
  }

  return (phnnData[key].typeChart as Record<string, Record<string, number>>) || null;
};

export const getPhnnArceusTypes = (
  format: string,
  speciesForme: string,
  item: string,
): string[] | null => {
  if (detectPhnnKey(format) !== 'gen5phnn') {
    return null;
  }

  if (toPhnnId(speciesForme) !== 'arceus') {
    return null;
  }

  const plateType = PLATE_TYPES[toPhnnId(item)];

  return plateType ? [plateType] : null;
};

const PHNN_SW_EVIOLITE_IDS = [
  'ballerine', 'ditto', 'farfetchd', 'farfetchdsw', 'golppy', 'minicorn', 'para', 'pinsir',
  'pinsirmega', 'pinsirsw', 'shuckle', 'slowbro', 'slowbromega', 'slowbrosw', 'tangel', 'trifox', 'twinz',
];

export const isPhnnSwEvioliteNfe = (format: string, speciesId: string): boolean => (
  detectPhnnKey(format) === 'gen9phnn' && PHNN_SW_EVIOLITE_IDS.includes(toPhnnId(speciesId))
);

const PHNN_SHADOW_MOVE_IDS = [
  'shadowrush', 'shadowblast', 'shadowblitz', 'shadowbreak', 'shadowend', 'shadowbolt',
  'shadowchill', 'shadowfire', 'shadowstorm', 'shadowwave', 'shadowrave', 'shadowdown',
  'shadowmist', 'shadowpanic', 'shadowhold', 'shadowhalf', 'shadowshed', 'shadowsky',
];

const PHNN_SHADOW_DAMAGING_MOVE_IDS = [
  'shadowrush', 'shadowblast', 'shadowblitz', 'shadowbreak', 'shadowend', 'shadowbolt',
  'shadowchill', 'shadowfire', 'shadowstorm', 'shadowwave', 'shadowrave',
];

export const isPhnnShadowDamagingMove = (moveName: string): boolean => (
  PHNN_SHADOW_DAMAGING_MOVE_IDS.includes(toPhnnId(moveName))
);

export const isPhnnTypingKnown = (pokemon: {
  speciesForme?: string;
  types?: string[];
  dirtyTypes?: string[];
}): boolean => {
  if (!pokemon?.speciesForme) {
    return false;
  }

  // a Shadow forme announces itself; otherwise we need typing we have actually seen
  if (pokemon.speciesForme.toLowerCase().includes('shadow')) {
    return true;
  }

  return !!(pokemon.dirtyTypes?.length || pokemon.types?.length);
};

/**
 * Whether a Pokemon counts as Shadow for Shadow-move effectiveness.
 *
 * The server's rule is `phnnIsShadowMon()`: a Pokemon is Shadow if it is Shadow-TYPED **or** carries
 * any Shadow move. Carrying one flips a Shadow move from 2x per defending type to 0.5x per defending
 * type - a flat 4x swing (mono-type 2x -> 0.5x, dual-type 4x -> 1x), verified against the live sim.
 *
 * Because a move the opponent has not used yet is hidden information, this deliberately returns
 * `'unknown'` rather than guessing, and the Calcdex shows `???` until the answer is actually known.
 * It becomes known the moment the Pokemon is a Shadow forme, is revealed to be Shadow-typed, uses a
 * Shadow move, or has revealed a full moveset containing none.
 */
export const phnnShadowState = (pokemon: {
  speciesForme?: string;
  types?: string[];
  dirtyTypes?: string[];
  teraType?: string;
  dirtyTeraType?: string;
  terastallized?: boolean;
  moves?: string[];
  serverMoves?: string[];
  revealedMoves?: string[];
  transformedMoves?: string[];
  serverSourced?: boolean;
}): 'shadow' | 'plain' | 'unknown' => {
  if (!pokemon?.speciesForme) {
    return 'unknown';
  }

  const types = pokemon.dirtyTypes?.length ? pokemon.dirtyTypes : pokemon.types;

  if (types?.some((t) => String(t).toLowerCase() === 'shadow')) {
    return 'shadow';
  }

  if (pokemon.terastallized) {
    const tera = pokemon.dirtyTeraType || pokemon.teraType;

    if (String(tera || '').toLowerCase() === 'shadow') {
      return 'shadow';
    }
  }

  // a Shadow forme announces itself even before its typing has been seen
  if (pokemon.speciesForme.toLowerCase().includes('shadow')) {
    return 'shadow';
  }

  const known = [
    ...(pokemon.transformedMoves || []),
    ...(pokemon.serverMoves || []),
    ...(pokemon.revealedMoves || []),
  ].filter(Boolean);

  if (known.some((m) => PHNN_SHADOW_MOVE_IDS.includes(toPhnnId(m)))) {
    return 'shadow';
  }

  // our own Pokemon (and anything the server told us about) has a fully known moveset
  const ours = pokemon.serverSourced || !!pokemon.serverMoves?.length;

  if (ours) {
    const all = [...(pokemon.transformedMoves || []), ...(pokemon.serverMoves || []), ...(pokemon.moves || [])];

    return all.some((m) => PHNN_SHADOW_MOVE_IDS.includes(toPhnnId(m))) ? 'shadow' : 'plain';
  }

  // four revealed moves means there is nothing left to hide
  return (pokemon.revealedMoves?.length || 0) >= 4 ? 'plain' : 'unknown';
};

/**
 * Per-defending-type multiplier that reproduces the server's FLAT Shadow effectiveness.
 *
 * The server applies Shadow as a flat 2x into anything that is not Shadow and a flat 0.5x into
 * anything that is, regardless of how many types the target has - `runEffectiveness` is overridden in
 * the phnn mod to return a single total rather than accumulating per type. The calc's chart hook is
 * applied once per defending type, so the value here has to be the n-th root of that total.
 *
 *   1 type  -> 2      / 0.5
 *   2 types -> 1.414  / 0.707   (product 2 / 0.5)
 */
export const phnnShadowChartValue = (typeCount: number, isShadowTarget: boolean): number => {
  const n = Math.max(1, typeCount || 1);

  return (isShadowTarget ? 0.5 : 2) ** (1 / n);
};

export const isPhnnKamehamehaMove = (moveName: string): boolean => (
  toPhnnId(moveName) === 'kamehameha'
);

export const setPhnnCalcContext = (format: string): void => {
  const key = detectPhnnKey(format);

  (globalThis as Record<string, unknown>).__phnnCalc = key
    ? {
      typeChart: getPhnnTypeChart(format) || {},
      parentalBond: true,
      shadowMoves: PHNN_SHADOW_MOVE_IDS,
      critModifier: 2,
    }
    : null;
};

/**
 * Confusion self-damage.
 *
 * This server does NOT route confusion through the normal move pipeline, so none of the usual
 * damage modifiers apply. `BattleActions#getConfusionDamage()` (pokemon-showdown
 * sim/battle-actions.ts) is closed-form:
 *
 *   attack     = pokemon.calculateStat('atk', boosts.atk)
 *   defense    = pokemon.calculateStat('def', boosts.def)
 *   baseDamage = tr(tr(tr(tr(2 * level / 5 + 2) * basePower * attack) / defense) / 50) + 2
 *   damage     = max(1, randomizer(tr(baseDamage, 16)))
 *
 * It calls no runEvent, so NOTHING modifies it: no STAB, no type effectiveness, no crit, no
 * ability (Wonder Guard, Huge Power, Guts, Fur Coat included), no item, no burn, no screens, no
 * weather, no terrain, no Tera, no Parental Bond. That is why this is computed here rather than
 * through @smogon/calc - routing it through the engine would be LESS accurate, since the engine
 * would apply Reflect, Life Orb, Protean's type-blind STAB and Wonder Guard's typeless zeroing.
 *
 * Ported against the server sources on 2026-09-15; keep it in step if those move.
 */

/** `Dex#trunc()` - sim/dex.ts. 32-bit unsigned wrap, optionally narrowed to `bits`. */
const phnnTrunc = (num: number, bits = 0): number => (
  bits ? (num >>> 0) % (2 ** bits) : (num >>> 0)
);

/**
 * Boost application exactly as `Pokemon#calculateStat()` does it - sim/pokemon.ts.
 *
 * Note the asymmetry: positive stages FLOOR a multiply, negative stages FLOOR a DIVIDE. Do not be
 * tempted to reuse a `stat * (1 / value)` helper: Math.floor(3 * (1 / 1.5)) is 1, while
 * Math.floor(3 / 1.5) is 2.
 */
const phnnBoostedStat = (stat: number, stage: number): number => {
  const boostTable = [1, 1.5, 2, 2.5, 3, 3.5, 4];
  const boost = Math.max(-6, Math.min(6, Math.trunc(Number(stage) || 0)));

  return boost >= 0
    ? Math.floor(stat * boostTable[boost])
    : Math.floor(stat / boostTable[-boost]);
};

/**
 * Odds that a confused Pokemon hits ITSELF on a given turn, as a percentage.
 *
 * The `phnn` mod overrides this to a coin flip - `randomChance(1, 2)` in
 * data/mods/phnn/conditions.ts - where standard Showdown uses `randomChance(33, 100)`.
 *
 * Deliberately keyed off the format id rather than detectPhnnKey(). Every one of the eight
 * `mod: 'phnn'` formats in config/formats.ts is gen 9 and carries "nonerfs" in its id, but they do
 * NOT all resolve to the gen9phnn data key - gen9nonerfscustomdisguises resolves to
 * gen9customdisguises, and would have been given the wrong chance. The mod, not the type chart, is
 * what decides this.
 */
export const getPhnnConfusionSelfHitChance = (format: string): number => {
  const f = String(format || '').toLowerCase();

  return f.includes('nonerfs') && /gen9/.test(f) ? 50 : 33;
};

export interface PhnnConfusionDamage {
  /** Atk actually fed to the formula: spread stat plus stage, with no ability/item modifiers. */
  atk: number;
  /** Def actually fed to the formula (the Spd spread stat instead, under Wonder Room). */
  def: number;
  level: number;
  maxHp: number;
  /** All 16 damage rolls, ascending (85% through 100%). */
  rolls: number[];
  minDamage: number;
  maxDamage: number;
  minPercent: number;
  maxPercent: number;
  /** Worst case: self-hits needed to faint from full HP. NOT turns - see selfHitChance. */
  hitsToKo: number;
  /** Percent chance of hitting yourself on a given turn. */
  selfHitChance: number;
}

export const calcPhnnConfusionDamage = (input: {
  level?: number;
  atk?: number;
  def?: number;
  /** Only read when wonderRoom is true. */
  spd?: number;
  atkStage?: number;
  defStage?: number;
  spdStage?: number;
  maxHp?: number;
  wonderRoom?: boolean;
  /** Confusion is always 40 in every gen this fork hosts; overridable for tests. */
  basePower?: number;
  selfHitChance?: number;
}): PhnnConfusionDamage | null => {
  const basePower = input?.basePower || 40;
  const level = Math.max(1, Math.trunc(input?.level || 100));

  // Wonder Room swaps the defenses BEFORE boosts are applied, so the STAGE swaps with the stat.
  const rawAtk = Math.trunc(input?.atk || 0);
  const rawDef = Math.trunc((input?.wonderRoom ? input?.spd : input?.def) || 0);
  const defStage = input?.wonderRoom ? input?.spdStage : input?.defStage;

  if (rawAtk < 1 || rawDef < 1) {
    return null;
  }

  const atk = phnnBoostedStat(rawAtk, input?.atkStage || 0);
  const def = Math.max(1, phnnBoostedStat(rawDef, defStage || 0));

  const levelFactor = phnnTrunc(((2 * level) / 5) + 2);
  const baseDamage = phnnTrunc(phnnTrunc(phnnTrunc(levelFactor * basePower * atk) / def) / 50) + 2;

  // 16-bit context, and it is a WRAP, not a clamp. In a format with inflated base stats, +6 Atk
  // into -6 Def can exceed 65536 and the server genuinely wraps to a small number.
  const damage16 = phnnTrunc(baseDamage, 16);

  // randomizer(): tr(tr(baseDamage * (100 - random(16))) / 100), so r runs 0..15.
  const rolls: number[] = [];

  for (let r = 15; r >= 0; r--) {
    rolls.push(Math.max(1, phnnTrunc(phnnTrunc(damage16 * (100 - r)) / 100)));
  }

  const maxHp = Math.max(1, Math.trunc(input?.maxHp || 0));
  const minDamage = rolls[0];
  const maxDamage = rolls[rolls.length - 1];

  return {
    atk,
    def,
    level,
    maxHp,
    rolls,
    minDamage,
    maxDamage,
    minPercent: (minDamage / maxHp) * 100,
    maxPercent: (maxDamage / maxHp) * 100,
    hitsToKo: Math.ceil(maxHp / minDamage),
    selfHitChance: input?.selfHitChance || 33,
  };
};

/**
 * Adapter from a CalcdexPokemon to calcPhnnConfusionDamage().
 *
 * `pokemon` is typed STRUCTURALLY on purpose: @showdex/utils/calc already imports this module, so
 * importing its interfaces back would be a cycle.
 *
 * Feeds `spreadStats`, never `finalStats`. finalStats layers in ability and item modifiers (Huge
 * Power, Choice Band, Fur Coat), and the server's calculateStat() reads storedStats and applies
 * only boosts - so spreadStats plus a stage is the exact analogue. Using finalStats here is the
 * difference between a correct readout and a merely plausible one.
 */
export const calcPhnnPokemonConfusion = (
  format: string,
  pokemon: {
    level?: number;
    spreadStats?: Partial<Record<string, number>>;
    transformedSpreadStats?: Partial<Record<string, number>>;
    boosts?: Partial<Record<string, number>>;
    dirtyBoosts?: Partial<Record<string, number>>;
    maxhp?: number;
    transformedForme?: string;
  },
  /** Showdex names this `isWonderRoom` on CalcdexBattleField (see sanitizeField.ts). */
  field?: { isWonderRoom?: boolean },
): PhnnConfusionDamage | null => {
  if (!pokemon) {
    return null;
  }

  const stats = (pokemon.transformedForme && pokemon.transformedSpreadStats)
    || pokemon.spreadStats;

  if (!stats) {
    return null;
  }

  const stage = (stat: string): number => (
    typeof pokemon.dirtyBoosts?.[stat] === 'number'
      ? pokemon.dirtyBoosts[stat]
      : (pokemon.boosts?.[stat] || 0)
  );

  // maxhp of 100 means the client is reporting PERCENTAGES rather than points, in which case the
  // spread HP is the real number.
  const maxHp = (pokemon.maxhp && pokemon.maxhp !== 100 ? pokemon.maxhp : 0) || stats.hp || 0;

  return calcPhnnConfusionDamage({
    level: pokemon.level,
    atk: stats.atk,
    def: stats.def,
    spd: stats.spd,
    atkStage: stage('atk'),
    defStage: stage('def'),
    spdStage: stage('spd'),
    maxHp,
    wonderRoom: !!field?.isWonderRoom,
    selfHitChance: getPhnnConfusionSelfHitChance(format),
  });
};

/**
 * "Minimise confusion damage": the spread a pure special attacker or wall actually runs.
 *
 * The fork assumes 252 EVs and 31 IVs in every stat, which is the right worst case for an unknown
 * opponent but wrong for a Pokemon that deliberately dumps Attack so confusion hurts less.
 * Confusion self-damage is a physical hit that uses the Pokemon's OWN Atk (see
 * calcPhnnConfusionDamage above), so zero EVs, zero IVs and a minus-Atk nature is the standard
 * answer - at no cost to a Pokemon that never clicks a physical move.
 *
 * This is opt-in per Pokemon and never inferred. In Pure Hackmons any Pokemon can carry any move
 * and any ability, so guessing that an opponent is "special" would make the Calcdex under-report
 * every physical move it might click - a worse error than the conservative one it replaces.
 */

/** The four natures that lower Attack, keyed by the stat they raise. */
export const PHNN_MINUS_ATK_NATURES: Record<string, string> = {
  def: 'Bold',
  spa: 'Modest',
  spd: 'Calm',
  spe: 'Timid',
};

/**
 * Picks the minus-Atk nature that best preserves what the Pokemon was already doing.
 *
 * If it already lowers Atk, leave it alone. Otherwise keep its boosted stat and swap the drop onto
 * Atk - a +SpA Pokemon becomes Modest, a +Spe one Timid, and so on. Only a neutral or +Atk nature
 * has nothing to preserve, and those fall back to Modest.
 */
export const getPhnnMinConfusionNature = (
  nature?: string,
  natureBoosts?: Record<string, [up?: string, down?: string]>,
): Showdown.PokemonNature => {
  const boosts = natureBoosts?.[nature as string];
  const up = boosts?.[0];
  const down = boosts?.[1];

  if (down === 'atk') {
    return nature as Showdown.PokemonNature;
  }

  const preserved = up && up !== 'atk' ? PHNN_MINUS_ATK_NATURES[up] : null;

  return (preserved || 'Modest') as Showdown.PokemonNature;
};

/**
 * Applies the min-confusion spread in place on a mutable stat table pair.
 *
 * Deliberately narrow: it only ever zeroes Atk. Everything else the caller decided - including the
 * 252/31 max-EV defaults - is left exactly as it was, so this composes with the existing spread
 * logic instead of replacing it.
 */
export const applyPhnnMinConfusionSpread = (
  evs?: Partial<Record<string, number>>,
  ivs?: Partial<Record<string, number>>,
): void => {
  if (evs && typeof evs.atk === 'number') {
    evs.atk = 0;
  }

  if (ivs && typeof ivs.atk === 'number') {
    ivs.atk = 0;
  }
};
