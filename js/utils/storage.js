/* ==========================================================================
   NotesByME — Storage utility
   All localStorage / sessionStorage access lives here (never inside pages).
   Every call is wrapped so the site still works when storage is unavailable
   (private windows, disabled cookies) by falling back to in-memory values.
   ========================================================================== */

(function () {
  "use strict";

  var NB = (window.NB = window.NB || {});

  var KEYS = {
    theme: "nbme.theme",
    filterPrefs: "nbme.prefs",
    reviewed: "nbme.reviewed",
    quizHistory: "nbme.quizHistory",
    sessionUnlocked: "nbme.gate"
  };

  var memory = {};
  var QUIZ_HISTORY_LIMIT = 40;

  function area(kind) {
    try {
      var store = kind === "session" ? window.sessionStorage : window.localStorage;
      if (!store) return null;
      var probe = "__nbme_probe__";
      store.setItem(probe, "1");
      store.removeItem(probe);
      return store;
    } catch (error) {
      return null;
    }
  }

  function safeGet(kind, key) {
    var store = area(kind);
    if (!store) {
      return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
    }
    try {
      return store.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function safeSet(kind, key, value) {
    var store = area(kind);
    memory[key] = value;
    if (!store) return false;
    try {
      store.setItem(key, value);
      return true;
    } catch (error) {
      return false;
    }
  }

  function safeRemove(kind, key) {
    delete memory[key];
    var store = area(kind);
    if (!store) return;
    try {
      store.removeItem(key);
    } catch (error) {
      /* ignore */
    }
  }

  function readJSON(kind, key, fallback) {
    var raw = safeGet(kind, key);
    if (!raw) return fallback;
    try {
      var parsed = JSON.parse(raw);
      return parsed === null || parsed === undefined ? fallback : parsed;
    } catch (error) {
      return fallback;
    }
  }

  function writeJSON(kind, key, value) {
    return safeSet(kind, key, JSON.stringify(value));
  }

  /* ------------------------------------------------------------- theme ---- */

  function getTheme() {
    var stored = safeGet("local", KEYS.theme);
    return stored === "dark" || stored === "light" ? stored : null;
  }

  function setTheme(theme) {
    safeSet("local", KEYS.theme, theme === "dark" ? "dark" : "light");
  }

  function systemTheme() {
    try {
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "dark";
      }
    } catch (error) {
      /* ignore */
    }
    return "light";
  }

  /* --------------------- access gate (a UI gate, not real security) ------- */

  function isSessionUnlocked() {
    return safeGet("session", KEYS.sessionUnlocked) === "1";
  }

  function setSessionUnlocked(unlocked) {
    if (unlocked) safeSet("session", KEYS.sessionUnlocked, "1");
    else safeRemove("session", KEYS.sessionUnlocked);
  }

  /* -------------------------------------------------- learning progress --- */

  function reviewedMap() {
    var value = readJSON("local", KEYS.reviewed, {});
    return value && typeof value === "object" ? value : {};
  }

  function markReviewed(dateId) {
    if (!dateId) return reviewedMap();
    var map = reviewedMap();
    var entry = map[dateId] || { count: 0, lastAt: null };
    entry.count += 1;
    entry.lastAt = new Date().toISOString();
    map[dateId] = entry;
    writeJSON("local", KEYS.reviewed, map);
    return map;
  }

  function reviewedCount() {
    return Object.keys(reviewedMap()).length;
  }

  function isReviewed(dateId) {
    return Boolean(reviewedMap()[dateId]);
  }

  function resetReviewed() {
    safeRemove("local", KEYS.reviewed);
  }

  /* ------------------------------------------------------- quiz history --- */

  function quizHistory() {
    var value = readJSON("local", KEYS.quizHistory, []);
    return Array.isArray(value) ? value : [];
  }

  function addQuizResult(result) {
    var history = quizHistory();
    history.unshift({
      mode: result.mode,
      score: result.score,
      total: result.total,
      chapter: result.chapter || "all",
      at: result.at || new Date().toISOString()
    });
    if (history.length > QUIZ_HISTORY_LIMIT) history = history.slice(0, QUIZ_HISTORY_LIMIT);
    writeJSON("local", KEYS.quizHistory, history);
    return history;
  }

  function quizStats() {
    var history = quizHistory();
    if (!history.length) {
      return { attempts: 0, bestPercent: 0, averagePercent: 0, last: null, best: null };
    }
    var scores = history.map(function (item) {
      return item.total ? (item.score / item.total) * 100 : 0;
    });
    var best = scores.reduce(function (a, b) {
      return Math.max(a, b);
    }, 0);
    var average =
      scores.reduce(function (a, b) {
        return a + b;
      }, 0) / scores.length;

    return {
      attempts: history.length,
      bestPercent: Math.round(best),
      averagePercent: Math.round(average),
      last: history[0],
      best: history.reduce(function (a, b) {
        var aPct = a.total ? a.score / a.total : 0;
        var bPct = b.total ? b.score / b.total : 0;
        return bPct > aPct ? b : a;
      })
    };
  }

  function resetQuiz() {
    safeRemove("local", KEYS.quizHistory);
  }

  /* --------------------------------------------------------- preferences -- */

  function getPrefs() {
    var value = readJSON("local", KEYS.filterPrefs, {});
    return value && typeof value === "object" ? value : {};
  }

  function setPref(key, value) {
    var prefs = getPrefs();
    prefs[key] = value;
    writeJSON("local", KEYS.filterPrefs, prefs);
    return prefs;
  }

  function resetAll() {
    resetReviewed();
    resetQuiz();
    safeRemove("local", KEYS.filterPrefs);
  }

  NB.storage = {
    KEYS: KEYS,
    getTheme: getTheme,
    setTheme: setTheme,
    systemTheme: systemTheme,
    isSessionUnlocked: isSessionUnlocked,
    setSessionUnlocked: setSessionUnlocked,
    reviewedMap: reviewedMap,
    markReviewed: markReviewed,
    reviewedCount: reviewedCount,
    isReviewed: isReviewed,
    resetReviewed: resetReviewed,
    quizHistory: quizHistory,
    addQuizResult: addQuizResult,
    quizStats: quizStats,
    resetQuiz: resetQuiz,
    getPrefs: getPrefs,
    setPref: setPref,
    resetAll: resetAll
  };
})();