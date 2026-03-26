/* ============================================
   Pop! — Game Engine
   ============================================ */

(() => {
  'use strict';

  // --- DOM refs ---
  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => [...p.querySelectorAll(s)];

  const screens = {
    start: $('#screen-start'),
    game: $('#screen-game'),
    results: $('#screen-results'),
    leaderboard: $('#screen-leaderboard'),
  };

  const els = {
    btnStart: $('#btn-start'),
    btnLeaderboard: $('#btn-leaderboard'),
    btnPause: $('#btn-pause'),
    btnQuit: $('#btn-quit'),
    btnResume: $('#btn-resume'),
    btnQuitPause: $('#btn-quit-pause'),
    btnPlayAgain: $('#btn-play-again'),
    btnBackMenu: $('#btn-back-menu'),
    btnSaveScore: $('#btn-save-score'),
    btnLbBack: $('#btn-lb-back'),
    btnLbRefresh: $('#btn-lb-refresh'),
    lbSyncStatus: $('#lb-sync-status'),
    playerName: $('#player-name'),
    bubbleGrid: $('#bubble-grid'),
    hudScore: $('#hud-score'),
    hudComboWrap: $('#hud-combo-wrap'),
    hudCombo: $('#hud-combo'),
    hudTimerWrap: $('#hud-timer-wrap'),
    hudTimer: $('#hud-timer'),
    hudProgressWrap: $('#hud-progress-wrap'),
    hudProgress: $('#hud-progress'),
    hudProgressText: $('#hud-progress-text'),
    pauseOverlay: $('#pause-overlay'),
    resultTitle: $('#results-title'),
    resultScore: $('#result-score'),
    resultPopped: $('#result-popped'),
    resultCombo: $('#result-combo'),
    resultTime: $('#result-time'),
    resultsBadges: $('#results-badges'),
    resultsNameArea: $('#results-name-area'),
    mascotSpeech: $('#mascot-speech'),
    badgeToast: $('#badge-toast'),
    badgeToastIcon: $('#badge-toast-icon'),
    badgeToastText: $('#badge-toast-text'),
    particles: $('#particles'),
    leaderboardList: $('#leaderboard-list'),
  };

  // --- State ---
  let state = {
    mode: null,       // 'zen', 'timed', 'countdown'
    size: 'medium',
    theme: 'classic',
    score: 0,
    popped: 0,
    total: 0,
    combo: 0,
    bestCombo: 0,
    timeLeft: 30,
    elapsed: 0,
    paused: false,
    running: false,
    badges: [],
    earnedBadges: new Set(),
    lastPopTime: 0,
  };

  let timer = null;
  let comboTimer = null;

  // --- Constants ---
  const TIMED_DURATION = 30;
  const COMBO_WINDOW = 600; // ms to maintain combo
  const RAINBOW_COLORS = ['#f87171','#fb923c','#fbbf24','#a3e635','#4ade80','#22d3ee','#60a5fa','#818cf8','#a78bfa','#f472b6'];

  const BADGES = [
    { id: 'first-pop',    icon: '🫧', label: 'First Pop',      check: s => s.popped >= 1 },
    { id: 'ten-pops',     icon: '🎈', label: '10 Pops',        check: s => s.popped >= 10 },
    { id: 'fifty-pops',   icon: '💯', label: '50 Pops',        check: s => s.popped >= 50 },
    { id: 'hundred-pops', icon: '🎆', label: 'Century',        check: s => s.popped >= 100 },
    { id: 'combo-5',      icon: '🔥', label: '5x Combo',       check: s => s.bestCombo >= 5 },
    { id: 'combo-10',     icon: '⚡', label: '10x Combo',      check: s => s.bestCombo >= 10 },
    { id: 'combo-20',     icon: '🌟', label: '20x Combo',      check: s => s.bestCombo >= 20 },
    { id: 'speed-demon',  icon: '💨', label: 'Speed Demon',    check: s => s.mode === 'timed' && s.popped >= 60 },
    { id: 'perfectionist',icon: '✨', label: 'Perfectionist',  check: s => s.mode === 'countdown' && s.popped === s.total && s.timeLeft > 0 },
    { id: 'zen-master',   icon: '🧘', label: 'Zen Master',     check: s => s.mode === 'zen' && s.popped >= 200 },
    { id: 'score-500',    icon: '🏅', label: '500 Points',     check: s => s.score >= 500 },
    { id: 'score-1000',   icon: '🏆', label: '1000 Points',    check: s => s.score >= 1000 },
    { id: 'rainbow-pop',  icon: '🌈', label: 'Rainbow Popper', check: s => s.theme === 'rainbow' && s.popped >= 30 },
  ];

  const MASCOT_LINES = {
    idle: ['Pop pop pop!', "Let's go!", '🫧 🫧 🫧', 'So satisfying!'],
    combo: ['Nice combo!', 'Keep going!', 'Unstoppable!', 'On fire! 🔥', 'AMAZING!'],
    encourage: ['You can do it!', 'Almost there!', 'Don\'t stop!', 'Pop faster!'],
    end: ['Great job!', 'Well played!', 'Bubble master!', 'So good!'],
    slow: ['Pop some bubbles!', 'They\'re waiting...', 'Click them! 🫧'],
  };

  // --- Screen management ---
  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
  }

  // --- Start screen setup ---
  function initStartScreen() {
    // Mode selection
    $$('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.mode = btn.dataset.mode;
        els.btnStart.disabled = false;
      });
    });

    // Size selection
    $$('.size-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.size-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.size = btn.dataset.size;
      });
    });

    // Theme selection
    $$('.color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.theme = btn.dataset.theme;
        applyTheme(state.theme);
      });
    });

    els.btnStart.addEventListener('click', startGame);
    els.btnLeaderboard.addEventListener('click', async () => { await renderLeaderboard('timed'); showScreen('leaderboard'); });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme === 'rainbow' ? 'classic' : theme);
    // Rainbow is handled per-bubble via inline styles
  }

  // --- Bubble grid ---
  function createGrid() {
    els.bubbleGrid.innerHTML = '';
    document.documentElement.setAttribute('data-bubble-size', state.size);

    // Calculate how many bubbles fit
    const grid = els.bubbleGrid;
    const rect = grid.getBoundingClientRect();
    const sizes = { small: 40, medium: 56, large: 72 };
    const gaps = { small: 4, medium: 6, large: 8 };
    const bSize = sizes[state.size] || 56;
    const gap = gaps[state.size] || 6;

    const cols = Math.floor((rect.width - 32) / (bSize + gap));
    const rows = Math.floor((rect.height - 32) / (bSize + gap));
    const total = cols * rows;
    state.total = total;

    // Set grid columns explicitly
    grid.style.gridTemplateColumns = `repeat(${cols}, var(--bubble-size))`;

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < total; i++) {
      const bubble = document.createElement('button');
      bubble.className = 'bubble';
      bubble.setAttribute('aria-label', `Bubble ${i + 1}`);
      bubble.dataset.index = i;

      if (state.theme === 'rainbow') {
        const color = RAINBOW_COLORS[i % RAINBOW_COLORS.length];
        bubble.style.setProperty('--b-color', color);
        // Apply rainbow colors directly via inline gradient
        const light = lighten(color, 40);
        const dark = darken(color, 30);
        bubble.style.background = `radial-gradient(circle at 35% 30%, ${light} 0%, ${color} 50%, ${dark} 100%)`;
      }

      // Staggered entrance
      bubble.style.animationDelay = `${(i % cols) * 15 + Math.floor(i / cols) * 20}ms`;
      bubble.style.animation = `fadeIn 0.3s ease backwards`;

      fragment.appendChild(bubble);
    }
    grid.appendChild(fragment);
  }

  // --- Game events ---
  function handlePop(e) {
    const bubble = e.target.closest('.bubble');
    if (!bubble || bubble.classList.contains('popped') || !state.running || state.paused) return;

    const now = Date.now();
    const timeSinceLast = now - state.lastPopTime;
    state.lastPopTime = now;

    // Combo system
    if (timeSinceLast < COMBO_WINDOW) {
      state.combo++;
    } else {
      state.combo = 1;
    }
    if (state.combo > state.bestCombo) state.bestCombo = state.combo;

    // Reset combo timer
    clearTimeout(comboTimer);
    comboTimer = setTimeout(() => {
      state.combo = 0;
      updateHUD();
    }, COMBO_WINDOW);

    // Score: base 10 + combo bonus
    const comboMultiplier = Math.min(state.combo, 20);
    const points = 10 + (comboMultiplier - 1) * 5;
    state.score += points;
    state.popped++;

    // Pop the bubble
    bubble.classList.add('pop-anim');
    setTimeout(() => {
      bubble.classList.remove('pop-anim');
      bubble.classList.add('popped');
    }, 200);

    // Sound
    Audio.comboPop(state.combo);

    // Score particle
    spawnParticle(bubble, points, state.combo >= 5);

    // Check badges
    checkBadges();

    // Mascot reactions
    if (state.combo === 5 || state.combo === 10 || state.combo === 20) {
      showMascotSpeech(randomFrom(MASCOT_LINES.combo));
    }

    // Update HUD
    updateHUD();

    // Check countdown completion
    if (state.mode === 'countdown' && state.popped >= state.total) {
      endGame(true);
    }
  }

  function spawnParticle(bubble, points, big) {
    const rect = bubble.getBoundingClientRect();
    const p = document.createElement('div');
    p.className = 'score-particle' + (big ? ' big' : '');
    p.textContent = `+${points}`;
    p.style.left = `${rect.left + rect.width / 2}px`;
    p.style.top = `${rect.top}px`;
    els.particles.appendChild(p);
    setTimeout(() => p.remove(), 800);
  }

  // --- HUD ---
  function updateHUD() {
    els.hudScore.textContent = state.score.toLocaleString();

    // Combo
    if (state.combo >= 2) {
      els.hudComboWrap.hidden = false;
      els.hudCombo.textContent = `x${state.combo}`;
      els.hudCombo.classList.remove('pulse');
      void els.hudCombo.offsetWidth; // force reflow
      els.hudCombo.classList.add('pulse');
    } else {
      els.hudComboWrap.hidden = true;
    }

    // Timer
    if (state.mode === 'timed' || state.mode === 'countdown') {
      els.hudTimerWrap.hidden = false;
      els.hudTimer.textContent = Math.ceil(state.timeLeft);
      els.hudTimer.classList.toggle('urgent', state.timeLeft <= 5);
    }

    // Progress (countdown mode)
    if (state.mode === 'countdown') {
      els.hudProgressWrap.hidden = false;
      const pct = (state.popped / state.total) * 100;
      els.hudProgress.style.width = `${pct}%`;
      els.hudProgressText.textContent = `${state.popped}/${state.total}`;
    }
  }

  // --- Timer ---
  function startTimer() {
    const startTime = Date.now();
    const duration = state.mode === 'timed' ? TIMED_DURATION : getCountdownTime();
    state.timeLeft = duration;

    timer = setInterval(() => {
      if (state.paused) return;

      const elapsed = (Date.now() - startTime) / 1000;
      state.elapsed = elapsed;
      state.timeLeft = Math.max(0, duration - elapsed);

      updateHUD();

      // Mascot encouragement near end
      if (state.timeLeft <= 10 && state.timeLeft > 9 && state.timeLeft < 10.1) {
        showMascotSpeech(randomFrom(MASCOT_LINES.encourage));
      }

      if (state.timeLeft <= 0) {
        endGame(state.mode === 'countdown' ? state.popped >= state.total : true);
      }
    }, 50);
  }

  function getCountdownTime() {
    // Scale time based on bubble count
    const basePer = state.size === 'small' ? 0.25 : state.size === 'large' ? 0.5 : 0.35;
    return Math.ceil(state.total * basePer);
  }

  // --- Game lifecycle ---
  function startGame() {
    state.score = 0;
    state.popped = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.timeLeft = 30;
    state.elapsed = 0;
    state.paused = false;
    state.running = true;
    state.badges = [];
    state.earnedBadges = new Set();
    state.lastPopTime = 0;

    // Hide non-applicable HUD elements
    els.hudComboWrap.hidden = true;
    els.hudTimerWrap.hidden = state.mode === 'zen';
    els.hudProgressWrap.hidden = state.mode !== 'countdown';
    els.pauseOverlay.hidden = true;

    showScreen('game');

    // Slight delay to let CSS transition, then create grid
    requestAnimationFrame(() => {
      createGrid();
      updateHUD();

      if (state.mode !== 'zen') {
        startTimer();
      } else {
        // Zen mode: track elapsed time
        const start = Date.now();
        timer = setInterval(() => {
          if (!state.paused) state.elapsed = (Date.now() - start) / 1000;
        }, 100);
      }

      showMascotSpeech(randomFrom(MASCOT_LINES.idle));
    });
  }

  function endGame(success = true) {
    state.running = false;
    clearInterval(timer);
    clearTimeout(comboTimer);

    // Final badge check
    checkBadges();

    // Sound
    if (state.mode !== 'zen') {
      success ? Audio.victory() : Audio.gameOver();
    } else {
      Audio.victory();
    }

    // Show results
    setTimeout(() => showResults(success), 400);
  }

  function pauseGame() {
    state.paused = true;
    els.pauseOverlay.hidden = false;
  }
  function resumeGame() {
    state.paused = false;
    els.pauseOverlay.hidden = true;
  }
  function quitGame() {
    state.running = false;
    state.paused = false;
    clearInterval(timer);
    clearTimeout(comboTimer);
    els.pauseOverlay.hidden = true;
    showScreen('start');
  }

  // --- Results ---
  function showResults(success) {
    const titles = success
      ? ['Amazing! 🎉', 'Pop Star! ⭐', 'Incredible!', 'Bubble Master!', 'Wow! 🫧', 'Popping Legend!']
      : ['Time\'s Up! ⏰', 'So Close!', 'Almost!', 'Nice Try!'];

    els.resultTitle.textContent = randomFrom(titles);
    els.resultScore.textContent = state.score.toLocaleString();
    els.resultPopped.textContent = state.popped;
    els.resultCombo.textContent = `x${state.bestCombo}`;
    els.resultTime.textContent = `${Math.round(state.elapsed)}s`;

    // Render badges
    els.resultsBadges.innerHTML = '';
    state.badges.forEach((b, i) => {
      const el = document.createElement('div');
      el.className = 'badge';
      el.style.animationDelay = `${i * 0.1}s`;
      el.innerHTML = `<span class="badge-icon">${b.icon}</span><span>${b.label}</span>`;
      els.resultsBadges.appendChild(el);
    });

    // Show name input only for scored modes
    els.resultsNameArea.hidden = state.mode === 'zen';

    // Restore previous name
    const savedName = localStorage.getItem('pop_player_name') || '';
    els.playerName.value = savedName;

    showScreen('results');
  }

  // --- Badges ---
  function checkBadges() {
    BADGES.forEach(badge => {
      if (!state.earnedBadges.has(badge.id) && badge.check(state)) {
        state.earnedBadges.add(badge.id);
        state.badges.push(badge);
        showBadgeToast(badge);
        Audio.badge();

        // Persist lifetime badges
        const lifetime = JSON.parse(localStorage.getItem('pop_badges') || '[]');
        if (!lifetime.includes(badge.id)) {
          lifetime.push(badge.id);
          localStorage.setItem('pop_badges', JSON.stringify(lifetime));
        }
      }
    });
  }

  function showBadgeToast(badge) {
    els.badgeToastIcon.textContent = badge.icon;
    els.badgeToastText.textContent = badge.label;
    els.badgeToast.hidden = false;
    els.badgeToast.style.animation = 'none';
    void els.badgeToast.offsetWidth;
    els.badgeToast.style.animation = '';

    setTimeout(() => { els.badgeToast.hidden = true; }, 2500);
  }

  // --- Mascot ---
  function showMascotSpeech(text) {
    els.mascotSpeech.textContent = text;
    els.mascotSpeech.classList.add('visible');
    setTimeout(() => els.mascotSpeech.classList.remove('visible'), 2000);
  }

  // --- Leaderboard (shared via DB module) ---
  async function getLeaderboard(mode) {
    try {
      return await DB.getScores(mode);
    } catch {
      return JSON.parse(localStorage.getItem(`pop_lb_${mode}`) || '[]');
    }
  }

  async function saveToLeaderboard(mode, name, score, popped, bestCombo) {
    const entry = { name, score, popped, bestCombo, date: Date.now() };
    return DB.submitScore(mode, entry);
  }

  async function renderLeaderboard(mode) {
    const lb = await getLeaderboard(mode);

    // Update tabs
    $$('.lb-tab').forEach(t => t.classList.toggle('active', t.dataset.lbMode === mode));

    if (lb.length === 0) {
      els.leaderboardList.innerHTML = '<div class="lb-empty">No scores yet. Go pop some bubbles!</div>';
      return;
    }

    els.leaderboardList.innerHTML = lb.slice(0, 20).map((entry, i) => {
      const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
      const rankText = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
      return `
        <div class="lb-entry" style="animation-delay: ${i * 0.05}s">
          <span class="lb-rank ${rankClass}">${rankText}</span>
          <span class="lb-name">${escapeHtml(entry.name)}</span>
          <span class="lb-score">${entry.score.toLocaleString()}</span>
        </div>
      `;
    }).join('');
  }

  // --- Utilities ---
  function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // Color helpers for rainbow mode
  function hexToHSL(hex) {
    let r = parseInt(hex.slice(1,3),16)/255;
    let g = parseInt(hex.slice(3,5),16)/255;
    let b = parseInt(hex.slice(5,7),16)/255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    let h, s, l = (max+min)/2;
    if (max === min) { h = s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d/(2-max-min) : d/(max+min);
      switch(max) {
        case r: h = ((g-b)/d + (g<b?6:0))/6; break;
        case g: h = ((b-r)/d + 2)/6; break;
        case b: h = ((r-g)/d + 4)/6; break;
      }
    }
    return [h*360, s*100, l*100];
  }
  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1-l);
    const f = n => { const k = (n + h/30) % 12; return l - a * Math.max(Math.min(k-3, 9-k, 1), -1); };
    return '#' + [f(0),f(8),f(4)].map(x => Math.round(x*255).toString(16).padStart(2,'0')).join('');
  }
  function lighten(hex, amt) { const [h,s,l] = hexToHSL(hex); return hslToHex(h, s, Math.min(100, l+amt)); }
  function darken(hex, amt) { const [h,s,l] = hexToHSL(hex); return hslToHex(h, s, Math.max(0, l-amt)); }

  // --- Event listeners ---
  function bindEvents() {
    // Bubble grid — delegated click handler
    els.bubbleGrid.addEventListener('pointerdown', handlePop);
    // Prevent text selection and context menu on bubbles
    els.bubbleGrid.addEventListener('contextmenu', e => e.preventDefault());

    // Game HUD
    els.btnPause.addEventListener('click', pauseGame);
    els.btnQuit.addEventListener('click', () => pauseGame());
    els.btnResume.addEventListener('click', resumeGame);
    els.btnQuitPause.addEventListener('click', quitGame);

    // Results
    els.btnPlayAgain.addEventListener('click', startGame);
    els.btnBackMenu.addEventListener('click', () => showScreen('start'));

    // Save score
    els.btnSaveScore.addEventListener('click', async () => {
      const name = els.playerName.value.trim();
      if (!name) { els.playerName.focus(); return; }
      localStorage.setItem('pop_player_name', name);
      els.btnSaveScore.disabled = true;
      els.btnSaveScore.textContent = 'Saving...';

      const result = await saveToLeaderboard(state.mode, name, state.score, state.popped, state.bestCombo);
      els.resultsNameArea.hidden = true;

      if (result && result.success) {
        els.btnSaveScore.textContent = '✓ Saved!';
      } else {
        els.btnSaveScore.textContent = '✓ Saved locally';
      }
      els.btnSaveScore.disabled = false;
      setTimeout(() => { els.btnSaveScore.textContent = 'Save'; }, 2000);
    });

    // Leaderboard
    $$('.lb-tab').forEach(tab => {
      tab.addEventListener('click', () => renderLeaderboard(tab.dataset.lbMode));
    });
    els.btnLbBack.addEventListener('click', () => showScreen('start'));

    // Leaderboard refresh
    els.btnLbRefresh.addEventListener('click', async () => {
      els.btnLbRefresh.classList.add('spinning');
      const activeTab = document.querySelector('.lb-tab.active');
      const mode = activeTab ? activeTab.dataset.lbMode : 'timed';
      await DB.fetchLeaderboard(true);
      await renderLeaderboard(mode);
      els.btnLbRefresh.classList.remove('spinning');
    });

    // Keyboard
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && state.running) {
        state.paused ? resumeGame() : pauseGame();
      }
    });

    // Handle visibility change (auto-pause)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && state.running && !state.paused) {
        pauseGame();
      }
    });

    // Handle resize — rebuild grid if in game
    let resizeTimer;
    window.addEventListener('resize', () => {
      if (!state.running) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        // Only rebuild in zen mode (timed/countdown would lose progress)
        if (state.mode === 'zen') {
          createGrid();
        }
      }, 300);
    });

    // Zen mode — quit button in game
    els.btnQuit.addEventListener('click', () => {
      if (state.mode === 'zen' && state.running) {
        endGame(true);
      }
    });
  }

  // --- Init ---
  function init() {
    applyTheme('classic');
    initStartScreen();
    bindEvents();

    // Pre-warm audio context on first interaction
    document.addEventListener('pointerdown', () => {
      // Touch to unlock audio context
      try { const ac = new (window.AudioContext || window.webkitAudioContext)(); ac.resume(); ac.close(); } catch(e) {}
    }, { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
