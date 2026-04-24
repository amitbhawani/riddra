(function () {
  "use strict";

  var ROOT = document.getElementById("mg-ig-reel-root");
  if (!ROOT) return;

  /* ════════════════════════════════════════════════════════════
     CONFIG — Update this URL after deploying your Cloudflare Worker
     ════════════════════════════════════════════════════════════ */
  var WORKER_URL = "https://ig-reel-proxy.amitbhawani.workers.dev";

  /* ── State ── */
  var isDark = false, inputUrl = "", status = "idle", errorMsg = "", videoData = null, fetchProgress = 0;
  try { if (localStorage.getItem("mg_ig_theme") === "dark") isDark = true; } catch (e) {}

  /* ── URL handling ── */
  function code(url) { if (!url) return null; var m = url.trim().match(/instagram\.com\/(?:[^\/]+\/)?(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i); return m ? m[1] : null; }
  function norm(url) { var c = code(url); return c ? "https://www.instagram.com/reel/" + c + "/" : url.trim(); }

  /* ════════════════════════════════════════════════════════════
     FETCH via Cloudflare Worker
     ════════════════════════════════════════════════════════════ */
  async function doFetch() {
    var sc = code(inputUrl);
    if (!sc) {
      errorMsg = "Please enter a valid Instagram Reel URL.\n\nAccepted formats:\n\u2022 instagram.com/reel/ABC123/\n\u2022 instagram.com/username/reel/ABC123/\n\u2022 instagram.com/p/ABC123/";
      status = "error"; render(); return;
    }

    status = "loading"; fetchProgress = 20; errorMsg = ""; videoData = null; render();

    var cleanUrl = norm(inputUrl);

    try {
      fetchProgress = 50; render();

      var resp = await fetch(WORKER_URL + "?url=" + encodeURIComponent(cleanUrl));
      var data = await resp.json();

      fetchProgress = 100; render();

      if (data.ok && data.videoUrl) {
        videoData = { vUrl: data.videoUrl, thumb: data.thumbnailUrl, title: data.title || "", author: data.author || "", src: cleanUrl };
        status = "preview"; errorMsg = "";
      } else if (data.ok && (data.thumbnailUrl || data.author)) {
        videoData = { vUrl: null, thumb: data.thumbnailUrl, title: data.title || "", author: data.author || "", src: cleanUrl };
        status = "preview";
        errorMsg = "Found reel info but couldn\u2019t get a direct download link. Instagram may be restricting access for this reel. Try opening it in Instagram.";
      } else {
        status = "error";
        errorMsg = data.error || "Could not fetch this reel. Possible reasons:\n\n\u2022 The reel is from a private account\n\u2022 The URL may be incorrect or deleted\n\nMake sure the reel is publicly accessible.";
      }
    } catch (err) {
      status = "error";
      errorMsg = "Network error: Could not reach the download service. Please check your internet connection and try again.";
    }

    render();
  }

  /* ── Download ── */
  async function doDownload() {
    if (!videoData || !videoData.vUrl) return;
    try {
      var resp = await fetch(videoData.vUrl);
      var blob = await resp.blob();
      var u = URL.createObjectURL(blob);
      var a = document.createElement("a"); a.href = u;
      a.download = (videoData.author || "instagram") + "_reel_" + Date.now() + ".mp4";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(u); }, 5000);
    } catch (e) { window.open(videoData.vUrl, "_blank"); }
  }

  function doReset() { inputUrl = ""; status = "idle"; errorMsg = ""; videoData = null; fetchProgress = 0; render(); }
  async function doPaste() { try { var t = await navigator.clipboard.readText(); if (t) { inputUrl = t.trim(); render(); } } catch (e) {} }

  /* ── Theme helpers ── */
  var A = "#D4853B";
  function T() {
    return isDark ? {
      bg:"#0A0A0A",sf:"#161616",sf2:"#1e1e1e",bd:"#2e2e2e",tx:"#f5f3f0",mu:"#a8a29e",
      acBg:"rgba(212,133,59,0.08)",acBdr:"rgba(212,133,59,0.2)",sh:"0 1px 4px rgba(0,0,0,0.35)"
    } : {
      bg:"#F5F3F0",sf:"#FFFFFF",sf2:"#f0ebe4",bd:"#d1ccc4",tx:"#1a1510",mu:"#706a62",
      acBg:"rgba(212,133,59,0.06)",acBdr:"rgba(212,133,59,0.3)",sh:"0 1px 4px rgba(0,0,0,0.06)"
    };
  }

  /* ════════════════════════════════════════════════════════════
     RENDER — 100% inline styles
     ════════════════════════════════════════════════════════════ */
  function render() {
    var t = T();
    var h = '';

    h += '<div style="font-family:\'DM Sans\',system-ui,sans-serif;background:'+t.bg+';color:'+t.tx+';min-height:100vh;-webkit-font-smoothing:antialiased;transition:background .3s,color .3s">';

    // Theme toggle
    h += '<div style="display:flex;justify-content:flex-end;max-width:720px;margin:0 auto;padding:12px 24px 0">';
    h += '<div id="ig-tt" style="display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none">';
    h += '<span style="font-size:11px;color:'+t.mu+';font-weight:500">Dark</span>';
    h += '<div style="width:44px;height:24px;border-radius:99px;background:'+t.bd+';position:relative;transition:background .3s">';
    h += '<div style="width:18px;height:18px;border-radius:50%;background:'+A+';position:absolute;top:3px;left:'+(isDark?'3':'23')+'px;transition:left .3s;display:flex;align-items:center;justify-content:center;font-size:10px">'+(isDark?'\u2600':'\u263E')+'</div>';
    h += '</div><span style="font-size:11px;color:'+t.mu+';font-weight:500">Light</span></div></div>';

    h += '<div style="max-width:720px;margin:0 auto;padding:0 24px 48px">';

    // Hero
    h += '<div style="text-align:center;padding:52px 24px 44px">';
    h += '<div style="display:inline-block;background:'+t.acBg+';border:1px solid '+t.acBdr+';color:'+A+';font-size:10px;font-weight:700;padding:5px 16px;border-radius:99px;letter-spacing:1px;text-transform:uppercase;margin-bottom:20px">Free Online Tool</div>';
    h += '<h1 style="font-family:\'Source Serif 4\',Georgia,serif;font-size:clamp(30px,5vw,42px);font-weight:800;color:'+t.tx+';line-height:1.12;margin:0 0 16px;letter-spacing:-0.5px">Instagram Reel <span style="color:'+A+'">Downloader</span></h1>';
    h += '<p style="color:'+t.mu+';font-size:15px;max-width:480px;margin:0 auto;line-height:1.65">Download Instagram Reels with audio in HD quality. Processed via a secure proxy. No files are stored anywhere.</p>';
    h += '</div>';

    // Section
    h += '<div style="background:'+t.sf+';border:1px solid '+t.bd+';border-radius:12px;padding:28px;margin-bottom:24px;box-shadow:'+t.sh+'">';
    h += '<div style="font-size:11px;font-weight:700;color:'+t.mu+';text-transform:uppercase;letter-spacing:1px;margin:0 0 18px;display:flex;align-items:center;gap:10px">';
    h += '<span style="width:28px;height:28px;border-radius:8px;background:'+t.acBg+';border:1px solid '+t.acBdr+';display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0">\uD83D\uDD17</span>Paste Reel URL</div>';

    // Input row
    h += '<div style="display:flex;gap:12px;align-items:stretch">';
    h += '<div style="flex:1;position:relative;min-width:0">';
    h += '<input id="ig-inp" type="url" style="width:100%;height:52px;padding:0 88px 0 18px;border:1.5px solid '+t.bd+';border-radius:8px;background:'+t.sf2+';color:'+t.tx+';font-family:inherit;font-size:14px;outline:none;box-sizing:border-box" placeholder="https://www.instagram.com/reel/ABC123..." value="'+E(inputUrl)+'"'+(status==="loading"?" disabled":"")+'>';
    h += '<button id="ig-pb" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:'+t.sf+';border:1px solid '+t.bd+';border-radius:6px;padding:6px 14px;font-size:12px;font-weight:600;color:'+t.mu+';cursor:pointer;font-family:inherit;line-height:1">Paste</button>';
    h += '</div>';
    h += '<button id="ig-fb" style="display:inline-flex;align-items:center;justify-content:center;gap:8px;height:52px;min-width:160px;background:'+A+';color:#fff;border:none;border-radius:8px;padding:0 28px;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0;opacity:'+(status==="loading"?"0.5":"1")+'"'+(status==="loading"?" disabled":"")+'>';
    h += (status==="loading"?'\u23F3 Fetching\u2026':'\u2B07\uFE0F Fetch Reel')+'</button></div>';

    // Progress
    if (status === "loading") {
      h += '<div style="margin-top:24px"><div style="height:5px;background:'+t.sf2+';border-radius:99px;overflow:hidden"><div style="height:100%;background:'+A+';border-radius:99px;width:'+fetchProgress+'%;transition:width .4s"></div></div>';
      h += '<div style="font-size:11px;color:'+t.mu+';margin-top:8px;text-align:center;font-family:\'JetBrains Mono\',monospace">Fetching reel data\u2026 '+fetchProgress+'%</div></div>';
    }

    // Error
    if (status === "error" && errorMsg) {
      h += '<div style="text-align:center;padding:20px;border-radius:8px;background:rgba(239,68,68,0.06);color:#ef4444;border:1px solid rgba(239,68,68,0.15);margin-top:20px;font-size:13px;line-height:1.65">';
      h += '<div style="font-size:24px;margin-bottom:8px">\u26A0\uFE0F</div><div style="font-weight:700;font-size:15px">Could Not Fetch Reel</div>';
      h += '<div style="margin-top:8px;white-space:pre-line;font-size:12px;opacity:0.9;line-height:1.7">'+E(errorMsg)+'</div></div>';
    }

    // Steps
    if (status === "idle") {
      h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:24px">';
      h += mkS("1","Copy Link","Open Instagram, tap share on any Reel and copy the link.",t);
      h += mkS("2","Paste Here","Paste the URL above or tap the Paste button to auto-fill.",t);
      h += mkS("3","Download","Click Fetch Reel, preview the video, then download in HD.",t);
      h += '</div>';

      // Placeholder / Try it section
      h += '<div style="margin-top:20px;padding:18px;background:'+t.acBg+';border:1px solid '+t.acBdr+';border-radius:8px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">';
      h += '<div style="display:flex;align-items:center;gap:10px;min-width:0">';
      h += '<span style="font-size:18px">\uD83C\uDFAC</span>';
      h += '<div><div style="font-size:13px;font-weight:700;color:'+t.tx+'">Try it out!</div>';
      h += '<div style="font-size:11px;color:'+t.mu+'">Download a sample reel to see how it works</div></div></div>';
      h += '<button id="ig-demo" style="background:'+A+';color:#fff;border:none;border-radius:6px;padding:9px 18px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0">\u25B6 Try Sample Reel</button>';
      h += '</div>';
    }
    h += '</div>';

    // Preview
    if (status === "preview" && videoData) {
      h += '<div style="background:'+t.sf+';border:1px solid '+t.bd+';border-radius:12px;overflow:hidden;margin-bottom:24px;box-shadow:0 2px 12px rgba(0,0,0,0.08)">';
      h += '<div style="display:flex;align-items:center;padding:16px 24px;border-bottom:1px solid '+t.bd+';gap:12px">';
      h += '<div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px;flex-shrink:0">'+(videoData.author?videoData.author.charAt(0).toUpperCase():"?")+'</div>';
      h += '<div><div style="font-weight:700;font-size:14px;color:'+t.tx+'">'+E(videoData.author||"Instagram User")+'</div>';
      h += '<div style="font-size:12px;color:'+t.mu+';margin-top:1px">Instagram Reel</div></div></div>';

      if (videoData.vUrl) {
        h += '<div style="background:#000;display:flex;align-items:center;justify-content:center;max-height:640px;overflow:hidden">';
        h += '<video controls playsinline preload="auto" style="width:100%;max-height:640px;max-width:360px;object-fit:contain;display:block;margin:0 auto"><source src="'+E(videoData.vUrl)+'" type="video/mp4"></video></div>';
      }

      if (videoData.title) {
        var cap = decodeEntities(videoData.title);
        if (cap.length > 200) cap = cap.substring(0, 200) + "\u2026";
        h += '<div style="padding:16px 24px;font-size:13px;color:'+t.tx+';line-height:1.65;border-top:1px solid '+t.bd+'"><strong>'+E(videoData.author||"User")+'</strong> '+E(cap)+'</div>';
      }

      if (errorMsg && !videoData.vUrl) {
        h += '<div style="margin:12px 24px 0;padding:14px;border-radius:8px;background:rgba(212,133,59,0.06);color:'+A+';border:1px solid rgba(212,133,59,0.15);font-size:12px;line-height:1.65;text-align:left">\u2139\uFE0F '+E(errorMsg)+'</div>';
      }

      h += '<div style="display:flex;gap:12px;padding:16px 24px;border-top:1px solid '+t.bd+'">';
      if (videoData.vUrl) {
        h += '<button id="ig-dl" style="flex:1;height:48px;background:'+A+';color:#fff;border:none;border-radius:8px;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">\u2B07\uFE0F Download Video (MP4)</button>';
      } else {
        h += '<a href="'+E(videoData.src)+'" target="_blank" rel="noopener" style="flex:1;height:48px;background:'+A+';color:#fff;border:none;border-radius:8px;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none">\uD83D\uDD17 Open in Instagram</a>';
      }
      h += '<button id="ig-rst" style="flex:1;height:48px;background:transparent;color:'+t.mu+';border:1.5px solid '+t.bd+';border-radius:8px;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">\uD83D\uDD04 New Download</button>';
      h += '</div></div>';
    }

    // Features
    if (status === "idle" || status === "error") {
      h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px">';
      h += mkF("\uD83D\uDD12","100% Private","No files stored. Video downloads directly to your device.",t);
      h += mkF("\uD83C\uDFA5","HD Quality","Highest available quality with original audio.",t);
      h += mkF("\u26A1","Instant &amp; Free","No signup, no watermark, no limits.",t);
      h += mkF("\uD83D\uDCF1","Works on Mobile","Fully optimized for mobile browsers.",t);
      h += '</div>';
    }

    // Footer + Disclaimer (smaller font as requested)
    h += '<div style="text-align:center;padding:32px 20px 0;color:'+t.mu+';font-size:11px;line-height:1.7">';
    h += '<p><strong style="color:'+t.tx+'">Instagram Reel Downloader</strong> by <a href="https://mastergadgets.com" target="_blank" rel="noopener" style="color:'+A+';text-decoration:none">MasterGadgets.com</a> | Made with \u2764\uFE0F by <a href="https://twitter.com/AmitBhawani" target="_blank" rel="noopener" style="color:'+A+';text-decoration:none">@AmitBhawani</a> in India</p>';
    h += '<p style="margin-top:8px;max-width:640px;margin-left:auto;margin-right:auto;line-height:1.65;color:'+t.mu+';font-size:9px">';
    h += '<strong style="color:'+t.tx+'">Disclaimer:</strong> This tool is for personal and informational use only. Your Reel URL is sent to a secure proxy server hosted by MasterGadgets.com to extract the video link. No files are stored on any server, cloud, or browser storage. The video downloads directly to your device. MasterGadgets.com does not access, collect, or retain any of your data or downloaded files. This tool only works with publicly available Reels. Downloading content you do not own may be subject to copyright laws. Please respect content creators\u2019 rights and Instagram\u2019s Terms of Service.';
    h += '</p></div>';

    h += '</div></div>';
    ROOT.innerHTML = h;
    bindEvents();
  }

  /* ── Helpers ── */
  function E(s) { return s ? s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;") : ""; }

  function decodeEntities(s) {
    if (!s) return "";
    var el = document.createElement("textarea");
    el.innerHTML = s;
    return el.value;
  }

  var PLACEHOLDER_URL = "https://www.instagram.com/amitbhawani/reel/DRlp3F7iZAV/";

  function mkS(n, title, desc, t) {
    return '<div style="display:flex;align-items:flex-start;gap:14px;padding:18px;background:'+t.sf2+';border-radius:8px;border:1px solid '+t.bd+'">' +
      '<div style="width:28px;height:28px;min-width:28px;border-radius:50%;background:'+A+';color:#fff;font-family:\'JetBrains Mono\',monospace;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">'+n+'</div>' +
      '<div><div style="font-size:13px;font-weight:700;color:'+t.tx+';margin-bottom:4px">'+title+'</div>' +
      '<div style="font-size:12px;color:'+t.mu+';line-height:1.55">'+desc+'</div></div></div>';
  }

  function mkF(ico, title, desc, t) {
    return '<div style="background:'+t.sf+';border:1px solid '+t.bd+';border-radius:12px;padding:24px 16px;text-align:center;box-shadow:'+t.sh+'">' +
      '<div style="width:42px;height:42px;border-radius:12px;background:'+t.acBg+';border:1px solid '+t.acBdr+';display:inline-flex;align-items:center;justify-content:center;font-size:18px;margin-bottom:12px">'+ico+'</div>' +
      '<div style="font-weight:700;font-size:13px;color:'+t.tx+';margin-bottom:6px">'+title+'</div>' +
      '<div style="font-size:11px;color:'+t.mu+';line-height:1.6">'+desc+'</div></div>';
  }

  /* ── Events ── */
  function bindEvents() {
    var el;
    el = document.getElementById("ig-tt"); if (el) el.onclick = function () { isDark = !isDark; try { localStorage.setItem("mg_ig_theme", isDark ? "dark" : "light"); } catch (e) {} render(); };
    el = document.getElementById("ig-inp"); if (el) {
      el.onfocus = function () { this.style.borderColor = A; this.style.boxShadow = "0 0 0 3px rgba(212,133,59,0.12)"; };
      el.onblur = function () { var t = T(); this.style.borderColor = t.bd; this.style.boxShadow = "none"; };
      el.oninput = function (e) { inputUrl = e.target.value; };
      el.onkeydown = function (e) { if (e.key === "Enter") { e.preventDefault(); doFetch(); } };
    }
    el = document.getElementById("ig-pb"); if (el) el.onclick = doPaste;
    el = document.getElementById("ig-fb"); if (el) el.onclick = doFetch;
    el = document.getElementById("ig-dl"); if (el) el.onclick = doDownload;
    el = document.getElementById("ig-rst"); if (el) el.onclick = doReset;
    el = document.getElementById("ig-demo"); if (el) el.onclick = function () { inputUrl = PLACEHOLDER_URL; doFetch(); };
  }

  /* ── Responsive (only CSS that can't be inline) ── */
  var sid = "mg-ig-resp";
  if (!document.getElementById(sid)) {
    var s = document.createElement("style"); s.id = sid;
    s.textContent = '@media(max-width:640px){#mg-ig-reel-root [style*="grid-template-columns:repeat(3"]{grid-template-columns:1fr!important}#mg-ig-reel-root [style*="grid-template-columns:repeat(4"]{grid-template-columns:1fr 1fr!important}#mg-ig-reel-root [style*="display:flex;gap:12px;align-items:stretch"]{flex-direction:column!important}#mg-ig-reel-root [style*="min-width:160px"]{width:100%!important;min-width:0!important}#mg-ig-reel-root [style*="display:flex;gap:12px;padding:16px 24px;border-top"]{flex-direction:column!important}}@media(max-width:400px){#mg-ig-reel-root [style*="grid-template-columns:1fr 1fr"]{grid-template-columns:1fr!important}}';
    document.head.appendChild(s);
  }

  render();
})();
