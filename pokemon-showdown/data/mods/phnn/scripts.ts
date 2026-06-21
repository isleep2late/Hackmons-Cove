export const Scripts: ModdedBattleScriptsData = {
	gen: 9,
	inherit: 'gen9',

	init() {

		// Enable all battle mechanics (Mega, Z-moves, Dynamax, etc.)
		for (const id in this.data.Items) {
			const item = this.data.Items[id];
			if (item.megaStone) {
				item.isNonstandard = null;
			}
			if (item.zMove || item.zMoveType) {
				item.isNonstandard = null;
			}
		}

	},

	pokemon: {

		// Priority: Mega/Ultra Burst/Z move -> Terastalization
		// (any assigned Tera type) > Dynamax (no Tera assigned).
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
	},

	side: {
		canDynamaxNow(this: Side) {
			if (this.battle.gameType === 'multi' && this.battle.turn % 2 !== [1, 1, 0, 0][this.n]) return false;
			return !this.dynamaxUsed;
		},
	},

	actions: {
		// Any assigned Tera type terastallizes (Stellar included); with no Tera type the Pokemon Dynamaxes.
		canTerastallize(pokemon: Pokemon) {
			if (pokemon.getItem().zMove || pokemon.canMegaEvo || pokemon.canUltraBurst) return null;
			if (!pokemon.set.teraType) return null;
			return pokemon.teraType;
		},

		modifyDamage(
			baseDamage: number, pokemon: Pokemon, target: Pokemon, move: ActiveMove, suppressMessages = false
		) {
			if (move.multihitType === 'parentalbond' && move.hit > 1) {
				this.battle.debug(`Parental Bond modifier: 0.5`);
				baseDamage = this.battle.modify(baseDamage, 0.5);
			}
		},

		// Psywave damage calculation (Gen 1)
		getDamage(this: BattleActions, source: Pokemon, target: Pokemon, move: string | number | ActiveMove, suppressMessages = false) {
			if (typeof move !== 'string' && typeof move !== 'number' && move.id === 'psywave') {
				const minDamage = source.level;
				const maxDamage = Math.floor(source.level * 1.5);
				return this.battle.random(minDamage, maxDamage + 1);
			}

			return Object.getPrototypeOf(this).getDamage.call(this, source, target, move, suppressMessages);
		},

		tryMoveHit(this: BattleActions, target: Pokemon, pokemon: Pokemon, move: ActiveMove) {
			// Make these moves hit normally immune types
			if (['seismictoss', 'nightshade', 'sonicboom', 'counter', 'bide'
			].includes(move.id)) {
				move.type = '???';
			}

			return Object.getPrototypeOf(this).tryMoveHit.call(this, target, pokemon, move);
		},
	},
};
