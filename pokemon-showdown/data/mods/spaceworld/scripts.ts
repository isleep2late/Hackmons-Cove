export const Scripts: ModdedBattleScriptsData = {
	gen: 2,
	inherit: 'gen2',
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

			let stat = this.storedStats[statName];

			if (!unboosted && !(statName === 'spd' && !this.volatiles['swbatonboost'])) {
				let boost = this.boosts[statName];
				if (boost > 6) boost = 6;
				if (boost < -6) boost = -6;
				if (boost >= 0) {
					const boostTable = [1, 1.5, 2, 2.5, 3, 3.5, 4];
					stat = Math.floor(stat * boostTable[boost]);
				} else {
					const numerators = [100, 66, 50, 40, 33, 28, 25];
					stat = Math.floor(stat * numerators[-boost] / 100);
				}
			}

			if (this.status === 'par' && statName === 'spe') {
				stat = Math.floor(stat / 4);
			}

			if (!unmodified) {
				if (this.status === 'brn' && statName === 'atk') {
					stat = Math.floor(stat / 2);
				}
			}

			stat = this.battle.clampIntRange(stat, 1, 999);
			return stat;
		},
	},
	actions: {
		inherit: true,
		tryMoveHit(target, pokemon, move) {
			const positiveBoostTable = [1, 1.5, 2, 2.5, 3, 3.5, 4];
			const negativeBoostTable = [1, 0.66, 0.5, 0.4, 0.33, 0.28, 0.25];
			const doSelfDestruct = true;
			let damage: number | false | undefined = 0;

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

			hitResult = this.battle.runEvent('Invulnerability', target, pokemon, move);
			if (hitResult === false) {
				this.battle.attrLastMove('[miss]');
				this.battle.add('-miss', pokemon);
				return false;
			}

			if (move.ignoreImmunity === undefined) {
				move.ignoreImmunity = (move.category === 'Status');
			}

			if (!target.runImmunity(move, true)) {
				return false;
			}

			hitResult = this.battle.singleEvent('TryImmunity', move, {}, target, pokemon, move);
			if (hitResult === false) {
				this.battle.add('-immune', target);
				return false;
			}

			hitResult = this.battle.runEvent('TryHit', target, pokemon, move);
			if (!hitResult) {
				if (hitResult === false) this.battle.add('-fail', target);
				return false;
			}

			if (move.ohko && pokemon.level < target.level) {
				this.battle.add('-immune', target, '[ohko]');
				return false;
			}

			let accuracy = move.accuracy;
			if (move.alwaysHit) {
				accuracy = true;
			} else {
				accuracy = this.battle.runEvent('Accuracy', target, pokemon, move, accuracy);
			}
			if (accuracy !== true) {
				accuracy = Math.floor(accuracy * 255 / 100);
				if (move.ohko) {
					accuracy += (pokemon.level - target.level) * 2;
					accuracy = Math.min(accuracy, 255);
				}
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
			if (move.alwaysHit) {
				accuracy = true;
			} else {
				accuracy = this.battle.runEvent('Accuracy', target, pokemon, move, accuracy);
			}
			if (accuracy !== true && !this.battle.randomChance(accuracy, 256)) {
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
						hits = this.battle.sample([2, 2, 2, 3, 3, 3, 4, 5]);
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
			}
			if (move.category !== 'Status') {
				target.gotAttacked(move, damage, pokemon);
			}
			if (move.ohko) this.battle.add('-ohko');

			this.battle.singleEvent('AfterMoveSecondary', move, null, target, pokemon, move);
			this.battle.runEvent('AfterMoveSecondary', target, pokemon, move);

			if (move.recoil && move.totalDamage) {
				this.battle.damage(this.calcRecoilDamage(move.totalDamage, move, pokemon), pokemon, target, 'recoil');
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

			if (move.ohko) {
				return target.maxhp;
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
				let critChance = source.species.baseStats.spe * 4;
				for (let i = 1; i < counter; i++) critChance = Math.floor(critChance / 2);
				critChance = Math.min(critChance, 255);
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

			if (
				(type === 'Water' && this.battle.field.isWeather('raindance')) ||
				(type === 'Fire' && this.battle.field.isWeather('sunnyday'))
			) {
				damage = Math.floor(damage * 1.5);
			} else if (
				(type === 'Fire' && this.battle.field.isWeather('raindance')) ||
				(type === 'Water' && this.battle.field.isWeather('sunnyday'))
			) {
				damage = Math.floor(damage / 2);
			}

			if (type !== '???' && source.hasType(type)) {
				damage += Math.floor(damage / 2);
			}

			const totalTypeMod = target.runEffectiveness(move);
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
