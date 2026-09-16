/* ==========================================================================
   Av.ed (NotesByME) — Unified content lookup (Milestone 1 foundation)
   --------------------------------------------------------------------------
   Single read path for Subject -> Chapter -> Topic -> Items.

   - History items are owned by js/data/history-dates.js (verified seed).
     They are exposed here enriched with `subjectId: "history"` (copies,
     never mutated in place).
   - Placeholder subjects expose structure with zero items until verified
     content lands — callers must handle empty lists via empty states.
   - Item ids are namespaced as "history:<rawId>" for all NEW progress
     records. Legacy raw ids ("cu-1789-...") are still resolved so existing
     user data keeps working (see NB.storage migration).
   - Exposes NB.content
   ========================================================================== */

(function () {
  "use strict";

  var NB = (window.NB = window.NB || {});

  function rawHistoryDates() {
    if (NB.data && NB.data.history && Array.isArray(NB.data.history.dates)) {
      return NB.data.history.dates;
    }
    return [];
  }

  function withSubject(item) {
    if (!item) return null;
    if (item.subjectId) return item;
    var copy = {};
    for (var k in item) {
      if (Object.prototype.hasOwnProperty.call(item, k)) copy[k] = item[k];
    }
    copy.subjectId = "history";
    copy.uid = "history:" + item.id;
    return copy;
  }

  /* ------------------------------------------------------------ id model --- */

  function parseUid(uid) {
    var raw = String(uid === null || uid === undefined ? "" : uid);
    var sep = raw.indexOf(":");
    if (sep > 0) {
      return { subjectId: raw.slice(0, sep), rawId: raw.slice(sep + 1), uid: raw };
    }
    // Legacy raw history id (pre-namespace). Assume history.
    return { subjectId: "history", rawId: raw, uid: "history:" + raw };
  }

  function toUid(subjectId, rawId) {
    var raw = String(rawId === null || rawId === undefined ? "" : rawId);
    if (raw.indexOf(":") !== -1) return raw;
    return (subjectId || "history") + ":" + raw;
  }

  function findItem(uid) {
    var parsed = parseUid(uid);
    if (parsed.subjectId !== "history") return null;
    var list = rawHistoryDates();
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].id === parsed.rawId) return withSubject(list[i]);
    }
    return null;
  }

  /* --------------------------------------------------------------- lists --- */

  function listItems(options) {
    var opts = options || {};
    var subject = opts.subjectId || opts.subject || "history";
    if (subject !== "history" && subject !== "all") return [];
    var pool = rawHistoryDates().map(withSubject);
    var out = pool;
    if (subject === "history" || (opts.subjectId && opts.subjectId !== "all")) {
      out = out.filter(function (it) { return it.subjectId === "history"; });
    }
    if (opts.chapter && opts.chapter !== "all") {
      out = out.filter(function (it) { return it.chapter === opts.chapter; });
    }
    if (opts.importance && opts.importance !== "all") {
      out = out.filter(function (it) { return it.importance === opts.importance; });
    }
    if (opts.query && NB.helpers && NB.helpers.filterDates) {
      // Reuse the verified filter against raw records, then re-attach.
      var rawFiltered = NB.helpers.filterDates(
        out.map(function (it) {
          var c = {};
          for (var k in it) {
            if (Object.prototype.hasOwnProperty.call(it, k)) c[k] = it[k];
          }
          return c;
        }),
        { query: opts.query, chapter: opts.chapter || "all", importance: opts.importance || "all" }
      );
      var keep = {};
      rawFiltered.forEach(function (it) { keep[it.id] = true; });
      out = out.filter(function (it) { return keep[it.id]; });
    }
    return out;
  }

  function chapterTitle(subjectId, chapterId) {
    if (NB.subjects && NB.subjects.getChapter) {
      var ch = NB.subjects.getChapter(subjectId || "history", chapterId);
      if (ch) {
        if (ch.placeholder) return "Coming soon";
        // Verified history titles are Hindi; keep them as study content.
        return ch.titleEn ? ch.title + " · " + ch.titleEn : ch.title;
      }
    }
    return "";
  }

  function chapterNumber(subjectId, chapterId) {
    if (NB.subjects && NB.subjects.getChapter) {
      var ch = NB.subjects.getChapter(subjectId || "history", chapterId);
      if (ch && !ch.placeholder) return ch.number;
    }
    return "—";
  }

  // Subject-aware progress summary over a reviewed map (keys may be legacy
  // raw ids or namespaced uids). Returns { total, reviewed, percent }.
  function subjectStats(subjectId, reviewedMap) {
    var map = reviewedMap || {};
    if (subjectId !== "history") {
      return { total: 0, reviewed: 0, percent: 0, contentStatus: "coming-soon" };
    }
    var total = rawHistoryDates().length;
    var count = 0;
    var seen = {};
    Object.keys(map).forEach(function (key) {
      var parsed = parseUid(key);
      if (parsed.subjectId !== "history") return;
      if (seen[parsed.rawId]) return;
      seen[parsed.rawId] = true;
      count += 1;
    });
    var pct = total ? Math.max(0, Math.min(100, Math.round((count / total) * 100))) : 0;
    return { total: total, reviewed: count, percent: pct, contentStatus: "available" };
  }

  NB.content = {
    parseUid: parseUid,
    toUid: toUid,
    findItem: findItem,
    listItems: listItems,
    chapterTitle: chapterTitle,
    chapterNumber: chapterNumber,
    subjectStats: subjectStats
  };
})();
