export const Conditions: import('../../../sim/dex-conditions').ModdedConditionDataTable = {
	arceus: {
		inherit: true,
		onType(types, pokemon) {
			if (pokemon.transformed) return types;
			return [pokemon.getItem().onPlate || 'Normal'];
		},
	},
};
