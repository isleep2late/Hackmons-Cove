'use strict';

const assert = require('./../../assert');
const common = require('./../../common');
const { Dex } = require('./../../../dist/sim/dex');
const { TeamValidator } = require('./../../../dist/sim/team-validator');

function mon(species, moves, extra = {}) {
	return {
		species, moves, ability: 'No Ability', level: 100,
		evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 },
		ivs: { hp: 30, atk: 30, def: 30, spa: 30, spd: 30, spe: 30 },
		...extra,
	};
}

function validate(format, species, moves, item = '') {
	const set = {
		name: '', species, item, ability: '', moves, nature: '', gender: '', level: 100,
		evs: { hp: 255, atk: 255, def: 255, spa: 255, spd: 255, spe: 255 },
		ivs: { hp: 30, atk: 30, def: 30, spa: 30, spd: 30, spe: 30 },
	};
	return TeamValidator.get(format).validateSet(set, {});
}

describe('[Gen 2] SpaceWorld player-visible text', () => {
	let battle;
	afterEach(() => {
		if (battle) battle.destroy();
		battle = null;
	});

	describe('Struggle', () => {
		it('is Normal-typed at battle time, so a Ghost-type is immune and the user takes no recoil', () => {
			battle = common.createBattle({ formatid: 'gen2spaceworldou' }, [
				[mon('Snorlax', ['tackle'])], [mon('Gengar', ['splash'])],
			]);
			const snorlax = battle.p1.active[0];
			const gengar = battle.p2.active[0];
			snorlax.moveSlots[0].pp = 0;
			battle.makeChoices('move struggle', 'move splash');
			assert.equal(gengar.hp, gengar.maxhp);
			assert.equal(snorlax.hp, snorlax.maxhp);
		});

		it('says so in its description', () => {
			const struggle = Dex.mod('spaceworld').moves.get('struggle');
			assert(/Normal-type/.test(struggle.shortDesc));
			assert(/Ghost-types are immune/.test(struggle.desc));
			assert(!/typeless/.test(struggle.desc));
		});
	});

	describe('Rest', () => {
		it('costs the user one turn of sleep and lets it act on the turn after', () => {
			battle = common.createBattle({ formatid: 'gen2spaceworldou' }, [
				[mon('Snorlax', ['rest', 'tackle'])], [mon('Tauros', ['tackle'])],
			]);
			const snorlax = battle.p1.active[0];
			battle.makeChoices('move tackle', 'move tackle');
			battle.makeChoices('move rest', 'move tackle');
			assert.equal(snorlax.status, 'slp');
			battle.makeChoices('move tackle', 'move tackle');
			assert.equal(snorlax.status, 'slp');
			const log = battle.log.length;
			battle.makeChoices('move tackle', 'move tackle');
			assert.equal(snorlax.status, '');
			assert(battle.log.slice(log).some(line => line.startsWith('|move|p1a: Snorlax|Tackle')));
		});

		it('describes the single lost turn', () => {
			const rest = Dex.mod('spaceworld').moves.get('rest');
			assert(!/two turns/.test(rest.desc));
			assert(!/2 turns/.test(rest.shortDesc));
		});
	});

	describe('Baton Pass and Reflect', () => {
		it('passes Reflect to the replacement, as the descriptions say', () => {
			battle = common.createBattle({ formatid: 'gen2spaceworldou' }, [
				[mon('Jolteon', ['reflect', 'batonpass']), mon('Snorlax', ['tackle'])], [mon('Tauros', ['splash'])],
			]);
			battle.makeChoices('move reflect', 'move splash');
			battle.makeChoices('move batonpass', 'move splash');
			battle.makeChoices('switch 2', '');
			assert(battle.p1.active[0].volatiles['swreflect']);
			const moves = Dex.mod('spaceworld').moves;
			assert(/Reflect/.test(moves.get('batonpass').desc));
			assert(/Baton Pass passes it/.test(moves.get('reflect').desc));
			assert(/Baton Pass passes it/.test(moves.get('lightscreen').desc));
		});
	});

	describe('format descriptions', () => {
		const desc = id => Dex.formats.get(id).desc;

		it('lists five SpaceWorld formats', () => {
			const names = Dex.formats.all().filter(format => format.mod === 'spaceworld').map(format => format.name);
			assert.deepEqual(names.sort(), [
				'[Gen 2] SpaceWorld Bricks', '[Gen 2] SpaceWorld Custom Disguises', '[Gen 2] SpaceWorld Disguises',
				'[Gen 2] SpaceWorld OU', '[Gen 2] SpaceWorld Ubers',
			]);
		});

		it('SpaceWorld OU names its Uber, item, Explosion and clause bans, and the validator enforces them', () => {
			const text = desc('gen2spaceworldou');
			for (const phrase of ['Mewtwo and Mew', 'Smeargle', 'all held items', 'Explosion', 'Self-Destruct', 'Dig', 'Fly', 'OHKO', 'evasion']) {
				assert(text.includes(phrase), phrase);
			}
			assert(!text.includes('Every non-Uber Pokemon'));
			assert(/Uber/.test(validate('gen2spaceworldou', 'Mewtwo', ['Psychic']).join()));
			assert(/Uber/.test(validate('gen2spaceworldou', 'Mew', ['Pound']).join()));
			assert(/TM Clause/.test(validate('gen2spaceworldou', 'Smeargle', ['Sketch']).join()));
			assert(/item/.test(validate('gen2spaceworldou', 'Snorlax', ['Headbutt'], 'Leftovers').join()));
			assert(/Explosion/.test(validate('gen2spaceworldou', 'Gengar', ['Explosion']).join()));
			assert(/OHKO/.test(validate('gen2spaceworldou', 'Golem', ['Fissure']).join()));
			assert.equal(validate('gen2spaceworldou', 'Snorlax', ['Headbutt']), null);
			assert.equal(validate('gen2spaceworldou', 'Aipom', ['Scratch']), null);
			assert(validate('gen2spaceworldou', 'Tail', ['Scratch']));
		});

		it('SpaceWorld OU and Ubers say only demo TM/HM moves are banned, and Gen 1 TM moves stay legal', () => {
			for (const format of ['gen2spaceworldou', 'gen2spaceworldubers']) {
				const text = desc(format);
				assert(text.includes("one of the demo's own TMs or HMs"), format);
				assert(text.includes('Time Capsule are allowed'), format);
				assert(!text.includes('only learn from a TM or HM'), format);
				assert(text.includes('its only move, Sketch, does nothing in link battles'), format);
				assert(!text.includes('no legal moves'), format);
				assert.equal(validate(format, 'Gengar', ['Thunderbolt']), null);
				assert.equal(validate(format, 'Snorlax', ['Earthquake', 'Body Slam', 'Surf']), null);
				assert(/TM/.test(validate(format, 'Snorlax', ['Dynamic Punch']).join()), format);
			}
			assert(Dex.mod('spaceworld').species.getLearnsetData('smeargle').learnset.sketch.includes('2L1'));
		});

		it('Quick Needle text says it rolls among moves of the same priority at any priority, as the item code does', () => {
			const item = Dex.mod('spaceworld').items.get('quickneedle');
			assert(item.shortDesc.includes('among moves of the same priority'));
			assert(!item.shortDesc.includes('if that priority is 0 or lower'));
			assert(!item.shortDesc.includes('bracket'));
			assert(!/priority <= 0/.test(item.onFractionalPriority.toString()));
			assert(/this\.randomChance\(30, 256\)/.test(item.onFractionalPriority.toString()));
		});

		it('SpaceWorld Ubers allows Mewtwo and Mew but bans items, Explosion and Smeargle', () => {
			const text = desc('gen2spaceworldubers');
			for (const phrase of ['Mewtwo and Mew included', 'Smeargle', 'all held items', 'Explosion', 'Self-Destruct', 'Dig', 'Fly']) {
				assert(text.includes(phrase), phrase);
			}
			assert.equal(validate('gen2spaceworldubers', 'Mewtwo', ['Psychic']), null);
			assert(validate('gen2spaceworldubers', 'Smeargle', ['Sketch']));
			assert(/item/.test(validate('gen2spaceworldubers', 'Mewtwo', ['Psychic'], 'Leftovers').join()));
		});

		it('SpaceWorld Bricks says items are allowed and Dig, Fly, OHKO and evasion moves stay banned', () => {
			const text = desc('gen2spaceworldbricks');
			for (const phrase of ['held items are allowed', 'Dig', 'Fly', 'OHKO', 'evasion', 'Smeargle included']) {
				assert(text.includes(phrase), phrase);
			}
			assert(!text.includes('lifted entirely'));
			assert.equal(validate('gen2spaceworldbricks', 'Smeargle', ['Spore', 'Hydro Pump']), null);
			assert.equal(validate('gen2spaceworldbricks', 'Smeargle', ['Spore'], 'Leftovers'), null);
			assert(/Dig/.test(validate('gen2spaceworldbricks', 'Smeargle', ['Dig']).join()));
			assert(/OHKO/.test(validate('gen2spaceworldbricks', 'Smeargle', ['Fissure']).join()));
			assert(/Evasion/.test(validate('gen2spaceworldbricks', 'Smeargle', ['Double Team']).join()));
			assert(validate('gen2spaceworldbricks', 'Snorlax', ['Headbutt']));
		});

		it('SpaceWorld Disguises describes Struggle, Rest and the working held items as the engine runs them', () => {
			const text = desc('gen2spaceworlddisguises');
			for (const phrase of ['Struggle is Normal-typed', 'Rest costs a single turn of sleep', "King's Rock", 'Quick Needle', 'Focus Orb', 'rain and sun double']) {
				assert(text.includes(phrase), phrase);
			}
		});
	});
});
