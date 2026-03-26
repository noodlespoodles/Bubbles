/* ============================================
   Pop! v2 — Audio System (Web Audio API)
   ============================================ */
const Audio = (() => {
  let ctx = null;
  let enabled = true;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function pop(pitch = 1, variation = 0) {
    if (!enabled) return;
    const ac = getCtx();
    const now = ac.currentTime;
    const v = 1 + (Math.random() - .5) * variation; // subtle randomness

    // Noise burst
    const bufSize = ac.sampleRate * 0.025;
    const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 4);
    const noise = ac.createBufferSource();
    noise.buffer = buf;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 2200 * pitch * v; bp.Q.value = 1.5;
    const noiseGain = ac.createGain();
    noiseGain.gain.setValueAtTime(0.16, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    // Tone
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(650 * pitch * v, now);
    osc.frequency.exponentialRampToValueAtTime(160 * pitch, now + 0.055);
    const oscGain = ac.createGain();
    oscGain.gain.setValueAtTime(0.2, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    const master = ac.createGain();
    master.gain.value = 0.3;
    noise.connect(bp).connect(noiseGain).connect(master);
    osc.connect(oscGain).connect(master);
    master.connect(ac.destination);
    noise.start(now); noise.stop(now + 0.04);
    osc.start(now); osc.stop(now + 0.08);
  }

  function comboPop(comboLevel) {
    const pitch = 1 + Math.min(comboLevel, 15) * 0.06;
    pop(pitch, 0.12);
  }

  function goldenPop() {
    if (!enabled) return;
    const ac = getCtx(); const now = ac.currentTime;
    [800, 1000, 1200].forEach((f, i) => {
      const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.001, now + i * 0.04);
      g.gain.linearRampToValueAtTime(0.15, now + i * 0.04 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.15);
      o.connect(g).connect(ac.destination);
      o.start(now + i * 0.04); o.stop(now + i * 0.04 + 0.2);
    });
    pop(1.5, 0.1);
  }

  function bombPop() {
    if (!enabled) return;
    const ac = getCtx(); const now = ac.currentTime;
    const o = ac.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(200, now);
    o.frequency.exponentialRampToValueAtTime(40, now + 0.3);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.25, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    o.connect(g).connect(ac.destination);
    o.start(now); o.stop(now + 0.4);
    // Noise layer
    const bufSize = ac.sampleRate * 0.15;
    const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 2);
    const n = ac.createBufferSource(); n.buffer = buf;
    const ng = ac.createGain(); ng.gain.setValueAtTime(0.2, now); ng.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    n.connect(ng).connect(ac.destination); n.start(now); n.stop(now + 0.2);
  }

  function freezePop() {
    if (!enabled) return;
    const ac = getCtx(); const now = ac.currentTime;
    const o = ac.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(1200, now);
    o.frequency.exponentialRampToValueAtTime(2400, now + 0.15);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.15, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    o.connect(g).connect(ac.destination);
    o.start(now); o.stop(now + 0.25);
  }

  function badge() {
    if (!enabled) return;
    const ac = getCtx(); const now = ac.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = freq;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.001, now + i * 0.1);
      g.gain.linearRampToValueAtTime(0.18, now + i * 0.1 + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);
      o.connect(g).connect(ac.destination);
      o.start(now + i * 0.1); o.stop(now + i * 0.1 + 0.35);
    });
  }

  function gameOver() {
    if (!enabled) return;
    const ac = getCtx(); const now = ac.currentTime;
    const o = ac.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(500, now);
    o.frequency.exponentialRampToValueAtTime(120, now + 0.6);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    o.connect(g).connect(ac.destination);
    o.start(now); o.stop(now + 0.75);
  }

  function victory() {
    if (!enabled) return;
    const ac = getCtx(); const now = ac.currentTime;
    [392, 494, 587, 784].forEach((freq, i) => {
      const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = freq;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.001, now + i * 0.08);
      g.gain.linearRampToValueAtTime(0.16, now + i * 0.08 + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);
      o.connect(g).connect(ac.destination);
      o.start(now + i * 0.08); o.stop(now + i * 0.08 + 0.45);
    });
  }

  function countdownTick() {
    if (!enabled) return;
    const ac = getCtx(); const now = ac.currentTime;
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = 880;
    const g = ac.createGain(); g.gain.setValueAtTime(0.15, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    o.connect(g).connect(ac.destination); o.start(now); o.stop(now + 0.2);
  }

  function countdownGo() {
    if (!enabled) return;
    const ac = getCtx(); const now = ac.currentTime;
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = 1320;
    const g = ac.createGain(); g.gain.setValueAtTime(0.2, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    o.connect(g).connect(ac.destination); o.start(now); o.stop(now + 0.35);
  }

  function levelUp() {
    if (!enabled) return;
    const ac = getCtx(); const now = ac.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => {
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.001, now + i * 0.06);
      g.gain.linearRampToValueAtTime(0.14, now + i * 0.06 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.3);
      o.connect(g).connect(ac.destination);
      o.start(now + i * 0.06); o.stop(now + i * 0.06 + 0.35);
    });
  }

  return {
    pop, comboPop, goldenPop, bombPop, freezePop,
    badge, gameOver, victory, countdownTick, countdownGo, levelUp,
    enable: () => enabled = true,
    disable: () => enabled = false,
    get enabled() { return enabled; }
  };
})();
