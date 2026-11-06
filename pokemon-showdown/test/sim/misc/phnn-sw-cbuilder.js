'use strict';

const assert = require('./../../assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { TeamValidator } = require('./../../../dist/sim/team-validator');

const CLIENT = path.resolve(__dirname, '../../../../pokemon-showdown-client/play.pokemonshowdown.com');
const EVS = { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 };

let client = null;
function loadClient() {
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
	client = context;
	return client;
}

let editor = null;
function loadEditor() {
	if (editor) return editor;
	const context = loadClient();
	class Stub {}
	context.preact = { Component: Stub, Fragment: Stub, h() {}, render() {} };
	context.PSModel = Stub;
	context.PSSearchResults = Stub;
	vm.runInContext(fs.readFileSync(`${CLIENT}/js/battle-team-editor.js`, 'utf8'), context, { filename: 'battle-team-editor' });
	editor = context;
	return editor;
}

function editorState(formatid) {
	const { Dex } = loadEditor();
	const format = Dex.formats.get(formatid);
	const dex = Dex.mod(format.mod);
	return { gen: dex.gen, dex, format };
}

function codeLines(file) {
	return fs.readFileSync(file, 'utf8').split('\n').filter(line => !/^\s*(\/\/|\*|\/\*)/.test(line)).join('\n');
}

function search(type, format, speciesOrSet, query = '') {
	const { DexSearch } = loadClient();
	const s = new DexSearch(type, format, speciesOrSet);
	s.find('');
	if (query) s.find(query);
	const illegal = s.typedSearch.illegalReasons || {};
	const rows = Array.from(s.results).filter(r => r[0] === type).map(r => `${r[1]}`);
	return {
		search: s,
		legal: rows.filter(id => !(id in illegal)),
		illegal: rows.filter(id => id in illegal),
		illegalReasons: illegal,
	};
}

function serverAccepts(validator, species, moveid, level = 100) {
	return !validator.validateSet({
		species, name: 'X', moves: [moveid], item: '', ability: '', evs: { ...EVS }, level,
	}, {});
}

describe('[Gen 2] SpaceWorld teambuilder', function () {
	this.timeout(120000);

	before(function () {
		if (!fs.existsSync(`${CLIENT}/js/battle-dex-search.js`)) this.skip();
	});

	describe('SW OU/Ubers move lists follow the validator', () => {
		for (const [format, species] of [
			['gen2spaceworldou', 'pikachu'], ['gen2spaceworldou', 'snorlax'], ['gen2spaceworldou', 'aipom'],
			['gen2spaceworldou', 'quagsire'], ['gen2spaceworldubers', 'mewtwo'], ['gen2spaceworldou', 'raichu'],
		]) {
			it(`${format} ${species}`, () => {
				const validator = TeamValidator.get(format);
				const { legal } = search('move', format, species);
				const accepted = validator.dex.moves.all()
					.filter(m => m.exists && m.gen <= 2 && !m.isNonstandard)
					.map(m => m.id)
					.filter(id => serverAccepts(validator, validator.dex.species.get(species).name, id));
				assert(accepted.length > 0);
				assert.deepEqual([...legal].sort(), [...accepted].sort());
			});
		}

		it('no longer offers every move to every species', () => {
			assert(search('move', 'gen2spaceworldou', 'pikachu').legal.length < 60);
		});

		it('marks server-rejected moves as illegal when searched', () => {
			const { legal, illegal } = search('move', 'gen2spaceworldou', 'snorlax', 'explosion');
			assert(!legal.includes('explosion'));
			assert(illegal.includes('explosion'));
		});

		it('does not walk GSC prevos for SW learnsets', () => {
			const { search: s } = search('move', 'gen2spaceworldou', 'donphan');
			assert.equal(s.typedSearch.nextLearnsetid('donphan', 'donphan', true), '');
		});
	});

	describe('SW species lists', () => {
		const twins = [
			'happa', 'hanamogura', 'hanaryu', 'bobo', 'pachimee', 'puku', 'shibirefugu', 'mizuuo',
			'twohead', 'sunny', 'paon', 'painter', 'mitsuboshi', 'gift', 'tail',
		];
		it('SW OU starts at OU and leaves out Ubers and Smeargle', () => {
			const { legal, search: s } = search('pokemon', 'gen2spaceworldou');
			assert.equal(s.typedSearch.format, 'ou');
			assert(!legal.includes('mewtwo'));
			assert(!legal.includes('mew'));
			assert(!legal.includes('smeargle'));
			assert(legal.includes('aipom'));
			assert(legal.includes('quagsire'));
		});
		it('SW Ubers includes Mewtwo and Mew but not Smeargle', () => {
			const { legal } = search('pokemon', 'gen2spaceworldubers');
			assert(legal.includes('mewtwo'));
			assert(legal.includes('mew'));
			assert(!legal.includes('smeargle'));
		});
		it('SW Bricks still includes Smeargle', () => {
			assert(search('pokemon', 'gen2spaceworldbricks').legal.includes('smeargle'));
		});
		for (const format of ['gen2spaceworldou', 'gen2spaceworldubers', 'gen2spaceworldbricks', 'gen2spaceworlddisguises']) {
			it(`${format} lists no demo-name twins`, () => {
				const { legal } = search('pokemon', format);
				assert.deepEqual(twins.filter(id => legal.includes(id)), []);
			});
		}
		it('every listed SW OU/Ubers species is accepted by the validator', () => {
			for (const format of ['gen2spaceworldou', 'gen2spaceworldubers']) {
				const validator = TeamValidator.get(format);
				for (const id of search('pokemon', format).legal) {
					const species = validator.dex.species.get(id);
					if (species.baseSpecies === 'Unown') continue;
					const { legal } = search('move', format, id);
					assert(legal.length, `${format} ${id} has no legal moves`);
					assert(serverAccepts(validator, species.name, legal[0]), `${format} ${id}`);
				}
			}
		});
	});

	describe('SW items', () => {
		for (const format of ['gen2spaceworldou', 'gen2spaceworldubers']) {
			it(`${format} offers no legal items`, () => {
				const { legal, illegal } = search('item', format, 'snorlax', 'leftovers');
				assert.deepEqual(legal, []);
				assert(illegal.includes('leftovers'));
				assert.deepEqual(search('item', format, 'snorlax').legal, []);
			});
		}
		it('SW Disguises still offers items', () => {
			assert(search('item', 'gen2spaceworlddisguises', 'snorlax').legal.includes('leftovers'));
		});
		it('keeps the last item for fully evolved species when there is no Eviolite', () => {
			assert(search('item', 'gen2spaceworlddisguises', 'noctowl').legal.includes('wisdomorb'));
			assert(search('item', 'gen2spaceworldbricks', 'noctowl').legal.includes('wisdomorb'));
			const gen2ou = search('item', 'gen2ou', 'snorlax').legal;
			assert.equal(gen2ou.length, search('item', 'gen2ou', 'bulbasaur').legal.length);
		});
		it('still removes Eviolite for fully evolved species where it exists', () => {
			assert(!search('item', 'gen9ou', 'garchomp').legal.includes('eviolite'));
			assert(search('item', 'gen9ou', 'gible').legal.includes('eviolite'));
		});
	});

	describe('SW Hidden Power rows', () => {
		for (const format of ['gen2spaceworldou', 'gen2spaceworlddisguises', 'gen2spaceworldbricks', 'gen2spaceworldcustomdisguises']) {
			it(`${format} offers one Hidden Power row`, () => {
				const { legal, illegal } = search('move', format, 'snorlax', 'hiddenpower');
				const rows = [...legal, ...illegal].filter(id => id.startsWith('hiddenpower'));
				assert.deepEqual(rows, ['hiddenpower']);
				const all = search('move', format, 'snorlax').legal;
				assert.deepEqual(all.filter(id => id.startsWith('hiddenpower') && id !== 'hiddenpower'), []);
			});
		}
		it('gen2ou keeps the typed Hidden Power rows', () => {
			const { legal } = search('move', 'gen2ou', 'snorlax', 'hiddenpower');
			assert(legal.includes('hiddenpowerfire'));
		});
		it('Hidden Power is legal in SW Disguises and Bricks', () => {
			for (const [format, level] of [['gen2spaceworlddisguises', 255], ['gen2spaceworldbricks', 100]]) {
				assert(search('move', format, 'noctowl').legal.includes('hiddenpower'));
				assert(serverAccepts(TeamValidator.get(format), 'Noctowl', 'hiddenpower', level));
			}
		});
	});

	describe('SW hackmons move lists only offer moves the server accepts', () => {
		for (const [format, species, level] of [
			['gen2spaceworlddisguises', 'bulbasaur', 255], ['gen2spaceworldbricks', 'noctowl', 100],
			['gen2spaceworldcustomdisguises', 'bulbasaur', 9999],
		]) {
			it(`${format}`, () => {
				const validator = TeamValidator.get(format);
				const name = validator.dex.species.get(species).name;
				const rejected = search('move', format, species).legal
					.filter(id => !serverAccepts(validator, name, id, level));
				assert.deepEqual(rejected, []);
			});
		}
		it('SW Disguises does not offer No Move or No Move-SW', () => {
			const { legal } = search('move', 'gen2spaceworlddisguises', 'bulbasaur');
			assert(!legal.includes('nomove'));
			assert(!legal.includes('nomovesw'));
		});
		it('SW Custom Disguises hides Glitch TM/HM moves', () => {
			const { legal } = search('move', 'gen2spaceworldcustomdisguises', 'bulbasaur');
			assert(!legal.includes('tm01'));
			assert(!legal.includes('hm01'));
			assert(legal.includes('nomovesw'));
		});
		it('SW Bricks hides the Standard, OHKO and evasion bans', () => {
			const { legal } = search('move', 'gen2spaceworldbricks', 'noctowl');
			for (const id of ['dig', 'fly', 'fissure', 'doubleteam', 'minimize']) assert(!legal.includes(id), id);
			assert(legal.includes('spore'));
		});
		it('gen1 Disguises still offers No Move', () => {
			assert(search('move', 'gen1disguises', 'bulbasaur').legal.includes('nomove'));
		});
	});

	describe('new client formats use the SW dex', () => {
		it('maps every SW format to gen2spaceworld with the server default level', () => {
			const { Dex } = loadClient();
			for (const [format, level] of [
				['gen2spaceworldou', 100], ['gen2spaceworldubers', 100], ['gen2spaceworldbricks', 100],
				['gen2spaceworlddisguises', 255], ['gen2spaceworldcustomdisguises', 9999],
			]) {
				const f = Dex.formats.get(format);
				assert.equal(f.mod, 'gen2spaceworld', format);
				assert.equal(f.defaultLevel, level, format);
				assert.equal(TeamValidator.get(format).ruleTable.defaultLevel, level, format);
			}
			assert.equal(Dex.formats.get('gen2ou').mod, 'gen2');
			assert.equal(Dex.formats.get('gen1disguises').defaultLevel, 100);
		});
		it('SW stats and types come from the SW dex', () => {
			const { Dex } = loadClient();
			const lapras = Dex.mod(Dex.formats.get('gen2spaceworldou').mod).species.get('lapras');
			assert.equal(lapras.baseStats.spa, 95);
		});
	});

	describe('SW Hidden Power in the team editors', () => {
		it('the new editor does not treat Hidden Power type as relevant in SW', () => {
			const { TeamEditorState } = loadEditor();
			const set = { species: 'Snorlax', moves: ['Hidden Power'] };
			for (const format of ['gen2spaceworldou', 'gen2spaceworldubers', 'gen2spaceworlddisguises']) {
				assert.equal(TeamEditorState.prototype.hpTypeMatters.call(editorState(format), set), false, format);
			}
			assert.equal(TeamEditorState.prototype.hpTypeMatters.call(editorState('gen2ou'), set), true);
			assert.equal(TeamEditorState.prototype.hpTypeMatters.call(editorState('gen2ou'), { species: 'Snorlax', moves: ['Hidden Power Fire'] }), true);
		});
		it('the new editor hides the Unown Hidden Power Type select in SW', () => {
			const src = codeLines(path.resolve(CLIENT, 'src/battle-team-editor.tsx'));
			assert(/species\.baseSpecies === 'Unown' && editor\.dex\.modid !== 'gen2spaceworld'/.test(src));
		});
		it('the old client stops before renaming Hidden Power in SW and hides the HP Type cell', () => {
			const src = codeLines(path.resolve(CLIENT, 'src/oldclient/client-teambuilder.js'));
			const start = src.indexOf('var isSpaceWorldDex');
			assert(start >= 0);
			const guard = src.indexOf('if (isSpaceWorldDex) return;', start);
			const rename = src.indexOf('set.moves[i] = "Hidden Power " + hpType;', start);
			assert(guard > start && rename > guard);
			assert(src.includes("} else if (!(this.curTeam.dex && this.curTeam.dex.modid === 'gen2spaceworld')) {\n\t\t\t\t\t\tbuf += '<span class=\"detailcell\"><label>HP Type</label>'"));
		});
	});

	describe('no SW builder search throws', () => {
		it('every SW format and search type', () => {
			const { DexSearch } = loadClient();
			for (const format of [
				'gen2spaceworldou', 'gen2spaceworldubers', 'gen2spaceworldbricks',
				'gen2spaceworlddisguises', 'gen2spaceworldcustomdisguises',
			]) {
				for (const type of ['pokemon', 'move', 'item', 'ability', 'type', 'category']) {
					for (const species of ['', 'snorlax', 'smeargle', 'tail', 'unown', 'aipom']) {
						const s = new DexSearch(type, format, species);
						for (const q of ['', 'a', 'hidden', 'leftovers', 'sw']) s.find(q);
					}
				}
				const m = new DexSearch('move', format, 'pikachu');
				m.find('');
				for (const col of ['power', 'accuracy', 'pp', 'name']) m.typedSearch.getResults(null, col);
				m.typedSearch.getResults([['type', 'Water'], ['pokemon', 'snorlax']]);
				const p = new DexSearch('pokemon', format);
				p.find('');
				for (const col of ['hp', 'atk', 'def', 'spa', 'spd', 'spe', 'bst', 'name']) p.typedSearch.getResults(null, col);
				p.typedSearch.getResults([['move', 'surf']]);
			}
		});
	});
});
