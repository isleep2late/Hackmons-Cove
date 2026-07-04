export const Scripts: ModdedBattleScriptsData = {
	inherit: 'gen3',
	gen: 3,
	init() {
		// Gen 3 assigns physical/special by TYPE (there was no per-move split until Gen 4).
		// Replicate that recategorization here, but EXEMPT Shadow-typed moves so the
		// phnn split survives (Shadow isn't a "special type", so the vanilla loop would
		// otherwise force every Shadow move — including Shadow Bolt/Fire/Storm — to Physical).
		const specialTypes = ['Fire', 'Water', 'Grass', 'Ice', 'Electric', 'Dark', 'Psychic', 'Dragon'];
		for (const i in this.data.Moves) {
			if (!this.data.Moves[i]) continue;
			if (this.data.Moves[i].category === 'Status') continue;
			if (this.data.Moves[i].type === 'Shadow') continue;
			const newCategory = specialTypes.includes(this.data.Moves[i].type) ? 'Special' : 'Physical';
			if (newCategory !== this.data.Moves[i].category) {
				this.modData('Moves', i).category = newCategory;
			}
		}
	},
};
