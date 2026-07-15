export const Scripts: ModdedBattleScriptsData = {
	gen: 9,
	inherit: 'gen9',

	init() {

		for (const id in this.data.Items) {
			const item = this.data.Items[id];
			if (item.megaStone) {
				item.isNonstandard = null;
			}
			if (item.zMove || item.zMoveType) {
				item.isNonstandard = null;
			}
		}

		for (const id in this.data.Moves) {
			const move = this.data.Moves[id];
			if (id.startsWith('gmax') || move.isMax) {
				move.isNonstandard = null;
			}
			if (id.startsWith('gmax')) {
				move.isMax = false;
			}
		}

	},

	statModify(baseStats: StatsTable, set: PokemonSet, statName: StatID) {
		let stat = Object.getPrototypeOf(this).statModify.call(this, baseStats, set, statName);
		if (statName === 'hp') {
		const species = this.dex.species.get(set.species);
		if (species.forme === 'Gmax' || set.gigantamax) {
			stat *= 2;
		}
	}
    return stat;
    },


	pokemon: {

		transformInto(pokemon: Pokemon, effect: Effect | null) {
			const shadowMoveIds = ['shadowrush', 'shadowblast', 'shadowblitz', 'shadowbreak', 'shadowend', 'shadowbolt', 'shadowchill', 'shadowfire', 'shadowstorm', 'shadowwave', 'shadowrave', 'shadowdown', 'shadowmist', 'shadowpanic', 'shadowhold', 'shadowhalf', 'shadowshed', 'shadowsky'];
			const isShadow = pokemon.hasType('Shadow') || pokemon.moveSlots.some((s: any) => shadowMoveIds.includes(s.id));
			if (isShadow) return false;
			return Object.getPrototypeOf(this).transformInto.call(this, pokemon, effect);
		},

		getDynamaxRequest(skipChecks?: boolean) {
			if (!skipChecks) {
				if (!this.side.canDynamaxNow()) return;
				if (
					this.species.isMega || this.species.isPrimal || this.species.forme === 'Ultra' ||
					this.getItem().zMove || this.canMegaEvo || this.canUltraBurst
				) {
					return;
				}
				if (this.set.teraType) return;
			}
			return Object.getPrototypeOf(this).getDynamaxRequest.call(this, true);
		},

		getMoves(lockedMove?: ID | null, restrictData?: boolean) {
			const moves = Object.getPrototypeOf(this).getMoves.call(this, lockedMove, restrictData);
			if (!this.volatiles.dynamax) return moves;
			const isGmax = this.species.forme === 'Gmax' || this.baseSpecies.forme === 'Gmax' || this.gigantamax;
			const canGmax = this.species.canGigantamax || (this.species.changesFrom ? this.battle.dex.species.get(this.species.changesFrom).canGigantamax : null);
			if (isGmax && canGmax) {
				const gmaxMove = this.battle.dex.moves.get(canGmax);
				if (gmaxMove.exists) {
					for (const moveSlot of moves) {
						const move = this.battle.dex.moves.get(moveSlot.id);
						if (move.category !== 'Status' && move.type === gmaxMove.type) {
							const activeMaxMove = this.battle.actions.getActiveMaxMove(move, this);
							moveSlot.move = activeMaxMove.name;
							moveSlot.id = activeMaxMove.id;
							moveSlot.target = activeMaxMove.target;
						}
					}
				}
			}
			return moves;
		},

		getMoveData(move: string | Move) {
			const baseMove = this.battle.dex.moves.get(move);
			const isGmax = this.species.forme === 'Gmax' || this.baseSpecies.forme === 'Gmax' || this.gigantamax;
			const canGmax = this.species.canGigantamax || (this.species.changesFrom ? this.battle.dex.species.get(this.species.changesFrom).canGigantamax : null);
			if (isGmax && canGmax) {
				const gmaxMove = this.battle.dex.moves.get(canGmax);
				if (gmaxMove.exists && baseMove.id === gmaxMove.id) {
					for (const slot of this.moveSlots) {
						const slotMove = this.battle.dex.moves.get(slot.id);
						if (slotMove.category !== 'Status' && slotMove.type === gmaxMove.type) {
							return slot;
						}
					}
				}
			}
			return Object.getPrototypeOf(this).getMoveData.call(this, move);
		},

		hasMove(moveid: ID) {
			const isGmax = this.species.forme === 'Gmax' || this.baseSpecies.forme === 'Gmax' || this.gigantamax;
			const canGmax = this.species.canGigantamax || (this.species.changesFrom ? this.battle.dex.species.get(this.species.changesFrom).canGigantamax : null);
			if (isGmax && canGmax) {
				const gmaxMove = this.battle.dex.moves.get(canGmax);
				if (gmaxMove.exists && moveid === gmaxMove.id) {
					return this.moveSlots.some(slot => {
						const slotMove = this.battle.dex.moves.get(slot.id);
						return slotMove.category !== 'Status' && slotMove.type === gmaxMove.type;
					});
				}
			}
			return Object.getPrototypeOf(this).hasMove.call(this, moveid);
		},

		getUpdatedDetails(level?: number) {
			const baseDetails = Object.getPrototypeOf(this).getUpdatedDetails.call(this, level);
			const canGmax = this.species.canGigantamax || (this.species.changesFrom ? this.battle.dex.species.get(this.species.changesFrom).canGigantamax : null);
			if (this.set.gigantamax && this.species.forme !== 'Gmax' && canGmax) {
				const gmaxSpecies = this.battle.dex.species.get(this.species.name + '-Gmax');
				if (gmaxSpecies.exists && gmaxSpecies.forme === 'Gmax' && baseDetails.startsWith(this.species.name)) {
					return gmaxSpecies.name + baseDetails.slice(this.species.name.length);
				}
			}
			return baseDetails;
		},
	},

	side: {
		canDynamaxNow(this: Side) {
			if (this.battle.gameType === 'multi' && this.battle.turn % 2 !== [1, 1, 0, 0][this.n]) return false;
			return !this.dynamaxUsed;
		},

		chooseMove(
			this: Side,
			moveText?: string | number,
			targetLoc = 0,
			event: 'mega' | 'megax' | 'megay' | 'zmove' | 'ultra' | 'dynamax' | 'terastallize' | '' = ''
		) {
			const index = this.getChoiceIndex();
			if (index < this.active.length && this.active[index]) {
				const pokemon = this.active[index];
				const isGmax = pokemon.species.forme === 'Gmax' || pokemon.baseSpecies.forme === 'Gmax' || pokemon.gigantamax;
				const canGmax = pokemon.species.canGigantamax || (pokemon.species.changesFrom ? this.battle.dex.species.get(pokemon.species.changesFrom).canGigantamax : null);
				if (isGmax && canGmax) {
					const request = pokemon.getMoveRequestData();
					let chosenMoveid = '';
					let moveSlotIndex = -1;
					if (moveText && (typeof moveText === 'number' || /^[0-9]+$/.test(moveText))) {
						const moveIndex = Number(moveText) - 1;
						if (request.moves[moveIndex]) {
							chosenMoveid = request.moves[moveIndex].id;
							moveSlotIndex = moveIndex;
						}
					} else if (moveText) {
						chosenMoveid = toID(moveText);
						if (chosenMoveid.startsWith('hiddenpower')) chosenMoveid = 'hiddenpower';
						moveSlotIndex = request.moves.findIndex(m => m.id === chosenMoveid);
					}
					
					const gmaxMove = this.battle.dex.moves.get(canGmax);
					if (gmaxMove.exists && chosenMoveid === gmaxMove.id) {
						const baseMoveSlot = pokemon.moveSlots[moveSlotIndex];
						if (baseMoveSlot) {
							(pokemon as any)._gmaxBaseMoveSlot = baseMoveSlot;
						}
					}
				}
			}
			return Object.getPrototypeOf(this).chooseMove.call(this, moveText, targetLoc, event);
		},
	},

	actions: {
		hitStepInvulnerabilityEvent(targets: Pokemon[], pokemon: Pokemon, move: ActiveMove) {
			if (move.id === 'helpinghand') return new Array(targets.length).fill(true);
			const hitResults: boolean[] = [];
			for (const [i, target] of targets.entries()) {
				if (target.volatiles['commanding']) {
					hitResults[i] = false;
				} else if (this.battle.gen >= 8 && move.id === 'toxic' && pokemon.hasType('Poison')) {
					hitResults[i] = true;
				} else {
					hitResults[i] = this.battle.runEvent('Invulnerability', target, pokemon, move);
				}
				if (hitResults[i] === false) {
					if (move.smartTarget) {
						move.smartTarget = false;
					} else {
						if (!move.spreadHit) this.battle.attrLastMove('[miss]');
						this.battle.add('-miss', pokemon, target);
					}
				}
			}
			return hitResults;
		},
		canMegaEvo(pokemon: Pokemon) {
			const species = pokemon.baseSpecies;
			const altForme = species.otherFormes && this.dex.species.get(species.otherFormes[0]);
			const item = pokemon.getItem();
			if ((this.battle.gen <= 7 || this.battle.ruleTable.has('+tag:past') ||
				this.battle.ruleTable.has('+tag:future')) &&
				altForme?.isMega && altForme?.requiredMove &&
				pokemon.baseMoves.includes(this.battle.toID(altForme.requiredMove)) && !item.zMove) {
				return altForme.name;
			}
			if (!item.megaStone) return null;
			let megaEvolution = item.megaStone[species.name];
			if (megaEvolution && this.dex.species.get(megaEvolution).gen >= 9) return megaEvolution;
			megaEvolution = item.megaStone[species.baseSpecies];
			return megaEvolution && megaEvolution !== species.name ? megaEvolution : null;
		},
		runMegaEvo(pokemon: Pokemon) {
			const speciesid = pokemon.canMegaEvo || pokemon.canUltraBurst;
			if (!speciesid) return false;
			pokemon.formeChange(speciesid, pokemon.getItem(), true);
			const wasMega = pokemon.canMegaEvo;
			for (const ally of pokemon.side.pokemon) {
				if (wasMega) {
					ally.canMegaEvo = false;
				} else {
					ally.canUltraBurst = null;
				}
			}
			this.battle.runEvent('AfterMega', pokemon);
			return true;
		},
		// Any assigned Tera type terastallizes (Stellar included); with no Tera type the Pokemon Dynamaxes.
		canTerastallize(pokemon: Pokemon) {
			if (pokemon.getItem().zMove || pokemon.canMegaEvo || pokemon.canUltraBurst) return null;
			if (!pokemon.set.teraType) return null;
			return pokemon.teraType;
		},

		runMove(
			this: BattleActions,
			moveOrMoveName: Move | string,
			pokemon: Pokemon,
			targetLoc: number,
			options?: {
				sourceEffect?: Effect | null,
				zMove?: string,
				externalMove?: boolean,
				maxMove?: string,
				originalTarget?: Pokemon,
			}
		) {
			let baseMove = this.dex.getActiveMove(moveOrMoveName);
			const isGmax = pokemon.species.forme === 'Gmax' || pokemon.baseSpecies.forme === 'Gmax' || pokemon.gigantamax;
			const canGmax = pokemon.species.canGigantamax || (pokemon.species.changesFrom ? this.dex.species.get(pokemon.species.changesFrom).canGigantamax : null);
			if (isGmax && canGmax && baseMove.category !== 'Status') {
				const gmaxMove = this.dex.moves.get(canGmax);
				if (gmaxMove.exists && baseMove.id === gmaxMove.id) {
					let baseMoveSlot = (pokemon as any)._gmaxBaseMoveSlot;
					if (!baseMoveSlot) {
						baseMoveSlot = pokemon.moveSlots.find(slot => {
							const slotMove = this.dex.moves.get(slot.id);
							return slotMove.category !== 'Status' && slotMove.type === gmaxMove.type;
						});
					}
					if (baseMoveSlot) {
						const originalMove = this.dex.moves.get(baseMoveSlot.id);
						moveOrMoveName = originalMove.id;
						if (!options) options = {};
						options.maxMove = gmaxMove.id;
					}
					delete (pokemon as any)._gmaxBaseMoveSlot;
				}
			}
			return Object.getPrototypeOf(this).runMove.call(this, moveOrMoveName, pokemon, targetLoc, options);
		},

		getActiveMaxMove(this: BattleActions, move: Move, pokemon: Pokemon) {
			if (typeof move === 'string') move = this.dex.getActiveMove(move);
			if (move.name === 'Struggle') return this.dex.getActiveMove(move);
			let maxMove = this.dex.getActiveMove(this.MAX_MOVES[move.category === 'Status' ? move.category : move.type]);
			if (move.category !== 'Status') {
				const isGmax = pokemon.species.forme === 'Gmax' || pokemon.baseSpecies.forme === 'Gmax';
				const canGmax = pokemon.species.canGigantamax || (pokemon.species.changesFrom ? this.dex.species.get(pokemon.species.changesFrom).canGigantamax : null);
				if ((pokemon.gigantamax || isGmax) && canGmax) {
					const gMaxMove = this.dex.getActiveMove(canGmax);
					if (gMaxMove.exists && gMaxMove.type === move.type) maxMove = gMaxMove;
				}
				if (!move.maxMove?.basePower) {
					maxMove.basePower = move.basePower || 100;
				} else if (!['gmaxdrumsolo', 'gmaxfireball', 'gmaxhydrosnipe'].includes(maxMove.id)) {
					maxMove.basePower = move.maxMove.basePower;
				}
				maxMove.category = move.category;
			}
			maxMove.baseMove = move.id;
			maxMove.priority = move.priority;
			maxMove.isZOrMaxPowered = true;
			return maxMove;
		},

		modifyDamage(
			baseDamage: number, pokemon: Pokemon, target: Pokemon, move: ActiveMove, suppressMessages = false
		) {
			let damage = Object.getPrototypeOf(this).modifyDamage.call(this, baseDamage, pokemon, target, move, suppressMessages);
			if (move.multihitType === 'parentalbond' && move.hit > 1) {
				damage = this.battle.modify(damage, 2);
			}
			return damage;
		},

		getDamage(this: BattleActions, source: Pokemon, target: Pokemon, move: string | number | ActiveMove, suppressMessages = false) {
			if (typeof move !== 'string' && typeof move !== 'number') {
				if (move.id === 'psywave') {
					const minDamage = source.level;
					const maxDamage = Math.floor(source.level * 1.5);
					return this.battle.random(minDamage, maxDamage + 1);
				}
				if (move.category !== 'Status' && !move.ohko && move.willCrit === undefined) {
					let critChance = Math.floor(source.species.baseStats.spe / 2);
					critChance = this.battle.clampIntRange(critChance * 2, 1, 255);
					if (source.volatiles['focusenergy']) {
						critChance = this.battle.clampIntRange(critChance * 2, 1, 255);
					}
					const critRatio = move.critRatio || 1;
					if (critRatio === 1) {
						critChance = Math.floor(critChance / 2);
					} else if (critRatio >= 2) {
						critChance = this.battle.clampIntRange(critChance * 4, 1, 255);
					}
					move.willCrit = critChance > 0 ? this.battle.randomChance(critChance, 256) : false;
				}
			}

			const allowMaxPower = typeof move === 'object' && !!move.isMax && !source.volatiles['dynamax'] &&
				!this.dex.moves.get(move.baseMove).isMax;
			if (allowMaxPower) source.volatiles['dynamax'] = { id: 'dynamax' } as EffectState;
			const damage = Object.getPrototypeOf(this).getDamage.call(this, source, target, move, suppressMessages);
			if (allowMaxPower) delete source.volatiles['dynamax'];
			return damage;
		},

		// Seismic Toss/Night Shade/SonicBoom/Counter/Bide hit immunities
		tryMoveHit(this: BattleActions, target: Pokemon, pokemon: Pokemon, move: ActiveMove) {
			// Make these moves hit normally immune types
			if (['seismictoss', 'nightshade'].includes(move.id)) {
				// Hits Ghost types
				move.type = '???';
			}
			if (move.id === 'sonicboom') {
				// Hits Psychic types
				move.type = '???';
			}
			if (['counter', 'bide'].includes(move.id)) {
				// Hit normally immune types
				move.type = '???';
			}

			return Object.getPrototypeOf(this).tryMoveHit.call(this, target, pokemon, move);
		},
	},
};
