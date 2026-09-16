/* ==========================================================================
   NotesByME — Shared helpers
   Tiny DOM builder, inline icon set, importance model and date filtering.
   Loaded first; exposes window.NB.helpers
   ========================================================================== */

(function () {
  "use strict";

  var NB = (window.NB = window.NB || {});

  /* ------------------------------------------------------------ DOM ------- */

  function append(parent, children) {
    if (children === null || children === undefined || children === false) return parent;
    if (Array.isArray(children)) {
      children.forEach(function (child) {
        append(parent, child);
      });
      return parent;
    }
    if (typeof Node !== "undefined" && children instanceof Node) {
      parent.appendChild(children);
    } else {
      parent.appendChild(document.createTextNode(String(children)));
    }
    return parent;
  }

  /**
   * el("button", { class: "btn", onclick: fn }, ["text", childNode])
   * Supported attrs: class, text, html, dataset, on* handlers, boolean attrs.
   */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var value = attrs[key];
        if (value === null || value === undefined || value === false) return;
        if (key === "class") {
          node.className = value;
        } else if (key === "text") {
          node.textContent = value;
        } else if (key === "html") {
          node.innerHTML = value;
        } else if (key === "dataset") {
          Object.keys(value).forEach(function (dataKey) {
            node.dataset[dataKey] = value[dataKey];
          });
        } else if (key.slice(0, 2) === "on" && typeof value === "function") {
          node.addEventListener(key.slice(2).toLowerCase(), value);
        } else if (value === true) {
          node.setAttribute(key, "");
        } else {
          node.setAttribute(key, String(value));
        }
      });
    }
    return append(node, children);
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function text(value) {
    return document.createTextNode(value === null || value === undefined ? "" : String(value));
  }

  function frag(children) {
    return append(document.createDocumentFragment(), children);
  }

  function qs(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function qsa(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  /* ------------------------------------------------------- importance ------ */

  var IMPORTANCE = {
    must: { key: "must", label: "Must Remember", short: "Must", icon: "star" },
    important: { key: "important", label: "Important", short: "Important", icon: "flag" },
    extra: { key: "extra", label: "Extra", short: "Extra", icon: "info" }
  };

  var IMPORTANCE_ORDER = ["must", "important", "extra"];

  function importance(key) {
    return IMPORTANCE[key] || IMPORTANCE.extra;
  }

  /* --------------------------------------------------------- searching ---- */

  function normalize(value) {
    return String(value === null || value === undefined ? "" : value)
      .toLowerCase()
      .trim();
  }

  function haystack(item) {
    var parts = [
      item.date,
      item.year,
      item.event,
      item.chapterTitle,
      item.shortExplanation,
      item.examConnection
    ];
    if (item.tags && item.tags.length) parts = parts.concat(item.tags);
    return normalize(parts.join(" "));
  }

  /**
   * filterDates(dates, { query, chapter, importance })
   * Every term of the query must appear somewhere in the record.
   */
  function filterDates(dates, options) {
    var opts = options || {};
    var terms = normalize(opts.query).split(/\s+/).filter(Boolean);
    var chapter = opts.chapter && opts.chapter !== "all" ? opts.chapter : null;
    var level = opts.importance && opts.importance !== "all" ? opts.importance : null;

    return dates.filter(function (item) {
      if (chapter && item.chapter !== chapter) return false;
      if (level && item.importance !== level) return false;
      if (!terms.length) return true;
      var hay = haystack(item);
      return terms.every(function (term) {
        return hay.indexOf(term) !== -1;
      });
    });
  }

  function qs(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function qsa(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  /* ------------------------------------------------------------ lists ----- */

  function sortByYear(dates, direction) {
    var factor = direction === "desc" ? -1 : 1;
    return dates.slice().sort(function (a, b) {
      if (a.year === b.year) return normalize(a.date).localeCompare(normalize(b.date));
      return (a.year - b.year) * factor;
    });
  }

  function groupByYear(dates) {
    var groups = [];
    var index = {};
    sortByYear(dates).forEach(function (item) {
      if (!index[item.year]) {
        index[item.year] = { year: item.year, items: [] };
        groups.push(index[item.year]);
      }
      index[item.year].items.push(item);
    });
    return groups;
  }

  function byImportance(dates) {
    var rank = { must: 0, important: 1, extra: 2 };
    function rankOf(key) {
      return Object.prototype.hasOwnProperty.call(rank, key) ? rank[key] : 9;
    }
    return dates.slice().sort(function (a, b) {
      var diff = rankOf(a.importance) - rankOf(b.importance);
      if (diff !== 0) return diff;
      return a.year - b.year;
    });
  }

  function shuffle(list) {
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  function countBy(list, key) {
    return list.reduce(function (acc, item) {
      var value = item[key];
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  function percent(part, total) {
    if (!total) return 0;
    return Math.max(0, Math.min(100, Math.round((part / total) * 100)));
  }

  function formatWhen(isoString) {
    var date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    try {
      return date.toLocaleString("hi-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (error) {
      return date.toLocaleString();
    }
  }

  /* ----------------------------------------------------------- icons ------- */

  var ICON_BODY = {
    home:
      '<path d="M3 9.5 12 3l9 6.5V20a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20z"/><path d="M9.5 21.5V13h5v8.5"/>',
    book:
      '<path d="M4 19.2A2.7 2.7 0 0 1 6.7 16.5H20"/><path d="M6.7 2.5H20v19H6.7A2.7 2.7 0 0 1 4 18.8V5.2A2.7 2.7 0 0 1 6.7 2.5z"/>',
    quiz:
      '<circle cx="12" cy="12" r="9.2"/><path d="M9.4 9.4a2.7 2.7 0 0 1 5.2.8c0 1.8-2.6 2.4-2.6 2.4"/><path d="M12 17.2h.01"/>',
    revision:
      '<path d="M21 4v6h-6"/><path d="M3 20v-6h6"/><path d="M4 10a8 8 0 0 1 13.9-3.2L21 10"/><path d="M20 14a8 8 0 0 1-13.9 3.2L3 14"/>',
    progress: '<path d="M12 20.5V11"/><path d="M18 20.5V4"/><path d="M6 20.5v-5"/>',
    sun:
      '<circle cx="12" cy="12" r="4.4"/><path d="M12 1.6v2.2M12 20.2v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M1.6 12h2.2M20.2 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"/>',
    moon: '<path d="M20.5 13.4A8.6 8.6 0 1 1 10.6 3.5a6.9 6.9 0 0 0 9.9 9.9z"/>',
    search: '<circle cx="10.8" cy="10.8" r="7.3"/><path d="M20.5 20.5l-4.4-4.4"/>',
    close: '<path d="M18 6 6 18"/><path d="M6 6l12 12"/>',
    chevronRight: '<path d="M9 18l6-6-6-6"/>',
    chevronLeft: '<path d="M15 18l-6-6 6-6"/>',
    chevronDown: '<path d="M6 9l6 6 6-6"/>',
    arrowRight: '<path d="M4.5 12h15"/><path d="M13 5.5l6.5 6.5-6.5 6.5"/>',
    check: '<path d="M20 6.5 9.2 17.3 4 12.1"/>',
    checkCircle:
      '<path d="M21.5 11.1V12a9.5 9.5 0 1 1-5.6-8.7"/><path d="M21.5 4.5 12 14l-3-3"/>',
    alert:
      '<circle cx="12" cy="12" r="9.2"/><path d="M12 7.8v4.6"/><path d="M12 16.4h.01"/>',
    info: '<circle cx="12" cy="12" r="9.2"/><path d="M12 16.4v-4.6"/><path d="M12 7.8h.01"/>',
    lock:
      '<rect x="3.2" y="10.5" width="17.6" height="10.5" rx="2.4"/><path d="M7.6 10.5V7.4a4.4 4.4 0 0 1 8.8 0v3.1"/>',
    delete:
      '<path d="M21 5H8.6L2.4 12l6.2 7H21a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/><path d="M17.5 9.5 12 15"/><path d="M12 9.5l5.5 5.5"/>',
    star: '<path d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5l-5.9 3.1 1.2-6.5L2.5 9.5l6.6-.9z"/>',
    flag:
      '<path d="M4.5 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4.5 21.5V15"/>',
    clock: '<circle cx="12" cy="12" r="9.2"/><path d="M12 6.6V12l3.8 2.2"/>',
    calendar:
      '<rect x="3.2" y="4.6" width="17.6" height="16.6" rx="2.4"/><path d="M16 2.5v4.2M8 2.5v4.2M3.2 10.2h17.6"/>',
    target:
      '<circle cx="12" cy="12" r="9.2"/><circle cx="12" cy="12" r="5.2"/><circle cx="12" cy="12" r="1.4"/>',
    layers:
      '<path d="M12 2.4 2.5 7.2 12 12l9.5-4.8z"/><path d="M2.5 16.8 12 21.6l9.5-4.8"/><path d="M2.5 12 12 16.8l9.5-4.8"/>',
    shuffle:
      '<path d="M16.5 3.5h4.5v4.5"/><path d="M3.5 3.5 21 21"/><path d="M21 16.5v4.5h-4.5"/><path d="M14.5 14.5 21 21"/><path d="M3.5 20.5 8.8 15"/>',
    eye:
      '<path d="M2 12s3.7-6.5 10-6.5S22 12 22 12s-3.7 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>',
    mapPin:
      '<path d="M20 10.4c0 6.2-8 11.6-8 11.6s-8-5.4-8-11.6a8 8 0 0 1 16 0z"/><circle cx="12" cy="10.2" r="2.6"/>',
    map:
      '<path d="M2.5 6.2v15.3l6.5-3.7 7.6 3.7 4.9-3.7V2.5l-4.9 3.7-7.6-3.7z"/><path d="M9 2.5v15.3"/><path d="M16.6 6.2v15.3"/>',
    trophy:
      '<path d="M8 21.5h8"/><path d="M12 17.5v4"/><path d="M7 3.5h10v4.6a5 5 0 0 1-10 0z"/><path d="M17 5h3.2a3.2 3.2 0 0 1-3.4 3.1"/><path d="M7 5H3.8A3.2 3.2 0 0 0 7.2 8.1"/>',
    cap:
      '<path d="M21.6 9.4 12 4.4 2.4 9.4 12 14.4z"/><path d="M6.4 11.6v5c0 1.7 2.5 3 5.6 3s5.6-1.3 5.6-3v-5"/>',
    trend: '<path d="M22 6.5 13.5 15l-4.6-4.6L2 17.3"/><path d="M16.5 6.5H22V12"/>',
    shield:
      '<path d="M12 21.5s7.5-3.7 7.5-9.5V5.2L12 2.3 4.5 5.2v6.8c0 5.8 7.5 9.5 7.5 9.5z"/>',
    file:
      '<path d="M14 2.5H6.7a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h10.6a2 2 0 0 0 2-2V7.7z"/><path d="M14 2.5v5.2h5.3"/><path d="M15.4 13.3H8.6M15.4 17H8.6M10.6 9.4H8.6"/>',
    pen:
      '<path d="M12.5 20.5H21"/><path d="M16.3 3.7a2.1 2.1 0 0 1 3 3L7.2 18.8l-4.2 1.1 1.1-4.2z"/>',
    clipboard:
      '<path d="M15.6 4.4h2.2a2 2 0 0 1 2 2v13.2a2 2 0 0 1-2 2H6.2a2 2 0 0 1-2-2V6.4a2 2 0 0 1 2-2h2.2"/><path d="M8 2.2h8v4.2H8z"/>',
    sparkle:
      '<path d="M12 2.8l1.9 5.1 5.1 1.9-5.1 1.9-1.9 5.1-1.9-5.1L5 9.8l5.1-1.9z"/><path d="M19 16.4l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
    users:
      '<path d="M16.5 20.6v-1.8a4 4 0 0 0-4-4h-5a4 4 0 0 0-4 4v1.8"/><circle cx="10" cy="7.6" r="3.6"/><path d="M21.5 20.6v-1.8a4 4 0 0 0-2.9-3.8"/><path d="M15.4 4.2a3.6 3.6 0 0 1 0 6.9"/>',
    flame:
      '<path d="M12 2.5s5.5 4.2 5.5 9.3a5.5 5.5 0 0 1-11 0c0-1.6.7-3 1.6-4.1.4 1.2 1.3 2 2.3 2 1.4 0 2-1.2 2-2.8 0-1.6-.4-3-.4-4.4z"/>'
  };

  /**
   * icon("home", 18, "extra-class") -> SVGSVGElement
   * Returns null for unknown names so callers can skip decoration safely.
   */
  function icon(name, size, className) {
    var body = ICON_BODY[name];
    if (!body) return null;
    var px = size || 18;
    var wrap = document.createElement("span");
    wrap.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' +
      px +
      '" height="' +
      px +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"' +
      (className ? ' class="' + className + '"' : "") +
      ">" +
      body +
      "</svg>";
    var svg = wrap.firstChild;
    wrap.removeChild(svg);
    return svg;
  }

  /* ------------------------------------------------------------- modal ----- */

  function openSheet(options) {
    var settings = options || {};
    var closing = false;
    var overlay = el("div", { class: "modal", role: "dialog", "aria-modal": "true" });
    var titleId = "sheet-title-" + Math.random().toString(36).slice(2, 8);
    var panel = el("div", { class: "modal__panel" });
    var closeBtn = el(
      "button",
      { class: "icon-btn", type: "button", "aria-label": "Close" },
      icon("close", 18)
    );

    overlay.setAttribute("aria-labelledby", titleId);

    panel.appendChild(
      el("div", { class: "modal__head" }, [
        el("div", { class: "modal__head-main" }, [
          settings.eyebrow ? el("p", { class: "modal__eyebrow", text: settings.eyebrow }) : null,
          el("h2", { class: "modal__title", id: titleId, text: settings.title })
        ]),
        closeBtn
      ])
    );
    if (settings.body) panel.appendChild(el("div", { class: "modal__body" }, settings.body));
    if (settings.footer) panel.appendChild(el("div", { class: "modal__foot" }, settings.footer));
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    var previouslyFocused = document.activeElement;

    function close() {
      if (closing) return;
      closing = true;
      document.removeEventListener("keydown", onKeydown);
      overlay.classList.remove("is-open");
      window.setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 160);
      if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
      if (typeof settings.onClose === "function") settings.onClose();
    }

    function onKeydown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      var focusable = qsa(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        panel
      );
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    closeBtn.addEventListener("click", close);
    overlay.addEventListener("mousedown", function (event) {
      if (event.target === overlay) close();
    });
    document.addEventListener("keydown", onKeydown);

    window.requestAnimationFrame(function () {
      overlay.classList.add("is-open");
      closeBtn.focus();
    });

    return { close: close, element: overlay };
  }

  NB.helpers = {
    append: append,
    el: el,
    text: text,
    frag: frag,
    clear: clear,
    qs: qs,
    qsa: qsa,
    icon: icon,
    icons: ICON_BODY,
    IMPORTANCE: IMPORTANCE,
    IMPORTANCE_ORDER: IMPORTANCE_ORDER,
    importance: importance,
    normalize: normalize,
    filterDates: filterDates,
    sortByYear: sortByYear,
    groupByYear: groupByYear,
    byImportance: byImportance,
    shuffle: shuffle,
    countBy: countBy,
    percent: percent,
    formatWhen: formatWhen,
    openSheet: openSheet
  };
})();