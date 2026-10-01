'use strict';

const assert = require('./../../assert');
const common = require('./../../common');
const { Dex } = require('./../../../dist/sim/dex');
const { TeamValidator } = require('./../../../dist/sim/team-validator');

const FORMAT = 'gen2spaceworldou';

function mon(species, moves) {
	return {
		species, moves, ability: 'No Ability', level: 100,
		evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 },
		ivs: { hp: 30, atk: 30, def: 30, spa: 30, spd: 30, spe: 30 },
	};
}

function validate(species, moves, level = 100) {
	const set = {
		name: '', species, item: '', ability: '', moves, nature: '', gender: '', level,
		evs: { hp: 255, atk: 255, def: 255, spa: 255, spd: 255, spe: 255 },
		ivs: { hp: 30, atk: 30, def: 30, spa: 30, spd: 30, spe: 30 },
	};
	return TeamValidator.get(FORMAT).validateSet(set, {});
}

describe('[Gen 2] SpaceWorld', () => {
	let battle;
	afterEach(() => {
		if (battle) battle.destroy();
		battle = null;
	});

	describe('learnsets and the TM Clause', () => {
		it('accepts level-up moves stored under old move ids', () => {
			assert.equal(validate('Murkrow', ['Feint Attack']), null);
			assert.equal(validate('Krabby', ['Vise Grip']), null);
			assert.equal(validate('Hitmonlee', ['High Jump Kick']), null);
		});

		it('allows a TM move the Pokemon also learns another way', () => {
			assert.equal(validate('Clefable', ['Charm']), null);
			assert.equal(validate('Cloyster', ['Protect']), null);
		});

		it('rejects a move the Pokemon could only learn from a SpaceWorld TM', () => {
			assert(validate('Raichu', ['Charm']));
			assert(validate('Kabuto', ['Protect']));
			assert(validate('Eevee', ['Mud-Slap']));
		});

		it('counts a level-up move only from the level it is learned at', () => {
			assert(validate('Hitmonlee', ['Reversal'], 50));
			assert.equal(validate('Hitmonlee', ['Reversal'], 71), null);
		});

		it('stores every learnset move under its current id', () => {
			for (const learnsets of [Dex.data.Learnsets, Dex.mod('spaceworld').data.Learnsets]) {
				for (const [speciesid, data] of Object.entries(learnsets)) {
					for (const moveid of Object.keys(data.learnset || {})) {
						assert.equal(Dex.moves.get(moveid).id, moveid, `${speciesid}: ${moveid}`);
					}
				}
			}
		});

		it('gives Eevee no level-up moves of its own', () => {
			const learnset = Dex.mod('spaceworld').species.getLearnsetData('eevee').learnset;
			for (const sources of Object.values(learnset)) {
				assert(!sources.some(source => /^2L/.test(source)), sources.join(','));
			}
		});
	});

	describe('evolutions', () => {
		it('follows the demo evolution table', () => {
			const species = Dex.mod('spaceworld').species;
			assert.equal(species.get('Pidgeotto').prevo, '');
			assert.equal(species.get('Raichu').prevo, '');
			assert.equal(species.get('Bayleef').prevo, '');
			assert.equal(species.get('Twohead').prevo, 'Spinarak');
			assert.equal(species.get('Twohead').evoLevel, 23);
			assert.equal(species.get('Girafarig').prevo, 'Twinz');
			assert.equal(species.get('Vulpix').evoLevel, 13);
			assert.deepEqual(species.get('Pinsir').evos, ['Plux']);
			assert.equal(species.get('Crobat').evoType, undefined);
			assert.equal(species.get('Scizor').evoItem, undefined);
			assert.equal(species.get('Steelix').evoItem, undefined);
			assert.equal(species.get('Espeon').evoCondition, undefined);
		});
	});

	describe('damage', () => {
		it('lets fixed-damage moves hit Ghost types', () => {
			battle = common.createBattle({ formatid: FORMAT, forceRandomChance: true }, [
				[mon('Machamp', ['seismictoss'])],
				[mon('Gengar', ['splash'])],
			]);
			const gengar = battle.p2.active[0];
			battle.makeChoices('move seismictoss', 'move splash');
			assert.equal(gengar.maxhp - gengar.hp, 100);
		});

		it('lets Flail hit Ghost types', () => {
			battle = common.createBattle({ formatid: FORMAT, forceRandomChance: true }, [
				[mon('Magikarp', ['flail'])],
				[mon('Gengar', ['splash'])],
			]);
			const gengar = battle.p2.active[0];
			battle.makeChoices('move flail', 'move splash');
			assert(gengar.hp < gengar.maxhp);
		});
	});

	describe('Sandstorm', () => {
		it('damages a Pokemon right after its own move', () => {
			battle = common.createBattle({ formatid: FORMAT, forceRandomChance: true }, [
				[mon('Jolteon', ['splash'])],
				[mon('Golem', ['sandstorm'])],
			]);
			battle.makeChoices('move splash', 'move sandstorm');
			const start = battle.log.length;
			battle.makeChoices('move splash', 'move sandstorm');
			const turn = battle.log.slice(start);
			const move = turn.findIndex(line => line.startsWith('|move|p1a: Jolteon'));
			const chip = turn.findIndex(line => line.startsWith('|-damage|p1a: Jolteon'));
			const foeMove = turn.findIndex(line => line.startsWith('|move|p2a: Golem'));
			assert(move >= 0 && chip > move && chip < foeMove, turn.join('\n'));
		});

		it('skips the attacker\'s chip on the turn it scores a KO', () => {
			battle = common.createBattle({ formatid: FORMAT, forceRandomChance: true }, [
				[mon('Golem', ['splash']), mon('Jolteon', ['thunderbolt'])],
				[mon('Golem', ['sandstorm']), mon('Gyarados', ['splash']), mon('Snorlax', ['splash'])],
			]);
			battle.makeChoices('move splash', 'move sandstorm');
			battle.makeChoices('switch 2', 'switch 2');
			const jolteon = battle.p1.active[0];
			jolteon.sethp(Math.floor(jolteon.maxhp / 10));
			battle.p2.active[0].sethp(1);
			battle.makeChoices('move thunderbolt', 'move splash');
			battle.makeChoices('', 'switch 3');
			assert(jolteon.hp > 0);
		});
	});

	describe('Protect, Endure and Destiny Bond', () => {
		it('keeps Protect up until the foe has acted again', () => {
			battle = common.createBattle({ formatid: FORMAT, forceRandomChance: true }, [
				[mon('Blastoise', ['protect', 'surf'])],
				[mon('Jolteon', ['thunderbolt', 'splash'])],
			]);
			const blastoise = battle.p1.active[0];
			battle.makeChoices('move protect', 'move splash');
			battle.makeChoices('move surf', 'move thunderbolt');
			assert.fullHP(blastoise);
		});

		it('keeps Endure up until the foe has acted again', () => {
			battle = common.createBattle({ formatid: FORMAT, forceRandomChance: true }, [
				[mon('Blastoise', ['endure', 'surf'])],
				[mon('Jolteon', ['thunderbolt', 'splash'])],
			]);
			const blastoise = battle.p1.active[0];
			blastoise.sethp(20);
			battle.makeChoices('move endure', 'move splash');
			battle.makeChoices('move surf', 'move thunderbolt');
			assert.equal(blastoise.hp, 1);
		});

		it('ends Destiny Bond after the foe\'s next action', () => {
			battle = common.createBattle({ formatid: FORMAT, forceRandomChance: true }, [
				[mon('Jolteon', ['destinybond', 'splash'])],
				[mon('Raticate', ['quickattack', 'splash'])],
			]);
			battle.p1.active[0].sethp(10);
			battle.makeChoices('move destinybond', 'move splash');
			battle.makeChoices('move splash', 'move quickattack');
			assert.false.fainted(battle.p2.active[0]);
		});

		it('blocks field moves aimed past a protected foe', () => {
			battle = common.createBattle({ formatid: FORMAT, forceRandomChance: true }, [
				[mon('Jolteon', ['protect'])],
				[mon('Blastoise', ['raindance', 'spikes'])],
			]);
			battle.makeChoices('move protect', 'move raindance');
			assert.equal(battle.field.weather, '');
			battle.makeChoices('move protect', 'move spikes');
			assert(!battle.p1.sideConditions['spikes']);
		});
	});

	describe('Bide and Counter', () => {
		it('stores the damage taken plus the last damage dealt on each storing turn', () => {
			battle = common.createBattle({ formatid: FORMAT, forceRandomChance: true }, [
				[mon('Snorlax', ['bide'])],
				[mon('Jolteon', ['sonicboom'])],
			]);
			const jolteon = battle.p2.active[0];
			let turns = 0;
			do {
				battle.makeChoices('move bide', 'move sonicboom');
				turns++;
			} while (battle.p1.active[0].volatiles['bide'] && turns < 6);
			assert.equal(jolteon.maxhp - jolteon.hp, 80 * (turns - 1));
		});

		it('releases Bide through Protect and type immunity', () => {
			battle = common.createBattle({ formatid: FORMAT, forceRandomChance: true }, [
				[mon('Snorlax', ['bide'])],
				[mon('Gengar', ['sonicboom', 'protect'])],
			]);
			const gengar = battle.p2.active[0];
			battle.makeChoices('move bide', 'move sonicboom');
			battle.p1.active[0].volatiles['bide'].storing = 1;
			const hp = gengar.hp;
			battle.makeChoices('move bide', 'move protect');
			assert(gengar.hp < hp);
		});

		it('fails Counter after any move missed since the foe\'s attack', () => {
			battle = common.createBattle({ formatid: FORMAT, forceRandomChance: true }, [
				[mon('Snorlax', ['counter', 'sandattack', 'splash'])],
				[mon('Machamp', ['tackle'])],
			]);
			const machamp = battle.p2.active[0];
			battle.makeChoices('move splash', 'move tackle');
			machamp.setStatus('slp');
			machamp.statusState.time = 5;
			battle.forceRandomChance = false;
			battle.makeChoices('move sandattack', 'move tackle');
			battle.forceRandomChance = true;
			battle.makeChoices('move counter', 'move tackle');
			assert.fullHP(machamp);
		});

		it('fails Counter when the foe\'s last attack did no damage', () => {
			battle = common.createBattle({ formatid: FORMAT, forceRandomChance: true }, [
				[mon('Gengar', ['nightshade', 'counter'])],
				[mon('Machamp', ['tackle'])],
			]);
			const machamp = battle.p2.active[0];
			battle.makeChoices('move nightshade', 'move tackle');
			const hp = machamp.hp;
			battle.makeChoices('move counter', 'move tackle');
			assert.equal(machamp.hp, hp);
		});
	});

	describe('turn flow and the shared damage value', () => {
		it('runs residual damage after a Bide storing turn and after a failed Baton Pass', () => {
			battle = common.createBattle({ formatid: FORMAT, forceRandomChance: true }, [
				[mon('Snorlax', ['bide'])],
				[mon('Jolteon', ['batonpass'])],
			]);
			const snorlax = battle.p1.active[0];
			const jolteon = battle.p2.active[0];
			snorlax.setStatus('psn');
			jolteon.setStatus('psn');
			battle.makeChoices('move bide', 'move batonpass');
			const snorlaxHP = snorlax.hp;
			const jolteonHP = jolteon.hp;
			battle.makeChoices('move bide', 'move batonpass');
			assert(snorlax.volatiles['bide']);
			assert(snorlax.hp < snorlaxHP);
			assert(jolteon.hp < jolteonHP);
		});

		it('skips the Bide user\'s residual damage on the turn its release scores a KO', () => {
			battle = common.createBattle({ formatid: FORMAT, forceRandomChance: true }, [
				[mon('Jolteon', ['splash'])],
				[mon('Snorlax', ['bide'])],
			]);
			const snorlax = battle.p2.active[0];
			snorlax.setStatus('psn');
			battle.makeChoices('move splash', 'move bide');
			snorlax.volatiles['bide'].storing = 1;
			snorlax.volatiles['bide'].totalDamage = 500;
			battle.p1.active[0].sethp(5);
			const hp = snorlax.hp;
			battle.makeChoices('move splash', 'move bide');
			assert.fainted(battle.p1.active[0]);
			assert.equal(snorlax.hp, hp);
		});

		it('releases Bide into a Pokemon in the middle of Fly and keeps Bide through sleep', () => {
			battle = common.createBattle({ formatid: FORMAT, forceRandomChance: true }, [
				[mon('Snorlax', ['bide'])],
				[mon('Pidgeot', ['fly', 'gust'])],
			]);
			const snorlax = battle.p1.active[0];
			const pidgeot = battle.p2.active[0];
			battle.makeChoices('move bide', 'move gust');
			snorlax.setStatus('slp');
			snorlax.statusState.time = 2;
			battle.makeChoices('move bide', 'move gust');
			assert(snorlax.volatiles['bide']);
			snorlax.cureStatus();
			snorlax.volatiles['bide'].storing = 1;
			snorlax.volatiles['bide'].totalDamage = 50;
			const hp = pidgeot.hp;
			battle.makeChoices('move bide', 'move fly');
			assert(pidgeot.volatiles['fly']);
			assert(pidgeot.hp < hp);
		});

		it('keeps a missed multi-hit move\'s damage for Counter and halves it after a drain', () => {
			battle = common.createBattle({ formatid: FORMAT, forceRandomChance: false }, [
				[mon('Snorlax', ['counter'])],
				[mon('Machamp', ['doublekick'])],
			]);
			const machamp = battle.p2.active[0];
			battle.makeChoices('move counter', 'move doublekick');
			assert(machamp.hp < machamp.maxhp);

			battle.destroy();
			battle = common.createBattle({ formatid: FORMAT, forceRandomChance: true }, [
				[mon('Snorlax', ['counter'])],
				[mon('Scyther', ['leechlife'])],
			]);
			const snorlax = battle.p1.active[0];
			const scyther = battle.p2.active[0];
			battle.makeChoices('move counter', 'move leechlife');
			const dealt = snorlax.maxhp - snorlax.hp;
			assert.equal(scyther.maxhp - scyther.hp, 2 * Math.max(dealt >> 1, 1));
		});

		it('ends Bide when full paralysis costs the user a storing turn', () => {
			battle = common.createBattle({ formatid: FORMAT, forceRandomChance: true }, [
				[mon('Snorlax', ['bide'])],
				[mon('Jolteon', ['splash'])],
			]);
			const snorlax = battle.p1.active[0];
			battle.makeChoices('move bide', 'move splash');
			snorlax.setStatus('par');
			battle.makeChoices('move bide', 'move splash');
			assert(!snorlax.volatiles['bide']);
		});

		it('runs one round of residual damage, on the recipient, for a Baton Pass called by Sleep Talk', () => {
			battle = common.createBattle({ formatid: FORMAT, forceRandomChance: true }, [
				[mon('Snorlax', ['sleeptalk', 'batonpass']), mon('Chansey', ['splash'])],
				[mon('Golem', ['sandstorm', 'splash'])],
			]);
			const snorlax = battle.p1.active[0];
			battle.makeChoices('move sleeptalk', 'move sandstorm');
			snorlax.setStatus('slp');
			snorlax.statusState.time = 5;
			const hp = snorlax.hp;
			battle.makeChoices('move sleeptalk', 'move splash');
			battle.makeChoices('switch 2', '');
			assert.equal(snorlax.hp, hp);
			const chansey = battle.p1.active[0];
			assert.equal(chansey.maxhp - chansey.hp, Math.floor(chansey.maxhp / 8));
		});

		it('lets Counter answer a fixed-damage move, which has power in the demo', () => {
			battle = common.createBattle({ formatid: FORMAT, forceRandomChance: true }, [
				[mon('Snorlax', ['counter'])],
				[mon('Machamp', ['seismictoss'])],
			]);
			const machamp = battle.p2.active[0];
			battle.makeChoices('move counter', 'move seismictoss');
			assert.equal(machamp.maxhp - machamp.hp, 200);
		});

		it('only heals with Present\'s healing roll', () => {
			let heals = 0;
			for (let seed = 1; seed <= 20; seed++) {
				battle = common.createBattle({ formatid: FORMAT, seed: [seed, 4, 4, 4], forceRandomChance: true }, [
					[mon('Delibird', ['present'])],
					[mon('Gengar', ['splash'])],
				]);
				const gengar = battle.p2.active[0];
				gengar.sethp(100);
				battle.makeChoices('move present', 'move splash');
				if (gengar.hp > 100) {
					heals++;
					assert.equal(gengar.hp, 100 + Math.floor(gengar.maxhp / 4));
				} else {
					assert.equal(gengar.hp, 100);
				}
				battle.destroy();
				battle = null;
			}
			assert(heals > 0);
		});

		it('fails Pain Split against a substitute', () => {
			battle = common.createBattle({ formatid: FORMAT, forceRandomChance: true }, [
				[mon('Gengar', ['painsplit'])],
				[mon('Snorlax', ['splash'])],
			]);
			battle.p2.active[0].addVolatile('substitute');
			battle.p1.active[0].sethp(10);
			battle.makeChoices('move painsplit', 'move splash');
			assert.equal(battle.p1.active[0].hp, 10);
		});
	});

	describe('move formulas', () => {
		it('wraps Psywave\'s range at 8 bits and fails at level 171', () => {
			let highest = 0;
			for (let seed = 1; seed <= 30; seed++) {
				battle = common.createBattle({ formatid: 'gen2spaceworlddisguises', seed: [seed, 1, 1, 1], forceRandomChance: true }, [
					[{ ...mon('Alakazam', ['psywave']), level: 255 }],
					[mon('Snorlax', ['splash'])],
				]);
				const snorlax = battle.p2.active[0];
				battle.makeChoices('move psywave', 'move splash');
				highest = Math.max(highest, snorlax.maxhp - snorlax.hp);
				battle.destroy();
			}
			assert(highest > 0 && highest <= 125, `${highest}`);
			battle = common.createBattle({ formatid: 'gen2spaceworlddisguises', forceRandomChance: true }, [
				[{ ...mon('Alakazam', ['psywave']), level: 171 }],
				[mon('Snorlax', ['splash'])],
			]);
			battle.makeChoices('move psywave', 'move splash');
			assert.fullHP(battle.p2.active[0]);
		});

		it('works out Flail\'s power the demo\'s way at 256 max HP or more', () => {
			battle = common.createBattle({ formatid: FORMAT }, [
				[mon('Magikarp', ['flail'])],
				[mon('Snorlax', ['splash'])],
			]);
			const magikarp = battle.p1.active[0];
			const flail = Dex.mod('spaceworld').moves.get('flail');
			magikarp.maxhp = 999;
			magikarp.hp = 104;
			assert.equal(flail.basePowerCallback.call(battle, magikarp, battle.p2.active[0], flail), 100);
			magikarp.maxhp = 200;
			magikarp.hp = 4;
			assert.equal(flail.basePowerCallback.call(battle, magikarp, battle.p2.active[0], flail), 200);
		});

		it('fails an OHKO move against a faster or resisting target, whatever the levels', () => {
			battle = common.createBattle({ formatid: 'gen2spaceworlddisguises', forceRandomChance: true }, [
				[{ ...mon('Kingler', ['guillotine', 'fissure']), level: 80 }],
				[{ ...mon('Snorlax', ['splash']), level: 100 }, mon('Jolteon', ['splash'])],
			]);
			battle.makeChoices('move guillotine', 'move splash');
			assert.fainted(battle.p2.active[0]);
			battle.makeChoices('', 'switch 2');
			battle.makeChoices('move guillotine', 'move splash');
			assert.fullHP(battle.p2.active[0]);
		});

		it('lets type immunity stop confusion moves', () => {
			battle = common.createBattle({ formatid: FORMAT, forceRandomChance: true }, [
				[mon('Gengar', ['confuseray'])],
				[mon('Snorlax', ['splash'])],
			]);
			battle.makeChoices('move confuseray', 'move splash');
			assert(!battle.p2.active[0].volatiles['confusion']);
		});
	});

	describe('Morning Sun', () => {
		it('heals a random 128/255 to 255/255 of half the user\'s max HP', () => {
			const heals = new Set();
			let half = 0;
			for (let seed = 1; seed <= 8; seed++) {
				battle = common.createBattle({ formatid: FORMAT, seed: [seed, 2, 3, 4] }, [
					[mon('Espeon', ['morningsun'])],
					[mon('Snorlax', ['splash'])],
				]);
				const espeon = battle.p1.active[0];
				espeon.sethp(1);
				battle.makeChoices('move morningsun', 'move splash');
				half = Math.floor(espeon.maxhp / 2);
				const healed = espeon.hp - 1;
				assert(healed >= Math.floor(half * 128 / 255) && healed <= half, `${healed} of ${half}`);
				heals.add(healed);
				battle.destroy();
				battle = null;
			}
			assert(heals.size > 1, `always healed ${[...heals]} of ${half}`);
		});
	});
});
