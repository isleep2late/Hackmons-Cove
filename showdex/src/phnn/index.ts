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

  if (!(f.includes('phnn') || f.includes('nonerfs') || f.includes('unified'))) {
    return null;
  }

  const genMatch = f.match(/gen(\d+)/);
  const gen = genMatch ? Number(genMatch[1]) : 9;

  if (gen === 8 && f.includes('unified')) {
    return ('gen8unified' in phnnData ? 'gen8unified' : null) as PhnnKey | null;
  }

  const key = `gen${gen}phnn` as PhnnKey;

  return (key in phnnData ? key : null);
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

  if (ivs && id.startsWith('hiddenpower')) {
    const bit = (value: number): number => Math.floor(((Number(value) || 0) % 4) / 2);
    const power = bit(ivs.atk) + 2 * bit(ivs.def) + 4 * bit(ivs.spe) + 8 * bit(ivs.spa) + 16 * bit(ivs.spd) + 32 * bit(ivs.hp);
    out.basePower = Math.floor((power * 40) / 63 + 30);
  }

  return out;
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

export const setPhnnCalcContext = (format: string): void => {
  const key = detectPhnnKey(format);

  (globalThis as Record<string, unknown>).__phnnCalc = key
    ? { typeChart: getPhnnTypeChart(format) || {}, parentalBond: true }
    : null;
};
