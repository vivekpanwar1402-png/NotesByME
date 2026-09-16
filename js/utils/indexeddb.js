/* ==========================================================================
   NotesByME — IndexedDB storage for larger user content
   Uses IndexedDB for notes, doubts, and images (blobs).
   Falls back to in-memory if IndexedDB is unavailable.
   ========================================================================== */

(function () {
  "use strict";

  var NB = (window.NB = window.NB || {});

  var DB_NAME = "nbme-content";
  var DB_VERSION = 1;
  var STORE_NOTES = "notes";
  var STORE_DOUBTS = "doubts";
  var STORE_IMAGES = "images";
  var memory = {
    notes: [],
    doubts: [],
    images: []
  };
  var db = null;
  var dbReady = null;

  function openDB() {
    if (db) return Promise.resolve(db);
    if (dbReady) return dbReady;
    dbReady = new Promise(function (resolve, reject) {
      try {
        var request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = function () { reject(request.error); };
        request.onsuccess = function () {
          db = request.result;
          loadAllFromDB().then(function () {
            resolve(db);
          });
        };
        request.onupgradeneeded = function (event) {
          var target = event.target.result;
          if (!target.objectStoreNames.contains(STORE_NOTES)) {
            var notesStore = target.createObjectStore(STORE_NOTES, { keyPath: "id" });
            notesStore.createIndex("subject", "subject", { unique: false });
            notesStore.createIndex("chapter", "chapter", { unique: false });
          }
          if (!target.objectStoreNames.contains(STORE_DOUBTS)) {
            var doubtsStore = target.createObjectStore(STORE_DOUBTS, { keyPath: "id" });
            doubtsStore.createIndex("subject", "subject", { unique: false });
            doubtsStore.createIndex("status", "status", { unique: false });
          }
          if (!target.objectStoreNames.contains(STORE_IMAGES)) {
            var imagesStore = target.createObjectStore(STORE_IMAGES, { keyPath: "id" });
            imagesStore.createIndex("subject", "subject", { unique: false });
          }
        };
      } catch (error) {
        reject(error);
      }
    });
    return dbReady;
  }

  /* ----------------------------------------------------------- internal --- */

  function generateId() {
    return "nbme-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function saveToDB(storeName, record) {
    return openDB().then(function () {
      // openDB() only resolves once the module-level `db` handle is assigned.
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).put(record);
        tx.oncomplete = function () { resolve(record); };
        tx.onerror = function () { reject(tx.error); };
        tx.onabort = function () { reject(tx.error); };
      });
    }).catch(function () {
      // IndexedDB unavailable: the in-memory copy stays authoritative.
      return record;
    });
  }

  function removeFromDB(storeName, id) {
    return openDB().then(function () {
      // openDB() only resolves once the module-level `db` handle is assigned.
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).delete(id);
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { reject(tx.error); };
        tx.onabort = function () { reject(tx.error); };
      });
    }).catch(function () {
      return false;
    });
  }

  function loadAllFromDB() {
    if (!db) return Promise.resolve();

    function readAll(storeName) {
      return new Promise(function (resolve) {
        var records = [];
        try {
          var request = db.transaction(storeName, "readonly").objectStore(storeName).openCursor();
          request.onsuccess = function () {
            var cursor = request.result;
            if (!cursor) { resolve(records); return; }
            records.push(cursor.value);
            cursor.continue();
          };
          request.onerror = function () { resolve(records); };
        } catch (error) {
          resolve(records);
        }
      });
    }

    function merge(target, records) {
      records.forEach(function (record) {
        if (!record || !record.id) return;
        for (var i = 0; i < target.length; i++) {
          if (target[i].id === record.id) return;
        }
        target.push(record);
      });
    }

    return Promise.all([readAll(STORE_NOTES), readAll(STORE_DOUBTS), readAll(STORE_IMAGES)])
      .then(function (results) {
        merge(memory.notes, results[0]);
        merge(memory.doubts, results[1]);
        merge(memory.images, results[2]);
      });
  }

  function whenReady() {
    // Resolves once IndexedDB is open and persisted records are in memory.
    // A failed open falls back to the in-memory state instead of rejecting.
    return openDB().catch(function () {
      return null;
    });
  }

  /* ------------------------------------------------------------- notes --- */

  function notes() {
    return whenReady().then(function () {
      return memory.notes.slice();
    });
  }

  function getNote(id) {
    for (var i = 0; i < memory.notes.length; i++) {
      if (memory.notes[i].id === id) return memory.notes[i];
    }
    return null;
  }

  function saveNote(note) {
    if (!note.id) note.id = generateId();
    note.updatedAt = new Date().toISOString();
    memory.notes.push(note);
    return saveToDB(STORE_NOTES, note).then(function () { return note; });
  }

  function updateNote(id, updates) {
    for (var i = 0; i < memory.notes.length; i++) {
      if (memory.notes[i].id === id) {
        var updated = Object.assign({}, memory.notes[i], updates, { updatedAt: new Date().toISOString() });
        memory.notes[i] = updated;
        return saveToDB(STORE_NOTES, updated).then(function () { return updated; });
      }
    }
    return Promise.resolve(null);
  }

  function deleteNote(id) {
    var index = -1;
    for (var i = 0; i < memory.notes.length; i++) {
      if (memory.notes[i].id === id) { index = i; break; }
    }
    if (index === -1) return Promise.resolve(false);
    memory.notes.splice(index, 1);
    return removeFromDB(STORE_NOTES, id).then(function () { return true; });
  }

  function searchNotes(query) {
    var q = query.toLowerCase().trim();
    if (!q) return memory.notes.slice();
    return memory.notes.filter(function (note) {
      return note.title.toLowerCase().indexOf(q) !== -1 ||
        (note.content && note.content.toLowerCase().indexOf(q) !== -1) ||
        (note.subject && note.subject.toLowerCase().indexOf(q) !== -1) ||
        (note.chapter && note.chapter.toLowerCase().indexOf(q) !== -1) ||
        (note.topic && note.topic.toLowerCase().indexOf(q) !== -1);
    });
  }

  function filterNotes(options) {
    return memory.notes.filter(function (note) {
      if (options.subject && note.subject !== options.subject) return false;
      if (options.chapter && note.chapter !== options.chapter) return false;
      if (options.topic && note.topic !== options.topic) return false;
      return true;
    });
  }

  /* ------------------------------------------------------------- doubts --- */

  function doubts() {
    return whenReady().then(function () {
      return memory.doubts.slice();
    });
  }

  function getDoubt(id) {
    for (var i = 0; i < memory.doubts.length; i++) {
      if (memory.doubts[i].id === id) return memory.doubts[i];
    }
    return null;
  }

  function saveDoubt(doubt) {
    if (!doubt.id) doubt.id = generateId();
    doubt.createdAt = doubt.createdAt || new Date().toISOString();
    doubt.updatedAt = new Date().toISOString();
    if (!doubt.status) doubt.status = "unresolved";
    memory.doubts.push(doubt);
    return saveToDB(STORE_DOUBTS, doubt).then(function () { return doubt; });
  }

  function updateDoubt(id, updates) {
    for (var i = 0; i < memory.doubts.length; i++) {
      if (memory.doubts[i].id === id) {
        var updated = Object.assign({}, memory.doubts[i], updates, { updatedAt: new Date().toISOString() });
        memory.doubts[i] = updated;
        return saveToDB(STORE_DOUBTS, updated).then(function () { return updated; });
      }
    }
    return Promise.resolve(null);
  }

  function resolveDoubt(id) {
    return updateDoubt(id, { status: "resolved" });
  }

  function unresolveDoubt(id) {
    return updateDoubt(id, { status: "unresolved" });
  }

  function deleteDoubt(id) {
    var index = -1;
    for (var i = 0; i < memory.doubts.length; i++) {
      if (memory.doubts[i].id === id) { index = i; break; }
    }
    if (index === -1) return Promise.resolve(false);
    memory.doubts.splice(index, 1);
    return removeFromDB(STORE_DOUBTS, id).then(function () { return true; });
  }

  function searchDoubts(query) {
    var q = query.toLowerCase().trim();
    if (!q) return memory.doubts.slice();
    return memory.doubts.filter(function (doubt) {
      return doubt.question.toLowerCase().indexOf(q) !== -1 ||
        (doubt.subject && doubt.subject.toLowerCase().indexOf(q) !== -1) ||
        (doubt.chapter && doubt.chapter.toLowerCase().indexOf(q) !== -1) ||
        (doubt.topic && doubt.topic.toLowerCase().indexOf(q) !== -1) ||
        (doubt.notes && doubt.notes.toLowerCase().indexOf(q) !== -1);
    });
  }

  function filterDoubts(options) {
    return memory.doubts.filter(function (doubt) {
      if (options.subject && doubt.subject !== options.subject) return false;
      if (options.chapter && doubt.chapter !== options.chapter) return false;
      if (options.status && doubt.status !== options.status) return false;
      return true;
    });
  }

  /* ------------------------------------------------------------- images --- */

  function images() {
    return whenReady().then(function () {
      return memory.images.slice();
    });
  }

  function getImage(id) {
    for (var i = 0; i < memory.images.length; i++) {
      if (memory.images[i].id === id) return memory.images[i];
    }
    return null;
  }

  function saveImage(image) {
    if (!image.id) image.id = generateId();
    image.uploadedAt = new Date().toISOString();
    memory.images.push(image);
    return saveToDB(STORE_IMAGES, image).then(function () { return image; });
  }

  function deleteImage(id) {
    var index = -1;
    for (var i = 0; i < memory.images.length; i++) {
      if (memory.images[i].id === id) { index = i; break; }
    }
    if (index === -1) return Promise.resolve(false);
    memory.images.splice(index, 1);
    return removeFromDB(STORE_IMAGES, id).then(function () { return true; });
  }

  function searchImages(query) {
    var q = query.toLowerCase().trim();
    if (!q) return memory.images.slice();
    return memory.images.filter(function (image) {
      return (image.title && image.title.toLowerCase().indexOf(q) !== -1) ||
        (image.subject && image.subject.toLowerCase().indexOf(q) !== -1) ||
        (image.description && image.description.toLowerCase().indexOf(q) !== -1);
    });
  }

  /* ------------------------------------------------------------- export --- */

  function exportAllData() {
    return whenReady().then(buildExportData);
  }

  function buildExportData() {
    var exportNotes = JSON.stringify(memory.notes, null, 2);
    var exportDoubts = JSON.stringify(memory.doubts, null, 2);
    var exportImagesMeta = JSON.stringify(memory.images.map(function (img) {
      var copy = Object.assign({}, img);
      if (copy.blob) {
        copy.blob = null;
        copy.blobUri = null;
        copy.size = img.blob ? img.blob.size : 0;
        copy.type = img.blob ? img.blob.type : "";
      }
      return copy;
    }), null, 2);
    return {
      exportedAt: new Date().toISOString(),
      version: DB_VERSION,
      notes: exportNotes,
      doubts: exportDoubts,
      imagesMeta: exportImagesMeta,
      _note: "Images are stored as blobs in IndexedDB. This export contains metadata only for images."
    };
  }

  NB.idb = {
    notes: notes,
    getNote: getNote,
    saveNote: saveNote,
    updateNote: updateNote,
    deleteNote: deleteNote,
    searchNotes: searchNotes,
    filterNotes: filterNotes,
    doubts: doubts,
    getDoubt: getDoubt,
    saveDoubt: saveDoubt,
    updateDoubt: updateDoubt,
    resolveDoubt: resolveDoubt,
    unresolveDoubt: unresolveDoubt,
    deleteDoubt: deleteDoubt,
    searchDoubts: searchDoubts,
    filterDoubts: filterDoubts,
    images: images,
    getImage: getImage,
    saveImage: saveImage,
    deleteImage: deleteImage,
    searchImages: searchImages,
    exportAllData: exportAllData,
    openDB: openDB
  };
})();