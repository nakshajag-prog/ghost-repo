// Internal Mock Repository Databank for Investigation Simulation
const MOCK_REPOSITORIES = {
  "https://github.com/ghost-repo/broken-blueprint": {
    id: "#CASE-GR9942",
    file: "analytics_engine.py",
    language: "PYTHON // FAULTY BOUNDS",
    threat: "CRITICAL PROXY LEAK",
    summary: "An unmitigated zero evaluation boundary condition allows an empty transaction log query to bypass core assertion matrices, throwing an unhandled exception.",
    initialCode: `import sys\nimport os\n\ndef check_system_integrity(metrics):\n    # CRITICAL ANOMALY SUSPECT BLOCK\n    modifier = len(metrics["logs"]) - 0\n    return metrics["checksum"] / modifier\n    # System crash scenario triggered if zero length`,
    verifyPatch: (codeText) => {
      // Step 1: Clean spaces & tabs to ensure validation consistency
      const cleanCode = codeText.replace(/\\s/g, "");
      
      // Step 2: Ensure the original crash vulnerabilities are altered or guarded
      const containsBuggyLine = cleanCode.includes("modifier=len(metrics[\"logs\"])-0") && cleanCode.includes("/modifier");
      const containsGenericBuggyLine = cleanCode.includes("denominator=len(payload)-0") && cleanCode.includes("/denominator");
      
      if (containsBuggyLine || containsGenericBuggyLine) {
        return { success: false, msg: "🚨 FRAUDULENT PATCH EXCEPTION: The original vulnerability vector remains unmitigated. The system is still dividing by zero when array bounds hit absolute minimum constraints." };
      }

      // Step 3: Validate successful implementation of safe division parameters
      // Checks for standard defensive paths: try-except architectures, inline ternary guards, or logical if statements.
      const hasTryExcept = cleanCode.includes("try:") && cleanCode.includes("exceptZeroDivisionError:");
      const hasTernaryGuard = cleanCode.includes("iflen(") && cleanCode.includes("else");
      const hasConditionalGuard = cleanCode.includes("ifmodifier==") || cleanCode.includes("ifnotmodifier") || cleanCode.includes("ifdenominator==") || cleanCode.includes("ifnotdenominator");

      if (hasTryExcept || hasTernaryGuard || hasConditionalGuard) {
        return { success: true, msg: "✅ SUCCESS: Core logical simulation units cleared. Division by zero exception states successfully mitigated." };
      }

      return { success: false, msg: "🚨 LOGIC GAP: You altered the line, but no structural safety guard was found! Implement a try/except envelope, an if statement constraint, or an inline conditional fallback." };
    }
  }
};

// Application State Registry
let currentCase = null;
let currentPoints = 4850;

// UI Selector Operations Cache
function el(id) { return document.getElementById(id); }

function logTerminal(message, designClass = "") {
  const terminal = el("terminal");
  const time = new Date().toLocaleTimeString();
  const row = document.createElement("div");
  row.className = `term-row \${designClass}`;
  row.textContent = `[\${time}] \${message}`;
  terminal.appendChild(row);
  terminal.scrollTop = terminal.scrollHeight;
}

// Phase 1: URL Parse & Deep Investigation Scanner
el("scan-btn").addEventListener("click", () => {
  const inputUrl = el("repo-url").value.trim();
  
  if (!inputUrl) {
    logTerminal("ERROR: Extraction failed. Ingestion link stream target cannot be null.", "err");
    return;
  }
  
  logTerminal(`Connecting to target stream repository location: \${inputUrl}...`, "sys");
  
  setTimeout(() => {
    // Dynamically generate data schema for the designated target case or fall back gracefully
    let caseData = MOCK_REPOSITORIES[inputUrl];
    
    if (!caseData) {
      caseData = {
        id: "#CASE-GENERIC",
        file: "unnamed_source.py",
        language: "PYTHON // CONFIG VARIANCE",
        threat: "MODERATE THREAT LEVEL",
        summary: "Standard repository structural ingestion succeeded. Vitals hint at unstable division configurations within standard calculation models.",
        initialCode: `def process_node(payload):\n    # Suspect execution parameters\n    denominator = len(payload) - 0\n    return 100 / denominator`,
        verifyPatch: MOCK_REPOSITORIES["https://github.com/ghost-repo/broken-blueprint"].verifyPatch
      };
    }
    
    currentCase = caseData;
    
    // Animate Visual Dossier Unlocking Sequence
    el("dossier-details").classList.remove("default-blur");
    el("case-id").textContent = caseData.id;
    el("case-file").textContent = caseData.file;
    el("case-lang").textContent = caseData.language;
    el("case-threat").textContent = caseData.threat;
    el("case-summary").textContent = caseData.summary;
    
    // Configure Active Workspace Code Field
    el("editor-tab-name").textContent = caseData.file;
    el("editor-status").textContent = "MUTABLE VULNERABILITY FOUND";
    el("editor-status").className = "editor-status status-tainted";
    
    const editor = el("code-editor");
    editor.value = caseData.initialCode;
    editor.removeAttribute("disabled");
    el("submit-patch-btn").removeAttribute("disabled");
    
    // Clear old state tracking states
    const suggestionBox = el("suggestion-alert");
    suggestionBox.classList.add("hidden");
    suggestionBox.textContent = "";
    
    updatePipeline(2);
    logTerminal("SUCCESS: Decryption layer unlocked. Structural anomaly vectors cataloged.", "success");
    
    triggerAIReport(caseData);
    
  }, 1200);
});

function triggerAIReport(caseData) {
  const reportPanel = el("ai-report-panel");
  const reportContent = el("report-content");
  
  reportPanel.classList.remove("hidden");
  reportContent.innerHTML = `
    <div style="color: var(--cyber-yellow); font-weight: bold; margin-bottom: 4px;">🚨 Exception Vector: ZeroDivisionError Flagged</div>
    <p>Heuristic scanners flagged an array index boundary failure inside <code>\${caseData.file}</code>. If an external query provides an empty payload parameter stack, the array length drops down to 0, locking operations behind an illegal mathematical absolute zero split constraint.</p>
  `;
  updatePipeline(3);
}

// Phase 2: Live Code Submission Evaluation Engine
el("submit-patch-btn").addEventListener("click", () => {
  if (!currentCase) return;
  
  const modifiedCode = el("code-editor").value;
  const suggestionBox = el("suggestion-alert");
  
  logTerminal("Packaging patch sequence blocks... Injecting testing suites.", "sys");
  
  setTimeout(() => {
    // Run verification assessment routine
    const evaluation = currentCase.verifyPatch(modifiedCode);
    
    if (!evaluation.success) {
      suggestionBox.textContent = evaluation.msg;
      suggestionBox.className = "suggestion-banner warning";
      suggestionBox.classList.remove("hidden");
      logTerminal("PATCH CRASHED: Verification simulation units collapsed under assertion failures.", "err");
    } else {
      // Patch Verification Success Sequence
      suggestionBox.textContent = evaluation.msg;
      suggestionBox.className = "suggestion-banner success";
      suggestionBox.classList.remove("hidden");
      
      // Freeze Environment State
      el("code-editor").setAttribute("disabled", "true");
      el("submit-patch-btn").setAttribute("disabled", "true");
      el("editor-status").textContent = "SECURED AND READ-ONLY";
      el("editor-status").className = "editor-status status-clean";
      
      logTerminal("PATCH VERIFIED: Mitigation patch deployment complete. Environment secure.", "success");
      updatePipeline(4);
      
      // Gamification Reward Distributions
      awardBountyPoints(250);
    }
  }, 1000);
});

function updatePipeline(activeStepNumber) {
  const steps = document.querySelectorAll("#pipeline .step");
  steps.forEach(step => {
    const num = parseInt(step.getAttribute("data-step"));
    if (num < activeStepNumber) {
      step.className = "step complete";
    } else if (num === activeStepNumber) {
      step.className = "step active";
    } else {
      step.className = "step";
    }
  });
}

function awardBountyPoints(pointsGained) {
  currentPoints += pointsGained;
  el("agent-points").textContent = `\${currentPoints} CP`;
  
  logTerminal(`BOUNTY SECURED: +\${pointsGained} Credit Points have been allocated to your operational profile registry.`, "success");
  
  // Realtime Leaderboard Re-ordering Manipulation
  setTimeout(() => {
    const leaderboard = el("leaderboard");
    
    // Construct dynamic high-tier row representing the user's elevated credit score
    const userRow = document.createElement("div");
    userRow.className = "leaderboard-row gold-tier";
    userRow.innerHTML = `
      <span class="rank-name">⭐ Agent_DevX (YOU)</span>
      <span class="rank-score">\${currentPoints} CP</span>
    `;
    
    // Prepend user to top competitive tier
    leaderboard.insertBefore(userRow, leaderboard.firstChild);
    logTerminal("LEADERBOARD SYNCED: Global cyber ranks adjusted tracking your recent operation mitigation vector.", "sys");
  }, 500);
}
