'use strict';

const assert = require('./../../assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const common = require('./../../common');
const { Dex } = require('./../../../dist/sim/dex');
const { TeamValidator } = require('./../../../dist/sim/team-validator');

const CLIENT = path.resolve(__dirname, '../../../../pokemon-showdown-client/play.pokemonshowdown.com');

let client = null;
function loadClientEditor() {
	if (client) return client;
	const context = { console };
	context.window = context;
	context.global = context;
	context.exports = context;
	context.TL = (strings, ...values) => strings.reduce((acc, str, i) => acc + str + (values[i] ?? ''), '');
	context.Config = { routes: { dex: 'dex' } };
	vm.createContext(context);
	for (const file of [
		'pokedex', 'moves', 'items', 'abilities', 'aliases', 'typechart', 'formats-data',
		'teambuilder-tables', 'learnsets', 'search-index', 'text/en',
	]) {
		vm.runInContext(fs.readFileSync(`${CLIENT}/data/${file}.js`, 'utf8'), context, { filename: file });
	}
	for (const file of ['battle-dex-data', 'battle-dex', 'battle-dex-search']) {
		vm.runInContext(fs.readFileSync(`${CLIENT}/js/${file}.js`, 'utf8'), context, { filename: file });
	}
	class Stub {}
	context.preact = { Component: Stub, Fragment: Stub, h() {}, render() {} };
	context.PSModel = Stub;
	context.PSSearchResults = Stub;
	vm.runInContext(fs.readFileSync(`${CLIENT}/js/battle-team-editor.js`, 'utf8'), context, { filename: 'battle-team-editor' });
	client = context;
	return client;
}

function clientHp(formatid, set) {
	const { Dex, TeamEditorState } = loadClientEditor();
	const format = Dex.formats.get(formatid);
	const dex = Dex.mod(format.mod);
	const state = Object.create(TeamEditorState.prototype);
	Object.assign(state, { gen: dex.gen, dex, format });
	return TeamEditorState.prototype.getStat.call(state, 'hp', set, state.getIVs(set).hp);
}

const EVS = { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 };

function ivsFromDVs(atk, def, spe, spc, hp = 15) {
	return { hp: hp * 2, atk: atk * 2, def: def * 2, spa: spc * 2, spd: spc * 2, spe: spe * 2 };
}

function demoHpDV(atk, def, spe, spc) {
	return 16 * (atk & 1) + 8 * (def & 1) + (spe & 1) + (spc & 1);
}

function gscHpDV(atk, def, spe, spc) {
	return 8 * (atk & 1) + 4 * (def & 1) + 2 * (spe & 1) + (spc & 1);
}

function hpStat(base, dv, level, cap = 999) {
	return Math.min(cap, Math.floor((2 * (base + dv) + 63) * level / 100) + level + 10);
}

function mon(species, ivs, level = 100) {
	return { species, moves: ['tackle'], ability: 'No Ability', level, evs: { ...EVS }, ivs };
}

function maxhp(formatid, species, ivs, level) {
	const battle = common.createBattle({ formatid }, [[mon(species, ivs, level)], [mon('Magikarp', ivsFromDVs(15, 15, 15, 15))]]);
	const value = battle.p1.pokemon[0].maxhp;
	battle.destroy();
	return value;
}

const COMBOS = [
	[15, 15, 15, 15],
	[14, 15, 15, 15],
	[15, 14, 15, 15],
	[15, 15, 14, 15],
	[15, 15, 15, 14],
	[14, 14, 14, 14],
	[13, 12, 11, 10],
	[0, 1, 0, 1],
];

describe("SpaceWorld '97 HP DV", () => {
	it('is 16*(Atk&1) + 8*(Def&1) + (Spe&1) + (Spc&1), giving 26 at max DVs', () => {
		assert.equal(demoHpDV(15, 15, 15, 15), 26);
		assert.equal(demoHpDV(14, 14, 14, 14), 0);
		assert.equal(demoHpDV(15, 14, 14, 14), 16);
		assert.equal(demoHpDV(14, 15, 14, 14), 8);
		assert.equal(demoHpDV(14, 14, 15, 15), 2);
	});

	for (const formatid of ['gen2spaceworldou', 'gen2spaceworldubers', 'gen2spaceworlddisguises']) {
		it(`sets battle max HP from the demo HP DV in ${formatid}`, () => {
			const level = formatid === 'gen2spaceworlddisguises' ? 255 : 100;
			const base = Dex.mod('spaceworld').species.get('Snorlax').baseStats.hp;
			for (const [atk, def, spe, spc] of COMBOS) {
				const ivs = ivsFromDVs(atk, def, spe, spc, gscHpDV(atk, def, spe, spc));
				assert.equal(maxhp(formatid, 'Snorlax', ivs, level), hpStat(base, demoHpDV(atk, def, spe, spc), level),
					`DVs ${atk}/${def}/${spe}/${spc}`);
			}
		});
	}

	it('ignores the submitted HP IV in battle', () => {
		const a = maxhp('gen2spaceworldou', 'Snorlax', ivsFromDVs(15, 15, 15, 15, 0), 100);
		const b = maxhp('gen2spaceworldou', 'Snorlax', ivsFromDVs(15, 15, 15, 15, 15), 100);
		assert.equal(a, b);
		assert.equal(a, 545);
	});

	it('gives max-DV Snorlax 545 HP at level 100 and the 999 cap at level 255', () => {
		assert.equal(maxhp('gen2spaceworldubers', 'Snorlax', ivsFromDVs(15, 15, 15, 15), 100), 545);
		assert.equal(maxhp('gen2spaceworlddisguises', 'Snorlax', ivsFromDVs(15, 15, 15, 15), 255), 999);
		const karp = Dex.mod('spaceworld').species.get('Magikarp').baseStats.hp;
		assert.equal(maxhp('gen2spaceworlddisguises', 'Magikarp', ivsFromDVs(15, 15, 15, 15), 255), hpStat(karp, 26, 255));
	});

	it('keeps the capped max HP for the Explosion HP-byte glitch', () => {
		const battle = common.createBattle({ formatid: 'gen2spaceworlddisguises' }, [
			[{ ...mon('Snorlax', ivsFromDVs(15, 15, 15, 15), 255), moves: ['explosion'] }],
			[mon('Snorlax', ivsFromDVs(15, 15, 15, 15), 255)],
		]);
		const snorlax = battle.p1.active[0];
		assert.equal(snorlax.maxhp, 999);
		battle.makeChoices('move explosion', 'move tackle');
		assert.equal(snorlax.maxhp, 999 % 256);
		battle.destroy();
	});

	it('validator accepts default and odd DV sets without an HP DV complaint', () => {
		const validator = TeamValidator.get('gen2spaceworldubers');
		assert.equal(validator.validateSet(mon('Snorlax', ivsFromDVs(15, 15, 15, 15)), {}), null);
		assert.equal(validator.validateSet({ species: 'Snorlax', moves: ['tackle'] }, {}), null);
		for (const [atk, def, spe, spc] of COMBOS) {
			for (const hp of [0, 7, 15]) {
				const set = mon('Snorlax', ivsFromDVs(atk, def, spe, spc, hp));
				assert.equal(validator.validateSet(set, {}), null, `DVs ${atk}/${def}/${spe}/${spc} HP ${hp}`);
				assert.equal(set.ivs.hp, hp * 2);
			}
		}
	});

	it('validator still enforces the GSC HP DV in gen2ou', () => {
		const validator = TeamValidator.get('gen2ou');
		assert.equal(validator.validateSet(mon('Snorlax', ivsFromDVs(15, 15, 15, 15)), {}), null);
		const problems = validator.validateSet(mon('Snorlax', ivsFromDVs(14, 15, 15, 15, 15)), {});
		assert(problems && problems.some(p => p.includes('HP DV')));
	});

	it('leaves gen2ou max HP on the GSC formula', () => {
		const base = Dex.mod('gen2').species.get('Snorlax').baseStats.hp;
		for (const [atk, def, spe, spc] of COMBOS) {
			const hp = gscHpDV(atk, def, spe, spc);
			const ivs = ivsFromDVs(atk, def, spe, spc, hp);
			assert.equal(maxhp('gen2ou', 'Snorlax', ivs, 100), hpStat(base, hp, 100), `DVs ${atk}/${def}/${spe}/${spc}`);
		}
		assert.equal(maxhp('gen2ou', 'Snorlax', ivsFromDVs(15, 15, 15, 15), 100), 523);
		assert.equal(maxhp('gen2ou', 'Snorlax', ivsFromDVs(15, 15, 15, 15), 255), 1318);
	});

	it('teambuilder shows the same max HP as the battle', () => {
		for (const [formatid, level] of [
			['gen2spaceworldubers', 100], ['gen2spaceworlddisguises', 255], ['gen2ou', 100], ['gen2ou', 255],
		]) {
			for (const [atk, def, spe, spc] of COMBOS) {
				const ivs = ivsFromDVs(atk, def, spe, spc, gscHpDV(atk, def, spe, spc));
				const set = mon('Snorlax', ivs, level);
				assert.equal(clientHp(formatid, { ...set, ivs: { ...ivs } }), maxhp(formatid, 'Snorlax', ivs, level),
					`${formatid} DVs ${atk}/${def}/${spe}/${spc}`);
			}
		}
	});
});
