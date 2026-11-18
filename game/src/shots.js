// The screenshot scenes behind ?shot=title|play|over. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot, so the frame is what a short game really looks like and
// the same seed always gives the same frame.
import { STEP } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const TITLE_SECONDS = 5;
const PLAY_SECONDS = 24;
const END_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;

/** Steer toward the nearest ember; pulse when a wisp closes in. */
function autopilot(state, canPulse, flee) {
  const player = state.player;
  let ember = null;
  let emberDistance = Infinity;
  for (const item of state.embers) {
    const distance = Math.hypot(item.x - player.x, item.y - player.y);
    if (distance < emberDistance) {
      emberDistance = distance;
      ember = item;
    }
  }
  let move = { x: 0, y: 0 };
  if (ember) {
    const dx = ember.x - player.x;
    const dy = ember.y - player.y;
    const length = Math.hypot(dx, dy) || 1;
    move = { x: dx / length, y: dy / length };
  }
  let pulse = false;
  if (canPulse && player.pulseCooldown <= 0) {
    for (const wisp of state.wisps) {
      if (Math.hypot(wisp.x - player.x, wisp.y - player.y) < 120) {
        pulse = true;
        break;
      }
    }
  }
  // A wisp too close to pulse away from: step back from it. The 'over'
  // scene never flees, so the wisps corner the keeper and end the game.
  if (!pulse && flee) {
    for (const wisp of state.wisps) {
      const dx = player.x - wisp.x;
      const dy = player.y - wisp.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 55 && distance > 0) {
        move = { x: dx / distance, y: dy / distance };
        break;
      }
    }
  }
  return { move, pulse };
}

/**
 * Set `world` to the named scene (title, play or over; any other name is
 * title) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'over') {
    for (let index = 0; index < TITLE_SECONDS / STEP; index += 1) {
      world.step(STEP, { x: 0, y: 0 }, false, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'over' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const canPulse = name === 'play';
  for (let index = 0; index < limit / STEP; index += 1) {
    const { move, pulse } = autopilot(world.state, canPulse, canPulse);
    if (world.step(STEP, move, pulse, false) & EVENT_OVER) break;
  }
  const over = world.state.over;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
