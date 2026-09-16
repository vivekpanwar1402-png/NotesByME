/* ==========================================================================
   NotesByME — Home page (Vertical Card Stack glassmorphism design)
   Exposes NB.pages.home
   ========================================================================== */

(function () {
  "use strict";

  var NB = (window.NB = window.NB || {});
  var H = NB.helpers;

  function go(routeId) {
    window.location.hash = NB.nav.routeById(routeId).hash;
  }

  function formatDate(date) {
    var options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    return date.toLocaleDateString("en-US", options);
  }

  function formatTime(date) {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  }

  function getMotivationalLine() {
    var lines = [
      "Every small step counts toward your goal.",
      "Consistency beats intensity. Keep going.",
      "Your future self will thank you for today's effort.",
      "Progress, not perfection. One day at a time.",
      "The expert was once a beginner. Keep learning.",
      "Small daily improvements create big results.",
      "Study today so you can shine tomorrow.",
      "Discipline is the bridge between goals and achievement."
    ];
    var dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    return lines[dayOfYear % lines.length];
  }

  function getRecentStudyContext() {
    var reviewedMap = (NB.storage && NB.storage.reviewedMap) ? NB.storage.reviewedMap() : {};
    var reviewedIds = Object.keys(reviewedMap || {});
    var dates = (NB.data && NB.data.history && NB.data.history.dates) ? NB.data.history.dates : [];

    if (!reviewedIds.length) {
      return {
        hasProgress: false,
        message: "Start your journey by reviewing your first history date.",
        actionLabel: "Begin with History",
        actionRoute: "history"
      };
    }

    var recentReviewed = reviewedIds
      .map(function (id) {
        var entry = reviewedMap[id] || {};
        return { id: id, lastAt: entry.lastAt || entry.at || null };
      })
      .sort(function (a, b) {
        var aTime = a.lastAt ? new Date(a.lastAt).getTime() : 0;
        var bTime = b.lastAt ? new Date(b.lastAt).getTime() : 0;
        return bTime - aTime;
      })[0];

    var recentDate = dates.filter(function (d) {
      return d.id === recentReviewed.id;
    })[0] || null;

    /* Reviewed entry may point to removed data — fall back to the start state. */
    if (!recentDate) {
      return {
        hasProgress: false,
        message: "Start your journey by reviewing your first history date.",
        actionLabel: "Begin with History",
        actionRoute: "history"
      };
    }

    var quizStats = (NB.storage && NB.storage.quizStats)
      ? NB.storage.quizStats()
      : { attempts: 0, last: null };
    var quizText = (quizStats.attempts > 0 && quizStats.last)
      ? "Last quiz: " + quizStats.last.score + "/" + quizStats.last.total
      : "Take a quiz to test your knowledge.";

    return {
      hasProgress: true,
      recentDate: recentDate,
      reviewedCount: reviewedIds.length,
      totalDates: dates.length,
      quizText: quizText,
      actionLabel: "Continue History",
      actionRoute: "history"
    };
  }

  function renderHomeHero(onSearch) {
    return H.el("section", { class: "home-hero", "aria-label": "NotesByME home header" }, [
      H.el("div", { class: "home-hero__text" }, [
        H.el("h1", { class: "home-hero__title", text: "NotesByME" }),
        H.el("p", { class: "home-hero__sub", text: "Class 10 · Social Science" })
      ]),
      H.el("button", {
        class: "home-hero__search",
        type: "button",
        "aria-label": "Search history dates",
        title: "Search",
        onclick: onSearch
      }, [H.icon("search", 19)])
    ]);
  }

  function renderTodayCard() {
    var now = new Date();
    var dateStr = formatDate(now);
    var timeStr = formatTime(now);
    var motivation = getMotivationalLine();
    var weekday = now.toLocaleDateString("en-US", { weekday: "long" });

    return H.el("button", {
      class: "card home-glass home-today",
      type: "button",
      "data-accent": "blue",
      "aria-label": "Today, " + dateStr + ". Open History.",
      onclick: function () { go("history"); }
    }, [
      H.el("span", { class: "home-today__icon", "aria-hidden": "true" }, [H.icon("calendarCheck", 24)]),
      H.el("span", { class: "home-today__body" }, [
        H.el("span", { class: "home-today__eyebrow" }, [
          H.el("span", { text: "Today" }),
          H.el("span", { class: "home-today__dot", "aria-hidden": "true", text: "·" }),
          H.el("span", { text: weekday, "data-home-weekday": "1" })
        ]),
        H.el("span", { class: "home-today__date", text: dateStr, "data-home-date": "1" }),
        H.el("span", { class: "home-today__time-row" }, [
          H.el("span", { class: "home-today__time mono", text: timeStr, "data-home-time": "1" }),
          H.el("span", { class: "home-today__motive", text: motivation })
        ])
      ]),
      H.el("span", { class: "home-glass__chevron", "aria-hidden": "true" }, [H.icon("chevronRight", 20)])
    ]);
  }

  function renderAskDoubtCard() {
    return H.el("button", {
      class: "card home-glass home-ask",
      type: "button",
      "data-accent": "purple",
      "aria-label": "Ask a Doubt - open Doubt Desk",
      onclick: function () {
        go("doubts");
      }
    }, [
      H.el("span", { class: "home-ask__icon", "aria-hidden": "true" }, [H.icon("help", 24)]),
      H.el("span", { class: "home-glass__body" }, [
        H.el("span", { class: "home-glass__title", text: "Ask a Doubt" }),
        H.el("span", { class: "home-glass__sub", text: "Stuck on a topic? Save it in the Doubt Desk." })
      ]),
      H.el("span", { class: "home-glass__chevron", "aria-hidden": "true" }, [H.icon("chevronRight", 20)])
    ]);
  }

  function renderContinueStudyingCard() {
    var context = getRecentStudyContext();
    var accent = context.hasProgress ? "green" : "cyan";
    var pct = context.totalDates > 0
      ? Math.round((context.reviewedCount / context.totalDates) * 100) : 0;
    var ring = 2 * Math.PI * 15.5;
    var off = ring * (1 - Math.min(100, Math.max(0, pct)) / 100);
    var statusLine = context.hasProgress
      ? ("Reviewed " + context.reviewedCount + " of " + context.totalDates + " dates")
      : context.message;
    var titleLine = (context.hasProgress && context.recentDate && context.recentDate.event)
      ? (context.recentDate.event + " (" + context.recentDate.date + ")")
      : context.actionLabel;
    var ringNode = null;
    if (context.hasProgress) {
      ringNode = H.el("span", { class: "home-continue__ringwrap", "aria-hidden": "true" }, [
        H.el("span", { class: "home-continue__pct mono", text: pct + "%" })
      ]);
      try {
        var NS = "http://www.w3.org/2000/svg";
        var svg = document.createElementNS(NS, "svg");
        svg.setAttribute("viewBox", "0 0 40 40");
        svg.setAttribute("class", "home-continue__ringsvg");
        var bg = document.createElementNS(NS, "circle");
        bg.setAttribute("cx", "20"); bg.setAttribute("cy", "20"); bg.setAttribute("r", "15.5");
        bg.setAttribute("fill", "none");
        bg.setAttribute("stroke", "rgba(255,255,255,0.28)");
        bg.setAttribute("stroke-width", "4.5");
        var fg = document.createElementNS(NS, "circle");
        fg.setAttribute("cx", "20"); fg.setAttribute("cy", "20"); fg.setAttribute("r", "15.5");
        fg.setAttribute("fill", "none");
        fg.setAttribute("stroke", "#34d399");
        fg.setAttribute("stroke-width", "4.5");
        fg.setAttribute("stroke-linecap", "round");
        fg.setAttribute("stroke-dasharray", String(ring));
        fg.setAttribute("stroke-dashoffset", String(off));
        fg.setAttribute("transform", "rotate(-90 20 20)");
        svg.appendChild(bg);
        svg.appendChild(fg);
        ringNode.insertBefore(svg, ringNode.firstChild);
      } catch (e) { /* label-only ring */ }
    }

    return H.el("button", {
      class: "card home-glass home-continue",
      type: "button",
      "data-accent": accent,
      "aria-label": "Continue Studying - " + context.actionLabel,
      onclick: function () { go(context.actionRoute); }
    }, [
      ringNode,
      H.el("span", { class: "home-glass__body" }, [
        H.el("span", { class: "home-glass__eyebrow", text: "Continue Studying" }),
        H.el("span", { class: "home-glass__title home-glass__title--sm", text: titleLine }),
        H.el("span", { class: "home-glass__sub", text: statusLine })
      ]),
      H.el("span", { class: "home-glass__chevron", "aria-hidden": "true" }, [H.icon("chevronRight", 20)])
    ]);
  }

  function renderMotivationCard() {
    var quote = getMotivationalLine();
    return H.el("section", {
      class: "card home-glass home-quote",
      "data-accent": "pink",
      "aria-label": "Motivation"
    }, [
      H.el("span", { class: "home-quote__icon", "aria-hidden": "true" }, [H.icon("bulb", 22)]),
      H.el("span", { class: "home-glass__body" }, [
        H.el("span", { class: "home-glass__eyebrow", text: "Keep going" }),
        H.el("span", { class: "home-quote__text", text: "\u201C" + quote + "\u201D" })
      ])
    ]);
  }

  function goHistorySearch() {
    go("history");
    window.setTimeout(function () {
      var input = document.querySelector(".toolbar [type='search'], input[type='search']");
      if (input && input.focus) {
        try { input.focus({ preventScroll: false }); } catch (e) { input.focus(); }
        if (input.scrollIntoView) { try { input.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) {} }
      }
    }, 180);
  }

  function renderQuickActions() {
    var actions = [
      { icon: "book", title: "History", tint: "blue", route: "history" },
      { icon: "quiz", title: "Quiz", tint: "purple", route: "quiz" },
      { icon: "revision", title: "Revision", tint: "cyan", route: "revision" },
      { icon: "progress", title: "Progress", tint: "green", route: "progress" },
      { icon: "note", title: "My Notes", tint: "pink", route: "notes" },
      { icon: "help", title: "Doubts", tint: "cyan", route: "doubts" },
      { icon: "gear", title: "Settings", tint: "blue", route: "settings" }
    ];

    var tiles = actions.map(function (action) {
      return H.el("button", {
        class: "home-qa home-qa--" + action.tint,
        type: "button",
        "aria-label": action.title,
        onclick: function () { go(action.route); }
      }, [
        H.el("span", { class: "home-qa__icon", "aria-hidden": "true" }, [H.icon(action.icon, 20)]),
        H.el("span", { class: "home-qa__label", text: action.title })
      ]);
    });

    return H.el("section", { class: "home-quick", "aria-label": "Quick Actions" }, [
      H.el("h2", { class: "home-section-title", text: "Quick Actions" }),
      H.el("div", { class: "home-quick__grid" }, tiles)
    ]);
  }

  function render(root) {
    var page = H.el("div", { class: "page home-stack" }, [
      renderHomeHero(goHistorySearch),
      renderTodayCard(),
      renderAskDoubtCard(),
      renderContinueStudyingCard(),
      renderQuickActions(),
      renderMotivationCard()
    ]);

    root.appendChild(page);

    var timeInterval = setInterval(function () {
      var now = new Date();
      var timeEl = root.querySelector("[data-home-time]");
      var dateEl = root.querySelector("[data-home-date]");
      var dayEl = root.querySelector("[data-home-weekday]");
      if (!timeEl && !dateEl && !dayEl) {
        clearInterval(timeInterval);
        return;
      }
      if (timeEl) timeEl.textContent = formatTime(now);
      if (dateEl) dateEl.textContent = formatDate(now);
      if (dayEl) dayEl.textContent = now.toLocaleDateString("en-US", { weekday: "long" });
    }, 30000);

    // Cleanup on navigation away
    window.addEventListener("hashchange", function cleanup() {
      clearInterval(timeInterval);
      window.removeEventListener("hashchange", cleanup);
    }, { once: true });
  }

  NB.pages = NB.pages || {};
  NB.pages.home = { render: render };
})();