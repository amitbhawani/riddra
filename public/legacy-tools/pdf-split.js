(function () {
  const root = document.getElementById("mg-pdf-split-root");
  if (!root) return;

  /* ── State ── */
  let pdfDoc = null;
  let pdfjsDoc = null;
  let selectedPages = new Set();
  let generatedFiles = [];
  let fileName = "";
  let totalPages = 0;
  let isDark = false;

  /* ── Render Shell ── */
  root.innerHTML = `
    <div class="mg-app mg-light mg-animate-in" id="pdf-split-app">

      <!-- Theme Toggle -->
      <div class="mg-theme-bar">
        <div class="mg-theme-switch" id="theme-toggle">
          <span>Dark</span>
          <div class="mg-theme-pill">
            <div class="mg-theme-dot">\u263E</div>
          </div>
          <span>Light</span>
        </div>
      </div>

      <div class="mg-container">

        <!-- Hero -->
        <div class="mg-hero">
          <div class="mg-hero-badge">Free Online Tool</div>
          <h1>Split <em>PDF</em> File</h1>
          <p>Select pages from your PDF and download them individually or as a ZIP. Everything is processed locally in your browser. No uploads, no cloud, 100% private.</p>
        </div>

        <!-- Upload Section -->
        <div class="mg-section" id="upload-section">
          <div class="mg-section-header">
            <div class="mg-section-icon">\uD83D\uDCC4</div>
            <div>
              <div class="mg-section-title">Upload PDF</div>
              <div class="mg-section-subtitle">Drag & drop or click to browse</div>
            </div>
          </div>
          <div class="mg-section-body">
            <div class="mg-pdf-dropzone" id="dropzone">
              <input type="file" id="file-input" accept="application/pdf" />
              <div class="mg-pdf-dropzone-inner" id="dropzone-inner">
                <div class="mg-pdf-dropzone-icon">\uD83D\uDCC1</div>
                <div class="mg-pdf-dropzone-text">
                  <strong>Choose a PDF file</strong>
                  <span>or drag and drop it here</span>
                </div>
              </div>
            </div>
            <!-- File info bar (shown after upload) -->
            <div class="mg-pdf-file-info" id="file-info" style="display:none">
              <div class="mg-pdf-file-icon">\uD83D\uDCCE</div>
              <div class="mg-pdf-file-meta">
                <div class="mg-pdf-file-name" id="file-name"></div>
                <div class="mg-pdf-file-detail" id="file-detail"></div>
              </div>
              <button class="mg-btn-secondary" id="clear-btn">Change File</button>
            </div>
          </div>
        </div>

        <!-- Loading Indicator -->
        <div class="mg-pdf-loader" id="loader" style="display:none">
          <div class="mg-pdf-spinner"></div>
          <span>Rendering page previews...</span>
        </div>

        <!-- Pages Section (hidden until PDF loaded) -->
        <div class="mg-section" id="pages-section" style="display:none">
          <div class="mg-section-header">
            <div class="mg-section-icon">\uD83D\uDDC2\uFE0F</div>
            <div style="flex:1">
              <div class="mg-section-title">Select Pages</div>
              <div class="mg-section-subtitle">Tap to select pages you want to extract</div>
            </div>
            <div class="mg-section-badge" id="select-count">0 selected</div>
          </div>
          <div class="mg-section-body">
            <!-- Quick Actions -->
            <div class="mg-pill-row">
              <button class="mg-pill" id="sel-all">Select All</button>
              <button class="mg-pill" id="sel-odd">Odd Pages</button>
              <button class="mg-pill" id="sel-even">Even Pages</button>
              <button class="mg-pill" id="sel-clear">Clear</button>
            </div>
            <!-- Page Range Input -->
            <div class="mg-subcard">
              <label class="mg-input-label">Page Range (e.g. 1-3, 5, 8-10)</label>
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                <div class="mg-input-field" style="flex:1;min-width:160px">
                  <input type="text" class="mg-input" id="range-input" placeholder="1-3, 5, 8-10" />
                </div>
                <button class="mg-pill" id="range-apply" style="white-space:nowrap">Apply Range</button>
              </div>
            </div>
            <!-- Thumbnails Grid -->
            <div class="mg-pdf-pages-grid" id="pages-container"></div>
          </div>
        </div>

        <!-- Actions Section (hidden until pages selected) -->
        <div class="mg-section" id="actions-section" style="display:none">
          <div class="mg-section-header">
            <div class="mg-section-icon">\u2702\uFE0F</div>
            <div>
              <div class="mg-section-title">Download</div>
              <div class="mg-section-subtitle">Export selected pages</div>
            </div>
          </div>
          <div class="mg-section-body">
            <div class="mg-row-2">
              <button class="mg-btn-primary" id="split-btn" style="width:100%;justify-content:center">
                \u2702\uFE0F Split & Download Pages
              </button>
              <button class="mg-btn-primary" id="merge-btn" style="width:100%;justify-content:center;background:var(--sf);color:var(--mg-ac);border:2px solid var(--mg-ac);box-shadow:none">
                \uD83D\uDCC2 Merge into One PDF
              </button>
            </div>
            <!-- Status & Downloads -->
            <div id="status" class="mg-pdf-status" style="display:none"></div>
            <div id="downloads" class="mg-pdf-downloads"></div>
            <button class="mg-btn-secondary" id="zip-btn" style="display:none;width:100%;justify-content:center;margin-top:4px">
              \uD83D\uDCE6 Download All as ZIP
            </button>
          </div>
        </div>

        <!-- Footer -->
        <div class="mg-footer">
          Split PDF Tool by <a href="https://mastergadgets.com" target="_blank">MasterGadgets.com</a><br/>
          Made with \u2764\uFE0F by <a href="https://twitter.com/AmiTBhawani" target="_blank">@AmitBhawani</a> in India
        </div>

      </div>
    </div>

    <style>
      /* ── Tool-specific styles (scoped under .mg-app) ── */

      /* Dropzone */
      .mg-pdf-dropzone {
        position: relative;
        border: 2px dashed var(--bd);
        border-radius: var(--mg-radius);
        background: var(--sf2);
        transition: border-color 0.3s, background 0.3s;
        cursor: pointer;
      }
      .mg-pdf-dropzone:hover,
      .mg-pdf-dropzone.dragover {
        border-color: var(--mg-ac);
        background: var(--ac-bg);
      }
      .mg-pdf-dropzone input[type="file"] {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        cursor: pointer;
        z-index: 2;
      }
      .mg-pdf-dropzone-inner {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 40px 24px;
        pointer-events: none;
      }
      .mg-pdf-dropzone-icon {
        font-size: 36px;
        line-height: 1;
      }
      .mg-pdf-dropzone-text {
        text-align: center;
      }
      .mg-pdf-dropzone-text strong {
        display: block;
        font-size: 15px;
        color: var(--mg-ac);
        font-weight: 700;
        margin-bottom: 4px;
      }
      .mg-pdf-dropzone-text span {
        font-size: 12px;
        color: var(--mu);
      }

      /* File Info Bar */
      .mg-pdf-file-info {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        background: var(--ac-bg);
        border: 1px solid var(--ac-bdr);
        border-radius: var(--mg-radius-sm);
      }
      .mg-pdf-file-icon { font-size: 22px; flex-shrink: 0; }
      .mg-pdf-file-meta { flex: 1; min-width: 0; }
      .mg-pdf-file-name {
        font-size: 13px;
        font-weight: 700;
        color: var(--tx);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .mg-pdf-file-detail {
        font-size: 11px;
        color: var(--mu);
        margin-top: 2px;
      }

      /* Loader */
      .mg-pdf-loader {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 28px;
        color: var(--mu);
        font-size: 13px;
        font-weight: 500;
      }
      .mg-pdf-spinner {
        width: 22px; height: 22px;
        border: 3px solid var(--bd);
        border-top-color: var(--mg-ac);
        border-radius: 50%;
        animation: mg-spin 0.7s linear infinite;
      }
      @keyframes mg-spin { to { transform: rotate(360deg); } }

      /* Pages Grid */
      .mg-pdf-pages-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 12px;
      }
      @media (max-width: 600px) {
        .mg-pdf-pages-grid {
          grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
          gap: 8px;
        }
      }

      /* Individual Page Thumbnail */
      .mg-pdf-page {
        position: relative;
        background: var(--sf2);
        border: 2px solid var(--bd);
        border-radius: var(--mg-radius-sm);
        overflow: hidden;
        cursor: pointer;
        transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
        -webkit-tap-highlight-color: transparent;
      }
      .mg-pdf-page:hover {
        border-color: var(--ac-bdr);
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
      }
      .mg-pdf-page.selected {
        border-color: var(--mg-ac);
        box-shadow: 0 0 0 3px rgba(var(--mg-ac-rgb), 0.18), var(--shadow-md);
      }
      .mg-pdf-page canvas {
        width: 100%;
        height: auto;
        display: block;
      }
      .mg-pdf-page-label {
        text-align: center;
        padding: 6px 4px;
        font-size: 10px;
        font-weight: 700;
        color: var(--mu);
        font-family: var(--mg-font-mono);
        background: var(--sf);
        border-top: 1px solid var(--bd);
      }
      .mg-pdf-page.selected .mg-pdf-page-label {
        background: var(--mg-ac);
        color: #fff;
        border-top-color: var(--mg-ac);
      }
      /* Check icon overlay */
      .mg-pdf-page-check {
        position: absolute;
        top: 6px; right: 6px;
        width: 22px; height: 22px;
        border-radius: 50%;
        background: var(--mg-ac);
        color: #fff;
        display: none;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 700;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      }
      .mg-pdf-page.selected .mg-pdf-page-check { display: flex; }

      /* Status */
      .mg-pdf-status {
        padding: 12px 16px;
        background: rgba(34, 197, 94, 0.08);
        border: 1px solid rgba(34, 197, 94, 0.2);
        border-radius: var(--mg-radius-sm);
        font-size: 13px;
        font-weight: 600;
        color: var(--mg-green);
        text-align: center;
      }

      /* Downloads List */
      .mg-pdf-downloads {
        display: grid;
        gap: 6px;
      }
      .mg-pdf-dl-link {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        background: var(--sf2);
        border: 1px solid var(--bd);
        border-radius: var(--mg-radius-sm);
        color: var(--mg-ac);
        text-decoration: none;
        font-size: 12px;
        font-weight: 600;
        transition: border-color 0.2s, background 0.2s;
      }
      .mg-pdf-dl-link:hover {
        border-color: var(--mg-ac);
        background: var(--ac-bg);
      }
      .mg-pdf-dl-icon { font-size: 16px; flex-shrink: 0; }
      .mg-pdf-dl-name { flex: 1; color: var(--tx); }
      .mg-pdf-dl-size { font-family: var(--mg-font-mono); font-size: 10px; color: var(--mu); }
      .mg-pdf-dl-arrow { color: var(--mg-ac); font-size: 14px; }
    </style>
  `;

  /* ── DOM Refs ── */
  const app = document.getElementById("pdf-split-app");
  const themeToggle = document.getElementById("theme-toggle");
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("file-input");
  const fileInfo = document.getElementById("file-info");
  const fileNameEl = document.getElementById("file-name");
  const fileDetailEl = document.getElementById("file-detail");
  const clearBtn = document.getElementById("clear-btn");
  const loader = document.getElementById("loader");
  const pagesSection = document.getElementById("pages-section");
  const pagesContainer = document.getElementById("pages-container");
  const selectCount = document.getElementById("select-count");
  const actionsSection = document.getElementById("actions-section");
  const splitBtn = document.getElementById("split-btn");
  const mergeBtn = document.getElementById("merge-btn");
  const zipBtn = document.getElementById("zip-btn");
  const statusEl = document.getElementById("status");
  const downloads = document.getElementById("downloads");
  const selAll = document.getElementById("sel-all");
  const selOdd = document.getElementById("sel-odd");
  const selEven = document.getElementById("sel-even");
  const selClear = document.getElementById("sel-clear");
  const rangeInput = document.getElementById("range-input");
  const rangeApply = document.getElementById("range-apply");

  /* ── Theme Toggle ── */
  themeToggle.addEventListener("click", () => {
    isDark = !isDark;
    app.classList.toggle("mg-dark", isDark);
    app.classList.toggle("mg-light", !isDark);
  });

  /* ── Drag & Drop ── */
  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      handleFile(file);
    }
  });

  /* ── File Input ── */
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  });

  /* ── Clear / Change File ── */
  clearBtn.addEventListener("click", () => {
    resetAll();
  });

  /* ── Load External Libs ── */
  function loadLibs() {
    return Promise.all([
      new Promise((res) => {
        if (window.PDFLib) return res();
        const s = document.createElement("script");
        s.src = "https://unpkg.com/pdf-lib/dist/pdf-lib.min.js";
        s.onload = res;
        document.body.appendChild(s);
      }),
      new Promise((res) => {
        if (window.JSZip) return res();
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
        s.onload = res;
        document.body.appendChild(s);
      }),
      new Promise((res) => {
        if (window.pdfjsLib) return res();
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
        s.onload = () => {
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          res();
        };
        document.body.appendChild(s);
      }),
    ]);
  }

  /* ── Format file size ── */
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  }

  /* ── Reset ── */
  function resetAll() {
    pdfDoc = null;
    pdfjsDoc = null;
    selectedPages.clear();
    generatedFiles = [];
    fileName = "";
    totalPages = 0;
    fileInput.value = "";
    pagesContainer.innerHTML = "";
    downloads.innerHTML = "";
    statusEl.style.display = "none";
    zipBtn.style.display = "none";
    pagesSection.style.display = "none";
    actionsSection.style.display = "none";
    fileInfo.style.display = "none";
    dropzone.style.display = "";
    rangeInput.value = "";
    updateSelectCount();
  }

  /* ── Update selection count badge ── */
  function updateSelectCount() {
    selectCount.textContent = selectedPages.size + " selected";
    actionsSection.style.display = selectedPages.size > 0 ? "" : "none";
  }

  /* ── Toggle page selection ── */
  function togglePage(index) {
    const wrapper = pagesContainer.children[index];
    if (!wrapper) return;
    if (selectedPages.has(index)) {
      selectedPages.delete(index);
      wrapper.classList.remove("selected");
    } else {
      selectedPages.add(index);
      wrapper.classList.add("selected");
    }
    updateSelectCount();
  }

  /* ── Set specific selection ── */
  function setSelection(indices) {
    selectedPages.clear();
    for (let i = 0; i < totalPages; i++) {
      const w = pagesContainer.children[i];
      if (!w) continue;
      if (indices.has(i)) {
        selectedPages.add(i);
        w.classList.add("selected");
      } else {
        w.classList.remove("selected");
      }
    }
    updateSelectCount();
  }

  /* ── Parse range string ── */
  function parseRange(str) {
    const indices = new Set();
    const parts = str.split(",");
    for (let part of parts) {
      part = part.trim();
      if (!part) continue;
      if (part.includes("-")) {
        const [a, b] = part.split("-").map((s) => parseInt(s.trim(), 10));
        if (!isNaN(a) && !isNaN(b)) {
          const start = Math.max(1, Math.min(a, b));
          const end = Math.min(totalPages, Math.max(a, b));
          for (let i = start; i <= end; i++) indices.add(i - 1);
        }
      } else {
        const n = parseInt(part, 10);
        if (!isNaN(n) && n >= 1 && n <= totalPages) indices.add(n - 1);
      }
    }
    return indices;
  }

  /* ── Handle File ── */
  async function handleFile(file) {
    await loadLibs();

    fileName = file.name.replace(/\.pdf$/i, "");
    const bytes = await file.arrayBuffer();

    /* Show loader, hide dropzone */
    dropzone.style.display = "none";
    loader.style.display = "flex";
    pagesSection.style.display = "none";
    actionsSection.style.display = "none";
    downloads.innerHTML = "";
    statusEl.style.display = "none";
    zipBtn.style.display = "none";
    generatedFiles = [];
    selectedPages.clear();

    try {
      pdfDoc = await PDFLib.PDFDocument.load(bytes);
      pdfjsDoc = await pdfjsLib.getDocument({ data: bytes }).promise;
      totalPages = pdfjsDoc.numPages;

      /* Show file info */
      fileNameEl.textContent = file.name;
      fileDetailEl.textContent = formatSize(file.size) + " \u00B7 " + totalPages + " page" + (totalPages !== 1 ? "s" : "");
      fileInfo.style.display = "flex";

      /* Render thumbnails */
      pagesContainer.innerHTML = "";
      for (let i = 0; i < totalPages; i++) {
        const page = await pdfjsDoc.getPage(i + 1);
        const scale = 0.4;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        await page.render({ canvasContext: ctx, viewport }).promise;

        const wrapper = document.createElement("div");
        wrapper.className = "mg-pdf-page";

        const check = document.createElement("div");
        check.className = "mg-pdf-page-check";
        check.textContent = "\u2713";

        const label = document.createElement("div");
        label.className = "mg-pdf-page-label";
        label.textContent = "Page " + (i + 1);

        wrapper.appendChild(check);
        wrapper.appendChild(canvas);
        wrapper.appendChild(label);

        const idx = i;
        wrapper.addEventListener("click", () => togglePage(idx));

        pagesContainer.appendChild(wrapper);
      }

      loader.style.display = "none";
      pagesSection.style.display = "";
      updateSelectCount();
    } catch (err) {
      loader.style.display = "none";
      dropzone.style.display = "";
      fileInfo.style.display = "none";
      alert("Could not read this PDF. It may be encrypted or corrupted.");
      console.error(err);
    }
  }

  /* ── Quick Selection Buttons ── */
  selAll.addEventListener("click", () => {
    const all = new Set();
    for (let i = 0; i < totalPages; i++) all.add(i);
    setSelection(all);
  });
  selOdd.addEventListener("click", () => {
    const odds = new Set();
    for (let i = 0; i < totalPages; i += 2) odds.add(i);
    setSelection(odds);
  });
  selEven.addEventListener("click", () => {
    const evens = new Set();
    for (let i = 1; i < totalPages; i += 2) evens.add(i);
    setSelection(evens);
  });
  selClear.addEventListener("click", () => setSelection(new Set()));
  rangeApply.addEventListener("click", () => {
    const val = rangeInput.value.trim();
    if (!val) return;
    setSelection(parseRange(val));
  });
  rangeInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") rangeApply.click();
  });

  /* ── Split: Download Individual Pages ── */
  splitBtn.addEventListener("click", async () => {
    if (!pdfDoc || selectedPages.size === 0) return;

    downloads.innerHTML = "";
    generatedFiles = [];
    statusEl.style.display = "none";
    zipBtn.style.display = "none";

    splitBtn.disabled = true;
    splitBtn.textContent = "Splitting...";

    const sorted = [...selectedPages].sort((a, b) => a - b);
    let count = 1;

    for (let pageIndex of sorted) {
      const newPdf = await PDFLib.PDFDocument.create();
      const [page] = await newPdf.copyPages(pdfDoc, [pageIndex]);
      newPdf.addPage(page);

      const bytes = await newPdf.save();
      const name = fileName + "-page" + (pageIndex + 1) + ".pdf";
      generatedFiles.push({ bytes, name });

      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.className = "mg-pdf-dl-link";
      link.innerHTML =
        '<span class="mg-pdf-dl-icon">\uD83D\uDCC4</span>' +
        '<span class="mg-pdf-dl-name">' + name + "</span>" +
        '<span class="mg-pdf-dl-size">' + formatSize(bytes.length) + "</span>" +
        '<span class="mg-pdf-dl-arrow">\u2193</span>';
      downloads.appendChild(link);
      count++;
    }

    statusEl.textContent = "\u2713 " + sorted.length + " page" + (sorted.length !== 1 ? "s" : "") + " split successfully";
    statusEl.style.display = "";
    zipBtn.style.display = generatedFiles.length > 1 ? "" : "none";

    splitBtn.disabled = false;
    splitBtn.innerHTML = "\u2702\uFE0F Split & Download Pages";
  });

  /* ── Merge: Download selected pages as one PDF ── */
  mergeBtn.addEventListener("click", async () => {
    if (!pdfDoc || selectedPages.size === 0) return;

    mergeBtn.disabled = true;
    mergeBtn.textContent = "Merging...";

    const sorted = [...selectedPages].sort((a, b) => a - b);
    const newPdf = await PDFLib.PDFDocument.create();
    const pages = await newPdf.copyPages(pdfDoc, sorted);
    pages.forEach((p) => newPdf.addPage(p));

    const bytes = await newPdf.save();
    const name = fileName + "-merged.pdf";

    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    downloads.innerHTML = "";
    generatedFiles = [{ bytes, name }];

    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.className = "mg-pdf-dl-link";
    link.innerHTML =
      '<span class="mg-pdf-dl-icon">\uD83D\uDCC2</span>' +
      '<span class="mg-pdf-dl-name">' + name + "</span>" +
      '<span class="mg-pdf-dl-size">' + formatSize(bytes.length) + "</span>" +
      '<span class="mg-pdf-dl-arrow">\u2193</span>';
    downloads.appendChild(link);

    statusEl.textContent = "\u2713 " + sorted.length + " pages merged into one PDF";
    statusEl.style.display = "";
    zipBtn.style.display = "none";

    mergeBtn.disabled = false;
    mergeBtn.innerHTML = "\uD83D\uDCC2 Merge into One PDF";
  });

  /* ── ZIP Download ── */
  zipBtn.addEventListener("click", async () => {
    if (generatedFiles.length === 0) return;

    zipBtn.disabled = true;
    zipBtn.textContent = "Creating ZIP...";

    const zip = new JSZip();
    generatedFiles.forEach((file) => zip.file(file.name, file.bytes));

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName + "-split.zip";
    a.click();

    zipBtn.disabled = false;
    zipBtn.textContent = "\uD83D\uDCE6 Download All as ZIP";
  });
})();
