export const Items: import('../../../sim/dex-items').ModdedItemDataTable = {
	// Classic Items Return

	// Soul Dew - Pre-Gen 7 mechanics (50% boost to Latios/Latias SpAtk and SpDef)
	souldew: {
		inherit: true,
		onBasePower: undefined, // no inherit
		onModifySpAPriority: 1,
		onModifySpA(spa, pokemon) {
			if (pokemon.baseSpecies.num === 380 || pokemon.baseSpecies.num === 381) {
				return this.chainModify(1.5);
			}
		},
		onModifySpDPriority: 2,
		onModifySpD(spd, pokemon) {
			if (pokemon.baseSpecies.num === 380 || pokemon.baseSpecies.num === 381) {
				return this.chainModify(1.5);
			}
		},
		shortDesc: "If holder is a Latias or Latios, its Sp. Atk and Sp. Def are 1.5x.",
		desc: "If held by a Latias or Latios, this item raises the holder's Special Attack and Special Defense by 50% each (Pre-Gen 7 mechanics).",
	},
	berserkgene: {
		inherit: true,
		isNonstandard: null,
		shortDesc: "On switch-in, raises holder's Attack by 2 and confuses it. Single use.",
		desc: "On switch-in, raises the holder's Attack by 2 stages and confuses it. This item is consumed on use.",
	},
	pinkbow: {
		inherit: true,
		isNonstandard: null,
		shortDesc: "Holder's Normal-type moves have 1.1x power.",
		desc: "The power of the holder's Normal-type moves is multiplied by 1.1.",
	},
	polkadotbow: {
		inherit: true,
		isNonstandard: null,
		shortDesc: "Holder's Normal-type moves have 1.1x power.",
		desc: "The power of the holder's Normal-type moves is multiplied by 1.1.",
	},
};
