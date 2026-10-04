let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
let resumeWired = false;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor({ latencyHint: "interactive" });
    master = ctx.createGain();
    master.gain.setValueAtTime(enabled ? 0.9 : 0.0001, ctx.currentTime);
    master.connect(ctx.destination);
    if (!resumeWired) {
      resumeWired = true;
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && ctx?.state === "suspended") void ctx.resume();
      });
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function unlockAudio() {
  audio();
}

export function setAudioEnabled(next: boolean) {
  enabled = next;
  if (!ctx || !master) return;
  const target = enabled ? 0.9 : 0.0001;
  master.gain.setTargetAtTime(target, ctx.currentTime, 0.025);
}

function output() {
  return master ?? ctx?.destination ?? null;
}

export function collideTone(mass: number) {
  if (!enabled) return;
  const ac = audio();
  const out = output();
  if (!ac || !out) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  const freq = 180 + 520 / Math.sqrt(Math.max(mass, 1));
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.55, ac.currentTime + 0.28);
  gain.gain.setValueAtTime(0.0001, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.045, ac.currentTime + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.32);
  osc.connect(gain);
  gain.connect(out);
  osc.start();
  osc.stop(ac.currentTime + 0.34);

  const transient = ac.createOscillator();
  const transientGain = ac.createGain();
  transient.type = "triangle";
  transient.frequency.setValueAtTime(freq * 2.1, ac.currentTime);
  transient.frequency.exponentialRampToValueAtTime(freq * 0.8, ac.currentTime + 0.08);
  transientGain.gain.setValueAtTime(0.028, ac.currentTime);
  transientGain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.1);
  transient.connect(transientGain);
  transientGain.connect(out);
  transient.start();
  transient.stop(ac.currentTime + 0.11);
}

export function throwTone() {
  if (!enabled) return;
  const ac = audio();
  const out = output();
  if (!ac || !out) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(420, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(180, ac.currentTime + 0.12);
  gain.gain.setValueAtTime(0.0001, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.026 + Math.random() * 0.007, ac.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.14);
  osc.connect(gain);
  gain.connect(out);
  osc.start();
  osc.stop(ac.currentTime + 0.16);
}

export function discoveryTone(complete = false) {
  if (!enabled) return;
  const ac = audio();
  const out = output();
  if (!ac || !out) return;
  const notes = complete ? [330, 440, 660] : [440, 587];
  notes.forEach((frequency, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const start = ac.currentTime + i * 0.065;
    osc.type = i === 0 ? "sine" : "triangle";
    osc.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(complete ? 0.035 : 0.022, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
    osc.connect(gain);
    gain.connect(out);
    osc.start(start);
    osc.stop(start + 0.22);
  });
}

export function phenomenonTone(kind: "wormhole" | "nova" | "well" | "rewind") {
  if (!enabled) return;
  const ac = audio();
  const out = output();
  if (!ac || !out) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  const filter = ac.createBiquadFilter();
  const start = ac.currentTime;
  osc.type = kind === "nova" ? "sawtooth" : kind === "rewind" ? "triangle" : "sine";
  const from = kind === "wormhole" ? 170 : kind === "nova" ? 92 : kind === "well" ? 118 : 540;
  const to = kind === "wormhole" ? 510 : kind === "nova" ? 48 : kind === "well" ? 72 : 150;
  osc.frequency.setValueAtTime(from, start);
  osc.frequency.exponentialRampToValueAtTime(to, start + (kind === "nova" ? 0.65 : 0.42));
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(kind === "nova" ? 780 : 1200, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(kind === "nova" ? 0.038 : 0.026, start + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + (kind === "nova" ? 0.72 : 0.5));
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(out);
  osc.start(start);
  osc.stop(start + (kind === "nova" ? 0.74 : 0.52));
}

export function defenseTone(kind: "build" | "upgrade" | "wave" | "leak" | "victory" | "defeat") {
  if (!enabled) return;
  const ac = audio();
  const out = output();
  if (!ac || !out) return;
  const patterns: Record<typeof kind, number[]> = {
    build: [260, 390],
    upgrade: [330, 495, 660],
    wave: [180, 240],
    leak: [150, 88],
    victory: [330, 440, 550, 740],
    defeat: [220, 164, 110],
  };
  const notes = patterns[kind];
  notes.forEach((frequency, index) => {
    const start = ac.currentTime + index * (kind === "victory" ? 0.085 : 0.07);
    const oscillator = ac.createOscillator();
    const gain = ac.createGain();
    oscillator.type = kind === "leak" || kind === "defeat" ? "sawtooth" : "triangle";
    oscillator.frequency.setValueAtTime(frequency, start);
    if (kind === "leak") oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.65, start + 0.18);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(kind === "leak" ? 0.028 : 0.02, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
    oscillator.connect(gain);
    gain.connect(out);
    oscillator.start(start);
    oscillator.stop(start + 0.24);
  });
}
