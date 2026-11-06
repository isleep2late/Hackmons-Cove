export const Items: import('../../../sim/dex-items').ModdedItemDataTable = {
	berryjuice: {
		inherit: true,
		isNonstandard: "Future",
	},
	dragonscale: {
		inherit: true,
		shortDesc: "No held effect in SpaceWorld '97.",
		desc: "No held effect in SpaceWorld '97: the demo gives Dragon Scale no held item effect.",
		onModifyDamage() {},
	},
	bitterberry: {
		inherit: true,
		isNonstandard: "Future",
	},
	blackbelt: {
		inherit: true,
		isNonstandard: "Future",
	},
	blackglasses: {
		inherit: true,
		isNonstandard: "Future",
	},
	brightpowder: {
		inherit: true,
		isNonstandard: "Future",
	},
	burntberry: {
		inherit: true,
		isNonstandard: "Future",
	},
	charcoal: {
		inherit: true,
		isNonstandard: "Future",
	},
	fastball: {
		inherit: true,
		isNonstandard: "Future",
	},
	focusband: {
		inherit: true,
		isNonstandard: "Future",
	},
	friendball: {
		inherit: true,
		isNonstandard: "Future",
	},
	goldberry: {
		inherit: true,
		isNonstandard: "Future",
	},
	heavyball: {
		inherit: true,
		isNonstandard: "Future",
	},
	iceberry: {
		inherit: true,
		isNonstandard: "Future",
	},
	levelball: {
		inherit: true,
		isNonstandard: "Future",
	},
	lightball: {
		inherit: true,
		isNonstandard: "Future",
	},
	loveball: {
		inherit: true,
		isNonstandard: "Future",
	},
	luckypunch: {
		inherit: true,
		isNonstandard: "Future",
	},
	lureball: {
		inherit: true,
		isNonstandard: "Future",
	},
	magnet: {
		inherit: true,
		isNonstandard: "Future",
	},
	metalpowder: {
		inherit: true,
		isNonstandard: "Future",
	},
	mintberry: {
		inherit: true,
		isNonstandard: "Future",
	},
	miracleberry: {
		inherit: true,
		isNonstandard: "Future",
	},
	miracleseed: {
		inherit: true,
		isNonstandard: "Future",
	},
	moonball: {
		inherit: true,
		isNonstandard: "Future",
	},
	mysteryberry: {
		inherit: true,
		isNonstandard: "Future",
	},
	mysticwater: {
		inherit: true,
		isNonstandard: "Future",
	},
	nevermeltice: {
		inherit: true,
		isNonstandard: "Future",
	},
	pinkbow: {
		inherit: true,
		isNonstandard: "Future",
	},
	poisonbarb: {
		inherit: true,
		isNonstandard: "Future",
	},
	polkadotbow: {
		inherit: true,
		isNonstandard: "Future",
	},
	przcureberry: {
		inherit: true,
		isNonstandard: "Future",
	},
	psncureberry: {
		inherit: true,
		isNonstandard: "Future",
	},
	quickclaw: {
		inherit: true,
		isNonstandard: "Future",
	},
	scopelens: {
		inherit: true,
		isNonstandard: "Future",
	},
	sharpbeak: {
		inherit: true,
		isNonstandard: "Future",
	},
	softsand: {
		inherit: true,
		isNonstandard: "Future",
	},
	sportball: {
		inherit: true,
		isNonstandard: "Future",
	},
	sunstone: {
		inherit: true,
		isNonstandard: "Future",
	},
	strangethread: {
		inherit: true,
		isNonstandard: null,
		shortDesc: "SpaceWorld '97 demo item: attacks against the holder lose 30/256 accuracy.",
		desc: "SpaceWorld '97 demo item: 30 is subtracted from the 0-255 accuracy of attacks against the holder, after accuracy and evasion stages, down to a minimum of 0. For example, Thunder drops from 178/256 to 148/256.",
		onModifyAccuracyPriority: -2,
		onModifyAccuracy(accuracy) {
			if (typeof accuracy !== 'number') return;
			return Math.max(0, accuracy - 30);
		},
	},
	quickneedle: {
		inherit: true,
		isNonstandard: null,
		shortDesc: "SpaceWorld '97 proto-Quick Claw: 30/256 chance to move first among moves of the same priority.",
		desc: "SpaceWorld '97 proto-Quick Claw: 30/256 chance to move first among moves of the same priority, at any priority, so it also works when both Pokemon use a priority move or both use Counter.",
		onFractionalPriority(priority, pokemon) {
			if (this.randomChance(30, 256)) {
				this.add('-activate', pokemon, 'item: Quick Needle');
				return 0.1;
			}
		},
	},
	focusorb: {
		inherit: true,
		isNonstandard: null,
		shortDesc: "SpaceWorld '97 proto-Focus Band: 30/256 chance to survive a KO hit with 1 HP.",
	},
	sharpscythe: {
		inherit: true,
		isNonstandard: null,
		shortDesc: "SpaceWorld '97: Adds 30/256 to the holder's critical hit chance.",
		desc: "SpaceWorld '97: After the demo works out the holder's critical hit chance from its base Speed, Focus Energy and high-crit moves, it adds 30 to that chance out of 256, up to a maximum of 255/256.",
		onModifyCritRatio: undefined,
	},
	apple: {
		inherit: true,
		isNonstandard: null,
		shortDesc: "SpaceWorld '97 proto-Sitrus Berry: restores 50 HP when the holder falls below half HP. Single use.",
		desc: "SpaceWorld '97 proto-Sitrus Berry: restores 50 HP when the holder's HP falls below half of its maximum HP. Single use.",
		onResidual(pokemon) {
			if (pokemon.hp * 2 < pokemon.maxhp) {
				pokemon.eatItem();
			}
		},
	},
	snakeskin: {
		inherit: true,
		isNonstandard: null,
	},
	prettytail: {
		inherit: true,
		isNonstandard: null,
	},
	earth: {
		inherit: true,
		isNonstandard: null,
	},
	thundertail: {
		inherit: true,
		isNonstandard: null,
	},
	stimulusorb: {
		inherit: true,
		isNonstandard: null,
	},
	watertail: {
		inherit: true,
		isNonstandard: null,
	},
	firetail: {
		inherit: true,
		isNonstandard: null,
	},
	calmberry: {
		inherit: true,
		isNonstandard: null,
	},
	bigleaf: {
		inherit: true,
		isNonstandard: null,
		onBasePower(basePower, user, target, move) {
			if (move.type === 'Grass') {
				return Math.floor(basePower * 1.2);
			}
		},
		shortDesc: "SpaceWorld '97: Boosts the holder's Grass-type moves by 20%.",
		desc: "SpaceWorld '97: Boosts the holder's Grass-type moves by 20%.",
	},
	sharpstone: {
		inherit: true,
		isNonstandard: null,
		onBasePower(basePower, user, target, move) {
			if (move.type === 'Rock') {
				return Math.floor(basePower * 1.2);
			}
		},
		shortDesc: "SpaceWorld '97: Boosts the holder's Rock-type moves by 20%.",
		desc: "SpaceWorld '97: Boosts the holder's Rock-type moves by 20%.",
	},
	blackfeather: {
		inherit: true,
		isNonstandard: null,
		onBasePower(basePower, user, target, move) {
			if (move.type === 'Flying') {
				return Math.floor(basePower * 1.2);
			}
		},
		shortDesc: "SpaceWorld '97: Boosts the holder's Flying-type moves by 20%.",
		desc: "SpaceWorld '97: Boosts the holder's Flying-type moves by 20%.",
	},
	sharpfang: {
		inherit: true,
		isNonstandard: null,
		onBasePower(basePower, user, target, move) {
			if (move.type === 'Normal') {
				return Math.floor(basePower * 1.2);
			}
		},
		shortDesc: "SpaceWorld '97: Boosts the holder's Normal-type moves by 20%.",
		desc: "SpaceWorld '97: Boosts the holder's Normal-type moves by 20%.",
	},
	toxicneedle: {
		inherit: true,
		isNonstandard: null,
		onBasePower(basePower, user, target, move) {
			if (move.type === 'Poison') {
				return Math.floor(basePower * 1.2);
			}
		},
		shortDesc: "SpaceWorld '97: Boosts the holder's Poison-type moves by 20%.",
		desc: "SpaceWorld '97: Boosts the holder's Poison-type moves by 20%.",
	},
	poisonfang: {
		inherit: true,
		isNonstandard: null,
		onBasePower(basePower, user, target, move) {
			if (move.type === 'Poison') {
				return Math.floor(basePower * 1.2);
			}
		},
		shortDesc: "SpaceWorld '97: Boosts the holder's Poison-type moves by 20%.",
		desc: "SpaceWorld '97: Boosts the holder's Poison-type moves by 20%.",
	},
	migraineseed: {
		inherit: true,
		isNonstandard: null,
		onBasePower(basePower, user, target, move) {
			if (move.type === 'Psychic') {
				return Math.floor(basePower * 1.2);
			}
		},
		shortDesc: "SpaceWorld '97: Boosts the holder's Psychic-type moves by 20%.",
		desc: "SpaceWorld '97: Boosts the holder's Psychic-type moves by 20%.",
	},
	attackneedle: {
		inherit: true,
		isNonstandard: null,
		onBasePower(basePower, user, target, move) {
			if (move.type === 'Bug') {
				return Math.floor(basePower * 1.2);
			}
		},
		shortDesc: "SpaceWorld '97: Boosts the holder's Bug-type moves by 20%.",
		desc: "SpaceWorld '97: Boosts the holder's Bug-type moves by 20%.",
	},
	powerbracersw: {
		inherit: true,
		isNonstandard: null,
		onBasePower(basePower, user, target, move) {
			if (move.type === 'Fighting') {
				return Math.floor(basePower * 1.2);
			}
		},
		shortDesc: "SpaceWorld '97: Boosts the holder's Fighting-type moves by 20%.",
		desc: "SpaceWorld '97: Boosts the holder's Fighting-type moves by 20%.",
	},
	icefang: {
		inherit: true,
		isNonstandard: null,
		onBasePower(basePower, user, target, move) {
			if (move.type === 'Ice') {
				return Math.floor(basePower * 1.2);
			}
		},
		shortDesc: "SpaceWorld '97: Boosts the holder's Ice-type moves by 20%.",
		desc: "SpaceWorld '97: Boosts the holder's Ice-type moves by 20%.",
	},
	wethorn: {
		inherit: true,
		isNonstandard: null,
		onBasePower(basePower, user, target, move) {
			if (move.type === 'Water') {
				return Math.floor(basePower * 1.2);
			}
		},
		shortDesc: "SpaceWorld '97: Boosts the holder's Water-type moves by 20%.",
		desc: "SpaceWorld '97: Boosts the holder's Water-type moves by 20%.",
	},
	thunderfang: {
		inherit: true,
		isNonstandard: null,
		onBasePower(basePower, user, target, move) {
			if (move.type === 'Electric') {
				return Math.floor(basePower * 1.2);
			}
		},
		shortDesc: "SpaceWorld '97: Boosts the holder's Electric-type moves by 20%.",
		desc: "SpaceWorld '97: Boosts the holder's Electric-type moves by 20%.",
	},
	fireclaw: {
		inherit: true,
		isNonstandard: null,
		onBasePower(basePower, user, target, move) {
			if (move.type === 'Fire') {
				return Math.floor(basePower * 1.2);
			}
		},
		shortDesc: "SpaceWorld '97: Boosts the holder's Fire-type moves by 20%.",
		desc: "SpaceWorld '97: Boosts the holder's Fire-type moves by 20%.",
	},
	spike: {
		inherit: true,
		isNonstandard: null,
		onBasePower(basePower, user, target, move) {
			if (move.type === 'Ghost') {
				return Math.floor(basePower * 1.2);
			}
		},
		shortDesc: "SpaceWorld '97: Boosts the holder's Ghost-type moves by 20%.",
		desc: "SpaceWorld '97: Boosts the holder's Ghost-type moves by 20%.",
	},
	mysticpetal: {
		inherit: true,
		isNonstandard: null,
	},
	whitefeather: {
		inherit: true,
		isNonstandard: null,
	},
	electricpouch: {
		inherit: true,
		isNonstandard: null,
	},
	strangewater: {
		inherit: true,
		isNonstandard: null,
	},
	jigglingballoon: {
		inherit: true,
		isNonstandard: null,
	},
	firemane: {
		inherit: true,
		isNonstandard: null,
	},
	fossilshard: {
		inherit: true,
		isNonstandard: null,
	},
	grossgarbage: {
		inherit: true,
		isNonstandard: null,
	},
	championbelt: {
		inherit: true,
		isNonstandard: null,
	},
	tag: {
		inherit: true,
		isNonstandard: null,
	},
	fiveyencoin: {
		inherit: true,
		isNonstandard: null,
	},
	guardthread: {
		inherit: true,
		isNonstandard: null,
	},
	wisdomorb: {
		inherit: true,
		isNonstandard: null,
	},
	steelshell: {
		inherit: true,
		isNonstandard: null,
	},
	sharphorn: {
		inherit: true,
		isNonstandard: null,
	},
	twinhorns: {
		inherit: true,
		isNonstandard: null,
	},
	icewing: {
		inherit: true,
		isNonstandard: null,
	},
	thunderwing: {
		inherit: true,
		isNonstandard: null,
	},
	firewing: {
		inherit: true,
		isNonstandard: null,
		shortDesc: "SpaceWorld '97: At the start of a turn, raises holder's Sp. Atk by 1. Single use.",
		desc: "SpaceWorld '97: At the start of the first turn the holder is on the field, the item is used up and the holder's Special Attack is raised by 1 stage.",
		onBeforeTurn(pokemon) {
			if (pokemon.useItem()) this.boost({ spa: 1 }, pokemon, pokemon);
		},
	},
	confuseclaw: {
		inherit: true,
		isNonstandard: null,
	},
	detectorb: {
		inherit: true,
		isNonstandard: null,
		shortDesc: "SpaceWorld '97: At the start of a turn, raises holder's evasion by 1. Single use.",
		desc: "SpaceWorld '97: At the start of the first turn the holder is on the field, the item is used up and the holder's evasiveness is raised by 1 stage.",
		onBeforeTurn(pokemon) {
			if (pokemon.useItem()) this.boost({ evasion: 1 }, pokemon, pokemon);
		},
	},
	lifetag: {
		inherit: true,
		isNonstandard: null,
	},
	fleefeather: {
		inherit: true,
		isNonstandard: null,
	},
	countercuff: {
		inherit: true,
		isNonstandard: null,
	},
	diggingclaw: {
		inherit: true,
		isNonstandard: null,
	},
	momslove: {
		inherit: true,
		isNonstandard: null,
	},
	invisiblewall: {
		inherit: true,
		isNonstandard: null,
	},
	smokescreen: {
		inherit: true,
		isNonstandard: null,
	},
	longtongue: {
		inherit: true,
		isNonstandard: null,
	},
	longvine: {
		inherit: true,
		isNonstandard: null,
	},
	talismantag: {
		inherit: true,
		isNonstandard: null,
	},
	cordyceps: {
		inherit: true,
		isNonstandard: null,
	},
	crimsonjewel: {
		inherit: true,
		isNonstandard: null,
	},
	strangepower: {
		inherit: true,
		isNonstandard: null,
	},
	heartstone: {
		inherit: true,
		isNonstandard: null,
	},
	poisonstone: {
		inherit: true,
		isNonstandard: null,
	},
	kingsrock: {
		inherit: true,
		shortDesc: "SpaceWorld '97: Plain attacks get a 30/256 flinch chance and end a recharge.",
		desc: "SpaceWorld '97: The holder's attacks that use the demo's plain damage scripts (most attacks without a status, stat or flinch effect, plus Snore, multi-hit moves, Thrash, Rollout, Fury Cutter, Counter and fixed-damage moves) have a 30/256 chance to make the target flinch, rolled once per use (after a multi-hit move's last hit), even if the target is asleep or frozen. Each such hit that does not land on a substitute also ends the target's need to recharge from Hyper Beam, whether or not it flinches.",
		onModifyMove(move) {
			const affectedByKingsRock = [
				'absorb', 'barrage', 'bide', 'bonemerang', 'bonelock', 'bounce', 'coinhurl', 'cometpunch', 'counter',
				'crabhammer', 'crosscutter', 'cut', 'dig', 'dizzypunch', 'doubleslap', 'doubleedge', 'doublekick', 'dragonbreath',
				'dragonrage', 'drillpeck', 'dynamicpunch', 'earthquake', 'eggbomb', 'explosion', 'feintattack', 'falseswipe',
				'flail', 'flamewheel', 'fly', 'frustration', 'furyattack', 'furycutter', 'furyswipes', 'gigadrain', 'gust',
				'hiddenpower', 'highjumpkick', 'hornattack', 'hydropump', 'irontail', 'jumpkick', 'karatechop', 'leechlife',
				'machpunch', 'magnitude', 'megadrain', 'megakick', 'megapunch', 'nightshade', 'octazooka', 'outrage', 'payday',
				'peck', 'petaldance', 'pinmissile', 'pound', 'powdersnow', 'present', 'psywave', 'quickattack', 'rage',
				'rapidspin', 'razorleaf', 'razorwind', 'return', 'reversal', 'rockhead', 'rockthrow', 'rollout', 'scratch',
				'seismictoss', 'selfdestruct', 'skullbash', 'skyattack', 'slam', 'slash', 'sludgebomb', 'snore', 'solarbeam',
				'sonicboom', 'spikecannon', 'steelwing', 'strength', 'strongarm', 'struggle', 'submission', 'superfang', 'surf',
				'swift', 'tackle', 'takedown', 'thief', 'thrash', 'triplekick', 'triattack', 'twineedle', 'twister', 'uproot',
				'visegrip', 'vinewhip', 'vitalthrow', 'waterfall', 'watergun', 'watersport', 'whirlpool', 'windride',
				'wingattack',
			];
			if (affectedByKingsRock.includes(move.id)) {
				if (!move.secondaries) move.secondaries = [];
				move.secondaries.push({
					chance: 12,
					volatileStatus: 'flinch',
					kingsrock: true,
				});
			}
		},
	},
	leftovers: {
		name: "Leftovers",
		spritenum: 0,
		num: 234,
		gen: 2,
		shortDesc: "SpaceWorld '97: No effect - the demo never implements held HP recovery.",
		desc: "SpaceWorld '97: Its data assigns a 30 HP per-turn heal, but the demo engine never implements held recovery, so it does nothing.",
	},
	metalcoat: {
		name: "Metal Coat",
		spritenum: 0,
		num: 233,
		gen: 2,
		shortDesc: "SpaceWorld '97: No battle effect. Evolves Ditto into Animon.",
		desc: "SpaceWorld '97: Evolves Ditto into Animon. Its battle effect is not implemented by the demo engine.",
	},
	silverpowder: {
		name: "Silver Powder",
		spritenum: 0,
		num: 222,
		gen: 2,
		shortDesc: "SpaceWorld '97: No effect - the demo never implements this item.",
		desc: "SpaceWorld '97: Its data says it was meant to weaken incoming Bug-type moves, but the demo engine never implements the effect.",
	},
	twistedspoon: {
		name: "Twisted Spoon",
		spritenum: 0,
		num: 248,
		gen: 2,
		shortDesc: "SpaceWorld '97: No effect - the demo never implements this item.",
		desc: "SpaceWorld '97: Its data says it was meant to weaken incoming Psychic-type moves, but the demo engine never implements the effect.",
	},
	hardstone: {
		name: "Hard Stone",
		spritenum: 0,
		num: 238,
		gen: 2,
		shortDesc: "SpaceWorld '97: No effect - the demo never implements this item.",
		desc: "SpaceWorld '97: Its data says it was meant to weaken incoming Rock-type moves, but the demo engine never implements the effect.",
	},
	spelltag: {
		name: "Spell Tag",
		spritenum: 0,
		num: 247,
		gen: 2,
		shortDesc: "SpaceWorld '97: A wild-Pokemon lure; no battle effect.",
		desc: "SpaceWorld '97: A wild-Pokemon lure in the demo. It has no battle effect.",
	},
	stick: {
		name: "Stick",
		spritenum: 0,
		num: 259,
		gen: 2,
		shortDesc: "SpaceWorld '97: Holder's Normal-type moves have 1.2x power.",
		onBasePower(basePower, user, target, move) {
			if (move.type === 'Normal') {
				return Math.floor(basePower * 1.2);
			}
		},
		desc: "SpaceWorld '97: Boosts the holder's Normal-type moves by 20%.",
	},
	thickclub: {
		name: "Thick Club",
		spritenum: 0,
		num: 258,
		gen: 2,
		shortDesc: "SpaceWorld '97: Holder's Ground-type moves have 1.2x power.",
		onBasePower(basePower, user, target, move) {
			if (move.type === 'Ground') {
				return Math.floor(basePower * 1.2);
			}
		},
		desc: "SpaceWorld '97: Boosts the holder's Ground-type moves by 20%.",
	},
	dragonfang: {
		name: "Dragon Fang",
		spritenum: 0,
		num: 250,
		gen: 2,
		shortDesc: "SpaceWorld '97: Holder's Dragon-type moves have 1.2x power.",
		onBasePower(basePower, user, target, move) {
			if (move.type === 'Dragon') {
				return Math.floor(basePower * 1.2);
			}
		},
		desc: "SpaceWorld '97: Boosts the holder's Dragon-type moves by 20%.",
	},
	berserkgene: {
		name: "Berserk Gene",
		spritenum: 0,
		num: 388,
		gen: 2,
		shortDesc: "SpaceWorld '97: No effect - its +10-stats data is never implemented.",
		desc: "SpaceWorld '97: Its data assigns +10 to all stats, but the demo engine never implements the effect.",
	},
	upgrade: {
		name: "Up-Grade",
		spritenum: 0,
		num: 252,
		gen: 2,
		shortDesc: "SpaceWorld '97: No effect - its +5-stats data is never implemented.",
		desc: "SpaceWorld '97: Its data assigns +5 to all stats, but the demo engine never implements the effect.",
	},
	berry: {
		name: "Berry",
		spritenum: 319,
		isBerry: true,
		naturalGift: {
			basePower: 80,
			type: "Poison",
		},
		onResidualOrder: 10,
		onResidual(pokemon) {
			if (pokemon.hp * 2 < pokemon.maxhp) {
				pokemon.eatItem();
			}
		},
		onTryEatItem(item, pokemon) {
			if (!this.runEvent('TryHeal', pokemon, null, this.effect, 20)) return false;
		},
		onEat(pokemon) {
			this.heal(20);
		},
		num: 155,
		gen: 2,
		shortDesc: "SpaceWorld '97: Restores 20 HP when below 1/2 max HP. Single use.",
		desc: "SpaceWorld '97: Restores 20 HP when the holder falls below half of its maximum HP (10 HP in the final games). Single use.",
	},
};
