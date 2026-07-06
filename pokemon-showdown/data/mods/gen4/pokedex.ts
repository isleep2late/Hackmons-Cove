export const Pokedex: import('../../../sim/dex-species').ModdedSpeciesDataTable = {
	arceus: {
		inherit: true,
		otherFormes: ["Arceus-Bug", "Arceus-Dark", "Arceus-Dragon", "Arceus-Electric", "Arceus-Fairy", "Arceus-Fighting", "Arceus-Fire", "Arceus-Flying", "Arceus-Ghost", "Arceus-Grass", "Arceus-Ground", "Arceus-Ice", "Arceus-Poison", "Arceus-Psychic", "Arceus-Rock", "Arceus-Steel", "Arceus-Water", "Arceus-Question"],
		formeOrder: ["Arceus", "Arceus-Fighting", "Arceus-Flying", "Arceus-Poison", "Arceus-Ground", "Arceus-Rock", "Arceus-Bug", "Arceus-Ghost", "Arceus-Steel", "Arceus-Fire", "Arceus-Water", "Arceus-Grass", "Arceus-Electric", "Arceus-Psychic", "Arceus-Ice", "Arceus-Dragon", "Arceus-Dark", "Arceus-Fairy", "Arceus-Question"],
	},
	arceusquestion: {
		num: 493,
		name: "Arceus-Question",
		baseSpecies: "Arceus",
		forme: "Question",
		types: ["???"],
		gender: "N",
		baseStats: {hp: 120, atk: 120, def: 120, spa: 120, spd: 120, spe: 120},
		abilities: {0: "Multitype"},
		heightm: 3.2,
		weightkg: 320,
		color: "White",
		eggGroups: ["Undiscovered"],
		requiredItems: ["Question Mark Plate"],
		changesFrom: "Arceus",
	},
	milotic: {
		inherit: true,
		evoType: 'levelExtra',
		evoCondition: 'with high Beauty',
	},
	rotomheat: {
		inherit: true,
		types: ["Electric", "Ghost"],
	},
	rotomwash: {
		inherit: true,
		types: ["Electric", "Ghost"],
	},
	rotomfrost: {
		inherit: true,
		types: ["Electric", "Ghost"],
	},
	rotomfan: {
		inherit: true,
		types: ["Electric", "Ghost"],
	},
	rotommow: {
		inherit: true,
		types: ["Electric", "Ghost"],
	},
};
