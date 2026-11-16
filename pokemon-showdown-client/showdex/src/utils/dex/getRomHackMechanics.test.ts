import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  type GenerationNum,
  calculate,
  Field,
  Move,
  Pokemon,
} from '@smogon/calc';
import { calcPhnnConfusionDamage, calcPhnnPokemonConfusion, setPhnnCalcContext } from '@showdex/phnn';
import {
  buildRomHackProfile,
  getRomHackMechanics,
  readRomHackFraction,
  readRomHackMultiplier,
  readRomHackRolls,
  readRomHackStages,
} from './getRomHackProfile';

const Stages = [
  [25, 100], [28, 100], [33, 100], [40, 100], [50, 100], [66, 100], [1, 1],
  [125, 100], [150, 100], [175, 100], [2, 1], [225, 100], [250, 100],
];

const range = (
  gen: GenerationNum,
  attacker: [string, Record<string, unknown>?],
  defender: [string, Record<string, unknown>?],
  move: [string, Record<string, unknown>?],
  field?: Record<string, unknown>,
) => {
  const result = calculate(
    gen,
    new Pokemon(gen, attacker[0], attacker[1]),
    new Pokemon(gen, defender[0], defender[1]),
    new Move(gen, move[0], move[1]),
    field ? new Field(field) : undefined,
  );
  const damage = result.damage as number[];

  return [damage[0], damage[damage.length - 1], damage.length];
};

const useHack = (gen: number, mechanics: Record<string, unknown>) => {
  (globalThis as Record<string, unknown>).__phnnRomHack = mechanics ? { gen, mechanics } : null;
};

let shaCounter = 0;

const activate = (parentMod: string, mechanics: Record<string, unknown>) => {
  shaCounter += 1;

  const hack = { sha256: shaCounter.toString(16).padStart(64, 'c'), parentMod, mechanics };

  vi.stubGlobal('window', { RomHacks: { active: hack } });

  return hack;
};

afterEach(() => {
  useHack(0, null);
  vi.unstubAllGlobals();
});

describe('ROM hack mechanics readers', () => {
  it('accepts well-formed values and rejects the rest', () => {
    expect(readRomHackMultiplier({ stab: 1.25 }, 'stab')).toBe(1.25);
    expect(readRomHackMultiplier({ stab: -1 }, 'stab')).toBeNull();
    expect(readRomHackMultiplier({ stab: '1.25' }, 'stab')).toBeNull();
    expect(readRomHackMultiplier(null, 'stab')).toBeNull();
    expect(readRomHackFraction([1, 16])).toEqual([1, 16]);
    expect(readRomHackFraction([1, 0])).toBeNull();
    expect(readRomHackFraction(0.5)).toBeNull();
    expect(readRomHackStages({ statStages: Stages })).toHaveLength(13);
    expect(readRomHackStages({ statStages: Stages.slice(1) })).toBeNull();
    expect(readRomHackRolls({ damageRoll: { min: 85, max: 100, den: 100 } }).values).toHaveLength(16);
    expect(readRomHackRolls({ damageRoll: { min: 93, max: 100, den: 100 } }).values).toHaveLength(16);
    expect(readRomHackRolls({ damageRoll: { min: 217, max: 255, den: 255 } }).values).toHaveLength(39);
    expect(readRomHackRolls({ damageRoll: { min: 100, max: 85, den: 100 } })).toBeNull();
  });

  it('only returns mechanics inside a ROM hack format, whatever the engine generation', () => {
    activate('gen9', { critMultiplier: 2 });

    expect(getRomHackMechanics('gen9romhacksexperimental')).toEqual({ critMultiplier: 2 });
    expect(getRomHackMechanics('gen9ou')).toBeNull();
    expect(getRomHackMechanics(9)).toBeNull();

    activate('gen3', { burnAttack: 0.75 });

    expect(getRomHackMechanics('gen9romhacksexperimental')).toEqual({ burnAttack: 0.75 });
    expect(getRomHackMechanics('gen9ou')).toBeNull();
  });

  it('rebuilds the profile when the active hack is replaced by a newer copy of the same patch', () => {
    const first = activate('gen3', { burnAttack: 0.75 });

    expect(getRomHackMechanics('gen9romhacksexperimental')).toEqual({ burnAttack: 0.75 });

    vi.stubGlobal('window', { RomHacks: { active: { ...first, mechanics: { critMultiplier: 3 } } } });

    expect(getRomHackMechanics('gen9romhacksexperimental')).toEqual({ critMultiplier: 3 });
  });

  it('keeps an empty mechanics object out of the way', () => {
    expect(buildRomHackProfile({ sha256: 'd'.repeat(64), parentMod: 'gen9' }).mechanics).toEqual({});

    activate('gen9', {});

    expect(getRomHackMechanics('gen9romhacksexperimental')).toBeNull();
  });
});

describe('ROM hack mechanics in the damage engine', () => {
  it('leaves stock numbers alone without a hack', () => {
    expect(range(9, ['Garchomp'], ['Blissey'], ['Earthquake', { isCrit: true }])).toEqual([852, 1003, 16]);
    expect(range(9, ['Garchomp'], ['Blissey'], ['Earthquake'])).toEqual([568, 669, 16]);
    expect(range(1, ['Snorlax'], ['Chansey'], ['Body Slam'])).toEqual([268, 315, 39]);
  });

  it('applies critMultiplier 2 on a Gen 9 engine and restores it afterwards', () => {
    useHack(9, { critMultiplier: 2 });

    expect(range(9, ['Garchomp'], ['Blissey'], ['Earthquake', { isCrit: true }])).toEqual([1137, 1338, 16]);
    expect(range(5, ['Garchomp'], ['Blissey'], ['Earthquake', { isCrit: true }])).toEqual([1137, 1338, 16]);
    expect(range(8, ['Garchomp'], ['Blissey'], ['Earthquake', { isCrit: true }])).toEqual([852, 1003, 16]);

    useHack(0, null);

    expect(range(9, ['Garchomp'], ['Blissey'], ['Earthquake', { isCrit: true }])).toEqual([852, 1003, 16]);
  });

  it('applies critMultiplier 1.5 on a Gen 3 engine', () => {
    expect(range(3, ['Swampert'], ['Blissey'], ['Earthquake', { isCrit: true }])).toEqual([984, 1158, 16]);

    useHack(3, { critMultiplier: 1.5 });

    expect(range(3, ['Swampert'], ['Blissey'], ['Earthquake', { isCrit: true }])).toEqual([737, 868, 16]);
  });

  it('applies stab 1.25 to same-type moves only, on every engine', () => {
    useHack(9, { stab: 1.25 });

    expect(range(9, ['Garchomp'], ['Blissey'], ['Earthquake'])).toEqual([474, 557, 16]);
    expect(range(9, ['Garchomp'], ['Blissey'], ['Stone Edge'])).toEqual([379, 446, 16]);
    expect(range(9, ['Porygon-Z', { ability: 'Adaptability' }], ['Blissey'], ['Tri Attack'])).toEqual([116, 138, 16]);

    useHack(4, { stab: 1.25 });

    expect(range(4, ['Garchomp'], ['Blissey'], ['Earthquake'])).toEqual([474, 557, 16]);

    useHack(3, { stab: 1.25 });

    expect(range(3, ['Swampert'], ['Blissey'], ['Earthquake'])).toEqual([409, 482, 16]);

    useHack(2, { stab: 1.25 });

    expect(range(2, ['Snorlax'], ['Blissey'], ['Body Slam'])).toEqual([208, 245, 39]);

    useHack(1, { stab: 1.25 });

    expect(range(1, ['Snorlax'], ['Chansey'], ['Body Slam'])).toEqual([222, 262, 39]);
  });

  it('applies a type-boost item percent', () => {
    const fire = (gen: GenerationNum) => range(gen, ['Charizard', { item: 'Charcoal' }], ['Blissey'], ['Flamethrower']);

    expect(fire(3)).toEqual([94, 111, 16]);
    expect(fire(9)).toEqual([97, 115, 16]);

    useHack(3, { items: { charcoal: { powerBoost: 1.2 } } });

    expect(fire(3)[1]).toBeGreaterThan(111);
    expect(fire(9)).toEqual([97, 115, 16]);

    useHack(9, { items: { charcoal: { powerBoost: 1.5 } } });

    expect(fire(9)).toEqual([121, 144, 16]);

    useHack(9, { items: { mysticwater: { powerBoost: 1.5 } } });

    expect(fire(9)).toEqual([97, 115, 16]);
  });

  it('applies burnAttack, weather rows, stat stages and the damage roll', () => {
    useHack(9, { burnAttack: 0.75 });

    expect(range(9, ['Garchomp', { status: 'brn' }], ['Blissey'], ['Earthquake'])).toEqual([426, 502, 16]);

    useHack(9, { weatherMoveModifiers: [{ weather: 'rain', type: 'Water', multiplier: 2 }] });

    expect(range(9, ['Blastoise'], ['Blissey'], ['Surf'], { weather: 'Rain' })).toEqual([132, 156, 16]);

    useHack(9, { statStages: Stages });

    expect(range(9, ['Garchomp', { boosts: { atk: 2 } }], ['Blissey'], ['Earthquake'])).toEqual([850, 1002, 16]);

    useHack(9, { damageRoll: { min: 93, max: 100, den: 100 } });

    expect(range(9, ['Garchomp'], ['Blissey'], ['Earthquake'])).toEqual([621, 669, 16]);

    useHack(1, { damageRoll: { min: 236, max: 255, den: 255 } });

    expect(range(1, ['Snorlax'], ['Chansey'], ['Body Slam'])).toEqual([291, 315, 20]);
  });

  it('ignores malformed values', () => {
    useHack(9, {
      critMultiplier: 'two',
      stab: -1,
      burnAttack: 0,
      statStages: [[1, 2]],
      damageRoll: { min: 100, max: 85, den: 100 },
      weatherMoveModifiers: [{ weather: 'fog' }],
      items: { charcoal: { powerBoost: null } },
    });

    expect(range(9, ['Garchomp'], ['Blissey'], ['Earthquake', { isCrit: true }])).toEqual([852, 1003, 16]);
    expect(range(9, ['Garchomp', { status: 'brn', boosts: { atk: 2 } }], ['Blissey'], ['Earthquake']))
      .toEqual(range(8, ['Garchomp', { status: 'brn', boosts: { atk: 2 } }], ['Blissey'], ['Earthquake']));
    expect(range(9, ['Charizard', { item: 'Charcoal' }], ['Blissey'], ['Flamethrower'])).toEqual([97, 115, 16]);
  });

  it('publishes the active hack through setPhnnCalcContext and clears it for other formats', () => {
    activate('gen9', { critMultiplier: 2 });
    setPhnnCalcContext('gen9romhacksexperimental');

    expect(range(9, ['Garchomp'], ['Blissey'], ['Earthquake', { isCrit: true }])).toEqual([1137, 1338, 16]);

    setPhnnCalcContext('gen9ou');

    expect(range(9, ['Garchomp'], ['Blissey'], ['Earthquake', { isCrit: true }])).toEqual([852, 1003, 16]);
  });
});

describe('ROM hack mechanics in the confusion readout', () => {
  it('uses the hack stat stages and damage roll', () => {
    const stock = calcPhnnConfusionDamage({
 level: 100, atk: 300, def: 300, atkStage: 2, maxHp: 400,
});
    const staged = calcPhnnConfusionDamage({
      level: 100,
      atk: 300,
      def: 300,
      atkStage: 2,
      maxHp: 400,
      stages: readRomHackStages({ statStages: Stages }),
    });
    const rolled = calcPhnnConfusionDamage({
      level: 100,
      atk: 300,
      def: 300,
      maxHp: 400,
      damageRolls: readRomHackRolls({ damageRoll: { min: 93, max: 100, den: 100 } }),
    });

    expect([stock.minDamage, stock.maxDamage]).toEqual([58, 69]);
    expect([staged.atk, staged.maxDamage]).toEqual([450, 52]);
    expect([rolled.minDamage, rolled.maxDamage, rolled.rolls.length]).toEqual([32, 35, 16]);
  });

  it('reads the self-hit power and chance from the active hack', () => {
    const pokemon = {
 level: 100,
spreadStats: {
 hp: 400, atk: 300, def: 300, spd: 300,
},
};

    expect(calcPhnnPokemonConfusion('gen9romhacksexperimental', pokemon).maxDamage).toBe(35);

    activate('gen9', { confusionSelfHitPower: 80, confusionSelfHitChance: [1, 2] });

    const result = calcPhnnPokemonConfusion('gen9romhacksexperimental', pokemon);

    expect(result.maxDamage).toBe(69);
    expect(result.selfHitChance).toBe(50);
  });
});
