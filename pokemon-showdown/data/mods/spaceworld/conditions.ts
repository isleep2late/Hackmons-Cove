function sw97TurnLost(battle: Battle, pokemon: Pokemon) {
	return pokemon.m.sw97TurnLost === battle.turn;
}

function sw97ToxicBit(battle: Battle, pokemon: Pokemon, counter: number) {
	if (pokemon.status === 'psn' || pokemon.status === 'tox') {
		pokemon.status = 'tox' as ID;
		pokemon.statusState = battle.initEffectState({ id: 'tox', target: pokemon, counter, sw97Passed: true });
		delete pokemon.volatiles['swtoxic'];
		return true;
	}
	pokemon.volatiles['swtoxic'] = battle.initEffectState({ id: 'swtoxic', target: pokemon, counter });
	return false;
}

function sw97BatonRecord(state: AnyObject, pokemon: Pokemon) {
	const counter = pokemon.m.sw97CounterMove;
	state.counterMove = counter && counter.user === pokemon.previouslySwitchedIn ? counter.id : '';
	state.slotIndex = pokemon.moveSlots.findIndex(slot => slot.id === pokemon.m.sw97SlotMove);
	state.toxic = pokemon.status === 'tox' ? (pokemon.statusState.counter || 0) : undefined;
	state.transformed = !!pokemon.transformed;
}

export const Conditions: import('../../../sim/dex-conditions').ModdedConditionDataTable = {
	confusion: {
		inherit: true,
		onStart(target, source, sourceEffect) {
			if (sourceEffect?.id === 'swagger' && (target.volatiles['substitute'] || !this.randomChance(255, 256))) return false;
			if (sourceEffect?.id === 'lockedmove') {
				this.add('-start', target, 'confusion', '[silent]');
			} else {
				this.add('-start', target, 'confusion');
			}
			this.effectState.time = sourceEffect?.id === 'berserkgene' ? 256 : this.random(2, 6);
		},
		onBeforeMove(pokemon, target, move) {
			pokemon.volatiles['confusion'].time--;
			if (!pokemon.volatiles['confusion'].time) {
				pokemon.removeVolatile('confusion');
				return;
			}
			this.add('-activate', pokemon, 'confusion');
			if (this.randomChance(1, 2)) {
				return;
			}
			const selfHit = {
				basePower: 40,
				type: '???',
				baseMoveType: move.type,
				category: 'Physical',
				willCrit: false,
				isConfusionSelfHit: true,
				noDamageVariance: true,
				flags: {},
				selfdestruct: move.selfdestruct,
			} as unknown as ActiveMove;
			const damage = this.actions.getDamage(pokemon, pokemon, selfHit);
			if (typeof damage !== 'number') throw new Error("Confusion damage not dealt");
			this.lastDamage = damage;
			if (pokemon.volatiles['substitute']) {
				const foe = pokemon.side.foe.active[0];
				const foeSub = foe?.volatiles['substitute'];
				if (foeSub) {
					foeSub.hp -= damage;
					if (foeSub.hp < 0) {
						foe.removeVolatile('substitute');
					} else {
						this.add('-activate', foe, 'move: Substitute', '[damage]');
					}
				}
				return false;
			}
			this.directDamage(damage);
			return false;
		},
	},
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
			if (this.effectState.sw97Passed) {
				delete this.effectState.sw97Passed;
				return;
			}
			pokemon.status = 'psn' as ID;
			this.add('-status', pokemon, 'psn', '[silent]');
		},
		onAfterSwitchInSelf(pokemon) {
			const eighth = this.clampIntRange(Math.floor(pokemon.maxhp / 8), 1);
			if (!this.effectState.sw97Passed) {
				this.damage(eighth);
				return;
			}
			this.effectState.counter = (this.effectState.counter || 0) + 1;
			this.damage(eighth * this.effectState.counter, pokemon, pokemon);
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
		},
		onBeforeMove(pokemon, target, move) {
			pokemon.statusState.time--;
			if (pokemon.statusState.time <= 0) {
				pokemon.cureStatus();
				return;
			}
			this.add('cant', pokemon, 'slp');
			if (move.sleepUsable) return;
			pokemon.m.sw97TurnLost = this.turn;
			return false;
		},
	},
	frz: {
		inherit: true,
		onBeforeMove(pokemon, target, move) {
			if (move.flags['defrost']) return;
			this.add('cant', pokemon, 'frz');
			pokemon.m.sw97TurnLost = this.turn;
			return false;
		},
		onResidualOrder: 7,
		onResidual() {},
	},
	par: {
		inherit: true,
		onBeforeMovePriority: 1,
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
		onStart(pokemon) {
			this.add('-start', pokemon, 'Attract');
		},
		onEnd(pokemon) {
			this.add('-end', pokemon, 'Attract', '[silent]');
		},
		onBeforeMovePriority: 2,
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
	lockedmove: {
		inherit: true,
		durationCallback() {
			return this.random(3, 5);
		},
		onResidual(target) {
			if (target.lastMove?.id === 'struggle') delete target.volatiles['lockedmove'];
		},
		onEnd(target) {
			delete target.volatiles['confusion'];
			target.addVolatile('confusion');
			if (target.volatiles['confusion']) target.volatiles['confusion'].time = this.random(2, 4);
		},
		onMoveAborted(pokemon) {
			if (sw97TurnLost(this, pokemon)) {
				this.effectState.duration!++;
				return;
			}
			delete pokemon.volatiles['lockedmove'];
		},
	},
	twoturnmove: {
		inherit: true,
		onMoveAborted(pokemon) {
			if (sw97TurnLost(this, pokemon)) {
				this.effectState.duration!++;
				return;
			}
			pokemon.removeVolatile('twoturnmove');
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
			this.effectState.caller = (effect as ActiveMove).sourceEffect || '';
			this.effectState.locked = foe;
			foe.removeVolatile('mustrecharge');
			foe.addVolatile('partiallytrapped', target, effect);
		},
		onOverrideAction(pokemon, target, move) {
			if (target === this.effectState.locked) return;
			const caller = this.effectState.caller;
			pokemon.removeVolatile('partialtrappinglock');
			if (!caller) return;
			if (caller === 'metronome' && pokemon.hasMove('metronome')) return 'metronome';
			pokemon.m.sw97PPCaller = caller;
		},
		onBeforeMove(pokemon, target, move) {
			if (target !== this.effectState.locked) {
				pokemon.removeVolatile('partialtrappinglock');
			}
		},
		onMoveAborted(pokemon) {
			pokemon.removeVolatile('partialtrappinglock');
		},
		onAfterMoveSelfPriority: 1,
		onAfterMoveSelf(pokemon) {
			const target = this.effectState.locked;
			if (!target || target.hp <= 0 || !target.isActive || this.effectState.duration === 1) {
				pokemon.removeVolatile('partialtrappinglock');
				return;
			}
			target.addVolatile('partiallytrapped', pokemon, this.dex.getActiveMove(this.effectState.move));
		},
		onFoeFaint(target) {
			if (target === this.effectState.locked) {
				(this.effectState.target as Pokemon).removeVolatile('partialtrappinglock');
			}
		},
		onEnd(pokemon) {
			const target = this.effectState.locked;
			if (target?.isActive && target.volatiles['partiallytrapped']?.source === pokemon) {
				target.removeVolatile('partiallytrapped');
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
			this.effectState.trapName = sourceEffect?.name || 'Wrap';
			this.add('-activate', target, 'move: ' + this.effectState.trapName, '[of] ' + source);
		},
		onBeforeMovePriority: 9,
		onBeforeMove(pokemon, target, move) {
			const source = this.effectState.source;
			if (!source?.isActive || source.volatiles['partialtrappinglock']?.locked !== pokemon) {
				pokemon.removeVolatile('partiallytrapped');
				return;
			}
			if (move.id === 'rapidspin') return;
			this.add('cant', pokemon, 'partiallytrapped');
			pokemon.m.sw97TurnLost = this.turn;
			return false;
		},
		onEnd(pokemon) {
			if (this.effectState.spun) {
				this.add('-end', pokemon, this.effectState.trapName || 'Wrap', '[partiallytrapped]', '[from] move: Rapid Spin');
			} else {
				this.add('-end', pokemon, this.effectState.trapName || 'Wrap', '[partiallytrapped]', '[silent]');
			}
		},
		onRestart() {
			this.effectState.duration = 2;
		},
		onAccuracy(accuracy, target, source, move) {
			if (source === this.effectState.source && source.volatiles['partialtrappinglock']?.locked === target) return true;
		},
	},
	mustrecharge: {
		inherit: true,
		onStart() {},
	},
	flinch: {
		inherit: true,
		onBeforeMove(pokemon) {
			this.add('cant', pokemon, 'flinch');
			this.runEvent('Flinch', pokemon);
			pokemon.m.sw97TurnLost = this.turn;
			return false;
		},
	},
	swreflect: {
		name: 'swreflect',
		onStart(pokemon, source, sourceEffect) {
			this.effectState.screenName = (sourceEffect as ActiveMove)?.name || 'Reflect';
			this.add('-start', pokemon, 'move: ' + this.effectState.screenName);
		},
		onEnd(pokemon) {
			this.add('-end', pokemon, 'move: ' + (this.effectState.screenName || 'Reflect'), '[silent]');
		},
	},
	swbatonboost: {
		name: 'swbatonboost',
		onStart(pokemon) {
			sw97BatonRecord(this.effectState, pokemon);
		},
		onRestart(pokemon) {
			sw97BatonRecord(this.effectState, pokemon);
		},
		onCopy(pokemon) {
			const state = this.effectState;
			const foe = pokemon.side.foe.active[0];
			if (state.counterMove) {
				pokemon.m.sw97CounterMove = {
					id: state.counterMove, user: pokemon.previouslySwitchedIn + 1, foe, foeSwitch: foe?.previouslySwitchedIn,
				};
			}
			const slotMove = state.slotIndex >= 0 ? pokemon.moveSlots[state.slotIndex]?.id : undefined;
			if (slotMove) {
				pokemon.m.sw97SlotMove = slotMove;
			} else {
				delete pokemon.m.sw97SlotMove;
			}
			const encore = pokemon.volatiles['encore'];
			if (encore && state.counterMove) {
				encore.forced = state.counterMove;
				encore.move = slotMove || '';
			}
			if (state.toxic !== undefined) sw97ToxicBit(this, pokemon, state.toxic);
			if (state.transformed && !pokemon.volatiles['swtransformbit']) {
				pokemon.volatiles['swtransformbit'] = this.initEffectState({
					id: 'swtransformbit', target: pokemon, pp: pokemon.baseMoveSlots.map(slot => slot.pp),
				});
			}
		},
	},
	swtoxic: {
		name: 'swtoxic',
		onCopy(pokemon) {
			sw97ToxicBit(this, pokemon, this.effectState.counter || 0);
		},
		onAfterSetStatus(status, target) {
			if (status.id === 'psn') {
				if (sw97ToxicBit(this, target, this.effectState.counter || 0)) {
					delete target.statusState.sw97Passed;
					this.add('-status', target, 'tox', '[silent]');
				}
			} else if (status.id === 'tox') {
				delete target.volatiles['swtoxic'];
			}
		},
	},
	swtransformbit: {
		name: 'swtransformbit',
		onCopy(pokemon) {
			this.effectState.pp = pokemon.baseMoveSlots.map(slot => slot.pp);
		},
		onSwitchOut(pokemon) {
			const pp: number[] = this.effectState.pp || [];
			pokemon.baseMoveSlots.forEach((slot, i) => {
				if (pp[i] !== undefined) slot.pp = pp[i];
			});
		},
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
		onAfterMoveSelfPriority: -1,
		onAfterMoveSelf(pokemon) {
			this.damage(this.clampIntRange(Math.floor(pokemon.maxhp / 8), 1), pokemon);
		},
		onAfterSwitchInSelf(pokemon) {
			this.damage(this.clampIntRange(Math.floor(pokemon.maxhp / 8), 1), pokemon);
		},
	},
};
