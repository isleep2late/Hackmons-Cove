const SW97_TM_HM_MOVES = new Set([
	'sketch', 'hiddenpower', 'snore', 'flail', 'conversion2', 'cottonspore', 'reversal', 'spite', 'powdersnow',
	'machpunch', 'scaryface', 'sweetkiss', 'bellydrum', 'sludgebomb', 'mudslap', 'octazooka', 'zapcannon', 'destinybond',
	'bonelock', 'lockon', 'outrage', 'gigadrain', 'charm', 'falseswipe', 'milkdrink', 'spark', 'steelwing', 'sleeptalk',
	'bellchime', 'present', 'painsplit', 'sacredfire', 'dynamicpunch', 'megaphone', 'dragonbreath', 'encore', 'rockhead',
	'crosscutter', 'twister', 'triplekick', 'thief', 'spiderweb', 'nightmare', 'flamewheel', 'naildown', 'protect',
	'spikes', 'perishsong', 'endure', 'magnitude', 'uproot', 'windride', 'watersport', 'strongarm', 'brightmoss',
	'whirlpool', 'bounce',
]);

export const Rulesets: import('../../../sim/dex-formats').ModdedFormatDataTable = {
	standardag: {
		effectType: 'ValidatorRule',
		name: 'Standard AG',
		ruleset: [
			'Obtainable', 'Desync Clause Mod', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause', 'SW97 PP Up Legality',
		],
	},
	standard: {
		effectType: 'ValidatorRule',
		name: 'Standard',
		ruleset: [
			'Standard AG',
			'Sleep Clause Mod', 'Freeze Clause Mod', 'Species Clause', 'Nickname Clause', 'OHKO Clause', 'Evasion Moves Clause', 'TM Clause',
		],
		banlist: ['Dig', 'Fly'],
	},
	tmclause: {
		effectType: 'ValidatorRule',
		name: 'TM Clause',
		desc: "Bans moves a Pok&eacute;mon could only learn from one of SW'97's TMs or HMs at its level.",
		banlist: ['Smeargle'],
		onValidateSet(set) {
			const species = this.dex.species.get(set.species || set.name);
			const learnsets = this.dex.species.getFullLearnset(species.id);
			const level = set.level || 100;
			const learnable = (source: string) => source !== '2M' &&
				(source.charAt(1) !== 'L' || parseInt(source.slice(2)) <= level);
			const problems: string[] = [];
			for (const name of set.moves || []) {
				const move = this.dex.moves.get(name);
				if (!SW97_TM_HM_MOVES.has(move.id)) continue;
				if (learnsets.some(entry => entry.learnset[move.id]?.some(learnable))) continue;
				problems.push(`${set.species} can't learn ${move.name} without the use of a TM in SW'97.`);
			}
			return problems;
		},
	},
};
