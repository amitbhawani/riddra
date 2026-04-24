(function () {
  const root = document.getElementById("mg-pdf-word-root");
  if (!root) return;

  /* ── Utility Helpers ── */
  const h = (tag, attrs, ...children) => {
    const el = document.createElement(tag);
    if (attrs) Object.entries(attrs).forEach(([k, v]) => {
      if (k === "className") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === "innerHTML") el.innerHTML = v;
      else if (k === "textContent") el.textContent = v;
      else el.setAttribute(k, v);
    });
    children.flat(Infinity).forEach(c => {
      if (c == null) return;
      el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return el;
  };
  const qs = (sel, ctx) => (ctx || root).querySelector(sel);
  const fmt = (n) => {
    if (n < 1024) return n + " B";
    if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
    return (n / 1048576).toFixed(1) + " MB";
  };

  /* ── SVG Icons ── */
  const ICO = {
    upload: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
    pdf: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    convert: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>`,
    download: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    close: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    word: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13l1.5 5 1.5-3 1.5 3 1.5-5"/></svg>`,
    privacy: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    info: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    reset: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>`,
    check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    sun: "☀️",
    moon: "🌙"
  };

  /* ── State ── */
  let file = null;
  let isDark = false;
  let convertedBlob = null;
  let convertedUrl = null;

  /* ── Build UI ── */
  function render() {
    root.innerHTML = "";
    root.className = "mg-app mg-light";

    root.innerHTML = `
      <div class="mg-theme-bar">
        <div class="mg-theme-switch" id="theme-toggle">
          <span>Dark</span>
          <div class="mg-theme-pill">
            <div class="mg-theme-dot">${ICO.sun}</div>
          </div>
          <span>Light</span>
        </div>
      </div>

      <div class="mg-container">
        <div class="mg-hero mg-animate-in">
          <div class="mg-hero-badge">100% Private</div>
          <h1>PDF to <em>Word</em></h1>
          <p>Convert PDF documents to editable Word files with smart layout detection. Everything runs locally in your browser.</p>
        </div>

        <!-- Upload Section -->
        <div class="mg-section mg-animate-in" id="upload-section">
          <div class="mg-section-header">
            <div class="mg-section-icon">${ICO.pdf}</div>
            <div>
              <div class="mg-section-title">Upload PDF</div>
              <div class="mg-section-subtitle">Select or drag & drop your PDF file</div>
            </div>
            <div class="mg-section-badge">Step 1</div>
          </div>
          <div class="mg-section-body">
            <div class="mg-drop-zone" id="drop-zone">
              <div class="mg-drop-icon">${ICO.upload}</div>
              <div class="mg-drop-text">Drop your PDF here</div>
              <div class="mg-drop-sub">or click to browse files</div>
              <button class="mg-btn-secondary mg-browse-btn">${ICO.upload} Browse Files</button>
              <input type="file" id="file-input" accept="application/pdf" style="display:none;">
            </div>
            <div id="file-card-area" style="display:none;"></div>
          </div>
        </div>

        <!-- Convert Section -->
        <div class="mg-section mg-animate-in" id="convert-section" style="display:none;">
          <div class="mg-section-header">
            <div class="mg-section-icon">${ICO.convert}</div>
            <div>
              <div class="mg-section-title">Convert</div>
              <div class="mg-section-subtitle">Extract text with smart layout awareness</div>
            </div>
            <div class="mg-section-badge">Step 2</div>
          </div>
          <div class="mg-section-body">
            <div class="mg-subcard">
              <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
                <div>
                  <div class="mg-input-label" style="margin-bottom:2px;">Conversion Mode</div>
                  <div style="font-size:11px;color:var(--mu);">Smart layout-aware text extraction</div>
                </div>
                <div class="mg-pill-row" id="mode-pills">
                  <button class="mg-pill active" data-mode="smart">Smart</button>
                  <button class="mg-pill" data-mode="plain">Plain Text</button>
                </div>
              </div>
            </div>
            <div class="mg-action-row" style="justify-content:center;">
              <button class="mg-btn-primary" id="convert-btn">${ICO.convert} Convert to Word</button>
              <button class="mg-btn-secondary" id="reset-btn">${ICO.reset} Reset</button>
            </div>
            <!-- Progress -->
            <div id="progress-area" style="display:none;">
              <div class="mg-subcard">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                  <span style="font-size:12px;font-weight:600;">Converting...</span>
                  <span id="progress-pct" style="font-size:12px;font-weight:700;color:var(--mg-ac);font-family:var(--mg-font-mono);">0%</span>
                </div>
                <div style="height:6px;background:var(--bd);border-radius:99px;overflow:hidden;">
                  <div id="progress-bar" style="height:100%;width:0%;background:var(--mg-ac);border-radius:99px;transition:width 0.3s ease;"></div>
                </div>
                <div id="progress-status" style="font-size:11px;color:var(--mu);margin-top:6px;">Loading libraries...</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Result Section -->
        <div class="mg-section mg-animate-in" id="result-section" style="display:none;">
          <div class="mg-section-header">
            <div class="mg-section-icon">${ICO.word}</div>
            <div>
              <div class="mg-section-title">Conversion Complete</div>
              <div class="mg-section-subtitle">Your Word document is ready</div>
            </div>
            <div class="mg-section-badge" style="background:rgba(34,197,94,0.08);color:var(--mg-green);border-color:rgba(34,197,94,0.2);">Done</div>
          </div>
          <div class="mg-section-body">
            <div id="result-stats" class="mg-row-3"></div>
            <div class="mg-action-row" style="justify-content:center;">
              <button class="mg-btn-download" id="download-btn">${ICO.download} Download Word File</button>
              <button class="mg-btn-secondary" id="new-btn">${ICO.reset} Convert Another</button>
            </div>
          </div>
        </div>

        <!-- Disclaimers -->
        <div class="mg-section mg-animate-in" id="disclaimer-section">
          <div class="mg-section-body" style="padding-top:20px;">
            <div class="mg-disclaimer">
              <div class="mg-disclaimer-icon">${ICO.privacy}</div>
              <div><strong>Privacy First:</strong> Your files never leave your device. All processing happens locally in your browser. No server uploads, no cloud storage.</div>
            </div>
            <div class="mg-disclaimer">
              <div class="mg-disclaimer-icon">${ICO.info}</div>
              <div><strong>Note:</strong> Complex layouts, scanned images and intricate tables may not convert perfectly. Best results with text-based PDFs. The output preserves text structure, paragraphs, headings and basic formatting.</div>
            </div>
          </div>
        </div>

        <div class="mg-footer">
          PDF to Word Converter by <a href="https://mastergadgets.com" target="_blank">MasterGadgets.com</a> | Made with ❤️ by <a href="https://twitter.com/AmitBhawani" target="_blank">@AmitBhawani</a> in India
        </div>
      </div>
    `;

    bindEvents();
  }

  /* ── Event Binding ── */
  function bindEvents() {
    // Theme toggle
    qs("#theme-toggle").addEventListener("click", () => {
      isDark = !isDark;
      root.className = isDark ? "mg-app mg-dark" : "mg-app mg-light";
    });

    // File input
    const fileInput = qs("#file-input");
    const dropZone = qs("#drop-zone");

    dropZone.addEventListener("click", () => fileInput.click());
    dropZone.addEventListener("dragover", e => { e.preventDefault(); dropZone.classList.add("active"); });
    dropZone.addEventListener("dragleave", () => dropZone.classList.remove("active"));
    dropZone.addEventListener("drop", e => {
      e.preventDefault();
      dropZone.classList.remove("active");
      const f = e.dataTransfer.files[0];
      if (f && f.type === "application/pdf") handleFile(f);
      else showToast("Please select a valid PDF file.");
    });
    fileInput.addEventListener("change", e => {
      if (e.target.files[0]) handleFile(e.target.files[0]);
    });

    // Mode pills
    qs("#mode-pills").addEventListener("click", e => {
      const pill = e.target.closest(".mg-pill");
      if (!pill) return;
      qs("#mode-pills").querySelectorAll(".mg-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
    });

    // Convert
    qs("#convert-btn").addEventListener("click", startConversion);

    // Reset
    qs("#reset-btn").addEventListener("click", resetTool);
  }

  /* ── Handle File Selection ── */
  function handleFile(f) {
    file = f;
    const dropZone = qs("#drop-zone");
    dropZone.style.display = "none";

    const cardArea = qs("#file-card-area");
    cardArea.style.display = "block";
    cardArea.innerHTML = `
      <div class="mg-file-card">
        <div class="mg-file-icon">${ICO.pdf}</div>
        <div class="mg-file-details">
          <div class="mg-file-name">${f.name}</div>
          <div class="mg-file-meta">
            <span>${fmt(f.size)}</span>
            <span>PDF Document</span>
          </div>
        </div>
        <button class="mg-btn-secondary" id="remove-file-btn" style="padding:6px 12px;font-size:10px;">${ICO.close} Remove</button>
      </div>
    `;

    qs("#remove-file-btn").addEventListener("click", () => {
      file = null;
      dropZone.style.display = "";
      cardArea.style.display = "none";
      qs("#convert-section").style.display = "none";
      qs("#result-section").style.display = "none";
    });

    qs("#convert-section").style.display = "";
    qs("#result-section").style.display = "none";
  }

  /* ── Library Loader ── */
  function loadLibs() {
    return Promise.all([
      new Promise((res, rej) => {
        if (window.pdfjsLib) return res();
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
        s.onload = () => {
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          res();
        };
        s.onerror = () => rej(new Error("Failed to load PDF.js"));
        document.body.appendChild(s);
      }),
      new Promise((res, rej) => {
        if (window.docx) return res();
        const s = document.createElement("script");
        s.src = "https://unpkg.com/docx@8.0.3/build/index.js";
        s.onload = res;
        s.onerror = () => rej(new Error("Failed to load docx library"));
        document.body.appendChild(s);
      })
    ]);
  }

  /* ── Smart Text Extraction (layout-aware) ── */
  function extractSmartText(contentItems, pageWidth) {
    if (!contentItems || contentItems.length === 0) return [];

    // Group items by Y position into lines
    const lineMap = new Map();
    contentItems.forEach(item => {
      if (!item.str || item.str.trim() === "") return;
      const y = Math.round(item.transform[5]);
      // Find an existing line within 4pt tolerance
      let matchedY = null;
      for (const existingY of lineMap.keys()) {
        if (Math.abs(existingY - y) < 4) { matchedY = existingY; break; }
      }
      if (matchedY !== null) {
        lineMap.get(matchedY).push(item);
      } else {
        lineMap.set(y, [item]);
      }
    });

    // Sort lines top to bottom
    const sortedLines = [...lineMap.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([y, items]) => ({ y, items: items.sort((a, b) => a.transform[4] - b.transform[4]) }));

    // Detect headings and structure
    const paragraphs = [];
    let prevFontSize = 0;

    for (const line of sortedLines) {
      // Get dominant font size of line
      const fontSize = Math.round(line.items.reduce((max, item) => {
        const size = Math.abs(item.transform[0]) || 12;
        return size > max ? size : max;
      }, 0));

      // Build line text with smart spacing
      let lineText = "";
      let lastRight = 0;
      const avgCharWidth = line.items.reduce((sum, item) => sum + (item.width || 0), 0) /
        Math.max(line.items.reduce((sum, item) => sum + item.str.length, 0), 1);

      line.items.forEach((item, idx) => {
        const x = item.transform[4];
        if (idx > 0) {
          const gap = x - lastRight;
          if (gap > avgCharWidth * 6) lineText += "\t\t";
          else if (gap > avgCharWidth * 2.5) lineText += "\t";
          else if (gap > avgCharWidth * 0.4) lineText += " ";
        }
        lineText += item.str;
        lastRight = x + (item.width || 0);
      });

      lineText = lineText.trim();
      if (!lineText) continue;

      // Determine paragraph type
      let type = "body";
      if (fontSize >= 20) type = "h1";
      else if (fontSize >= 16) type = "h2";
      else if (fontSize >= 13 && lineText === lineText.toUpperCase() && lineText.length > 2) type = "h3";
      else if (lineText.match(/^[\d]+\.\s/) || lineText.match(/^[•\-–—]\s/)) type = "list";

      // Detect if text is bold (heuristic: font name contains Bold/Black)
      const isBold = line.items.some(item =>
        item.fontName && /bold|black|heavy|semibold/i.test(item.fontName)
      );
      if (isBold && type === "body" && lineText.length < 80) type = "h3";

      paragraphs.push({ text: lineText, type, fontSize, isBold });
      prevFontSize = fontSize;
    }

    return paragraphs;
  }

  /* ── Build DOCX with real formatting ── */
  function buildDocx(pages) {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, Tab, TabStopType, TabStopPosition } = window.docx;

    const children = [];

    pages.forEach((pageParagraphs, pageIdx) => {
      if (pageIdx > 0) {
        // Page break between pages
        children.push(new Paragraph({
          children: [new TextRun({ break: 1 })],
          pageBreakBefore: true
        }));
      }

      pageParagraphs.forEach(para => {
        const textParts = para.text.split("\t");
        const runs = [];

        textParts.forEach((part, i) => {
          if (i > 0) runs.push(new TextRun({ children: [new Tab()] }));
          const runOpts = { text: part };

          // Font sizing & bold based on type
          switch (para.type) {
            case "h1":
              runOpts.size = 36;
              runOpts.bold = true;
              runOpts.font = "Calibri";
              runOpts.color = "1a1510";
              break;
            case "h2":
              runOpts.size = 28;
              runOpts.bold = true;
              runOpts.font = "Calibri";
              runOpts.color = "2d2a26";
              break;
            case "h3":
              runOpts.size = 24;
              runOpts.bold = true;
              runOpts.font = "Calibri";
              runOpts.color = "3d3a36";
              break;
            default:
              runOpts.size = 22;
              runOpts.font = "Calibri";
              if (para.isBold) runOpts.bold = true;
              break;
          }

          runs.push(new TextRun(runOpts));
        });

        const paraOpts = { children: runs };

        // Heading levels for proper Word outline
        if (para.type === "h1") paraOpts.heading = HeadingLevel.HEADING_1;
        else if (para.type === "h2") paraOpts.heading = HeadingLevel.HEADING_2;
        else if (para.type === "h3") paraOpts.heading = HeadingLevel.HEADING_3;

        // Spacing
        paraOpts.spacing = {
          after: para.type.startsWith("h") ? 160 : 80,
          before: para.type === "h1" ? 240 : para.type === "h2" ? 180 : 40,
          line: 276 // 1.15 line spacing
        };

        // List indent
        if (para.type === "list") {
          paraOpts.indent = { left: 360 };
        }

        children.push(new Paragraph(paraOpts));
      });
    });

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: "Calibri",
              size: 22,
              color: "333333"
            }
          }
        }
      },
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440,   // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440
            }
          }
        },
        children
      }]
    });

    return Packer.toBlob(doc);
  }

  /* ── Plain Mode Extraction ── */
  function extractPlainText(contentItems) {
    if (!contentItems || contentItems.length === 0) return [];

    const lineMap = new Map();
    contentItems.forEach(item => {
      if (!item.str) return;
      const y = Math.round(item.transform[5]);
      let matchedY = null;
      for (const ey of lineMap.keys()) {
        if (Math.abs(ey - y) < 4) { matchedY = ey; break; }
      }
      if (matchedY !== null) lineMap.get(matchedY).push(item);
      else lineMap.set(y, [item]);
    });

    const sortedLines = [...lineMap.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([y, items]) => ({ y, items: items.sort((a, b) => a.transform[4] - b.transform[4]) }));

    return sortedLines.map(line => {
      let text = "";
      let lastRight = 0;
      line.items.forEach((item, idx) => {
        const x = item.transform[4];
        if (idx > 0) {
          const gap = x - lastRight;
          if (gap > 60) text += "\t\t";
          else if (gap > 25) text += "\t";
          else if (gap > 3) text += " ";
        }
        text += item.str;
        lastRight = x + (item.width || 0);
      });
      return { text: text.trim(), type: "body", fontSize: 11, isBold: false };
    }).filter(p => p.text);
  }

  /* ── Conversion Logic ── */
  async function startConversion() {
    if (!file) return;

    const convertBtn = qs("#convert-btn");
    const progressArea = qs("#progress-area");
    const progressBar = qs("#progress-bar");
    const progressPct = qs("#progress-pct");
    const progressStatus = qs("#progress-status");

    convertBtn.disabled = true;
    convertBtn.innerHTML = `<span class="mg-spinner"></span> Converting...`;
    progressArea.style.display = "";

    const isSmartMode = qs("#mode-pills .mg-pill.active").dataset.mode === "smart";

    try {
      // Step 1: Load libraries
      updateProgress(5, "Loading PDF.js & docx libraries...");
      await loadLibs();
      updateProgress(15, "Libraries loaded. Reading PDF...");

      // Step 2: Read PDF
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;

      updateProgress(20, `PDF loaded. ${totalPages} page${totalPages > 1 ? "s" : ""} found.`);

      // Step 3: Extract text page by page
      const allPages = [];
      let totalChars = 0;
      let totalWords = 0;

      for (let i = 1; i <= totalPages; i++) {
        const pct = 20 + Math.round((i / totalPages) * 50);
        updateProgress(pct, `Extracting page ${i} of ${totalPages}...`);

        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1 });

        let pageParagraphs;
        if (isSmartMode) {
          pageParagraphs = extractSmartText(content.items, viewport.width);
        } else {
          pageParagraphs = extractPlainText(content.items);
        }

        allPages.push(pageParagraphs);

        // Count stats
        pageParagraphs.forEach(p => {
          totalChars += p.text.length;
          totalWords += p.text.split(/\s+/).filter(w => w).length;
        });
      }

      // Step 4: Build DOCX
      updateProgress(75, "Building Word document...");
      convertedBlob = await buildDocx(allPages);
      convertedUrl = URL.createObjectURL(convertedBlob);

      updateProgress(100, "Done!");

      // Show result
      setTimeout(() => {
        showResult(totalPages, totalWords, totalChars);
      }, 400);

    } catch (err) {
      console.error("Conversion error:", err);
      progressStatus.textContent = "Error: " + err.message;
      progressBar.style.background = "var(--mg-red)";
    } finally {
      convertBtn.disabled = false;
      convertBtn.innerHTML = `${ICO.convert} Convert to Word`;
    }

    function updateProgress(pct, msg) {
      progressBar.style.width = pct + "%";
      progressPct.textContent = pct + "%";
      progressStatus.textContent = msg;
    }
  }

  /* ── Show Result ── */
  function showResult(pages, words, chars) {
    const resultSection = qs("#result-section");
    resultSection.style.display = "";

    qs("#result-stats").innerHTML = `
      <div class="mg-stat-card">
        <div class="mg-stat-label">Pages Processed</div>
        <div class="mg-stat-value mg-amber">${pages}</div>
      </div>
      <div class="mg-stat-card">
        <div class="mg-stat-label">Words Extracted</div>
        <div class="mg-stat-value">${words.toLocaleString()}</div>
      </div>
      <div class="mg-stat-card">
        <div class="mg-stat-label">Output Size</div>
        <div class="mg-stat-value mg-green">${fmt(convertedBlob.size)}</div>
      </div>
    `;

    // Bind download
    qs("#download-btn").onclick = () => {
      const baseName = file.name.replace(/\.pdf$/i, "");
      const a = document.createElement("a");
      a.href = convertedUrl;
      a.download = baseName + "-MasterGadgets.docx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    // Convert another
    qs("#new-btn").onclick = resetTool;

    // Scroll to result
    resultSection.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /* ── Reset ── */
  function resetTool() {
    file = null;
    if (convertedUrl) URL.revokeObjectURL(convertedUrl);
    convertedBlob = null;
    convertedUrl = null;

    qs("#drop-zone").style.display = "";
    qs("#file-card-area").style.display = "none";
    qs("#convert-section").style.display = "none";
    qs("#result-section").style.display = "none";
    qs("#progress-area").style.display = "none";
    qs("#progress-bar").style.width = "0%";
    qs("#progress-bar").style.background = "var(--mg-ac)";

    // Reset file input
    const fileInput = qs("#file-input");
    fileInput.value = "";

    // Scroll to top
    root.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ── Toast (simple notification) ── */
  function showToast(msg) {
    const existing = qs(".mg-toast");
    if (existing) existing.remove();

    const toast = h("div", { className: "mg-toast", textContent: msg });
    Object.assign(toast.style, {
      position: "fixed",
      bottom: "24px",
      left: "50%",
      transform: "translateX(-50%)",
      background: "var(--sf)",
      color: "var(--tx)",
      border: "1px solid var(--bd)",
      borderRadius: "var(--mg-radius-pill)",
      padding: "10px 24px",
      fontSize: "13px",
      fontWeight: "600",
      fontFamily: "var(--mg-font)",
      boxShadow: "var(--shadow-lg)",
      zIndex: "9999",
      animation: "mg-fade-up 0.3s ease"
    });
    root.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  /* ── Init ── */
  render();
})();
