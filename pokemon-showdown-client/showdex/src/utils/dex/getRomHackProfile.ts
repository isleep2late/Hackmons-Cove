import { type GenerationNum } from '@smogon/calc';
import { TYPE_CHART } from '@smogon/calc/dist/data/types';

export type RomHackTypeChart = Record<string, Record<string, number>>;

export interface RomHackProfile {
  sha256: string;
  gen: GenerationNum;
  typeChart: RomHackTypeChart | null;
  typeNames: string[];
  newTypes: string[];
  mechanics: Record<string, unknown>;
}

interface RomHackTypeEntry {
  name?: string;
  damageTaken?: Record<string, number>;
}

interface RomHackData {
  sha256?: string;
  parentMod?: string;
  TypeChart?: Record<string, RomHackTypeEntry>;
  Pokedex?: Record<string, { types?: string[]; }>;
  Moves?: Record<string, { type?: string; }>;
  mechanics?: Record<string, unknown>;
}

const RomHackFormatRegex = /romhacks/i;
const DamageTakenMultipliers = [1, 2, 0.5, 0];
const profiles = new WeakMap<RomHackData, RomHackProfile>();

const typeId = (name: string): string => String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

const buildRomHackTypeChart = (
  hack: RomHackData,
  gen: GenerationNum,
): Pick<RomHackProfile, 'typeChart' | 'typeNames' | 'newTypes'> => {
  const source = hack.TypeChart || {};
  const stock = (TYPE_CHART[gen] || TYPE_CHART[9] || {}) as RomHackTypeChart;
  const typeNames = Object.keys(stock);

  if (!Object.keys(source).length) {
    return { typeChart: null, typeNames, newTypes: [] };
  }

  const known: Record<string, string> = {};
  const newTypes: string[] = [];

  typeNames.forEach((name) => {
    known[typeId(name)] = name;
  });

  const add = (name: string) => {
    const id = typeId(name);

    if (!id || known[id] || !source[id]) {
      return;
    }

    known[id] = name;
    typeNames.push(name);
    newTypes.push(name);
  };

  Object.values(source).forEach((entry) => add(entry?.name));
  Object.values(hack.Pokedex || {}).forEach((entry) => (entry?.types || []).forEach(add));
  Object.values(hack.Moves || {}).forEach((entry) => add(entry?.type));

  const spelled: Record<string, string> = {};

  Object.values(source).forEach((entry) => Object.keys(entry?.damageTaken || {}).forEach((name) => {
    spelled[typeId(name)] = name;
  }));

  Object.keys(source).forEach((id) => {
    if (!id || known[id] || !spelled[id]) {
      return;
    }

    known[id] = spelled[id];
    typeNames.push(spelled[id]);
  });

  const typeChart: RomHackTypeChart = {};

  typeNames.forEach((attack) => {
    const row: Record<string, number> = {};

    typeNames.forEach((defend) => {
      const code = source[typeId(defend)]?.damageTaken?.[attack];

      row[defend] = typeof code === 'number' && code in DamageTakenMultipliers
        ? DamageTakenMultipliers[code]
        : stock[attack]?.[defend] ?? 1;
    });

    typeChart[attack] = row;
  });

  return { typeChart, typeNames, newTypes };
};

export const buildRomHackProfile = (hack: RomHackData): RomHackProfile => {
  if (!hack?.sha256) {
    return null;
  }

  const cached = profiles.get(hack);

  if (cached) {
    return cached;
  }

  const gen = Math.min(9, Math.max(1, parseInt(String(hack.parentMod).slice(3), 10) || 9)) as GenerationNum;

  const profile: RomHackProfile = {
    sha256: hack.sha256,
    gen,
    ...buildRomHackTypeChart(hack, gen),
    mechanics: { ...hack.mechanics },
  };

  profiles.set(hack, profile);

  return profile;
};

export type RomHackMechanics = Record<string, unknown>;

export interface RomHackRolls {
  values: number[];
  den: number;
}

const isPositive = (value: unknown, max: number): value is number => (
  typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= max
);

export const readRomHackMultiplier = (mechanics: RomHackMechanics, key: string): number => {
  const value = mechanics?.[key];

  return isPositive(value, 16) ? value : null;
};

export const readRomHackFraction = (value: unknown): [number, number] => {
  if (!Array.isArray(value) || value.length !== 2) {
    return null;
  }

  const [num, den] = value as unknown[];

  return isPositive(num, 1e9) && isPositive(den, 1e9) ? [num, den] : null;
};

export const readRomHackStages = (mechanics: RomHackMechanics): [number, number][] => {
  const table = mechanics?.statStages;

  if (!Array.isArray(table) || table.length !== 13) {
    return null;
  }

  const stages = table.map((entry) => readRomHackFraction(entry));

  return stages.every(Boolean) && stages[6][0] === stages[6][1] ? stages : null;
};

export const readRomHackRolls = (mechanics: RomHackMechanics): RomHackRolls => {
  const roll = mechanics?.damageRoll as { min?: number; max?: number; den?: number; };
  const whole = (value: unknown): value is number => Number.isInteger(value);

  if (!roll || !whole(roll.min) || !whole(roll.max) || !whole(roll.den)) {
    return null;
  }

  if (roll.min < 1 || roll.max < roll.min || roll.den < 1 || roll.max - roll.min > 255) {
    return null;
  }

  const repeat = Math.ceil(16 / (roll.max - roll.min + 1));
  const values: number[] = [];

  for (let r = roll.min; r <= roll.max; r++) {
    for (let k = 0; k < repeat; k++) {
      values.push(r);
    }
  }

  return { values, den: roll.den };
};

export const getRomHackProfile = (format?: string | GenerationNum): RomHackProfile => {
  if (typeof format !== 'string' || !RomHackFormatRegex.test(format) || typeof window === 'undefined') {
    return null;
  }

  const romHacks = (window as unknown as { RomHacks?: { active?: RomHackData; }; }).RomHacks;

  return buildRomHackProfile(romHacks?.active);
};

export const getRomHackMechanics = (format?: string | GenerationNum): RomHackMechanics => {
  const profile = getRomHackProfile(format);

  if (!profile?.mechanics || !Object.keys(profile.mechanics).length) {
    return null;
  }

  return profile.mechanics;
};
