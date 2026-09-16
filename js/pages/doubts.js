/* ==========================================================================
   NotesByME — Doubt Desk page
   ========================================================================== */

(function () {
  "use strict";
  var NB = (window.NB = window.NB || {});
  var H = NB.helpers;
  var I = NB.idb;
  var state = { doubts: [], q: "", status: "all" };
  var el = { list: null, search: null };

  function load() {
    I.doubts().then(function (d) {
      state.doubts = d.sort(function (a, b) {
        return (b.createdAt || "").localeCompare(a.createdAt || "");
      });
      renderList();
    });
  }

  function renderList() {
    var c = H.clear(el.list);
    var q = state.q.toLowerCase().trim();
    var filtered = state.doubts.filter(function (d) {
      if (state.status !== "all" && d.status !== state.status) return false;
      if (q) {
        var m = d.question.toLowerCase().indexOf(q) !== -1 ||
          (d.subject && d.subject.toLowerCase().indexOf(q) !== -1) ||
          (d.notes && d.notes.toLowerCase().indexOf(q) !== -1);
        if (!m) return false;
      }
      return true;
    });
    if (!filtered.length) {
      c.appendChild(H.el("div", { class: "card" }, [
        H.el("div", { class: "empty" }, [
          H.el("span", { class: "empty__icon" }, [H.icon("help", 22)]),
          H.el("h3", { class: "empty__title", text: "No doubts yet" }),
          H.el("p", { class: "empty__text", text: "Tap + to add your first doubt." })
        ])
      ]));
      return;
    }
    c.appendChild(H.el("div", { class: "card-grid" }, filtered.map(function (d) {
      var statusBadge = d.status === "resolved"
        ? H.el("span", { class: "badge badge--success", text: "Resolved" })
        : H.el("span", { class: "badge badge--warning", text: "Open" });
      return H.el("button", {
        class: "card card--interactive",
        type: "button",
        onclick: function () { openEditor(d); }
      }, [
        H.el("span", { class: "card__icon" }, [H.icon("help", 18)]),
        H.el("div", { class: "card__body" }, [
          H.el("h3", { class: "card__title", text: d.question.slice(0, 80) + (d.question.length > 80 ? "..." : "") }),
          H.el("div", { class: "card__meta" }, [
            d.subject ? H.el("span", { class: "tag", text: d.subject }) : null,
            statusBadge
          ])
        ])
      ]);
    })));
  function openEditor(doubt) {
    var q = doubt ? doubt.question : "";
    var s = doubt ? doubt.subject : "History";
    var ch = doubt ? (doubt.chapter || "") : "";
    var top = doubt ? (doubt.topic || "") : "";
    var notes = doubt ? (doubt.notes || "") : "";
    var status = doubt ? doubt.status : "unresolved";
    var ct = ch || top;
    var sheet = H.openSheet({
      title: doubt ? "Edit Doubt" : "New Doubt",
      body: [
        H.el("div", { class: "field" }, [
          H.el("label", { class: "field__label" }, "Your Question"),
          H.el("textarea", { class: "input textarea", id: "dq", rows: 4, value: q, placeholder: "Type your question here...", "aria-label": "Question" })
        ]),
        H.el("div", { class: "field" }, [
          H.el("label", { class: "field__label" }, "Subject"),
          H.el("select", { class: "select", id: "ds", value: s }, [
            { id: "History", t: "History" },
            { id: "Geography", t: "Geography" },
            { id: "Civics", t: "Civics" },
            { id: "Economics", t: "Economics" },
            { id: "Other", t: "Other" }
          ].map(function (o) {
            return H.el("option", { value: o.id, text: o.t, selected: o.id === s ? true : null });
          }))
        ]),
        H.el("div", { class: "field" }, [
          H.el("label", { class: "field__label" }, "Chapter / Topic (optional)"),
          H.el("input", { class: "input", id: "dct", type: "text", value: ct, placeholder: "e.g., Chapter 2 - Nationalism", "aria-label": "Chapter or topic" })
        ]),
        H.el("div", { class: "field" }, [
          H.el("label", { class: "field__label" }, "Additional Notes"),
          H.el("textarea", { class: "input textarea", id: "dnotes", rows: 3, value: notes, placeholder: "Add your thoughts or progress...", "aria-label": "Additional notes" })
        ]),
        H.el("div", { class: "field" }, [
          H.el("label", { class: "field__label" }, "Status"),
          H.el("select", { class: "select", id: "dstatus", value: status }, [
            { id: "unresolved", t: "Open" },
            { id: "resolved", t: "Resolved" }
          ].map(function (o) {
            return H.el("option", { value: o.id, text: o.t, selected: o.id === status ? true : null });
          }))
        ])
      ],
      footer: [
        H.el("button", { class: "btn btn--secondary", type: "button", text: "Cancel", onclick: function () { sheet.close(); } }),
        H.el("button", { class: "btn btn--primary", type: "button", text: doubt ? "Save Changes" : "Save Doubt", onclick: function () {
          var question = document.getElementById("dq").value.trim();
          var subject = document.getElementById("ds").value;
          var ct = document.getElementById("dct").value.trim();
          var notes = document.getElementById("dnotes").value.trim();
          var status = document.getElementById("dstatus").value;
          if (!question) { document.getElementById("dq").focus(); return; }
          var chapter = ct.split("-")[0] ? ct.split("-")[0].trim() : "";
          var topic = ct.split("-")[1] ? ct.split("-")[1].trim() : ct;
          var data = { question: question, subject: subject, chapter: chapter, topic: topic, notes: notes, status: status };
          if (doubt) {
            I.updateDoubt(doubt.id, data).then(function () { sheet.close(); load(); });
          } else {
            I.saveDoubt(data).then(function () { sheet.close(); load(); });
          }
        }}),
        doubt ? H.el("button", { class: "btn btn--danger", type: "button", text: "Delete", onclick: function () {
          if (!confirm("Delete this doubt? This cannot be undone.")) return;
          I.deleteDoubt(doubt.id).then(function () { sheet.close(); load(); });
        }}) : null
      ]
    });
  }

  function render(root) {
    el.list = H.el("div", { class: "stack" });
    el.search = H.el("input", { class: "input input--with-icon", type: "search", placeholder: "Search doubts...", "aria-label": "Search doubts" });
    root.appendChild(H.el("div", { class: "page" }, [
      H.el("div", { class: "page-head" }, [
        H.el("p", { class: "page-head__eyebrow", text: "Doubt Desk" }),
        H.el("h1", { class: "page-head__title", text: "Doubt Desk" }),
        H.el("p", { class: "page-head__sub", text: "Ask, track, and resolve your study doubts. Saved locally on this device." })
      ]),
      H.el("div", { class: "toolbar" }, [
        H.el("div", { class: "field toolbar__grow" }, [
          H.el("label", { class: "field__label", for: "dd-search" }, "Search"),
          H.el("div", { class: "input-wrap" }, [
            H.el("span", { class: "input-wrap__icon" }, [H.icon("search", 17)]),
            el.search,
            H.el("button", { class: "input-clear", type: "button", "aria-label": "Clear search", hidden: true, onclick: function () { el.search.value = ""; state.q = ""; renderList(); } }, [H.icon("close", 16)])
          ])
        ]),
        H.el("div", { class: "toolbar__row toolbar__side" }, [
          H.el("select", { class: "select", id: "dd-status", "aria-label": "Filter by status" }, [
            { id: "all", t: "All" },
            { id: "unresolved", t: "Open" },
            { id: "resolved", t: "Resolved" }
          ].map(function (o) {
            return H.el("option", { value: o.id, text: o.t, selected: o.id === state.status ? true : null });
          }))
        ])
      ]),
      el.list,
      H.el("button", { class: "btn btn--primary btn--lg btn--block", type: "button", text: "+ Add Doubt", onclick: function () { openEditor(null); } })
    ]));
    el.search.addEventListener("input", function () { state.q = el.search.value; renderList(); });
    var sf = document.getElementById("dd-status");
    if (sf) sf.addEventListener("change", function () { state.status = sf.value; renderList(); });
    load();
  }

  NB.pages = NB.pages || {};
  NB.pages.doubts = { render: render };
})();
  }