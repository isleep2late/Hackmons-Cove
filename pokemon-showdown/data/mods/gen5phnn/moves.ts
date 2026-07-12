export const Moves: import('../../../sim/dex-moves').ModdedMoveDataTable = {
recover: {
		inherit: true,
		pp: 20,
	},
	seismictoss: {
		inherit: true,
		damageCallback(pokemon) {
			return Math.min(pokemon.level, 100);
		},
	},
	nightshade: {
		inherit: true,
		damageCallback(pokemon) {
			return Math.min(pokemon.level, 100);
		},
	},
}
