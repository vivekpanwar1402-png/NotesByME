/* ==========================================================================
   NotesByME — Quick Revision (lightweight flashcards)
   Reuses the history dataset; marks a date as reviewed when its answer is
   revealed. The advanced spaced-repetition system is intentionally NOT part
   of this batch. Exposes NB.pages.revision
   ========================================================================== */

(function () {
  "use strict";

  var NB = (window.NB = window.NB || {});
  var H = NB.helpers;

  var LEVELS = [
    { id: "must", label: "अवश्य याद रखें", values: ["must"] },
    { id: "must-important", label: "अवश्य + महत्वपूर्ण", values: ["must", "important"] }
  ];

  var state = { level: LEVELS[0].id, deck: [], index: 0, revealed: false, rounds: 0 };
  var refs = { level: null, card: null, counter: null };

  function levelInfo() {
    return (
      LEVELS.filter(function (level) {
        return level.id === state.level;
      })[0] || LEVELS[0]
    );
  }

  function buildDeck() {
    var level = levelInfo();
    var pool = NB.data.history.dates.filter(function (item) {
      return level.values.indexOf(item.importance) !== -1;
    });
    state.deck = H.shuffle(pool);
    state.index = 0;
    state.revealed = false;
  }

  function current() {
    return state.deck[state.index] || null;
  }

  function next() {
    state.revealed = false;
    state.index += 1;
    if (state.index >= state.deck.length) state.rounds += 1;
    renderCard();
  }

  function reveal() {
    var item = current();
    if (!item || state.revealed) return;
    state.revealed = true;
    NB.storage.markReviewed(item.id);
    renderCard();
  }

  /* ------------------------------------------------------------- views --- */

  function frontFace(item) {
    return H.el("div", { class: "flashcard__front" }, [
      H.el("span", { class: "flashcard__label", text: "इस Date को What happened था?" }),
      H.el("p", { class: "flashcard__date", text: item.date }),
      H.el("span", { class: "badge badge--neutral", text: "Chapter " + NB.cards.chapterNumber(item.chapter) }),
      H.el(
        "button",
        {
          class: "btn btn--primary btn--lg",
          type: "button",
          onclick: reveal
        },
        [H.el("span", { class: "btn__label" }, [H.icon("eye", 17), "View answer"])]
      )
    ]);
  }

  function answerFace(item) {
    return H.el("div", { class: "flashcard__front" }, [
      H.el("div", { class: "flashcard__answer" }, [
        H.el("p", { class: "flashcard__event", text: item.event }),
        H.el("p", { class: "flashcard__note", text: item.shortExplanation })
      ]),
      H.el("div", { class: "flashcard__actions" }, [
        H.el("button", { class: "btn btn--ghost", type: "button", onclick: renderCard }, [
          H.el("span", { class: "btn__label" }, [H.icon("eye", 16), "View again"])
        ]),
        H.el("button", { class: "btn btn--primary", type: "button", onclick: next }, [
          H.el("span", { class: "btn__label" }, [
            H.el("span", { text: "अगली तिथि" }),
            H.icon("arrowRight", 16)
          ])
        ])
      ])
    ]);
  }

  function completionCard() {
    return H.el("div", { class: "card" }, [
      NB.ui.emptyState(
        "Session complete!",
        state.rounds > 0
          ? "You went through this deck " + (state.rounds + 1) + " times। Get a new orderेकर फिर से Start या Quiz में अपनी तैयारी जाँचें।"
          : "Good job! डेक दोबारा Start या Quiz देकर अपनी तैयारी जाँचें।",
        "फिर से Start",
        function () {
          buildDeck();
          renderCard();
        },
        "trophy"
      )
    ]);
  }

  function renderCard() {
    var container = H.clear(refs.card);
    var item = current();

    refs.counter.textContent =
      state.deck.length
        ? "तिथि " + Math.min(state.index + 1, state.deck.length) + " / " + state.deck.length
        : "कोई तिथि नहीं";

    if (!item) {
      container.appendChild(completionCard());
      return;
    }

    var card = H.el("div", { class: "flashcard" }, [
      H.el("div", { class: "flashcard__top" }, [
        refs.counter,
        NB.cards.importanceBadge(item.importance)
      ]),
      state.revealed ? answerFace(item) : frontFace(item)
    ]);

    container.appendChild(card);
  }

  function levelToggle() {
    var row = H.el(
      "div",
      { class: "segmented", role: "group", "aria-label": "Revision का स्तर" },
      LEVELS.map(function (level) {
        var active = state.level === level.id;
        return H.el("button", {
          class: "segmented__btn" + (active ? " is-active" : ""),
          type: "button",
          text: level.label,
          dataset: { level: level.id },
          "aria-pressed": active ? "true" : "false",
          onclick: function () {
            state.level = level.id;
            buildDeck();
            syncControls();
            renderCard();
          }
        });
      })
    );
    refs.level = row;
    return row;
  }

  function syncControls() {
    if (!refs.level) return;
    H.qsa(".segmented__btn", refs.level).forEach(function (button) {
      var active = button.dataset.level === state.level;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function onKeydown(event) {
    if (window.location.hash.indexOf("revision") === -1) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    if (event.key === " " || event.key === "Enter") {
      var item = current();
      if (!item) return;
      event.preventDefault();
      if (state.revealed) next();
      else reveal();
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      next();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      state.revealed = false;
      renderCard();
    }
  }

  function render(root) {
    var level = levelInfo();
    var available = NB.data.history.dates.filter(function (item) {
      return level.values.indexOf(item.importance) !== -1;
    }).length;

    refs.counter = H.el("span", { class: "num" });
    refs.card = H.el("div", { class: "stack" });

    buildDeck();

    var shuffleButton = H.el(
      "button",
      {
        class: "btn btn--secondary",
        type: "button",
        onclick: function () {
          buildDeck();
          renderCard();
        }
      },
      [H.el("span", { class: "btn__label" }, [H.icon("shuffle", 16), "Shuffle"])]
    );

    document.removeEventListener("keydown", onKeydown);
    document.addEventListener("keydown", onKeydown);

    root.appendChild(
      H.el("div", { class: "page" }, [
        H.el("div", { class: "page-head" }, [
          H.el("p", { class: "page-head__eyebrow", text: "तेज़ revision · इतिहास" }),
          H.el("h1", { class: "page-head__title", text: "Revision" }),
          H.el("p", {
            class: "page-head__sub",
            text:
              "कुल " +
              available +
              " dates are in this level। Date देखकर Event याद करें, फिर Check yourself by viewing the answer। उत्तर देखने पर वह तिथि Progress में Reviewed दर्ज हो जाएगी।"
          })
        ]),
        H.el("div", { class: "row-flex" }, [levelToggle(), shuffleButton]),
        refs.card
      ])
    );

    syncControls();
    renderCard();
  }

  NB.pages = NB.pages || {};
  NB.pages.revision = { render: render, buildDeck: buildDeck };
})();