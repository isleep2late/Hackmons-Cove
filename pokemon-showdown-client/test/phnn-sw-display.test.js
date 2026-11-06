const assert = require('assert').strict;
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { describe, it } = require('node:test');

window = global;

const ROOT = path.resolve(__dirname, '../play.pokemonshowdown.com');

require('../play.pokemonshowdown.com/js/battle-dex-data.js');
require('../play.pokemonshowdown.com/js/battle-dex.js');
global.BattleText = require('../play.pokemonshowdown.com/data/text/en.js').BattleText;
for (const file of ['moves.js', 'teambuilder-tables.js', 'pokedex.js', 'typechart.js', 'items.js', 'abilities.js']) {
	const sandbox = { exports: {} };
	vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'data', file), 'utf8'), sandbox);
	Object.assign(global, sandbox.exports);
}
global.BattleStatusAnims = {};
global.BattleMoveAnims = {};
global.BattleOtherAnims = {};
require('../play.pokemonshowdown.com/js/battle-scene-stub.js');
require('../play.pokemonshowdown.com/js/battle-text-parser.js');
require('../play.pokemonshowdown.com/js/battle.js');
global.$ = () => ({ on() {}, off() {} });
global.jQuery = global.$;
vm.runInThisContext(
	fs.readFileSync(path.join(ROOT, 'js/battle-tooltips.js'), 'utf8') +
	';global.BattleTooltips = BattleTooltips; global.ModifiableValue = ModifiableValue;'
);

function parse(line, gen = 2) {
	const parser = new BattleTextParser();
	parser.p1 = 'Alice';
	parser.p2 = 'Bob';
	parser.gen = gen;
	const { args, kwArgs } = BattleTextParser.parseBattleLine(line);
	return parser.parseArgs(args, kwArgs);
}

function makeBattle(tier, gen = 2) {
	return new Battle({
		debug: true,
		log: [
			'|player|p1|Alice|1',
			'|player|p2|Bob|2',
			`|gen|${gen}`,
			`|tier|${tier}`,
			'|start',
			'|switch|p1a: Magikarp|Magikarp, L100|331/331',
			'|switch|p2a: Bulbasaur|Bulbasaur, L100|100/100',
			'|turn|1',
		],
	});
}

function flailPower(battle, hp, maxhp) {
	const pokemon = battle.p1.active[0];
	pokemon.hp = hp;
	pokemon.maxhp = maxhp;
	const serverPokemon = { item: '', ability: '', baseAbility: '', stats: {}, moves: ['flail'] };
	const tooltips = new BattleTooltips(battle);
	const value = new ModifiableValue(battle, pokemon, serverPokemon);
	const move = battle.dex.moves.get('Flail');
	return tooltips.getMoveBasePower(move, 'Normal', value, battle.p2.active[0]).value;
}

describe('SpaceWorld battle text', () => {
	it('uses the per-Pokemon armor text for Reflect and Light Screen', () => {
		assert.equal(parse('|-start|p1a: Pika|move: Reflect'), '  Pika gained armor!\n');
		assert.equal(parse('|-start|p1a: Pika|move: Light Screen'), '  Pika gained armor!\n');
	});

	it('keeps the Gen 1 screen texts in Gen 1', () => {
		assert.equal(parse('|-start|p1a: Pika|Reflect', 1), '  Pika gained armor!\n');
		assert.equal(parse('|-start|p1a: Pika|Light Screen', 1), "  Pika's protected against special attacks!\n");
	});

	it('renders Detect as Lock-On', () => {
		assert.equal(
			parse('|-activate|p1a: Pika|move: Detect|[of] p2a: Bulba'),
			'  Pika took aim at the opposing Bulba!\n'
		);
	});

	it('names Quick Needle and Focus Orb', () => {
		assert.equal(
			parse('|-activate|p1a: Pika|item: Quick Needle'),
			'  Pika can act faster than normal, thanks to its Quick Needle!\n'
		);
		assert.equal(parse('|-activate|p1a: Pika|item: Focus Orb'), '  Pika hung on using its Focus Orb!\n');
	});

	it('renders sandstormed damage as sandstorm damage', () => {
		assert.equal(
			parse('|-damage|p2a: Bulba|76/100|[from] sandstormed'),
			'  The opposing Bulba is buffeted by the sandstorm!\n'
		);
	});

	it('reveals Quick Needle and Focus Orb on activation', () => {
		const battle = makeBattle('[Gen 2] SpaceWorld Disguises');
		battle.add('|-activate|p1a: Magikarp|item: Quick Needle');
		battle.seekTurn(Infinity);
		assert.equal(battle.p1.active[0].item, 'Quick Needle');
		battle.add('|-activate|p2a: Bulbasaur|item: Focus Orb');
		battle.seekTurn(Infinity);
		assert.equal(battle.p2.active[0].item, 'Focus Orb');
	});
});

describe('SpaceWorld move data on the client', () => {
	const sw = Dex.mod('gen2spaceworld');

	it('types Hidden Power ??? at the power the server sends', () => {
		const move = sw.moves.get('Hidden Power ??? 58');
		assert.equal(move.type, '???');
		assert.equal(move.basePower, 58);
		assert.equal(move.category, 'Physical');
	});

	it('leaves standard Gen 2 Hidden Power alone', () => {
		const move = Dex.mod('gen2').moves.get('Hidden Power Ice 60');
		assert.equal(move.type, 'Ice');
		assert.equal(move.basePower, 60);
		assert.equal(move.category, 'Special');
	});

	it('uses the server categories for Mud-Slap, Pursuit and Water Sport', () => {
		assert.equal(sw.moves.get('Mud-Slap').category, 'Status');
		assert.equal(sw.moves.get('Pursuit').category, 'Status');
		const waterSport = sw.moves.get('Water Sport');
		assert.equal(waterSport.category, 'Special');
		assert.equal(waterSport.basePower, 30);
		assert.equal(Dex.mod('gen2').moves.get('Mud-Slap').category, 'Physical');
	});
});

describe('SpaceWorld Flail tooltip', () => {
	it('matches the demo x48 table', () => {
		const battle = makeBattle('[Gen 2] SpaceWorld Disguises');
		assert.equal(battle.dex.modid, 'gen2spaceworld');
		assert.equal(flailPower(battle, 34, 331), 150);
		assert.equal(flailPower(battle, 115, 331), 80);
		assert.equal(flailPower(battle, 224, 331), 40);
		assert.equal(flailPower(battle, 8, 200), 200);
		assert.equal(flailPower(battle, 331, 331), 20);
	});

	it('keeps the Gen 2 x64 table outside SpaceWorld', () => {
		const battle = makeBattle('[Gen 2] OU');
		assert.equal(flailPower(battle, 34, 331), 100);
		assert.equal(flailPower(battle, 8, 200), 150);
	});
});

describe('SpaceWorld sprites and icons', () => {
	it('sets the scene mod in SpaceWorld battles only', () => {
		assert.equal(makeBattle('[Gen 2] SpaceWorld OU').scene.mod, 'gen2spaceworld');
		assert.equal(makeBattle('[Gen 2] OU').scene.mod, '');
	});

	it('uses demo art for canonical species in SpaceWorld', () => {
		const sprite = Dex.getSpriteData('Bulbasaur', true, { gen: 2, mod: 'gen2spaceworld' });
		assert.match(sprite.url, /sprites\/sw97\/bulbasaursw\.png$/);
		assert.equal(sprite.cryurl, '');
		const back = Dex.getSpriteData('Bulbasaur', false, { gen: 2, mod: 'gen2spaceworld' });
		assert.match(back.url, /sprites\/sw97\/bulbasaursw-back\.png$/);
		assert.match(Dex.getSpriteData('Chikorita', true, { gen: 2, mod: 'gen2spaceworld' }).url, /sw97\/happa\.png$/);
		assert.match(Dex.getSpriteData('Aipom', true, { gen: 2, mod: 'gen2spaceworld' }).url, /sw97\/tail\.png$/);
		assert.doesNotMatch(Dex.getSpriteData('Bulbasaur', true, { gen: 2 }).url, /sw97/);
		assert.doesNotMatch(Dex.getSpriteData('Chikorita', true, { gen: 2 }).url, /sw97/);
	});

	it('uses demo icons for SpaceWorld battle Pokemon', () => {
		const battle = makeBattle('[Gen 2] SpaceWorld OU');
		assert.match(Dex.getPokemonIcon(battle.p2.active[0]), /sw97\/bulbasaursw-icon\.png/);
		assert.match(Dex.getPokemonIcon({ species: 'Quagsire' }, false, 'gen2spaceworld'), /sw97\/mizuuo-icon\.png/);
		assert.doesNotMatch(Dex.getPokemonIcon(makeBattle('[Gen 2] OU').p2.active[0]), /sw97/);
		assert.doesNotMatch(Dex.getPokemonIcon('Bulbasaur'), /sw97/);
	});

	it('keeps shiny visible on species that have a modern sprite', () => {
		const shiny = Dex.getSpriteData('Bulbasaur', true, { gen: 2, mod: 'gen2spaceworld', shiny: true });
		assert.doesNotMatch(shiny.url, /sw97/);
		assert.match(shiny.url, /shiny/);
		assert.doesNotMatch(Dex.getSpriteData('Chikorita', true, { gen: 2, mod: 'gen2spaceworld', shiny: true }).url, /sw97/);
		assert.match(Dex.getSpriteData('Shibirefugu', true, { gen: 2, mod: 'gen2spaceworld', shiny: true }).url, /sw97\/shibirefugu\.png$/);
		const swDex = Dex.mod('gen2spaceworld');
		assert.equal(Dex.getTeambuilderSpriteData({ species: 'Bulbasaur' }, swDex).spriteDir, 'sprites/sw97');
		assert.notEqual(Dex.getTeambuilderSpriteData({ species: 'Bulbasaur', shiny: true }, swDex).spriteDir, 'sprites/sw97');
	});

	it('gives builder icons the demo art when passed the SpaceWorld dex mod', () => {
		const swDex = Dex.mod('gen2spaceworld');
		assert.match(Dex.getPokemonIcon({ species: 'Aipom' }, false, swDex.modid), /sw97\/tail-icon\.png/);
		assert.match(Dex.getPokemonIcon('quagsire', false, swDex.modid), /sw97\/mizuuo-icon\.png/);
		assert.doesNotMatch(Dex.getPokemonIcon({ species: 'Aipom' }, false, Dex.forGen(2).modid), /sw97/);
		const src = fs.readFileSync(path.join(ROOT, 'src/oldclient/storage.js'), 'utf8');
		const fn = src.match(/Storage\.teamIconModId = (function \(format\) \{[\s\S]*?\n\});/)[1];
		const teamIconModId = vm.runInThisContext('(' + fn + ')');
		assert.equal(teamIconModId('gen2spaceworldou'), 'gen2spaceworld');
		assert.equal(teamIconModId('gen2statusesspaceworld'), 'gen2spaceworld');
		assert.equal(teamIconModId('gen2ou'), undefined);
		assert.equal(teamIconModId(undefined), undefined);
	});

	it('has Shibirefugu art', () => {
		assert.match(Dex.getPokemonIcon('Shibirefugu'), /sw97\/shibirefugu-icon\.png/);
		const sprite = Dex.getSpriteData('Shibirefugu', true, { gen: 2 });
		assert.match(sprite.url, /sw97\/shibirefugu\.png$/);
		assert.equal(sprite.w, 112);
	});
});
