export const Abilities: import('../../../sim/dex-abilities').ModdedAbilityDataTable = {	
	magicguard: {
		inherit: true,
		onDamage(damage, target, source, effect) {
			if (effect.effectType !== 'Move') {
				if (effect.effectType === 'Ability') this.add('-activate', source, 'ability: ' + effect.name);
				return false;
			}
		},
		onSetStatus(status, target, source, effect) {
			if (status.id === 'par') return false;
		},
		onTryAddVolatile(status, target) {
			if (status.id === 'toxicspikes') return null;
		},
		shortDesc: "Only takes damage from attacks; immune to full paralysis and Toxic Spikes.",
		desc: "This Pokemon can only be damaged by direct attacks. It cannot be fully paralyzed by paralysis, and it cannot be poisoned by Toxic Spikes. Burn, poison, and other indirect damage are also prevented.",
	},
	wonderguard: {
		inherit: true,
		onTryHit(target, source, move) {
			if (move.id === 'firefang') {
				this.hint("In Gen 5NN, Fire Fang is always able to hit through Wonder Guard.", true, target.side);
				return;
			}
			if (target === source || move.category === 'Status' || move.type === '???') return;
			this.debug('Wonder Guard immunity: ' + move.id);
			if (target.runEffectiveness(move) <= 0 || !target.runImmunity(move)) {
				this.add('-immune', target, '[from] ability: Wonder Guard');
				return null;
			}
		},
	},
}
