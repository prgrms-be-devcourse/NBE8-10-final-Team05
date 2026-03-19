#!/usr/bin/env node

import fs from "node:fs/promises";

const {
  GITHUB_TOKEN,
  ANTHROPIC_API_KEY,
  ANTHROPIC_MODEL,
  GITHUB_REPOSITORY,
  GITHUB_EVENT_PATH,
  PR_NUMBER,
  MAX_FILES,
  MAX_TOTAL_PATCH_LINES,
  MAX_PATCH_LINES_PER_FILE,
  MAX_FINDINGS,
  MIN_SEVERITY,
  MIN_CONFIDENCE,
} = process.env;

const model = ANTHROPIC_MODEL?.trim() || "claude-3-5-sonnet-latest";
const [owner, repo] = String(GITHUB_REPOSITORY || "").split("/");
const maxFiles = Number(MAX_FILES || 80);
const maxTotalPatchLines = Number(MAX_TOTAL_PATCH_LINES || 3500);
const maxPatchLinesPerFile = Number(MAX_PATCH_LINES_PER_FILE || 500);
const maxFindings = Number(MAX_FINDINGS || 20);
const minConfidence = Number(MIN_CONFIDENCE || 0.78);
const minSeverity = normalizeSeverity(MIN_SEVERITY || "MEDIUM");

const summaryMarker = "<!-- claude-pr-review-summary -->";
const inlineMarker = "<!-- claude-ai-review -->";
const severityRank = {LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4};

if (!GITHUB_TOKEN || !owner || !repo) {
  console.error("Missing required GitHub context.");
  process.exit(1);
}

if (!ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set.");
  process.exit(1);
}

function normalizeSeverity(value) {
  const s = String(value || "").trim().toUpperCase();
  if (["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(s)) return s;
  if (s === "MODERATE") return "MEDIUM";
  return "LOW";
}

function normalizeCategory(value) {
  const c = String(value || "").trim().toLowerCase();
  if (["bug", "security", "regression", "performance"].includes(c)) return c;
  return "bug";
}

function severityPasses(severity) {
  return (severityRank[severity] || 1) >= (severityRank[minSeverity] || 2);
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
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

function nearestLine(lines, target) {
  if (!lines.length) return null;
  if (!Number.isFinite(target)) return lines[0];

  return lines.reduce((best, current) =>
    Math.abs(current - target) < Math.abs(best - target) ? current : best
  );
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
    throw new Error("Could not parse JSON from Claude response.");
  }
}

function truncatePatch(patch, lineLimit) {
  const lines = String(patch || "").split("\n");
  if (lines.length <= lineLimit) return patch;
  return `${lines.slice(0, lineLimit).join("\n")}\n... [TRUNCATED]`;
}

function isSensitivePath(filePath) {
  const patterns = [
    /(^|\/)\.env(\..+)?$/i,
    /(^|\/).+\.(pem|p12|pfx|key)$/i,
    /(^|\/)(id_rsa|id_dsa|id_ecdsa|id_ed25519)$/i,
    /(^|\/)(secrets?|credentials?)\//i,
    /(^|\/)[^/]*(secret|token|credential|passwd|password)[^/]*$/i,
  ];
  return patterns.some((pattern) => pattern.test(filePath));
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
    throw new Error(`GitHub API ${method} ${path} failed (${res.status}): ${text || "no body"}`);
  }

  return data;
}

async function ghPaginate(path) {
  const items = [];
  let page = 1;

  while (true) {
    const sep = path.includes("?") ? "&" : "?";
    const data = await ghRequest("GET", `${path}${sep}per_page=100&page=${page}`);
    if (!Array.isArray(data) || data.length === 0) break;
    items.push(...data);
    if (data.length < 100) break;
    page += 1;
  }

  return items;
}

async function callClaude({system, user, maxTokens}) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0,
      system,
      messages: [{role: "user", content: user}],
    }),
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(`Anthropic API failed (${res.status}): ${text || "no body"}`);
  }

  const merged = (Array.isArray(data?.content) ? data.content : [])
    .filter((item) => item?.type === "text")
    .map((item) => item.text)
    .join("\n")
    .trim();

  if (!merged) {
    throw new Error("Anthropic API returned empty content.");
  }

  return merged;
}

async function loadEventPayload() {
  if (!GITHUB_EVENT_PATH) return null;

  const content = await fs.readFile(GITHUB_EVENT_PATH, "utf8");
  return JSON.parse(content);
}

function resolvePrNumber(eventPayload) {
  if (Number.isInteger(Number(PR_NUMBER))) return Number(PR_NUMBER);
  const fromPayload = Number(eventPayload?.pull_request?.number);
  if (Number.isInteger(fromPayload)) return fromPayload;
  return null;
}

function buildReviewPrompt(pr, files) {
  const payload = {
    review_goal:
      "실제 결함 가능성이 높은 버그/보안/회귀/성능 문제만 엄격하게 식별. 추측성 코멘트 금지.",
    language: "Korean",
    pull_request: {
      number: pr.number,
      title: pr.title,
      body: pr.body || "",
      base: pr.base?.ref,
      head: pr.head?.ref,
    },
    constraints: {
      focus: ["bug", "security", "regression", "performance"],
      reject: ["style", "naming", "formatting", "취향", "막연한 우려"],
      min_severity: minSeverity,
      min_confidence: minConfidence,
      max_findings: maxFindings,
      line_rule: "line must be one of valid_added_lines for that file",
      quality_rule: "각 이슈는 실패 시나리오와 영향이 명확해야 함",
      output_rule: "Return ONLY JSON array",
      output_schema: [
        {
          file: "string",
          line: "number",
          severity: "CRITICAL|HIGH|MEDIUM|LOW",
          category: "bug|security|regression|performance",
          confidence: "number(0~1)",
          comment_ko: "string",
          evidence_ko: "string",
          fix_hint_ko: "string(optional)",
        },
      ],
    },
    files,
  };

  return JSON.stringify(payload, null, 2);
}

function buildInlineBody(f) {
  const severityLabelMap = {
    CRITICAL: "Critical",
    HIGH: "High",
    MEDIUM: "Medium",
    LOW: "Low",
  };
  const categoryLabelMap = {
    bug: "Correctness",
    security: "Security",
    regression: "Regression",
    performance: "Performance",
  };

  const lines = [
    inlineMarker,
    `**Severity:** ${severityLabelMap[f.severity] || f.severity}`,
    `**Category:** ${categoryLabelMap[f.category] || f.category}`,
    `**Issue:** ${f.comment}`,
    `**Why it matters:** ${f.evidence}`,
    `**Location:** \`${f.path}:${f.line}\``,
  ];

  if (f.fixHint) {
    lines.push(`**Suggested fix:** ${f.fixHint}`);
  }

  return lines.join("\n");
}

function summarizeFindings(findings) {
  const counts = {CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0};
  for (const finding of findings) {
    counts[finding.severity] = (counts[finding.severity] || 0) + 1;
  }

  const keyFindings = [...findings]
    .sort((a, b) => {
      const bySeverity = (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0);
      if (bySeverity !== 0) return bySeverity;
      return b.confidence - a.confidence;
    })
    .slice(0, 5);

  return {counts, keyFindings};
}

function buildSummaryBody(summary) {
  const lines = [
    summaryMarker,
    `### 코드 리뷰 요약 (Claude)`,
    `- 상태: ${summary.status || "완료"}`,
    `- 분석 대상 파일: ${summary.analyzedFiles}`,
    `- 임계치 통과 이슈: ${summary.totalFindings ?? 0}`,
    `- 생성 코멘트: ${summary.publishedComments}`,
    `- 최소 심각도: ${minSeverity}`,
    `- 최소 신뢰도: ${minConfidence}`,
    "",
    `#### 심각도 분포`,
    `- Critical: ${summary.counts?.CRITICAL ?? 0}`,
    `- High: ${summary.counts?.HIGH ?? 0}`,
    `- Medium: ${summary.counts?.MEDIUM ?? 0}`,
    `- Low: ${summary.counts?.LOW ?? 0}`,
    "",
    `#### 주요 이슈`,
  ];

  if (summary.keyFindings?.length) {
    summary.keyFindings.forEach((f, idx) => {
      lines.push(
        `${idx + 1}. [${f.severity}] \`${f.path}:${f.line}\` - ${f.comment}`
      );
    });
  } else {
    lines.push("- 주요 이슈 없음");
  }

  if (summary.note) {
    lines.push("", `- 비고: ${summary.note}`);
  }

  lines.push("", "- 참고: 추측성 지적은 제외하고 근거가 명확한 항목만 코멘트합니다.");
  return lines.join("\n");
}

async function upsertSummaryComment(prNumber, body) {
  const issueComments = await ghPaginate(`/repos/${owner}/${repo}/issues/${prNumber}/comments`);
  const existing = issueComments.find((c) => String(c.body || "").includes(summaryMarker));

  if (existing) {
    await ghRequest("PATCH", `/repos/${owner}/${repo}/issues/comments/${existing.id}`, {body});
    return;
  }

  await ghRequest("POST", `/repos/${owner}/${repo}/issues/${prNumber}/comments`, {body});
}

async function main() {
  const eventPayload = await loadEventPayload();
  const prNumber = resolvePrNumber(eventPayload);

  if (!prNumber) {
    console.log("PR number is not resolved. Skipping.");
    return;
  }

  const pr = await ghRequest("GET", `/repos/${owner}/${repo}/pulls/${prNumber}`);
  const rawFiles = await ghPaginate(`/repos/${owner}/${repo}/pulls/${prNumber}/files`);

  let candidates = rawFiles
    .filter((f) => f?.filename && f?.patch)
    .filter((f) => !isSensitivePath(f.filename))
    .filter((f) => !f.filename.startsWith(".github/workflows/"))
    .map((f) => ({
      ...f,
      patchLines: String(f.patch || "").split("\n").length,
      churn: Number(f.additions || 0) + Number(f.deletions || 0),
    }))
    .sort((a, b) => b.churn - a.churn);

  let note = "";

  if (candidates.length > maxFiles) {
    note = `변경 파일 수가 많아 상위 ${maxFiles}개 파일만 분석했습니다.`;
    candidates = candidates.slice(0, maxFiles);
  }

  let lineBudget = 0;
  const bounded = [];
  for (const file of candidates) {
    if (lineBudget + file.patchLines > maxTotalPatchLines) break;
    lineBudget += file.patchLines;
    bounded.push(file);
  }

  if (!bounded.length) {
    const body = buildSummaryBody({
      status: "건너뜀",
      analyzedFiles: 0,
      totalFindings: 0,
      publishedComments: 0,
      counts: {CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0},
      keyFindings: [],
      note: `PR 변경량이 설정(${maxTotalPatchLines} lines)을 초과해 분석을 생략했습니다.`,
    });
    await upsertSummaryComment(prNumber, body);
    console.log("Skipped due to patch budget.");
    return;
  }

  const targets = bounded
    .map((f) => ({
      file: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      valid_added_lines: parseAddedLines(f.patch),
      patch: truncatePatch(f.patch, maxPatchLinesPerFile),
    }))
    .filter((f) => f.valid_added_lines.length > 0);

  if (!targets.length) {
    const body = buildSummaryBody({
      analyzedFiles: bounded.length,
      totalFindings: 0,
      publishedComments: 0,
      counts: {CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0},
      keyFindings: [],
      note: "추가된 코드 라인이 없어 인라인 리뷰를 생략했습니다.",
    });
    await upsertSummaryComment(prNumber, body);
    console.log("No reviewable added lines.");
    return;
  }

  const prompt = buildReviewPrompt(pr, targets);
  const responseText = await callClaude({
    system:
      "당신은 시니어 코드리뷰어다. 한국어로 작성하고, 근거가 약한 지적은 절대 하지 않는다. 실제 결함 가능성이 높은 항목만 반환한다.",
    user: prompt,
    maxTokens: 2600,
  });

  const parsed = extractJson(responseText);
  const findingsRaw = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.findings)
      ? parsed.findings
      : [];

  const targetByFile = new Map(targets.map((t) => [t.file, t]));

  const normalized = findingsRaw
    .map((f) => {
      const file = String(f?.file || f?.path || "").trim();
      const target = targetByFile.get(file);
      if (!target) return null;

      const line = nearestLine(target.valid_added_lines, Number(f?.line));
      if (!line) return null;

      const severity = normalizeSeverity(f?.severity);
      if (!severityPasses(severity)) return null;

      const confidence = Number(f?.confidence);
      if (!Number.isFinite(confidence) || confidence < minConfidence) return null;

      const comment = String(f?.comment_ko || f?.comment || "").trim();
      const evidence = String(f?.evidence_ko || f?.evidence || "").trim();
      const fixHint = String(f?.fix_hint_ko || f?.fix_hint || "").trim();
      if (!comment || !evidence) return null;

      return {
        path: file,
        line,
        side: "RIGHT",
        severity,
        category: normalizeCategory(f?.category),
        confidence,
        comment,
        evidence,
        fixHint,
      };
    })
    .filter(Boolean)
    .slice(0, maxFindings);

  if (!normalized.length) {
    const body = buildSummaryBody({
      analyzedFiles: targets.length,
      totalFindings: 0,
      publishedComments: 0,
      counts: {CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0},
      keyFindings: [],
      note: "임계치 이상(심각도/신뢰도)의 이슈가 없어 코멘트를 남기지 않았습니다.",
    });
    await upsertSummaryComment(prNumber, body);
    console.log("No findings passed threshold.");
    return;
  }

  const existing = await ghPaginate(`/repos/${owner}/${repo}/pulls/${prNumber}/comments`);
  const existingKeys = new Set(
    existing.map((c) => `${c.path}:${c.line}:${normalizeText(c.body || "")}`)
  );

  const queued = [];
  const queuedKeys = new Set();

  for (const finding of normalized) {
    const body = buildInlineBody(finding);
    const key = `${finding.path}:${finding.line}:${normalizeText(body)}`;
    if (existingKeys.has(key) || queuedKeys.has(key)) continue;

    queued.push({
      path: finding.path,
      line: finding.line,
      side: finding.side,
      body,
    });
    queuedKeys.add(key);
  }

  let published = 0;

  if (queued.length) {
    try {
      await ghRequest("POST", `/repos/${owner}/${repo}/pulls/${prNumber}/reviews`, {
        commit_id: pr.head.sha,
        event: "COMMENT",
        body: `Claude automated review (${model})`,
        comments: queued,
      });
      published = queued.length;
    } catch (error) {
      console.log(`Batch publish failed: ${error.message}`);
      for (const c of queued) {
        try {
          await ghRequest("POST", `/repos/${owner}/${repo}/pulls/${prNumber}/comments`, {
            commit_id: pr.head.sha,
            ...c,
          });
          published += 1;
        } catch (singleError) {
          console.log(`Failed to publish ${c.path}:${c.line} - ${singleError.message}`);
        }
      }
    }
  }

  const {counts, keyFindings} = summarizeFindings(normalized);
  const body = buildSummaryBody({
    analyzedFiles: targets.length,
    totalFindings: normalized.length,
    publishedComments: published,
    counts,
    keyFindings,
    note,
  });
  await upsertSummaryComment(prNumber, body);

  console.log(`Done. analyzed=${targets.length}, published=${published}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
