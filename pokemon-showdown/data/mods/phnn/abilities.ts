export const Abilities: import('../../../sim/dex-abilities').ModdedAbilityDataTable = {

	cutecharm: {
		inherit: true,
		onDamagingHit(damage, target, source, move) {
			if (this.checkMoveMakesContact(move, source, target)) {
				if (this.randomChance(33, 100)) {
					source.trySetStatus('attract', target);
				}
			}
		},
		shortDesc: "33% chance to infatuate Pokemon making contact with this Pokemon.",
		desc: "There is a 33% chance a Pokemon making contact with this Pokemon will become infatuated if it is of the opposite gender.",
	},
	effectspore: {
		inherit: true,
		onDamagingHit(damage, target, source, move) {
			if (this.checkMoveMakesContact(move, source, target) && !source.status && source.runStatusImmunity('powder')) {
				const r = this.random(300);
				if (r < 99) {
					source.setStatus('slp', target);
				} else if (r < 198) {
					source.setStatus('par', target);
				} else if (r < 297) {
					source.setStatus('psn', target);
				}
			}
		},
		shortDesc: "33% chance to cause sleep/paralysis/poison on Pokemon making contact.",
		desc: "There is a 33% chance a Pokemon making contact with this Pokemon will be put to sleep, paralyzed, or poisoned (equal chance of each).",
	},
	flamebody: {
		inherit: true,
		onDamagingHit(damage, target, source, move) {
			if (this.checkMoveMakesContact(move, source, target)) {
				if (this.randomChance(33, 100)) {
					source.trySetStatus('brn', target);
				}
			}
		},
		shortDesc: "33% chance to burn Pokemon making contact with this Pokemon.",
		desc: "There is a 33% chance a Pokemon making contact with this Pokemon will be burned.",
	},
	poisonpoint: {
		inherit: true,
		onDamagingHit(damage, target, source, move) {
			if (this.checkMoveMakesContact(move, source, target)) {
				if (this.randomChance(33, 100)) {
					source.trySetStatus('psn', target);
				}
			}
		},
		shortDesc: "33% chance to poison Pokemon making contact with this Pokemon.",
		desc: "There is a 33% chance a Pokemon making contact with this Pokemon will be poisoned.",
	},
	static: {
		inherit: true,
		onDamagingHit(damage, target, source, move) {
			if (this.checkMoveMakesContact(move, source, target)) {
				if (this.randomChance(33, 100)) {
					source.trySetStatus('par', target);
				}
			}
		},
		shortDesc: "33% chance to paralyze Pokemon making contact with this Pokemon.",
		desc: "There is a 33% chance a Pokemon making contact with this Pokemon will be paralyzed.",
	},
	shedskin: {
		inherit: true,
		onResidualOrder: 5,
		onResidualSubOrder: 3,
		onResidual(pokemon) {
			if (pokemon.hp && pokemon.status && this.randomChance(33, 100)) {
				this.debug('shed skin');
				this.add('-activate', pokemon, 'ability: Shed Skin');
				pokemon.cureStatus();
			}
		},
		shortDesc: "33% chance to cure this Pokemon's status at the end of each turn.",
		desc: "At the end of each turn, this Pokemon has a 33% chance to have its non-volatile status condition cured.",
	},

	aerilate: {
		inherit: true,
		onBasePower(basePower, pokemon, target, move) {
			if (move.typeChangerBoosted === this.effect) return this.chainModify([5325, 4096]);
		},
		shortDesc: "This Pokemon's Normal-type moves become Flying type and have 1.3x power.",
		desc: "This Pokemon's Normal-type moves become Flying-type moves and have their power multiplied by 1.3.",
	},

	dauntlessshield: {
		inherit: true,
		onStart(pokemon) {
			this.boost({def: 1}, pokemon);
		},
		shortDesc: "This Pokemon's Defense is raised by 1 stage on every switch-in.",
		desc: "This Pokemon's Defense is raised by 1 stage each time it switches in, not just once per battle.",
	},
	disguise: {
		inherit: true,
		onDamage(damage, target, source, effect) {
			if (
				effect && effect.effectType === 'Move' &&
				['mimikyu', 'mimikyutotem'].includes(target.species.id) && !target.transformed
			) {
				if (["rollout", "iceball"].includes(effect.id)) {
					source.volatiles[effect.id].contactHitCount--;
				}

				this.add("-activate", target, "ability: Disguise");
				this.effectState.busted = true;
				return 0;
			}
		},
		onUpdate(pokemon) {
			if (['mimikyu', 'mimikyutotem'].includes(pokemon.species.id) && this.effectState.busted) {
				const speciesid = pokemon.species.id === 'mimikyutotem' ? 'Mimikyu-Busted-Totem' : 'Mimikyu-Busted';
				pokemon.formeChange(speciesid, this.effect, true);
				pokemon.formeRegression = true;
			}
		},
		shortDesc: "(Mimikyu) The first hit it takes is blocked, and it takes no damage.",
		desc: "If this Pokemon is a Mimikyu, the first hit it takes in battle deals 0 neutral damage. Unlike in standard play, its disguise does not cost it any HP when broken. Its appearance changes to Mimikyu-Busted after the disguise is broken.",
	},
	galewings: {
		inherit: true,
		onModifyPriority(priority, pokemon, target, move) {
			if (move && move.type === 'Flying') return priority + 1;
		},
		shortDesc: "This Pokemon's Flying-type moves have their priority increased by 1.",
		desc: "This Pokemon's Flying-type moves have their priority increased by 1. This works at any HP, with no health requirement.",
	},
	intrepidsword: {
		inherit: true,
		onStart(pokemon) {
			this.boost({atk: 1}, pokemon);
		},
		shortDesc: "This Pokemon's Attack is raised by 1 stage on every switch-in.",
		desc: "This Pokemon's Attack is raised by 1 stage each time it switches in, not just once per battle.",
	},
	libero: {
		inherit: true,
		onPrepareHit(source, target, move) {
			if (move.hasBounced) return;
			const type = move.type;
			if (type && type !== '???') {
				if (!source.setType(type)) return;
				this.add('-start', source, 'typechange', type, '[from] ability: Libero');
			}
		},
		shortDesc: "This Pokemon's type changes to the type of each move it uses.",
		desc: "Before using a move, this Pokemon changes to that move's type. There is no once-per-switch-in limit, so it can change type every time it attacks.",
	},
	magicguard: {
		inherit: true,
		onDamage(damage, target, source, effect) {
			if (effect.effectType !== 'Move') {
				if (effect.effectType === 'Ability') this.add('-activate', source, 'ability: ' + effect.name);
				return false;
			}
		},
		onTryAddVolatile(status, target) {
			if (status.id === 'toxicspikes') return null;
		},
		shortDesc: "Only takes damage from attacks; immune to full paralysis and Toxic Spikes.",
		desc: "This Pokemon can only be damaged by direct attacks. It cannot be fully paralyzed by paralysis, and it cannot be poisoned by Toxic Spikes. Burn, poison, and other indirect damage are also prevented.",
	},
	moody: {
		inherit: true,
		onResidual(pokemon) {
			let stats: BoostID[] = [];
			const boost: SparseBoostsTable = {};
			let statPlus: BoostID;
			for (statPlus in pokemon.boosts) {
				if (pokemon.boosts[statPlus] < 6) {
					stats.push(statPlus);
				}
			}
			let randomStat = stats.length ? this.sample(stats) : undefined;
			if (randomStat) boost[randomStat] = 2;

			stats = [];
			let statMinus: BoostID;
			for (statMinus in pokemon.boosts) {
				if (pokemon.boosts[statMinus] > -6 && statMinus !== randomStat) {
					stats.push(statMinus);
				}
			}
			randomStat = stats.length ? this.sample(stats) : undefined;
			if (randomStat) boost[randomStat] = -1;

			this.boost(boost, pokemon, pokemon);
		},
		shortDesc: "Raises a random stat by 2 and lowers another by 1 each turn.",
		desc: "At the end of each turn, this Pokemon raises a random stat by 2 stages and lowers a different random stat by 1 stage. Evasion and accuracy can be selected.",
	},
	parentalbond: {
		inherit: true,
		shortDesc: "This Pokemon's damaging moves hit twice; second hit deals 50% damage.",
		desc: "This Pokemon's damaging moves become multi-hit moves that hit twice. The second hit has its damage multiplied by 0.5. This also applies to Z-Moves and Max/G-Max moves.",
		onPrepareHit(source, target, move) {
			if (move.category === 'Status' || move.multihit || move.flags['noparentalbond'] || move.flags['charge'] ||
				move.flags['futuremove'] || move.spreadHit) return;
			move.multihit = 2;
			move.multihitType = 'parentalbond';
		},
	},
	protosynthesis: {
		inherit: true,
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, notransform: 1, cantsuppress: 1 },
	},
	quarkdrive: {
		inherit: true,
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, notransform: 1, cantsuppress: 1 },
	},
	hadronengine: {
		inherit: true,
		flags: { cantsuppress: 1 },
	},
	orichalcumpulse: {
		inherit: true,
		flags: { cantsuppress: 1 },
	},
	pixilate: {
		inherit: true,
		onModifyTypePriority: -1,
		onModifyType(move, pokemon) {
			const noModifyType = [
				'judgment', 'multiattack', 'naturalgift', 'revelationdance', 'technoblast', 'terrainpulse', 'weatherball',
			];
			if (move.type === 'Normal' && !noModifyType.includes(move.id) && !(move.isZ && move.category !== 'Status')) {
				move.type = 'Fairy';
				move.typeChangerBoosted = this.effect;
			}
		},
		onBasePowerPriority: 23,
		onBasePower(basePower, pokemon, target, move) {
			if (move.typeChangerBoosted === this.effect) return this.chainModify([5325, 4096]);
		},
		shortDesc: "This Pokemon's Normal-type moves become Fairy type and have 1.3x power.",
		desc: "This Pokemon's Normal-type moves become Fairy-type moves and have their power multiplied by 1.3.",
	},
	protean: {
		inherit: true,
		onPrepareHit(source, target, move) {
			if (move.hasBounced) return;
			const type = move.type;
			if (type && type !== '???') {
				if (!source.setType(type)) return;
				this.add('-start', source, 'typechange', type, '[from] ability: Protean');
			}
		},
		shortDesc: "This Pokemon's type changes to the type of each move it uses.",
		desc: "Before using a move, this Pokemon changes to that move's type. There is no once-per-switch-in limit, so it can change type every time it attacks.",
	},
	refrigerate: {
		inherit: true,
		onModifyTypePriority: -1,
		onModifyType(move, pokemon) {
			const noModifyType = [
				'judgment', 'multiattack', 'naturalgift', 'revelationdance', 'technoblast', 'terrainpulse', 'weatherball',
			];
			if (move.type === 'Normal' && !noModifyType.includes(move.id) && !(move.isZ && move.category !== 'Status')) {
				move.type = 'Ice';
				move.typeChangerBoosted = this.effect;
			}
		},
		onBasePowerPriority: 23,
		onBasePower(basePower, pokemon, target, move) {
			if (move.typeChangerBoosted === this.effect) return this.chainModify([5325, 4096]);
		},
		shortDesc: "This Pokemon's Normal-type moves become Ice type and have 1.3x power.",
		desc: "This Pokemon's Normal-type moves become Ice-type moves and have their power multiplied by 1.3.",
	},
	transistor: {
		inherit: true,
		onBasePowerPriority: 30,
		onBasePower(basePower, attacker, defender, move) {
			if (move.type === 'Electric') {
				this.debug('Transistor boost');
				return this.chainModify(1.5);
			}
		},
		shortDesc: "This Pokemon's Electric-type moves have their power multiplied by 1.5.",
		desc: "This Pokemon's Electric-type attacks have their power multiplied by 1.5.",
	},
	prankster: {
		inherit: true,
		onModifyPriority(priority, pokemon, target, move) {
			if (move?.category === 'Status') {
				move.pranksterBoosted = true;
				return priority + 1;
			}
		},
		shortDesc: "This Pokemon's Status moves have priority raised by 1; Dark types are affected.",
		desc: "This Pokemon's Status moves have their priority increased by 1. Unlike in standard play, Dark-type Pokemon are not immune to these boosted moves (Gen 6 behavior).",
	},
	drizzle: {
		inherit: true,
		onStart(source) {
			this.field.setWeather('raindance');
		},
		shortDesc: "On switch-in, this Pokemon summons permanent Rain Dance.",
		desc: "On switch-in, this Pokemon summons Rain Dance. The rain does not end on its own (Gen 5 behavior, rather than the 5-turn limit of Gen 6+).",
	},
	drought: {
		inherit: true,
		onStart(source) {
			this.field.setWeather('sunnyday');
		},
		shortDesc: "On switch-in, this Pokemon summons permanent Sunny Day.",
		desc: "On switch-in, this Pokemon summons Sunny Day. The sun does not end on its own (Gen 5 behavior, rather than the 5-turn limit of Gen 6+).",
	},
	snowwarning: {
		inherit: true,
		onStart(source) {
			this.field.setWeather('snowscape');
		},
		shortDesc: "On switch-in, this Pokemon summons permanent Snow.",
		desc: "On switch-in, this Pokemon summons Snow. The snow does not end on its own (Gen 5 behavior, rather than the 5-turn limit of Gen 6+).",
	},
	sandstream: {
		inherit: true,
		onStart(source) {
			this.field.setWeather('sandstorm');
		},
		shortDesc: "On switch-in, this Pokemon summons permanent Sandstorm.",
		desc: "On switch-in, this Pokemon summons Sandstorm. The sandstorm does not end on its own (Gen 5 behavior, rather than the 5-turn limit of Gen 6+).",
	},
	arenatrap: {
		inherit: true,
		onFoeTrapPokemon(pokemon) {
			if (!pokemon.isAdjacent(this.effectState.target)) return;
			if (pokemon.isGrounded()) {
				pokemon.trapped = true;
			}
		},
		onFoeMaybeTrapPokemon(pokemon, source) {
			if (!source) source = this.effectState.target;
			if (!source || !pokemon.isAdjacent(source)) return;
			if (pokemon.isGrounded(!pokemon.knownType)) {
				pokemon.maybeTrapped = true;
			}
		},
		shortDesc: "Prevents adjacent grounded foes from switching out, including Ghosts.",
		desc: "Prevents adjacent grounded foes from choosing to switch out, unless they are holding a Shed Shell. Unlike in standard play, Ghost-type Pokemon are also trapped.",
	},
	shadowtag: {
		inherit: true,
		onFoeTrapPokemon(pokemon) {
			if (pokemon.isAdjacent(this.effectState.target)) {
				pokemon.trapped = true;
			}
		},
		onFoeMaybeTrapPokemon(pokemon, source) {
			if (!source) source = this.effectState.target;
			if (!source || !pokemon.isAdjacent(source)) return;
			pokemon.maybeTrapped = true;
		},
		shortDesc: "Prevents adjacent foes from switching, including Ghosts and Shadow Tag users.",
		desc: "Prevents adjacent foes from choosing to switch out, unless they are holding a Shed Shell. Unlike in standard play, Ghost-type Pokemon and Pokemon with Shadow Tag are also trapped.",
	},
	battlebond: {
		inherit: true,
		onSourceAfterFaint(length, target, source, effect) {
			if (effect?.effectType !== 'Move') return;
			if (source.bondTriggered || source.transformed) return;
			if ((source.species.id === 'greninja' || source.species.id === 'greninjabond') && source.hp) {
				this.add('-activate', source, 'ability: Battle Bond');
				source.formeChange('Greninja-Ash', this.effect, true);
				source.bondTriggered = true;
			}
		},
		onModifyMovePriority: -1,
		onModifyMove(move, attacker) {
			if (move.id === 'watershuriken' && attacker.species.name === 'Greninja-Ash' && !attacker.transformed) {
				move.multihit = 3;
			}
		},
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1 },
		shortDesc: "After KOing a Pokemon with a move: if Greninja, transforms into Ash-Greninja.",
		desc: "After this Pokemon knocks out another Pokemon with a move, if it is a Greninja it permanently transforms into Ash-Greninja for the rest of the battle (its Generation 7 mechanics). Ash-Greninja's Water Shuriken always hits 3 times.",
	},
};
