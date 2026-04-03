import {
  MODE,
  readNumber,
  readString,
  scopedKey,
  scopedNumber,
  scopedString,
} from "./env.js";

function parseStages(raw, fallback) {
  const source = (raw || "").trim();
  if (!source) return fallback;

  const parts = source
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (parts.length === 0) return fallback;

  const stages = parts
    .map((part) => {
      const [targetRaw, durationRaw] = part.split(":").map((item) => item.trim());
      const target = Number(targetRaw);
      const duration = durationRaw || "";
      if (!Number.isFinite(target) || !duration) return null;
      return { target, duration };
    })
    .filter((item) => item !== null);

  return stages.length > 0 ? stages : fallback;
}

function resolveScenario(domain, profile = {}) {
  const smokeProfile = profile.smoke || {};
  const loadProfile = profile.load || {};
  const stressProfile = profile.stress || {};

  const smokeScenario = {
    executor: "shared-iterations",
    vus: scopedNumber(
      domain,
      "SMOKE_VUS",
      readNumber("SMOKE_VUS", readNumber("VUS", smokeProfile.vus ?? 1)),
    ),
    iterations: scopedNumber(
      domain,
      "SMOKE_ITERATIONS",
      readNumber("SMOKE_ITERATIONS", readNumber("ITERATIONS", smokeProfile.iterations ?? 1)),
    ),
    maxDuration: scopedString(
      domain,
      "SMOKE_MAX_DURATION",
      readString("SMOKE_MAX_DURATION", readString("MAX_DURATION", smokeProfile.maxDuration ?? "2m")),
    ),
  };

  const loadScenario = {
    executor: "constant-vus",
    vus: scopedNumber(
      domain,
      "LOAD_VUS",
      readNumber("LOAD_VUS", readNumber("VUS", loadProfile.vus ?? 20)),
    ),
    duration: scopedString(
      domain,
      "LOAD_DURATION",
      readString("LOAD_DURATION", readString("DURATION", loadProfile.duration ?? "5m")),
    ),
    gracefulStop: loadProfile.gracefulStop ?? "30s",
  };

  const defaultStress =
    stressProfile.stages || [
      { target: 40, duration: "2m" },
      { target: 120, duration: "5m" },
      { target: 240, duration: "5m" },
      { target: 0, duration: "2m" },
    ];
  const scopedStagesRaw = scopedString(domain, "STRESS_STAGES", "");
  const globalStagesRaw = readString("STRESS_STAGES", "");
  const stressScenario = {
    executor: "ramping-vus",
    startVUs: stressProfile.startVUs ?? 0,
    gracefulRampDown: stressProfile.gracefulRampDown ?? "30s",
    stages: parseStages(scopedStagesRaw || globalStagesRaw, defaultStress),
  };

  if (MODE === "smoke") return smokeScenario;
  if (MODE === "load") return loadScenario;
  return stressScenario;
}

export function resolveThinkSeconds(domain, fallback = 1) {
  const scoped = readNumber(scopedKey(domain, "THINK_SECONDS"), Number.NaN);
  if (Number.isFinite(scoped)) return scoped;
  return readNumber("THINK_SECONDS", fallback);
}

export function resolveShare(domain, keySuffix, fallback) {
  const scoped = readNumber(scopedKey(domain, keySuffix), Number.NaN);
  if (Number.isFinite(scoped)) return scoped;
  return readNumber(keySuffix, fallback);
}

function scaleVus(value, scale) {
  if (!Number.isFinite(value)) return value;
  return Math.max(1, Math.round(value * scale));
}

function scaleStages(stages, scale) {
  if (!Array.isArray(stages)) return stages;
  return stages.map((stage) => {
    if (!stage || typeof stage !== "object") return stage;
    return {
      ...stage,
      target: scaleVus(Number(stage.target), scale),
    };
  });
}

function scaleScenario(definition, scale) {
  if (!definition || typeof definition !== "object") return definition;
  const scenario = { ...definition };

  if (scenario.vus !== undefined) {
    scenario.vus = scaleVus(Number(scenario.vus), scale);
  }
  if (scenario.startVUs !== undefined) {
    scenario.startVUs = scaleVus(Number(scenario.startVUs), scale);
  }
  if (scenario.stages !== undefined) {
    scenario.stages = scaleStages(scenario.stages, scale);
  }

  return scenario;
}

function scaleScenarioMap(map, scale) {
  if (!map || typeof map !== "object") return {};
  const out = {};
  for (const [name, definition] of Object.entries(map)) {
    out[name] = scaleScenario(definition, scale);
  }
  return out;
}

export function buildSegmentedModeOptions(
  domain,
  p95DefaultMs = 1000,
  scenarioByMode = {},
) {
  const p95Ms = scopedNumber(domain, "P95_MS", readNumber("P95_MS", p95DefaultMs));
  const failRate = scopedNumber(domain, "FAIL_RATE", readNumber("FAIL_RATE", 0.01));
  const testId = readString("TEST_ID", `${domain}-${MODE}`);

  const selectedByMode =
    scenarioByMode[MODE] || scenarioByMode.smoke || scenarioByMode.default || {};
  const modeScale = scopedNumber(
    domain,
    `${MODE.toUpperCase()}_SCALE`,
    readNumber(`${MODE.toUpperCase()}_SCALE`, 1),
  );
  const scenarios = scaleScenarioMap(selectedByMode, modeScale);

  return {
    scenarios,
    thresholds: {
      http_req_failed: [`rate<${failRate}`],
      http_req_duration: [`p(95)<${p95Ms}`],
    },
    tags: {
      app: "maum-on",
      domain,
      mode: MODE,
      testid: testId,
    },
  };
}

export function buildModeOptions(domain, p95DefaultMs = 1000, profile = {}) {
  const scenarioName = `${domain}_domain`;
  const p95Ms = scopedNumber(domain, "P95_MS", readNumber("P95_MS", p95DefaultMs));
  const failRate = scopedNumber(domain, "FAIL_RATE", readNumber("FAIL_RATE", 0.01));
  const testId = readString("TEST_ID", `${domain}-${MODE}`);

  return {
    scenarios: {
      [scenarioName]: resolveScenario(domain, profile),
    },
    thresholds: {
      http_req_failed: [`rate<${failRate}`],
      http_req_duration: [`p(95)<${p95Ms}`],
    },
    tags: {
      app: "maum-on",
      domain,
      mode: MODE,
      testid: testId,
    },
  };
}
