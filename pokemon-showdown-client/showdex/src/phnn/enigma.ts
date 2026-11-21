import { type ItemName } from '@smogon/calc';

export interface PhnnEnigmaItem {
  item: ItemName;
  enigmaItem: string;
  enigmaParam: number;
}

interface EnigmaDexItem {
  exists?: boolean;
  name?: string;
  enigmaBase?: string;
  enigmaParam?: number;
}

interface EnigmaDex {
  items?: {
    get: (name: string) => unknown;
  };
}

export const getPhnnEnigmaItem = (
  dex: EnigmaDex,
  name: string,
): PhnnEnigmaItem => {
  if (!name || typeof dex?.items?.get !== 'function') {
    return null;
  }

  const dexItem = dex.items.get(name) as EnigmaDexItem;

  if (!dexItem?.exists || typeof dexItem.enigmaBase !== 'string') {
    return null;
  }

  const baseItem = dex.items.get(dexItem.enigmaBase || 'enigmaberry') as EnigmaDexItem;

  if (!baseItem?.exists || !baseItem.name) {
    return null;
  }

  return {
    item: baseItem.name as ItemName,
    enigmaItem: dexItem.name,
    enigmaParam: dexItem.enigmaParam ?? null,
  };
};

export const getPhnnBaseItem = <T extends string>(
  dex: EnigmaDex,
  name: T,
): T => (getPhnnEnigmaItem(dex, name)?.item as string as T) || name;
