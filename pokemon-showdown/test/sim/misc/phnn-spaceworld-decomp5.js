'use strict';

const assert = require('./../../assert');
const common = require('./../../common');
const { Dex } = require('./../../../dist/sim/dex');

const FORMAT = 'gen2spaceworldou';
const GEN2 = 'gen2ou';

function mon(species, moves, extra = {}) {
	return {
		species, moves, ability: 'No Ability', level: 100,
		evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 },
		ivs: { hp: 30, atk: 30, def: 30, spa: 30, spd: 30, spe: 30 },
		...extra,
	};
}

function create(teams, formatid = FORMAT, seed = [1, 2, 3, 4]) {
	const battle = common.createBattle({ formatid, seed }, teams);
	battle.randomChance = numerator => numerator >= 200;
	return battle;
}

function turnLog(battle, run) {
	const start = battle.log.length;
	run();
	return battle.log.slice(start).filter(line => !line.startsWith('|t:') && line !== '|');
}

function pp(pokemon, id) {
	return pokemon.baseMoveSlots.find(slot => slot.id === id).pp;
}

function emptyPP(pokemon) {
	for (const slot of pokemon.moveSlots) slot.pp = 0;
}

describe('[Gen 2] SpaceWorld decomp fixes, round 5', () => {
	let battle;
	afterEach(() => {
		if (battle) battle.destroy();
		battle = null;
	});

	describe('Struggle is Normal-typed', () => {
		it('cannot hit a Ghost-type, and the user takes no recoil', () => {
			battle = create([[mon('Snorlax', ['tackle'])], [mon('Gengar', ['splash'])]]);
			const [snorlax, gengar] = [battle.p1.active[0], battle.p2.active[0]];
			emptyPP(snorlax);
			const log = turnLog(battle, () => battle.makeChoices('move 1', 'move splash'));
			assert(log.some(line => line.startsWith('|move|p1a: Snorlax|Struggle')), log.join('\n'));
			assert(log.some(line => line.startsWith('|-immune|p2a: Gengar')), log.join('\n'));
			assert.fullHP(gengar);
			assert.fullHP(snorlax);
		});

		it('is resisted by Rock-types and gets the same-type bonus', () => {
			battle = create([[mon('Snorlax', ['tackle'])], [mon('Onix', ['splash'])]]);
			const [snorlax, onix] = [battle.p1.active[0], battle.p2.active[0]];
			emptyPP(snorlax);
			const log = turnLog(battle, () => battle.makeChoices('move 1', 'move splash'));
			assert(log.some(line => line.startsWith('|-resisted|p2a: Onix')), log.join('\n'));
			assert.false.fullHP(onix);
			const struggle = battle.dex.getActiveMove('struggle');
			assert.equal(struggle.type, 'Normal');
			const typed = Object.assign(battle.dex.getActiveMove('struggle'), { willCrit: false, noDamageVariance: true });
			const typeless = Object.assign(battle.dex.getActiveMove('struggle'), {
				willCrit: false, noDamageVariance: true, type: '???',
			});
			const stab = battle.actions.getDamage(snorlax, snorlax, typed, true);
			const plain = battle.actions.getDamage(snorlax, snorlax, typeless, true);
			assert(stab > plain, `${stab} vs ${plain}`);
			assert(battle.actions.getDamage(snorlax, onix, typed, true) < stab);
		});

		it('stays typeless in Gen 2 OU', () => {
			battle = create([[mon('Snorlax', ['tackle'])], [mon('Gengar', ['splash'])]], GEN2);
			const [snorlax, gengar] = [battle.p1.active[0], battle.p2.active[0]];
			emptyPP(snorlax);
			battle.makeChoices('move 1', 'move splash');
			assert.false.fullHP(gengar);
		});
	});

	describe('Quick Needle', () => {
		function needleBattle(formatid) {
			battle = create([
				[mon('Snorlax', ['quickattack'], { item: 'quickneedle' })],
				[mon('Jolteon', ['quickattack'])],
			], formatid);
			battle.randomChance = (numerator, denominator) => numerator === 30 && denominator === 256 ? true : numerator >= 200;
			return battle;
		}

		it('also rolls when both Pokemon use the same positive priority', () => {
			needleBattle(FORMAT);
			const log = turnLog(battle, () => battle.makeChoices('move quickattack', 'move quickattack'));
			const moves = log.filter(line => line.startsWith('|move|'));
			assert(moves[0].startsWith('|move|p1a: Snorlax'), moves.join('\n'));
			assert(log.some(line => line.includes('item: Quick Needle')));
			assert(/same priority/.test(Dex.mod('spaceworld').items.get('quickneedle').shortDesc));
		});

		it('keeps the shared item rule outside SpaceWorld', () => {
			const shared = Dex.mod('gen2').items.get('quickneedle');
			const ctx = { randomChance: () => true, add() {} };
			assert.equal(shared.onFractionalPriority.call(ctx, 1, null), undefined);
			assert.equal(shared.onFractionalPriority.call(ctx, 0, null), 0.1);
		});
	});

	describe('Swagger', () => {
		it('confuses a target whose Attack is already at +6', () => {
			battle = create([[mon('Snorlax', ['swagger'])], [mon('Tauros', ['splash'])]]);
			const tauros = battle.p2.active[0];
			tauros.boosts.atk = 6;
			battle.makeChoices('move swagger', 'move splash');
			assert(tauros.volatiles['confusion']);
			assert.equal(tauros.boosts.atk, 6);
		});

		it('confuses through Safeguard, and raises Attack but does not confuse through a substitute', () => {
			battle = create([[mon('Snorlax', ['swagger'])], [mon('Tauros', ['safeguard', 'substitute'])]]);
			const tauros = battle.p2.active[0];
			battle.makeChoices('move swagger', 'move safeguard');
			assert(tauros.volatiles['confusion']);
			delete tauros.volatiles['confusion'];
			tauros.boosts.atk = 0;
			battle.makeChoices('move swagger', 'move substitute');
			battle.makeChoices('move swagger', 'move safeguard');
			assert(tauros.volatiles['substitute']);
			assert(!tauros.volatiles['confusion']);
			assert.equal(tauros.boosts.atk, 4);
		});

		it('has a 1/256 chance not to confuse', () => {
			battle = create([[mon('Snorlax', ['swagger'])], [mon('Tauros', ['splash'])]]);
			let rolls = 0;
			battle.randomChance = (numerator, denominator) => {
				if (numerator === 255 && denominator === 256) return ++rolls !== 2;
				return numerator >= 200;
			};
			const tauros = battle.p2.active[0];
			battle.makeChoices('move swagger', 'move splash');
			assert(!tauros.volatiles['confusion']);
			assert.equal(tauros.boosts.atk, 2);
		});

		it('still fails at +6 Attack in Gen 2 OU', () => {
			battle = create([[mon('Snorlax', ['swagger'])], [mon('Tauros', ['splash'])]], GEN2);
			const tauros = battle.p2.active[0];
			tauros.boosts.atk = 6;
			battle.makeChoices('move swagger', 'move splash');
			assert(!tauros.volatiles['confusion']);
		});
	});

	describe('Substitute', () => {
		it('survives a hit that leaves it at exactly 0 HP and breaks on the next one', () => {
			battle = create([[mon('Snorlax', ['sonicboom'])], [mon('Tauros', ['substitute', 'splash'])]]);
			const tauros = battle.p2.active[0];
			battle.makeChoices('move sonicboom', 'move substitute');
			tauros.volatiles['substitute'].hp = 20;
			battle.makeChoices('move sonicboom', 'move splash');
			assert(tauros.volatiles['substitute']);
			assert.equal(tauros.volatiles['substitute'].hp, 0);
			battle.makeChoices('move sonicboom', 'move splash');
			assert(!tauros.volatiles['substitute']);
		});

		it('keeps the old rule in Gen 2 OU', () => {
			battle = create([[mon('Snorlax', ['sonicboom'])], [mon('Tauros', ['substitute', 'splash'])]], GEN2);
			const tauros = battle.p2.active[0];
			battle.makeChoices('move sonicboom', 'move substitute');
			tauros.volatiles['substitute'].hp = 20;
			battle.makeChoices('move sonicboom', 'move splash');
			assert(!tauros.volatiles['substitute']);
		});

		it('uses the same rule for a confusion self-hit that lands on the foe\'s substitute', () => {
			battle = create([[mon('Snorlax', ['substitute', 'splash'])], [mon('Tauros', ['substitute', 'splash'])]]);
			const [snorlax, tauros] = [battle.p1.active[0], battle.p2.active[0]];
			battle.makeChoices('move substitute', 'move substitute');
			const selfHit = {
				basePower: 40, type: '???', baseMoveType: 'Normal', category: 'Physical', willCrit: false,
				isConfusionSelfHit: true, noDamageVariance: true, flags: {},
			};
			const damage = battle.actions.getDamage(snorlax, snorlax, selfHit);
			snorlax.addVolatile('confusion');
			snorlax.volatiles['confusion'].time = 5;
			battle.randomChance = numerator => numerator !== 1;
			tauros.volatiles['substitute'].hp = damage;
			battle.makeChoices('move splash', 'move splash');
			assert(tauros.volatiles['substitute']);
			assert.equal(tauros.volatiles['substitute'].hp, 0);
			battle.makeChoices('move splash', 'move splash');
			assert(!tauros.volatiles['substitute']);
		});
	});

	describe('the badly-poisoned flag and Nightmare outside Baton Pass', () => {
		it('Rest keeps the badly-poisoned flag, and a later poisoning carries the counter on', () => {
			battle = create([[mon('Snorlax', ['rest', 'splash'])], [mon('Tauros', ['splash', 'poisonpowder'])]]);
			const snorlax = battle.p1.active[0];
			snorlax.setStatus('tox');
			snorlax.statusState.counter = 2;
			snorlax.hp = Math.floor(snorlax.maxhp / 2);
			battle.makeChoices('move rest', 'move splash');
			assert.equal(snorlax.status, 'slp');
			assert.equal(snorlax.volatiles['swtoxic'].counter, 2);
			snorlax.cureStatus();
			const hp = snorlax.hp;
			battle.randomChance = () => true;
			battle.makeChoices('move splash', 'move poisonpowder');
			assert.equal(snorlax.status, 'tox');
			assert.equal(hp - snorlax.hp, 3 * Math.floor(snorlax.maxhp / 8));
		});

		it('Bell Chime keeps the badly-poisoned flag and fails without a status even under Nightmare', () => {
			battle = create([[mon('Snorlax', ['bellchime', 'splash'])], [mon('Tauros', ['splash'])]]);
			const snorlax = battle.p1.active[0];
			snorlax.setStatus('tox');
			snorlax.statusState.counter = 3;
			battle.makeChoices('move bellchime', 'move splash');
			assert.equal(snorlax.status, '');
			assert.equal(snorlax.volatiles['swtoxic'].counter, 3);
			snorlax.volatiles['nightmare'] = battle.initEffectState({ id: 'nightmare', target: snorlax });
			const log = turnLog(battle, () => battle.makeChoices('move bellchime', 'move splash'));
			assert(log.some(line => line.startsWith('|-fail|p1a: Snorlax')), log.join('\n'));
			assert(snorlax.volatiles['nightmare']);
		});

		it('Haze wakes a Nightmare target but leaves its Nightmare on', () => {
			battle = create([[mon('Snorlax', ['splash'])], [mon('Weezing', ['haze'])]]);
			const snorlax = battle.p1.active[0];
			snorlax.setStatus('slp');
			snorlax.statusState.time = 7;
			snorlax.addVolatile('nightmare');
			battle.makeChoices('move splash', 'move haze');
			assert.equal(snorlax.status, '');
			assert(snorlax.volatiles['nightmare']);
			const hp = snorlax.hp;
			battle.makeChoices('move splash', 'move haze');
			assert.equal(hp - snorlax.hp, Math.floor(snorlax.maxhp / 4));
		});
	});

	describe('Baton Pass passes every battle flag', () => {
		it('passes Encore, and the replacement is forced into Baton Pass', () => {
			battle = create([
				[mon('Slowbro', ['splash', 'batonpass']), mon('Snorlax', ['tackle', 'bodyslam'])],
				[mon('Jolteon', ['encore', 'splash'])],
			]);
			battle.makeChoices('move splash', 'move splash');
			battle.makeChoices('move batonpass', 'move encore');
			battle.makeChoices('switch 2', '');
			const snorlax = battle.p1.active[0];
			assert.species(snorlax, 'Snorlax');
			assert(snorlax.volatiles['encore']);
			const [bodyslam, tackle] = [pp(snorlax, 'bodyslam'), pp(snorlax, 'tackle')];
			const log = turnLog(battle, () => battle.makeChoices('move bodyslam', 'move splash'));
			assert(log.some(line => line.startsWith('|move|p1a: Snorlax|Baton Pass')), log.join('\n'));
			assert.equal(pp(snorlax, 'bodyslam'), bodyslam - 1);
			assert.equal(pp(snorlax, 'tackle'), tackle);
		});

		it('passes Destiny Bond while it is still active', () => {
			battle = create([
				[mon('Gengar', ['destinybond', 'batonpass']), mon('Chansey', ['splash'])],
				[mon('Snorlax', ['quickattack', 'bodyslam'])],
			]);
			battle.makeChoices('move destinybond', 'move quickattack');
			battle.makeChoices('move batonpass', 'move bodyslam');
			const chansey = battle.p1.pokemon[1];
			chansey.hp = 1;
			battle.makeChoices('switch 2', '');
			assert.equal(battle.p1.active[0], chansey);
			assert(chansey.fainted);
			assert(battle.p2.active[0].fainted);
		});

		it('turns a poisoned replacement badly poisoned, carrying the counter on', () => {
			battle = create([
				[mon('Jolteon', ['batonpass']), mon('Snorlax', ['splash'])],
				[mon('Tauros', ['splash'])],
			]);
			const jolteon = battle.p1.active[0];
			const snorlax = battle.p1.pokemon[1];
			jolteon.setStatus('tox');
			jolteon.statusState.counter = 2;
			snorlax.status = 'psn';
			battle.makeChoices('move batonpass', 'move splash');
			battle.makeChoices('switch 2', '');
			const eighth = Math.floor(snorlax.maxhp / 8);
			assert.equal(snorlax.status, 'tox');
			assert.equal(snorlax.maxhp - snorlax.hp, 3 * eighth);
			battle.makeChoices('move splash', 'move splash');
			assert.equal(snorlax.maxhp - snorlax.hp, 7 * eighth);
			assert.equal(jolteon.status, 'psn');
		});

		it('leaves the flag on a healthy replacement, which a later poisoning picks up', () => {
			battle = create([
				[mon('Jolteon', ['batonpass']), mon('Snorlax', ['splash'])],
				[mon('Tauros', ['splash', 'poisonpowder'])],
			]);
			const jolteon = battle.p1.active[0];
			const snorlax = battle.p1.pokemon[1];
			jolteon.setStatus('tox');
			jolteon.statusState.counter = 2;
			battle.makeChoices('move batonpass', 'move splash');
			battle.makeChoices('switch 2', '');
			assert.equal(snorlax.status, '');
			assert.fullHP(snorlax);
			assert.equal(snorlax.volatiles['swtoxic'].counter, 2);
			battle.randomChance = () => true;
			battle.makeChoices('move splash', 'move poisonpowder');
			assert.equal(snorlax.status, 'tox');
			assert.equal(snorlax.maxhp - snorlax.hp, 3 * Math.floor(snorlax.maxhp / 8));
		});

		it('lets Haze clear a lingering badly-poisoned flag', () => {
			battle = create([
				[mon('Jolteon', ['batonpass']), mon('Snorlax', ['splash'])],
				[mon('Weezing', ['haze', 'poisonpowder', 'splash'])],
			]);
			battle.p1.active[0].setStatus('tox');
			battle.makeChoices('move batonpass', 'move splash');
			battle.makeChoices('switch 2', '');
			const snorlax = battle.p1.active[0];
			assert(snorlax.volatiles['swtoxic']);
			battle.makeChoices('move splash', 'move haze');
			assert(!snorlax.volatiles['swtoxic']);
			battle.randomChance = () => true;
			battle.makeChoices('move splash', 'move poisonpowder');
			assert.equal(snorlax.status, 'psn');
		});

		it('passes Disable: the same move slot cannot be chosen, the disabled move fails', () => {
			battle = create([
				[mon('Slowbro', ['tackle', 'batonpass']), mon('Snorlax', ['bodyslam', 'tackle'])],
				[mon('Jolteon', ['disable', 'splash'])],
			]);
			battle.makeChoices('move tackle', 'move splash');
			battle.randomChance = () => true;
			battle.makeChoices('move batonpass', 'move disable');
			battle.makeChoices('switch 2', '');
			const snorlax = battle.p1.active[0];
			assert(snorlax.volatiles['disable']);
			snorlax.volatiles['disable'].counter = 8;
			assert.cantMove(() => battle.makeChoices('move bodyslam', 'move splash'));
			const log = turnLog(battle, () => battle.makeChoices('move tackle', 'move splash'));
			assert(log.some(line => line.startsWith('|cant|p1a: Snorlax|Disable')), log.join('\n'));
		});

		it('passes Nightmare, which hurts a replacement that is awake', () => {
			battle = common.createBattle({ formatid: FORMAT, forceRandomChance: true }, [
				[mon('Snorlax', ['sleeptalk', 'batonpass']), mon('Chansey', ['splash'])],
				[mon('Tauros', ['splash'])],
			]);
			const snorlax = battle.p1.active[0];
			snorlax.setStatus('slp');
			snorlax.statusState.time = 5;
			snorlax.addVolatile('nightmare');
			battle.makeChoices('move sleeptalk', 'move splash');
			battle.makeChoices('switch 2', '');
			const chansey = battle.p1.active[0];
			assert(chansey.volatiles['nightmare']);
			const quarter = Math.floor(chansey.maxhp / 4);
			assert.equal(chansey.maxhp - chansey.hp, quarter);
			battle.makeChoices('move splash', 'move splash');
			assert.equal(chansey.maxhp - chansey.hp, 2 * quarter);
		});

		it('passes the transformed flag: the replacement\'s PP use is undone when it leaves', () => {
			battle = create([
				[mon('Mew', ['transform', 'splash']), mon('Snorlax', ['tackle']), mon('Chansey', ['splash'])],
				[mon('Jolteon', ['batonpass', 'splash'])],
			]);
			battle.makeChoices('move transform', 'move splash');
			battle.makeChoices('move batonpass', 'move splash');
			battle.makeChoices('switch 2', '');
			const snorlax = battle.p1.active[0];
			assert(snorlax.volatiles['swtransformbit']);
			const tackle = pp(snorlax, 'tackle');
			battle.makeChoices('move tackle', 'move splash');
			assert.equal(pp(snorlax, 'tackle'), tackle - 1);
			battle.makeChoices('switch 3', 'move splash');
			assert.equal(pp(snorlax, 'tackle'), tackle);
		});

		it('lists what passes in its description', () => {
			const desc = Dex.mod('spaceworld').moves.get('batonpass').desc;
			for (const word of ['Encore', 'Destiny Bond', 'Disable', 'Nightmare', 'badly poisoned', 'transformed']) {
				assert(desc.includes(word), word);
			}
		});
	});

	describe('items and sleep left over from the page audit', () => {
		it('Dragon Scale has no held effect', () => {
			const dmg = item => {
				const b = create([[mon('Dragonite', ['outrage'], { item })], [mon('Snorlax', ['splash'])]], 'gen2spaceworldbricks');
				const target = b.p2.active[0];
				return b.actions.getDamage(b.p1.active[0], target, 'outrage', true);
			};
			assert.equal(dmg('dragonscale'), dmg(''));
		});

		it('falling asleep does not end a Nightmare', () => {
			battle = create([[mon('Snorlax', ['rest'])], [mon('Gengar', ['splash'])]]);
			const snorlax = battle.p1.active[0];
			snorlax.volatiles['nightmare'] = battle.initEffectState({ id: 'nightmare', target: snorlax });
			snorlax.sethp(100);
			snorlax.setStatus('slp');
			assert.equal(snorlax.status, 'slp');
			assert(snorlax.volatiles['nightmare']);
		});
	});
});
