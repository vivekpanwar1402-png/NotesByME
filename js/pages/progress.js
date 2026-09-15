/* ==========================================================================
   NotesByME — Progress page
   Reads everything through NB.storage (no direct localStorage use here).
   Exposes NB.pages.progress
   ========================================================================== */

(function () {
  "use strict";

  var NB = (window.NB = window.NB || {});
  var H = NB.helpers;

  function go(routeId) {
    window.location.hash = NB.nav.routeById(routeId).hash;
  }

  function reviewedIds() {
    return Object.keys(NB.storage.reviewedMap());
  }

  function reviewedInChapter(chapterId, ids) {
    var list = NB.data.history.dates;
    return ids.filter(function (id) {
      var match = list.filter(function (item) {
        return item.id === id;
      })[0];
      return match && match.chapter === chapterId;
    }).length;
  }

  function chapterSection(ids) {
    var chapters = NB.data.history.chapters;
    var rows = chapters.map(function (chapter) {
      var total = NB.data.history.dates.filter(function (item) {
        return item.chapter === chapter.id;
      }).length;
      return NB.ui.chapterProgressRow(chapter, reviewedInChapter(chapter.id, ids), total);
    });

    return H.el("section", { class: "section" }, [
      NB.ui.sectionTitle("अध्याय के अनुसार तैयारी", "book"),
      H.el("div", { class: "card card--soft stack" }, rows)
    ]);
  }

  function quizSection() {
    var stats = NB.storage.quizStats();
    var history = NB.storage.quizHistory();

    var rows = history.slice(0, 6).map(function (entry) {
      var mode = NB.quiz.modeInfo(entry.mode).label;
      var chapterText =
        entry.chapter && entry.chapter !== "all"
          ? NB.cards.chapterTitle(entry.chapter)
          : "सभी अध्याय";
      return H.el("div", { class: "row" }, [
        H.el("div", { class: "row__main" }, [
          H.el("span", { class: "row__title", text: mode }),
          H.el("span", { class: "row__sub", text: chapterText + " · " + H.formatWhen(entry.at) })
        ]),
        H.el("span", { class: "row__side", text: entry.score + " / " + entry.total })
      ]);
    });

    return H.el("section", { class: "section" }, [
      NB.ui.sectionTitle("क्विज़ प्रदर्शन", "quiz"),
      H.el("div", { class: "stat-grid" }, [
        NB.ui.statTile("कुल प्रयास", stats.attempts),
        NB.ui.statTile("औसत स्कोर", stats.averagePercent, "%"),
        NB.ui.statTile("सर्वोत्तम स्कोर", stats.bestPercent, "%")
      ]),
      rows.length
        ? H.el("div", { class: "card card--soft" }, [H.el("div", { class: "list" }, rows)])
        : H.el("p", {
            class: "text-sm text-subtle",
            text: "अभी कोई क्विज़ दर्ज नहीं है। क्विज़ देकर अपना स्कोर जोड़ें।"
          })
    ]);
  }

  /* -------------------------------------------------------------- page --- */

  function render(root) {
    var dates = NB.data.history.dates;
    var ids = reviewedIds();
    var reviewed = ids.length;
    var stats = NB.storage.quizStats();

    var page = H.el("div", { class: "page" }, [
      H.el("div", { class: "page-head" }, [
        H.el("p", { class: "page-head__eyebrow", text: "आपका हिसाब" }),
        H.el("h1", { class: "page-head__title", text: "प्रगति" }),
        H.el("p", {
          class: "page-head__sub",
          text:
            "यह जानकारी आपके ही डिवाइस में (लोकल स्टोरेज) सुरक्षित रहती है — कोई खाता या इंटरनेट ज़रूरी नहीं।"
        })
      ])
    ]);

    if (!reviewed && !stats.attempts) {
      page.appendChild(
        H.el(
          "div",
          { class: "section" },
          NB.ui.emptyState(
            "अभी कोई प्रगति दर्ज नहीं है",
            "इतिहास की तिथियाँ पढ़ें, विवरण में \"समीक्षित\" दबाएँ या क्विज़ दें — फिर यहाँ आपका हिसाब दिखने लगेगा।",
            "इतिहास शुरू करें",
            function () {
              go("history");
            },
            "progress"
          )
        )
      );
      root.appendChild(page);
      return;
    }

    page.appendChild(
      H.el("section", { class: "section" }, [
        NB.ui.sectionTitle("समीक्षित तिथियाँ", "checkCircle"),
        H.el(
          "div",
          { class: "card" },
          H.el(
            "div",
            { class: "row-flex" },
            H.el("div", { class: "stack", style: "flex:1 1 260px" }, [
              NB.ui.progressBar(
                reviewed,
                dates.length,
                "कुल तिथियों में से समीक्षित",
                reviewed + " / " + dates.length
              ),
              H.el("div", { class: "stat-grid" }, [
                NB.ui.statTile("कुल तिथियाँ", dates.length),
                NB.ui.statTile("समीक्षित", reviewed),
                NB.ui.statTile("बाकी", dates.length - reviewed)
              ])
            ]),
            NB.ui.ring(H.percent(reviewed, dates.length), "समीक्षित")
          )
        )
      ])
    );

    page.appendChild(quizSection());
    page.appendChild(chapterSection(ids));

    page.appendChild(
      H.el("section", { class: "section" }, [
        NB.ui.sectionTitle("प्रगति रीसेट करें", "alert"),
        H.el("p", {
          class: "text-sm text-subtle",
          text: "समीक्षित तिथियाँ और सभी क्विज़ स्कोर मिट जाएँगे। यह काम वापस नहीं हो सकता।"
        }),
        H.el("div", { class: "row-flex" }, [
          H.el(
            "button",
            {
              class: "btn btn--danger",
              type: "button",
              onclick: function () {
                var sure = window.confirm("पक्का? सभी समीक्षित तिथियाँ और क्विज़ स्कोर मिट जाएँगे।");
                if (!sure) return;
                NB.storage.resetAll();
                H.clear(root);
                render(root);
              }
            },
            [H.el("span", { class: "btn__label" }, [H.icon("delete", 16), "प्रगति रीसेट करें"])]
          )
        ])
      ])
    );

    root.appendChild(page);
  }

  NB.pages = NB.pages || {};
  NB.pages.progress = { render: render };
})();