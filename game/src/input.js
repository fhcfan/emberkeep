// Keyboard and mouse, read once per frame. Direction is a normalised
// {x, y} from WASD or the arrow keys; actions are edge-triggered bits the
// main loop consumes with takeActions().
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_PULSE = 4;

const MOVE_KEYS = {
  KeyW: { x: 0, y: -1 },
  ArrowUp: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
  ArrowDown: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  ArrowLeft: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

export function createInput(canvas) {
  const held = new Set();
  let queued = 0;

  function onKeyDown(event) {
    if (MOVE_KEYS[event.code] || event.code === 'Space') event.preventDefault();
    if (event.repeat) return;
    held.add(event.code);
    if (event.code === 'Enter' || event.code === 'Space') queued |= ACTION_CONFIRM;
    if (event.code === 'Space') queued |= ACTION_PULSE;
    if (event.code === 'KeyP' || event.code === 'Escape') queued |= ACTION_PAUSE;
    if (event.code === 'KeyM') queued |= 8;
    if (event.code === 'KeyR') queued |= 16;
  }

  function onKeyUp(event) {
    held.delete(event.code);
  }

  function onPointerDown(event) {
    event.preventDefault();
    queued |= ACTION_CONFIRM | ACTION_PULSE;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointerdown', onPointerDown);

  return {
    direction() {
      let x = 0;
      let y = 0;
      for (const code of held) {
        const move = MOVE_KEYS[code];
        if (move) {
          x += move.x;
          y += move.y;
        }
      }
      if (x === 0 && y === 0) return { x: 0, y: 0 };
      const length = Math.hypot(x, y);
      return { x: x / length, y: y / length };
    },
    takeActions() {
      const actions = queued;
      queued = 0;
      return actions;
    },
  };
}

// Bit 8 is mute, bit 16 is restart; kept out of the exported names so the
// main loop can read them without the input module knowing the screens.
export const ACTION_MUTE = 8;
export const ACTION_RESTART = 16;
