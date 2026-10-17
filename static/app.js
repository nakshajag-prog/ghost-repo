/* =====================================================================
   Cyber Sleuth: Code Forensics Unit  -  app.js (fixed)
   ---------------------------------------------------------------------
   Verification flow:
     1. Patch is POSTed to AI_CONFIG.endpoint  (your AI backend)
     2. Backend replies with JSON (see "Backend contract" below)
     3. If the backend is unreachable, a local heuristic verifier runs
        (only when AI_CONFIG.useLocalFallback is true)

   Backend contract
   ----------------
   POST  /api/verify-patch
   Request JSON:
     { caseId, repoUrl, file, language, originalCode, patchedCode }
   Response JSON:
     {
       "passed":  true | false,
       "errors":  ["line 4: ...", ...],   // optional, shown when failed
       "report":  "Plain-text explanation from the AI",
       "hint":    "Optional nudge for the user"
     }
   ===================================================================== */

const AI_CONFIG = {
  endpoint: "/api/verify-patch", // <- point this at your AI backend
  timeoutMs: 20000,
  useLocalFallback: true,        // set false once the backend is live
  bountyPerFix: 250
};

/* ------------------------- Case data ------------------------------- */

const MOCK_REPOSITORIES = {
  "https://github.com/ghost-repo/broken-blueprint": {
    id: "#CASE-GR9942",
    file: "analytics_engine.py",
    language: "PYTHON // FAULTY BOUNDS",
    threat: "CRITICAL PROXY LEAK",
    summary:
      "An unmitigated zero evaluation boundary condition allows an empty transaction log query to bypass core assertion matrices, throwing an unhandled exception.",
    requiredDef: /def\s+check_system_integrity\s*\(/,
    divisor: "modifier",
    initialCode:
      'import sys\nimport os\n\ndef check_system_integrity(metrics):\n    # CRITICAL ANOMALY SUSPECT BLOCK\n    modifier = len(metrics["logs"]) - 0\n    return metrics["checksum"] / modifier\n    # System crash scenario triggered if zero length'
  }
};

function buildGenericCase() {
  return {
    id: "#CASE-GENERIC",
    file: "unnamed_source.py",
    language: "PYTHON // CONFIG VARIANCE",
    threat: "MODERATE THREAT LEVEL",
    summary:
      "Standard repository structural ingestion succeeded. Vitals hint at unstable division configurations within standard calculation models.",
    requiredDef: /def\s+process_node\s*\(/,
    divisor: "denominator",
    initialCode:
      "def process_node(payload):\n    # Suspect execution parameters\n    denominator = len(payload) - 0\n    return 100 / denominator"
  };
}

/* --------------------------- State --------------------------------- */

let currentCase = null;
let currentUrl = "";
let currentPoints = 4850;
let isVerifying = false;
const solvedCases = new Set(); // prevents farming points by re-scanning

function el(id) {
  return document.getElementById(id);
}

function logTerminal(message, designClass = "") {
  const terminal = el("terminal");
  const time = new Date().toLocaleTimeString();
  const row = document.createElement("div");
  row.className = `term-row ${designClass}`;
  row.textContent = `[${time}] ${message}`;
  terminal.appendChild(row);
  terminal.scrollTop = terminal.scrollHeight;
}

/* ----------------------- Scan repository --------------------------- */

el("scan-btn").addEventListener("click", () => {
  const inputUrl = el("repo-url").value.trim();

  if (!inputUrl) {
    logTerminal("ERROR: Extraction failed. Ingestion link stream target cannot be null.", "err");
    return;
  }

  resetWorkspace();
  logTerminal(`Connecting to target stream repository location: ${inputUrl}...`, "sys");

  setTimeout(() => {
    const caseData = MOCK_REPOSITORIES[inputUrl] || buildGenericCase();
    currentCase = caseData;
    currentUrl = inputUrl;

    el("dossier-details").classList.remove("default-blur");
    el("case-id").textContent = caseData.id;
    el("case-file").textContent = caseData.file;
    el("case-lang").textContent = caseData.language;
    el("case-threat").textContent = caseData.threat;
    el("case-summary").textContent = caseData.summary;

    el("editor-tab-name").textContent = caseData.file;

    const alreadySolved = solvedCases.has(inputUrl);
    const editor = el("code-editor");
    editor.value = caseData.initialCode;

    if (alreadySolved) {
      editor.setAttribute("disabled", "true");
      el("submit-patch-btn").setAttribute("disabled", "true");
      setEditorStatus("SECURED AND READ-ONLY", "status-clean");
      logTerminal("NOTICE: This case was already resolved. Bounty already collected.", "sys");
      updatePipeline(4);
    } else {
      editor.removeAttribute("disabled");
      el("submit-patch-btn").removeAttribute("disabled");
      setEditorStatus("MUTABLE VULNERABILITY FOUND", "status-tainted");
      updatePipeline(2);
      logTerminal("SUCCESS: Decryption layer unlocked. Structural anomaly vectors cataloged.", "success");
      triggerAIReport(caseData);
    }
  }, 1200);
});

function resetWorkspace() {
  currentCase = null;
  el("suggestion-alert").classList.add("hidden");
  el("suggestion-alert").textContent = "";
  el("ai-report-panel").classList.add("hidden");
  el("report-content").textContent = "";
  updatePipeline(1);
}

function setEditorStatus(text, cls) {
  const s = el("editor-status");
  s.textContent = text;
  s.className = `editor-status ${cls}`;
}

/* ---------------------------- AI report ---------------------------- */

// Safely renders a report (uses textContent so AI output can never inject HTML)
function renderReport(title, body, color = "var(--cyber-yellow)", extraLines = []) {
  const panel = el("ai-report-panel");
  const content = el("report-content");
  panel.classList.remove("hidden");
  content.textContent = "";

  const heading = document.createElement("div");
  heading.style.cssText = `color:${color};font-weight:bold;margin-bottom:4px;`;
  heading.textContent = title;
  content.appendChild(heading);

  const p = document.createElement("p");
  p.textContent = body;
  content.appendChild(p);

  if (extraLines.length) {
    const ul = document.createElement("ul");
    ul.style.cssText = "margin:8px 0 0 18px;font-family:var(--font-mono);font-size:12px;";
    extraLines.forEach((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      ul.appendChild(li);
    });
    content.appendChild(ul);
  }
}

function triggerAIReport(caseData) {
  renderReport(
    "🚨 Exception Vector: ZeroDivisionError Flagged",
    `Heuristic scanners flagged a boundary failure inside ${caseData.file}. If an external query provides an empty payload, the length drops to 0 and the division by zero crashes the routine.`
  );
  updatePipeline(3);
}

/* ------------------------ Patch verification ----------------------- */

// Tab key inserts 4 spaces (Python needs indentation) instead of leaving the editor
el("code-editor").addEventListener("keydown", (e) => {
  if (e.key !== "Tab") return;
  e.preventDefault();
  const ta = e.target;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  ta.value = ta.value.slice(0, start) + "    " + ta.value.slice(end);
  ta.selectionStart = ta.selectionEnd = start + 4;
});

el("submit-patch-btn").addEventListener("click", async () => {
  if (!currentCase || isVerifying) return;

  const btn = el("submit-patch-btn");
  const editor = el("code-editor");
  const modifiedCode = editor.value;
  const idleLabel = btn.textContent;

  isVerifying = true;
  btn.setAttribute("disabled", "true");
  btn.textContent = "⏳ Verifying with AI...";
  logTerminal("Packaging patch sequence blocks... Sending to AI verification suite.", "sys");

  try {
    const result = await verifyPatch(modifiedCode, currentCase, currentUrl);
    handleVerificationResult(result);
  } catch (err) {
    console.error(err);
    showBanner("⚠️ Verification service error. Please try again.", "warning");
    logTerminal(`VERIFICATION ERROR: ${err.message}`, "err");
  } finally {
    isVerifying = false;
    btn.textContent = idleLabel;
    // Re-enable only if the case hasn't been solved
    if (!solvedCases.has(currentUrl)) btn.removeAttribute("disabled");
  }
});

async function verifyPatch(patchedCode, caseData, repoUrl) {
  try {
    return await verifyWithBackend(patchedCode, caseData, repoUrl);
  } catch (err) {
    if (!AI_CONFIG.useLocalFallback) throw err;
    logTerminal(`AI backend unreachable (${err.message}). Using local forensic checker.`, "sys");
    const local = verifyLocally(patchedCode, caseData);
    local.source = "local";
    return local;
  }
}

async function verifyWithBackend(patchedCode, caseData, repoUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_CONFIG.timeoutMs);

  try {
    const res = await fetch(AI_CONFIG.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caseId: caseData.id,
        repoUrl,
        file: caseData.file,
        language: caseData.language,
        originalCode: caseData.initialCode,
        patchedCode
      }),
      signal: controller.signal
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (typeof data.passed !== "boolean") {
      throw new Error("Malformed response: 'passed' must be true or false");
    }

    return {
      passed: data.passed,
      errors: Array.isArray(data.errors) ? data.errors.map(String) : [],
      report: typeof data.report === "string" ? data.report : "",
      hint: typeof data.hint === "string" ? data.hint : "",
      source: "ai"
    };
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------- Local fallback verifier (heuristic) --------------- */

function verifyLocally(code, caseData) {
  const errors = [];
  const lines = code.replace(/\t/g, "    ").split("\n");

  if (!code.trim()) {
    return fail(["Editor is empty."], "Submit the full patched source file.");
  }
  if (code.trim() === caseData.initialCode.trim()) {
    return fail(
      ["No changes detected. The vulnerable code is identical to the original."],
      "Modify the code to guard against a zero divisor."
    );
  }

  // 1) Basic syntax sanity
  errors.push(...checkSyntax(lines));
  if (!caseData.requiredDef.test(code)) {
    errors.push("The original function definition is missing or renamed.");
  }

  // 2) Division must still exist, and must be protected
  const div = caseData.divisor;
  const divRegex = new RegExp(`(^|[^/])/(?!/)\\s*${div}\\b`);
  const divIdx = lines.findIndex((l) => divRegex.test(stripComment(l)));

  if (divIdx === -1) {
    errors.push(`The core computation (division by '${div}') was removed instead of fixed.`);
  } else if (!errors.length) {
    if (!isDivisionGuarded(lines, divIdx, div)) {
      errors.push(
        `line ${divIdx + 1}: division by '${div}' can still raise ZeroDivisionError when the input is empty.`
      );
    }
  }

  if (errors.length) {
    return fail(errors, "Validate the divisor before dividing, e.g. return a safe fallback when it is 0.");
  }

  return {
    passed: true,
    errors: [],
    report:
      "Local checker: the divisor is validated before the division and the syntax looks consistent. (Heuristic result: the AI backend was not used.)",
    hint: ""
  };

  function fail(errs, hint) {
    return {
      passed: false,
      errors: errs,
      report: "Local checker: the patch did not pass verification.",
      hint
    };
  }
}

function stripComment(line) {
  // Good enough for this check: drop everything after an unquoted '#'
  let inS = false, inD = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "'" && !inD) inS = !inS;
    else if (c === '"' && !inS) inD = !inD;
    else if (c === "#" && !inS && !inD) return line.slice(0, i);
  }
  return line;
}

function indentOf(line) {
  return line.length - line.trimStart().length;
}

function checkSyntax(lines) {
  const errs = [];
  const blockOpener = /^(def|class|if|elif|else|for|while|try|except|finally|with)\b/;

  for (let i = 0; i < lines.length; i++) {
    const raw = stripComment(lines[i]);
    const t = raw.trim();
    if (!t) continue;

    // balanced brackets / quotes on a single line
    const stack = [];
    const pairs = { ")": "(", "]": "[", "}": "{" };
    let inS = false, inD = false;
    for (const ch of t) {
      if (ch === "'" && !inD) inS = !inS;
      else if (ch === '"' && !inS) inD = !inD;
      else if (!inS && !inD) {
        if ("([{".includes(ch)) stack.push(ch);
        else if (")]}".includes(ch)) {
          if (stack.pop() !== pairs[ch]) {
            errs.push(`line ${i + 1}: unmatched '${ch}'.`);
            break;
          }
        }
      }
    }
    if (stack.length) errs.push(`line ${i + 1}: unclosed '${stack[stack.length - 1]}'.`);
    if (inS || inD) errs.push(`line ${i + 1}: unterminated string.`);

    // block openers need ':' and an indented body
    if (blockOpener.test(t)) {
      if (!t.endsWith(":") && !/:\s*\S/.test(t)) {
        errs.push(`line ${i + 1}: missing ':' after '${t.split(/\s|\(/)[0]}'.`);
      } else if (t.endsWith(":")) {
        let j = i + 1;
        while (j < lines.length && !stripComment(lines[j]).trim()) j++;
        if (j >= lines.length || indentOf(lines[j]) <= indentOf(lines[i])) {
          errs.push(`line ${i + 1}: expected an indented block after '${t}'.`);
        }
      }
    }
  }
  return errs;
}

function isDivisionGuarded(lines, divIdx, div) {
  const d = div;
  const divIndent = indentOf(lines[divIdx]);
  const before = lines.slice(0, divIdx).map(stripComment);
  const wholeBefore = before.join("\n");

  // Safe by construction: divisor can never be 0
  const safeAssign = [
    new RegExp(`${d}\\s*=\\s*max\\(.*,\\s*[1-9]\\d*\\s*\\)`),
    new RegExp(`${d}\\s*=\\s*max\\(\\s*[1-9]\\d*\\s*,`),
    new RegExp(`${d}\\s*=.*\\bor\\s+[1-9]\\d*`),
    new RegExp(`${d}\\s*=.*\\+\\s*[1-9]\\d*\\s*$`, "m"),
    new RegExp(`${d}\\s*=\\s*[1-9]\\d*\\s*$`, "m")
  ];
  if (safeAssign.some((r) => r.test(wholeBefore))) return true;

  // try / except ZeroDivisionError around the division
  const tryIdx = findLastIndex(before, (l) => /^\s*try\s*:/.test(l) && indentOf(l) < divIndent);
  if (tryIdx !== -1) {
    const after = lines.slice(divIdx + 1).map(stripComment);
    if (after.some((l) => /^\s*except\s+(\(?.*ZeroDivisionError.*\)?|Exception)\b.*:/.test(l))) {
      return true;
    }
  }

  // Early-exit guard:  if <divisor is zero>:  return/raise/reassign
  const zeroTests = [
    new RegExp(`^\\s*(if|elif)\\s+not\\s+${d}\\b.*:`),
    new RegExp(`^\\s*(if|elif)\\s+${d}\\s*(==|<=|<)\\s*[01]?\\s*:`),
    new RegExp(`^\\s*(if|elif)\\s+0\\s*==\\s*${d}\\s*:`),
    new RegExp(`^\\s*(if|elif)\\s+len\\(.+\\)\\s*(==|<=)\\s*0\\s*:`),
    new RegExp(`^\\s*(if|elif)\\s+not\\s+\\w+(\\[.+\\])?\\s*:`)
  ];
  for (let i = 0; i < before.length; i++) {
    if (!zeroTests.some((r) => r.test(before[i]))) continue;
    // body = following more-indented non-empty lines
    const gi = indentOf(before[i]);
    let j = i + 1;
    const body = [];
    while (j < before.length && (!before[j].trim() || indentOf(before[j]) > gi)) {
      if (before[j].trim()) body.push(before[j].trim());
      j++;
    }
    const exits = body.some(
      (b) => /^(return|raise)\b/.test(b) || new RegExp(`^${d}\\s*=\\s*[1-9]`).test(b)
    );
    // guard must be at an indentation that dominates the division line
    if (exits && gi <= divIndent) return true;
  }

  // Positive guard wrapping the division:  if divisor != 0:  <division>
  const positive = [
    new RegExp(`^\\s*if\\s+${d}\\s*(!=|>)\\s*0\\s*:`),
    new RegExp(`^\\s*if\\s+${d}\\s*:`)
  ];
  const wrapIdx = findLastIndex(before, (l) => positive.some((r) => r.test(l)) && indentOf(l) < divIndent);
  if (wrapIdx !== -1) return true;

  // Conditional expression:  x / d if d else 0
  const divLine = stripComment(lines[divIdx]);
  if (new RegExp(`/\\s*${d}\\s+if\\s+${d}\\b`).test(divLine)) return true;

  return false;
}

function findLastIndex(arr, pred) {
  for (let i = arr.length - 1; i >= 0; i--) if (pred(arr[i])) return i;
  return -1;
}

/* ------------------------ Result handling -------------------------- */

function showBanner(text, kind) {
  const box = el("suggestion-alert");
  box.textContent = text;
  box.className = `suggestion-banner ${kind}`;
  box.classList.remove("hidden");
}

function handleVerificationResult(result) {
  const via = result.source === "local" ? "LOCAL CHECKER" : "AI VERIFIER";

  if (!result.passed) {
    const headline = "🚨 FORENSIC SUITE EXCEPTION: Patch rejected.";
    const hint = result.hint ? ` ${result.hint}` : "";
    showBanner(`${headline}${hint}`, "warning");

    renderReport(
      `❌ ${via}: Verification Failed`,
      result.report || "The patch did not pass verification.",
      "var(--alert-red)",
      result.errors
    );

    logTerminal("PATCH CRASHED: Verification simulation units collapsed under assertion failures.", "err");
    result.errors.forEach((e) => logTerminal(`  ↳ ${e}`, "err"));
    return;
  }

  // ---- Passed ----
  showBanner(
    "✅ SUCCESS: All verification units cleared. Logic blocks neutralized. Vulnerability permanently safe-sealed.",
    "success"
  );
  renderReport(
    `✅ ${via}: Patch Verified`,
    result.report || "The vulnerability has been correctly mitigated.",
    "var(--matrix-green)"
  );

  el("code-editor").setAttribute("disabled", "true");
  el("submit-patch-btn").setAttribute("disabled", "true");
  setEditorStatus("SECURED AND READ-ONLY", "status-clean");

  logTerminal("PATCH VERIFIED: Mitigation patch deployment complete. Environment secure.", "success");
  updatePipeline(5); // all four steps marked complete

  if (!solvedCases.has(currentUrl)) {
    solvedCases.add(currentUrl);
    awardBountyPoints(AI_CONFIG.bountyPerFix);
  }
}

/* --------------------------- Pipeline ------------------------------ */

function updatePipeline(activeStepNumber) {
  const steps = document.querySelectorAll("#pipeline .step");
  steps.forEach((step) => {
    const num = parseInt(step.getAttribute("data-step"), 10);
    if (num < activeStepNumber) step.className = "step complete";
    else if (num === activeStepNumber) step.className = "step active";
    else step.className = "step";
  });
}

/* ---------------------- Credits & leaderboard ---------------------- */

function awardBountyPoints(pointsGained) {
  currentPoints += pointsGained;
  el("agent-points").textContent = `${currentPoints} CP`;

  logTerminal(
    `BOUNTY SECURED: +${pointsGained} Credit Points have been allocated to your operational profile registry.`,
    "success"
  );

  setTimeout(() => {
    const leaderboard = el("leaderboard");
    let userRow = el("leaderboard-user-row");

    if (!userRow) {
      userRow = document.createElement("div");
      userRow.id = "leaderboard-user-row";
      userRow.className = "leaderboard-row gold-tier";

      const name = document.createElement("span");
      name.className = "rank-name";
      name.textContent = "⭐ Agent_DevX (YOU)";

      const score = document.createElement("span");
      score.className = "rank-score";
      score.id = "leaderboard-user-score";

      userRow.append(name, score);
      leaderboard.insertBefore(userRow, leaderboard.firstChild);
    }

    el("leaderboard-user-score").textContent = `${currentPoints} CP`;
    logTerminal("LEADERBOARD SYNCED: Global cyber ranks adjusted tracking your recent operation.", "sys");
  }, 500);
}
