// Shadow moves ported into Gen 3 for [Gen 3] Any Ability.
// Physical/special split is preserved by data/mods/gen3phnn/scripts.ts init(),
// which exempts Shadow-typed moves from Gen 3's type-based recategorization.
const PHNN_SHADOW_MOVE_IDS = ['shadowrush', 'shadowblast', 'shadowblitz', 'shadowbreak', 'shadowend', 'shadowbolt', 'shadowchill', 'shadowfire', 'shadowstorm', 'shadowwave', 'shadowrave', 'shadowdown', 'shadowmist', 'shadowpanic', 'shadowhold', 'shadowhalf', 'shadowshed', 'shadowsky'];
function phnnIsShadowMon(target: any): boolean {
	if (!target) return false;
	// [Gen 3] Any Ability balance ONLY: a Wonder Guard Pokemon is never treated as "shadow",
	// so Shadow moves are always super effective against it and hit through Wonder Guard.
	// This helper is local to the gen3phnn mod, so Custom Disguises / No Nerfs are unaffected.
	if (target.hasAbility('wonderguard')) return false;
	if (target.hasType('Shadow')) return true;
	return target.moveSlots.some((s: any) => PHNN_SHADOW_MOVE_IDS.includes(s.id));
}
export const Moves: import('../../../sim/dex-moves').ModdedMoveDataTable = {
	shadowrush: {
		num: 0,
		accuracy: 100,
		basePower: 90,
		category: "Physical",
		name: "Shadow Rush",
		shortDesc: "Has 1/16 recoil.",
		desc: "Has 1/16 recoil damage. Super effective against non-Shadow Pokemon; resisted by Shadow Pokemon.",
		pp: 5,
		priority: 0,
		flags: {contact: 1, protect: 1},
		recoil: [1, 16],
		secondary: null,
		target: "normal",
		type: "Shadow",
		onEffectiveness(typeMod, target, type) {
			if (!target || type !== target.getTypes()[0]) return typeMod;
			return phnnIsShadowMon(target) ? -1 : 1;
		},
	},
	shadowblast: {
		num: 0,
		accuracy: 100,
		basePower: 80,
		category: "Physical",
		name: "Shadow Blast",
		shortDesc: "No additional effect.",
		desc: "No additional effect. Super effective against non-Shadow Pokemon; resisted by Shadow Pokemon.",
		pp: 5,
		priority: 0,
		flags: {protect: 1},
		secondary: null,
		target: "normal",
		type: "Shadow",
		onEffectiveness(typeMod, target, type) {
			if (!target || type !== target.getTypes()[0]) return typeMod;
			return phnnIsShadowMon(target) ? -1 : 1;
		},
	},
	shadowblitz: {
		num: 0,
		accuracy: 100,
		basePower: 40,
		category: "Physical",
		name: "Shadow Blitz",
		shortDesc: "No additional effect.",
		desc: "No additional effect. Super effective against non-Shadow Pokemon; resisted by Shadow Pokemon.",
		pp: 10,
		priority: 0,
		flags: {contact: 1, protect: 1},
		secondary: null,
		target: "normal",
		type: "Shadow",
		onEffectiveness(typeMod, target, type) {
			if (!target || type !== target.getTypes()[0]) return typeMod;
			return phnnIsShadowMon(target) ? -1 : 1;
		},
	},
	shadowbreak: {
		num: 0,
		accuracy: 100,
		basePower: 75,
		category: "Physical",
		name: "Shadow Break",
		shortDesc: "No additional effect.",
		desc: "No additional effect. Super effective against non-Shadow Pokemon; resisted by Shadow Pokemon.",
		pp: 5,
		priority: 0,
		flags: {contact: 1, protect: 1},
		secondary: null,
		target: "normal",
		type: "Shadow",
		onEffectiveness(typeMod, target, type) {
			if (!target || type !== target.getTypes()[0]) return typeMod;
			return phnnIsShadowMon(target) ? -1 : 1;
		},
	},
	shadowend: {
		num: 0,
		accuracy: 60,
		basePower: 120,
		category: "Physical",
		name: "Shadow End",
		shortDesc: "Has 33% recoil.",
		desc: "Has 33% recoil damage. Super effective against non-Shadow Pokemon; resisted by Shadow Pokemon.",
		pp: 5,
		priority: 0,
		flags: {contact: 1, protect: 1},
		recoil: [33, 100],
		secondary: null,
		target: "normal",
		type: "Shadow",
		onEffectiveness(typeMod, target, type) {
			if (!target || type !== target.getTypes()[0]) return typeMod;
			return phnnIsShadowMon(target) ? -1 : 1;
		},
	},
	shadowbolt: {
		num: 0,
		accuracy: 100,
		basePower: 75,
		category: "Special",
		name: "Shadow Bolt",
		shortDesc: "10% chance to paralyze the target.",
		desc: "Has a 10% chance to paralyze the target. Super effective against non-Shadow Pokemon; resisted by Shadow Pokemon.",
		pp: 5,
		priority: 0,
		flags: {protect: 1},
		secondary: {chance: 10, status: 'par'},
		target: "normal",
		type: "Shadow",
		onEffectiveness(typeMod, target, type) {
			if (!target || type !== target.getTypes()[0]) return typeMod;
			return phnnIsShadowMon(target) ? -1 : 1;
		},
	},
	shadowchill: {
		num: 0,
		accuracy: 100,
		basePower: 75,
		category: "Special",
		name: "Shadow Chill",
		shortDesc: "10% chance to freeze the target.",
		desc: "Has a 10% chance to freeze the target. Super effective against non-Shadow Pokemon; resisted by Shadow Pokemon.",
		pp: 5,
		priority: 0,
		flags: {protect: 1},
		secondary: {chance: 10, status: 'frz'},
		target: "normal",
		type: "Shadow",
		onEffectiveness(typeMod, target, type) {
			if (!target || type !== target.getTypes()[0]) return typeMod;
			return phnnIsShadowMon(target) ? -1 : 1;
		},
	},
	shadowfire: {
		num: 0,
		accuracy: 100,
		basePower: 75,
		category: "Special",
		name: "Shadow Fire",
		shortDesc: "10% chance to burn the target.",
		desc: "Has a 10% chance to burn the target. Super effective against non-Shadow Pokemon; resisted by Shadow Pokemon.",
		pp: 5,
		priority: 0,
		flags: {protect: 1},
		secondary: {chance: 10, status: 'brn'},
		target: "normal",
		type: "Shadow",
		onEffectiveness(typeMod, target, type) {
			if (!target || type !== target.getTypes()[0]) return typeMod;
			return phnnIsShadowMon(target) ? -1 : 1;
		},
	},
	shadowstorm: {
		num: 0,
		accuracy: 100,
		basePower: 95,
		category: "Special",
		name: "Shadow Storm",
		shortDesc: "No additional effect.",
		desc: "Hits all adjacent foes. Super effective against non-Shadow Pokemon; resisted by Shadow Pokemon.",
		pp: 5,
		priority: 0,
		flags: {protect: 1},
		secondary: null,
		target: "allAdjacentFoes",
		type: "Shadow",
		onEffectiveness(typeMod, target, type) {
			if (!target || type !== target.getTypes()[0]) return typeMod;
			return phnnIsShadowMon(target) ? -1 : 1;
		},
	},
	shadowwave: {
		num: 0,
		accuracy: 100,
		basePower: 50,
		category: "Special",
		name: "Shadow Wave",
		shortDesc: "No additional effect.",
		desc: "Hits all adjacent foes. Super effective against non-Shadow Pokemon; resisted by Shadow Pokemon.",
		pp: 10,
		priority: 0,
		flags: {protect: 1},
		secondary: null,
		target: "allAdjacentFoes",
		type: "Shadow",
		onEffectiveness(typeMod, target, type) {
			if (!target || type !== target.getTypes()[0]) return typeMod;
			return phnnIsShadowMon(target) ? -1 : 1;
		},
	},
	shadowrave: {
		num: 0,
		accuracy: 100,
		basePower: 70,
		category: "Special",
		name: "Shadow Rave",
		shortDesc: "No additional effect.",
		desc: "Hits all adjacent foes. Super effective against non-Shadow Pokemon; resisted by Shadow Pokemon.",
		pp: 5,
		priority: 0,
		flags: {protect: 1},
		secondary: null,
		target: "allAdjacentFoes",
		type: "Shadow",
		onEffectiveness(typeMod, target, type) {
			if (!target || type !== target.getTypes()[0]) return typeMod;
			return phnnIsShadowMon(target) ? -1 : 1;
		},
	},
	shadowdown: {
		num: 0,
		accuracy: 100,
		basePower: 0,
		category: "Status",
		name: "Shadow Down",
		shortDesc: "Lowers the foe(s) Defense by 2.",
		desc: "Lowers the Defense of all adjacent foes by 2 stages.",
		pp: 10,
		priority: 0,
		flags: {protect: 1},
		boosts: {def: -2},
		secondary: null,
		target: "allAdjacentFoes",
		type: "Shadow",
	},
	shadowmist: {
		num: 0,
		accuracy: 100,
		basePower: 0,
		category: "Status",
		name: "Shadow Mist",
		shortDesc: "Lowers the foe(s) evasiveness by 2.",
		desc: "Lowers the evasiveness of all adjacent foes by 2 stages.",
		pp: 10,
		priority: 0,
		flags: {protect: 1},
		boosts: {evasion: -2},
		secondary: null,
		target: "allAdjacentFoes",
		type: "Shadow",
	},
	shadowpanic: {
		num: 0,
		accuracy: 60,
		basePower: 0,
		category: "Status",
		name: "Shadow Panic",
		shortDesc: "Confuses the foe(s).",
		desc: "Confuses all adjacent foes.",
		pp: 10,
		priority: 0,
		flags: {protect: 1},
		volatileStatus: 'confusion',
		secondary: null,
		target: "allAdjacentFoes",
		type: "Shadow",
	},
	shadowhold: {
		num: 0,
		accuracy: 80,
		basePower: 0,
		category: "Status",
		name: "Shadow Hold",
		shortDesc: "Prevents the foe(s) from switching out.",
		desc: "Prevents all adjacent foes from switching out.",
		pp: 10,
		priority: 0,
		flags: {protect: 1},
		onHit(target, source, move) {
			return target.addVolatile('trapped', source, move, 'trapper');
		},
		secondary: null,
		target: "allAdjacentFoes",
		type: "Shadow",
	},
	shadowhalf: {
		num: 0,
		accuracy: 100,
		basePower: 0,
		category: "Status",
		name: "Shadow Half",
		shortDesc: "Halves the current HP of all Pokemon on the field.",
		desc: "Deals damage to all active Pokemon equal to half of their current HP.",
		pp: 5,
		priority: 0,
		flags: {protect: 1},
		onHit(target) {
			this.damage(this.clampIntRange(Math.floor(target.hp / 2), 1), target);
		},
		secondary: null,
		target: "all",
		type: "Shadow",
	},
	shadowshed: {
		num: 0,
		accuracy: 100,
		basePower: 0,
		category: "Status",
		name: "Shadow Shed",
		shortDesc: "Removes screens and Safeguard from the target's side.",
		desc: "Removes Reflect, Light Screen, Aurora Veil, Mist, and Safeguard from the target's side of the field.",
		pp: 10,
		priority: 0,
		flags: {},
		onHitSide(side) {
			for (const condition of ['reflect', 'lightscreen', 'auroraveil', 'mist', 'safeguard']) {
				side.removeSideCondition(condition);
			}
		},
		secondary: null,
		target: "foeSide",
		type: "Shadow",
	},
	shadowsky: {
		num: 0,
		accuracy: true,
		basePower: 0,
		category: "Status",
		name: "Shadow Sky",
		shortDesc: "5 turns: chips non-Shadow mons; Shadow moves 1.5x.",
		desc: "For 5 turns, the weather becomes Shadow Sky. At the end of each turn, Pokemon that are not Shadow Pokemon lose 1/16 of their maximum HP. The power of Shadow-type moves is boosted by 50%, and Weather Ball becomes typeless with doubled power.",
		pp: 5,
		priority: 0,
		flags: {},
		weather: 'shadowsky',
		secondary: null,
		target: "all",
		type: "Shadow",
	},
};
