'use strict';

const assert = require('./../../assert');
const common = require('./../../common');
const { Battle, BattleStream } = require('./../../../dist/sim');
const { extractChannelMessages } = require('./../../../dist/sim/battle');

const FORMAT = 'gen9customgame@@@Infinite Mod';

let battle;

function logSince(pos) {
	return battle.log.slice(pos);
}

describe('Infinite Mod', () => {
	afterEach(() => battle.destroy());

	it('switches a Pokemon revived in its own active slot back in, and it can faint again', () => {
		battle = common.createBattle({ formatid: FORMAT }, [[
			{ species: 'Wobbuffet', ability: 'Shadow Tag', moves: ['memento', 'splash'] },
		], [
			{ species: 'Mew', ability: 'Synchronize', moves: ['splash'] },
		]]);
		const wobbuffet = battle.p1.active[0];
		battle.makeChoices('move memento', 'move splash');
		assert(wobbuffet.fainted);
		assert(battle.log.includes('|infinite|p1|1'));
		assert.false(battle.ended);

		let pos = battle.log.length;
		battle.infiniteSubmit('p1', 'existing 1');
		assert(logSince(pos).some(line => line.startsWith('|switch|p1a: Wobbuffet|')));
		assert.equal(battle.p1.active[0], wobbuffet);
		assert(wobbuffet.isActive);
		assert.equal(wobbuffet.hp, Math.floor(wobbuffet.maxhp / 2));
		assert.equal(battle.p1.activeRequest.active.length, 1);

		pos = battle.log.length;
		battle.makeChoices('move memento', 'move splash');
		assert(logSince(pos).includes('|faint|p1a: Wobbuffet'));
		assert(logSince(pos).includes('|infinite|p1|1'));
		assert(wobbuffet.fainted);
		assert.false(battle.ended);
	});

	it('lets a revived benched Pokemon faint again', () => {
		battle = common.createBattle({ formatid: FORMAT }, [[
			{ species: 'Wobbuffet', ability: 'Shadow Tag', moves: ['memento'] },
			{ species: 'Wynaut', ability: 'Shadow Tag', moves: ['memento'] },
		], [
			{ species: 'Mew', ability: 'Synchronize', moves: ['splash'] },
		]]);
		const wobbuffet = battle.p1.pokemon[0];
		battle.makeChoices('move memento', 'move splash');
		battle.makeChoices('switch 2', '');
		battle.makeChoices('move memento', 'move splash');
		assert(battle.log.includes('|infinite|p1|1'));

		battle.infiniteSubmit('p1', 'existing 2');
		assert.equal(battle.p1.active[0], wobbuffet);
		assert.equal(wobbuffet.position, 0);
		assert.equal(battle.p1.pokemon[1].name, 'Wynaut');

		const pos = battle.log.length;
		battle.makeChoices('move memento', 'move splash');
		assert(logSince(pos).includes('|faint|p1a: Wobbuffet'));
		assert(logSince(pos).includes('|infinite|p1|1'));
		assert.equal(wobbuffet.hp, 0);
	});

	it('switches in a submitted set and asks again after an invalid set or index', () => {
		battle = common.createBattle({ formatid: FORMAT }, [[
			{ species: 'Wobbuffet', ability: 'Shadow Tag', moves: ['memento'] },
		], [
			{ species: 'Mew', ability: 'Synchronize', moves: ['splash'] },
		]]);
		battle.makeChoices('move memento', 'move splash');

		let pos = battle.log.length;
		battle.infiniteSubmit('p1', 'not a pokemon set');
		assert(logSince(pos).includes('|infinite|p1|1'));
		assert.equal(battle.p1.pokemon.length, 1);

		pos = battle.log.length;
		battle.infiniteSubmit('p1', 'existing 9');
		assert(logSince(pos).includes('|infinite|p1|1'));

		pos = battle.log.length;
		battle.infiniteSubmit('p1', 'Wynaut\\nAbility: Shadow Tag\\n- Memento');
		assert(logSince(pos).some(line => line.startsWith('|switch|p1a: Wynaut|')));
		assert.equal(battle.p1.active[0].name, 'Wynaut');
		assert(battle.p1.active[0].isActive);

		pos = battle.log.length;
		battle.makeChoices('move memento', 'move splash');
		assert(logSince(pos).includes('|faint|p1a: Wynaut'));
		assert(logSince(pos).includes('|infinite|p1|1'));
	});

	it('revives a Pokemon in its own slot in doubles', () => {
		battle = common.createBattle({ formatid: `${FORMAT},gametype=Doubles` }, [[
			{ species: 'Wobbuffet', ability: 'Shadow Tag', moves: ['memento'] },
			{ species: 'Wynaut', ability: 'Shadow Tag', moves: ['memento'] },
		], [
			{ species: 'Mew', ability: 'Synchronize', moves: ['splash'] },
			{ species: 'Celebi', ability: 'Natural Cure', moves: ['splash'] },
		]]);
		const [wobbuffet, wynaut] = battle.p1.active;
		battle.makeChoices('move memento 1, move memento 2', 'move splash, move splash');
		assert(battle.log.includes('|infinite|p1|1'));

		let pos = battle.log.length;
		battle.infiniteSubmit('p1', 'existing 2');
		assert(logSince(pos).some(line => line.startsWith('|switch|p1b: Wynaut|')));
		assert.equal(battle.p1.active[0], wobbuffet);
		assert.equal(battle.p1.active[1], wynaut);
		assert(wynaut.isActive);

		pos = battle.log.length;
		battle.makeChoices('pass, move memento 1', 'move splash, move splash');
		assert(logSince(pos).includes('|faint|p1b: Wynaut'));
		assert(logSince(pos).includes('|infinite|p1|1'));
	});

	it('makes the side wait instead of moving while the foe picks a forced switch', () => {
		battle = common.createBattle({ formatid: FORMAT }, [[
			{ species: 'Wobbuffet', ability: 'Shadow Tag', moves: ['explosion', 'splash'] },
		], [
			{ species: 'Chansey', ability: 'Natural Cure', level: 5, moves: ['splash'] },
			{ species: 'Mew', ability: 'Synchronize', moves: ['splash'] },
		]]);
		battle.makeChoices('move explosion', 'move splash');
		assert.equal(battle.requestState, 'switch');

		battle.infiniteSubmit('p1', 'existing 1');
		assert(battle.p1.activeRequest.wait);

		const pos = battle.log.length;
		battle.choose('p2', 'switch 2');
		assert.equal(battle.turn, 2);
		assert.false(logSince(pos).some(line => line.startsWith('|move|')));
		assert.equal(battle.p1.requestState, 'move');
	});

	it('ignores a submission after the battle has ended', () => {
		battle = common.createBattle({ formatid: FORMAT }, [[
			{ species: 'Wobbuffet', ability: 'Shadow Tag', moves: ['memento'] },
		], [
			{ species: 'Mew', ability: 'Synchronize', moves: ['splash'] },
		]]);
		battle.makeChoices('move memento', 'move splash');
		battle.forceWin('p2');
		const pos = battle.log.length;
		battle.infiniteSubmit('p1', 'existing 1');
		assert.equal(logSince(pos).length, 0);
		assert(battle.p1.active[0].fainted);
	});

	it('does not let a Pokemon revived mid-turn use the move it chose before fainting', () => {
		battle = common.createBattle({ formatid: FORMAT }, [[
			{ species: 'Wobbuffet', ability: 'Shadow Tag', level: 5, moves: ['memento', 'splash'] },
		], [
			{ species: 'Weavile', ability: 'Pressure', moves: ['uturn'] },
			{ species: 'Mew', ability: 'Synchronize', moves: ['splash'] },
		]]);
		const wobbuffet = battle.p1.active[0];
		battle.makeChoices('move memento', 'move uturn');
		assert(wobbuffet.fainted);
		assert.equal(battle.requestState, 'switch');

		battle.infiniteSubmit('p1', 'existing 1');
		const pos = battle.log.length;
		battle.choose('p2', 'switch 2');
		assert.equal(battle.turn, 2);
		assert.false(logSince(pos).some(line => line.startsWith('|move|p1a: Wobbuffet|')));
		assert.false(wobbuffet.fainted);
		assert.equal(battle.p1.active[0], wobbuffet);
	});

	it('keeps going when both sides run out in the same action', () => {
		battle = common.createBattle({ formatid: FORMAT }, [[
			{ species: 'Wobbuffet', ability: 'Shadow Tag', moves: ['explosion'] },
		], [
			{ species: 'Chansey', ability: 'Natural Cure', level: 5, moves: ['splash'] },
		]]);
		battle.makeChoices('move explosion', 'move splash');
		assert.false(battle.ended);
		assert(battle.p1.infiniteWaiting);
		assert(battle.p2.infiniteWaiting);
		assert(battle.p1.activeRequest.wait);
		assert(battle.p2.activeRequest.wait);

		battle.infiniteSubmit('p2', 'existing 1');
		assert(battle.p2.activeRequest.wait);
		assert.equal(battle.p2.activeRequest.infinite, undefined);
		assert(battle.p1.infiniteWaiting);
		battle.infiniteSubmit('p1', 'existing 1');
		assert.equal(battle.p1.requestState, 'move');
		assert.equal(battle.p2.requestState, 'move');

		const pos = battle.log.length;
		battle.makeChoices('move explosion', 'move splash');
		assert(logSince(pos).includes('|move|p1a: Wobbuffet|Explosion|p2a: Chansey'));
		assert.equal(battle.turn, 3);
		assert(battle.p1.infiniteWaiting);
		assert(battle.p2.infiniteWaiting);
	});

	it('flags the wait request of a side that has to submit a Pokemon', () => {
		battle = common.createBattle({ formatid: FORMAT }, [[
			{ species: 'Wobbuffet', ability: 'Shadow Tag', moves: ['explosion'] },
		], [
			{ species: 'Chansey', ability: 'Natural Cure', level: 5, moves: ['splash'] },
			{ species: 'Mew', ability: 'Synchronize', moves: ['splash'] },
		]]);
		battle.makeChoices('move explosion', 'move splash');
		assert.equal(battle.requestState, 'switch');
		assert(battle.p1.activeRequest.wait);
		assert.equal(battle.p1.activeRequest.infinite, true);
		assert.equal(battle.p2.activeRequest.infinite, undefined);

		battle.infiniteSubmit('p1', 'existing 1');
		assert(battle.p1.activeRequest.wait);
		assert.equal(battle.p1.activeRequest.infinite, undefined);

		battle.choose('p2', 'switch 2');
		assert.equal(battle.p1.activeRequest.infinite, undefined);
		assert.equal(battle.p2.activeRequest.infinite, undefined);
	});

	it('records submissions in the input log, so replaying it gives the same battle', () => {
		battle = new Battle({ formatid: FORMAT, seed: [1, 2, 3, 4] });
		battle.setPlayer('p1', { name: 'A', team: [
			{ species: 'Wobbuffet', ability: 'Shadow Tag', moves: ['memento', 'splash'], evs: { hp: 1 } },
		] });
		battle.setPlayer('p2', { name: 'B', team: [
			{ species: 'Mew', ability: 'Synchronize', moves: ['splash'], evs: { hp: 1 } },
		] });
		battle.makeChoices('move memento', 'move splash');
		battle.infiniteSubmit('p1', 'not a pokemon set');
		battle.infiniteSubmit('p1', 'Wynaut\\nAbility: Shadow Tag\\n- Memento');
		battle.makeChoices('move memento', 'move splash');
		battle.infiniteSubmit('p1', 'existing 2');
		battle.makeChoices('move splash', 'move splash');
		assert.equal(battle.turn, 4);

		const replay = new BattleStream({ noCatch: true });
		void replay.write(battle.inputLog.join('\n'));
		const withoutTimes = log => log.filter(line => !line.startsWith('|t:|'));
		try {
			assert.deepEqual(withoutTimes(replay.battle.log), withoutTimes(battle.log));
			assert.deepEqual(replay.battle.inputLog, battle.inputLog);
		} finally {
			replay.battle.destroy();
		}
		assert.equal(battle.inputLog.filter(line => line.startsWith('>infinite p1 ')).length, 3);
	});

	it('revives a Pokemon that fainted while Dynamaxed at its normal max HP', () => {
		battle = common.createBattle({ formatid: 'gen8customgame@@@Infinite Mod' }, [[
			{ species: 'Wobbuffet', ability: 'Shadow Tag', level: 5, moves: ['tackle'] },
		], [
			{ species: 'Mewtwo', ability: 'Pressure', moves: ['psystrike'] },
		]]);
		const wobbuffet = battle.p1.active[0];
		battle.makeChoices('move tackle dynamax', 'move psystrike');
		assert(wobbuffet.fainted);
		assert(wobbuffet.maxhp > wobbuffet.baseMaxhp);

		battle.infiniteSubmit('p1', 'existing 1');
		assert.equal(wobbuffet.maxhp, wobbuffet.baseMaxhp);
		assert.equal(wobbuffet.hp, Math.floor(wobbuffet.baseMaxhp / 2));
	});

	it('tells clients a revived Pokemon is back before switching it in', () => {
		battle = common.createBattle({ formatid: FORMAT }, [[
			{ species: 'Wobbuffet', ability: 'Shadow Tag', moves: ['memento'] },
			{ species: 'Wynaut', ability: 'Shadow Tag', moves: ['memento'] },
		], [
			{ species: 'Mew', ability: 'Synchronize', moves: ['splash'] },
		]]);
		const revived = (pos, name, slotIdent) => {
			const lines = logSince(pos);
			const heal = lines.findIndex(line => line.startsWith(`|-heal|p1: ${name}|`) &&
				line.includes('|[from] move: Revival Blessing|'));
			const switchIn = lines.findIndex(line => line.startsWith(`|switch|${slotIdent}|`));
			return heal >= 0 && switchIn > heal;
		};
		battle.makeChoices('move memento', 'move splash');
		battle.makeChoices('switch 2', '');
		battle.makeChoices('move memento', 'move splash');

		let pos = battle.log.length;
		battle.infiniteSubmit('p1', 'existing 1');
		assert(revived(pos, 'Wynaut', 'p1a: Wynaut'));

		battle.makeChoices('move memento', 'move splash');
		pos = battle.log.length;
		battle.infiniteSubmit('p1', 'existing 2');
		assert(revived(pos, 'Wobbuffet', 'p1a: Wobbuffet'));

		battle.makeChoices('move memento', 'move splash');
		pos = battle.log.length;
		battle.infiniteSubmit('p1', 'Pichu\\nAbility: Static\\n- Memento');
		assert(logSince(pos).some(line => line.startsWith('|switch|p1a: Pichu|')));
		assert.false(logSince(pos).some(line => line.startsWith('|-heal|')));
	});

	it('asks again instead of dropping a new set at the 24-Pokemon cap', () => {
		const set = 'Wobbuffet\\nLevel: 1\\nAbility: Shadow Tag\\n- Explosion';
		battle = common.createBattle({ formatid: FORMAT }, [[
			{ species: 'Wobbuffet', ability: 'Shadow Tag', level: 1, moves: ['explosion'] },
		], [
			{ species: 'Blissey', ability: 'Natural Cure', item: 'Leftovers', moves: ['splash'] },
		]]);
		for (let i = 0; i < 23; i++) {
			battle.makeChoices('move explosion', 'move splash');
			battle.infiniteSubmit('p1', set);
		}
		assert.equal(battle.p1.pokemon.length, 24);
		battle.makeChoices('move explosion', 'move splash');
		assert(battle.p1.infiniteWaiting);

		let pos = battle.log.length;
		battle.infiniteSubmit('p1', set);
		assert(logSince(pos).includes('|-message|Your team is full; revive a Pokémon instead.'));
		assert(logSince(pos).includes('|infinite|p1|1'));
		assert(battle.p1.infiniteWaiting);
		assert.equal(battle.p1.pokemon.length, 24);
		assert(battle.p1.activeRequest.wait);

		pos = battle.log.length;
		battle.infiniteSubmit('p1', 'existing 3');
		assert(logSince(pos).some(line => line.startsWith('|switch|p1a: Wobbuffet|')));
		assert.false(battle.p1.infiniteWaiting);
		assert.equal(battle.p1.requestState, 'move');
	});

	it('lets a free-for-all go on when a player forfeits, even while waiting to submit', () => {
		battle = common.createBattle({ formatid: `${FORMAT},gametype=Freeforall` }, [
			[{ species: 'Mew', ability: 'Synchronize', moves: ['surf', 'splash'] }],
			[{ species: 'Wobbuffet', ability: 'Shadow Tag', level: 1, moves: ['splash'] }],
			[{ species: 'Blissey', ability: 'Natural Cure', moves: ['splash'] }],
			[{ species: 'Snorlax', ability: 'Thick Fat', moves: ['splash'] }],
		]);
		battle.makeChoices('move surf', 'move splash', 'move splash', 'move splash');
		assert(battle.p2.infiniteWaiting);

		battle.lose('p2');
		assert.false(battle.p2.infiniteWaiting);
		assert(battle.p2.activeRequest.wait);
		battle.makeChoices('move splash', '', 'move splash', 'move splash');
		assert.equal(battle.turn, 3);

		const pos = battle.log.length;
		battle.lose('p3');
		assert.false(logSince(pos).includes('|infinite|p3|1'));
		assert.false(battle.p3.infiniteWaiting);
		assert.false(battle.ended);

		battle.lose('p4');
		assert(battle.ended);
		assert.equal(battle.winner, battle.p1.name);
	});

	it('does not let a side skip its only slot, even when both sides are out', () => {
		battle = common.createBattle({ formatid: FORMAT }, [[
			{ species: 'Wobbuffet', ability: 'Shadow Tag', moves: ['explosion'] },
		], [
			{ species: 'Chansey', ability: 'Natural Cure', level: 5, moves: ['splash'] },
		]]);
		battle.makeChoices('move explosion', 'move splash');
		const pos = battle.log.length;
		battle.infiniteSubmit('p1', 'defer');
		battle.infiniteSubmit('p2', 'defer');
		assert(logSince(pos).includes('|infinite|p1|1'));
		assert(logSince(pos).includes('|infinite|p2|1'));
		assert(battle.p1.infiniteWaiting);
		assert(battle.p2.infiniteWaiting);
		assert.false(battle.ended);
		battle.infiniteSubmit('p1', 'existing 1');
		battle.infiniteSubmit('p2', 'existing 1');
		assert.equal(battle.p1.requestState, 'move');
		assert.equal(battle.p2.requestState, 'move');
	});

	it('ends a free-for-all when the only player left is waiting to submit', () => {
		battle = common.createBattle({ formatid: `${FORMAT},gametype=Freeforall` }, [
			[{ species: 'Mew', ability: 'Synchronize', moves: ['splash'] }],
			[{ species: 'Blissey', ability: 'Natural Cure', moves: ['splash'] }],
			[{ species: 'Snorlax', ability: 'Thick Fat', moves: ['splash'] }],
			[{ species: 'Wobbuffet', ability: 'Shadow Tag', level: 5, moves: ['memento'] }],
		]);
		battle.lose('p2');
		battle.lose('p3');
		battle.makeChoices('move splash', '', '', 'move memento 1');
		assert(battle.p4.infiniteWaiting);
		battle.lose('p1');
		assert(battle.ended);
		assert.equal(battle.winner, battle.p4.name);
	});

	it('shows a rejected submission only to the player who sent it', () => {
		battle = common.createBattle({ formatid: FORMAT }, [[
			{ species: 'Wobbuffet', ability: 'Shadow Tag', moves: ['memento'] },
		], [
			{ species: 'Mew', ability: 'Synchronize', moves: ['splash'] },
		]]);
		battle.makeChoices('move memento', 'move splash');
		const pos = battle.log.length;
		battle.infiniteSubmit('p1', 'Pikachu\\n- Notarealmove');
		const channels = extractChannelMessages(logSince(pos).join('\n'), [0, 1, 2]);
		const seen = channel => channels[channel].join('\n');
		assert(seen(1).includes('That set isn\'t legal'));
		assert.false(seen(2).includes('That set isn\'t legal'));
		assert.false(seen(0).includes('That set isn\'t legal'));
		assert(seen(2).includes('|infinite|p1|1'));
	});

	it('announces who ran out without telling spectators to paste a set', () => {
		battle = common.createBattle({ formatid: FORMAT }, [[
			{ species: 'Wobbuffet', ability: 'Shadow Tag', moves: ['memento'] },
		], [
			{ species: 'Mew', ability: 'Synchronize', moves: ['splash'] },
		]]);
		battle.makeChoices('move memento', 'move splash');
		assert(battle.log.includes(
			`|-message|${battle.p1.name} is out of Pokémon! They can send in a new one to keep battling.`
		));
		assert.false(battle.log.some(line => line.includes('Paste a Pokémon set')));
	});

	it('hurts a revived Pokemon and a newly submitted one with Stealth Rock', () => {
		battle = common.createBattle({ formatid: FORMAT }, [[
			{ species: 'Wobbuffet', ability: 'Shadow Tag', moves: ['memento'] },
		], [
			{ species: 'Mew', ability: 'Synchronize', moves: ['stealthrock', 'splash'] },
		]]);
		const hurtByRocks = (pos, ident) => logSince(pos).some(line => line.startsWith(`|-damage|${ident}|`) &&
			line.endsWith('|[from] Stealth Rock'));
		const wobbuffet = battle.p1.active[0];
		battle.makeChoices('move memento', 'move stealthrock');

		let pos = battle.log.length;
		battle.infiniteSubmit('p1', 'existing 1');
		assert(hurtByRocks(pos, 'p1a: Wobbuffet'));
		assert.equal(wobbuffet.hp, Math.floor(wobbuffet.maxhp / 2) - Math.floor(wobbuffet.maxhp / 8));

		battle.makeChoices('move memento', 'move splash');
		pos = battle.log.length;
		battle.infiniteSubmit('p1', 'Charizard\\nAbility: Blaze\\n- Memento');
		const charizard = battle.p1.active[0];
		assert(hurtByRocks(pos, 'p1a: Charizard'));
		assert.equal(charizard.hp, charizard.maxhp - Math.floor(charizard.maxhp / 2));
		assert.equal(battle.p1.requestState, 'move');
	});

	it('poisons a revived Pokemon and a newly submitted one with Toxic Spikes', () => {
		battle = common.createBattle({ formatid: FORMAT }, [[
			{ species: 'Wobbuffet', ability: 'Shadow Tag', moves: ['memento'] },
		], [
			{ species: 'Mew', ability: 'Synchronize', moves: ['toxicspikes', 'splash'] },
		]]);
		battle.makeChoices('move memento', 'move toxicspikes');
		battle.infiniteSubmit('p1', 'existing 1');
		assert.equal(battle.p1.active[0].status, 'psn');

		battle.makeChoices('move memento', 'move splash');
		const pos = battle.log.length;
		battle.infiniteSubmit('p1', 'Pichu\\nAbility: Static\\n- Memento');
		assert(logSince(pos).includes('|-status|p1a: Pichu|psn'));
		assert.equal(battle.p1.active[0].status, 'psn');
	});

	it('lowers the foe\'s Attack with Intimidate when a Pokemon is revived or sent in', () => {
		battle = common.createBattle({ formatid: FORMAT }, [[
			{ species: 'Wobbuffet', ability: 'Intimidate', level: 1, moves: ['splash'] },
		], [
			{ species: 'Mew', ability: 'Synchronize', moves: ['psychic'] },
		]]);
		const mew = battle.p2.active[0];
		battle.makeChoices('move splash', 'move psychic');
		assert(battle.p1.infiniteWaiting);

		let atk = mew.boosts.atk;
		let pos = battle.log.length;
		battle.infiniteSubmit('p1', 'existing 1');
		assert(logSince(pos).includes('|-ability|p1a: Wobbuffet|Intimidate|boost'));
		assert(logSince(pos).includes('|-unboost|p2a: Mew|atk|1'));
		assert.equal(mew.boosts.atk, atk - 1);

		battle.makeChoices('move splash', 'move psychic');
		atk = mew.boosts.atk;
		pos = battle.log.length;
		battle.infiniteSubmit('p1', 'Gyarados\\nLevel: 1\\nAbility: Intimidate\\n- Splash');
		assert(logSince(pos).includes('|-ability|p1a: Gyarados|Intimidate|boost'));
		assert.equal(mew.boosts.atk, atk - 1);
	});

	it('runs switch-in weather abilities, items and Imposter before the new request', () => {
		battle = common.createBattle({ formatid: FORMAT }, [[
			{ species: 'Wobbuffet', ability: 'Drought', moves: ['memento'] },
		], [
			{ species: 'Mew', ability: 'Synchronize', moves: ['splash'] },
		]]);
		battle.makeChoices('move memento', 'move splash');
		let pos = battle.log.length;
		battle.infiniteSubmit('p1', 'Pelipper @ Air Balloon\\nAbility: Drizzle\\n- Memento');
		assert(logSince(pos).includes('|-weather|RainDance|[from] ability: Drizzle|[of] p1a: Pelipper'));
		assert(logSince(pos).includes('|-item|p1a: Pelipper|Air Balloon'));
		assert.equal(battle.field.weather, 'raindance');

		battle.makeChoices('move memento', 'move splash');
		pos = battle.log.length;
		battle.infiniteSubmit('p1', `existing ${battle.p1.pokemon.findIndex(pokemon => pokemon.name === 'Wobbuffet') + 1}`);
		assert(logSince(pos).includes('|-weather|SunnyDay|[from] ability: Drought|[of] p1a: Wobbuffet'));
		assert.equal(battle.field.weather, 'sunnyday');

		battle.makeChoices('move memento', 'move splash');
		pos = battle.log.length;
		battle.infiniteSubmit('p1', 'Ditto\\nAbility: Imposter\\n- Transform');
		assert(logSince(pos).includes('|-transform|p1a: Ditto|p2a: Mew|[from] ability: Imposter'));
		assert(battle.p1.active[0].transformed);
		assert.deepEqual(battle.p1.activeRequest.active[0].moves.map(move => move.id), ['splash']);
	});

	it('heals a revived Pokemon with a Healing Wish still waiting in its slot', () => {
		battle = common.createBattle({ formatid: FORMAT }, [[
			{ species: 'Mew', ability: 'Synchronize', moves: ['healingwish'] },
			{ species: 'Wobbuffet', ability: 'Shadow Tag', moves: ['memento'] },
		], [
			{ species: 'Chansey', ability: 'Natural Cure', moves: ['splash'] },
		]]);
		battle.makeChoices('move healingwish', 'move splash');
		battle.makeChoices('switch 2', '');
		assert(battle.p1.slotConditions[0]['healingwish']);
		battle.makeChoices('move memento', 'move splash');

		const pos = battle.log.length;
		battle.infiniteSubmit('p1', 'existing 2');
		const mew = battle.p1.active[0];
		assert.equal(mew.name, 'Mew');
		assert(logSince(pos).some(line => line.startsWith('|-heal|p1a: Mew|') && line.endsWith('|[from] move: Healing Wish')));
		assert.equal(mew.hp, mew.maxhp);
		assert.false(battle.p1.slotConditions[0]['healingwish']);
	});

	it('asks the side again when hazards knock out the Pokemon it sent in', () => {
		battle = common.createBattle({ formatid: FORMAT }, [[
			{ species: 'Charizard', ability: 'Blaze', moves: ['memento'] },
		], [
			{ species: 'Mew', ability: 'Synchronize', moves: ['stealthrock', 'splash'] },
		]]);
		battle.makeChoices('move memento', 'move stealthrock');
		const turn = battle.turn;

		let pos = battle.log.length;
		battle.infiniteSubmit('p1', 'existing 1');
		assert(logSince(pos).includes('|faint|p1a: Charizard'));
		assert.equal(logSince(pos).filter(line => line === '|infinite|p1|1').length, 1);
		assert(battle.p1.infiniteWaiting);
		assert(battle.p1.activeRequest.wait);
		assert.equal(battle.p1.activeRequest.infinite, true);
		assert(battle.p2.activeRequest.wait);
		assert.equal(battle.turn, turn);

		pos = battle.log.length;
		battle.infiniteSubmit('p1', 'Wynaut\\nAbility: Shadow Tag\\n- Memento');
		assert(logSince(pos).some(line => line.startsWith('|-damage|p1a: Wynaut|') && line.endsWith('|[from] Stealth Rock')));
		assert.false(battle.p1.infiniteWaiting);
		assert.equal(battle.p1.requestState, 'move');
		assert.equal(battle.p2.requestState, 'move');
		battle.makeChoices('move memento', 'move splash');
		assert.equal(battle.turn, turn + 1);
		assert(battle.p1.infiniteWaiting);
	});

	it('resolves the switch-ins together, in speed order, when both sides of a doubles battle were out', () => {
		battle = common.createBattle({ formatid: `${FORMAT},gametype=Doubles` }, [[
			{ species: 'Wobbuffet', ability: 'Shadow Tag', moves: ['explosion'] },
			{ species: 'Wynaut', ability: 'Shadow Tag', level: 1, moves: ['splash'] },
		], [
			{ species: 'Chansey', ability: 'Natural Cure', level: 1, moves: ['splash'] },
			{ species: 'Pichu', ability: 'Static', level: 1, moves: ['splash'] },
		]]);
		battle.makeChoices('move explosion, move splash', 'move splash, move splash');
		assert(battle.p1.infiniteWaiting);
		assert(battle.p2.infiniteWaiting);

		let pos = battle.log.length;
		battle.infiniteSubmit('p2', 'Gyarados\\nAbility: Intimidate\\n- Splash');
		assert(logSince(pos).some(line => line.startsWith('|switch|p2a: Gyarados|')));
		assert.false(logSince(pos).some(line => line.startsWith('|-ability|')));
		assert(battle.p2.activeRequest.wait);

		pos = battle.log.length;
		battle.infiniteSubmit('p1', 'Salamence\\nAbility: Intimidate\\n- Splash');
		const lines = logSince(pos);
		const salamence = lines.indexOf('|-ability|p1a: Salamence|Intimidate|boost');
		const gyarados = lines.indexOf('|-ability|p2a: Gyarados|Intimidate|boost');
		assert(salamence >= 0 && gyarados > salamence);
		assert.equal(battle.p1.active[0].boosts.atk, -1);
		assert.equal(battle.p2.active[0].boosts.atk, -1);
		assert.equal(battle.p1.requestState, 'move');
		assert.equal(battle.p2.requestState, 'move');

		battle.makeChoices('move splash, pass', 'move splash, pass');
		assert.equal(battle.turn, 3);
	});

	it('resolves a Pokemon sent in mid-turn together with the foe\'s switch-in', () => {
		battle = common.createBattle({ formatid: FORMAT }, [[
			{ species: 'Wobbuffet', ability: 'Shadow Tag', level: 5, moves: ['splash'] },
		], [
			{ species: 'Weavile', ability: 'Pressure', moves: ['uturn'] },
			{ species: 'Mew', ability: 'Synchronize', moves: ['splash'] },
		]]);
		const mew = battle.p2.pokemon[1];
		battle.makeChoices('move splash', 'move uturn');
		assert.equal(battle.requestState, 'switch');

		let pos = battle.log.length;
		battle.infiniteSubmit('p1', 'Gyarados\\nAbility: Intimidate\\n- Splash');
		assert(logSince(pos).some(line => line.startsWith('|switch|p1a: Gyarados|')));
		assert.false(logSince(pos).some(line => line.startsWith('|-ability|')));

		pos = battle.log.length;
		battle.choose('p2', 'switch 2');
		const lines = logSince(pos);
		const mewIn = lines.findIndex(line => line.startsWith('|switch|p2a: Mew|'));
		assert(mewIn >= 0 && mewIn < lines.indexOf('|-ability|p1a: Gyarados|Intimidate|boost'));
		assert(lines.includes('|-unboost|p2a: Mew|atk|1'));
		assert.equal(mew.boosts.atk, -1);
		assert.equal(battle.turn, 2);
	});

	it('switches a Pokemon revived from a Rotation back slot in with a |switch|, not a |rotate|', () => {
		battle = common.createBattle({ formatid: `${FORMAT},gametype=Rotation` }, [[
			{ species: 'Wobbuffet', ability: 'Shadow Tag', moves: ['memento'] },
			{ species: 'Wynaut', ability: 'Shadow Tag', moves: ['memento'] },
			{ species: 'Pichu', ability: 'Static', moves: ['memento'] },
		], [
			{ species: 'Mew', ability: 'Synchronize', moves: ['stealthrock', 'splash'] },
			{ species: 'Chansey', ability: 'Natural Cure', moves: ['splash'] },
			{ species: 'Blissey', ability: 'Natural Cure', moves: ['splash'] },
		]]);
		battle.makeChoices('move memento', 'move stealthrock');
		battle.makeChoices('move memento', 'move splash');
		battle.makeChoices('move memento', 'move splash');
		assert(battle.p1.infiniteWaiting);

		for (const position of [1, 2]) {
			const revived = battle.p1.pokemon[position];
			const front = battle.p1.pokemon[0];
			const pos = battle.log.length;
			battle.infiniteSubmit('p1', `existing ${position + 1}`);
			assert(logSince(pos).some(line => line.startsWith(`|switch|p1a: ${revived.name}|`)));
			assert.false(logSince(pos).some(line => line.startsWith('|rotate|')));
			assert(logSince(pos).some(line => line.startsWith(`|-damage|p1a: ${revived.name}|`)));
			assert.equal(battle.p1.active[0], revived);
			assert.equal(battle.p1.pokemon[0], revived);
			assert.equal(battle.p1.pokemon[position], front);
			assert.equal(front.position, position);
			battle.makeChoices('move memento', 'move splash');
		}

		battle.destroy();
		battle = common.createBattle({ formatid: `${FORMAT},gametype=Rotation` }, [[
			{ species: 'Wobbuffet', ability: 'Shadow Tag', moves: ['memento'] },
		], [
			{ species: 'Mew', ability: 'Synchronize', moves: ['splash'] },
		]]);
		battle.makeChoices('move memento', 'move splash');
		const pos = battle.log.length;
		battle.infiniteSubmit('p1', 'Charizard\\nAbility: Blaze\\n- Memento');
		assert(logSince(pos).some(line => line.startsWith('|switch|p1a: Charizard|')));
		assert.equal(battle.p1.active[0].name, 'Charizard');
	});

	it('works out trapping and disabled moves again after an Infinite switch-in', () => {
		battle = common.createBattle({ formatid: FORMAT }, [[
			{ species: 'Wynaut', ability: 'Shadow Tag', level: 1, moves: ['memento'] },
		], [
			{ species: 'Mew', ability: 'Synchronize', moves: ['splash'] },
			{ species: 'Chansey', ability: 'Natural Cure', moves: ['splash'] },
		]]);
		battle.makeChoices('move memento', 'move splash');
		battle.infiniteSubmit('p1', 'Wobbuffet\\nAbility: Shadow Tag\\n- Splash');
		assert(battle.p2.activeRequest.active[0].maybeTrapped);
		assert.throws(() => battle.choose('p2', 'switch 2'), /trapped/);

		battle.destroy();
		battle = common.createBattle({ formatid: FORMAT }, [[
			{ species: 'Wynaut', ability: 'Shadow Tag', level: 1, moves: ['memento'] },
		], [
			{ species: 'Mew', ability: 'Synchronize', moves: ['splash'] },
		]]);
		battle.makeChoices('move memento', 'move splash');
		battle.infiniteSubmit('p1', 'Snorlax @ Assault Vest\\nAbility: Thick Fat\\n- Protect\\n- Body Slam');
		assert(battle.p1.activeRequest.active[0].moves.find(move => move.id === 'protect').disabled);
		assert.throws(() => battle.choose('p1', 'move protect'), /disabled/);

		battle.destroy();
		battle = common.createBattle({ formatid: FORMAT }, [[
			{ species: 'Wynaut', ability: 'Shadow Tag', item: 'Choice Scarf', level: 1, moves: ['splash', 'memento'] },
			{ species: 'Wobbuffet', ability: 'Shadow Tag', level: 1, moves: ['splash'] },
		], [
			{ species: 'Mew', ability: 'Synchronize', moves: ['splash', 'tackle'] },
		]]);
		battle.makeChoices('move splash', 'move splash');
		battle.makeChoices('move splash', 'move tackle');
		battle.makeChoices('switch 2', '');
		battle.makeChoices('move splash', 'move tackle');
		assert(battle.p1.infiniteWaiting);
		battle.infiniteSubmit('p1', 'existing 2');
		assert.equal(battle.p1.active[0].name, 'Wynaut');
		assert.false(battle.p1.activeRequest.active[0].moves.find(move => move.id === 'memento').disabled);
		assert(battle.choose('p1', 'move memento'));
	});

	it('names the |faint| line a revive undoes, so clients can tell apart teammates that share a name', () => {
		battle = common.createBattle({ formatid: `${FORMAT},gametype=Doubles` }, [[
			{ species: 'Dugtrio', ability: 'Arena Trap', gender: 'M', moves: ['memento'] },
			{ species: 'Dugtrio', ability: 'Arena Trap', gender: 'F', moves: ['memento'] },
		], [
			{ species: 'Mew', ability: 'Synchronize', moves: ['splash'] },
			{ species: 'Celebi', ability: 'Natural Cure', moves: ['splash'] },
		]]);
		battle.makeChoices('move memento 1, move memento 2', 'move splash, move splash');
		assert(battle.p1.infiniteWaiting);
		const faintLine = battle.log.filter(line => /^\|faint\|p1[a-c]: /.test(line)).indexOf('|faint|p1b: Dugtrio') + 1;
		assert(faintLine > 0);
		const pos = battle.log.length;
		battle.infiniteSubmit('p1', 'existing 2');
		const heals = logSince(pos).filter(line => line.startsWith('|-heal|p1: Dugtrio|'));
		assert(heals.length && heals.every(line => line.endsWith(`|[from] move: Revival Blessing|[faint] ${faintLine}`)));
		assert(logSince(pos).some(line => line.startsWith('|switch|p1b: Dugtrio|Dugtrio, F|')));
	});

	it('lets the side that submitted first wait instead of choosing a move before the other side is back', () => {
		battle = common.createBattle({ formatid: FORMAT }, [[
			{ species: 'Wobbuffet', ability: 'Shadow Tag', moves: ['explosion', 'splash'] },
		], [
			{ species: 'Chansey', ability: 'Natural Cure', level: 5, moves: ['splash'] },
		]]);
		battle.makeChoices('move explosion', 'move splash');
		battle.infiniteSubmit('p1', 'Gyarados\\nAbility: Intimidate\\n- Splash');
		assert(battle.p1.activeRequest.wait);
		assert.throws(() => battle.choose('p1', 'move splash'));
		battle.infiniteSubmit('p2', 'Salamence\\nAbility: Intimidate\\n- Splash');
		assert.equal(battle.p1.requestState, 'move');
		assert.equal(battle.p2.requestState, 'move');
		const rqid = battle.p1.activeRequest.rqid;
		battle.choose('p1', 'move splash');
		assert.equal(battle.p1.activeRequest.rqid, rqid);
		assert(battle.p1.isChoiceDone());
		battle.choose('p2', 'move splash');
		assert.equal(battle.turn, 3);
	});

	it('names the |faint| line a revive undoes for identical teammates, disguises and Illusion', () => {
		battle = common.createBattle({ formatid: FORMAT }, [[
			{ species: 'Mew', ability: 'Synchronize', moves: ['memento'] },
			{ species: 'Mew', ability: 'Synchronize', moves: ['memento'] },
		], [
			{ species: 'Chansey', ability: 'Natural Cure', moves: ['splash'] },
		]]);
		const [first, second] = battle.p1.pokemon;
		battle.makeChoices('move memento', 'move splash');
		battle.makeChoices('switch 2', '');
		battle.makeChoices('move memento', 'move splash');
		const heals = (pos, ident) => logSince(pos).filter(line => line.startsWith(`|-heal|${ident}|`));
		let pos = battle.log.length;
		battle.infiniteSubmit('p1', `existing ${battle.p1.pokemon.indexOf(second) + 1}`);
		assert(heals(pos, 'p1: Mew').length && heals(pos, 'p1: Mew').every(line => line.endsWith('|[faint] 2')));
		battle.makeChoices('move memento', 'move splash');
		pos = battle.log.length;
		battle.infiniteSubmit('p1', `existing ${battle.p1.pokemon.indexOf(first) + 1}`);
		assert(heals(pos, 'p1: Mew').length && heals(pos, 'p1: Mew').every(line => line.endsWith('|[faint] 1')));

		battle.destroy();
		battle = common.createBattle({ formatid: 'gen9customdisguises@@@Infinite Mod' }, [[
			{ species: 'Wobbuffet', ability: 'Shadow Tag', moves: ['memento'] },
		], [
			{ species: 'Chansey', ability: 'Natural Cure', moves: ['splash'] },
		]]);
		battle.makeChoices('move memento', 'move splash');
		battle.infiniteSubmit('p1', 'Magnemite\\nAbility: Sturdy\\nsprite: Pikachu\\n- Memento');
		battle.makeChoices('move memento', 'move splash');
		battle.infiniteSubmit('p1', 'Porygon\\nAbility: Trace\\nsprite: Pikachu\\n- Memento');
		battle.makeChoices('move memento', 'move splash');
		const magnemite = battle.p1.pokemon.find(pokemon => pokemon.species.name === 'Magnemite');
		pos = battle.log.length;
		battle.infiniteSubmit('p1', `existing ${battle.p1.pokemon.indexOf(magnemite) + 1}`);
		const channels = extractChannelMessages(logSince(pos).join('\n'), [0, 1]);
		for (const channel of [0, 1]) {
			assert(channels[channel].some(line => line.startsWith('|-heal|p1: Pikachu|') && line.endsWith('|[faint] 2')));
		}

		battle.destroy();
		battle = common.createBattle({ formatid: FORMAT }, [[
			{ species: 'Zoroark', ability: 'Illusion', moves: ['memento'] },
			{ species: 'Mew', ability: 'Synchronize', moves: ['memento'] },
		], [
			{ species: 'Chansey', ability: 'Natural Cure', moves: ['splash'] },
		]]);
		battle.makeChoices('move memento', 'move splash');
		assert(battle.log.includes('|faint|p1a: Mew'));
		battle.makeChoices('switch 2', '');
		battle.makeChoices('move memento', 'move splash');
		const zoroark = battle.p1.pokemon.find(pokemon => pokemon.species.name === 'Zoroark');
		pos = battle.log.length;
		battle.infiniteSubmit('p1', `existing ${battle.p1.pokemon.indexOf(zoroark) + 1}`);
		assert(heals(pos, 'p1: Zoroark').length && heals(pos, 'p1: Zoroark').every(line => line.endsWith('|[faint] 1')));
	});

	it('holds every other side while one is out, and asks them all once the field is set', () => {
		battle = common.createBattle({ formatid: FORMAT }, [[
			{ species: 'Wobbuffet', ability: 'Shadow Tag', moves: ['memento'] },
		], [
			{ species: 'Mew', ability: 'Synchronize', moves: ['splash'] },
		]]);
		battle.makeChoices('move memento', 'move splash');
		assert(battle.p1.infiniteWaiting);
		assert(battle.p2.activeRequest.wait);
		assert.equal(battle.p2.activeRequest.infinite, undefined);
		assert.throws(() => battle.choose('p2', 'move splash'));
		battle.infiniteSubmit('p1', 'existing 1');
		assert.equal(battle.p1.requestState, 'move');
		assert.equal(battle.p2.requestState, 'move');
	});

	it('keeps holding the side that submitted first when hazards knock out the other side\'s Pokemon', () => {
		battle = common.createBattle({ formatid: FORMAT }, [[
			{ species: 'Wobbuffet', ability: 'Shadow Tag', moves: ['explosion', 'splash'] },
		], [
			{ species: 'Mew', ability: 'Synchronize', level: 5, moves: ['stealthrock'] },
		]]);
		battle.makeChoices('move splash', 'move stealthrock');
		battle.makeChoices('move explosion', 'move stealthrock');
		assert(battle.p1.infiniteWaiting);
		assert(battle.p2.infiniteWaiting);

		battle.infiniteSubmit('p2', 'Chansey\\nAbility: Natural Cure\\n- Splash');
		assert(battle.p2.activeRequest.wait);
		battle.infiniteSubmit('p1', 'Shedinja\\nAbility: Wonder Guard\\n- Splash');
		assert(battle.p1.infiniteWaiting);
		assert(battle.p2.activeRequest.wait);
		assert.equal(battle.p2.activeRequest.infinite, undefined);
		battle.infiniteSubmit('p1', 'Wobbuffet\\nAbility: Shadow Tag\\n- Splash');
		assert.equal(battle.p1.requestState, 'move');
		assert.equal(battle.p2.requestState, 'move');
		const turn = battle.turn;
		battle.makeChoices('move splash', 'move splash');
		assert.equal(battle.turn, turn + 1);
	});

	it('announces the new team size when a pasted set joins the team', () => {
		battle = common.createBattle({ formatid: FORMAT }, [[
			{ species: 'Mew', ability: 'Synchronize', moves: ['memento'] },
		], [
			{ species: 'Chansey', ability: 'Natural Cure', moves: ['splash'] },
		]]);
		battle.makeChoices('move memento', 'move splash');
		const pos = battle.log.length;
		battle.infiniteSubmit('p1', 'Mew\\nAbility: Synchronize\\n- Memento');
		assert(logSince(pos).includes('|teamsize|p1|2'));
		battle.makeChoices('move memento', 'move splash');
		assert(battle.p1.infiniteWaiting);
		const revivePos = battle.log.length;
		battle.infiniteSubmit('p1', 'existing 1');
		assert(!logSince(revivePos).some(line => line.startsWith('|teamsize|')));
		assert.equal(battle.p1.pokemon.length, 2);
	});

	it('survives a save and restore after a set was pasted, while a side is held', () => {
		battle = common.createBattle({ formatid: FORMAT }, [[
			{ species: 'Wobbuffet', ability: 'Shadow Tag', moves: ['explosion'] },
		], [
			{ species: 'Chansey', ability: 'Natural Cure', level: 5, moves: ['splash'] },
		]]);
		battle.makeChoices('move explosion', 'move splash');
		battle.infiniteSubmit('p2', 'Gyarados\\nAbility: Intimidate\\n- Splash');
		const copy = Battle.fromJSON(JSON.stringify(battle.toJSON()));
		try {
			assert.notEqual(copy.log, battle.log);
			assert(copy.ruleTable.has('infinitemod'));
			assert(copy.p2.activeRequest.wait);
			assert(copy.p1.infiniteWaiting);
			for (const each of [battle, copy]) {
				each.infiniteSubmit('p1', 'Salamence\\nAbility: Intimidate\\n- Splash\\n- Explosion');
				each.makeChoices('move splash', 'move splash');
				each.makeChoices('move explosion', 'move splash');
			}
			const clean = each => each.log.filter(line => !line.startsWith('|t:|'));
			assert.deepEqual(clean(copy), clean(battle));
			assert.equal(copy.turn, 4);
			assert(copy.p1.infiniteWaiting);
			assert(!copy.ended);
		} finally {
			copy.destroy();
		}
	});

	it('keeps the turn when an Infinite Mod switch-in makes the foe switch out', () => {
		battle = common.createBattle({ formatid: FORMAT }, [[
			{ species: 'Wobbuffet', ability: 'Shadow Tag', level: 1, moves: ['explosion'] },
		], [
			{ species: 'Mew', ability: 'Synchronize', item: 'Eject Pack', moves: ['splash'] },
			{ species: 'Chansey', ability: 'Natural Cure', moves: ['splash'] },
		]]);
		battle.makeChoices('move explosion', 'move splash');
		assert(battle.p1.infiniteWaiting);
		assert.equal(battle.turn, 2);

		let pos = battle.log.length;
		battle.infiniteSubmit('p1', 'Gyarados\\nAbility: Intimidate\\n- Splash');
		assert(logSince(pos).includes('|-unboost|p2a: Mew|atk|1'));
		assert.equal(battle.requestState, 'switch');
		assert(battle.p2.activeRequest.forceSwitch);

		pos = battle.log.length;
		battle.makeChoices('', 'switch 2');
		assert(logSince(pos).some(line => line.startsWith('|switch|p2a: Chansey|')));
		assert.false(logSince(pos).some(line => line.startsWith('|turn|')));
		assert.equal(battle.turn, 2);
		assert.equal(battle.p1.requestState, 'move');
		assert.equal(battle.p2.requestState, 'move');

		pos = battle.log.length;
		battle.makeChoices('move splash', 'move splash');
		assert(logSince(pos).includes('|move|p1a: Gyarados|Splash|p1a: Gyarados'));
		assert.equal(battle.turn, 3);
	});

	it('saves and restores a picked team after pasted sets grow it past nine Pokemon', () => {
		const mon = species => ({ species, ability: 'Pressure', moves: ['memento', 'splash'] });
		battle = common.createBattle({ formatid: `${FORMAT},Picked Team Size = 3` }, [
			['Wobbuffet', 'Wynaut', 'Mew', 'Chansey', 'Blissey', 'Snorlax'].map(mon),
			['Mewtwo', 'Lugia', 'Ho-Oh', 'Celebi', 'Jirachi', 'Deoxys'].map(mon),
		]);
		battle.makeChoices('team 612', 'team 123');
		const pastes = ['Pikachu', 'Raichu', 'Eevee', 'Vaporeon', 'Jolteon', 'Flareon', 'Espeon'];
		for (let i = 0; i < 60 && pastes.length && !battle.ended; i++) {
			if (battle.p1.infiniteWaiting) {
				battle.infiniteSubmit('p1', `${pastes.shift()}\\nAbility: Pressure\\n- Memento\\n- Splash`);
			} else if (battle.p1.activeRequest?.forceSwitch) {
				battle.makeChoices(`switch ${battle.p1.pokemon.findIndex(p => !p.fainted && !p.isActive) + 1}`, '');
			} else {
				battle.makeChoices('move memento', 'move splash');
			}
		}
		assert.equal(battle.p1.pokemon.length, 10);
		const copy = Battle.fromJSON(JSON.stringify(battle.toJSON()));
		try {
			const describe = each => each.p1.pokemon.map(p => `${p.name}:${p.hp}:${p.fainted}:${p.position}`);
			assert.deepEqual(describe(copy), describe(battle));
		} finally {
			copy.destroy();
		}
	});

	it('keeps the side conditions allies share in a multi battle after a save and restore', () => {
		const mon = (species, moves) => ({ species, ability: 'Pressure', moves });
		battle = common.createBattle({ formatid: `${FORMAT},gametype=Multi` }, [
			[mon('Skarmory', ['spikes', 'splash']), mon('Mew', ['splash'])],
			[mon('Chansey', ['splash']), mon('Blissey', ['splash'])],
			[mon('Deoxys', ['splash', 'spikes']), mon('Jirachi', ['splash'])],
			[mon('Snorlax', ['splash']), mon('Celebi', ['splash'])],
		]);
		battle.makeChoices('move spikes', 'move splash', 'move splash', 'move splash');
		const copy = Battle.fromJSON(JSON.stringify(battle.toJSON()));
		try {
			assert.equal(copy.sides[2].sideConditions, copy.sides[0].sideConditions);
			assert.equal(copy.sides[3].sideConditions, copy.sides[1].sideConditions);
			for (const each of [battle, copy]) {
				each.makeChoices('move splash', 'move splash', 'move spikes', 'move splash');
				each.makeChoices('move splash', 'move splash', 'move splash', 'switch 2');
			}
			const clean = each => each.log.filter(line => !line.startsWith('|t:|'));
			assert.deepEqual(clean(copy), clean(battle));
			assert.equal(copy.sides[3].sideConditions.spikes.layers, 2);
		} finally {
			copy.destroy();
		}
	});

	it('sends allies and the cancel setting with the move request that follows an Infinite switch-in', () => {
		const mon = (species, moves) => ({ species, ability: 'Pressure', moves });
		battle = common.createBattle({ formatid: `${FORMAT},gametype=Multi` }, [
			[mon('Mew', ['memento', 'splash'])], [mon('Chansey', ['splash'])],
			[mon('Deoxys', ['splash'])], [mon('Snorlax', ['splash'])],
		]);
		battle.makeChoices('move memento 1', 'move splash', 'move splash', 'move splash');
		battle.infiniteSubmit('p1', 'Wobbuffet\\nAbility: Pressure\\n- Splash');
		for (const side of battle.sides) {
			assert(side.activeRequest.active);
			assert.equal(side.activeRequest.ally.pokemon[0].ident, `${side.allySide.id}: ${side.allySide.pokemon[0].name}`);
		}
		assert.equal(battle.p1.activeRequest.ally.pokemon[0].ident, 'p3: Deoxys');
		battle.destroy();

		battle = common.createBattle({ formatid: `${FORMAT},!Cancel Mod` }, [
			[mon('Mew', ['memento', 'splash'])], [mon('Chansey', ['splash'])],
		]);
		battle.makeChoices('move memento', 'move splash');
		battle.infiniteSubmit('p1', 'Wobbuffet\\nAbility: Pressure\\n- Splash');
		assert(battle.p1.activeRequest.noCancel);
		assert(battle.p2.activeRequest.noCancel);
	});

	it('lets a pasted Pokemon hold several statuses under MultiStatus Mod', () => {
		battle = common.createBattle({ formatid: 'gen9customdisguises@@@MultiStatus Mod,Infinite Mod' }, [[
			{ species: 'Chansey', ability: 'Natural Cure', moves: ['memento', 'splash'] },
		], [
			{ species: 'Mew', ability: 'No Guard', moves: ['toxic', 'thunderwave', 'splash'] },
		]]);
		if (battle.requestState === 'teampreview') battle.makeChoices('default', 'default');
		battle.makeChoices('move memento', 'move splash');
		battle.infiniteSubmit('p1', 'Chansey\\nAbility: Natural Cure\\n- Splash');
		battle.makeChoices('move splash', 'move toxic');
		battle.makeChoices('move splash', 'move thunderwave');
		const chansey = battle.p1.active[0];
		assert.equal(chansey.status, 'tox');
		assert.deepEqual(chansey.m.extraStatuses, ['par']);
	});

	it('gives a pasted set every starting status under MultiStatus Mod', () => {
		battle = common.createBattle({ formatid: 'gen9customdisguises@@@MultiStatus Mod,Infinite Mod' }, [[
			{ species: 'Chansey', ability: 'Natural Cure', moves: ['memento', 'splash'] },
		], [
			{ species: 'Mew', ability: 'Synchronize', moves: ['splash'] },
		]]);
		if (battle.requestState === 'teampreview') battle.makeChoices('default', 'default');
		battle.makeChoices('move memento', 'move splash');
		battle.infiniteSubmit('p1', 'Chansey\\nAbility: Natural Cure\\nStatus: Toxic / Paralysis\\n- Splash');
		assert.equal(battle.p1.active[0].status, 'tox');
		assert.deepEqual(battle.p1.active[0].m.extraStatuses, ['par']);
	});

	it('lets a pasted Pokemon hold several statuses in SpaceWorld Custom Disguises', () => {
		battle = common.createBattle({ formatid: 'gen2spaceworldcustomdisguises@@@MultiStatus Mod,Infinite Mod' }, [[
			{ species: 'Chansey', ability: 'No Ability', level: 1, moves: ['splash'] },
		], [
			{ species: 'Mew', ability: 'No Ability', moves: ['toxic', 'thunderwave', 'splash', 'psychic'] },
		]]);
		if (battle.requestState === 'teampreview') battle.makeChoices('default', 'default');
		for (let i = 0; i < 10 && !battle.p1.infiniteWaiting; i++) battle.makeChoices('move splash', 'move psychic');
		assert(battle.p1.infiniteWaiting);
		battle.infiniteSubmit('p1', 'Chansey\\nAbility: No Ability\\nLevel: 50\\n- Splash');
		battle.makeChoices('move splash', 'move toxic');
		battle.makeChoices('move splash', 'move thunderwave');
		assert.equal(battle.p1.active[0].status, 'tox');
		assert.deepEqual(battle.p1.active[0].m.extraStatuses, ['par']);
	});

	it('keeps MultiStatus Mod working on a pasted Pokemon that faints and is revived', () => {
		battle = common.createBattle({ formatid: 'gen9customdisguises@@@MultiStatus Mod,Infinite Mod' }, [[
			{ species: 'Chansey', ability: 'Natural Cure', moves: ['memento', 'splash'] },
		], [
			{ species: 'Mew', ability: 'Synchronize', moves: ['splash', 'toxic', 'thunderwave'] },
		]]);
		if (battle.requestState === 'teampreview') battle.makeChoices('default', 'default');
		battle.makeChoices('move memento', 'move splash');
		battle.infiniteSubmit('p1', 'Blissey\\nAbility: Natural Cure\\n- Memento\\n- Splash');
		battle.makeChoices('move memento', 'move splash');
		const at = name => battle.p1.pokemon.findIndex(p => p.species.name === name) + 1;
		battle.infiniteSubmit('p1', `existing ${at('Chansey')}`);
		battle.makeChoices('move memento', 'move splash');
		battle.infiniteSubmit('p1', `existing ${at('Blissey')}`);
		const blissey = battle.p1.active[0];
		assert.equal(blissey.species.name, 'Blissey');
		battle.makeChoices('move splash', 'move toxic');
		battle.makeChoices('move splash', 'move thunderwave');
		assert.equal(blissey.status, 'tox');
		assert.deepEqual(blissey.m.extraStatuses, ['par']);
	});
});
