/* ==========================================================================
   NotesByME — History Dates page
   Chapter / importance / text filtering + cards & timeline views.
   Filter state is remembered in localStorage (via NB.storage prefs).
   Exposes NB.pages.history
   ========================================================================== */

(function () {
  "use strict";

  var NB = (window.NB = window.NB || {});
  var H = NB.helpers;

  var DEFAULT_FILTERS = { query: "", chapter: "all", importance: "all", view: "cards" };
  var saved = NB.storage.getPrefs().historyFilters || {};

  var state = {
    query: saved.query || DEFAULT_FILTERS.query,
    chapter: saved.chapter || DEFAULT_FILTERS.chapter,
    importance: saved.importance || DEFAULT_FILTERS.importance,
    view: saved.view || DEFAULT_FILTERS.view
  };

  var refs = {
    results: null,
    count: null,
    reset: null,
    search: null,
    clearSearch: null,
    chips: null,
    levels: null,
    views: null
  };

  function saveFilters() {
    NB.storage.setPref("historyFilters", {
      query: state.query,
      chapter: state.chapter,
      importance: state.importance,
      view: state.view
    });
  }

  function allDates() {
    return NB.data && NB.data.history ? NB.data.history.dates : [];
  }

  function results() {
    return H.filterDates(allDates(), state);
  }

  function isFiltered() {
    return Boolean(state.query) || state.chapter !== "all" || state.importance !== "all";
  }

  /* ------------------------------------------------------- result area --- */

  function openRecord(record) {
    NB.cards.openDetail(record, { onReviewed: renderResults });
  }

  function renderResults() {
    var list = results();
    var container = H.clear(refs.results);

    refs.count.textContent = isFiltered()
      ? list.length + " तिथियाँ मिलीं"
      : "कुल " + list.length + " तिथियाँ";
    refs.reset.hidden = !isFiltered();

    if (!list.length) {
      container.appendChild(
        NB.ui.emptyState(
          "कोई तिथि नहीं मिली",
          "खोज शब्द बदलें या फ़िल्टर हटाकर दोबारा देखें। उदाहरण: 1919, गांधीजी, नमक, असहयोग।",
          "फ़िल्टर हटाएँ",
          resetFilters,
          "search"
        )
      );
      return;
    }

    if (state.view === "timeline") {
      container.appendChild(NB.timeline.render(list, { onOpen: openRecord }));
      return;
    }

    container.appendChild(
      H.el(
        "div",
        { class: "card-grid card-grid--dates" },
        list.map(function (item) {
          return NB.cards.dateCard(item, { onOpen: openRecord });
        })
      )
    );
  }

  function resetFilters() {
    state.query = DEFAULT_FILTERS.query;
    state.chapter = DEFAULT_FILTERS.chapter;
    state.importance = DEFAULT_FILTERS.importance;
    saveFilters();
    if (refs.search) refs.search.value = "";
    if (refs.clearSearch) refs.clearSearch.hidden = true;
    syncControls();
    renderResults();
  }

  function syncControls() {
    if (refs.chips) {
      H.qsa(".chip", refs.chips).forEach(function (chip) {
        var active = chip.dataset.chapter === state.chapter;
        chip.classList.toggle("is-active", active);
        chip.setAttribute("aria-pressed", active ? "true" : "false");
      });
    }

    function syncGroup(container, dataKey, value) {
      if (!container) return;
      H.qsa(".segmented__btn", container).forEach(function (button) {
        var active = button.dataset[dataKey] === value;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });
    }

    syncGroup(refs.levels, "importance", state.importance);
    syncGroup(refs.views, "view", state.view);
  }

  /* ---------------------------------------------------------- controls --- */

  function searchField() {
    var helpers = H;
    var clear = helpers.el("button", {
      class: "input-clear",
      type: "button",
      "aria-label": "खोज साफ़ करें",
      hidden: true,
      onclick: function () {
        field.value = "";
        state.query = "";
        clear.hidden = true;
        saveFilters();
        renderResults();
        field.focus();
      }
    });
    clear.appendChild(helpers.icon("close", 16));

    var field = helpers.el("input", {
      class: "input input--with-icon",
      type: "search",
      id: "history-search",
      placeholder: "तिथि, घटना या शब्द खोजें… (जैसे: 1919, नमक)",
      "aria-label": "तिथियाँ खोजें",
      value: state.query,
      oninput: function () {
        state.query = field.value;
        clear.hidden = !field.value;
        saveFilters();
        renderResults();
      }
    });

    refs.search = field;
    refs.clearSearch = clear;

    return helpers.el("div", { class: "field toolbar__grow" }, [
      helpers.el("label", { class: "field__label", for: "history-search", text: "खोज" }),
      helpers.el("div", { class: "input-wrap" }, [
        helpers.el("span", { class: "input-wrap__icon" }, [helpers.icon("search", 17)]),
        field,
        clear
      ])
    ]);
  }

  function chapterChips() {
    var chapters = NB.data.history.chapters;
    var counts = H.countBy(allDates(), "chapter");
    var row = H.el("div", { class: "chips", role: "group", "aria-label": "अध्याय चुनें" }, [
      H.el(
        "button",
        {
          class: "chip" + (state.chapter === "all" ? " is-active" : ""),
          type: "button",
          dataset: { chapter: "all" },
          "aria-pressed": state.chapter === "all" ? "true" : "false",
          onclick: function () {
            state.chapter = "all";
            saveFilters();
            syncControls();
            renderResults();
          }
        },
        [H.el("span", { text: "सभी अध्याय" }), H.el("span", { class: "chip__count", text: String(allDates().length) })]
      )
    ]);

    chapters.forEach(function (chapter) {
      var active = state.chapter === chapter.id;
      row.appendChild(
        H.el(
          "button",
          {
            class: "chip" + (active ? " is-active" : ""),
            type: "button",
            dataset: { chapter: chapter.id },
            "aria-pressed": active ? "true" : "false",
            onclick: function () {
              state.chapter = chapter.id;
              saveFilters();
              syncControls();
              renderResults();
            }
          },
          [
            H.el("span", { text: "अध्याय " + chapter.number }),
            H.el("span", { class: "chip__count", text: String(counts[chapter.id] || 0) })
          ]
        )
      );
    });

    refs.chips = row;
    return row;
  }

  function importanceToggle() {
    var options = [{ key: "all", label: "सभी" }].concat(
      H.IMPORTANCE_ORDER.map(function (key) {
        return { key: key, label: H.importance(key).short };
      })
    );

    var row = H.el(
      "div",
      { class: "segmented", role: "group", "aria-label": "महत्व के अनुसार छाँटें" },
      options.map(function (option) {
        var active = state.importance === option.key;
        return H.el("button", {
          class: "segmented__btn" + (active ? " is-active" : ""),
          type: "button",
          text: option.label,
          dataset: { importance: option.key },
          "aria-pressed": active ? "true" : "false",
          onclick: function () {
            state.importance = option.key;
            saveFilters();
            syncControls();
            renderResults();
          }
        });
      })
    );

    refs.levels = row;
    return row;
  }

  function viewToggle() {
    var options = [
      { key: "cards", label: "कार्ड", icon: "layers" },
      { key: "timeline", label: "समयरेखा", icon: "progress" }
    ];

    var row = H.el(
      "div",
      { class: "segmented", role: "group", "aria-label": "देखने का तरीका" },
      options.map(function (option) {
        var active = state.view === option.key;
        return H.el(
          "button",
          {
            class: "segmented__btn" + (active ? " is-active" : ""),
            type: "button",
            dataset: { view: option.key },
            "aria-pressed": active ? "true" : "false",
            onclick: function () {
              state.view = option.key;
              saveFilters();
              syncControls();
              renderResults();
            }
          },
          [H.icon(option.icon, 15), H.el("span", { text: option.label })]
        );
      })
    );

    refs.views = row;
    return row;
  }

  /* -------------------------------------------------------------- page --- */

  function render(root) {
    var helpers = H;
    var meta = NB.data.history.meta;
    var total = allDates().length;
    var mustCount = H.filterDates(allDates(), { importance: "must" }).length;

    refs.results = helpers.el("div", { class: "stack" });
    refs.count = helpers.el("p", { class: "section-sub", "aria-live": "polite" });
    refs.reset = helpers.el("button", {
      class: "btn btn--ghost btn--sm",
      type: "button",
      hidden: true,
      text: "फ़िल्टर हटाएँ",
      onclick: resetFilters
    });

    var summary =
      meta.sourceBook +
      " · कुल " +
      total +
      " तिथियाँ · अवश्य याद रखें: " +
      mustCount +
      "। खोजें, छाँटें और किसी भी तिथि पर टैप करके विवरण देखें।";

    var page = helpers.el("div", { class: "page" }, [
      helpers.el("div", { class: "page-head" }, [
        helpers.el("p", { class: "page-head__eyebrow", text: "इतिहास · कक्षा 10" }),
        helpers.el("h1", { class: "page-head__title", text: "महत्वपूर्ण तिथियाँ" }),
        helpers.el("p", { class: "page-head__sub", text: summary })
      ]),
      helpers.el("div", { class: "toolbar" }, [
        searchField(),
        helpers.el("div", { class: "toolbar__row toolbar__side" }, [
          importanceToggle(),
          viewToggle()
        ])
      ]),
      helpers.el("div", { class: "stack" }, [
        chapterChips(),
        helpers.el("div", { class: "section-head" }, [refs.count, refs.reset])
      ]),
      refs.results
    ]);

    root.appendChild(page);
    syncControls();
    renderResults();
  }

  NB.pages = NB.pages || {};
  NB.pages.history = {
    render: render,
    resetFilters: resetFilters
  };
})();