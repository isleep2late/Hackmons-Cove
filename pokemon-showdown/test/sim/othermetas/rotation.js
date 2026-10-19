'use strict';

const assert = require('./../../assert');
const common = require('./../../common');

describe('Rotation Battles', () => {
	it('should allow rotating a side Pokemon to the center and executing the corresponding move slot', () => {
		const battle = common.createBattle({ formatid: 'gen9customgame@@@Gametype = Rotation' }, [
			[
				{ species: "Mew", ability: 'synchronize', moves: ['pound'] },
				{ species: "Celebi", ability: 'naturalcure', moves: ['psychic'] },
				{ species: "Jirachi", ability: 'serenegrace', moves: ['psychic', 'ironhead'] },
			],
			[
				{ species: "Tyranitar", ability: 'sandstream', moves: ['stoneedge'] },
				{ species: "Machamp", ability: 'noguard', moves: ['submission'] },
				{ species: "Gengar", ability: 'cursedbody', moves: ['shadowball'] },
			],
		]);

		battle.makeChoices('rotate left move 2', 'move 1');

		assert.equal(battle.p1.active[0].species.name, 'Jirachi');
		assert.equal(battle.p1.pokemon[1].species.name, 'Mew');

		assert.equal(battle.p1.active[0].lastMove.id, 'ironhead');
		assert.notEqual(battle.p2.active[0].hp, battle.p2.active[0].maxhp);

		assert.equal(battle.p1.pokemon[1].lastMove, null);
		assert.equal(battle.p1.pokemon[1].hp, battle.p1.pokemon[1].maxhp);
	});

	it('should disable abilities and status residual damage on side Pokemon', () => {
		const battle = common.createBattle({ formatid: 'gen9customgame@@@Gametype = Rotation' }, [
			[
				{ species: "Mew", ability: 'moody', moves: ['pound'] },
				{ species: "Celebi", ability: 'drizzle', moves: ['psychic'] },
				{ species: "Jirachi", ability: 'serenegrace', moves: ['psychic'] },
			],
			[
				{ species: "Tyranitar", ability: 'sandstream', moves: ['stoneedge'] },
				{ species: "Machamp", ability: 'intimidate', moves: ['submission'] },
				{ species: "Gengar", ability: 'moody', moves: ['shadowball'] },
			],
		]);

		assert.equal(battle.field.weather, 'sandstorm');
		assert.false(battle.log.some(line => line.includes('ability: Drizzle')), 'A side Drizzle should not activate');
		assert.equal(battle.p1.active[0].boosts.atk, 0, 'A side Intimidate should not activate');

		battle.p1.active[0].setStatus('psn');
		assert.equal(battle.p1.active[0].status, 'psn');

		battle.makeChoices('rotate left move 1', 'move 1');

		const poisonedMew = battle.p1.pokemon[1];
		assert.equal(poisonedMew.species.name, 'Mew');
		assert.equal(poisonedMew.status, 'psn');

		const maxHP = poisonedMew.maxhp;
		assert.equal(poisonedMew.hp, maxHP);

		const sideMoody = [poisonedMew, battle.p2.pokemon[2]];
		const assertSideMoodyInactive = () => {
			for (const pokemon of sideMoody) {
				assert.equal(pokemon.ability, 'moody');
				assert.notEqual(pokemon.position, 0);
				assert(Object.values(pokemon.boosts).every(boost => boost === 0), 'A side Moody should not activate');
			}
		};
		assertSideMoodyInactive();

		battle.makeChoices('move 1', 'move 1');
		assert.equal(battle.turn, 3);
		assertSideMoodyInactive();
		assert.equal(poisonedMew.hp, maxHP);
		assert.equal(battle.field.weather, 'sandstorm');
	});
});
