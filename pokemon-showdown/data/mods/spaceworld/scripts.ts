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
	},
};
