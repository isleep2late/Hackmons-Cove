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
	actions: {
		inherit: true,
		getDamage(source, target, move, suppressMessages) {
			const activeMove = (typeof move === 'object' ? move : null) as ActiveMove | null;
			if (activeMove && activeMove.category !== 'Status' && activeMove.willCrit === undefined &&
				target && source.species?.baseStats) {
				const highCrit = ['karatechop', 'razorleaf', 'crabhammer', 'slash'];
				let counter = 6;
				if (source.volatiles['focusenergy']) counter -= 3;
				if (highCrit.includes(activeMove.id)) counter -= 2;
				let critChance = source.species.baseStats.spe * 4;
				for (let i = 1; i < counter; i++) critChance = Math.floor(critChance / 2);
				critChance = Math.min(critChance, 255);
				activeMove.willCrit = critChance > 0 ? this.battle.randomChance(critChance, 256) : false;
			}
			return Object.getPrototypeOf(this).getDamage.call(this, source, target, move, suppressMessages);
		},
	},
};
