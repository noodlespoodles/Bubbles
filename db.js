/* ============================================
   Pop! — Shared Database (JSONBin.io)
   ============================================
   Public bin — anyone can read, key needed to write.
   All players share one bin = one leaderboard.
   ============================================ */

const DB = (() => {
  const BIN_ID = '69c4ede8c3097a1dd55ff7d9';
  const API_KEY = '$2a$10$Yu53eq9myXGAOCtnPcef7Oa8os.bg/TlxTHIh3REeKIXWf8f.X5se';
  const BASE = 'https://api.jsonbin.io/v3/b';
  const MAX_ENTRIES = 50;

  let cache = null;
  let lastFetch = 0;
  const CACHE_TTL = 5000; // 5s cache to avoid hammering

  async function fetchLeaderboard(force = false) {
    const now = Date.now();
    if (!force && cache && now - lastFetch < CACHE_TTL) {
      return cache;
    }
    try {
      const res = await fetch(`${BASE}/${BIN_ID}/latest`, {
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const data = json.record || json;
      cache = {
        timed: Array.isArray(data.timed) ? data.timed : [],
        countdown: Array.isArray(data.countdown) ? data.countdown : [],
      };
      lastFetch = Date.now();
      return cache;
    } catch (err) {
      console.warn('DB fetch failed, using local fallback:', err.message);
      return getLocal();
    }
  }

  async function submitScore(mode, entry) {
    if (mode !== 'timed' && mode !== 'countdown') return { success: false };

    // Save locally immediately
    saveLocal(mode, entry);

    try {
      // Fetch latest remote data
      const data = await fetchLeaderboard(true);
      const list = data[mode] || [];

      // Add new entry
      list.push(entry);

      // Sort descending by score
      list.sort((a, b) => b.score - a.score);

      // Trim
      if (list.length > MAX_ENTRIES) list.length = MAX_ENTRIES;
      data[mode] = list;

      // Write back
      const res = await fetch(`${BASE}/${BIN_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': API_KEY,
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      cache = data;
      lastFetch = Date.now();

      const rank = list.findIndex(e =>
        e.name === entry.name && e.score === entry.score && e.date === entry.date
      );
      return { success: true, rank: rank + 1 };
    } catch (err) {
      console.warn('DB submit failed, saved locally:', err.message);
      return { success: false };
    }
  }

  async function getScores(mode) {
    const data = await fetchLeaderboard();
    return data[mode] || [];
  }

  // --- Local fallback ---
  function getLocal() {
    return {
      timed: JSON.parse(localStorage.getItem('pop_lb_timed') || '[]'),
      countdown: JSON.parse(localStorage.getItem('pop_lb_countdown') || '[]'),
    };
  }

  function saveLocal(mode, entry) {
    const key = `pop_lb_${mode}`;
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    list.push(entry);
    list.sort((a, b) => b.score - a.score);
    if (list.length > MAX_ENTRIES) list.length = MAX_ENTRIES;
    localStorage.setItem(key, JSON.stringify(list));
  }

  // Preload
  fetchLeaderboard().catch(() => {});

  return { getScores, submitScore, fetchLeaderboard };
})();
