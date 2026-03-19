#!/usr/bin/env node

const {
  GITHUB_TOKEN,
  ANTHROPIC_API_KEY,
  ANTHROPIC_MODEL,
  GITHUB_REPOSITORY,
  PR_NUMBER,
  MAX_FILES,
  MAX_TOTAL_PATCH_LINES,
  MAX_PATCH_LINES_PER_FILE,
  MAX_FINDINGS,
  INLINE_SEVERITIES,
  SUMMARY_SEVERITIES,
} = process.env;

const model = ANTHROPIC_MODEL?.trim() || "claude-3-5-sonnet-latest";
const owner = (GITHUB_REPOSITORY || "").split("/")[0];
const repo = (GITHUB_REPOSITORY || "").split("/")[1];
const prNumber = Number(PR_NUMBER);
const maxFiles = Number(MAX_FILES || 30);
const maxTotalPatchLines = Number(MAX_TOTAL_PATCH_LINES || 1200);
const maxPatchLinesPerFile = Number(MAX_PATCH_LINES_PER_FILE || 250);
const maxFindings = Number(MAX_FINDINGS || 12);
const inlineSeveritySet = parseSeveritySet(INLINE_SEVERITIES || "high");
const summarySeveritySet = parseSeveritySet(SUMMARY_SEVERITIES || "medium,low");
const inlineMarker = "<!-- claude-ai-review -->";
const summaryMarker = "<!-- claude-ai-review-summary -->";

if (!GITHUB_TOKEN || !owner || !repo || !Number.isInteger(prNumber)) {
  console.log("Missing required GitHub context. Skipping.");
  process.exit(0);
}

if (!ANTHROPIC_API_KEY) {
  console.log("ANTHROPIC_API_KEY is not set. Skipping.");
  process.exit(0);
}

const sensitivePathPatterns = [
  /(^|\/)\.env(\..+)?$/i,
  /(^|\/).+\.(pem|p12|pfx|key)$/i,
  /(^|\/)(id_rsa|id_dsa|id_ecdsa|id_ed25519)$/i,
  /(^|\/)(secrets?|credentials?)\//i,
  /(^|\/)[^/]*(secret|token|credential|passwd|password)[^/]*$/i,
];

function isSensitivePath(path) {
  return sensitivePathPatterns.some((pattern) => pattern.test(path));
}

async function ghRequest(method, path, body) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(
      `GitHub API ${method} ${path} failed (${res.status}): ${text || "no body"}`
    );
  }
  return data;
}

async function ghPaginate(path) {
  const items = [];
  let page = 1;
  while (true) {
    const separator = path.includes("?") ? "&" : "?";
    const data = await ghRequest("GET", `${path}${separator}per_page=100&page=${page}`);
    if (!Array.isArray(data) || data.length === 0) break;
    items.push(...data);
    if (data.length < 100) break;
    page += 1;
  }
  return items;
}

function parseAddedLines(patch) {
  if (!patch) return [];

  const added = [];
  let newLine = null;

  for (const line of patch.split("\n")) {
    if (line.startsWith("@@")) {
      const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      newLine = match ? Number(match[1]) : null;
      continue;
    }
    if (newLine == null) continue;

    if (line.startsWith("+") && !line.startsWith("+++")) {
      added.push(newLine);
      newLine += 1;
      continue;
    }
    if (line.startsWith("-") && !line.startsWith("---")) {
      continue;
    }
    newLine += 1;
  }
  return added;
}

function truncatePatch(patch, maxLines) {
  const lines = (patch || "").split("\n");
  if (lines.length <= maxLines) return patch;
  return `${lines.slice(0, maxLines).join("\n")}\n... [TRUNCATED]`;
}

function extractJson(text) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("[");
    const end = candidate.lastIndexOf("]");
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error("Could not parse JSON findings from Claude response.");
  }
}

function normalize(text) {
  return (text || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function parseSeveritySet(raw) {
  const values = String(raw || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return new Set(values);
}

function shouldInlineSeverity(severity) {
  return inlineSeveritySet.has(severity);
}

function shouldSummarizeSeverity(severity) {
  return summarySeveritySet.has(severity);
}

function nearestLine(lines, target) {
  if (!lines.length) return null;
  if (!Number.isFinite(target)) return lines[0];
  return lines.reduce((best, current) =>
    Math.abs(current - target) < Math.abs(best - target) ? current : best
  );
}

function toSeverity(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (normalized === "critical" || normalized === "high") return "high";
  if (normalized === "medium" || normalized === "moderate") return "medium";
  return "low";
}

function buildSummaryBody(items, publishedInlineCount) {
  const header = [
    summaryMarker,
    `### Claude automated review summary (${model})`,
    `- inline severities: ${[...inlineSeveritySet].join(", ") || "(none)"}`,
    `- summary severities: ${[...summarySeveritySet].join(", ") || "(none)"}`,
    `- inline comments published: ${publishedInlineCount}`,
    "",
  ];

  if (!items.length) {
    return `${header.join("\n")}No summary findings in this run.`;
  }

  const lines = items.map(
    (item, index) =>
      `${index + 1}. [${item.severity.toUpperCase()}] \`${item.path}:${item.line}\` - ${item.message}`
  );

  return `${header.join("\n")}${lines.join("\n")}`;
}

async function upsertSummaryComment(items, publishedInlineCount) {
  const issueComments = await ghPaginate(`/repos/${owner}/${repo}/issues/${prNumber}/comments`);
  const existing = issueComments.find((comment) => (comment.body || "").includes(summaryMarker));

  if (!items.length && !existing) {
    return;
  }

  const body = buildSummaryBody(items, publishedInlineCount);

  if (existing) {
    await ghRequest("PATCH", `/repos/${owner}/${repo}/issues/comments/${existing.id}`, {body});
    return;
  }

  await ghRequest("POST", `/repos/${owner}/${repo}/issues/${prNumber}/comments`, {body});
}

async function callClaude(prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2200,
      temperature: 0,
      system:
        "You are a strict pull request reviewer. Focus only on actionable bugs, security risks, regressions, and performance risks.",
      messages: [{role: "user", content: prompt}],
    }),
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(`Anthropic API failed (${res.status}): ${text || "no body"}`);
  }

  const content = Array.isArray(data?.content) ? data.content : [];
  const merged = content
    .filter((item) => item?.type === "text")
    .map((item) => item.text)
    .join("\n")
    .trim();

  if (!merged) {
    throw new Error("Anthropic API returned empty content.");
  }
  return merged;
}

function buildPrompt(pr, files) {
  const payload = {
    pull_request: {
      number: pr.number,
      title: pr.title,
      body: pr.body || "",
      base: pr.base?.ref,
      head: pr.head?.ref,
    },
    constraints: {
      focus: ["bug", "security", "regression", "performance"],
      avoid: ["style", "naming", "formatting", "praise"],
      max_findings: maxFindings,
      output_schema: [
        {file: "string", line: "number", severity: "low|medium|high", comment: "string"},
      ],
      line_rule: "line must be one of valid_added_lines for the matching file.",
      output_rule: "Return ONLY JSON array.",
    },
    files,
  };

  return JSON.stringify(payload, null, 2);
}

async function main() {
  const pr = await ghRequest("GET", `/repos/${owner}/${repo}/pulls/${prNumber}`);
  const files = await ghPaginate(`/repos/${owner}/${repo}/pulls/${prNumber}/files`);

  const filtered = files.filter((file) => {
    if (!file?.patch || !file?.filename) return false;
    if (isSensitivePath(file.filename)) return false;
    return true;
  });

  if (!filtered.length) {
    console.log("No eligible changed files after filtering. Skipping.");
    return;
  }

  if (filtered.length > maxFiles) {
    console.log(`Skipped: changed files ${filtered.length} exceed MAX_FILES=${maxFiles}.`);
    return;
  }

  const totalPatchLines = filtered.reduce((sum, file) => {
    return sum + (file.patch ? file.patch.split("\n").length : 0);
  }, 0);

  if (totalPatchLines > maxTotalPatchLines) {
    console.log(
      `Skipped: patch lines ${totalPatchLines} exceed MAX_TOTAL_PATCH_LINES=${maxTotalPatchLines}.`
    );
    return;
  }

  const reviewTargets = filtered
    .map((file) => {
      const addedLines = parseAddedLines(file.patch);
      return {
        file: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        valid_added_lines: addedLines,
        patch: truncatePatch(file.patch, maxPatchLinesPerFile),
      };
    })
    .filter((file) => file.valid_added_lines.length > 0);

  if (!reviewTargets.length) {
    console.log("No reviewable files with added lines. Skipping.");
    return;
  }

  const prompt = buildPrompt(pr, reviewTargets);
  const claudeText = await callClaude(prompt);
  const parsed = extractJson(claudeText);
  const findings = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.findings) ? parsed.findings : [];

  if (!findings.length) {
    console.log("Claude returned zero findings.");
    return;
  }

  const targetByFile = new Map(reviewTargets.map((file) => [file.file, file]));
  const existingComments = await ghPaginate(`/repos/${owner}/${repo}/pulls/${prNumber}/comments`);
  const existingKeys = new Set(
    existingComments.map((comment) => {
      const body = normalize(comment.body || "");
      return `${comment.path}:${comment.line}:${body}`;
    })
  );

  const queued = [];
  const queuedKeys = new Set();
  const summaryItems = [];
  const summaryKeys = new Set();

  for (const finding of findings.slice(0, maxFindings)) {
    const path = finding?.file || finding?.path;
    const target = targetByFile.get(path);
    if (!target) continue;

    const line = nearestLine(target.valid_added_lines, Number(finding?.line));
    if (!line) continue;

    const severity = toSeverity(finding?.severity);
    const message = String(finding?.comment || "").trim();
    if (!message) continue;

    if (shouldInlineSeverity(severity)) {
      const body = `${inlineMarker}\n[${severity.toUpperCase()}] ${message}`;
      const key = `${path}:${line}:${normalize(body)}`;
      if (existingKeys.has(key) || queuedKeys.has(key)) continue;

      queued.push({
        path,
        line,
        side: "RIGHT",
        body,
      });
      queuedKeys.add(key);
      continue;
    }

    if (shouldSummarizeSeverity(severity)) {
      const summaryKey = `${path}:${line}:${severity}:${normalize(message)}`;
      if (summaryKeys.has(summaryKey)) continue;

      summaryItems.push({
        severity,
        path,
        line,
        message,
      });
      summaryKeys.add(summaryKey);
    }
  }

  let inlinePublishedCount = 0;
  try {
    if (queued.length) {
      await ghRequest("POST", `/repos/${owner}/${repo}/pulls/${prNumber}/reviews`, {
        commit_id: pr.head.sha,
        event: "COMMENT",
        body: `Claude automated review (${model})`,
        comments: queued,
      });
      inlinePublishedCount = queued.length;
      console.log(`Published ${queued.length} inline review comment(s).`);
    } else {
      console.log("No inline findings to publish.");
    }
  } catch (error) {
    console.log(`Batch review publish failed: ${error.message}`);
    let published = 0;
    for (const comment of queued) {
      try {
        await ghRequest("POST", `/repos/${owner}/${repo}/pulls/${prNumber}/comments`, {
          commit_id: pr.head.sha,
          ...comment,
        });
        published += 1;
      } catch (singleError) {
        console.log(`Failed to publish comment ${comment.path}:${comment.line}: ${singleError.message}`);
      }
    }
    inlinePublishedCount = published;
    console.log(`Published ${published}/${queued.length} inline comment(s) with fallback mode.`);
  }

  await upsertSummaryComment(summaryItems, inlinePublishedCount);
  console.log(`Summary findings processed: ${summaryItems.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
