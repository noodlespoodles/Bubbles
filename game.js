/* ============================================
   Pop! v2 — Game Engine
   ============================================ */
(() => {
  'use strict';
  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => [...p.querySelectorAll(s)];

  // ─── DOM ───
  const screens = { start: $('#screen-start'), game: $('#screen-game'), results: $('#screen-results'), leaderboard: $('#screen-leaderboard'), badges: $('#screen-badges') };
  const el = {
    btnStart: $('#btn-start'), btnLeaderboard: $('#btn-leaderboard'), btnBadges: $('#btn-badges'),
    btnPause: $('#btn-pause'), btnQuit: $('#btn-quit'), btnResume: $('#btn-resume'), btnQuitPause: $('#btn-quit-pause'),
    btnPlayAgain: $('#btn-play-again'), btnBackMenu: $('#btn-back-menu'), btnSaveScore: $('#btn-save-score'),
    btnShare: $('#btn-share'), btnLbBack: $('#btn-lb-back'), btnLbRefresh: $('#btn-lb-refresh'), btnBadgesBack: $('#btn-badges-back'),
    playerName: $('#player-name'), bubbleGrid: $('#bubble-grid'),
    hudScore: $('#hud-score'), hudComboWrap: $('#hud-combo-wrap'), hudCombo: $('#hud-combo'),
    hudTimerWrap: $('#hud-timer-wrap'), hudTimer: $('#hud-timer'), timerRingFill: $('#timer-ring-fill'),
    hudProgressWrap: $('#hud-progress-wrap'), hudProgress: $('#hud-progress'), hudProgressText: $('#hud-progress-text'),
    pauseOverlay: $('#pause-overlay'), pauseStats: $('#pause-stats'), comboBorder: $('#combo-border'),
    powerupIndicator: $('#powerup-indicator'), powerupIcon: $('#powerup-icon'), powerupText: $('#powerup-text'),
    countdownOverlay: $('#countdown-overlay'), countdownNumber: $('#countdown-number'),
    resultTitle: $('#results-title'), resultScore: $('#result-score'), resultPopped: $('#result-popped'),
    resultCombo: $('#result-combo'), resultTime: $('#result-time'), resultsBadges: $('#results-badges'),
    resultsNameArea: $('#results-name-area'), newBest: $('#new-best'),
    xpGain: $('#xp-gain'), xpGainAmount: $('#xp-gain-amount'), xpFillResult: $('#xp-fill-result'),
    xpLevel: $('#xp-level'), xpText: $('#xp-text'), xpFill: $('#xp-fill'),
    mascotSpeech: $('#mascot-speech'), mascotStartSpeech: $('#mascot-start-speech'),
    badgeToast: $('#badge-toast'), badgeToastIcon: $('#badge-toast-icon'), badgeToastText: $('#badge-toast-text'),
    particles: $('#particles'), leaderboardList: $('#leaderboard-list'), confettiCanvas: $('#confetti-canvas'),
    badgesGrid: $('#badges-grid'), badgesSubtitle: $('#badges-subtitle'), lbSyncStatus: $('#lb-sync-status'),
    toggleSound: $('#toggle-sound'), toggleHaptics: $('#toggle-haptics'),
    logoCanvas: $('#logo-canvas'),
  };

  // ─── State ───
  let S = resetState();
  let timer = null, comboTimer = null, confettiAnim = null;
  let isDragging = false;

  function resetState() {
    return {
      mode: null, size: 'medium', theme: 'classic',
      score: 0, popped: 0, total: 0, combo: 0, bestCombo: 0,
      timeLeft: 30, startDuration: 30, elapsed: 0,
      paused: false, running: false,
      badges: [], earnedBadges: new Set(), lastPopTime: 0,
      goldenPopped: 0, bombsPopped: 0, freezesPopped: 0,
      dragPopped: 0, bestDragStreak: 0, currentDragStreak: 0,
    };
  }

  // ─── Constants ───
  const TIMED_DURATION = 30;
  const COMBO_WINDOW = 650;
  const POWERUP_CHANCE = 0.04; // 4% chance per bubble
  const RAINBOW = ['#f87171','#fb923c','#fbbf24','#a3e635','#4ade80','#22d3ee','#60a5fa','#818cf8','#a78bfa','#f472b6','#e879f9','#fb7185'];
  const POWERUPS = ['golden', 'bomb', 'freeze'];

  // ─── XP System ───
  const XP = {
    getProfile() {
      return JSON.parse(localStorage.getItem('pop_xp') || '{"xp":0,"level":1,"totalPopped":0}');
    },
    save(p) { localStorage.setItem('pop_xp', JSON.stringify(p)); },
    xpForLevel(lv) { return Math.floor(80 * Math.pow(lv, 1.4)); },
    addXP(amount) {
      const p = this.getProfile();
      p.xp += amount;
      while (p.xp >= this.xpForLevel(p.level)) {
        p.xp -= this.xpForLevel(p.level);
        p.level++;
        Audio.levelUp();
      }
      this.save(p);
      return p;
    },
    addPopped(n) { const p = this.getProfile(); p.totalPopped += n; this.save(p); },
    render() {
      const p = this.getProfile();
      const needed = this.xpForLevel(p.level);
      el.xpLevel.textContent = `Lv ${p.level}`;
      el.xpText.textContent = `${p.xp} / ${needed} XP`;
      el.xpFill.style.width = `${(p.xp / needed) * 100}%`;
    }
  };

  // ─── Badges ───
  const BADGES = [
    { id: 'first-pop', icon: '🫧', label: 'First Pop', desc: 'Pop your first bubble', check: s => s.popped >= 1 },
    { id: 'ten-pops', icon: '🎈', label: '10 Pops', desc: 'Pop 10 bubbles in one game', check: s => s.popped >= 10 },
    { id: 'fifty-pops', icon: '💯', label: '50 Pops', desc: 'Pop 50 in one game', check: s => s.popped >= 50 },
    { id: 'hundred-pops', icon: '🎆', label: 'Century', desc: '100 pops in one game', check: s => s.popped >= 100 },
    { id: 'combo-5', icon: '🔥', label: '5x Combo', desc: 'Reach a 5x combo', check: s => s.bestCombo >= 5 },
    { id: 'combo-10', icon: '⚡', label: '10x Combo', desc: 'Reach 10x combo', check: s => s.bestCombo >= 10 },
    { id: 'combo-20', icon: '🌟', label: '20x Combo', desc: 'Reach 20x combo', check: s => s.bestCombo >= 20 },
    { id: 'speed-demon', icon: '💨', label: 'Speed Demon', desc: '60+ pops in Timed mode', check: s => s.mode === 'timed' && s.popped >= 60 },
    { id: 'perfectionist', icon: '✨', label: 'Perfectionist', desc: 'Clear all in Rush mode', check: s => s.mode === 'countdown' && s.popped === s.total && s.timeLeft > 0 },
    { id: 'zen-master', icon: '🧘', label: 'Zen Master', desc: '200 pops in Zen mode', check: s => s.mode === 'zen' && s.popped >= 200 },
    { id: 'score-500', icon: '🏅', label: '500 Points', desc: 'Score 500 in one game', check: s => s.score >= 500 },
    { id: 'score-1000', icon: '🏆', label: '1K Points', desc: 'Score 1000 in one game', check: s => s.score >= 1000 },
    { id: 'score-2500', icon: '👑', label: '2.5K Points', desc: 'Score 2500 in one game', check: s => s.score >= 2500 },
    { id: 'rainbow-pop', icon: '🌈', label: 'Rainbow Popper', desc: '30 pops on Rainbow', check: s => s.theme === 'rainbow' && s.popped >= 30 },
    { id: 'golden-3', icon: '✦', label: 'Gold Rush', desc: 'Pop 3 golden bubbles', check: s => s.goldenPopped >= 3 },
    { id: 'bomber', icon: '💥', label: 'Demolition', desc: 'Pop 2 bomb bubbles', check: s => s.bombsPopped >= 2 },
    { id: 'ice-age', icon: '❄️', label: 'Ice Age', desc: 'Pop 2 freeze bubbles', check: s => s.freezesPopped >= 2 },
    { id: 'drag-5', icon: '👆', label: 'Drag Master', desc: 'Drag-pop 5 in one swipe', check: s => s.bestDragStreak >= 5 },
    { id: 'daily-play', icon: '📅', label: 'Daily Player', desc: 'Complete a daily challenge', check: s => s.mode === 'daily' && s.popped > 0 },
    { id: 'level-5', icon: '⭐', label: 'Lv 5', desc: 'Reach level 5', check: () => XP.getProfile().level >= 5 },
    { id: 'level-10', icon: '🌙', label: 'Lv 10', desc: 'Reach level 10', check: () => XP.getProfile().level >= 10 },
  ];

  const MASCOT = {
    idle: ['Pop pop pop!', "Let's go!", '🫧 🫧 🫧', 'So satisfying!', 'Pop me!'],
    combo: ['Nice combo!', 'Keep going!', 'Unstoppable!', 'On fire! 🔥', 'AMAZING!', 'LEGENDARY!'],
    encourage: ['You can do it!', 'Almost there!', "Don't stop!", 'Pop faster!', 'GO GO GO!'],
    powerup: ['Ooh, shiny! ✦', 'BOOM! 💥', 'Freeze! ❄️', 'Power up!'],
    drag: ['Swoosh!', 'Nice swipe!', 'Drag & pop!'],
  };

  // ─── Screen management ───
  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
  }

  // ─── Theme ───
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme === 'rainbow' ? 'classic' : theme);
  }

  // ─── Logo canvas (floating bubbles) ───
  function initLogoCanvas() {
    const c = el.logoCanvas, ctx = c.getContext('2d');
    const bubbles = Array.from({ length: 8 }, () => ({
      x: Math.random() * 200, y: Math.random() * 60,
      r: 6 + Math.random() * 10, vy: -0.2 - Math.random() * 0.3,
      opacity: 0.3 + Math.random() * 0.4,
    }));
    function draw() {
      ctx.clearRect(0, 0, 200, 60);
      bubbles.forEach(b => {
        b.y += b.vy;
        if (b.y < -b.r) { b.y = 60 + b.r; b.x = Math.random() * 200; }
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(126,184,218,${b.opacity})`;
        ctx.fill();
        // Shine
        ctx.beginPath();
        ctx.arc(b.x - b.r * 0.25, b.y - b.r * 0.25, b.r * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${b.opacity * 0.6})`;
        ctx.fill();
      });
      requestAnimationFrame(draw);
    }
    draw();
  }

  // ─── Start screen ───
  function initStartScreen() {
    $$('.mode-btn').forEach(btn => btn.addEventListener('click', () => {
      $$('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      S.mode = btn.dataset.mode;
      el.btnStart.disabled = false;
    }));
    $$('.size-btn').forEach(btn => btn.addEventListener('click', () => {
      $$('.size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      S.size = btn.dataset.size;
    }));
    $$('.color-btn').forEach(btn => btn.addEventListener('click', () => {
      $$('.color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      S.theme = btn.dataset.theme;
      applyTheme(S.theme);
    }));

    el.toggleSound.addEventListener('change', () => {
      el.toggleSound.checked ? Audio.enable() : Audio.disable();
      localStorage.setItem('pop_sound', el.toggleSound.checked);
    });
    el.toggleHaptics.addEventListener('change', () => {
      localStorage.setItem('pop_haptics', el.toggleHaptics.checked);
    });

    // Restore settings
    const soundPref = localStorage.getItem('pop_sound');
    if (soundPref === 'false') { el.toggleSound.checked = false; Audio.disable(); }
    const hapticPref = localStorage.getItem('pop_haptics');
    if (hapticPref === 'false') el.toggleHaptics.checked = false;

    el.btnStart.addEventListener('click', () => {
      if (S.mode === 'timed' || S.mode === 'countdown' || S.mode === 'daily') {
        runCountdown(() => startGame());
      } else {
        startGame();
      }
    });
    el.btnLeaderboard.addEventListener('click', async () => { await renderLeaderboard('timed'); showScreen('leaderboard'); });
    el.btnBadges.addEventListener('click', () => { renderBadgesScreen(); showScreen('badges'); });

    XP.render();
    updateStartMascot();
  }

  function updateStartMascot() {
    const p = XP.getProfile();
    const lines = [
      "Let's pop!",
      p.level >= 5 ? 'Welcome back, pro!' : "Let's pop!",
      p.totalPopped > 500 ? `${p.totalPopped.toLocaleString()} lifetime pops!` : "So satisfying!",
    ];
    el.mascotStartSpeech.textContent = randomFrom(lines);
  }

  // ─── 3-2-1 Countdown ───
  function runCountdown(cb) {
    showScreen('game');
    el.countdownOverlay.hidden = false;
    let count = 3;
    el.countdownNumber.textContent = count;
    el.countdownNumber.style.animation = 'none';
    void el.countdownNumber.offsetWidth;
    el.countdownNumber.style.animation = '';
    Audio.countdownTick();

    const iv = setInterval(() => {
      count--;
      if (count > 0) {
        el.countdownNumber.textContent = count;
        el.countdownNumber.style.animation = 'none';
        void el.countdownNumber.offsetWidth;
        el.countdownNumber.style.animation = '';
        Audio.countdownTick();
      } else if (count === 0) {
        el.countdownNumber.textContent = 'POP!';
        el.countdownNumber.style.animation = 'none';
        void el.countdownNumber.offsetWidth;
        el.countdownNumber.style.animation = '';
        Audio.countdownGo();
      } else {
        clearInterval(iv);
        el.countdownOverlay.hidden = true;
        cb();
      }
    }, 700);
  }

  // ─── Grid ───
  function createGrid() {
    el.bubbleGrid.innerHTML = '';
    document.documentElement.setAttribute('data-bubble-size', S.size);
    const grid = el.bubbleGrid, rect = grid.getBoundingClientRect();
    const sizes = { small: 40, medium: 56, large: 72 };
    const gaps = { small: 4, medium: 6, large: 8 };
    const bSize = sizes[S.size] || 56, gap = gaps[S.size] || 6;
    const cols = Math.floor((rect.width - 32) / (bSize + gap));
    const rows = Math.floor((rect.height - 32) / (bSize + gap));
    const total = cols * rows;
    S.total = total;
    grid.style.gridTemplateColumns = `repeat(${cols}, var(--bubble-size))`;

    // Seed for daily mode
    const rng = S.mode === 'daily' ? seededRandom(getDailySeed()) : Math.random;

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < total; i++) {
      const bubble = document.createElement('button');
      bubble.className = 'bubble';
      bubble.setAttribute('aria-label', `Bubble ${i + 1}`);
      bubble.dataset.index = i;

      // Power-ups
      if (S.mode !== 'zen') {
        const roll = rng();
        if (roll < POWERUP_CHANCE) {
          const type = POWERUPS[Math.floor(rng() * POWERUPS.length)];
          bubble.classList.add(type);
          bubble.dataset.powerup = type;
        }
      }

      // Rainbow colors
      if (S.theme === 'rainbow' && !bubble.dataset.powerup) {
        const color = RAINBOW[i % RAINBOW.length];
        const light = lighten(color, 40), dark = darken(color, 30);
        bubble.style.background = `radial-gradient(circle at 35% 30%, ${light} 0%, ${color} 50%, ${dark} 100%)`;
      }

      bubble.style.animationDelay = `${(i % cols) * 12 + Math.floor(i / cols) * 18}ms`;
      bubble.style.animation = 'fadeIn 0.25s ease backwards';
      fragment.appendChild(bubble);
    }
    grid.appendChild(fragment);
  }

  // ─── Pop handler ───
  function popBubble(bubble) {
    if (!bubble || bubble.classList.contains('popped') || !S.running || S.paused) return;

    const now = Date.now();
    const dt = now - S.lastPopTime;
    S.lastPopTime = now;

    // Combo
    if (dt < COMBO_WINDOW) { S.combo++; } else { S.combo = 1; }
    if (S.combo > S.bestCombo) S.bestCombo = S.combo;
    clearTimeout(comboTimer);
    comboTimer = setTimeout(() => { S.combo = 0; updateHUD(); updateComboBorder(); }, COMBO_WINDOW);

    const powerup = bubble.dataset.powerup;
    let points = 10 + (Math.min(S.combo, 20) - 1) * 5;

    // Power-up effects
    if (powerup === 'golden') {
      points *= 3;
      S.goldenPopped++;
      Audio.goldenPop();
      spawnParticle(bubble, points, false, true);
    } else if (powerup === 'bomb') {
      S.bombsPopped++;
      Audio.bombPop();
      popNeighbors(bubble, 2);
      spawnBombRing(bubble);
      screenShake();
    } else if (powerup === 'freeze') {
      S.freezesPopped++;
      Audio.freezePop();
      if (S.mode === 'timed' || S.mode === 'countdown' || S.mode === 'daily') {
        S.timeLeft = Math.min(S.timeLeft + 5, S.startDuration + 15);
        showPowerupText('❄️', '+5 seconds!');
      }
    } else {
      Audio.comboPop(S.combo);
    }

    if (!powerup || powerup === 'golden') {
      spawnParticle(bubble, points, S.combo >= 5, powerup === 'golden');
    }

    S.score += points;
    S.popped++;

    // Pop animation
    bubble.classList.add('pop-anim');
    spawnBurstDots(bubble);
    setTimeout(() => { bubble.classList.remove('pop-anim'); bubble.classList.add('popped'); }, 180);

    // Haptics
    if (el.toggleHaptics.checked && navigator.vibrate) {
      navigator.vibrate(S.combo >= 10 ? [15, 10, 15] : 10);
    }

    // Mascot
    if (S.combo === 5 || S.combo === 10 || S.combo === 15 || S.combo === 20) {
      showMascotSpeech(randomFrom(MASCOT.combo));
    }
    if (powerup) showMascotSpeech(randomFrom(MASCOT.powerup));

    checkBadges();
    updateHUD();
    updateComboBorder();

    // Combo screen shake at milestones
    if (S.combo === 10 || S.combo === 20) screenShake();

    if (S.mode === 'countdown' && S.popped >= S.total) endGame(true);
    if (S.mode === 'daily' && S.popped >= S.total) endGame(true);
  }

  function handlePointerDown(e) {
    const bubble = e.target.closest('.bubble');
    if (bubble) { isDragging = true; popBubble(bubble); S.currentDragStreak = 1; }
  }
  function handlePointerMove(e) {
    if (!isDragging) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const bubble = el && el.closest ? el.closest('.bubble') : null;
    if (bubble && !bubble.classList.contains('popped')) {
      popBubble(bubble);
      S.currentDragStreak++;
      if (S.currentDragStreak > S.bestDragStreak) S.bestDragStreak = S.currentDragStreak;
    }
  }
  function handlePointerUp() {
    if (isDragging && S.currentDragStreak >= 3) {
      showMascotSpeech(randomFrom(MASCOT.drag));
    }
    isDragging = false;
    S.currentDragStreak = 0;
  }

  // ─── Bomb neighbor pop ───
  function popNeighbors(bubble, radius) {
    const rect = bubble.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const range = (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--bubble-size')) || 56) * (radius + 0.5);
    $$('.bubble:not(.popped)', el.bubbleGrid).forEach(b => {
      if (b === bubble) return;
      const r = b.getBoundingClientRect();
      const bx = r.left + r.width / 2, by = r.top + r.height / 2;
      const dist = Math.sqrt((cx - bx) ** 2 + (cy - by) ** 2);
      if (dist < range) {
        const pts = 10;
        S.score += pts;
        S.popped++;
        b.classList.add('pop-anim');
        spawnBurstDots(b);
        setTimeout(() => { b.classList.remove('pop-anim'); b.classList.add('popped'); }, 180);
        spawnParticle(b, pts, false, false);
      }
    });
  }

  // ─── Visual effects ───
  function spawnParticle(bubble, points, big, golden) {
    const rect = bubble.getBoundingClientRect();
    const p = document.createElement('div');
    p.className = 'score-particle' + (big ? ' big' : '') + (golden ? ' golden' : '');
    p.textContent = `+${points}`;
    p.style.left = `${rect.left + rect.width / 2}px`;
    p.style.top = `${rect.top}px`;
    el.particles.appendChild(p);
    setTimeout(() => p.remove(), 700);
  }

  function spawnBurstDots(bubble) {
    const rect = bubble.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const colors = S.theme === 'rainbow'
      ? [RAINBOW[Math.floor(Math.random() * RAINBOW.length)]]
      : [getComputedStyle(document.documentElement).getPropertyValue('--bubble-base').trim()];
    for (let i = 0; i < 6; i++) {
      const dot = document.createElement('div');
      dot.className = 'burst-dot';
      dot.style.left = `${cx}px`;
      dot.style.top = `${cy}px`;
      dot.style.background = colors[0];
      const angle = (Math.PI * 2 / 6) * i + Math.random() * 0.5;
      const dist = 15 + Math.random() * 20;
      dot.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
      dot.style.setProperty('--ty', `${Math.sin(angle) * dist}px`);
      dot.style.animation = `burstOut 0.35s ease forwards`;
      dot.style.transform = `translate(var(--tx), var(--ty))`;
      el.particles.appendChild(dot);
      setTimeout(() => dot.remove(), 400);
    }
  }

  function spawnBombRing(bubble) {
    const rect = bubble.getBoundingClientRect();
    const ring = document.createElement('div');
    ring.className = 'bomb-ring';
    const size = 60;
    ring.style.left = `${rect.left + rect.width / 2 - size / 2}px`;
    ring.style.top = `${rect.top + rect.height / 2 - size / 2}px`;
    ring.style.width = ring.style.height = `${size}px`;
    el.particles.appendChild(ring);
    setTimeout(() => ring.remove(), 500);
  }

  function screenShake() {
    screens.game.classList.remove('shake');
    void screens.game.offsetWidth;
    screens.game.classList.add('shake');
    setTimeout(() => screens.game.classList.remove('shake'), 300);
  }

  function showPowerupText(icon, text) {
    el.powerupIcon.textContent = icon;
    el.powerupText.textContent = text;
    el.powerupIndicator.hidden = false;
    setTimeout(() => { el.powerupIndicator.hidden = true; }, 1800);
  }

  function updateComboBorder() {
    const b = el.comboBorder;
    b.className = 'combo-border';
    if (S.combo >= 20) b.classList.add('active', 'inferno');
    else if (S.combo >= 10) b.classList.add('active', 'fire');
    else if (S.combo >= 5) b.classList.add('active');
  }

  // ─── HUD ───
  function updateHUD() {
    el.hudScore.textContent = S.score.toLocaleString();
    if (S.combo >= 2) {
      el.hudComboWrap.hidden = false;
      el.hudCombo.textContent = `x${S.combo}`;
      el.hudCombo.classList.remove('pulse');
      void el.hudCombo.offsetWidth;
      el.hudCombo.classList.add('pulse');
    } else {
      el.hudComboWrap.hidden = true;
    }
    if (S.mode !== 'zen') {
      el.hudTimerWrap.hidden = false;
      el.hudTimer.textContent = Math.ceil(S.timeLeft);
      el.hudTimer.classList.toggle('urgent', S.timeLeft <= 5);
      // Ring progress
      const pct = S.timeLeft / S.startDuration;
      const circ = 2 * Math.PI * 20; // r=20
      el.timerRingFill.style.strokeDashoffset = circ * (1 - Math.max(0, Math.min(1, pct)));
      el.timerRingFill.classList.toggle('urgent', S.timeLeft <= 5);
    }
    if (S.mode === 'countdown' || S.mode === 'daily') {
      el.hudProgressWrap.hidden = false;
      el.hudProgress.style.width = `${(S.popped / S.total) * 100}%`;
      el.hudProgressText.textContent = `${S.popped}/${S.total}`;
    }
  }

  // ─── Timer ───
  function startTimer() {
    const startTime = Date.now();
    const duration = S.mode === 'timed' ? TIMED_DURATION : S.mode === 'daily' ? getDailyDuration() : getCountdownTime();
    S.timeLeft = duration;
    S.startDuration = duration;

    let pausedAccum = 0, pauseStart = 0;

    timer = setInterval(() => {
      if (S.paused) { if (!pauseStart) pauseStart = Date.now(); return; }
      if (pauseStart) { pausedAccum += Date.now() - pauseStart; pauseStart = 0; }

      const elapsed = (Date.now() - startTime - pausedAccum) / 1000;
      S.elapsed = elapsed;
      S.timeLeft = Math.max(0, duration - elapsed);
      // Freeze can extend beyond original, recalc
      if (S.mode === 'timed' || S.mode === 'daily') {
        S.timeLeft = Math.max(0, S.startDuration - elapsed);
      }
      updateHUD();
      if (S.timeLeft <= 10 && S.timeLeft > 9.5) showMascotSpeech(randomFrom(MASCOT.encourage));
      if (S.timeLeft <= 0) endGame(S.mode === 'countdown' || S.mode === 'daily' ? S.popped >= S.total : true);
    }, 50);
  }

  function getCountdownTime() {
    const per = S.size === 'small' ? 0.25 : S.size === 'large' ? 0.5 : 0.35;
    return Math.ceil(S.total * per);
  }
  function getDailyDuration() { return 30; }

  // ─── Daily seed ───
  function getDailySeed() {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }
  function seededRandom(seed) {
    let s = seed;
    return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
  }

  // ─── Game lifecycle ───
  function startGame() {
    const prev = S.mode; const prevSize = S.size; const prevTheme = S.theme;
    S = resetState();
    S.mode = prev; S.size = prevSize; S.theme = prevTheme;

    el.hudComboWrap.hidden = true;
    el.hudTimerWrap.hidden = S.mode === 'zen';
    el.hudProgressWrap.hidden = S.mode !== 'countdown' && S.mode !== 'daily';
    el.pauseOverlay.hidden = true;
    el.comboBorder.className = 'combo-border';
    el.powerupIndicator.hidden = true;
    el.countdownOverlay.hidden = true;

    showScreen('game');
    requestAnimationFrame(() => {
      createGrid();
      S.running = true;
      updateHUD();
      if (S.mode !== 'zen') startTimer();
      else {
        const start = Date.now();
        timer = setInterval(() => { if (!S.paused) S.elapsed = (Date.now() - start) / 1000; }, 100);
      }
      showMascotSpeech(randomFrom(MASCOT.idle));
    });
  }

  function endGame(success = true) {
    S.running = false;
    clearInterval(timer);
    clearTimeout(comboTimer);
    el.comboBorder.className = 'combo-border';
    checkBadges();
    success ? Audio.victory() : Audio.gameOver();

    // XP
    const xpGained = Math.floor(S.score * 0.1) + S.popped;
    XP.addXP(xpGained);
    XP.addPopped(S.popped);

    setTimeout(() => showResults(success, xpGained), 400);
  }

  function pauseGame() {
    S.paused = true;
    el.pauseOverlay.hidden = false;
    el.pauseStats.textContent = `Score: ${S.score.toLocaleString()} · Popped: ${S.popped}`;
  }
  function resumeGame() { S.paused = false; el.pauseOverlay.hidden = true; }
  function quitGame() {
    S.running = false; S.paused = false;
    clearInterval(timer); clearTimeout(comboTimer);
    el.pauseOverlay.hidden = true;
    el.comboBorder.className = 'combo-border';
    showScreen('start'); XP.render();
  }

  // ─── Results ───
  function showResults(success, xpGained) {
    const titles = success
      ? ['Amazing! 🎉', 'Pop Star! ⭐', 'Incredible!', 'Bubble Master!', 'Popping Legend!', 'Unstoppable!']
      : ["Time's Up! ⏰", 'So Close!', 'Almost!', 'Nice Try!'];
    el.resultTitle.textContent = randomFrom(titles);
    el.resultScore.textContent = S.score.toLocaleString();
    el.resultPopped.textContent = S.popped;
    el.resultCombo.textContent = `x${S.bestCombo}`;
    el.resultTime.textContent = `${Math.round(S.elapsed)}s`;

    // Check personal best
    const bestKey = `pop_best_${S.mode}`;
    const prevBest = parseInt(localStorage.getItem(bestKey) || '0');
    if (S.score > prevBest && S.mode !== 'zen') {
      localStorage.setItem(bestKey, S.score);
      el.newBest.hidden = false;
    } else {
      el.newBest.hidden = true;
    }

    // XP
    el.xpGain.hidden = false;
    el.xpGainAmount.textContent = `+${xpGained} XP`;
    const p = XP.getProfile();
    const needed = XP.xpForLevel(p.level);
    el.xpFillResult.style.width = `${(p.xp / needed) * 100}%`;

    // Badges
    el.resultsBadges.innerHTML = '';
    S.badges.forEach((b, i) => {
      const e = document.createElement('div');
      e.className = 'badge'; e.style.animationDelay = `${i * 0.1}s`;
      e.innerHTML = `<span class="badge-icon">${b.icon}</span><span>${b.label}</span>`;
      el.resultsBadges.appendChild(e);
    });

    el.resultsNameArea.hidden = S.mode === 'zen';
    el.playerName.value = localStorage.getItem('pop_player_name') || '';

    showScreen('results');
    startConfetti();
  }

  // ─── Confetti ───
  function startConfetti() {
    const canvas = el.confettiCanvas;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    const pieces = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width, y: -20 - Math.random() * 200,
      w: 4 + Math.random() * 6, h: 8 + Math.random() * 10,
      color: RAINBOW[Math.floor(Math.random() * RAINBOW.length)],
      vy: 1.5 + Math.random() * 2.5, vx: (Math.random() - 0.5) * 2,
      rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 0.15,
    }));
    let running = true;
    function draw() {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      pieces.forEach(p => {
        p.y += p.vy; p.x += p.vx; p.rot += p.vr;
        if (p.y < canvas.height + 20) alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (alive) confettiAnim = requestAnimationFrame(draw);
    }
    if (confettiAnim) cancelAnimationFrame(confettiAnim);
    draw();
    // Auto-stop after 4s
    setTimeout(() => { running = false; ctx.clearRect(0, 0, canvas.width, canvas.height); }, 4000);
  }

  // ─── Badges ───
  function checkBadges() {
    BADGES.forEach(badge => {
      if (!S.earnedBadges.has(badge.id) && badge.check(S)) {
        S.earnedBadges.add(badge.id);
        S.badges.push(badge);
        showBadgeToast(badge);
        Audio.badge();
        const lifetime = JSON.parse(localStorage.getItem('pop_badges') || '[]');
        if (!lifetime.includes(badge.id)) {
          lifetime.push(badge.id);
          localStorage.setItem('pop_badges', JSON.stringify(lifetime));
        }
      }
    });
  }

  function showBadgeToast(badge) {
    el.badgeToastIcon.textContent = badge.icon;
    el.badgeToastText.textContent = badge.label;
    el.badgeToast.hidden = false;
    el.badgeToast.style.animation = 'none';
    void el.badgeToast.offsetWidth;
    el.badgeToast.style.animation = '';
    setTimeout(() => { el.badgeToast.hidden = true; }, 2500);
  }

  function renderBadgesScreen() {
    const unlocked = JSON.parse(localStorage.getItem('pop_badges') || '[]');
    el.badgesSubtitle.textContent = `${unlocked.length} / ${BADGES.length} unlocked`;
    el.badgesGrid.innerHTML = BADGES.map(b => {
      const has = unlocked.includes(b.id);
      return `<div class="badge-card${has ? '' : ' locked'}">
        <span class="badge-card-icon">${b.icon}</span>
        <div class="badge-card-name">${b.label}</div>
        <div class="badge-card-desc">${has ? b.desc : '???'}</div>
      </div>`;
    }).join('');
  }

  // ─── Mascot ───
  function showMascotSpeech(text) {
    el.mascotSpeech.textContent = text;
    el.mascotSpeech.classList.add('visible');
    setTimeout(() => el.mascotSpeech.classList.remove('visible'), 2000);
  }

  // ─── Leaderboard ───
  async function getLeaderboard(mode) {
    try { return await DB.getScores(mode); }
    catch { return JSON.parse(localStorage.getItem(`pop_lb_${mode}`) || '[]'); }
  }
  async function saveToLeaderboard(mode, name, score, popped, bestCombo) {
    return DB.submitScore(mode, { name, score, popped, bestCombo, date: Date.now() });
  }
  async function renderLeaderboard(mode) {
    const lb = await getLeaderboard(mode);
    $$('.lb-tab').forEach(t => t.classList.toggle('active', t.dataset.lbMode === mode));
    if (!lb.length) {
      el.leaderboardList.innerHTML = '<div class="lb-empty">No scores yet. Go pop some bubbles!</div>';
      return;
    }
    const myName = localStorage.getItem('pop_player_name') || '';
    el.leaderboardList.innerHTML = lb.slice(0, 25).map((entry, i) => {
      const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
      const rankText = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
      const highlight = entry.name === myName ? ' highlight' : '';
      const dateStr = entry.date ? new Date(entry.date).toLocaleDateString() : '';
      return `<div class="lb-entry${highlight}" style="animation-delay:${i * 0.04}s">
        <span class="lb-rank ${rankClass}">${rankText}</span>
        <span class="lb-name">${escapeHtml(entry.name)}<br><span class="lb-meta">${dateStr}</span></span>
        <span class="lb-score">${entry.score.toLocaleString()}</span>
      </div>`;
    }).join('');
  }

  // ─── Share ───
  function shareScore() {
    const text = `🫧 Pop! Bubble Wrap Bliss\n` +
      `Score: ${S.score.toLocaleString()} | Popped: ${S.popped} | Combo: x${S.bestCombo}\n` +
      `Mode: ${S.mode} | Time: ${Math.round(S.elapsed)}s\n` +
      `Can you beat me? 👉 https://noodlespoodles.github.io/Bubbles/`;

    if (navigator.share) {
      navigator.share({ title: 'Pop! Bubble Wrap Bliss', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => {
        el.btnShare.textContent = '✓ Copied!';
        setTimeout(() => { el.btnShare.innerHTML = '📋 Share'; }, 2000);
      });
    }
  }

  // ─── Utils ───
  function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function hexToHSL(hex) {
    let r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
    const mx = Math.max(r,g,b), mn = Math.min(r,g,b);
    let h, s, l = (mx+mn)/2;
    if (mx===mn) h=s=0;
    else { const d=mx-mn; s=l>.5?d/(2-mx-mn):d/(mx+mn);
      switch(mx){case r:h=((g-b)/d+(g<b?6:0))/6;break;case g:h=((b-r)/d+2)/6;break;case b:h=((r-g)/d+4)/6;break;}
    } return [h*360,s*100,l*100];
  }
  function hslToHex(h,s,l) {
    s/=100;l/=100;const a=s*Math.min(l,1-l);
    const f=n=>{const k=(n+h/30)%12;return l-a*Math.max(Math.min(k-3,9-k,1),-1);};
    return '#'+[f(0),f(8),f(4)].map(x=>Math.round(x*255).toString(16).padStart(2,'0')).join('');
  }
  function lighten(hex,amt){const[h,s,l]=hexToHSL(hex);return hslToHex(h,s,Math.min(100,l+amt))}
  function darken(hex,amt){const[h,s,l]=hexToHSL(hex);return hslToHex(h,s,Math.max(0,l-amt))}

  // ─── Events ───
  function bindEvents() {
    // Drag-to-pop
    el.bubbleGrid.addEventListener('pointerdown', handlePointerDown);
    el.bubbleGrid.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    el.bubbleGrid.addEventListener('contextmenu', e => e.preventDefault());
    // Prevent scrolling while dragging on touch
    el.bubbleGrid.addEventListener('touchmove', e => { if (isDragging) e.preventDefault(); }, { passive: false });

    el.btnPause.addEventListener('click', pauseGame);
    el.btnQuit.addEventListener('click', pauseGame);
    el.btnResume.addEventListener('click', resumeGame);
    el.btnQuitPause.addEventListener('click', quitGame);
    el.btnPlayAgain.addEventListener('click', () => {
      if (S.mode === 'timed' || S.mode === 'countdown' || S.mode === 'daily') {
        runCountdown(() => startGame());
      } else { startGame(); }
    });
    el.btnBackMenu.addEventListener('click', () => { showScreen('start'); XP.render(); });
    el.btnShare.addEventListener('click', shareScore);

    el.btnSaveScore.addEventListener('click', async () => {
      const name = el.playerName.value.trim();
      if (!name) { el.playerName.focus(); return; }
      localStorage.setItem('pop_player_name', name);
      el.btnSaveScore.disabled = true; el.btnSaveScore.textContent = 'Saving...';
      const result = await saveToLeaderboard(S.mode, name, S.score, S.popped, S.bestCombo);
      el.resultsNameArea.hidden = true;
      el.btnSaveScore.textContent = result?.success ? '✓ Saved!' : '✓ Saved locally';
      el.btnSaveScore.disabled = false;
      setTimeout(() => { el.btnSaveScore.textContent = 'Save'; }, 2000);
    });

    $$('.lb-tab').forEach(tab => tab.addEventListener('click', () => renderLeaderboard(tab.dataset.lbMode)));
    el.btnLbBack.addEventListener('click', () => showScreen('start'));
    el.btnBadgesBack.addEventListener('click', () => showScreen('start'));
    el.btnLbRefresh.addEventListener('click', async () => {
      el.btnLbRefresh.classList.add('spinning');
      const mode = document.querySelector('.lb-tab.active')?.dataset.lbMode || 'timed';
      await DB.fetchLeaderboard(true);
      await renderLeaderboard(mode);
      el.btnLbRefresh.classList.remove('spinning');
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && S.running) S.paused ? resumeGame() : pauseGame();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && S.running && !S.paused) pauseGame();
    });

    el.btnQuit.addEventListener('click', () => {
      if (S.mode === 'zen' && S.running && !S.paused) endGame(true);
    });
  }

  // ─── Init ───
  function init() {
    applyTheme('classic');
    initStartScreen();
    initLogoCanvas();
    bindEvents();
    // Audio warm-up
    document.addEventListener('pointerdown', () => {
      try { const ac = new (window.AudioContext || window.webkitAudioContext)(); ac.resume(); ac.close(); } catch(e) {}
    }, { once: true });
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
