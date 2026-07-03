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
	confusion: {
		inherit: true,
		onBeforeMove(pokemon) {
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
    	onBeforeMove(pokemon) {
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
	sandstorm: {
		inherit: true,
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
};
