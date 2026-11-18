// Every pixel the game draws. The renderer only reads world state; it never
// changes it. Screens: title, play, paused, game over.
import { FIELD } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const GOLD = '#ffd98a';
const GOLD_DIM = '#c9a35a';

function mulberry32(seed) {
  let value = seed >>> 0;
  return function next() {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = FIELD.width * dpr;
  canvas.height = FIELD.height * dpr;
  ctx.scale(dpr, dpr);

  const stars = [];
  const starRandom = mulberry32(20261117);
  for (let i = 0; i < 110; i += 1) {
    stars.push({
      x: starRandom() * FIELD.width,
      y: starRandom() * FIELD.height * 0.75,
      radius: 0.5 + starRandom() * 1.3,
      phase: starRandom() * Math.PI * 2,
    });
  }
  const fireflies = [];
  for (let i = 0; i < 14; i += 1) {
    fireflies.push({
      x: starRandom() * FIELD.width,
      y: starRandom() * FIELD.height,
      phase: starRandom() * Math.PI * 2,
      speed: 0.25 + starRandom() * 0.5,
    });
  }

  function fit() {
    const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
    canvas.style.width = `${Math.floor(FIELD.width * scale)}px`;
    canvas.style.height = `${Math.floor(FIELD.height * scale)}px`;
  }
  window.addEventListener('resize', fit);
  fit();

  function drawBackground(time) {
    const gradient = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, '#0a0d1f');
    gradient.addColorStop(0.6, '#10142e');
    gradient.addColorStop(1, '#171233');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);

    // Twinkling stars.
    for (const star of stars) {
      const alpha = 0.35 + 0.35 * Math.sin(time * 1.4 + star.phase);
      ctx.globalAlpha = Math.max(0.1, alpha);
      ctx.fillStyle = '#cdd6ff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Drifting fireflies.
    for (const fly of fireflies) {
      const x = fly.x + Math.sin(time * fly.speed + fly.phase) * 26;
      const y = fly.y + Math.cos(time * fly.speed * 0.8 + fly.phase) * 18;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, 9);
      glow.addColorStop(0, 'rgba(255, 214, 130, 0.85)');
      glow.addColorStop(1, 'rgba(255, 214, 130, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fill();
    }

    // Faint garden stones along the bottom.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.045)';
    for (let x = 30; x < FIELD.width; x += 90) {
      ctx.beginPath();
      ctx.ellipse(x, FIELD.height - 26, 34, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawEmber(ember, time) {
    const pulse = 1 + 0.18 * Math.sin(time * 3 + ember.phase);
    const halo = ctx.createRadialGradient(ember.x, ember.y, 0, ember.x, ember.y, 26 * pulse);
    halo.addColorStop(0, 'rgba(255, 191, 63, 0.55)');
    halo.addColorStop(1, 'rgba(255, 191, 63, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(ember.x, ember.y, 26 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffbf3f';
    ctx.beginPath();
    ctx.arc(ember.x, ember.y, 8 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(ember.x - 2, ember.y - 2, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawWisp(wisp, player, time) {
    const dart = wisp.kind === 'dart';
    const wobble = 1 + 0.08 * Math.sin(time * 5 + wisp.wobblePhase);
    const radius = wisp.radius * wobble;
    const body = ctx.createRadialGradient(wisp.x, wisp.y, radius * 0.2, wisp.x, wisp.y, radius);
    body.addColorStop(0, dart ? '#3a1040' : '#241640');
    body.addColorStop(1, '#0d0716');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(wisp.x, wisp.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = dart ? '#ff5dd2' : '#7b5cff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(wisp.x, wisp.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    // Two eyes, always watching the keeper.
    const angle = Math.atan2(player.y - wisp.y, player.x - wisp.x);
    const eyeX = Math.cos(angle) * radius * 0.35;
    const eyeY = Math.sin(angle) * radius * 0.35;
    const spread = radius * 0.34;
    ctx.fillStyle = dart ? '#ffd166' : '#c9a7ff';
    for (const side of [-1, 1]) {
      const ex = wisp.x + eyeX + Math.cos(angle + Math.PI / 2) * spread * side;
      const ey = wisp.y + eyeY + Math.sin(angle + Math.PI / 2) * spread * side;
      ctx.beginPath();
      ctx.arc(ex, ey, dart ? 2.6 : 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPlayer(player, lightRadius, time) {
    const blink = player.invulnerable > 0 && Math.floor(time * 12) % 2 === 0;
    ctx.save();
    if (blink) ctx.globalAlpha = 0.35;
    // The lantern's glow on the ground.
    const glow = ctx.createRadialGradient(player.x, player.y, 6, player.x, player.y, lightRadius * 0.75);
    glow.addColorStop(0, 'rgba(255, 196, 110, 0.5)');
    glow.addColorStop(1, 'rgba(255, 196, 110, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(player.x, player.y, lightRadius * 0.75, 0, Math.PI * 2);
    ctx.fill();
    // The keeper: a little hooded figure holding the lantern.
    ctx.fillStyle = '#2c2118';
    ctx.beginPath();
    ctx.arc(player.x, player.y + 2, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a3423';
    ctx.beginPath();
    ctx.moveTo(player.x - 11, player.y + 4);
    ctx.quadraticCurveTo(player.x, player.y - 20, player.x + 11, player.y + 4);
    ctx.closePath();
    ctx.fill();
    // The lantern itself, warm and bright.
    const core = ctx.createRadialGradient(player.x, player.y - 2, 1, player.x, player.y - 2, 11);
    core.addColorStop(0, '#fff6d8');
    core.addColorStop(0.55, '#ffd98a');
    core.addColorStop(1, '#e08a2e');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(player.x, player.y - 2, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7a5a28';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(player.x, player.y - 2, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawPulseRing(player, time) {
    if (player.pulseAnim <= 0) return;
    const progress = 1 - player.pulseAnim;
    const radius = 30 + progress * 155;
    ctx.save();
    ctx.globalAlpha = player.pulseAnim * 0.9;
    ctx.strokeStyle = '#ffd98a';
    ctx.lineWidth = 5 * player.pulseAnim + 1;
    ctx.beginPath();
    ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = player.pulseAnim * 0.35;
    ctx.strokeStyle = '#fff3c4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, radius * 0.85, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawParticles(state) {
    for (const particle of state.particles) {
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawFloaters(state) {
    ctx.textAlign = 'center';
    ctx.font = '700 17px system-ui, sans-serif';
    for (const floater of state.floaters) {
      ctx.globalAlpha = Math.max(0, floater.life / 0.9);
      ctx.fillStyle = floater.color;
      ctx.fillText(floater.text, floater.x, floater.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawDarkness(player, lightRadius) {
    const gradient = ctx.createRadialGradient(player.x, player.y, lightRadius * 0.55, player.x, player.y, lightRadius * 1.9);
    gradient.addColorStop(0, 'rgba(4, 6, 16, 0)');
    gradient.addColorStop(1, 'rgba(4, 6, 16, 0.62)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function heartPath(x, y, size) {
    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.9);
    ctx.bezierCurveTo(x - size * 1.3, y, x - size * 0.6, y - size, x, y - size * 0.25);
    ctx.bezierCurveTo(x + size * 0.6, y - size, x + size * 1.3, y, x, y + size * 0.9);
    ctx.closePath();
  }

  function drawHud(state, view) {
    const player = state.player;
    // Hearts, top left.
    for (let i = 0; i < 3; i += 1) {
      const x = 34 + i * 30;
      const y = 30;
      ctx.fillStyle = i < state.hearts ? '#ff5d73' : 'rgba(255, 255, 255, 0.18)';
      heartPath(x, y, 9);
      ctx.fill();
    }
    // Light bar, top centre.
    const barWidth = 220;
    const barX = FIELD.width / 2 - barWidth / 2;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.beginPath();
    ctx.roundRect(barX, 22, barWidth, 12, 6);
    ctx.fill();
    const lightGradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    lightGradient.addColorStop(0, '#ffb347');
    lightGradient.addColorStop(1, '#ffe9a8');
    ctx.fillStyle = lightGradient;
    ctx.beginPath();
    ctx.roundRect(barX, 22, Math.max(12, barWidth * (state.light / 100)), 12, 6);
    ctx.fill();
    ctx.fillStyle = '#e8ecff';
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('L I G H T', FIELD.width / 2, 50);
    // Score and wave, top right.
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 26px system-ui, sans-serif';
    ctx.fillText(String(state.score), FIELD.width - 28, 36);
    ctx.fillStyle = '#b9c2e8';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText(`WAVE ${state.wave}`, FIELD.width - 28, 56);
    if (state.combo >= 2) {
      ctx.fillStyle = '#ffd98a';
      ctx.font = '700 15px system-ui, sans-serif';
      ctx.fillText(`COMBO x${Math.min(5, state.combo)}`, FIELD.width - 28, 78);
    }
    // Controls hint, bottom.
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(232, 236, 255, 0.5)';
    ctx.font = '500 12px system-ui, sans-serif';
    ctx.fillText('WASD / arrows to move · Space / click to pulse · P pause · M mute', FIELD.width / 2, FIELD.height - 14);
    if (view.muted) {
      ctx.fillStyle = 'rgba(232, 236, 255, 0.75)';
      ctx.textAlign = 'left';
      ctx.fillText('muted', 24, FIELD.height - 14);
    }
  }

  function drawBanner(state) {
    if (state.banner <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, state.banner);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd98a';
    ctx.font = '700 34px Georgia, serif';
    ctx.fillText(state.bannerText, FIELD.width / 2, 132);
    ctx.restore();
  }

  function dim() {
    ctx.fillStyle = 'rgba(5, 7, 18, 0.62)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function drawTitle(state, best) {
    dim();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd98a';
    ctx.font = '700 76px Georgia, serif';
    ctx.fillText('EMBERKEEP', FIELD.width / 2, 208);
    ctx.fillStyle = '#e8ecff';
    ctx.font = '400 21px Georgia, serif';
    ctx.fillText('a lantern-keeper\u2019s night', FIELD.width / 2, 248);
    ctx.fillStyle = '#b9c2e8';
    ctx.font = '400 16px system-ui, sans-serif';
    ctx.fillText('Shadow wisps hunt your light. Pulse them back, gather embers,', FIELD.width / 2, 312);
    ctx.fillText('and keep the lantern burning through the night.', FIELD.width / 2, 336);
    ctx.fillStyle = '#ffd98a';
    ctx.font = '600 17px system-ui, sans-serif';
    const blink = Math.floor(state.time * 1.6) % 2 === 0;
    ctx.globalAlpha = blink ? 1 : 0.35;
    ctx.fillText('Press Enter or click to begin', FIELD.width / 2, 396);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#b9c2e8';
    ctx.font = '500 14px system-ui, sans-serif';
    ctx.fillText('WASD / arrows move · Space / click pulses the light · 3 hearts', FIELD.width / 2, 436);
    if (best > 0) {
      ctx.fillStyle = '#e8ecff';
      ctx.font = '600 15px system-ui, sans-serif';
      ctx.fillText(`Best score  ${best}`, FIELD.width / 2, 474);
    }
  }

  function drawPaused() {
    dim();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 44px Georgia, serif';
    ctx.fillText('Paused', FIELD.width / 2, 280);
    ctx.fillStyle = '#b9c2e8';
    ctx.font = '400 16px system-ui, sans-serif';
    ctx.fillText('Press P or click to keep playing', FIELD.width / 2, 318);
  }

  function drawOver(state, best) {
    dim();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff9db0';
    ctx.font = '700 52px Georgia, serif';
    ctx.fillText('The light fades\u2026', FIELD.width / 2, 216);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 34px system-ui, sans-serif';
    ctx.fillText(`Score  ${state.score}`, FIELD.width / 2, 282);
    ctx.fillStyle = '#b9c2e8';
    ctx.font = '400 17px system-ui, sans-serif';
    ctx.fillText(`You reached wave ${state.wave}  ·  Best ${Math.max(best, state.score)}`, FIELD.width / 2, 318);
    const blink = Math.floor(state.time * 1.6) % 2 === 0;
    ctx.globalAlpha = blink ? 1 : 0.35;
    ctx.fillStyle = '#ffd98a';
    ctx.font = '600 17px system-ui, sans-serif';
    ctx.fillText('Press R or click to play again', FIELD.width / 2, 372);
    ctx.globalAlpha = 1;
  }

  return {
    draw(state, screen, best, view) {
      const time = state.time;
      const lightRadius = view.lightRadius;
      ctx.save();
      if (state.shake > 0.2) {
        ctx.translate(Math.sin(time * 97) * state.shake * 0.5, Math.cos(time * 89) * state.shake * 0.5);
      }
      drawBackground(time);
      for (const ember of state.embers) drawEmber(ember, time);
      for (const wisp of state.wisps) drawWisp(wisp, state.player, time);
      drawPlayer(state.player, lightRadius, time);
      drawPulseRing(state.player, time);
      drawParticles(state);
      drawFloaters(state);
      drawDarkness(state.player, lightRadius);
      ctx.restore();

      if (state.flash > 0) {
        ctx.fillStyle = `rgba(255, 60, 80, ${state.flash * 0.22})`;
        ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      }

      if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(state, view);
      drawBanner(state);
      if (screen === SCREEN_TITLE) drawTitle(state, best);
      else if (screen === SCREEN_PAUSED) drawPaused();
      else if (screen === SCREEN_OVER) drawOver(state, best);
    },
  };
}
