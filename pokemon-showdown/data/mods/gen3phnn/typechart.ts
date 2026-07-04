export const TypeChart: import('../../../sim/dex-data').ModdedTypeDataTable = {
	// Register the Shadow type for Gen 3. Defensively neutral to everything (all 0);
	// the "super effective vs non-Shadow / resisted by Shadow mons" behavior comes
	// from each Shadow move's onEffectiveness (see moves.ts), exactly as in the phnn mod.
	shadow: {
		isNonstandard: 'Custom',
		damageTaken: {
			Bug: 0,
			Dark: 0,
			Dragon: 0,
			Electric: 0,
			Fighting: 0,
			Fire: 0,
			Flying: 0,
			Ghost: 0,
			Grass: 0,
			Ground: 0,
			Ice: 0,
			Normal: 0,
			Poison: 0,
			Psychic: 0,
			Rock: 0,
			Shadow: 0,
			Steel: 0,
			Water: 0,
		},
	},
};
