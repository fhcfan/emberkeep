// A small seeded generator (mulberry32) so a screenshot scene replays exactly
// from its seed, and so the live game can take a fresh random seed each run.
export function createRandom(seed) {
  let value = seed >>> 0;
  return function next() {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function range(random, min, max) {
  return min + random() * (max - min);
}

export function pickEdgePoint(random, width, height, margin) {
  const side = Math.floor(random() * 4);
  if (side === 0) return { x: range(random, margin, width - margin), y: margin };
  if (side === 1) return { x: range(random, margin, width - margin), y: height - margin };
  if (side === 2) return { x: margin, y: range(random, margin, height - margin) };
  return { x: width - margin, y: range(random, margin, height - margin) };
}
