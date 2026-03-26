/* ============================================
   Pop! — Audio System (Web Audio API)
   ============================================ */

const Audio = (() => {
  let ctx = null;
  let enabled = true;

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* Satisfying bubble pop — short, snappy */
  function pop(pitch = 1) {
    if (!enabled) return;
    const ac = getCtx();
    const now = ac.currentTime;

    // Noise burst for the "crack"
    const bufSize = ac.sampleRate * 0.03;
    const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 3);
    }
    const noise = ac.createBufferSource();
    noise.buffer = buf;

    // Bandpass to shape the noise
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2000 * pitch;
    bp.Q.value = 1.2;

    // Tonal "pop" body
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(150 * pitch, now + 0.06);

    const oscGain = ac.createGain();
    oscGain.gain.setValueAtTime(0.22, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    const noiseGain = ac.createGain();
    noiseGain.gain.setValueAtTime(0.18, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    // Master
    const master = ac.createGain();
    master.gain.value = 0.35;

    noise.connect(bp).connect(noiseGain).connect(master);
    osc.connect(oscGain).connect(master);
    master.connect(ac.destination);

    noise.start(now);
    noise.stop(now + 0.04);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  /* Combo pop — brighter, higher pitch */
  function comboPop(comboLevel) {
    const pitch = 1 + Math.min(comboLevel, 10) * 0.08;
    pop(pitch);
  }

  /* Badge unlock — cheerful two-tone chime */
  function badge() {
    if (!enabled) return;
    const ac = getCtx();
    const now = ac.currentTime;

    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ac.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;

      const g = ac.createGain();
      g.gain.setValueAtTime(0.001, now + i * 0.1);
      g.gain.linearRampToValueAtTime(0.2, now + i * 0.1 + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);

      osc.connect(g).connect(ac.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.35);
    });
  }

  /* Game over — descending tone */
  function gameOver() {
    if (!enabled) return;
    const ac = getCtx();
    const now = ac.currentTime;

    const osc = ac.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.6);

    const g = ac.createGain();
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    osc.connect(g).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.75);
  }

  /* Victory — ascending arpeggio */
  function victory() {
    if (!enabled) return;
    const ac = getCtx();
    const now = ac.currentTime;

    [392, 494, 587, 784].forEach((freq, i) => {
      const osc = ac.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;

      const g = ac.createGain();
      g.gain.setValueAtTime(0.001, now + i * 0.08);
      g.gain.linearRampToValueAtTime(0.18, now + i * 0.08 + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);

      osc.connect(g).connect(ac.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.45);
    });
  }

  return { pop, comboPop, badge, gameOver, victory, enable: () => enabled = true, disable: () => enabled = false };
})();
