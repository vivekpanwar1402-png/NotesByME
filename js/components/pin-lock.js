/* ==========================================================================
   NotesByME — Access gate (PIN lock screen)
   --------------------------------------------------------------------------
   IMPORTANT: this is a friendly client-side access gate, NOT real security.
   On a static site a true secret cannot be kept — it exists only so the site
   is not casually open.

   The numeric PIN is never written in plain text anywhere in the project:
   only a salted digest pair is stored below. Replacing this file with a real
   authentication service later needs no changes elsewhere, because the rest
   of the app only uses NB.gate.mount / NB.gate.isUnlocked / NB.gate.lock.
   ========================================================================== */

(function () {
  "use strict";

  var NB = (window.NB = window.NB || {});

  var PIN_LENGTH = 4;
  var GATE_SALT = "nbme.class10.sst.gate";
  var GATE_DIGEST = "410aaed1-2a0927e7"; // digest of the salted PIN (see digest())
  var MAX_HINTS = 3;

  /* Non-cryptographic digest (FNV-1a + djb2). It only keeps the PIN out of
     the source; it is deliberately NOT presented as secure. */
  function digest(value) {
    var source = GATE_SALT + "|" + value;
    var fnv = 0x811c9dc5;
    var djb = 5381;
    for (var i = 0; i < source.length; i += 1) {
      var code = source.charCodeAt(i);
      fnv ^= code;
      fnv = Math.imul(fnv, 0x01000193) >>> 0;
      djb = (Math.imul(djb, 33) + code) >>> 0;
    }
    return pad(fnv.toString(16)) + "-" + pad(djb.toString(16));
  }

  function pad(hex) {
    return ("00000000" + hex).slice(-8);
  }

  function sanitize(value) {
    return String(value === null || value === undefined ? "" : value)
      .replace(/[^0-9]/g, "")
      .slice(0, PIN_LENGTH);
  }

  function verifyPin(value) {
    var candidate = sanitize(value);
    if (candidate.length !== PIN_LENGTH) return false;
    return digest(candidate) === GATE_DIGEST;
  }

  /* ------------------------------------------------------------- state --- */

  var UI = {
    root: null,
    input: null,
    dots: [],
    error: null,
    unlockButton: null,
    hint: null,
    digits: "",
    attempts: 0,
    onUnlock: null
  };

  function buildPad(ui) {
    var helpers = NB.helpers;
    var pad = helpers.el("div", { class: "lock__pad" });

    ["1", "2", "3", "4", "5", "6", "7", "8", "9"].forEach(function (label) {
      pad.appendChild(
        helpers.el("button", {
          class: "key",
          type: "button",
          text: label,
          "aria-label": "अंक " + label,
          onclick: function () {
            addDigit(ui, label);
          }
        })
      );
    });

    pad.appendChild(
      helpers.el("button", {
        class: "key key--fn",
        type: "button",
        text: "C",
        "aria-label": "साफ़ करें",
        onclick: function () {
          clearDigits(ui);
        }
      })
    );

    pad.appendChild(
      helpers.el("button", {
        class: "key",
        type: "button",
        text: "0",
        "aria-label": "अंक 0",
        onclick: function () {
          addDigit(ui, "0");
        }
      })
    );

    pad.appendChild(
      helpers.el(
        "button",
        {
          class: "key key--fn",
          type: "button",
          "aria-label": "पिछला अंक मिटाएँ",
          onclick: function () {
            removeDigit(ui);
          }
        },
        [helpers.icon("delete", 20)]
      )
    );

    return pad;
  }

  function renderDots(ui, error) {
    ui.dots.forEach(function (dot, index) {
      dot.classList.toggle("is-filled", index < ui.digits.length);
    });
    ui.dots[0].parentNode.classList.toggle("is-error", Boolean(error));
  }

  function updateUnlockState(ui) {
    var ready = ui.digits.length === PIN_LENGTH;
    ui.unlockButton.disabled = !ready;
    ui.hint.textContent = ready
      ? "अनलॉक करने के लिए बटन दबाएँ या Enter दबाएँ।"
      : "कीबोर्ड से भी PIN टाइप कर सकते हैं।";
  }

  function syncInput(ui) {
    if (ui.input && ui.input.value !== ui.digits) ui.input.value = ui.digits;
  }

  function addDigit(ui, digit) {
    if (ui.digits.length >= PIN_LENGTH) return;
    ui.digits += digit;
    clearError(ui);
    renderDots(ui, false);
    updateUnlockState(ui);
    syncInput(ui);
  }

  function removeDigit(ui) {
    ui.digits = ui.digits.slice(0, -1);
    clearError(ui);
    renderDots(ui, false);
    updateUnlockState(ui);
    syncInput(ui);
  }

  function clearDigits(ui) {
    ui.digits = "";
    clearError(ui);
    renderDots(ui, false);
    updateUnlockState(ui);
    syncInput(ui);
  }

  function clearError(ui) {
    ui.error.textContent = "";
  }

  function showError(ui, message) {
    ui.error.textContent = message;
    renderDots(ui, true);
    window.setTimeout(function () {
      renderDots(ui, false);
    }, 460);
  }

  function attemptUnlock(ui) {
    if (ui.digits.length !== PIN_LENGTH) return;
    if (verifyPin(ui.digits)) {
      ui.digits = "";
      syncInput(ui);
      NB.storage.setSessionUnlocked(true);
      finishUnlock(ui);
      return;
    }

    ui.attempts += 1;
    var message = "ग़लत PIN। कृपया दोबारा प्रयास करें।";
    if (ui.attempts >= MAX_HINTS) {
      message = "ग़लत PIN (प्रयास " + ui.attempts + ")। ध्यान से दोबारा डालें।";
    }
    showError(ui, message);
    ui.digits = "";
    syncInput(ui);
    updateUnlockState(ui);
  }

  function finishUnlock(ui) {
    var shell = ui.root;
    if (shell) shell.classList.add("is-leaving");
    window.setTimeout(function () {
      if (shell && shell.parentNode) shell.parentNode.removeChild(shell);
      document.body.classList.remove("is-locked");
      if (typeof ui.onUnlock === "function") ui.onUnlock();
    }, 220);
  }

  function handleKeydown(ui, event) {
    if (event.target === ui.input && event.key !== "Escape") return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    if (/^[0-9]$/.test(event.key)) {
      event.preventDefault();
      addDigit(ui, event.key);
      return;
    }
    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      removeDigit(ui);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      attemptUnlock(ui);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      clearDigits(ui);
    }
  }

  function mount(container, options) {
    var settings = options || {};
    var helpers = NB.helpers;
    var ui = UI;

    ui.digits = "";
    ui.attempts = 0;
    ui.onUnlock = settings.onUnlock;
    ui.dots = [];

    var input = helpers.el("input", {
      class: "gate-input",
      id: "gate-pin-input",
      type: "password",
      inputmode: "numeric",
      autocomplete: "off",
      maxlength: String(PIN_LENGTH),
      "aria-label": "4 अंकों का PIN दर्ज करें"
    });

    var dotsRow = helpers.el("div", { class: "lock__dots", "aria-hidden": "true" });
    for (var i = 0; i < PIN_LENGTH; i += 1) {
      var dot = helpers.el("span", { class: "lock-dot" });
      ui.dots.push(dot);
      dotsRow.appendChild(dot);
    }

    var error = helpers.el("p", { class: "lock__error", role: "status", "aria-live": "polite" });
    var hint = helpers.el("p", { class: "lock__hint" });
    var unlockButton = helpers.el(
      "button",
      { class: "btn btn--primary btn--lg btn--block", type: "submit" },
      [helpers.el("span", { class: "btn__label" }, [helpers.icon("lock", 18), "अनलॉक करें"])]
    );

    var form = helpers.el("form", { class: "lock__form", novalidate: true }, [
      input,
      dotsRow,
      error,
      buildPad(ui),
      unlockButton
    ]);

    var shell = helpers.el("div", { class: "lock" }, [
      helpers.el("div", { class: "lock__card" }, [
        helpers.el("div", { class: "lock__brand" }, [
          helpers.el("div", { class: "lock__mark" }, [helpers.icon("book", 24)]),
          helpers.el("h1", { class: "lock__title", text: "NotesByME" }),
          helpers.el("p", {
            class: "lock__sub",
            text: "कक्षा 10 सामाजिक विज्ञान · इतिहास की महत्वपूर्ण तिथियाँ"
          })
        ]),
        form,
        hint
      ])
    ]);

    ui.root = shell;
    ui.input = input;
    ui.error = error;
    ui.hint = hint;
    ui.unlockButton = unlockButton;

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      attemptUnlock(ui);
    });

    input.addEventListener("input", function () {
      ui.digits = sanitize(input.value);
      input.value = ui.digits;
      renderDots(ui, false);
      updateUnlockState(ui);
    });

    dotsRow.addEventListener("click", function () {
      input.focus();
    });

    document.addEventListener("keydown", function (event) {
      if (!document.body.contains(shell)) return;
      handleKeydown(ui, event);
    });

    container.appendChild(shell);
    document.body.classList.add("is-locked");
    renderDots(ui, false);
    updateUnlockState(ui);

    // Physical keyboards focus immediately; touch devices use the pad.
    var touchOnly = "ontouchstart" in window && window.matchMedia("(pointer: coarse)").matches;
    if (!touchOnly) input.focus();

    return {
      element: shell,
      destroy: function () {
        if (shell.parentNode) shell.parentNode.removeChild(shell);
        document.body.classList.remove("is-locked");
      }
    };
  }

  NB.gate = {
    PIN_LENGTH: PIN_LENGTH,
    verifyPin: verifyPin,
    isUnlocked: function () {
      return NB.storage.isSessionUnlocked();
    },
    lock: function () {
      NB.storage.setSessionUnlocked(false);
    },
    mount: mount
  };
})();