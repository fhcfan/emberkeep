// The world: the keeper, the shadow wisps, the embers, the waves.
// One fixed-step update; render.js only reads state, never changes it.
import { COMBO, EMBER, FIELD, LIGHT, PLAYER, SCORE, STEP, WAVE, WISP } from './config.js';
import { pickEdgePoint, range } from './random.js';

export const EVENT_PULSE = 1;
export const EVENT_KILL = 2;
export const EVENT_PICKUP = 4;
export const EVENT_HIT = 8;
export const EVENT_OVER = 16;
export const EVENT_WAVE_CLEAR = 32;

const KIND_WISP = 'wisp';
const KIND_DART = 'dart';

function waveCount(wave) {
  return WAVE.baseCount + WAVE.perWave * wave;
}

function spawnInterval(wave) {
  return Math.max(WAVE.spawnIntervalMin, WAVE.spawnIntervalStart - WAVE.spawnIntervalPerWave * wave);
}

export function createWorld(random) {
  const state = freshState();

  function freshState() {
    return {
      time: 0,
      score: 0,
      wave: 1,
      hearts: PLAYER.hearts,
      light: LIGHT.max,
      combo: 0,
      comboTimer: 0,
      player: {
        x: PLAYER.startX,
        y: PLAYER.startY,
        invulnerable: 0,
        pulseCooldown: 0,
        pulseAnim: 0,
      },
      wisps: [],
      embers: [],
      particles: [],
      floaters: [],
      toSpawn: 0,
      spawnTimer: 0,
      emberTimer: 1.2,
      banner: 0,
      bannerText: '',
      shake: 0,
      flash: 0,
      over: false,
    };
  }

  function startWave(wave) {
    state.toSpawn = waveCount(wave);
    state.spawnTimer = 0.6;
  }

  function spawnWisp() {
    const point = pickEdgePoint(random, FIELD.width, FIELD.height, 24);
    const dart = state.wave >= WISP.dartFromWave && random() < WISP.dartChance;
    const speed = (WISP.baseSpeed + WISP.speedPerWave * state.wave) * (dart ? WISP.dartSpeedMultiplier : 1);
    state.wisps.push({
      kind: dart ? KIND_DART : KIND_WISP,
      x: point.x,
      y: point.y,
      speed: range(random, speed * 0.9, speed * 1.1),
      radius: dart ? 11 : range(random, 13, 18),
      wobblePhase: random() * Math.PI * 2,
      wobbleSpeed: range(random, 1.2, 2.4),
    });
  }

  function spawnEmber() {
    if (state.embers.length >= EMBER.maxOnField) return;
    state.embers.push({
      x: range(random, 50, FIELD.width - 50),
      y: range(random, 70, FIELD.height - 50),
      phase: random() * Math.PI * 2,
    });
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const angle = random() * Math.PI * 2;
      const velocity = range(random, speed * 0.3, speed);
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: range(random, 0.35, 0.7),
        maxLife: 0.7,
        color,
        size: range(random, 2, 4.5),
      });
    }
  }

  function floatText(x, y, text, color) {
    state.floaters.push({ x, y, text, color, life: 0.9 });
  }

  function multiplier() {
    return Math.min(COMBO.maxMultiplier, Math.max(1, state.combo));
  }

  function addScore(base, x, y) {
    const gained = base * multiplier();
    state.score += gained;
    floatText(x, y, `+${gained}`, '#ffd98a');
    return gained;
  }

  function doPulse() {
    const player = state.player;
    if (player.pulseCooldown > 0 || state.light < LIGHT.pulseCost) return 0;
    state.light -= LIGHT.pulseCost;
    player.pulseCooldown = LIGHT.pulseCooldown;
    player.pulseAnim = 1;
    let events = EVENT_PULSE;
    const radius = LIGHT.pulseRadius;
    for (let i = state.wisps.length - 1; i >= 0; i -= 1) {
      const wisp = state.wisps[i];
      const dx = wisp.x - player.x;
      const dy = wisp.y - player.y;
      if (Math.hypot(dx, dy) <= radius + wisp.radius) {
        burst(wisp.x, wisp.y, '#b18cff', 14, 190);
        addScore(SCORE.kill, wisp.x, wisp.y);
        state.wisps.splice(i, 1);
        state.combo += 1;
        state.comboTimer = COMBO.windowSeconds;
        events |= EVENT_KILL;
      }
    }
    return events;
  }

  function hitPlayer(wisp) {
    const player = state.player;
    state.hearts -= 1;
    player.invulnerable = PLAYER.invulnerableSeconds;
    state.shake = 9;
    state.flash = 0.55;
    state.combo = 0;
    state.comboTimer = 0;
    burst(player.x, player.y, '#ff5d73', 18, 220);
    // The wisp that struck burns out on the lantern's light.
    const index = state.wisps.indexOf(wisp);
    if (index >= 0) state.wisps.splice(index, 1);
    if (state.hearts <= 0) {
      state.over = true;
      return EVENT_HIT | EVENT_OVER;
    }
    return EVENT_HIT;
  }

  return {
    state,
    reset() {
      const next = freshState();
      for (const key of Object.keys(next)) state[key] = next[key];
      startWave(1);
      spawnEmber();
      spawnEmber();
    },
    /**
     * Advance the world one fixed step. `move` is a normalised {x, y};
     * `pulse` asks for a light pulse; `ambient` drifts the scene for the
     * title screen with no spawning, no damage and no scoring.
     */
    step(dt, move, pulse, ambient) {
      state.time += dt;
      const player = state.player;
      player.pulseCooldown = Math.max(0, player.pulseCooldown - dt);
      player.pulseAnim = Math.max(0, player.pulseAnim - dt / 0.35);
      player.invulnerable = Math.max(0, player.invulnerable - dt);
      state.shake = Math.max(0, state.shake - dt * 26);
      state.flash = Math.max(0, state.flash - dt * 1.8);
      state.banner = Math.max(0, state.banner - dt);

      // Particles and floating score text always age.
      for (let i = state.particles.length - 1; i >= 0; i -= 1) {
        const particle = state.particles[i];
        particle.life -= dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vx *= 1 - 2.2 * dt;
        particle.vy *= 1 - 2.2 * dt;
        if (particle.life <= 0) state.particles.splice(i, 1);
      }
      for (let i = state.floaters.length - 1; i >= 0; i -= 1) {
        const floater = state.floaters[i];
        floater.life -= dt;
        floater.y -= 34 * dt;
        if (floater.life <= 0) state.floaters.splice(i, 1);
      }

      if (ambient) {
        for (const wisp of state.wisps) {
          wisp.wobblePhase += dt * wisp.wobbleSpeed;
          wisp.x += Math.cos(wisp.wobblePhase) * 12 * dt;
          wisp.y += Math.sin(wisp.wobblePhase * 0.7) * 10 * dt;
        }
        return 0;
      }
      if (state.over) return 0;

      // The keeper moves; the lantern burns down as they walk.
      player.x = Math.min(FIELD.width - 24, Math.max(24, player.x + move.x * PLAYER.speed * dt));
      player.y = Math.min(FIELD.height - 24, Math.max(24, player.y + move.y * PLAYER.speed * dt));
      state.light = Math.min(LIGHT.max, Math.max(0, state.light - LIGHT.drainPerSecond * dt + LIGHT.regenPerSecond * dt * 0.4));

      let events = 0;
      if (pulse) events |= doPulse();

      // Spawning: wisps arrive over the wave, embers drift in steadily.
      if (state.toSpawn > 0) {
        state.spawnTimer -= dt;
        if (state.spawnTimer <= 0) {
          spawnWisp();
          state.toSpawn -= 1;
          state.spawnTimer = spawnInterval(state.wave);
        }
      }
      state.emberTimer -= dt;
      if (state.emberTimer <= 0) {
        spawnEmber();
        state.emberTimer = EMBER.spawnEverySeconds;
      }

      // Combo fades when the keeper stops scoring.
      if (state.comboTimer > 0) {
        state.comboTimer -= dt;
        if (state.comboTimer <= 0) state.combo = 0;
      }

      // Wisps hunt the lantern with a wobble.
      for (const wisp of state.wisps) {
        wisp.wobblePhase += dt * wisp.wobbleSpeed;
        const dx = player.x - wisp.x;
        const dy = player.y - wisp.y;
        const distance = Math.hypot(dx, dy) || 1;
        const wobble = Math.sin(wisp.wobblePhase) * WISP.wobble;
        const nx = dx / distance;
        const ny = dy / distance;
        wisp.x += (nx * wisp.speed + -ny * wobble * 30) * dt;
        wisp.y += (ny * wisp.speed + nx * wobble * 30) * dt;
      }

      // A wisp that reaches the keeper costs a heart.
      if (player.invulnerable <= 0) {
        for (const wisp of [...state.wisps]) {
          if (Math.hypot(wisp.x - player.x, wisp.y - player.y) <= wisp.radius + PLAYER.radius - 2) {
            events |= hitPlayer(wisp);
            if (state.over) return events;
            break;
          }
        }
      }

      // Embers: light and score, with a rising combo.
      for (let i = state.embers.length - 1; i >= 0; i -= 1) {
        const ember = state.embers[i];
        if (Math.hypot(ember.x - player.x, ember.y - player.y) <= EMBER.collectRadius) {
          state.embers.splice(i, 1);
          state.light = Math.min(LIGHT.max, state.light + LIGHT.emberRestore);
          state.combo += 1;
          state.comboTimer = COMBO.windowSeconds;
          burst(ember.x, ember.y, '#ffbf3f', 10, 140);
          addScore(EMBER.score, ember.x, ember.y);
          events |= EVENT_PICKUP;
        }
      }

      // The wave is clear when every wisp is gone.
      if (state.toSpawn === 0 && state.wisps.length === 0) {
        const bonus = WAVE.clearBonusPerWave * state.wave;
        state.score += bonus;
        state.hearts = Math.min(PLAYER.hearts, state.hearts + 1);
        state.bannerText = `Wave ${state.wave} clear!  +${bonus}`;
        state.banner = WAVE.bannerSeconds;
        state.wave += 1;
        startWave(state.wave);
        events |= EVENT_WAVE_CLEAR;
      }

      return events;
    },
    lightRadius() {
      return LIGHT.minRadius + (LIGHT.maxRadius - LIGHT.minRadius) * (state.light / LIGHT.max);
    },
  };
}
