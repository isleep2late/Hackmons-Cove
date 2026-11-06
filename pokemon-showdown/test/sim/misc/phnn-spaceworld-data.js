'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('./../../assert');
const common = require('./../../common');
const { Dex } = require('./../../../dist/sim/dex');
const { TeamValidator } = require('./../../../dist/sim/team-validator');
const SW_LEARNSETS = (() => {
	const source = fs.readFileSync(path.resolve(__dirname, '../../../data/mods/spaceworld/learnsets.ts'), 'utf8');
	const module = { exports: {} };
	new Function('module', source.replace(/^export const Learnsets:[^=]*=\s*/, 'module.exports = '))(module);
	return module.exports;
})();

const OU = 'gen2spaceworldou';
const UBERS = 'gen2spaceworldubers';
const SW = Dex.mod('spaceworld');

const TWINS = {
	chikorita: 'happa', bayleef: 'hanamogura', meganium: 'hanaryu', noctowl: 'bobo', mareep: 'pachimee',
	qwilfish: 'puku', numpuff: 'shibirefugu', quagsire: 'mizuuo', ariados: 'twohead', sunflora: 'sunny',
	phanpy: 'paon', smeargle: 'painter', ledian: 'mitsuboshi', delibird: 'gift', aipom: 'tail',
};
const SW_TMS = new Set([
	'sketch', 'hiddenpower', 'snore', 'flail', 'conversion2', 'cottonspore', 'reversal', 'spite', 'powdersnow',
	'machpunch', 'scaryface', 'sweetkiss', 'bellydrum', 'sludgebomb', 'mudslap', 'octazooka', 'zapcannon', 'destinybond',
	'bonelock', 'lockon', 'outrage', 'gigadrain', 'charm', 'falseswipe', 'milkdrink', 'spark', 'steelwing', 'sleeptalk',
	'bellchime', 'present', 'painsplit', 'sacredfire', 'dynamicpunch', 'megaphone', 'dragonbreath', 'encore', 'rockhead',
	'crosscutter', 'twister', 'triplekick', 'thief', 'spiderweb', 'nightmare', 'flamewheel', 'naildown', 'protect',
	'spikes', 'perishsong', 'endure', 'magnitude', 'uproot', 'windride', 'watersport', 'strongarm', 'brightmoss',
	'whirlpool', 'bounce',
]);

const MAX_EVS = { hp: 255, atk: 255, def: 255, spa: 255, spd: 255, spe: 255 };
const MAX_IVS = { hp: 30, atk: 30, def: 30, spa: 30, spd: 30, spe: 30 };

function set(species, moves, extra = {}) {
	return {
		name: '', species, item: '', ability: '', moves, nature: '', gender: '', level: 100,
		evs: { ...MAX_EVS }, ivs: { ...MAX_IVS }, ...extra,
	};
}

function validate(format, species, moves, extra) {
	return TeamValidator.get(format).validateSet(set(species, moves, extra), {});
}

function dvs(atk, def, spe, spc) {
	const hp = (atk % 2) * 8 + (def % 2) * 4 + (spe % 2) * 2 + (spc % 2);
	return { hp: hp * 2, atk: atk * 2, def: def * 2, spa: spc * 2, spd: spc * 2, spe: spe * 2 };
}

function mon(species, moves, extra = {}) {
	return {
		species, moves, ability: 'No Ability', level: 100,
		evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 },
		ivs: { ...MAX_IVS }, ...extra,
	};
}

function twoMoves(id) {
	const learnset = SW.species.getLearnsetData(id).learnset;
	return Object.keys(learnset).filter(move => learnset[move].includes('2M')).sort();
}

describe('[Gen 2] SpaceWorld data', () => {
	let battle;
	afterEach(() => {
		if (battle) battle.destroy();
		battle = null;
	});

	describe('one species per demo slot, under its final name', () => {
		it('retires every demo-name twin', () => {
			for (const demo of Object.values(TWINS)) {
				const species = SW.species.get(demo);
				assert.equal(species.isNonstandard, 'Unobtainable', demo);
				assert.equal(species.tier, 'Illegal', demo);
			}
		});

		it('keeps the final names with the demo data', () => {
			for (const [kept, demo] of Object.entries(TWINS)) {
				const a = SW.species.get(kept);
				const b = SW.species.get(demo);
				assert.equal(a.isNonstandard, null, kept);
				assert.notEqual(a.tier, 'Illegal', kept);
				assert.deepEqual(a.baseStats, b.baseStats, kept);
				assert.deepEqual(a.types, b.types, kept);
			}
		});

		it('keeps the organiser tiers, and gives Aipom Tail\'s tier', () => {
			assert.equal(SW.species.get('Chikorita').tier, 'UU');
			assert.equal(SW.species.get('Bayleef').tier, 'LC');
			assert.equal(SW.species.get('Qwilfish').tier, 'UU');
			assert.equal(SW.species.get('Meganium').tier, 'UU');
			assert.equal(SW.species.get('Quagsire').tier, 'UU');
			assert.equal(SW.species.get('Aipom').tier, 'UU');
		});

		it('gives each final name its demo twin\'s level-up moves', () => {
			for (const [kept, demo] of Object.entries(TWINS)) {
				const levelUp = id => {
					const learnset = SW.species.getLearnsetData(id).learnset;
					return Object.entries(learnset).map(([move, sources]) => [move, sources.filter(s => s.startsWith('2L'))])
						.filter(([, sources]) => sources.length).sort();
				};
				assert.deepEqual(levelUp(kept), levelUp(demo), kept);
			}
			assert(SW.species.getLearnsetData('smeargle').learnset.sketch.includes('2L1'));
		});

		it('only links evolutions between kept names', () => {
			const retired = new Set(Object.values(TWINS));
			for (const species of SW.species.all()) {
				if (species.isNonstandard || species.tier === 'Illegal') continue;
				for (const linked of [species.prevo, ...species.evos].filter(Boolean)) {
					assert(!retired.has(SW.species.get(linked).id), `${species.name} -> ${linked}`);
				}
			}
			assert.equal(SW.species.get('Flaaffy').prevo, 'Mareep');
			assert.equal(SW.species.get('Donphan').prevo, 'Phanpy');
			assert.deepEqual(SW.species.get('Spinarak').evos, ['Ariados']);
			assert.deepEqual(SW.species.get('Qwilfish').evos, ['Numpuff']);
			assert.deepEqual(SW.species.get('Aipom').evos, []);
			assert.equal(SW.species.get('Ariados').prevo, 'Spinarak');
			assert.equal(SW.species.get('Ariados').evoLevel, 23);
		});

		it('rejects the demo names and the Species Clause bypass', () => {
			assert(validate(OU, 'Happa', ['tackle']));
			assert(validate(UBERS, 'Tail', ['scratch']));
			assert(validate(UBERS, 'Painter', ['sketch']));
			const team = [set('Happa', ['tackle']), set('Chikorita', ['tackle'])];
			assert(TeamValidator.get(OU).validateTeam(team));
			assert.equal(validate(OU, 'Chikorita', ['tackle']), null);
			assert.equal(validate(OU, 'Aipom', ['scratch']), null);
		});

		it('keeps the Brick twins out of SpaceWorld Bricks', () => {
			assert(validate('gen2spaceworldbricks', 'Bobo', ['tackle']));
			assert.equal(validate('gen2spaceworldbricks', 'Noctowl', ['tackle']), null);
		});
	});

	describe('TM and HM tags', () => {
		it('never grants Sketch through TM01', () => {
			for (const [id, data] of Object.entries(SW_LEARNSETS)) {
				assert(!(data.learnset.sketch || []).includes('2M'), id);
			}
		});

		it('does not let TM01 Sketch unlock other moves', () => {
			assert(validate(OU, 'Aipom', ['spore']));
			assert(validate(OU, 'Meganium', ['spore', 'recover']));
			assert(validate(OU, 'Quagsire', ['lovelykiss']));
			assert(validate(OU, 'Donphan', ['spore']));
			assert(validate(OU, 'Smeargle', ['sketch']));
			assert(validate(UBERS, 'Smeargle', ['sketch']));
		});

		it('only tags SpaceWorld TM and HM moves as 2M', () => {
			assert.equal(Object.keys(SW_LEARNSETS).length, 266);
			for (const [id, data] of Object.entries(SW_LEARNSETS)) {
				for (const [move, sources] of Object.entries(data.learnset)) {
					if (sources.includes('2M')) assert(SW_TMS.has(move), `${id}: ${move}`);
				}
			}
		});

		it('follows the decomp tmhm bits', () => {
			assert.deepEqual(twoMoves('bulbasaur'), [
				'cottonspore', 'dynamicpunch', 'flamewheel', 'gigadrain', 'lockon', 'machpunch', 'magnitude', 'megaphone',
				'outrage', 'painsplit', 'powdersnow', 'sacredfire', 'snore', 'spite', 'uproot',
			]);
			assert.deepEqual(twoMoves('poliwag'), [
				'bellchime', 'bellydrum', 'cottonspore', 'flamewheel', 'lockon', 'machpunch', 'magnitude', 'megaphone',
				'painsplit', 'powdersnow', 'protect', 'sacredfire', 'scaryface', 'sludgebomb', 'spite', 'sweetkiss',
				'triplekick', 'watersport',
			]);
			assert.equal(twoMoves('magikarp').length, 56);
		});

		it('keeps Pikachu\'s RBY moves on Raichu', () => {
			assert.equal(validate(OU, 'Raichu', ['agility', 'quickattack', 'slam', 'lightscreen']), null);
			assert.equal(SW.species.get('Raichu').prevo, '');
		});
	});

	describe('gender', () => {
		it('uses the demo ratios', () => {
			for (const id of ['chansey', 'starmie', 'zapdos', 'mewtwo', 'mew', 'bulbasaur', 'chikorita', 'snorlax', 'clefairy']) {
				const species = SW.species.get(id);
				assert.equal(species.gender, '', id);
				assert.deepEqual(species.genderRatio, { M: 0.5, F: 0.5 }, id);
			}
			for (const id of ['magnemite', 'magneton', 'voltorb', 'electrode', 'ditto', 'porygon']) {
				const species = SW.species.get(id);
				assert.equal(species.gender, '', id);
				assert.deepEqual(species.genderRatio, { M: 0, F: 1 }, id);
			}
			for (const id of ['nidoranf', 'nidorina', 'nidoqueen', 'jynx', 'kangaskhan', 'rinring', 'snubbull']) {
				assert.equal(SW.species.get(id).gender, 'F', id);
				assert.deepEqual(SW.species.get(id).genderRatio, { M: 0, F: 1 }, id);
			}
			for (const id of ['nidoranm', 'nidorino', 'nidoking', 'hitmonlee', 'hitmonchan', 'elekid']) {
				assert.equal(SW.species.get(id).gender, 'M', id);
			}
		});

		it('derives gender from the Atk and Spe DVs like GetGender', () => {
			const validator = TeamValidator.get(OU);
			const queen = set('Nidoqueen', ['tackle']);
			assert.equal(validator.validateSet(queen, {}), null);
			assert.equal(queen.gender, 'M');
			const queen2 = set('Nidoqueen', ['tackle'], { ivs: dvs(15, 15, 14, 15) });
			assert.equal(validator.validateSet(queen2, {}), null);
			assert.equal(queen2.gender, 'F');
			const king = set('Nidoking', ['tackle'], { ivs: dvs(0, 15, 0, 15) });
			assert.equal(validator.validateSet(king, {}), null);
			assert.equal(king.gender, 'F');
			const magneton = set('Magneton', ['thundershock']);
			assert.equal(validator.validateSet(magneton, {}), null);
			assert.equal(magneton.gender, 'F');
			const snorlax = set('Snorlax', ['tackle'], { gender: 'F', ivs: dvs(7, 15, 15, 15) });
			assert.equal(validator.validateSet(snorlax, {}), null);
			assert(validate(OU, 'Snorlax', ['tackle'], { gender: 'F', ivs: dvs(8, 15, 15, 15) }));
		});

		it('leaves other Gen 2 formats on the GSC rule', () => {
			const snorlax = set('Snorlax', ['bodyslam'], { gender: 'F', ivs: dvs(7, 15, 15, 15) });
			assert(TeamValidator.get('gen2ou').validateSet(snorlax, {}));
			const queen = set('Nidoqueen', ['bodyslam']);
			assert.equal(TeamValidator.get('gen2ou').validateSet(queen, {}), null);
			assert.equal(queen.gender, 'F');
		});

		it('lets Attract infatuate a Pokemon that was genderless in the final games', () => {
			const validator = TeamValidator.get(UBERS);
			const queen = set('Nidoqueen', ['attract'], { ivs: dvs(14, 15, 15, 15) });
			const zapdos = set('Zapdos', ['thundershock'], { ivs: dvs(14, 15, 15, 15) });
			assert.equal(validator.validateSet(queen, {}), null);
			assert.equal(validator.validateSet(zapdos, {}), null);
			assert.equal(queen.gender, 'F');
			assert.equal(zapdos.gender, 'M');
			battle = common.createBattle({ formatid: UBERS, forceRandomChance: true }, [
				[{ ...queen, ability: 'No Ability' }],
				[{ ...zapdos, ability: 'No Ability' }],
			]);
			battle.makeChoices('move attract', 'move thundershock');
			assert(battle.p2.active[0].volatiles['attract']);
		});
	});

	describe('validator DV rules', () => {
		it('accepts SpaceWorld Hidden Power and ignores a typed Hidden Power choice', () => {
			assert.equal(validate('gen2spaceworldbricks', 'Noctowl', ['hiddenpower']), null);
			const typed = set('Noctowl', ['hiddenpower'], { hpType: 'Fire' });
			assert.equal(TeamValidator.get('gen2spaceworldbricks').validateSet(typed, {}), null);
			assert.deepEqual(typed.ivs, { hp: 30, atk: 30, def: 30, spa: 30, spd: 30, spe: 30 });
			assert.notEqual(typed.hpType, 'Fire');
		});

		it('still rewrites IVs for a typed Hidden Power in GSC', () => {
			const typed = set('Snorlax', ['hiddenpower'], { hpType: 'Fire', ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } });
			assert.equal(TeamValidator.get('gen2ou').validateSet(typed, {}), null);
			assert.equal(typed.hpType, 'Fire');
			assert.notEqual(typed.ivs.atk, 30);
		});

		it('reads a pasted typed Hidden Power as plain SpaceWorld Hidden Power', () => {
			const { Teams } = require('./../../../dist/sim/teams');
			const imported = () => ({ ...Teams.unpack(Teams.pack(Teams.import('Noctowl\nLevel: 100\n- Hidden Power [Fire]')))[0], ability: '' });
			const bricks = imported();
			assert.equal(TeamValidator.get('gen2spaceworldbricks').validateSet(bricks, {}), null);
			assert.deepEqual(bricks.moves, ['Hidden Power']);
			assert.equal(bricks.ivs.atk, 31);
			assert.equal(bricks.ivs.hp, 31);
			assert.equal(bricks.hpType, '???');
			assert.equal(TeamValidator.get('gen2spaceworldbricks').validateSet(bricks, {}), null);
			assert.equal(bricks.hpType, '???');
			battle = common.createBattle({ formatid: 'gen2spaceworldbricks' }, [[bricks], [mon('Snorlax', ['splash'])]]);
			assert.equal(battle.p1.active[0].hpType, '???');
			assert.match(battle.p1.activeRequest.active[0].moves[0].move, /^Hidden Power \?\?\? \d+$/);
			battle.destroy();
			battle = null;
			assert.equal(TeamValidator.get('gen2spaceworlddisguises').validateSet(imported(), {}), null);
			const ou = set('Snorlax', ['Hidden Power Fire']);
			const problems = TeamValidator.get(OU).validateSet(ou, {});
			assert(/^Hidden Power( \(|$)/.test(ou.moves[0]), ou.moves[0]);
			assert.deepEqual(ou.ivs, MAX_IVS);
			assert(problems.every(problem => !problem.includes('Fire')), problems.join('\n'));
			const withPP = set('Noctowl', ['Hidden Power [Ice] (24/3)']);
			assert.equal(TeamValidator.get('gen2spaceworldbricks').validateSet(withPP, {}), null);
			assert.deepEqual(withPP.moves, ['Hidden Power (24/3)']);
			const gsc = set('Snorlax', ['Hidden Power Fire'], { ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } });
			assert.equal(TeamValidator.get('gen2ou').validateSet(gsc, {}), null);
			assert.equal(gsc.hpType, 'Fire');
		});

		it('uses the demo shininess rule without forcing shininess', () => {
			assert.equal(validate(OU, 'Snorlax', ['tackle'], { shiny: true }), null);
			assert.equal(validate(OU, 'Snorlax', ['tackle']), null);
			assert(validate(OU, 'Snorlax', ['tackle'], { shiny: true, ivs: dvs(9, 15, 15, 15) }));
			assert.equal(validate(OU, 'Snorlax', ['tackle'], { ivs: dvs(2, 10, 10, 10) }), null);
			assert(TeamValidator.get('gen2ou').validateSet(set('Snorlax', ['bodyslam'], { shiny: true }), {}));
		});

		it('resolves the 5 Yen Coin item', () => {
			const coin = set('Noctowl', ['tackle'], { item: '5 Yen Coin' });
			assert.equal(TeamValidator.get('gen2spaceworlddisguises').validateSet(coin, {}), null);
			assert.equal(SW.items.get('5 Yen Coin').name, '5 Yen Coin');
		});
	});

	describe('move effects', () => {
		it('does not raise Defense while charging Skull Bash', () => {
			battle = common.createBattle({ formatid: OU, forceRandomChance: true }, [
				[mon('Blastoise', ['skullbash'])],
				[mon('Snorlax', ['splash'])],
			]);
			battle.makeChoices('move skullbash', 'move splash');
			assert.equal(battle.p1.active[0].boosts.def, 0);
			assert(battle.log.some(line => line.startsWith('|-prepare|p1a: Blastoise|Skull Bash')));
			battle.makeChoices('move skullbash', 'move splash');
			assert(battle.p2.active[0].hp < battle.p2.active[0].maxhp);
		});

		it('gives Minimize no Stomp weakness and Defense Curl no Rollout boost', () => {
			assert(!SW.moves.get('stomp').flags.minimize);
			battle = common.createBattle({ formatid: UBERS, forceRandomChance: true }, [
				[mon('Golem', ['defensecurl', 'rollout'])],
				[mon('Chansey', ['minimize', 'splash'])],
			]);
			battle.makeChoices('move defensecurl', 'move minimize');
			const golem = battle.p1.active[0];
			assert.equal(golem.boosts.def, 1);
			assert(!golem.volatiles['defensecurl']);
			assert(!battle.p2.active[0].volatiles['minimize']);
			const rollout = SW.moves.get('rollout');
			const active = battle.dex.getActiveMove('rollout');
			assert.equal(rollout.basePowerCallback.call(battle, golem, battle.p2.active[0], active), 30);
		});

		it('makes Water Sport a plain hit that Protect blocks', () => {
			battle = common.createBattle({ formatid: UBERS, forceRandomChance: true }, [
				[mon('Slowpoke', ['watersport', 'surf'])],
				[mon('Snorlax', ['protect', 'splash'])],
			]);
			const snorlax = battle.p2.active[0];
			battle.makeChoices('move watersport', 'move protect');
			battle.makeChoices('move watersport', 'move protect');
			assert.fullHP(snorlax);
			battle.makeChoices('move watersport', 'move splash');
			assert(snorlax.hp < snorlax.maxhp);
			assert(!snorlax.volatiles['watersport']);
			assert(!battle.field.pseudoWeather['watersport']);
		});

		it('lets Metronome call any move except itself, plus three empty slots', () => {
			battle = common.createBattle({ formatid: UBERS, forceRandomChance: true }, [
				[mon('Clefable', ['metronome', 'pound'])],
				[mon('Chansey', ['splash'])],
			]);
			const clefable = battle.p1.active[0];
			const onHit = SW.moves.get('metronome').onHit;
			const called = [];
			const realUseMove = battle.actions.useMove;
			const realRandom = battle.random;
			battle.actions.useMove = move => called.push(move);
			const pool = [...new Set(SW.moves.all().filter(m => !m.isNonstandard && m.id !== 'metronome').map(m => m.id))];
			try {
				for (const id of ['counter', 'protect', 'struggle', 'sketch', 'sleeptalk', 'mirrormove', 'thief', 'pound']) {
					assert(pool.includes(id), id);
					battle.random = () => pool.indexOf(id);
					onHit.call(battle, clefable);
				}
				battle.random = n => n - 1;
				onHit.call(battle, clefable);
			} finally {
				battle.actions.useMove = realUseMove;
				battle.random = realRandom;
			}
			assert(!pool.includes('metronome'));
			assert.equal(pool.length, 247);
			assert.deepEqual(called, ['counter', 'protect', 'struggle', 'sketch', 'sleeptalk', 'mirrormove', 'thief', 'pound']);
			assert(battle.log.includes('|-nothing'));
		});

		it('lets Mirror Move copy a move the user knows, but not after the foe slept', () => {
			battle = common.createBattle({ formatid: UBERS, forceRandomChance: true }, [
				[mon('Pidgeot', ['mirrormove', 'tackle'])],
				[mon('Snorlax', ['tackle'])],
			]);
			battle.makeChoices('move mirrormove', 'move tackle');
			let start = battle.log.length;
			battle.makeChoices('move mirrormove', 'move tackle');
			assert(battle.log.slice(start).some(line => line.startsWith('|move|p1a: Pidgeot|Tackle')));
			const snorlax = battle.p2.active[0];
			snorlax.setStatus('slp');
			snorlax.statusState.time = 5;
			battle.makeChoices('move mirrormove', 'move tackle');
			start = battle.log.length;
			battle.makeChoices('move mirrormove', 'move tackle');
			const turn = battle.log.slice(start);
			assert(!turn.some(line => line.startsWith('|move|p1a: Pidgeot|Tackle')), turn.join('\n'));
		});

		it('lets Mirror Move copy the move a Mirror Move copied', () => {
			battle = common.createBattle({ formatid: UBERS, forceRandomChance: true }, [
				[mon('Snorlax', ['mirrormove'])],
				[mon('Jolteon', ['tackle', 'mirrormove'])],
			]);
			battle.makeChoices('move mirrormove', 'move tackle');
			const start = battle.log.length;
			battle.makeChoices('move mirrormove', 'move mirrormove');
			const turn = battle.log.slice(start);
			assert(turn.some(line => line.startsWith('|move|p2a: Jolteon|Tackle')), turn.join('\n'));
			assert(turn.some(line => line.startsWith('|move|p1a: Snorlax|Tackle')), turn.join('\n'));
			assert(!turn.some(line => line.startsWith('|-fail|')), turn.join('\n'));
		});

		it('makes a mirrored empty Metronome slot do nothing', () => {
			battle = common.createBattle({ formatid: UBERS, forceRandomChance: true }, [
				[mon('Clefable', ['metronome'])],
				[mon('Jolteon', ['mirrormove'])],
			]);
			const realRandom = battle.random;
			battle.random = function (m, n) {
				if (m === 250 && n === undefined) return m - 1;
				return realRandom.call(this, m, n);
			};
			battle.makeChoices('move metronome', 'move mirrormove');
			battle.random = realRandom;
			assert.equal(battle.p1.active[0].m.sw97CounterMove.id, 'sw97unused');
			const start = battle.log.length;
			battle.makeChoices('move metronome', 'move mirrormove');
			const turn = battle.log.slice(start);
			const jolteon = turn.indexOf(turn.find(line => line.startsWith('|move|p2a: Jolteon|Mirror Move')));
			assert(jolteon >= 0, turn.join('\n'));
			assert.equal(turn[jolteon + 1], '|-nothing', turn.join('\n'));
		});

		it('lets Sleep Talk call a two-turn move and fail with one move', () => {
			battle = common.createBattle({ formatid: UBERS, forceRandomChance: true }, [
				[mon('Snorlax', ['sleeptalk', 'skullbash'])],
				[mon('Chansey', ['splash'])],
			]);
			const snorlax = battle.p1.active[0];
			snorlax.setStatus('slp');
			snorlax.statusState.time = 5;
			battle.makeChoices('move sleeptalk', 'move splash');
			assert(battle.log.some(line => line.startsWith('|move|p1a: Snorlax|Skull Bash')));
			battle.destroy();
			battle = common.createBattle({ formatid: UBERS, forceRandomChance: true }, [
				[mon('Snorlax', ['sleeptalk'])],
				[mon('Chansey', ['splash'])],
			]);
			battle.p1.active[0].setStatus('slp');
			battle.p1.active[0].statusState.time = 5;
			const start = battle.log.length;
			battle.makeChoices('move sleeptalk', 'move splash');
			assert(battle.log.slice(start).some(line => line.startsWith('|-fail|p1a: Snorlax')), battle.log.slice(start).join('\n'));
		});
	});
});
