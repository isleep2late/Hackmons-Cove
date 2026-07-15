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

const gen4RageGlitchEligible = ['abra','absol','aerodactyl','aggron','aipom','alakazam','altaria','ambipom','ampharos','anorith','arbok','arcanine','ariados','armaldo','aron','articuno','azumarill','azurill','bagon','baltoy','banette','barboach','bayleef','beautifly','beedrill','beldum','bellossom','bellsprout','blastoise','blaziken','blissey','bonsly','breloom','bulbasaur','butterfree','cacnea','cacturne','camerupt','carvanha','cascoon','castform','caterpie','celebi','chansey','charizard','charmander','charmeleon','chatot','chikorita','chimchar','chimecho','chinchou','clamperl','claydol','clefable','clefairy','cleffa','cloyster','combusken','corphish','corsola','cradily','crawdaunt','crobat','croconaw','cubone','cyndaquil','delcatty','delibird','deoxys','dewgong','diglett','ditto','dodrio','doduo','donphan','dragonair','dragonite','dratini','drowzee','dugtrio','dunsparce','dusclops','dusknoir','duskull','dustox','eevee','ekans','electabuzz','electivire','electrike','electrode','elekid','entei','espeon','exeggcute','exeggutor','exploud','farfetchd','fearow','feebas','feraligatr','flaaffy','flareon','flygon','forretress','froslass','furret','gallade','gardevoir','gastly','gengar','geodude','girafarig','glaceon','glalie','glameow','gligar','gliscor','gloom','golbat','goldeen','golduck','golem','gorebyss','granbull','graveler','grimer','groudon','grovyle','growlithe','grumpig','gulpin','gyarados','happiny','hariyama','haunter','heracross','hitmonchan','hitmonlee','hitmontop','honchkrow','hooh','hoothoot','hoppip','horsea','houndoom','houndour','huntail','hypno','igglybuff','illumise','infernape','ivysaur','jigglypuff','jirachi','jolteon','jumpluff','jynx','kabuto','kabutops','kadabra','kakuna','kangaskhan','kecleon','kingdra','kingler','kirlia','koffing','krabby','kyogre','lairon','lanturn','lapras','larvitar','latias','latios','leafeon','ledian','ledyba','lickilicky','lickitung','lileep','linoone','lombre','lotad','loudred','lucario','ludicolo','lugia','lunatone','luvdisc','machamp','machoke','machop','magby','magcargo','magikarp','magmar','magmortar','magnemite','magneton','magnezone','makuhita','mamoswine','manectric','mankey','mantine','mareep','marill','marowak','marshtomp','masquerain','mawile','medicham','meditite','meganium','meowth','mesprit','metagross','metang','metapod','mew','mewtwo','mightyena','milotic','miltank','mimejr','minun','misdreavus','mismagius','moltres','monferno','mrmime','mudkip','muk','munchlax','murkrow','natu','nidoking','nidoqueen','nidoranf','nidoranm','nidorina','nidorino','nincada','ninetales','ninjask','noctowl','nosepass','numel','nuzleaf','octillery','oddish','omanyte','omastar','onix','paras','parasect','pelipper','persian','phanpy','pichu','pidgeot','pidgeotto','pidgey','pikachu','piloswine','pineco','pinsir','plusle','politoed','poliwag','poliwhirl','poliwrath','ponyta','poochyena','porygon','porygon2','porygonz','primeape','probopass','psyduck','pupitar','purugly','quagsire','quilava','qwilfish','raichu','raikou','ralts','rapidash','raticate','rattata','rayquaza','regice','regirock','registeel','relicanth','remoraid','rhydon','rhyhorn','rhyperior','riolu','roselia','roserade','sableye','salamence','sandshrew','sandslash','sceptile','scizor','scyther','seadra','seaking','sealeo','seedot','seel','sentret','seviper','sharpedo','shedinja','shelgon','shellder','shiftry','shroomish','shuckle','shuppet','silcoon','skarmory','skiploom','skitty','slaking','slakoth','slowbro','slowking','slowpoke','slugma','smeargle','smoochum','sneasel','snorlax','snorunt','snubbull','solrock','spearow','spheal','spinarak','spinda','spoink','squirtle','stantler','starmie','staryu','steelix','sudowoodo','suicune','sunflora','sunkern','surskit','swablu','swalot','swampert','swellow','swinub','taillow','tangela','tangrowth','tauros','teddiursa','tentacool','tentacruel','togekiss','togepi','togetic','torchic','torkoal','totodile','trapinch','treecko','tropius','typhlosion','tyranitar','tyrogue','umbreon','unown','ursaring','vaporeon','venomoth','venonat','venusaur','vibrava','victreebel','vigoroth','vileplume','volbeat','voltorb','vulpix','wailmer','wailord','walrein','wartortle','weavile','weedle','weepinbell','weezing','whiscash','whismur','wigglytuff','wingull','wobbuffet','wooper','wurmple','wynaut','xatu','yanma','yanmega','zangoose','zapdos','zigzagoon','zubat'];

export const Formats: import('../sim/dex-formats').FormatList = [
		
	//////////////////////////////////
	///// All Gens Pure Hackmons /////
	//////////////////////////////////
	{
		section: "Pure Hackmons",
		column: 1,
	},
	{
		name: "[Gen 9] Pure Hackmons",
		desc: `Anything directly hackable onto a set (EVs, IVs, forme, ability, item, and move) and is usable in local battles is allowed.`,
		mod: 'gen9',
		//searchShow: false,
		ruleset: ['Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Hackmons Forme Legality', 'Species Reveal Clause', 'Endless Battle Clause'],
	},
	{
		name: "[Gen 8] Pure Hackmons",
		desc: "Anything directly hackable onto a set and usable in local battles is allowed.",
		mod: 'gen8',
		searchShow: false,
		ruleset: ['-Nonexistent', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause'],
	},
	{
		name: "[Gen 7] Pure Hackmons",
		desc: `Anything that can be hacked in-game and is usable in local battles is allowed.`,
		mod: 'gen7',
		//searchShow: false,
		ruleset: ['-Nonexistent', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause'],
	},
	{
		name: "[Gen 6] Pure Hackmons",
		desc: `Anything that can be hacked in-game and is usable in local battles is allowed.`,
		mod: 'gen6',
		//searchShow: false,
		ruleset: ['-Nonexistent', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause', 'EV limit = 510'],
	},
	{
		name: "[Gen 5] Pure Hackmons",
		desc: "Anything directly hackable onto a set and usable in local battles is allowed.",
		mod: 'gen5',
		searchShow: false,
		ruleset: ['-Nonexistent', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause'],
	},
	{
		name: "[Gen 4] Pure Hackmons",
		desc: "Anything directly hackable onto a set and usable in local battles is allowed.",
		mod: 'gen4',
		searchShow: false,
		banlist: ['Arceus-Question', 'Question Mark Plate'],
		ruleset: ['-Nonexistent', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause'],
	},
	{
		name: "[Gen 3] Pure Hackmons",
		desc: "Anything directly hackable onto a set and usable in local battles is allowed.",
		mod: 'gen3',
		searchShow: false,
		ruleset: ['-Nonexistent', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause', '+No Ability', 'Obtainable Abilities'],
	},
	{
		name: "[Gen 2] Pure Hackmons",
		desc: "Anything directly hackable onto a set and usable in local battles is allowed.",
		mod: 'gen2',
		searchShow: false,
		ruleset: ['-Nonexistent', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause'],
	},
	{
		name: "[Gen 1] Pure Hackmons",
		desc: "Anything directly hackable onto a set and usable in local battles is allowed.",
		mod: 'gen1',
		searchShow: false,
		ruleset: ['-Nonexistent', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause', 'Max Level = 255', 'Default Level = 100'],
	},
	{
		name: "[Gen 9] National Dex Pure Hackmons",
		desc: `Anything directly hackable onto a set (EVs, IVs, forme, ability, item, and move) and is usable in local battles is allowed.`,
		mod: 'gen9',
		searchShow: false,
		ruleset: ['Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Hackmons Forme Legality', 'Species Reveal Clause', 'Endless Battle Clause', 'NatDex Mod'],
	},
	{
		name: "[Gen 8 BDSP] Pure Hackmons",
		desc: "Anything directly hackable onto a set and usable in local battles is allowed.",
		mod: 'gen8bdsp',
		searchShow: false,
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
		name: "[Gen 9 Champions] Pure Hackmons",
		desc: `A theoretical Pure Hackmons-based metagame in the Champions scene.`,
		mod: 'champions',
		//searchShow: false,
		ruleset: ['Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Hackmons Forme Legality', 'Species Reveal Clause', 'Endless Battle Clause',
			'Max Level = 50', 'EV Limit = 192', 'EV Limits = Atk 0-32 / Def 0-32 / SpA 0-32 / SpD 0-32 / Spe 0-32 / HP 0-32',
			'-Nonexistent', '-Past'
		],
	},
	//////////////////////////////////
	////////// OM Hackmons ///////////
	//////////////////////////////////
	{
		section: "Hackmons Other Metas",
		column: 1,
	},
	{
		name: "[Gen 9] Bio Mech Mons Pure Hackmons",
		desc: `Items, abilities, and moves a Pok&eacute;mon has access to can be put in any item/move/ability slot.`,
		mod: 'biomechmons',
		searchShow: false,
		ruleset: ['Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Hackmons Forme Legality', 'Species Reveal Clause', 'Endless Battle Clause'],
		validateSet(set, teamHas) {
			const dex = this.dex;
			let species = dex.species.get(set.species);
			let requiredItems: string[] = [];
			let requiredMove = '';
			let requiredAbility = '';
			if (species.requiredItems) requiredItems = species.requiredItems;
			if (species.requiredMove) requiredMove = species.requiredMove;
			if (species.requiredAbility) requiredAbility = species.requiredAbility;
			if (species.battleOnly) species = dex.species.get(species.battleOnly as string);

			const effectFunctions = [dex.abilities, dex.items, dex.moves];
			if (
				!effectFunctions.some(f => f.get(set.ability).exists) &&
				!(set.item && effectFunctions.some(f => f.get(set.item).exists)) &&
				!set.moves.every(move => effectFunctions.some(f => f.get(move).exists))
			) {
				return this.validateSet(set, teamHas);
			}
			const allThings = [set.ability, set.item, ...set.moves].filter(e => e.length);
			for (const thing of allThings) {
				if (this.toID(thing) === 'trace' || this.toID(thing) === 'neutralizinggas') {
					return [`${thing} is currently bugged and is banned.`];
				}
				if (!dex.moves.get(thing).exists && !dex.abilities.get(thing).exists && !dex.items.get(thing).exists) {
					return [`${thing} does not exist.`];
				}
			}
			if (
				allThings.some(y => effectFunctions.some(x => x.get(y).isNonstandard &&
					!this.ruleTable.has(`+pokemontag:${this.toID(x.get(y).isNonstandard)}`)))
			) {
				return this.validateSet(set, teamHas);
			}
			const moves = allThings.map(e => this.dex.moves.get(e)).filter(thing => thing.id !== 'metronome' && thing.exists);
			for (const m of moves) {
				if (this.ruleTable.isBanned(`move:${m.id}`)) return [`${set.species}'s move ${m.name} is banned.`];
			}

			const abilities = allThings.map(e => this.dex.abilities.get(e)).filter(thing => thing.exists);
			for (const a of abilities) {
				if (this.ruleTable.isBanned(`ability:${a.id}`)) return [`${set.species}'s ability ${a.name} is banned.`];
			}

			const items = allThings.map(e => this.dex.items.get(e)).filter(thing => thing.exists);
			for (const i of items) {
				if (this.ruleTable.isBanned(`item:${i.id}`)) return [`${set.species}'s item ${i.name} is banned.`];
			}

			const setHas: { [k: string]: true } = {};
			for (const thing of [...moves, ...items, ...abilities]) {
				if (setHas[thing.id]) return [`${set.species} has multiple copies of ${thing.name}.`];
				setHas[thing.id] = true;
			}
			const normalAbility = set.ability;
			if (!abilities.length) {
				set.ability = 'noability';
			} else {
				set.ability = abilities[0].id;
			}
			if (abilities.some(abil => !Object.values(species.abilities).map(this.toID).includes(abil.id)) &&
				this.ruleTable.has('obtainableabilities')
			) {
				if (set.ability !== 'noability') return [`${set.species} has illegal abilities.`];
			}
			if (requiredAbility && !abilities.map(a => a.id).includes(this.toID(requiredAbility))) {
				return [`${set.species} requires ${requiredAbility} on its set.`];
			}
			if (!moves.length) {
				return [`${set.species} requires at least one move.`];
			}
			if (set.moves.length > this.ruleTable.maxMoveCount) {
				return [`${set.name} has ${set.moves.length} moves, which is more than the limit of ${this.ruleTable.maxMoveCount}.`];
			}
			const normalMoves = set.moves;
			set.moves = [moves[0].id];
			if (moves.some(move => this.checkCanLearn(move, species)) && this.ruleTable.has('obtainablemoves')) {
				return [`${set.species} has illegal moves.`];
			}
			if (requiredMove && !moves.map(m => m.id).includes(this.toID(requiredMove))) {
				return [`${set.species} requires ${requiredMove} on its set.`];
			}
			if (!items.length && requiredItems.length) {
				return [`${set.species} requires ${requiredItems.join(', ')} on its set.`];
			}
			const normalItem = set.item;
			if (items.length) {
				set.item = (items.find(i => i.forcedForme || i.itemUser) || items[0]).id;
			} else {
				set.item = '';
			}
			if (!this.ruleTable.has('+ability:noability')) {
				this.ruleTable.set('+ability:noability', '');
			}
			for (const curMove of moves) {
				set.moves = [curMove.id];
				if (requiredMove && moves.map(m => m.id).includes(curMove.id) &&
					curMove.id !== this.toID(requiredMove)) {
					set.moves.push(requiredMove);
				}
				let problems = this.validateSet(set, teamHas);
				if (problems) problems = problems.filter(p => !p.endsWith('needs to have an ability.'));
				if (problems?.length) return problems;
			}
			set.ability = normalAbility;
			set.item = normalItem;
			set.moves = normalMoves;
			return null;
		},
		onBeforeSwitchIn(pokemon) {
			let ngas = false;
			for (const poke of this.getAllActive()) {
				if (this.toID(poke.ability) === ('neutralizinggas' as ID)) {
					ngas = true;
					break;
				}
			}
			if (pokemon.hasItem('abilityshield') ||
				pokemon.m.scrambled.items.some((e: { thing: string }) => this.toID(e.thing) === 'abilityshield')) {
				ngas = false;
			}
			for (const ability of pokemon.m.scrambled.abilities) {
				if (this.field.getPseudoWeather('magicroom') && ability.inSlot === 'Item') continue;
				const effect = 'ability:' + this.toID(ability.thing);
				pokemon.volatiles[effect] = this.initEffectState({ id: effect, target: pokemon });
				pokemon.volatiles[effect].inSlot = ability.inSlot;
			}
			for (const item of pokemon.m.scrambled.items) {
				if (ngas && item.inSlot === 'Ability') continue;
				const effect = 'item:' + this.toID(item.thing);
				pokemon.volatiles[effect] = this.initEffectState({ id: effect, target: pokemon });
				pokemon.volatiles[effect].inSlot = item.inSlot;
			}
			if (ngas) {
				if ((pokemon.m.scrambled.moves as { inSlot: string }[]).findIndex(e => e.inSlot === 'Ability') >= 0) {
					const isMove = (pokemon.m.scrambled.moves as { inSlot: string }[]).findIndex(e => e.inSlot === 'Ability');
					const indexOfMove = pokemon.moveSlots.findIndex(m => this.toID(pokemon.m.scrambled.moves[isMove].thing) === m.id);
					if (indexOfMove >= 0) pokemon.moveSlots.splice(indexOfMove, 1);
				}
			}
			if (this.field.getPseudoWeather('magicroom')) {
				if ((pokemon.m.scrambled.moves as { inSlot: string }[]).findIndex(e => e.inSlot === 'Item') >= 0) {
					const isMove = (pokemon.m.scrambled.moves as { inSlot: string }[]).findIndex(e => e.inSlot === 'Item');
					const indexOfMove = pokemon.moveSlots.findIndex(m => this.toID(pokemon.m.scrambled.moves[isMove].thing) === m.id);
					if (indexOfMove >= 0) pokemon.moveSlots.splice(indexOfMove, 1);
				}
			}
		},
		onBegin() {
			for (const pokemon of this.getAllPokemon()) {
				// for everything not in the correct slot
				pokemon.m.scrambled = {
					abilities: [] as object[],
					items: [] as object[],
					moves: [] as object[],
				};

				if (this.dex.items.get(pokemon.set.ability).exists) {
					pokemon.m.scrambled.items.push({ thing: this.dex.items.get(pokemon.set.ability).name, inSlot: 'Ability' });
				} else if (this.dex.moves.get(pokemon.set.ability).exists) {
					pokemon.m.scrambled.moves.push({ thing: this.dex.moves.get(pokemon.set.ability).name, inSlot: 'Ability' });
				}

				if (this.dex.abilities.get(pokemon.set.item).exists) {
					pokemon.m.scrambled.abilities.push({ thing: this.dex.abilities.get(pokemon.set.item).name, inSlot: 'Item' });
				} else if (this.dex.moves.get(pokemon.set.item).exists && this.dex.moves.get(pokemon.set.item).id !== 'metronome') {
					pokemon.m.scrambled.moves.push({ thing: this.dex.moves.get(pokemon.set.item).name, inSlot: 'Item' });
				}

				for (const move of pokemon.set.moves) {
					if (this.dex.moves.get(move).id === 'metronome') continue;
					if (this.dex.abilities.get(move).exists) {
						pokemon.m.scrambled.abilities.push({ thing: this.dex.abilities.get(move).name, inSlot: 'Move' });
					} else if (this.dex.items.get(move).exists) {
						pokemon.m.scrambled.items.push({ thing: this.dex.items.get(move).name, inSlot: 'Move' });
					}
				}

				const newMoveSlots = [];
				for (const moveSlot of pokemon.baseMoveSlots) {
					if (moveSlot.id === 'metronome') {
						const TeamValidator: typeof import('../sim/team-validator').TeamValidator =
							require('../sim/team-validator').TeamValidator;
						const cantMetronome = TeamValidator.get(this.format).checkCanLearn(this.dex.moves.get('metronome'), pokemon.species);
						if (!cantMetronome) {
							newMoveSlots.push(moveSlot);
						} else {
							pokemon.m.scrambled.items.push({ thing: this.dex.items.get('metronome').name, inSlot: 'Move' });
						}
						continue;
					}
					if (!this.dex.moves.get(moveSlot.id).exists) continue;
					newMoveSlots.push(moveSlot);
				}

				(pokemon as any).baseMoveSlots = newMoveSlots;

				for (const scrambledMove of pokemon.m.scrambled.moves) {
					const move = this.dex.moves.get(scrambledMove.thing);
					const ppUps = move.noPPBoosts ? 0 : 3;
					const basePP = this.calculatePP(move, ppUps);
					const newMove = {
						move: move.name,
						id: move.id,
						pp: basePP,
						maxpp: basePP,
						target: move.target,
						disabled: false,
						used: false,
					};
					pokemon.baseMoveSlots.push(newMove);
					pokemon.ppUps.push(ppUps);
				}
				pokemon.moveSlots = pokemon.baseMoveSlots.slice();
			}
		},
	},
	{
		name: "[Gen 9] Mix and Mega Pure Hackmons",
		desc: `Mega evolve any Pok&eacute;mon with any mega stone, or transform them with Genesect Drives, Primal orbs, Origin orbs, Rusted items, Ogerpon Masks, Arceus Plates, and Silvally Memories with no limit. Mega and Primal boosts based on form changes from gen 7.`,
		mod: 'mixandmega',
		searchShow: false,
		ruleset: ['Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Hackmons Forme Legality', 'Species Reveal Clause', 'Endless Battle Clause', 'Terastal Clause'],
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
		name: "[Gen 9] Shared Power Pure Hackmons",
		desc: `Once a Pok&eacute;mon switches in, its ability is shared with the rest of the team.`,
		mod: 'sharedpower',
		searchShow: false,
		ruleset: ['Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Hackmons Forme Legality', 'Species Reveal Clause', 'Endless Battle Clause'],
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

	//////////////////////////////////
	////// Miscellaneous Tiers ///////
	//////////////////////////////////
	{
		section: "Hackmons Other Tiers",
		column: 1,
	},
	{
		name: "[Gen 8] 255",
		desc: "Gen 8 Pure Hackmons at level 255. Unified merges the Sword/Shield and BDSP Pokedex and has no stat overflow glitch.",
		mod: 'gen8unified',
		searchShow: false,
		battle: {trunc: Math.trunc},
		ruleset: ['-Nonexistent', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause', 'SwSh Plus BDSP Pokedex', 'Max Level = 255', 'Default Level = 100'],
		unbanlist: ['Past', 'Unobtainable'],
	},
	{
		name: "[Gen 8] 255 (SwSh)",
		desc: "Gen 8 Sword/Shield Pure Hackmons at level 255, with the stat overflow glitch.",
		mod: 'gen8',
		searchShow: false,
		challengeShow: false,
		ruleset: ['-Nonexistent', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause', 'Overflow Stat Mod', 'Max Level = 255', 'Default Level = 100'],
		unbanlist: ['Past', 'Unobtainable'],
	},
	{
		name: "[Gen 8] 255 (BDSP)",
		desc: "Gen 8 Brilliant Diamond/Shining Pearl Pure Hackmons at level 255, with the stat overflow glitch.",
		mod: 'gen8bdsp',
		searchShow: false,
		challengeShow: false,
		ruleset: ['-Nonexistent', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause', 'Overflow Stat Mod', 'Max Level = 255', 'Default Level = 100'],
		unbanlist: ['Past', 'Unobtainable'],
	},
	{
		name: "[Gen 6] No Limit",
		desc: "Gen 6 Pure Hackmons without the 510 EV limit.",
		mod: 'gen6',
		searchShow: false,
		ruleset: ['-Nonexistent', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause', 'Overflow Stat Mod', 'Max Level = 255', 'Default Level = 100'],
		onBegin() {
			this.add('-rule', 'No Limits: Pokemon can max all EVs');
		},
	},
	{
		name: "[Gen 4] Rage",
		desc: "Gen 4 Anything Goes with real cartridge glitches: any Pokemon that can reach the English Rage/Mimic glitch (Smeargle breeding web) or the Japanese D/P Transform faint glitch (learns Transform, Mimic, Copycat, Assist, Metronome, or Rage) can run any four moves except Chatter and Struggle. Pokemon that can reach neither glitch need fully legal movesets.",
		mod: 'gen4',
		searchShow: false,
		ruleset: ['-Nonexistent', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause', 'Max Level = 255', 'Default Level = 100'],
		checkCanLearn(move, species, setSources, set) {
			if (gen4RageGlitchEligible.includes(this.toID(species.baseSpecies)) && move.id !== 'chatter' && move.id !== 'struggle') {
				return null;
			}
			return this.checkCanLearn(move, species, setSources, set);
		},
		onValidateSet(set) {
			const species = this.dex.species.get(set.species);
			const moves = set.moves || [];
			if (!moves.length) return;
			if (gen4RageGlitchEligible.includes(this.toID(species.baseSpecies))) {
				for (const moveName of moves) {
					const move = this.dex.moves.get(moveName);
					if (move.id === 'chatter' || move.id === 'struggle') {
						return [`${set.name || species.name} can't obtain ${move.name} through the Transform glitch.`];
					}
				}
				return;
			}
			for (const moveName of moves) {
				const move = this.dex.moves.get(moveName);
				if (this.checkCanLearn(move, species)) {
					return [`${set.name || species.name} can't learn ${move.name}, and it can't perform the Rage or Transform glitches (it learns none of Transform, Mimic, Copycat, Assist, Metronome, or Rage).`];
				}
			}
		},
	},
	{
		name: "[Gen 3] Any Ability",
		desc: "Gen 3 Pure Hackmons, but any Pokemon can have any ability. Shadow moves are usable.",
		mod: 'gen3phnn',
		searchShow: false,
		ruleset: ['[Gen 3] Pure Hackmons', '!Obtainable Abilities', 'Max Level = 255', 'Default Level = 100'],
		unbanlist: ['Demo'],
	},
	{
		name: "[Gen 2] Statuses",
		desc: "Gen 2 Pure Hackmons, but Pokemon can start the battle pre-statused. Uses Crystal mechanics (No Move-2 has 9 base power).",
		mod: 'gen2',
		searchShow: false,
		ruleset: ['-Nonexistent', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause', 'Max Level = 255', 'Default Level = 100', 'Prestatus'],
		banlist: ['No Move-2'],
	},
	{
		name: "[Gen 2] Statuses (Gold/Silver)",
		desc: "Gen 2 Statuses using Gold/Silver mechanics: No Move-2 has 5 base power instead of Crystal's 9.",
		mod: 'gen2gs',
		searchShow: false,
		challengeShow: false,
		ruleset: ['-Nonexistent', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause', 'Max Level = 255', 'Default Level = 100', 'Prestatus'],
		banlist: ['No Move-2'],
	},
	{
		name: "[Gen 2] SpaceWorld Disguises",
		desc: "Pure Hackmons on the 1997 SpaceWorld demo's decomp-verified battle engine, where Pokemon can disguise as any species and start the battle pre-statused. Unlike Gen 1 Disguises there is no custom typing: the demo derives a Pokemon's types from its species byte, so a disguised Pokemon takes on its disguise's typing. Engine quirks: gen 1-style Counter (any physical type, shared last-damage), gen 1-style partial trapping with Rapid Spin escape, targeted permanent Sandstorm, no-recharge Hyper Beam on KOs, the Explosion HP-byte glitch, the Fly/Dig invulnerability glitch, Special Defense stages only applying after Baton Pass, held type-boost items, and RBY movesets via the working Time Capsule. Known conventions: Protect/Endure expire at end of turn, Morning Sun/Synthesis/Moonlight heal a flat 50%, and dual status is not modeled.",
		mod: 'spaceworld',
		searchShow: false,
		challengeShow: false,
		ruleset: ['-Nonexistent', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause', 'Max Level = 255', 'Default Level = 100', 'Prestatus', 'SpaceWorld Disguise Mod'],
		banlist: ['No Move-2', 'No Move-SW'],
	},
	{
		name: "[Gen 2] OU",
		desc: "Standard Gold/Silver/Crystal OU. Regular Pokemon, learnsets, and mechanics with no hackmons modding; Species and Sleep clauses apply. Doubles is supported natively by choosing the doubles game type.",
		mod: 'gen2',
		searchShow: false,
		challengeShow: false,
		ruleset: ['Standard'],
		banlist: ['Uber', 'Mean Look + Baton Pass', 'Spider Web + Baton Pass'],
	},
	{
		name: "[Gen 2] Ubers",
		desc: "Standard Gold/Silver/Crystal Ubers: every Pokemon is legal, with the standard Species and Sleep clauses. No hackmons modding.",
		mod: 'gen2',
		searchShow: false,
		challengeShow: false,
		ruleset: ['Standard'],
	},
	{
		name: "[Gen 2] SpaceWorld OU",
		desc: "Standard OU played on the 1997 SpaceWorld demo's Pokemon, learnsets, and battle engine (no hackmons modding). Every Pokemon is currently allowed while the metagame is being tested.",
		mod: 'spaceworld',
		searchShow: false,
		challengeShow: false,
		ruleset: ['Standard'],
	},
	{
		name: "[Gen 2] SpaceWorld Ubers",
		desc: "Standard Ubers played on the 1997 SpaceWorld demo's Pokemon, learnsets, and battle engine: every Pokemon is legal, with the standard Species and Sleep clauses. No hackmons modding.",
		mod: 'spaceworld',
		searchShow: false,
		challengeShow: false,
		ruleset: ['Standard'],
	},
	{
		name: "[Gen 1] Disguises",
		desc: "Gen 1 Pure Hackmons, but Pokemon can have any type, disguise as any species, and even start the game pre-statused.",
		mod: 'gen1phnn',
		//searchShow: false,
		ruleset: ['-Nonexistent', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause', 'Max Level = 255', 'Default Level = 100', 'Disguise Mod', 'No Move Exclusivity', 'Crit Level Overflow'],
		banlist: ['No Move'],
	},
	{
		name: "[Gen 1] Disguises (English)",
		desc: "Gen 1 Disguises using the international (English) mechanics: Blizzard has a 10% chance to freeze and Substitute follows the non-Japanese rules.",
		mod: 'gen1phnneng',
		searchShow: false,
		challengeShow: false,
		ruleset: ['-Nonexistent', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause', 'Max Level = 255', 'Default Level = 100', 'Disguise Mod', 'No Move Exclusivity', 'Crit Level Overflow'],
		banlist: ['No Move'],
	},
	{
		name: "[Gen 1] OU",
		desc: "Standard Gen 1 (Red/Blue/Yellow) OU. Regular Pokemon, learnsets, and mechanics with no hackmons modding; Species and Sleep clauses apply. Doubles is supported natively by choosing the doubles game type.",
		mod: 'gen1',
		searchShow: false,
		challengeShow: false,
		ruleset: ['Standard'],
		banlist: ['Uber'],
	},
	{
		name: "[Gen 1] Ubers",
		desc: "Standard Gen 1 (Red/Blue/Yellow) Ubers: every Pokemon is legal, with the standard Species and Sleep clauses. No hackmons modding.",
		mod: 'gen1',
		searchShow: false,
		challengeShow: false,
		ruleset: ['Standard'],
	},
	//////////////////////////////////
	///// Pure Hackmons No Nerfs /////
	//////////////////////////////////
	{
		section: "No Nerfs",
		column: 2,
	},
	{
		name: "[Gen 9 No Nerfs] Pure Hackmons",
		desc: "Pure Hackmons, but Pokemon are at the highest power level across all their available generations.",
		mod: 'phnn',
		battle: {trunc: Math.trunc},
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Team Preview', 'Data Preview', 'Max Level = 255', 'Default Level = 100', 'Prestatus', 'Totem Aura', 'Shadow Tera Clause', 'No Alphas'],
		banlist: [
			'Mewtwo-Shadow', 'Mewtwo-Shadow-Mega-X', 'Lugia-Shadow', 'Arceus-Shadow', 'Mewtwo-Armored',
			'Shadow Plate',
			'Shadow Rush', 'Shadow Blast', 'Shadow Blitz', 'Shadow Break', 'Shadow End',
			'Shadow Bolt', 'Shadow Chill', 'Shadow Fire', 'Shadow Storm', 'Shadow Wave', 'Shadow Rave',
			'Shadow Down', 'Shadow Mist', 'Shadow Panic', 'Shadow Hold', 'Shadow Half', 'Shadow Shed', 'Shadow Sky',
		],
		unbanlist: ['Past', 'Future', 'Unobtainable', 'No Move', 'No Move-2', 'No Move-SW', 'Demo'],
	},
	{
		name: "[Gen 9 No Nerfs] Little Cup",
		mod: 'phnn',
		searchShow: false,
		battle: {trunc: Math.trunc},
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Team Preview', 'Data Preview', 'Max Level = 5', 'Prestatus', 'Totem Aura'],
		unbanlist: ['Past', 'Future', 'Unobtainable', 'Demo'],
	},
	{
		name: "[Gen 9 No Nerfs] Middle Cup",
		mod: 'phnn',
		searchShow: false,
		battle: {trunc: Math.trunc},
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Team Preview', 'Data Preview', 'Max Level = 50', 'Prestatus', 'Totem Aura'],
		unbanlist: ['Past', 'Future', 'Unobtainable', 'Demo'],
	},
	{
		name: "[Gen 5] Pure Hackmons No Nerfs",
		desc: "Anything directly hackable onto a set and usable in local battles is allowed.",
		mod: 'gen5phnn',
		ruleset: ['-Nonexistent', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause', 'Overflow Stat Mod', 'Prestatus', 'Totem Aura', 'Max Level = 255', 'Default Level = 100'],
		unbanlist: ['Demo'],
	},
	//////////////////////////////////
	/////// Wondrous Hackmons ////////
	//////////////////////////////////
	{
		section: "Wondrous Hackmons",
		column: 2,
	},
	{
		name: "[Gen 9] Wondrous Hackmons",
		desc: "Pure Hackmons with select clauses and bans for a balanced experience. Permanent Mega formes and the LGPE partner Pikachu/Eevee are usable; Eternatus-Eternamax and the Crowned formes revert to their base formes, with the Rusted Sword/Shield still transforming Zacian/Zamazenta.",
		mod: 'gen9',
		ruleset: ['[Gen 9] Pure Hackmons',
			'Forme Clause', 'Sleep Moves Clause', 'Freeze Clause Mod', 'Dry Pass Clause', 'Evasion Clause', 'Hacked Forme Revert'],
		banlist: [
			'Arena Trap', 'Calyrex-Shadow', 'Innards Out', 'Last Respects', 'Mewtwo-Mega-X', 'Neutralizing Gas', 'Revival Blessing', 'Shadow Tag', 'Shed Tail',
		],
		unbanlist: ['Eternatus-Eternamax', 'Zacian-Crowned', 'Zamazenta-Crowned'],
	},
	{
		name: "[Gen 8] Wondrous Hackmons",
		desc: "A custom Hackmons format with select bans for a balanced experience.",
		mod: 'gen8',
		searchShow: false,
		ruleset: ['-Nonexistent', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod',
			'Endless Battle Clause', 'Freeze Clause Mod', 'Sleep Moves Clause', 'Evasion Clause', 'Forme Clause'],
		banlist: [
			'Arena Trap', 'Eternatus-Eternamax', 'Neutralizing Gas', 'Shadow Tag', 'Zacian-Crowned',
		],
	},
	
	//////////////////////////////////
	/////// Balanced Hackmons ////////
	//////////////////////////////////
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
	//////////////////////////////////
	//// Random Hackmons Formats /////
	//////////////////////////////////
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
		name: "[Gen 8] Hackmons Cup",
		desc: `Randomized teams of level-balanced Pok&eacute;mon with absolutely any ability, moves, and item.`,
		mod: 'gen8',
		team: 'randomHC',
		searchShow: false,
		ruleset: ['HP Percentage Mod', 'Cancel Mod'],
		banlist: ['Nonexistent'],
	},
	{
		name: "[Gen 7] Hackmons Cup",
		desc: `Randomized teams of level-balanced Pok&eacute;mon with absolutely any ability, moves, and item.`,
		mod: 'gen7',
		team: 'randomHC',
		searchShow: false,
		ruleset: ['HP Percentage Mod', 'Cancel Mod'],
		banlist: ['Nonexistent'],
	},
	{
		name: "[Gen 1] Hackmons Cup",
		desc: `Randomized teams of level-balanced Pok&eacute;mon with absolutely any moves, types, and stats.`,
		mod: 'gen1',
		team: 'randomHC',
		searchShow: false,
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Desync Clause Mod', 'Sleep Clause Mod', 'Freeze Clause Mod', 'Team Type Preview'],
		banlist: ['Nonexistent'],
		onModifySpecies(species, target, source, effect) {
			if (!target) return;
			return { ...species, ...(target.set as any).hc };
		},
		onSwitchIn(pokemon) {
			this.add('-start', pokemon, 'typechange', pokemon.getTypes(true).join('/'), '[silent]');
			for (const i in pokemon.species.baseStats) {
				if (i === 'spd') continue;
				this.add('-start', pokemon, `${pokemon.species.baseStats[i as keyof StatsTable]}${i === 'spa' ? 'spc' : i}`, '[silent]');
			}
		},
	},
	//////////////////////////////////
	/////////// Disguises ////////////
	//////////////////////////////////
	{
		section: "Custom",
		column: 2,
	},
	{
		name: "[Gen 9 No Nerfs] Custom Disguises",
		mod: 'phnn',
		searchShow: true,
		battle: {trunc: Math.trunc},
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100', 'Disguise Mod', 'Totem Aura'],
		unbanlist: ['No Move', 'No Move-2', 'No Move-SW', 'Demo'],
	},
	{
		name: "[Gen 9 Champions] Custom Disguises",
		mod: 'champions',
		searchShow: false,
		battle: {trunc: Math.trunc},
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100', 'Disguise Mod', 'Totem Aura'],
		unbanlist: ['No Move', 'No Move-2', 'No Move-SW', 'Demo'],
	},
	{
		name: "[Gen 9] Custom Disguises",
		mod: 'gen9',
		searchShow: false,
		battle: {trunc: Math.trunc},
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100', 'Disguise Mod', 'Totem Aura'],
		unbanlist: ['No Move', 'No Move-2', 'No Move-SW', 'Demo'],
	},
	{
		name: "[Gen 8] Custom Disguises",
		mod: 'gen8',
		searchShow: false,
		battle: {trunc: Math.trunc},
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100', 'Disguise Mod', 'Totem Aura'],
		unbanlist: ['No Move', 'No Move-2', 'No Move-SW', 'Demo'],
	},
	{
		name: "[Gen 8] BDSP Custom Disguises",
		mod: 'gen8bdsp',
		searchShow: false,
		battle: {trunc: Math.trunc},
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100', 'Disguise Mod', 'Totem Aura'],
		unbanlist: ['No Move', 'No Move-2', 'No Move-SW', 'Demo'],
	},
	{
		name: "[Gen 7] Custom Disguises",
		mod: 'gen7',
		searchShow: false,
		battle: {trunc: Math.trunc},
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100', 'Disguise Mod', 'Totem Aura'],
		unbanlist: ['No Move', 'No Move-2', 'No Move-SW', 'Demo'],
	},
	{
		name: "[Gen 7] Let's Go Custom Disguises",
		mod: 'gen7letsgo',
		searchShow: false,
		battle: {trunc: Math.trunc},
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100', 'Disguise Mod', 'Totem Aura'],
		unbanlist: ['No Move', 'No Move-2', 'No Move-SW', 'Demo'],
	},
	{
		name: "[Gen 6] Custom Disguises",
		mod: 'gen6',
		searchShow: false,
		battle: {trunc: Math.trunc},
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100', 'Disguise Mod', 'Totem Aura'],
		unbanlist: ['No Move', 'No Move-2', 'No Move-SW', 'Demo'],
	},
	{
		name: "[Gen 5] Custom Disguises",
		mod: 'gen5',
		searchShow: false,
		battle: {trunc: Math.trunc},
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100', 'Disguise Mod', 'Totem Aura'],
		unbanlist: ['No Move', 'No Move-2', 'No Move-SW', 'Demo'],
	},
	{
		name: "[Gen 4] Custom Disguises",
		mod: 'gen4',
		searchShow: false,
		battle: {trunc: Math.trunc},
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100', 'Disguise Mod', 'Totem Aura'],
		unbanlist: ['No Move', 'No Move-2', 'No Move-SW', 'Demo'],
	},
	{
		name: "[Gen 3] Custom Disguises",
		mod: 'gen3',
		searchShow: false,
		battle: {trunc: Math.trunc},
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Desync Clause Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100', 'Disguise Mod', 'Totem Aura'],
		unbanlist: ['No Move', 'No Move-2', 'No Move-SW', 'Demo'],
	},
	{
		name: "[Gen 2] Custom Disguises",
		mod: 'gen2',
		searchShow: false,
		battle: {trunc: Math.trunc},
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Desync Clause Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100', 'Disguise Mod', 'Totem Aura'],
		unbanlist: ['No Move', 'No Move-2', 'No Move-SW', 'Demo'],
	},
	{
		name: "[Gen 2] SpaceWorld Custom Disguises",
		desc: "Custom Disguises on the 1997 SpaceWorld demo's battle engine, with the demo's Pokemon, stats, moves, and type chart.",
		mod: 'spaceworld',
		searchShow: false,
		battle: {trunc: Math.trunc},
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Desync Clause Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100', 'Disguise Mod', 'Totem Aura'],
		unbanlist: ['No Move', 'No Move-2', 'No Move-SW', 'Demo'],
	},
	{
		name: "[Gen 1] Custom Disguises",
		mod: 'gen1',
		searchShow: false,
		battle: {trunc: Math.trunc},
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Desync Clause Mod', 'Max Team Size = 24', 'Max Move Count = 24', 'Max Level = 9999', 'Default Level = 100', 'Disguise Mod', 'Totem Aura', 'No Move Exclusivity'],
		unbanlist: ['No Move'],
	},
	{
		name: "[Gen 9] Custom Game",
		mod: 'gen9',
		searchShow: true,
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
];
