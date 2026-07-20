export const Conditions: import('../../../sim/dex-conditions').ModdedConditionDataTable = {
	brn: {
		inherit: true,
		onAfterMoveSelfPriority: 3,
		onAfterMoveSelf(pokemon) {
			this.damage(this.clampIntRange(Math.floor(pokemon.maxhp / 8), 1), pokemon);
		},
		onAfterSwitchInSelf(pokemon) {
			this.damage(this.clampIntRange(Math.floor(pokemon.maxhp / 8), 1));
		},
	},
	psn: {
		inherit: true,
		onAfterMoveSelfPriority: 3,
		onAfterMoveSelf(pokemon) {
			this.damage(this.clampIntRange(Math.floor(pokemon.maxhp / 8), 1), pokemon);
		},
		onAfterSwitchInSelf(pokemon) {
			this.damage(this.clampIntRange(Math.floor(pokemon.maxhp / 8), 1));
		},
	},
	tox: {
		inherit: true,
		onStart(target) {
			this.add('-status', target, 'tox');
			this.effectState.counter = 0;
		},
		onAfterMoveSelfPriority: 3,
		onAfterMoveSelf(pokemon) {
			this.effectState.counter = (this.effectState.counter || 0) + 1;
			this.damage(this.clampIntRange(Math.floor(pokemon.maxhp / 8), 1) * this.effectState.counter, pokemon, pokemon);
		},
		onSwitchIn(pokemon) {
			pokemon.status = 'psn' as ID;
			this.add('-status', pokemon, 'psn', '[silent]');
		},
		onAfterSwitchInSelf(pokemon) {
			this.damage(this.clampIntRange(Math.floor(pokemon.maxhp / 8), 1));
		},
	},
	slp: {
		inherit: true,
		onStart(target, source, sourceEffect) {
			if (sourceEffect && sourceEffect.effectType === 'Move') {
				this.add('-status', target, 'slp', `[from] move: ${sourceEffect.name}`);
			} else {
				this.add('-status', target, 'slp');
			}
			this.effectState.time = this.random(1, 8);
			if (target.removeVolatile('nightmare')) {
				this.add('-end', target, 'Nightmare', '[silent]');
			}
		},
	},
	frz: {
		inherit: true,
		onResidualOrder: 7,
		onResidual() {},
	},
	par: {
		inherit: true,
		onBeforeMovePriority: 2,
		onBeforeMove(pokemon) {
			if (this.randomChance(63, 256)) {
				this.add('cant', pokemon, 'par');
				const ttm = pokemon.volatiles['twoturnmove'];
				if (ttm && ['fly', 'dig'].includes(ttm.move)) {
					delete pokemon.volatiles['twoturnmove'];
					const linked = pokemon.volatiles[ttm.move];
					if (linked) delete linked.duration;
				}
				return false;
			}
		},
	},
	attract: {
		inherit: true,
		onBeforeMove(pokemon) {
			this.add('-activate', pokemon, 'move: Attract', '[of] ' + this.effectState.source);
			if (this.randomChance(1, 2)) {
				this.add('cant', pokemon, 'Attract');
				const ttm = pokemon.volatiles['twoturnmove'];
				if (ttm && ['fly', 'dig'].includes(ttm.move)) {
					delete pokemon.volatiles['twoturnmove'];
					const linked = pokemon.volatiles[ttm.move];
					if (linked) delete linked.duration;
				}
				return false;
			}
		},
	},
	trapped: {
		name: 'trapped',
		noCopy: true,
		onTrapPokemon(pokemon) {
			if (!this.effectState.source?.isActive) {
				delete pokemon.volatiles['trapped'];
				return;
			}
			pokemon.trapped = true;
		},
	},
	partiallytrapped: {
		name: 'partiallytrapped',
		// this is the duration of Wrap if it doesn't continue.
		// (i.e. if the attacker switches out.)
		// the full duration is tracked in partialtrappinglock
		duration: 2,
		// defender still takes PSN damage, etc
		// TODO: research exact mechanics
		onBeforeMovePriority: 9,
		onBeforeMove(pokemon) {
			this.add('cant', pokemon, 'partiallytrapped');
			return false;
		},
		onRestart() {
			this.effectState.duration = 2;
		},
		onAccuracy(accuracy, target, source, move) {
			if (source === this.effectState.source) return true;
		},
		onDisableMovePriority: 1, // higher priority so it gets undone by frz, slp or Bide
		onDisableMove(target) {
			if (this.effectState.maybeLocked) {
				target.maybeLocked = true;
			}
		},
	},
	fakepartiallytrapped: {
		name: 'fakepartiallytrapped',
		// Wrap ended this turn, but you don't know that
		// until you try to use an attack
		duration: 2,
		onDisableMovePriority: 1, // higher priority so it gets undone by frz, slp or Bide
		onDisableMove(target) {
			target.maybeLocked = true;
		},
	},
	partialtrappinglock: {
		name: 'partialtrappinglock',
		durationCallback() {
			return this.sample([2, 2, 2, 3, 3, 3, 4, 5]);
		},
		onStart(target, source, effect) {
			const foe = target.foes()[0];
			if (!foe) return false;

			this.effectState.move = effect.id;
			this.effectState.totalDuration = this.effectState.duration!;
			this.effectState.damage = this.lastDamage;
			this.effectState.locked = foe;
			foe.addVolatile('partiallytrapped', target, effect);
		},
		onBeforeMove(pokemon, target, move) {
			if (target !== this.effectState.locked) {
				pokemon.removeVolatile('partialtrappinglock');
			}
		},
		onAfterMove(pokemon, target, move) {
			if (target && target.hp <= 0) {
				delete pokemon.volatiles['partialtrappinglock'];
				return;
			}
			if (this.effectState.duration === 1) {
				if (this.effectState.totalDuration !== 5) {
					pokemon.addVolatile('fakepartiallytrapped');
					pokemon.volatiles['fakepartiallytrapped'].counterpart = target;
					target.addVolatile('fakepartiallytrapped');
					target.volatiles['fakepartiallytrapped'].counterpart = pokemon;
				}
			} else {
				target.addVolatile('partiallytrapped', pokemon, move);
				if (this.effectState.totalDuration - this.effectState.duration! > 0) {
					target.volatiles['partiallytrapped'].maybeLocked = true;
				}
			}
		},
		onSemiLockMove() {
			return this.effectState.move;
		},
		onDisableMove(pokemon) {
			if (this.effectState.totalDuration - this.effectState.duration! > 1) {
				pokemon.maybeLocked = true;
			}
		},
	},
	mustrecharge: {
		inherit: true,
		duration: 0,
		onBeforeMovePriority: 7,
		onStart: undefined, // no inherit
		onAfterMove(pokemon, target, move) {
			if (target && target.hp <= 0) {
				delete pokemon.volatiles['mustrecharge'];
				return;
			}
			this.add('-mustrecharge', pokemon);
		},
	},
	swreflect: {
		name: 'swreflect',
		onStart(pokemon, source, sourceEffect) {
			this.add('-start', pokemon, 'move: ' + ((sourceEffect as ActiveMove)?.name || 'Reflect'));
		},
	},
	swbatonboost: {
		name: 'swbatonboost',
	},
	residualdmg: {
		name: 'residualdmg',
		onStart() {},
	},
	sandstormed: {
		name: 'sandstormed',
		onSideStart(side) {
			this.add('-sidestart', side, 'move: Sandstorm');
		},
		onResidualOrder: 12,
		onResidual(pokemon) {
			this.damage(this.clampIntRange(Math.floor(pokemon.maxhp / 8), 1), pokemon);
		},
	},
};
