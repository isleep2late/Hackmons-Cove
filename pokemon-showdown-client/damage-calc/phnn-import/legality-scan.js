// Determines the EXACT legal species/move/item pools for the No Nerfs and
// SpaceWorld calc modes by running the server's own TeamValidator over every
// dex entry. Pool for the calc = union across each mod's formats (standard +
// Custom Disguises), since the calculator serves all of them.
// Run:  node phnn-import/legality-scan.js
'use strict';
global.Config = {routes: {root: 'x', client: 'x', dex: 'x', replays: 'x'}};
const fs = require('fs');
const path = require('path');
const {Dex} = require('/srv/phnn-beta/pokemon-showdown/dist/sim/dex');
const {TeamValidator} = require('/srv/phnn-beta/pokemon-showdown/dist/sim/team-validator');

const FORMATS = {
  phnn: ['gen9nonerfspurehackmons', 'gen9nonerfscustomdisguises'],
  spaceworld: ['gen2spaceworldou', 'gen2spaceworldcustomdisguises'],
};
// Anchors known-legal in every listed format, used as the test-bed set.
const ANCHOR = {
  phnn: {species: 'Pikachu', move: 'Tackle', item: ''},
  spaceworld: {species: 'Pikachu', move: 'Tackle', item: ''},
};

function mkSet(species, move, item) {
  return [{
    species, name: 'test', item: item || '', ability: 'No Ability',
    moves: [move], nature: 'Hardy', gender: '',
    evs: {hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252},
    ivs: {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31}, level: 100,
  }];
}

const out = {};
for (const mod of Object.keys(FORMATS)) {
  const dex = Dex.mod(mod);
  const validators = FORMATS[mod].map(f => new TeamValidator(f));
  const anchor = ANCHOR[mod];
  const legalIn = (set) => {
    const perFormat = {};
    for (const v of validators) {
      perFormat[v.format.id] = !v.validateTeam(JSON.parse(JSON.stringify(set)));
    }
    return perFormat;
  };

  const species = {};
  for (const s of dex.species.all()) {
    if (!s.exists) continue;
    const r = legalIn(mkSet(s.name, anchor.move, anchor.item));
    if (Object.values(r).some(Boolean)) species[s.id] = r;
  }
  const moves = {};
  for (const m of dex.moves.all()) {
    if (!m.exists || m.isZ || m.isMax) {
      // Z/Max moves are not directly slotted; calc handles them separately.
      if (m.exists && (m.isZ || m.isMax)) moves[m.id] = {zOrMax: true};
      continue;
    }
    const r = legalIn(mkSet(anchor.species, m.name, anchor.item));
    if (Object.values(r).some(Boolean)) moves[m.id] = r;
  }
  const items = {};
  for (const it of dex.items.all()) {
    if (!it.exists) continue;
    const r = legalIn(mkSet(anchor.species, anchor.move, it.name));
    if (Object.values(r).some(Boolean)) items[it.id] = r;
  }
  out[mod] = {
    formats: FORMATS[mod],
    species: Object.keys(species).length, moves: Object.keys(moves).length, items: Object.keys(items).length,
    pools: {species, moves, items},
  };
  console.log(`${mod}: species=${out[mod].species} moves=${out[mod].moves} items=${out[mod].items}`);
}

fs.writeFileSync(path.join(__dirname, 'dumps', 'legal-pools.json'), JSON.stringify(out));
console.log('wrote dumps/legal-pools.json');
