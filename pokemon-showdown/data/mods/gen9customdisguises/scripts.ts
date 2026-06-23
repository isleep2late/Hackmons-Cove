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
	},

	pokemon: {
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
		canTerastallize(pokemon: Pokemon) {
			if (pokemon.getItem().zMove || pokemon.canMegaEvo || pokemon.canUltraBurst) return null;
			if (!pokemon.set.teraType) return null;
			return pokemon.teraType;
		},
	},
};
