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
