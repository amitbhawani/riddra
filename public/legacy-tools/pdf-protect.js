(function () {
  const root = document.getElementById("mg-pdf-protect-root");
  if (!root) return;

  root.innerHTML = `
    <div class="mg-card">
      <h2>Protect PDF File</h2>
      <p class="mg-sub">Add password protection securely in your browser.</p>

      <div id="drop-zone" class="mg-drop-zone">
        <p>Drag & Drop PDF here</p>
        <p>or</p>
        <input type="file" id="file-input" accept="application/pdf" />
      </div>

      <div id="file-info"></div>

      <input type="password" id="password" placeholder="Enter password" />
      <input type="password" id="confirm-password" placeholder="Confirm password" />

      <button id="protect-btn">Protect PDF</button>

      <p id="status"></p>
      <a id="download-link" style="display:none;">Download Protected PDF</a>

      <div class="mg-disclaimer">
        <p><strong>Privacy:</strong> Files never leave your device.</p>
        <p><strong>Note:</strong> Keep your password safe. It cannot be recovered.</p>
      </div>
    </div>
  `;

  let file = null;
  let lastUrl = null;

  const fileInput = document.getElementById("file-input");
  const dropZone = document.getElementById("drop-zone");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirm-password");
  const protectBtn = document.getElementById("protect-btn");
  const status = document.getElementById("status");
  const downloadLink = document.getElementById("download-link");
  const fileInfo = document.getElementById("file-info");

  function loadPDFLib() {
    return new Promise((resolve) => {
      if (window.PDFLib) return resolve(window.PDFLib);

      const script = document.createElement("script");
      script.src = "https://unpkg.com/pdf-lib/dist/pdf-lib.min.js";
      script.onload = () => resolve(window.PDFLib);
      document.body.appendChild(script);
    });
  }

  function formatSize(bytes) {
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  }

  async function setFile(f) {
    if (!f || f.type !== "application/pdf") {
      alert("Please select a valid PDF file.");
      return;
    }

    file = f;

    const { PDFDocument } = await loadPDFLib();
    const buffer = await f.arrayBuffer();
    const pdf = await PDFDocument.load(buffer);

    const pages = pdf.getPageCount();

    fileInfo.innerHTML = `
      <p><strong>${f.name}</strong></p>
      <p>Size: ${formatSize(f.size)}</p>
      <p>Pages: ${pages}</p>
    `;

    status.textContent = "";
    downloadLink.style.display = "none";
  }

  fileInput.addEventListener("change", e => setFile(e.target.files[0]));

  dropZone.addEventListener("dragover", e => {
    e.preventDefault();
    dropZone.classList.add("active");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("active");
  });

  dropZone.addEventListener("drop", e => {
    e.preventDefault();
    dropZone.classList.remove("active");
    setFile(e.dataTransfer.files[0]);
  });

  function validatePasswords(p1, p2) {
    if (!p1 || !p2) return "Password cannot be empty.";
    if (p1 !== p2) return "Passwords do not match.";
    if (p1.length < 4) return "Password too short (min 4 characters).";
    return null;
  }

  protectBtn.addEventListener("click", async () => {
    if (!file) {
      alert("Please select a PDF file.");
      return;
    }

    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    const error = validatePasswords(password, confirmPassword);
    if (error) {
      status.textContent = error;
      return;
    }

    protectBtn.disabled = true;
    protectBtn.textContent = "Processing...";
    status.textContent = "";

    const { PDFDocument } = await loadPDFLib();

    try {
      const buffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(buffer);

      // Apply encryption
      const protectedBytes = await pdf.save({
        userPassword: password,
        ownerPassword: password,
        permissions: {
          printing: "highResolution",
          modifying: false,
          copying: false,
          annotating: false
        }
      });

      if (lastUrl) URL.revokeObjectURL(lastUrl);

      const blob = new Blob([protectedBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      lastUrl = url;

      const fileName = "MasterGadgets-Protected.pdf";

      // Auto download
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      downloadLink.href = url;
      downloadLink.download = fileName;
      downloadLink.style.display = "inline-block";

      status.textContent = "PDF protected successfully.";

    } catch (err) {
      status.textContent = "Failed to protect PDF.";
    }

    protectBtn.disabled = false;
    protectBtn.textContent = "Protect PDF";
  });
})();