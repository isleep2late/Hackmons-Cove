export const Scripts: ModdedBattleScriptsData = {
	gen: 3,
	inherit: 'gen3',

	pokemon: {
		inherit: true,
		hasAbility(ability) {
			if (!ability) return false;
			if (Array.isArray(ability)) return ability.some(abil => this.hasAbility(abil));
			const abilityid = this.battle.toID(ability);
			return this.ability === abilityid;
		},
	},
};
