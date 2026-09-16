/* ==========================================================================
   NotesByME — Progress bits & shared small UI atoms
   Reusable, data-free builders used by the pages.
   Exposes NB.ui
   ========================================================================== */

(function () {
  "use strict";

  var NB = (window.NB = window.NB || {});
  var H = NB.helpers;

  function statTile(label, value, suffix) {
    return H.el("div", { class: "stat" }, [
      H.el("span", { class: "stat__label", text: label }),
      H.el("span", { class: "stat__value" }, [
        H.el("span", { text: String(value) }),
        suffix ? H.el("small", { text: suffix }) : null
      ])
    ]);
  }

  function progressBar(part, total, label, valueText) {
    var pct = H.percent(part, total);
    return H.el("div", { class: "progress" }, [
      H.el("div", { class: "progress__meta" }, [
        H.el("span", { text: label }),
        H.el("b", { text: valueText || pct + "%" })
      ]),
      H.el("div", { class: "progress__track" }, [
        H.el("div", { class: "progress__bar", style: "width:" + pct + "%" })
      ])
    ]);
  }

  function ring(pct, label) {
    return H.el("div", { class: "ring", style: "--pct:" + H.percent(pct, 100) }, [
      H.el("span", { class: "ring__inner" }, [
        H.el("span", { class: "ring__value", text: H.percent(pct, 100) + "%" }),
        H.el("span", { class: "ring__label", text: label || "Done" })
      ])
    ]);
  }

  function emptyState(title, message, actionLabel, onAction, iconName) {
    return H.el("div", { class: "empty" }, [
      H.el("span", { class: "empty__icon" }, [H.icon(iconName || "search", 22)]),
      H.el("h3", { class: "empty__title", text: title }),
      H.el("p", { class: "empty__text", text: message }),
      actionLabel
        ? H.el(
            "button",
            {
              class: "btn btn--secondary",
              type: "button",
              onclick: onAction
            },
            [H.el("span", { class: "btn__label" }, [H.icon("revision", 16), actionLabel])]
          )
        : null
    ]);
  }

  function sectionTitle(text, iconName) {
    return H.el("h2", { class: "section-title" }, [
      H.icon(iconName || "layers", 18),
      H.el("span", { text: text })
    ]);
  }

  function actionCard(options) {
    var settings = options || {};
    return H.el(
      "button",
      {
        class: "card card--interactive",
        type: "button",
        onclick: function () {
          if (typeof settings.onClick === "function") settings.onClick();
        }
      },
      [
        H.el("span", { class: "card__icon" + (settings.accent ? " card__icon--accent" : "") }, [
          H.icon(settings.icon || "book", 20)
        ]),
        H.el("span", { class: "card__title", text: settings.title }),
        H.el("span", { class: "card__text", text: settings.text }),
        settings.meta ? H.el("span", { class: "card__meta", text: settings.meta }) : null
      ]
    );
  }

  function comingSoonCard(title, text, iconName) {
    return H.el("div", { class: "coming-card" }, [
      H.el("div", { class: "coming-card__head" }, [
        H.icon(iconName || "sparkle", 16),
        H.el("span", { text: title }),
        H.el("span", { class: "tag-soon", text: "Soon" })
      ]),
      H.el("p", { class: "coming-card__text", text: text })
    ]);
  }

  function chapterProgressRow(chapter, reviewedCount, total) {
    var pct = H.percent(reviewedCount, total);
    return H.el("div", { class: "stack" }, [
      H.el("div", { class: "progress progress--thin" }, [
        H.el("div", { class: "progress__meta" }, [
          H.el("span", { text: "Chapter " + chapter.number + " · " + chapter.title }),
          H.el("b", { text: reviewedCount + " / " + total })
        ]),
        H.el("div", { class: "progress__track" }, [
          H.el("div", { class: "progress__bar", style: "width:" + pct + "%" })
        ])
      ])
    ]);
  }

  NB.ui = {
    statTile: statTile,
    progressBar: progressBar,
    ring: ring,
    emptyState: emptyState,
    sectionTitle: sectionTitle,
    actionCard: actionCard,
    comingSoonCard: comingSoonCard,
    chapterProgressRow: chapterProgressRow
  };
})();