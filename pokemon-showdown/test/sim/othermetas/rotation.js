'use strict';

const assert = require('./../../assert');
const common = require('./../../common');

describe('Rotation Battles', () => {
	it('should allow rotating a side Pokemon to the center and executing the corresponding move slot', () => {
		const battle = common.createBattle({ gameType: 'rotation' }, [
			[
				{ species: "Mew", ability: 'synchronize', moves: ['pound'] },
				{ species: "Celebi", ability: 'naturalcure', moves: ['psychic'] },
				{ species: "Jirachi", ability: 'serenegrace', moves: ['ironhead'] },
			],
			[
				{ species: "Tyranitar", ability: 'sandstream', moves: ['stoneedge'] },
				{ species: "Machamp", ability: 'noguard', moves: ['submission'] },
				{ species: "Gengar", ability: 'cursedbody', moves: ['shadowball'] },
			],
		]);

		// Mew is slot 0 (left), Celebi is slot 1 (center), Jirachi is slot 2 (right).
		// Machamp is slot 1 (center) for p2.
		// p1 chooses to shift slot 0 (Mew) to the center. Since we are using the Triples UI,
		// p1 inputs 'shift' for Mew, and chooses moves for the other two.
		// The move slot selected for the center Pokemon (Celebi) determines the move slot used by the new center (Mew).
		battle.makeChoices('shift, move 1, move 1', 'move 1, move 1, move 1');

		// Mew should have swapped positions with Celebi. Mew is now in slot 1 (center).
		assert.equal(battle.p1.active[1].species.name, 'Mew');
		assert.equal(battle.p1.active[0].species.name, 'Celebi');

		// Only the center Pokemon (Mew and Machamp) should have attacked.
		// Machamp should have taken damage from Mew's Pound.
		assert.notEqual(battle.p2.active[1].hp, battle.p2.active[1].maxhp);

		// Celebi (on the side) should not have attacked or taken damage, and should be at full HP.
		assert.equal(battle.p1.active[0].hp, battle.p1.active[0].maxhp);
	});

	it('should disable abilities and status residual damage on side Pokemon', () => {
		const battle = common.createBattle({ gameType: 'rotation' }, [
			[
				{ species: "Mew", ability: 'synchronize', moves: ['pound'] },
				{ species: "Celebi", ability: 'naturalcure', moves: ['psychic'] },
				{ species: "Jirachi", ability: 'serenegrace', moves: ['ironhead'] },
			],
			[
				{ species: "Tyranitar", ability: 'sandstream', moves: ['stoneedge'] },
				{ species: "Machamp", ability: 'noguard', moves: ['submission'] },
				{ species: "Gengar", ability: 'cursedbody', moves: ['shadowball'] },
			],
		]);

		// Poison Celebi (center Pokemon) in round 1, then rotate it to the side.
		battle.p1.active[1].setStatus('psn');
		assert.equal(battle.p1.active[1].status, 'psn');

		// Rotate Celebi to the side (slot 0) by shifting Mew (slot 0) to the center
		battle.makeChoices('shift, move 1, move 1', 'move 1, move 1, move 1');

		const poisonedCelebi = battle.p1.active[0];
		assert.equal(poisonedCelebi.species.name, 'Celebi');
		assert.equal(poisonedCelebi.status, 'psn');

		// Celebi is on the side slot. Its HP after the end of the turn should not have decreased from poison damage.
		const maxHP = poisonedCelebi.maxhp;
		assert.equal(poisonedCelebi.hp, maxHP);
	});
});
