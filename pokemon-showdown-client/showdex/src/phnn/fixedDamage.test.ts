import {
  type GenerationNum,
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
  detectPhnnKey,
  getPhnnBaseStats,
  getPhnnIgnoreImmunity,
  getPhnnMoveOverrides,
  setPhnnCalcContext,
} from '@showdex/phnn';
import {
  calculatePhnnMatchup,
  getPhnnHalfHpDamage,
  getPhnnHalfHpKoChance,
  getPhnnHpRange,
  getPhnnPsywaveDamage,
  getPhnnSw97FlailPower,
  isPhnnDisguiseKnownDamage,
  toPhnnRolls,
} from '@showdex/phnn/fixedDamage';
import { formatMatchupNhko } from '@showdex/utils/calc/formatMatchupNhko';
import { getMatchupRange } from '@showdex/utils/calc/getMatchupRange';

interface Side {
  species: string;
  level?: number;
  ability?: string;
  curHP?: number;
  evs?: number;
  isDynamaxed?: boolean;
  shown?: number;
  item?: string;
}

const run = (
  format: string,
  genNum: GenerationNum,
  attackerSide: Side,
  moveName: string,
  defenderSide: Side,
) => {
  const stock = Generations.get(genNum || 9);
  const gen = genNum ? stock : Object.assign(Object.create(Object.getPrototypeOf(stock) as object) as typeof stock, stock, { num: 0 });
  const make = (side: Side) => {
    const baseStats = getPhnnBaseStats(format, side.species);
    const evs = typeof side.evs === 'number' ? side.evs : undefined;

    return new Pokemon(gen, side.species, {
      level: side.level || 100,
      ability: side.ability,
      curHP: side.curHP,
      isDynamaxed: side.isDynamaxed,
      item: side.item as never,
      ...(evs === undefined ? {} : {
        evs: {
          hp: evs, atk: evs, def: evs, spa: evs, spd: evs, spe: evs,
        },
      }),
      ...(baseStats ? { overrides: { baseStats } as never } : {}),
    });
  };
  const attacker = make(attackerSide);
  const defender = make(defenderSide);
  const rangeFor = (side: Side, pokemon: Pokemon) => (
    typeof side.shown === 'number'
      ? getPhnnHpRange(format, { hp: side.shown, maxhp: 100, source: 'client' }, pokemon.maxHP(true))
      : null
  );
  const overrides = getPhnnMoveOverrides(format, moveName);
  const move = new Move(gen, moveName, Object.keys(overrides).length ? { overrides: overrides as never } : undefined);

  setPhnnCalcContext(format);

  const { result, outcome } = calculatePhnnMatchup(
    format,
    gen,
    attacker,
    defender,
    move,
    new Field(),
    undefined,
    { attacker: rangeFor(attackerSide, attacker), defender: rangeFor(defenderSide, defender) },
  );
  const rolls = [result.damage].flat(Infinity as 1) as number[];

  return {
    result,
    outcome,
    rolls,
    connects: outcome === 'calc' && rolls.some((n) => n > 0),
  };
};

afterEach(() => {
  setPhnnCalcContext('');
});

describe('getPhnnIgnoreImmunity', () => {
  it('reads the SpaceWorld mod flags', () => {
    ['superfang', 'seismictoss', 'nightshade', 'sonicboom', 'dragonrage', 'psywave', 'flail', 'reversal', 'counter', 'bide']
      .forEach((move) => expect(getPhnnIgnoreImmunity('gen2spaceworldou', move)).toBeTruthy());
  });

  it('keeps the No Nerfs Super Fang flag scoped to Normal', () => {
    expect(getPhnnIgnoreImmunity('gen9nonerfsstandard', 'Super Fang')).toEqual({ Normal: true });
    expect(getPhnnIgnoreImmunity('gen9nonerfsstandard', 'Seismic Toss')).toBe(true);
    expect(getPhnnIgnoreImmunity('gen9nonerfsstandard', 'Dragon Rage')).toBeNull();
    expect(getPhnnIgnoreImmunity('gen9nonerfsstandard', 'Psywave')).toBeNull();
  });

  it('gives Gen 1 its inherent fixed-damage bypass and nothing for Wrap', () => {
    expect(getPhnnIgnoreImmunity('gen1ou', 'Super Fang')).toBe(true);
    expect(getPhnnIgnoreImmunity('gen1ou', 'Seismic Toss')).toBe(true);
    expect(getPhnnIgnoreImmunity('gen1ou', 'Wrap')).toBeNull();
  });

  it('lets Bide hit a Ghost exactly where the server does', () => {
    ['gen4purehackmons', 'gen4255purehackmons', 'gen4disguises', 'gen2spaceworldou', 'gen9nonerfsstandard', 'gen1purehackmons']
      .forEach((format) => expect(getPhnnIgnoreImmunity(format, 'Bide')).toBe(true));
    ['gen2purehackmons', 'gen3purehackmons', 'gen5purehackmons', 'gen6purehackmons', 'gen7purehackmons', 'gen8purehackmons', 'gen9purehackmons']
      .forEach((format) => expect(getPhnnIgnoreImmunity(format, 'Bide')).toBeNull());
  });

  it('respects immunity where the server does', () => {
    ['gen2ou', 'gen3bhaaa', 'gen5purehackmonsnonerfs', 'gen9championspurehackmons', 'gen8ou'].forEach((format) => {
      ['Super Fang', 'Seismic Toss', 'Night Shade', 'Sonic Boom', 'Bide'].forEach((move) => {
        expect(getPhnnIgnoreImmunity(format, move)).toBeNull();
      });
    });
  });
});

describe('getPhnnMoveOverrides', () => {
  it('no longer forces fixed-damage moves typeless', () => {
    ['gen9nonerfsstandard', 'gen2ou', 'gen2spaceworldou', 'gen1ou'].forEach((format) => {
      ['Seismic Toss', 'Night Shade', 'Sonic Boom', 'Counter', 'Bide'].forEach((move) => {
        expect(getPhnnMoveOverrides(format, move).type).toBeUndefined();
      });
    });
  });

  it('makes SpaceWorld Flail and Reversal typeless', () => {
    expect(getPhnnMoveOverrides('gen2spaceworldou', 'Flail').type).toBe('???');
    expect(getPhnnMoveOverrides('gen2spaceworldou', 'Reversal').type).toBe('???');
    expect(getPhnnMoveOverrides('gen2ou', 'Flail').type).toBeUndefined();
  });
});

describe('detectPhnnKey', () => {
  it('routes Custom Disguises formats by the mod they run on', () => {
    expect(detectPhnnKey('gen9nonerfscustomdisguises')).toBe('gen9phnn');
    expect(detectPhnnKey('gen9championscustomdisguises')).toBe('champions');
    expect(detectPhnnKey('gen2spaceworldcustomdisguises')).toBe('spaceworld');
    expect(detectPhnnKey('gen1customdisguises')).toBe('gen1');
    expect(detectPhnnKey('gen8customdisguises')).toBe('gen8');
    expect(detectPhnnKey('gen9customdisguises')).toBeNull();
    expect(detectPhnnKey('gen1255purehackmons')).toBe('gen1');
    expect(detectPhnnKey('gen6255purehackmons')).toBe('gen6');
    expect(detectPhnnKey('gen8255purehackmonsunified')).toBe('gen8unified');
    expect(detectPhnnKey('gen9255purehackmons')).toBeNull();
  });
});

describe('getPhnnPsywaveDamage', () => {
  const span = (values: number[]) => [values[0], values[values.length - 1], values.length];

  it('matches each mod', () => {
    expect(span(getPhnnPsywaveDamage('gen2spaceworldou', 2, 100))).toEqual([1, 149, 149]);
    expect(span(getPhnnPsywaveDamage('gen2spaceworldou', 2, 255))).toEqual([1, 125, 125]);
    expect(getPhnnPsywaveDamage('gen2spaceworldou', 2, 1)).toEqual([]);
    expect(getPhnnPsywaveDamage('gen2spaceworldou', 2, 171)).toEqual([]);
    expect(span(getPhnnPsywaveDamage('gen1ou', 1, 100))).toEqual([1, 149, 149]);
    expect(getPhnnPsywaveDamage('gen1ou', 1, 171)).toEqual([]);
    expect(span(getPhnnPsywaveDamage('gen2ou', 2, 37))).toEqual([1, 54, 54]);
    expect(span(getPhnnPsywaveDamage('gen2ou', 2, 171))).toEqual([1, 255, 255]);
    expect(getPhnnPsywaveDamage('gen2ou', 2, 1)).toEqual([1]);
    expect(span(getPhnnPsywaveDamage('gen9nonerfsstandard', 9, 100))).toEqual([100, 150, 51]);
    expect(span(getPhnnPsywaveDamage('gen9nonerfsstandard', 9, 37))).toEqual([37, 55, 19]);
    expect(span(getPhnnPsywaveDamage('gen9ou', 9, 37))).toEqual([18, 55, 101]);
    expect(span(getPhnnPsywaveDamage('gen3ou', 3, 1))).toEqual([1, 1, 101]);
  });

  it('pads short ranges without changing the distribution', () => {
    const rolls = toPhnnRolls([1, 2, 3]);

    expect(rolls).toHaveLength(18);
    expect(rolls.filter((n) => n === 2)).toHaveLength(6);
  });
});

describe('getPhnnHalfHpDamage', () => {
  it('halves current HP, at least 1, and Parental Bond halves what is left', () => {
    expect(getPhnnHalfHpDamage(461)).toBe(230);
    expect(getPhnnHalfHpDamage(1)).toBe(1);
    expect(getPhnnHalfHpDamage(461, true)).toEqual([230, 115]);
    expect(getPhnnHalfHpDamage(261, true)).toEqual([130, 65]);
    expect(getPhnnHalfHpDamage(3, true)).toEqual([1, 1]);
    expect(getPhnnHalfHpDamage(2, true)).toEqual([1, 1]);
    expect(getPhnnHalfHpDamage(1, true)).toBe(1);
  });

  it('only ever claims a KO when the HP is already that low', () => {
    expect(getPhnnHalfHpKoChance(230, 461).n).toBe(0);
    expect(getPhnnHalfHpKoChance([1, 1], 3).n).toBe(0);
    expect(getPhnnHalfHpKoChance([1, 1], 2)).toEqual({ chance: 1, n: 1, text: 'guaranteed OHKO' });
    expect(getPhnnHalfHpKoChance(1, 1).n).toBe(1);
  });
});

describe('calculatePhnnMatchup', () => {
  const raticate = { species: 'Raticate' };

  it('SpaceWorld: every fixed-damage move hits through immunity', () => {
    const fang = run('gen2spaceworldou', 2, raticate, 'Super Fang', { species: 'Gengar' });

    expect(fang.connects).toBe(true);
    expect(fang.rolls).toEqual([Math.floor(fang.result.defender.maxHP() / 2)]);
    expect(formatMatchupNhko(fang.result)).toBeNull();
    expect(fang.result.desc()).not.toContain('HKO');

    expect(run('gen2spaceworldou', 2, raticate, 'Seismic Toss', { species: 'Gengar' }).rolls).toEqual([100]);
    expect(run('gen2spaceworldou', 2, raticate, 'Night Shade', { species: 'Snorlax' }).rolls).toEqual([100]);
    expect(run('gen2spaceworldou', 2, raticate, 'Sonic Boom', { species: 'Gengar' }).rolls).toEqual([20]);
    expect(run('gen2spaceworldou', 2, raticate, 'Dragon Rage', { species: 'Clefable' }).rolls).toEqual([40]);

    const psywave = run('gen2spaceworldou', 2, raticate, 'Psywave', { species: 'Umbreon' });

    expect(psywave.connects).toBe(true);
    expect([Math.min(...psywave.rolls), Math.max(...psywave.rolls)]).toEqual([1, 149]);
    expect(getMatchupRange(psywave.result)).toMatch(/^0\.\d+ - \d+\.\d+%$/);
  });

  it('SpaceWorld: Flail is fixed-power with no STAB, type effectiveness or variance', () => {
    const lowHp = { species: 'Raticate', curHP: 5 };
    const intoGhost = run('gen2spaceworldou', 2, lowHp, 'Flail', { species: 'Gengar' });
    const intoRock = run('gen2spaceworldou', 2, lowHp, 'Flail', { species: 'Golem' });
    const plain = run('gen2ou', 2, lowHp, 'Flail', { species: 'Golem' });

    expect(intoGhost.connects).toBe(true);
    expect(intoGhost.rolls).toHaveLength(1);
    expect(intoRock.rolls).toHaveLength(1);
    expect(intoRock.rolls[0]).toBeGreaterThan(plain.rolls[0]);
  });

  it('SpaceWorld: Flail and Reversal use the demo power formula above 255 max HP', () => {
    expect([215, 65, 13].map((hp) => getPhnnSw97FlailPower(hp, 313))).toEqual([20, 80, 150]);
    expect(getPhnnSw97FlailPower(10, 313)).toBe(200);
    expect(getPhnnSw97FlailPower(100, 200)).toBe(40);

    const expected: Record<number, number[]> = {
      215: [22, 14, 21],
      65: [82, 51, 78],
      13: [153, 94, 145],
    };

    Object.entries(expected).forEach(([hp, damages]) => {
      ['Flail', 'Reversal'].forEach((move) => {
        const rolls = ['Gengar', 'Golem', 'Snorlax'].map((species) => run(
          'gen2spaceworldou',
          2,
          { species: 'Raticate', curHP: Number(hp) },
          move,
          { species },
        ));

        expect(rolls[0].result.attacker.maxHP()).toBe(313);
        expect(rolls.map((r) => r.rolls[0])).toEqual(damages);
      });
    });

    const plain = run('gen2ou', 2, { species: 'Raticate', curHP: 215 }, 'Flail', { species: 'Snorlax' });

    expect(plain.result.rawDesc.moveBP).toBe(40);
  });

  it('Endeavor brings the target down to the user\'s HP, and is immune otherwise', () => {
    ['gen9nonerfsstandard', 'gen3bhaaa', 'gen5purehackmonsnonerfs', 'gen9purehackmons'].forEach((format) => {
      const endeavor = run(format, 9, { species: 'Raticate', curHP: 50 }, 'Endeavor', { species: 'Snorlax' });

      expect(endeavor.outcome).toBe('calc');
      expect(endeavor.rolls).toEqual([endeavor.result.defender.maxHP() - 50]);
    });

    expect(run('gen9nonerfsstandard', 9, { species: 'Raticate', curHP: 300 }, 'Endeavor', { species: 'Snorlax', curHP: 200 }).outcome).toBe('immune');
    expect(run('gen9nonerfsstandard', 9, { species: 'Raticate', curHP: 50 }, 'Endeavor', { species: 'Gengar' }).outcome).toBe('immune');
    expect(run('gen9nonerfsstandard', 9, { species: 'Raticate', curHP: 50, ability: 'Scrappy' }, 'Endeavor', { species: 'Gengar' }).rolls)
      .toEqual([run('gen9nonerfsstandard', 9, raticate, 'Tackle', { species: 'Gengar' }).result.defender.maxHP() - 50]);
  });

  it('reactive moves read ??? instead of a made-up roll', () => {
    expect(run('gen1ou', 1, raticate, 'Counter', { species: 'Clefable' }).outcome).toBe('unknown');
    expect(run('gen1ou', 1, raticate, 'Counter', { species: 'Gengar' }).outcome).toBe('unknown');
    expect(run('gen2ou', 2, raticate, 'Mirror Coat', { species: 'Snorlax' }).outcome).toBe('unknown');
  });

  it('Bide reads ??? where its release hits a Ghost and IMMUNE where it does not', () => {
    const bide = (format: string, genNum: GenerationNum) => run(format, genNum, raticate, 'Bide', { species: 'Gengar' }).outcome;

    expect(bide('gen1purehackmons', 1)).toBe('unknown');
    expect(bide('gen2spaceworldou', 2)).toBe('unknown');
    expect(bide('gen4purehackmons', 4)).toBe('unknown');
    expect(bide('gen9nonerfsstandard', 9)).toBe('unknown');
    expect(bide('gen2purehackmons', 2)).toBe('immune');
    expect(bide('gen3purehackmons', 3)).toBe('immune');
    expect(bide('gen5purehackmons', 5)).toBe('immune');
    expect(bide('gen8purehackmons', 8)).toBe('immune');
    expect(bide('gen9purehackmons', 9)).toBe('immune');
    expect(run('gen4purehackmons', 4, raticate, 'Bide', { species: 'Snorlax' }).outcome).toBe('unknown');
  });

  it('SpaceWorld trapping moves hit Ghosts and deal no end-of-turn damage', () => {
    ['Wrap', 'Bind'].forEach((move) => {
      const ghost = run('gen2spaceworldou', 2, { species: 'Raticate', evs: 0 }, move, { species: 'Gengar', evs: 0 });

      expect(ghost.connects).toBe(true);
      expect([Math.min(...ghost.rolls), Math.max(...ghost.rolls)]).toEqual([22, 27]);
      expect(run('gen2ou', 2, raticate, move, { species: 'Gengar' }).outcome).toBe('immune');
    });
    ['Wrap', 'Bind', 'Clamp', 'Fire Spin'].forEach((move) => {
      const sw = run('gen2spaceworldou', 2, raticate, move, { species: 'Snorlax', curHP: 40 });

      expect(sw.result.desc()).not.toContain('trapping');
      expect(sw.result.kochance().text).toMatch(/HKO$/);
      expect(run('gen2ou', 2, raticate, move, { species: 'Snorlax', curHP: 40 }).result.desc()).toContain('after trapping damage');
    });
  });

  it('Gen 2 respects the immunities SpaceWorld ignores', () => {
    expect(run('gen2ou', 2, raticate, 'Super Fang', { species: 'Gengar' }).outcome).toBe('immune');
    expect(run('gen2ou', 2, raticate, 'Seismic Toss', { species: 'Gengar' }).outcome).toBe('immune');
    expect(run('gen2ou', 2, raticate, 'Psywave', { species: 'Umbreon' }).outcome).toBe('immune');
    expect(run('gen2ou', 2, raticate, 'Super Fang', { species: 'Snorlax', curHP: 101 }).rolls).toEqual([50]);
  });

  it('Gen 1: Super Fang ignores immunity, Wrap still does nothing to a Ghost', () => {
    const fang = run('gen1ou', 1, raticate, 'Super Fang', { species: 'Gengar' });

    expect(fang.connects).toBe(true);
    expect(fang.rolls).toEqual([Math.floor(fang.result.defender.maxHP() / 2)]);
    expect(run('gen1ou', 1, raticate, 'Wrap', { species: 'Gengar' }).outcome).toBe('immune');
  });

  it('No Nerfs: the server flags, Parental Bond and the Normal-only Super Fang bypass', () => {
    const fang = run('gen9nonerfsstandard', 9, raticate, 'Super Fang', { species: 'Gengar' });

    expect(fang.rolls).toEqual([Math.floor(fang.result.defender.maxHP() / 2)]);

    const bond = run('gen9nonerfsstandard', 9, { species: 'Raticate', ability: 'Parental Bond' }, 'Super Fang', { species: 'Snorlax' });
    const hp = bond.result.defender.maxHP();
    const first = Math.floor(hp / 2);

    expect(bond.rolls).toEqual([first, Math.floor((hp - first) / 2)]);
    expect(bond.result.desc()).toContain('Parental Bond');
    expect(formatMatchupNhko(bond.result)).toBeNull();

    expect(run('gen9nonerfsstandard', 9, { species: 'Raticate', ability: 'Galvanize' }, 'Super Fang', { species: 'Garchomp' }).outcome).toBe('immune');
    expect(run('gen9nonerfsstandard', 9, raticate, 'Seismic Toss', { species: 'Gengar' }).rolls).toEqual([100]);
    expect(run('gen9nonerfsstandard', 9, { species: 'Raticate', ability: 'Parental Bond' }, 'Seismic Toss', { species: 'Gengar' }).rolls).toEqual([100, 100]);
    expect(run('gen9nonerfsstandard', 9, raticate, 'Seismic Toss', { species: 'Shedinja', ability: 'Wonder Guard' }).outcome).toBe('immune');
    expect(run('gen9nonerfsstandard', 9, raticate, 'Psywave', { species: 'Umbreon' }).outcome).toBe('immune');
    expect(run('gen9nonerfsstandard', 9, raticate, 'Counter', { species: 'Gengar' }).outcome).toBe('unknown');

    const psywave = run('gen9nonerfsstandard', 9, raticate, 'Psywave', { species: 'Snorlax' });

    expect([Math.min(...psywave.rolls), Math.max(...psywave.rolls)]).toEqual([100, 150]);
  });

  it('standard Gen 9: Super Fang is immune to Ghosts and never claims a false KO', () => {
    expect(run('gen9ou', 9, raticate, 'Super Fang', { species: 'Gengar' }).outcome).toBe('immune');
    expect(run('gen9ou', 9, raticate, 'Counter', { species: 'Gengar' }).outcome).toBe('immune');

    const fang = run('gen9ou', 9, raticate, 'Super Fang', { species: 'Snorlax' });

    expect(fang.rolls).toEqual([Math.floor(fang.result.defender.maxHP() / 2)]);
    expect(formatMatchupNhko(fang.result)).toBeNull();

    const finisher = run('gen9ou', 9, raticate, 'Super Fang', { species: 'Snorlax', curHP: 1 });

    expect(formatMatchupNhko(finisher.result)).toBe('1HKO');

    const ruination = run('gen9ou', 9, raticate, 'Ruination', { species: 'Snorlax' });

    expect(ruination.rolls).toEqual([Math.floor(ruination.result.defender.maxHP() / 2)]);
    expect(formatMatchupNhko(ruination.result)).toBeNull();

    const madness = run('gen9ou', 9, raticate, 'Nature\'s Madness', { species: 'Snorlax', curHP: 1 });

    expect(madness.rolls).toEqual([1]);
  });

  it('Psywave in standard gens rolls 50-150% of the level', () => {
    const psywave = run('gen9ou', 9, raticate, 'Psywave', { species: 'Snorlax' });

    expect([Math.min(...psywave.rolls), Math.max(...psywave.rolls)]).toEqual([50, 150]);
    expect(psywave.rolls).toHaveLength(101);
  });
});

describe('getPhnnHpRange', () => {
  it('inverts the server\'s HP report for each rounding rule', () => {
    expect(getPhnnHpRange('gen2spaceworldou', { hp: 11, maxhp: 100 }, 313)).toEqual([32, 34]);
    expect(getPhnnHpRange('gen2spaceworldou', { hp: 1, maxhp: 100 }, 523)).toEqual([1, 5]);
    expect(getPhnnHpRange('gen2spaceworldou', { hp: 99, maxhp: 100 }, 523)).toEqual([513, 522]);
    expect(getPhnnHpRange('gen2spaceworldou', { hp: 100, maxhp: 100 }, 523)).toEqual([523, 523]);
    expect(getPhnnHpRange('gen9championspurehackmons', { hp: 1, maxhp: 100 }, 170)).toEqual([1, 3]);
    expect(getPhnnHpRange('gen9championspurehackmons', { hp: 36, maxhp: 100 }, 235)).toEqual([85, 86]);
    expect(getPhnnHpRange('gen3ou', { hp: 24, maxhp: 48 }, 100)).toEqual([50, 52]);
    expect(getPhnnHpRange('gen2spaceworldou', { hp: 32, maxhp: 313, source: 'server' }, 313)).toBeNull();
    expect(getPhnnHpRange('gen2spaceworldou', { hp: 11, maxhp: 100, dirtyHp: 40 }, 313)).toBeNull();
  });

  it('agrees with the server\'s own rounding for every HP value', () => {
    [170, 235, 313, 461, 523, 1001].forEach((max) => {
      for (let hp = 1; hp <= max; hp++) {
        const ceil = Math.ceil((100 * hp) / max);
        const shown = ceil === 100 && hp < max ? 99 : ceil;
        const floored = Math.floor((100 * hp) / max) || 1;
        const [lo, hi] = getPhnnHpRange('gen2spaceworldou', { hp: shown, maxhp: 100 }, max);
        const [flo, fhi] = getPhnnHpRange('gen9championspurehackmons', { hp: floored, maxhp: 100 }, max);

        expect(hp >= lo && hp <= hi).toBe(true);
        expect(hp >= flo && hp <= fhi).toBe(true);
      }
    });
  });
});

describe('KO text and HP estimates', () => {
  const raticate = { species: 'Raticate' };

  it('SpaceWorld: an opponent\'s Flail covers every HP its health bar allows', () => {
    const flail = run('gen2spaceworldou', 2, { species: 'Raticate', shown: 11 }, 'Flail', { species: 'Snorlax' });

    expect([...new Set(flail.rolls)]).toEqual([97, 145]);
    expect(flail.result.desc()).not.toContain('BP');
    expect(flail.result.desc()).toContain('guaranteed 6HKO');

    expect(run('gen2spaceworldou', 2, { species: 'Raticate', curHP: 32 }, 'Flail', { species: 'Snorlax' }).rolls).toEqual([145]);
    expect(run('gen2spaceworldou', 2, { species: 'Raticate', curHP: 33 }, 'Flail', { species: 'Snorlax' }).rolls).toEqual([97]);
  });

  it('Super Fang into a percentage-only target shows every possible result and no unearned KO', () => {
    const sw = run('gen2spaceworldou', 2, raticate, 'Super Fang', { species: 'Snorlax', shown: 1 });

    expect([...new Set(sw.rolls)]).toEqual([1, 2]);
    expect(formatMatchupNhko(sw.result)).toBeNull();

    const champions = run('gen9championspurehackmons', 0 as GenerationNum, { species: 'Persian', level: 50 }, 'Super Fang', { species: 'Clefable', level: 50, shown: 1 });

    expect(champions.result.defender.maxHP()).toBe(170);
    expect([...new Set(champions.rolls)]).toEqual([1]);
    expect(formatMatchupNhko(champions.result)).toBeNull();
    expect(champions.result.desc()).not.toContain('HKO');

    const partial = run('gen9championspurehackmons', 0 as GenerationNum, { species: 'Persian', level: 50 }, 'Ruination', { species: 'Snorlax', level: 50, shown: 36 });

    expect(partial.result.defender.maxHP()).toBe(235);
    expect([...new Set(partial.rolls)]).toEqual([42, 43]);

    const bond = run('gen9nonerfsstandard', 9, { species: 'Raticate', ability: 'Parental Bond' }, 'Super Fang', { species: 'Snorlax', shown: 1 });

    expect(Math.min(...(bond.result.damage as number[][])[0])).toBe(1);
    expect(bond.result.desc()).not.toContain('HKO');
    expect(formatMatchupNhko(bond.result)).toBeNull();
    expect(formatMatchupNhko(run('gen9nonerfsstandard', 9, { species: 'Raticate', ability: 'Parental Bond' }, 'Super Fang', { species: 'Snorlax', curHP: 2 }).result)).toBe('1HKO');
  });

  it('Dynamax: halves the undynamaxed HP but only KOs the real HP', () => {
    const once = run('gen9nonerfsstandard', 9, raticate, 'Super Fang', { species: 'Snorlax', curHP: 1, isDynamaxed: true });

    expect(once.rolls).toEqual([1]);
    expect(formatMatchupNhko(once.result)).toBeNull();

    expect(run('gen9nonerfsstandard', 9, raticate, 'Super Fang', { species: 'Snorlax', curHP: 100, isDynamaxed: true }).rolls).toEqual([50]);

    const bond = run('gen9nonerfsstandard', 9, { species: 'Raticate', ability: 'Parental Bond' }, 'Super Fang', { species: 'Snorlax', curHP: 1, isDynamaxed: true });

    expect(bond.rolls).toEqual([1, 1]);
    expect(formatMatchupNhko(bond.result)).toBe('1HKO');
    expect(run('gen9nonerfsstandard', 9, { species: 'Raticate', ability: 'Parental Bond' }, 'Super Fang', { species: 'Snorlax', curHP: 2, isDynamaxed: true }).rolls).toEqual([1, 1]);
    expect(run('gen9nonerfsstandard', 9, { species: 'Raticate', ability: 'Parental Bond' }, 'Super Fang', { species: 'Snorlax', curHP: 100, isDynamaxed: true }).rolls).toEqual([50, 37]);
  });

  it('Endeavor never claims a KO, and Parental Bond is not credited', () => {
    ['gen9nonerfsstandard', 'gen3bhaaa', 'gen5purehackmonsnonerfs', 'gen9purehackmons'].forEach((format) => {
      const endeavor = run(format, 9, { species: 'Raticate', curHP: 50 }, 'Endeavor', { species: 'Snorlax' });

      expect(endeavor.rolls).toEqual([411]);
      expect(formatMatchupNhko(endeavor.result)).toBeNull();
      expect(endeavor.result.desc()).not.toContain('HKO');
    });

    const bond = run('gen9nonerfsstandard', 9, { species: 'Raticate', curHP: 50, ability: 'Parental Bond' }, 'Endeavor', { species: 'Snorlax' });

    expect(bond.rolls).toEqual([411]);
    expect(bond.result.desc()).not.toContain('Parental Bond');
    expect(formatMatchupNhko(bond.result)).toBeNull();

    const guess = run('gen9nonerfsstandard', 9, { species: 'Raticate', shown: 20 }, 'Endeavor', { species: 'Snorlax' });

    expect(guess.result.attacker.maxHP()).toBe(251);
    expect([...new Set(guess.rolls)]).toEqual([411, 412, 413]);
  });

  it('Final Gambit only ever claims a one-hit KO', () => {
    const gambit = run('gen9nonerfsstandard', 9, raticate, 'Final Gambit', { species: 'Snorlax' });

    expect(gambit.rolls).toEqual([251]);
    expect(formatMatchupNhko(gambit.result)).toBeNull();
    expect(gambit.result.desc()).not.toContain('HKO');

    expect(formatMatchupNhko(run('gen9nonerfsstandard', 9, raticate, 'Final Gambit', { species: 'Snorlax', curHP: 251 }).result)).toBe('1HKO');
    expect(formatMatchupNhko(run('gen9nonerfsstandard', 9, raticate, 'Final Gambit', { species: 'Snorlax', curHP: 252 }).result)).toBeNull();
  });

  it('Psywave has no base-power label', () => {
    expect(run('gen1ou', 1, raticate, 'Psywave', { species: 'Snorlax' }).result.desc()).not.toContain('BP');
    expect(run('gen2spaceworldou', 2, raticate, 'Psywave', { species: 'Snorlax' }).result.desc()).not.toContain('BP');
  });

  it('Super Fang has no base-power label', () => {
    const gengar = { species: 'Gengar' };
    const lv = { species: 'Raticate', level: 255 };

    expect(run('gen1ou', 1, raticate, 'Super Fang', gengar).result.desc()).toMatch(/^Raticate Super Fang vs\. Gengar: /);
    expect(run('gen1255purehackmons', 1, lv, 'Super Fang', { species: 'Gengar', level: 255 }).result.desc()).not.toContain('BP');
    expect(run('gen1disguises', 1, lv, 'Super Fang', { species: 'Snorlax', curHP: 300 }).result.desc()).not.toContain('BP');
    ['gen2ou', 'gen2spaceworldou'].forEach((format) => {
      expect(run(format, 2, raticate, 'Super Fang', { species: 'Snorlax' }).result.desc()).not.toContain('BP');
    });
    expect(run('gen9nonerfsstandard', 9, raticate, 'Super Fang', { species: 'Snorlax' }).result.desc()).not.toContain('BP');
  });
});

describe('server-specific modifiers', () => {
  const zero = {
    hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0,
  };
  const measure = (format: string, genNum: GenerationNum) => {
    const gen = Generations.get(genNum);

    setPhnnCalcContext(format);

    const snorlax = new Pokemon(gen, 'Snorlax', { ability: 'Immunity', evs: zero });
    const bond = calculatePhnnMatchup(format, gen, new Pokemon(gen, 'Kangaskhan-Mega', { ability: 'Parental Bond', evs: zero }), snorlax, new Move(gen, 'Return'), new Field()).result.damage as number[][];
    const crit = calculatePhnnMatchup(format, gen, new Pokemon(gen, 'Kangaskhan', { ability: 'Scrappy', evs: zero }), snorlax, new Move(gen, 'Storm Throw'), new Field()).result.damage as number[];

    return [bond[1][0], bond[1][15], crit[0], crit[15]];
  };

  it('Parental Bond and critical hits follow each format\'s server rules', () => {
    expect(measure('gen7ou', 7)).toEqual([46, 55, 178, 210]);
    expect(measure('gen8255purehackmonsunified', 8)).toEqual([46, 55, 178, 210]);
    expect(measure('gen9purehackmons', 9)).toEqual([46, 55, 178, 210]);
    expect(measure('gen9nonerfsstandard', 9)).toEqual([92, 110, 238, 280]);
  });

  it('Gen 1 at level 255 keeps the Gen 1 immunity bypass', () => {
    const lv = { species: 'Raticate', level: 255 };

    expect(run('gen1255purehackmons', 1, lv, 'Super Fang', { species: 'Gengar', level: 255 }).connects).toBe(true);
    expect(run('gen1255purehackmons', 1, lv, 'Seismic Toss', { species: 'Gengar', level: 255 }).rolls).toEqual([255]);
    expect(run('gen2255purehackmons', 2, lv, 'Super Fang', { species: 'Gengar', level: 255 }).outcome).toBe('immune');
  });
});

describe('SpaceWorld and Gen 2 damage formula details', () => {
  it('clamps base damage to at least 1 before adding 2', () => {
    const at = (format: string, level: number, move: string, foe: string) => run(format, 2, { species: 'Raticate', level, evs: 0 }, move, { species: foe, level, evs: 0 }).rolls;

    expect(at('gen2spaceworldou', 5, 'Flail', 'Cloyster')).toEqual([3]);
    expect(at('gen2spaceworldou', 10, 'Flail', 'Steelix')).toEqual([5]);
    expect(at('gen2spaceworldou', 5, 'Reversal', 'Cloyster')).toEqual([3]);
    expect(at('gen2ou', 5, 'Flail', 'Cloyster')).toEqual([4]);
    expect(at('gen2ou', 5, 'Reversal', 'Cloyster')).toEqual([6]);
  });

  it('SpaceWorld type-boost items raise base power and replace the Gen 2 item effects', () => {
    const fang = (curHP: number | undefined, foe: string) => run('gen2spaceworldou', 2, {
      species: 'Raticate', evs: 0, item: 'Sharp Fang', curHP,
    }, 'Flail', { species: foe, evs: 0 });

    expect(fang(120, 'Gengar').rolls).toEqual([53]);
    expect(fang(30, 'Gengar').rolls).toEqual([130]);
    expect(fang(undefined, 'Chansey').rolls).toEqual([90]);
    expect(fang(13, 'Steelix').rolls).toEqual([222]);
    expect(fang(13, 'Golem').rolls).toEqual([103]);
    expect(fang(120, 'Gengar').result.desc()).toContain('Sharp Fang');

    const club = run('gen2spaceworldou', 2, { species: 'Marowak', evs: 0, item: 'Thick Club' }, 'Earthquake', { species: 'Snorlax', evs: 0 }).rolls;
    const plain = run('gen2spaceworldou', 2, { species: 'Marowak', evs: 0 }, 'Earthquake', { species: 'Snorlax', evs: 0 }).rolls;
    const gen2 = run('gen2ou', 2, { species: 'Marowak', evs: 0, item: 'Thick Club' }, 'Earthquake', { species: 'Snorlax', evs: 0 }).rolls;

    expect([Math.min(...club), Math.max(...club)]).toEqual([154, 181]);
    expect([Math.min(...plain), Math.max(...plain)]).toEqual([128, 151]);
    expect([Math.min(...gen2), Math.max(...gen2)]).toEqual([255, 300]);
  });
});

describe('Disguises', () => {
  it('only opens up the moves whose damage a disguise cannot change', () => {
    expect(isPhnnDisguiseKnownDamage('gen2spaceworlddisguises', 'Seismic Toss', 'server')).toBe(true);
    expect(isPhnnDisguiseKnownDamage('gen2spaceworlddisguises', 'Super Fang', 'server')).toBe(true);
    expect(isPhnnDisguiseKnownDamage('gen1disguises', 'Psywave', 'server')).toBe(true);
    expect(isPhnnDisguiseKnownDamage('gen1disguisesenglish', 'Night Shade', 'server')).toBe(true);
    expect(isPhnnDisguiseKnownDamage('gen2spaceworlddisguises', 'Seismic Toss', 'client')).toBe(false);
    expect(isPhnnDisguiseKnownDamage('gen2spaceworlddisguises', 'Body Slam', 'server')).toBe(false);
    expect(isPhnnDisguiseKnownDamage('gen2spaceworlddisguises', 'Flail', 'server')).toBe(false);
    expect(isPhnnDisguiseKnownDamage('gen2spaceworldcustomdisguises', 'Seismic Toss', 'server')).toBe(false);
    expect(isPhnnDisguiseKnownDamage('gen9nonerfscustomdisguises', 'Seismic Toss', 'server')).toBe(false);
  });

  it('a disguised attacker\'s fixed damage matches the server whatever it is disguised as', () => {
    ['gen2spaceworlddisguises', 'gen1disguises'].forEach((format) => {
      const genNum = format.startsWith('gen1') ? 1 : 2;
      const disguised = { species: 'Snorlax', level: 77 };

      expect(run(format, genNum, disguised, 'Seismic Toss', { species: 'Gengar' }).rolls).toEqual([77]);
      expect(run(format, genNum, disguised, 'Super Fang', { species: 'Gengar', curHP: 201 }).rolls).toEqual([100]);
      expect(run(format, genNum, { species: 'Gengar', level: 200 }, 'Night Shade', { species: 'Snorlax' }).rolls).toEqual([200]);
      expect(run(format, genNum, disguised, 'Sonic Boom', { species: 'Gengar' }).rolls).toEqual([20]);
      expect(run(format, genNum, disguised, 'Dragon Rage', { species: 'Clefable' }).rolls).toEqual([40]);
    });
  });
});

describe('Tiny damage', () => {
  it('a real hit too small to round to 0.1% is not labelled N/A', () => {
    ['gen2spaceworlddisguises', 'gen1disguises'].forEach((format) => {
      const genNum = format.startsWith('gen1') ? 1 : 2;

      [1, 2, 3].forEach((curHP) => {
        const fang = run(format, genNum, { species: 'Raticate', level: 255 }, 'Super Fang', {
          species: 'Snorlax', level: 255, evs: 0, curHP,
        });

        expect(fang.result.defender.maxHP()).toBe(1157);
        expect(fang.rolls).toEqual([1]);
        expect(getMatchupRange(fang.result)).toBe('0.1 - 0.1%');
      });
    });
  });

  it('only lifts the bounds that are really above zero', () => {
    const fang = run('gen2spaceworldou', 2, { species: 'Raticate' }, 'Super Fang', { species: 'Snorlax', curHP: 101 });

    expect(getMatchupRange(fang.result)).toBe('9.5 - 9.5%');
    expect(getMatchupRange({ ...fang.result, desc: () => 'x: 0-3 (0 - 0%)', range: () => [0, 3] } as never)).toBe('0 - 0.1%');
    expect(getMatchupRange({ ...fang.result, desc: () => 'x: 1-5 (0 - 0.4%)', range: () => [1, 5] } as never)).toBe('0.1 - 0.4%');
    expect(getMatchupRange({ ...fang.result, desc: () => 'x: 0-0 (0 - 0%)', range: () => [0, 0] } as never)).toBe('N/A');
    expect(getMatchupRange({ ...fang.result, desc: () => 'x: 0-0 (0 - 0%)', range: undefined } as never)).toBe('N/A');
  });
});

describe('Badly poisoned KO text', () => {
  const ev = {
    hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0,
  };
  const tox = (format: string, move: string, foe: string, curHP?: number): string => {
    const gen = Generations.get(2);

    setPhnnCalcContext(format);

    const { result } = calculatePhnnMatchup(
      format,
      gen,
      new Pokemon(gen, 'Raticate', { evs: ev }),
      new Pokemon(gen, foe, {
        evs: ev, status: 'tox', toxicCounter: 1, curHP,
      }),
      new Move(gen, move),
      new Field(),
    );

    return result.kochance().text;
  };

  it('follows each server\'s toxic damage', () => {
    expect(tox('gen2spaceworldou', 'Dragon Rage', 'Snorlax')).toBe('guaranteed 3HKO after toxic damage');
    expect(tox('gen2spaceworldou', 'Dragon Rage', 'Cloyster')).toBe('guaranteed 3HKO after toxic damage');
    expect(tox('gen2spaceworldou', 'Sonic Boom', 'Snorlax')).toBe('guaranteed 4HKO after toxic damage');
    expect(tox('gen2spaceworldou', 'Seismic Toss', 'Snorlax')).toBe('guaranteed 3HKO after toxic damage');
    expect(tox('gen2spaceworldou', 'Dragon Rage', 'Snorlax', 165)).toBe('guaranteed 2HKO after toxic damage');
    expect(tox('gen2ou', 'Dragon Rage', 'Snorlax')).toBe('guaranteed 5HKO after toxic damage');
    expect(tox('gen2ou', 'Dragon Rage', 'Snorlax', 165)).toBe('guaranteed 3HKO after toxic damage');
    expect(tox('gen2ou', 'Dragon Rage', 'Cloyster')).toBe('guaranteed 4HKO after toxic damage');
    expect(tox('gen2ou', 'Sonic Boom', 'Snorlax', 125)).toBe('guaranteed 3HKO after toxic damage');
    expect(tox('gen2statusesgoldsilver', 'Dragon Rage', 'Snorlax', 165)).toBe('guaranteed 3HKO after toxic damage');
    expect(tox('gen2ou', 'Seismic Toss', 'Snorlax')).toBe('guaranteed 3HKO after toxic damage');
  });
});
