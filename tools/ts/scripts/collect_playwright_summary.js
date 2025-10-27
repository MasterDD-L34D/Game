import fs from "node:fs";
import path from "node:path";

const reportPath = process.argv[2];

if (!reportPath) {
  console.error("Usage: node collect_playwright_summary.js <report.json>");
  process.exit(1);
}

const resolvedPath = path.resolve(reportPath);
if (!fs.existsSync(resolvedPath)) {
  process.exit(0);
}

const raw = fs.readFileSync(resolvedPath, "utf8");
if (!raw.trim()) {
  process.exit(0);
}

let data;
try {
  data = JSON.parse(raw);
} catch (error) {
  console.error(`Impossibile analizzare il report Playwright (${error.message})`);
  process.exit(1);
}

const tests = [];

const walkSuite = (suite, parents = []) => {
  if (!suite) return;
  const titles = suite.title ? [...parents, suite.title] : parents;
  if (Array.isArray(suite.tests)) {
    for (const testInfo of suite.tests) {
      tests.push({
        title: testInfo.title,
        outcome: testInfo.outcome,
        fullTitle: [...titles, testInfo.title].filter(Boolean).join(" › "),
      });
    }
  }
  if (Array.isArray(suite.suites)) {
    for (const child of suite.suites) {
      walkSuite(child, titles);
    }
  }
};

if (Array.isArray(data.suites)) {
  for (const suite of data.suites) {
    walkSuite(suite);
  }
}

if (!tests.length) {
  console.log("- Playwright · nessun test eseguito.");
  process.exit(0);
}

const outcomeCounts = tests.reduce(
  (acc, testInfo) => {
    acc.total += 1;
    acc[testInfo.outcome] = (acc[testInfo.outcome] || 0) + 1;
    return acc;
  },
  { total: 0 }
);

const passed = outcomeCounts.expected || 0;
const failed = outcomeCounts.unexpected || 0;
const skipped = outcomeCounts.skipped || 0;
const flaky = outcomeCounts.flaky || 0;

const summaryParts = [`- Playwright · ${outcomeCounts.total} test totali`];
summaryParts.push(`${passed} passati`);
summaryParts.push(`${failed} falliti`);
if (skipped) summaryParts.push(`${skipped} skipped`);
if (flaky) summaryParts.push(`${flaky} flaky`);

console.log(summaryParts.join(", ") + ".");

for (const testInfo of tests) {
  let icon = "✅";
  if (testInfo.outcome === "unexpected") icon = "❌";
  else if (testInfo.outcome === "skipped" || testInfo.outcome === "flaky") icon = "⚠️";
  console.log(`  - ${icon} ${testInfo.fullTitle}`);
}
