/* ==========================================================================
   NotesByME — Date card + date detail sheet
   Reusable presentation for one history record. No data lives in this file.
   Exposes NB.cards (dateCard, openDetail, importanceBadge, chapterTitle)
   ========================================================================== */

(function () {
  "use strict";

  var NB = (window.NB = window.NB || {});

  var H = NB.helpers;

  function chapterList() {
    return NB.data && NB.data.history ? NB.data.history.chapters : [];
  }

  function chapterTitle(chapterId) {
    var match = chapterList().filter(function (chapter) {
      return chapter.id === chapterId;
    })[0];
    return match ? match.title : "";
  }

  function chapterLabel(chapterId) {
    var match = chapterList().filter(function (chapter) {
      return chapter.id === chapterId;
    })[0];
    return match ? "Chapter " + match.number + " · " + match.title : chapterTitle(chapterId);
  }

  function importanceBadge(level) {
    var meta = H.importance(level);
    return H.el("span", { class: "badge badge--" + meta.key }, [
      H.icon(meta.icon, 13),
      H.el("span", { text: meta.label })
    ]);
  }

  function reviewedBadge() {
    return H.el("span", { class: "badge badge--accent" }, [
      H.icon("check", 13),
      H.el("span", { text: "Reviewed" })
    ]);
  }

  /* --------------------------------------------------------- date card --- */

  function dateCard(item, options) {
    var settings = options || {};
    var reviewed = NB.storage.isReviewed(item.id);
    var card = H.el(
      "button",
      {
        class: "date-card date-card--" + item.importance,
        type: "button",
        "aria-label": item.date + " — " + item.event + ". View details",
        onclick: function () {
          if (typeof settings.onOpen === "function") settings.onOpen(item, card);
        }
      },
      [
        H.el("div", { class: "date-card__head" }, [
          H.el("span", { class: "date-card__date", text: item.date }),
          H.el("span", { class: "row-flex" }, [
            item.approximate ? H.el("span", { class: "tag-soon", text: "Approx" }) : null,
            reviewed ? reviewedBadge() : null,
            importanceBadge(item.importance)
          ])
        ]),
        H.el("h3", { class: "date-card__event", text: item.event }),
        H.el("p", { class: "date-card__excerpt", text: item.shortExplanation }),
        H.el("div", { class: "date-card__foot" }, [
          H.el("span", { class: "date-card__chapter" }, [
            H.icon("book", 14),
            H.el("span", { text: "Chapter " + chapterNumber(item.chapter) })
          ]),
          H.el("span", { class: "date-card__more" }, [
            H.el("span", { text: "Details" }),
            H.icon("arrowRight", 14)
          ])
        ])
      ]
    );
    return card;
  }

  function chapterNumber(chapterId) {
    var match = chapterList().filter(function (chapter) {
      return chapter.id === chapterId;
    })[0];
    return match ? match.number : "—";
  }

  /* ------------------------------------------------------ detail sheet --- */

  function findDate(id) {
    var list = NB.data && NB.data.history ? NB.data.history.dates : [];
    return (
      list.filter(function (item) {
        return item.id === id;
      })[0] || null
    );
  }

  function detailBlock(title, body, iconName, accent) {
    return H.el("div", { class: "detail-block" + (accent ? " detail-block--accent" : "") }, [
      H.el("h3", { class: "detail-block__title" }, [
        H.icon(iconName, 14),
        H.el("span", { text: title })
      ]),
      H.el("p", { class: "detail-block__text", text: body })
    ]);
  }

  function detailBody(item, options) {
    var settings = options || {};
    var blocks = [];

    blocks.push(
      H.el("div", { class: "detail__hero" }, [
        H.el("span", { class: "detail__date", text: item.date }),
        H.el("div", { class: "detail__hero-meta" }, [
          H.el("div", { class: "row-flex" }, [
            importanceBadge(item.importance),
            H.el("span", { class: "badge badge--neutral" }, [
              H.icon("book", 13),
              H.el("span", { text: "Chapter " + chapterNumber(item.chapter) })
            ])
          ]),
          item.approximate
            ? H.el("span", { class: "text-sm text-subtle", text: "This date is considered approximate।" })
            : null
        ])
      ])
    );

    blocks.push(detailBlock("What happened?", item.shortExplanation, "book"));
    blocks.push(detailBlock("Exam importance", item.examConnection, "target", true));

    var related = (item.relatedIds || []).map(findDate).filter(Boolean);
    if (related.length) {
      blocks.push(
        H.el("div", { class: "detail-block" }, [
          H.el("h3", { class: "detail-block__title" }, [
            H.icon("layers", 14),
            H.el("span", { text: "Related dates" })
          ]),
          H.el(
            "div", { class: "list" },
            related.map(function (linked) {
              return H.el(
                "button",
                {
                  class: "row tap-row",
                  type: "button",
                  onclick: function () {
                    if (typeof settings.onRelated === "function") settings.onRelated(linked);
                  }
                },
                [
                  H.el("span", { class: "row__main" }, [
                    H.el("span", { class: "row__title", text: linked.event }),
                    H.el("span", { class: "row__sub", text: linked.date })
                  ]),
                  H.icon("chevronRight", 16)
                ]
              );
            })
          )
        ])
      );
    }

    return blocks;
  }

  function openDetail(item, options) {
    var settings = options || {};
    var sheet = null;

    var markButton = H.el("button", {
      class: "btn btn--secondary btn--lg btn--block",
      type: "button"
    });

    if (NB.storage.isReviewed(item.id)) {
      H.clear(markButton);
      markButton.appendChild(
        H.el("span", { class: "btn__label" }, [H.icon("check", 16), "Reviewed"] )
      );
      markButton.disabled = true;
    } else {
      markButton.appendChild(
        H.el("span", { class: "btn__label" }, [
          H.icon("check", 16),
          "Reviewed के रूप में चिह्नित करें"
        ])
      );
      markButton.addEventListener("click", function () {
        NB.storage.markReviewed(item.id);
        H.clear(markButton);
        markButton.appendChild(
          H.el("span", { class: "btn__label" }, [H.icon("checkCircle", 16), "Reviewed के रूप में जोड़ लिया गया"])
        );
        markButton.disabled = true;
        if (typeof settings.onReviewed === "function") settings.onReviewed(item);
      });
    }

    sheet = H.openSheet({
      eyebrow: chapterLabel(item.chapter),
      title: item.event,
      body: detailBody(item, {
        onRelated: function (linked) {
          sheet.close();
          openDetail(linked, settings);
        }
      }),
      footer: [markButton],
      onClose: settings.onClose
    });

    return sheet;
  }

  NB.cards = {
    dateCard: dateCard,
    openDetail: openDetail,
    findDate: findDate,
    importanceBadge: importanceBadge,
    chapterTitle: chapterTitle,
    chapterLabel: chapterLabel,
    chapterNumber: chapterNumber
  };
})();