import {calculate, Pokemon, Move, Generations, parseEnigmaItem, ITEMS} from '../index';
import type {GenerationNum} from '../data/interface';

const damageOf = (
  num: GenerationNum, item: string | undefined, moveName: string, attackerName = 'Charizard'
) => {
  const gen = Generations.get(num);
  const attacker = new Pokemon(gen, attackerName, {item: item as any});
  const defender = new Pokemon(gen, 'Blissey');
  return calculate(gen, attacker, defender, new Move(gen, moveName));
};

describe('Enigma items', () => {
  test('grammar', () => {
    const gen = Generations.get(3);
    expect(parseEnigmaItem(gen, 'Enigma Leftovers')).toEqual(
      {base: 'Leftovers', param: undefined, name: 'Enigma Leftovers'}
    );
    expect(parseEnigmaItem(gen, 'EnigmaKingsRock(255)')).toEqual(
      {base: "King's Rock", param: 255, name: "Enigma King's Rock (255)"}
    );
    expect(parseEnigmaItem(gen, 'Enigma Focus Band( 100 )')!.name).toBe('Enigma Focus Band (100)');
    expect(parseEnigmaItem(gen, 'Enigma Sitrus')!.base).toBe('Sitrus Berry');
    expect(parseEnigmaItem(gen, 'Enigma Never-Melt Ice (0)')).toEqual(
      {base: 'Never-Melt Ice', param: 0, name: 'Enigma Never-Melt Ice (0)'}
    );
    for (const bad of [
      'Enigma Berry', 'Enigma Enigma Berry', 'Enigma Focus Band (256)', 'Enigma Focus Band (007)',
      'Enigma Focus Band (1000)', 'Enigma Nonsense', 'Leftovers', '',
    ]) {
      expect(parseEnigmaItem(gen, bad)).toBeUndefined();
    }
  });

  test('Object.prototype keys are not items', () => {
    for (const num of [3, 10] as GenerationNum[]) {
      const gen = Generations.get(num);
      for (const bad of [
        'Enigma constructor', 'Enigma __proto__', 'Enigma hasOwnProperty', 'Enigma toString',
        'Enigma valueOf', 'Enigma constructor (5)', 'enigmaisPrototypeOf',
      ]) {
        expect(parseEnigmaItem(gen, bad)).toBeUndefined();
        const pokemon = new Pokemon(gen, 'Charizard', {item: bad as any});
        expect(pokemon.enigma).toBeUndefined();
        expect(pokemon.item).toBe(bad);
      }
    }
  });

  test('e-Reader berries', () => {
    const berries: Array<[string, string | undefined]> = [
      ['Pumkin Berry', 'Aspear Berry'], ['Drash Berry', 'Pecha Berry'],
      ['Eggant Berry', 'Mental Herb'], ['Strib Berry', undefined],
      ['Chilan Berry (Gen 3)', undefined], ['Nutpea Berry', undefined],
      ['Ginema Berry', 'White Herb'], ['Kuo Berry', undefined], ['Yago Berry', 'Rawst Berry'],
      ['Touga Berry', 'Persim Berry'], ['Niniku Berry', undefined], ['Topo Berry', undefined],
    ];
    for (const num of [3, 10] as GenerationNum[]) {
      const gen = Generations.get(num);
      for (const [name, base] of berries) {
        expect(ITEMS[num]).toContain(name);
        const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '');
        expect(gen.items.get(id as any)!.name).toBe(name);
        expect(Array.from(gen.items).some(item => item.name === name)).toBe(false);
        expect(parseEnigmaItem(gen, name)).toEqual(
          {base: base || name, param: undefined, name, preset: true}
        );
        const pokemon = new Pokemon(gen, 'Charizard', {item: name as any});
        expect(pokemon.item).toBe(base || name);
        expect(pokemon.enigmaItem).toBe(name);
        expect(pokemon.enigmaParam).toBeUndefined();
        expect(pokemon.clone().enigmaItem).toBe(name);
        expect(parseEnigmaItem(gen, `Enigma ${name}`)).toBeUndefined();
        expect(damageOf(num, name, 'Flamethrower').damage)
          .toEqual(damageOf(num, undefined, 'Flamethrower').damage);
      }
    }
    expect(parseEnigmaItem(Generations.get(2), 'Drash Berry')).toBeUndefined();
    for (const num of [2, 4, 9] as GenerationNum[]) {
      expect(ITEMS[num]).not.toContain('Drash Berry');
    }
    expect(Generations.get(4).items.get('chilanberry' as any)!.name).toBe('Chilan Berry');
    const knocked = (item: string | undefined) => {
      const gen = Generations.get(10);
      return calculate(
        gen, new Pokemon(gen, 'Weavile'), new Pokemon(gen, 'Blissey', {item: item as any}),
        new Move(gen, 'Knock Off')
      ).damage;
    };
    expect(knocked('Strib Berry')).toEqual(knocked('Leftovers'));
    expect(knocked('Drash Berry')).toEqual(knocked('Leftovers'));
    expect(knocked('Strib Berry')).not.toEqual(knocked(undefined));
  });

  test('pokemon keeps the base item and the Enigma name', () => {
    const gen = Generations.get(3);
    const pokemon = new Pokemon(gen, 'Charizard', {item: 'Enigma Charcoal (255)' as any});
    expect(pokemon.item).toBe('Charcoal');
    expect(pokemon.hasItem('Charcoal')).toBe(true);
    expect(pokemon.enigma).toBe(true);
    expect(pokemon.enigmaParam).toBe(255);
    expect(pokemon.enigmaItem).toBe('Enigma Charcoal (255)');
    const clone = pokemon.clone();
    expect(clone.item).toBe('Charcoal');
    expect(clone.enigmaParam).toBe(255);
    expect(new Pokemon(gen, 'Charizard', {item: 'Enigma Berry' as any}).enigma).toBeUndefined();
  });

  for (const num of [3, 10] as GenerationNum[]) {
    test(`gen ${num}: an Enigma copy calculates as its base item`, () => {
      const plain = damageOf(num, 'Charcoal', 'Flamethrower');
      const enigma = damageOf(num, 'Enigma Charcoal', 'Flamethrower');
      expect(enigma.damage).toEqual(plain.damage);
      expect(enigma.desc()).toBe(plain.desc().replace('Charcoal', 'Enigma Charcoal'));
      const band = damageOf(num, 'Enigma Choice Band', 'Slash');
      expect(band.damage).toEqual(damageOf(num, 'Choice Band', 'Slash').damage);
    });

    test(`gen ${num}: the type-boost parameter`, () => {
      const none = damageOf(num, undefined, 'Flamethrower');
      const zero = damageOf(num, 'Enigma Charcoal (0)', 'Flamethrower');
      const max = damageOf(num, 'Enigma Charcoal (255)', 'Flamethrower');
      expect(zero.damage).toEqual(none.damage);
      const noneMax = (none.damage as number[])[15];
      const maxMax = (max.damage as number[])[15];
      expect(maxMax / noneMax).toBeGreaterThan(3.4);
      expect(maxMax / noneMax).toBeLessThan(3.6);
      expect(max.desc()).toContain('Enigma Charcoal (255)');
      expect(damageOf(num, 'Enigma Charcoal (255)', 'Slash').damage)
        .toEqual(damageOf(num, undefined, 'Slash').damage);
    });

    test(`gen ${num}: a parameter on a non-boosting item changes nothing`, () => {
      expect(damageOf(num, 'Enigma Focus Band (100)', 'Flamethrower').damage)
        .toEqual(damageOf(num, 'Focus Band', 'Flamethrower').damage);
    });
  }
});
