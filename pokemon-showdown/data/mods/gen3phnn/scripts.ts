export const Scripts: ModdedBattleScriptsData = {
	inherit: 'gen3',
	gen: 3,
	init() {
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
