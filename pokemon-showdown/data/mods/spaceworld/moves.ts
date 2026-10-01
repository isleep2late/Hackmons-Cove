const SW97_NO_HIT_CHECK = ['bide', 'counter', 'sketch', 'haze'];
const SW97_STATUS_WITH_POWER = [
	'leechseed', 'metronome', 'nightmare', 'naildown', 'mudslap', 'spikes', 'sandstorm', 'painsplit', 'pursuit',
];

function sw97FlailPower(pokemon: Pokemon) {
	const product = pokemon.hp * 48;
	let dividend = product;
	let divisor = pokemon.maxhp;
	if (pokemon.maxhp >= 256) {
		dividend = (product & 0xff0000) | ((product & 0xffff) >> 2);
		divisor = (pokemon.maxhp >> 2) & 0xff;
	}
	const ratio = divisor ? Math.floor(dividend / divisor) & 0xff : 0xff;
	if (ratio <= 1) return 200;
	if (ratio <= 4) return 150;
	if (ratio <= 9) return 100;
	if (ratio <= 16) return 80;
	if (ratio <= 32) return 40;
	return 20;
}

function sw97HitsFoe(battle: Battle, pokemon: Pokemon, move: ActiveMove) {
	const target = pokemon.side.foe.active[0];
	if (!target || target.fainted) return true;
	if (target.volatiles['protect']) {
		battle.lastDamage = 0;
		battle.add('-activate', target, 'move: Protect');
		return false;
	}
	if (battle.runEvent('Invulnerability', target, pokemon, move) === false) {
		battle.lastDamage = 0;
		battle.attrLastMove('[miss]');
		battle.add('-miss', pokemon, target);
		return false;
	}
	const boosted = battle.runEvent('Accuracy', target, pokemon, move, 100);
	if (boosted === true) return true;
	const positiveBoostTable = [1, 1.5, 2, 2.5, 3, 3.5, 4];
	const negativeBoostTable = [1, 0.66, 0.5, 0.4, 0.33, 0.28, 0.25];
	let accuracy = 255;
	if (pokemon.boosts.accuracy > 0) {
		accuracy = Math.floor(accuracy * positiveBoostTable[pokemon.boosts.accuracy]);
	} else {
		accuracy = Math.floor(accuracy * negativeBoostTable[-pokemon.boosts.accuracy]);
	}
	if (target.boosts.evasion > 0) {
		accuracy = Math.floor(accuracy * negativeBoostTable[target.boosts.evasion]);
	} else if (target.boosts.evasion < 0) {
		accuracy = Math.floor(accuracy * positiveBoostTable[-target.boosts.evasion]);
	}
	accuracy = Math.max(Math.min(accuracy, 255), 1);
	const modified = battle.runEvent('ModifyAccuracy', target, pokemon, move, accuracy);
	if (modified !== true && !battle.randomChance(Math.max(modified, 0), 256)) {
		battle.lastDamage = 0;
		battle.attrLastMove('[miss]');
		battle.add('-miss', pokemon, target);
		return false;
	}
	return true;
}

export const Moves: import('../../../sim/dex-moves').ModdedMoveDataTable = {
	attract: {
		inherit: true,
		pp: 10,
	},
	conversion2: {
		inherit: true,
		shortDesc: "Changes the target's type to a random type it doesn't have.",
		desc: "Changes the target's type to a single type chosen at random from the demo's 16 types (including Bird) that the target does not already have. Fails if no new type is available.",
		pp: 15,
		target: "normal",
		accuracy: 100,
		flags: { protect: 1, bypasssub: 1, metronome: 1 },
		onHit(target, source) {
			const pool = ['Normal', 'Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bird', 'Bug', 'Ghost', 'Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon'].filter(t => !target.getTypes().includes(t));
			if (!pool.length) return false;
			const newType = this.sample(pool);
			if (!target.setType(newType)) return false;
			this.add('-start', target, 'typechange', newType, '[from] move: Conversion 2');
		},
	},
	counter: {
		inherit: true,
		shortDesc: "Deals double the battle's last damage value; counters physical-type moves.",
		desc: "Deals damage equal to twice the battle's last damage value, even if it came from a different Pokemon. That value is the damage the last attack computed, and a move that misses or hits a Protect resets it to 0, except that multi-hit, trapping and rampage moves, Triple Kick and Present keep the damage they would have dealt and Jump Kick leaves 1; draining moves halve it, Pain Split sets it to the shared HP, a confusion self-hit sets it to the self-inflicted damage, and sleep, confusion, poison and paralysis moves scale it by their same-type bonus and type matchup. Fails if the value is 0, or if the target's last used move was Counter, had 0 power in the demo's move data, or was a special-type move (Fire, Water, Grass, Electric, Psychic, Ice, Dragon, or Dark; Hidden Power counts as its actual type). Fixed-damage and OHKO moves, Return, Frustration, Magnitude, Hidden Power, and the status moves Leech Seed, Metronome, Nightmare, Nail Down, Mud-Slap, Spikes, Sandstorm, Pain Split and Pursuit all have power there; Bide has none until it is released. Hits Ghost-types, does not check accuracy, and goes through Protect, Fly and Dig.",
		priority: -1,
		accuracy: true,
		flags: { contact: 1, failmefirst: 1, noassist: 1, failcopycat: 1 },
		ignoreImmunity: true,
		damageCallback(pokemon, target) {
			const lastMove = target.lastMove;
			if (!lastMove || lastMove.id === 'counter') return false;
			const hasPower = lastMove.category === 'Status' ? SW97_STATUS_WITH_POWER.includes(lastMove.id) :
				lastMove.id !== 'bounce' && !(lastMove.id === 'bide' && target.volatiles['bide']);
			if (!hasPower) return false;
			let moveType = lastMove.type;
			if (lastMove.id === 'hiddenpower') moveType = target.hpType || 'Dark';
			const specialTypes = ['Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark'];
			if (specialTypes.includes(moveType)) return false;
			if (!this.lastDamage) return false;
			return this.clampIntRange(2 * this.lastDamage, 1, 65535);
		},
	},
	crabhammer: {
		inherit: true,
		critRatio: 3,
	},
	doubleedge: {
		inherit: true,
		basePower: 100,
		recoil: [25,100],
	},
	dynamicpunch: {
		inherit: true,
		shortDesc: "No additional effect.",
		desc: "No additional effect. Unlike the final games, the demo's Dynamic Punch has 100% accuracy and no confusion chance.",
		accuracy: 100,
		basePower: 100,
		pp: 10,
		type: "Fighting",
		secondary: null,
	},
	endure: {
		inherit: true,
		shortDesc: "User survives hits with 1 HP until the foe next acts. Never fails.",
		desc: "The user survives all hits with at least 1 HP until the end of the foe's next action, even if the user moved last this turn. Has no increased priority and never fails, even when used repeatedly.",
		priority: 0,
		stallingMove: false,
		onPrepareHit: undefined,
		onHit(pokemon) {},
		condition: {
			inherit: true,
			duration: undefined,
			onFoeAfterMoveSelf() {
				this.effectState.target.removeVolatile('endure');
			},
			onFoeAfterSwitchInSelf() {
				this.effectState.target.removeVolatile('endure');
			},
		},
	},
	flail: {
		inherit: true,
		shortDesc: "More power the less HP the user has left. Ignores type.",
		desc: "The power of this move is 20 if X is 33 or more, 40 if X is 17 to 32, 80 if X is 10 to 16, 100 if X is 5 to 9, 150 if X is 2 to 4, and 200 if X is 0 or 1, where X is the user's current HP * 48 / its maximum HP, rounded down. If the maximum HP is 256 or more, the demo divides (current HP * 48) / 4 by (maximum HP / 4) kept to its low 8 bits instead, which shifts the thresholds. The demo runs it as fixed-power damage: it gets no same-type bonus, no type effectiveness or immunity, no random variation, and it cannot be a critical hit.",
		pp: 10,
		willCrit: false,
		ignoreImmunity: true,
		noDamageVariance: true,
		basePowerCallback(pokemon) {
			return sw97FlailPower(pokemon);
		},
	},
	foresight: {
		inherit: true,
		accuracy: 100,
		pp: 10,
	},
	gust: {
		inherit: true,
		shortDesc: "No additional effect.",
		desc: "No additional effect. It cannot hit a Pokemon using Fly.",
		accuracy: 100,
		basePower: 40,
		type: "Flying",
	},
	karatechop: {
		inherit: true,
		type: "Normal",
	},
	lockon: {
		inherit: true,
		pp: 10,
	},
	lowkick: {
		inherit: true,
		accuracy: 90,
		basePower: 50,
		secondary: {"chance":30,"volatileStatus":"flinch"},
	},
	moonlight: {
		inherit: true,
		shortDesc: "Heals the user by a random 25-50% of its max HP.",
		desc: "The user restores half of its maximum HP multiplied by a random factor from 128/255 to 255/255, rounded down; if half its maximum HP is a multiple of 256, it is increased by 1 first. This is the demo's amount outside the move's time of day, since battles here have no clock. Weather has no effect.",
		pp: 10,
		onHit(pokemon) {
			let half = Math.floor(pokemon.maxhp / 2);
			if (half % 256 === 0) half++;
			return !!this.heal(Math.floor(half * this.random(128, 256) / 255));
		},
	},
	morningsun: {
		inherit: true,
		shortDesc: "Heals the user by a random 25-50% of its max HP.",
		desc: "The user restores half of its maximum HP multiplied by a random factor from 128/255 to 255/255, rounded down; if half its maximum HP is a multiple of 256, it is increased by 1 first. This is the demo's amount outside the move's time of day, since battles here have no clock. Weather has no effect.",
		pp: 10,
		onHit(pokemon) {
			let half = Math.floor(pokemon.maxhp / 2);
			if (half % 256 === 0) half++;
			return !!this.heal(Math.floor(half * this.random(128, 256) / 255));
		},
	},
	metronome: {
		inherit: true,
		onTry(source, target, move) {
			if (!sw97HitsFoe(this, source, move)) return null;
		},
	},
	mirrormove: {
		inherit: true,
		onTry(source, target, move) {
			if (!sw97HitsFoe(this, source, move)) return null;
		},
	},
	sleeptalk: {
		inherit: true,
		onTry(source, target, move) {
			if (!sw97HitsFoe(this, source, move)) return null;
			return source.status === 'slp';
		},
	},
	bide: {
		inherit: true,
		accuracy: true,
		shortDesc: "Stores energy for 2-3 turns, then deals double. Never misses.",
		desc: "The user spends two or three of its turns storing energy, and then deals damage to the current opponent equal to twice the energy stored. Energy is the damage the user takes from attacks, including hits to its substitute, plus the last damage dealt in the battle, added again on each turn it stores. A turn the user loses to sleep, freeze, flinching or a trapping move does not count, and Bide carries on afterward; full paralysis, a confusion self-hit or infatuation ends it. The release ignores accuracy, evasion, Protect, Fly, Dig and type immunity, and fails if no energy was stored. The demo keeps energy in 16 bits, so it wraps past 65535.",
		condition: {
			inherit: true,
			duration: undefined,
			durationCallback: undefined,
			onStart(pokemon) {
				this.effectState.totalDamage = 0;
				this.effectState.storing = this.random(2, 4);
				this.add('-start', pokemon, 'move: Bide');
			},
			onDamage(damage, target, source, effect) {
				if (!effect || effect.effectType !== 'Move' || !source) return;
				this.effectState.totalDamage = Math.min(this.effectState.totalDamage + damage, 0xffff);
			},
			onMoveAborted(pokemon) {
				if (['slp', 'frz'].includes(pokemon.status) || pokemon.volatiles['flinch'] ||
					pokemon.volatiles['partiallytrapped']) return;
				pokemon.removeVolatile('bide');
			},
			onBeforeMove(pokemon) {
				this.effectState.totalDamage = (this.effectState.totalDamage + this.lastDamage) & 0xffff;
				this.effectState.storing--;
				if (this.effectState.storing > 0) {
					this.add('-activate', pokemon, 'move: Bide');
					return;
				}
				this.add('-end', pokemon, 'move: Bide');
				const damage = (this.effectState.totalDamage * 2) & 0xffff;
				pokemon.removeVolatile('bide');
				const foe = pokemon.side.foe.active[0];
				if (!damage || !foe || foe.fainted) {
					this.lastDamage = 0;
					this.add('-fail', pokemon);
					return false;
				}
				const moveData = {
					id: 'bide' as ID,
					name: "Bide",
					accuracy: true,
					damage,
					category: "Physical",
					priority: 0,
					flags: { contact: 1 },
					ignoreImmunity: true,
					effectType: 'Move',
					type: 'Normal',
				} as unknown as ActiveMove;
				this.actions.tryMoveHit(foe, pokemon, moveData);
				this.lastDamage = damage;
				return false;
			},
		},
	},
	nightmare: {
		inherit: true,
		pp: 10,
		flags: { mirror: 1, metronome: 1 },
		condition: {
			inherit: true,
			onAfterSwitchInSelf(pokemon) {
				if (pokemon.status === 'slp') this.damage(pokemon.baseMaxhp / 4);
			},
		},
	},
	outrage: {
		inherit: true,
		basePower: 90,
		pp: 10,
	},
	powdersnow: {
		inherit: true,
		shortDesc: "No additional effect.",
		desc: "No additional effect.",
		pp: 10,
		secondary: null,
	},
	present: {
		inherit: true,
		shortDesc: "40, 80, or 120 power, or heals the target 1/4 max HP.",
		desc: "A random roll out of 256 picks 40 power (103 in 256), 80 power (77 in 256), 120 power (25 in 256), or, the remaining 51 in 256, no damage at all: the target instead regains 1/4 of its maximum HP, rounded down, even through a substitute and even if it is a Ghost-type.",
		basePower: 50,
		pp: 10,
		accuracy: 100,
		onModifyMove(move) {
			const roll = this.random(256);
			if (roll <= 102) {
				move.basePower = 40;
			} else if (roll <= 179) {
				move.basePower = 80;
			} else if (roll <= 204) {
				move.basePower = 120;
			} else {
				move.basePower = 0;
				move.infiltrates = true;
				move.ignoreImmunity = true;
				move.onHit = function (target) {
					let quarter = target.maxhp >> 2;
					if (!(quarter & 0xff)) quarter++;
					this.heal(quarter, target);
				};
			}
		},
	},
	protect: {
		inherit: true,
		shortDesc: "Protects the user until the foe next acts. Never fails.",
		desc: "The user is protected from the foe's attacks until the end of the foe's next action, even if the user moved last this turn. Has no increased priority and never fails, even when used repeatedly.",
		priority: 0,
		stallingMove: false,
		onPrepareHit: undefined,
		onHit(pokemon) {},
		condition: {
			inherit: true,
			duration: undefined,
			onFoeAfterMoveSelf() {
				this.effectState.target.removeVolatile('protect');
			},
			onFoeAfterSwitchInSelf() {
				this.effectState.target.removeVolatile('protect');
			},
		},
	},
	destinybond: {
		inherit: true,
		shortDesc: "If the foe KOs the user before its next action ends, the foe faints.",
		desc: "Until the end of the foe's next action, if the user faints due to an attack by the foe, the foe also faints. The user's own actions do not end the effect, so it can carry into the next turn.",
		condition: {
			inherit: true,
			onBeforeMove: undefined,
			onMoveAborted: undefined,
			onFoeAfterMoveSelf() {
				this.effectState.target.removeVolatile('destinybond');
			},
			onFoeAfterSwitchInSelf() {
				this.effectState.target.removeVolatile('destinybond');
			},
		},
	},
	pursuit: {
		num: 228,
		shortDesc: "Does nothing; the demo never implements this move.",
		desc: "This move's effect is not implemented by the demo's engine; it always fails.",
		accuracy: 100,
		basePower: 0,
		category: "Status",
		name: "Pursuit",
		pp: 10,
		priority: 0,
		flags: {protect: 1, mirror: 1, metronome: 1},
		onTry() {
			return false;
		},
		secondary: null,
		target: "normal",
		type: "Normal",
	},
	raindance: {
		inherit: true,
		pp: 10,
		onTry(source, target, move) {
			if (!sw97HitsFoe(this, source, move)) return null;
		},
		type: "Normal",
	},
	razorleaf: {
		inherit: true,
		critRatio: 3,
	},
	razorwind: {
		inherit: true,
		shortDesc: "Charges turn 1. Hits turn 2.",
		desc: "This attack charges on the first turn and executes on the second. It does not have a high critical hit ratio in the demo's engine.",
		accuracy: 75,
	},
	rest: {
		inherit: true,
		onTry: undefined, // no inherit
		onHit(target, source, move) {
			const result = target.setStatus('slp', source, move);
			if (!result) return result;
			target.statusState.time = 2;
			target.statusState.startTime = 2;
			this.heal(target.maxhp); // Aesthetic only as the healing happens after you fall asleep in-game
		},
	},
	reversal: {
		inherit: true,
		shortDesc: "More power the less HP the user has left. Ignores type.",
		desc: "The power of this move is 20 if X is 33 or more, 40 if X is 17 to 32, 80 if X is 10 to 16, 100 if X is 5 to 9, 150 if X is 2 to 4, and 200 if X is 0 or 1, where X is the user's current HP * 48 / its maximum HP, rounded down. If the maximum HP is 256 or more, the demo divides (current HP * 48) / 4 by (maximum HP / 4) kept to its low 8 bits instead, which shifts the thresholds. The demo runs it as fixed-power damage: it gets no same-type bonus, no type effectiveness or immunity, no random variation, and it cannot be a critical hit.",
		pp: 10,
		willCrit: false,
		ignoreImmunity: true,
		noDamageVariance: true,
		basePowerCallback(pokemon) {
			return sw97FlailPower(pokemon);
		},
	},
	dragonrage: {
		inherit: true,
		shortDesc: "Always does 40 HP of damage. Hits any type.",
		desc: "Deals 40 HP of damage to the target. The demo applies no type check to this move.",
		ignoreImmunity: true,
	},
	nightshade: {
		inherit: true,
		shortDesc: "Does damage equal to the user's level. Hits Normal types.",
		desc: "Deals damage to the target equal to the user's level. The demo applies no type check to this move, so it hits Normal-type Pokemon.",
		ignoreImmunity: true,
	},
	psywave: {
		inherit: true,
		shortDesc: "Random damage from 1 to 1.5x the user's level, kept to 8 bits.",
		desc: "Deals damage to the target equal to a random number from 1 to X - 1, where X is the user's level plus half its level, kept to its low 8 bits (so a level 255 user deals 1 to 125). Fails at levels where X is 0 or 1 (levels 1 and 171), where the demo freezes. The demo applies no type check to this move.",
		ignoreImmunity: true,
		damageCallback(pokemon) {
			const range = (pokemon.level + (pokemon.level >> 1)) & 0xff;
			if (range < 2) {
				this.hint("In the SpaceWorld demo, Psywave used at level 1 or 171 freezes the game.");
				return false;
			}
			return this.random(1, range);
		},
	},
	seismictoss: {
		inherit: true,
		shortDesc: "Does damage equal to the user's level. Hits Ghost types.",
		desc: "Deals damage to the target equal to the user's level. The demo applies no type check to this move, so it hits Ghost-type Pokemon.",
		ignoreImmunity: true,
	},
	sonicboom: {
		inherit: true,
		shortDesc: "Always does 20 HP of damage. Hits Ghost types.",
		desc: "Deals 20 HP of damage to the target. The demo applies no type check to this move, so it hits Ghost-type Pokemon.",
		ignoreImmunity: true,
	},
	superfang: {
		inherit: true,
		shortDesc: "Does damage equal to 1/2 target's current HP. Hits Ghost types.",
		desc: "Deals damage to the target equal to half of its current HP, rounded down, but not less than 1 HP. The demo applies no type check to this move, so it hits Ghost-type Pokemon.",
		ignoreImmunity: true,
	},
	roar: {
		inherit: true,
		shortDesc: "Does nothing; the demo never implements forced switching.",
		desc: "This move's effect is not implemented by the demo's engine; it always fails and never forces a switch.",
		priority: 0,
		forceSwitch: false,
		onTry() {
			return false;
		},
	},
	safeguard: {
		inherit: true,
		pp: 10,
		onTry(source, target, move) {
			if (!sw97HitsFoe(this, source, move)) return null;
		},
	},
	sandstorm: {
		num: 201,
		shortDesc: "Target's side loses 1/8 max HP after each action; no immunity.",
		desc: "Applies a permanent condition to the target's side of the field: each Pokemon on that side loses 1/8 of its maximum HP, rounded down, right after it uses a move or voluntarily switches in, Rock, Ground, and Steel types included. Like the demo's other residual damage, it is skipped for the rest of a turn once a Pokemon faints. Does not change the weather and never wears off. Fails if the target's side is already sandstormed.",
		accuracy: 100,
		basePower: 0,
		category: "Status",
		name: "Sandstorm",
		pp: 10,
		priority: 0,
		flags: {protect: 1, mirror: 1, metronome: 1},
		sideCondition: "sandstormed",
		secondary: null,
		target: "normal",
		type: "Rock",
	},
	skyattack: {
		inherit: true,
		secondary: null,
		critRatio: 1,
	},
	slash: {
		inherit: true,
		critRatio: 3,
	},
	spikes: {
		inherit: true,
		pp: 10,
		onTry(source, target, move) {
			if (!sw97HitsFoe(this, source, move)) return null;
		},
		type: "Normal",
	},
	spite: {
		inherit: true,
		pp: 5,
	},
	struggle: {
		inherit: true,
		shortDesc: "User loses 1/2 the HP lost by the target. Ghosts are immune.",
		desc: "Deals Normal-type damage, so Ghost-types are immune and Rock- and Steel-types resist it. If this move is successful, the user takes recoil equal to 1/2 the HP lost by the target, but not less than 1 HP. Automatically used if no other move can be selected.",
		pp: 0,
		recoil: [1, 2],
		struggleRecoil: false,
		ignoreImmunity: false,
	},
	hyperbeam: {
		inherit: true,
		shortDesc: "User cannot move next turn, unless this move KOes the target.",
		desc: "If this move is successful, the user must recharge on the following turn - unless it knocks the target out, in which case no recharge is needed. A partial-trapping move used against the recharging Pokemon also cancels the recharge, even if it misses.",
		onAfterMove(source, target) {
			if (target && !target.hp) {
				delete source.volatiles['mustrecharge'];
			} else if (source.volatiles['mustrecharge']) {
				this.add('-mustrecharge', source);
			}
		},
	},
	explosion: {
		inherit: true,
		shortDesc: "Target's Def halved. Zeroes the user's HP low byte; faints only under 256 HP.",
		desc: "The target's Defense is halved during damage calculation. Instead of fainting outright, the demo zeroes the low byte of the user's HP: the user faints if its current HP is 255 or less, but with 256 or more HP it survives with its HP rounded down to a multiple of 256 and its maximum HP reduced to its old value mod 256 (the demo's HP-byte glitch). The user's status condition and Leech Seed are removed before it attacks.",
		selfdestruct: null,
	},
	selfdestruct: {
		inherit: true,
		shortDesc: "Target's Def halved. Zeroes the user's HP low byte; faints only under 256 HP.",
		desc: "The target's Defense is halved during damage calculation. Instead of fainting outright, the demo zeroes the low byte of the user's HP: the user faints if its current HP is 255 or less, but with 256 or more HP it survives with its HP rounded down to a multiple of 256 and its maximum HP reduced to its old value mod 256 (the demo's HP-byte glitch). The user's status condition and Leech Seed are removed before it attacks.",
		selfdestruct: null,
	},
	sunnyday: {
		inherit: true,
		pp: 10,
		onTry(source, target, move) {
			if (!sw97HitsFoe(this, source, move)) return null;
		},
		type: "Normal",
	},
	swagger: {
		inherit: true,
		accuracy: 100,
		pp: 10,
	},
	synthesis: {
		inherit: true,
		shortDesc: "Heals the user by a random 25-50% of its max HP.",
		desc: "The user restores half of its maximum HP multiplied by a random factor from 128/255 to 255/255, rounded down; if half its maximum HP is a multiple of 256, it is increased by 1 first. This is the demo's amount outside the move's time of day, since battles here have no clock. Weather has no effect.",
		pp: 10,
		onHit(pokemon) {
			let half = Math.floor(pokemon.maxhp / 2);
			if (half % 256 === 0) half++;
			return !!this.heal(Math.floor(half * this.random(128, 256) / 255));
		},
	},
	thief: {
		inherit: true,
		shortDesc: "No additional effect; does not steal the target's item.",
		desc: "No additional effect. The demo's Thief never steals the target's held item.",
		secondary: null,
	},
	thunder: {
		inherit: true,
		shortDesc: "10% chance to paralyze. Can hit during Fly.",
		desc: "Has a 10% chance to paralyze the target. This move can hit a target using Fly. Weather does not change its accuracy.",
		accuracy: 70,
		basePower: 120,
		pp: 10,
		type: "Electric",
		secondary: {"chance":10,"status":"par"},
		onModifyMove() {},
	},
	triattack: {
		inherit: true,
		shortDesc: "No additional effect.",
		desc: "No additional effect.",
		secondary: null,
	},
	triplekick: {
		inherit: true,
		shortDesc: "Hits 1-3 times; power is 60, then 120, then 180.",
		desc: "Hits one to three times, at random. Power is 60 for the first hit, 120 for the second, and 180 for the third. Accuracy is checked only once.",
		accuracy: 100,
		basePower: 60,
		multihit: [1,3],
		basePowerCallback(pokemon, target, move) {
			return 60 * move.hit;
		},
	},
	twister: {
		inherit: true,
		shortDesc: "No additional effect.",
		desc: "No additional effect. It cannot hit a Pokemon using Fly.",
		basePower: 60,
		pp: 10,
		secondary: null,
	},
	whirlwind: {
		inherit: true,
		shortDesc: "Does nothing; the demo never implements forced switching.",
		desc: "This move's effect is not implemented by the demo's engine; it always fails and never forces a switch.",
		accuracy: 85,
		priority: 0,
		forceSwitch: false,
		onTry() {
			return false;
		},
	},
	gigadrain: {
		inherit: true,
		shortDesc: "Deals damage with no HP drain.",
		desc: "No additional effect. The demo's Giga Drain does not recover any HP.",
		pp: 10,
		drain: null,
	},
	hiddenpower: {
		inherit: true,
		shortDesc: "???-type: hits every type neutrally. Power (up to 78) depends on the user's DVs.",
		desc: "This move is ???-type, dealing neutral damage to every type. Its base power is determined by the user's DVs using the demo's formula, which omits the final games' halving and +31 offset, so power ranges from the formula minimum up to 78 instead of 31 to 70.",
		type: "???",
		pp: 10,
		onModifyType(move) {
			move.type = '???';
		},
		basePowerCallback(pokemon) {
			const ivs = pokemon.set.ivs;
			const tr = this.dex.trunc;
			const atkDV = tr(ivs.atk / 2);
			const defDV = tr(ivs.def / 2);
			const speDV = tr(ivs.spe / 2);
			const spcDV = tr(ivs.spa / 2);
			const power = 5 * ((spcDV >> 3) + (2 * (speDV >> 3)) + (4 * (defDV >> 3)) + (8 * (atkDV >> 3))) + (spcDV % 4);
			return this.clampIntRange(power, 1, 78);
		},
	},
	bite: {
		inherit: true,
		shortDesc: "10% chance to make the target flinch.",
		desc: "Has a 10% chance to make the target flinch.",
		type: "Normal",
		category: "Physical",
		secondary: {"chance":10,"volatileStatus":"flinch"},
	},
	sandattack: {
		inherit: true,
		type: "Normal",
	},
	mudslap: {
		inherit: true,
		basePower: 0,
		category: "Status",
		type: "Normal",
		accuracy: 100,
		pp: 10,
		secondary: null,
		boosts: {accuracy: -1},
	},
	dragonbreath: {
		inherit: true,
		shortDesc: "No additional effect.",
		desc: "No additional effect.",
		basePower: 40,
		pp: 10,
		type: "Dragon",
		secondary: null,
	},
	rollout: {
		inherit: true,
		accuracy: 78.5,
		pp: 10,
	},
	furycutter: {
		inherit: true,
		accuracy: 100,
		basePower: 25,
		type: "Bug",
		shortDesc: "Power doubles with each consecutive hit, uncapped (25/50/100/200/...).",
		desc: "Power doubles with each successful consecutive use, with no cap (25, 50, 100, 200, and so on, saturating at 65535). The demo's counter has no limit, unlike the final game's 160 cap - the decomp marks this as a bug, and this format keeps it.",
		basePowerCallback(pokemon, target, move) {
			const multiplier = pokemon.volatiles['furycutter']?.multiplier || 1;
			return Math.min(25 * multiplier, 65535);
		},
		condition: {
			duration: 2,
			onStart() {
				this.effectState.multiplier = 1;
			},
			onRestart() {
				this.effectState.multiplier *= 2;
				this.effectState.duration = 2;
			},
		},
	},
	poisonsting: {
		inherit: true,
		shortDesc: "10% chance to poison the target.",
		desc: "Has a 10% chance to poison the target.",
		secondary: {"chance":10,"status":"psn"},
	},
	blizzard: {
		inherit: true,
		shortDesc: "30% chance to freeze the target.",
		desc: "Has a 30% chance to freeze the target.",
		accuracy: 90,
		basePower: 120,
		secondary: {"chance":30,"status":"frz"},
	},
	rockthrow: {
		inherit: true,
		accuracy: 65,
	},
	teleport: {
		inherit: true,
		accuracy: 100,
		priority: 0,
		onTry() {
			return false;
		},
	},
	smog: {
		inherit: true,
		shortDesc: "No additional effect.",
		desc: "No additional effect.",
		secondary: null,
	},
	dizzypunch: {
		inherit: true,
		shortDesc: "No additional effect.",
		desc: "No additional effect.",
		secondary: null,
	},
	flamewheel: {
		inherit: true,
		shortDesc: "No additional effect. Thaws user.",
		desc: "No additional effect. Can be used while frozen to force the user to defrost.",
		pp: 10,
		secondary: null,
	},
	snore: {
		inherit: true,
		shortDesc: "User must be asleep. 30% chance to confuse the target.",
		desc: "Has a 30% chance to confuse the target. Fails if the user is not asleep.",
		pp: 10,
		secondary: {chance: 30, volatileStatus: 'confusion'},
		onTry(source, target, move) {
			if (source.status === 'slp') return;
			if (!sw97HitsFoe(this, source, move)) return null;
			const wouldBe = this.actions.getDamage(source, target, move, true);
			this.lastDamage = typeof wouldBe === 'number' ? wouldBe : 0;
			return false;
		},
	},
	coinhurl: {
		inherit: true,
		isNonstandard: null,
		accuracy: 100,
		basePower: 40,
		pp: 10,
		category: "Physical",
		type: "Normal",
		secondary: null,
		priority: 0,
		target: "normal",
	},
	machpunch: {
		inherit: true,
		pp: 15,
	},
	scaryface: {
		inherit: true,
		shortDesc: "Lowers the target's Defense by 2 stages.",
		desc: "Lowers the target's Defense by 2 stages.",
		accuracy: 85,
		pp: 40,
		boosts: {def: -2},
	},
	feintattack: {
		inherit: true,
		shortDesc: "No additional effect.",
		desc: "No additional effect. Unlike the final games, the demo's Faint Attack checks accuracy normally (100%).",
		accuracy: 100,
		pp: 10,
	},
	sweetkiss: {
		inherit: true,
		shortDesc: "Confuses the target. Ghost-types are immune.",
		accuracy: 100,
		ignoreImmunity: false,
	},
	supersonic: {
		inherit: true,
		shortDesc: "Confuses the target. Ghost-types are immune.",
		ignoreImmunity: false,
	},
	confuseray: {
		inherit: true,
		shortDesc: "Confuses the target. Normal-types are immune.",
		ignoreImmunity: false,
	},
	fissure: {
		inherit: true,
		shortDesc: "OHKOs the target. Fails if it is faster or resists.",
		desc: "Deals damage equal to the target's maximum HP. Fails if the target is faster than the user, or if the move would be not very effective against it or have no effect. The user's level does not matter, and accuracy and evasion apply as for any other move.",
	},
	guillotine: {
		inherit: true,
		shortDesc: "OHKOs the target. Fails if it is faster or resists.",
		desc: "Deals damage equal to the target's maximum HP. Fails if the target is faster than the user, or if the move would be not very effective against it or have no effect. The user's level does not matter, and accuracy and evasion apply as for any other move.",
	},
	horndrill: {
		inherit: true,
		shortDesc: "OHKOs the target. Fails if it is faster or resists.",
		desc: "Deals damage equal to the target's maximum HP. Fails if the target is faster than the user, or if the move would be not very effective against it or have no effect. The user's level does not matter, and accuracy and evasion apply as for any other move.",
	},
	sludgebomb: {
		inherit: true,
		shortDesc: "No additional effect.",
		desc: "No additional effect.",
		secondary: null,
	},
	octazooka: {
		inherit: true,
		shortDesc: "No additional effect.",
		desc: "No additional effect.",
		accuracy: 100,
		secondary: null,
	},
	zapcannon: {
		inherit: true,
	},
	perishsong: {
		inherit: true,
		pp: 10,
		onTry(source, target, move) {
			if (!sw97HitsFoe(this, source, move)) return null;
		},
	},
	synchronize: {
		inherit: true,
		shortDesc: "User copies the target's types.",
		desc: "The user's types change to match the target's current types (the same effect as the demo's Conversion). Never misses.",
		isNonstandard: null,
		accuracy: true,
		basePower: 0,
		pp: 10,
		category: "Status",
		type: "Psychic",
		priority: 0,
		target: "normal",
		onHit(target, source) {
			if (!source.setType(target.getTypes(true))) return false;
			this.add('-start', source, 'typechange', source.types.join('/'), '[from] move: Synchronize', `[of] ${target}`);
		},
	},
	detect: {
		num: 197,
		shortDesc: "User's next move will not miss the target (works like Lock-On).",
		desc: "The demo's Detect works like Lock-On: the user's next accuracy check against the target succeeds, and its moves can hit the target through Fly and Dig. Fails if the user already has a Lock-On effect. It does not protect the user.",
		accuracy: 100,
		basePower: 0,
		category: "Status",
		name: "Detect",
		pp: 10,
		priority: 0,
		flags: {protect: 1, mirror: 1, metronome: 1},
		onTryHit(target, source) {
			if (source.volatiles['lockon']) return false;
		},
		onHit(target, source) {
			source.addVolatile('lockon', target);
			this.add('-activate', source, 'move: Detect', '[of] ' + target);
		},
		secondary: null,
		target: "normal",
		type: "Normal",
	},
	bonelock: {
		inherit: true,
		isNonstandard: null,
		accuracy: 100,
		basePower: 25,
		pp: 10,
		category: "Physical",
		type: "Ground",
		secondary: null,
		priority: 0,
		target: "normal",
	},
	charm: {
		inherit: true,
		accuracy: 85,
		pp: 40,
	},
	falseswipe: {
		inherit: true,
		pp: 20,
	},
	stalker: {
		inherit: true,
		isNonstandard: null,
		accuracy: 100,
		ignoreImmunity: false,
		basePower: 0,
		pp: 10,
		category: "Status",
		type: "Psychic",
		secondary: null,
		priority: 0,
		volatileStatus: "confusion",
		target: "normal",
	},
	steelwing: {
		inherit: true,
		shortDesc: "No additional effect.",
		desc: "No additional effect.",
		accuracy: 100,
		pp: 10,
		secondary: null,
	},
	painsplit: {
		inherit: true,
		shortDesc: "Shares HP of user and target equally. Fails on a substitute.",
		desc: "The user and the target's HP become the average of their current HP, rounded down, but not more than the maximum HP of either one. Fails if the target has a substitute.",
		pp: 5,
		onHit(target, pokemon) {
			if (target.volatiles['substitute']) return false;
			const averagehp = Math.floor((target.hp + pokemon.hp) / 2) || 1;
			this.lastDamage = averagehp;
			target.sethp(averagehp);
			this.add('-sethp', target, target.getHealth, '[from] move: Pain Split', '[silent]');
			pokemon.sethp(averagehp);
			this.add('-sethp', pokemon, pokemon.getHealth, '[from] move: Pain Split');
		},
	},
	sacredfire: {
		inherit: true,
		shortDesc: "No additional effect. Thaws user.",
		desc: "No additional effect. Can be used while frozen to force the user to defrost.",
		accuracy: 100,
		basePower: 80,
		pp: 10,
		secondary: null,
	},
	megaphone: {
		inherit: true,
		isNonstandard: null,
		accuracy: 85,
		basePower: 0,
		pp: 40,
		category: "Status",
		type: "Normal",
		priority: 0,
		target: "normal",
	},
	rapidspin: {
		inherit: true,
		shortDesc: "Frees the user from partial-trapping moves; usable while trapped.",
		desc: "If this move is successful, the effects of partial-trapping moves end for the user. It is the only move that can be used while trapped. It does not remove Leech Seed or Spikes.",
		pp: 10,
		self: {
			onHit(pokemon) {
				if (pokemon.removeVolatile('partiallytrapped')) {
					this.add('-end', pokemon, 'partiallytrapped');
				}
				for (const foe of pokemon.foes()) {
					foe.removeVolatile('partialtrappinglock');
				}
			},
		},
	},
	irontail: {
		inherit: true,
		shortDesc: "No additional effect.",
		desc: "No additional effect.",
		accuracy: 100,
		basePower: 60,
		pp: 10,
		secondary: null,
	},
	rockhead: {
		inherit: true,
		isNonstandard: null,
		accuracy: 100,
		basePower: 90,
		pp: 10,
		category: "Physical",
		type: "Rock",
		priority: 0,
		target: "normal",
	},
	vitalthrow: {
		inherit: true,
		shortDesc: "No additional effect.",
		desc: "No additional effect. Unlike the final games, it checks accuracy (100%) and has normal priority.",
		basePower: 50,
		accuracy: 100,
		priority: 0,
	},
	crosscutter: {
		inherit: true,
		isNonstandard: null,
		accuracy: 100,
		basePower: 50,
		pp: 10,
		category: "Physical",
		type: "Bug",
		priority: 0,
		target: "normal",
	},
	uproot: {
		inherit: true,
		isNonstandard: null,
		accuracy: 100,
		basePower: 30,
		pp: 10,
		category: "Physical",
		type: "Normal",
		priority: 0,
		target: "normal",
	},
	windride: {
		inherit: true,
		isNonstandard: null,
		accuracy: 100,
		basePower: 40,
		pp: 10,
		category: "Physical",
		type: "Flying",
		priority: 0,
		target: "normal",
	},
	watersport: {
		inherit: true,
		shortDesc: "No additional effect.",
		desc: "No additional effect. The demo's Water Sport is a 30-power Water-type attack, not a field effect.",
		isNonstandard: null,
		gen: 2,
		accuracy: 100,
		basePower: 30,
		pp: 10,
		category: "Special",
		type: "Water",
		priority: 0,
		target: "normal",
	},
	strongarm: {
		inherit: true,
		isNonstandard: null,
		accuracy: 100,
		basePower: 30,
		pp: 10,
		category: "Physical",
		type: "Steel",
		priority: 0,
		target: "normal",
	},
	brightmoss: {
		inherit: true,
		isNonstandard: null,
		accuracy: 100,
		basePower: 0,
		pp: 10,
		priority: 0,
		target: "normal",
	},
	whirlpool: {
		inherit: true,
		shortDesc: "No additional effect.",
		desc: "No additional effect. The demo's Whirlpool is a plain Water-type attack with no trapping effect.",
		accuracy: 100,
		basePower: 30,
		pp: 10,
		category: "Special",
		type: "Water",
		priority: 0,
		volatileStatus: null,
		target: "normal",
	},
	bounce: {
		inherit: true,
		shortDesc: "Hits in one turn for minimal damage (0 power in the demo).",
		desc: "A single-turn attack with no charge turn and no paralysis chance. The demo assigns it 0 power, so it deals only the damage formula's minimum (about 2 HP).",
		isNonstandard: null,
		gen: 2,
		accuracy: 100,
		basePower: 0,
		basePowerCallback() {
			return 1;
		},
		pp: 10,
		category: "Special",
		type: "Water",
		priority: 0,
		target: "normal",
		flags: {protect: 1, mirror: 1, metronome: 1},
		onTryMove: undefined,
		secondary: null,
		condition: undefined,
	},
	clamp: {
		inherit: true,
		shortDesc: "Traps the target for 2-5 turns; it can only use Rapid Spin meanwhile.",
		desc: "The user attacks for two to five turns in a row (37.5% chance each for 2 or 3 turns, 12.5% chance each for 4 or 5); while trapped, the target cannot use any move except Rapid Spin (Gen 1-style trapping) and takes no end-of-turn damage. Follow-up hits do not check accuracy or use PP, and each recalculates damage and can be a critical hit. The trap ends the moment the final hit lands, if either Pokemon leaves the field, if the target uses Rapid Spin, or if the user is prevented from attacking (by full paralysis, confusion, or infatuation); the target can act normally from then on, including on that very turn. If the first hit lands on a Pokemon recharging from Hyper Beam, the recharge turn is skipped; a missed use does not skip it.",
		accuracy: 75,
		pp: 10,
		self: {
			volatileStatus: 'partialtrappinglock',
		},
	},
	firespin: {
		inherit: true,
		shortDesc: "Traps the target for 2-5 turns; it can only use Rapid Spin meanwhile.",
		desc: "The user attacks for two to five turns in a row (37.5% chance each for 2 or 3 turns, 12.5% chance each for 4 or 5); while trapped, the target cannot use any move except Rapid Spin (Gen 1-style trapping) and takes no end-of-turn damage. Follow-up hits do not check accuracy or use PP, and each recalculates damage and can be a critical hit. The trap ends the moment the final hit lands, if either Pokemon leaves the field, if the target uses Rapid Spin, or if the user is prevented from attacking (by full paralysis, confusion, or infatuation); the target can act normally from then on, including on that very turn. If the first hit lands on a Pokemon recharging from Hyper Beam, the recharge turn is skipped; a missed use does not skip it.",
		accuracy: 70,
		basePower: 15,
		self: {
			volatileStatus: 'partialtrappinglock',
		},
	},
	wrap: {
		inherit: true,
		shortDesc: "Traps the target for 2-5 turns; it can only use Rapid Spin meanwhile.",
		desc: "The user attacks for two to five turns in a row (37.5% chance each for 2 or 3 turns, 12.5% chance each for 4 or 5); while trapped, the target cannot use any move except Rapid Spin (Gen 1-style trapping) and takes no end-of-turn damage. Follow-up hits do not check accuracy or use PP, and each recalculates damage and can be a critical hit. The trap ends the moment the final hit lands, if either Pokemon leaves the field, if the target uses Rapid Spin, or if the user is prevented from attacking (by full paralysis, confusion, or infatuation); the target can act normally from then on, including on that very turn. If the first hit lands on a Pokemon recharging from Hyper Beam, the recharge turn is skipped; a missed use does not skip it. This move can also hit Ghost-types.",
		accuracy: 85,
		ignoreImmunity: true,
		self: {
			volatileStatus: 'partialtrappinglock',
		},
	},
	bind: {
		inherit: true,
		shortDesc: "Traps the target for 2-5 turns; it can only use Rapid Spin meanwhile.",
		desc: "The user attacks for two to five turns in a row (37.5% chance each for 2 or 3 turns, 12.5% chance each for 4 or 5); while trapped, the target cannot use any move except Rapid Spin (Gen 1-style trapping) and takes no end-of-turn damage. Follow-up hits do not check accuracy or use PP, and each recalculates damage and can be a critical hit. The trap ends the moment the final hit lands, if either Pokemon leaves the field, if the target uses Rapid Spin, or if the user is prevented from attacking (by full paralysis, confusion, or infatuation); the target can act normally from then on, including on that very turn. If the first hit lands on a Pokemon recharging from Hyper Beam, the recharge turn is skipped; a missed use does not skip it. This move can also hit Ghost-types.",
		ignoreImmunity: true,
		self: {
			volatileStatus: 'partialtrappinglock',
		},
	},
	psychic: {
		inherit: true,
		shortDesc: "No additional effect.",
		desc: "No additional effect.",
		secondary: null,
	},
	twineedle: {
		inherit: true,
		shortDesc: "Hits 2 times. No additional effect.",
		desc: "Hits twice. The demo's Twineedle has no poison chance.",
		secondary: null,
	},
	spark: {
		inherit: true,
		shortDesc: "10% chance to paralyze the target.",
		desc: "Has a 10% chance to paralyze the target.",
		secondary: {chance: 10, status: 'par'},
	},
	jumpkick: {
		inherit: true,
		shortDesc: "No additional effect.",
		desc: "No additional effect. The user takes no crash damage if this move misses.",
		hasCrashDamage: false,
		onMoveFail() {},
	},
	highjumpkick: {
		inherit: true,
		shortDesc: "No additional effect.",
		desc: "No additional effect. The user takes no crash damage if this move misses.",
		hasCrashDamage: false,
		onMoveFail() {},
	},
	bellydrum: {
		num: 187,
		shortDesc: "Raises the user's Attack by 1 stage; no HP cost.",
		desc: "Raises the user's Attack by 1 stage. The demo's Belly Drum costs no HP and does not maximize Attack.",
		accuracy: true,
		basePower: 0,
		category: "Status",
		name: "Belly Drum",
		pp: 10,
		priority: 0,
		flags: {snatch: 1, metronome: 1},
		boosts: {atk: 1},
		secondary: null,
		target: "self",
		type: "Normal",
	},
	cottonspore: {
		inherit: true,
		shortDesc: "Lowers the target's Speed by 1 stage.",
		desc: "Lowers the target's Speed by 1 stage.",
		accuracy: 100,
		pp: 10,
		boosts: {spe: -1},
	},
	conversion: {
		inherit: true,
		shortDesc: "Changes the user's types to match the target's.",
		desc: "The user's types change to match the target's current types.",
		target: "normal",
		onHit(target, source) {
			if (!source.setType(target.getTypes(true))) return false;
			this.add('-start', source, 'typechange', source.types.join('/'), '[from] move: Conversion', `[of] ${target}`);
		},
	},
	frustration: {
		inherit: true,
		shortDesc: "Power is 100 minus Happiness; fixed 30 power at 70+ Happiness.",
		desc: "If the user's Happiness is 70 or more, power is 30. Otherwise, power is equal to 100 minus the user's Happiness, up to a maximum of 100.",
		pp: 10,
		basePowerCallback(pokemon) {
			const happiness = pokemon.happiness ?? 0;
			return happiness >= 70 ? 30 : 100 - happiness;
		},
	},
	rage: {
		num: 99,
		shortDesc: "No additional effect.",
		desc: "No additional effect. The demo's Rage is a plain attack with no damage-building effect.",
		accuracy: 100,
		basePower: 20,
		category: "Physical",
		name: "Rage",
		pp: 20,
		priority: 0,
		flags: {contact: 1, protect: 1, mirror: 1, metronome: 1},
		secondary: null,
		target: "normal",
		type: "Normal",
	},
	scratch: {
		inherit: true,
		pp: 30,
	},
	mindreader: {
		inherit: true,
		pp: 10,
	},
	return: {
		inherit: true,
		pp: 10,
	},
	magnitude: {
		inherit: true,
		shortDesc: "Power varies from 10 to 150.",
		desc: "The power of this move varies: 5% chances for 10 and 150 power, 10% chances for 30 and 110 power, 20% chances for 50 and 90 power, and a 30% chance for 70 power. It cannot hit a Pokemon using Dig.",
		pp: 10,
	},
	batonpass: {
		inherit: true,
		pp: 10,
		self: {volatileStatus: 'swbatonboost'},
	},
	encore: {
		inherit: true,
		pp: 10,
	},
	solarbeam: {
		inherit: true,
		shortDesc: "Charges turn 1. Hits turn 2, in any weather.",
		desc: "This attack charges on the first turn and executes on the second, regardless of the weather. Its damage is not reduced in rain.",
		onTryMove(attacker, defender, move) {
			if (attacker.removeVolatile(move.id)) {
				return;
			}
			this.add('-prepare', attacker, move.name);
			if (!this.runEvent('ChargeMove', attacker, defender, move)) {
				return;
			}
			attacker.addVolatile('twoturnmove', defender);
			return null;
		},
		onBasePower() {},
	},
	leechseed: {
		inherit: true,
		shortDesc: "Leeches 1/8 target's max HP each turn. Grass-types are not immune.",
		desc: "The Pokemon at the user's position steals 1/8 of the target's maximum HP, rounded down, after the target moves each turn, and right away when the seed is passed to a Pokemon by Baton Pass. Grass-types are not immune; instead, due to the demo's type-byte check, this move fails against a target whose current HP has 22 (the Grass type's internal index) as its low byte or high byte.",
		onTryImmunity(target) {
			return !(target.hp % 256 === 22 || Math.floor(target.hp / 256) === 22);
		},
		condition: {
			inherit: true,
			onAfterSwitchInSelf(pokemon) {
				if (!pokemon.hp) return;
				const leecher = this.getAtSlot(pokemon.volatiles['leechseed'].sourceSlot);
				if (!leecher || leecher.fainted || leecher.hp <= 0) return;
				const damage = this.damage(this.clampIntRange(pokemon.maxhp / 8, 1), pokemon, leecher);
				if (damage) this.heal(damage, leecher, pokemon);
			},
		},
	},
	haze: {
		inherit: true,
		shortDesc: "Resets both actives' stat stages; also cures the target's status.",
		desc: "Resets the stat stages of the user and the target to 0 and removes confusion, Disable, Mist, Focus Energy, Leech Seed, and the effects of Reflect and Light Screen from both. The target is also cured of its non-volatile status condition, and if the user is badly poisoned it becomes regular poison.",
		target: "normal",
		onHit(target, source) {
			this.add('-activate', source, 'move: Haze');
			for (const pokemon of [source, target]) {
				pokemon.clearBoosts();
				this.add('-clearboost', pokemon);
				for (const vol of ['confusion', 'disable', 'mist', 'focusenergy', 'leechseed', 'swreflect']) {
					pokemon.removeVolatile(vol);
				}
			}
			if (target.status) target.cureStatus();
			if (source.status === 'tox') {
				source.setStatus('psn');
			}
		},
	},
	reflect: {
		num: 115,
		shortDesc: "Doubles user's Defense vs physical moves until it leaves the field.",
		desc: "While active, the user's Defense is doubled against physical-type moves (and against its own confusion self-hits). Critical hits ignore this effect. Personal to the user with no turn limit: it lasts until the user leaves the field or is hit by Haze. Fails if the user already has this effect.",
		accuracy: true,
		basePower: 0,
		category: "Status",
		name: "Reflect",
		pp: 20,
		priority: 0,
		flags: {snatch: 1, metronome: 1},
		volatileStatus: 'swreflect',
		onTryHit(pokemon) {
			if (pokemon.volatiles['swreflect']) return false;
		},
		secondary: null,
		target: "self",
		type: "Psychic",
	},
	lightscreen: {
		num: 113,
		shortDesc: "Works like the demo's Reflect: doubles Defense vs physical moves.",
		desc: "Identical to the demo's Reflect: while active, the user's Defense is doubled against physical-type moves. It does not reduce special damage at all. Personal to the user with no turn limit; it ends when the user leaves the field or is hit by Haze, and it does not stack with Reflect.",
		accuracy: true,
		basePower: 0,
		category: "Status",
		name: "Light Screen",
		pp: 30,
		priority: 0,
		flags: {snatch: 1, metronome: 1},
		volatileStatus: 'swreflect',
		onTryHit(pokemon) {
			if (pokemon.volatiles['swreflect']) return false;
		},
		secondary: null,
		target: "self",
		type: "Psychic",
	},
	substitute: {
		inherit: true,
		shortDesc: "1/4 max HP substitute; paralysis and Leech Seed pierce it.",
		desc: "The user takes 1/4 of its maximum HP, rounded down, to create a substitute. It can be made with exactly 1/4 HP remaining, causing the user to faint. The substitute blocks most status moves, stat-lowering moves, confusion, and Lock-On effects, but paralysis-inducing moves and Leech Seed go through it. Creating a substitute frees the user from partial-trapping moves.",
		onTryHit(target) {
			const cost = Math.floor(target.maxhp / 4);
			if (target.volatiles['substitute']) {
				this.add('-fail', target, 'move: Substitute');
				return this.NOT_FAIL;
			}
			if (target.hp < cost || target.maxhp === 1) {
				this.add('-fail', target, 'move: Substitute', '[weak]');
				return this.NOT_FAIL;
			}
		},
		condition: {
			onStart(target) {
				this.add('-start', target, 'Substitute');
				this.effectState.hp = Math.floor(target.maxhp / 4);
				delete target.volatiles['partiallytrapped'];
			},
			onTryPrimaryHit(target, source, move) {
				if (target === source || move.flags['bypasssub'] || move.infiltrates) {
					return;
				}
				if (move.category === 'Status') {
					const blockedStatus = !!move.status && move.status !== 'par';
					const blockedOther = (!!move.boosts && !move.secondaries) || move.volatileStatus === 'confusion' ||
						['lockon', 'mindreader', 'nightmare', 'detect'].includes(move.id);
					if (blockedStatus || blockedOther) {
						this.add('-fail', source);
						this.attrLastMove('[still]');
						return null;
					}
					return;
				}
				let damage = this.actions.getDamage(source, target, move);
				if (!damage && damage !== 0) {
					this.add('-fail', source);
					this.attrLastMove('[still]');
					return null;
				}
				damage = this.runEvent('SubDamage', target, source, move, damage);
				if (!damage) {
					return damage;
				}
				this.lastDamage = damage;
				if (target.volatiles['bide']) {
					target.volatiles['bide'].totalDamage = Math.min(target.volatiles['bide'].totalDamage + damage, 0xffff);
				}
				if (damage > target.volatiles['substitute'].hp) {
					damage = target.volatiles['substitute'].hp as number;
				}
				target.volatiles['substitute'].hp -= damage;
				source.lastDamage = damage;
				if (target.volatiles['substitute'].hp <= 0) {
					target.removeVolatile('substitute');
				} else {
					this.add('-activate', target, 'move: Substitute', '[damage]');
				}
				if (move.recoil) {
					this.damage(this.actions.calcRecoilDamage(damage, move, source), source, target, 'recoil');
				}
				if (move.drain) {
					this.heal(Math.ceil(damage * move.drain[0] / move.drain[1]), source, target, 'drain');
				}
				this.singleEvent('AfterSubDamage', move, null, target, source, move, damage);
				this.runEvent('AfterSubDamage', target, source, move, damage);
				return this.HIT_SUBSTITUTE;
			},
			onEnd(target) {
				this.add('-end', target, 'Substitute');
			},
		},
	},
	fly: {
		inherit: true,
		shortDesc: "Flies up turn 1; only Thunder, Swift, or Lock-On can hit. Buggy.",
		desc: "This attack charges on the first turn and executes on the second. While flying, the user can only be hit by Thunder, Swift, or by a Pokemon with the Lock-On effect; no move deals doubled power against it. If the user is fully paralyzed or immobilized by attraction on its attack turn, it remains semi-invulnerable indefinitely while still able to act (the demo's Fly glitch).",
		condition: {
			duration: 2,
			onInvulnerability(target, source, move) {
				if (['whirlwind', 'thunder', 'swift'].includes(move.id) || SW97_NO_HIT_CHECK.includes(move.id)) {
					return;
				}
				if (source.volatiles['lockon'] && target === source.volatiles['lockon'].source) {
					return;
				}
				return false;
			},
		},
	},
	dig: {
		inherit: true,
		shortDesc: "Digs turn 1; only Earthquake, Fissure, Swift, or Lock-On can hit.",
		desc: "This attack charges on the first turn and executes on the second. While underground, the user can only be hit by Earthquake, Fissure, Swift, or by a Pokemon with the Lock-On effect; Magnitude cannot hit it and no move deals doubled power against it. If the user is fully paralyzed or immobilized by attraction on its attack turn, it remains semi-invulnerable indefinitely while still able to act (the demo's Dig glitch).",
		condition: {
			duration: 2,
			onInvulnerability(target, source, move) {
				if (['earthquake', 'fissure', 'swift'].includes(move.id) || SW97_NO_HIT_CHECK.includes(move.id)) {
					return;
				}
				if (source.volatiles['lockon'] && target === source.volatiles['lockon'].source) {
					return;
				}
				return false;
			},
		},
	},
	earthquake: {
		inherit: true,
		shortDesc: "No additional effect. Can hit a Pokemon using Dig.",
		desc: "No additional effect. This move can hit a Pokemon using Dig, but without doubled power.",
	},
	naildown: {
		inherit: true,
		isNonstandard: null,
		accuracy: true,
		flags: { reflectable: 1, metronome: 1 },
	},
	bellchime: {
		inherit: true,
		isNonstandard: null,
	},
	tempt: {
		inherit: true,
		isNonstandard: null,
	},
	aeroblast: {
		inherit: true,
		isNonstandard: "Future",
	},
	ancientpower: {
		inherit: true,
		isNonstandard: "Future",
	},
	beatup: {
		inherit: true,
		isNonstandard: "Future",
	},
	bonerush: {
		inherit: true,
		isNonstandard: "Future",
	},
	crosschop: {
		inherit: true,
		isNonstandard: "Future",
	},
	crunch: {
		inherit: true,
		isNonstandard: "Future",
	},
	curse: {
		inherit: true,
		isNonstandard: "Future",
		condition: {
			inherit: true,
			onAfterSwitchInSelf(pokemon) {
				this.damage(pokemon.baseMaxhp / 4);
			},
		},
	},
	extremespeed: {
		inherit: true,
		isNonstandard: "Future",
	},
	futuresight: {
		inherit: true,
		isNonstandard: "Future",
	},
	healbell: {
		inherit: true,
		isNonstandard: "Future",
	},
	icywind: {
		inherit: true,
		isNonstandard: "Future",
	},
	meanlook: {
		inherit: true,
		isNonstandard: "Future",
	},
	megahorn: {
		inherit: true,
		isNonstandard: "Future",
	},
	metalclaw: {
		inherit: true,
		isNonstandard: "Future",
	},
	mirrorcoat: {
		inherit: true,
		isNonstandard: "Future",
	},
	psychup: {
		inherit: true,
		isNonstandard: "Future",
	},
	rocksmash: {
		inherit: true,
		isNonstandard: "Future",
	},
	shadowball: {
		inherit: true,
		isNonstandard: "Future",
	},
	sweetscent: {
		inherit: true,
		isNonstandard: "Future",
	},
};
