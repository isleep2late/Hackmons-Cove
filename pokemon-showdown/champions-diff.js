const { Dex } = require('./dist/sim/dex');
const fs = require('fs');

const gen9 = Dex;
const champions = Dex.mod('champions');

const moveDiffs = {};
for (const move of champions.moves.all()) {
	const baseMove = gen9.moves.get(move.id);
	const diff = {};
	if (move.basePower !== baseMove.basePower) diff.power = move.basePower;
	if (move.accuracy !== baseMove.accuracy) diff.accuracy = move.accuracy === true ? null : move.accuracy;
	if (move.pp !== baseMove.pp) diff.pp = move.pp;
	if (move.priority !== baseMove.priority) diff.priority = move.priority;
	if (move.shortDesc !== baseMove.shortDesc) diff.description = move.shortDesc;
	else if (move.desc !== baseMove.desc) diff.description = move.desc;
	if (move.isNonstandard !== baseMove.isNonstandard) diff.isNonstandard = move.isNonstandard;
	
	if (Object.keys(diff).length > 0) {
		moveDiffs[move.id] = diff;
	}
}

const abilityDiffs = {};
for (const ability of champions.abilities.all()) {
	const baseAbility = gen9.abilities.get(ability.id);
	const diff = {};
	if (ability.shortDesc !== baseAbility.shortDesc) diff.description = ability.shortDesc;
	else if (ability.desc !== baseAbility.desc) diff.description = ability.desc;
	
	if (Object.keys(diff).length > 0) {
		abilityDiffs[ability.id] = diff;
	}
}

const itemDiffs = {};
for (const item of champions.items.all()) {
	const baseItem = gen9.items.get(item.id);
	const diff = {};
	if (item.shortDesc !== baseItem.shortDesc) diff.description = item.shortDesc;
	else if (item.desc !== baseItem.desc) diff.description = item.desc;
	
	if (Object.keys(diff).length > 0) {
		itemDiffs[item.id] = diff;
	}
}

fs.writeFileSync('champions-diff.json', JSON.stringify({
	moves: moveDiffs,
	abilities: abilityDiffs,
	items: itemDiffs
}, null, 2));

console.log('Successfully generated champions-diff.json');
