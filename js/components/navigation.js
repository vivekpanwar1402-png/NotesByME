/* ==========================================================================
   NotesByME — Navigation (app header, bottom tab bar, theme switch)
   Exposes NB.nav

   TO NOTE: changing the visual theme is done in exactly one place
   (NB.nav.theme.toggle) so nothing else has to know how theming works.
   ========================================================================== */

(function () {
  "use strict";

  var NB = (window.NB = window.NB || {});

  var ROUTES = [
    { id: "home", hash: "#/home", label: "Home", icon: "home" },
    { id: "subjects", hash: "#/subjects", label: "Subjects", icon: "layers" },
    { id: "history", hash: "#/history", label: "History", icon: "book" },
    { id: "quiz", hash: "#/quiz", label: "Quiz", icon: "quiz" },
    { id: "revision", hash: "#/revision", label: "Revision", icon: "revision" },
    { id: "progress", hash: "#/progress", label: "Progress", icon: "progress" },
    { id: "notes", hash: "#/notes", label: "My Notes", icon: "note" },
    { id: "doubts", hash: "#/doubts", label: "Doubt Desk", icon: "help" },
    { id: "settings", hash: "#/settings", label: "Settings", icon: "gear" }
  ];

  var themeButtons = [];
  var shellRefs = { header: null, bottomNav: null };

  /* ---------------------------------------------------------- theming ---- */

  var theme = {
    current: function () {
      return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    },
    apply: function (value) {
      var next = value === "dark" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      NB.storage.setTheme(next);
      refreshThemeButtons();
      return next;
    },
    toggle: function () {
      return theme.apply(theme.current() === "dark" ? "light" : "dark");
    },
    init: function () {
      var stored = NB.storage.getTheme();
      var initial = stored || NB.storage.systemTheme();
      document.documentElement.setAttribute("data-theme", initial);
      return initial;
    }
  };

  function refreshThemeButtons() {
    var helpers = NB.helpers;
    var isDark = theme.current() === "dark";
    // Prune detached buttons so repeated shell renders cannot leak refs.
    themeButtons = themeButtons.filter(function (button) {
      return button && button.parentNode && document.contains(button);
    });
    themeButtons.forEach(function (button) {
      helpers.clear(button);
      button.appendChild(helpers.icon(isDark ? "sun" : "moon", 18));
      button.setAttribute("aria-label", isDark ? "Turn on Light Mode" : "Turn on Dark Mode");
      button.setAttribute("title", isDark ? "Light Mode" : "Dark Mode");
      button.setAttribute("aria-pressed", isDark ? "true" : "false");
    });
  }

  function themeButton() {
    var helpers = NB.helpers;
    var button = helpers.el("button", {
      class: "icon-btn",
      type: "button",
      onclick: function () {
        theme.toggle();
      }
    });
    themeButtons.push(button);
    refreshThemeButtons();
    return button;
  }

  /* ----------------------------------------------------------- header ---- */

  function navLink(route, className, activeId) {
    var helpers = NB.helpers;
    var link = helpers.el("a", { class: className, href: route.hash }, [
      helpers.icon(route.icon, 16),
      helpers.el("span", { text: route.label })
    ]);
    if (route.id === activeId) link.setAttribute("aria-current", "page");
    return link;
  }

  function renderHeader(activeId) {
    var helpers = NB.helpers;
    var brand = helpers.el("a", { class: "brand", href: "#/home" }, [
      helpers.el("span", { class: "brand__mark", text: "N" }),
      helpers.el("span", { class: "brand__text" }, [
        helpers.el("span", { class: "brand__name", text: "NotesByME" }),
        helpers.el("span", { class: "brand__tag", text: "Class 10 · Social Science" })
      ])
    ]);

    var nav = helpers.el(
      "nav",
      { class: "nav", "aria-label": "Main Menu" },
      ROUTES.map(function (route) {
        return navLink(route, "nav__link", activeId);
      })
    );

    var lockButton = helpers.el(
      "button",
      {
        class: "icon-btn",
        type: "button",
        "aria-label": "Lock and go to PIN screen",
        title: "Lock",
        onclick: function () {
          NB.gate.lock();
          NB.app.showGate();
        }
      },
      [helpers.icon("lock", 18)]
    );

    return helpers.el(
      "header",
      { class: "app-header" },
      helpers.el("div", { class: "app-header__inner" }, [
        brand,
        helpers.el("div", { class: "app-header__spacer" }, null),
        nav,
        helpers.el("div", { class: "header-actions" }, [themeButton(), lockButton])
      ])
    );
  }

  function renderBottomNav(activeId) {
    var helpers = NB.helpers;
    /* Keep all 8 routes; visually compact: Home, History, Quiz, +, Progress, Notes, Doubts. */
    var compactIds = ["home", "history", "quiz", "fab", "progress", "notes", "doubts"];
    var items = compactIds.map(function (id) {
      if (id === "fab") {
        var fab = helpers.el("a", {
          class: "bottom-nav__item bottom-nav__item--fab",
          href: "#/notes",
          "aria-label": "Add a note"
        }, [
          helpers.el("span", { class: "bottom-nav__fab", "aria-hidden": "true" }, [helpers.icon("plus", 22)]),
          helpers.el("span", { class: "bottom-nav__fab-label", text: "Add" })
        ]);
        if (activeId === "notes") fab.setAttribute("aria-current", "page");
        return fab;
      }
      var route = null;
      for (var i = 0; i < ROUTES.length; i++) {
        if (ROUTES[i].id === id) { route = ROUTES[i]; break; }
      }
      if (!route) return null;
      var shortLabel = route.id === "notes" ? "Notes" : route.label;
      var link = helpers.el("a", { class: "bottom-nav__item", href: route.hash }, [
        helpers.icon(route.icon, 21),
        helpers.el("span", { text: shortLabel })
      ]);
      if (route.id === activeId) link.setAttribute("aria-current", "page");
      return link;
    }).filter(Boolean);
    return helpers.el("nav", { class: "bottom-nav", "aria-label": "Main Menu" }, items);
  }

  function markActive(container, routeId) {
    if (!container) return;
    var helpers = NB.helpers;
    var links = helpers.qsa("a[href^='#/']", container);
    links.forEach(function (link) {
      var href = link.getAttribute("href") || "";
      var id = href.replace(/^#\/?/, "");
      var active = id === routeId || href === "#/" + routeId;
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  // Patch active states without rebuilding the shell (smooth SPA nav).
  function setActive(routeId) {
    markActive(shellRefs.header, routeId);
    markActive(shellRefs.bottomNav, routeId);
  }

  function renderFooter() {
    var helpers = NB.helpers;
    var history = NB.data && NB.data.history ? NB.data.history : null;
    var note = history && history.meta ? history.meta.note : "";
    return helpers.el("footer", { class: "app-footer" }, [
      helpers.el("p", { class: "app-footer__note", text: note })
    ]);
  }

  // Called by app.js right after renderHeader/renderBottomNav so setActive()
  // can patch them on later route changes.
  function registerShell(headerEl, bottomNavEl) {
    shellRefs.header = headerEl || null;
    shellRefs.bottomNav = bottomNavEl || null;
  }

  NB.nav = {
    ROUTES: ROUTES,
    theme: theme,
    renderHeader: renderHeader,
    renderBottomNav: renderBottomNav,
    renderFooter: renderFooter,
    registerShell: registerShell,
    setActive: setActive,
    routeById: function (id) {
      return (
        ROUTES.filter(function (route) {
          return route.id === id;
        })[0] || ROUTES[0]
      );
    }
  };
})();