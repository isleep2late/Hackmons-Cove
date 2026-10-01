'use strict';

const assert = require('assert').strict;

const { makeUser } = require('../users-utils');
const { Teams } = require('../../dist/sim/teams');

async function settle() {
	for (let i = 0; i < 20; i++) {
		await new Promise(resolve => {
			setImmediate(resolve);
		});
	}
}

describe('Infinite Mod battle timer', () => {
	let p1, p2, room;
	afterEach(() => {
		for (const user of [p1, p2]) {
			if (!user) continue;
			user.disconnectAll();
			user.destroy();
		}
		if (room) room.destroy();
	});

	it('runs the timer of a player who has to submit a Pokemon, and forfeits them when it runs out', async () => {
		p1 = makeUser('Infinite Timer A');
		p2 = makeUser('Infinite Timer B');
		room = Rooms.createBattle({
			format: 'gen9customgame@@@Infinite Mod',
			players: [
				{ user: p1, team: Teams.pack([{ species: 'Wobbuffet', ability: 'Shadow Tag', moves: ['memento'] }]) },
				{ user: p2, team: Teams.pack([{ species: 'Mew', ability: 'Synchronize', moves: ['splash'] }]) },
			],
		});
		const battle = room.battle;
		const [player1, player2] = battle.players;
		const stopClock = () => {
			clearTimeout(battle.timer.timer);
			battle.timer.timer = null;
		};
		await settle();
		battle.timer.start();
		stopClock();

		battle.choose(p1, 'move 1');
		battle.choose(p2, 'move 1');
		await settle();
		stopClock();
		assert(JSON.parse(player1.request.request).wait);
		assert.equal(player1.request.isWait, false);

		battle.choose(p1, 'move 1');
		assert.equal(player1.request.isWait, false);

		assert(JSON.parse(player2.request.request).wait);
		assert.equal(player2.request.isWait, 'cantUndo');
		battle.choose(p2, 'move 1');
		assert.equal(player2.request.isWait, 'cantUndo');

		const turnTime1 = player1.turnSecondsLeft;
		const turnTime2 = player2.turnSecondsLeft;
		battle.timer.nextTick();
		stopClock();
		assert.equal(player1.turnSecondsLeft, turnTime1 - 5);
		assert.equal(player2.turnSecondsLeft, turnTime2);
		assert.equal(player1.request.infinite, true);

		for (let i = 0; i < 200 && !battle.ended; i++) {
			battle.timer.nextTick();
			stopClock();
			await settle();
		}
		assert(battle.ended);
		assert(room.log.log.includes(`|-message|${player1.name} lost due to inactivity.`));
		assert(room.log.log.includes(`|win|${player2.name}`));
	});
});
