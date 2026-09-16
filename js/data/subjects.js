/* ==========================================================================
   Av.ed (NotesByME) — Subject registry (Milestone 1 foundation)
   --------------------------------------------------------------------------
   CONTENT-ONLY registry. No rendering logic lives here.

   Model:
     Subject -> Chapters -> Topics -> Study Material / Practice / Revision

   Rules:
   - Do NOT invent syllabus facts. History chapters/dates stay owned by
     js/data/history-dates.js (verified seed). This file only REFERENCES them.
   - Subjects/chapters without verified content are explicit STRUCTURAL
     PLACEHOLDERS (contentStatus: "coming-soon") — never fabricated content.
   - Load order (see index.html): history-dates.js -> subjects.js
     -> content-index.js. History data is read lazily so file order is safe.
   - Exposes NB.subjects
   ========================================================================== */

(function () {
  "use strict";

  var NB = (window.NB = window.NB || {});

  /* ------------------------------------------------------------------ data */

  // Stable subject ids. SST group ships first; others are prepared placeholders.
  var SUBJECTS = [
    {
      id: "history",
      group: "sst",
      name: "History",
      tagline: "Important dates, events and timelines",
      icon: "book",
      contentStatus: "available",
      // Chapters/dates are owned by NB.data.history; resolved lazily.
      source: "history-dates"
    },
    {
      id: "geography",
      group: "sst",
      name: "Geography",
      tagline: "Chapters, maps and key terms",
      icon: "map",
      contentStatus: "coming-soon",
      source: null
    },
    {
      id: "civics",
      group: "sst",
      name: "Civics",
      tagline: "Democracy, constitution and power",
      icon: "users",
      contentStatus: "coming-soon",
      source: null
    },
    {
      id: "economics",
      group: "sst",
      name: "Economics",
      tagline: "Development, sectors and money",
      icon: "trend",
      contentStatus: "coming-soon",
      source: null
    },
    {
      id: "mathematics",
      group: "other",
      name: "Mathematics",
      tagline: "Formulas, practice and revision",
      icon: "grid",
      contentStatus: "coming-soon",
      source: null
    },
    {
      id: "science",
      group: "other",
      name: "Science",
      tagline: "Concepts, diagrams and experiments",
      icon: "flask",
      contentStatus: "coming-soon",
      source: null
    },
    {
      id: "english",
      group: "other",
      name: "English",
      tagline: "Grammar, writing and literature",
      icon: "pen",
      contentStatus: "coming-soon",
      source: null
    },
    {
      id: "hindi",
      group: "other",
      name: "Hindi",
      tagline: "Vyakaran, lekhan and sahitya",
      icon: "file",
      contentStatus: "coming-soon",
      source: null
    }
  ];

  // Structural SST chapter placeholders. History is intentionally NOT listed
  // here — its chapters come from the verified history-dates.js dataset.
  // These placeholders carry NO study facts, only structure.
  var PLACEHOLDER_CHAPTERS = {
    geography: [
      { id: "geo-placeholder", number: 0, title: "", titleEn: "Chapters coming soon", placeholder: true }
    ],
    civics: [
      { id: "civ-placeholder", number: 0, title: "", titleEn: "Chapters coming soon", placeholder: true }
    ],
    economics: [
      { id: "eco-placeholder", number: 0, title: "", titleEn: "Chapters coming soon", placeholder: true }
    ]
  };

  /* --------------------------------------------------------------- helpers */

  function subjectById(id) {
    for (var i = 0; i < SUBJECTS.length; i += 1) {
      if (SUBJECTS[i].id === id) return SUBJECTS[i];
    }
    return null;
  }

  function historyChapters() {
    if (NB.data && NB.data.history && Array.isArray(NB.data.history.chapters)) {
      return NB.data.history.chapters.slice();
    }
    return [];
  }

  function listSubjects(group) {
    if (!group || group === "all") return SUBJECTS.slice();
    return SUBJECTS.filter(function (s) { return s.group === group; });
  }

  function listChapters(subjectId) {
    if (subjectId === "history") return historyChapters();
    var held = PLACEHOLDER_CHAPTERS[subjectId];
    return held ? held.slice() : [];
  }

  function getChapter(subjectId, chapterId) {
    var list = listChapters(subjectId);
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].id === chapterId) return list[i];
    }
    return null;
  }

  // Topics are structural for now. History topics derive from date records
  // (grouped by chapter); other subjects return [] until verified content lands.
  // Shape: { id, chapterId, title, titleEn, contentStatus }
  function listTopics(subjectId, chapterId) {
    if (subjectId === "history") {
      var chapter = getChapter("history", chapterId);
      if (!chapter) return [];
      return [{
        id: "history-" + chapterId + "-dates",
        chapterId: chapterId,
        title: chapter.title,
        titleEn: "Important dates",
        contentStatus: "available",
        kind: "dates"
      }];
    }
    return [];
  }

  NB.subjects = {
    SUBJECTS: SUBJECTS,
    subjectById: subjectById,
    listSubjects: listSubjects,
    listChapters: listChapters,
    getChapter: getChapter,
    listTopics: listTopics
  };
})();
