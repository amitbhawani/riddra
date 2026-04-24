(function () {
  const root = document.getElementById("mg-pdf-merge-root");
  if (!root) return;

  /* ─── STATE ─── */
  let files = [];
  let downloadCount = 0;
  let lastBlobUrl = null;
  let theme = "mg-light";
  let merging = false;
  let mergeProgress = 0;
  let statusMsg = "";
  let statusType = "";
  let downloadReady = false;
  let downloadUrl = "";
  let downloadName = "";
  let dragOverIndex = -1;
  let dragSourceIndex = -1;

  /* ─── TOOL-SCOPED CSS ─── */
  const style = document.createElement("style");
  style.textContent = `
/* ─── PDF Merge Tool Scoped Styles ─── */
.mg-pdf-merge .mg-pdf-dropzone {
  border: 2px dashed var(--bd);
  border-radius: var(--mg-radius);
  padding: 40px 24px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.25s, background 0.25s, box-shadow 0.25s;
  background: var(--sf);
  position: relative;
}
.mg-pdf-dropzone:hover,
.mg-pdf-dropzone.active {
  border-color: var(--mg-ac);
  background: var(--ac-bg);
  box-shadow: 0 0 0 3px rgba(var(--mg-ac-rgb), 0.1);
}
.mg-pdf-dropzone-icon {
  font-size: 40px;
  margin-bottom: 12px;
  display: block;
  opacity: 0.7;
}
.mg-pdf-dropzone-title {
  font-family: var(--mg-font-display);
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 4px;
}
.mg-pdf-dropzone-sub {
  font-size: 13px;
  color: var(--mu);
  margin-bottom: 16px;
}
.mg-pdf-browse-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--mg-ac);
  color: #fff;
  border: none;
  padding: 10px 24px;
  border-radius: var(--mg-radius-pill);
  font-family: var(--mg-font);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.2s;
}
.mg-pdf-browse-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(var(--mg-ac-rgb), 0.35);
}
.mg-pdf-browse-btn:active { transform: translateY(0); }
.mg-pdf-hidden-input {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  opacity: 0;
  cursor: pointer;
}

/* ─── File List ─── */
.mg-pdf-file-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.mg-pdf-file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--sf);
  border: 1px solid var(--bd);
  border-radius: var(--mg-radius-sm);
  margin-bottom: 8px;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s, transform 0.15s;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
}
.mg-pdf-file-item:active { cursor: grabbing; }
.mg-pdf-file-item:hover { border-color: var(--ac-bdr); }
.mg-pdf-file-item.drag-over {
  border-color: var(--mg-ac);
  background: var(--ac-bg);
  box-shadow: 0 0 0 2px rgba(var(--mg-ac-rgb), 0.12);
}
.mg-pdf-file-item.dragging {
  opacity: 0.4;
  transform: scale(0.97);
}
.mg-pdf-file-grip {
  color: var(--mu);
  font-size: 14px;
  flex-shrink: 0;
  cursor: grab;
  line-height: 1;
}
.mg-pdf-file-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--ac-bg);
  color: var(--mg-ac);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  font-family: var(--mg-font-mono);
  flex-shrink: 0;
}
.mg-pdf-file-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  background: var(--sf2);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}
.mg-pdf-file-info {
  flex: 1;
  min-width: 0;
}
.mg-pdf-file-name {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mg-pdf-file-size {
  font-size: 11px;
  color: var(--mu);
  font-family: var(--mg-font-mono);
  margin-top: 2px;
}
.mg-pdf-file-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.mg-pdf-file-action {
  width: 30px;
  height: 30px;
  border: 1px solid var(--bd);
  border-radius: 6px;
  background: var(--sf2);
  color: var(--tx);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  transition: border-color 0.2s, background 0.2s, color 0.2s;
  font-family: var(--mg-font);
  padding: 0;
}
.mg-pdf-file-action:hover {
  border-color: var(--mg-ac);
  color: var(--mg-ac);
}
.mg-pdf-file-action.remove:hover {
  border-color: var(--mg-red);
  color: var(--mg-red);
  background: rgba(239, 68, 68, 0.06);
}

/* ─── Progress Bar ─── */
.mg-pdf-progress-wrap {
  margin-top: 16px;
  padding: 0 4px;
}
.mg-pdf-progress-bar {
  height: 6px;
  background: var(--sf2);
  border-radius: 99px;
  overflow: hidden;
}
.mg-pdf-progress-fill {
  height: 100%;
  background: var(--mg-ac);
  border-radius: 99px;
  transition: width 0.3s ease;
}
.mg-pdf-progress-text {
  font-size: 11px;
  color: var(--mu);
  margin-top: 6px;
  text-align: center;
  font-family: var(--mg-font-mono);
}

/* ─── Status ─── */
.mg-pdf-status {
  text-align: center;
  padding: 12px 16px;
  border-radius: var(--mg-radius-sm);
  font-size: 13px;
  font-weight: 500;
  margin-top: 16px;
}
.mg-pdf-status.success {
  background: rgba(34, 197, 94, 0.08);
  color: var(--mg-green);
  border: 1px solid rgba(34, 197, 94, 0.2);
}
.mg-pdf-status.error {
  background: rgba(239, 68, 68, 0.08);
  color: var(--mg-red);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

/* ─── Download Button ─── */
.mg-pdf-download-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px 24px;
  background: var(--mg-green);
  color: #fff;
  border: none;
  border-radius: var(--mg-radius-sm);
  font-family: var(--mg-font);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
  margin-top: 12px;
  transition: transform 0.15s, box-shadow 0.2s;
}
.mg-pdf-download-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(34, 197, 94, 0.35);
}

/* ─── Action Bar ─── */
.mg-pdf-action-bar {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}
.mg-pdf-action-bar button {
  flex: 1;
  padding: 12px 16px;
  border-radius: var(--mg-radius-sm);
  font-family: var(--mg-font);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: transform 0.12s, box-shadow 0.2s, opacity 0.2s;
}
.mg-pdf-action-bar button:active { transform: translateY(0); }
.mg-pdf-action-bar button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}
.mg-pdf-merge-action {
  background: var(--mg-ac);
  color: #fff;
}
.mg-pdf-merge-action:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(var(--mg-ac-rgb), 0.35);
}
.mg-pdf-clear-action {
  background: var(--sf2);
  color: var(--tx);
  border: 1px solid var(--bd) !important;
}
.mg-pdf-clear-action:hover:not(:disabled) {
  border-color: var(--mg-red) !important;
  color: var(--mg-red);
}

/* ─── File Count Badge ─── */
.mg-pdf-count-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--ac-bg);
  border: 1px solid var(--ac-bdr);
  border-radius: var(--mg-radius-pill);
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--mg-ac);
  margin-bottom: 12px;
}

/* ─── Total Size ─── */
.mg-pdf-total-size {
  font-size: 11px;
  color: var(--mu);
  text-align: right;
  margin-top: 4px;
  font-family: var(--mg-font-mono);
}

/* ─── Empty State ─── */
.mg-pdf-empty {
  text-align: center;
  padding: 24px 16px;
  color: var(--mu);
  font-size: 13px;
}

/* ─── Mobile Touch Reorder ─── */
@media (max-width: 600px) {
  .mg-pdf-dropzone { padding: 28px 16px; }
  .mg-pdf-dropzone-icon { font-size: 32px; }
  .mg-pdf-dropzone-title { font-size: 14px; }
  .mg-pdf-file-item { padding: 10px 12px; gap: 8px; }
  .mg-pdf-file-name { font-size: 12px; }
  .mg-pdf-file-action { width: 28px; height: 28px; font-size: 12px; }
  .mg-pdf-action-bar { flex-direction: column; }
}
  `;
  document.head.appendChild(style);

  /* ─── HELPERS ─── */
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(2) + " MB";
  }

  function getTotalSize() {
    return files.reduce((sum, f) => sum + f.size, 0);
  }

  function getFileName() {
    if (downloadCount === 0) return "MasterGadgets-Merged.pdf";
    return "MasterGadgets-Merged" + downloadCount + ".pdf";
  }

  function toggleTheme() {
    theme = theme === "mg-light" ? "mg-dark" : "mg-light";
    render();
  }

  /* ─── LOAD PDF-LIB (lazy) ─── */
  function loadPDFLib() {
    return new Promise(function (resolve, reject) {
      if (window.PDFLib) return resolve(window.PDFLib);
      var script = document.createElement("script");
      script.src = "https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js";
      script.onload = function () { resolve(window.PDFLib); };
      script.onerror = function () { reject(new Error("Failed to load PDF library. Please check your internet connection.")); };
      document.head.appendChild(script);
    });
  }

  /* ─── ADD FILES ─── */
  function addFiles(selectedFiles) {
    var added = 0;
    for (var i = 0; i < selectedFiles.length; i++) {
      var file = selectedFiles[i];
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        files.push(file);
        added++;
      }
    }
    if (added === 0 && selectedFiles.length > 0) {
      statusMsg = "Only PDF files are accepted. Please select valid PDF files.";
      statusType = "error";
    } else {
      statusMsg = "";
      statusType = "";
    }
    downloadReady = false;
    render();
  }

  /* ─── MOVE FILE ─── */
  function moveFile(from, to) {
    if (to < 0 || to >= files.length) return;
    var item = files.splice(from, 1)[0];
    files.splice(to, 0, item);
    render();
  }

  /* ─── REMOVE FILE ─── */
  function removeFile(index) {
    files.splice(index, 1);
    if (files.length === 0) {
      downloadReady = false;
      statusMsg = "";
      statusType = "";
      if (lastBlobUrl) { URL.revokeObjectURL(lastBlobUrl); lastBlobUrl = null; }
    }
    render();
  }

  /* ─── CLEAR ALL ─── */
  function clearAll() {
    files = [];
    statusMsg = "";
    statusType = "";
    downloadReady = false;
    merging = false;
    mergeProgress = 0;
    if (lastBlobUrl) { URL.revokeObjectURL(lastBlobUrl); lastBlobUrl = null; }
    render();
  }

  /* ─── MERGE ─── */
  async function mergePDFs() {
    if (files.length < 2 || merging) return;

    merging = true;
    mergeProgress = 0;
    statusMsg = "";
    statusType = "";
    downloadReady = false;
    render();

    try {
      mergeProgress = 5;
      render();

      var PDFLib = await loadPDFLib();
      var PDFDocument = PDFLib.PDFDocument;

      mergeProgress = 10;
      render();

      var mergedPdf = await PDFDocument.create();
      var totalPages = 0;

      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var bytes = await file.arrayBuffer();

        var pdf;
        try {
          pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
        } catch (e) {
          statusMsg = 'Failed to read "' + file.name + '". The file may be corrupted or password-protected.';
          statusType = "error";
          merging = false;
          mergeProgress = 0;
          render();
          return;
        }

        var pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach(function (p) { mergedPdf.addPage(p); });
        totalPages += pages.length;

        mergeProgress = 10 + Math.round(((i + 1) / files.length) * 80);
        render();
      }

      var mergedBytes = await mergedPdf.save();
      var blob = new Blob([mergedBytes], { type: "application/pdf" });

      if (lastBlobUrl) { URL.revokeObjectURL(lastBlobUrl); }

      downloadUrl = URL.createObjectURL(blob);
      lastBlobUrl = downloadUrl;
      downloadName = getFileName();
      downloadCount++;

      mergeProgress = 100;
      downloadReady = true;
      statusMsg = "Merged successfully! " + files.length + " files, " + totalPages + " pages, " + formatSize(blob.size);
      statusType = "success";
      merging = false;
      render();

      // Auto-download
      var tempLink = document.createElement("a");
      tempLink.href = downloadUrl;
      tempLink.download = downloadName;
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);

    } catch (err) {
      statusMsg = "Merge failed: " + (err.message || "Unknown error occurred.");
      statusType = "error";
      merging = false;
      mergeProgress = 0;
      render();
    }
  }

  /* ─── RENDER ─── */
  function render() {
    var hasFiles = files.length > 0;
    var canMerge = files.length >= 2 && !merging;

    root.innerHTML = '<div class="mg-app ' + theme + ' mg-pdf-merge">' +

      /* Theme Toggle */
      '<div class="mg-theme-bar">' +
        '<button class="mg-theme-toggle" id="mg-pdf-theme-btn">' +
          (theme === "mg-dark" ? "\u2600\uFE0F" : "\uD83C\uDF19") +
        '</button>' +
      '</div>' +

      /* Hero */
      '<div class="mg-hero">' +
        '<div class="mg-hero-badge">FREE TOOL</div>' +
        '<h1>Merge <em>PDF</em> Files</h1>' +
        '<p>Combine multiple PDF files into one. Fast, private, and completely free. Everything runs in your browser.</p>' +
      '</div>' +

      '<div class="mg-container">' +

        /* Upload Section */
        '<div class="mg-section mg-animate-in">' +
          '<div class="mg-section-header">' +
            '<div class="mg-section-icon">\uD83D\uDCC4</div>' +
            '<div>' +
              '<div class="mg-section-title">Upload PDF Files</div>' +
              '<div class="mg-section-subtitle">Add 2 or more PDFs to merge them together</div>' +
            '</div>' +
          '</div>' +
          '<div style="padding:0 24px 24px">' +
            '<div class="mg-pdf-dropzone" id="mg-pdf-dropzone">' +
              '<input type="file" id="mg-pdf-file-input" multiple accept="application/pdf,.pdf" class="mg-pdf-hidden-input" />' +
              '<span class="mg-pdf-dropzone-icon">\uD83D\uDCC1</span>' +
              '<div class="mg-pdf-dropzone-title">Drag & Drop PDFs Here</div>' +
              '<div class="mg-pdf-dropzone-sub">or click anywhere in this area to browse</div>' +
              '<button class="mg-pdf-browse-btn" id="mg-pdf-browse-btn">' +
                '\uD83D\uDCC2 Browse Files' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +

        /* File List Section */
        (hasFiles ? (
          '<div class="mg-section mg-animate-in">' +
            '<div class="mg-section-header">' +
              '<div class="mg-section-icon">\uD83D\uDDC2\uFE0F</div>' +
              '<div>' +
                '<div class="mg-section-title">Files to Merge (' + files.length + ')</div>' +
                '<div class="mg-section-subtitle">Drag to reorder or use arrows. Files merge in this order.</div>' +
              '</div>' +
            '</div>' +
            '<div style="padding:0 24px 20px">' +
              '<ul class="mg-pdf-file-list">' +
                files.map(function (file, index) {
                  var isDragOver = dragOverIndex === index && dragSourceIndex !== index;
                  var isDragging = dragSourceIndex === index;
                  return '<li class="mg-pdf-file-item' +
                    (isDragOver ? ' drag-over' : '') +
                    (isDragging ? ' dragging' : '') +
                    '" draggable="true" data-drag-index="' + index + '">' +
                    '<span class="mg-pdf-file-grip">\u2261</span>' +
                    '<span class="mg-pdf-file-num">' + (index + 1) + '</span>' +
                    '<span class="mg-pdf-file-icon">\uD83D\uDCC4</span>' +
                    '<div class="mg-pdf-file-info">' +
                      '<div class="mg-pdf-file-name" title="' + file.name.replace(/"/g, '&quot;') + '">' + file.name + '</div>' +
                      '<div class="mg-pdf-file-size">' + formatSize(file.size) + '</div>' +
                    '</div>' +
                    '<div class="mg-pdf-file-actions">' +
                      '<button class="mg-pdf-file-action" data-action="up" data-index="' + index + '" title="Move Up"' + (index === 0 ? ' disabled style="opacity:0.3"' : '') + '>\u2191</button>' +
                      '<button class="mg-pdf-file-action" data-action="down" data-index="' + index + '" title="Move Down"' + (index === files.length - 1 ? ' disabled style="opacity:0.3"' : '') + '>\u2193</button>' +
                      '<button class="mg-pdf-file-action remove" data-action="remove" data-index="' + index + '" title="Remove">\u2715</button>' +
                    '</div>' +
                  '</li>';
                }).join('') +
              '</ul>' +
              '<div class="mg-pdf-total-size">Total: ' + formatSize(getTotalSize()) + '</div>' +

              /* Action Buttons */
              '<div class="mg-pdf-action-bar">' +
                '<button class="mg-pdf-clear-action" id="mg-pdf-clear"' + (merging ? ' disabled' : '') + '>Clear All</button>' +
                '<button class="mg-pdf-merge-action" id="mg-pdf-merge"' + (!canMerge ? ' disabled' : '') + '>' +
                  (merging ? 'Merging...' : '\uD83D\uDD17 Merge ' + files.length + ' PDFs') +
                '</button>' +
              '</div>' +

              /* Progress */
              (merging ? (
                '<div class="mg-pdf-progress-wrap">' +
                  '<div class="mg-pdf-progress-bar">' +
                    '<div class="mg-pdf-progress-fill" style="width:' + mergeProgress + '%"></div>' +
                  '</div>' +
                  '<div class="mg-pdf-progress-text">Processing... ' + mergeProgress + '%</div>' +
                '</div>'
              ) : '') +

              /* Status */
              (statusMsg ? (
                '<div class="mg-pdf-status ' + statusType + '">' + statusMsg + '</div>'
              ) : '') +

              /* Download */
              (downloadReady ? (
                '<a class="mg-pdf-download-btn" id="mg-pdf-download" href="' + downloadUrl + '" download="' + downloadName + '">' +
                  '\u2B07\uFE0F Download ' + downloadName +
                '</a>'
              ) : '') +

            '</div>' +
          '</div>'
        ) : '') +

        /* Disclaimer + Footer */
        '<div class="mg-footer" style="font-size:12px">' +
          '<p><strong>PDF Merge Tool</strong> by <a href="https://mastergadgets.com" target="_blank" rel="noopener">MasterGadgets.com</a> | Made with \u2764\uFE0F by <a href="https://twitter.com/AmitBhawani" target="_blank" rel="noopener">@AmitBhawani</a> in India</p>' +
          '<p style="margin-top:8px;max-width:700px;margin-left:auto;margin-right:auto;line-height:1.65">' +
            '<strong>Disclaimer:</strong> This tool is for personal and informational use only. All PDF processing happens entirely in your browser. No files are uploaded to any server, no data is stored on the cloud or in browser storage. Your documents remain 100% private. MasterGadgets.com does not access, collect, or retain any of your files. Results may vary with encrypted or password-protected PDFs.' +
          '</p>' +
        '</div>' +

      '</div>' + /* container */
    '</div>'; /* mg-app */

    bindEvents();
  }

  /* ─── BIND EVENTS ─── */
  function bindEvents() {
    /* Theme toggle */
    var themeBtn = document.getElementById("mg-pdf-theme-btn");
    if (themeBtn) themeBtn.addEventListener("click", toggleTheme);

    /* File input */
    var fileInput = document.getElementById("mg-pdf-file-input");
    var browseBtn = document.getElementById("mg-pdf-browse-btn");
    var dropzone = document.getElementById("mg-pdf-dropzone");

    if (browseBtn && fileInput) {
      browseBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        fileInput.click();
      });
    }

    if (fileInput) {
      fileInput.addEventListener("change", function (e) {
        addFiles(e.target.files);
        e.target.value = "";
      });
    }

    if (dropzone) {
      dropzone.addEventListener("dragover", function (e) {
        e.preventDefault();
        dropzone.classList.add("active");
      });
      dropzone.addEventListener("dragleave", function () {
        dropzone.classList.remove("active");
      });
      dropzone.addEventListener("drop", function (e) {
        e.preventDefault();
        dropzone.classList.remove("active");
        addFiles(e.dataTransfer.files);
      });
      /* Click on dropzone (not on browse button) also opens file picker */
      dropzone.addEventListener("click", function (e) {
        if (e.target === dropzone || e.target.classList.contains("mg-pdf-dropzone-icon") ||
            e.target.classList.contains("mg-pdf-dropzone-title") ||
            e.target.classList.contains("mg-pdf-dropzone-sub")) {
          fileInput.click();
        }
      });
    }

    /* File list actions (up/down/remove) */
    var listItems = root.querySelectorAll(".mg-pdf-file-action");
    listItems.forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var index = parseInt(btn.getAttribute("data-index"));
        var action = btn.getAttribute("data-action");
        if (action === "remove") removeFile(index);
        else if (action === "up") moveFile(index, index - 1);
        else if (action === "down") moveFile(index, index + 1);
      });
    });

    /* Drag reorder on file list items */
    var draggables = root.querySelectorAll("[data-drag-index]");
    draggables.forEach(function (el) {
      el.addEventListener("dragstart", function (e) {
        dragSourceIndex = parseInt(el.getAttribute("data-drag-index"));
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", dragSourceIndex.toString());
        setTimeout(function () { render(); }, 0);
      });
      el.addEventListener("dragover", function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        var newOver = parseInt(el.getAttribute("data-drag-index"));
        if (newOver !== dragOverIndex) {
          dragOverIndex = newOver;
          render();
        }
      });
      el.addEventListener("dragleave", function () {
        /* Only clear if truly leaving */
      });
      el.addEventListener("drop", function (e) {
        e.preventDefault();
        var to = parseInt(el.getAttribute("data-drag-index"));
        if (dragSourceIndex !== -1 && dragSourceIndex !== to) {
          moveFile(dragSourceIndex, to);
        }
        dragSourceIndex = -1;
        dragOverIndex = -1;
        render();
      });
      el.addEventListener("dragend", function () {
        dragSourceIndex = -1;
        dragOverIndex = -1;
        render();
      });
    });

    /* Merge button */
    var mergeBtn = document.getElementById("mg-pdf-merge");
    if (mergeBtn) mergeBtn.addEventListener("click", mergePDFs);

    /* Clear button */
    var clearBtn = document.getElementById("mg-pdf-clear");
    if (clearBtn) clearBtn.addEventListener("click", clearAll);
  }

  /* ─── INIT ─── */
  render();
})();
