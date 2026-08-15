export const Abilities: import('../../../sim/dex-abilities').ModdedAbilityDataTable = {
	galewings: {
		inherit: true,
		onModifyPriority(priority, pokemon, target, move) {
			if (move && move.type === 'Flying') return priority + 1;
		},
		desc: "Flying-type moves gain +1 priority regardless of HP.",
	},
	prankster: {
		inherit: true,
		onModifyPriority(priority, pokemon, target, move) {
			if (move?.category === 'Status') {
				return priority + 1;
			}
		},
		desc: "Status moves gain +1 priority. Dark-types are not immune.",
	},
};
