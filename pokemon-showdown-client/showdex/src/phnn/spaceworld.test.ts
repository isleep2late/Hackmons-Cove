import {
  Field,
  Generations,
  Move,
  Pokemon,
} from '@smogon/calc';
import {
  afterEach,
  describe,
  expect,
  it,
} from 'vitest';
import {
  getPhnnBaseStats,
  getPhnnMoveOverrides,
  hasPhnnPokemonScreens,
  setPhnnCalcContext,
} from '@showdex/phnn';
import { calculatePhnnMatchup } from '@showdex/phnn/fixedDamage';
import { getPhnnSw97HiddenPower } from '@showdex/phnn/spaceworld';
import { getPhnnSwStreaks, getPhnnSwTimesUsed } from '@showdex/phnn/swStreaks';
import { sanitizePlayerSide } from '@showdex/utils/battle/sanitizePlayerSide';

const SW = 'gen2spaceworldou';
const SW_ITEMS = 'gen2spaceworldcustomdisguises';

interface Side {
  species: string;
  boosts?: Record<string, number>;
  ivs?: Record<string, number>;
  item?: string;
  status?: string;
  level?: number;
}

interface Options {
  crit?: boolean;
  basePower?: number;
  hits?: number;
  timesUsed?: number;
  weather?: string;
  reflect?: boolean;
  lightScreen?: boolean;
}

const run = (
  format: string,
  attackerSide: Side,
  moveName: string,
  defenderSide: Side,
  options: Options = {},
) => {
  const gen = Generations.get(2);
  const make = (side: Side) => {
    const baseStats = getPhnnBaseStats(format, side.species);

    return new Pokemon(gen, side.species, {
      level: side.level || 100,
      boosts: side.boosts as never,
      ivs: side.ivs as never,
      item: side.item as never,
      status: side.status as never,
      ...(baseStats ? { overrides: { baseStats } as never } : {}),
    });
  };
  const attacker = make(attackerSide);
  const defender = make(defenderSide);
  const overrides = {
    ...getPhnnMoveOverrides(format, moveName, attacker.ivs as unknown as Record<string, number>),
    ...(options.basePower ? { basePower: options.basePower } : {}),
  };
  const move = new Move(gen, moveName, {
    isCrit: !!options.crit,
    hits: options.hits,
    timesUsed: options.timesUsed,
    ...(Object.keys(overrides).length ? { overrides: overrides as never } : {}),
  });
  const field = new Field({
    weather: options.weather as never,
    defenderSide: { isReflect: !!options.reflect, isLightScreen: !!options.lightScreen },
  });

  setPhnnCalcContext(format);

  const { result } = calculatePhnnMatchup(format, gen, attacker, defender, move, field);
  let damage = result.damage as number | number[] | number[][];

  if (Array.isArray(damage) && Array.isArray(damage[0])) {
    damage = (damage as number[][])[(damage as number[][]).length - 1];
  }

  return Array.isArray(damage)
    ? [(damage as number[])[0], (damage as number[])[(damage as number[]).length - 1]]
    : [damage, damage];
};

afterEach(() => {
  setPhnnCalcContext('');
});

describe('Calcdex SpaceWorld damage', () => {
  it('uses the demo crit rule: unboosted stats, doubled level', () => {
    expect(run(SW, { species: 'Snorlax' }, 'Body Slam', { species: 'Dragonite' }, { crit: true })).toEqual([196, 231]);
    expect(run(SW, { species: 'Snorlax', boosts: { atk: 2 } }, 'Body Slam', { species: 'Dragonite' }, { crit: true }))
      .toEqual([196, 231]);
    expect(run(SW, { species: 'Gengar' }, 'Thunderbolt', { species: 'Starmie' }, { crit: true })).toEqual([354, 416]);
  });

  it('ignores the defender\'s SpD stages', () => {
    expect(run(SW, { species: 'Starmie' }, 'Surf', { species: 'Snorlax', boosts: { spd: 2 } })).toEqual([102, 121]);
  });

  it('keeps Atk and Def stages on the demo table', () => {
    expect(run(SW, { species: 'Snorlax', boosts: { atk: 2 } }, 'Body Slam', { species: 'Dragonite' })).toEqual([202, 238]);
    expect(run(SW, { species: 'Snorlax', boosts: { atk: 6 } }, 'Body Slam', { species: 'Dragonite' })).toEqual([316, 372]);
    expect(run(SW, { species: 'Snorlax' }, 'Body Slam', { species: 'Dragonite', boosts: { def: -2 } })).toEqual([201, 237]);
  });

  it('doubles physical Defense under either screen and ignores them on a crit', () => {
    expect(run(SW, { species: 'Snorlax' }, 'Body Slam', { species: 'Starmie' }, { reflect: true })).toEqual([56, 66]);
    expect(run(SW, { species: 'Snorlax' }, 'Body Slam', { species: 'Starmie' }, { lightScreen: true })).toEqual([56, 66]);
    expect(run(SW, { species: 'Starmie' }, 'Surf', { species: 'Snorlax' }, { lightScreen: true })).toEqual([102, 121]);
    expect(run(SW, { species: 'Snorlax' }, 'Body Slam', { species: 'Starmie' }, { reflect: true, crit: true }))
      .toEqual([211, 249]);
  });

  it('runs Present through the normal formula at 40, 80 or 120 power', () => {
    expect(getPhnnMoveOverrides(SW, 'Present').basePower).toBe(40);
    expect(run(SW, { species: 'Delibird' }, 'Present', { species: 'Snorlax' })).toEqual([26, 31]);
    expect(run(SW, { species: 'Delibird' }, 'Present', { species: 'Snorlax' }, { basePower: 80 })).toEqual([51, 60]);
    expect(run(SW, { species: 'Delibird' }, 'Present', { species: 'Snorlax' }, { basePower: 120 })).toEqual([75, 89]);
  });

  it('gives Hidden Power the ??? type and the demo DV power', () => {
    expect(getPhnnSw97HiddenPower()).toBe(78);
    expect(getPhnnMoveOverrides(SW, 'Hidden Power Fire', {
 atk: 31, def: 31, spa: 31, spd: 31, spe: 31,
}))
      .toMatchObject({ type: '???', category: 'Physical', basePower: 78 });
    expect(run(SW, { species: 'Snorlax' }, 'Hidden Power', { species: 'Gengar' })).toEqual([82, 97]);
    expect(run(SW, {
      species: 'Snorlax',
      ivs: {
        hp: 31, atk: 0, def: 20, spa: 30, spd: 30, spe: 12,
      },
    }, 'Hidden Power', { species: 'Gengar' })).toEqual([28, 33]);
  });

  it('applies rain and sun as x2 / x0.5 before STAB', () => {
    expect(run(SW, { species: 'Starmie' }, 'Surf', { species: 'Snorlax' }, { weather: 'Rain' })).toEqual([206, 243]);
    expect(run(SW, { species: 'Starmie' }, 'Surf', { species: 'Snorlax' }, { weather: 'Sun' })).toEqual([51, 60]);
  });

  it('multiplies Triple Kick and doubles Fury Cutter and Rollout like the engine', () => {
    expect(run(SW, { species: 'Hitmonlee' }, 'Triple Kick', { species: 'Snorlax' }, { hits: 3 })).toEqual([582, 684]);
    expect(run(SW, { species: 'Scyther' }, 'Fury Cutter', { species: 'Snorlax' }, { timesUsed: 3 })).toEqual([156, 184]);
    expect(run(SW, { species: 'Golem' }, 'Rollout', { species: 'Charizard' }, { timesUsed: 4 })).toEqual([1334, 1568]);
  });

  it('keeps burn, Explosion and type-boost items as before', () => {
    expect(run(SW, { species: 'Snorlax', status: 'brn' }, 'Body Slam', { species: 'Dragonite' })).toEqual([51, 60]);
    expect(run(SW, { species: 'Gengar' }, 'Explosion', { species: 'Snorlax' })).toEqual([359, 422]);
    expect(run(SW, { species: 'Snorlax', item: 'Sharp Fang' }, 'Body Slam', { species: 'Dragonite' })).toEqual([122, 144]);
  });

  it('leaves stock Gen 2 on the Gen 2 formula', () => {
    expect(run('gen2ou', { species: 'Snorlax', boosts: { atk: 2 } }, 'Body Slam', { species: 'Dragonite' }, { crit: true }))
      .not.toEqual([196, 231]);
    expect(run('gen2ou', { species: 'Starmie' }, 'Surf', { species: 'Snorlax', boosts: { spd: 2 } }))
      .not.toEqual([102, 121]);
  });
});

describe('SpaceWorld screens live on the Pokemon', () => {
  const player = (volatiles: Record<string, unknown>, conditions: Record<string, unknown> = {}) => ({
    selectionIndex: 0,
    pokemon: [{ volatiles, active: true }],
    side: { conditions },
  }) as never;

  it('reads Reflect and Light Screen volatiles in SpaceWorld', () => {
    expect(hasPhnnPokemonScreens(2, SW)).toBe(true);
    expect(sanitizePlayerSide(2, player({ reflect: ['reflect'] }), undefined, SW).isReflect).toBe(true);
    expect(sanitizePlayerSide(2, player({ lightscreen: ['lightscreen'] }), undefined, SW).isLightScreen).toBe(true);
  });

  it('keeps side conditions for stock Gen 2 and volatiles for Gen 1', () => {
    expect(hasPhnnPokemonScreens(2, 'gen2ou')).toBe(false);
    expect(sanitizePlayerSide(2, player({ reflect: ['reflect'] }), undefined, 'gen2ou').isReflect).toBe(false);
    expect(sanitizePlayerSide(2, player({}, { reflect: ['reflect', 1] }), undefined, 'gen2ou').isReflect).toBe(true);
    expect(sanitizePlayerSide(1, player({ reflect: ['reflect'] })).isReflect).toBe(true);
  });
});

describe('Calcdex SpaceWorld review fixes', () => {
  it('keeps the SW item boost and BP overrides on Triple Kick', () => {
    expect(run(SW_ITEMS, { species: 'Hitmonlee' }, 'Triple Kick', { species: 'Snorlax' }, { hits: 1 })).toEqual([194, 228]);
    expect(run(SW_ITEMS, { species: 'Hitmonlee', item: 'Power Bracer SW' }, 'Triple Kick', { species: 'Snorlax' }, { hits: 1 }))
      .toEqual([231, 272]);
    expect(run(SW_ITEMS, { species: 'Hitmonlee', item: 'Power Bracer SW' }, 'Triple Kick', { species: 'Snorlax' }, { hits: 3 }))
      .toEqual([696, 818]);
    expect(run(SW_ITEMS, { species: 'Hitmonlee' }, 'Triple Kick', { species: 'Snorlax' }, { hits: 1, basePower: 100 }))
      .toEqual([318, 374]);
  });

  it('applies the Gen 2 type items as x1.1 damage before the 997 cap', () => {
    expect(run(SW_ITEMS, { species: 'Charizard' }, 'Flamethrower', { species: 'Snorlax' })).toEqual([102, 121]);
    expect(run(SW_ITEMS, { species: 'Charizard', item: 'Charcoal' }, 'Flamethrower', { species: 'Snorlax' })).toEqual([112, 132]);
    expect(run(SW_ITEMS, { species: 'Dragonite', item: 'Dragon Scale' }, 'Outrage', { species: 'Snorlax' })).toEqual([97, 115]);
    expect(run(SW_ITEMS, { species: 'Dragonite', item: 'Charcoal' }, 'Outrage', { species: 'Snorlax' })).toEqual([97, 115]);
  });

  it('caps unboosted stats at 999 like the engine', () => {
    expect(run(SW_ITEMS, { species: 'Snorlax', level: 500 }, 'Body Slam', { species: 'Dragonite', level: 500 }, { crit: true }))
      .toEqual([873, 1027]);
    expect(run(SW_ITEMS, { species: 'Starmie', level: 500 }, 'Surf', { species: 'Snorlax', level: 500 })).toEqual([491, 577]);
    expect(run(SW_ITEMS, { species: 'Starmie', level: 500 }, 'Surf', { species: 'Snorlax', level: 500 }, { crit: true }))
      .toEqual([976, 1147]);
  });
});

describe('SpaceWorld Fury Cutter and Rollout streaks from the battle log', () => {
  const log = [
    '|split|p1',
    '|switch|p1a: Scyther|Scyther, M|343/343',
    '|switch|p1a: Scyther|Scyther, M|100/100',
    '|split|p2',
    '|switch|p2a: Snorlax|Snorlax, F|523/523',
    '|switch|p2a: Snorlax|Snorlax, F|100/100',
    '|turn|1',
    '|move|p1a: Scyther|Fury Cutter|p2a: Snorlax',
    '|split|p2',
    '|-damage|p2a: Snorlax|478/523',
    '|-damage|p2a: Snorlax|92/100',
    '|move|p2a: Snorlax|Amnesia|p2a: Snorlax',
    '|-boost|p2a: Snorlax|spd|2',
    '|upkeep',
    '|turn|2',
    '|move|p1a: Scyther|Fury Cutter|p2a: Snorlax',
    '|split|p2',
    '|-damage|p2a: Snorlax|399/523',
    '|-damage|p2a: Snorlax|77/100',
    '|move|p2a: Snorlax|Amnesia|p2a: Snorlax',
    '|-boost|p2a: Snorlax|spd|2',
    '|upkeep',
    '|turn|3',
    '|move|p1a: Scyther|Fury Cutter|p2a: Snorlax',
    '|split|p2',
    '|-damage|p2a: Snorlax|234/523',
    '|-damage|p2a: Snorlax|45/100',
    '|move|p2a: Snorlax|Amnesia|p2a: Snorlax',
    '|-boost|p2a: Snorlax|spd|2',
    '|upkeep',
    '|turn|4',
    '|move|p1a: Scyther|Swords Dance|p1a: Scyther',
    '|-boost|p1a: Scyther|atk|2',
    '|move|p2a: Snorlax|Amnesia|p2a: Snorlax',
    '|-boost|p2a: Snorlax|spd|0',
    '|upkeep',
    '|turn|5',
    '|split|p1',
    '|switch|p1a: Golem|Golem, F|363/363',
    '|switch|p1a: Golem|Golem, F|100/100',
    '|move|p2a: Snorlax|Amnesia|p2a: Snorlax',
    '|-boost|p2a: Snorlax|spd|0',
    '|upkeep',
    '|turn|6',
    '|move|p1a: Golem|Rollout|p2a: Snorlax',
    '|split|p2',
    '|-damage|p2a: Snorlax|185/523',
    '|-damage|p2a: Snorlax|36/100',
    '|move|p2a: Snorlax|Amnesia|p2a: Snorlax',
    '|-boost|p2a: Snorlax|spd|0',
    '|upkeep',
    '|turn|7',
    '|move|p1a: Golem|Rollout|p2a: Snorlax|[miss]',
    '|-miss|p1a: Golem',
    '|move|p2a: Snorlax|Amnesia|p2a: Snorlax',
    '|-boost|p2a: Snorlax|spd|0',
    '|upkeep',
    '|turn|8',
  ];
  const upTo = (turn: number) => log.slice(0, log.indexOf(`|turn|${turn}`) + 1);

  it('counts consecutive hits for the next use', () => {
    expect(getPhnnSwStreaks(upTo(2), 'p1', 'Scyther').furyCutter).toBe(2);
    expect(getPhnnSwStreaks(upTo(4), 'p1', 'Scyther').furyCutter).toBe(4);
    expect(getPhnnSwStreaks(upTo(5), 'p1', 'Scyther').furyCutter).toBe(1);
    expect(getPhnnSwStreaks(upTo(7), 'p1', 'Golem').rollout).toBe(2);
    expect(getPhnnSwStreaks(upTo(8), 'p1', 'Golem').rollout).toBe(1);
    expect(getPhnnSwStreaks(upTo(4), 'p2', 'Snorlax')).toEqual({ furyCutter: 1, rollout: 1 });
  });

  it('keeps the streak through a turn lost to sleep and drops it on a switch', () => {
    const base = upTo(3);

    expect(getPhnnSwStreaks([...base, '|cant|p1a: Scyther|slp', '|upkeep', '|turn|4'], 'p1', 'Scyther').furyCutter).toBe(3);
    expect(getPhnnSwStreaks([...base, '|cant|p1a: Scyther|par', '|upkeep', '|turn|4'], 'p1', 'Scyther').furyCutter).toBe(1);
    expect(getPhnnSwStreaks([...base, '|switch|p1a: Golem|Golem, F|363/363', '|upkeep', '|turn|4'], 'p1', 'Scyther').furyCutter)
      .toBe(1);
  });

  it('feeds the streak into the damage as timesUsed', () => {
    const streaks = getPhnnSwStreaks(upTo(4), 'p1', 'Scyther');

    expect(getPhnnSwTimesUsed(streaks, 'Fury Cutter')).toBe(4);
    expect(getPhnnSwTimesUsed(streaks, 'Slash')).toBe(0);
    expect(run(SW, { species: 'Scyther' }, 'Fury Cutter', { species: 'Snorlax' }, {
      timesUsed: getPhnnSwTimesUsed(streaks, 'Fury Cutter'),
    })).toEqual([313, 368]);
  });
});
