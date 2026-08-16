'use strict';

const path = require('path');

const PS_DIR = process.env.PHNN_PS_DIR || path.resolve(__dirname, '..', '..', 'pokemon-showdown');

const CD_UNIVERSAL_ABILITIES = [
	'Magic Guard', 'Unaware', 'Multiscale', 'Regenerator', 'Speed Boost', 'Magic Bounce', 'Levitate',
	'Good as Gold', 'Comatose', 'Wonder Guard', 'Flash Fire', 'Prankster',
];
const CD_OFFENSE_ABILITIES = {
	physical: ['Huge Power', 'Pure Power', 'Parental Bond', 'Adaptability', 'No Guard', 'Mold Breaker', 'Libero', 'Tough Claws'],
	special: ['Hadron Engine', 'Parental Bond', 'Adaptability', 'Beads of Ruin', 'No Guard', 'Libero', 'Tinted Lens'],
	defensive: ['Fur Coat', 'Ice Scales', 'Poison Heal', 'Arena Trap', 'Shadow Tag'],
};
const CD_ITEM_STACKS = {
	physical: { main: 'Choice Band', extras: ['Life Orb', 'Expert Belt', 'Muscle Band', 'Focus Sash', 'Heavy-Duty Boots', 'Leftovers'] },
	special: { main: 'Choice Specs', extras: ['Life Orb', 'Expert Belt', 'Wise Glasses', 'Focus Sash', 'Heavy-Duty Boots', 'Leftovers'] },
	defensive: { main: 'Leftovers', extras: ['Rocky Helmet', 'Heavy-Duty Boots', 'Covert Cloak', 'Safety Goggles', 'Focus Sash'] },
};
const FILLER_ITEMS = [
	'Leftovers', 'Life Orb', 'Choice Band', 'Choice Specs', 'Choice Scarf', 'Heavy-Duty Boots',
	'Assault Vest', 'Rocky Helmet', 'Sitrus Berry', 'Focus Sash', 'Expert Belt', 'Muscle Band',
	'Wise Glasses', 'Lum Berry', 'Light Clay', 'Mental Herb', 'Safety Goggles', 'Covert Cloak',
];
const HM_STAB = {
	Normal: { physical: ['Extreme Speed', 'Double-Edge', 'Return'], special: ['Boomburst', 'Hyper Voice'] },
	Fire: { physical: ['V-create', 'Sacred Fire', 'Flare Blitz'], special: ['Blue Flare', 'Fusion Flare', 'Fire Blast'] },
	Water: { physical: ['Surging Strikes', 'Crabhammer', 'Liquidation', 'Waterfall'], special: ['Steam Eruption', 'Origin Pulse', 'Hydro Pump'] },
	Electric: { physical: ['Bolt Strike', 'Fusion Bolt', 'Wild Charge'], special: ['Electro Drift', 'Thunderbolt'] },
	Grass: { physical: ['Wood Hammer', 'Power Whip', 'Seed Bomb'], special: ['Seed Flare', 'Leaf Storm', 'Giga Drain'] },
	Ice: { physical: ['Glacial Lance', 'Icicle Crash', 'Ice Punch'], special: ['Blizzard', 'Ice Beam', 'Freeze-Dry'] },
	Fighting: { physical: ['Close Combat', 'Sacred Sword', 'Drain Punch', 'Superpower'], special: ['Secret Sword', 'Aura Sphere', 'Focus Blast'] },
	Poison: { physical: ['Gunk Shot', 'Poison Jab'], special: ['Malignant Chain', 'Sludge Bomb'] },
	Ground: { physical: ['Thousand Arrows', 'Precipice Blades', 'Headlong Rush', 'Earthquake'], special: ['Earth Power'] },
	Flying: { physical: ['Dragon Ascent', 'Brave Bird', 'Drill Peck'], special: ['Oblivion Wing', 'Aeroblast', 'Hurricane', 'Air Slash'] },
	Psychic: { physical: ['Photon Geyser', 'Psychic Fangs', 'Zen Headbutt'], special: ['Photon Geyser', 'Psystrike', 'Psycho Boost', 'Psychic'] },
	Bug: { physical: ['Megahorn', 'First Impression', 'Leech Life'], special: ['Bug Buzz'] },
	Rock: { physical: ['Diamond Storm', 'Mighty Cleave', 'Stone Edge', 'Rock Slide'], special: ['Power Gem', 'Ancient Power'] },
	Ghost: { physical: ['Spectral Thief', 'Poltergeist', 'Shadow Claw'], special: ['Astral Barrage', 'Moongeist Beam', 'Shadow Ball'] },
	Dragon: { physical: ['Glaive Rush', 'Dragon Darts', 'Outrage', 'Dragon Claw'], special: ['Core Enforcer', 'Draco Meteor', 'Dragon Energy', 'Dragon Pulse'] },
	Dark: { physical: ['Wicked Blow', 'Knock Off', 'Sucker Punch', 'Crunch'], special: ['Fiery Wrath', 'Dark Pulse'] },
	Steel: { physical: ['Sunsteel Strike', 'Behemoth Blade', 'Gigaton Hammer', 'Iron Head', 'Meteor Mash'], special: ['Make It Rain', 'Steel Beam', 'Flash Cannon'] },
	Fairy: { physical: ['Play Rough'], special: ['Moonblast', 'Fleur Cannon', 'Dazzling Gleam'] },
};
const HM_COVERAGE = {
	physical: ['Thousand Arrows', 'V-create', 'Wicked Blow', 'Glacial Lance', 'Close Combat', 'Earthquake'],
	special: ['Blizzard', 'Astral Barrage', 'Blue Flare', 'Moongeist Beam', 'Earth Power', 'Moonblast'],
};
const HM_SETUP = {
	physical: ['Shell Smash', 'Victory Dance', 'Swords Dance', 'Dragon Dance'],
	special: ['Quiver Dance', 'Tail Glow', 'Nasty Plot', 'Calm Mind'],
};
// Shadow moves read as x2 against everything that is not a Shadow Pokemon and x0.5 against one, and a
// Pokemon counts as Shadow the moment it carries a Shadow move -- so a single slot buys both the best
// neutral coverage in the game and immunity to the same coverage coming back. Verified in a live sim:
// Shadow Storm does 204 to a plain Snorlax and 54 to one holding Shadow Rush.
const HM_SHADOW_MOVES = {
	physical: ['Shadow End', 'Shadow Rush', 'Shadow Blast', 'Shadow Break'],
	special: ['Shadow Storm', 'Shadow Bolt', 'Shadow Chill', 'Shadow Fire', 'Shadow Rave'],
	status: ['Shadow Half', 'Shadow Hold', 'Shadow Mist', 'Shadow Down'],
};
const HM_UTILITY = ['Sucker Punch', 'Extreme Speed', 'Knock Off', 'Substitute', 'Taunt', 'U-turn', 'Spore', 'Recover'];
// recovery on an offensive set is a niche choice, not the default it used to be
const HM_UTILITY_RECOVERY = ['Strength Sap', 'Recover', 'Roost', 'Slack Off'];
const HM_PRANKSTER_MOVES = ['Will-O-Wisp', 'Thunder Wave', 'Taunt', 'Encore', 'Destiny Bond', 'Recover', 'Spore', 'Substitute'];
const HM_SPECIES_ITEMS = {
	latios: 'Soul Dew', latias: 'Soul Dew', latiosmega: 'Soul Dew', latiasmega: 'Soul Dew',
	pikachu: 'Light Ball', cubone: 'Thick Club', marowak: 'Thick Club', marowakalola: 'Thick Club',
	dialga: 'Adamant Orb', palkia: 'Lustrous Orb', giratina: 'Griseous Orb', ditto: 'Metal Powder',
	clamperl: 'Deep Sea Tooth', farfetchd: 'Leek', sirfetchd: 'Leek', chansey: 'Eviolite',
	togepi: 'Eviolite', wobbuffet: 'Custap Berry', regieleki: 'Light Clay',
};
const HM_ABILITY_ITEMS = {
	magicguard: 'Life Orb', sheerforce: 'Life Orb', unburden: 'Sitrus Berry',
	poisonheal: 'Toxic Orb', guts: 'Flame Orb', quickfeet: 'Toxic Orb',
	hadronengine: 'Life Orb', wonderguard: 'Leftovers', neutralizinggas: 'Leftovers',
};

// these abilities do nothing at all without the item that triggers them, so they outrank Eviolite
const ITEM_DEPENDENT_ABILITIES = new Set(['poisonheal', 'guts', 'quickfeet', 'unburden', 'flareboost', 'toxicboost']);
// formats with one dominant body the metagame actually stacks. Gen 1 Electrode outspeeds everything
// and a Pokemon woken from sleep loses its whole turn, so Spore plus fixed damage is a lock; Gen 3
// Slaking escapes Truant only by carrying no ability at all, which that format permits.
const HM_FORMAT_CORES = {
	gen1purehackmons: {
		species: 'Electrode',
		ability: null,
		movesets: [
			['Spore', 'Seismic Toss', 'Agility', 'Quick Attack'],
			['Spore', 'Night Shade', 'Agility', 'Explosion'],
			['Spore', 'Seismic Toss', 'Agility', 'Explosion'],
			['Spore', 'Night Shade', 'Quick Attack', 'Agility'],
		],
		chance: 0.55, min: 3, max: 6,
	},
	gen3purehackmons: {
		species: 'Slaking',
		ability: 'No Ability',
		movesets: [
			['Fake Out', 'Extreme Speed', 'Swords Dance', 'Earthquake'],
			['Fake Out', 'Extreme Speed', 'Shadow Ball', 'Earthquake'],
			['Fake Out', 'Extreme Speed', 'Swords Dance', 'Return'],
			['Fake Out', 'Extreme Speed', 'Earthquake', 'Explosion'],
		],
		chance: 0.5, min: 2, max: 4,
	},
};

const HM_OHKO = ['Sheer Cold', 'Fissure', 'Horn Drill', 'Guillotine'];
// at level 5 a flat 40 kills 103 of the 118 legal Little Cup bodies outright
const HM_LOW_LEVEL_FIXED = ['Dragon Rage', 'Sonic Boom'];
const HM_LOW_LEVEL_CAP = 10;
// content the fork un-dexits: strictly better than the vanilla staples once legal
const HM_ELITE_MOVES = {
	physical: [
		'Searing Sunraze Smash', 'Catastropika', 'Soul-Stealing 7-Star Strike', 'Malicious Moonsault',
		'Zippy Zap', 'G-Max Chi Strike', 'Sunsteel Strike', 'Behemoth Blade',
	],
	special: [
		'Menacing Moonraze Maelstrom', 'Light That Burns the Sky', 'Clangorous Soulblaze',
		'Genesis Supernova', '10,000,000 Volt Thunderbolt', 'Oceanic Operetta',
		'Nihil Light', 'G-Max Fireball', 'G-Max Drum Solo', 'G-Max Hydrosnipe', 'Photon Geyser',
	],
};
// a one-time nuke is still worth a slot; Blizzard's freeze is effectively a second win condition
const HM_NUKE_MOVES = ['Explosion', 'Self-Destruct', 'Misty Explosion'];
// permanent G-Max moves: elemental nukes that ignore abilities and break protection
// only the elemental G-Max moves carry real power (160 BP, ignores abilities, breaks protection).
// every other G-Max is a 10 BP placeholder that derives power from a base move it will not have,
// and the generic Z-moves are 1 BP for the same reason -- both are traps, so they stay out.
const HM_GMAX_MOVES = ['G-Max Fireball', 'G-Max Hydrosnipe', 'G-Max Drum Solo'];
// CFZ moves work WITHOUT their crystal here, so handing one over just burns the item slot.
// A crystal is only worth it when the plan is an in-battle transformation, which the generator
// does not build, so no set gets one.
const HM_ZMOVE_PACKAGES = [];
// Protect is the weakest option in this family whenever the others are available
const HM_PROTECT_TIER = ['Spiky Shield', "King's Shield", 'Max Guard', 'Silk Trap', 'Burning Bulwark', 'Baneful Bunker', 'Protect'];
const HM_WALL_MOVES = [
	['Strength Sap', 'Recover', 'Roost', 'Soft-Boiled', 'Slack Off', 'Moonlight'],
	['Spore', 'Nuzzle', 'Will-O-Wisp', 'Toxic', 'Thunder Wave'],
	['Stealth Rock', 'Spikes', 'Toxic Spikes'],
	['Core Enforcer', 'U-turn', 'Whirlwind', 'Haze', 'Knock Off', 'Seismic Toss'],
];
// Imposter copies the foe outright; it wants maximum bulk and a way to break the copy stalemate
const HM_IMPOSTER_BODIES = ['Snorlax-Gmax', 'Blissey', 'Chansey', 'Pikachu-Gmax', 'Snorlax', 'Ting-Lu', 'Guzzlord', 'Happiny', 'Munchlax'];
const HM_IMPOSTER_ITEMS = { chansey: 'Eviolite', happiny: 'Eviolite', munchlax: 'Eviolite', pikachu: 'Light Ball', pikachugmax: 'Light Ball' };
// effective HP pool a team member needs before it is worth handing Imposter to; Wild Might doubles an
// Alpha's HP, so this is roughly "80 base HP as an Alpha, or 160 base HP without one"
const HM_IMPOSTER_MIN_BULK = 160;
// Custom Disguises allows 24 Pokemon per team and 24 moves per Pokemon. Generating the literal maximum
// makes a team nobody wants to play, so use a healthy slice of the headroom instead of the ceiling.
const HM_CD_TEAM_CAP = 12;
const HM_CD_MOVE_CAP = 10;
function movesAllowedPerSet(ruleTable) {
	const cap = (ruleTable && ruleTable.maxMoveCount) || 4;
	if (cap <= 4) return 4;
	return Math.max(4, Math.min(cap, HM_CD_MOVE_CAP));
}
// Transform overwrites everything except HP, so a body that has real stats of its own loses them the
// moment it copies. Eternamax, Zygarde-Complete and friends are bulky but far too valuable to spend.
const HM_IMPOSTER_MAX_KEPT_STATS = 450;
// team-level strategy packages, drawn from how these actually get played
const HM_ARCHETYPES = [
	{
		name: 'revival',
		slots: [
			{ ability: null, moves: ['Revival Blessing'], role: 'defensive' },
			{ ability: null, moves: [], role: 'physical' },
		],
	},
	{
		name: 'prankster-phaze',
		slots: [
			{ ability: 'Prankster', moves: ['Stealth Rock', 'Circle Throw', 'Copycat', 'Recover'], role: 'defensive' },
			{ ability: null, moves: ['Spikes', 'Toxic Spikes'], role: 'defensive' },
		],
	},
	{
		name: 'imposter',
		slots: [
			{ ability: 'Imposter', moves: [], role: 'defensive', bodies: HM_IMPOSTER_BODIES },
		],
	},
	{
		name: 'trap-pass',
		slots: [
			{ ability: 'Shadow Tag', moves: ['Shell Smash', 'Baton Pass', 'Substitute'], role: 'physical' },
			{ ability: null, moves: ['Baton Pass'], role: 'special' },
		],
	},
	// No Nerfs restores Roar and Whirlwind to their Gen 2 form: -1 priority and perfect accuracy, not the
	// modern -6. Prankster lifts that to 0, so a fast body phazes BEFORE the target moves and every forced
	// switch eats a full layer of hazards. Sash guarantees the rocks land first. Verified in a live sim:
	// Prankster Ribombee-Totem Roars first against a Regieleki and the Regieleki never gets a turn.
	// Wonder Guard only lets super-effective damage through, so on a body with no weaknesses it is a
	// blanket immunity to every damaging move in the game. Verified in a live sim: Arceus-??? with Wonder
	// Guard and a Shadow move takes 0 from Shadow Storm, Close Combat, Boomburst, Psystrike, Sacred Fire
	// and Thousand Arrows alike.
	{
		name: 'wonder-guard-wall',
		slots: [
			{ ability: 'Wonder Guard', moves: [], role: 'defensive', wgBodies: true },
			{ ability: null, moves: ['Stealth Rock'], role: 'physical' },
		],
	},
	{
		name: 'prankster-phaze-rocks',
		slots: [
			{
				ability: 'Prankster', moves: ['Stealth Rock', 'Roar'], role: 'defensive',
				item: 'Focus Sash', fastBodies: true, fastEvs: true,
			},
			{ ability: null, moves: ['Spikes', 'Toxic Spikes'], role: 'special' },
		],
	},
	// the fastest body in the format is also the one that most wants perfect-accuracy Sheer Cold, since
	// it lands the OHKO before the target ever moves
	{
		name: 'speed-king-ohko',
		slots: [
			{ ability: 'No Guard', moves: ['Sheer Cold'], role: 'physical', item: 'Focus Sash', fastBodies: true },
			{ ability: null, moves: ['Stealth Rock'], role: 'defensive' },
		],
	},
];
// Ribombee-Totem is the fastest legal Pokemon in Extended: base 124 doubled to an effective 248 by its
// +2 Totem aura, clear of Regieleki's flat 200. That also makes it the best No Guard Sheer Cold body.
const HM_FAST_BODIES = ['Ribombee-Totem', 'Regieleki', 'Fezandipiti-Titan', 'Deoxys-Speed', 'Ninjask', 'Dragapult', 'Zeraora'];
// pure Shadow has no weaknesses at all; the ???-typed bodies are weak only to Shadow, which their own
// Shadow move then closes. The glitch Pokemon carry a 924 base stat total on top of that.
const HM_WONDER_GUARD_BODIES = [
	'Arceus-Shadow', 'Mewtwo-Shadow', 'Glitch (DB)', 'PC4SH', 'PokéWTrainer', 'Arceus-Question',
	'????? (Crystal FE)', '????? (GS FE)', '94',
];
const HM_TOTEM_SPE_STAGES = {
	ribombeetotem: 2, gumshoostotem: 2, raticatealolatotem: 2, marowakalolatotem: 2, lurantistotem: 2,
	fezandipitititan: 2, araquanidtotem: 1, mimikyutotem: 1, mimikyubustedtotem: 1, kommoototem: 1,
	vikavolttotem: 1, hakamoototem: 1,
};

const HM_PREMIUM_ABILITIES = ['Wonder Guard', 'Neutralizing Gas', 'Magic Guard', 'Huge Power', 'Pure Power', 'Parental Bond', 'Shadow Tag', 'Prankster', 'Unaware', 'Fur Coat', 'Ice Scales', 'Good as Gold'];
// an ability that only reads one damage category is dead weight on a set built around the other one:
// Huge Power on a special attacker was the reported bug. ATE abilities need a Normal-type attack to
// convert. Everything absent from this map works on any set.
const ABILITY_NEEDS = {
	hugepower: 'physical', purepower: 'physical', toughclaws: 'physical', ironfist: 'physical',
	hadronengine: 'special', beadsofruin: 'special',
	pixilate: 'normal', refrigerate: 'normal', aerilate: 'normal', galvanize: 'normal',
};
const META_ABILITIES = {
	physical: ['Huge Power', 'Pure Power', 'Parental Bond', 'No Guard', 'Mold Breaker', 'Libero'],
	special: ['Hadron Engine', 'Parental Bond', 'No Guard', 'Beads of Ruin', 'Libero', 'Drought', 'Drizzle'],
	ate: ['Pixilate', 'Refrigerate'],
	defensive: ['Magic Guard', 'Magic Bounce', 'Wonder Guard', 'Good as Gold', 'Comatose', 'Ice Face', 'Flash Fire', 'Innards Out'],
	utility: ['Speed Boost', 'Neutralizing Gas', 'Shadow Tag', 'Arena Trap', 'Sand Stream', 'Psychic Surge', 'Misty Surge'],
};
const HACKMONS_HINTS = [
	'hackmons', 'customgame', 'customdisguise', 'disguises', 'statuses', 'nonerfs',
	'metronome', 'infinite', 'brokencup', '350cup', 'anyability', 'nolimit', 'bh',
];
const TIER_BAND = {
	ag: 0,
	uber: 1, '(uber)': 1, duber: 1, '(duber)': 1,
	ou: 2, '(ou)': 2, uubl: 2, cap: 2, dou: 2, '(dou)': 2, dbl: 2,
	uu: 3, '(uu)': 3, rubl: 3, duu: 3,
	ru: 4, '(ru)': 4, nubl: 4,
	nu: 5, '(nu)': 5, publ: 5,
	pu: 6, '(pu)': 6, zubl: 6,
	zu: 7, '(zu)': 7, '(duu)': 7,
	nfe: 8, capnfe: 8,
	lc: 9, caplc: 9, lcuber: 9,
};
const TIER_TOKENS = { ubers: 1, ag: 1, anythinggoes: 1, ubersuu: 1, ou: 2, uubl: 2, cap: 2, uu: 3, ru: 4, nu: 5, pu: 6, zu: 7 };
const TIER_NEUTRAL = ['bdsp', 'letsgo', 'platinum', 'frlg', 'bw1', 'dlc1', 'stadium', 'japanese', 'tradebacks'];
const TIER_NEVER = ['champions', 'spaceworld', 'glitch', 'draft', '1v1', '2v2', 'triples', 'freeforall', 'rental', 'roulette', 'ccapm', 'thecardgame'];
const TIER_SET_LABELS = {
	1: ['ubers', 'anythinggoes', 'ag'], 2: ['ou'], 3: ['uu'], 4: ['ru'], 5: ['nu'], 6: ['pu'], 7: ['zu'],
};
const MIN_TIER_POOL = 18;
const MIN_PRIME_POOL = 8;
const MAX_ATTEMPTS = 20;

let smogonSets = null;
function loadSmogonSets() {
	if (smogonSets === null) {
		try {
			smogonSets = require('./phnn-smogon-sets.json');
		} catch (e) {
			smogonSets = {};
		}
	}
	return smogonSets;
}

let sim = null;
function loadSim() {
	if (!sim) {
		const { Dex, Teams } = require(path.join(PS_DIR, 'dist', 'sim'));
		const { TeamValidator } = require(path.join(PS_DIR, 'dist', 'sim', 'team-validator'));
		sim = { Dex, Teams, TeamValidator };
	}
	return sim;
}

function toId(text) {
	return ('' + text).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

const generatorCache = new Map();
function hasGenerator(formatid) {
	if (generatorCache.has(formatid)) return generatorCache.get(formatid);
	const { Dex, Teams } = loadSim();
	let ok = false;
	try {
		if (Dex.formats.get(formatid).exists || /^gen9/.test(formatid)) {
			ok = (Teams.generate(formatid) || []).length > 0;
		}
	} catch (e) {
		ok = false;
	}
	generatorCache.set(formatid, ok);
	return ok;
}

function genOf(baseid, format) {
	const fromMod = /^gen(\d+)/.exec(format.mod || '');
	if (fromMod) return +fromMod[1];
	const fromId = /^gen(\d+)/.exec(baseid);
	return fromId ? +fromId[1] : 9;
}

function isHackmonsTarget(baseid) {
	return HACKMONS_HINTS.some(h => baseid.includes(h));
}

function bandOfTier(tier) {
	const raw = '' + (tier || '');
	const key = /^\(/.test(raw) ? '(' + toId(raw) + ')' : toId(raw);
	return Object.prototype.hasOwnProperty.call(TIER_BAND, key) ? TIER_BAND[key] : null;
}

function tierPolicyFor(baseid) {
	if (isHackmonsTarget(baseid)) return null;
	if (TIER_NEVER.some(n => baseid.includes(n))) return null;
	let id = baseid.replace(/^gen\d+/, '');
	let natdex = false;
	if (/^(nationaldex|natdex)/.test(id)) {
		natdex = true;
		id = id.replace(/^(nationaldex|natdex)/, '');
	}
	for (const seg of TIER_NEUTRAL) if (id.startsWith(seg)) id = id.slice(seg.length);
	if (/^vgc\d/.test(id) || /^(battlestadium|battlespot|bss|gbu)/.test(id)) {
		return { target: 2, floor: 1, slack: 0, doubles: !/singles/.test(id), natdex };
	}
	if (id === 'monotype') return { target: 2, floor: 1, slack: natdex ? 1 : 3, doubles: false, natdex };
	let doubles = false;
	if (id.startsWith('doubles')) {
		doubles = true;
		id = id.slice('doubles'.length);
	}
	if (!id) id = 'ou';
	if (!Object.prototype.hasOwnProperty.call(TIER_TOKENS, id)) return null;
	const target = TIER_TOKENS[id];
	const floor = /^(ag|anythinggoes)$/.test(id) ? 0 : target;
	return { target, floor, slack: doubles || natdex ? 0 : 1, doubles, natdex };
}

const tierGateCache = new Map();
function tierGate(fdex, ruleTable, policy, fullid) {
	if (!policy) return null;
	if (tierGateCache.has(fullid)) return tierGateCache.get(fullid);
	const bandFor = species => {
		const tier = (policy.natdex && species.natDexTier) ||
			(policy.doubles && species.doublesTier) || species.tier;
		return bandOfTier(tier);
	};
	const bands = [];
	for (const species of fdex.species.all()) {
		if (!species.exists || !species.baseStats) continue;
		if (species.isNonstandard && species.isNonstandard !== 'Past' && species.isNonstandard !== 'Unobtainable') continue;
		if (ruleTable.check('pokemon:' + species.id) === 'banned') continue;
		if (ruleTable.check('basepokemon:' + toId(species.baseSpecies)) === 'banned') continue;
		const band = bandFor(species);
		if (band !== null) bands.push(band);
	}
	let maxBand = Math.min(policy.target + policy.slack, 7);
	const count = m => bands.filter(b => b >= policy.floor && b <= m).length;
	while (maxBand < 9 && count(maxBand) < MIN_TIER_POOL) maxBand++;
	let primeBand = policy.target;
	while (primeBand < maxBand && count(primeBand) < MIN_PRIME_POOL) primeBand++;
	const gate = {
		size: count(maxBand),
		accepts: name => {
			const species = fdex.species.get(name);
			if (!species.exists) return false;
			const band = bandFor(species);
			return band !== null && band >= policy.floor && band <= maxBand;
		},
		prime: name => {
			const species = fdex.species.get(name);
			if (!species.exists) return false;
			const band = bandFor(species);
			return band !== null && band >= policy.floor && band <= primeBand;
		},
		labels: TIER_SET_LABELS[policy.target] || [],
		doubles: policy.doubles,
		natdex: policy.natdex,
	};
	tierGateCache.set(fullid, gate);
	return gate;
}

function wantsDoubles(baseid, format) {
	if (format.gameType && format.gameType !== 'singles') return true;
	return baseid.includes('doubles') || baseid.includes('vgc') || baseid.includes('freeforall') || baseid.includes('multi');
}

function sourceFor(baseid, format) {
	const gen = genOf(baseid, format);
	const cands = [];
	if (baseid.includes('letsgo')) cands.push('gen7letsgorandombattle');
	if (baseid.includes('bdsp')) cands.push('gen8bdsprandombattle');
	if (baseid.includes('champions')) cands.push('gen9championspurehackmons');
	const hackmons = isHackmonsTarget(baseid);
	if (!hackmons) {
		if (wantsDoubles(baseid, format)) cands.push(`gen${gen}randomdoublesbattle`);
		for (let g = gen; g >= 1; g--) cands.push(`gen${g}randombattle`);
	}
	for (let g = gen; g >= 1; g--) cands.push(`gen${g}purehackmons`, `gen${g}customgame`);
	for (let g = gen; g >= 1; g--) cands.push(`gen${g}hackmonscup`);
	return cands.find(hasGenerator) || null;
}

function setRole(set) {
	const { Dex } = loadSim();
	const species = Dex.species.get(set.species);
	if (!species.exists) return 'physical';
	const bs = species.baseStats;
	const bulk = bs.hp + bs.def + bs.spd;
	const off = Math.max(bs.atk, bs.spa);
	if (bulk >= 340 && off < 115) return 'defensive';
	return bs.atk >= bs.spa ? 'physical' : 'special';
}

// hackmons formats un-dexit content at the VALIDATOR, not in the dex, so isNonstandard is the wrong
// gate there -- ask the validator itself (cached) or entire classes of moves stay invisible
const permissiveCache = new Map();
function movePermittedByValidator(name, validator, fullid) {
	const key = fullid + '|' + toId(name);
	if (permissiveCache.has(key)) return permissiveCache.get(key);
	let ok = false;
	try {
		const probe = {
			species: 'Mewtwo', ability: 'Pressure', moves: [name],
			evs: {}, ivs: {}, nature: 'Serious', level: 100,
		};
		const problems = validator.validateSet(probe, {}) || [];
		ok = !problems.some(p => /is banned|does not exist|isn't obtainable|not allowed|illegal/i.test(p));
	} catch (e) {
		ok = false;
	}
	permissiveCache.set(key, ok);
	return ok;
}

function moveAllowed(name, fdex, ruleTable, ctx) {
	const move = fdex.moves.get(name);
	if (!move.exists || move.gen > fdex.gen) return false;
	if (move.status === 'slp' && (ruleTable.has('sleepmovesclause') || ruleTable.has('sleepclause'))) return false;
	if (ruleTable.check('move:' + toId(name)) === 'banned') return false;
	if (move.isNonstandard) {
		if (ctx && ctx.permissive) return movePermittedByValidator(name, ctx.validator, ctx.fullid);
		return false;
	}
	return true;
}

function shuffled(list) {
	const out = list.slice();
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const t = out[i];
		out[i] = out[j];
		out[j] = t;
	}
	return out;
}

function pickMove(cands, fdex, ruleTable, used, variety, ctx) {
	const legal = [];
	for (const name of cands) {
		if (used.has(toId(name))) continue;
		if (!moveAllowed(name, fdex, ruleTable, ctx)) continue;
		const move = fdex.moves.get(name);
		// a damaging move that derives its power from a base move it will not have is a dead slot
		if (move.category !== 'Status' && move.basePower > 0 && move.basePower < 40) continue;
		legal.push(name);
		if (legal.length >= (variety || 1) + 1) break;
	}
	if (!legal.length) return null;
	if (!variety || legal.length === 1) return legal[0];
	return legal[Math.floor(Math.random() * Math.min(legal.length, variety))];
}

// Alpha/Totem/Titan/Gmax formes only receive their signature boosts in Extended, which is the sole
// format carrying the Totem Aura rule. Anywhere else they are plain stat clones, so ranking them
// above real threats on a boost they will never get is what let them crowd out the pool.
function bstOf(species, boosted) {
	const bs = species.baseStats;
	const raw = bs.hp + bs.atk + bs.def + bs.spa + bs.spd + bs.spe;
	if (!boosted) return raw;
	const name = species.name || '';
	if (/-Alpha$/.test(name)) return 2 * bs.hp + bs.spe + 2 * (bs.atk + bs.def + bs.spa + bs.spd);
	if (/-Titan$/.test(name)) return raw + Math.floor((raw - bs.hp) * 0.4);
	if (/-Totem$/.test(name)) return raw + Math.floor((raw - bs.hp) * 0.5);
	if (/-Gmax$/.test(name)) return raw + bs.hp;
	return raw;
}

const SINGLETON_BASES = new Set(['arceus']);

const EVO_AVAILABLE = new Set([null, undefined, 'Past', 'Unobtainable']);
function evoAvailable(species) {
	return !!species && species.exists && species.num > 0 && EVO_AVAILABLE.has(species.isNonstandard);
}
function evoStage(fdex, species) {
	const evos = (species.evos || []).map(e => fdex.species.get(e)).filter(evoAvailable);
	if (!evos.length) return 'FE';
	const prevo = species.prevo ? fdex.species.get(species.prevo) : null;
	if (evoAvailable(prevo)) return 'MC';
	const again = evos.some(e => (e.evos || []).map(x => fdex.species.get(x)).filter(evoAvailable).length > 0);
	return again ? 'LC' : 'NFE';
}

const speciesPoolCache = new Map();
function speciesPool(fdex, ruleTable, fullid) {
	if (speciesPoolCache.has(fullid)) return speciesPoolCache.get(fullid);
	const pool = [];
	const boosted = ruleTable.has('totemaura');
	const wantStage = ruleTable.has('firststageonly') ? 'LC' :
		ruleTable.has('middlestageonly') ? 'MC' : null;
	for (const species of fdex.species.all()) {
		if (!species.exists || !species.baseStats) continue;
		if (species.isNonstandard && species.isNonstandard !== 'Past' && species.isNonstandard !== 'Unobtainable') continue;
		if (ruleTable.check('pokemon:' + species.id) === 'banned') continue;
		if (ruleTable.check('basepokemon:' + toId(species.baseSpecies)) === 'banned') continue;
		if (wantStage && evoStage(fdex, species) !== wantStage) continue;
		pool.push({ species, bst: bstOf(species, boosted) });
	}
	pool.sort((a, b) => b.bst - a.bst);
	const altRe = boosted ?
		/(-Shadow\b|Shadow-|-Totem\b|-Gmax\b|-Alpha\b|-Titan\b)/ :
		/(-Shadow\b|Shadow-)/;
	const spice = pool.filter(e => altRe.test(e.species.name) || /Shadow$/.test(e.species.name));
	// the fastest bodies are low-BST, so the BST-ranked window can never reach them
	const scored = pool.map(e => ({
		e,
		spe: e.species.baseStats.spe,
		aura: boosted && /-(Totem|Titan)$/.test(e.species.name) ? e.species.baseStats.spe * 2 : e.species.baseStats.spe,
	}));
	const seenKing = new Set();
	const speedKings = [];
	for (const s of scored.slice().sort((a, b) => b.aura - a.aura).slice(0, 2)
		.concat(scored.slice().sort((a, b) => b.spe - a.spe).slice(0, 2))) {
		if (seenKing.has(s.e.species.id)) continue;
		seenKing.add(s.e.species.id);
		speedKings.push(s.e);
	}
	const result = { pool, spice, speedKings };
	speciesPoolCache.set(fullid, result);
	return result;
}

function probeSpecies(cand, validator) {
	const probe = {
		species: cand.species.name, ability: cand.species.abilities['0'] || 'No Ability',
		moves: ['Tackle'], evs: {}, ivs: {}, level: undefined, nature: 'Serious',
	};
	let problems = null;
	try {
		problems = validator.validateSet(JSON.parse(JSON.stringify(probe)), {});
	} catch (e) {
		return false;
	}
	if (problems && problems.length && problems.some(p => /does not exist|isn't obtainable|is banned|only allowed|must be|not allowed|roster/i.test(p))) return false;
	return true;
}

function sampleSpecies(pools, validator, teamSize, allowDupes, singletonBases) {
	const { pool, spice, speedKings } = pools;
	const chosen = [];
	const baseCounts = new Map();
	const take = (cand) => {
		const baseId = toId(cand.species.baseSpecies || cand.species.name);
		const count = baseCounts.get(baseId) || 0;
		if (count >= 1 && singletonBases && singletonBases.has(baseId)) return false;
		if (count >= 1 && (!allowDupes || count >= 3 || Math.random() >= 0.3)) return false;
		if (!count && !probeSpecies(cand, validator)) return false;
		baseCounts.set(baseId, count + 1);
		chosen.push(cand.species);
		return true;
	};
	// a ???-typed body with Wonder Guard has no weaknesses to exploit -- a genuine meta pillar
	const kingpins = pool.filter(e => /^(Arceus-Question|Terapagos-Stellar|Eternatus-Eternamax)$/.test(e.species.name));
	if (kingpins.length && Math.random() < 0.5) {
		for (let g = 0; g < 6 && !chosen.length; g++) {
			take(kingpins[Math.floor(Math.random() * kingpins.length)]);
		}
	}
	if (spice.length) {
		const spiceWindow = Math.min(spice.length, 30);
		const spiceWanted = Math.random() < 0.85 ? (Math.random() < 0.4 ? 2 : 1) : 0;
		let guard = 0;
		while (chosen.length < spiceWanted && guard++ < 40) {
			take(spice[Math.floor(Math.pow(Math.random(), 1.6) * spiceWindow)]);
		}
	}
	if (speedKings && speedKings.length && chosen.length < teamSize && Math.random() < 0.35) {
		for (let g = 0; g < 4; g++) {
			if (take(speedKings[Math.floor(Math.random() * speedKings.length)])) break;
		}
	}
	const dupeCount = allowDupes && Math.random() < 0.45 ? (Math.random() < 0.3 ? 2 : 1) : 0;
	const uniqueTarget = Math.max(1, teamSize - dupeCount);
	const window = Math.min(pool.length, Math.max(40, teamSize * 10));
	let guard = 0;
	while (chosen.length < uniqueTarget && guard++ < 300) {
		const cand = pool[Math.floor(Math.pow(Math.random(), 2.2) * window)];
		if (!cand) continue;
		take(cand);
	}
	while (chosen.length < teamSize && chosen.length > 0 && dupeCount > 0) {
		const dupe = chosen[Math.floor(Math.random() * Math.min(2, chosen.length))];
		if (singletonBases && singletonBases.has(toId(dupe.baseSpecies || dupe.name))) break;
		chosen.push(dupe);
	}
	while (chosen.length < teamSize && guard++ < 300) {
		const cand = pool[Math.floor(Math.pow(Math.random(), 2.2) * window)];
		if (!cand) continue;
		take(cand);
	}
	return chosen;
}

function buildHackmonsMoves(set, role, fdex, ruleTable, opts) {
	const ctx = opts && opts.ctx;
	const ability = toId((opts && opts.ability) || set.ability || '');
	const forced = (set.phnnForcedMoves || []).slice();
	const zPackage = opts && opts.zPackage;
	if (zPackage) {
		forced.unshift(zPackage.move);
		if (moveAllowed(zPackage.base, fdex, ruleTable, ctx)) forced.push(zPackage.base);
	}
	const species = fdex.species.get(set.species);
	const types = species && species.exists ? species.types : [];
	const moveCap = movesAllowedPerSet(ruleTable);
	const used = new Set();
	const moves = [];
	const add = name => {
		if (name && !used.has(toId(name)) && moves.length < moveCap) {
			moves.push(name);
			used.add(toId(name));
		}
	};
	forced.forEach(add);
	if (opts && opts.noGuardOhko) add(pickMove(HM_OHKO, fdex, ruleTable, used, 1, ctx));
	const battleLevel = ruleTable.adjustLevel || ruleTable.defaultLevel || ruleTable.maxLevel || 100;
	if (battleLevel <= HM_LOW_LEVEL_CAP && !(opts && opts.noGuardOhko) && Math.random() < 0.9) {
		add(pickMove(HM_LOW_LEVEL_FIXED, fdex, ruleTable, used, 1, ctx));
	}
	const attackPool = () => ((HM_STAB[types[0]] || {}).special || [])
		.concat((HM_STAB[types[1]] || {}).special || [], HM_COVERAGE.special,
			(HM_STAB[types[0]] || {}).physical || [], HM_COVERAGE.physical);
	if (role === 'defensive') {
		add(pickMove(attackPool(), fdex, ruleTable, used, 3, ctx));
		add(pickMove(HM_PROTECT_TIER, fdex, ruleTable, used, 2, ctx));
		for (const group of HM_WALL_MOVES) add(pickMove(group, fdex, ruleTable, used, 3, ctx));
	} else {
		add(pickMove(((HM_STAB[types[0]] || {})[role]) || [], fdex, ruleTable, used, 2, ctx));
		const secondary = types[1] ? ((HM_STAB[types[1]] || {})[role] || []) : [];
		const eliteRoll = Math.random();
		if (eliteRoll < 0.3) {
			add(pickMove(shuffled(HM_GMAX_MOVES), fdex, ruleTable, used, 3, ctx));
		} else if (eliteRoll < 0.6 && HM_ELITE_MOVES[role]) {
			add(pickMove(shuffled(HM_ELITE_MOVES[role]), fdex, ruleTable, used, 3, ctx));
		}
		add(pickMove(secondary.concat(HM_COVERAGE[role]), fdex, ruleTable, used, 3, ctx));
		if (opts && opts.noGuardOhko) {
			// the OHKO move was already reserved a slot before anything else
		} else if (ability === 'prankster') {
			add(pickMove(HM_PRANKSTER_MOVES, fdex, ruleTable, used, 3, ctx));
		} else if (Math.random() < 0.75) {
			add(pickMove(HM_SETUP[role], fdex, ruleTable, used, 2, ctx));
		} else {
			add(pickMove(HM_COVERAGE[role].concat(HM_SETUP[role]), fdex, ruleTable, used, 4, ctx));
		}
		if (ability === 'prankster') {
			add(pickMove(HM_PRANKSTER_MOVES, fdex, ruleTable, used, 4, ctx));
		} else if (Math.random() < 0.15) {
			add(pickMove(HM_NUKE_MOVES, fdex, ruleTable, used, 2, ctx));
		} else if (Math.random() < 0.2) {
			add(pickMove(HM_UTILITY_RECOVERY, fdex, ruleTable, used, 3, ctx));
		} else {
			add(pickMove(HM_UTILITY, fdex, ruleTable, used, 4, ctx));
		}
	}
	for (const m of set.moves || []) {
		if (moves.length >= moveCap) break;
		const id = toId(('' + m).split(' (')[0]);
		if (!used.has(id)) {
			moves.push(m);
			used.add(id);
		}
	}
	const damaging = list => list.some(m => {
		const mv = fdex.moves.get(('' + m).split(' (')[0]);
		return mv.exists && mv.category !== 'Status';
	});
	if (moves.length && !damaging(moves)) {
		const swap = pickMove(attackPool(), fdex, ruleTable, used, 3, ctx);
		if (swap) moves[moves.length - 1] = swap;
	}
	if (moves.length) set.moves = moves.slice(0, moveCap);
	// shadow coverage first, so the consistency pass is always the last word on the moveset
	addShadowCoverage(set, role, fdex, ruleTable, ctx, forced);
	enforceAbilityConsistency(set, role, fdex, ruleTable, ctx, forced);
}

function moveMatches(name, need, fdex) {
	const mv = fdex.moves.get(('' + name).split(' (')[0]);
	if (!mv.exists || mv.category === 'Status') return false;
	if (need === 'normal') return mv.type === 'Normal';
	return mv.category.toLowerCase() === need;
}

// swaps a move into the set without touching anything an archetype forced, preferring to drop a
// status move and otherwise the last slot
function swapInMove(set, name, fdex, forced, ruleTable) {
	if (!name) return false;
	const moves = set.moves || [];
	const locked = new Set((forced || []).map(m => toId('' + m)));
	if (moves.some(m => toId(('' + m).split(' (')[0]) === toId(name))) return false;
	let idx = -1;
	for (let i = moves.length - 1; i >= 0; i--) {
		if (locked.has(toId(('' + moves[i]).split(' (')[0]))) continue;
		const mv = fdex.moves.get(('' + moves[i]).split(' (')[0]);
		if (mv.exists && mv.category === 'Status') { idx = i; break; }
		if (idx < 0) idx = i;
	}
	if (idx < 0) {
		if (moves.length >= movesAllowedPerSet(ruleTable)) return false;
		moves.push(name);
	} else {
		moves[idx] = name;
	}
	set.moves = moves;
	return true;
}

// the ability is picked before the moves are built, so this is the backstop that keeps the two in step
function enforceAbilityConsistency(set, role, fdex, ruleTable, ctx, forced) {
	const species = fdex.species.get(set.species);
	// a ???-typed Wonder Guard body is weak to Shadow and nothing else, and carrying any Shadow move
	// makes it count as Shadow -- so the move is what completes the immunity, not a nice-to-have
	if (toId(set.ability || '') === 'wonderguard' && species.exists && !species.types.includes('Shadow')) {
		const carried = (set.moves || []).some(m => fdex.moves.get(('' + m).split(' (')[0]).type === 'Shadow');
		if (!carried) {
			const shadow = shadowMovesAllowed(fdex, ruleTable, ctx);
			const order = role === 'defensive' ? ['status', 'special', 'physical'] :
				role === 'physical' ? ['physical', 'special', 'status'] : ['special', 'physical', 'status'];
			const used = new Set((set.moves || []).map(m => toId(('' + m).split(' (')[0])));
			for (const key of order) {
				const pick = pickMove(shadow[key], fdex, ruleTable, used, 3, ctx);
				if (pick && swapInMove(set, pick, fdex, forced, ruleTable)) break;
			}
		}
	}
	const need = ABILITY_NEEDS[toId(set.ability || '')];
	if (!need) return;
	const moves = set.moves || [];
	if (moves.some(m => moveMatches(m, need, fdex))) return;
	const types = species && species.exists ? species.types : [];
	const used = new Set(moves.map(m => toId(('' + m).split(' (')[0])));
	const other = role === 'physical' ? 'special' : 'physical';
	// before Gen 4 a move's category follows its TYPE, so the physical/special lists above are only a
	// starting guess -- the dex is the authority on what actually counts
	const pool = (need === 'normal' ?
		(HM_STAB.Normal[role] || []).concat(HM_STAB.Normal[other] || []) :
		shadowMovesAllowed(fdex, ruleTable, ctx)[need]
			.concat((HM_STAB[types[0]] || {})[need] || [], (HM_STAB[types[1]] || {})[need] || [], HM_COVERAGE[need] || [],
				HM_STAB[types[0]] ? HM_STAB[types[0]][other] || [] : [], HM_COVERAGE[other] || [])
	).filter(m => moveMatches(m, need, fdex));
	const fix = pickMove(pool, fdex, ruleTable, used, 3, ctx);
	if (fix && swapInMove(set, fix, fdex, forced, ruleTable)) return;
	// nothing of that category is legal here, so the ability is the part that has to give -- but only
	// where the format actually permits an empty ability, since a mismatch beats an invalid set
	if (ruleTable.check('ability:noability') !== 'banned') {
		set.ability = 'No Ability';
		delete set.phnnForcedAbility;
	}
}

function shadowMovesAllowed(fdex, ruleTable, ctx) {
	const out = { physical: [], special: [], status: [] };
	for (const key of Object.keys(out)) {
		out[key] = HM_SHADOW_MOVES[key].filter(m => moveAllowed(m, fdex, ruleTable, ctx));
	}
	return out;
}

// Shadow coverage is close to free value, so an attacking set takes one most of the time and a set whose
// ability only reads one category always takes that category's Shadow move
function addShadowCoverage(set, role, fdex, ruleTable, ctx, forced) {
	if (role === 'defensive') return;
	const shadow = shadowMovesAllowed(fdex, ruleTable, ctx);
	const pool = (shadow[role] || []).filter(m => moveMatches(m, role, fdex));
	if (!pool.length) return;
	const moves = set.moves || [];
	if (moves.some(m => fdex.moves.get(('' + m).split(' (')[0]).type === 'Shadow')) return;
	const locked = ABILITY_NEEDS[toId(set.ability || '')] === role;
	if (!locked && Math.random() >= 0.6) return;
	const used = new Set(moves.map(m => toId(('' + m).split(' (')[0])));
	const pick = pickMove(pool, fdex, ruleTable, used, 3, ctx);
	if (pick) swapInMove(set, pick, fdex, forced, ruleTable);
}

function applyHackmonsEvs(set, role, ruleTable) {
	const unlimited = ruleTable.evLimit === null;
	set.ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
	if (unlimited) {
		if (role === 'special') {
			set.evs = { hp: 252, atk: 0, def: 252, spa: 252, spd: 252, spe: 252 };
			set.nature = 'Timid';
			set.ivs = Object.assign({}, set.ivs, { atk: 0 });
		} else if (role === 'physical') {
			set.evs = { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 };
			set.nature = 'Jolly';
		} else {
			set.evs = { hp: 252, atk: 0, def: 252, spa: 252, spd: 252, spe: 252 };
			set.nature = 'Bold';
			set.ivs = Object.assign({}, set.ivs, { atk: 0 });
		}
	} else if (set.phnnFastEvs) {
		set.evs = { hp: 252, atk: 0, def: 4, spa: 0, spd: 0, spe: 252 };
		set.nature = 'Timid';
		set.ivs = Object.assign({}, set.ivs, { atk: 0 });
	} else if (role === 'physical') {
		set.evs = { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 };
		set.nature = 'Jolly';
	} else if (role === 'special') {
		set.evs = { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 };
		set.nature = 'Timid';
		set.ivs = Object.assign({}, set.ivs, { atk: 0 });
	} else {
		set.evs = { hp: 252, atk: 0, def: 128, spa: 0, spd: 124, spe: 0 };
		set.nature = 'Bold';
	}
}

// abilities that are a straight liability, so a format allowing No Ability would rather have none
const LIABILITY_ABILITIES = new Set(['truant', 'slowstart', 'defeatist', 'klutz', 'stall', 'slowstart']);

// formats carrying Obtainable Abilities (Gen 3 Pure Hackmons, Gen 1 Balanced Hackmons) only permit a
// species' own abilities, plus No Ability where it has been unbanned
function obtainableAbilityFor(set, fdex, ruleTable) {
	const species = fdex.species.get(set.species || set.name);
	const own = Object.values(species.abilities || {})
		.filter(a => a && abilityAllowed(a, fdex, ruleTable));
	const noneOk = ruleTable.check('ability:noability') !== 'banned';
	const allLiability = own.length > 0 && own.every(a => LIABILITY_ABILITIES.has(toId(a)));
	if (noneOk && (!own.length || allLiability || Math.random() < 0.2)) return 'No Ability';
	if (own.length) return own[Math.floor(Math.random() * own.length)];
	return noneOk ? 'No Ability' : (own[0] || 'No Ability');
}

function abilityAllowed(name, fdex, ruleTable) {
	const ability = fdex.abilities.get(name);
	if (!ability.exists || ability.gen > fdex.gen || ability.isNonstandard) return false;
	if (ruleTable.check('ability:' + toId(name)) === 'banned') return false;
	return true;
}

function bestSpeciesItem(set, fdex, ruleTable) {
	const ids = [toId(set.species), toId(fdex.species.get(set.species).baseSpecies || '')];
	for (const id of ids) {
		const item = HM_SPECIES_ITEMS[id];
		if (item && itemAllowed(item, fdex, ruleTable)) return item;
	}
	return null;
}

function upgradeHackmonsSet(set, fdex, ruleTable, usedAbilities, ctx) {
	const role = set.phnnForcedRole || setRole(set);
	const ohkoLegal = !ruleTable.has('ohkoclause') && moveAllowed('Sheer Cold', fdex, ruleTable);
	const restrictAbilities = ruleTable.has('obtainableabilities');
	if (restrictAbilities) {
		set.ability = obtainableAbilityFor(set, fdex, ruleTable);
		buildHackmonsMoves(set, role, fdex, ruleTable, { ability: set.ability, ctx });
		applyHackmonsEvs(set, role, ruleTable);
		if (fdex.gen === 1) delete set.item;
		return;
	}
	const noWeakness = wonderGuardBody(fdex.species.get(set.species), fdex);
	if (noWeakness && !usedAbilities.get('wonderguard') && abilityAllowed('Wonder Guard', fdex, ruleTable)) {
		set.ability = 'Wonder Guard';
		usedAbilities.set('wonderguard', 1);
	}
	const wantsNoGuard = !set.ability && !set.phnnForcedAbility && role !== 'defensive' && ohkoLegal && !usedAbilities.has('noguard') &&
		abilityAllowed('No Guard', fdex, ruleTable) && Math.random() < 0.3;
	if (set.phnnForcedAbility || set.ability === 'Wonder Guard') {
		// an archetype (or a no-weakness body) already decided this one
	} else if (wantsNoGuard) {
		set.ability = 'No Guard';
		usedAbilities.set('noguard', 1);
	} else {
		let pool = (META_ABILITIES[role] || []).filter(a => toId(a) !== 'noguard');
		if (role !== 'defensive') pool = META_ABILITIES.ate.concat(pool);
		pool = pool.concat(META_ABILITIES.utility, META_ABILITIES.defensive);
		// an ability whose whole effect reads the other damage category never belongs on this set, and
		// Wonder Guard is a liability rather than a wall on anything that has a weakness to be hit by
		const roleOk = name => {
			if (toId(name) === 'wonderguard') return noWeakness;
			const need = ABILITY_NEEDS[toId(name)];
			return !need || need === 'normal' || need === role;
		};
		const isLegal = name => !usedAbilities.get(toId(name)) && roleOk(name) && abilityAllowed(name, fdex, ruleTable);
		let picked = null;
		if (Math.random() < 0.4) {
			const premium = HM_PREMIUM_ABILITIES.filter(isLegal);
			if (premium.length) picked = premium[Math.floor(Math.random() * premium.length)];
		}
		if (!picked) {
			const legal = pool.filter(isLegal);
			if (legal.length) picked = legal[Math.floor(Math.random() * Math.min(legal.length, 4))];
		}
		if (picked) {
			set.ability = picked;
			usedAbilities.set(toId(picked), 1);
		}
	}
	const zPackage = !wantsNoGuard && Math.random() < 0.25
		? shuffled(HM_ZMOVE_PACKAGES).find(z => (
			itemAllowed(z.item, fdex, ruleTable) && moveAllowed(z.move, fdex, ruleTable, ctx)
		))
		: null;
	buildHackmonsMoves(set, role, fdex, ruleTable, {
		noGuardOhko: wantsNoGuard, ability: set.ability, ctx, zPackage,
	});
	applyHackmonsEvs(set, role, ruleTable);
	if (zPackage) set.phnnZItem = zPackage.item;
	if (set.phnnForcedItem) {
		set.item = set.phnnForcedItem;
	} else if (fdex.gen >= 2) {
		const signature = bestSpeciesItem(set, fdex, ruleTable);
		const abilityItem = HM_ABILITY_ITEMS[toId(set.ability || '')];
		const needsItem = ITEM_DEPENDENT_ABILITIES.has(toId(set.ability || ''));
		const stillEvolves = evoStage(fdex, fdex.species.get(set.species)) !== 'FE';
		if (signature) {
			set.item = signature;
		} else if (stillEvolves && !needsItem && itemAllowed('Eviolite', fdex, ruleTable)) {
			set.item = 'Eviolite';
		} else if (abilityItem && itemAllowed(abilityItem, fdex, ruleTable)) {
			set.item = abilityItem;
		} else if (!set.item) {
			set.item = 'Leftovers';
		}
	}
}

function itemAllowed(name, fdex, ruleTable) {
	const item = fdex.items.get(name);
	if (!item.exists || item.gen > fdex.gen || item.isNonstandard) return false;
	if (ruleTable.check('item:' + toId(name)) === 'banned') return false;
	return true;
}

function upgradeCdSet(set, fdex, ruleTable) {
	const role = setRole(set);
	const abilityPool = (CD_OFFENSE_ABILITIES[role] || []).concat(
		role === 'defensive' ? [] : CD_OFFENSE_ABILITIES.defensive.slice(0, 2),
		CD_UNIVERSAL_ABILITIES
	);
	const mainAbility = toId(set.ability || '');
	const extras = [];
	for (const name of abilityPool) {
		if (toId(name) === mainAbility) continue;
		if (extras.some(e => toId(e) === toId(name))) continue;
		if (!abilityAllowed(name, fdex, ruleTable)) continue;
		extras.push(name);
	}
	if (extras.length) set.phAbilities = extras.join('/');
	const stack = CD_ITEM_STACKS[role] || CD_ITEM_STACKS.defensive;
	if (!set.item || !itemAllowed(set.item, fdex, ruleTable)) {
		set.item = itemAllowed(stack.main, fdex, ruleTable) ? stack.main : 'Leftovers';
	}
	const itemExtras = [];
	for (const name of stack.extras) {
		if (toId(name) === toId(set.item)) continue;
		if (!itemAllowed(name, fdex, ruleTable)) continue;
		itemExtras.push(name);
	}
	if (itemExtras.length) set.phItems = itemExtras.join('/');
}

// anything Smogon has no set for still deserves a real spread, never the 85-across-the-board default
function applyCompetitiveSpreads(team, gen, fdex, ruleTable) {
	const evLimited = ruleTable.evLimit !== null;
	if (!evLimited) return;
	for (const set of team) {
		if (set.phnnSmogonSpread) continue;
		const role = setRole(set);
		if (role === 'physical') {
			set.evs = { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 };
			set.nature = set.nature && set.nature !== 'Serious' ? set.nature : 'Jolly';
			set.ivs = { hp: 31, atk: 31, def: 31, spa: 0, spd: 31, spe: 31 };
		} else if (role === 'special') {
			set.evs = { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 };
			set.nature = set.nature && set.nature !== 'Serious' ? set.nature : 'Timid';
			set.ivs = { hp: 31, atk: 0, def: 31, spa: 31, spd: 31, spe: 31 };
		} else {
			// walls want the split that maximises total damage absorbed
			const species = fdex.species.get(set.species);
			const bs = species.baseStats;
			const physSide = bs.def <= bs.spd ? 'def' : 'spd';
			set.evs = { hp: 252, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
			set.evs[physSide] = 252;
			set.evs[physSide === 'def' ? 'spd' : 'def'] = 4;
			set.nature = physSide === 'def' ? 'Bold' : 'Calm';
			set.ivs = { hp: 31, atk: 0, def: 31, spa: 31, spd: 31, spe: 31 };
		}
	}
}

function applySmogonSets(team, gen, fdex, ruleTable, gate) {
	const lib = loadSmogonSets()['gen' + gen];
	if (!lib) return;
	const labels = (gate && gate.labels) || [];
	const wanted = labels.length ? labels.concat(gate.doubles ? ['doubles', 'vgc'] : [], gate.natdex ? ['nationaldex'] : []) : [];
	for (const set of team) {
		const id = toId(set.species || set.name);
		const entries = lib[id] || lib[toId(fdex.species.get(set.species).baseSpecies || '')];
		if (!entries || !entries.length) continue;
		const legal = entries.filter(e => (
			e.m.every(m => moveAllowed(m, fdex, ruleTable)) &&
			(!e.a || abilityAllowed(e.a, fdex, ruleTable)) &&
			(!e.i || itemAllowed(e.i, fdex, ruleTable))
		));
		if (!legal.length) continue;
		const onTier = wanted.length ? legal.filter(e => wanted.some(w => toId(e.n || '').startsWith(w))) : [];
		const from = onTier.length ? onTier : legal;
		const pick = from[Math.floor(Math.random() * from.length)];
		set.moves = pick.m.slice(0, 4);
		if (pick.a) set.ability = pick.a;
		if (pick.i) set.item = pick.i;
		if (pick.na) set.nature = pick.na;
		if (pick.e) set.evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, ...pick.e };
		if (pick.v) set.ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31, ...pick.v };
		set.phnnSmogonSpread = !!pick.e;
	}
}

// Imposter copies the target's stats but keeps its OWN HP, so the best body is simply the bulkiest
// legal one in THIS format -- which differs per generation (and Gmax only helps where Dynamax exists)
// the Gmax HP doubling is baked into the phnn mod's statModify, not the Totem Aura rule
// Wonder Guard only lets super-effective damage through, so it is worth an ability slot exactly when the
// body has no weaknesses at all. Pure Shadow (Arceus-Shadow, Mewtwo-Shadow) has none; ???-typed bodies
// (Arceus-Question and the 924 BST glitch Pokemon) are weak only to Shadow, and carrying a Shadow move
// makes them count as Shadow, which closes that hole too. Terapagos-Stellar is NOT one of these -- it is
// weak to Fighting and Shadow, and its own Tera Shell already does the job better.
function effectiveSpeed(sp) {
	const stage = HM_TOTEM_SPE_STAGES[sp.id] || 0;
	return sp.baseStats.spe * (stage === 1 ? 1.5 : stage === 2 ? 2 : 1);
}

function legalBodies(names, fdex, ruleTable, team, self) {
	const wantStage = ruleTable.has('firststageonly') ? 'LC' :
		ruleTable.has('middlestageonly') ? 'MC' : null;
	const taken = ruleTable.has('speciesclause') ?
		new Set((team || []).filter(s => s && s !== self).map(s => toId(s.species || ''))) : null;
	return names
		.map(n => fdex.species.get(n))
		.filter(sp => sp.exists && !(taken && taken.has(toId(sp.name))) &&
			ruleTable.check('pokemon:' + sp.id) !== 'banned' &&
			ruleTable.check('basepokemon:' + toId(sp.baseSpecies)) !== 'banned' &&
			(!wantStage || evoStage(fdex, sp) === wantStage));
}

function fastestBody(fdex, ruleTable, team, self) {
	return legalBodies(HM_FAST_BODIES, fdex, ruleTable, team, self)
		.sort((a, b) => effectiveSpeed(b) - effectiveSpeed(a))[0] || null;
}

const wonderGuardCache = new Map();
function wonderGuardBody(sp, fdex) {
	if (!sp || !sp.exists) return false;
	const key = fdex.currentMod + '|' + sp.id;
	if (wonderGuardCache.has(key)) return wonderGuardCache.get(key);
	let weaknesses = 0;
	for (const type of fdex.types.all()) {
		let mult = 1, immune = false;
		for (const def of sp.types) {
			if (!fdex.getImmunity(type.name, def)) { immune = true; break; }
			mult *= Math.pow(2, fdex.getEffectiveness(type.name, def));
		}
		if (!immune && mult > 1 && type.name !== 'Shadow') weaknesses++;
	}
	const ok = weaknesses === 0;
	wonderGuardCache.set(key, ok);
	return ok;
}

// Terastallizing into Shadow is the strongest option the fork offers: it grants STAB on Shadow moves,
// which are already 2x into everything that is not Shadow, AND it retypes the holder to Shadow, so the
// same moves come back at 0.5x. ??? is the defensive counterpart -- typeless is weak to Shadow alone.
// Which of these a format actually accepts is decided by several interacting rules (Shadow Tera Clause,
// the nonstandard-type check, the Custom Disguises bypass), so ask the real validator once per format
// and cache the answer rather than trying to restate those rules here and getting them wrong.
const teraOptionCache = new Map();
function teraOptionsFor(fullid, fdex, ruleTable, validator) {
	if (teraOptionCache.has(fullid)) return teraOptionCache.get(fullid);
	const probe = fdex.species.get('Rayquaza').exists ? 'Rayquaza' : 'Ditto';
	const options = [];
	for (const name of ['Shadow', '???', 'Stellar']) {
		const type = fdex.types.get(name);
		if (!type || !type.exists) continue;
		const set = {
			name: probe, species: probe, ability: 'No Ability', item: '', moves: ['Tackle'],
			evs: {}, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
			level: ruleTable.defaultLevel || 100, nature: 'Hardy', teraType: name,
		};
		let bad = true;
		try { bad = !!validator.validateSet(set, {}); } catch (e) { bad = true; }
		if (!bad) options.push(name);
	}
	teraOptionCache.set(fullid, options);
	return options;
}

function pickTeraType(sp, options) {
	const own = (sp.types && sp.types[0]) || 'Normal';
	if (!options.length) return own;
	const roll = Math.random();
	if (roll < 0.45 && options.includes('Shadow')) return 'Shadow';
	if (roll >= 0.45 && roll < 0.55 && options.includes('???')) return '???';
	if (roll >= 0.55 && roll < 0.85 && options.includes('Stellar')) return 'Stellar';
	return own;
}

function imposterItemFor(sp) {
	return HM_IMPOSTER_ITEMS[toId(sp.name)] || HM_IMPOSTER_ITEMS[toId(sp.baseSpecies || '')] || null;
}

function imposterItemWorks(sp, item) {
	if (item === 'Eviolite') return !!sp.nfe;
	if (item === 'Light Ball') return /^Pikachu/.test(sp.name || '');
	return !!item;
}

// Alphas double HP the same way a Gmax forme does, but ALSO keep Wild Might through Transform, so the
// copied Atk/Def/SpA/SpD land doubled too -- strictly better than the Gmax body at equal HP. They are
// only legal where Alphas are allowed (Extended, the sole format with the Totem Aura rule).
function imposterAlphasLegal(fdex, ruleTable) {
	return toId(fdex.currentMod || '') === 'phnn' && ruleTable.has('totemaura');
}

function imposterBulk(sp, fdex, ruleTable) {
	if (!sp || !sp.exists) return 0;
	const doubles = (toId(fdex.currentMod || '') === 'phnn' && /-Gmax$/.test(sp.name)) ||
		(imposterAlphasLegal(fdex, ruleTable) && /-Alpha$/.test(sp.name));
	const base = sp.baseStats.hp + (doubles ? sp.baseStats.hp : 0);
	const item = imposterItemFor(sp);
	const usable = !!item && imposterItemWorks(sp, item) && itemAllowed(item, fdex, ruleTable);
	return base * (usable && item === 'Eviolite' ? 1.15 : usable && item === 'Light Ball' ? 1.10 : 1);
}

function imposterCandidates(bodies, fdex, ruleTable, taken) {
	const alphaLegal = imposterAlphasLegal(fdex, ruleTable);
	const wantStage = ruleTable.has('firststageonly') ? 'LC' :
		ruleTable.has('middlestageonly') ? 'MC' : null;
	// never trade a body's working item away for the doubling: an -Alpha forme carries no evolution
	// line of its own, so Eviolite stops functioning on it
	const alphaOf = n => {
		if (!alphaLegal) return null;
		const base = fdex.species.get(n);
		if (!base.exists) return null;
		const alpha = fdex.species.get((base.baseSpecies || base.name) + '-Alpha');
		if (!alpha.exists) return null;
		const item = imposterItemFor(base);
		if (item && imposterItemWorks(base, item) && !imposterItemWorks(alpha, item)) return null;
		return alpha.name;
	};
	return bodies
		.flatMap(n => { const a = alphaOf(n); return a ? [a, n] : [n]; })
		.filter((n, i, arr) => arr.indexOf(n) === i)
		.map(n => fdex.species.get(n))
		.filter(sp => sp.exists && !(taken && taken.has(toId(sp.name))) &&
			ruleTable.check('pokemon:' + sp.id) !== 'banned' &&
			ruleTable.check('basepokemon:' + toId(sp.baseSpecies)) !== 'banned' &&
			(!wantStage || evoStage(fdex, sp) === wantStage))
		.map(sp => ({ sp, hp: imposterBulk(sp, fdex, ruleTable) }))
		.sort((a, b) => b.hp - a.hp);
}

function imposterExpendable(sp) {
	if (!sp || !sp.exists) return false;
	const b = sp.baseStats;
	return b.atk + b.def + b.spa + b.spd + b.spe <= HM_IMPOSTER_MAX_KEPT_STATS;
}

// Light Ball doubles Pikachu's Attack and Sp. Atk, and it keys off the HOLDER's base species, so it
// survives Transform and stacks multiplicatively with Wild Might. Measured copying Rhyperior-Alpha:
// every bulk body lands 632 Attack, Pikachu-Gmax or Pikachu-Alpha with a Light Ball lands 1264. That is
// a completely different plan from the pink walls -- a glass cannon rather than a sponge -- so it gets
// chosen on its own roll instead of losing the HP ranking every time.
function imposterGlassCannon(bodies, fdex, ruleTable, taken) {
	return imposterCandidates(bodies, fdex, ruleTable, taken)
		.filter(c => {
			const item = imposterItemFor(c.sp);
			return item === 'Light Ball' && imposterItemWorks(c.sp, item) && itemAllowed(item, fdex, ruleTable);
		})
		.sort((a, b) => (b.sp.baseStats.atk + b.sp.baseStats.spa) - (a.sp.baseStats.atk + a.sp.baseStats.spa))[0] || null;
}

function makeImposter(set, sp, fdex, ruleTable) {
	set.ability = 'Imposter';
	set.phnnForcedAbility = 'Imposter';
	set.phnnForcedRole = 'defensive';
	const item = imposterItemFor(sp);
	if (item && imposterItemWorks(sp, item) && itemAllowed(item, fdex, ruleTable)) set.phnnForcedItem = item;
}

// Wild Might survives Transform and doubles an Alpha's own HP, so on an Extended team most of the roster
// is already a viable Imposter body -- hand the ability to the bulkiest members rather than to one
// purpose-built slot, and only fall back to substituting a dedicated body when nothing on the team is
// bulky enough to hold the ability at all.
function applyImposters(team, fdex, ruleTable) {
	if (ruleTable.has('obtainableabilities') || !abilityAllowed('Imposter', fdex, ruleTable)) return;
	const isImposter = set => toId((set && set.phnnForcedAbility) || '') === 'imposter';
	let target = 1 + (Math.random() < 0.55 ? 1 : 0) + (Math.random() < 0.25 ? 1 : 0);
	target = Math.max(1, Math.min(target, team.length - 1));
	let made = team.filter(isImposter).length;
	const free = team
		.map(set => ({ set, sp: fdex.species.get((set && set.species) || '') }))
		.filter(e => e.set && !isImposter(e.set) && !e.set.phnnForcedAbility && !e.set.phnnForcedMoves)
		.map(e => ({ set: e.set, sp: e.sp, hp: imposterBulk(e.sp, fdex, ruleTable) }))
		.sort((a, b) => b.hp - a.hp);
	const taken = ruleTable.has('speciesclause') ?
		new Set(team.map(set => toId((set && set.species) || ''))) : null;
	const bench = imposterCandidates(HM_IMPOSTER_BODIES, fdex, ruleTable, taken);
	// a format whose best possible body is small (Little Cup) must not be held to the flat floor
	const floor = Math.min(HM_IMPOSTER_MIN_BULK, bench.length ? bench[0].hp * 0.6 : HM_IMPOSTER_MIN_BULK);
	const spare = [];
	for (const entry of free) {
		if (made >= target) break;
		if (entry.hp < floor || !imposterExpendable(entry.sp)) { spare.push(entry); continue; }
		makeImposter(entry.set, entry.sp, fdex, ruleTable);
		made++;
	}
	// at most one team member is ever REPLACED by a purpose-built body, so a thin roster still fields an
	// Imposter without the whole team collapsing into Chansey clones
	const victim = spare[spare.length - 1] || free[free.length - 1];
	if (made >= target || !bench.length || !victim || isImposter(victim.set)) return;
	const cannon = Math.random() < 0.3 ? imposterGlassCannon(HM_IMPOSTER_BODIES, fdex, ruleTable, taken) : null;
	const chosen = cannon ? cannon.sp : bench[0].sp;
	victim.set.species = chosen.name;
	victim.set.name = victim.set.species;
	makeImposter(victim.set, chosen, fdex, ruleTable);
}

function applyArchetype(team, fdex, ruleTable, usedAbilities) {
	const usable = HM_ARCHETYPES.filter(a => a.slots.every(slot => (
		(!slot.ability || abilityAllowed(slot.ability, fdex, ruleTable)) &&
		slot.moves.every(m => moveAllowed(m, fdex, ruleTable) || slot.moves.length > 1)
	)));
	if (!usable.length || team.length < 2) return null;
	const plan = usable[Math.floor(Math.random() * usable.length)];
	plan.slots.forEach((slot, i) => {
		const set = team[i];
		if (!set) return;
		if (slot.bodies) {
			const cannon = Math.random() < 0.3 ? imposterGlassCannon(slot.bodies, fdex, ruleTable, null) : null;
			const ranked = imposterCandidates(slot.bodies, fdex, ruleTable, null);
			const cutoff = ranked.length ? ranked[0].hp * 0.9 : 0;
			const viable = ranked.filter(r => r.hp >= cutoff);
			const body = cannon ? cannon.sp :
				viable.length ? viable[Math.floor(Math.random() * viable.length)].sp : null;
			if (body) {
				set.species = body.name;
				set.name = set.species;
				makeImposter(set, body, fdex, ruleTable);
			}
		}
		if (slot.fastBodies) {
			const body = fastestBody(fdex, ruleTable, team, set);
			if (body) {
				set.species = body.name;
				set.name = set.species;
			}
		}
		if (slot.wgBodies) {
			// before Gen 8 an Arceus forme without its Plate is rewritten back to plain Arceus later in
			// reshape(), which would strand Wonder Guard on a Normal type
			const pool = legalBodies(HM_WONDER_GUARD_BODIES, fdex, ruleTable, team, set)
				.filter(sp => wonderGuardBody(sp, fdex) && !(fdex.gen <= 7 && /^Arceus-/.test(sp.name)));
			const body = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
			if (!body) return;
			set.species = body.name;
			set.name = set.species;
		}
		if (slot.item && itemAllowed(slot.item, fdex, ruleTable)) set.phnnForcedItem = slot.item;
		if (slot.fastEvs) set.phnnFastEvs = true;
		if (slot.ability && !usedAbilities.get(toId(slot.ability)) && abilityAllowed(slot.ability, fdex, ruleTable)) {
			set.ability = slot.ability;
			set.phnnForcedAbility = slot.ability;
			usedAbilities.set(toId(slot.ability), 1);
		}
		const forced = slot.moves.filter(m => moveAllowed(m, fdex, ruleTable));
		if (forced.length) set.phnnForcedMoves = forced.slice(0, 4);
		if (slot.role) set.phnnForcedRole = slot.role;
	});
	return plan.name;
}

function applyFormatCore(team, baseid, fdex, ruleTable) {
	const core = HM_FORMAT_CORES[baseid];
	if (!core || Math.random() >= core.chance) return;
	const species = fdex.species.get(core.species);
	if (!species.exists || ruleTable.check('pokemon:' + species.id) === 'banned') return;
	const count = Math.min(team.length, core.min + Math.floor(Math.random() * (core.max - core.min + 1)));
	for (let i = 0; i < count; i++) {
		const set = team[i];
		if (!set) continue;
		const moves = core.movesets[Math.floor(Math.random() * core.movesets.length)]
			.filter(m => moveAllowed(m, fdex, ruleTable));
		if (moves.length < 2) return;
		set.species = species.name;
		set.name = species.name;
		set.moves = moves.slice(0, 4);
		if (core.ability !== null) set.ability = core.ability;
	}
}

function reshape(team, baseid, gen, rulesText, ruleTable, fdex, ctx, gate) {
	const isCD = baseid.includes('customdisguise') && /^gen[89]/.test(baseid) && !toId(rulesText).includes('standardcustom');
	const isHackmons = isHackmonsTarget(baseid) && gen >= 3 && !baseid.includes('metronome');
	const usedAbilities = new Map();
	if (isHackmons && !baseid.includes('letsgo') && Math.random() < 0.45) {
		applyArchetype(team, fdex, ruleTable, usedAbilities);
	}
	if (isHackmons && !baseid.includes('letsgo')) applyImposters(team, fdex, ruleTable);
	if (!isHackmons) {
		applySmogonSets(team, gen, fdex, ruleTable, gate);
		applyCompetitiveSpreads(team, gen, fdex, ruleTable);
	}
	const isLetsGo = baseid.includes('letsgo');
	const usedItems = new Set();
	let fillerIdx = 0;
	if (gen <= 7) {
		const plainArceus = fdex.species.get('Arceus');
		const arceusLegal = plainArceus.exists && ruleTable.check('pokemon:' + plainArceus.id) !== 'banned';
		for (const set of team) {
			if (!/^arceus./.test(toId(set.species || ''))) continue;
			if (/plate$/.test(toId(set.item || ''))) continue;
			if (!arceusLegal) continue;
			if (toId(set.name || '') === toId(set.species || '')) set.name = plainArceus.name;
			set.species = plainArceus.name;
		}
	}
	for (const set of team) {
		delete set.level;
		if (gen < 9) delete set.teraType;
		if (gen === 1 || isLetsGo) delete set.item;
		if (isLetsGo) delete set.evs;
		if (isHackmons && !baseid.includes('letsgo')) upgradeHackmonsSet(set, fdex, ruleTable, usedAbilities, ctx);
		if (ruleTable.has('itemclause') && set.item) {
			if (usedItems.has(toId(set.item))) {
				while (fillerIdx < FILLER_ITEMS.length && usedItems.has(toId(FILLER_ITEMS[fillerIdx]))) fillerIdx++;
				set.item = FILLER_ITEMS[fillerIdx] || '';
			}
			if (set.item) usedItems.add(toId(set.item));
		}
		if (isCD) upgradeCdSet(set, fdex, ruleTable);
	}
	applyFormatCore(team, baseid, fdex, ruleTable);
	return team;
}

function baseSpeciesId(set) {
	const { Dex } = loadSim();
	const species = Dex.species.get(set.species);
	return toId(species.baseSpecies || set.species);
}

function drawFilteredPool(source, teamSize, opts) {
	const { Dex, Teams } = loadSim();
	const mono = opts && opts.mono;
	const gate = opts && opts.gate;
	const quota = gate && !mono ? Math.max(1, teamSize - 2) : 0;
	const draws = mono ? 40 : 25;
	let type = null;
	const prime = [];
	const rest = [];
	const spare = [];
	const seen = new Set();
	for (let draw = 0; draw < draws; draw++) {
		if (prime.length >= quota && prime.length + rest.length >= teamSize) break;
		const pool = Teams.generate(source);
		for (const set of pool) {
			const species = Dex.species.get(set.species);
			if (!species.exists) continue;
			if (mono) {
				if (!type) type = species.types[0];
				if (!species.types.includes(type)) continue;
			}
			const sid = baseSpeciesId(set);
			if (seen.has(sid)) continue;
			seen.add(sid);
			if (gate && !gate.accepts(set.species)) {
				spare.push(set);
			} else {
				(gate && gate.prime(set.species) ? prime : rest).push(set);
			}
		}
	}
	const picked = shuffled(prime).slice(0, quota || teamSize);
	for (const set of shuffled(rest).concat(shuffled(prime), mono ? shuffled(spare) : [])) {
		if (picked.length >= teamSize) break;
		if (!picked.includes(set)) picked.push(set);
	}
	return picked.length >= Math.min(teamSize, 3) ? picked : null;
}

function generateTeam(formatid) {
	const { Dex, Teams, TeamValidator } = loadSim();
	const sepIdx = formatid.indexOf('@@@');
	const baseFmt = sepIdx < 0 ? formatid : formatid.slice(0, sepIdx);
	const rulesText = sepIdx < 0 ? '' : formatid.slice(sepIdx + 3).trim();
	const baseid = toId(baseFmt);
	const format = Dex.formats.get(baseid);
	if (!format.exists) return { error: `Unknown format: ${baseFmt}` };
	const fullid = rulesText ? `${baseid}@@@${rulesText}` : baseid;

	let validator;
	let ruleTable;
	try {
		validator = TeamValidator.get(fullid);
		ruleTable = Dex.formats.getRuleTable(validator.format);
	} catch (e) {
		return { error: `Bad custom rules: ${('' + e.message).slice(0, 200)}` };
	}

	const gen = genOf(baseid, format);
	const fdex = Dex.forFormat(validator.format);
	if (ruleTable.has('littlecup') && !hasGenerator(baseid)) {
		return { error: 'Little Cup formats have no team generator yet. Try another format.' };
	}
	const source = hasGenerator(baseid) ? baseid : sourceFor(baseid, format);
	if (!source) return { error: 'No team generator is available for this format.' };

	// Custom Disguises really does allow 24 Pokemon and 24 moves each. Use the headroom, but stop well
	// short of the ceiling so a generated team is still something you can actually pilot.
	const sizeCap = ruleTable.has('disguisemod') ? HM_CD_TEAM_CAP : 6;
	const roomFor = Math.max(1, Math.min(sizeCap, ruleTable.maxTeamSize || 6));
	const teamSize = roomFor > 6 ? 6 + Math.floor(Math.random() * (roomFor - 5)) : roomFor;
	const teraOpts = gen >= 9 ? teraOptionsFor(fullid, fdex, ruleTable, validator) : [];
	const isMono = ruleTable.has('sametypeclause');
	const synthesize = isHackmonsTarget(baseid) && gen >= 3 && !isMono &&
		!baseid.includes('metronome') && !baseid.includes('letsgo');
	const gate = synthesize ? null : tierGate(fdex, ruleTable, tierPolicyFor(baseid), fullid);
	let team = null;
	let problems = null;

	for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
		let pool;
		try {
			if (synthesize) {
				const sPool = speciesPool(fdex, ruleTable, fullid);
				const allowDupes = !ruleTable.has('speciesclause') && !ruleTable.has('formeclause');
				const picked = sampleSpecies(sPool, validator, teamSize, allowDupes, gen <= 7 ? SINGLETON_BASES : null);
				if (picked.length >= teamSize) {
					pool = picked.map(sp => ({
						name: sp.name, species: sp.name, ability: '', item: '',
						moves: [], nature: 'Serious', gender: '', evs: {}, ivs: {},
						teraType: gen >= 9 ? pickTeraType(sp, teraOpts) : undefined,
					}));
				} else {
					pool = Teams.generate(source);
				}
			} else if (isMono || gate) {
				pool = drawFilteredPool(source, teamSize, { mono: isMono, gate }) ||
					(gate ? drawFilteredPool(source, teamSize, { mono: isMono }) : null);
			} else {
				pool = Teams.generate(source);
			}
		} catch (e) {
			return { error: `Generator failed: ${('' + e.message).slice(0, 200)}` };
		}
		if (!pool || !pool.length) return { error: 'The team generator produced nothing for this format.' };
		if (!team || isMono || synthesize) {
			team = pool.slice(0, teamSize);
		} else {
			const badIdx = new Set();
			for (const p of problems) {
				team.forEach((set, i) => {
					const label = set.name || set.species;
					if (p.includes(label) || p.includes(set.species)) badIdx.add(i);
				});
			}
			if (!badIdx.size) {
				team = pool.slice(0, teamSize);
			} else {
				const spare = pool.filter(set => !team.some(t => baseSpeciesId(t) === baseSpeciesId(set)));
				for (const i of badIdx) {
					if (!spare.length) break;
					team[i] = spare.pop();
				}
			}
		}
		if (!synthesize || ruleTable.has('speciesclause') || ruleTable.has('formeclause')) {
			const seen = new Set();
			team = team.filter(set => {
				const sid = baseSpeciesId(set);
				if (seen.has(sid)) return false;
				seen.add(sid);
				return true;
			});
			while (team.length < teamSize) {
				const refill = isMono ? [] : (gate ? drawFilteredPool(source, teamSize, { gate }) || [] : Teams.generate(source));
				const extra = refill.find(set => !seen.has(baseSpeciesId(set)));
				if (!extra) break;
				seen.add(baseSpeciesId(extra));
				team.push(extra);
			}
		}
		reshape(team, baseid, gen, rulesText, ruleTable, fdex, { permissive: isHackmonsTarget(baseid), validator, fullid }, gate);
		try {
			problems = validator.validateTeam(JSON.parse(JSON.stringify(team))) || [];
		} catch (e) {
			return { error: `Validator error: ${('' + e.message).slice(0, 200)}` };
		}
		if (!problems.length) {
			for (const set of team) {
				delete set.phnnForcedMoves;
				delete set.phnnForcedRole;
				delete set.phnnSmogonSpread;
				delete set.phnnZItem;
				delete set.phnnForcedItem;
				delete set.phnnForcedAbility;
				delete set.phnnFastEvs;
			}
			return { team: Teams.pack(team), export: Teams.export(team), source, attempts: attempt + 1 };
		}
	}
	return {
		error: `Couldn't build a fully legal team for this format after ${MAX_ATTEMPTS} tries. ` +
			`Last problems: ${problems.slice(0, 3).join(' | ').slice(0, 400)}`,
	};
}

module.exports = { generateTeam };
