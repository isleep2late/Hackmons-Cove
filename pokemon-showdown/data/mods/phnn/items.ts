const SW_EVIOLITE: string[] = ['ballerine', 'ditto', 'farfetchd', 'farfetchdsw', 'golppy', 'minicorn', 'para', 'pinsir', 'pinsirmega', 'pinsirsw', 'shuckle', 'slowbro', 'slowbromega', 'slowbrosw', 'tangel', 'trifox', 'twinz'];

export const Items: import('../../../sim/dex-items').ModdedItemDataTable = {

	souldew: {
		inherit: true,
		onBasePower: undefined, // no inherit
		onModifySpAPriority: 1,
		onModifySpA(spa, pokemon) {
			if (pokemon.baseSpecies.num === 380 || pokemon.baseSpecies.num === 381) {
				return this.chainModify(1.5);
			}
		},
		onModifySpDPriority: 2,
		onModifySpD(spd, pokemon) {
			if (pokemon.baseSpecies.num === 380 || pokemon.baseSpecies.num === 381) {
				return this.chainModify(1.5);
			}
		},
		shortDesc: "If holder is a Latias or Latios, its Sp. Atk and Sp. Def are 1.5x.",
		desc: "If held by a Latias or Latios, this item raises the holder's Special Attack and Special Defense by 50% each (Pre-Gen 7 mechanics).",
	},
	berserkgene: {
		inherit: true,
		isNonstandard: null,
		shortDesc: "On switch-in, raises holder's Attack by 2 and confuses it. Single use.",
		desc: "On switch-in, raises the holder's Attack by 2 stages and confuses it. This item is consumed on use.",
	},
	pinkbow: {
		inherit: true,
		isNonstandard: null,
		shortDesc: "Holder's Normal-type moves have 1.1x power.",
		desc: "The power of the holder's Normal-type moves is multiplied by 1.1.",
	},
	polkadotbow: {
		inherit: true,
		isNonstandard: null,
		shortDesc: "Holder's Normal-type moves have 1.1x power.",
		desc: "The power of the holder's Normal-type moves is multiplied by 1.1.",
	},
	shadowsynergystone: {
		name: "Shadow Synergy Stone",
		spritenum: 345,
		megaStone: {"Mewtwo": "Mewtwo-Shadow-Mega-X"},
		itemUser: ["Mewtwo", "Mewtwo-Shadow"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "Mega Evolves Mewtwo or Shadow Mewtwo into Shadow Mega Mewtwo X.",
	},
	shadowiniumz: {
		name: "Shadowinium Z",
		spritenum: 642,
		onTakeItem: false,
		zMove: true,
		zMoveType: "Shadow",
		num: 0,
		gen: 9,
		shortDesc: "If holder has a Shadow move, this item allows it to use a Shadow Z-Move.",
	},
	questiniumz: {
		name: "Questinium Z",
		spritenum: 642,
		onTakeItem: false,
		zMove: true,
		zMoveType: "???",
		num: 0,
		gen: 9,
		shortDesc: "If holder has a ??? move, this item allows it to use a typeless Z-Move.",
	},
	shadowcloak: {
		name: "Shadow Cloak",
		spritenum: 444,
		fling: {
			basePower: 10,
		},
		onBasePowerPriority: 15,
		onBasePower(basePower, user, target, move) {
			if (move.type === 'Shadow') {
				return this.chainModify([4915, 4096]);
			}
		},
		num: 0,
		gen: 9,
		shortDesc: "Holder's Shadow-type moves have 1.2x power.",
	},
	brokendisk: {
		name: "Broken Disk",
		spritenum: 444,
		fling: {
			basePower: 10,
		},
		onBasePowerPriority: 15,
		onBasePower(basePower, user, target, move) {
			if (move.type === '???') {
				return this.chainModify([4915, 4096]);
			}
		},
		num: 0,
		gen: 9,
		shortDesc: "Holder's ???-type moves have 1.2x power.",
	},
	shadowplate: {
		name: "Shadow Plate",
		spritenum: 8,
		onPlate: 'Shadow',
		onBasePowerPriority: 15,
		onBasePower(basePower, user, target, move) {
			if (move && move.type === 'Shadow') {
				return this.chainModify([4915, 4096]);
			}
		},
		onTakeItem(item, pokemon, source) {
			if ((source && source.baseSpecies.num === 493) || pokemon.baseSpecies.num === 493) {
				return false;
			}
			return true;
		},
		forcedForme: "Arceus-Shadow",
		num: 0,
		gen: 9,
		shortDesc: "Holder's Shadow-type moves have 1.2x power; Judgment is Shadow type; turns Arceus into its Shadow forme.",
	},
	questionmarkplate: {
		name: "Question Mark Plate",
		spritenum: 8,
		onPlate: '???',
		onBasePowerPriority: 15,
		onBasePower(basePower, user, target, move) {
			if (move && move.type === '???') {
				return this.chainModify([4915, 4096]);
			}
		},
		onTakeItem(item, pokemon, source) {
			if ((source && source.baseSpecies.num === 493) || pokemon.baseSpecies.num === 493) {
				return false;
			}
			return true;
		},
		forcedForme: "Arceus-Question",
		num: 0,
		gen: 9,
		shortDesc: "Holder's ???-type moves have 1.2x power; Judgment is typeless; turns Arceus into its ??? forme.",
	},

	eviolite: {
		inherit: true,
		onModifyDef(def, pokemon) {
			if (pokemon.baseSpecies.nfe || SW_EVIOLITE.includes(pokemon.baseSpecies.id)) {
				return this.chainModify(1.5);
			}
		},
		onModifySpD(spd, pokemon) {
			if (pokemon.baseSpecies.nfe || SW_EVIOLITE.includes(pokemon.baseSpecies.id)) {
				return this.chainModify(1.5);
			}
		},
		shortDesc: "If holder's species can evolve, or could in the SpaceWorld demo or GS prototypes, its Def and Sp. Def are 1.5x.",
		desc: "If the holder's species can evolve, its Defense and Special Defense are multiplied by 1.5. This also applies to species that could evolve in the Space World '97 demo or the leaked Gold/Silver prototypes: Ballerine, Ditto, Farfetch'd, Golppy, Minicorn, Para, Pinsir, Shuckle, Slowbro, Tangel, Trifox, and Twinz, including their SW formes and even after Mega Evolution. Shuckle qualifies because the prototypes contain a cut Shuckle evolution (Pending 06).",
	},

	blankplate: {
		name: "Blank Plate",
		spritenum: 463,
		onPlate: 'Normal',
		onTakeItem(item, pokemon, source) {
			if ((source && source.baseSpecies.num === 493) || pokemon.baseSpecies.num === 493) {
				return false;
			}
			return true;
		},
		num: 0,
		gen: 9,
		shortDesc: "Judgment is Normal type. Arceus stays its base Normal forme.",
		desc: "A common stone tablet. The holder's Judgment becomes Normal type, and Arceus keeps its base Normal-type forme. Engraving: Three beings whose power can hold both time and space fixed.",
	},
	legendplate: {
		name: "Legend Plate",
		spritenum: 610,
		onTakeItem(item, pokemon, source) {
			if ((source && source.baseSpecies.num === 493) || pokemon.baseSpecies.num === 493) {
				return false;
			}
			return true;
		},
		num: 0,
		gen: 9,
		shortDesc: "Judgment becomes the type that hits the target hardest and changes the holder to that type.",
		desc: "When the holder uses Judgment, the move becomes a type that is super effective against the selected target, prioritizing double weaknesses; ties are broken by which type best resists the target's primary type (immunities first), then its secondary type, then at random. The holder's own type changes to match before the attack. Engraving: From all creations, over all creations, does the Original One watch over all.",
	},
	metalpowder: {
		inherit: true,
		isNonstandard: null,
		onModifyDef(def, pokemon) {
			if (pokemon.baseSpecies.id === 'ditto' || pokemon.species.id === 'ditto') {
				return this.chainModify(2);
			}
		},
		onModifySpDPriority: 2,
		onModifySpD(spd, pokemon) {
			if (pokemon.baseSpecies.id === 'ditto' || pokemon.species.id === 'ditto') {
				return this.chainModify(1.5);
			}
		},
		shortDesc: "If holder is a Ditto: 2x Defense, 1.5x Sp. Def, even while transformed.",
		desc: "If held by a Ditto, its Defense is doubled and its Special Defense is raised by 50%. This works even while the holder is transformed, and for Pokemon that have transformed into a Ditto.",
	},
	kingsrock: {
		inherit: true,
		onModifyMove(move) {
			if (move.category !== 'Status') {
				if (!move.secondaries) move.secondaries = [];
				for (const secondary of move.secondaries) {
					if (secondary.volatileStatus === 'flinch') return;
				}
				move.secondaries.push({
					chance: 12,
					volatileStatus: 'flinch',
				});
			}
		},
		shortDesc: "Holder's attacks without a flinch chance gain a 12% chance to flinch.",
		desc: "Holder's attacks without a chance to make the target flinch gain a 12% chance to make the target flinch, the Generation 2 rate of 30/256.",
	},
	quickclaw: {
		inherit: true,
		onFractionalPriority(priority, pokemon, target, move) {
			if (move.category === 'Status' && pokemon.hasAbility('myceliummight')) return;
			if (priority <= 0 && this.randomChance(60, 256)) {
				this.add('-activate', pokemon, 'item: Quick Claw');
				return 0.1;
			}
		},
		shortDesc: "Each turn, holder has a 23.4% chance to move first in its priority bracket.",
		desc: "Each turn, this item has a 23.4% chance, the Generation 2 rate of 60/256, to allow the holder to move first in its priority bracket.",
	},
	focusband: {
		inherit: true,
		onDamage(damage, target, source, effect) {
			if (this.randomChance(30, 256) && damage >= target.hp && effect && effect.effectType === 'Move') {
				this.add('-activate', target, 'item: Focus Band');
				return target.hp - 1;
			}
		},
		shortDesc: "Holder has a 11.7% chance to survive an attack that would KO it with 1 HP.",
		desc: "If the holder is about to be knocked out by an attack, it has a 11.7% chance, the Generation 2 rate of 30/256, to survive with 1 HP.",
	},
	brightpowder: {
		inherit: true,
		onModifyAccuracy(accuracy) {
			if (typeof accuracy !== 'number') return;
			return accuracy - 20;
		},
		shortDesc: "The accuracy of attacks against the holder is decreased by a flat 20%.",
		desc: "The accuracy of attacks against the holder is decreased by a flat 20 percentage points, as in Generation 2, instead of the modern 0.9x multiplier.",
	},
	focussash: {
		inherit: true,
		onDamage: undefined,
		onTryHit(target, source, move) {
			if (target !== source && target.hp === target.maxhp) {
				target.addVolatile('focussash');
			}
		},
		condition: {
			duration: 1,
			onDamage(damage, target, source, effect) {
				if (effect && effect.effectType === 'Move' && damage >= target.hp) {
					this.effectState.activated = true;
					return target.hp - 1;
				}
			},
			onAnyAfterMove() {
				this.effectState.target.removeVolatile('focussash');
			},
			onEnd(target) {
				if (this.effectState.activated) target.useItem();
			},
		},
		shortDesc: "If holder is at full HP, it survives every hit of that one move with 1 HP. Single use.",
		desc: "If the holder is at full HP when a move first strikes it, every hit of that same move that would knock it out instead leaves it with 1 HP, and hits after the first deal no damage; the Focus Sash is then consumed. This is Generation 4 behavior: the full-HP check only arms the effect, and the survival clamp is keyed to that armed state rather than to current HP, which is why one Sash absorbs an entire multi-hit move. The nuance is that this protection is scoped to the single move that armed it, exactly as in Generation 4, so a different attacker's move later in the same turn is not survived.",
	},
	griseousorb: {
		inherit: true,
		onTakeItem: false,
		shortDesc: "If holder is a Giratina, its Ghost/Dragon moves are 1.2x. Cannot be removed.",
		desc: "If held by a Giratina, its Ghost- and Dragon-type moves have 1.2x power. This item cannot be removed from any holder or knocked off, as in Generation 4.",
	},
	dragonscale: {
		inherit: true,
		onBasePower(basePower, user, target, move) {
			if (move.type === 'Dragon') {
				return this.chainModify([4915, 4096]);
			}
		},
		shortDesc: "Holder's Dragon-type attacks have 1.2x power.",
		desc: "Holder's Dragon-type attacks have 1.2x power, restoring its Generation 2 role as a held Dragon booster.",
	},
	figyberry: {
		inherit: true,
		onUpdate(pokemon) {
			if (pokemon.hp <= pokemon.maxhp / 2) {
				pokemon.eatItem();
			}
		},
		onTryEatItem(item, pokemon) {
			if (!this.runEvent('TryHeal', pokemon, null, this.effect, pokemon.baseMaxhp / 2)) return false;
		},
		onEat(pokemon) {
			this.heal(pokemon.baseMaxhp / 2);
			if (pokemon.getNature().minus === 'atk') {
				pokemon.addVolatile('confusion');
			}
		},
		shortDesc: "Restores 1/2 max HP at 1/2 max HP or less; confuses if -Atk Nature. Single use.",
		desc: "Restores 1/2 of the holder's maximum HP when it falls to 1/2 of its maximum HP or less, combining the Generation 3 trigger point with the Generation 7 heal amount. Confuses the holder if its Nature lowers Attack. Single use.",
	},
	wikiberry: {
		inherit: true,
		onUpdate(pokemon) {
			if (pokemon.hp <= pokemon.maxhp / 2) {
				pokemon.eatItem();
			}
		},
		onTryEatItem(item, pokemon) {
			if (!this.runEvent('TryHeal', pokemon, null, this.effect, pokemon.baseMaxhp / 2)) return false;
		},
		onEat(pokemon) {
			this.heal(pokemon.baseMaxhp / 2);
			if (pokemon.getNature().minus === 'spa') {
				pokemon.addVolatile('confusion');
			}
		},
		shortDesc: "Restores 1/2 max HP at 1/2 max HP or less; confuses if -SpA Nature. Single use.",
		desc: "Restores 1/2 of the holder's maximum HP when it falls to 1/2 of its maximum HP or less, combining the Generation 3 trigger point with the Generation 7 heal amount. Confuses the holder if its Nature lowers Special Attack. Single use.",
	},
	magoberry: {
		inherit: true,
		onUpdate(pokemon) {
			if (pokemon.hp <= pokemon.maxhp / 2) {
				pokemon.eatItem();
			}
		},
		onTryEatItem(item, pokemon) {
			if (!this.runEvent('TryHeal', pokemon, null, this.effect, pokemon.baseMaxhp / 2)) return false;
		},
		onEat(pokemon) {
			this.heal(pokemon.baseMaxhp / 2);
			if (pokemon.getNature().minus === 'spe') {
				pokemon.addVolatile('confusion');
			}
		},
		shortDesc: "Restores 1/2 max HP at 1/2 max HP or less; confuses if -Spe Nature. Single use.",
		desc: "Restores 1/2 of the holder's maximum HP when it falls to 1/2 of its maximum HP or less, combining the Generation 3 trigger point with the Generation 7 heal amount. Confuses the holder if its Nature lowers Speed. Single use.",
	},
	aguavberry: {
		inherit: true,
		onUpdate(pokemon) {
			if (pokemon.hp <= pokemon.maxhp / 2) {
				pokemon.eatItem();
			}
		},
		onTryEatItem(item, pokemon) {
			if (!this.runEvent('TryHeal', pokemon, null, this.effect, pokemon.baseMaxhp / 2)) return false;
		},
		onEat(pokemon) {
			this.heal(pokemon.baseMaxhp / 2);
			if (pokemon.getNature().minus === 'spd') {
				pokemon.addVolatile('confusion');
			}
		},
		shortDesc: "Restores 1/2 max HP at 1/2 max HP or less; confuses if -SpD Nature. Single use.",
		desc: "Restores 1/2 of the holder's maximum HP when it falls to 1/2 of its maximum HP or less, combining the Generation 3 trigger point with the Generation 7 heal amount. Confuses the holder if its Nature lowers Special Defense. Single use.",
	},
	iapapaberry: {
		inherit: true,
		onUpdate(pokemon) {
			if (pokemon.hp <= pokemon.maxhp / 2) {
				pokemon.eatItem();
			}
		},
		onTryEatItem(item, pokemon) {
			if (!this.runEvent('TryHeal', pokemon, null, this.effect, pokemon.baseMaxhp / 2)) return false;
		},
		onEat(pokemon) {
			this.heal(pokemon.baseMaxhp / 2);
			if (pokemon.getNature().minus === 'def') {
				pokemon.addVolatile('confusion');
			}
		},
		shortDesc: "Restores 1/2 max HP at 1/2 max HP or less; confuses if -Def Nature. Single use.",
		desc: "Restores 1/2 of the holder's maximum HP when it falls to 1/2 of its maximum HP or less, combining the Generation 3 trigger point with the Generation 7 heal amount. Confuses the holder if its Nature lowers Defense. Single use.",
	},
};
