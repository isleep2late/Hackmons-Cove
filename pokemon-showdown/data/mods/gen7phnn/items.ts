export const Items: import('../../../sim/dex-items').ModdedItemDataTable = {
	souldew: {
		inherit: true,
		onModifySpAPriority: 1,
		onModifySpA(spa, pokemon) {
			if (pokemon.baseSpecies.num === 380 || pokemon.baseSpecies.num === 381) {
				return this.chainModify(1.5);
			}
		},
		onModifySpDPriority: 1,
		onModifySpD(spd, pokemon) {
			if (pokemon.baseSpecies.num === 380 || pokemon.baseSpecies.num === 381) {
				return this.chainModify(1.5);
			}
		},
		desc: "If held by a Latias or Latios, its Sp. Atk and Sp. Def are 1.5x.",
	},
};
