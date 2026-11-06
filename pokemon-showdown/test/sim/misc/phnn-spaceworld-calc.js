'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('./../../assert');
const common = require('./../../common');

const CALC_DIST = path.resolve(__dirname, '../../../../pokemon-showdown-client/damage-calc/calc/dist/index.js');
const FORMAT = 'gen2spaceworldcustomdisguises';
const EVS = { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 };

function mon(species, move, extra = {}) {
	return {
		species, moves: [move], ability: 'No Ability', level: extra.level || 100, evs: EVS,
		ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31, ...extra.ivs },
		item: extra.item || '',
	};
}

function serverRange(c) {
	const battle = common.createBattle({ formatid: FORMAT }, [
		[mon(c.a, c.move, { ivs: c.ivs, item: c.item, level: c.level })],
		[mon(c.d, 'Splash', { level: c.level })],
	]);
	const source = battle.p1.active[0];
	const target = battle.p2.active[0];
	if (c.aBoosts) battle.boost(c.aBoosts, source, source, null, true);
	if (c.dBoosts) battle.boost(c.dBoosts, target, target, null, true);
	if (c.brn) source.setStatus('brn');
	if (c.screen) target.addVolatile('swreflect', target, battle.dex.getActiveMove(c.screen));
	if (c.weather) battle.field.setWeather(c.weather, source);
	const out = [];
	for (const roll of [217, 255]) {
		battle.random = (x, y) => (y === 256 ? roll : 0);
		const move = battle.dex.getActiveMove(c.move);
		move.willCrit = !!c.crit;
		if (c.bp) move.basePower = c.bp;
		if (c.hit) move.hit = c.hit;
		if (c.fury) {
			source.removeVolatile('furycutter');
			if (c.fury > 1) {
				source.addVolatile('furycutter');
				source.volatiles['furycutter'].count = c.fury - 1;
			}
		}
		if (c.rollout) {
			source.removeVolatile('rollout');
			source.addVolatile('rollout');
			source.volatiles['rollout'].hitCount = c.rollout - 1;
		}
		out.push(battle.actions.getDamage(source, target, move, true));
	}
	battle.destroy();
	return out;
}

function calcRange(calc, c) {
	const gen = calc.Generations.get(11);
	const ivs = c.ivs ? { ...c.ivs, spd: c.ivs.spa } : {};
	const moveOptions = { isCrit: !!c.crit };
	if (c.bp) moveOptions.overrides = { basePower: c.bp };
	if (c.hit) moveOptions.hits = c.hit;
	if (c.fury || c.rollout) moveOptions.timesUsed = c.fury || c.rollout;
	const weather = { raindance: 'Rain', sunnyday: 'Sun' }[c.weather];
	const result = calc.calculate(
		gen,
		new calc.Pokemon(gen, c.a, {
			level: c.level || 100, boosts: c.aBoosts || {}, ivs, item: c.item, status: c.brn ? 'brn' : '',
		}),
		new calc.Pokemon(gen, c.d, { level: c.level || 100, boosts: c.dBoosts || {} }),
		new calc.Move(gen, c.move, moveOptions),
		new calc.Field({
			weather,
			defenderSide: { isReflect: c.screen === 'Reflect', isLightScreen: c.screen === 'Light Screen' },
		})
	);
	let damage = result.damage;
	if (Array.isArray(damage[0])) damage = damage[damage.length - 1];
	return Array.isArray(damage) ? [damage[0], damage[damage.length - 1]] : [damage, damage];
}

const CASES = [
	{ a: 'Snorlax', move: 'Body Slam', d: 'Dragonite' },
	{ a: 'Snorlax', move: 'Body Slam', d: 'Dragonite', crit: true, aBoosts: { atk: 2 } },
	{ a: 'Snorlax', move: 'Body Slam', d: 'Dragonite', aBoosts: { atk: 6 } },
	{ a: 'Snorlax', move: 'Body Slam', d: 'Dragonite', aBoosts: { atk: -5 } },
	{ a: 'Snorlax', move: 'Body Slam', d: 'Starmie', screen: 'Reflect' },
	{ a: 'Snorlax', move: 'Body Slam', d: 'Starmie', screen: 'Light Screen' },
	{ a: 'Starmie', move: 'Surf', d: 'Snorlax', dBoosts: { spd: 2 } },
	{ a: 'Starmie', move: 'Surf', d: 'Snorlax', weather: 'raindance' },
	{ a: 'Starmie', move: 'Surf', d: 'Snorlax', weather: 'sunnyday' },
	{ a: 'Delibird', move: 'Present', d: 'Snorlax', bp: 40 },
	{ a: 'Delibird', move: 'Present', d: 'Snorlax', bp: 120 },
	{ a: 'Snorlax', move: 'Hidden Power', d: 'Gengar' },
	{ a: 'Snorlax', move: 'Hidden Power', d: 'Gengar', ivs: { atk: 0, def: 20, spa: 30, spe: 12 } },
	{ a: 'Hitmonlee', move: 'Triple Kick', d: 'Snorlax', hit: 3 },
	{ a: 'Scyther', move: 'Fury Cutter', d: 'Snorlax', fury: 3 },
	{ a: 'Golem', move: 'Rollout', d: 'Charizard', rollout: 4 },
	{ a: 'Snorlax', move: 'Body Slam', d: 'Dragonite', brn: true },
	{ a: 'Snorlax', move: 'Body Slam', d: 'Dragonite', item: 'Sharp Fang' },
	{ a: 'Hitmonlee', move: 'Triple Kick', d: 'Snorlax', hit: 3, item: 'Power Bracer SW' },
	{ a: 'Dragonite', move: 'Outrage', d: 'Snorlax', item: 'Dragon Scale' },
	{ a: 'Snorlax', move: 'Body Slam', d: 'Dragonite', crit: true, level: 500 },
	{ a: 'Starmie', move: 'Surf', d: 'Snorlax', level: 500 },
	{ a: 'Starmie', move: 'Surf', d: 'Snorlax', crit: true, level: 500 },
];

describe('[Gen 2] SpaceWorld damage calculator parity', function () {
	let calc;
	before(function () {
		if (!fs.existsSync(CALC_DIST)) this.skip();
		calc = require(CALC_DIST);
	});

	for (const c of CASES) {
		const label = `${c.a} ${c.move} into ${c.d} ${JSON.stringify({ ...c, a: undefined, move: undefined, d: undefined })}`;
		it(`the gen 11 calc matches the engine: ${label}`, () => {
			assert.deepEqual(calcRange(calc, c), serverRange(c));
		});
	}

	it('the gen 11 calc has one ???-typed Hidden Power and a 40 BP Present', () => {
		const gen = calc.Generations.get(11);
		assert.equal(new calc.Move(gen, 'Hidden Power').type, '???');
		assert.equal(gen.moves.get('hiddenpowerfire'), undefined);
		assert.equal(new calc.Move(gen, 'Present').bp, 40);
	});
});
