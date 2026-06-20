// Note: This is the list of formats
// The rules that formats use are stored in data/rulesets.ts
/*
If you want to add custom formats, create a file in this folder named: "custom-formats.ts"

Paste the following code into the file and add your desired formats and their sections between the brackets:
--------------------------------------------------------------------------------
// Note: This is the list of formats
// The rules that formats use are stored in data/rulesets.ts

export const Formats: FormatList = [
];
--------------------------------------------------------------------------------

If you specify a section that already exists, your format will be added to the bottom of that section.
New sections will be added to the bottom of the specified column.
The column value will be ignored for repeat sections.
*/

export const Formats: import('../sim/dex-formats').FormatList = [
{
	section: "No Nerfs",
	column: 1,
},
{
	name: "[Gen 9] Pure Hackmons No Nerfs",
	desc: "The ultimate Pokemon experience where every move is legal, every ability is legal, and every Pokemon can be played at their peak from their strongest generation.",
	mod: 'phnn',
	ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Team Preview', 'Overflow Stat Mod', 'Data Preview'],
	unbanlist: ['Past', 'Future', 'Unobtainable'],
	onBegin() {
		this.add('Pure Hackmons No Nerfs. Every move is legal, every ability is legal, and every Pokemon across all generations can be played at their peak!');
	},
},
{
	name: "[Gen 9] Pure Hackmons No Nerfs Doubles",
	desc: "Pure Hackmons No Nerfs in Doubles format with twice the chaos!",
	mod: 'phnn',
	gameType: 'doubles',
	ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Team Preview', 'Data Preview'],
	banlist: [],
	unbanlist: [
		'Past', 'Future', 'Unobtainable'
	],
	onValidateSet(set, format, setHas, teamHas) {
		return [];
	},
	onValidateTeam(team, format) {
		return [];
	},
	onModifyDamage(damage, source, target, move) {
		if (move.multihitType === 'parentalbond' && move.hit > 1) {
			return this.chainModify(2);
		}
	},
		onBegin() {
			this.add('Pure Hackmons No Nerfs. Every move is legal, every ability is legal, and every Pokemon across all generations can be played at their peak!');
		},
},
{
	name: "[Gen 9] Pure Hackmons No Nerfs Triples",
	desc: "Pure Hackmons No Nerfs in Triples format - maximum chaos!",
	mod: 'phnn',
	gameType: 'triples',
	searchShow: false,
	ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Team Preview', 'Data Preview'],
	onModifyDamage(damage, source, target, move) {
		if (move.multihitType === 'parentalbond' && move.hit > 1) {
			return this.chainModify(2);
		}
	},
	onBegin() {
		this.add('Pure Hackmons No Nerfs. Every move is legal, every ability is legal, and every Pokemon across all generations can be played at their peak!');
	},
},
{
	section: "Glitchmons",
	column: 1,
},
{
	name: "[Gen 6] Pure Hackmons 510+",
	desc: "Gen 6 Pure Hackmons without the 510 EV limit.",
	mod: 'gen6',
	searchShow: false,
	ruleset: ['-Nonexistent', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause', 'Overflow Stat Mod'],
	onBegin() {
		this.add('-rule', 'No Limits: Pokemon can max all EVs');
	},
},
{
	name: "[Gen 4] Glitch Anything Goes",
	desc: "Gen 4 Anything Goes with the Rage glitch: Smeargle-reachable Pokemon can learn any move except Chatter and Struggle.",
	mod: 'gen4',
	ruleset: ['-Nonexistent', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause'],
	checkCanLearn(move, species, setSources, set) {
		const glitch = ['mew','ditto','jigglypuff','wigglytuff','mrmime','sudowoodo','bonsly','mimejr','chatot','caterpie','metapod','butterfree','weedle','kakuna','beedrill','magikarp','gyarados','unown','wobbuffet','smeargle','wurmple','silcoon','cascoon','wynaut','beldum','metagross','dustox','beautifly','metang','cleffa','clefairy','clefable','igglybuff','smoochum','jynx','skitty','delcatty','plusle','minun','spinda','riolu','lucario','happiny','chansey','blissey','mesprit','glameow','purugly','meowth','persian','drowzee','hypno','sentret','furret','sneasel','weavile','chimchar','monferno','infernape','togepi','togetic','togekiss','munchlax','snorlax','mankey','primeape','poliwhirl','poliwrath','abra','kadabra','alakazam','machop','machoke','machamp','geodude','graveler','golem','gengar','hitmonlee','hitmonchan','mewtwo','politoed','aipom','ambipom','snubbull','granbull','teddiursa','ursaring','miltank','celebi','ludicolo','makuhita','hariyama','sableye','meditite','medicham','volbeat','illumise','kecleon','banette','dusclops','dusknoir','jirachi'];
		if (glitch.includes(this.toID(species.baseSpecies)) && move.id !== 'chatter' && move.id !== 'struggle') {
			return null;
		}
		return this.checkCanLearn(move, species, setSources, set);
	},
},
{
	name: "[Gen 3] Any Ability",
	desc: "Gen 3 Pure Hackmons where any Pokemon can have any ability.",
	mod: 'gen3phnn',
	ruleset: ['-Nonexistent', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause', '+No Ability'],
	onBegin() {
		this.add('Gen 3 Any Ability. Any Pokemon can have any ability!');
	},
},
{
	name: "[Gen 2] Statuses",
	desc: "Gen 2 Pure Hackmons, but Pokemon can start the battle pre-statused.",
	mod: 'gen2',
	ruleset: ['-Nonexistent', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause', 'Max Level = 255'],
	onSwitchIn(pokemon) {
		if (pokemon.set.startStatus && !pokemon.m.phnnStartStatusApplied) {
			pokemon.m.phnnStartStatusApplied = true;
			pokemon.setStatus(pokemon.set.startStatus, pokemon, null, true);
		}
	},
},
{
	name: "[Gen 1] Disguises",
	desc: "Gen 1 Pure Hackmons, but Pokemon can have any type, disguise as any species, and even start the game pre-statused.",
	mod: 'gen1phnn',
	ruleset: ['-Nonexistent', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause', 'Max Level = 255'],
	onBegin() {
		this.add('Gen 1 Pure Hackmons. Disguise any Pokemon as another sprite and give it any typing. Your opponent sees only the sprite and status, never the real species or type. No Cleric Clause!');
		for (const side of this.sides) {
			for (const pokemon of side.pokemon) {
				if (!pokemon.set.disguise) continue;
				const disguise = this.dex.species.get(pokemon.set.disguise);
				if (disguise.exists) {
					// @ts-expect-error hack
					pokemon.name = disguise.name;
					// @ts-expect-error Hack
					pokemon.fullname = `${pokemon.side.id}: ${disguise.name}`;
				}
			}
		}
	},
	onSwitchIn(pokemon) {
		if (pokemon.set.phType) {
			const types = pokemon.set.phType.split('/').filter(t => this.dex.types.isName(t));
			if (types.length) {
				pokemon.setType(types, true);
				this.addSplit(pokemon.side.id, [
					'-start', pokemon, 'typechange', types.join('/'), '[from] format: Gen 1 Pure Hackmons',
				]);
			}
		}
		if (pokemon.set.startStatus && !pokemon.m.phnnStartStatusApplied) {
			pokemon.m.phnnStartStatusApplied = true;
			pokemon.setStatus(pokemon.set.startStatus, pokemon, null, true);
		}
	},
},
{
	section: "Wondrous Hackmons",
	column: 1,
},
{
	name: "[Gen 9] Wondrous Hackmons",
	desc: "A custom Hackmons format with select bans for a balanced experience.",
	mod: 'gen9',
	ruleset: ['-Nonexistent', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause',
		'Forme Clause', 'Freeze Clause Mod', 'Sleep Clause Mod', 'Dry Pass Clause', 'NatDex Mod'],
	banlist: [
		'Arena Trap', 'Calyrex-Shadow', 'Innards Out', 'Last Respects', 'Mewtwo-Mega-X', 'Neutralizing Gas', 'Revival Blessing', 'Shadow Tag', 'Shed Tail',
	],
},
{
	name: "[Gen 8] Wondrous Hackmons",
	desc: "A custom Hackmons format with select bans for a balanced experience.",
	mod: 'gen8',
	ruleset: ['-Nonexistent', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod',
		'Endless Battle Clause', 'Freeze Clause Mod', 'Sleep Moves Clause'],
	banlist: [
		'Arena Trap', 'Eternatus-Eternamax', 'Neutralizing Gas', 'Shadow Tag', 'Zacian-Crowned',
	],
},
{
	section: "Pure Hackmons",
	column: 2,
},
{
	name: "[Gen 1] Pure Hackmons",
	desc: "Anything directly hackable onto a set and usable in local battles is allowed.",
	mod: 'gen1',
	searchShow: false,
	ruleset: ['-Nonexistent', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause', 'Max Level = 255'],
},
{
	name: "[Gen 2] Pure Hackmons",
	desc: "Anything directly hackable onto a set and usable in local battles is allowed.",
	mod: 'gen2',
	searchShow: false,
	ruleset: ['-Nonexistent', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause'],
},
{
	name: "[Gen 3] Pure Hackmons",
	desc: "Anything directly hackable onto a set and usable in local battles is allowed.",
	mod: 'gen3',
	searchShow: false,
	ruleset: ['-Nonexistent', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause', '+No Ability'],
},
{
	name: "[Gen 4] Pure Hackmons",
	desc: "Anything directly hackable onto a set and usable in local battles is allowed.",
	mod: 'gen4',
	searchShow: false,
	ruleset: ['-Nonexistent', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause'],
},
{
	name: "[Gen 5] Pure Hackmons",
	desc: "Anything directly hackable onto a set and usable in local battles is allowed.",
	mod: 'gen5',
	searchShow: false,
	ruleset: ['-Nonexistent', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause'],
},
{
	name: "[Gen 6] Pure Hackmons",
	desc: `Anything that can be hacked in-game and is usable in local battles is allowed.`,
	mod: 'gen6',
	ruleset: ['-Nonexistent', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause', 'EV limit = 510'],
},
{
	name: "[Gen 7] Pure Hackmons",
	desc: `Anything that can be hacked in-game and is usable in local battles is allowed.`,
	mod: 'gen7',
	ruleset: ['-Nonexistent', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause'],
},
{
	name: "[Gen 7 Let's Go] Pure Hackmons",
	desc: "Anything directly hackable onto a set and usable in local battles is allowed.",
	mod: 'gen7letsgo',
	searchShow: false,
	ruleset: ['-Nonexistent', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause'],
},
{
	name: "[Gen 8] Pure Hackmons",
	desc: "Anything directly hackable onto a set and usable in local battles is allowed.",
	mod: 'gen8',
	searchShow: false,
	ruleset: ['-Nonexistent', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause'],
},
{
	name: "[Gen 8 BDSP] Pure Hackmons",
	desc: "Anything directly hackable onto a set and usable in local battles is allowed.",
	mod: 'gen8bdsp',
	searchShow: false,
	ruleset: ['-Nonexistent', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause'],
},
{
	name: "[Gen 9] Pure Hackmons",
	desc: `Anything directly hackable onto a set (EVs, IVs, forme, ability, item, and move) and is usable in local battles is allowed.`,
	mod: 'gen9',
	searchShow: false,
	ruleset: ['Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Hackmons Forme Legality', 'Species Reveal Clause', 'Endless Battle Clause'],
},
{
	section: "Balanced Hackmons",
	column: 2,
},
	{
		name: "[Gen 9] Balanced Hackmons",
		desc: `Anything directly hackable onto a set (EVs, IVs, forme, ability, item, and move) and is usable in local battles is allowed.`,
		mod: 'gen9',
		ruleset: [
			'OHKO Clause', 'Evasion Clause', 'Species Clause', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Sleep Moves Clause',
			'Endless Battle Clause', 'Hackmons Forme Legality', 'Species Reveal Clause', 'Terastal Clause',
		],
		banlist: [
			'Calyrex-Shadow', 'Deoxys-Attack', 'Gengar-Mega', 'Mewtwo-Mega-X', 'Mewtwo-Mega-Y', 'Rayquaza-Mega', 'Regigigas', 'Shedinja', 'Slaking', 'Arena Trap',
			'Contrary', 'Gorilla Tactics', 'Hadron Engine', 'Huge Power', 'Illusion', 'Innards Out', 'Libero', 'Liquid Ooze', 'Magnet Pull', 'Moody', 'Neutralizing Gas',
			'Orichalcum Pulse', 'Parental Bond', 'Poison Heal', 'Protean', 'Pure Power', 'Shadow Tag', 'Stakeout', 'Water Bubble', 'Wonder Guard', 'King\'s Rock',
			'Razor Fang', 'Baton Pass', 'Belly Drum', 'Ceaseless Edge', 'Clangorous Soul', 'Dire Claw', 'Electro Shot', 'Fillet Away', 'Imprison', 'Last Respects',
			'Lumina Crash', 'No Retreat', 'Photon Geyser', 'Power Trip', 'Quiver Dance', 'Rage Fist', 'Revival Blessing', 'Shed Tail', 'Sleep Talk', 'Substitute',
			'Shell Smash', 'Tail Glow', 'V-create',
		],
	},
	{
		name: "[Gen 9] National Dex BH",
		desc: `Balanced Hackmons with National Dex elements mixed in.`,
		mod: 'gen9',
		searchShow: false,
		ruleset: [
			'Standard AG', 'NatDex Mod', '!Obtainable',
			'Forme Clause', 'Sleep Moves Clause', 'Ability Clause = 2', 'OHKO Clause', 'Evasion Moves Clause', 'Dynamax Clause', 'CFZ Clause', 'Terastal Clause', '-CAP',
		],
		banlist: [
			'Cramorant-Gorging', 'Calyrex-Shadow', 'Darmanitan-Galar-Zen', 'Eternatus-Eternamax', 'Greninja-Ash', 'Groudon-Primal', 'Rayquaza-Mega', 'Shedinja', 'Terapagos-Stellar', 'Arena Trap',
			'Contrary', 'Gorilla Tactics', 'Hadron Engine', 'Huge Power', 'Illusion', 'Innards Out', 'Magnet Pull', 'Moody', 'Neutralizing Gas', 'Orichalcum Pulse', 'Parental Bond', 'Pure Power',
			'Shadow Tag', 'Stakeout', 'Water Bubble', 'Wonder Guard', 'Gengarite', 'Berserk Gene', 'Belly Drum', 'Bolt Beak', 'Ceaseless Edge', 'Chatter', 'Double Iron Bash', 'Electrify', 'Imprison',
			'Last Respects', 'Octolock', 'Rage Fist', 'Revival Blessing', 'Shed Tail', 'Shell Smash', 'Sleep Talk',
		],
		restricted: ['Arceus'],
		onValidateTeam(team, format) {
			// baseSpecies:count
			const restrictedPokemonCount = new this.dex.Multiset<string>();
			for (const set of team) {
				const species = this.dex.species.get(set.species);
				if (!this.ruleTable.isRestrictedSpecies(species)) continue;
				restrictedPokemonCount.add(species.baseSpecies);
			}
			for (const [baseSpecies, count] of restrictedPokemonCount) {
				if (count > 1) {
					return [
						`You are limited to one ${baseSpecies} forme.`,
						`(You have ${count} ${baseSpecies} forme${count === 1 ? '' : 's'}.)`,
					];
				}
			}
		},
	},
	{
		section: "Random Hackmons",
		column: 2,
	},
	{
		name: "[Gen 9] Hackmons Cup",
		desc: `Randomized teams of level-balanced Pok&eacute;mon with absolutely any ability, moves, and item.`,
		mod: 'gen9',
		team: 'randomHC',
		bestOfDefault: true,
		ruleset: ['HP Percentage Mod', 'Cancel Mod'],
		banlist: ['CAP', 'Custom', 'Future', 'LGPE', 'MissingNo.', 'Pikachu-Cosplay', 'Pichu-Spiky-eared', 'Xerneas-Neutral'],
	},
	{
		name: "[Gen 9] Doubles Hackmons Cup",
		desc: `Randomized teams of level-balanced Pok&eacute;mon with absolutely any ability, moves, and item. Now with TWICE the Pok&eacute;mon per side!`,
		mod: 'gen9',
		team: 'randomHC',
		searchShow: false,
		bestOfDefault: true,
		gameType: 'doubles',
		ruleset: ['[Gen 9] Hackmons Cup'],
	},
	{
		name: "[Gen 9] Broken Cup",
		desc: `[Gen 9] Hackmons Cup but with only the most powerful Pok&eacute;mon, moves, abilities, and items.`,

		team: 'randomHC',
		bestOfDefault: true,
		ruleset: ['HP Percentage Mod', 'Cancel Mod'],
		banlist: ['All Pokemon', 'All Abilities', 'All Items', 'All Moves'],
		unbanlist: [
			'10,000,000 Volt Thunderbolt', 'Abomasnow-Mega', 'Absol-Mega', 'Accelerock', 'Acid Spray', 'Adaptability', 'Aeroblast',
			'Aerodactyl-Mega', 'Aftermath', 'Aggron', 'Aggron-Mega', 'Aguav Berry', 'Air Balloon', 'Air Slash', 'Alakazam-Mega',
			'Alluring Voice', 'Altaria-Mega', 'Ampharos-Mega', 'Analytic', 'Anchor Shot', 'Anger Shell', 'Annihilape', 'Anticipation',
			'Apple Acid', 'Aqua Step', 'Arcanine', 'Arcanine-Hisui', 'Archaludon', 'Archeops', 'Arena Trap', 'Armarouge', 'Armor Cannon',
			'Aromatherapy', 'Articuno', 'Articuno-Galar', 'As One (Glastrier)', 'As One (Spectrier)', 'Assault Vest', 'Astral Barrage',
			'Attack Order', 'Audino-Mega', 'Aura Sphere', 'Axe Kick', 'Azelf', 'Baddy Bad', 'Baneful Bunker', 'Banette-Mega',
			'Barb Barrage', 'Basculegion', 'Basculegion-F', 'Baton Pass', 'Baxcalibur', 'Beads of Ruin', 'Beak Blast', 'Beast Boost',
			'Behemoth Bash', 'Behemoth Blade', 'Belly Drum', 'Berserk', 'Bitter Blade', 'Bitter Malice', 'Blacephalon', 'Blastoise',
			'Blastoise-Mega', 'Blaziken', 'Blaziken-Mega', 'Blazing Torque', 'Bleakwind Storm', 'Blissey', 'Blizzard', 'Blood Moon',
			'Blue Flare', 'Blunder Policy', 'Body Press', 'Body Slam', 'Bolt Beak', 'Bolt Strike', 'Boomburst', 'Bouncy Bubble',
			'Brave Bird', 'Bright Powder', 'Brute Bonnet', 'Bug Buzz', 'Bullet Punch', 'Burning Bulwark', 'Buzzwole', 'Buzzy Buzz',
			'Calm Mind', 'Calyrex-Ice', 'Calyrex-Shadow', 'Camerupt-Mega', 'Catastropika', 'Ceaseless Edge', 'Celebi', 'Celesteela',
			'Centiskorch', 'Ceruledge', 'Charizard', 'Charizard-Mega-X', 'Charizard-Mega-Y', 'Chatter', 'Chesnaught', 'Chesto Berry',
			'Chi-Yu', 'Chien-Pao', 'Chilan Berry', 'Chilling Neigh', 'Chilly Reception', 'Choice Band', 'Choice Scarf', 'Choice Specs',
			'Cinderace', 'Circle Throw', 'Clanging Scales', 'Clangorous Soul', 'Clangorous Soulblaze', 'Clear Amulet', 'Clear Body',
			'Clear Smog', 'Close Combat', 'Cloyster', 'Cobalion', 'Coil', 'Collision Course', 'Comatose', 'Combat Torque', 'Competitive',
			'Compound Eyes', 'Contrary', 'Core Enforcer', 'Cosmic Power', 'Cotton Guard', 'Court Change', 'Covert Cloak', 'Crabhammer',
			'Cresselia', 'Crobat', 'Cross Chop', 'Curse', 'Custap Berry', 'Dark Pulse', 'Darkest Lariat', 'Darkrai',
			'Darmanitan-Galar-Zen', 'Darmanitan-Zen', 'Decidueye', 'Decidueye-Hisui', 'Defend Order', 'Defiant', 'Defog', 'Delphox',
			'Deoxys', 'Deoxys-Attack', 'Deoxys-Defense', 'Deoxys-Speed', 'Desolate Land', 'Dialga', 'Dialga-Origin', 'Diamond Storm',
			'Diancie', 'Diancie-Mega', 'Dire Claw', 'Disable', 'Discharge', 'Dondozo', 'Doom Desire', 'Double Iron Bash', 'Download',
			'Draco Meteor', 'Draco Plate', 'Dragapult', 'Dragon Ascent', 'Dragon Dance', 'Dragon Darts', 'Dragon Energy', 'Dragon Hammer',
			'Dragon Pulse', 'Dragon Tail', 'Dragonite', 'Drain Punch', 'Dread Plate', 'Drill Peck', 'Drizzle', 'Drought', 'Drum Beating',
			'Dry Skin', 'Duraludon', 'Dusknoir', 'Dynamax Cannon', 'Earth Eater', 'Earth Plate', 'Earth Power', 'Earthquake',
			'Eerie Spell', 'Effect Spore', 'Eject Pack', 'Electivire', 'Electric Surge', 'Electro Drift', 'Emboar', 'Empoleon',
			'Enamorus', 'Enamorus-Therian', 'Encore', 'Energy Ball', 'Entei', 'Eruption', 'Espeon', 'Esper Wing', 'Eternatus',
			'Eternatus-Eternamax', 'Exeggutor', 'Exeggutor-Alola', 'Expanding Force', 'Expert Belt', 'Explosion', 'Extreme Evoboost',
			'Extreme Speed', 'Fake Out', 'Feraligatr', 'Fezandipiti', 'Fickle Beam', 'Fiery Wrath', 'Figy Berry', 'Filter',
			'Fire Blast', 'Fire Lash', 'First Impression', 'Fishious Rend', 'Fist Plate', 'Flame Body', 'Flame Charge', 'Flame Plate',
			'Flamethrower', 'Flare Blitz', 'Flareon', 'Flash Cannon', 'Fleur Cannon', 'Flip Turn', 'Floaty Fall', 'Florges',
			'Flower Trick', 'Fluffy', 'Flutter Mane', 'Focus Blast', 'Focus Sash', 'Forewarn', 'Foul Play', 'Freeze-Dry', 'Freezing Glare',
			'Freezy Frost', 'Frost Breath', 'Full Metal Body', 'Fur Coat', 'Fusion Bolt', 'Fusion Flare', 'Future Sight', 'G-Max Befuddle',
			'G-Max Cannonade', 'G-Max Centiferno', 'G-Max Resonance', 'G-Max Steelsurge', 'G-Max Stonesurge', 'G-Max Sweetness',
			'G-Max Vine Lash', 'G-Max Volcalith', 'G-Max Wildfire', 'G-Max Wind Rage', 'Gallade-Mega', 'Garchomp', 'Garchomp-Mega',
			'Gardevoir-Mega', 'Gear Grind', 'Genesect', 'Genesis Supernova', 'Gengar-Mega', 'Gholdengo', 'Giga Drain', 'Gigaton Hammer',
			'Giratina', 'Giratina-Origin', 'Glaceon', 'Glacial Lance', 'Glaive Rush', 'Glalie-Mega', 'Glare', 'Glastrier', 'Glimmora',
			'Glitzy Glow', 'Gogoat', 'Golisopod', 'Good as Gold', 'Goodra', 'Goodra-Hisui', 'Gooey', 'Gorilla Tactics', 'Gouging Fire',
			'Grassy Surge', 'Grav Apple', 'Great Tusk', 'Greninja', 'Greninja-Ash', 'Grim Neigh', 'Groudon', 'Groudon-Primal',
			'Guardian of Alola', 'Gunk Shot', 'Guzzlord', 'Gyarados', 'Gyarados-Mega', 'Hadron Engine', 'Hammer Arm', 'Haxorus',
			'Haze', 'Head Charge', 'Head Smash', 'Headlong Rush', 'Heal Bell', 'Heal Order', 'Healing Wish', 'Heart Swap', 'Heat Crash',
			'Heat Wave', 'Heatran', 'Heavy-Duty Boots', 'Heracross-Mega', 'High Horsepower', 'High Jump Kick', 'Hippowdon', 'Ho-Oh',
			'Hone Claws', 'Hoopa', 'Hoopa-Unbound', 'Horn Leech', 'Houndoom-Mega', 'Huge Power', 'Hurricane', 'Hustle', 'Hydreigon',
			'Hydrapple', 'Hydro Pump', 'Hydro Steam', 'Hyper Drill', 'Iapapa Berry', 'Ice Beam', 'Ice Hammer', 'Ice Scales', 'Ice Shard',
			'Ice Spinner', 'Icicle Plate', 'Illusion', 'Imposter', 'Incineroar', 'Infernape', 'Innards Out', 'Insect Plate', 'Inteleon',
			'Intimidate', 'Intrepid Sword', 'Iron Barbs', 'Iron Boulder', 'Iron Bundle', 'Iron Crown', 'Iron Hands', 'Iron Head',
			'Iron Jugulis', 'Iron Leaves', 'Iron Moth', 'Iron Plate', 'Iron Tail', 'Iron Thorns', 'Iron Treads', 'Iron Valiant',
			'Ivy Cudgel', 'Jet Punch', 'Jirachi', 'Jolteon', 'Judgment', 'Jungle Healing', 'Kangaskhan-Mega', 'Kartana', 'Keldeo',
			'Keldeo-Resolute', 'King\'s Rock', 'King\'s Shield', 'Kingambit', 'Kingdra', 'Knock Off', 'Kommo-o', 'Koraidon', 'Kyogre',
			'Kyogre-Primal', 'Kyurem', 'Kyurem-Black', 'Kyurem-White', 'Landorus', 'Landorus-Therian', 'Lapras', 'Last Respects', 'Latias',
			'Latias-Mega', 'Latios', 'Latios-Mega', 'Lava Plume', 'Leaf Blade', 'Leaf Storm', 'Leafeon', 'Leech Life', 'Leech Seed',
			'Leftovers', 'Leppa Berry', 'Let\'s Snuggle Forever', 'Levitate', 'Libero', 'Liechi Berry', 'Life Orb', 'Light Screen',
			'Light That Burns the Sky', 'Light of Ruin', 'Lightning Rod', 'Liquidation', 'Lopunny-Mega', 'Lovely Kiss', 'Low Kick',
			'Lucario', 'Lucario-Mega', 'Lugia', 'Lum Berry', 'Lumina Crash', 'Lunala', 'Lunar Blessing', 'Lunar Dance', 'Lunge',
			'Luster Purge', 'Mach Punch', 'Magearna', 'Magic Bounce', 'Magic Guard', 'Magical Torque', 'Magma Storm', 'Magmortar',
			'Magnezone', 'Mago Berry', 'Make It Rain', 'Malicious Moonsault', 'Malignant Chain', 'Mamoswine', 'Manaphy', 'Manectric-Mega',
			'Marshadow', 'Marvel Scale', 'Matcha Gotcha', 'Max Guard', 'Meadow Plate', 'Megahorn', 'Meganium', 'Melmetal', 'Meloetta',
			'Meloetta-Pirouette', 'Memento', 'Menacing Moonraze Maelstrom', 'Mental Herb', 'Meowscarada', 'Mesprit', 'Metagross',
			'Metagross-Mega', 'Meteor Mash', 'item: Metronome', 'Mew', 'Mewtwo', 'Mewtwo-Mega-X', 'Mewtwo-Mega-Y', 'Mighty Cleave',
			'Milk Drink', 'Milotic', 'Mind Plate', 'Mind\'s Eye', 'Minimize', 'Miraidon', 'Mirror Herb', 'Mist Ball', 'Misty Surge',
			'Mold Breaker', 'Moltres', 'Moltres-Galar', 'Moody', 'Moonblast', 'Moongeist Beam', 'Moonlight', 'Morning Sun', 'Mortal Spin',
			'Mountain Gale', 'Moxie', 'Multiscale', 'Munkidori', 'Muscle Band', 'Mystical Fire', 'Mystical Power', 'Naganadel',
			'Nasty Plot', 'Natural Cure', 'Nature\'s Madness', 'Necrozma', 'Necrozma-Dawn-Wings', 'Necrozma-Dusk-Mane', 'Necrozma-Ultra',
			'Neuroforce', 'Neutralizing Gas', 'Night Daze', 'Night Shade', 'Nihilego', 'No Retreat', 'Noivern', 'Noxious Torque',
			'Nuzzle', 'Oblivion Wing', 'Obstruct', 'Oceanic Operetta', 'Octolock', 'Ogerpon', 'Ogerpon-Cornerstone', 'Ogerpon-Hearthflame',
			'Ogerpon-Wellspring', 'Okidogi', 'Opportunist', 'Orichalcum Pulse', 'Origin Pulse', 'Outrage', 'Overdrive', 'Overheat',
			'Pain Split', 'Palafin-Hero', 'Palkia', 'Palkia-Origin', 'Parental Bond', 'Parting Shot', 'Pecharunt', 'Perish Body',
			'Perish Song', 'Petaya Berry', 'Pheromosa', 'Photon Geyser', 'Pidgeot-Mega', 'Pinsir-Mega', 'Pixie Plate', 'Plasma Fists',
			'Play Rough', 'Poison Heal', 'Poison Point', 'Poison Touch', 'Pollen Puff', 'Poltergeist', 'Population Bomb', 'Porygon-Z',
			'Power Gem', 'Power Trip', 'Power Whip', 'Prankster', 'Precipice Blades', 'Primarina', 'Primordial Sea', 'Prism Armor',
			'Probopass', 'Protean', 'Protect', 'Psyblade', 'Psychic Fangs', 'Psychic Surge', 'Psychic', 'Psycho Boost', 'Psyshield Bash',
			'Psystrike', 'Pulverizing Pancake', 'Pure Power', 'Purifying Salt', 'Pursuit', 'Pyro Ball', 'Quaquaval', 'Quick Claw',
			'Quiver Dance', 'Rage Fist', 'Raging Bolt', 'Raging Bull', 'Raging Fury', 'Raikou', 'Rapid Spin', 'Rayquaza', 'Rayquaza-Mega',
			'Razor Claw', 'Recover', 'Red Card', 'Reflect', 'Regenerator', 'Regice', 'Regidrago', 'Regieleki', 'Regigigas', 'Regirock',
			'Registeel', 'Reshiram', 'Rest', 'Revelation Dance', 'Revival Blessing', 'Rhyperior', 'Rillaboom', 'Roar', 'Roaring Moon',
			'Rocky Helmet', 'Roost', 'Rough Skin', 'Ruination', 'Sacred Fire', 'Sacred Sword', 'Salac Berry', 'Salamence', 'Salamence-Mega',
			'Salt Cure', 'Samurott', 'Samurott-Hisui', 'Sandsear Storm', 'Sandy Shocks', 'Sap Sipper', 'Sappy Seed', 'Scald', 'Sceptile',
			'Sceptile-Mega', 'Scizor-Mega', 'Scope Lens', 'Scream Tail', 'Searing Shot', 'Searing Sunraze Smash', 'Secret Sword',
			'Seed Flare', 'Seismic Toss', 'Serene Grace', 'Serperior', 'Shadow Ball', 'Shadow Bone', 'Shadow Shield', 'Shadow Sneak',
			'Shadow Tag', 'Sharpedo-Mega', 'Shaymin', 'Shaymin-Sky', 'Shed Skin', 'Shed Tail', 'Sheer Force', 'Shell Side Arm',
			'Shell Smash', 'Shield Dust', 'Shift Gear', 'Silk Scarf', 'Silk Trap', 'Silvally', 'Simple', 'Sinister Arrow Raid',
			'Sitrus Berry', 'Sizzly Slide', 'Skeledirge', 'Sky Plate', 'Slack Off', 'Slaking', 'Sleep Powder', 'Slither Wing',
			'Slowbro-Mega', 'Sludge Bomb', 'Sludge Wave', 'Snarl', 'Snipe Shot', 'Snorlax', 'Soft-Boiled', 'Solgaleo', 'Solid Rock',
			'Soul-Heart', 'Soul-Stealing 7-Star Strike', 'Spacial Rend', 'Sparkly Swirl', 'Spectral Thief', 'Spectrier', 'Speed Boost',
			'Spikes', 'Spiky Shield', 'Spin Out', 'Spirit Break', 'Spirit Shackle', 'Splash Plate', 'Splintered Stormshards',
			'Splishy Splash', 'Spooky Plate', 'Spore', 'Springtide Storm', 'Stakataka', 'Stakeout', 'Stamina', 'Static', 'Stealth Rock',
			'Steam Eruption', 'Steelix-Mega', 'Sticky Web', 'Stoked Sparksurfer', 'Stone Axe', 'Stone Edge', 'Stone Plate', 'Stored Power',
			'Storm Drain', 'Storm Throw', 'Strange Steam', 'Strength Sap', 'Sturdy', 'Sucker Punch', 'Suicune', 'Sunsteel Strike',
			'Super Fang', 'Supercell Slam', 'Superpower', 'Supreme Overlord', 'Surf', 'Surging Strikes', 'Swampert', 'Swampert-Mega',
			'Sword of Ruin', 'Swords Dance', 'Sylveon', 'Synthesis', 'Tablets of Ruin', 'Tachyon Cutter', 'Tail Glow', 'Tangling Hair',
			'Tangrowth', 'Tapu Bulu', 'Tapu Fini', 'Tapu Koko', 'Tapu Lele', 'Taunt', 'Techno Blast', 'Teleport', 'Tera Blast',
			'Tera Starstorm', 'Terapagos-Stellar', 'Terapagos-Terastal', 'Teravolt', 'Terrakion', 'Thermal Exchange', 'Thick Fat',
			'Thousand Arrows', 'Thousand Waves', 'Throat Spray', 'Thunder Cage', 'Thunder Wave', 'Thunder', 'Thunderbolt', 'Thunderclap',
			'Thunderous Kick', 'Thundurus', 'Thundurus-Therian', 'Tidy Up', 'Ting-Lu', 'Tinted Lens', 'Togekiss', 'Topsy-Turvy',
			'Torch Song', 'Tornadus', 'Tornadus-Therian', 'Torterra', 'Tough Claws', 'Toxic Chain', 'Toxic Debris', 'Toxic Plate',
			'Toxic Spikes', 'Toxic', 'Tri Attack', 'Triage', 'Triple Arrows', 'Triple Axel', 'Turboblaze', 'Type: Null', 'Typhlosion',
			'Typhlosion-Hisui', 'Tyranitar', 'Tyranitar-Mega', 'U-turn', 'Umbreon', 'Unaware', 'Unburden', 'Ursaluna', 'Ursaluna-Bloodmoon',
			'Urshifu', 'Urshifu-Rapid-Strike', 'Uxie', 'V-create', 'Vanilluxe', 'Vaporeon', 'Venusaur', 'Venusaur-Mega', 'Vessel of Ruin',
			'Victini', 'Victory Dance', 'Virizion', 'Volcanion', 'Volcarona', 'Volt Absorb', 'Volt Switch', 'Volt Tackle', 'Walking Wake',
			'Walrein', 'Water Absorb', 'Water Bubble', 'Water Shuriken', 'Water Spout', 'Waterfall', 'Wave Crash', 'Weakness Policy',
			'Well-Baked Body', 'Whirlwind', 'White Herb', 'Wicked Blow', 'Wicked Torque', 'Wide Lens', 'Wiki Berry', 'Wild Charge',
			'Wildbolt Storm', 'Will-O-Wisp', 'Wise Glasses', 'Wish', 'Wishiwashi-School', 'Wo-Chien', 'Wonder Guard', 'Wood Hammer',
			'Wyrdeer', 'Xerneas', 'Xurkitree', 'Yawn', 'Yveltal', 'Zacian', 'Zacian-Crowned', 'Zamazenta', 'Zamazenta-Crowned', 'Zap Plate',
			'Zapdos', 'Zapdos-Galar', 'Zarude', 'Zekrom', 'Zeraora', 'Zing Zap', 'Zippy Zap', 'Zygarde', 'Zygarde-Complete',
		],
	},
{
	section: "Smogon OU",
	column: 3,
	// name: "smogonofficials",
},
	{
		name: "[Gen 9] OU",
		threads: [
			`&bullet; <a href="https://www.smogon.com/forums/threads/3732644/">SV OU Metagame Discussion</a>`,
			`&bullet; <a href="https://www.smogon.com/forums/threads/3712513/">SV OU Sample Teams</a>`,
			`&bullet; <a href="https://www.smogon.com/forums/threads/3734134/">SV OU Viability Rankings</a>`,
		],
		mod: 'gen9',
		searchShow: false,
		ruleset: ['Standard', 'Evasion Abilities Clause', 'Sleep Moves Clause', '!Sleep Clause Mod'],
		banlist: ['Uber', 'AG', 'Arena Trap', 'Moody', 'Shadow Tag', 'King\'s Rock', 'Razor Fang', 'Baton Pass', 'Last Respects', 'Shed Tail'],
	},
	{
		name: "[Gen 8] OU",
		threads: [
			`&bullet; <a href="https://www.smogon.com/forums/threads/3710887/">SS OU Metagame Discussion</a>`,
			`&bullet; <a href="https://www.smogon.com/forums/threads/3710892/">SS OU Sample Teams</a>`,
			`&bullet; <a href="https://www.smogon.com/forums/threads/3717979/">SS OU Viability Rankings</a>`,
		],

		mod: 'gen8',
		searchShow: false,
		ruleset: ['Standard', 'Dynamax Clause'],
		banlist: ['Uber', 'AG', 'Arena Trap', 'Moody', 'Power Construct', 'Sand Veil', 'Shadow Tag', 'Snow Cloak', 'King\'s Rock', 'Baton Pass'],
	},
	{
		name: "[Gen 7] OU",
		threads: [
			`&bullet; <a href="https://www.smogon.com/forums/threads/3685980/">USM OU Metagame Discussion</a>`,
			`&bullet; <a href="https://www.smogon.com/forums/threads/3695427/">USM OU Sample Teams</a>`,
			`&bullet; <a href="https://www.smogon.com/forums/threads/3667522/">USM OU Viability Rankings</a>`,
		],

		mod: 'gen7',
		searchShow: false,
		ruleset: ['Standard'],
		banlist: ['Uber', 'Arena Trap', 'Power Construct', 'Shadow Tag', 'Baton Pass'],
	},
	{
		name: "[Gen 6] OU",
		threads: [
			`&bullet; <a href="https://www.smogon.com/forums/threads/3719305/">ORAS OU Metagame Discussion</a>`,
			`&bullet; <a href="https://www.smogon.com/forums/threads/3694551/">ORAS OU Sample Teams</a>`,
			`&bullet; <a href="https://www.smogon.com/forums/threads/3623399/">ORAS OU Viability Rankings</a>`,
		],

		mod: 'gen6',
		searchShow: false,
		ruleset: ['Standard'],
		banlist: ['Uber', 'Arena Trap', 'Shadow Tag', 'Soul Dew', 'Baton Pass', 'Swagger'],
	},
	{
		name: "[Gen 5] OU",
		threads: [
			`&bullet; <a href="https://www.smogon.com/forums/threads/3666724/">BW2 OU Metagame Discussion</a>`,
			`&bullet; <a href="https://www.smogon.com/forums/threads/3686880/">BW2 OU Sample Teams</a>`,
			`&bullet; <a href="https://www.smogon.com/forums/threads/3668699/">BW2 OU Viability Rankings</a>`,
		],

		mod: 'gen5',
		searchShow: false,
		ruleset: ['Standard', 'Evasion Abilities Clause', 'Sleep Moves Clause', 'Gems Clause', 'Baton Pass Stat Clause'],
		banlist: ['Uber', 'Arena Trap', 'Drizzle ++ Swift Swim', 'Drought ++ Chlorophyll', 'Sand Rush', 'Shadow Tag', 'King\'s Rock', 'Razor Fang', 'Soul Dew', 'Assist', 'Swagger'],
	},
	{
		name: "[Gen 4] OU",
		threads: [
			`&bullet; <a href="https://www.smogon.com/forums/threads/3685887/">DPP OU Metagame Discussion</a>`,
			`&bullet; <a href="https://www.smogon.com/forums/threads/3687351/">DPP OU Sample Teams</a>`,
			`&bullet; <a href="https://www.smogon.com/forums/threads/3683332/">DPP OU Viability Rankings</a>`,
		],

		mod: 'gen4',
		searchShow: false,
		ruleset: ['Standard', 'Evasion Abilities Clause', 'Baton Pass Stat Trap Clause', 'Freeze Clause Mod'],
		banlist: ['AG', 'Uber', 'Arena Trap', 'Quick Claw', 'Soul Dew', 'Swagger'],
	},
	{
		name: "[Gen 3] OU",
		threads: [
			`&bullet; <a href="https://www.smogon.com/forums/threads/3687814/">ADV OU Metagame Discussion</a>`,
			`&bullet; <a href="https://www.smogon.com/forums/threads/3687813/">ADV OU Sample Teams</a>`,
			`&bullet; <a href="https://www.smogon.com/forums/threads/3503019/">ADV OU Viability Rankings</a>`,
		],

		mod: 'gen3',
		searchShow: false,
		ruleset: ['Standard', 'One Boost Passer Clause', 'Freeze Clause Mod'],
		banlist: ['Uber', 'Smeargle + Ingrain', 'Sand Veil', 'Soundproof', 'Assist', 'Baton Pass + Block', 'Baton Pass + Mean Look', 'Baton Pass + Spider Web', 'Swagger'],
	},
	{
		name: "[Gen 2] OU",
		threads: [
			`&bullet; <a href="https://www.smogon.com/forums/threads/3688141/">GSC OU Metagame Discussion</a>`,
			`&bullet; <a href="https://www.smogon.com/forums/threads/3688523/">GSC OU Sample Teams</a>`,
			`&bullet; <a href="https://www.smogon.com/forums/threads/3633233/">GSC OU Viability Rankings</a>`,
		],

		mod: 'gen2',
		searchShow: false,
		ruleset: ['Standard'],
		banlist: ['Uber', 'Mean Look + Baton Pass', 'Spider Web + Baton Pass'],
	},
	{
		name: "[Gen 1] OU",
		threads: [
			`&bullet; <a href="https://www.smogon.com/forums/threads/3685846/">RBY OU Metagame Discussion</a>`,
			`&bullet; <a href="https://www.smogon.com/forums/threads/3689726/">RBY OU Sample Teams</a>`,
			`&bullet; <a href="https://www.smogon.com/forums/threads/3685861/">RBY OU Viability Rankings</a>`,
		],

		mod: 'gen1',
		searchShow: false,
		ruleset: ['Standard'],
		banlist: ['Uber'],
	},
	{
	section: "Custom Game",
	column: 3,
	// name: 'customgame',
	},
	{
		// another CG but its doubles, really could be in either spot
		name: "[Gen 9] Doubles Custom Game",
		mod: 'gen9',
		gameType: 'doubles',
		searchShow: false,
		battle: {trunc: Math.trunc},
		debug: true,
		ruleset: ['Team Preview', 'Cancel Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100'],
	},
	{
		name: "[Gen 9] Mix and Mega Custom Game",
		desc: `Mega evolve any Pok&eacute;mon with any mega stone, or transform them with Genesect Drives, Primal orbs, Origin orbs, Rusted items, Ogerpon Masks, Arceus Plates, and Silvally Memories with no limit. Mega and Primal boosts based on form changes from gen 7.`,
		mod: 'mixandmega',
		searchShow: false,
		ruleset: ['Team Preview', 'Cancel Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100', 'Terastal Clause'],
		onBegin() {
			for (const pokemon of this.getAllPokemon()) {
				pokemon.m.originalSpecies = pokemon.baseSpecies.name;
			}
		},
		onSwitchIn(pokemon) {
			const originalSpecies = this.dex.species.get((pokemon.species as any).originalSpecies);
			if (originalSpecies.exists && pokemon.m.originalSpecies !== originalSpecies.baseSpecies) {
				// Place volatiles on the Pokémon to show its mega-evolved condition and details
				this.add('-start', pokemon, originalSpecies.requiredItems?.[0] || originalSpecies.requiredItem || originalSpecies.requiredMove, '[silent]');
				const oSpecies = this.dex.species.get(pokemon.m.originalSpecies);
				if (oSpecies.types.join('/') !== pokemon.species.types.join('/')) {
					this.add('-start', pokemon, 'typechange', pokemon.species.types.join('/'), '[silent]', '[from] format: Mix and Mega');
				}
			}
		},
		onSwitchOut(pokemon) {
			const originalSpecies = this.dex.species.get((pokemon.species as any).originalSpecies);
			if (originalSpecies.exists && pokemon.m.originalSpecies !== originalSpecies.baseSpecies) {
				this.add('-end', pokemon, originalSpecies.requiredItems?.[0] || originalSpecies.requiredItem || originalSpecies.requiredMove, '[silent]');
			}
		},
	},
	{
		name: "[Gen 9] Shared Power Custom Game",
		desc: `Once a Pok&eacute;mon switches in, its ability is shared with the rest of the team.`,
		mod: 'sharedpower',
		searchShow: false,
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100'],
		onValidateRule() {
			if (this.format.gameType !== 'singles') {
				throw new Error(`Shared Power currently does not support ${this.format.gameType} battles.`);
			}
		},
		getSharedPower(pokemon) {
			const sharedPower = new Set<string>();
			for (const ally of pokemon.side.pokemon) {
				if (pokemon.battle.ruleTable.isRestricted(`ability:${ally.baseAbility}`)) continue;
				if (ally.previouslySwitchedIn > 0) {
					if (pokemon.battle.dex.currentMod !== 'sharedpower' && ['trace', 'mirrorarmor'].includes(ally.baseAbility)) {
						sharedPower.add('noability');
						continue;
					}
					sharedPower.add(ally.baseAbility);
				}
			}
			sharedPower.delete(pokemon.baseAbility);
			return sharedPower;
		},
		onBeforeSwitchIn(pokemon) {
			let format = this.format;
			if (!format.getSharedPower) format = this.dex.formats.get('gen9sharedpower');
			for (const ability of format.getSharedPower!(pokemon)) {
				const effect = 'ability:' + this.toID(ability);
				pokemon.volatiles[effect] = this.initEffectState({ id: effect, target: pokemon });
				if (!pokemon.m.abils) pokemon.m.abils = [];
				if (!pokemon.m.abils.includes(effect)) pokemon.m.abils.push(effect);
			}
		},
	},
	{
		name: "[Gen 9] Custom Game",
		mod: 'gen9',
		searchShow: false,
		debug: true,
		battle: {trunc: Math.trunc},
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100'],
	},
	{
		name: "[Gen 8] Custom Game",
		mod: 'gen8',
		searchShow: false,
		debug: true,
		battle: {trunc: Math.trunc},
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100'],
	},
	{
		name: "[Gen 7] Custom Game",
		mod: 'gen7',
		searchShow: false,
		debug: true,
		battle: {trunc: Math.trunc},
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100'],
	},
	{
		name: "[Gen 6] Custom Game",
		mod: 'gen6',
		searchShow: false,
		debug: true,
		battle: {trunc: Math.trunc},
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100'],
	},
	{
		name: "[Gen 5] Custom Game",
		mod: 'gen5',
		searchShow: false,
		debug: true,
		battle: {trunc: Math.trunc},
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100'],
	},
	{
		name: "[Gen 4] Custom Game",
		mod: 'gen4',
		searchShow: false,
		debug: true,
		battle: {trunc: Math.trunc},
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100'],
	},
	{
		name: "[Gen 3] Custom Game",
		mod: 'gen3',
		searchShow: false,
		debug: true,
		battle: {trunc: Math.trunc},
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Desync Clause Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100'],
	},
	{
		name: "[Gen 2] Custom Game",

		mod: 'gen2',
		searchShow: false,
		debug: true,
		battle: {trunc: Math.trunc},
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100'],
	},
	{
		name: "[Gen 1] Custom Game",
		mod: 'gen1',
		searchShow: false,
		debug: true,
		battle: {trunc: Math.trunc},
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100'],
	},

	{
	section: "Custom Game Doubles",
	column: 3,
	// name: 'customgame',
	},
	{
		name: "[Gen 9] Doubles Custom Game",
		mod: 'gen9',
		gameType: 'doubles',
		searchShow: false,
		debug: true,
		battle: {trunc: Math.trunc},
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100'],
	},
	{
		name: "[Gen 8] Doubles Custom Game",
		mod: 'gen8',
		gameType: 'doubles',		
		searchShow: false,
		debug: true,
		battle: {trunc: Math.trunc},
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100'],
	},
	{
		name: "[Gen 7] Doubles Custom Game",
		mod: 'gen7',
		gameType: 'doubles',		
		searchShow: false,
		debug: true,
		battle: {trunc: Math.trunc},
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100'],
	},
	{
		name: "[Gen 6] Doubles Custom Game",
		mod: 'gen6',
		gameType: 'doubles',		
		searchShow: false,
		debug: true,
		battle: {trunc: Math.trunc},
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100'],
	},
	{
		name: "[Gen 5] Doubles Custom Game",
		mod: 'gen5',
		gameType: 'doubles',		
		searchShow: false,
		debug: true,
		battle: {trunc: Math.trunc},
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100'],
	},
	{
		name: "[Gen 4] Doubles Custom Game",
		mod: 'gen4',
		gameType: 'doubles',		
		searchShow: false,
		debug: true,
		battle: {trunc: Math.trunc},
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100'],
	},
	{
		name: "[Gen 3] Doubles Custom Game",
		mod: 'gen3',
		gameType: 'doubles',		
		searchShow: false,
		debug: true,
		battle: {trunc: Math.trunc},
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Desync Clause Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100'],
	},
	{
		name: "[Gen 2] DoublesCustom Game",
		mod: 'gen2',
		gameType: 'doubles',		
		searchShow: false,
		debug: true,
		battle: {trunc: Math.trunc},
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100'],
	},
	{
		name: "[Gen 1] Doubles Custom Game",
		mod: 'gen1',
		gameType: 'doubles',		
		searchShow: false,
		debug: true,
		battle: {trunc: Math.trunc},
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100'],
	},
	{
	section: "PS! Misc",
	column: 3,
	// name: 'showdowntiers',
	},
	{
		name: "[Gen 9] LC",
		mod: 'gen9',
		searchShow: false,
		ruleset: ['Little Cup', 'Standard'],
		banlist: [
			'Aipom', 'Basculin-White-Striped', 'Cutiefly', 'Diglett-Base', 'Dunsparce', 'Duraludon', 'Flittle', 'Gastly', 'Girafarig', 'Gligar',
			'Meditite', 'Misdreavus', 'Murkrow', 'Porygon', 'Qwilfish-Hisui', 'Rufflet', 'Scraggy', 'Scyther', 'Sneasel', 'Sneasel-Hisui',
			'Snivy', 'Stantler', 'Vulpix', 'Vulpix-Alola', 'Yanma', 'Moody', 'Baton Pass', 'Sticky Web',
		],
	},
	{
		name: "[Gen 9] Anything Goes",
		threads: [
			`&bullet; <a href="https://www.smogon.com/forums/threads/3710911/">AG Metagame Discussion</a>`,
		],
		mod: 'gen9',
		searchShow: false,
		ruleset: ['Min Source Gen = 9', 'Obtainable', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause'],
	},
	{
		name: "[Gen 9] Triples",
		mod: 'gen9',
		gameType: 'triples',
		searchShow: false,
		ruleset: ['Standard Doubles', 'Evasion Abilities Clause'],
		banlist: [
			'Annihilape', 'Arceus', 'Calyrex-Ice', 'Calyrex-Shadow', 'Darkrai', 'Dialga', 'Dialga-Origin', 'Eternatus', 'Flutter Mane', 'Giratina', 'Giratina-Origin',
			'Groudon', 'Ho-Oh', 'Indeedee', 'Indeedee-F', 'Koraidon', 'Kyogre', 'Kyurem-Black', 'Kyurem-White', 'Lugia', 'Lunala', 'Magearna', 'Mewtwo', 'Miraidon',
			'Necrozma-Dawn-Wings', 'Necrozma-Dusk-Mane', 'Palkia', 'Palkia-Origin', 'Rayquaza', 'Reshiram', 'Solgaleo', 'Terapagos', 'Urshifu', 'Urshifu-Rapid-Strike',
			'Zacian', 'Zacian-Crowned', 'Zamazenta', 'Zamazenta-Crowned', 'Zekrom', 'Moody', 'Shadow Tag', 'Bright Powder', 'King\'s Rock', 'Razor Fang',
		],
	},
	{
		name: "[Gen 9] Doubles OU",
		threads: [
			`&bullet; <a href="https://www.smogon.com/forums/threads/3710876/">Doubles OU Sample Teams</a>`,
		],
		searchShow: false,
		mod: 'gen9',
		gameType: 'doubles',
		ruleset: ['Standard Doubles', 'Evasion Abilities Clause'],
		banlist: ['DUber', 'Shadow Tag', 'Commander'],
	},
	{
		name: "[Gen 9] National Dex",
		threads: [
			`&bullet; <a href="https://www.smogon.com/forums/threads/3710848/">National Dex Metagame Discussion</a>`,
		],
		searchShow: false,
		mod: 'gen9',
		ruleset: ['Standard NatDex', 'Terastal Clause'],
		banlist: [
			'ND Uber', 'ND AG', 'Arena Trap', 'Moody', 'Power Construct', 'Shadow Tag', 'King\'s Rock',
			'Quick Claw', 'Razor Fang', 'Assist', 'Baton Pass', 'Last Respects', 'Shed Tail',
		],
	},
	{
		name: "[Gen 9] National Dex AG",
		threads: [
			`&bullet; <a href="https://www.smogon.com/forums/threads/3672423/">National Dex AG</a>`,
		],
		searchShow: false,
		mod: 'gen9',
		ruleset: ['Standard AG', 'NatDex Mod'],
	},
];
