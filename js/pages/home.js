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
      H.el("h2", { class: "card__title", text: "इतिहास — महत्वपूर्ण तिथियाँ" }),
      H.el("p", {
        class: "card__text",
        text:
          stats.total +
          " सत्यापित तिथियाँ, सभी 5 अध्यायों से। खोजें, फ़िल्टर करें, समयरेखा में देखें और हर तिथि का परीक्षा-केंद्रित विवरण पढ़ें।"
      }),
      H.el("div", { class: "card__meta" }, [
        NB.cards.importanceBadge("must"),
        H.el("span", { text: "अवश्य याद रखें: " + stats.must })
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
          [H.el("span", { class: "btn__label" }, [H.icon("book", 17), "अध्ययन शुरू करें"])]
        ),
        H.el("span", {
          class: "text-sm text-subtle",
          text: stats.reviewed + " तिथियाँ अब तक समीक्षित"
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
        H.el("span", { text: "कक्षा 10 · सामाजिक विज्ञान · उत्तराखंड बोर्ड" })
      ]),
      H.el("h1", { class: "hero__title", text: "नमस्ते! आज की पढ़ाई शुरू करें" }),
      H.el("p", {
        class: "hero__text",
        text:
          "इतिहास की महत्वपूर्ण तिथियाँ याद करें, क्विज़ से अपनी तैयारी जाँचें और प्रगति देखें। रोज़ 15–20 मिनट की पढ़ाई भी बड़ा अंतर बनाती है।"
      }),
      H.el("div", { class: "hero__stats" }, [
        heroStat(stats.total, "कुल तिथियाँ"),
        heroStat(stats.must, "अवश्य याद रखें"),
        heroStat(stats.reviewed, "समीक्षित"),
        heroStat(stats.quiz.attempts, "क्विज़ प्रयास")
      ])
    ]);

    var tiles = H.el("div", { class: "card-grid" }, [
      NB.ui.actionCard({
        icon: "quiz",
        title: "क्विज़",
        text: "तारीख → घटना और घटना → तारीख, दोनों मोड में 5 प्रश्न। तुरंत फ़ीडबैक और स्कोर।",
        meta: stats.quiz.attempts ? "औसत स्कोर: " + stats.quiz.averagePercent + "%" : "अभी शुरू नहीं किया",
        onClick: function () {
          go("quiz");
        }
      }),
      NB.ui.actionCard({
        icon: "revision",
        accent: true,
        title: "रिवीज़न",
        text: "छोटे फ़्लैशकार्ड सत्र में अवश्य याद रखने वाली तिथियाँ दोहराएँ।",
        meta: "5 मिनट का तेज़ दोहराव",
        onClick: function () {
          go("revision");
        }
      }),
      NB.ui.actionCard({
        icon: "progress",
        title: "प्रगति",
        text: "कितनी तिथियाँ समीक्षित हुईं और क्विज़ में स्कोर कैसा रहा — सब एक जगह।",
        meta: "आपकी तैयारी का हिसाब",
        onClick: function () {
          go("progress");
        }
      })
    ]);

    var progressSection = H.el("section", { class: "card" }, [
      NB.ui.sectionTitle("आपकी प्रगति", "progress"),
      NB.ui.progressBar(
        stats.reviewed,
        stats.total,
        "समीक्षित तिथियाँ",
        stats.reviewed + " / " + stats.total
      ),
      H.el("p", {
        class: "text-sm text-subtle",
        text:
          stats.quiz.attempts > 0
              ? "पिछला क्विज़ स्कोर: " + stats.quiz.last.score + " / " + stats.quiz.last.total
              : "पहला क्विज़ देकर अपनी प्रगति दर्ज करें।"
      })
    ]);

    var coming = H.el("section", { class: "section" }, [
      NB.ui.sectionTitle("आगे आने वाले मॉड्यूल", "sparkle"),
      H.el("p", {
        class: "section-sub",
        text: "ये हिस्से अगले चरणों में जुड़ेंगे। अभी ये उपलब्ध नहीं हैं, इसलिए इन्हें बटन की तरह नहीं रखा गया।"
      }),
      H.el("div", { class: "coming-grid" }, [
        NB.ui.comingSoonCard("भूगोल", "संसाधन, कृषि, खनिज और निर्माण उद्योग के नोट्स व तिथियाँ।", "mapPin"),
        NB.ui.comingSoonCard("नागरिक शास्त्र", "सत्ता के विभाजन, संघवाद और राजनीतिक दलों के प्रश्न।", "users"),
        NB.ui.comingSoonCard("अर्थशास्त्र", "विकास, क्षेत्रक और मुद्रा-साख के सरल नोट्स।", "trend"),
        NB.ui.comingSoonCard("दैनिक नोट्स", "हर दिन का छोटा पाठ और लक्ष्य।", "file"),
        NB.ui.comingSoonCard("मानचित्र अभ्यास", "नक्शे भरने और पहचानने का अभ्यास।", "map"),
        NB.ui.comingSoonCard("उत्तर लेखन", "परीक्षा में अंक दिलाने वाले उत्तर कैसे लिखें।", "pen"),
        NB.ui.comingSoonCard("मॉक टेस्ट", "पूरे पाठ्यक्रम पर समयबद्ध अभ्यास।", "clipboard"),
        NB.ui.comingSoonCard("90+ मिशन", "लक्ष्य आधारित योजना और रिवीज़न शेड्यूल।", "target")
      ])
    ]);

    root.appendChild(
      H.el("div", { class: "page" }, [
        hero,
        H.el("section", { class: "section" }, [
          NB.ui.sectionTitle("मुख्य अध्ययन मॉड्यूल", "book"),
          featureCard(stats)
        ]),
        H.el("section", { class: "section" }, [
          NB.ui.sectionTitle("और क्या कर सकते हैं", "layers"),
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