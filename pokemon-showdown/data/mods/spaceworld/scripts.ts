const SW97_STATUS_STAB = new Set([
	'sing', 'sleeppowder', 'hypnosis', 'lovelykiss', 'spore', 'supersonic', 'confuseray', 'sweetkiss', 'stalker',
	'poisonpowder', 'poisongas', 'toxic', 'stunspore', 'thunderwave', 'glare', 'mirrormove',
]);
const SW97_DAMAGE_AFTER_HIT_CHECK = new Set([
	'doubleslap', 'cometpunch', 'doublekick', 'furyattack', 'twineedle', 'pinmissile', 'spikecannon', 'barrage',
	'furyswipes', 'bonemerang', 'bind', 'wrap', 'firespin', 'clamp', 'thrash', 'petaldance', 'outrage', 'triplekick',
	'present',
]);
const SW97_RAMPAGE = new Set(['thrash', 'petaldance', 'outrage']);
const SW97_FLINCH_SCRIPT = new Set([
	'bite', 'boneclub', 'headbutt', 'hyperfang', 'lowkick', 'rockslide', 'rollingkick', 'sacredfire', 'stomp',
]);

const SW97_RECALC_STATS: StatIDExceptHP[] = ['atk', 'def', 'spe', 'spa'];
const SW97_BATTLE_STATS: StatIDExceptHP[] = ['atk', 'def', 'spa', 'spd', 'spe'];
const SW97_STAGE_RATIOS: [number, number][] = [
	[25, 100], [28, 100], [33, 100], [40, 100], [50, 100], [66, 100], [1, 1],
	[15, 10], [2, 1], [25, 10], [3, 1], [35, 10], [4, 1],
];

function sw97StageStat(pokemon: Pokemon, stat: StatIDExceptHP) {
	const stage = Math.max(-6, Math.min(6, pokemon.boosts[stat]));
	const [num, den] = SW97_STAGE_RATIOS[stage + 6];
	return Math.max(1, Math.min(999, Math.floor(pokemon.storedStats[stat] * num / den)));
}

function sw97ApplyPar(stats: { [k: string]: number }) {
	stats.spe = Math.floor(stats.spe / 4) || 1;
}

function sw97ApplyBrn(stats: { [k: string]: number }) {
	stats.atk = Math.floor(stats.atk / 2) || 1;
}

function sw97Stats(pokemon: Pokemon): { [k: string]: number } {
	const current = pokemon.m.sw97Stats;
	if (current && current.key === pokemon.previouslySwitchedIn) return current;
	const baton = !!pokemon.volatiles['swbatonboost'];
	const stats: { [k: string]: number } = { key: pokemon.previouslySwitchedIn };
	for (const stat of SW97_BATTLE_STATS) {
		stats[stat] = baton ? sw97StageStat(pokemon, stat) : pokemon.storedStats[stat];
	}
	if (!baton) {
		if (pokemon.status === 'par') sw97ApplyPar(stats);
		if (pokemon.status === 'brn') sw97ApplyBrn(stats);
	}
	pokemon.m.sw97Stats = stats;
	return stats;
}

function sw97HpDV(ivs: Partial<StatsTable>) {
	const dv = (stat: StatIDExceptHP) => Math.floor((ivs[stat] ?? 31) / 2) & 1;
	return 16 * dv('atk') + 8 * dv('def') + dv('spe') + dv('spa');
}

function sw97GhostWrap(move: ActiveMove, target: Pokemon) {
	return (move.id === 'wrap' || move.id === 'bind') && target.hasType('Ghost') && !target.volatiles['foresight'];
}

export const Scripts: ModdedBattleScriptsData = {
	gen: 2,
	inherit: 'gen2',
	statModify(baseStats, set, statName) {
		if (statName !== 'hp') return Object.getPrototypeOf(this).statModify.call(this, baseStats, set, statName);
		const tr = this.trunc;
		return Math.min(999, tr(tr(2 * baseStats.hp + 2 * sw97HpDV(set.ivs) + tr(set.evs.hp / 4) + 100) * set.level / 100 + 10));
	},
	pokemon: {
		inherit: true,
		trySetStatus(status: string | Condition, source: Pokemon | null = null, sourceEffect: Effect | null = null) {
			if (sourceEffect && (sourceEffect as ActiveMove).effectType === 'Move' && source !== this) {
				const move = sourceEffect as ActiveMove;
				if (move.type && move.type !== '???') {
					if (!this.battle.dex.getImmunity(move.type, this.getTypes())) {
						return false;
					}
					if (this.battle.dex.getEffectiveness(move.type, this.getTypes()) < 0) {
						this.battle.add('-message', `${this.name} resisted the status because of ${move.name}'s type.`);
						return false;
					}
				}
			}
			return Object.getPrototypeOf(this).trySetStatus.call(this, status, source, sourceEffect);
		},
		gotAttacked(move: string | Move, damage: number | false | undefined, source: Pokemon) {
			const damageNumber = (typeof damage === 'number') ? damage : 0;
			move = this.battle.dex.moves.get(move);
			this.attackedBy.push({
				source,
				damage: damageNumber,
				move: move.id,
				thisTurn: true,
				slot: source.getSlot(),
				damageValue: damage,
			});
			if (damageNumber > 0) this.battle.lastDamage = damageNumber;
		},
		getStat(statName, unboosted, unmodified, fastReturn) {
			// @ts-expect-error type checking prevents 'hp' from being passed, but we're paranoid
			if (statName === 'hp') throw new Error("Please read `maxhp` directly");

			const stat = unboosted ? this.storedStats[statName] : sw97Stats(this)[statName];
			return this.battle.clampIntRange(stat, 1, 999);
		},
		boostBy(boost) {
			let delta = 0;
			let i: BoostID;
			for (i in boost) {
				delta = boost[i]!;
				if (!delta) continue;
				const recalc = (SW97_RECALC_STATS as string[]).includes(i);
				const stats = sw97Stats(this);
				if (recalc && stats[i] === (delta > 0 ? 999 : 1)) {
					const capped = this.battle.clampIntRange(this.boosts[i] + delta, -6, 6);
					if (capped !== this.boosts[i]) this.boosts[i] = capped - Math.sign(delta);
					delta = 0;
					continue;
				}
				this.boosts[i] += delta;
				if (this.boosts[i] > 6) {
					delta -= this.boosts[i] - 6;
					this.boosts[i] = 6;
				}
				if (this.boosts[i] < -6) {
					delta -= this.boosts[i] - (-6);
					this.boosts[i] = -6;
				}
				if (!delta) continue;
				if (recalc) stats[i] = sw97StageStat(this, i as StatIDExceptHP);
				if (delta > 0) {
					const foe = this.side.foe.active[0];
					if (foe) {
						const foeStats = sw97Stats(foe);
						if (foe.status === 'par') sw97ApplyPar(foeStats);
						if (foe.status === 'brn') sw97ApplyBrn(foeStats);
					}
				} else if (this.status === 'brn') {
					sw97ApplyBrn(stats);
				}
			}
			return delta;
		},
		clearBoosts() {
			Object.getPrototypeOf(this).clearBoosts.call(this);
			const stats = sw97Stats(this);
			for (const stat of SW97_BATTLE_STATS) stats[stat] = this.storedStats[stat];
		},
		setStatus(status, source, sourceEffect, ignoreImmunities) {
			const stats = sw97Stats(this);
			const prevStatus = this.status;
			const result = Object.getPrototypeOf(this).setStatus.call(this, status, source, sourceEffect, ignoreImmunities);
			if (this.status !== prevStatus) {
				if (this.status === 'par') sw97ApplyPar(stats);
				if (this.status === 'brn') sw97ApplyBrn(stats);
			}
			return result;
		},
		transformInto(pokemon, effect) {
			const result = Object.getPrototypeOf(this).transformInto.call(this, pokemon, effect);
			if (result) {
				this.m.sw97Stats = { ...sw97Stats(pokemon), key: this.previouslySwitchedIn };
			}
			return result;
		},
		getMoves(lockedMove, restrictData) {
			const moves = Object.getPrototypeOf(this).getMoves.call(this, lockedMove, restrictData);
			const hpPowerCallback = this.battle.dex.moves.get('hiddenpower').basePowerCallback as
				(this: Battle, pokemon: Pokemon) => number;
			for (const moveData of moves) {
				if (moveData.id === 'hiddenpower' && moveData.move.startsWith('Hidden Power ')) {
					moveData.move = `Hidden Power ${this.hpType} ${hpPowerCallback.call(this.battle, this)}`;
				}
			}
			return moves;
		},
	},
	actions: {
		inherit: true,
		runMove(moveOrMoveName, pokemon, targetLoc, options) {
			let move = this.dex.getActiveMove(moveOrMoveName);
			let target = this.battle.getTarget(pokemon, move, targetLoc);
			if (move.id === 'recharge' && !pokemon.volatiles['mustrecharge']) {
				move = this.dex.getActiveMove('hyperbeam');
				target = this.battle.getRandomTarget(pokemon, move);
				if (!pokemon.hasMove('hyperbeam') && pokemon.m.sw97HyperBeamCaller) {
					pokemon.m.sw97PPCaller = pokemon.m.sw97HyperBeamCaller;
				}
			}
			if (!options?.sourceEffect && move.id !== 'struggle') {
				const changedMove = this.battle.runEvent('OverrideAction', pokemon, target, move);
				if (changedMove && changedMove !== true) {
					move = this.dex.getActiveMove(changedMove);
					target = this.battle.getRandomTarget(pokemon, move);
				}
			}
			const ppCaller: string | undefined = pokemon.m.sw97PPCaller;
			delete pokemon.m.sw97PPCaller;
			if (!target && target !== false) target = this.battle.getRandomTarget(pokemon, move);

			this.battle.setActiveMove(move, pokemon, target);

			if (pokemon.moveThisTurn) {
				this.battle.debug(`${pokemon.fullname} INCONSISTENT STATE, ALREADY MOVED: ${pokemon.moveThisTurn}`);
				this.battle.clearActiveMove(true);
				return;
			}
			const foeStanding = () => !!pokemon.side.foe.active[0]?.hp;
			if (!this.battle.runEvent('BeforeMove', pokemon, target, move)) {
				if (pokemon.status === 'slp' || pokemon.status === 'frz') delete pokemon.m.sw97CounterMove;
				this.battle.runEvent('MoveAborted', pokemon, target, move);
				this.battle.clearActiveMove(true);
				if (foeStanding()) this.battle.runEvent('AfterMoveSelf', pokemon, target, move);
				return;
			}
			if (move.beforeMoveCallback) {
				if (move.beforeMoveCallback.call(this.battle, pokemon, target, move)) {
					this.battle.clearActiveMove(true);
					if (foeStanding()) this.battle.runEvent('AfterMoveSelf', pokemon, target, move);
					return;
				}
			}
			pokemon.lastDamage = 0;
			const lockedMove = pokemon.getLockedMove() || pokemon.getSemiLockedMove();
			if (!lockedMove) {
				const ppMove = ppCaller && pokemon.hasMove(ppCaller) ? ppCaller : move;
				if (!pokemon.deductPP(ppMove, null, target) && (move.id !== 'struggle')) {
					this.battle.add('cant', pokemon, 'nopp', move);
					this.battle.clearActiveMove(true);
					return;
				}
			}
			pokemon.moveUsed(move);
			const counterFoe = pokemon.side.foe.active[0];
			pokemon.m.sw97CounterMove = {
				id: move.id, user: pokemon.previouslySwitchedIn, foe: counterFoe, foeSwitch: counterFoe?.previouslySwitchedIn,
			};
			pokemon.m.sw97SlotMove = ppCaller && pokemon.hasMove(ppCaller) ? ppCaller : move.id;
			const sourceEffect = (options?.sourceEffect || (ppCaller ? this.dex.moves.get(ppCaller) : null)) as Effect | null;
			this.battle.actions.useMove(move, pokemon, { target, sourceEffect });
			this.battle.singleEvent('AfterMove', move, null, pokemon, target, move);
			if (!(pokemon.switchFlag && this.battle.canSwitch(pokemon.side)) && foeStanding()) {
				this.battle.runEvent('AfterMoveSelf', pokemon, target, move);
			}
		},
		moveHit(target, pokemon, move, moveData, isSecondary, isSelf) {
			let damage: number | false | null | undefined = undefined;
			move = this.dex.getActiveMove(move);

			if (!moveData) moveData = move;
			let hitResult: boolean | number | null = true;
			let subBroke: any = null;

			if (move.target === 'all' && !isSelf) {
				hitResult = this.battle.singleEvent('TryHitField', moveData, {}, target, pokemon, move);
			} else if ((move.target === 'foeSide' || move.target === 'allySide') && !isSelf) {
				hitResult = this.battle.singleEvent('TryHitSide', moveData, {}, (target ? target.side : null), pokemon, move);
			} else if (target) {
				hitResult = this.battle.singleEvent('TryHit', moveData, {}, target, pokemon, move);
			}
			if (!hitResult) {
				if (hitResult === false) this.battle.add('-fail', target);
				return false;
			}

			if (target && !isSecondary && !isSelf) {
				hitResult = this.battle.runEvent('TryPrimaryHit', target, pokemon, moveData);
				if (hitResult === 0) {
					hitResult = true;
					if (!target.volatiles['substitute']) {
						subBroke = target;
					}
					target = null;
				}
			}
			if (target && isSecondary && !moveData.self) {
				hitResult = true;
			}
			if (!hitResult) {
				return false;
			}

			if (target) {
				let didSomething: boolean | number | null = false;
				damage = this.getDamage(pokemon, target, moveData);

				if (damage === 0 && !isSecondary && !isSelf && sw97GhostWrap(move, target)) {
					this.battle.lastDamage = 0;
					didSomething = true;
				} else if ((damage || damage === 0) && !target.fainted) {
					damage = this.battle.damage(damage, target, pokemon, move);
					if (!(damage || damage === 0)) {
						this.battle.debug('damage interrupted');
						return false;
					}
					didSomething = true;
				}
				if (damage === false || damage === null) {
					if (damage === false && !isSecondary && !isSelf) {
						this.battle.add('-fail', target);
					}
					this.battle.debug('damage calculation interrupted');
					return false;
				}

				if (moveData.boosts && !target.fainted) {
					if (
						pokemon.volatiles['lockon'] && target === pokemon.volatiles['lockon'].source &&
						target.isSemiInvulnerable() && !isSelf
					) {
						if (!isSecondary) this.battle.add('-fail', target);
						return false;
					}
					hitResult = this.battle.boost(moveData.boosts, target, pokemon, move);
					didSomething = didSomething || hitResult;
				}
				if (moveData.heal && !target.fainted) {
					const d = target.heal(Math.round(target.maxhp * moveData.heal[0] / moveData.heal[1]));
					if (!d && d !== 0) {
						this.battle.add('-fail', target);
						this.battle.debug('heal interrupted');
						return false;
					}
					this.battle.add('-heal', target, target.getHealth);
					didSomething = true;
				}
				if (moveData.status) {
					hitResult = target.trySetStatus(moveData.status, pokemon, move);
					if (!hitResult && move.status) return hitResult;
					didSomething = didSomething || hitResult;
				}
				if (moveData.forceStatus) {
					hitResult = target.setStatus(moveData.forceStatus, pokemon, move);
					didSomething = didSomething || hitResult;
				}
				if (moveData.volatileStatus) {
					hitResult = target.addVolatile(moveData.volatileStatus, pokemon, move);
					didSomething = didSomething || hitResult;
				}
				if (moveData.sideCondition) {
					hitResult = target.side.addSideCondition(moveData.sideCondition, pokemon, move);
					didSomething = didSomething || hitResult;
				}
				if (moveData.weather) {
					hitResult = this.battle.field.setWeather(moveData.weather, pokemon, move);
					didSomething = didSomething || hitResult;
				}
				if (moveData.pseudoWeather) {
					hitResult = this.battle.field.addPseudoWeather(moveData.pseudoWeather, pokemon, move);
					didSomething = didSomething || hitResult;
				}
				if (moveData.forceSwitch) {
					if (this.battle.canSwitch(target.side)) didSomething = true;
				}
				if (moveData.selfSwitch) {
					if (this.battle.canSwitch(pokemon.side)) didSomething = true;
				}
				hitResult = null;
				if (move.target === 'all' && !isSelf) {
					if (moveData.onHitField) hitResult = this.battle.singleEvent('HitField', moveData, {}, target, pokemon, move);
				} else if ((move.target === 'foeSide' || move.target === 'allySide') && !isSelf) {
					if (moveData.onHitSide) hitResult = this.battle.singleEvent('HitSide', moveData, {}, target.side, pokemon, move);
				} else {
					if (moveData.onHit) hitResult = this.battle.singleEvent('Hit', moveData, {}, target, pokemon, move);
					if (!isSelf && !isSecondary) {
						this.battle.runEvent('Hit', target, pokemon, move);
					}
					if (moveData.onAfterHit) hitResult = this.battle.singleEvent('AfterHit', moveData, {}, target, pokemon, move);
				}

				if (!hitResult && !didSomething && !moveData.self && !moveData.selfdestruct) {
					if (!isSelf && !isSecondary) {
						if (hitResult === false || didSomething === false) this.battle.add('-fail', target);
					}
					this.battle.debug('move failed because it did nothing');
					return false;
				}
			}
			if (moveData.self) {
				if (!isSecondary && moveData.self.boosts) this.battle.random(100);
				this.moveHit(pokemon, pokemon, move, moveData.self, isSecondary, true);
			}
			const secondaryTarget = target || subBroke;
			if (
				secondaryTarget?.hp && !isSecondary && !isSelf && (!move.multihit || move.lastHit) &&
				(SW97_FLINCH_SCRIPT.has(move.id) || moveData.secondaries?.some(secondary => secondary.kingsrock))
			) {
				secondaryTarget.removeVolatile('mustrecharge');
			}
			if (secondaryTarget?.hp && moveData.secondaries && this.battle.runEvent('TrySecondaryHit', secondaryTarget, pokemon, moveData)) {
				for (const secondary of moveData.secondaries) {
					if (secondary.status && ['brn', 'frz'].includes(secondary.status) && secondaryTarget.hasType(move.type)) {
						this.battle.debug('Target immune to [' + secondary.status + ']');
						continue;
					}
					if (secondary.volatileStatus === 'flinch' && ['slp', 'frz'].includes(secondaryTarget.status) && !secondary.kingsrock) {
						this.battle.debug('Cannot flinch a sleeping or frozen target');
						continue;
					}
					if (!move.multihit || move.lastHit) {
						const effectChance = Math.floor((secondary.chance || 100) * 255 / 100);
						if (typeof secondary.chance === 'undefined' || this.battle.randomChance(effectChance, 256)) {
							this.moveHit(secondaryTarget, pokemon, move, secondary, true, isSelf);
						} else if (effectChance === 255) {
							this.battle.hint("In Gen 2, moves with a 100% secondary effect chance will not trigger in 1/256 uses.");
						}
					}
				}
			}
			if (target && target.hp > 0 && pokemon.hp > 0 && moveData.forceSwitch && this.battle.canSwitch(target.side)) {
				hitResult = this.battle.runEvent('DragOut', target, pokemon, move);
				if (hitResult) {
					this.dragIn(target.side, target.position);
				} else if (hitResult === false) {
					this.battle.add('-fail', target);
				}
			}
			if (move.selfSwitch && pokemon.hp) {
				pokemon.switchFlag = move.id;
			}
			return damage;
		},
		tryMoveHit(target, pokemon, move) {
			const positiveBoostTable = [1, 1.5, 2, 2.5, 3, 3.5, 4];
			const negativeBoostTable = [1, 0.66, 0.5, 0.4, 0.33, 0.28, 0.25];
			const doSelfDestruct = true;
			let damage: number | false | undefined = 0;
			if (move.category !== 'Status' && move.id !== 'counter' && move.id !== 'bide') {
				this.battle.lastDamage = 0;
			}
			const opponent = pokemon.side.foe.active[0];
			if (SW97_STATUS_STAB.has(move.id) && opponent) {
				let curDamage = this.battle.lastDamage;
				if (pokemon.hasType(move.type)) curDamage = (curDamage + (curDamage >> 1)) & 0xffff;
				for (const type of opponent.getTypes()) {
					if (!this.dex.getImmunity(move.type, type)) {
						curDamage = 0;
					} else {
						const factor = [5, 10, 20][this.dex.getEffectiveness(move.type, type) + 1] ?? 10;
						curDamage = Math.floor(curDamage * factor / 10);
					}
				}
				this.battle.lastDamage = curDamage;
			}
			const afterHitCheck = () => {
				if (SW97_DAMAGE_AFTER_HIT_CHECK.has(move.id)) {
					const hitMove = move.id === 'present' ? { ...move, basePower: 50, heal: undefined } as ActiveMove : move;
					const wouldBe = this.getDamage(pokemon, target, hitMove, true);
					this.battle.lastDamage = typeof wouldBe === 'number' ? wouldBe : 0;
				} else if (move.id === 'jumpkick' || move.id === 'highjumpkick') {
					this.battle.lastDamage = 1;
				}
			};

			if (['explosion', 'selfdestruct'].includes(move.id) && doSelfDestruct) {
				pokemon.cureStatus(true);
				pokemon.removeVolatile('leechseed');
				const newHP = pokemon.hp & ~0xFF;
				pokemon.maxhp = this.battle.clampIntRange(pokemon.maxhp % 256, 1);
				if (newHP <= 0) {
					this.battle.faint(pokemon, pokemon, move);
				} else {
					pokemon.hp = newHP;
					this.battle.add('-damage', pokemon, pokemon.getHealth);
				}
			}

			let hitResult = this.battle.singleEvent('PrepareHit', move, {}, target, pokemon, move);
			if (!hitResult) {
				if (hitResult === false) this.battle.add('-fail', target);
				return false;
			}
			this.battle.runEvent('PrepareHit', pokemon, target, move);

			if (!this.battle.singleEvent('Try', move, null, pokemon, target, move)) {
				return false;
			}

			if (move.target === 'all' || move.target === 'foeSide' || move.target === 'allySide' || move.target === 'allyTeam') {
				if (move.target === 'all') {
					hitResult = this.battle.runEvent('TryHitField', target, pokemon, move);
				} else {
					hitResult = this.battle.runEvent('TryHitSide', target, pokemon, move);
				}
				if (!hitResult) {
					if (hitResult === false) {
						this.battle.add('-fail', pokemon);
						this.battle.attrLastMove('[still]');
					}
					return false;
				}
				return this.moveHit(target, pokemon, move);
			}

			const rampageContinues = SW97_RAMPAGE.has(move.id) && !!pokemon.volatiles['lockedmove'];
			const rechargeSleep = move.category === 'Status' && move.status === 'slp' && target !== pokemon &&
				!!target.volatiles['mustrecharge'] && !target.status && !target.volatiles['substitute'] &&
				(move.type === '???' || (this.dex.getImmunity(move.type, target.getTypes()) &&
					this.dex.getEffectiveness(move.type, target.getTypes()) >= 0));
			if (rechargeSleep) move.infiltrates = true;
			const skipHitCheck = rampageContinues || rechargeSleep;

			hitResult = skipHitCheck || this.battle.runEvent('Invulnerability', target, pokemon, move);
			if (hitResult === false) {
				this.battle.lastDamage = 0;
				afterHitCheck();
				this.battle.attrLastMove('[miss]');
				this.battle.add('-miss', pokemon);
				return false;
			}

			if (move.ignoreImmunity === undefined) {
				move.ignoreImmunity = (move.category === 'Status');
			}

			if (!target.runImmunity(move, true)) {
				if (move.id === 'jumpkick' || move.id === 'highjumpkick') this.battle.lastDamage = 1;
				return false;
			}

			hitResult = this.battle.singleEvent('TryImmunity', move, {}, target, pokemon, move);
			if (hitResult === false) {
				this.battle.add('-immune', target);
				return false;
			}

			hitResult = skipHitCheck || this.battle.runEvent('TryHit', target, pokemon, move);
			if (!hitResult) {
				if (target.volatiles['protect'] && move.flags['protect']) {
					this.battle.lastDamage = 0;
					afterHitCheck();
				}
				if (hitResult === false) this.battle.add('-fail', target);
				return false;
			}

			if (move.ohko && (target.runEffectiveness(move) < 0 || pokemon.getStat('spe') < target.getStat('spe'))) {
				this.battle.add('-immune', target, '[ohko]');
				return false;
			}

			let accuracy = move.accuracy;
			if (move.alwaysHit || skipHitCheck) {
				accuracy = true;
			} else {
				accuracy = this.battle.runEvent('Accuracy', target, pokemon, move, accuracy);
			}
			if (accuracy !== true) {
				accuracy = Math.floor(accuracy * 255 / 100);
				if (!move.ignoreAccuracy) {
					if (pokemon.boosts.accuracy > 0) {
						accuracy *= positiveBoostTable[pokemon.boosts.accuracy];
					} else {
						accuracy *= negativeBoostTable[-pokemon.boosts.accuracy];
					}
					accuracy = Math.floor(accuracy);
				}
				if (!move.ignoreEvasion) {
					if (target.boosts.evasion > 0 && !move.ignorePositiveEvasion) {
						accuracy *= negativeBoostTable[target.boosts.evasion];
					} else if (target.boosts.evasion < 0) {
						accuracy *= positiveBoostTable[-target.boosts.evasion];
					}
					accuracy = Math.floor(accuracy);
				}
				accuracy = Math.min(Math.floor(accuracy), 255);
				accuracy = Math.max(accuracy, 1);
			} else {
				accuracy = this.battle.runEvent('Accuracy', target, pokemon, move, accuracy);
			}
			accuracy = this.battle.runEvent('ModifyAccuracy', target, pokemon, move, accuracy);
			if (accuracy !== true) accuracy = Math.max(accuracy, 0);
			if (move.alwaysHit || skipHitCheck) {
				accuracy = true;
			} else {
				accuracy = this.battle.runEvent('Accuracy', target, pokemon, move, accuracy);
			}
			if (accuracy !== true && !this.battle.randomChance(accuracy, 256)) {
				this.battle.lastDamage = 0;
				afterHitCheck();
				this.battle.attrLastMove('[miss]');
				this.battle.add('-miss', pokemon);
				damage = false;
				return damage;
			}
			move.totalDamage = 0;
			pokemon.lastDamage = 0;
			if (move.multihit) {
				let hits = move.multihit;
				if (Array.isArray(hits)) {
					if (hits[0] === 2 && hits[1] === 5) {
						const roll = this.battle.random(256);
						hits = (roll < 2 ? roll : this.battle.random(4)) + 2;
					} else {
						hits = this.battle.random(hits[0], hits[1] + 1);
					}
				}
				hits = Math.floor(hits);
				let nullDamage = true;
				let moveDamage: number | undefined | false;

				const isSleepUsable = move.sleepUsable || this.dex.moves.get(move.sourceEffect).sleepUsable;
				let i: number;
				for (i = 0; i < hits && target.hp && pokemon.hp; i++) {
					if (pokemon.status === 'slp' && !isSleepUsable) break;
					move.hit = i + 1;
					move.lastHit = move.hit === hits;
					moveDamage = this.moveHit(target, pokemon, move);
					if (moveDamage === false) break;
					if (nullDamage && (moveDamage || moveDamage === 0 || moveDamage === undefined)) nullDamage = false;
					damage = (moveDamage || 0);
					move.totalDamage += damage;
					this.battle.eachEvent('Update');
				}
				if (i === 0) return 1;
				if (nullDamage) damage = false;
				this.battle.add('-hitcount', target, i);
			} else {
				damage = this.moveHit(target, pokemon, move);
				move.totalDamage = damage;
				if (rechargeSleep && target.status === 'slp') target.removeVolatile('mustrecharge');
			}
			if (move.category !== 'Status') {
				target.gotAttacked(move, damage, pokemon);
			}
			if (move.drain && this.battle.lastDamage) this.battle.lastDamage = Math.max(this.battle.lastDamage >> 1, 1);
			if (move.ohko && damage) this.battle.lastDamage = 0xffff;
			if (move.ohko) this.battle.add('-ohko');

			this.battle.singleEvent('AfterMoveSecondary', move, null, target, pokemon, move);
			this.battle.runEvent('AfterMoveSecondary', target, pokemon, move);

			if (move.recoil && move.totalDamage) {
				this.battle.damage(this.calcRecoilDamage(move.totalDamage, move, pokemon), pokemon, target, 'recoil');
			} else if (move.totalDamage || (move.totalDamage === 0 && move.mindBlownRecoil)) {
				this.applyRecoilDamage(move.totalDamage, move, pokemon);
			}
			return damage;
		},
		getDamage(source, target, move, suppressMessages) {
			if (typeof move === 'string') {
				move = this.dex.getActiveMove(move);
			} else if (typeof move === 'number') {
				move = {
					basePower: move,
					type: '???',
					category: 'Physical',
					willCrit: false,
					flags: {},
				} as unknown as ActiveMove;
			}

			if (!target.runImmunity(move, true)) {
				return false;
			}

			if (sw97GhostWrap(move, target)) {
				if (!suppressMessages) this.battle.add('-immune', target);
				return 0;
			}

			if (move.ohko) {
				return 0xffff;
			}

			if (move.damageCallback) {
				return move.damageCallback.call(this.battle, source, target);
			}

			if (move.damage === 'level') {
				return source.level;
			}

			if (move.damage) {
				return move.damage;
			}

			move.category = this.battle.getCategory(move);
			if (!move.type) move.type = '???';
			const type = move.type;

			let basePower: number | false | null | undefined = move.basePower;
			if (move.basePowerCallback) {
				basePower = move.basePowerCallback.call(this.battle, source, target, move);
			}

			if (!basePower) {
				if (basePower === 0) return;
				return basePower;
			}
			basePower = this.battle.clampIntRange(basePower, 1);

			let isCrit = move.willCrit || false;
			if (typeof move.willCrit === 'undefined' && move.category !== 'Status' && source.species?.baseStats) {
				const highCrit = ['karatechop', 'razorleaf', 'crabhammer', 'slash'];
				let counter = 6;
				if (source.volatiles['focusenergy']) counter -= 3;
				if (highCrit.includes(move.id)) counter -= 2;
				let critChance = source.baseStatsForSet().spe * 4;
				for (let i = 1; i < counter; i++) critChance = Math.floor(critChance / 2);
				critChance = Math.min(critChance, 255);
				if (source.hasItem('sharpscythe')) critChance = Math.min(critChance + 30, 255);
				isCrit = critChance > 0 ? this.battle.randomChance(critChance, 256) : false;
			}

			if (isCrit && this.battle.runEvent('CriticalHit', target, null, move)) {
				target.getMoveHitData(move).crit = true;
			}

			if (basePower) {
				if (move.isConfusionSelfHit) {
					move.type = move.baseMoveType!;
					basePower = this.battle.runEvent('BasePower', source, target, move, basePower, true);
					move.type = '???';
				} else {
					basePower = this.battle.runEvent('BasePower', source, target, move, basePower, true);
				}
				if (basePower && move.basePowerModifier) {
					basePower *= move.basePowerModifier;
				}
			}
			if (!basePower) return 0;
			basePower = this.battle.clampIntRange(basePower, 1);

			let level = source.level;
			if (isCrit) level *= 2;

			const attacker = move.overrideOffensivePokemon === 'target' ? target : source;
			const defender = move.overrideDefensivePokemon === 'source' ? source : target;

			const isPhysical = move.category === 'Physical';
			const atkType: StatIDExceptHP = move.overrideOffensiveStat || (isPhysical ? 'atk' : 'spa');
			const defType: StatIDExceptHP = move.overrideDefensiveStat || (isPhysical ? 'def' : 'spd');

			if (isCrit && !suppressMessages) this.battle.add('-crit', target);

			let attack = attacker.getStat(atkType, isCrit, isCrit);
			let defense = defender.getStat(defType, isCrit);

			if (move.ignoreOffensive) {
				this.battle.debug('Negating (sp)atk boost/penalty.');
				attack = attacker.getStat(atkType, true, true);
			}

			if (move.ignoreDefensive) {
				this.battle.debug('Negating (sp)def boost/penalty.');
				defense = target.getStat(defType, true, true);
			}

			if (!isCrit && isPhysical && defender.volatiles['swreflect']) {
				defense *= 2;
			}
			if (move.isConfusionSelfHit && attacker.volatiles['swreflect']) {
				defense *= 2;
			}

			if (attack >= 256 || defense >= 256) {
				attack = this.battle.clampIntRange(Math.floor(attack / 4), 1);
				defense = this.battle.clampIntRange(Math.floor(defense / 4), 1);
			}

			if (['explosion', 'selfdestruct'].includes(move.id) && defType === 'def') {
				defense = this.battle.clampIntRange(Math.floor(defense / 2), 1);
			}

			let damage = level * 2;
			damage = Math.floor(damage / 5);
			damage += 2;
			damage *= basePower;
			damage *= attack;
			damage = Math.floor(damage / defense);
			damage = Math.floor(damage / 50);
			damage = Math.floor(this.battle.runEvent('ModifyDamage', attacker, defender, move, damage));
			damage = this.battle.clampIntRange(damage, 1, 997);
			damage += 2;

			if (move.id === 'triplekick' && move.hit > 1) {
				damage = Math.min(damage * (source.volatiles['substitute'] ? 4 : move.hit), 0xffff);
			}

			if (
				(type === 'Water' && this.battle.field.isWeather('raindance')) ||
				(type === 'Fire' && this.battle.field.isWeather('sunnyday'))
			) {
				damage *= 2;
			} else if (
				(type === 'Fire' && this.battle.field.isWeather('raindance')) ||
				(type === 'Water' && this.battle.field.isWeather('sunnyday'))
			) {
				damage = Math.floor(damage / 2);
			}

			const typeless = move.id === 'flail' || move.id === 'reversal';
			if (!typeless && type !== '???' && source.hasType(type)) {
				damage += Math.floor(damage / 2);
			}

			const totalTypeMod = typeless ? 0 : target.runEffectiveness(move);
			if (totalTypeMod > 0) {
				if (!suppressMessages) this.battle.add('-supereffective', target);
				damage *= 2;
				if (totalTypeMod >= 2) {
					damage *= 2;
				}
			}
			if (totalTypeMod < 0) {
				if (!suppressMessages) this.battle.add('-resisted', target);
				damage = Math.floor(damage / 2);
				if (totalTypeMod <= -2) {
					damage = Math.floor(damage / 2);
				}
			}

			let doublings = 0;
			if (move.id === 'rollout') doublings = (source.volatiles['rollout']?.hitCount || 1) - 1;
			if (move.id === 'furycutter') doublings = source.volatiles['furycutter']?.count || 0;
			for (let i = 0; i < doublings && damage < 0xffff; i++) {
				damage = Math.min(damage * 2, 0xffff);
			}

			if (!move.noDamageVariance && damage > 1) {
				damage *= this.battle.random(217, 256);
				damage = Math.floor(damage / 255);
			}

			if (basePower && !Math.floor(damage)) {
				return 1;
			}

			return damage;
		},
	},
};
