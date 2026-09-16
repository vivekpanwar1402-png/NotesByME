/* ==========================================================================
   Av.ed (NotesByME) — Subjects page (Milestone 1 foundation)
   Subject -> Chapter -> Topic navigation on NB.subjects + NB.content.
   History drills into existing pages; placeholders show explicit empty
   states. No syllabus facts invented. Exposes NB.pages.subjects
   ========================================================================== */

(function () {
  "use strict";

  var NB = (window.NB = window.NB || {});
  var H = NB.helpers;

  function go(hash) {
    window.location.hash = hash;
  }

  function statsFor(subjectId) {
    try {
      if (NB.content && NB.content.subjectStats && NB.storage) {
        return NB.content.subjectStats(subjectId, NB.storage.reviewedMap());
      }
    } catch (error) {}
    return { total: 0, reviewed: 0, percent: 0, contentStatus: "coming-soon" };
  }

  function subjectCard(subject) {
    var stats = statsFor(subject.id);
    var available = subject.contentStatus === "available";
    var badge = available
      ? H.el("span", { class: "badge badge--success", text: "Available" })
      : H.el("span", { class: "badge badge--neutral", text: "Coming soon" });
    var meta = available ? stats.reviewed + " / " + stats.total + " reviewed" : "Structure ready";
    return H.el("button", {
      class: "card card--interactive",
      type: "button",
      "aria-label": subject.name + " — " + meta,
      onclick: function () { go("#/subjects/" + subject.id); }
    }, [
      H.el("span", { class: "card__icon" }, [H.icon(subject.icon || "book", 20)]),
      H.el("span", { class: "card__body" }, [
        H.el("span", { class: "card__title", text: subject.name }),
        H.el("span", { class: "card__text", text: subject.tagline }),
        H.el("span", { class: "card__meta" }, [badge, H.el("span", { class: "tag tag--muted", text: meta })])
      ])
    ]);
  }

  function chapterRow(subject, chapter) {
    if (chapter.placeholder) {
      return H.el("div", { class: "card card--soft" }, [
        NB.ui.emptyState(
          "Chapters coming soon",
          "The " + subject.name + " chapter structure is ready. Verified content lands in a later milestone.",
          "Add a note",
          function () { go("#/notes"); },
          "book"
        )
      ]);
    }
    var total = 0;
    var reviewed = 0;
    try {
      var items = NB.content.listItems({ subjectId: subject.id, chapter: chapter.id });
      total = items.length;
      reviewed = items.filter(function (it) { return NB.storage.isReviewed(it.uid || it.id); }).length;
    } catch (error) {}
    var label = "Chapter " + chapter.number + " · " + (chapter.title || "");
    return H.el("button", {
      class: "row tap-row",
      type: "button",
      "aria-label": label + " — " + reviewed + " of " + total + " reviewed",
      onclick: function () {
        if (subject.id === "history") go("#/history");
        else go("#/subjects/" + subject.id);
      }
    }, [
      H.el("span", { class: "row__main" }, [
        H.el("span", { class: "row__title", text: label }),
        H.el("span", { class: "row__sub", text: reviewed + " / " + total + " reviewed" })
      ]),
      H.icon("chevronRight", 16)
    ]);
  }

  function renderDetail(root, subject) {
    var chapters = [];
    try { chapters = NB.subjects.listChapters(subject.id); } catch (error) {}
    var stats = statsFor(subject.id);
    var page = H.el("div", { class: "page" }, [
      H.el("button", {
        class: "btn btn--ghost btn--sm", type: "button",
        onclick: function () { go("#/subjects"); }
      }, [H.el("span", { class: "btn__label" }, [H.icon("arrowLeft", 15), "All subjects"])]),
      H.el("div", { class: "page-head" }, [
        H.el("p", { class: "page-head__eyebrow", text: "Subject" }),
        H.el("h1", { class: "page-head__title", text: subject.name }),
        H.el("p", { class: "page-head__sub", text: subject.tagline })
      ])
    ]);
    if (subject.contentStatus !== "available") {
      page.appendChild(H.el("div", { class: "card card--soft" }, [
        NB.ui.emptyState(
          "Content coming soon",
          "The " + subject.name + " path (chapters, topics, study material, practice, revision) is structured and will be filled with verified content later. Notes and doubts already work.",
          "Add a note",
          function () { go("#/notes"); },
          subject.icon || "book"
        )
      ]));
      root.appendChild(page);
      return;
    }
    page.appendChild(H.el("section", { class: "section" }, [
      NB.ui.sectionTitle("Progress", "progress"),
      NB.ui.progressBar(stats.reviewed, stats.total, "Reviewed", stats.reviewed + " / " + stats.total)
    ]));
    page.appendChild(H.el("section", { class: "section" }, [
      NB.ui.sectionTitle("Chapters", "book"),
      H.el("div", { class: "card card--soft" }, [
        H.el("div", { class: "list" }, chapters.map(function (ch) { return chapterRow(subject, ch); }))
      ])
    ]));
    page.appendChild(H.el("div", { class: "row-flex" }, [
      H.el("button", { class: "btn btn--primary", type: "button", onclick: function () { go("#/history"); } },
        [H.el("span", { class: "btn__label" }, [H.icon("book", 16), "Open History"])]),
      H.el("button", { class: "btn btn--secondary", type: "button", onclick: function () { go("#/quiz"); } },
        [H.el("span", { class: "btn__label" }, [H.icon("quiz", 16), "Practice Quiz"])])
    ]));
    root.appendChild(page);
  }

  function renderList(root) {
    var page = H.el("div", { class: "page" }, [
      H.el("div", { class: "page-head" }, [
        H.el("p", { class: "page-head__eyebrow", text: "Study" }),
        H.el("h1", { class: "page-head__title", text: "Subjects" }),
        H.el("p", { class: "page-head__sub", text: "Choose a subject to open chapters, topics, practice and revision. Progress is saved on this device." })
      ])
    ]);
    var groups = [
      { id: "sst", title: "Social Science", text: "History, Geography, Civics and Economics." },
      { id: "other", title: "More subjects", text: "Prepared structure for future milestones." }
    ];
    groups.forEach(function (group) {
      var list = [];
      try { list = NB.subjects.listSubjects(group.id); } catch (error) {}
      if (!list.length) return;
      page.appendChild(H.el("section", { class: "section" }, [
        NB.ui.sectionTitle(group.title, "layers"),
        H.el("p", { class: "text-sm text-subtle", text: group.text }),
        H.el("div", { class: "card-grid" }, list.map(subjectCard))
      ]));
    });
    root.appendChild(page);
  }

  function idFromHash() {
    var raw = String(window.location.hash || "").replace(/^#\/?/, "");
    var parts = raw.split("?")[0].split("/");
    return parts.length >= 2 && parts[0] === "subjects" ? parts[1] : null;
  }

  function render(root) {
    var id = idFromHash();
    if (!id) { renderList(root); return; }
    var subject = null;
    try { subject = NB.subjects.subjectById(id); } catch (error) {}
    if (!subject) {
      root.appendChild(H.el("div", { class: "page" }, [
        NB.ui.emptyState("Subject not found", "Choose a subject from the list.", "All subjects",
          function () { go("#/subjects"); }, "search")
      ]));
      return;
    }
    renderDetail(root, subject);
  }

  NB.pages = NB.pages || {};
  NB.pages.subjects = { render: render };
})();
