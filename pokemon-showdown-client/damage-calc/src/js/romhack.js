(function () {
	var select = $("#romhack");
	if (!select.length || !window.fetch) return;
	var list = [];
	try {
		list = JSON.parse(localStorage.getItem("romhacks:list") || "[]");
	} catch (e) {
		list = [];
	}
	var wanted = new URLSearchParams(window.location.search).get("romhack") || "";
	if (/^[0-9a-f]{64}$/.test(wanted) && !list.some(function (entry) { return entry.sha256 === wanted; })) {
		list.unshift({sha256: wanted, name: "ROM hack " + wanted.slice(0, 8)});
	}
	if (!list.length) return;
	list.forEach(function (entry) {
		if (!/^[0-9a-f]{64}$/.test(entry.sha256)) return;
		select.append($("<option></option>").val(entry.sha256).text("ROM hack: " + (entry.name || entry.sha256.slice(0, 8))));
	});
	$(".romhackSelection").show();
	var saved = null;
	var MULTIPLIERS = [1, 2, 0.5, 0];
	var CALC_MECHANICS = {
		critMultiplier: "critical-hit damage", stab: "same-type bonus", damageRoll: "damage roll", burnAttack: "burn Attack",
		statStages: "stat stages", weatherMoveModifiers: "weather damage", paralysisSpeed: "paralysis Speed",
		burnDamage: "burn damage", poisonDamage: "poison damage", toxicStep: "Toxic damage", sandDamage: "sandstorm damage",
		hailDamage: "hail damage", leechSeedDamage: "Leech Seed damage", bindDamage: "binding damage"
	};
	var CALC_MECHANICS_BY_GEN = {
		critMultiplier: 2, weatherMoveModifiers: 2, sandDamage: 2, hailDamage: 3, bindDamage: 2
	};

	function mechanicsNote(mechanics, g) {
		var used = [];
		Object.keys(CALC_MECHANICS).forEach(function (key) {
			if (mechanics[key] === undefined || g < (CALC_MECHANICS_BY_GEN[key] || 1)) return;
			used.push(CALC_MECHANICS[key]);
		});
		var items = mechanics.items && typeof mechanics.items === "object" ? mechanics.items : {};
		var boosts = Object.keys(items).filter(function (id) {
			return items[id] && typeof items[id].powerBoost === "number";
		});
		if (g >= 2 && boosts.length) used.push(boosts.length + " item boost" + (boosts.length === 1 ? "" : "s"));
		if (g >= 2 && items.leftovers && items.leftovers.healFraction) used.push("Leftovers healing");
		return used;
	}

	function hackTypeChart(hack, stock) {
		var source = hack.TypeChart || {};
		if (!Object.keys(source).length) return null;
		var names = Object.keys(stock);
		var known = {};
		names.forEach(function (name) { known[calc.toID(name)] = name; });
		var added = [];
		var add = function (name) {
			var id = calc.toID(name);
			if (!id || known[id] || !source[id]) return;
			known[id] = name;
			names.push(name);
			added.push(name);
		};
		Object.keys(source).forEach(function (id) {
			if (source[id].name) add(source[id].name);
		});
		Object.keys(hack.pokemon || {}).forEach(function (id) {
			(hack.pokemon[id].types || []).forEach(add);
		});
		Object.keys(hack.moves || {}).forEach(function (id) {
			add(hack.moves[id].type || "");
		});
		var chart = {};
		names.forEach(function (attack) {
			var row = {};
			names.forEach(function (defend) {
				var entry = source[calc.toID(defend)];
				var code = entry && entry.damageTaken ? entry.damageTaken[attack] : undefined;
				if (typeof code === "number" && MULTIPLIERS[code] !== undefined) {
					row[defend] = MULTIPLIERS[code];
				} else {
					row[defend] = stock[attack] && typeof stock[attack][defend] === "number" ? stock[attack][defend] : 1;
				}
			});
			chart[attack] = row;
		});
		return {chart: chart, added: added};
	}

	function hackProfile(hack) {
		var g = Math.min(9, Math.max(1, parseInt(String(hack.parentMod).slice(3), 10) || 9));
		var types = hackTypeChart(hack, calc.TYPE_CHART[g]);
		return {
			sha256: hack.sha256, gen: g, chart: types ? types.chart : null, newTypes: types ? types.added : [],
			mechanics: hack.mechanics || {}
		};
	}

	function restore() {
		if (!saved) return;
		if (saved.profile.chart) calc.extendTypes(saved.gen, saved.chart);
		calc.setHackMechanics(0, null);
		window.romHackProfile = null;
		calc.SPECIES[saved.gen] = saved.species;
		calc.MOVES[saved.gen] = saved.moves;
		calc.ABILITIES[saved.gen] = saved.abilities;
		calc.ITEMS[saved.gen] = saved.items;
		SETDEX[saved.gen] = saved.sets;
		RANDDEX[saved.gen] = saved.random;
		calc.extendSpecies(saved.gen, saved.species);
		calc.extendMoves(saved.gen, saved.moves);
		saved = null;
	}

	function apply(full) {
		restore();
		var profile = hackProfile(full);
		var g = profile.gen;
		saved = {
			gen: g, species: calc.SPECIES[g], moves: calc.MOVES[g], abilities: calc.ABILITIES[g], items: calc.ITEMS[g],
			sets: SETDEX[g], random: RANDDEX[g], chart: calc.TYPE_CHART[g], profile: profile
		};
		if (profile.chart) calc.extendTypes(g, profile.chart);
		window.romHackProfile = profile;
		calc.setHackMechanics(g, profile.mechanics);
		var chart = calc.TYPE_CHART[g];
		var knownType = function (type) { return chart[type] ? type : "???"; };
		var species = {};
		Object.keys(full.pokemon).forEach(function (id) {
			var entry = full.pokemon[id];
			if (entry.name === "__proto__") return;
			var old = saved.species[entry.name] || {};
			var types = entry.types.map(knownType);
			var data = {};
			Object.keys(old).forEach(function (key) { data[key] = old[key]; });
			data.types = types;
			data.bs = {
				hp: entry.baseStats.hp, at: entry.baseStats.atk, df: entry.baseStats.def, sa: entry.baseStats.spa,
				sd: entry.baseStats.spd, sp: entry.baseStats.spe
			};
			if (g === 1) data.bs.sl = entry.baseStats.spa;
			data.weightkg = old.weightkg || 20;
			data.abilities = {0: entry.abilities[0] || ""};
			delete data.otherFormes;
			delete data.baseSpecies;
			species[entry.name] = data;
		});
		var moves = {"(No Move)": saved.moves["(No Move)"] || {bp: 0, type: "Normal", category: "Status"}};
		Object.keys(full.moves).forEach(function (id) {
			var entry = full.moves[id];
			if (entry.name === "__proto__") return;
			var old = saved.moves[entry.name] || {};
			var data = {};
			Object.keys(old).forEach(function (key) { data[key] = old[key]; });
			data.bp = entry.basePower;
			data.type = knownType(entry.type);
			data.category = entry.category;
			moves[entry.name] = data;
		});
		var names = function (table) {
			return Object.keys(table).map(function (id) { return table[id].name; }).sort();
		};
		var abilities = names(full.abilities);
		var items = names(full.items);
		calc.extendSpecies(g, species);
		calc.extendMoves(g, moves);
		calc.extendAbilities(g, abilities);
		calc.extendItems(g, items);
		calc.SPECIES[g] = species;
		calc.MOVES[g] = moves;
		calc.ABILITIES[g] = abilities;
		calc.ITEMS[g] = items;
		SETDEX[g] = {};
		RANDDEX[g] = {};
		var rules = mechanicsNote(profile.mechanics, g);
		var chartNote = !profile.chart ? "" : profile.newTypes.length ?
			", own type chart (new types: " + profile.newTypes.join(", ") + ")" : ", own type chart";
		$("#romhack-note").text(Object.keys(species).length + " Pok\u00e9mon, " + (Object.keys(moves).length - 1) + " moves on the Generation " + g + " engine" + chartNote + (rules.length ? ", " + rules.length + " hack battle rule" + (rules.length === 1 ? "" : "s") + " used" : "")).attr("title", rules.length ? "Hack battle rules used by this calculator: " + rules.join(", ") : "");
		$("input.set-selector").val(Object.keys(species).sort()[0] + " (Blank Set)");
		$("#gen" + g).prop("checked", true).change();
	}

	select.change(function () {
		var sha = select.val();
		if (!sha) {
			var back = saved ? saved.gen : 0;
			restore();
			$("#romhack-note").text("").attr("title", "");
			if (back) $("#gen" + back).prop("checked", true).change();
			return;
		}
		$("#romhack-note").text("Loading...").attr("title", "");
		var base = window.location.origin + "/romhacks/" + sha;
		fetch(base + ".full.json").then(function (response) {
			return response.json();
		}).then(function (full) {
			if (!full || full.error || !full.pokemon) throw new Error((full && full.error) || "This ROM hack could not be loaded.");
			if (full.TypeChart) return full;
			return fetch(base + ".json").then(function (response) {
				return response.json();
			}).then(function (plain) {
				full.TypeChart = (plain && plain.TypeChart) || {};
				if (!full.mechanics && plain && plain.mechanics) full.mechanics = plain.mechanics;
				return full;
			}).catch(function () {
				return full;
			});
		}).then(function (full) {
			if (select.val() !== sha) return;
			apply(full);
		}).catch(function (error) {
			select.val("");
			$("#romhack-note").text(error.message || "This ROM hack could not be loaded.");
		});
	});
	$(".gen").change(function () {
		if (saved && ~~$(this).val() !== saved.gen) {
			restore();
			select.val("");
			$("#romhack-note").text("").attr("title", "");
		}
	});
	if (wanted) select.val(wanted).change();
})();
