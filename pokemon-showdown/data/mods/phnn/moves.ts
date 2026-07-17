const PHNN_SHADOW_MOVE_IDS = ['shadowrush', 'shadowblast', 'shadowblitz', 'shadowbreak', 'shadowend', 'shadowbolt', 'shadowchill', 'shadowfire', 'shadowstorm', 'shadowwave', 'shadowrave', 'shadowdown', 'shadowmist', 'shadowpanic', 'shadowhold', 'shadowhalf', 'shadowshed', 'shadowsky'];
function phnnIsShadowMon(target: any): boolean {
	if (!target) return false;
	if (target.hasType('Shadow')) return true;
	return target.moveSlots.some((s: any) => PHNN_SHADOW_MOVE_IDS.includes(s.id));
}
export const Moves: import('../../../sim/dex-moves').ModdedMoveDataTable = {
	spore: {
		inherit: true,
		flags: { protect: 1, reflectable: 1, mirror: 1, metronome: 1 },
	},
	electricterrain: {
		inherit: true,
		condition: {
			effectType: 'Terrain',
			duration: 5,
			durationCallback(source, effect) {
				if (source?.hasItem('terrainextender')) {
					return 8;
				}
				return 5;
			},
			onSetStatus(status, target, source, effect) {
				if (status.id === 'slp' && target.isGrounded() && !target.isSemiInvulnerable()) {
					if (effect.id === 'yawn' || (effect.effectType === 'Move' && !effect.secondaries)) {
						this.add('-activate', target, 'move: Electric Terrain');
					}
					return false;
				}
			},
			onTryAddVolatile(status, target) {
				if (!target.isGrounded() || target.isSemiInvulnerable()) return;
				if (status.id === 'yawn') {
					this.add('-activate', target, 'move: Electric Terrain');
					return null;
				}
			},
			onBasePowerPriority: 6,
			onBasePower(basePower, attacker, defender, move) {
				if (move.type === 'Electric' && attacker.isGrounded() && !attacker.isSemiInvulnerable()) {
					return this.chainModify([6144, 4096]);
				}
			},
			onFieldStart(field, source, effect) {
				if (effect?.effectType === 'Ability') {
					this.add('-fieldstart', 'move: Electric Terrain', '[from] ability: ' + effect.name, `[of] ${source}`);
				} else {
					this.add('-fieldstart', 'move: Electric Terrain');
				}
			},
			onFieldResidualOrder: 27,
			onFieldResidualSubOrder: 7,
			onFieldEnd() {
				this.add('-fieldend', 'move: Electric Terrain');
			},
		},
	},
	grassyterrain: {
		inherit: true,
		condition: {
			effectType: 'Terrain',
			duration: 5,
			durationCallback(source, effect) {
				if (source?.hasItem('terrainextender')) {
					return 8;
				}
				return 5;
			},
			onBasePowerPriority: 6,
			onBasePower(basePower, attacker, defender, move) {
				const weakenedMoves = ['earthquake', 'bulldoze', 'magnitude'];
				if (weakenedMoves.includes(move.id) && defender.isGrounded() && !defender.isSemiInvulnerable()) {
					return this.chainModify(0.5);
				}
				if (move.type === 'Grass' && attacker.isGrounded()) {
					return this.chainModify([6144, 4096]);
				}
			},
			onFieldStart(field, source, effect) {
				if (effect?.effectType === 'Ability') {
					this.add('-fieldstart', 'move: Grassy Terrain', '[from] ability: ' + effect.name, `[of] ${source}`);
				} else {
					this.add('-fieldstart', 'move: Grassy Terrain');
				}
			},
			onResidualOrder: 5,
			onResidualSubOrder: 2,
			onResidual(pokemon) {
				if (pokemon.isGrounded() && !pokemon.isSemiInvulnerable()) {
					this.heal(pokemon.baseMaxhp / 16, pokemon, pokemon);
				}
			},
			onFieldResidualOrder: 27,
			onFieldResidualSubOrder: 7,
			onFieldEnd() {
				this.add('-fieldend', 'move: Grassy Terrain');
			},
		},
	},
	psychicterrain: {
		inherit: true,
		condition: {
			effectType: 'Terrain',
			duration: 5,
			durationCallback(source, effect) {
				if (source?.hasItem('terrainextender')) {
					return 8;
				}
				return 5;
			},
			onTryHitPriority: 4,
			onTryHit(target, source, effect) {
				if (effect && (effect.priority <= 0.1 || effect.target === 'self')) {
					return;
				}
				if (target.isSemiInvulnerable() || target.isAlly(source)) return;
				if (!target.isGrounded()) {
					const baseMove = this.dex.moves.get(effect.id);
					if (baseMove.priority > 0) {
						this.hint("Psychic Terrain doesn't affect airborne Pokémon.");
					}
					return;
				}
				this.add('-activate', target, 'move: Psychic Terrain');
				return null;
			},
			onBasePowerPriority: 6,
			onBasePower(basePower, attacker, defender, move) {
				if (move.type === 'Psychic' && attacker.isGrounded() && !attacker.isSemiInvulnerable()) {
					return this.chainModify([6144, 4096]);
				}
			},
			onFieldStart(field, source, effect) {
				if (effect?.effectType === 'Ability') {
					this.add('-fieldstart', 'move: Psychic Terrain', '[from] ability: ' + effect.name, `[of] ${source}`);
				} else {
					this.add('-fieldstart', 'move: Psychic Terrain');
				}
			},
			onFieldResidualOrder: 27,
			onFieldResidualSubOrder: 7,
			onFieldEnd() {
				this.add('-fieldend', 'move: Psychic Terrain');
			},
		},
	},
	leechseed: {
		inherit: true,
		onTryImmunity: undefined,
		shortDesc: "1/8 of target's max HP drained each turn. Hits Grass-types.",
		desc: "Plants a seed on the target that drains 1/8 of its maximum HP each turn, restoring the same amount to the user, and the drain scales with Toxic's counter in No Nerfs. Unlike other generations, Grass-type Pokemon are NOT immune (SpaceWorld '97 behavior).",
		condition: {
			onStart(target) {
				this.add('-start', target, 'move: Leech Seed');
			},
			onResidualOrder: 8,
			onResidual(pokemon) {
				const target = this.getAtSlot(pokemon.volatiles['leechseed'].sourceSlot);
				if (!target || target.fainted || target.hp <= 0) {
					return;
				}
				let factor = pokemon.baseMaxhp / 8;
				if (pokemon.status === 'tox' && pokemon.statusState.stage) {
					factor = (pokemon.baseMaxhp / 16) * pokemon.statusState.stage;
				}
				const damage = this.damage(this.clampIntRange(Math.floor(factor), 1), pokemon, target);
				if (damage) {
					this.heal(damage, target, pokemon);
				}
			},
		},
	},
    nihillight: {
		inherit: true,
		basePower: 200,
		ignoreEvasion: false,
        ignoreImmunity: { 'Dragon': true },
		shortDesc: "Ignores target's stat/Sp. Def boosts; ignores Fairy's immunity to Dragon (hits Fairy types).",
		desc: "Damage ignores the target's stat stage changes and Special Defense boosts. Ignores Fairy's immunity to Dragon, so it can hit Fairy types; a Fairy/Dragon target is treated as Dragon-only and takes super-effective damage.",
	},
	highjumpkick: {
		inherit: true,
		pp: 20,
		hasCrashDamage: undefined,
		onMoveFail: undefined,
		shortDesc: "No crash damage on miss (SpaceWorld '97 behavior).",
		desc: "Unlike other generations, the user takes no crash damage if this move misses or fails, matching its SpaceWorld '97 demo behavior.",
	},
	surf: {
		inherit: true,
		basePower: 95,
		target: "allAdjacentFoes",
		shortDesc: "Hits all adjacent foes.",
		desc: "Hits all adjacent opposing Pokemon, but does not hit adjacent allies.",
	},
	thunderbolt: {
		inherit: true,
		basePower: 95,
	},
	flamethrower: {
		inherit: true,
		basePower: 95,
	},
	icebeam: {
		inherit: true,
		basePower: 95,
	},
	psychic: {
		inherit: true,
		basePower: 90,
		secondary: {
			chance: 33.2,
			boosts: {
				spa: -1,
				spd: -1,
			},
		},
		shortDesc: "33.2% chance to lower the target's Sp. Atk and Sp. Def by 1.",
		desc: "Has a 33.2% chance to lower the target's Special Attack and Special Defense by 1 stage each.",
	},
	muddywater: {
		inherit: true,
		basePower: 95,
	},
	blizzard: {
		inherit: true,
		basePower: 120,
		accuracy: 90,
		secondary: {
			chance: 30,
			status: 'frz',
		},
		shortDesc: "30% chance to freeze the target.",
		desc: "Has a 30% chance to freeze the target.",
	},
	hydropump: {
		inherit: true,
		basePower: 120,
	},
	thunder: {
		inherit: true,
		basePower: 120,
	},
	fireblast: {
		inherit: true,
		basePower: 120,
		secondary: {
			chance: 30,
			status: 'brn',
		},
		shortDesc: "30% chance to burn the target.",
		desc: "Has a 30% chance to burn the target.",
	},
	hurricane: {
		inherit: true,
		basePower: 120,
	},
	dracometeor: {
		inherit: true,
		basePower: 140,
	},
	leafstorm: {
		inherit: true,
		basePower: 140,
	},
	overheat: {
		inherit: true,
		basePower: 140,
	},
	skyattack: {
		inherit: true,
		basePower: 200,
	},
	solarbeam: {
		inherit: true,
		basePower: 200,
		onBasePower: undefined,
		shortDesc: "Charges turn 1, hits turn 2. No charge in sun. Never weakened by weather.",
		desc: "This attack charges on the first turn and executes on the second. If the weather is sunny, the move completes in one turn. Unlike other generations, its damage is never halved by rain, sandstorm, hail, or snow.",
	},
	magmastorm: {
		inherit: true,
		basePower: 120,
	},
	glaciallance: {
		inherit: true,
		basePower: 130,
	},
	dig: {
		inherit: true,
		basePower: 100,
		condition: {
			duration: 2,
			onInvulnerability(target, source, move) {
				if (['earthquake', 'fissure', 'swift'].includes(move.id)) {
					return;
				}
				return false;
			},
		},
		shortDesc: "Digs underground turn 1, strikes turn 2. Only EQ/Fissure/Swift can hit.",
		desc: "This attack charges on the first turn and executes on the second. While underground, only Earthquake, Fissure, and Swift can hit the user, and none of them deal doubled damage (SpaceWorld '97 behavior - Magnitude cannot reach the user at all).",
	},
	fly: {
		inherit: true,
		condition: {
			duration: 2,
			onInvulnerability(target, source, move) {
				if (['whirlwind', 'thunder', 'swift'].includes(move.id)) {
					return;
				}
				return false;
			},
		},
		shortDesc: "Flies up turn 1, strikes turn 2. Only Whirlwind/Thunder/Swift can hit.",
		desc: "This attack charges on the first turn and executes on the second. While airborne, only Whirlwind, Thunder, and Swift can hit the user, and none of them deal doubled damage (SpaceWorld '97 behavior - Gust and Twister cannot reach the user at all).",
	},
	counter: {
		inherit: true,
		accuracy: true,
		priority: -1,
		ignoreImmunity: true,
		onTry: undefined,
		damageCallback(pokemon, target) {
			if (pokemon.volatiles['counter'] && pokemon.volatiles['counter'].damage) {
				return pokemon.volatiles['counter'].damage;
			}
			const lastMove = target.lastMove;
			if (!lastMove || lastMove.id === 'counter' || !lastMove.basePower) return false;
			let moveType = lastMove.type;
			if (lastMove.id === 'hiddenpower') moveType = target.hpType || 'Dark';
			const specialTypes = ['Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark'];
			if (specialTypes.includes(moveType)) return false;
			if (!this.lastDamage) return false;
			return this.clampIntRange(2 * this.lastDamage, 1, 65535);
		},
		shortDesc: "2x damage taken this turn, or 2x the target's last physical-type hit (any turn). Never misses; hits Ghosts; priority -1.",
		desc: "Deals double the damage the user took from a physical attack this turn; if the user was not hit this turn, it instead deals double the damage of the target's last physical-band move, even from a previous turn (SpaceWorld '97 behavior - moves of the Fire, Water, Grass, Electric, Psychic, Ice, Dragon, and Dark types cannot be countered this way). This move never misses, can hit Ghost-types, and has -1 priority instead of -5.",
	},
	heatwave: {
		inherit: true,
		basePower: 100,
	},
	meteormash: {
		inherit: true,
		basePower: 100,
	},
	aurasphere: {
		inherit: true,
		basePower: 90,
	},
	dragonpulse: {
		inherit: true,
		basePower: 90,
	},
	suckerpunch: {
		inherit: true,
		basePower: 80,
	},
	wickedblow: {
		inherit: true,
		basePower: 80,
	},
	megadrain: {
		inherit: true,
		basePower: 75,
	},
	grassyglide: {
		inherit: true,
		basePower: 70,
	},
	tackle: {
		inherit: true,
		basePower: 50,
	},
	feint: {
		inherit: true,
		basePower: 50,
	},
	absorb: {
		inherit: true,
		basePower: 40,
	},

	hypnosis: {
		inherit: true,
		accuracy: 70,
	},
	darkvoid: {
		inherit: true,
		accuracy: 80,
	},
	swagger: {
		inherit: true,
		accuracy: 100,
	},
	willowisp: {
		inherit: true,
		accuracy: 100,
	},
	thunderwave: {
		inherit: true,
		accuracy: 100,
	},
	bide: {
		inherit: true,
		accuracy: true,
	},
	memento: {
		inherit: true,
		accuracy: true,
	},
	nightmare: {
		inherit: true,
		accuracy: true,
	},

	acidarmor: {
		inherit: true,
		pp: 40,
	},
	covet: {
		inherit: true,
		pp: 40,
	},
	growth: {
		inherit: true,
		pp: 40,
	},
	barrier: {
		inherit: true,
		pp: 30,
	},
	extrasensory: {
		inherit: true,
		pp: 30,
	},
	swordsdance: {
		inherit: true,
		pp: 30,
	},
	tailwind: {
		inherit: true,
		pp: 30,
	},
	jumpkick: {
		inherit: true,
		pp: 25,
		hasCrashDamage: undefined,
		onMoveFail: undefined,
		shortDesc: "No crash damage on miss (SpaceWorld '97 behavior).",
		desc: "Unlike other generations, the user takes no crash damage if this move misses or fails, matching its SpaceWorld '97 demo behavior.",
	},
	submission: {
		inherit: true,
		pp: 25,
	},
	recover: {
		inherit: true,
		pp: 20,
	},
	hijumpkick: {
		inherit: true,
		pp: 20,
	},
	petaldance: {
		inherit: true,
		pp: 20,
	},
	thrash: {
		inherit: true,
		pp: 20,
	},
	airslash: {
		inherit: true,
		pp: 20,
	},
	minimize: {
		inherit: true,
		pp: 20,
	},
	sacredsword: {
		inherit: true,
		pp: 20,
	},
	futuresight: {
		inherit: true,
		pp: 15,
	},
	outrage: {
		inherit: true,
		pp: 15,
	},
	synchronoise: {
		inherit: true,
		pp: 15,
	},
	barbbarrage: {
		inherit: true,
		pp: 15,
	},
	bittermalice: {
		inherit: true,
		pp: 15,
	},
	triplearrows: {
		inherit: true,
		pp: 15,
	},
	lunarblessing: {
		inherit: true,
		pp: 10,
		boosts: {
			evasion: 1,
		},
		shortDesc: "Heals the user and its party, and raises the user's evasion by 1.",
		desc: "The user and its allies are healed and the user's evasion is raised by 1 stage.",
	},
	milkdrink: {
		inherit: true,
		pp: 10,
	},
	rest: {
		inherit: true,
		pp: 10,
	},
	roost: {
		inherit: true,
		pp: 10,
	},
	shoreup: {
		inherit: true,
		pp: 10,
	},
	slackoff: {
		inherit: true,
		pp: 10,
	},
	softboiled: {
		inherit: true,
		pp: 10,
	},

	sludge: {
		inherit: true,
		secondary: {
			chance: 40,
			status: 'psn',
		},
		shortDesc: "40% chance to poison the target.",
		desc: "Has a 40% chance to poison the target.",
	},
	acid: {
		inherit: true,
		secondary: {
			chance: 33.2,
			boosts: {
				def: -1,
			},
		},
		shortDesc: "33.2% chance to lower the target's Defense by 1.",
		desc: "Has a 33.2% chance to lower the target's Defense by 1 stage.",
	},
	aurorabeam: {
		inherit: true,
		secondary: {
			chance: 33.2,
			boosts: {
				atk: -1,
			},
		},
		shortDesc: "33.2% chance to lower the target's Attack by 1.",
		desc: "Has a 33.2% chance to lower the target's Attack by 1 stage.",
	},
	bubble: {
		inherit: true,
		secondary: {
			chance: 33.2,
			boosts: {
				spe: -1,
			},
		},
		shortDesc: "33.2% chance to lower the target's Speed by 1.",
		desc: "Has a 33.2% chance to lower the target's Speed by 1 stage.",
	},
	bubblebeam: {
		inherit: true,
		secondary: {
			chance: 33.2,
			boosts: {
				spe: -1,
			},
		},
		shortDesc: "33.2% chance to lower the target's Speed by 1.",
		desc: "Has a 33.2% chance to lower the target's Speed by 1 stage.",
	},
	constrict: {
		inherit: true,
		secondary: {
			chance: 33.2,
			boosts: {
				spe: -1,
			},
		},
		shortDesc: "33.2% chance to lower the target's Speed by 1.",
		desc: "Has a 33.2% chance to lower the target's Speed by 1 stage.",
	},
	razorwind: {
		inherit: true,
		critRatio: 2,
		shortDesc: "Charges turn 1. Hits turn 2. High critical hit ratio.",
		desc: "Has an increased chance for a critical hit. This attack charges on the first turn and executes on the second.",
	},
	kingsshield: {
		inherit: true,
		condition: {
			duration: 1,
			onStart(target, source, move) {
				this.add('-singleturn', target, 'Protect');
			},
			onTryHitPriority: 3,
			onTryHit(target, source, move) {
				if (!move.flags['protect']) {
					if (['gmaxoneblow', 'gmaxrapidflow'].includes(move.id)) return;
					if (move.isZ || move.isMax) target.getMoveHitData(move).bypassProtect = true;
					return;
				}
				if (move.smartTarget) {
					move.smartTarget = false;
				} else {
					this.add('-activate', target, 'move: Protect');
				}
				const lockedmove = source.getVolatile('lockedmove');
				if (lockedmove) {
					// Outrage counter is reset
					if (source.volatiles['lockedmove'].duration === 2) {
						delete source.volatiles['lockedmove'];
					}
				}
				if (move.flags['contact']) {
					this.boost({atk: -2}, source, target, this.dex.getActiveMove("King's Shield"));
				}
				return this.NOT_FAIL;
			},
			onHit(target, source, move) {
				if (move.isZOrMaxPowered && move.flags['contact']) {
					this.boost({atk: -2}, source, target, this.dex.getActiveMove("King's Shield"));
				}
			},
		},
		shortDesc: "Protects from damaging attacks. Contact: lowers Atk by 2.",
		desc: "The user is protected from most attacks made by other Pokemon during this turn, and Pokemon that make contact with the user have their Attack lowered by 2 stages. This move has a 1/X chance of being successful, where X starts at 1 and triples each time this move is successfully used. X resets to 1 if this move fails, if the user's last move used is not Baneful Bunker, Detect, Endure, King's Shield, Max Guard, Obstruct, Protect, Quick Guard, Silk Trap, Spiky Shield, or Wide Guard, or if it was one of those moves and the user's protection was broken. Fails if the user moves last this turn.",
	},
	amnesia: {
		inherit: true,
		boosts: {
			spa: 2,
			spd: 2,
		},
		shortDesc: "Raises the user's Sp. Atk and Sp. Def by 2.",
		desc: "Raises the user's Special Attack and Special Defense by 2 stages each.",
	},
	doubleedge: {
		inherit: true,
		recoil: [1, 4],
		shortDesc: "Has 1/4 recoil.",
		desc: "If the target lost HP, the user takes recoil damage equal to 1/4 the HP lost by the target, rounded half up, but not less than 1 HP.",
	},
	firefang: {
		inherit: true,
		onEffectiveness(typeMod, target, type) {
			if (target?.hasAbility('wonderguard')) return 1;
		},
		shortDesc: "10% burn + 10% flinch. Hits through Wonder Guard.",
		desc: "Has a 10% chance to burn the target and a 10% chance to make it flinch. This move can hit a target with the Wonder Guard ability regardless of type effectiveness.",
	},
	hyperbeam: {
		inherit: true,
		onAfterMove(pokemon, target, move) {
			if (target.fainted) return;
			pokemon.addVolatile('mustrecharge');
		},
		shortDesc: "User cannot move next turn, unless this KOes the target.",
		desc: "If this move is successful, the user must recharge on the following turn and cannot select a move. The user does not need to recharge if this move knocks out the target.",
	},
	sheercold: {
		inherit: true,
		ohko: true,
		shortDesc: "OHKOs the target. Ice types are not immune.",
		desc: "Deals damage to the target equal to the target's maximum HP, causing a one-hit KO. Ignores accuracy and evasion modifiers. Fails if the user is a lower level than the target. Unlike in standard play, Ice-type Pokemon are not immune to this move.",
	},
	superfang: {
	inherit: true,
	ignoreImmunity: {'Normal': true},
		shortDesc: "Halves the target's current HP. Hits Ghost types.",
		desc: "Deals damage to the target equal to half of its current HP, rounded down, but not less than 1 HP. This move can hit Ghost types.",
	},

	roar: {
		inherit: true,
		priority: -1,
	},
	whirlwind: {
		inherit: true,
		priority: -1,
	},
	followme: {
		inherit: true,
		priority: 3,
	},
	ragepowder: {
		inherit: true,
		priority: 3,
	},

	selfdestruct: {
		inherit: true,
		selfdestruct: undefined,
		onBasePowerPriority: 6,
		onBasePower(basePower, attacker, defender, move) {
			return this.chainModify(2);
		},
		onAfterMove(pokemon) {
			if (!pokemon.hp) return;
			const chip = pokemon.hp <= 255 ? pokemon.hp : pokemon.hp % 256;
			if (chip) this.directDamage(chip, pokemon);
			if (!pokemon.hp) return;
			if (pokemon.status) pokemon.cureStatus();
			pokemon.removeVolatile('leechseed');
			pokemon.maxhp = this.clampIntRange(pokemon.maxhp % 256, 1);
		},
		shortDesc: "2x damage. User survives at 256+ HP but its Max HP collapses to (max % 256); cures own status.",
		desc: "The target's defenses are halved, effectively doubling this move's power. SpaceWorld '97 demo behavior: instead of always fainting, the user's HP is rounded down to the nearest multiple of 256, its status and Leech Seed are cured, and its Maximum HP is corrupted to its remainder mod 256 - the user keeps its current HP but can no longer heal above the tiny new maximum. The user faints only if it had 255 HP or less.",
	},
	explosion: {
		inherit: true,
		selfdestruct: undefined,
		onBasePowerPriority: 6,
		onBasePower(basePower, attacker, defender, move) {
			return this.chainModify(2);
		},
		onAfterMove(pokemon) {
			if (!pokemon.hp) return;
			const chip = pokemon.hp <= 255 ? pokemon.hp : pokemon.hp % 256;
			if (chip) this.directDamage(chip, pokemon);
			if (!pokemon.hp) return;
			if (pokemon.status) pokemon.cureStatus();
			pokemon.removeVolatile('leechseed');
			pokemon.maxhp = this.clampIntRange(pokemon.maxhp % 256, 1);
		},
		shortDesc: "2x damage. User survives at 256+ HP but its Max HP collapses to (max % 256); cures own status.",
		desc: "The target's defenses are halved, effectively doubling this move's power. SpaceWorld '97 demo behavior: instead of always fainting, the user's HP is rounded down to the nearest multiple of 256, its status and Leech Seed are cured, and its Maximum HP is corrupted to its remainder mod 256 - the user keeps its current HP but can no longer heal above the tiny new maximum. The user faints only if it had 255 HP or less.",
	},

	sunnyday: {
		inherit: true,
		pp: 10,
	},
	raindance: {
		inherit: true,
		pp: 10,
	},
	encore: {
		inherit: true,
		pp: 10,
		condition: {
			durationCallback() {
				return this.random(3, 7);
			},
			noCopy: true,
			onStart(target) {
				let move: any = target.lastMove;
				if (!move || target.volatiles['dynamax']) return false;

				if (move.isMax && move.baseMove) move = this.dex.moves.get(move.baseMove);
				const moveSlot = target.getMoveData(move.id);
				if (move.isZ || move.isMax || move.flags['failencore'] || !moveSlot || moveSlot.pp <= 0) {
					return false;
				}
				this.effectState.move = move.id;
				this.add('-start', target, 'Encore');
				if (!this.queue.willMove(target)) {
					this.effectState.duration!++;
				}
			},
			onOverrideAction(pokemon, target, move) {
				if (move.id !== this.effectState.move) return this.effectState.move;
			},
			onResidualOrder: 16,
			onResidual(target) {
				const moveSlot = target.getMoveData(this.effectState.move);
				if (!moveSlot || moveSlot.pp <= 0) {
					target.removeVolatile('encore');
				}
			},
			onEnd(target) {
				this.add('-end', target, 'Encore');
			},
		},
		shortDesc: "Target repeats its last move for 3-6 turns.",
		desc: "The target is forced to repeat its last used move for 3 to 6 turns, chosen at random (SpaceWorld '97 duration; other generations lock exactly 3 turns).",
	},
	perishsong: {
		inherit: true,
		pp: 10,
	},
	lockon: {
		inherit: true,
		pp: 10,
	},
	moonlight: {
		inherit: true,
		pp: 10,
		onHit(pokemon) {
			let factor = 0.5;
			switch (pokemon.effectiveWeather(undefined, true)) {
			case 'sunnyday':
			case 'desolateland':
				factor = 0.667;
				break;
			}
			const success = !!this.heal(this.modify(pokemon.maxhp, factor));
			if (!success) {
				this.add('-fail', pokemon, 'heal');
				return this.NOT_FAIL;
			}
			return success;
		},
		shortDesc: "Heals 50% max HP; 66% in sun. Never reduced by weather.",
		desc: "The user restores 1/2 of its maximum HP, or 2/3 in Sun. Unlike other generations, this move is never weakened by other weather.",
	},
	morningsun: {
		inherit: true,
		pp: 10,
		onHit(pokemon) {
			let factor = 0.5;
			switch (pokemon.effectiveWeather(undefined, true)) {
			case 'sunnyday':
			case 'desolateland':
				factor = 0.667;
				break;
			}
			const success = !!this.heal(this.modify(pokemon.maxhp, factor));
			if (!success) {
				this.add('-fail', pokemon, 'heal');
				return this.NOT_FAIL;
			}
			return success;
		},
		shortDesc: "Heals 50% max HP; 66% in sun. Never reduced by weather.",
		desc: "The user restores 1/2 of its maximum HP, or 2/3 in Sun. Unlike other generations, this move is never weakened by other weather.",
	},
	synthesis: {
		inherit: true,
		pp: 10,
		onHit(pokemon) {
			let factor = 0.5;
			switch (pokemon.effectiveWeather(undefined, true)) {
			case 'sunnyday':
			case 'desolateland':
				factor = 0.667;
				break;
			}
			const success = !!this.heal(this.modify(pokemon.maxhp, factor));
			if (!success) {
				this.add('-fail', pokemon, 'heal');
				return this.NOT_FAIL;
			}
			return success;
		},
		shortDesc: "Heals 50% max HP; 66% in sun. Never reduced by weather.",
		desc: "The user restores 1/2 of its maximum HP, or 2/3 in Sun. Unlike other generations, this move is never weakened by other weather.",
	},

	dynamicpunch: {
		inherit: true,
		accuracy: 100,
		pp: 10,
	},
	sweetkiss: {
		inherit: true,
		accuracy: 100,
	},
	irontail: {
		inherit: true,
		accuracy: 100,
	},
	octazooka: {
		inherit: true,
		accuracy: 100,
	},
	steelwing: {
		inherit: true,
		accuracy: 100,
	},
	sacredfire: {
		inherit: true,
		accuracy: 100,
		pp: 10,
	},
	present: {
		inherit: true,
		accuracy: 100,
	},
	twister: {
		inherit: true,
		basePower: 60,
	},
	lowkick: {
		inherit: true,
		secondary: {
			chance: 30,
			volatileStatus: 'flinch',
		},
		shortDesc: "Damage based on target's weight. 30% flinch chance.",
		desc: "This move's power is based on the target's weight, and it has a 30% chance to make the target flinch (its Gen 2 / SpaceWorld secondary, which later generations removed).",
	},
	vitalthrow: {
		inherit: true,
		priority: 0,
		shortDesc: "This move does not check accuracy. Normal priority.",
		desc: "This move does not check accuracy. Unlike other generations, it has normal priority instead of moving last (its SpaceWorld '97 behavior).",
	},
	mindreader: {
		inherit: true,
		pp: 10,
	},
	charm: {
		inherit: true,
		pp: 40,
	},
	scaryface: {
		inherit: true,
		pp: 40,
	},
	whirlpool: {
		inherit: true,
		accuracy: 100,
	},
	furycutter: {
		inherit: true,
		accuracy: 100,
		basePowerCallback(pokemon, target, move) {
			if (!pokemon.volatiles['furycutter'] || move.hit === 1) {
				pokemon.addVolatile('furycutter');
			}
			return this.clampIntRange(move.basePower * pokemon.volatiles['furycutter'].multiplier, 1, 65535);
		},
		condition: {
			duration: 2,
			onStart() {
				this.effectState.multiplier = 1;
			},
			onRestart() {
				if (this.effectState.multiplier < 16384) {
					this.effectState.multiplier <<= 1;
				}
				this.effectState.duration = 2;
			},
		},
		shortDesc: "Power doubles with each consecutive hit, uncapped (40/80/160/320/...).",
		desc: "Power doubles with each successful consecutive use, with no cap (SpaceWorld '97 behavior - 40, 80, 160, 320, and so on, up to 65535). In other generations the power caps at 160.",
	},
	sandstorm: {
		inherit: true,
		shortDesc: "Permanent sandstorm: 1/8 dmg/turn to ALL types; Rock gets 1.5x SpD.",
		desc: "Summons a permanent sandstorm that never expires (it can only be replaced by another weather). At the end of each turn, every Pokemon takes 1/8 of its maximum HP in damage regardless of type - Rock, Ground, and Steel are NOT immune in No Nerfs. Rock-types still get 1.5x Special Defense. Abilities such as Magic Guard, Overcoat, Sand Veil, Sand Rush, and Sand Force still prevent the damage.",
	},

	hiddenpower: {
		inherit: true,
		basePower: 0,
		basePowerCallback(pokemon) {
			const ivs = pokemon.set.ivs;
			const hpTypes = [
				'Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel',
				'Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark'
			];
			let hpIv = Math.floor(((ivs.atk % 2) + 2 * (ivs.def % 2) + 4 * (ivs.spe % 2) + 8 * (ivs.spa % 2) + 16 * (ivs.spd % 2) + 32 * (ivs.hp % 2)) * 15 / 63);
			return Math.floor(((Math.floor((ivs.atk % 4) / 2) + 2 * Math.floor((ivs.def % 4) / 2) + 4 * Math.floor((ivs.spe % 4) / 2) + 8 * Math.floor((ivs.spa % 4) / 2) + 16 * Math.floor((ivs.spd % 4) / 2) + 32 * Math.floor((ivs.hp % 4) / 2)) * 40 / 63) + 30);
		},
		shortDesc: "Type and power (30-70) depend on the user's IVs.",
		desc: "This move's type and base power (which ranges from 30 to 70) are both determined by the user's individual values (IVs), using the Gen 2-5 formula.",
	},

	ceaselessedge: {
		inherit: true,
		critRatio: 2,
		shortDesc: "High crit ratio. Sets Spikes on the target's side.",
		desc: "Has an increased chance for a critical hit. If this move is successful, it sets up a layer of Spikes on the opposing side, damaging grounded foes that switch in.",
	},
	stoneaxe: {
		inherit: true,
		critRatio: 2,
		shortDesc: "High crit ratio. Sets Stealth Rock on the target's side.",
		desc: "Has an increased chance for a critical hit. If this move is successful, it sets up Stealth Rock on the opposing side, damaging foes that switch in.",
	},

clangoroussoulblaze: {
    inherit: true,
    onAfterMove(source, target, move) {
        if (source.hasAbility('parentalbond') && move.multihitType === 'parentalbond') {
            this.boost({atk: 1, def: 1, spa: 1, spd: 1, spe: 1}, source, source, move);
        	}
    	},
	},

	gmaxdrumsolo: {
		inherit: true,
		basePower: 160,
		basePowerCallback(pokemon, target, move) {
			return 160;
		},
		pp: 5,
		ignoreAbility: true,
		isMax: false,
		onTryHit(target, source, move) {
			if (target.volatiles['protect'] || target.volatiles['detect'] ||
			    target.volatiles['kingsshield'] || target.volatiles['spikyshield'] ||
			    target.volatiles['banefulbunker'] || target.volatiles['obstruct']) {
				target.getMoveHitData(move).bypassProtect = true;
			}
		},
		shortDesc: "160 BP. Ignores abilities. Breaks protection for 25% damage.",
		desc: "Usable as a regular move. Always 160 base power and ignores the target's ability. Breaks through Protect, Detect, King's Shield, Spiky Shield, Baneful Bunker, and Obstruct, dealing 25% damage through the protection. Max Guard blocks it completely.",
	},
	gmaxfireball: {
		inherit: true,
		basePower: 160,
		basePowerCallback(pokemon, target, move) {
			return 160;
		},
		pp: 5,
		ignoreAbility: true,
		isMax: false,
		onTryHit(target, source, move) {
			if (target.volatiles['protect'] || target.volatiles['detect'] ||
			    target.volatiles['kingsshield'] || target.volatiles['spikyshield'] ||
			    target.volatiles['banefulbunker'] || target.volatiles['obstruct']) {
				target.getMoveHitData(move).bypassProtect = true;
			}
		},
		shortDesc: "160 BP. Ignores abilities. Breaks protection for 25% damage.",
		desc: "Usable as a regular move. Always 160 base power and ignores the target's ability. Breaks through Protect, Detect, King's Shield, Spiky Shield, Baneful Bunker, and Obstruct, dealing 25% damage through the protection. Max Guard blocks it completely.",
	},
	gmaxhydrosnipe: {
		inherit: true,
		basePower: 160,
		basePowerCallback(pokemon, target, move) {
			return 160;
		},
		pp: 5,
		ignoreAbility: true,
		isMax: false,
		onTryHit(target, source, move) {
			if (target.volatiles['protect'] || target.volatiles['detect'] ||
			    target.volatiles['kingsshield'] || target.volatiles['spikyshield'] ||
			    target.volatiles['banefulbunker'] || target.volatiles['obstruct']) {
				target.getMoveHitData(move).bypassProtect = true;
			}
		},
		shortDesc: "160 BP. Ignores abilities. Breaks protection for 25% damage.",
		desc: "Usable as a regular move. Always 160 base power and ignores the target's ability. Breaks through Protect, Detect, King's Shield, Spiky Shield, Baneful Bunker, and Obstruct, dealing 25% damage through the protection. Max Guard blocks it completely.",
	},

	maxguard: {
		inherit: true,
		isMax: false,
		pp: 5,
		shortDesc: "Protects user from most attacks, including Max/G-Max moves.",
		desc: "Usable as a regular move (does not require Dynamax). The user is protected from most attacks made by other Pokemon this turn, including Max Moves, G-Max Moves, and Z-Moves. Subject to the usual diminishing success chance when used consecutively.",
	},

	anchorshot: {
		inherit: true,
		basePower: 90,
	},
	appleacid: {
		inherit: true,
		basePower: 90,
	},
	beakblast: {
		inherit: true,
		basePower: 120,
	},
	bonerush: {
		inherit: true,
		basePower: 30,
	},
	dragonhammer: {
		inherit: true,
		basePower: 100,
	},
	firelash: {
		inherit: true,
		basePower: 90,
	},
	firstimpression: {
		inherit: true,
		basePower: 100,
	},
	geargrind: {
		inherit: true,
		basePower: 60,
		accuracy: 90,
	},
	gravapple: {
		inherit: true,
		basePower: 90,
	},
	hyperdrill: {
		inherit: true,
		basePower: 120,
	},
	infernalparade: {
		inherit: true,
		basePower: 65,
	},
	mountaingale: {
		inherit: true,
		basePower: 120,
	},
	nightdaze: {
		inherit: true,
		basePower: 90,
	},
	psyshieldbash: {
		inherit: true,
		basePower: 90,
	},
	revelationdance: {
		inherit: true,
		basePower: 100,
	},
	snipeshot: {
		inherit: true,
		basePower: 85,
	},
	spiritshackle: {
		inherit: true,
		basePower: 90,
	},
	tripledive: {
		inherit: true,
		basePower: 35,
	},
	tropkick: {
		inherit: true,
		basePower: 85,
	},

	crabhammer: {
		inherit: true,
		accuracy: 95,
	},
	syrupbomb: {
		inherit: true,
		accuracy: 90,
	},

	crushclaw: {
		inherit: true,
		flags: { contact: 1, protect: 1, mirror: 1, metronome: 1, slicing: 1 },
		shortDesc: "50% chance to lower the target's Defense by 1. Boosted by Sharpness.",
		desc: "Has a 50% chance to lower the target's Defense by 1 stage. This move is a slicing move, so its power is boosted 1.5x by the Sharpness ability.",
	},
	dragonclaw: {
		inherit: true,
		flags: { contact: 1, protect: 1, mirror: 1, metronome: 1, slicing: 1 },
		shortDesc: "Boosted by the Sharpness ability.",
		desc: "This move is a slicing move, so its power is boosted 1.5x by the Sharpness ability.",
	},
	metalclaw: {
		inherit: true,
		flags: { contact: 1, protect: 1, mirror: 1, metronome: 1, slicing: 1 },
		shortDesc: "10% chance to raise the user's Attack by 1. Boosted by Sharpness.",
		desc: "Has a 10% chance to raise the user's Attack by 1 stage. This move is a slicing move, so its power is boosted 1.5x by the Sharpness ability.",
	},
	shadowclaw: {
		inherit: true,
		flags: { contact: 1, protect: 1, mirror: 1, metronome: 1, slicing: 1 },
		shortDesc: "High critical hit ratio. Boosted by the Sharpness ability.",
		desc: "Has an increased chance for a critical hit. This move is a slicing move, so its power is boosted 1.5x by the Sharpness ability.",
	},
	direclaw: {
		inherit: true,
		flags: { contact: 1, protect: 1, mirror: 1, metronome: 1, slicing: 1 },
		shortDesc: "50% chance to paralyze, poison, or sleep. Boosted by Sharpness.",
		desc: "Has a 50% chance to cause the target to either fall asleep, become poisoned, or become paralyzed. This move is a slicing move, so its power is boosted 1.5x by the Sharpness ability.",
	},

	toxicthread: {
		inherit: true,
		boosts: {
			spe: -2,
		},
		shortDesc: "100% chance to poison and lower the target's Speed by 2.",
		desc: "This move does not deal damage. Has a 100% chance to poison the target and lower its Speed stat by 2 stages.",
	},

	judgment: {
		inherit: true,
		onModifyType(move, pokemon, target) {
			if (pokemon.ignoringItem()) return;
			const item = pokemon.getItem();
			if (item.id === 'legendplate' && target) {
				const candidates = this.dex.types.names().filter(t => !['Stellar', 'Shadow'].includes(t));
				let best: string[] = [];
				let bestScore = -99;
				for (const type of candidates) {
					const score = !this.dex.getImmunity(type, target) ? -9 : this.dex.getEffectiveness(type, target);
					if (score > bestScore) {
						bestScore = score;
						best = [type];
					} else if (score === bestScore) {
						best.push(type);
					}
				}
				const rankAgainst = (defType: string) => (candidate: string) => {
					if (!this.dex.getImmunity(defType, [candidate])) return 3;
					return -this.dex.getEffectiveness(defType, [candidate]);
				};
				if (best.length > 1 && target.types[0]) {
					const rank = rankAgainst(target.types[0]);
					const top = Math.max(...best.map(rank));
					best = best.filter(c => rank(c) === top);
				}
				if (best.length > 1 && target.types[1]) {
					const rank = rankAgainst(target.types[1]);
					const top = Math.max(...best.map(rank));
					best = best.filter(c => rank(c) === top);
				}
				move.type = best.length > 1 ? this.sample(best) : best[0];
				return;
			}
			if (item.id && item.onPlate && !item.zMove) {
				move.type = item.onPlate;
			}
		},
		onPrepareHit(target, source, move) {
			if (source.hasItem('legendplate') && move.type && source.getTypes().join() !== move.type) {
				(source as any).m.legendplateType = [move.type];
				if (source.setType(move.type, true)) {
					this.add('-start', source, 'typechange', move.type);
				}
			}
		},
		shortDesc: "Type matches held Plate. Legend Plate: becomes the best type vs the target and retypes the user.",
		desc: "This move's type depends on the user's held Plate. With a Legend Plate, it instead becomes a type that is super effective against the target (double weaknesses first; ties broken by which type best resists the target's primary type, prioritizing immunities, then its secondary type, then at random), and the user's type changes to match before the attack.",
	},

	triplekick: {
		inherit: true,
		accuracy: 100,
		basePower: 60,
		multihit: [1, 3],
		basePowerCallback(pokemon, target, move) {
			return 60 * move.hit;
		},
		shortDesc: "Hits 1-3 times. Hit N has 60*N power. 100% accuracy.",
		desc: "Hits one to three times. The first hit has 60 power, the second 120, and the third 180, for up to 360 total. This is the move's SpaceWorld '97 demo behavior, its strongest version across all generations.",
	},

	bouncybubble: {
		inherit: true,
		basePower: 90,
	},
	buzzybuzz: {
		inherit: true,
		basePower: 90,
	},
	sizzlyslide: {
		inherit: true,
		basePower: 90,
	},
	glitzyglow: {
		inherit: true,
		basePower: 90,
	},
	baddybad: {
		inherit: true,
		basePower: 90,
	},
	sappyseed: {
		inherit: true,
		basePower: 100,
		accuracy: 100,
	},
	freezyfrost: {
		inherit: true,
		basePower: 100,
		accuracy: 100,
	},
	sparklyswirl: {
		inherit: true,
		basePower: 120,
		accuracy: 100,
	},
	weatherball: {
		inherit: true,
		onModifyType(move, pokemon) {
			switch (pokemon.effectiveWeather()) {
			case 'sunnyday':
			case 'desolateland':
				move.type = 'Fire';
				break;
			case 'raindance':
			case 'primordialsea':
				move.type = 'Water';
				break;
			case 'sandstorm':
				move.type = 'Rock';
				break;
			case 'hail':
			case 'snowscape':
				move.type = 'Ice';
				break;
			case 'shadowsky':
				move.type = '???';
				break;
			}
		},
		onModifyMove(move, pokemon) {
			switch (pokemon.effectiveWeather()) {
			case 'sunnyday':
			case 'desolateland':
			case 'raindance':
			case 'primordialsea':
			case 'sandstorm':
			case 'hail':
			case 'snowscape':
			case 'shadowsky':
				move.basePower *= 2;
				break;
			}
		},
	},
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
		secondary: undefined,
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
		secondary: undefined,
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
		secondary: undefined,
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
		secondary: undefined,
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
		secondary: undefined,
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
		secondary: undefined,
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
		secondary: undefined,
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
		secondary: undefined,
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
		secondary: undefined,
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
		secondary: undefined,
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
		secondary: undefined,
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
		secondary: undefined,
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
		secondary: undefined,
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
		secondary: undefined,
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
		secondary: undefined,
		target: "all",
		type: "Shadow",
	},
	attract: {
		inherit: true,
		condition: {
			noCopy: true, // doesn't get copied by Baton Pass
			onStart(pokemon, source, effect) {
				if (!(pokemon.gender === 'M' && source.gender === 'F') && !(pokemon.gender === 'F' && source.gender === 'M')) {
					this.debug('incompatible gender');
					return false;
				}
				if (!this.runEvent('Attract', pokemon, source)) {
					this.debug('Attract event failed');
					return false;
				}

				if (effect.name === 'Cute Charm') {
					this.add('-start', pokemon, 'Attract', '[from] ability: Cute Charm', `[of] ${source}`);
				} else if (effect.name === 'Destiny Knot') {
					this.add('-start', pokemon, 'Attract', '[from] item: Destiny Knot', `[of] ${source}`);
				} else {
					this.add('-start', pokemon, 'Attract');
				}
			},
			onUpdate(pokemon) {
				if (this.effectState.source && !this.effectState.source.isActive && pokemon.volatiles['attract']) {
					this.debug(`Removing Attract volatile on ${pokemon}`);
					pokemon.removeVolatile('attract');
				}
			},
			onBeforeMovePriority: 2,
			onBeforeMove(pokemon, target, move) {
				this.add('-activate', pokemon, 'move: Attract', '[of] ' + this.effectState.source);
				if (this.randomChance(1, 2)) {
					this.add('cant', pokemon, 'Attract');
					return false;
				}
			},
			onEnd(pokemon) {
				this.add('-end', pokemon, 'Attract', '[silent]');
			},
		},
	},
	nomove: {
		accuracy: 100 * 81 / 256,
		basePower: 102,
		category: "Special",
		name: "No Move",
		shortDesc: "The Gen 1 corrupted move. Not blocked by Protect.",
		desc: "A replica of the corrupted move a Gen 1 Pokemon uses when it thaws before its team has selected a move: Fissure's animation, 102 base power, ??? type, Special category, and 81/256 (~31.6%) accuracy. Its empty flags mean it is not blocked by Protect.",
		pp: 10,
		priority: 0,
		flags: {},
		secondary: undefined,
		target: "normal",
		type: "???",
	},

};
