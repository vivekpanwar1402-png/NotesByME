/* ==========================================================================
   NotesByME — Settings page
   ========================================================================== */

(function () {
  "use strict";
  var NB = (window.NB = window.NB || {});
  var H = NB.helpers;
  var I = NB.idb;

  function render(root) {
    root.appendChild(H.el("div", { class: "page" }, [
      H.el("div", { class: "page-head" }, [
        H.el("p", { class: "page-head__eyebrow", text: "Settings" }),
        H.el("h1", { class: "page-head__title", text: "Settings" }),
        H.el("p", { class: "page-head__sub", text: "Manage your app preferences and data." })
      ]),
      H.el("section", { class: "section" }, [
        H.el("h2", { class: "section-title", text: "Appearance" }),
        H.el("div", { class: "card card--soft" }, [
          H.el("div", { class: "row-flex" }, [
            H.el("span", { class: "text-sm", text: "Theme" }),
            H.el("button", {
              class: "btn btn--secondary",
              type: "button",
              onclick: function () { NB.nav.theme.toggle(); },
              text: NB.nav.theme.current() === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"
            })
          ])
        ])
      ]),
      H.el("section", { class: "section" }, [
        H.el("h2", { class: "section-title", text: "Data Management" }),
        H.el("div", { class: "card card--soft stack" }, [
          H.el("p", { class: "text-sm text-muted", text: "Export all your notes, doubts, and image metadata as a JSON file. Images stored as blobs in IndexedDB are included as metadata only." }),
          H.el("button", {
            class: "btn btn--secondary",
            type: "button",
            onclick: function () {
              I.exportAllData().then(function (data) {
                var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                var url = URL.createObjectURL(blob);
                var a = document.createElement("a");
                a.href = url;
                a.download = "notesbyme-export-" + new Date().toISOString().slice(0, 10) + ".json";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              });
            },
            text: "Export Data (JSON)"
          }),
          H.el("div", { class: "row-flex" }, [
            H.el("span", { class: "text-sm text-muted", text: "Notes: " + I.notes().length }),
            H.el("span", { class: "text-sm text-muted", text: "Doubts: " + I.doubts().length })
          ])
        ])
      ]),
      H.el("section", { class: "section" }, [
        H.el("h2", { class: "section-title", text: "About" }),
        H.el("div", { class: "card card--soft" }, [
          H.el("p", { class: "text-sm text-muted", text: "NotesByME - Class 10 Social Science study app for UBSE students." }),
          H.el("p", { class: "text-sm text-muted", text: "Version: 1.0.0" }),
          H.el("p", { class: "text-sm text-muted", text: "All data is stored locally on your device. No data is sent to any server." })
        ])
      ])
    ]));
  }

  NB.pages = NB.pages || {};
  NB.pages.settings = { render: render };
})();