const SW_EVIOLITE: string[] = ['ballerine', 'ditto', 'farfetchd', 'farfetchdsw', 'golppy', 'minicorn', 'para', 'pinsir', 'pinsirmega', 'pinsirsw', 'slowbro', 'slowbromega', 'slowbrosw', 'tangel'];

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
	shadowsynergystone: {
		name: "Shadow Synergy Stone",
		spritenum: 345,
		megaStone: {"Mewtwo": "Mewtwo-Shadow-Mega-X"},
		itemUser: ["Mewtwo", "Mewtwo-Shadow"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "Mega Evolves Mewtwo or Shadow Mewtwo into Shadow Mega Mewtwo X.",
	},
	shadowplate: {
		name: "Shadow Plate",
		spritenum: 8,
		onPlate: 'Shadow',
		onBasePowerPriority: 15,
		onBasePower(basePower, user, target, move) {
			if (move && move.type === 'Shadow') {
				return this.chainModify([4915, 4096]);
			}
		},
		onTakeItem(item, pokemon, source) {
			if ((source && source.baseSpecies.num === 493) || pokemon.baseSpecies.num === 493) {
				return false;
			}
			return true;
		},
		forcedForme: "Arceus-Shadow",
		num: 0,
		gen: 9,
		shortDesc: "Holder's Shadow-type moves have 1.2x power; turns Arceus into its Shadow forme.",
	},
	questionmarkplate: {
		name: "Question Mark Plate",
		spritenum: 8,
		onPlate: '???',
		onBasePowerPriority: 15,
		onBasePower(basePower, user, target, move) {
			if (move && move.type === '???') {
				return this.chainModify([4915, 4096]);
			}
		},
		onTakeItem(item, pokemon, source) {
			if ((source && source.baseSpecies.num === 493) || pokemon.baseSpecies.num === 493) {
				return false;
			}
			return true;
		},
		forcedForme: "Arceus-Question",
		num: 0,
		gen: 9,
		shortDesc: "Turns Arceus into its ??? (typeless) forme; Judgment becomes typeless.",
	},

	eviolite: {
		inherit: true,
		onModifyDef(def, pokemon) {
			if (pokemon.baseSpecies.nfe || SW_EVIOLITE.includes(pokemon.baseSpecies.id)) {
				return this.chainModify(1.5);
			}
		},
		onModifySpD(spd, pokemon) {
			if (pokemon.baseSpecies.nfe || SW_EVIOLITE.includes(pokemon.baseSpecies.id)) {
				return this.chainModify(1.5);
			}
		},
	},

	metalpowder: {
		inherit: true,
		isNonstandard: null,
		onModifyDef(def, pokemon) {
			if (pokemon.baseSpecies.id === 'ditto' || pokemon.species.id === 'ditto') {
				return this.chainModify(2);
			}
		},
		onModifySpDPriority: 2,
		onModifySpD(spd, pokemon) {
			if (pokemon.baseSpecies.id === 'ditto' || pokemon.species.id === 'ditto') {
				return this.chainModify(1.5);
			}
		},
		shortDesc: "If holder is a Ditto: 2x Defense, 1.5x Sp. Def, even while transformed.",
		desc: "If held by a Ditto, its Defense is doubled and its Special Defense is raised by 50%. This works even while the holder is transformed, and for Pokemon that have transformed into a Ditto.",
	},
};
