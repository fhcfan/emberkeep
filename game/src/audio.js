// All sound is synthesised with WebAudio: no audio files, no network.
// The context is created on the first user gesture, so autoplay rules never
// block it; every effect is a short oscillator/noise envelope.
export function createAudio() {
  let context = null;
  let muted = false;
  let master = null;

  function ensure() {
    if (!context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
    }
    if (context.state === 'suspended') void context.resume();
    return context;
  }

  function tone({ frequency, endFrequency, duration, type = 'sine', volume = 0.25, delay = 0 }) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    const start = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  function noise({ duration, volume = 0.2, delay = 0, lowpass = 1200 }) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    const start = ctx.currentTime + delay;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
    pulse() {
      tone({ frequency: 620, endFrequency: 180, duration: 0.28, type: 'sine', volume: 0.3 });
      noise({ duration: 0.18, volume: 0.12, lowpass: 2400 });
    },
    pickup(combo) {
      const base = 660 + Math.min(combo, 8) * 40;
      tone({ frequency: base, duration: 0.09, type: 'triangle', volume: 0.22 });
      tone({ frequency: base * 1.5, duration: 0.12, type: 'triangle', volume: 0.2, delay: 0.07 });
    },
    kill() {
      tone({ frequency: 340, endFrequency: 90, duration: 0.16, type: 'square', volume: 0.12 });
    },
    hit() {
      tone({ frequency: 160, endFrequency: 55, duration: 0.35, type: 'sawtooth', volume: 0.3 });
      noise({ duration: 0.25, volume: 0.22, lowpass: 700 });
    },
    waveClear() {
      [523, 659, 784, 1047].forEach((frequency, index) => {
        tone({ frequency, duration: 0.16, type: 'triangle', volume: 0.2, delay: index * 0.09 });
      });
    },
    gameOver() {
      [392, 330, 262, 196].forEach((frequency, index) => {
        tone({ frequency, duration: 0.3, type: 'sine', volume: 0.22, delay: index * 0.16 });
      });
    },
    start() {
      tone({ frequency: 440, duration: 0.1, type: 'triangle', volume: 0.2 });
      tone({ frequency: 660, duration: 0.14, type: 'triangle', volume: 0.2, delay: 0.09 });
    },
  };
}
