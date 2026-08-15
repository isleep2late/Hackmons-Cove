// Generates calc data modules for the No Nerfs (gen 10) and SpaceWorld '97
// (gen 11) calculator modes from the server dex dumps.
//
//   node phnn-import/dump-dex.js          (refresh dumps first)
//   node phnn-import/generate-calc-data.js
//
// Outputs (OVERWRITTEN each run — do not hand-edit):
//   calc/src/data/nonerfs-data.ts
//   calc/src/data/spaceworld-data.ts
//
// No Nerfs pool: every dex entry the No Nerfs validators accept (standard
// Pure Hackmons or Custom Disguises), minus "No Move" placeholders.
// SpaceWorld pool: entries the demo engine implements — isNonstandard null
// (standard SW) or 'Demo' (SW Custom Disguises), plus MissingNo. ('Custom').
'use strict';
const fs = require('fs');
const path = require('path');

const DUMPS = path.join(__dirname, 'dumps');
const load = f => JSON.parse(fs.readFileSync(path.join(DUMPS, f), 'utf8'));
const phnn = load('dump-phnn.json');
const swd = load('dump-spaceworld.json');
const pools = load('legal-pools.json');

// The calc's own compiled data (build `calc/` first) — diffing target.
const SV_SPECIES = require('../calc/dist/data/species').SPECIES[9];
const SV_MOVES = require('../calc/dist/data/moves').MOVES[9];
const SV_ITEMS = require('../calc/dist/data/items').ITEMS[9];
const SV_CHART = require('../calc/dist/data/types').TYPE_CHART[9];

const ORDER = [
  'Normal', 'Grass', 'Fire', 'Water', 'Electric', 'Ice', 'Flying', 'Bug', 'Poison', 'Ground',
  'Rock', 'Fighting', 'Psychic', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy', 'Stellar',
  'Shadow', 'Bird', '???',
];

function decodeDamageTaken(code) {
  return code === 1 ? 2 : code === 2 ? 0.5 : code === 3 ? 0 : 1;
}

// dump types (defender-oriented damageTaken) -> calc chart [attacker][defender]
function buildChart(types, typeNames) {
  const chart = {};
  for (const atk of typeNames) {
    chart[atk] = {};
    for (const def of typeNames) {
      const defEntry = types[def.toLowerCase().replace(/[^a-z0-9]/g, '')] ||
        types[def === '???' ? 'questionmark' : ''];
      if (!defEntry) continue;
      chart[atk][def] = decodeDamageTaken(defEntry.damageTaken[atk]);
    }
  }
  return chart;
}

function speciesEntry(d) {
  const e = {
    types: d.types,
    bs: {hp: d.baseStats.hp, at: d.baseStats.atk, df: d.baseStats.def,
      sa: d.baseStats.spa, sd: d.baseStats.spd, sp: d.baseStats.spe},
    weightkg: d.weightkg,
  };
  if (d.nfe) e.nfe = true;
  if (d.gender === 'N') e.gender = 'N';
  if (d.abilities && d.abilities['0']) e.abilities = {0: d.abilities['0']};
  if (d.otherFormes && d.otherFormes.length) e.otherFormes = d.otherFormes;
  if (d.baseSpecies) e.baseSpecies = d.baseSpecies;
  if (d.canGigantamax) e.canGigantamax = d.canGigantamax;
  return e;
}

function moveEntry(d) {
  const e = {bp: d.basePower, type: d.type};
  if (d.category) e.category = d.category;
  if (d.hasSecondaries) e.secondaries = true;
  if (d.target && ['allAdjacentFoes', 'allAdjacent'].includes(d.target)) e.target = d.target;
  if (d.recoil) e.recoil = d.recoil;
  if (d.hasCrashDamage) e.hasCrashDamage = true;
  if (d.mindBlownRecoil) e.mindBlownRecoil = true;
  if (d.struggleRecoil) e.struggleRecoil = true;
  if (d.willCrit) e.willCrit = true;
  if (d.drain) e.drain = d.drain;
  if (d.priority) e.priority = d.priority;
  if (d.ignoreDefensive) e.ignoreDefensive = true;
  if (d.overrideOffensiveStat) e.overrideOffensiveStat = d.overrideOffensiveStat;
  if (d.overrideDefensiveStat) e.overrideDefensiveStat = d.overrideDefensiveStat;
  if (d.overrideOffensivePokemon) e.overrideOffensivePokemon = d.overrideOffensivePokemon;
  if (d.breaksProtect) e.breaksProtect = true;
  if (d.isZ) e.isZ = true;
  if (d.isMax) e.isMax = true;
  if (d.multihit) e.multihit = d.multihit;
  if (d.multiaccuracy) e.multiaccuracy = true;
  if (d.zMove && d.zMove.basePower) e.zp = d.zMove.basePower;
  if (d.maxMove && d.maxMove.basePower) e.maxPower = d.maxMove.basePower;
  const f = d.flags || {};
  if (f.contact) e.makesContact = true;
  if (f.punch) e.isPunch = true;
  if (f.bite) e.isBite = true;
  if (f.bullet) e.isBullet = true;
  if (f.sound) e.isSound = true;
  if (f.pulse) e.isPulse = true;
  if (f.slicing) e.isSlicing = true;
  if (f.wind) e.isWind = true;
  return e;
}

function diffObj(nu, old) {
  // minimal patch: keys in nu differing from old, plus explicit undefined for
  // keys the calc entry has that must be REMOVED (rare; handled manually)
  const patch = {};
  for (const k of Object.keys(nu)) {
    if (JSON.stringify(nu[k]) !== JSON.stringify(old[k])) patch[k] = nu[k];
  }
  return patch;
}

function fmt(v, indent) {
  return JSON.stringify(v, null, indent).replace(/"([A-Za-z_][A-Za-z0-9_]*)":/g, '$1:');
}

// ---------------------------------------------------------------- No Nerfs
const nnLegal = pools.phnn.pools;
const isJunk = id => /^nomove/.test(id);

const nnSpeciesPatch = {};
const nnSpeciesNew = {};
for (const [id, d] of Object.entries(phnn.species)) {
  if (!nnLegal.species[id]) continue;
  const entry = speciesEntry(d);
  const existing = SV_SPECIES[d.name];
  if (existing) {
    const patch = diffObj(entry, existing);
    // never patch away fields the calc curates (otherFormes ordering, abilities)
    delete patch.otherFormes;
    if (JSON.stringify(patch.abilities) === JSON.stringify(existing.abilities)) delete patch.abilities;
    if (Object.keys(patch).length) nnSpeciesPatch[d.name] = patch;
  } else {
    nnSpeciesNew[d.name] = entry;
  }
}

const nnMovesPatch = {};
const nnMovesNew = {};
for (const [id, d] of Object.entries(phnn.moves)) {
  if (!nnLegal.moves[id] || nnLegal.moves[id].zOrMax || isJunk(id)) continue;
  const entry = moveEntry(d);
  const existing = SV_MOVES[d.name];
  if (existing) {
    const patch = diffObj(entry, existing);
    if (Object.keys(patch).length) nnMovesPatch[d.name] = patch;
  } else {
    nnMovesNew[d.name] = entry;
  }
}

const svItemSet = new Set(SV_ITEMS);
const nnItemsExtra = [];
const nnMegaStones = {};
for (const [id, d] of Object.entries(phnn.items)) {
  if (!nnLegal.items[id]) continue;
  if (!svItemSet.has(d.name)) nnItemsExtra.push(d.name);
  if (d.megaStone && d.megaEvolves) nnMegaStones[d.name] = {[d.megaEvolves]: d.megaStone};
}
nnItemsExtra.sort();

const nnTypeNames = ORDER.filter(t => t !== 'Bird' || phnn.types.bird);
const nnChartFull = buildChart(phnn.types, nnTypeNames.filter(t => phnn.types[t.toLowerCase().replace(/[^a-z0-9]/g, '')] || t === '???'));
const nnChartPatch = {};
for (const atk of Object.keys(nnChartFull)) {
  for (const def of Object.keys(nnChartFull[atk])) {
    const cur = (SV_CHART[atk] || {})[def];
    const nu = nnChartFull[atk][def];
    if (cur === undefined || cur !== nu) {
      (nnChartPatch[atk] = nnChartPatch[atk] || {})[def] = nu;
    }
  }
}

// -------------------------------------------------------------- SpaceWorld
const swLegalFlag = v => v.isNonstandard === null || v.isNonstandard === 'Demo';

const swSpecies = {};
for (const [id, d] of Object.entries(swd.species)) {
  if (!(swLegalFlag(d) || id === 'missingno')) continue;
  const e = speciesEntry(d);
  delete e.abilities; // no abilities in the gen 2 demo engine
  delete e.canGigantamax;
  swSpecies[d.name] = e;
}

const swMoves = {};
for (const [id, d] of Object.entries(swd.moves)) {
  if (!swLegalFlag(d) || isJunk(id)) continue;
  const e = moveEntry(d);
  delete e.zp; // no Z-moves / Dynamax in the gen 2 demo engine
  delete e.maxPower;
  delete e.isZ;
  delete e.isMax;
  swMoves[d.name] = e;
}

// The UI expects a '(No Move)' pseudo-entry in every gen's move table.
swMoves['(No Move)'] = {bp: 0, category: 'Status', type: 'Normal'};

// Per-type Hidden Power entries (the demo computes type/power from DVs; the
// UI uses named per-type entries like the stock GSC data).
const SW_SPECIAL_TYPES = ['Water', 'Grass', 'Fire', 'Ice', 'Electric', 'Psychic', 'Dragon', 'Dark'];
delete swMoves['Hidden Power'];
for (const hpType of ['Bug', 'Dark', 'Dragon', 'Electric', 'Fighting', 'Fire', 'Flying', 'Ghost',
  'Grass', 'Ground', 'Ice', 'Poison', 'Psychic', 'Rock', 'Steel', 'Water']) {
  swMoves[`Hidden Power ${hpType}`] = {
    bp: 70, type: hpType,
    category: SW_SPECIAL_TYPES.includes(hpType) ? 'Special' : 'Physical',
  };
}

const swItems = [];
for (const [id, d] of Object.entries(swd.items)) {
  if (!swLegalFlag(d)) continue;
  swItems.push(d.name);
}
swItems.sort();

const swTypeNames = ORDER.filter(t => !['Fairy', 'Stellar', 'Shadow'].includes(t));
const swChart = buildChart(swd.types, swTypeNames.filter(t => swd.types[t.toLowerCase().replace(/[^a-z0-9]/g, '')] || t === '???'));

// ------------------------------------------------------------------ write
const header = `// GENERATED by phnn-import/generate-calc-data.js — DO NOT EDIT BY HAND.
// Source of truth: the PHNN server dex (/srv/phnn-beta/pokemon-showdown).
// Regenerate: node phnn-import/dump-dex.js && node phnn-import/generate-calc-data.js
/* eslint-disable */
`;

fs.writeFileSync(path.join(__dirname, '..', 'calc', 'src', 'data', 'nonerfs-data.ts'), `${header}
export const NN_SPECIES_PATCH: any = ${fmt(nnSpeciesPatch, 2)};

export const NN_SPECIES_NEW: any = ${fmt(nnSpeciesNew, 2)};

export const NN_MOVES_PATCH: any = ${fmt(nnMovesPatch, 2)};

export const NN_MOVES_NEW: any = ${fmt(nnMovesNew, 2)};

export const NN_ITEMS_EXTRA: string[] = ${fmt(nnItemsExtra, 2)};

export const NN_MEGA_STONES: any = ${fmt(nnMegaStones, 2)};

export const NN_TYPECHART_PATCH: any = ${fmt(nnChartPatch, 2)};
`);

fs.writeFileSync(path.join(__dirname, '..', 'calc', 'src', 'data', 'spaceworld-data.ts'), `${header}
export const SW_SPECIES: any = ${fmt(swSpecies, 2)};

export const SW_MOVES: any = ${fmt(swMoves, 2)};

export const SW_ITEMS: string[] = ${fmt(swItems, 2)};

export const SW_TYPECHART: any = ${fmt(swChart, 2)};
`);

console.log('No Nerfs: speciesPatch=%d speciesNew=%d movesPatch=%d movesNew=%d itemsExtra=%d megaStones=%d chartPatchRows=%d',
  Object.keys(nnSpeciesPatch).length, Object.keys(nnSpeciesNew).length,
  Object.keys(nnMovesPatch).length, Object.keys(nnMovesNew).length,
  nnItemsExtra.length, Object.keys(nnMegaStones).length, Object.keys(nnChartPatch).length);
console.log('SpaceWorld: species=%d moves=%d items=%d chartRows=%d',
  Object.keys(swSpecies).length, Object.keys(swMoves).length, swItems.length, Object.keys(swChart).length);
