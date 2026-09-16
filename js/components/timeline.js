/* ==========================================================================
   NotesByME — Timeline view
   Renders the SAME dataset used by the cards, grouped by year.
   Exposes NB.timeline
   ========================================================================== */

(function () {
  "use strict";

  var NB = (window.NB = window.NB || {});

  var H = NB.helpers;

  function timelineItem(item, settings) {
    return H.el(
      "button",
      {
        class: "timeline__item timeline__item--" + item.importance,
        type: "button",
        "aria-label": item.date + " — " + item.event + ". View details",
        onclick: function () {
          if (typeof settings.onOpen === "function") settings.onOpen(item);
        }
      },
      [
        H.el("div", { class: "timeline__item-top" }, [
          H.el("span", { class: "timeline__date", text: item.date }),
          NB.cards.importanceBadge(item.importance)
        ]),
        H.el("p", { class: "timeline__event", text: item.event }),
        H.el("p", { class: "timeline__meta" }, [
          H.icon("book", 13),
          H.el("span", { text: "Chapter " + NB.cards.chapterNumber(item.chapter) })
        ])
      ]
    );
  }

  function render(dates, options) {
    var settings = options || {};
    var groups = H.groupByYear(dates);

    return H.el(
      "div",
      { class: "timeline" },
      groups.map(function (group) {
        return H.el("section", { class: "timeline__group" }, [
          H.el("h3", { class: "timeline__year" }, [
            H.el("span", { text: group.year }),
            H.el("span", {
              class: "text-sm text-subtle",
              text: "(" + group.items.length + ")"
            })
          ]),
          H.el(
            "div",
            { class: "timeline__items" },
            group.items.map(function (item) {
              return timelineItem(item, settings);
            })
          )
        ]);
      })
    );
  }

  NB.timeline = {
    render: render
  };
})();