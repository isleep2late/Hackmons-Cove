const assert = require('assert').strict;
const {describe, it} = require('node:test');

window = global;

require('../play.pokemonshowdown.com/js/battle-dex-data.js');
require('../play.pokemonshowdown.com/js/battle-dex.js');
require('../play.pokemonshowdown.com/js/battle-scene-stub.js');
// global.BattleText = require('../play.pokemonshowdown.com/data/text/en.js').BattleText;
require('../play.pokemonshowdown.com/js/battle-text-parser.js');
require('../play.pokemonshowdown.com/js/battle.js');

describe('Battle', () => {

	it('preserves chat scrollback when changing viewpoint before catching up', () => {
		const battle = new Battle({paused: true, debug: true});
		const messages = [];
		const pendingMessages = [];
		battle.scene.log.add = (args, kwargs, preempt) => {
			if (args[0] === 'c') (preempt ? pendingMessages : messages).push(args[2]);
		};
		battle.scene.reset = () => {
			messages.length = 0;
			pendingMessages.length = 0;
		};
		battle.scene.preemptCatchup = () => {
			if (pendingMessages.length) messages.push(pendingMessages.shift());
		};
		battle.addBatch([
			'|start',
			'|turn|1',
			'|c| Player|Earlier message',
			'|turn|2',
			'|c| Player|Latest message',
		]);
		assert.equal(battle.turn, 0);
		assert.deepEqual(pendingMessages, ['Earlier message', 'Latest message']);

		battle.setViewpoint('p2');
		battle.seekTurn(Infinity);
		assert.equal(battle.turn, 2);
		assert.deepEqual(messages, ['Earlier message', 'Latest message']);
		assert.deepEqual(pendingMessages, []);

		battle.addBatch(['|c| Player|New message']);
		assert.deepEqual(pendingMessages, ['New message']);
		battle.play();
		assert.deepEqual(messages, ['Earlier message', 'Latest message', 'New message']);
		assert.deepEqual(pendingMessages, []);
	});

	it('should process a bunch of messages properly', () => {
		let battle = new Battle({
			debug: true,
			log: [
				"|init|battle",
				"|title|FOO vs. BAR",
				"|j|FOO",
				"|j|BAR",
				"|request|",
				"|player|p1|FOO|169",
				"|player|p2|BAR|265",
				"|teamsize|p1|6",
				"|teamsize|p2|6",
				"|gametype|singles",
				"|gen|7",
				"|tier|[Gen 7] Random Battle",
				"|rated|",
				"|seed|",
				"|rule|Sleep Clause Mod: Limit one foe put to sleep",
				"|rule|HP Percentage Mod: HP is shown in percentages",
				"|",
				"|start",
				"|switch|p1a: Leafeon|Leafeon, L83, F|100/100",
				"|switch|p2a: Gliscor|Gliscor, L77, F|242/242",
				"|turn|1",
			],
		});

		let p1 = battle.sides[0];
		let p2 = battle.sides[1];

		assert(p1.name === 'FOO');
		let p1leafeon = p1.pokemon[0];
		assert(p1leafeon.ident === 'p1: Leafeon');
		assert(p1leafeon.details === 'Leafeon, L83, F');
		assert(p1leafeon.hp === 100);
		assert(p1leafeon.maxhp === 100);
		assert(p1leafeon.isActive());
		assert.deepEqual(p1leafeon.moveTrack, []);

		assert(p2.name === 'BAR');
		let p2gliscor = p2.pokemon[0];
		assert(p2gliscor.ident === 'p2: Gliscor');
		assert(p2gliscor.details === 'Gliscor, L77, F');
		assert(p2gliscor.hp === 242);
		assert(p2gliscor.maxhp === 242);
		assert(p2gliscor.isActive());
		assert.deepEqual(p2gliscor.moveTrack, []);

		for (const line of [
			"|",
			"|switch|p2a: Kyurem|Kyurem-White, L73|303/303",
			"|-ability|p2a: Kyurem|Turboblaze",
			"|move|p1a: Leafeon|Knock Off|p2a: Kyurem",
			"|-damage|p2a: Kyurem|226/303",
			"|-enditem|p2a: Kyurem|Leftovers|[from] move: Knock Off|[of] p1a: Leafeon",
			"|",
			"|upkeep",
			"|turn|2",
			"|inactive|Time left: 150 sec this turn | 740 sec total",
		]) {
			battle.add(line);
		}

		assert(!p2gliscor.isActive());
		let p2kyurem = p2.pokemon[1];
		assert(p2kyurem.ident === 'p2: Kyurem');
		assert(p2kyurem.details === 'Kyurem-White, L73');
		assert(p2kyurem.hp === 226);
		assert(p2kyurem.maxhp === 303);
		assert(p2kyurem.isActive());
		assert(p2kyurem.item === '');
		assert(p2kyurem.prevItem === 'Leftovers');

		assert.deepEqual(p1leafeon.moveTrack, [['Knock Off', 1]]);
	});

	function playLog(lines) {
		const battle = new Battle({ paused: true, debug: true });
		const errors = [];
		battle.scene.log.add = args => {
			if (args[0] === 'majorerror' || args[0] === 'error') errors.push(args.join('|'));
		};
		battle.addBatch([
			'|player|p1|FOO|1', '|player|p2|BAR|2', '|teamsize|p1|24', '|teamsize|p2|24', '|gametype|singles', '|gen|9',
			'|start', '|switch|p1a: Dugtrio|Dugtrio, M|100/100', '|switch|p2a: Mew|Mew|100/100', '|turn|1',
			'|faint|p1a: Dugtrio', '|switch|p1a: Dugtrio|Dugtrio, F|100/100', '|faint|p1a: Dugtrio', '|turn|2',
			...lines,
		]);
		battle.seekTurn(Infinity);
		return { battle, errors };
	}

	it('revives the teammate whose |faint| a Revival Blessing heal names, when two share a name', () => {
		const { battle, errors } = playLog([
			'|-heal|p1: Dugtrio|50/100|[from] move: Revival Blessing|[faint] 2',
			'|switch|p1a: Dugtrio|Dugtrio, F|50/100',
		]);
		const [male, female] = battle.p1.pokemon;
		assert.equal(battle.p1.pokemon.length, 2);
		assert.equal(male.details, 'Dugtrio, M');
		assert(male.fainted);
		assert.equal(female.details, 'Dugtrio, F');
		assert(!female.fainted);
		assert.equal(female.hp, 50);
		assert.equal(battle.p1.active[0], female);
		assert.deepEqual(errors, []);
	});

	it('revives the right one of two identical teammates', () => {
		const battle = new Battle({ paused: true, debug: true });
		battle.addBatch([
			'|player|p1|FOO|1', '|player|p2|BAR|2', '|teamsize|p1|24', '|teamsize|p2|24', '|gametype|singles', '|gen|9',
			'|start', '|switch|p1a: Mew|Mew|100/100', '|switch|p2a: Chansey|Chansey, F|100/100', '|turn|1',
			'|move|p1a: Mew|Memento|p2a: Chansey', '|faint|p1a: Mew',
			'|switch|p1a: Mew|Mew|100/100', '|move|p1a: Mew|Healing Wish|p1a: Mew', '|faint|p1a: Mew', '|turn|2',
			'|-heal|p1: Mew|50/100|[from] move: Revival Blessing|[faint] 2',
			'|switch|p1a: Mew|Mew|50/100',
		]);
		battle.seekTurn(Infinity);
		const [first, second] = battle.p1.pokemon;
		assert.equal(battle.p1.pokemon.length, 2);
		assert(first.fainted);
		assert.deepEqual(first.moveTrack.map(([move]) => move), ['Memento']);
		assert(!second.fainted);
		assert.equal(battle.p1.active[0], second);
		assert.deepEqual(second.moveTrack.map(([move]) => move), ['Healing Wish']);
	});

	it('undoes the faint an Illusion showed as a teammate when the Illusion user is revived', () => {
		const lines = [
			'|player|p1|FOO|1', '|player|p2|BAR|2', '|teamsize|p1|24', '|teamsize|p2|24', '|gametype|singles', '|gen|9',
			'|start', '|switch|p1a: Mew|Mew|100/100', '|switch|p2a: Chansey|Chansey, F|100/100', '|turn|1',
			'|move|p1a: Mew|Memento|p2a: Chansey', '|faint|p1a: Mew',
		];
		const revive = [
			'|-heal|p1: Zoroark|50/100|[from] move: Revival Blessing|[faint] 1', '|switch|p1a: Zoroark|Zoroark, M|50/100',
		];
		const play = batch => {
			const battle = new Battle({ paused: true, debug: true });
			const errors = [];
			battle.scene.log.add = args => {
				if (args[0] === 'majorerror' || args[0] === 'error') errors.push(args.join('|'));
			};
			battle.addBatch(batch);
			battle.seekTurn(Infinity);
			return { battle, errors, mews: battle.p1.pokemon.filter(p => p.name === 'Mew') };
		};

		let { battle, errors, mews } = play([...lines, '|turn|2', ...revive]);
		assert.equal(mews.length, 1);
		assert(!mews[0].fainted);
		assert.equal(battle.p1.active[0].name, 'Zoroark');
		assert.deepEqual(errors, []);

		({ battle, errors, mews } = play([
			...lines, '|switch|p1a: Mew|Mew|100/100', '|move|p1a: Mew|Splash|p1a: Mew', '|faint|p1a: Mew', '|turn|2', ...revive,
		]));
		assert.equal(mews.length, 1);
		assert(mews[0].fainted);
		assert.deepEqual(mews[0].moveTrack.map(([move]) => move), ['Splash']);
		assert.equal(battle.p1.active[0].name, 'Zoroark');
		assert.equal(battle.p1.pokemon.length, 2);
		assert.deepEqual(errors, []);
	});

	it('keeps a fainted twin when a pasted set grows the team past its starting size', () => {
		const battle = new Battle({ paused: true, debug: true });
		battle.addBatch([
			'|player|p1|FOO|1', '|player|p2|BAR|2', '|teamsize|p1|1', '|teamsize|p2|1', '|gametype|singles', '|gen|9',
			'|start', '|switch|p1a: Mew|Mew|100/100', '|switch|p2a: Chansey|Chansey, F|100/100', '|turn|1',
			'|move|p1a: Mew|Splash|p1a: Mew', '|turn|2',
			'|move|p1a: Mew|Memento|p2a: Chansey', '|faint|p1a: Mew',
			'|teamsize|p1|2', '|switch|p1a: Mew|Mew|100/100', '|turn|3',
			'|move|p1a: Mew|Celebrate|p1a: Mew', '|turn|4',
			'|move|p1a: Mew|Memento|p2a: Chansey', '|faint|p1a: Mew',
			'|-heal|p1: Mew|50/100|[from] move: Revival Blessing|[faint] 1', '|switch|p1a: Mew|Mew|50/100', '|turn|5',
			'|move|p1a: Mew|Splash|p1a: Mew',
		]);
		battle.seekTurn(Infinity);
		const [first, second] = battle.p1.pokemon;
		assert.equal(battle.p1.pokemon.length, 2);
		assert(!first.fainted);
		assert.equal(battle.p1.active[0], first);
		assert.deepEqual(first.moveTrack.map(([move]) => move), ['Splash', 'Memento']);
		assert(second.fainted);
		assert.deepEqual(second.moveTrack.map(([move]) => move), ['Celebrate', 'Memento']);
	});

	it('revives an Illusion user from Team Preview whose faint was shown as another Pokemon', () => {
		const battle = new Battle({ paused: true, debug: true });
		const errors = [];
		battle.scene.log.add = args => {
			if (args[0] === 'majorerror' || args[0] === 'error') errors.push(args.join('|'));
		};
		battle.addBatch([
			'|player|p1|FOO|1', '|player|p2|BAR|2', '|teamsize|p1|3', '|teamsize|p2|1', '|gametype|singles', '|gen|9',
			'|clearpoke', '|poke|p1|Zoroark, M|', '|poke|p1|Blissey, F|', '|poke|p1|Mew|', '|poke|p2|Chansey, F|', '|teampreview',
			'|start', '|switch|p1a: Mew|Mew|261/261', '|switch|p2a: Chansey|Chansey, F|641/641', '|turn|1',
			'|move|p1a: Mew|Memento|p2a: Chansey', '|faint|p1a: Mew', '|switch|p1a: Mew|Mew|341/341', '|turn|2',
			'|switch|p1a: Blissey|Blissey, F|651/651', '|turn|3',
			'|move|p1a: Blissey|Revival Blessing|p1a: Blissey',
			'|-heal|p1: Zoroark|130/261|[from] move: Revival Blessing|[faint] 1', '|turn|4',
		]);
		battle.seekTurn(Infinity);
		const zoroark = battle.p1.pokemon.find(p => p.speciesForme === 'Zoroark');
		assert(zoroark);
		assert(!zoroark.fainted);
		assert.equal(battle.p1.pokemon.filter(p => p.fainted).length, 0);
		assert.equal(battle.p1.pokemon.length, 3);
		assert.deepEqual(errors, []);
	});

	function playBatch(lines) {
		const battle = new Battle({ paused: true, debug: true });
		const errors = [];
		battle.scene.log.add = args => {
			if (args[0] === 'majorerror' || args[0] === 'error') errors.push(args.join('|'));
		};
		battle.addBatch(lines);
		battle.seekTurn(Infinity);
		return { battle, errors };
	}

	it('revives only the Illusion user, not a same-named teammate that fainted for real', () => {
		const { battle, errors } = playBatch([
			'|player|p1|FOO|1', '|player|p2|BAR|2', '|teamsize|p1|4', '|teamsize|p2|1', '|gametype|singles', '|gen|9',
			'|start', '|switch|p1a: Zoroark|Zoroark, M|261/261', '|switch|p2a: Chansey|Chansey, F|641/641', '|turn|1',
			'|move|p1a: Zoroark|Memento|p2a: Chansey', '|faint|p1a: Zoroark', '|switch|p1a: Mew|Mew|261/261', '|turn|2',
			'|move|p1a: Mew|Memento|p2a: Chansey', '|faint|p1a: Mew', '|switch|p1a: Blissey|Blissey, F|651/651', '|turn|3',
			'|move|p1a: Blissey|Revival Blessing|p1a: Blissey',
			'|-heal|p1: Zoroark|130/261|[from] move: Revival Blessing|[faint] 2', '|turn|4',
		]);
		const zoroark = battle.p1.pokemon.find(p => p.name === 'Zoroark');
		const mew = battle.p1.pokemon.find(p => p.name === 'Mew');
		assert(zoroark.fainted);
		assert(!mew.fainted);
		assert.equal(battle.p1.pokemon.filter(p => p.fainted).length, 1);
		assert.deepEqual(errors, []);
	});

	it('keeps the fainted original when a pasted set shares its species under Species Clause', () => {
		const { battle, errors } = playBatch([
			'|player|p1|FOO|1', '|player|p2|BAR|2', '|gametype|singles', '|gen|9',
			'|rule|Species Clause: Limit one of each Pok\u00e9mon', '|teamsize|p1|2', '|teamsize|p2|1',
			'|start', '|switch|p1a: Mew|Mew|341/341', '|switch|p2a: Chansey|Chansey, F|641/641', '|turn|1',
			'|move|p1a: Mew|Splash|p1a: Mew', '|turn|2',
			'|move|p1a: Mew|Memento|p2a: Chansey', '|faint|p1a: Mew', '|switch|p1a: Blissey|Blissey, F|651/651', '|turn|3',
			'|move|p1a: Blissey|Memento|p2a: Chansey', '|faint|p1a: Blissey', '|turn|4',
			'|teamsize|p1|3', '|switch|p1a: Mew|Mew|341/341', '|move|p1a: Mew|Celebrate|p1a: Mew', '|turn|5',
			'|move|p1a: Mew|Memento|p2a: Chansey', '|faint|p1a: Mew', '|turn|6',
			'|-heal|p1: Mew|170/341|[from] move: Revival Blessing|[faint] 1', '|switch|p1a: Mew|Mew|170/341',
			'|move|p1a: Mew|Splash|p1a: Mew', '|turn|7',
		]);
		const mews = battle.p1.pokemon.filter(p => p.name === 'Mew');
		assert.equal(battle.p1.pokemon.length, 3);
		assert.equal(mews.length, 2);
		assert(!mews[0].fainted);
		assert.equal(battle.p1.active[0], mews[0]);
		assert.deepEqual(mews[0].moveTrack.map(([move]) => move), ['Splash', 'Memento']);
		assert(mews[1].fainted);
		assert.deepEqual(mews[1].moveTrack.map(([move]) => move), ['Celebrate', 'Memento']);
		assert(battle.speciesClause);
		assert(battle.p1.pasted);
		assert(!battle.p2.pasted);
		assert.deepEqual(errors, []);
	});

	it('still catches the foe\'s Illusion under Species Clause after the other side pasted a set', () => {
		const { battle, errors } = playBatch([
			'|player|p1|FOO|1', '|player|p2|BAR|2', '|gametype|singles', '|gen|9',
			'|rule|Species Clause: Limit one of each Pok\u00e9mon', '|teamsize|p1|1', '|teamsize|p2|6',
			'|start', '|switch|p1a: Mew|Mew|341/341', '|switch|p2a: Mew|Mew|261/261', '|turn|1',
			'|move|p1a: Mew|Tackle|p2a: Mew', '|-damage|p2a: Mew|214/261', '|replace|p2a: Zoroark|Zoroark, M', '|turn|2',
			'|switch|p2a: Chansey|Chansey, F|641/641', '|move|p1a: Mew|Memento|p2a: Chansey', '|faint|p1a: Mew', '|turn|3',
			'|teamsize|p1|2', '|switch|p1a: Snorlax|Snorlax|461/461', '|switch|p2a: Mew|Mew|214/261', '|turn|4',
			'|move|p2a: Mew|Memento|p1a: Snorlax', '|faint|p2a: Mew', '|switch|p2a: Mew|Mew|341/341', '|turn|5',
		]);
		const zoroark = battle.p2.pokemon.find(p => p.speciesForme === 'Zoroark');
		assert(zoroark.fainted);
		assert.equal(zoroark.faintLine, 1);
		assert.equal(battle.p2.pokemon.filter(p => p.speciesForme === 'Mew').length, 1);
		assert(!battle.p2.pasted);
		assert.deepEqual(errors, []);
	});

	it('does not count an unpicked Team Preview Pokemon when a pasted set joins a picked team', () => {
		const { battle, errors } = playBatch([
			'|player|p1|FOO|1', '|player|p2|BAR|2', '|gametype|singles', '|gen|9',
			'|clearpoke', '|poke|p1|Mew|', '|poke|p1|Snorlax, M|', '|poke|p2|Chansey, F|', '|teampreview|1',
			'|teamsize|p1|1', '|teamsize|p2|1',
			'|start', '|switch|p1a: Mew|Mew|341/341', '|switch|p2a: Chansey|Chansey, F|641/641', '|turn|1',
			'|move|p1a: Mew|Memento|p2a: Chansey', '|faint|p1a: Mew', '|turn|2',
			'|teamsize|p1|2', '|switch|p1a: Mew|Mew|341/341', '|move|p1a: Mew|Memento|p2a: Chansey', '|faint|p1a: Mew', '|turn|3',
			'|-heal|p1: Mew|170/341|[from] move: Revival Blessing|[faint] 1', '|switch|p1a: Mew|Mew|170/341',
			'|move|p1a: Mew|Splash|p1a: Mew', '|turn|4',
		]);
		const snorlax = battle.p1.pokemon.find(p => p.speciesForme === 'Snorlax');
		const mews = battle.p1.pokemon.filter(p => p.name === 'Mew');
		assert(!snorlax.fainted);
		assert.equal(mews.length, 2);
		assert(!mews[0].fainted);
		assert.equal(battle.p1.active[0], mews[0]);
		assert(mews[1].fainted);
		assert.deepEqual(errors, []);
	});

	it('keeps a pasted twin when an Illusion user is revived later in a picked team', () => {
		const { battle, errors } = playBatch([
			'|player|p1|FOO|1', '|player|p2|BAR|2', '|gametype|singles', '|gen|9',
			'|clearpoke', '|poke|p1|Zoroark, M|', '|poke|p1|Mew|', '|poke|p1|Snorlax, F|', '|poke|p2|Chansey, F|', '|teampreview|2',
			'|teamsize|p1|2', '|teamsize|p2|1',
			'|start', '|switch|p1a: Mew|Mew|261/261', '|switch|p2a: Chansey|Chansey, F|641/641', '|turn|1',
			'|move|p1a: Mew|Memento|p2a: Chansey', '|faint|p1a: Mew', '|switch|p1a: Mew|Mew|341/341', '|turn|2',
			'|move|p1a: Mew|Memento|p2a: Chansey', '|faint|p1a: Mew', '|turn|3',
			'|teamsize|p1|3', '|switch|p1a: Mew|Mew|341/341', '|move|p1a: Mew|Happy Hour|p1a: Mew', '|turn|4',
			'|move|p1a: Mew|Memento|p2a: Chansey', '|faint|p1a: Mew', '|turn|5',
			'|-heal|p1: Zoroark|130/261|[from] move: Revival Blessing|[faint] 1', '|switch|p1a: Zoroark|Zoroark, M|130/261',
			'|move|p1a: Zoroark|Celebrate|p1a: Zoroark', '|turn|6',
		]);
		const mews = battle.p1.pokemon.filter(p => p.speciesForme === 'Mew');
		const snorlax = battle.p1.pokemon.find(p => p.speciesForme === 'Snorlax');
		assert.equal(mews.length, 2);
		assert(mews.every(p => p.fainted));
		assert(mews.some(p => p.moveTrack.some(([move]) => move === 'Happy Hour')));
		assert(!snorlax.fainted);
		assert.equal(battle.p1.active[0].speciesForme, 'Zoroark');
		assert.deepEqual(errors, []);
	});

	it('drops the Team Preview entry a wrong Illusion guess fainted once the real one is revealed and the user revived', () => {
		const { battle, errors } = playBatch([
			'|player|p1|FOO|1', '|player|p2|BAR|2', '|gametype|singles', '|gen|9',
			'|clearpoke', '|poke|p1|Blissey, F|', '|poke|p1|Chansey, F|', '|poke|p1|Mew|', '|poke|p1|Gengar, M|',
			'|poke|p2|Chansey, F|', '|teampreview', '|teamsize|p1|4', '|teamsize|p2|1',
			'|start', '|switch|p1a: Gengar|Gengar, M|341/341', '|switch|p2a: Chansey|Chansey, F|641/641', '|turn|1',
			'|move|p1a: Gengar|Memento|p2a: Chansey', '|faint|p1a: Gengar', '|switch|p1a: Gengar|Gengar, M|261/261', '|turn|2',
			'|switch|p1a: Blissey|Blissey, F|651/651', '|turn|3',
			'|move|p1a: Blissey|Revival Blessing|p1a: Blissey',
			'|-heal|p1: Mew|170/341|[from] move: Revival Blessing|[faint] 1', '|turn|4',
		]);
		assert.equal(battle.p1.pokemon.length, 4);
		assert.equal(battle.p1.pokemon.filter(p => p.fainted).length, 0);
		assert.equal(battle.p1.pokemon.filter(p => p.speciesForme === 'Blissey').length, 1);
		assert.deepEqual(errors, []);
	});

	it('guesses a Hisuian Zoroark as the Illusion user that fainted disguised', () => {
		const { BattlePokedex: pokedex } = require('../play.pokemonshowdown.com/data/pokedex.js');
		window.BattlePokedex ||= {};
		window.BattlePokedex.zoroarkhisui = pokedex.zoroarkhisui;
		const { battle, errors } = playBatch([
			'|player|p1|FOO|1', '|player|p2|BAR|2', '|gametype|singles', '|gen|9',
			'|rule|Species Clause: Limit one of each Pok\u00e9mon',
			'|clearpoke', '|poke|p1|Pawmot, M|', '|poke|p1|Zoroark-Hisui, F|', '|poke|p1|Chansey, F|', '|poke|p2|Blissey, F|',
			'|teampreview', '|teamsize|p1|3', '|teamsize|p2|1',
			'|start', '|switch|p1a: Pawmot|Pawmot, M|281/281', '|switch|p2a: Blissey|Blissey, F|651/651', '|turn|1',
			'|switch|p1a: Chansey|Chansey, F|251/251', '|turn|2',
			'|move|p1a: Chansey|Memento|p2a: Blissey', '|faint|p1a: Chansey', '|switch|p1a: Chansey|Chansey, F|641/641', '|turn|3',
		]);
		const zoroark = battle.p1.pokemon.find(p => p.speciesForme === 'Zoroark-Hisui');
		const pawmot = battle.p1.pokemon.find(p => p.speciesForme === 'Pawmot');
		assert(zoroark.fainted);
		assert.equal(zoroark.faintLine, 1);
		assert(!pawmot.fainted);
		assert.deepEqual(errors, []);
	});

	it('does not throw on a Revival Blessing heal for a Pokemon it has no fainted entry for', () => {
		const { battle, errors } = playLog([
			'|-heal|p1: Dugtrio|50/100|[from] move: Revival Blessing',
			'|-heal|p1: Diglett|50/100|[from] move: Revival Blessing',
		]);
		assert.equal(battle.p1.pokemon.length, 2);
		assert.deepEqual(errors, []);
	});
});

describe('Text parser', () => {
	it.skip('should process messages correctly', () => {
		let parser = new BattleTextParser();

		assert.equal(parser.extractMessage(`|-activate|p2a: Cool.|move: Skill Swap|Speed Boost|Cute Charm|[of] p1a: Speedy`), `[The opposing Cool.'s Speed Boost]
[Speedy's Cute Charm]
  The opposing Cool. swapped Abilities with its target!
`);
		assert.equal(parser.extractMessage(`|-activate|p2a: Cool.|move: Skill Swap|p1a: Speedy|[ability]Speed Boost|[ability2]Cute Charm`), `[The opposing Cool.'s Speed Boost]
[Speedy's Cute Charm]
  The opposing Cool. swapped Abilities with its target!
`);
		assert.equal(parser.extractMessage(`|move|p2a: Palkia|Swagger|p1a: Shroomish
|-boost|p1a: Shroomish|atk|2
|-start|p1a: Shroomish|confusion
|-activate|p1a: Shroomish|confusion
|move|p1a: Shroomish|Power-Up Punch|p2a: Palkia
`), `
The opposing Palkia used **Swagger**!
  Shroomish's Attack rose sharply!
  Shroomish became confused!

  Shroomish is confused!
Shroomish used **Power-Up Punch**!
`);
	});
});
