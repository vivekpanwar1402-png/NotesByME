/* ==========================================================================
   NotesByME — My Notes page
   ========================================================================== */

(function () {
  "use strict";
  var NB = (window.NB = window.NB || {});
  var H = NB.helpers;
  var I = NB.idb;
  var state = { notes: [], q: "", subject: "all" };
  var el = { list: null, search: null };

  function subjectOpts() {
    return [
      { id: "all", t: "All Subjects" },
      { id: "History", t: "History" },
      { id: "Geography", t: "Geography" },
      { id: "Civics", t: "Civics" },
      { id: "Economics", t: "Economics" },
      { id: "Other", t: "Other" }
    ];
  }

  function chapterOpts() {
    return [
      { id: "all", t: "All Chapters" },
      { id: "1", t: "Chapter 1" },
      { id: "2", t: "Chapter 2" },
      { id: "3", t: "Chapter 3" },
      { id: "4", t: "Chapter 4" },
      { id: "5", t: "Chapter 5" }
    ];
  }

  function load() {
    I.notes().then(function (n) {
      state.notes = n.sort(function (a, b) {
        return (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt);
      });
      renderList();
    });
  }

  function renderList() {
    var c = H.clear(el.list);
    var q = state.q.toLowerCase().trim();
    var filtered = state.notes.filter(function (n) {
      if (state.subject !== "all" && n.subject !== state.subject) return false;
      if (q) {
        var m = n.title.toLowerCase().indexOf(q) !== -1 ||
          (n.content && n.content.toLowerCase().indexOf(q) !== -1) ||
          (n.subject && n.subject.toLowerCase().indexOf(q) !== -1);
        if (!m) return false;
      }
      return true;
    });
    if (!filtered.length) {
      c.appendChild(H.el("div", { class: "card" }, [
        H.el("div", { class: "empty" }, [
          H.el("span", { class: "empty__icon" }, [H.icon("note", 22)]),
          H.el("h3", { class: "empty__title", text: "No notes yet" }),
          H.el("p", { class: "empty__text", text: "Tap + to create your first note." })
        ])
      ]));
      return;
    }
    c.appendChild(H.el("div", { class: "card-grid" }, filtered.map(function (n) {
      var excerpt = n.content ? n.content.slice(0, 100) + (n.content.length > 100 ? "..." : "") : "";
      return H.el("button", {
        class: "card card--interactive",
        type: "button",
        onclick: function () { openEditor(n); }
      }, [
        H.el("span", { class: "card__icon" }, [H.icon("note", 18)]),
        H.el("div", { class: "card__body" }, [
          H.el("h3", { class: "card__title", text: n.title }),
          H.el("p", { class: "card__text", text: excerpt }),
          H.el("div", { class: "card__meta" }, [
            n.subject ? H.el("span", { class: "tag", text: n.subject }) : null,
            n.chapter ? H.el("span", { class: "tag tag--muted", text: "Ch." + n.chapter }) : null
          ])
        ])
      ]);
    })));
  }

  function openEditor(note) {
    var t = note ? note.title : "";
    var c = note ? note.content : "";
    var s = note ? note.subject : "History";
    var ch = note ? note.chapter : "";
    var top = note ? note.topic : "";
    var sheet = H.openSheet({
      title: note ? "Edit Note" : "New Note",
      body: [
        H.el("div", { class: "field" }, [
          H.el("label", { class: "field__label" }, "Title"),
          H.el("input", { class: "input", id: "nt", type: "text", value: t, placeholder: "Note title", "aria-label": "Note title" })
        ]),
        H.el("div", { class: "field" }, [
          H.el("label", { class: "field__label" }, "Content"),
          H.el("textarea", { class: "input textarea", id: "nc", rows: 6, value: c, placeholder: "Write your notes here...", "aria-label": "Note content" })
        ]),
        H.el("div", { class: "field" }, [
          H.el("label", { class: "field__label" }, "Subject"),
          H.el("select", { class: "select", id: "ns", value: s }, subjectOpts().map(function (o) {
            return H.el("option", { value: o.id, text: o.t, selected: o.id === s ? true : null });
          }))
        ]),
        H.el("div", { class: "field" }, [
          H.el("label", { class: "field__label" }, "Chapter"),
          H.el("select", { class: "select", id: "nch", value: ch || "all" }, chapterOpts().map(function (o) {
            return H.el("option", { value: o.id, text: o.t, selected: o.id === ch || (o.id === "all" && !ch) ? true : null });
          }))
        ]),
        H.el("div", { class: "field" }, [
          H.el("label", { class: "field__label" }, "Topic (optional)"),
          H.el("input", { class: "input", id: "ntop", type: "text", value: top, placeholder: "e.g., Nationalism", "aria-label": "Topic" })
        ])
      ],
      footer: [
        H.el("button", { class: "btn btn--secondary", type: "button", text: "Cancel", onclick: function () { sheet.close(); } }),
        H.el("button", { class: "btn btn--primary", type: "button", text: note ? "Save Changes" : "Save Note", onclick: function () {
          var title = document.getElementById("nt").value.trim();
          var content = document.getElementById("nc").value.trim();
          var subject = document.getElementById("ns").value;
          var chapter = document.getElementById("nch").value === "all" ? "" : document.getElementById("nch").value;
          var topic = document.getElementById("ntop").value.trim();
          if (!title) { document.getElementById("nt").focus(); return; }
          var data = { title: title, content: content, subject: subject, chapter: chapter, topic: topic };
          if (note) {
            I.updateNote(note.id, data).then(function () { sheet.close(); load(); });
          } else {
            I.saveNote(data).then(function () { sheet.close(); load(); });
          }
        }})
      ]
    });
  }

  function render(root) {
    el.list = H.el("div", { class: "stack" });
    el.search = H.el("input", { class: "input input--with-icon", type: "search", placeholder: "Search notes...", "aria-label": "Search notes" });
    root.appendChild(H.el("div", { class: "page" }, [
      H.el("div", { class: "page-head" }, [
        H.el("p", { class: "page-head__eyebrow", text: "My Notes" }),
        H.el("h1", { class: "page-head__title", text: "My Notes" }),
        H.el("p", { class: "page-head__sub", text: "Create and manage your personal study notes. Stored locally on this device." })
      ]),
      H.el("div", { class: "toolbar" }, [
        H.el("div", { class: "field toolbar__grow" }, [
          H.el("label", { class: "field__label", for: "ns-search" }, "Search"),
          H.el("div", { class: "input-wrap" }, [
            H.el("span", { class: "input-wrap__icon" }, [H.icon("search", 17)]),
            el.search,
            H.el("button", { class: "input-clear", type: "button", "aria-label": "Clear search", hidden: true, onclick: function () { el.search.value = ""; state.q = ""; renderList(); } }, [H.icon("close", 16)])
          ])
        ]),
        H.el("div", { class: "toolbar__row toolbar__side" }, [
          H.el("select", { class: "select", id: "ns-filter", "aria-label": "Filter by subject" }, subjectOpts().map(function (o) {
            return H.el("option", { value: o.id, text: o.t, selected: o.id === state.subject ? true : null });
          }))
        ])
      ]),
      el.list,
      H.el("button", { class: "btn btn--primary btn--lg btn--block", type: "button", text: "+ New Note", onclick: function () { openEditor(null); } })
    ]));
    el.search.addEventListener("input", function () { state.q = el.search.value; renderList(); });
    var sf = document.getElementById("ns-filter");
    if (sf) sf.addEventListener("change", function () { state.subject = sf.value; renderList(); });
    load();
  }

  NB.pages = NB.pages || {};
  NB.pages.notes = { render: render };
})();