import { textSummary } from "https://jslib.k6.io/k6-summary/0.1.0/index.js";
import { readString } from "./env.js";

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function buildSummary(domain) {
  return function handleSummary(data) {
    const baseDir = readString("RESULT_DIR", `perf/k6/${domain}/result`);
    const prefix = readString("RESULT_PREFIX", domain);
    const timestamp = nowStamp();
    const raw = JSON.stringify(data, null, 2);

    return {
      stdout: textSummary(data, {
        indent: " ",
        enableColors: true,
      }),
      [`${baseDir}/latest.json`]: raw,
      [`${baseDir}/${prefix}-${timestamp}.json`]: raw,
    };
  };
}
