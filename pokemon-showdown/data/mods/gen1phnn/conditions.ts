/**
 * Japanese Gen 1 invulnerability rule (Dig / Fly). Only Transform and Swift-vs-
 * Substitute bypass invulnerability; the international auto-hit-through-Sub for
 * Swift does not apply here. Paired with the Substitute onAccuracy override in
 * moves.ts, this reproduces the JP Gen 1 Swift / Dig / Fly interaction.
 */

export const Conditions: import('../../../sim/dex-conditions').ModdedConditionDataTable = {
	invulnerability: {
		// Dig/Fly
		name: 'invulnerability',
		onInvulnerability(target, source, move) {
			if (target === source) return true;
			if ((move.id === 'swift' && target.volatiles['substitute']) || move.id === 'transform') return true;
			this.add('-message', 'The foe ' + target.name + ' can\'t be hit while invulnerable!');
			return false;
		},
	},
};
