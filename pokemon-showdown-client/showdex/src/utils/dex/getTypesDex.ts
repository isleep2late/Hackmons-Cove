import { type GenerationNum } from '@smogon/calc';
import { Types } from '@smogon/calc/dist/data/types';
import { type RomHackProfile, getRomHackProfile } from './getRomHackProfile';

interface RomHackType {
  kind: 'Type';
  id: string;
  name: string;
  effectiveness: Record<string, number>;
}

const romHackTypeId = (name: string): string => String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

const getRomHackTypesDex = (profile: RomHackProfile): Types => {
  const byId: Record<string, RomHackType> = {};

  Object.keys(profile.typeChart).forEach((name) => {
    const id = romHackTypeId(name);

    byId[id] = {
      kind: 'Type',
      id,
      name,
      effectiveness: profile.typeChart[name],
    };
  });

  return {
    get: (id: string) => byId[id],
    * [Symbol.iterator]() {
      yield* Object.values(byId);
    },
  } as unknown as Types;
};

/**
 * Returns the `types` property used in the `Generation` class.
 *
 * * Note that the object returned by `Dex.types.get()` (from the global `Dex` object) does not
 *   include properties like `effectiveness` that is provided by the `get()` method of the `Types` class.
 *
 * @since 1.0.3
 */
export const getTypesDex = (gen: GenerationNum, format?: string | GenerationNum): Types => {
  const profile = getRomHackProfile(format);

  if (profile?.typeChart) {
    return getRomHackTypesDex(profile);
  }

  return new Types(gen);
};
