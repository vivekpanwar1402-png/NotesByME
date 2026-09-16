/* ==========================================================================
   NotesByME — Quiz page
   Thin wrapper around the reusable engine in js/components/quiz-card.js.
   Exposes NB.pages.quiz
   ========================================================================== */

(function () {
  "use strict";

  var NB = (window.NB = window.NB || {});
  var H = NB.helpers;

  var saved = NB.storage.getPrefs().quiz || {};
  var modes = NB.quiz.modeList();

  var state = {
    mode: modes.some(function (m) {
      return m.id === saved.mode;
    })
      ? saved.mode
      : modes[0].id,
    chapter: saved.chapter || "all",
    questions: null,
    index: 0,
    selected: null,
    score: 0,
    answeredCount: 0,
    finished: false
  };

  var refs = { area: null, mode: null, chapter: null };

  function savePrefs() {
    NB.storage.setPref("quiz", { mode: state.mode, chapter: state.chapter });
  }

  function start() {
    state.questions = NB.quiz.generateQuestions({
      mode: state.mode,
      chapter: state.chapter,
      count: NB.quiz.DEFAULT_LENGTH
    });
    state.index = 0;
    state.selected = null;
    state.score = 0;
    state.answeredCount = 0;
    state.finished = false;
    renderArea();
  }

  function onSelect(index) {
    if (state.selected !== null) return;
    var question = state.questions[state.index];
    state.selected = index;
    state.answeredCount += 1;
    if (index === question.correctIndex) state.score += 1;
    NB.storage.markReviewed(question.sourceId);
    renderArea();
  }

  function onNext() {
    if (state.index < state.questions.length - 1) {
      state.index += 1;
      state.selected = null;
      renderArea();
      return;
    }
    state.finished = true;
    NB.storage.addQuizResult({
      mode: state.mode,
      score: state.score,
      total: state.questions.length,
      chapter: state.chapter
    });
    renderArea();
  }

  /* ------------------------------------------------------------- views --- */

  function renderArea() {
    var container = H.clear(refs.area);

    if (!state.questions) {
      container.appendChild(
        NB.ui.emptyState(
          "Quiz अभी शुरू नहीं हुआ",
          "ऊपर से Mode चुनें — Date से Event, या Event से Date — और \"Quiz Start\" दबाएँ। The correct answer and a short explanation will be shown after each question।",
          null,
          null,
          "quiz"
        )
      );
      return;
    }

    if (state.finished) {
      container.appendChild(
        NB.quiz.resultCard(state, {
          onRetry: start,
          onSwitchMode: function () {
            state.mode = state.mode === modes[0].id ? modes[1].id : modes[0].id;
            savePrefs();
            syncControls();
            start();
          }
        })
      );
      return;
    }

    container.appendChild(NB.quiz.questionCard(state, { onSelect: onSelect, onNext: onNext }));
  }

  function modeToggle() {
    var row = H.el(
      "div",
      { class: "segmented segmented--block", role: "group", "aria-label": "Quiz Mode" },
      modes.map(function (mode) {
        var active = state.mode === mode.id;
        return H.el("button", {
          class: "segmented__btn" + (active ? " is-active" : ""),
          type: "button",
          text: mode.label,
          dataset: { mode: mode.id },
          "aria-pressed": active ? "true" : "false",
          onclick: function () {
            state.mode = mode.id;
            savePrefs();
            syncControls();
            start();
          }
        });
      })
    );
    refs.mode = row;
    return row;
  }

  function chapterSelect() {
    var options = [{ id: "all", number: "", title: "All Chapter" }].concat(
      NB.data.history.chapters
    );

    var select = H.el(
      "select",
      {
        class: "select",
        id: "quiz-chapter",
        "aria-label": "Quiz का Chapter चुनें",
        onchange: function () {
          state.chapter = select.value;
          savePrefs();
          start();
        }
      },
      options.map(function (chapter) {
        return H.el("option", {
          value: chapter.id,
          text: chapter.number
            ? "Chapter " + chapter.number + " · " + chapter.title
            : chapter.title,
          selected: state.chapter === chapter.id ? true : null
        });
      })
    );

    refs.chapter = select;
    return H.el("div", { class: "field" }, [
      H.el("label", { class: "field__label", for: "quiz-chapter", text: "Chapter" }),
      select
    ]);
  }

  function syncControls() {
    if (refs.mode) {
      H.qsa(".segmented__btn", refs.mode).forEach(function (button) {
        var active = button.dataset.mode === state.mode;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });
    }
    if (refs.chapter) refs.chapter.value = state.chapter;
  }

  /* -------------------------------------------------------------- page --- */

  function render(root) {
    var setup = H.el("div", { class: "card" }, [
      NB.ui.sectionTitle("Quiz सेटअप", "quiz"),
      H.el("p", {
        class: "card__text",
        text:
          NB.quiz.DEFAULT_LENGTH +
          " Questions · " +
          NB.quiz.OPTION_COUNT +
          " Options · Instant feedback on every answer। Mode या Chapter बदलते ही नया Quiz शुरू हो जाएगा।"
      }),
      modeToggle(),
      chapterSelect(),
      H.el("button", { class: "btn btn--primary btn--lg", type: "button", onclick: start }, [
        H.el("span", { class: "btn__label" }, [H.icon("arrowRight", 17), "Quiz Start"])
      ])
    ]);

    refs.area = H.el("div", { class: "stack" });

    root.appendChild(
      H.el("div", { class: "page" }, [
        H.el("div", { class: "page-head" }, [
          H.el("p", { class: "page-head__eyebrow", text: "Practice · History" }),
          H.el("h1", { class: "page-head__title", text: "Quiz" }),
          H.el("p", {
            class: "page-head__sub",
            text:
              "Practice based on history dates। सही उत्तर चुनकर अपनी तैयारी जाँचें — स्कोर Progress पेज में अपने आप जुड़ जाएगा।"
          })
        ]),
        setup,
        refs.area
      ])
    );

    syncControls();
    renderArea();
  }

  NB.pages = NB.pages || {};
  NB.pages.quiz = { render: render };
})();