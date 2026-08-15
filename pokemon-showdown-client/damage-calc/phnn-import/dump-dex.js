// Dumps computed dex data for the phnn + spaceworld mods (and gen9/gen2
// baselines for diffing) from the live server build, as JSON consumed by
// generate-calc-data.js. Run:  node phnn-import/dump-dex.js
'use strict';
global.Config = {routes: {root: 'x', client: 'x', dex: 'x', replays: 'x'}};
const fs = require('fs');
const path = require('path');
const {Dex} = require('/srv/phnn-beta/pokemon-showdown/dist/sim/dex');

const OUT = path.join(__dirname, 'dumps');
fs.mkdirSync(OUT, {recursive: true});

function dumpSpecies(dex) {
  const out = {};
  for (const s of dex.species.all()) {
    if (!s.exists) continue;
    out[s.id] = {
      name: s.name, num: s.num, types: s.types, baseStats: s.baseStats,
      weightkg: s.weightkg, weighthg: s.weighthg,
      gender: s.gender || undefined,
      genderRatio: s.genderRatio,
      nfe: s.nfe || undefined,
      abilities: s.abilities,
      baseSpecies: s.baseSpecies !== s.name ? s.baseSpecies : undefined,
      forme: s.forme || undefined,
      otherFormes: s.otherFormes,
      canGigantamax: s.canGigantamax || undefined,
      requiredItem: s.requiredItem || undefined,
      isMega: s.isMega || undefined,
      isPrimal: s.isPrimal || undefined,
      tier: s.tier, isNonstandard: s.isNonstandard,
      gen: s.gen,
    };
  }
  return out;
}

function dumpMoves(dex) {
  const out = {};
  for (const m of dex.moves.all()) {
    if (!m.exists) continue;
    out[m.id] = {
      name: m.name, num: m.num, basePower: m.basePower, type: m.type,
      category: m.category, accuracy: m.accuracy, priority: m.priority,
      flags: m.flags, target: m.target,
      multihit: m.multihit, recoil: m.recoil, drain: m.drain,
      isNonstandard: m.isNonstandard,
      isZ: m.isZ || undefined, isMax: m.isMax || undefined,
      zMove: m.zMove, maxMove: m.maxMove,
      ohko: m.ohko || undefined, damage: m.damage || undefined,
      critRatio: m.critRatio !== 1 ? m.critRatio : undefined,
      willCrit: m.willCrit || undefined,
      hasSecondaries: !!(m.secondaries && m.secondaries.length) || undefined,
      ignoreDefensive: m.ignoreDefensive || undefined,
      ignoreOffensive: m.ignoreOffensive || undefined,
      ignoreImmunity: m.ignoreImmunity === undefined ? undefined : m.ignoreImmunity,
      breaksProtect: m.breaksProtect || undefined,
      overrideOffensiveStat: m.overrideOffensiveStat,
      overrideDefensiveStat: m.overrideDefensiveStat,
      overrideOffensivePokemon: m.overrideOffensivePokemon,
      multiaccuracy: m.multiaccuracy || undefined,
      mindBlownRecoil: m.mindBlownRecoil || undefined,
      struggleRecoil: m.struggleRecoil || undefined,
      hasCrashDamage: m.hasCrashDamage || undefined,
      selfdestruct: m.selfdestruct || undefined,
      defensiveCategory: m.overrideDefensiveStat ? undefined : m.defensiveCategory,
      hasBasePowerCallback: typeof m.basePowerCallback === 'function' || undefined,
      hasDamageCallback: typeof m.damageCallback === 'function' || undefined,
      gen: m.gen,
    };
  }
  return out;
}

function dumpItems(dex) {
  const out = {};
  for (const it of dex.items.all()) {
    if (!it.exists) continue;
    out[it.id] = {
      name: it.name, num: it.num,
      isNonstandard: it.isNonstandard,
      isBerry: it.isBerry || undefined,
      megaStone: it.megaStone, megaEvolves: it.megaEvolves,
      zMove: it.zMove, zMoveType: it.zMoveType, zMoveFrom: it.zMoveFrom,
      itemUser: it.itemUser, onPlate: it.onPlate,
      isPokeball: it.isPokeball || undefined,
      naturalGift: it.naturalGift,
      ignoreKlutz: it.ignoreKlutz || undefined,
      gen: it.gen,
    };
  }
  return out;
}

function dumpAbilities(dex) {
  const out = {};
  for (const a of dex.abilities.all()) {
    if (!a.exists) continue;
    out[a.id] = {name: a.name, num: a.num, isNonstandard: a.isNonstandard, rating: a.rating, gen: a.gen};
  }
  return out;
}

function dumpTypes(dex) {
  const out = {};
  for (const t of dex.types.all()) {
    out[t.id] = {name: t.name, damageTaken: t.damageTaken, isNonstandard: t.isNonstandard};
  }
  return out;
}

for (const mod of ['phnn', 'spaceworld', 'gen9', 'gen2']) {
  const dex = Dex.mod(mod);
  const dump = {
    mod,
    species: dumpSpecies(dex),
    moves: dumpMoves(dex),
    items: dumpItems(dex),
    abilities: dumpAbilities(dex),
    types: dumpTypes(dex),
  };
  const file = path.join(OUT, `dump-${mod}.json`);
  fs.writeFileSync(file, JSON.stringify(dump));
  console.log(`${file}: species=${Object.keys(dump.species).length} moves=${Object.keys(dump.moves).length} items=${Object.keys(dump.items).length} abilities=${Object.keys(dump.abilities).length} types=${Object.keys(dump.types).length}`);
}
