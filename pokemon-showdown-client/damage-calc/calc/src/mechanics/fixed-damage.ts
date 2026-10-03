export type PsywaveKind = 'gen1' | 'gen2' | 'spaceworld' | 'nonerfs' | 'standard';

const MIN_ROLLS = 16;

function rangeOf(min: number, max: number) {
  const values: number[] = [];
  for (let i = min; i <= max; i++) values.push(i);
  return values;
}

export function halfHPDamage(
  hp: number,
  parentalBond = false,
  toBaseHP: (hp: number) => number = value => value
): number | number[] {
  const current = Math.max(0, Math.trunc(hp));
  const first = Math.max(1, Math.floor(toBaseHP(current) / 2));
  const remaining = current - first;
  if (!parentalBond || remaining <= 0) return first;
  return [first, Math.max(1, Math.floor(toBaseHP(remaining) / 2))];
}

export function undynamaxedHP(pokemon: {maxHP: (original?: boolean) => number}) {
  return (value: number) => (pokemon.maxHP() === pokemon.maxHP(true)
    ? value
    : Math.ceil((value * pokemon.maxHP(true)) / pokemon.maxHP()));
}

export function psywaveRolls(kind: PsywaveKind, level: number): number[] {
  const lv = Math.max(1, Math.trunc(level));
  const wrapped = (lv + (lv >> 1)) & 0xff;
  let values: number[];
  if (kind === 'spaceworld') {
    values = wrapped < 2 ? [] : rangeOf(1, wrapped - 1);
  } else if (kind === 'gen1') {
    values = wrapped < 2 ? [] : rangeOf(1, Math.trunc(1.5 * lv) - 1);
  } else if (kind === 'gen2') {
    values = rangeOf(1, Math.max(1, lv + Math.floor(lv / 2) - 1));
  } else if (kind === 'nonerfs') {
    values = rangeOf(lv, Math.floor(lv * 1.5));
  } else {
    values = rangeOf(50, 150).map(r => Math.max(1, Math.floor((r * lv) / 100)));
  }
  if (!values.length || values.length >= MIN_ROLLS) return values;
  const repeat = Math.ceil(MIN_ROLLS / values.length);
  const padded: number[] = [];
  for (const value of values) {
    for (let i = 0; i < repeat; i++) padded.push(value);
  }
  return padded;
}

export function sw97FlailPower(hp: number, maxHP: number) {
  const product = hp * 48;
  let dividend = product;
  let divisor = maxHP;
  if (maxHP >= 256) {
    dividend = (product & 0xff0000) | ((product & 0xffff) >> 2);
    divisor = (maxHP >> 2) & 0xff;
  }
  const ratio = divisor ? Math.floor(dividend / divisor) & 0xff : 0xff;
  if (ratio <= 1) return 200;
  if (ratio <= 4) return 150;
  if (ratio <= 9) return 100;
  if (ratio <= 16) return 80;
  if (ratio <= 32) return 40;
  return 20;
}
