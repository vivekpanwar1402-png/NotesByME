/* ==========================================================================
   NotesByME — Application bootstrap
   Order of responsibility:
     1. apply saved/system theme
     2. show the PIN gate unless this tab-session is already unlocked
     3. render the shell + active page and keep the hash router in sync
   Nothing renders before the gate is passed, so no study content is exposed.
   ========================================================================== */

(function () {
  "use strict";

  var NB = (window.NB = window.NB || {});
  var H = NB.helpers;

  var appEl = null;
  var mainEl = null;
  var currentRouteId = null;

  function pages() {
    return {
      home: NB.pages.home,
      subjects: NB.pages.subjects,
      history: NB.pages.history,
      quiz: NB.pages.quiz,
      revision: NB.pages.revision,
      progress: NB.pages.progress,
      notes: NB.pages.notes,
      doubts: NB.pages.doubts,
      settings: NB.pages.settings
    };
  }

  function parseRoute() {
    var raw = String(window.location.hash || "").replace(/^#\/?/, "");
    var parts = raw.split("?")[0].split("/");
    var id = parts[0];
    var available = pages();
    // Nested routes (e.g. #/subjects/history) render under their top page.
    if (available[id]) return id;
    return "home";
  }

  function renderError(main, error) {
    main.appendChild(
      H.el("div", { class: "empty" }, [
        H.el("span", { class: "empty__icon" }, [H.icon("alert", 22)]),
        H.el("h3", { class: "empty__title", text: "This section could not be loaded" }),
        H.el("p", {
          class: "empty__text",
          text: "Please reload the page. If the problem persists, go back to Home."
        }),
        H.el(
          "button",
          {
            class: "btn btn--secondary",
            type: "button",
            text: "Go to Home",
            onclick: function () {
              window.location.hash = "#/home";
            }
          }
        )
      ])
    );
    if (window.console && console.error) console.error("NotesByME render error:", error);
  }

  function renderRoute(routeId) {
    var page = pages()[routeId];
    H.clear(mainEl);
    try {
      // Pages may return an optional cleanup fn via render(); route render
      // below always clears mainEl, and per-page timers/listeners use
      // hashchange-once cleanup (see home.js clock). Nothing else to do here.
      page.render(mainEl);
    } catch (error) {
      renderError(mainEl, error);
    }
    var label = "Home";
    try {
      label = NB.nav.routeById(routeId).label;
    } catch (error) {
      label = routeId;
    }
    document.title = "NotesByME — " + label;
    if (mainEl.focus) {
      try {
        mainEl.focus({ preventScroll: true });
      } catch (error) {
        mainEl.focus();
      }
    }
    window.scrollTo(0, 0);
  }

  function renderShell(routeId) {
    H.clear(appEl);
    currentRouteId = routeId;
    /* Full-screen wallpaper layer (replaceable via --wallpaper-image). */
    var wallpaper = document.querySelector(".wallpaper");
    if (!wallpaper) {
      wallpaper = H.el("div", { class: "wallpaper", "aria-hidden": "true" });
      document.body.insertBefore(wallpaper, document.body.firstChild);
    }
    /* Expose a tiny wallpaper API so the image can be changed later. */
    NB.wallpaper = NB.wallpaper || {
      set: function (url) {
        var value = url ? "url(\"" + url + "\")" : null;
        if (value) {
          document.documentElement.style.setProperty("--wallpaper-image", value);
          try { localStorage.setItem("nbme.wallpaper", url); } catch (e) {}
        } else {
          document.documentElement.style.removeProperty("--wallpaper-image");
          try { localStorage.removeItem("nbme.wallpaper"); } catch (e) {}
        }
      }
    };
    try {
      var savedWallpaper = localStorage.getItem("nbme.wallpaper");
      if (savedWallpaper) {
        document.documentElement.style.setProperty("--wallpaper-image", "url(\"" + savedWallpaper + "\")");
      }
    } catch (e) {}
    appEl.appendChild(NB.nav.renderHeader(routeId));
    mainEl = H.el("main", { class: "app-main", id: "main", tabindex: "-1" });
    appEl.appendChild(mainEl);
    renderRoute(routeId);
    appEl.appendChild(NB.nav.renderBottomNav(routeId));
    appEl.appendChild(NB.nav.renderFooter());
    try {
      // Let nav patch active states on later route changes (no full rebuild).
      var headerEl = appEl.querySelector(".app-header");
      var bottomEl = appEl.querySelector(".bottom-nav");
      if (NB.nav.registerShell) NB.nav.registerShell(headerEl, bottomEl);
    } catch (error) {
      /* non-fatal */
    }
  }

  function ensureHash() {
    if (window.location.hash) return;
    try {
      window.history.replaceState(null, "", "#/home");
    } catch (error) {
      window.location.hash = "#/home";
    }
  }

  function showGate() {
    H.clear(appEl);
    NB.gate.mount(appEl, {
      onUnlock: function () {
        ensureHash();
        renderShell(parseRoute());
      }
    });
  }

  function onHashChange() {
    // Full shell render is only for boot/unlock. Route changes patch main.
    var routeId = parseRoute();
    var full = String(window.location.hash || "");
    var isNestedSubjects = full.indexOf("#/subjects/") === 0;
    if (routeId === currentRouteId && !isNestedSubjects) return;
    if (routeId !== currentRouteId) {
      // Smooth SPA navigation: patch nav active states + main content only.
      // Shell is built once per unlock; route changes reuse it.
      currentRouteId = routeId;
      try {
        if (typeof NB.nav.setActive === "function") NB.nav.setActive(routeId);
        else renderShell(routeId);
      } catch (error) {
        renderShell(routeId);
        return;
      }
      if (!mainEl) {
        renderShell(routeId);
        return;
      }
      renderRoute(routeId);
      return;
    }
    // Same top route but nested subject changed -> re-render main only.
    if (mainEl) renderRoute(routeId);
  }

  function boot() {
    NB.nav.theme.init();
    appEl = document.getElementById("app");
    if (!appEl) return;

    if (NB.gate.isUnlocked()) {
      ensureHash();
      renderShell(parseRoute());
    } else {
      showGate();
    }

    window.addEventListener("hashchange", onHashChange);

    // Lock on visibility change (tab backgrounded, hidden, etc.)
    // Milestone 1 fix: the old handler locked IMMEDIATELY on hidden, so a
    // normal refresh (which fires visibilitychange hidden -> visible) could
    // bounce the user back to the gate in a loop, and backgrounding the tab
    // for a second forced a full re-login. Now we use a short grace period:
    // - hidden for < GRACE_MS (quick refresh / app switch) -> stay unlocked
    // - hidden for >= GRACE_MS -> lock for privacy (original intent kept)
    // - blur alone NEVER locks (blur fires on refresh/devtools/address-bar).
    var LOCK_GRACE_MS = 1500;
    var hiddenAt = 0;
    var lockTimer = null;

    function scheduleLock(reason) {
      if (lockTimer) {
        try { window.clearTimeout(lockTimer); } catch (error) {}
        lockTimer = null;
      }
      lockTimer = window.setTimeout(function () {
        lockTimer = null;
        try {
          if (NB.gate.isUnlocked()) {
            NB.gate.lock();
            showGate();
          }
        } catch (error) {
          /* fail safe: stay on current screen rather than half-locking */
        }
      }, LOCK_GRACE_MS);
      return lockTimer;
    }

    function cancelPendingLock() {
      if (lockTimer) {
        try { window.clearTimeout(lockTimer); } catch (error) {}
        lockTimer = null;
      }
    }
    document.addEventListener("visibilitychange", function () {
      try {
        if (document.hidden) {
          hiddenAt = Date.now();
          scheduleLock("hidden");
        } else {
          // Visible again quickly (e.g. normal refresh) -> cancel pending lock.
          var awayMs = hiddenAt ? Date.now() - hiddenAt : 0;
          if (awayMs < LOCK_GRACE_MS) cancelPendingLock();
          hiddenAt = 0;
        }
      } catch (error) {
        /* ignore: never break boot on lock bookkeeping */
      }
    });

    // NOTE: blur listener intentionally REMOVED (was the main refresh/lock
    // loop cause). visibilitychange with grace covers real backgrounding.
    // Manual locking is still available via the header lock button.
  }

  NB.app = {
    parseRoute: parseRoute,
    renderShell: renderShell,
    showGate: showGate,
    boot: boot
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();