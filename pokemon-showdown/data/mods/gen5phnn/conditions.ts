export const Conditions: import('../../../sim/dex-conditions').ModdedConditionDataTable = {
	arceus: {
		inherit: true,
		onType(types, pokemon) {
			if (pokemon.transformed) return types;
			return [pokemon.getItem().onPlate || 'Normal'];
		},
	},
	par: {
		inherit: true,
		onModifySpe(spe, pokemon) {
			spe = this.finalModify(spe);
			if (!pokemon.hasAbility('quickfeet')) {
				spe = Math.floor(spe * 25 / 100);
			}
			return spe;
		},
		onBeforeMove(pokemon) {
			if (!pokemon.hasAbility('magicguard') && this.randomChance(1, 4)) {
				this.add('cant', pokemon, 'par');
				return false;
			}
		},
	},
};
