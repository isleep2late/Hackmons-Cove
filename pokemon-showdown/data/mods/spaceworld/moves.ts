const SW97_NO_HIT_CHECK = ['bide', 'counter', 'sketch', 'haze'];
const SW97_HAZE_END: { [k: string]: string } = {
	mist: 'Mist', focusenergy: 'move: Focus Energy', leechseed: 'move: Leech Seed',
};
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

function sw97SetCounterMove(pokemon: Pokemon, id: string) {
	const foe = pokemon.side.foe.active[0];
	pokemon.m.sw97CounterMove = {
		id, user: pokemon.previouslySwitchedIn, foe, foeSwitch: foe?.previouslySwitchedIn,
	};
}

function sw97LastCounterMove(pokemon: Pokemon): string {
	const counter = pokemon.m.sw97CounterMove;
	const foe = pokemon.side.foe.active[0];
	if (!counter || counter.user !== pokemon.previouslySwitchedIn || counter.foe !== foe ||
		counter.foeSwitch !== foe?.previouslySwitchedIn) {
		return '';
	}
	return counter.id;
}

const SW97_DISABLE_TICK_ORDER: { [k: string]: number } = { onAnyBeforeMovePriority: 7 };

function sw97HealFails(pokemon: Pokemon) {
	if (pokemon.hp >= pokemon.maxhp) return true;
	return (pokemon.maxhp - pokemon.hp) % 256 === 255 && (pokemon.hp >> 8) < (pokemon.maxhp >> 8);
}

function sw97HealTry(this: Battle, source: Pokemon) {
	if (!sw97HealFails(source)) return;
	this.add('-fail', source);
	return null;
}

function sw97KeepToxicBit(pokemon: Pokemon, counter: number) {
	pokemon.addVolatile('swtoxic');
	if (pokemon.volatiles['swtoxic']) pokemon.volatiles['swtoxic'].counter = counter;
}

function sw97TurnLost(battle: Battle, pokemon: Pokemon) {
	return pokemon.m.sw97TurnLost === battle.turn;
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
		shortDesc: "Infatuates a foe of the other gender; genderless counts as female.",
		desc: "Causes the target to become infatuated, making it unable to attack 50% of the time. It never misses on accuracy or evasion. Fails if both Pokemon count as the same gender, the target is using Fly or Dig, or the target is already infatuated. The demo treats genderless Pokemon as female. It goes through Protect and substitutes, and the infatuation lasts until the infatuated Pokemon leaves the field, even if the user switches out first. Baton Pass passes the infatuation to the replacement.",
		accuracy: true,
		pp: 10,
		flags: { reflectable: 1, mirror: 1, bypasssub: 1, metronome: 1 },
		onTryImmunity(target, source) {
			return (target.gender === 'M') !== (source.gender === 'M');
		},
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
		shortDesc: "Picks a random move other than Metronome.",
		desc: "A random move is selected for use, other than Metronome itself. Unlike the final games, any other move can be called, including Counter, Protect, Sketch, Sleep Talk, Struggle, and moves the user already knows. It can also call one of the demo's three unused move slots, which do nothing.",
		onTry(source, target, move) {
			if (!sw97HitsFoe(this, source, move)) return null;
		},
		onHit(pokemon) {
			const moves = [...new Set(this.dex.moves.all()
				.filter(move => !move.isNonstandard && move.id !== 'metronome').map(move => move.id))];
			const roll = this.random(moves.length + 3);
			if (roll >= moves.length) {
				sw97SetCounterMove(pokemon, 'sw97unused');
				this.add('-nothing');
				return;
			}
			sw97SetCounterMove(pokemon, moves[roll]);
			this.actions.useMove(moves[roll], pokemon);
		},
	},
	mirrormove: {
		inherit: true,
		shortDesc: "User uses the target's last used move against it.",
		desc: "The user uses the last move used by the target. Fails if the target's last move was Mirror Move, or if the target has not used a move since either Pokemon entered the field, or if the target spent its last turn asleep or frozen. Unlike the final games, the user may copy a move it already knows, and Metronome, Mimic, Sketch, Sleep Talk, and Transform can be copied; after Metronome, Sleep Talk, or Mirror Move, the move they called is copied, and copying one of Metronome's empty move slots does nothing.",
		onTry(source, target, move) {
			if (!sw97HitsFoe(this, source, move)) return null;
		},
		onHit(pokemon) {
			const foe = pokemon.side.foe.active[0];
			const counter = foe?.m.sw97CounterMove;
			if (!counter || counter.user !== foe.previouslySwitchedIn || counter.foe !== pokemon ||
				counter.foeSwitch !== pokemon.previouslySwitchedIn || counter.id === 'mirrormove') {
				return false;
			}
			sw97SetCounterMove(pokemon, counter.id);
			if (counter.id === 'sw97unused') {
				this.add('-nothing');
				return;
			}
			this.actions.useMove(counter.id, pokemon);
		},
	},
	sleeptalk: {
		inherit: true,
		shortDesc: "User must be asleep. Uses another known move.",
		desc: "One of the user's known moves, besides this move, is selected for use at random. Fails if the user is not asleep or has only one move. Unlike the final games, the selected move can be a disabled move, Bide, or a two-turn move.",
		onTry(source, target, move) {
			if (!sw97HitsFoe(this, source, move)) return null;
			return source.status === 'slp';
		},
		onHit(pokemon) {
			if (!pokemon.moveSlots[1]) return false;
			const moves = pokemon.moveSlots.map(slot => slot.id).filter(id => id && id !== 'sleeptalk');
			if (!moves.length) return false;
			const moveid = this.sample(moves);
			sw97SetCounterMove(pokemon, moveid);
			this.actions.useMove(moveid, pokemon);
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
			noCopy: false,
			onAfterMoveSelf(pokemon) {
				this.damage(pokemon.baseMaxhp / 4);
			},
			onAfterSwitchInSelf(pokemon) {
				this.damage(pokemon.baseMaxhp / 4);
			},
		},
	},
	outrage: {
		inherit: true,
		shortDesc: "Lasts 3-4 turns. Confuses the user afterwards.",
		desc: "The user attacks on three or four turns in a row, then becomes confused for one or two turns, even under Safeguard. The hits after the first skip the accuracy check, so they cannot miss and they hit through Protect, Fly and Dig. A turn lost to sleep, freeze, flinching or a partial-trapping move does not count, and the rampage carries on afterward; full paralysis, a confusion self-hit or infatuation ends it without confusion.",
		basePower: 90,
		pp: 10,
	},
	thrash: {
		inherit: true,
		shortDesc: "Lasts 3-4 turns. Confuses the user afterwards.",
		desc: "The user attacks on three or four turns in a row, then becomes confused for one or two turns, even under Safeguard. The hits after the first skip the accuracy check, so they cannot miss and they hit through Protect, Fly and Dig. A turn lost to sleep, freeze, flinching or a partial-trapping move does not count, and the rampage carries on afterward; full paralysis, a confusion self-hit or infatuation ends it without confusion.",
	},
	petaldance: {
		inherit: true,
		shortDesc: "Lasts 3-4 turns. Confuses the user afterwards.",
		desc: "The user attacks on three or four turns in a row, then becomes confused for one or two turns, even under Safeguard. The hits after the first skip the accuracy check, so they cannot miss and they hit through Protect, Fly and Dig. A turn lost to sleep, freeze, flinching or a partial-trapping move does not count, and the rampage carries on afterward; full paralysis, a confusion self-hit or infatuation ends it without confusion.",
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
			noCopy: false,
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
		shortDesc: "For 5 turns, Water moves deal 2x and Fire moves 0.5x.",
		desc: "For 5 turns, the weather becomes Rain, even if the current weather is Rain. The damage of Water-type attacks is doubled and the damage of Fire-type attacks is halved during the effect, applied before STAB and type effectiveness.",
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
	skullbash: {
		inherit: true,
		shortDesc: "Charges turn 1. Hits turn 2.",
		desc: "This attack charges on the first turn and executes on the second. Unlike the final games, it does not raise the user's Defense while charging.",
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
	},
	stomp: {
		inherit: true,
		shortDesc: "30% chance to make the target flinch.",
		desc: "Has a 30% chance to make the target flinch. Unlike the final games, its power is not doubled against a target that used Minimize.",
		flags: { contact: 1, protect: 1, mirror: 1, metronome: 1 },
	},
	minimize: {
		inherit: true,
		shortDesc: "Raises the user's evasiveness by 1.",
		desc: "Raises the user's evasiveness by 1 stage. Unlike the final games, it has no other effect: Stomp does not deal extra damage to the user afterwards.",
		volatileStatus: undefined,
		condition: undefined,
	},
	defensecurl: {
		inherit: true,
		shortDesc: "Raises the user's Defense by 1.",
		desc: "Raises the user's Defense by 1 stage. Unlike the final games, it has no other effect: it does not boost Rollout.",
		volatileStatus: undefined,
		condition: undefined,
	},
	rest: {
		inherit: true,
		shortDesc: "User sleeps 1 turn and restores HP and status. Buggy HP check.",
		desc: "The user falls asleep and restores all of its HP, replacing any other non-volatile status condition. Its sleep counter is set to 2, so it loses its next turn and wakes up and acts on the turn after. A badly poisoned user keeps the badly-poisoned flag, so if it is poisoned again before it switches out it is badly poisoned, with the damage counter carrying on. If the user is already asleep, for example when Sleep Talk calls this move, its sleep counter is reset to 2 and it still restores all of its HP. Fails if the user is at full HP. Because of the demo's HP check bug, it also fails when the user's HP is exactly 255 or 511 below its maximum and the high byte of its HP is lower than that of its maximum HP.",
		onTry: sw97HealTry,
		onHit(target, source, move) {
			if (target.status === 'slp') {
				this.add('-status', target, 'slp', '[from] move: Rest');
			} else {
				const toxic = target.status === 'tox' ? (target.statusState.counter || 0) : undefined;
				const result = target.setStatus('slp', source, move);
				if (!result) return result;
				if (toxic !== undefined) sw97KeepToxicBit(target, toxic);
			}
			target.statusState.time = 2;
			target.statusState.startTime = 2;
			this.heal(target.maxhp); // Aesthetic only as the healing happens after you fall asleep in-game
		},
	},
	recover: {
		inherit: true,
		shortDesc: "Heals the user by 50% of its max HP. Buggy HP check.",
		desc: "The user restores 1/2 of its maximum HP. Fails if the user is at full HP. Because of the demo's HP check bug, it also fails when the user's HP is exactly 255 or 511 below its maximum and the high byte of its HP is lower than that of its maximum HP.",
		onTry: sw97HealTry,
	},
	softboiled: {
		inherit: true,
		shortDesc: "Heals the user by 50% of its max HP. Buggy HP check.",
		desc: "The user restores 1/2 of its maximum HP. Fails if the user is at full HP. Because of the demo's HP check bug, it also fails when the user's HP is exactly 255 or 511 below its maximum and the high byte of its HP is lower than that of its maximum HP.",
		onTry: sw97HealTry,
	},
	milkdrink: {
		inherit: true,
		shortDesc: "Heals the user by 50% of its max HP. Buggy HP check.",
		desc: "The user restores 1/2 of its maximum HP. Fails if the user is at full HP. Because of the demo's HP check bug, it also fails when the user's HP is exactly 255 or 511 below its maximum and the high byte of its HP is lower than that of its maximum HP.",
		onTry: sw97HealTry,
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
		shortDesc: "For 5 turns, protects user's party from major status. Not confusion.",
		desc: "For 5 turns, the user and its party members cannot have non-volatile status conditions inflicted on them by the opponent. Unlike the final games, it does not prevent confusion from moves, and a rampage move still confuses its user when it ends.",
		pp: 10,
		onTry(source, target, move) {
			if (!sw97HitsFoe(this, source, move)) return null;
		},
		condition: {
			inherit: true,
			onTryAddVolatile: undefined,
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
		shortDesc: "Normal-type. User loses 1/2 the HP lost by the target.",
		desc: "A Normal-type attack: it gets the same-type bonus for Normal-type users, type effectiveness applies, and Ghost-types are immune, in which case the user takes no recoil. If this move is successful, the user takes recoil equal to 1/2 the HP lost by the target, or 1/2 of the full damage dealt if it hits a substitute, but not less than 1 HP. Automatically used if no other move can be selected.",
		pp: 0,
		recoil: [1, 2],
		struggleRecoil: false,
		ignoreImmunity: false,
		onModifyMove(move, pokemon) {
			this.add('-activate', pokemon, 'move: Struggle');
		},
	},
	hyperbeam: {
		inherit: true,
		shortDesc: "User cannot move next turn, unless this move KOes the target.",
		desc: "If this move is successful, the user must recharge on the following turn - unless it knocks the target out, in which case no recharge is needed. The recharge is cancelled if the user is hit by the first hit of a partial-trapping move, by Bite, Bone Club, Headbutt, Hyper Fang, Low Kick, Rock Slide, Rolling Kick, Stomp or Sacred Fire (whether or not it flinches), or by a move boosted by the foe's King's Rock, unless the hit lands on its substitute; it is also cancelled when a sleep move puts the recharging user to sleep, which such a move then cannot fail to do unless the user already has a status or a substitute, or resists the move's type. If the recharge is cancelled before the user has recharged that turn, it uses Hyper Beam again instead, unless it flinched or fell asleep.",
		onAfterMove: undefined,
		onAfterMoveSecondary(target, source, move) {
			if (target && !target.hp) {
				delete source.volatiles['mustrecharge'];
			} else if (source.volatiles['mustrecharge']) {
				source.m.sw97HyperBeamCaller = move.sourceEffect || '';
				this.add('-mustrecharge', source);
			}
		},
	},
	disable: {
		inherit: true,
		shortDesc: "Disables the target's last move for 0-7 of its move attempts.",
		desc: "The target's last used move is disabled. A counter from 1 to 8 is set at random and drops by 1 each time the target tries to move, counted only on turns where it is not stopped first by sleep, freezing, a partial-trapping move, flinching or recharging; when it reaches 0 the move is usable again on that attempt, so the move stays blocked for 0 to 7 attempts. Fails if the target is already disabled, has not used a move since either Pokemon entered the field, spent its last turn asleep or frozen, last used Struggle, or that move has no PP left. Goes through substitutes.",
		onTryHit: undefined,
		condition: {
			inherit: true,
			noCopy: false,
			duration: undefined,
			durationCallback: undefined,
			onStart(pokemon) {
				const id = sw97LastCounterMove(pokemon);
				const moveSlot = id ? pokemon.getMoveData(id) : null;
				if (!moveSlot || id === 'struggle' || !moveSlot.pp) return false;
				this.effectState.move = id;
				this.effectState.slot = pokemon.moveSlots.indexOf(moveSlot);
				this.effectState.counter = this.random(1, 9);
				this.add('-start', pokemon, 'Disable', moveSlot.move);
			},
			...SW97_DISABLE_TICK_ORDER,
			onAnyBeforeMove(pokemon) {
				if (pokemon !== this.effectState.target) return;
				this.effectState.counter--;
				if (this.effectState.counter <= 0) pokemon.removeVolatile('disable');
			},
			onBeforeMovePriority: 1.5,
			onBeforeMove(attacker, defender, move) {
				if (move.id === this.effectState.move) {
					this.add('cant', attacker, 'Disable', move);
					return false;
				}
			},
			onDisableMove(pokemon) {
				const moveSlot = pokemon.moveSlots[this.effectState.slot];
				if (moveSlot) pokemon.disableMove(moveSlot.id);
			},
			onMoveAborted: undefined,
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
		shortDesc: "For 5 turns, Fire moves deal 2x and Water moves 0.5x.",
		desc: "For 5 turns, the weather becomes Sun, even if the current weather is Sun. The damage of Fire-type attacks is doubled and the damage of Water-type attacks is halved during the effect, applied before STAB and type effectiveness.",
		pp: 10,
		onTry(source, target, move) {
			if (!sw97HitsFoe(this, source, move)) return null;
		},
		type: "Normal",
	},
	swagger: {
		inherit: true,
		shortDesc: "Raises the target's Attack by 2 and confuses it.",
		desc: "Raises the target's Attack by 2 stages, then confuses it. The target is confused even if its Attack cannot rise any further; the confusion has a 1/256 chance to fail, like the demo's other 100% effects. Safeguard does not prevent the confusion. A substitute does not stop the Attack raise, only the confusion.",
		accuracy: 100,
		pp: 10,
		onTryHit: undefined,
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
		shortDesc: "Hits 1-3 times; hit 2 deals 2x, hit 3 deals 3x damage.",
		desc: "Hits one to three times, at random. Power is always 60; the second hit deals double and the third triple the base damage, applied before weather, STAB and type effectiveness and after the demo's 997 damage cap. If the user has a substitute, the second and third hits each deal four times the base damage instead. Accuracy is checked only once.",
		accuracy: 100,
		basePower: 60,
		multihit: [1,3],
		basePowerCallback: undefined,
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
		shortDesc: "Damage doubles with each hit. Repeats for 5 turns.",
		desc: "If this move is successful, the user is locked into this move and cannot make another move until it misses, 5 turns have passed, or the attack cannot be used. Its damage doubles with each successful hit, up to 16 times on the fifth hit; the doubling is applied after STAB and type effectiveness, ignores the demo's 997 damage cap, and saturates at 65535. Unlike the final games, Defense Curl does not boost it. A turn lost to sleep, freeze, flinching or a partial-trapping move does not end it.",
		accuracy: 78.5,
		pp: 10,
		basePowerCallback(pokemon, target, move) {
			const rolloutData = pokemon.volatiles['rollout'];
			if (rolloutData && pokemon.status !== 'slp') {
				rolloutData.hitCount++;
				rolloutData.contactHitCount++;
				if (rolloutData.hitCount < 5) {
					rolloutData.duration = 2;
				}
			}
			return move.basePower;
		},
		condition: {
			inherit: true,
			onMoveAborted(pokemon) {
				if (sw97TurnLost(this, pokemon)) this.effectState.duration!++;
			},
		},
	},
	furycutter: {
		inherit: true,
		accuracy: 100,
		basePower: 25,
		type: "Bug",
		shortDesc: "Damage doubles with each consecutive hit, uncapped.",
		desc: "Its damage doubles with each successful consecutive use, with no cap (1x, 2x, 4x, 8x, and so on); the doubling is applied after STAB and type effectiveness, ignores the demo's 997 damage cap, and saturates at 65535. A miss resets it, and so does choosing any other move. The demo's counter has no limit, unlike the final game's cap - the decomp marks this as a bug, and this format keeps it. A turn lost to sleep, freeze, flinching or a partial-trapping move does not break the streak when Fury Cutter was the move chosen that turn.",
		basePowerCallback: undefined,
		condition: {
			duration: 2,
			onStart() {
				this.effectState.count = 1;
			},
			onRestart() {
				this.effectState.count++;
				this.effectState.duration = 2;
			},
			onMoveAborted(pokemon, target, move) {
				if (move.id === 'furycutter' && sw97TurnLost(this, pokemon)) this.effectState.duration!++;
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
		desc: "If this move hits, the user is released from the foe's partial-trapping move, even if the hit lands on the foe's substitute. It is the only move that can be used while trapped. It does not free the user if it fails to affect a Ghost-type trapper. It does not remove Leech Seed or Spikes.",
		pp: 10,
		onAfterHit: undefined,
		onAfterSubDamage: undefined,
		self: {
			onHit(pokemon) {
				const trapped = pokemon.volatiles['partiallytrapped'];
				const freed = pokemon.foes().some(foe => foe.volatiles['partialtrappinglock']?.locked === pokemon);
				if (freed && trapped) trapped.spun = true;
				for (const foe of pokemon.foes()) {
					foe.removeVolatile('partialtrappinglock');
				}
				if (pokemon.volatiles['partiallytrapped']) {
					pokemon.removeVolatile('partiallytrapped');
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
		flags: { protect: 1, mirror: 1, metronome: 1 },
		volatileStatus: undefined,
		pseudoWeather: undefined,
		condition: undefined,
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
		desc: "The user attacks for two to five turns in a row (37.5% chance each for 2 or 3 turns, 12.5% chance each for 4 or 5); while trapped, the target cannot use any move except Rapid Spin (Gen 1-style trapping) and takes no end-of-turn damage. Follow-up hits do not check accuracy or use PP, and each recalculates damage and can be a critical hit. The trap ends the moment the final hit lands, if either Pokemon leaves the field, if the target uses Rapid Spin, or if the user is prevented from attacking (by full paralysis, confusion, or infatuation); the target can act normally from then on, including on that very turn. If the first hit lands on a Pokemon recharging from Hyper Beam, the recharge turn is skipped; a missed use does not skip it. A Ghost-type is still trapped but takes no damage from any of its hits, unless Foresight has been used on it.",
		accuracy: 85,
		ignoreImmunity: true,
		self: {
			volatileStatus: 'partialtrappinglock',
		},
	},
	bind: {
		inherit: true,
		shortDesc: "Traps the target for 2-5 turns; it can only use Rapid Spin meanwhile.",
		desc: "The user attacks for two to five turns in a row (37.5% chance each for 2 or 3 turns, 12.5% chance each for 4 or 5); while trapped, the target cannot use any move except Rapid Spin (Gen 1-style trapping) and takes no end-of-turn damage. Follow-up hits do not check accuracy or use PP, and each recalculates damage and can be a critical hit. The trap ends the moment the final hit lands, if either Pokemon leaves the field, if the target uses Rapid Spin, or if the user is prevented from attacking (by full paralysis, confusion, or infatuation); the target can act normally from then on, including on that very turn. If the first hit lands on a Pokemon recharging from Hyper Beam, the recharge turn is skipped; a missed use does not skip it. A Ghost-type is still trapped but takes no damage from any of its hits, unless Foresight has been used on it.",
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
	barrage: {
		inherit: true,
		shortDesc: "Hits 2-5 times in one turn, about 1/4 each.",
		desc: "Hits two to five times, each about equally likely: two or three hits 64.5/256 each, four or five hits 63.5/256 each. If one of the hits breaks the target's substitute, it will take damage for the remaining hits.",
	},
	cometpunch: {
		inherit: true,
		shortDesc: "Hits 2-5 times in one turn, about 1/4 each.",
		desc: "Hits two to five times, each about equally likely: two or three hits 64.5/256 each, four or five hits 63.5/256 each. If one of the hits breaks the target's substitute, it will take damage for the remaining hits.",
	},
	doubleslap: {
		inherit: true,
		shortDesc: "Hits 2-5 times in one turn, about 1/4 each.",
		desc: "Hits two to five times, each about equally likely: two or three hits 64.5/256 each, four or five hits 63.5/256 each. If one of the hits breaks the target's substitute, it will take damage for the remaining hits.",
	},
	furyattack: {
		inherit: true,
		shortDesc: "Hits 2-5 times in one turn, about 1/4 each.",
		desc: "Hits two to five times, each about equally likely: two or three hits 64.5/256 each, four or five hits 63.5/256 each. If one of the hits breaks the target's substitute, it will take damage for the remaining hits.",
	},
	furyswipes: {
		inherit: true,
		shortDesc: "Hits 2-5 times in one turn, about 1/4 each.",
		desc: "Hits two to five times, each about equally likely: two or three hits 64.5/256 each, four or five hits 63.5/256 each. If one of the hits breaks the target's substitute, it will take damage for the remaining hits.",
	},
	pinmissile: {
		inherit: true,
		shortDesc: "Hits 2-5 times in one turn, about 1/4 each.",
		desc: "Hits two to five times, each about equally likely: two or three hits 64.5/256 each, four or five hits 63.5/256 each. If one of the hits breaks the target's substitute, it will take damage for the remaining hits.",
	},
	spikecannon: {
		inherit: true,
		shortDesc: "Hits 2-5 times in one turn, about 1/4 each.",
		desc: "Hits two to five times, each about equally likely: two or three hits 64.5/256 each, four or five hits 63.5/256 each. If one of the hits breaks the target's substitute, it will take damage for the remaining hits.",
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
		shortDesc: "User switches, passing stat changes and all volatile effects.",
		desc: "The user is replaced with another Pokemon in its party. The demo never resets the user's battle flags on a Baton Pass, so the replacement receives all of them: stat stage changes, confusion, infatuation, Curse, Nightmare (which then hurts it every turn, asleep or not, until it wakes up), Focus Energy, Foresight, Leech Seed, Lock-On (Mind Reader), Mist, Perish Song, Reflect (Light Screen), the trapper or trapped effects of Mean Look (Spider Web), a substitute with its remaining HP, Protect (Detect), Endure and Destiny Bond while they last, Disable (the move in the same move slot cannot be selected and the disabled move fails if used) and Encore. Baton Pass also stays the last move used, so a passed Encore forces the replacement to use Baton Pass, taking PP from the move in the slot the user chose Baton Pass from. If the user was badly poisoned, a poisoned replacement becomes badly poisoned and its damage counter carries on from the user's; any other replacement keeps the badly-poisoned flag, so if it is poisoned later it is badly poisoned with the counter carrying on, unless Haze or a normal switch clears the flag first. If the user was transformed, the replacement's PP use is not saved and its PP is restored when it leaves the field.",
		pp: 10,
		self: {volatileStatus: 'swbatonboost'},
	},
	encore: {
		inherit: true,
		shortDesc: "From next turn, the target repeats its last move for 2-5 turns.",
		desc: "Starting with the target's next move choice, it is forced to repeat its last move for 2 to 5 turns; the move it already chose this turn is not replaced. Struggle, Mirror Move and Encore itself can be encored. Fails if the target has not used a move since either Pokemon entered the field, spent its last turn asleep or frozen, or is already encored. The effect ends early if the encored move runs out of PP or the target spends a turn asleep or frozen. A Pokemon brought in by Baton Pass counts Baton Pass as its last move, and Baton Pass passes Encore itself.",
		pp: 10,
		flags: { protect: 1, mirror: 1, bypasssub: 1, metronome: 1 },
		condition: {
			inherit: true,
			noCopy: false,
			onStart(target) {
				const forced = sw97LastCounterMove(target);
				if (!forced || forced === 'sw97unused') return false;
				const slotMove = target.m.sw97SlotMove && target.hasMove(target.m.sw97SlotMove) ? target.m.sw97SlotMove : forced;
				if (!target.hasMove(slotMove) && forced !== 'struggle') return false;
				this.effectState.move = slotMove;
				this.effectState.forced = forced;
				this.effectState.startTurn = this.turn;
				this.add('-start', target, 'Encore');
			},
			onOverrideAction(pokemon, target, move) {
				if (this.turn === this.effectState.startTurn) return;
				const forced = this.effectState.forced;
				if (forced !== this.effectState.move && pokemon.hasMove(this.effectState.move)) {
					pokemon.m.sw97PPCaller = this.effectState.move;
				}
				if (move.id !== forced) return forced;
			},
			onResidual(target) {
				const latest = sw97LastCounterMove(target);
				if (latest && latest !== 'sw97unused') {
					const slot = target.m.sw97SlotMove && target.hasMove(target.m.sw97SlotMove) ? target.m.sw97SlotMove : latest;
					if (target.hasMove(slot) || latest === 'struggle') {
						this.effectState.forced = latest;
						this.effectState.move = slot;
					}
				}
				const moveSlot = target.getMoveData(this.effectState.move);
				if ((this.effectState.forced !== 'struggle' && (!moveSlot || moveSlot.pp <= 0)) ||
					!sw97LastCounterMove(target)) {
					target.removeVolatile('encore');
				}
			},
		},
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
	spiderweb: {
		inherit: true,
		shortDesc: "Target can't switch out until it leaves the field.",
		desc: "Prevents the target from switching out. The target can still leave the field by using Baton Pass, and the replacement remains trapped. The effect ends when the trapped Pokemon leaves the field any other way (such as fainting); the user switching out or fainting does not end it. Fails if the target is already trapped.",
		onHit(target, source, move) {
			return target.addVolatile('trapped', source, move);
		},
	},
	haze: {
		inherit: true,
		shortDesc: "Resets both actives' stat stages; also cures the target's status.",
		desc: "Resets the stat stages of the user and the target to 0 and removes confusion, Disable, Mist, Focus Energy, Leech Seed, and the effects of Reflect and Light Screen from both. The target is also cured of its non-volatile status condition, and if the user is badly poisoned it becomes regular poison. A target woken up or thawed this way loses its move that turn if it had not moved yet. Both lose the badly-poisoned flag, but a target woken up this way keeps its Nightmare and keeps taking Nightmare damage every turn.",
		target: "normal",
		onHit(target, source) {
			this.add('-activate', source, 'move: Haze');
			for (const pokemon of [source, target]) {
				pokemon.clearBoosts();
				this.add('-clearboost', pokemon);
				for (const vol of ['confusion', 'disable', 'mist', 'focusenergy', 'leechseed', 'swreflect', 'swtoxic']) {
					if (pokemon.removeVolatile(vol) && SW97_HAZE_END[vol]) {
						this.add('-end', pokemon, SW97_HAZE_END[vol], '[silent]');
					}
				}
			}
			const skipsTurn = ['slp', 'frz'].includes(target.status) && !!this.queue.willMove(target);
			if (target.status && target.hp) {
				this.add('-curestatus', target, target.status, '[msg]');
				target.setStatus('');
			}
			if (skipsTurn) this.queue.cancelMove(target);
			if (source.status === 'tox' && !source.setStatus('psn')) {
				source.status = 'psn' as ID;
				this.add('-status', source, 'psn');
			}
			if (source.m.extraStatuses?.includes('tox')) {
				source.removeVolatile('multistatustox');
				source.m.extraStatuses = source.m.extraStatuses.map((id: string) => (id === 'tox' ? 'psn' : id));
				source.addVolatile('multistatuspsn');
			}
		},
	},
	reflect: {
		num: 115,
		shortDesc: "Doubles user's Defense vs physical moves until it leaves the field.",
		desc: "While active, the user's Defense is doubled against physical-type moves (and against its own confusion self-hits). Critical hits ignore this effect. Personal to the user with no turn limit: it lasts until the user leaves the field or is hit by Haze, and Baton Pass passes it to the replacement. Fails if the user already has this effect.",
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
		desc: "Identical to the demo's Reflect: while active, the user's Defense is doubled against physical-type moves. It does not reduce special damage at all. Personal to the user with no turn limit; it ends when the user leaves the field or is hit by Haze, Baton Pass passes it to the replacement, and it does not stack with Reflect.",
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
		desc: "The user takes 1/4 of its maximum HP, rounded down, to create a substitute. It can be made with exactly 1/4 HP remaining, causing the user to faint. The substitute blocks most status moves, stat-lowering moves, confusion, and Lock-On effects, but paralysis-inducing moves and Leech Seed go through it, and Swagger still raises Attack through it without confusing. It does not free the user from a partial-trapping move. It breaks only when a hit deals more damage than it has HP left, so a substitute brought to exactly 0 HP stays up until the next damaging hit. Recoil and draining moves that hit the substitute use the full damage dealt, even if it is more than the substitute had left.",
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
			},
			onTryPrimaryHit(target, source, move) {
				if (target === source || move.flags['bypasssub'] || move.infiltrates) {
					return;
				}
				if (move.category === 'Status') {
					const blockedStatus = !!move.status && move.status !== 'par';
					const blockedOther = move.id !== 'swagger' && ((!!move.boosts && !move.secondaries) ||
						move.volatileStatus === 'confusion' || ['lockon', 'mindreader', 'nightmare', 'detect'].includes(move.id));
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
				const fullDamage = damage;
				if (target.volatiles['bide']) {
					target.volatiles['bide'].totalDamage = Math.min(target.volatiles['bide'].totalDamage + damage, 0xffff);
				}
				const broken = damage > target.volatiles['substitute'].hp;
				if (broken) {
					damage = target.volatiles['substitute'].hp as number;
				}
				target.volatiles['substitute'].hp -= damage;
				source.lastDamage = damage;
				if (broken) {
					target.removeVolatile('substitute');
				} else {
					this.add('-activate', target, 'move: Substitute', '[damage]');
				}
				if (move.recoil) {
					this.damage(this.actions.calcRecoilDamage(fullDamage, move, source), source, target, 'recoil');
				} else if (fullDamage) {
					this.actions.applyRecoilDamage(fullDamage, move, source);
				}
				if (move.drain) {
					this.heal(Math.max(1, Math.floor(fullDamage * move.drain[0] / move.drain[1])), source, target, 'drain');
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
		shortDesc: "Cures the user's status condition and Nightmare.",
		desc: "The SpaceWorld 1997 demo's prototype of Heal Bell: it cures the user's own status condition and ends its Nightmare, but does not affect the rest of the party. Fails if the user has no status condition, even if it has a Nightmare. A badly poisoned user is cured but keeps the badly-poisoned flag, so if it is poisoned again before it switches out it is badly poisoned, with the damage counter carrying on.",
		onHit(pokemon) {
			if (!pokemon.status) return false;
			const toxic = pokemon.status === 'tox' ? (pokemon.statusState.counter || 0) : undefined;
			this.add('-curestatus', pokemon, pokemon.status, '[msg]');
			pokemon.setStatus('');
			if (pokemon.removeVolatile('nightmare')) this.add('-end', pokemon, 'Nightmare');
			if (toxic !== undefined) sw97KeepToxicBit(pokemon, toxic);
		},
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
		shortDesc: "Target can't switch out until it leaves the field.",
		desc: "Prevents the target from switching out. The target can still leave the field by using Baton Pass, and the replacement remains trapped. The effect ends when the trapped Pokemon leaves the field any other way (such as fainting); the user switching out or fainting does not end it. Fails if the target is already trapped.",
		onHit(target, source, move) {
			return target.addVolatile('trapped', source, move);
		},
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
