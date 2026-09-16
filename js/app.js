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
    var id = raw.split("?")[0].split("/")[0];
    var available = pages();
    return available[id] ? id : "home";
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
      page.render(mainEl);
    } catch (error) {
      renderError(mainEl, error);
    }
    document.title = "NotesByME — " + NB.nav.routeById(routeId).label;
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
    appEl.appendChild(NB.nav.renderHeader(routeId));
    mainEl = H.el("main", { class: "app-main", id: "main", tabindex: "-1" });
    appEl.appendChild(mainEl);
    renderRoute(routeId);
    appEl.appendChild(NB.nav.renderBottomNav(routeId));
    appEl.appendChild(NB.nav.renderFooter());
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
    var routeId = parseRoute();
    if (routeId === currentRouteId) return;
    renderShell(routeId);
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
    document.addEventListener("visibilitychange", function () {
      if (document.hidden && NB.gate.isUnlocked()) {
        NB.gate.lock();
        showGate();
      }
    });

    // Lock on blur (window loses focus)
    window.addEventListener("blur", function () {
      if (NB.gate.isUnlocked()) {
        NB.gate.lock();
        showGate();
      }
    });
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