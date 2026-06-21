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
		accuracy: 90,
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
		onTryHit(target, source) {
			return this.randomChance(1, 1);
		},
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
		overrideDefensiveStat: 'spd',
		shortDesc: "User faints. Damage is dealt against the target's Sp. Def.",
		desc: "The user faints after using this move, even if it misses or fails. Damage is calculated using the target's Special Defense instead of its Defense, effectively halving the target's defenses.",
	},
	explosion: {
		inherit: true,
		overrideDefensiveStat: 'spd',
		shortDesc: "User faints. Damage is dealt against the target's Sp. Def.",
		desc: "The user faints after using this move, even if it misses or fails. Damage is calculated using the target's Special Defense instead of its Defense, effectively halving the target's defenses.",
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
};
