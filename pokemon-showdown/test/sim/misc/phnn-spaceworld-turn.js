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

function create(teams, threshold = 200, seed) {
	const battle = common.createBattle({ formatid: FORMAT, seed }, teams);
	battle.randomChance = numerator => numerator >= threshold;
	return battle;
}

function turnLog(battle, run) {
	const start = battle.log.length;
	run();
	return battle.log.slice(start).filter(line => !line.startsWith('|t:') && line !== '|');
}

function pp(pokemon, id) {
	return pokemon.moveSlots.find(slot => slot.id === id).pp;
}

function flat(battle, source, target, id, props = {}) {
	const move = battle.dex.getActiveMove(id);
	Object.assign(move, { willCrit: false, noDamageVariance: true }, props);
	return battle.actions.getDamage(source, target, move, true);
}

describe('[Gen 2] SpaceWorld turn engine', () => {
	let battle;
	afterEach(() => {
		if (battle) battle.destroy();
		battle = null;
	});

	describe('damage modifiers', () => {
		it('doubles boosted rain and sun damage and halves the weakened type', () => {
			battle = create([[mon('Snorlax', ['splash'])], [mon('Tauros', ['splash'])]]);
			const [snorlax, blastoise] = [battle.p1.active[0], battle.p2.active[0]];
			const dry = flat(battle, snorlax, blastoise, 'watergun');
			const dryFire = flat(battle, snorlax, blastoise, 'ember');
			battle.field.setWeather('raindance', snorlax);
			assert.equal(flat(battle, snorlax, blastoise, 'watergun'), dry * 2);
			assert.equal(flat(battle, snorlax, blastoise, 'ember'), Math.floor(dryFire / 2));
			battle.field.setWeather('sunnyday', snorlax);
			assert.equal(flat(battle, snorlax, blastoise, 'ember'), dryFire * 2);
		});

		it('multiplies Triple Kick damage after the cap, by 1, 2, 3 or by 1, 4, 4 behind a substitute', () => {
			battle = create([[mon('Snorlax', ['splash'])], [mon('Blastoise', ['splash'])]]);
			const [snorlax, blastoise] = [battle.p1.active[0], battle.p2.active[0]];
			const one = flat(battle, snorlax, blastoise, 'triplekick', { hit: 1 });
			assert.equal(flat(battle, snorlax, blastoise, 'triplekick', { hit: 2 }), one * 2);
			assert.equal(flat(battle, snorlax, blastoise, 'triplekick', { hit: 3 }), one * 3);
			snorlax.addVolatile('substitute');
			assert.equal(flat(battle, snorlax, blastoise, 'triplekick', { hit: 2 }), one * 4);
			assert.equal(flat(battle, snorlax, blastoise, 'triplekick', { hit: 3 }), one * 4);
		});

		it('doubles Rollout and Fury Cutter damage after STAB instead of doubling power', () => {
			battle = create([[mon('Golem', ['splash']), mon('Scyther', ['splash'])], [mon('Snorlax', ['splash'])]]);
			const [golem, snorlax] = [battle.p1.active[0], battle.p2.active[0]];
			golem.addVolatile('rollout');
			const first = flat(battle, golem, snorlax, 'rollout');
			assert.equal(flat(battle, golem, snorlax, 'rollout'), first * 2);
			assert.equal(flat(battle, golem, snorlax, 'rollout'), first * 4);
			const scyther = battle.p1.pokemon[1];
			const fresh = flat(battle, scyther, snorlax, 'furycutter');
			scyther.addVolatile('furycutter');
			assert.equal(flat(battle, scyther, snorlax, 'furycutter'), fresh * 2);
			scyther.addVolatile('furycutter');
			assert.equal(flat(battle, scyther, snorlax, 'furycutter'), fresh * 4);
		});

		it('rolls 2-5 hit moves at about 1/4 each', () => {
			const counts = { 2: 0, 3: 0, 4: 0, 5: 0 };
			for (let i = 1; i <= 200; i++) {
				battle = create([[mon('Cloyster', ['spikecannon'])], [mon('Snorlax', ['splash'])]], 200, [i, i, i, i]);
				const log = turnLog(battle, () => battle.makeChoices('move spikecannon', 'move splash'));
				const line = log.find(l => l.startsWith('|-hitcount|'));
				counts[line.split('|')[3]]++;
				battle.destroy();
			}
			battle = null;
			for (const hits of [2, 3, 4, 5]) assert(counts[hits] >= 30 && counts[hits] <= 70, JSON.stringify(counts));
		});
	});

	describe('Thrash, Petal Dance and Outrage', () => {
		it('attacks 3 or 4 times and then confuses the user even under Safeguard', () => {
			const seen = new Set();
			const times = new Set();
			for (let i = 1; i <= 40; i++) {
				battle = create([[mon('Nidoking', ['thrash'])], [mon('Snorlax', ['splash'])]], 200, [i, 2, 3, 4]);
				battle.p1.addSideCondition('safeguard', battle.p1.active[0]);
				let attacks = 0;
				for (let turn = 0; turn < 6 && !battle.p1.active[0].volatiles['confusion']; turn++) {
					const log = turnLog(battle, () => battle.makeChoices('move 1', 'move splash'));
					if (log.some(l => l.startsWith('|move|p1a: Nidoking|Thrash'))) attacks++;
				}
				assert(battle.p1.active[0].volatiles['confusion'], 'no confusion');
				times.add(battle.p1.active[0].volatiles['confusion'].time);
				seen.add(attacks);
				battle.destroy();
			}
			battle = null;
			assert.deepEqual([...seen].sort((a, b) => a - b), [3, 4]);
			assert.deepEqual([...times].sort((a, b) => a - b), [2, 3]);
		});

		it('keeps the rampage through flinch, freeze and sleep turns', () => {
			battle = create([[mon('Nidoking', ['thrash'])], [mon('Snorlax', ['splash'])]]);
			const nidoking = battle.p1.active[0];
			battle.makeChoices('move thrash', 'move splash');
			const duration = nidoking.volatiles['lockedmove'].duration;
			const pp1 = pp(nidoking, 'thrash');
			nidoking.addVolatile('flinch');
			let log = turnLog(battle, () => battle.makeChoices('move 1', 'move splash'));
			assert(log.includes('|cant|p1a: Nidoking|flinch'), log.join('\n'));
			assert.equal(nidoking.volatiles['lockedmove']?.duration, duration, log.join('\n'));
			nidoking.setStatus('frz');
			log = turnLog(battle, () => battle.makeChoices('move 1', 'move splash'));
			assert(log.includes('|cant|p1a: Nidoking|frz'), log.join('\n'));
			assert.equal(nidoking.volatiles['lockedmove']?.duration, duration, log.join('\n'));
			nidoking.cureStatus();
			nidoking.setStatus('slp');
			nidoking.statusState.time = 2;
			log = turnLog(battle, () => battle.makeChoices('move 1', 'move splash'));
			assert(log.includes('|cant|p1a: Nidoking|slp'), log.join('\n'));
			assert.equal(nidoking.volatiles['lockedmove']?.duration, duration, log.join('\n'));
			log = turnLog(battle, () => battle.makeChoices('move 1', 'move splash'));
			assert(log.some(l => l.startsWith('|move|p1a: Nidoking|Thrash')), log.join('\n'));
			assert.equal(pp(nidoking, 'thrash'), pp1);
		});

		it('does not check accuracy on the later turns', () => {
			battle = create([[mon('Nidoking', ['thrash'])], [mon('Snorlax', ['splash'])]]);
			battle.makeChoices('move thrash', 'move splash');
			battle.p2.active[0].boosts.evasion = 6;
			const log = turnLog(battle, () => battle.makeChoices('move 1', 'move splash'));
			assert(!log.some(l => l.startsWith('|-miss|')), log.join('\n'));
			assert(log.some(l => l.startsWith('|-damage|p2a: Snorlax')), log.join('\n'));
		});
	});

	describe('Hyper Beam recharge', () => {
		it('is cancelled by a slower flinch move that hits, even without a flinch', () => {
			battle = create([[mon('Tauros', ['hyperbeam', 'splash'])], [mon('Slowbro', ['headbutt'])]]);
			battle.makeChoices('move hyperbeam', 'move headbutt');
			const tauros = battle.p1.active[0];
			assert(!tauros.volatiles['mustrecharge']);
			battle.makeChoices('move splash', 'move headbutt');
		});

		it('is not cancelled by a flinch move that hits a substitute', () => {
			battle = create([[mon('Tauros', ['hyperbeam', 'substitute'])], [mon('Slowbro', ['headbutt', 'splash'])]]);
			battle.makeChoices('move substitute', 'move splash');
			battle.makeChoices('move hyperbeam', 'move headbutt');
			assert(battle.p1.active[0].volatiles['mustrecharge']);
		});

		it('fires Hyper Beam again when a faster foe cancels the recharge without a flinch', () => {
			battle = create([[mon('Tauros', ['hyperbeam'])], [mon('Jolteon', ['headbutt', 'splash'])]]);
			battle.makeChoices('move hyperbeam', 'move splash');
			const tauros = battle.p1.active[0];
			assert(tauros.volatiles['mustrecharge']);
			const before = pp(tauros, 'hyperbeam');
			const log = turnLog(battle, () => battle.makeChoices('move 1', 'move headbutt'));
			assert(!log.some(l => l.startsWith('|cant|p1a: Tauros|recharge')), log.join('\n'));
			assert(log.some(l => l.startsWith('|move|p1a: Tauros|Hyper Beam')), log.join('\n'));
			assert.equal(pp(tauros, 'hyperbeam'), before - 1);
		});

		it('fires a Metronome-called Hyper Beam again on Metronome\'s PP when a faster foe cancels the recharge', () => {
			battle = create([[mon('Clefable', ['metronome'])], [mon('Aerodactyl', ['splash', 'headbutt'])]]);
			const clefable = battle.p1.active[0];
			const pool = [...new Set(battle.dex.moves.all()
				.filter(move => !move.isNonstandard && move.id !== 'metronome').map(move => move.id))];
			const random = battle.random.bind(battle);
			battle.random = (m, n) => (n === undefined && m === pool.length + 3 ? pool.indexOf('hyperbeam') : random(m, n));
			let log = turnLog(battle, () => battle.makeChoices('move metronome', 'move splash'));
			assert(log.some(l => l.startsWith('|move|p1a: Clefable|Hyper Beam')), log.join('\n'));
			assert(log.includes('|-mustrecharge|p1a: Clefable'), log.join('\n'));
			assert(clefable.volatiles['mustrecharge']);
			const before = pp(clefable, 'metronome');
			log = turnLog(battle, () => battle.makeChoices('move 1', 'move headbutt'));
			assert(!log.some(l => l.includes('|nopp|')), log.join('\n'));
			assert(log.some(l => l.startsWith('|move|p1a: Clefable|Hyper Beam')), log.join('\n'));
			assert.equal(pp(clefable, 'metronome'), before - 1);
		});

		it('needs no recharge after a called Hyper Beam that KOs', () => {
			battle = create([[mon('Pidgeot', ['mirrormove'])], [mon('Tauros', ['hyperbeam']), mon('Snorlax', ['splash'])]]);
			const [pidgeot, tauros] = [battle.p1.active[0], battle.p2.active[0]];
			tauros.sethp(50);
			const log = turnLog(battle, () => battle.makeChoices('move mirrormove', 'move hyperbeam'));
			assert(log.some(l => l.startsWith('|move|p1a: Pidgeot|Hyper Beam|p2a: Tauros')), log.join('\n'));
			assert(log.includes('|faint|p2a: Tauros'), log.join('\n'));
			assert(!pidgeot.volatiles['mustrecharge']);
			assert(!log.includes('|-mustrecharge|p1a: Pidgeot'), log.join('\n'));
		});

		it('is cancelled by a King\'s Rock hit, which needs no flinch roll', () => {
			battle = create([
				[mon('Tauros', ['hyperbeam', 'splash'])],
				[mon('Slowbro', ['tackle', 'headbutt'], { item: 'kingsrock' })],
			]);
			battle.makeChoices('move hyperbeam', 'move tackle');
			assert(!battle.p1.active[0].volatiles['mustrecharge']);
		});

		it('lets a sleep move land on the recharging Pokemon through accuracy and Safeguard', () => {
			battle = create([[mon('Tauros', ['hyperbeam'])], [mon('Jolteon', ['hypnosis', 'splash'])]]);
			battle.makeChoices('move hyperbeam', 'move splash');
			battle.p1.addSideCondition('safeguard', battle.p1.active[0]);
			const log = turnLog(battle, () => battle.makeChoices('move 1', 'move hypnosis'));
			const tauros = battle.p1.active[0];
			assert.equal(tauros.status, 'slp', log.join('\n'));
			assert(!tauros.volatiles['mustrecharge']);
			assert(!log.some(l => l.startsWith('|move|p1a: Tauros')), log.join('\n'));
		});

		it('still lets sleep moves miss a Pokemon that is not recharging', () => {
			battle = create([[mon('Tauros', ['splash'])], [mon('Jolteon', ['hypnosis'])]]);
			battle.makeChoices('move splash', 'move hypnosis');
			assert.equal(battle.p1.active[0].status, '');
		});
	});

	describe('King\'s Rock', () => {
		it('uses the demo\'s move list', () => {
			const kingsrock = Dex.mod('spaceworld').items.get('kingsrock');
			const affected = id => {
				const move = Dex.mod('spaceworld').getActiveMove(id);
				kingsrock.onModifyMove.call(null, move);
				return !!move.secondaries?.some(s => s.kingsrock);
			};
			for (const id of ['gust', 'earthquake', 'triattack', 'tackle', 'snore']) assert(affected(id), id);
			for (const id of ['headbutt', 'ember', 'hyperbeam', 'wrap', 'crosschop', 'pursuit']) assert(!affected(id), id);
		});
	});

	describe('Haze', () => {
		it('makes a sleeping target it cures lose its move that turn', () => {
			battle = create([[mon('Jolteon', ['haze'])], [mon('Snorlax', ['tackle'])]]);
			battle.p2.active[0].setStatus('slp');
			battle.p2.active[0].statusState.time = 7;
			const log = turnLog(battle, () => battle.makeChoices('move haze', 'move tackle'));
			assert.equal(battle.p2.active[0].status, '');
			assert(!log.some(l => l.startsWith('|move|p2a: Snorlax')), log.join('\n'));
		});

		it('sends -end lines for the effects it removes', () => {
			battle = create([
				[mon('Mr. Mime', ['reflect', 'mist', 'focusenergy', 'haze'])],
				[mon('Venusaur', ['leechseed', 'splash'])],
			], 130);
			battle.makeChoices('move reflect', 'move leechseed');
			battle.makeChoices('move mist', 'move splash');
			battle.makeChoices('move focusenergy', 'move splash');
			const log = turnLog(battle, () => battle.makeChoices('move haze', 'move splash'));
			for (const effect of ['move: Reflect', 'move: Leech Seed', 'Mist', 'move: Focus Energy']) {
				assert(log.includes(`|-end|p1a: Mr. Mime|${effect}|[silent]`), effect + '\n' + log.join('\n'));
			}
		});
	});

	describe('partial trapping', () => {
		it('does not damage a Ghost-type with Wrap but still traps it', () => {
			battle = create([[mon('Dragonite', ['wrap'])], [mon('Gengar', ['splash'])]]);
			const gengar = battle.p2.active[0];
			const log = turnLog(battle, () => battle.makeChoices('move wrap', 'move splash'));
			assert.equal(gengar.hp, gengar.maxhp);
			assert(gengar.volatiles['partiallytrapped']);
			assert(log.includes('|-immune|p2a: Gengar'), log.join('\n'));
			assert(!log.some(l => l.startsWith('|-damage|p2a: Gengar')), log.join('\n'));
			assert.equal(battle.lastDamage, 0);
			battle.makeChoices('move wrap', 'move splash');
			assert.equal(gengar.hp, gengar.maxhp);
		});

		it('keeps a trapped target\'s Thrash going without new PP', () => {
			battle = create([[mon('Jolteon', ['thrash'])], [mon('Snorlax', ['wrap', 'splash'])]]);
			battle.makeChoices('move thrash', 'move splash');
			const jolteon = battle.p1.active[0];
			const after = pp(jolteon, 'thrash');
			battle.makeChoices('move 1', 'move wrap');
			let trappedTurns = 0;
			for (let turn = 0; turn < 8 && jolteon.volatiles['partiallytrapped']; turn++) {
				const log = turnLog(battle, () => battle.makeChoices('move 1', 'move 1'));
				if (log.includes('|cant|p1a: Jolteon|partiallytrapped')) {
					trappedTurns++;
					assert(jolteon.volatiles['lockedmove'], log.join('\n'));
				}
			}
			assert(trappedTurns > 0);
			if (jolteon.volatiles['lockedmove']) {
				const log = turnLog(battle, () => battle.makeChoices('move 1', 'move splash'));
				assert(log.some(l => l.startsWith('|move|p1a: Jolteon|Thrash')), log.join('\n'));
			}
			assert.equal(pp(jolteon, 'thrash'), after);
		});

		it('keeps a charged Solar Beam through the trap', () => {
			battle = create([[mon('Jolteon', ['solarbeam'])], [mon('Snorlax', ['wrap', 'splash'])]]);
			const jolteon = battle.p1.active[0];
			battle.makeChoices('move solarbeam', 'move wrap');
			const after = pp(jolteon, 'solarbeam');
			let prepares = 0;
			let fired = false;
			for (let turn = 0; turn < 8 && !fired; turn++) {
				const log = turnLog(battle, () => battle.makeChoices('move 1', 'move 1'));
				if (log.some(l => l.startsWith('|-prepare|p1a: Jolteon'))) prepares++;
				if (log.some(l => l.startsWith('|move|p1a: Jolteon|Solar Beam|p2a'))) fired = true;
			}
			assert(fired);
			assert.equal(prepares, 0);
			assert.equal(pp(jolteon, 'solarbeam'), after);
		});

		it('does not count a trapped turn against Disable', () => {
			battle = create([[mon('Jolteon', ['thunderbolt', 'splash'])], [mon('Dragonite', ['disable', 'wrap'])]], 130);
			battle.makeChoices('move thunderbolt', 'move disable');
			const jolteon = battle.p1.active[0];
			assert(jolteon.volatiles['disable']);
			jolteon.volatiles['disable'].counter = 2;
			battle.makeChoices('move splash', 'move wrap');
			const log = turnLog(battle, () => battle.makeChoices('move splash', 'move 1'));
			assert(log.includes('|cant|p1a: Jolteon|partiallytrapped'), log.join('\n'));
			assert(jolteon.volatiles['disable'], log.join('\n'));
		});

		it('turns a Metronome-called Wrap back into Metronome when the target switches', () => {
			battle = create([
				[mon('Clefable', ['metronome'])],
				[mon('Snorlax', ['splash']), mon('Tauros', ['splash'])],
			]);
			const clefable = battle.p1.active[0];
			const wrap = Object.assign(battle.dex.getActiveMove('wrap'), { sourceEffect: 'metronome' });
			clefable.addVolatile('partialtrappinglock', clefable, wrap);
			const before = pp(clefable, 'metronome');
			const log = turnLog(battle, () => battle.makeChoices('move 1', 'switch 2'));
			assert(!log.some(l => l.includes('|nopp|')), log.join('\n'));
			assert(log.some(l => l.startsWith('|move|p1a: Clefable|Metronome')), log.join('\n'));
			assert.equal(pp(clefable, 'metronome'), before - 1);
		});

		it('charges a Mirror Move-called Wrap to Mirror Move when the target switches', () => {
			battle = create([
				[mon('Pidgeot', ['mirrormove'])],
				[mon('Snorlax', ['splash']), mon('Tauros', ['splash'])],
			]);
			const pidgeot = battle.p1.active[0];
			const wrap = Object.assign(battle.dex.getActiveMove('wrap'), { sourceEffect: 'mirrormove' });
			pidgeot.addVolatile('partialtrappinglock', pidgeot, wrap);
			const before = pp(pidgeot, 'mirrormove');
			const log = turnLog(battle, () => battle.makeChoices('move 1', 'switch 2'));
			assert(!log.some(l => l.includes('|nopp|')), log.join('\n'));
			assert(log.some(l => l.startsWith('|move|p1a: Pidgeot|Wrap|p2a: Tauros')), log.join('\n'));
			assert.equal(pp(pidgeot, 'mirrormove'), before - 1);
			assert.equal(pidgeot.volatiles['partialtrappinglock']?.caller, 'mirrormove');
		});

		it('charges Mirror Move when a really mirrored Wrap restarts on a new target', () => {
			battle = create([
				[mon('Pidgeot', ['mirrormove'])],
				[mon('Snorlax', ['wrap', 'splash']), mon('Tauros', ['splash'])],
			]);
			const [pidgeot, snorlax] = [battle.p1.active[0], battle.p2.active[0]];
			battle.makeChoices('move 1', 'move wrap');
			for (let turn = 0; turn < 8 && snorlax.volatiles['partialtrappinglock']; turn++) {
				battle.makeChoices('move 1', 'move 1');
			}
			assert(!pidgeot.volatiles['partiallytrapped']);
			let log = turnLog(battle, () => battle.makeChoices('move 1', 'move splash'));
			assert(log.some(l => l.startsWith('|move|p1a: Pidgeot|Wrap|p2a: Snorlax')), log.join('\n'));
			assert.equal(pidgeot.volatiles['partialtrappinglock']?.caller, 'mirrormove', log.join('\n'));
			const before = pp(pidgeot, 'mirrormove');
			log = turnLog(battle, () => battle.makeChoices('move 1', 'switch 2'));
			assert(!log.some(l => l.includes('|nopp|')), log.join('\n'));
			assert(log.some(l => l.startsWith('|move|p1a: Pidgeot|Wrap|p2a: Tauros')), log.join('\n'));
			assert.equal(pp(pidgeot, 'mirrormove'), before - 1);
		});

		it('keeps a trapped Fury Cutter streak only when Fury Cutter was chosen', () => {
			for (const choice of ['furycutter', 'splash']) {
				battle = create([[mon('Scyther', ['furycutter', 'splash'])], [mon('Dragonite', ['wrap', 'splash'])]]);
				const scyther = battle.p1.active[0];
				battle.makeChoices('move furycutter', 'move splash');
				battle.makeChoices('move furycutter', 'move wrap');
				assert.equal(scyther.volatiles['furycutter']?.count, 2);
				const log = turnLog(battle, () => battle.makeChoices(`move ${choice}`, 'move 1'));
				assert(log.includes('|cant|p1a: Scyther|partiallytrapped'), log.join('\n'));
				if (choice === 'furycutter') {
					assert.equal(scyther.volatiles['furycutter']?.count, 2, log.join('\n'));
				} else {
					assert(!scyther.volatiles['furycutter'], log.join('\n'));
				}
				battle.destroy();
			}
			battle = null;
		});

		it('announces the Rapid Spin release and leaves Leech Seed and Spikes alone', () => {
			battle = create([[mon('Venusaur', ['spikes', 'leechseed', 'wrap'])], [mon('Starmie', ['rapidspin', 'splash'])]]);
			battle.makeChoices('move spikes', 'move splash');
			battle.makeChoices('move leechseed', 'move splash');
			battle.makeChoices('move wrap', 'move splash');
			const starmie = battle.p2.active[0];
			assert(starmie.volatiles['partiallytrapped']);
			const log = turnLog(battle, () => battle.makeChoices('move 1', 'move rapidspin'));
			assert(log.includes('|-end|p2a: Starmie|Wrap|[partiallytrapped]|[from] move: Rapid Spin'), log.join('\n'));
			assert(starmie.volatiles['leechseed']);
			assert(battle.p2.sideConditions['spikes']);
		});

		it('clears the trap badge with a silent -end when the trap runs out', () => {
			battle = create([[mon('Dragonite', ['wrap', 'splash'])], [mon('Snorlax', ['splash'])]]);
			const snorlax = battle.p2.active[0];
			const lines = [];
			lines.push(...turnLog(battle, () => battle.makeChoices('move wrap', 'move splash')));
			for (let turn = 0; turn < 6 && snorlax.volatiles['partiallytrapped']; turn++) {
				lines.push(...turnLog(battle, () => battle.makeChoices('move 1', 'move splash')));
			}
			assert(!snorlax.volatiles['partiallytrapped']);
			assert(lines.includes('|-end|p2a: Snorlax|Wrap|[partiallytrapped]|[silent]'), lines.join('\n'));
		});
	});
});
