export const Moves: import('../../../sim/dex-moves').ModdedMoveDataTable = {
	attract: {
		inherit: true,
		pp: 10,
	},
	conversion2: {
		inherit: true,
		pp: 15,
		target: "normal",
		onHit(target, source) {
			const pool = ['Normal', 'Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bird', 'Bug', 'Ghost', 'Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon'].filter(t => !target.getTypes().includes(t));
			if (!pool.length) return false;
			const newType = this.sample(pool);
			if (!target.setType(newType)) return false;
			this.add('-start', target, 'typechange', newType, '[from] move: Conversion 2');
		},
	},
	counter: {
		inherit: true,
		priority: -1,
		accuracy: true,
		ignoreImmunity: true,
		damageCallback(pokemon, target) {
			const lastMove = target.lastMove;
			if (!lastMove || lastMove.id === 'counter' || !lastMove.basePower) return false;
			let moveType = lastMove.type;
			if (lastMove.id === 'hiddenpower') moveType = target.hpType || 'Dark';
			const specialTypes = ['Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark'];
			if (specialTypes.includes(moveType)) return false;
			if (!this.lastDamage) return false;
			return this.clampIntRange(2 * this.lastDamage, 1, 65535);
		},
	},
	crabhammer: {
		inherit: true,
		critRatio: 3,
	},
	doubleedge: {
		inherit: true,
		basePower: 100,
		recoil: [25,100],
	},
	dynamicpunch: {
		inherit: true,
		accuracy: 100,
		basePower: 100,
		pp: 10,
		type: "Fighting",
		secondary: null,
	},
	endure: {
		inherit: true,
		priority: 0,
		stallingMove: false,
		onTryHit(pokemon) {
			return !!this.queue.willAct();
		},
		onHit(pokemon) {},
	},
	flail: {
		inherit: true,
		pp: 10,
		willCrit: false,
	},
	foresight: {
		inherit: true,
		accuracy: 100,
		pp: 10,
	},
	gust: {
		inherit: true,
		accuracy: 100,
		basePower: 40,
		type: "Flying",
	},
	karatechop: {
		inherit: true,
		type: "Normal",
	},
	lockon: {
		inherit: true,
		pp: 10,
	},
	lowkick: {
		inherit: true,
		accuracy: 90,
		basePower: 50,
		secondary: {"chance":30,"volatileStatus":"flinch"},
	},
	moonlight: {
		inherit: true,
		pp: 10,
		onHit(pokemon) {
			return !!this.heal(Math.floor(pokemon.maxhp / 2));
		},
	},
	morningsun: {
		inherit: true,
		pp: 10,
		onHit(pokemon) {
			return !!this.heal(Math.floor(pokemon.maxhp / 2));
		},
	},
	nightmare: {
		inherit: true,
		pp: 10,
	},
	outrage: {
		inherit: true,
		basePower: 90,
		pp: 10,
	},
	powdersnow: {
		inherit: true,
		pp: 10,
		secondary: {"chance":null,"status":"frz"},
	},
	present: {
		inherit: true,
		basePower: 50,
		pp: 10,
		accuracy: 100,
	},
	protect: {
		inherit: true,
		priority: 0,
		stallingMove: false,
		onPrepareHit(pokemon) {
			return !!this.queue.willAct();
		},
		onHit(pokemon) {},
	},
	pursuit: {
		num: 228,
		accuracy: 100,
		basePower: 0,
		category: "Status",
		name: "Pursuit",
		pp: 10,
		priority: 0,
		flags: {protect: 1, mirror: 1, metronome: 1},
		onTry() {
			return false;
		},
		secondary: null,
		target: "normal",
		type: "Normal",
	},
	raindance: {
		inherit: true,
		pp: 10,
		type: "Normal",
	},
	razorleaf: {
		inherit: true,
		critRatio: 3,
	},
	razorwind: {
		inherit: true,
		accuracy: 75,
	},
	rest: {
		inherit: true,
		secondary: null,
	},
	reversal: {
		inherit: true,
		pp: 10,
		willCrit: false,
	},
	roar: {
		inherit: true,
		priority: 0,
		forceSwitch: false,
		onTry() {
			return false;
		},
	},
	safeguard: {
		inherit: true,
		pp: 10,
	},
	sandstorm: {
		num: 201,
		accuracy: 100,
		basePower: 0,
		category: "Status",
		name: "Sandstorm",
		pp: 10,
		priority: 0,
		flags: {protect: 1, mirror: 1, metronome: 1},
		sideCondition: "sandstormed",
		condition: {
			onSideStart(side) {
				this.add('-sidestart', side, 'move: Sandstorm');
			},
			onResidualOrder: 12,
			onResidual(pokemon) {
				this.damage(this.clampIntRange(Math.floor(pokemon.maxhp / 8), 1), pokemon);
			},
		},
		secondary: null,
		target: "normal",
		type: "Rock",
	},
	skyattack: {
		inherit: true,
		secondary: null,
		critRatio: 1,
	},
	slash: {
		inherit: true,
		critRatio: 3,
	},
	spikes: {
		inherit: true,
		pp: 10,
		type: "Normal",
	},
	spite: {
		inherit: true,
		pp: 5,
	},
	struggle: {
		inherit: true,
		pp: 0,
		recoil: [1, 2],
		struggleRecoil: false,
		ignoreImmunity: false,
	},
	hyperbeam: {
		inherit: true,
		onAfterHit(target, source) {
			if (!target.hp) {
				delete source.volatiles['mustrecharge'];
			} else if (source.volatiles['mustrecharge']) {
				this.add('-mustrecharge', source);
			}
		},
	},
	explosion: {
		inherit: true,
		selfdestruct: null,
	},
	selfdestruct: {
		inherit: true,
		selfdestruct: null,
	},
	sunnyday: {
		inherit: true,
		pp: 10,
		type: "Normal",
	},
	swagger: {
		inherit: true,
		accuracy: 100,
		pp: 10,
	},
	synthesis: {
		inherit: true,
		pp: 10,
		onHit(pokemon) {
			return !!this.heal(Math.floor(pokemon.maxhp / 2));
		},
	},
	thief: {
		inherit: true,
		secondary: null,
	},
	thunder: {
		inherit: true,
		accuracy: 70,
		basePower: 120,
		pp: 10,
		type: "Electric",
		secondary: {"chance":10,"status":"par"},
		onModifyMove() {},
	},
	triattack: {
		inherit: true,
		secondary: null,
	},
	triplekick: {
		inherit: true,
		accuracy: 100,
		basePower: 60,
		multihit: [1,3],
		basePowerCallback(pokemon, target, move) {
			return 60 * move.hit;
		},
	},
	twister: {
		inherit: true,
		basePower: 60,
		pp: 10,
		secondary: null,
	},
	whirlwind: {
		inherit: true,
		accuracy: 85,
		priority: 0,
		forceSwitch: false,
		onTry() {
			return false;
		},
	},
	gigadrain: {
		inherit: true,
		pp: 10,
		drain: null,
	},
	hiddenpower: {
		inherit: true,
		type: "???",
		pp: 10,
	},
	bite: {
		inherit: true,
		type: "Normal",
		category: "Physical",
		secondary: {"chance":10,"volatileStatus":"flinch"},
	},
	sandattack: {
		inherit: true,
		type: "Normal",
	},
	mudslap: {
		inherit: true,
		basePower: 0,
		category: "Status",
		type: "Normal",
		accuracy: 100,
		pp: 10,
		secondary: null,
		boosts: {accuracy: -1},
	},
	dragonbreath: {
		inherit: true,
		basePower: 40,
		pp: 10,
		type: "Dragon",
		secondary: null,
	},
	rollout: {
		inherit: true,
		accuracy: 78,
		pp: 10,
	},
	furycutter: {
		inherit: true,
		accuracy: 100,
		basePower: 25,
		type: "Bug",
		basePowerCallback(pokemon, target, move) {
			const multiplier = pokemon.volatiles['furycutter']?.multiplier || 1;
			return Math.min(25 * multiplier, 65535);
		},
		condition: {
			duration: 2,
			onStart() {
				this.effectState.multiplier = 1;
			},
			onRestart() {
				this.effectState.multiplier *= 2;
				this.effectState.duration = 2;
			},
		},
	},
	poisonsting: {
		inherit: true,
		secondary: {"chance":10,"status":"psn"},
	},
	blizzard: {
		inherit: true,
		accuracy: 90,
		basePower: 120,
		secondary: {"chance":30,"status":"frz"},
	},
	rockthrow: {
		inherit: true,
		accuracy: 65,
	},
	teleport: {
		inherit: true,
		accuracy: 100,
		priority: 0,
		onTry() {
			return false;
		},
	},
	smog: {
		inherit: true,
		secondary: {"chance":0,"status":"psn"},
	},
	dizzypunch: {
		inherit: true,
		secondary: null,
	},
	flamewheel: {
		inherit: true,
		pp: 10,
		secondary: {"chance":0,"status":"brn"},
	},
	snore: {
		inherit: true,
		pp: 10,
		secondary: {chance: 30, volatileStatus: 'confusion'},
	},
	coinhurl: {
		inherit: true,
		accuracy: 100,
		basePower: 40,
		pp: 10,
		category: "Physical",
		type: "Normal",
		secondary: null,
		priority: 0,
		target: "normal",
	},
	machpunch: {
		inherit: true,
		pp: 15,
	},
	scaryface: {
		inherit: true,
		accuracy: 85,
		pp: 40,
		boosts: {def: -2},
	},
	feintattack: {
		inherit: true,
		accuracy: 100,
		pp: 10,
	},
	sweetkiss: {
		inherit: true,
		accuracy: 100,
	},
	sludgebomb: {
		inherit: true,
		secondary: {"chance":null,"status":"psn"},
	},
	octazooka: {
		inherit: true,
		accuracy: 100,
		secondary: {"chance":null,"boosts":{"accuracy":-1}},
	},
	zapcannon: {
		inherit: true,
	},
	perishsong: {
		inherit: true,
		pp: 10,
	},
	synchronize: {
		inherit: true,
		accuracy: 100,
		basePower: 0,
		pp: 10,
		category: "Status",
		type: "Psychic",
		priority: 0,
		target: "normal",
		onHit(target, source) {
			if (!source.setType(target.getTypes(true))) return false;
			this.add('-start', source, 'typechange', source.types.join('/'), '[from] move: Synchronize', `[of] ${target}`);
		},
	},
	detect: {
		num: 197,
		accuracy: 100,
		basePower: 0,
		category: "Status",
		name: "Detect",
		pp: 10,
		priority: 0,
		flags: {protect: 1, mirror: 1, metronome: 1},
		onTryHit(target, source) {
			if (source.volatiles['lockon']) return false;
		},
		onHit(target, source) {
			source.addVolatile('lockon', target);
			this.add('-activate', source, 'move: Detect', '[of] ' + target);
		},
		secondary: null,
		target: "normal",
		type: "Normal",
	},
	bonelock: {
		inherit: true,
		accuracy: 100,
		basePower: 25,
		pp: 10,
		category: "Physical",
		type: "Ground",
		secondary: null,
		priority: 0,
		target: "normal",
	},
	charm: {
		inherit: true,
		accuracy: 85,
		pp: 40,
	},
	falseswipe: {
		inherit: true,
		pp: 20,
	},
	stalker: {
		inherit: true,
		accuracy: 100,
		basePower: 0,
		pp: 10,
		category: "Status",
		type: "Psychic",
		secondary: null,
		priority: 0,
		volatileStatus: "confusion",
		target: "normal",
	},
	steelwing: {
		inherit: true,
		accuracy: 100,
		pp: 10,
		secondary: null,
	},
	painsplit: {
		inherit: true,
		pp: 5,
	},
	sacredfire: {
		inherit: true,
		accuracy: 100,
		basePower: 80,
		pp: 10,
		secondary: null,
	},
	megaphone: {
		inherit: true,
		accuracy: 85,
		basePower: 0,
		pp: 40,
		category: "Status",
		type: "Normal",
		priority: 0,
		target: "normal",
	},
	rapidspin: {
		inherit: true,
		pp: 10,
		self: {
			onHit(pokemon) {
				if (pokemon.removeVolatile('partiallytrapped')) {
					this.add('-end', pokemon, 'partiallytrapped');
				}
				for (const foe of pokemon.foes()) {
					foe.removeVolatile('partialtrappinglock');
				}
			},
		},
	},
	irontail: {
		inherit: true,
		accuracy: 100,
		basePower: 60,
		pp: 10,
		secondary: {"chance":null,"boosts":{"def":-1}},
	},
	rockhead: {
		inherit: true,
		accuracy: 100,
		basePower: 90,
		pp: 10,
		category: "Physical",
		type: "Rock",
		priority: 0,
		target: "normal",
	},
	vitalthrow: {
		inherit: true,
		basePower: 50,
		accuracy: 100,
		priority: 0,
	},
	crosscutter: {
		inherit: true,
		accuracy: 100,
		basePower: 50,
		pp: 10,
		category: "Physical",
		type: "Bug",
		priority: 0,
		target: "normal",
	},
	uproot: {
		inherit: true,
		accuracy: 100,
		basePower: 30,
		pp: 10,
		category: "Physical",
		type: "Normal",
		priority: 0,
		target: "normal",
	},
	windride: {
		inherit: true,
		accuracy: 100,
		basePower: 40,
		pp: 10,
		category: "Physical",
		type: "Flying",
		priority: 0,
		target: "normal",
	},
	watersport: {
		inherit: true,
		accuracy: 100,
		basePower: 30,
		pp: 10,
		category: "Special",
		type: "Water",
		priority: 0,
		target: "normal",
	},
	strongarm: {
		inherit: true,
		accuracy: 100,
		basePower: 30,
		pp: 10,
		category: "Physical",
		type: "Steel",
		priority: 0,
		target: "normal",
	},
	brightmoss: {
		inherit: true,
		accuracy: 100,
		basePower: 0,
		pp: 10,
		priority: 0,
		target: "normal",
	},
	whirlpool: {
		inherit: true,
		accuracy: 100,
		basePower: 30,
		pp: 10,
		category: "Special",
		type: "Water",
		priority: 0,
		volatileStatus: null,
		target: "normal",
	},
	bounce: {
		inherit: true,
		accuracy: 100,
		basePower: 0,
		pp: 10,
		category: "Special",
		type: "Water",
		priority: 0,
		target: "normal",
	},
	clamp: {
		inherit: true,
		accuracy: 75,
		pp: 10,
		volatileStatus: "partiallytrapped",
		self: {volatileStatus: 'partialtrappinglock'},
	},
	firespin: {
		inherit: true,
		accuracy: 70,
		basePower: 15,
		volatileStatus: "partiallytrapped",
		self: {volatileStatus: 'partialtrappinglock'},
	},
	wrap: {
		inherit: true,
		accuracy: 85,
		volatileStatus: "partiallytrapped",
		self: {volatileStatus: 'partialtrappinglock'},
	},
	bind: {
		inherit: true,
		volatileStatus: "partiallytrapped",
		self: {volatileStatus: 'partialtrappinglock'},
	},
	psychic: {
		inherit: true,
		secondary: null,
	},
	twineedle: {
		inherit: true,
		secondary: null,
	},
	spark: {
		inherit: true,
		secondary: {chance: 10, status: 'par'},
	},
	jumpkick: {
		inherit: true,
		hasCrashDamage: false,
		onMoveFail() {},
	},
	highjumpkick: {
		inherit: true,
		hasCrashDamage: false,
		onMoveFail() {},
	},
	bellydrum: {
		num: 187,
		accuracy: true,
		basePower: 0,
		category: "Status",
		name: "Belly Drum",
		pp: 10,
		priority: 0,
		flags: {snatch: 1, metronome: 1},
		boosts: {atk: 1},
		secondary: null,
		target: "self",
		type: "Normal",
	},
	cottonspore: {
		inherit: true,
		accuracy: 100,
		pp: 10,
		boosts: {spe: -1},
	},
	conversion: {
		inherit: true,
		target: "normal",
		onHit(target, source) {
			if (!source.setType(target.getTypes(true))) return false;
			this.add('-start', source, 'typechange', source.types.join('/'), '[from] move: Conversion', `[of] ${target}`);
		},
	},
	frustration: {
		inherit: true,
		pp: 10,
		basePowerCallback(pokemon) {
			const happiness = pokemon.happiness ?? 0;
			return happiness >= 70 ? 30 : 100 - happiness;
		},
	},
	rage: {
		num: 99,
		accuracy: 100,
		basePower: 20,
		category: "Physical",
		name: "Rage",
		pp: 20,
		priority: 0,
		flags: {contact: 1, protect: 1, mirror: 1, metronome: 1},
		secondary: null,
		target: "normal",
		type: "Normal",
	},
	scratch: {
		inherit: true,
		pp: 30,
	},
	mindreader: {
		inherit: true,
		pp: 10,
	},
	return: {
		inherit: true,
		pp: 10,
	},
	magnitude: {
		inherit: true,
		pp: 10,
	},
	batonpass: {
		inherit: true,
		pp: 10,
		self: {volatileStatus: 'swbatonboost'},
	},
	encore: {
		inherit: true,
		pp: 10,
	},
	solarbeam: {
		inherit: true,
		onTryMove(attacker, defender, move) {
			if (attacker.removeVolatile(move.id)) {
				return;
			}
			this.add('-prepare', attacker, move.name);
			if (!this.runEvent('ChargeMove', attacker, defender, move)) {
				return;
			}
			attacker.addVolatile('twoturnmove', defender);
			return null;
		},
		onBasePower() {},
	},
	leechseed: {
		inherit: true,
		onTryImmunity(target) {
			return !(target.hp % 256 === 22 || Math.floor(target.hp / 256) === 22);
		},
	},
	haze: {
		inherit: true,
		target: "normal",
		onHit(target, source) {
			this.add('-activate', source, 'move: Haze');
			for (const pokemon of [source, target]) {
				pokemon.clearBoosts();
				this.add('-clearboost', pokemon);
				for (const vol of ['confusion', 'disable', 'mist', 'focusenergy', 'leechseed', 'swreflect']) {
					pokemon.removeVolatile(vol);
				}
			}
			if (target.status) target.cureStatus();
			if (source.status === 'tox') {
				source.setStatus('psn');
			}
		},
	},
	reflect: {
		num: 115,
		accuracy: true,
		basePower: 0,
		category: "Status",
		name: "Reflect",
		pp: 20,
		priority: 0,
		flags: {snatch: 1, metronome: 1},
		volatileStatus: 'swreflect',
		onTryHit(pokemon) {
			if (pokemon.volatiles['swreflect']) return false;
		},
		secondary: null,
		target: "self",
		type: "Psychic",
	},
	lightscreen: {
		num: 113,
		accuracy: true,
		basePower: 0,
		category: "Status",
		name: "Light Screen",
		pp: 30,
		priority: 0,
		flags: {snatch: 1, metronome: 1},
		volatileStatus: 'swreflect',
		onTryHit(pokemon) {
			if (pokemon.volatiles['swreflect']) return false;
		},
		secondary: null,
		target: "self",
		type: "Psychic",
	},
	substitute: {
		inherit: true,
		onTryHit(target) {
			const cost = Math.floor(target.maxhp / 4);
			if (target.volatiles['substitute']) {
				this.add('-fail', target, 'move: Substitute');
				return this.NOT_FAIL;
			}
			if (target.hp < cost || target.maxhp === 1) {
				this.add('-fail', target, 'move: Substitute', '[weak]');
				return this.NOT_FAIL;
			}
		},
		condition: {
			onStart(target) {
				this.add('-start', target, 'Substitute');
				this.effectState.hp = Math.floor(target.maxhp / 4);
				delete target.volatiles['partiallytrapped'];
			},
			onTryPrimaryHit(target, source, move) {
				if (target === source || move.flags['bypasssub'] || move.infiltrates) {
					return;
				}
				if (move.category === 'Status') {
					const blockedStatus = !!move.status && move.status !== 'par';
					const blockedOther = (!!move.boosts && !move.secondaries) || move.volatileStatus === 'confusion' ||
						['lockon', 'mindreader', 'nightmare', 'detect'].includes(move.id);
					if (blockedStatus || blockedOther) {
						this.add('-fail', source);
						this.attrLastMove('[still]');
						return null;
					}
					return;
				}
				let damage = this.actions.getDamage(source, target, move);
				if (!damage && damage !== 0) {
					this.add('-fail', source);
					this.attrLastMove('[still]');
					return null;
				}
				damage = this.runEvent('SubDamage', target, source, move, damage);
				if (!damage) {
					return damage;
				}
				if (damage > target.volatiles['substitute'].hp) {
					damage = target.volatiles['substitute'].hp as number;
				}
				target.volatiles['substitute'].hp -= damage;
				source.lastDamage = damage;
				if (target.volatiles['substitute'].hp <= 0) {
					target.removeVolatile('substitute');
				} else {
					this.add('-activate', target, 'move: Substitute', '[damage]');
				}
				if (move.recoil) {
					this.damage(this.actions.calcRecoilDamage(damage, move, source), source, target, 'recoil');
				}
				if (move.drain) {
					this.heal(Math.ceil(damage * move.drain[0] / move.drain[1]), source, target, 'drain');
				}
				this.singleEvent('AfterSubDamage', move, null, target, source, move, damage);
				this.runEvent('AfterSubDamage', target, source, move, damage);
				return this.HIT_SUBSTITUTE;
			},
			onEnd(target) {
				this.add('-end', target, 'Substitute');
			},
		},
	},
	fly: {
		inherit: true,
		condition: {
			duration: 2,
			onInvulnerability(target, source, move) {
				if (['whirlwind', 'thunder', 'swift'].includes(move.id)) {
					return;
				}
				if (source.volatiles['lockon'] && target === source.volatiles['lockon'].source) {
					return;
				}
				return false;
			},
		},
	},
	dig: {
		inherit: true,
		condition: {
			duration: 2,
			onInvulnerability(target, source, move) {
				if (['earthquake', 'fissure', 'swift'].includes(move.id)) {
					return;
				}
				if (source.volatiles['lockon'] && target === source.volatiles['lockon'].source) {
					return;
				}
				return false;
			},
		},
	},
	naildown: {
		inherit: true,
		isNonstandard: null,
	},
	bellchime: {
		inherit: true,
		isNonstandard: null,
	},
	tempt: {
		inherit: true,
		isNonstandard: null,
	},
	aeroblast: {
		inherit: true,
		isNonstandard: "Future",
	},
	ancientpower: {
		inherit: true,
		isNonstandard: "Future",
	},
	beatup: {
		inherit: true,
		isNonstandard: "Future",
	},
	bonerush: {
		inherit: true,
		isNonstandard: "Future",
	},
	crosschop: {
		inherit: true,
		isNonstandard: "Future",
	},
	crunch: {
		inherit: true,
		isNonstandard: "Future",
	},
	curse: {
		inherit: true,
		isNonstandard: "Future",
	},
	extremespeed: {
		inherit: true,
		isNonstandard: "Future",
	},
	futuresight: {
		inherit: true,
		isNonstandard: "Future",
	},
	healbell: {
		inherit: true,
		isNonstandard: "Future",
	},
	icywind: {
		inherit: true,
		isNonstandard: "Future",
	},
	meanlook: {
		inherit: true,
		isNonstandard: "Future",
	},
	megahorn: {
		inherit: true,
		isNonstandard: "Future",
	},
	metalclaw: {
		inherit: true,
		isNonstandard: "Future",
	},
	mirrorcoat: {
		inherit: true,
		isNonstandard: "Future",
	},
	psychup: {
		inherit: true,
		isNonstandard: "Future",
	},
	rocksmash: {
		inherit: true,
		isNonstandard: "Future",
	},
	shadowball: {
		inherit: true,
		isNonstandard: "Future",
	},
	sweetscent: {
		inherit: true,
		isNonstandard: "Future",
	},
};
