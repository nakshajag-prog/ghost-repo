// GHOST REPO front-end (Phase 2: sample case + public GitHub repository reader).
// Everything shown on screen is built with textContent / DOM nodes (never raw HTML),
// so code from a repository can never inject markup into the page.

const STEPS = [
  "Examine the evidence",
  "Run the test",
  "AI investigation",
  "Review the patch",
  "Verify the fix",
  "Case solved",
];

const KEYWORDS = new Set(["def","return","if","not","import","from","class","with","raise","as","for","in","and","or","is","None","True","False","pass","elif","else","try","except","finally","while","lambda","yield","async","await","global","nonlocal","assert","del","break","continue"]);

let currentFiles = [];
let requestCounter = 0;

function el(id) { return document.getElementById(id); }

// ---------- messages ----------
function showError(boxId, message) {
  const box = el(boxId);
  box.hidden = false;
  box.textContent = "⚠ " + message;
}
function clearErrors() {
  el("error-box").hidden = true;
  el("connect-error").hidden = true;
}

// ---------- code viewer ----------
function highlightLine(text) {
  const frag = document.createDocumentFragment();
  const re = /(#.*$)|("""[\s\S]*?"""|"[^"]*"|'[^']*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)/g;
  let last = 0, m;
  const push = (str, cls) => {
    if (!str) return;
    if (!cls) { frag.appendChild(document.createTextNode(str)); return; }
    const s = document.createElement("span");
    s.className = cls; s.textContent = str; frag.appendChild(s);
  };
  while ((m = re.exec(text)) !== null) {
    push(text.slice(last, m.index));
    if (m[1]) push(m[1], "tok-com");
    else if (m[2]) push(m[2], "tok-str");
    else if (m[3]) push(m[3], "tok-num");
    else if (KEYWORDS.has(m[4])) push(m[4], "tok-kw");
    else push(m[4], text[m.index + m[4].length] === "(" ? "tok-fn" : "");
    last = m.index + m[0].length;
  }
  push(text.slice(last));
  return frag;
}

function renderCode(file) {
  el("file-path").textContent = file.name;
  el("file-role").textContent = file.role;
  const code = el("code");
  code.replaceChildren();
  file.content.replace(/\n$/, "").split("\n").forEach((line, i) => {
    const row = document.createElement("div");
    row.className = "line";
    const ln = document.createElement("span");
    ln.className = "ln"; ln.textContent = i + 1;
    const lc = document.createElement("span");
    lc.className = "lc"; lc.appendChild(highlightLine(line));
    row.append(ln, lc);
    code.appendChild(row);
  });
  code.scrollTop = 0;
}

function showNoFiles(message) {
  el("file-path").textContent = "—";
  el("file-role").textContent = "";
  el("code").replaceChildren();
  const note = document.createElement("div");
  note.className = "muted";
  note.style.padding = "8px 20px";
  note.textContent = message;
  el("code").appendChild(note);
}

// ---------- file list ----------
function renderFileList(files) {
  const list = el("filelist");
  list.replaceChildren();
  if (!files.length) {
    const li = document.createElement("li");
    li.className = "empty-note";
    li.textContent = "No readable source files.";
    list.appendChild(li);
    return;
  }
  files.forEach((file, i) => {
    const li = document.createElement("li");
    li.textContent = file.name;
    li.title = file.name;
    li.dataset.index = i;
    li.addEventListener("click", () => selectFile(i));
    list.appendChild(li);
  });
}

function selectFile(i) {
  document.querySelectorAll("#filelist li").forEach(li =>
    li.classList.toggle("active", Number(li.dataset.index) === i));
  renderCode(currentFiles[i]);
}

// ---------- skipped-files report ----------
function renderSkipped(skipped) {
  const box = el("skipped");
  if (!skipped || skipped.total === 0) { box.hidden = true; return; }
  box.hidden = false;
  el("skipped-summary").textContent =
    "SKIPPED FILES: " + skipped.total + " (click to see why)";
  const list = el("skipped-list");
  list.replaceChildren();
  Object.entries(skipped.counts).forEach(([reason, count]) => {
    const li = document.createElement("li");
    const strong = document.createElement("strong");
    strong.textContent = count + " × ";
    li.append(strong, document.createTextNode(reason));
    const sample = skipped.examples.filter(e => e.reason === reason).slice(0, 3);
    if (sample.length) {
      const code = document.createElement("code");
      code.textContent = "  e.g. " + sample.map(e => e.path).join(", ");
      li.append(document.createElement("br"), code);
    }
    list.appendChild(li);
  });
  const shown = skipped.examples.length;
  el("skipped-note").textContent = shown < skipped.total
    ? "Examples are limited to the first " + shown + " skipped files; the counts above cover all of them."
    : "";
}

// ---------- pipeline ----------
function renderPipeline(activeIndex) {
  const list = el("pipeline");
  list.replaceChildren();
  STEPS.forEach((label, i) => {
    const li = document.createElement("li");
    if (i === activeIndex) li.className = "active";
    const num = document.createElement("span");
    num.className = "num"; num.textContent = i + 1;
    li.append(num, document.createTextNode(label));
    list.appendChild(li);
  });
}

// ---------- case card ----------
function setStatus(text, cls) {
  const s = el("case-status");
  s.textContent = text;
  s.className = cls;
}

function showSample(data) {
  el("case-id").textContent = data.id;
  el("case-title").textContent = data.title;
  el("case-summary").textContent = data.summary;
  el("lang-label").textContent = "Language";
  el("case-lang").textContent = data.language;
  el("branch-cell").hidden = true;
  el("files-cell").hidden = true;
  setStatus("UNSOLVED", "status-unsolved");
  currentFiles = data.files;
  renderFileList(currentFiles);
  renderSkipped(null);
  selectFile(0);
  renderPipeline(0);
}

function showRepo(data) {
  const repo = data.repo;
  el("case-id").textContent = "REPO · " + repo.owner;
  el("case-title").textContent = repo.full_name;
  const desc = repo.description ? repo.description + " " : "";
  el("case-summary").textContent =
    desc + "Files were retrieved read-only. No analysis or tests have been run yet.";
  el("lang-label").textContent = "GitHub language";
  el("case-lang").textContent = repo.github_language;
  el("branch-cell").hidden = false;
  el("files-cell").hidden = false;
  el("case-branch").textContent = repo.default_branch;
  el("case-files").textContent =
    data.files.length + (data.skipped.total ? " (" + data.skipped.total + " skipped)" : "");
  setStatus("NOT ANALYZED", "status-neutral");
  currentFiles = data.files;
  renderFileList(currentFiles);
  renderSkipped(data.skipped);
  if (currentFiles.length) {
    selectFile(0);
  } else {
    showNoFiles("No supported Python files were found in this repository. " +
                "This version reads only .py files.");
  }
  renderPipeline(0);
}

// ---------- loading data ----------
async function loadSample() {
  const myRequest = ++requestCounter;
  clearErrors();
  el("connect-loading").hidden = true;
  setBusy(false);
  try {
    const res = await fetch("/api/case");
    if (!res.ok) throw new Error("Server answered with status " + res.status);
    const data = await res.json();
    if (myRequest !== requestCounter) return;
    showSample(data);
  } catch (err) {
    el("case-title").textContent = "Case failed to load";
    el("code").replaceChildren();
    showError("error-box", "Could not load the case. Is the server running? (" + err.message + ")");
  }
}

function setBusy(busy) {
  el("connect-btn").disabled = busy;
  el("sample-btn").disabled = busy;
  el("repo-url").disabled = busy;
}

async function connectRepo() {
  const url = el("repo-url").value.trim();
  clearErrors();
  if (!url) {
    showError("connect-error", "Please paste a GitHub repository URL first.");
    return;
  }
  const myRequest = ++requestCounter;
  setBusy(true);
  el("connect-loading").hidden = false;
  try {
    const res = await fetch("/api/repo/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    let data = null;
    try { data = await res.json(); } catch (_) { /* not JSON */ }
    if (myRequest !== requestCounter) return;
    if (!res.ok) {
      throw new Error((data && data.error) || "Server answered with status " + res.status);
    }
    showRepo(data);
  } catch (err) {
    if (myRequest !== requestCounter) return;
    const offline = err instanceof TypeError;
    showError("connect-error", offline
      ? "Could not reach the GHOST REPO server. Is `python3 app.py` still running?"
      : err.message);
  } finally {
    if (myRequest === requestCounter) {
      el("connect-loading").hidden = true;
      setBusy(false);
    }
  }
}

el("connect-btn").addEventListener("click", connectRepo);
el("sample-btn").addEventListener("click", loadSample);
el("repo-url").addEventListener("keydown", e => { if (e.key === "Enter") connectRepo(); });

loadSample();
