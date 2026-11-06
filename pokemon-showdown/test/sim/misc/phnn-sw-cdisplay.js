'use strict';

const assert = require('./../../assert');
const common = require('./../../common');
const { Dex } = require('./../../../dist/sim/dex');

function hpLabel(formatid, ivs) {
	const battle = common.createBattle({ formatid, seed: [1, 2, 3, 4] }, [[
		{ species: 'Mew', ability: 'No Ability', moves: ['hiddenpower', 'splash'], ivs },
	], [
		{ species: 'Gengar', ability: 'No Ability', moves: ['splash'] },
	]]);
	const label = battle.p1.activeRequest.active[0].moves[0].move;
	battle.destroy();
	return label;
}

describe('[Gen 2] SpaceWorld display', () => {
	describe('Hidden Power request label', () => {
		it('carries the demo power for maximum DVs', () => {
			assert.equal(hpLabel('gen2spaceworlddisguises'), 'Hidden Power ??? 78');
		});

		it('carries the demo power for custom DVs', () => {
			const ivs = { hp: 30, atk: 30, def: 2, spa: 30, spd: 30, spe: 30 };
			assert.equal(hpLabel('gen2spaceworlddisguises', ivs), 'Hidden Power ??? 58');
		});

		it('matches the power the move actually uses', () => {
			const ivs = { hp: 30, atk: 14, def: 30, spa: 6, spd: 6, spe: 22 };
			const label = hpLabel('gen2spaceworlddisguises', ivs);
			const battle = common.createBattle({ formatid: 'gen2spaceworlddisguises' }, [[
				{ species: 'Mew', ability: 'No Ability', moves: ['hiddenpower'], ivs },
			], [
				{ species: 'Gengar', ability: 'No Ability', moves: ['splash'] },
			]]);
			const move = Dex.mod('spaceworld').moves.get('hiddenpower');
			const power = move.basePowerCallback.call(battle, battle.p1.active[0]);
			battle.destroy();
			assert.equal(label, `Hidden Power ??? ${power}`);
		});

		it('leaves the standard Gen 2 label alone', () => {
			const ivs = { hp: 30, atk: 30, def: 26, spa: 30, spd: 30, spe: 30 };
			assert.equal(hpLabel('gen2ou', ivs), 'Hidden Power Ice 70');
		});
	});

	describe('item activation text', () => {
		it('has activate texts for Quick Needle and Focus Orb', () => {
			const items = Dex.loadTextData().Items;
			assert.equal(items.quickneedle.activate, '  {POKEMON} can act faster than normal, thanks to its Quick Needle!');
			assert.equal(items.focusorb.activate, '  {POKEMON} hung on using its Focus Orb!');
		});
	});
});
