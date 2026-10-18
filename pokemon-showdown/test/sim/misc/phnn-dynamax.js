'use strict';

const assert = require('./../../assert');
const common = require('./../../common');
const { TeamValidator } = require('./../../../dist/sim/team-validator');

const FORMAT = 'gen9nonerfsstandard';

function reqFor(battle, sideId, speciesName) {
	const mon = battle[sideId].pokemon.find(p => p.species.name === speciesName);
	return mon.getMoveRequestData();
}

// Resolve a Team Preview request (if present) keeping default team order.
function startBattle(battle) {
	if (battle.requestState === 'teampreview') battle.makeChoices('default', 'default');
}

describe('[Gen 9 No Nerfs] Standard - Dynamax', () => {
	let battle;
	afterEach(() => {
		if (battle) battle.destroy();
	});

	it('offers only Mega Evolution to a Pokemon holding a Mega Stone', () => {
		battle = common.mod('phnn').createBattle({ formatid: FORMAT }, [[
			{ species: 'Charizard', ability: 'Blaze', item: 'charizarditex', teraType: 'Fire', moves: ['flamethrower', 'dragonclaw'], level: 100 },
			{ species: 'Gyarados', ability: 'Intimidate', item: 'gyaradosite', moves: ['waterfall'], level: 100 },
		], [
			{ species: 'Pikachu', ability: 'Static', moves: ['thunderbolt'], level: 100 },
		]]);
		const req = reqFor(battle, 'p1', 'Charizard');
		assert.equal(req.canMegaEvo, true);
		assert(!req.canDynamax, 'Mega-capable Pokemon should not be offered Dynamax');
		assert(!req.canTerastallize, 'Mega-capable Pokemon should not be offered Terastallization');
		const noTera = reqFor(battle, 'p1', 'Gyarados');
		assert.equal(noTera.canMegaEvo, true);
		assert(!noTera.canDynamax, 'Mega-capable Pokemon with no Tera type should not be offered Dynamax');
	});

	it('offers only Z-Moves to a Pokemon holding a Z-Crystal', () => {
		battle = common.mod('phnn').createBattle({ formatid: FORMAT }, [[
			{ species: 'Pikachu', ability: 'Static', item: 'electriumz', teraType: 'Electric', moves: ['thunderbolt'], level: 100 },
			{ species: 'Raichu', ability: 'Static', item: 'electriumz', moves: ['thunderbolt'], level: 100 },
		], [
			{ species: 'Shuckle', ability: 'Sturdy', moves: ['splash'], level: 100 },
		]]);
		const req = reqFor(battle, 'p1', 'Pikachu');
		assert(req.canZMove, 'A Z-Crystal holder should be offered Z-Moves');
		assert(!req.canTerastallize, 'A Z-Crystal holder should not be offered Terastallization');
		const noTera = reqFor(battle, 'p1', 'Raichu');
		assert(noTera.canZMove, 'A Z-Crystal holder with no Tera type should be offered Z-Moves');
		assert(!noTera.canDynamax, 'A Z-Crystal holder with no Tera type should not be offered Dynamax');
	});

	it('offers only Terastallization for any assigned Tera type', () => {
		// Garchomp is Dragon/Ground; a Steel Tera type Terastallizes, it does not Dynamax.
		battle = common.mod('phnn').createBattle({ formatid: FORMAT }, [[
			{ species: 'Garchomp', ability: 'Rough Skin', teraType: 'Steel', moves: ['earthquake', 'dragonclaw'], level: 100 },
		], [
			{ species: 'Pikachu', ability: 'Static', moves: ['thunderbolt'], level: 100 },
		]]);
		const req = reqFor(battle, 'p1', 'Garchomp');
		assert.equal(req.canTerastallize, 'Steel');
		assert(!req.canDynamax, 'A Pokemon with a Tera type should not be offered Dynamax');
		assert(!req.canMegaEvo);
	});

	it('allows Terastallization into the Pokemon\'s own primary type', () => {
		// Same-type Tera is back: a Dragon Tera type on Dragon/Ground Garchomp Teras, it does not Dynamax.
		battle = common.mod('phnn').createBattle({ formatid: FORMAT }, [[
			{ species: 'Garchomp', ability: 'Rough Skin', teraType: 'Dragon', moves: ['earthquake', 'dragonclaw'], level: 100 },
		], [
			{ species: 'Pikachu', ability: 'Static', moves: ['thunderbolt'], level: 100 },
		]]);
		const req = reqFor(battle, 'p1', 'Garchomp');
		assert.equal(req.canTerastallize, 'Dragon');
		assert(!req.canDynamax, 'A primary-type Tera type should Terastallize, not Dynamax');
	});

	it('offers only Dynamax when no Tera type is set, even for cannotDynamax species (No Nerfs)', () => {
		battle = common.mod('phnn').createBattle({ formatid: FORMAT }, [[
			{ species: 'Zacian', ability: 'Intrepid Sword', moves: ['behemothblade', 'playrough'], level: 100 },
		], [
			{ species: 'Pikachu', ability: 'Static', moves: ['thunderbolt'], level: 100 },
		]]);
		const req = reqFor(battle, 'p1', 'Zacian');
		assert.equal(req.canDynamax, true);
		assert(req.maxMoves && req.maxMoves.maxMoves.length, 'Dynamax request should include Max moves');
		assert(!req.canTerastallize, 'A Pokemon with no Tera type should not be offered Terastallization');
	});

	it('offers only Terastallization when the Stellar Tera type is set (No Nerfs)', () => {
		battle = common.mod('phnn').createBattle({ formatid: FORMAT }, [[
			{ species: 'Zacian', ability: 'Intrepid Sword', teraType: 'Stellar', moves: ['behemothblade', 'playrough'], level: 100 },
		], [
			{ species: 'Pikachu', ability: 'Static', moves: ['thunderbolt'], level: 100 },
		]]);
		const req = reqFor(battle, 'p1', 'Zacian');
		assert.equal(req.canTerastallize, 'Stellar');
		assert(!req.canDynamax, 'A Stellar Tera type should Terastallize, not Dynamax');
		assert(!req.maxMoves, 'A Stellar Tera type should not be offered Max moves');
	});

	it('never offers Dynamax to a permanent Gigantamax Pokemon (No Nerfs Extended)', () => {
		battle = common.mod('phnn').createBattle({ formatid: 'gen9nonerfsextended' }, [[
			{ species: 'Charizard', ability: 'Blaze', gigantamax: true, moves: ['flamethrower', 'airslash'], level: 100 },
			{ species: 'Charizard', ability: 'Blaze', moves: ['flamethrower', 'airslash'], level: 100 },
		], [
			{ species: 'Pikachu', ability: 'Static', moves: ['thunderbolt'], level: 100 },
		]]);
		const zard = battle.p1.pokemon[0];
		assert(zard.details.startsWith('Charizard-Gmax'), 'A Gigantamax set should be a permanent Gigantamax Pokemon');
		assert.equal(zard.maxhp, battle.p1.pokemon[1].maxhp * 2, 'A permanent Gigantamax Pokemon should have double max HP');
		const req = zard.getMoveRequestData();
		assert(!req.canDynamax, 'A permanent Gigantamax Pokemon should not be offered Dynamax');
		assert(!req.maxMoves, 'A permanent Gigantamax Pokemon should not be offered Max moves');
	});

	it('lets Terapagos Terastallize into Stellar instead of Dynamaxing', () => {
		battle = common.mod('phnn').createBattle({ formatid: FORMAT }, [[
			{ species: 'Terapagos', ability: 'Tera Shift', teraType: 'Stellar', moves: ['tachyoncutter', 'earthpower'], level: 100 },
		], [
			{ species: 'Pikachu', ability: 'Static', moves: ['thunderbolt'], level: 100 },
		]]);
		const req = reqFor(battle, 'p1', 'Terapagos');
		assert.equal(req.canTerastallize, 'Stellar');
		assert(!req.canDynamax, 'A Stellar Tera type should Terastallize Terapagos, not Dynamax');
	});

	it('lets Terapagos with no Tera type Dynamax instead of Terastallizing', () => {
		battle = common.mod('phnn').createBattle({ formatid: FORMAT }, [[
			{ species: 'Terapagos', ability: 'Tera Shift', moves: ['tachyoncutter', 'earthpower'], level: 100 },
		], [
			{ species: 'Pikachu', ability: 'Static', moves: ['thunderbolt'], level: 100 },
		]]);
		startBattle(battle);
		const terapagos = battle.p1.active[0];
		const req = terapagos.getMoveRequestData();
		assert(req.canDynamax, 'Terapagos with no Tera type should be offered Dynamax');
		assert(req.maxMoves && req.maxMoves.maxMoves.length, 'Terapagos with no Tera type should be offered Max moves');
		assert(!req.canTerastallize, 'Terapagos with no Tera type should not be offered Terastallization');

		battle.makeChoices('move 1 dynamax', 'move 1');
		assert(terapagos.volatiles['dynamax'], 'Terapagos should Dynamax');
		assert(!terapagos.terastallized, 'Terapagos should not Terastallize when it Dynamaxes');
	});

	it('applies Dynamax: HP scaling, Max moves, once per battle, and a 3-turn duration', () => {
		battle = common.mod('phnn').createBattle({ formatid: FORMAT }, [[
			{ species: 'Snorlax', ability: 'Thick Fat', moves: ['bodyslam', 'rest'], level: 100 },
		], [
			{ species: 'Shuckle', ability: 'Sturdy', moves: ['recover', 'splash'], level: 100 },
		]]);
		startBattle(battle);
		const lax = battle.p1.active[0];
		const baseMax = lax.maxhp;

		battle.makeChoices('move 1 dynamax', 'move 1');
		assert(lax.volatiles['dynamax'], 'Dynamax volatile should be applied');
		assert.equal(lax.maxhp, baseMax * 2, 'Max HP should double while Dynamaxed');
		assert.equal(battle.p1.dynamaxUsed, true);
		assert(battle.log.join('\n').includes('Max Strike'), 'Body Slam should become Max Strike');

		battle.makeChoices('move 1', 'move 1');
		assert(lax.volatiles['dynamax'], 'Dynamax should still be active on its second turn');
		battle.makeChoices('move 1', 'move 1');
		assert(!lax.volatiles['dynamax'], 'Dynamax should wear off after its third turn');
		assert.equal(lax.maxhp, baseMax, 'Max HP should return to its base value after Dynamax ends');
		assert(!lax.getMoveRequestData().canDynamax, 'Dynamax should only be available once per battle');
	});

	it('keeps Terastallization working in a normal PHNN battle', () => {
		battle = common.mod('phnn').createBattle({ formatid: FORMAT }, [[
			{ species: 'Garchomp', ability: 'Rough Skin', teraType: 'Steel', moves: ['earthquake'], level: 100 },
		], [
			{ species: 'Shuckle', ability: 'Sturdy', moves: ['splash'], level: 100 },
		]]);
		startBattle(battle);
		const chomp = battle.p1.active[0];
		battle.makeChoices('move 1 terastallize', 'move 1');
		assert.equal(chomp.terastallized, 'Steel');
	});
});

describe('[Gen 9 No Nerfs] Standard - Tera type validation', () => {
	it('preserves an explicit Tera type and leaves an unspecified one empty (the Dynamax signal)', () => {
		const validator = TeamValidator.get(FORMAT);
		const team = [
			{ species: 'Garchomp', ability: 'Rough Skin', moves: ['earthquake'], evs: {}, ivs: {}, level: 100, teraType: 'Steel' },
			{ species: 'Snorlax', ability: 'Thick Fat', moves: ['bodyslam'], evs: {}, ivs: {}, level: 100 },
		];
		const problems = validator.validateTeam(team);
		assert(!problems, `Unexpected validation problems: ${problems}`);
		assert.equal(team[0].teraType, 'Steel');
		assert.equal(team[1].teraType, undefined, 'An unspecified Tera type should stay empty so the Pokemon can Dynamax');
	});

	it('allows the Stellar Tera type on any Pokemon', () => {
		const validator = TeamValidator.get(FORMAT);
		const team = [
			{ species: 'Zacian', ability: 'Intrepid Sword', moves: ['behemothblade'], evs: {}, ivs: {}, level: 100, teraType: 'Stellar' },
		];
		const problems = validator.validateTeam(team);
		assert(!problems, `Unexpected validation problems: ${problems}`);
		assert.equal(team[0].teraType, 'Stellar');
	});

	it('leaves an unspecified Tera type empty on Terapagos too', () => {
		const validator = TeamValidator.get(FORMAT);
		const team = [
			{ species: 'Terapagos', ability: 'Tera Shift', moves: ['tachyoncutter'], evs: {}, ivs: {}, level: 100 },
		];
		const problems = validator.validateTeam(team);
		assert(!problems, `Unexpected validation problems: ${problems}`);
		assert.equal(team[0].teraType, undefined);
	});

	it('still defaults Tera types in standard Gen 9 formats (regression)', () => {
		const validator = TeamValidator.get('gen9customgame');
		const team = [
			{ species: 'Snorlax', ability: 'Thick Fat', moves: ['bodyslam'], evs: {}, ivs: {}, level: 100 },
		];
		const problems = validator.validateTeam(team);
		assert(!problems, `Unexpected validation problems: ${problems}`);
		assert.equal(team[0].teraType, 'Normal');
	});
});
