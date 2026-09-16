/* ==========================================================================
   NotesByME — Home dashboard
   The most prominent action is History Dates, as required by the brief.
   Exposes NB.pages.home
   ========================================================================== */

(function () {
  "use strict";

  var NB = (window.NB = window.NB || {});
  var H = NB.helpers;

  function go(routeId) {
    window.location.hash = NB.nav.routeById(routeId).hash;
  }

  function heroStat(value, label) {
    return H.el("span", { class: "hero__stat" }, [
      H.el("b", { text: String(value) }),
      H.el("span", { text: label })
    ]);
  }

  function featureCard(stats) {
    return H.el("div", { class: "card card--feature" }, [
      H.el("span", { class: "card__icon" }, [H.icon("book", 20)]),
      H.el("h2", { class: "card__title", text: "History — Important Dates" }),
      H.el("p", {
        class: "card__text",
        text:
          stats.total +
          " verified dates, from all 5 chapters. Search, filter, view in timeline, and read exam-focused details for every date."
      }),
      H.el("div", { class: "card__meta" }, [
        NB.cards.importanceBadge("must"),
        H.el("span", { text: "Must Remember: " + stats.must })
      ]),
      H.el("div", { class: "row-flex" }, [
        H.el(
          "button",
          {
            class: "btn btn--primary btn--lg",
            type: "button",
            onclick: function () {
              go("history");
            }
          },
          [H.el("span", { class: "btn__label" }, [H.icon("book", 17), "Start Studying"])]
        ),
        H.el("span", {
          class: "text-sm text-subtle",
          text: stats.reviewed + " dates reviewed so far"
        })
      ])
    ]);
  }

  function render(root) {
    var dates = NB.data.history.dates;
    var stats = {
      total: dates.length,
      must: H.filterDates(dates, { importance: "must" }).length,
      reviewed: NB.storage.reviewedCount(),
      quiz: NB.storage.quizStats()
    };

    var hero = H.el("section", { class: "hero" }, [
      H.el("span", { class: "hero__eyebrow" }, [
        H.icon("cap", 14),
        H.el("span", { text: "Class 10 · Social Science · UBSE" })
      ]),
      H.el("h1", { class: "hero__title", text: "Hello! Let's start studying today" }),
      H.el("p", {
        class: "hero__text",
        text:
          "Learn important history dates, test your preparation with quizzes, and track your progress. Even 15–20 minutes of study daily makes a big difference."
      }),
      H.el("div", { class: "hero__stats" }, [
        heroStat(stats.total, "Total Dates"),
        heroStat(stats.must, "Must Remember"),
        heroStat(stats.reviewed, "Reviewed"),
        heroStat(stats.quiz.attempts, "Quiz Attempts")
      ])
    ]);

    var tiles = H.el("div", { class: "card-grid" }, [
      NB.ui.actionCard({
        icon: "quiz",
        title: "Quiz",
        text: "5 questions in both modes — Date → Event and Event → Date. Instant feedback and score.",
        meta: stats.quiz.attempts ? "Average Score: " + stats.quiz.averagePercent + "%" : "Not started yet",
        onClick: function () {
          go("quiz");
        }
      }),
      NB.ui.actionCard({
        icon: "revision",
        accent: true,
        title: "Revision",
        text: "Revise must-remember dates in quick flashcard sessions.",
        meta: "5-minute quick revision",
        onClick: function () {
          go("revision");
        }
      }),
      NB.ui.actionCard({
        icon: "progress",
        title: "Progress",
        text: "How many dates you've reviewed and how you're scoring in quizzes — all in one place.",
        meta: "Your preparation summary",
        onClick: function () {
          go("progress");
        }
      })
    ]);

    var progressSection = H.el("section", { class: "card" }, [
      NB.ui.sectionTitle("Your Progress", "progress"),
      NB.ui.progressBar(
        stats.reviewed,
        stats.total,
        "Dates Reviewed",
        stats.reviewed + " / " + stats.total
      ),
      H.el("p", {
        class: "text-sm text-subtle",
        text:
          stats.quiz.attempts > 0
              ? "Last quiz score: " + stats.quiz.last.score + " / " + stats.quiz.last.total
              : "Take your first quiz to start tracking progress."
      })
    ]);

    var coming = H.el("section", { class: "section" }, [
      NB.ui.sectionTitle("Coming Soon", "sparkle"),
      H.el("p", {
        class: "section-sub",
        text: "These modules will be added in future updates. They are not available yet, so they are shown as info cards, not buttons."
      }),
      H.el("div", { class: "coming-grid" }, [
        NB.ui.comingSoonCard("Geography", "Notes and dates on resources, agriculture, minerals, and manufacturing industries.", "mapPin"),
        NB.ui.comingSoonCard("Civics", "Questions on power sharing, federalism, and political parties.", "users"),
        NB.ui.comingSoonCard("Economics", "Simple notes on development, sectors, and money-credit.", "trend"),
        NB.ui.comingSoonCard("Daily Notes", "A short daily lesson and target.", "file"),
        NB.ui.comingSoonCard("Map Practice", "Practice filling and identifying maps.", "map"),
        NB.ui.comingSoonCard("Answer Writing", "How to write exam-scoring answers.", "pen"),
        NB.ui.comingSoonCard("Mock Test", "Timed practice on the full syllabus.", "clipboard"),
        NB.ui.comingSoonCard("90+ Mission", "Target-based planning and revision schedule.", "target")
      ])
    ]);

    root.appendChild(
      H.el("div", { class: "page" }, [
        hero,
        H.el("section", { class: "section" }, [
          NB.ui.sectionTitle("Main Study Modules", "book"),
          featureCard(stats)
        ]),
        H.el("section", { class: "section" }, [
          NB.ui.sectionTitle("What Else You Can Do", "layers"),
          tiles
        ]),
        progressSection,
        coming
      ])
    );
  }

  NB.pages = NB.pages || {};
  NB.pages.home = { render: render };
})();