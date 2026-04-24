(function () {
  const root = document.getElementById("mg-pdf-unlock-root");
  if (!root) return;

  /* ── State ── */
  let file = null;
  let lastUrl = null;
  let isProcessing = false;
  let isDark = false;
  let fileAnalysis = null;

  /* ── Render Shell ── */
  root.innerHTML = `
    <div class="mg-app mg-light mg-animate-in" id="pdf-unlock-app">

      <!-- Theme Toggle -->
      <div class="mg-theme-bar">
        <div class="mg-theme-switch" id="pu-theme-toggle">
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
          <h1>Unlock <em>PDF</em> File</h1>
          <p>Remove password protection from your PDF files. Everything runs 100% in your browser — no uploads, no cloud, fully private.</p>
        </div>

        <!-- Upload Section -->
        <div class="mg-section mg-animate-in">
          <div class="mg-section-header">
            <div class="mg-section-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mg-ac)" stroke-width="2" stroke-linecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <div>
              <div class="mg-section-title">Upload PDF</div>
              <div class="mg-section-subtitle">Select a password-protected PDF file</div>
            </div>
          </div>
          <div class="mg-section-body">
            <div id="pu-drop-zone" class="mg-drop-zone">
              <div class="mg-drop-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--mg-ac)" stroke-width="1.5" stroke-linecap="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <rect x="8" y="12" width="8" height="6" rx="1" stroke="var(--mg-ac)" fill="none"/>
                  <path d="M10 15h4" stroke="var(--mg-ac)"/>
                </svg>
              </div>
              <p class="mg-drop-text">Drag & drop your PDF here</p>
              <p class="mg-drop-sub">or</p>
              <label class="mg-btn-secondary mg-browse-btn" for="pu-file-input">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Browse Files
              </label>
              <input type="file" id="pu-file-input" accept="application/pdf" style="display:none;" />
            </div>
            <div id="pu-file-info" style="display:none;"></div>
          </div>
        </div>

        <!-- Password & Unlock Section -->
        <div id="pu-action-section" class="mg-section mg-animate-in" style="display:none;">
          <div class="mg-section-header">
            <div class="mg-section-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mg-ac)" stroke-width="2" stroke-linecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div>
              <div class="mg-section-title">Unlock</div>
              <div class="mg-section-subtitle">Enter password and remove protection</div>
            </div>
          </div>
          <div class="mg-section-body">
            <div class="mg-subcard">
              <label class="mg-input-label" for="pu-password">PDF Password</label>
              <div class="mg-input-field">
                <span class="mg-input-prefix">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input type="password" class="mg-input" id="pu-password" placeholder="Enter password (if required)" autocomplete="off" />
                <button id="pu-eye-btn" class="pu-eye-btn" type="button" title="Show/hide password">
                  <svg id="pu-eye-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--mu)" stroke-width="2" stroke-linecap="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </div>
            </div>
            <div class="mg-action-row">
              <button id="pu-unlock-btn" class="mg-btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                </svg>
                Unlock PDF
              </button>
              <button id="pu-clear-btn" class="mg-btn-secondary">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Clear
              </button>
            </div>
            <p id="pu-status"></p>
          </div>
        </div>

        <!-- Result Section -->
        <div id="pu-result-section" class="mg-section mg-animate-in" style="display:none;">
          <div class="mg-section-header">
            <div class="mg-section-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mg-green)" stroke-width="2" stroke-linecap="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <div>
              <div class="mg-section-title">Result</div>
              <div class="mg-section-subtitle">Your unlocked file is ready</div>
            </div>
          </div>
          <div class="mg-section-body">
            <div id="pu-result-content"></div>
          </div>
        </div>

        <!-- Disclaimer -->
        <div class="mg-section mg-animate-in">
          <div class="mg-section-body" style="padding-top:20px;">
            <div class="mg-disclaimer">
              <div class="mg-disclaimer-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mg-green)" stroke-width="2" stroke-linecap="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div><strong>100% Private.</strong> Your files never leave your device. Everything runs locally in your browser. No uploads, no cloud, no tracking.</div>
            </div>
            <div class="mg-disclaimer">
              <div class="mg-disclaimer-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mg-ac)" stroke-width="2" stroke-linecap="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
              </div>
              <div>This tool uses pdf-lib to remove owner/user password restrictions. Only use this on PDFs you are legally authorized to unlock.</div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="mg-footer">
          PDF Unlock by <a href="https://mastergadgets.com" target="_blank" rel="noopener">MasterGadgets.com</a> | Made with \u2764\uFE0F by <a href="https://twitter.com/AmitBhawani" target="_blank" rel="noopener">@AmitBhawani</a> in India
        </div>

      </div>
    </div>

    <style>
      /* ── Tool-specific styles (shared components come from mg-design.css) ── */
      .pu-eye-btn {
        background: none;
        border: none;
        padding: 8px 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        opacity: 0.6;
        transition: opacity 0.2s;
      }
      .pu-eye-btn:hover { opacity: 1; }
      #pu-status {
        font-size: 12px;
        color: var(--mu);
        min-height: 18px;
      }
      #pu-status.pu-error { color: var(--mg-red); }
      #pu-status.pu-success { color: var(--mg-green); }
      .pu-result-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 12px;
        margin-bottom: 16px;
      }
      @media (max-width: 600px) {
        .pu-result-grid { grid-template-columns: 1fr; }
      }
      .pu-download-row {
        display: flex;
        gap: 12px;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
      }
    </style>
  `;

  /* ── DOM refs ── */
  const app = document.getElementById("pdf-unlock-app");
  const themeToggle = document.getElementById("pu-theme-toggle");
  const dropZone = document.getElementById("pu-drop-zone");
  const fileInput = document.getElementById("pu-file-input");
  const fileInfo = document.getElementById("pu-file-info");
  const actionSection = document.getElementById("pu-action-section");
  const passwordInput = document.getElementById("pu-password");
  const eyeBtn = document.getElementById("pu-eye-btn");
  const unlockBtn = document.getElementById("pu-unlock-btn");
  const clearBtn = document.getElementById("pu-clear-btn");
  const status = document.getElementById("pu-status");
  const resultSection = document.getElementById("pu-result-section");
  const resultContent = document.getElementById("pu-result-content");

  /* ── Theme Toggle ── */
  themeToggle.addEventListener("click", function () {
    isDark = !isDark;
    app.classList.toggle("mg-dark", isDark);
    app.classList.toggle("mg-light", !isDark);
    try { localStorage.setItem("mg-theme", isDark ? "dark" : "light"); } catch (e) {}
  });
  // Restore saved theme (light default)
  try {
    if (localStorage.getItem("mg-theme") === "dark") {
      isDark = true;
      app.classList.remove("mg-light");
      app.classList.add("mg-dark");
    }
  } catch (e) {}

  /* ── Library Loader ── */
  function loadPDFLib() {
    return new Promise(function (resolve, reject) {
      if (window.PDFLib) return resolve(window.PDFLib);
      var s = document.createElement("script");
      s.src = "https://unpkg.com/pdf-lib/dist/pdf-lib.min.js";
      s.onload = function () { resolve(window.PDFLib); };
      s.onerror = function () { reject(new Error("Failed to load pdf-lib")); };
      document.head.appendChild(s);
    });
  }

  /* ── Format Size ── */
  function fmt(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(2) + " MB";
  }

  /* ── Analyze File ── */
  async function analyzeFile(f) {
    var PDFLib = await loadPDFLib();
    var buffer = await f.arrayBuffer();
    try {
      var pdf = await PDFLib.PDFDocument.load(buffer, { ignoreEncryption: true });
      var pages = pdf.getPageCount();
      // Try without ignoreEncryption to see if it's actually locked
      try {
        await PDFLib.PDFDocument.load(buffer);
        return { locked: false, pages: pages };
      } catch (e) {
        return { locked: true, pages: pages };
      }
    } catch (e) {
      // Fully encrypted, can't even read page count
      return { locked: true, pages: null };
    }
  }

  /* ── Set File ── */
  async function setFile(f) {
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setStatus("Please select a valid PDF file.", "error");
      return;
    }

    file = f;
    setStatus("Analyzing file...", "");
    resetResult();

    try {
      fileAnalysis = await analyzeFile(f);
    } catch (e) {
      fileAnalysis = { locked: true, pages: null };
    }

    // Render file info card
    var statusBadge = fileAnalysis.locked
      ? '<span class="mg-status-locked">\uD83D\uDD12 Password Protected</span>'
      : '<span class="mg-status-success">\uD83D\uDD13 Not Protected</span>';

    var pagesText = fileAnalysis.pages !== null ? fileAnalysis.pages + " pages" : "Unknown";

    fileInfo.innerHTML = '<div class="mg-file-card">' +
      '<div class="mg-file-icon">' +
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--mg-ac)" stroke-width="1.5" stroke-linecap="round">' +
          '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>' +
          '<polyline points="14 2 14 8 20 8"/>' +
        '</svg>' +
      '</div>' +
      '<div class="mg-file-details">' +
        '<div class="mg-file-name">' + escapeHTML(f.name) + '</div>' +
        '<div class="mg-file-meta">' +
          '<span>' + fmt(f.size) + '</span>' +
          '<span>' + pagesText + '</span>' +
        '</div>' +
      '</div>' +
      statusBadge +
    '</div>';

    fileInfo.style.display = "block";
    actionSection.style.display = "block";
    setStatus("", "");

    // Focus password field if locked
    if (fileAnalysis.locked) {
      passwordInput.focus();
    }
  }

  /* ── Status Helper ── */
  function setStatus(text, type) {
    status.textContent = text;
    status.className = "";
    if (type === "error") status.className = "pu-error";
    if (type === "success") status.className = "pu-success";
  }

  /* ── Escape HTML ── */
  function escapeHTML(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /* ── Reset Result ── */
  function resetResult() {
    resultSection.style.display = "none";
    resultContent.innerHTML = "";
    if (lastUrl) {
      URL.revokeObjectURL(lastUrl);
      lastUrl = null;
    }
  }

  /* ── Clear All ── */
  function clearAll() {
    file = null;
    fileAnalysis = null;
    fileInfo.style.display = "none";
    fileInfo.innerHTML = "";
    actionSection.style.display = "none";
    passwordInput.value = "";
    setStatus("", "");
    resetResult();
    fileInput.value = "";
  }

  /* ── Password Visibility Toggle ── */
  eyeBtn.addEventListener("click", function () {
    var isPassword = passwordInput.type === "password";
    passwordInput.type = isPassword ? "text" : "password";
    var icon = document.getElementById("pu-eye-icon");
    if (isPassword) {
      icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
    } else {
      icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    }
  });

  /* ── Drop Zone Events ── */
  dropZone.addEventListener("click", function (e) {
    if (e.target.tagName !== "INPUT") fileInput.click();
  });
  fileInput.addEventListener("change", function (e) {
    if (e.target.files[0]) setFile(e.target.files[0]);
  });
  dropZone.addEventListener("dragover", function (e) {
    e.preventDefault();
    dropZone.classList.add("active");
  });
  dropZone.addEventListener("dragleave", function () {
    dropZone.classList.remove("active");
  });
  dropZone.addEventListener("drop", function (e) {
    e.preventDefault();
    dropZone.classList.remove("active");
    if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
  });

  /* ── Clear Button ── */
  clearBtn.addEventListener("click", clearAll);

  /* ── Unlock Logic ── */
  unlockBtn.addEventListener("click", async function () {
    if (!file) {
      setStatus("Please select a PDF file first.", "error");
      return;
    }
    if (isProcessing) return;

    isProcessing = true;
    unlockBtn.disabled = true;
    unlockBtn.innerHTML = '<span class="mg-spinner"></span> Processing...';
    setStatus("Loading PDF library...", "");
    resetResult();

    try {
      var PDFLib = await loadPDFLib();
      setStatus("Reading file...", "");

      var buffer = await file.arrayBuffer();
      var pdf;

      // Try loading without password
      try {
        pdf = await PDFLib.PDFDocument.load(buffer);
        setStatus("Rebuilding PDF...", "");
      } catch (loadErr) {
        // Needs password
        var password = passwordInput.value;
        if (!password) {
          setStatus("This PDF is password protected. Please enter the password.", "error");
          isProcessing = false;
          unlockBtn.disabled = false;
          unlockBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg> Unlock PDF';
          passwordInput.focus();
          return;
        }

        try {
          pdf = await PDFLib.PDFDocument.load(buffer, { password: password });
          setStatus("Password accepted. Rebuilding PDF...", "");
        } catch (pwErr) {
          setStatus("Incorrect password or unsupported encryption.", "error");
          isProcessing = false;
          unlockBtn.disabled = false;
          unlockBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg> Unlock PDF';
          passwordInput.focus();
          return;
        }
      }

      var pageCount = pdf.getPageCount();

      // Save without encryption
      var bytes = await pdf.save();
      var originalSize = file.size;
      var newSize = bytes.length;

      if (lastUrl) URL.revokeObjectURL(lastUrl);
      var blob = new Blob([bytes], { type: "application/pdf" });
      var url = URL.createObjectURL(blob);
      lastUrl = url;

      var outName = file.name.replace(/\.pdf$/i, "") + "-unlocked.pdf";

      // Auto-download
      var a = document.createElement("a");
      a.href = url;
      a.download = outName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Show result
      resultContent.innerHTML =
        '<div class="pu-result-grid">' +
          '<div class="mg-stat-card">' +
            '<div class="mg-stat-label">Pages</div>' +
            '<div class="mg-stat-value">' + pageCount + '</div>' +
          '</div>' +
          '<div class="mg-stat-card">' +
            '<div class="mg-stat-label">Original Size</div>' +
            '<div class="mg-stat-value" style="font-size:15px;">' + fmt(originalSize) + '</div>' +
          '</div>' +
          '<div class="mg-stat-card">' +
            '<div class="mg-stat-label">Unlocked Size</div>' +
            '<div class="mg-stat-value" style="font-size:15px;">' + fmt(newSize) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="pu-download-row">' +
          '<a class="mg-btn-download" href="' + url + '" download="' + escapeHTML(outName) + '">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">' +
              '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>' +
              '<polyline points="7 10 12 15 17 10"/>' +
              '<line x1="12" y1="15" x2="12" y2="3"/>' +
            '</svg>' +
            'Download Again' +
          '</a>' +
        '</div>';

      resultSection.style.display = "block";
      setStatus("Unlocked successfully! File auto-downloaded.", "success");

    } catch (err) {
      setStatus("Failed to unlock: " + (err.message || "Unknown error"), "error");
    }

    isProcessing = false;
    unlockBtn.disabled = false;
    unlockBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg> Unlock PDF';
  });

  /* ── Keyboard: Enter to unlock ── */
  passwordInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") unlockBtn.click();
  });

})();
