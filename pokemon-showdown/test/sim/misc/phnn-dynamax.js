'use strict';

const assert = require('./../../assert');
const common = require('./../../common');
const { TeamValidator } = require('./../../../dist/sim/team-validator');

const FORMAT = 'gen9purehackmonsnonerfs';

function reqFor(battle, sideId, speciesName) {
	const mon = battle[sideId].pokemon.find(p => p.species.name === speciesName);
	return mon.getMoveRequestData();
}

// Resolve a Team Preview request (if present) keeping default team order.
function startBattle(battle) {
	if (battle.requestState === 'teampreview') battle.makeChoices('default', 'default');
}

describe('[Gen 9] Pure Hackmons No Nerfs - Dynamax', () => {
	let battle;
	afterEach(() => {
		if (battle) battle.destroy();
	});

	it('offers only Mega Evolution to a Pokemon holding a Mega Stone', () => {
		battle = common.mod('phnn').createBattle({ formatid: FORMAT }, [[
			{ species: 'Charizard', ability: 'Blaze', item: 'charizarditex', moves: ['flamethrower', 'dragonclaw'], level: 100 },
		], [
			{ species: 'Pikachu', ability: 'Static', moves: ['thunderbolt'], level: 100 },
		]]);
		const req = reqFor(battle, 'p1', 'Charizard');
		assert.equal(req.canMegaEvo, true);
		assert(!req.canDynamax, 'Mega-capable Pokemon should not be offered Dynamax');
		assert(!req.canTerastallize, 'Mega-capable Pokemon should not be offered Terastallization');
	});

	it('offers only Terastallization for any non-Stellar Tera type', () => {
		// Garchomp is Dragon/Ground; a Steel Tera type Terastallizes, it does not Dynamax.
		battle = common.mod('phnn').createBattle({ formatid: FORMAT }, [[
			{ species: 'Garchomp', ability: 'Rough Skin', teraType: 'Steel', moves: ['earthquake', 'dragonclaw'], level: 100 },
		], [
			{ species: 'Pikachu', ability: 'Static', moves: ['thunderbolt'], level: 100 },
		]]);
		const req = reqFor(battle, 'p1', 'Garchomp');
		assert.equal(req.canTerastallize, 'Steel');
		assert(!req.canDynamax, 'A Pokemon with a non-Stellar Tera type should not be offered Dynamax');
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

	it('offers only Dynamax when the Stellar Tera type is set, even for cannotDynamax species (No Nerfs)', () => {
		battle = common.mod('phnn').createBattle({ formatid: FORMAT }, [[
			{ species: 'Zacian', ability: 'Intrepid Sword', teraType: 'Stellar', moves: ['behemothblade', 'playrough'], level: 100 },
		], [
			{ species: 'Pikachu', ability: 'Static', moves: ['thunderbolt'], level: 100 },
		]]);
		const req = reqFor(battle, 'p1', 'Zacian');
		assert.equal(req.canDynamax, true);
		assert(req.maxMoves && req.maxMoves.maxMoves.length, 'Dynamax request should include Max moves');
		assert(!req.canTerastallize, 'A Pokemon Dynamaxing via Stellar should not be offered Terastallization');
	});

	it('offers Gigantamax to a G-Max-capable species with a Stellar Tera type', () => {
		battle = common.mod('phnn').createBattle({ formatid: FORMAT }, [[
			{ species: 'Charizard', ability: 'Blaze', gigantamax: true, teraType: 'Stellar', moves: ['flamethrower', 'airslash'], level: 100 },
		], [
			{ species: 'Pikachu', ability: 'Static', moves: ['thunderbolt'], level: 100 },
		]]);
		const req = reqFor(battle, 'p1', 'Charizard');
		assert.equal(req.canDynamax, true);
		assert.equal(req.maxMoves.gigantamax, 'G-Max Wildfire');
	});

	it('lets Terapagos keep its Stellar Terastallization and never Dynamax', () => {
		battle = common.mod('phnn').createBattle({ formatid: FORMAT }, [[
			{ species: 'Terapagos', ability: 'Tera Shift', teraType: 'Stellar', moves: ['tachyoncutter', 'earthpower'], level: 100 },
		], [
			{ species: 'Pikachu', ability: 'Static', moves: ['thunderbolt'], level: 100 },
		]]);
		const req = reqFor(battle, 'p1', 'Terapagos');
		assert.equal(req.canTerastallize, 'Stellar');
		assert(!req.canDynamax, 'Terapagos must not be offered Dynamax even with a Stellar Tera type');
	});

	it('applies Dynamax: HP scaling, Max moves, once per battle, and a 3-turn duration', () => {
		battle = common.mod('phnn').createBattle({ formatid: FORMAT }, [[
			{ species: 'Snorlax', ability: 'Thick Fat', teraType: 'Stellar', moves: ['bodyslam', 'rest'], level: 100 },
		], [
			{ species: 'Shuckle', ability: 'Sturdy', moves: ['recover', 'splash'], level: 100 },
		]]);
		startBattle(battle);
		const lax = battle.p1.active[0];
		const baseMax = lax.maxhp;

		battle.makeChoices('move 1 dynamax', 'move 1');
		assert(lax.volatiles['dynamax'], 'Dynamax volatile should be applied');
		assert.atLeast(lax.maxhp, baseMax + 1, 'Max HP should scale up while Dynamaxed');
		assert.equal(battle.p1.dynamaxUsed, true);
		assert(battle.log.join('\n').includes('Max Strike'), 'Body Slam should become Max Strike');

		for (let i = 0; i < 5 && lax.volatiles['dynamax']; i++) {
			battle.makeChoices('move 1', 'move 1');
		}
		assert(!lax.volatiles['dynamax'], 'Dynamax should wear off after its duration');
		assert.equal(lax.maxhp, baseMax, 'Max HP should return to its base value after Dynamax ends');
		assert(!lax.getMoveRequestData().canDynamax, 'Dynamax should only be available once per battle');
	});

	it('keeps Terastallization working in a normal PHNN battle (non-Stellar Tera type)', () => {
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

describe('[Gen 9] Pure Hackmons No Nerfs - Tera type validation', () => {
	it('preserves an explicit Tera type and defaults an unspecified one to the primary type', () => {
		const validator = TeamValidator.get(FORMAT);
		const team = [
			{ species: 'Garchomp', ability: 'Rough Skin', moves: ['earthquake'], evs: {}, ivs: {}, level: 100, teraType: 'Steel' },
			{ species: 'Snorlax', ability: 'Thick Fat', moves: ['bodyslam'], evs: {}, ivs: {}, level: 100 },
		];
		const problems = validator.validateTeam(team);
		assert(!problems, `Unexpected validation problems: ${problems}`);
		assert.equal(team[0].teraType, 'Steel');
		assert.equal(team[1].teraType, 'Normal', 'An unspecified Tera type should default to the primary type');
	});

	it('allows the Stellar Tera type (the Dynamax signal) on any Pokemon', () => {
		const validator = TeamValidator.get(FORMAT);
		const team = [
			{ species: 'Zacian', ability: 'Intrepid Sword', moves: ['behemothblade'], evs: {}, ivs: {}, level: 100, teraType: 'Stellar' },
		];
		const problems = validator.validateTeam(team);
		assert(!problems, `Unexpected validation problems: ${problems}`);
		assert.equal(team[0].teraType, 'Stellar');
	});

	it('defaults Terapagos to its required Stellar Tera type', () => {
		const validator = TeamValidator.get(FORMAT);
		const team = [
			{ species: 'Terapagos', ability: 'Tera Shift', moves: ['tachyoncutter'], evs: {}, ivs: {}, level: 100 },
		];
		const problems = validator.validateTeam(team);
		assert(!problems, `Unexpected validation problems: ${problems}`);
		assert.equal(team[0].teraType, 'Stellar');
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
