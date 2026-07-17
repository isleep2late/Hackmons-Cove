const PHNN_SHADOW_MOVE_IDS = ['shadowrush', 'shadowblast', 'shadowblitz', 'shadowbreak', 'shadowend', 'shadowbolt', 'shadowchill', 'shadowfire', 'shadowstorm', 'shadowwave', 'shadowrave', 'shadowdown', 'shadowmist', 'shadowpanic', 'shadowhold', 'shadowhalf', 'shadowshed', 'shadowsky'];
function phnnIsShadowMon(target: any): boolean {
	if (!target) return false;
	if (target.hasType('Shadow')) return true;
	return target.moveSlots.some((s: any) => PHNN_SHADOW_MOVE_IDS.includes(s.id));
}

export const Conditions: import('../../../sim/dex-conditions').ModdedConditionDataTable = {

// Status
	
	brn: {
		inherit: true,
		onResidual(pokemon) {
			this.damage(pokemon.baseMaxhp / 8);
		},
	},
	slp: {
		inherit: true,
		onStart(target, source, sourceEffect) {
			if (sourceEffect && sourceEffect.effectType === 'Ability') {
				this.add('-status', target, 'slp', '[from] ability: ' + sourceEffect.name, `[of] ${source}`);
			} else if (sourceEffect && sourceEffect.effectType === 'Move') {
				this.add('-status', target, 'slp', `[from] move: ${sourceEffect.name}`);
			} else {
				this.add('-status', target, 'slp');
			}
			this.effectState.startTime = this.random(2, 9);
			this.effectState.time = this.effectState.startTime;

			if (target.removeVolatile('nightmare')) {
				this.add('-end', target, 'Nightmare', '[silent]');
			}
		},
	},
	confusion: {
		inherit: true,
		onBeforeMove(pokemon, target, move) {
			pokemon.volatiles['confusion'].time--;
			if (!pokemon.volatiles['confusion'].time) {
				pokemon.removeVolatile('confusion');
				return;
			}
			this.add('-activate', pokemon, 'confusion');
			if (this.randomChance(1, 2)) {
				return;
			}
			const damage = this.actions.getConfusionDamage(pokemon, 40);
			if (typeof damage !== 'number') throw new Error("CONFUSION returned NaN");
			this.damage(damage, pokemon, pokemon, {
				id: 'confused',
				effectType: 'Move',
				type: '???',
			} as ActiveMove);
			return false;
		},
	},
	par: {
		inherit: true,
		onModifySpe(spe, pokemon) {
			// Paralysis occurs after all other Speed modifiers, so evaluate all modifiers up to this point first
			spe = this.finalModify(spe);
			if (!pokemon.hasAbility('quickfeet')) {
				spe = Math.floor(spe * 25 / 100);
			}
			return spe;
		},
    	onBeforeMove(pokemon, target, move) {
			if (!pokemon.hasAbility('magicguard') && this.randomChance(1, 4)) {
				this.add('cant', pokemon, 'par');
				return false;
			}
		},
	},
	frz: {
		inherit: true,
		onBeforeMove(pokemon, target, move) {
			if (move.flags['defrost']) {
				pokemon.cureStatus();
				return;
			}
			this.add('cant', pokemon, 'frz');
			return false;
		},
		onModifyMove(move, pokemon) {
			if (move.flags['defrost']) {
				pokemon.cureStatus();
			}
		},
		onHit(target, source, move) {
			if (move.type === 'Fire' && move.category !== 'Status') {
				target.cureStatus();
			}
		},
	},
	
	// Weather
	
	hail: {
		inherit: true,
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.effectState.duration = 0;
				this.add('-weather', 'Hail', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-weather', 'Hail');
			}
		},
	},
	raindance: {
		inherit: true,
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.effectState.duration = 0;
				this.add('-weather', 'RainDance', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-weather', 'RainDance');
			}
		},
	},
	sunnyday: {
		inherit: true,
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.effectState.duration = 0;
				this.add('-weather', 'SunnyDay', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-weather', 'SunnyDay');
			}
		},
	},
	arceus: {
		inherit: true,
		onStart(pokemon) {
			delete (pokemon as any).m.legendplateType;
		},
		onType(types, pokemon) {
			if (pokemon.transformed || pokemon.ability !== 'multitype' && this.gen >= 8) return types;
			if (pokemon.getItem().id === 'legendplate') {
				return (pokemon as any).m.legendplateType || ['Normal'];
			}
			let type: string | undefined = 'Normal';
			if (pokemon.ability === 'multitype') {
				type = pokemon.getItem().onPlate;
				if (!type) {
					type = 'Normal';
				}
			}
			return [type];
		},
	},
	sandstorm: {
		inherit: true,
		duration: 0,
		durationCallback: undefined,
		onWeather(target) {
			this.damage(target.baseMaxhp / 8);
		},
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.effectState.duration = 0;
				this.add('-weather', 'Sandstorm', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-weather', 'Sandstorm');
			}
		},
	},
	snowscape: {
		inherit: true,
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.effectState.duration = 0;
				this.add('-weather', 'Snowscape', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-weather', 'Snowscape');
			}
		},
	},
	partiallytrapped: {
		inherit: true,
		onBeforeMovePriority: 11,
		onBeforeMove(pokemon) {
			this.add('cant', pokemon, 'partiallytrapped');
			return false;
		},
	},
	shadowsky: {
		name: 'Shadow Sky',
		effectType: 'Weather',
		duration: 5,
		onFieldStart(field, source, effect) {
			this.add('-weather', 'Shadow Sky');
		},
		onWeatherModifyDamage(damage, attacker, defender, move) {
			if (move.type === 'Shadow') {
				return this.chainModify(1.5);
			}
		},
		onFieldResidualOrder: 1,
		onFieldResidual() {
			this.add('-weather', 'Shadow Sky', '[upkeep]');
			if (this.field.isWeather('shadowsky')) this.eachEvent('Weather');
		},
		onWeather(target) {
			if (!phnnIsShadowMon(target)) {
				this.damage(target.baseMaxhp / 16);
			}
		},
		onFieldEnd() {
			this.add('-weather', 'none');
		},
	},
	wildmight: {
		name: 'Wild Might',
		// Passable through Baton Pass (a banned-in-standard mechanic): the
		// incoming Pokemon inherits Wild Might along with the stat boosts.
		onStart(pokemon) {
			this.add('-start', pokemon, 'Wild Might');
			this.add('-message', `${pokemon.name} is filled with Wild Might!`);
		},
		onModifyAtkPriority: 5,
		onModifyAtk() {
			return this.chainModify(2);
		},
		onModifyDefPriority: 5,
		onModifyDef() {
			return this.chainModify(2);
		},
		onModifySpAPriority: 5,
		onModifySpA() {
			return this.chainModify(2);
		},
		onModifySpDPriority: 5,
		onModifySpD() {
			return this.chainModify(2);
		},
		onEnd(pokemon) {
			this.add('-end', pokemon, 'Wild Might');
		},
	},
	flinch: {
		inherit: true,
		onBeforeMove(pokemon, target, move) {
			this.add('cant', pokemon, 'flinch');
			this.runEvent('Flinch', pokemon);
			return false;
		},
	},
};
