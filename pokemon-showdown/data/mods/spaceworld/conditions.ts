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
	partialtrappinglock: {
		name: 'partialtrappinglock',
		durationCallback() {
			return this.sample([2, 2, 2, 3, 3, 3, 4, 5]);
		},
		onStart(target, source, effect) {
			const foe = target.foes()[0];
			if (!foe) return false;
			this.effectState.move = effect.id;
			this.effectState.locked = foe;
			foe.addVolatile('partiallytrapped', target, effect);
		},
		onBeforeMove(pokemon, target, move) {
			if (target !== this.effectState.locked) {
				pokemon.removeVolatile('partialtrappinglock');
			}
		},
		onAfterMoveSelfPriority: 1,
		onAfterMoveSelf(pokemon) {
			const target = this.effectState.locked;
			if (!target || target.hp <= 0 || !target.isActive) {
				delete pokemon.volatiles['partialtrappinglock'];
				return;
			}
			if (this.effectState.duration !== 1) {
				target.addVolatile('partiallytrapped', pokemon, this.dex.getActiveMove(this.effectState.move));
			}
		},
		onSemiLockMove() {
			return this.effectState.move;
		},
	},
	partiallytrapped: {
		name: 'partiallytrapped',
		duration: 2,
		onStart(target, source, sourceEffect) {
			this.add('-activate', target, 'move: ' + (sourceEffect?.name || 'Wrap'), '[of] ' + source);
		},
		onBeforeMovePriority: 9,
		onBeforeMove(pokemon, target, move) {
			if (move.id === 'rapidspin') return;
			this.add('cant', pokemon, 'partiallytrapped');
			return false;
		},
		onRestart() {
			this.effectState.duration = 2;
		},
		onAccuracy(accuracy, target, source, move) {
			if (source === this.effectState.source) return true;
		},
	},
	mustrecharge: {
		inherit: true,
		onStart() {},
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
};
