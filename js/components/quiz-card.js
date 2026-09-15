/* ==========================================================================
   NotesByME — Quiz engine (single engine, two question-generation modes)
   --------------------------------------------------------------------------
   Modes:
     "date-to-event" : तारीख दी है -> सही घटना चुनें
     "event-to-date" : घटना दी है -> सही तारीख चुनें
   The engine only reads NB.data.history.dates, so expanding the dataset
   automatically expands the quiz. Exposes NB.quiz
   ========================================================================== */

(function () {
  "use strict";

  var NB = (window.NB = window.NB || {});
  var H = NB.helpers;

  var MODES = {
    "date-to-event": {
      id: "date-to-event",
      label: "तारीख → घटना",
      questionField: "date",
      answerField: "event",
      prompt: "इस तारीख से जुड़ी सही घटना कौन-सी है?",
      answerHint: "सही घटना चुनें"
    },
    "event-to-date": {
      id: "event-to-date",
      label: "घटना → तारीख",
      questionField: "event",
      answerField: "date",
      prompt: "यह घटना कब हुई थी?",
      answerHint: "सही तारीख चुनें"
    }
  };

  var OPTION_COUNT = 4;
  var DEFAULT_LENGTH = 5;

  function modeList() {
    return [MODES["date-to-event"], MODES["event-to-date"]];
  }

  function modeInfo(id) {
    return MODES[id] || MODES["date-to-event"];
  }

  function dataSet() {
    return NB.data && NB.data.history ? NB.data.history.dates : [];
  }

  function wrongCandidates(item, pool, mode, field) {
    return pool.filter(function (candidate) {
      if (candidate.id === item.id) return false;
      if (candidate[field] === item[field]) return false;
      // Two records from the same year would make "which date?" ambiguous.
      if (mode === "event-to-date" && candidate.year === item.year) return false;
      return true;
    });
  }

  function buildQuestion(item, pool, mode) {
    var info = modeInfo(mode);
    var field = info.answerField;
    var candidates = wrongCandidates(item, pool, info.id, field);

    var sameChapter = candidates.filter(function (candidate) {
      return candidate.chapter === item.chapter;
    });
    var source = sameChapter.length >= OPTION_COUNT - 1 ? sameChapter : candidates;

    if (source.length < OPTION_COUNT - 1) {
      source = wrongCandidates(item, dataSet(), info.id, field);
    }

    var distractors = H.shuffle(source).slice(0, OPTION_COUNT - 1);
    var answerItems = H.shuffle(distractors.concat([item]));

    var options = answerItems.map(function (candidate) {
      return {
        id: candidate.id,
        text: String(candidate[field]),
        isCorrect: candidate.id === item.id
      };
    });

    var correctIndex = 0;
    options.forEach(function (option, index) {
      if (option.isCorrect) correctIndex = index;
    });

    return {
      key: "q-" + item.id,
      mode: info.id,
      sourceId: item.id,
      prompt: info.prompt,
      hint: info.answerHint,
      question: String(item[info.questionField]),
      chapter: item.chapter,
      options: options,
      correctIndex: correctIndex,
      correctText: String(item[field]),
      explanation: item.shortExplanation,
      examConnection: item.examConnection,
      item: item
    };
  }

  /**
   * generateQuestions({ mode, chapter, count })
   * Returns one question per date, never repeating the same date twice.
   */
  function generateQuestions(options) {
    var settings = options || {};
    var pool = H.filterDates(dataSet(), { chapter: settings.chapter });
    if (pool.length < OPTION_COUNT) pool = dataSet();

    var count = Math.max(1, Math.min(settings.count || DEFAULT_LENGTH, pool.length));
    var picked = H.shuffle(pool).slice(0, count);

    return picked.map(function (item) {
      return buildQuestion(item, pool, settings.mode);
    });
  }

  /* --------------------------------------------------------------- view --- */

  var KEYS = ["A", "B", "C", "D"];

  function progressLine(current, total) {
    return H.el("div", { class: "progress progress--thin" }, [
      H.el("div", { class: "progress__meta" }, [
        H.el("span", { text: "प्रश्न " + current + " / " + total }),
        H.el("b", { text: H.percent(current - 1, total) + "%" })
      ]),
      H.el("div", { class: "progress__track" }, [
        H.el("div", {
          class: "progress__bar",
          style: "width:" + H.percent(current - 1, total) + "%"
        })
      ])
    ]);
  }

  function questionCard(state, handlers) {
    var question = state.questions[state.index];
    var answered = state.selected !== null;
    var selectedIndex = state.selected;

    var options = H.el(
      "div",
      { class: "quiz-options" },
      question.options.map(function (option, index) {
        var classes = ["quiz-option"];
        if (answered) {
          if (option.isCorrect) classes.push("is-correct");
          else if (index === selectedIndex) classes.push("is-wrong");
          else classes.push("is-dimmed");
        } else if (index === selectedIndex) {
          classes.push("is-selected");
        }

        var mark = null;
        if (answered && option.isCorrect) mark = H.icon("check", 16);
        else if (answered && index === selectedIndex) mark = H.icon("close", 16);

        return H.el(
          "button",
          {
            class: classes.join(" "),
            type: "button",
            disabled: answered ? true : null,
            "aria-label": KEYS[index] + ". " + option.text,
            onclick: function () {
              if (typeof handlers.onSelect === "function") handlers.onSelect(index);
            }
          },
          [
            H.el("span", { class: "quiz-option__key", text: KEYS[index] }),
            H.el("span", { class: "quiz-option__text", text: option.text }),
            mark ? H.el("span", { class: "quiz-option__mark" }, [mark]) : null
          ]
        );
      })
    );

    var feedback = null;
    if (answered) {
      var isRight = selectedIndex === question.correctIndex;
      feedback = H.el(
        "div",
        {
          class: "quiz-feedback " + (isRight ? "quiz-feedback--correct" : "quiz-feedback--wrong"),
          role: "status",
          "aria-live": "polite"
        },
        [
          H.el("span", { class: "quiz-feedback__icon" }, [
            H.icon(isRight ? "checkCircle" : "alert", 18)
          ]),
          H.el("span", {}, [
            H.el("span", {
              class: "quiz-feedback__title",
              text: isRight ? "सही उत्तर!" : "सही उत्तर: " + question.correctText
            }),
            H.el("span", { text: question.explanation })
          ])
        ]
      );
    }

    var isLast = state.index === state.questions.length - 1;

    var actions = H.el("div", { class: "quiz-actions" }, [
      answered
        ? H.el(
            "button",
            {
              class: "btn btn--primary",
              type: "button",
              onclick: function () {
                if (typeof handlers.onNext === "function") handlers.onNext();
              }
            },
            [
              H.el("span", { class: "btn__label" }, [
                H.el("span", { text: isLast ? "परिणाम देखें" : "अगला प्रश्न" }),
                H.icon(isLast ? "trophy" : "arrowRight", 16)
              ])
            ]
          )
        : H.el("span", { class: "text-sm text-subtle", text: "एक विकल्प चुनें" })
    ]);

    return H.el("div", { class: "quiz-shell" }, [
      H.el("div", { class: "quiz-head" }, [
        H.el("span", { class: "badge badge--neutral", text: modeInfo(question.mode).label }),
        H.el("span", { class: "quiz-counter", text: "अंक: " + state.score + " / " + state.answeredCount })
      ]),
      progressLine(state.index + 1, state.questions.length),
      H.el("div", { class: "quiz-question" }, [
        H.el("h2", { class: "quiz-question__prompt", text: question.question }),
        H.el("p", { class: "quiz-question__hint", text: question.prompt })
      ]),
      options,
      feedback,
      actions
    ]);
  }

  function resultCard(state, handlers) {
    var total = state.questions.length;
    var score = state.score;
    var pct = H.percent(score, total);

    var band = {
      title: "अभ्यास जारी रखें",
      text: "पहले रिवीज़न करें, फिर यही क्विज़ दोबारा दें। हर प्रयास में सुधार दिखेगा।",
      icon: "revision"
    };
    if (pct >= 80) {
      band = {
        title: "बहुत बढ़िया!",
        text: "इन तिथियों पर आपकी पकड़ मजबूत है। अब दूसरा मोड आज़माकर देखें।",
        icon: "trophy"
      };
    } else if (pct >= 60) {
      band = {
        title: "अच्छा प्रयास",
        text: "जो प्रश्न ग़लत हुए, उनकी तिथियाँ इतिहास पेज से दोबारा पढ़ें और फिर क्विज़ दोहराएँ।",
        icon: "checkCircle"
      };
    }

    var actions = H.el("div", { class: "quiz-result__actions" }, [
      H.el(
        "button",
        {
          class: "btn btn--primary btn--lg",
          type: "button",
          onclick: function () {
            if (typeof handlers.onRetry === "function") handlers.onRetry();
          }
        },
        [H.el("span", { class: "btn__label" }, [H.icon("revision", 16), "फिर से करें"])]
      ),
      H.el(
        "button",
        {
          class: "btn btn--secondary btn--lg",
          type: "button",
          onclick: function () {
            if (typeof handlers.onSwitchMode === "function") handlers.onSwitchMode();
          }
        },
        [H.el("span", { class: "btn__label" }, [H.icon("shuffle", 16), "मोड बदलें"])]
      )
    ]);

    return H.el("div", { class: "quiz-shell" }, [
      H.el("div", { class: "quiz-result", role: "status", "aria-live": "polite" }, [
        H.el("div", { class: "ring", style: "--pct:" + pct }, [
          H.el("span", { class: "ring__inner" }, [
            H.el("span", { class: "ring__value", text: pct + "%" }),
            H.el("span", { class: "ring__label", text: "स्कोर" })
          ])
        ]),
        H.el("p", { class: "quiz-result__score" }, [
          H.el("span", { text: String(score) }),
          H.el("small", { text: "/ " + total })
        ]),
        H.el("h2", { class: "quiz-result__title" }, [
          H.icon(band.icon, 18),
          H.el("span", { text: band.title })
        ]),
        H.el("p", { class: "quiz-result__text", text: band.text }),
        H.el("p", {
          class: "text-sm text-subtle",
          text: "यह अंक आपकी प्रगति पेज में दर्ज कर लिया गया है।"
        }),
        actions
      ])
    ]);
  }

  NB.quiz = {
    DEFAULT_LENGTH: DEFAULT_LENGTH,
    OPTION_COUNT: OPTION_COUNT,
    MODES: MODES,
    modeList: modeList,
    modeInfo: modeInfo,
    generateQuestions: generateQuestions,
    questionCard: questionCard,
    resultCard: resultCard
  };
})();