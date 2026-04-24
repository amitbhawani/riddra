(function () {
  /* ── Load Google Fonts non-blocking ── */
  if (!document.getElementById("mg-fonts-link")) {
    var fl = document.createElement("link");
    fl.id = "mg-fonts-link";
    fl.rel = "stylesheet";
    fl.href = "https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,700;9..40,800&family=Source+Serif+4:opsz,wght@8..60,600;8..60,700;8..60,800&family=JetBrains+Mono:wght@500;700&display=swap";
    fl.media = "print";
    fl.onload = function () { fl.media = "all"; };
    document.head.appendChild(fl);
  }

  var root = document.getElementById("mg-pdf-compress-root");
  if (!root) return;

  var files = [];
  var resultsData = [];
  var blobUrls = [];
  var isProcessing = false;

  function loadScript(url, check) {
    return new Promise(function (res, rej) {
      if (check()) return res();
      var s = document.createElement("script");
      s.src = url; s.onload = res;
      s.onerror = function () { rej(new Error("Failed: " + url)); };
      document.head.appendChild(s);
    });
  }

  function loadLibsOnDemand() {
    return Promise.all([
      loadScript("https://unpkg.com/pdf-lib/dist/pdf-lib.min.js", function () { return window.PDFLib; }),
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js", function () { return window.JSZip; }),
    ]);
  }

  function fmt(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(2) + " MB";
  }

  /* ═══════════════════════════════════════════════════════
     COMPRESSION ENGINE
     1. Strip metadata
     2. Find & recompress JPEG images (DCTDecode)
     3. Save with object streams
     4. NEVER return a file larger than original
     ═══════════════════════════════════════════════════════ */
  async function compressPDF(arrayBuffer) {
    var PDFDocument = PDFLib.PDFDocument;
    var PDFName = PDFLib.PDFName;
    var originalSize = arrayBuffer.byteLength;

    var pdfDoc = await PDFDocument.load(arrayBuffer, {
      ignoreEncryption: true, updateMetadata: false
    });

    pdfDoc.setTitle(""); pdfDoc.setAuthor(""); pdfDoc.setSubject("");
    pdfDoc.setKeywords([]); pdfDoc.setProducer(""); pdfDoc.setCreator("");

    try {
      var catalog = pdfDoc.catalog;
      if (catalog && catalog.get) {
        var metaRef = catalog.get(PDFName.of("Metadata"));
        if (metaRef) catalog.delete(PDFName.of("Metadata"));
      }
    } catch (e) {}

    /* JPEG image recompression */
    var context = pdfDoc.context;
    var imgStats = { found: 0, compressed: 0, savedBytes: 0 };

    try {
      var allObjects = context.enumerateIndirectObjects();
      for (var oi = 0; oi < allObjects.length; oi++) {
        var obj = allObjects[oi][1];
        if (!obj || !obj.dict) continue;
        var subtype = obj.dict.get(PDFName.of("Subtype"));
        if (!subtype || subtype.toString() !== "/Image") continue;
        var filter = obj.dict.get(PDFName.of("Filter"));
        if (!filter || filter.toString() !== "/DCTDecode") continue;
        var w = obj.dict.get(PDFName.of("Width"));
        var h = obj.dict.get(PDFName.of("Height"));
        if (!w || !h) continue;
        var imgW = parseInt(w.toString()), imgH = parseInt(h.toString());
        if (isNaN(imgW) || isNaN(imgH) || imgW < 50 || imgH < 50) continue;

        imgStats.found++;
        var jpegBytes = null;
        try {
          if (typeof obj.getContents === "function") jpegBytes = obj.getContents();
          else if (obj.contents instanceof Uint8Array) jpegBytes = obj.contents;
          else if (obj.contents) jpegBytes = new Uint8Array(obj.contents);
        } catch (ex) { continue; }
        if (!jpegBytes || jpegBytes.length < 100) continue;

        var recompressed = await recompressJpeg(jpegBytes, imgW, imgH);
        if (recompressed && recompressed.length < jpegBytes.length * 0.95) {
          imgStats.savedBytes += jpegBytes.length - recompressed.length;
          imgStats.compressed++;
          if (typeof obj.contents !== "undefined") obj.contents = recompressed;
          obj.dict.set(PDFName.of("Length"), context.obj(recompressed.length));
        }
      }
    } catch (imgErr) {}

    var compressedBytes = await pdfDoc.save({ useObjectStreams: true, addDefaultPage: false, objectsPerTick: 100 });

    if (compressedBytes.length >= originalSize) {
      return { bytes: new Uint8Array(arrayBuffer), saved: false, originalSize: originalSize, newSize: originalSize, imgStats: imgStats };
    }
    return { bytes: compressedBytes, saved: true, originalSize: originalSize, newSize: compressedBytes.length, imgStats: imgStats };
  }

  function recompressJpeg(jpegBytes) {
    return new Promise(function (resolve) {
      var blob = new Blob([jpegBytes], { type: "image/jpeg" });
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function () {
        try {
          var maxDim = 1600, scale = 1;
          if (img.width > maxDim || img.height > maxDim) scale = maxDim / Math.max(img.width, img.height);
          var nw = Math.round(img.width * scale), nh = Math.round(img.height * scale);
          var c = document.createElement("canvas"); c.width = nw; c.height = nh;
          c.getContext("2d").drawImage(img, 0, 0, nw, nh);
          var d = c.toDataURL("image/jpeg", 0.55).split(",")[1];
          URL.revokeObjectURL(url);
          resolve(Uint8Array.from(atob(d), function (ch) { return ch.charCodeAt(0); }));
        } catch (e) { URL.revokeObjectURL(url); resolve(null); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  }

  /* ── Theme ── */
  function initTheme() {
    var app = root.querySelector(".mg-app");
    var saved = localStorage.getItem("mg-theme");
    if (saved === "dark") { app.classList.remove("mg-light"); app.classList.add("mg-dark"); }
    root.querySelector(".mg-theme-switch").addEventListener("click", function () {
      var d = app.classList.contains("mg-dark");
      app.classList.toggle("mg-dark", !d); app.classList.toggle("mg-light", d);
      localStorage.setItem("mg-theme", d ? "light" : "dark");
    });
  }

  /* ── Drop Zone ── */
  function setupDropZone() {
    var zone = root.querySelector(".pc-drop-zone");
    var inp = root.querySelector("#pc-file-input");
    zone.addEventListener("click", function () { inp.click(); });
    zone.addEventListener("dragover", function (e) { e.preventDefault(); zone.classList.add("pc-drag-over"); });
    zone.addEventListener("dragleave", function () { zone.classList.remove("pc-drag-over"); });
    zone.addEventListener("drop", function (e) {
      e.preventDefault(); zone.classList.remove("pc-drag-over");
      var d = Array.from(e.dataTransfer.files).filter(function (f) { return f.type === "application/pdf"; });
      if (d.length) addFiles(d);
    });
    inp.addEventListener("change", function (e) { addFiles(Array.from(e.target.files)); e.target.value = ""; });
  }

  function addFiles(nf) {
    nf.forEach(function (f) {
      if (!files.find(function (x) { return x.name === f.name && x.size === f.size; })) files.push(f);
    });
    renderFileList();
  }

  function removeFile(i) { files.splice(i, 1); renderFileList(); }

  function clearAll() {
    files = []; resultsData = [];
    blobUrls.forEach(function (u) { URL.revokeObjectURL(u); }); blobUrls = [];
    renderFileList();
    root.querySelector("#pc-results").innerHTML = "";
    root.querySelector("#pc-status").textContent = "";
    root.querySelector("#pc-zip-btn").style.display = "none";
  }

  function renderFileList() {
    var list = root.querySelector("#pc-file-list");
    var count = root.querySelector("#pc-file-count");
    var btn = root.querySelector("#pc-compress-btn");
    if (files.length === 0) { list.innerHTML = ""; count.textContent = ""; btn.disabled = true; return; }
    count.textContent = files.length + " file" + (files.length > 1 ? "s" : "") + " selected";
    btn.disabled = false;
    var html = "";
    for (var j = 0; j < files.length; j++) {
      var f = files[j];
      html += '<div class="pc-file-item mg-animate-in"><div class="pc-file-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg></div><div class="pc-file-info"><span class="pc-file-name">' + f.name + '</span><span class="pc-file-size">' + fmt(f.size) + '</span></div><button class="pc-file-remove" data-idx="' + j + '" title="Remove"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>';
    }
    list.innerHTML = html;
    list.querySelectorAll(".pc-file-remove").forEach(function (b) {
      b.addEventListener("click", function (e) { e.stopPropagation(); removeFile(parseInt(b.dataset.idx)); });
    });
  }

  /* ── Main compress ── */
  async function doCompress() {
    if (files.length === 0 || isProcessing) return;
    isProcessing = true;
    var statusEl = root.querySelector("#pc-status");
    var resultsEl = root.querySelector("#pc-results");
    var compressBtn = root.querySelector("#pc-compress-btn");
    var zipBtn = root.querySelector("#pc-zip-btn");

    compressBtn.disabled = true;
    compressBtn.innerHTML = '<span class="pc-spinner"></span> Processing...';
    statusEl.textContent = "Loading compression engine...";
    resultsEl.innerHTML = ""; resultsData = [];
    blobUrls.forEach(function (u) { URL.revokeObjectURL(u); }); blobUrls = [];

    try { await loadLibsOnDemand(); } catch (err) {
      statusEl.textContent = "Error loading libraries. Check your connection.";
      compressBtn.disabled = false; compressBtn.textContent = "Compress PDFs";
      isProcessing = false; return;
    }

    var totalOrig = 0, totalNew = 0, compressedCount = 0;
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      statusEl.textContent = "Compressing " + (i + 1) + " of " + files.length + "...";
      try {
        var bytes = await file.arrayBuffer();
        var result = await compressPDF(bytes);
        totalOrig += result.originalSize; totalNew += result.newSize;
        var blob = new Blob([result.bytes], { type: "application/pdf" });
        var url = URL.createObjectURL(blob); blobUrls.push(url);
        var extIdx = file.name.lastIndexOf(".");
        var baseName = extIdx > 0 ? file.name.substring(0, extIdx) : file.name;
        var dlName = baseName + "-compressed.pdf";
        resultsData.push({ name: dlName, bytes: result.bytes });
        var reduction = result.originalSize > 0 ? ((result.originalSize - result.newSize) / result.originalSize * 100) : 0;
        var card = document.createElement("div");
        card.className = "pc-result-card mg-animate-in";

        if (result.saved && reduction >= 5) {
          compressedCount++;
          var detailLine = '';
          if (result.imgStats && result.imgStats.compressed > 0) {
            detailLine = '<p class="pc-result-detail">' + result.imgStats.compressed + ' of ' + result.imgStats.found + ' images recompressed (' + fmt(result.imgStats.savedBytes) + ' saved)</p>';
          }
          card.innerHTML =
            '<div class="pc-result-top"><div class="pc-result-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--mg-green)" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg></div><span class="pc-result-badge green">' + reduction.toFixed(1) + '% smaller</span></div>' +
            '<p class="pc-result-name" title="' + file.name + '">' + file.name + '</p>' + detailLine +
            '<div class="pc-result-sizes"><span class="pc-size-original">' + fmt(result.originalSize) + '</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--mu)" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg><span class="pc-size-new mg-green">' + fmt(result.newSize) + '</span></div>' +
            '<a href="' + url + '" download="' + dlName + '" class="mg-btn-secondary pc-dl-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download</a>';
        } else {
          card.innerHTML =
            '<div class="pc-result-top"><div class="pc-result-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--mg-ac)" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="16 12 12 8 8 12"/><line x1="12" y1="16" x2="12" y2="8"/></svg></div><span class="pc-result-badge neutral">Already optimized</span></div>' +
            '<p class="pc-result-name" title="' + file.name + '">' + file.name + '</p>' +
            '<p class="pc-already-msg">This file is already well-optimized (' + fmt(result.originalSize) + '). No further reduction is possible in the browser.</p>';
        }
        resultsEl.appendChild(card);
      } catch (err) {
        var ec = document.createElement("div");
        ec.className = "pc-result-card mg-animate-in pc-error";
        ec.innerHTML = '<p class="pc-result-name">' + file.name + '</p><p class="pc-error-msg">Could not process this file. It may be encrypted or corrupted.</p>';
        resultsEl.appendChild(ec);
      }
    }
    var totalRed = totalOrig > 0 ? ((totalOrig - totalNew) / totalOrig * 100) : 0;
    if (compressedCount > 0 && totalRed >= 1) {
      statusEl.innerHTML = 'Done! <strong>' + fmt(totalOrig) + '</strong> &rarr; <strong>' + fmt(totalNew) + '</strong> <span class="mg-green">(' + totalRed.toFixed(1) + '% saved)</span>';
    } else {
      statusEl.innerHTML = 'Done! Your PDFs are already well-optimized. No further reduction was possible.';
    }
    if (resultsData.length > 1 && compressedCount > 0) zipBtn.style.display = "inline-flex";
    compressBtn.disabled = false;
    compressBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg> Compress PDFs';
    isProcessing = false;
  }

  async function downloadZip() {
    if (resultsData.length === 0) return;
    var zip = new JSZip();
    resultsData.forEach(function (f) { zip.file(f.name, f.bytes); });
    var blob = await zip.generateAsync({ type: "blob" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a"); a.href = url; a.download = "MasterGadgets-Compressed.zip";
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  /* ══════════════════════ CSS ══════════════════════ */
  var css = [
    ".mg-app .pc-drop-zone{border:2px dashed var(--bd);border-radius:var(--mg-radius);padding:40px 24px;text-align:center;cursor:pointer;transition:all .3s;background:var(--sf2)}",
    ".mg-app .pc-drop-zone:hover,.mg-app .pc-drop-zone.pc-drag-over{border-color:var(--mg-ac);background:var(--ac-bg)}",
    ".mg-app .pc-drop-zone.pc-drag-over{box-shadow:0 0 0 4px rgba(var(--mg-ac-rgb),.1)}",
    ".mg-app .pc-drop-icon{display:flex;align-items:center;justify-content:center;width:56px;height:56px;background:var(--ac-bg);border:1px solid var(--ac-bdr);border-radius:14px;margin:0 auto 14px;color:var(--mg-ac) !important}",
    ".mg-app .pc-drop-title{font-family:var(--mg-font-display);font-size:16px;font-weight:700;margin-bottom:4px;color:var(--tx) !important}",
    ".mg-app .pc-drop-sub{font-size:13px;color:var(--mu) !important}",
    ".mg-app .pc-drop-sub strong{color:var(--mg-ac) !important;cursor:pointer}",
    "@media(max-width:600px){.mg-app .pc-drop-zone{padding:28px 16px}.mg-app .pc-drop-icon{width:48px;height:48px}}",
    ".mg-app .pc-file-list{display:grid;gap:8px;margin-top:14px}",
    ".mg-app .pc-file-item{display:flex;align-items:center;gap:12px;background:var(--sf);border:1px solid var(--bd);border-radius:var(--mg-radius-sm);padding:10px 14px;transition:border-color .2s}",
    ".mg-app .pc-file-item:hover{border-color:var(--ac-bdr)}",
    ".mg-app .pc-file-icon{width:38px;height:38px;display:flex;align-items:center;justify-content:center;background:rgba(239,68,68,.06);border-radius:8px;flex-shrink:0;color:var(--mg-red) !important}",
    ".mg-app .pc-file-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}",
    ".mg-app .pc-file-name{font-size:13px;font-weight:600;color:var(--tx) !important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".mg-app .pc-file-size{font-size:11px;color:var(--mu) !important;font-family:var(--mg-font-mono)}",
    ".mg-app .pc-file-remove{width:28px;height:28px;display:flex;align-items:center;justify-content:center;background:transparent;border:1px solid transparent;border-radius:6px;cursor:pointer;color:var(--mu) !important;transition:all .2s;flex-shrink:0}",
    ".mg-app .pc-file-remove:hover{background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.2);color:var(--mg-red) !important}",
    ".mg-app .pc-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:4px}",
    ".mg-app .pc-file-count{font-size:12px;color:var(--mu) !important;font-weight:500}",
    ".mg-app .pc-clear-btn{background:none;border:none;color:var(--mu) !important;font-size:12px;font-weight:600;font-family:var(--mg-font);cursor:pointer;padding:4px 8px;border-radius:6px;transition:all .2s}",
    ".mg-app .pc-clear-btn:hover{color:var(--mg-red) !important;background:rgba(239,68,68,.06)}",
    ".mg-app .pc-actions{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap}",
    ".mg-app #pc-compress-btn{position:relative}",
    ".mg-app #pc-compress-btn:disabled{opacity:.4;cursor:default;transform:none;box-shadow:none}",
    ".mg-app .pc-spinner{display:inline-block;width:16px;height:16px;border:2.5px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:pc-spin .7s linear infinite}",
    "@keyframes pc-spin{to{transform:rotate(360deg)}}",
    ".mg-app #pc-zip-btn{display:none}",
    ".mg-app #pc-status{text-align:center;font-size:13px;color:var(--tx) !important;padding:0 8px;min-height:20px}",
    ".mg-app #pc-status strong{font-family:var(--mg-font-mono);font-weight:700;color:var(--mg-ac) !important}",
    ".mg-app #pc-results{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}",
    "@media(max-width:600px){.mg-app #pc-results{grid-template-columns:1fr}}",
    ".mg-app .pc-result-card{background:var(--sf);border:1px solid var(--bd);border-radius:var(--mg-radius);padding:16px;display:flex;flex-direction:column;gap:10px;transition:border-color .2s,box-shadow .2s}",
    ".mg-app .pc-result-card:hover{border-color:var(--ac-bdr);box-shadow:var(--shadow-sm)}",
    ".mg-app .pc-result-card.pc-error{border-left:3px solid var(--mg-red)}",
    ".mg-app .pc-result-top{display:flex;align-items:center;justify-content:space-between}",
    ".mg-app .pc-result-icon{display:flex;align-items:center}",
    ".mg-app .pc-result-badge{font-size:10px;font-weight:700;font-family:var(--mg-font-mono);padding:3px 10px;border-radius:var(--mg-radius-pill);text-transform:uppercase;letter-spacing:.3px}",
    ".mg-app .pc-result-badge.green{background:rgba(34,197,94,.08);color:var(--mg-green) !important}",
    ".mg-app .pc-result-badge.neutral{background:var(--ac-bg);color:var(--mg-ac) !important;border:1px solid var(--ac-bdr)}",
    ".mg-app .pc-result-name{font-size:13px;font-weight:600;color:var(--tx) !important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".mg-app .pc-result-detail{font-size:11px;color:var(--mu) !important}",
    ".mg-app .pc-result-sizes{display:flex;align-items:center;gap:8px;font-family:var(--mg-font-mono);font-size:13px;font-weight:600;color:var(--tx) !important}",
    ".mg-app .pc-size-original{color:var(--mu) !important;text-decoration:line-through;text-decoration-color:rgba(239,68,68,.4)}",
    ".mg-app .pc-size-new{color:var(--tx) !important}",
    ".mg-app .pc-dl-btn{display:inline-flex !important;align-items:center;gap:6px;text-decoration:none !important;justify-content:center;width:100%}",
    ".mg-app .pc-already-msg{font-size:12px;color:var(--mu) !important;line-height:1.6}",
    ".mg-app .pc-error-msg{font-size:12px;color:var(--mg-red) !important;line-height:1.5}",
    ".mg-app .pc-disclaimer{display:flex;gap:10px;padding:14px 16px;background:var(--sf2);border:1px solid var(--bd);border-radius:var(--mg-radius-sm);font-size:12px;color:var(--mu) !important;line-height:1.6;align-items:flex-start}",
    ".mg-app .pc-disclaimer strong{color:var(--tx) !important}",
    ".mg-app .pc-disclaimer-icon{flex-shrink:0;width:20px;height:20px;display:flex;align-items:center;justify-content:center;margin-top:1px}",
  ].join("\n");

  /* ══════════════════════ HTML ══════════════════════ */
  var H =
  '<div class="mg-app mg-light">' +
    '<div class="mg-theme-bar"><div class="mg-theme-switch"><span>Theme</span><div class="mg-theme-pill"><div class="mg-theme-dot"></div></div></div></div>' +
    '<div class="mg-container">' +
      '<div class="mg-hero mg-animate-in"><div class="mg-hero-badge">Free Online Tool</div><h1>PDF <em>Compressor</em></h1><p>Optimize PDF file structure and recompress images to reduce file size. 100% private, runs entirely in your browser.</p></div>' +
      '<div class="mg-section mg-animate-in"><div class="mg-section-header"><div class="mg-section-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mg-ac)" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div><div><div class="mg-section-title">Upload PDFs</div><div class="mg-section-subtitle">Drag and drop or click to browse</div></div></div><div class="mg-section-body"><div class="pc-drop-zone"><div class="pc-drop-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 12 15 15"/></svg></div><p class="pc-drop-title">Drop PDF files here</p><p class="pc-drop-sub">or <strong>browse files</strong> from your device</p><input type="file" id="pc-file-input" multiple accept="application/pdf" style="display:none;" /></div><div id="pc-file-list" class="pc-file-list"></div><div class="pc-toolbar"><span id="pc-file-count" class="pc-file-count"></span><button class="pc-clear-btn" id="pc-clear-btn" style="display:none;">Clear all</button></div></div></div>' +
      '<div class="mg-section mg-animate-in"><div class="mg-section-header"><div class="mg-section-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mg-ac)" stroke-width="2" stroke-linecap="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg></div><div><div class="mg-section-title">Compress</div><div class="mg-section-subtitle">Optimize structure and recompress images</div></div></div><div class="mg-section-body"><div class="pc-actions"><button id="pc-compress-btn" class="mg-btn-primary" disabled><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg> Compress PDFs</button><button id="pc-zip-btn" class="mg-btn-secondary"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download All (ZIP)</button></div><p id="pc-status"></p><div id="pc-results"></div></div></div>' +
      '<div class="mg-section mg-animate-in"><div class="mg-section-body" style="padding-top:20px;"><div class="pc-disclaimer"><div class="pc-disclaimer-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mg-green)" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div><div><strong>100% Private.</strong> Your files never leave your device. Everything runs locally in your browser. No uploads, no cloud, no tracking.</div></div><div class="pc-disclaimer"><div class="pc-disclaimer-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mg-ac)" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></div><div>This tool optimizes PDF structure, removes metadata, and recompresses embedded JPEG images. Best results on PDFs with photos and graphics. Your compressed file will never be larger than the original.</div></div></div></div>' +
      '<div class="mg-footer">PDF Compressor by <a href="https://www.mastergadgets.com" target="_blank" rel="noopener">MasterGadgets.com</a> | Made with \u2764\uFE0F by <a href="https://x.com/AmiTBhawani" target="_blank" rel="noopener">@AmitBhawani</a> in India</div>' +
    '</div></div>';

  root.innerHTML = '<style>' + css + '</style>' + H;
  initTheme(); setupDropZone();
  var clearBtn = root.querySelector("#pc-clear-btn");
  new MutationObserver(function () {
    clearBtn.style.display = files.length > 0 ? "inline-block" : "none";
  }).observe(root.querySelector("#pc-file-list"), { childList: true });
  clearBtn.addEventListener("click", clearAll);
  root.querySelector("#pc-compress-btn").addEventListener("click", doCompress);
  root.querySelector("#pc-zip-btn").addEventListener("click", downloadZip);
})();
