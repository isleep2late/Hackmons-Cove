'use strict';

const assert = require('./../../assert');
const common = require('./../../common');
const { Dex } = require('./../../../dist/sim/dex');

const FORMAT = 'gen2spaceworldou';

function mon(species, moves, extra = {}) {
	return {
		species, moves, ability: 'No Ability', level: 100,
		evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 },
		ivs: { hp: 30, atk: 30, def: 30, spa: 30, spd: 30, spe: 30 },
		...extra,
	};
}

function start(teams, forceRandomChance = false, seed) {
	const options = { formatid: FORMAT, forceRandomChance };
	if (seed) options.seed = seed;
	return common.createBattle(options, teams);
}

function lines(battle, from) {
	return battle.log.slice(from).join('\n');
}

describe('[Gen 2] SpaceWorld engine', () => {
	let battle;
	afterEach(() => {
		if (battle) battle.destroy();
		battle = null;
	});

	describe('stored battle stats (Gen 1 recalculation quirks)', () => {
		it('applies the paralysis and burn penalties once when inflicted', () => {
			battle = start([[mon('Jolteon', ['splash'])], [mon('Snorlax', ['splash'])]]);
			const jolteon = battle.p1.active[0];
			const snorlax = battle.p2.active[0];
			jolteon.setStatus('par');
			snorlax.setStatus('brn');
			assert.equal(jolteon.getStat('spe'), Math.floor(jolteon.storedStats.spe / 4));
			assert.equal(snorlax.getStat('atk'), Math.floor(snorlax.storedStats.atk / 2));
		});

		it('a stat raise drops the user\'s own paralysis penalty and stacks the foe\'s', () => {
			battle = start([[mon('Jolteon', ['agility'])], [mon('Raichu', ['splash'])]]);
			const jolteon = battle.p1.active[0];
			const raichu = battle.p2.active[0];
			jolteon.setStatus('par');
			raichu.setStatus('par');
			battle.makeChoices('move agility', 'move splash');
			assert.equal(jolteon.boosts.spe, 2);
			assert.equal(jolteon.getStat('spe'), Math.min(999, jolteon.storedStats.spe * 2));
			assert.equal(raichu.getStat('spe'), Math.floor(Math.floor(raichu.storedStats.spe / 4) / 4));
		});

		it('a stat raise halves a burned foe\'s Attack again and restores the user\'s own', () => {
			battle = start([[mon('Scyther', ['swordsdance'])], [mon('Snorlax', ['splash'])]]);
			const scyther = battle.p1.active[0];
			const snorlax = battle.p2.active[0];
			scyther.setStatus('brn');
			snorlax.setStatus('brn');
			battle.makeChoices('move swordsdance', 'move splash');
			assert.equal(scyther.getStat('atk'), Math.min(999, scyther.storedStats.atk * 2));
			assert.equal(snorlax.getStat('atk'), Math.floor(Math.floor(snorlax.storedStats.atk / 2) / 2));
		});

		it('stat raises that do not recalculate (evasion, Special Defense) still stack the foe\'s penalty', () => {
			battle = start([[mon('Mr. Mime', ['splash'])], [mon('Raichu', ['splash'])]]);
			const mime = battle.p1.active[0];
			const raichu = battle.p2.active[0];
			raichu.setStatus('par');
			battle.boost({ spd: 2 }, mime, mime, battle.dex.getActiveMove('amnesia'));
			assert.equal(mime.getStat('spd'), mime.storedStats.spd);
			assert.equal(raichu.getStat('spe'), Math.floor(Math.floor(raichu.storedStats.spe / 4) / 4));
		});

		it('Swagger\'s raise recalculates the target\'s Attack and penalises the Swagger user', () => {
			battle = start([[mon('Snorlax', ['splash'])], [mon('Machamp', ['splash'])]]);
			const snorlax = battle.p1.active[0];
			const machamp = battle.p2.active[0];
			snorlax.setStatus('brn');
			machamp.setStatus('brn');
			battle.boost({ atk: 2 }, machamp, snorlax, battle.dex.getActiveMove('swagger'));
			assert.equal(machamp.getStat('atk'), Math.min(999, machamp.storedStats.atk * 2));
			assert.equal(snorlax.getStat('atk'), Math.floor(Math.floor(snorlax.storedStats.atk / 2) / 2));
		});

		it('a stat drop recalculates from the unmodified stat and re-applies only the burn penalty', () => {
			battle = start([[mon('Snorlax', ['splash'])], [mon('Machamp', ['splash'])]]);
			const snorlax = battle.p1.active[0];
			const machamp = battle.p2.active[0];
			machamp.setStatus('brn');
			battle.boost({ atk: -1 }, machamp, snorlax, battle.dex.getActiveMove('growl'));
			assert.equal(machamp.getStat('atk'), Math.floor(Math.floor(machamp.storedStats.atk * 66 / 100) / 2));
			machamp.cureStatus();
			snorlax.setStatus('par');
			battle.boost({ spe: -1 }, snorlax, machamp, battle.dex.getActiveMove('stringshot'));
			assert.equal(snorlax.getStat('spe'), Math.floor(snorlax.storedStats.spe * 66 / 100));
		});

		it('a raise fails when the stored stat is already 999', () => {
			battle = start([[mon('Jolteon', ['splash'])], [mon('Snorlax', ['splash'])]]);
			const jolteon = battle.p1.active[0];
			battle.boost({ spe: 6 }, jolteon, jolteon, battle.dex.getActiveMove('agility'));
			battle.boost({ spe: -3 }, jolteon, jolteon, battle.dex.getActiveMove('stringshot'));
			assert.equal(jolteon.boosts.spe, 3);
			jolteon.m.sw97Stats.spe = 999;
			assert.equal(battle.boost({ spe: 1 }, jolteon, jolteon, battle.dex.getActiveMove('agility')), null);
			assert.equal(jolteon.boosts.spe, 3);
		});

		it('a raise or drop that fails at the stat cap still moves the stage by all but one', () => {
			battle = start([[mon('Machamp', ['splash'])], [mon('Snorlax', ['splash'])]]);
			const machamp = battle.p1.active[0];
			battle.boost({ atk: 4 }, machamp, machamp, battle.dex.getActiveMove('swordsdance'));
			machamp.m.sw97Stats.atk = 999;
			assert.equal(battle.boost({ atk: 2 }, machamp, machamp, battle.dex.getActiveMove('swordsdance')), null);
			assert.equal(machamp.boosts.atk, 5);
			assert.equal(machamp.getStat('atk'), 999);
			battle.boost({ atk: 1 }, machamp, machamp, battle.dex.getActiveMove('sharpen'));
			assert.equal(machamp.boosts.atk, 5);
			battle.boost({ atk: 1 }, machamp, machamp, battle.dex.getActiveMove('sharpen'));
			assert.equal(machamp.boosts.atk, 5);
			machamp.boosts.atk = 6;
			battle.boost({ atk: 2 }, machamp, machamp, battle.dex.getActiveMove('swordsdance'));
			assert.equal(machamp.boosts.atk, 6);
			machamp.boosts.def = -4;
			machamp.m.sw97Stats.def = 1;
			assert.equal(battle.boost({ def: -2 }, machamp, machamp, battle.dex.getActiveMove('screech')), null);
			assert.equal(machamp.boosts.def, -5);
			assert.equal(machamp.getStat('def'), 1);
		});

		it('curing paralysis does not restore Speed until the stat is recalculated', () => {
			battle = start([[mon('Jolteon', ['splash'])], [mon('Snorlax', ['splash'])]]);
			const jolteon = battle.p1.active[0];
			jolteon.setStatus('par');
			jolteon.cureStatus();
			assert.equal(jolteon.getStat('spe'), Math.floor(jolteon.storedStats.spe / 4));
		});

		it('Haze resets both Pokemon to their unmodified stats', () => {
			battle = start([[mon('Jolteon', ['agility', 'haze'])], [mon('Snorlax', ['splash'])]]);
			const jolteon = battle.p1.active[0];
			const snorlax = battle.p2.active[0];
			jolteon.setStatus('par');
			snorlax.setStatus('brn');
			battle.makeChoices('move agility', 'move splash');
			battle.makeChoices('move haze', 'move splash');
			assert.equal(jolteon.getStat('spe'), jolteon.storedStats.spe);
			assert.equal(snorlax.getStat('atk'), snorlax.storedStats.atk);
		});

		it('a normal switch-in applies the penalty; a Baton Pass recipient loses it and gets its passed stages', () => {
			battle = start([
				[mon('Jolteon', ['agility', 'amnesia', 'batonpass']), mon('Raichu', ['splash']), mon('Electrode', ['splash'])],
				[mon('Snorlax', ['splash'])],
			]);
			const raichu = battle.p1.pokemon[1];
			const electrode = battle.p1.pokemon[2];
			raichu.status = 'par';
			electrode.status = 'par';
			battle.makeChoices('move agility', 'move splash');
			battle.makeChoices('move amnesia', 'move splash');
			battle.makeChoices('move batonpass', 'move splash');
			battle.makeChoices('switch 2', '');
			assert.equal(battle.p1.active[0], raichu);
			assert.equal(raichu.getStat('spe'), Math.min(999, raichu.storedStats.spe * 2));
			assert.equal(raichu.getStat('spd'), Math.min(999, raichu.storedStats.spd * 2));
			battle.makeChoices('switch 3', 'move splash');
			assert.equal(battle.p1.active[0], electrode);
			assert.equal(electrode.getStat('spe'), Math.floor(electrode.storedStats.spe / 4));
		});

		it('critical hits use the unmodified stats', () => {
			battle = start([[mon('Machamp', ['splash'])], [mon('Snorlax', ['splash'])]]);
			const machamp = battle.p1.active[0];
			machamp.setStatus('brn');
			assert.equal(machamp.getStat('atk', true, true), machamp.storedStats.atk);
			assert.equal(machamp.getStat('atk'), Math.floor(machamp.storedStats.atk / 2));
		});
	});

	describe('confusion self-hit behind a Substitute', () => {
		function confusedSetup() {
			battle = start([[mon('Snorlax', ['splash'])], [mon('Gengar', ['splash'])]]);
			const snorlax = battle.p1.active[0];
			const gengar = battle.p2.active[0];
			snorlax.addVolatile('confusion');
			snorlax.volatiles['confusion'].time = 5;
			return { snorlax, gengar };
		}

		it('damages the foe\'s substitute instead of the confused Pokemon', () => {
			const { snorlax, gengar } = confusedSetup();
			snorlax.addVolatile('substitute');
			gengar.addVolatile('substitute');
			gengar.volatiles['substitute'].hp = 200;
			const hp = snorlax.hp;
			const ownSub = snorlax.volatiles['substitute'].hp;
			battle.makeChoices('move splash', 'move splash');
			assert.equal(snorlax.hp, hp);
			assert.equal(snorlax.volatiles['substitute'].hp, ownSub);
			assert.equal(gengar.volatiles['substitute'].hp, 200 - battle.lastDamage);
		});

		it('breaks the foe\'s substitute when the damage exceeds it', () => {
			const { snorlax, gengar } = confusedSetup();
			snorlax.addVolatile('substitute');
			gengar.addVolatile('substitute');
			gengar.volatiles['substitute'].hp = 1;
			battle.makeChoices('move splash', 'move splash');
			assert(!gengar.volatiles['substitute']);
		});

		it('changes nothing when only the confused Pokemon has a substitute', () => {
			const { snorlax, gengar } = confusedSetup();
			snorlax.addVolatile('substitute');
			const hp = snorlax.hp;
			battle.makeChoices('move splash', 'move splash');
			assert.equal(snorlax.hp, hp);
			assert.equal(gengar.hp, gengar.maxhp);
		});

		it('still hurts a confused Pokemon that has no substitute', () => {
			const { snorlax } = confusedSetup();
			const hp = snorlax.hp;
			battle.makeChoices('move splash', 'move splash');
			assert.equal(snorlax.hp, hp - battle.lastDamage);
		});
	});

	describe('Encore', () => {
		it('does not replace the move the target already chose this turn', () => {
			battle = start([[mon('Jolteon', ['encore', 'splash'])], [mon('Snorlax', ['harden', 'splash'])]], true);
			battle.makeChoices('move splash', 'move harden');
			const from = battle.log.length;
			battle.makeChoices('move encore', 'move splash');
			assert(lines(battle, from).includes('|move|p2a: Snorlax|Splash'));
		});

		it('locks the move the target used later in the Encore turn', () => {
			battle = start([[mon('Jolteon', ['encore', 'splash'])], [mon('Snorlax', ['splash', 'harden'])]], true);
			battle.makeChoices('move splash', 'move splash');
			battle.makeChoices('move encore', 'move harden');
			const snorlax = battle.p2.active[0];
			assert(snorlax.volatiles['encore']);
			const moves = battle.p2.activeRequest.active[0].moves;
			assert(moves.find(m => m.id === 'splash').disabled);
			assert(!moves.find(m => m.id === 'harden').disabled);
			const from = battle.log.length;
			battle.makeChoices('move splash', 'move harden');
			assert(lines(battle, from).includes('|move|p2a: Snorlax|Harden'));
			assert(!lines(battle, from).includes('|move|p2a: Snorlax|Splash'));
		});

		it('can lock in the move a Mirror Move copied, spending Mirror Move\'s PP', () => {
			battle = start([[mon('Jolteon', ['mirrormove', 'splash'])], [mon('Slowbro', ['encore', 'harden'])]], true);
			const jolteon = battle.p1.active[0];
			battle.makeChoices('move splash', 'move harden');
			battle.makeChoices('move mirrormove', 'move encore');
			assert(jolteon.volatiles['encore']);
			const pp = jolteon.getMoveData('mirrormove').pp;
			const from = battle.log.length;
			battle.makeChoices('move mirrormove', 'move harden');
			assert(lines(battle, from).includes('|move|p1a: Jolteon|Harden'));
			assert.equal(jolteon.getMoveData('mirrormove').pp, pp - 1);
		});

		it('can encore Encore itself', () => {
			battle = start([[mon('Jolteon', ['encore', 'splash'])], [mon('Slowbro', ['encore', 'splash'])]], true);
			const jolteon = battle.p1.active[0];
			battle.makeChoices('move encore', 'move encore');
			assert(jolteon.volatiles['encore']);
			assert.equal(jolteon.volatiles['encore'].move, 'encore');
		});

		it('ends after the target spends a turn asleep', () => {
			battle = start([[mon('Jolteon', ['encore', 'splash'])], [mon('Snorlax', ['harden', 'splash'])]], true);
			const snorlax = battle.p2.active[0];
			battle.makeChoices('move splash', 'move harden');
			battle.makeChoices('move encore', 'move splash');
			assert(snorlax.volatiles['encore']);
			snorlax.setStatus('slp');
			snorlax.statusState.time = 5;
			battle.makeChoices('move splash', 'move splash');
			assert(!snorlax.volatiles['encore']);
		});

		it('fails against a target whose last turn was spent asleep', () => {
			battle = start([[mon('Slowbro', ['encore'])], [mon('Jolteon', ['splash'])]], true);
			const jolteon = battle.p2.active[0];
			jolteon.setStatus('slp');
			jolteon.statusState.time = 5;
			battle.makeChoices('move encore', 'move splash');
			assert(!jolteon.volatiles['encore']);
		});
	});

	describe('Disable', () => {
		it('sets a counter of 1 to 8', () => {
			const seen = new Set();
			for (let i = 1; i <= 40; i++) {
				battle = start([[mon('Slowbro', ['disable', 'splash'])], [mon('Jolteon', ['harden', 'splash'])]],
					true, [i, i * 3, i * 7, i * 11]);
				battle.makeChoices('move splash', 'move harden');
				battle.makeChoices('move disable', 'move splash');
				const volatile = battle.p2.active[0].volatiles['disable'];
				assert(volatile, `seed ${i}`);
				assert(volatile.counter >= 1 && volatile.counter <= 8);
				seen.add(volatile.counter);
				battle.destroy();
			}
			battle = null;
			assert(seen.size > 4);
		});

		it('counts down only on real move attempts and re-enables the move at 0', () => {
			battle = start([[mon('Jolteon', ['disable', 'splash'])], [mon('Snorlax', ['harden', 'splash'])]], true);
			const snorlax = battle.p2.active[0];
			battle.makeChoices('move splash', 'move harden');
			battle.makeChoices('move disable', 'move splash');
			const volatile = snorlax.volatiles['disable'];
			assert.equal(volatile.move, 'harden');
			volatile.counter = 2;
			snorlax.setStatus('slp');
			snorlax.statusState.time = 3;
			battle.makeChoices('move splash', 'move splash');
			battle.makeChoices('move splash', 'move splash');
			assert.equal(snorlax.volatiles['disable'].counter, 2);
			snorlax.cureStatus();
			battle.makeChoices('move splash', 'move splash');
			assert.equal(snorlax.volatiles['disable'].counter, 1);
			battle.makeChoices('move splash', 'move splash');
			assert(!snorlax.volatiles['disable']);
			const from = battle.log.length;
			battle.makeChoices('move splash', 'move harden');
			assert(lines(battle, from).includes('|move|p2a: Snorlax|Harden'));
		});

		it('does not last a fixed number of end-of-turn ticks', () => {
			battle = start([[mon('Jolteon', ['disable', 'splash'])], [mon('Snorlax', ['harden', 'splash'])]], true);
			const snorlax = battle.p2.active[0];
			battle.makeChoices('move splash', 'move harden');
			battle.makeChoices('move disable', 'move splash');
			snorlax.volatiles['disable'].counter = 8;
			for (let i = 0; i < 6; i++) battle.makeChoices('move splash', 'move splash');
			assert.equal(snorlax.volatiles['disable'].counter, 2);
		});
	});

	describe('Safeguard', () => {
		it('does not stop confusion but still blocks paralysis', () => {
			battle = start([[mon('Jolteon', ['supersonic', 'thunderwave', 'splash'])], [mon('Snorlax', ['safeguard', 'splash'])]], true);
			const snorlax = battle.p2.active[0];
			battle.makeChoices('move splash', 'move safeguard');
			battle.makeChoices('move thunderwave', 'move splash');
			assert.equal(snorlax.status, '');
			battle.makeChoices('move supersonic', 'move splash');
			assert(snorlax.volatiles['confusion']);
		});
	});

	describe('Attract', () => {
		it('treats genderless Pokemon as female, goes through Protect, and outlasts the attracter', () => {
			battle = start([
				[mon('Nidoking', ['attract']), mon('Snorlax', ['splash'])],
				[mon('Starmie', ['protect', 'splash'])],
			], true);
			const starmie = battle.p2.active[0];
			battle.p1.active[0].gender = 'M';
			starmie.gender = 'N';
			battle.makeChoices('move attract', 'move protect');
			assert(starmie.volatiles['attract']);
			battle.makeChoices('switch 2', 'move splash');
			assert(starmie.volatiles['attract']);
		});

		it('ignores accuracy and evasion', () => {
			for (let i = 1; i <= 20; i++) {
				battle = start([[mon('Nidoking', ['attract'])], [mon('Nidoqueen', ['splash'])]], false, [i, 2 * i, 3 * i, 4 * i]);
				battle.p1.active[0].gender = 'M';
				battle.p2.active[0].gender = 'F';
				battle.p2.active[0].boosts.evasion = 6;
				battle.makeChoices('move attract', 'move splash');
				assert(battle.p2.active[0].volatiles['attract'], `seed ${i}`);
				battle.destroy();
			}
			battle = null;
		});

		it('still fails against a target using Fly', () => {
			battle = start([[mon('Snorlax', ['attract'])], [mon('Pidgeot', ['fly'])]], true);
			battle.p1.active[0].gender = 'M';
			battle.p2.active[0].gender = 'F';
			battle.makeChoices('move attract', 'move fly');
			assert(!battle.p2.active[0].volatiles['attract']);
		});

		it('is passed by Baton Pass', () => {
			let passed = 0;
			for (let i = 1; i <= 12; i++) {
				battle = start([
					[mon('Snorlax', ['attract', 'splash'])],
					[mon('Nidoqueen', ['batonpass', 'splash']), mon('Jynx', ['splash'])],
				], false, [i, 7 * i, 11 * i, 13 * i]);
				battle.p1.active[0].gender = 'M';
				battle.p2.active[0].gender = 'F';
				battle.makeChoices('move attract', 'move splash');
				assert(battle.p2.active[0].volatiles['attract']);
				battle.makeChoices('move splash', 'move batonpass');
				if (battle.p2.requestState === 'switch') {
					battle.makeChoices('', 'switch 2');
					assert.equal(battle.p2.active[0].species.name, 'Jynx');
					assert(battle.p2.active[0].volatiles['attract']);
					passed++;
				}
				battle.destroy();
			}
			battle = null;
			assert(passed > 0);
		});

		it('fails between two Pokemon that count as the same gender', () => {
			battle = start([[mon('Nidoqueen', ['attract'])], [mon('Starmie', ['splash'])]], true);
			battle.p1.active[0].gender = 'F';
			battle.p2.active[0].gender = 'N';
			battle.makeChoices('move attract', 'move splash');
			assert(!battle.p2.active[0].volatiles['attract']);
		});
	});

	describe('recoil and drain against a substitute', () => {
		it('recoil uses the full computed damage, not the HP the substitute lost', () => {
			battle = start([[mon('Tauros', ['doubleedge'])], [mon('Snorlax', ['splash'])]], true);
			const tauros = battle.p1.active[0];
			const snorlax = battle.p2.active[0];
			snorlax.addVolatile('substitute');
			snorlax.volatiles['substitute'].hp = 54;
			battle.makeChoices('move doubleedge', 'move splash');
			assert(!snorlax.volatiles['substitute']);
			assert(battle.lastDamage > 54);
			assert.equal(tauros.maxhp - tauros.hp, Math.floor(battle.lastDamage / 4));
		});

		it('drain heals half the full computed damage, rounded down, at least 1', () => {
			battle = start([[mon('Venusaur', ['megadrain'])], [mon('Snorlax', ['splash'])]], true);
			const venusaur = battle.p1.active[0];
			const snorlax = battle.p2.active[0];
			venusaur.sethp(1);
			snorlax.addVolatile('substitute');
			snorlax.volatiles['substitute'].hp = 5;
			battle.makeChoices('move megadrain', 'move splash');
			const healed = venusaur.hp - 1;
			assert(!snorlax.volatiles['substitute']);
			assert(healed > 3);
			assert.equal(healed, battle.lastDamage);
		});
	});

	describe('held items', () => {
		it('Sharp Scythe adds 30 to the critical hit chance', () => {
			const chances = [];
			for (const item of ['', 'sharpscythe']) {
				battle = common.createBattle({ formatid: 'gen2spaceworlddisguises' }, [
					[mon('Jolteon', ['tackle'], { item })], [mon('Snorlax', ['splash'])],
				]);
				const calls = [];
				battle.randomChance = (n, d) => {
					calls.push([n, d]);
					return true;
				};
				battle.actions.getDamage(battle.p1.active[0], battle.p2.active[0], battle.dex.getActiveMove('tackle'), true);
				chances.push(calls[0][0]);
				battle.destroy();
			}
			battle = null;
			assert.equal(chances[1], Math.min(255, chances[0] + 30));
		});

		it('Strange Thread subtracts 30 from the 0-255 accuracy', () => {
			battle = common.createBattle({ formatid: 'gen2spaceworlddisguises' }, [
				[mon('Jolteon', ['thunder'])], [mon('Snorlax', ['splash'], { item: 'strangethread' })],
			]);
			const calls = [];
			battle.randomChance = (n, d) => {
				calls.push([n, d]);
				return false;
			};
			battle.makeChoices('move thunder', 'move splash');
			assert(calls.some(([n, d]) => n === 148 && d === 256), JSON.stringify(calls));
		});

		it('Detect Orb and Fire Wing are used up at the start of the first turn for +1', () => {
			battle = common.createBattle({ formatid: 'gen2spaceworlddisguises' }, [
				[mon('Jolteon', ['splash'], { item: 'detectorb' })], [mon('Raichu', ['splash'], { item: 'firewing' })],
			]);
			const jolteon = battle.p1.active[0];
			const raichu = battle.p2.active[0];
			jolteon.setStatus('par');
			battle.makeChoices('move splash', 'move splash');
			assert.equal(jolteon.boosts.evasion, 1);
			assert.equal(raichu.boosts.spa, 1);
			assert.equal(jolteon.item, '');
			assert.equal(raichu.item, '');
			assert.equal(jolteon.getStat('spe'), Math.floor(Math.floor(jolteon.storedStats.spe / 4) / 4));
		});

		it('Apple is eaten only below half HP', () => {
			battle = common.createBattle({ formatid: 'gen2spaceworlddisguises' }, [
				[mon('Snorlax', ['splash'], { item: 'apple' })], [mon('Jolteon', ['splash'])],
			]);
			const snorlax = battle.p1.active[0];
			snorlax.maxhp = 400;
			snorlax.hp = 200;
			battle.makeChoices('move splash', 'move splash');
			assert.equal(snorlax.item, 'apple');
			snorlax.hp = 199;
			battle.makeChoices('move splash', 'move splash');
			assert.equal(snorlax.item, '');
		});
	});

	describe('healing moves', () => {
		it('Softboiled fails at exactly 255 below a max HP with a higher high byte', () => {
			battle = start([[mon('Chansey', ['softboiled'])], [mon('Snorlax', ['splash'])]], true);
			const chansey = battle.p1.active[0];
			chansey.maxhp = 703;
			chansey.hp = 448;
			battle.makeChoices('move softboiled', 'move splash');
			assert.equal(chansey.hp, 448);
			chansey.hp = 447;
			battle.makeChoices('move softboiled', 'move splash');
			assert(chansey.hp > 447);
		});

		it('Rest fails at full HP and at the 255 below max bug', () => {
			battle = start([[mon('Snorlax', ['rest'])], [mon('Jolteon', ['splash'])]], true);
			const snorlax = battle.p1.active[0];
			snorlax.setStatus('par');
			battle.makeChoices('move rest', 'move splash');
			assert.equal(snorlax.status, 'par');
			snorlax.maxhp = 523;
			snorlax.hp = 268;
			battle.makeChoices('move rest', 'move splash');
			assert.equal(snorlax.status, 'par');
			assert.equal(snorlax.hp, 268);
		});

		it('Sleep Talk calling Rest while asleep resets sleep to 2 turns and heals fully', () => {
			battle = start([[mon('Snorlax', ['rest', 'sleeptalk'])], [mon('Jolteon', ['splash'])]], true);
			const snorlax = battle.p1.active[0];
			snorlax.sethp(300);
			snorlax.setStatus('slp');
			snorlax.statusState.time = 6;
			battle.makeChoices('move sleeptalk', 'move splash');
			assert.equal(snorlax.hp, snorlax.maxhp);
			assert.equal(snorlax.status, 'slp');
			assert.equal(snorlax.statusState.time, 2);
		});
	});

	it('leaves the stat model of other Gen 2 formats alone', () => {
		battle = common.createBattle({ formatid: 'gen2ou' }, [[mon('Jolteon', ['agility'])], [mon('Raichu', ['splash'])]]);
		const jolteon = battle.p1.active[0];
		const raichu = battle.p2.active[0];
		jolteon.setStatus('par');
		raichu.setStatus('par');
		const raichuSpeed = raichu.getStat('spe');
		assert.equal(raichu.m.sw97Stats, undefined);
		assert.equal(Dex.mod('gen2').data.Scripts.pokemon.boostBy === Dex.mod('spaceworld').data.Scripts.pokemon.boostBy, false);
		assert.equal(raichu.getStat('spe'), raichuSpeed);
	});
});
