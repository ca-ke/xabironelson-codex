#!/usr/bin/env bun
import { spawn } from "child_process";
import os from "os";

// Benchmark Configuration
const BENCHMARK_CONFIGS = [
  { target: 100, label: "Small (100 lines)" },
  { target: 500, label: "Medium (500 lines)" },
  { target: 1000, label: "Large (1000 lines)" },
  { target: 2900, label: "Full text (2900 lines)" },
];

const ITERATIONS = 10;
const WARMUP_RUNS = 2;

interface BenchmarkResult {
  renderer: string;
  totalLines: number;
  totalTimeMs: number;
  frame: {
    avgFrameTimeMs: number;
    minFrameTimeMs: number;
    maxFrameTimeMs: number;
    p95FrameTimeMs: number;
    p99FrameTimeMs: number;
    throughputFps: number;
    droppedFrames: number;
    totalFrames: number;
    backpressureEvents: number;
    rawFrameTimes: number[];
  };
  memory: {
    heapUsedMB: number;
    heapTotalMB: number;
    externalMB: number;
    rssMB: number;
    peakHeapUsedMB: number;
    peakRssMB: number;
  };
  stdout: {
    totalWrites: number;
    totalBytes: number;
    avgWriteTimeMs: number;
    maxWriteTimeMs: number;
    p95WriteTimeMs: number;
    p99WriteTimeMs: number;
    backpressureEvents: number;
  };
}

interface AggregatedResult {
  renderer: string;
  totalLines: number;
  runs: number;
  // Time stats
  avgTimeMs: number;
  stdDevTimeMs: number;
  minTimeMs: number;
  maxTimeMs: number;
  ci95TimeMs: [number, number]; // 95% confidence interval
  // Frame stats (the CORE metric for 60fps)
  avgFrameTimeMs: number;
  stdDevFrameTimeMs: number;
  p95FrameTimeMs: number;
  p99FrameTimeMs: number;
  avgFps: number;
  target60FpsAchieved: boolean; // frame time <= 16.67ms
  droppedFrames: number;
  // Memory
  avgPeakHeapMB: number;
  stdDevPeakHeapMB: number;
  avgPeakRssMB: number;
  stdDevPeakRssMB: number;
  // Stdout
  avgWrites: number;
  avgBytes: number;
}

interface ComparisonResult {
  target: number;
  label: string;
  opentui: AggregatedResult | null;
  ink: AggregatedResult | null;
  rawOpentui: BenchmarkResult[];
  rawInk: BenchmarkResult[];
}

// Statistical functions
function avg(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = avg(arr);
  const squareDiffs = arr.map((x) => Math.pow(x - mean, 2));
  return Math.sqrt(
    squareDiffs.reduce((a, b) => a + b, 0) / (arr.length - 1),
  );
}

function tCritical95(df: number): number {
  // Inverse t-distribution for 95% CI (two-tailed, alpha=0.025 each tail)
  // Binary search for t where tDistCDF(t, df) = 0.975
  let lo = 0, hi = 20;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (tDistCDF(mid, df) < 0.975) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function confidenceInterval95(arr: number[]): [number, number] {
  if (arr.length < 2) return [avg(arr), avg(arr)];
  const mean = avg(arr);
  const se = stdDev(arr) / Math.sqrt(arr.length);
  const df = arr.length - 1;
  const t = tCritical95(df);
  return [mean - t * se, mean + t * se];
}

// Cohen's d effect size - measures practical significance
function cohensD(
  a: number[],
  b: number[],
): { d: number; interpretation: string } {
  const m1 = avg(a),
    m2 = avg(b);
  const s1 = stdDev(a),
    s2 = stdDev(b);
  const n1 = a.length,
    n2 = b.length;

  // Pooled standard deviation
  const pooledS = Math.sqrt(
    ((n1 - 1) * s1 * s1 + (n2 - 1) * s2 * s2) / (n1 + n2 - 2),
  );
  if (pooledS === 0) return { d: 0, interpretation: "negligible" };

  const d = Math.abs(m1 - m2) / pooledS;

  // Interpretation thresholds (Cohen, 1988)
  let interpretation: string;
  if (d < 0.2) interpretation = "negligible";
  else if (d < 0.5) interpretation = "small";
  else if (d < 0.8) interpretation = "medium";
  else interpretation = "large";

  return { d: Math.round(d * 100) / 100, interpretation };
}

// Welch's t-test for unequal variances
function welchTTest(
  a: number[],
  b: number[],
): {
  t: number;
  p: number;
  significant: boolean;
  effectSize: { d: number; interpretation: string };
} {
  const n1 = a.length,
    n2 = b.length;
  const m1 = avg(a),
    m2 = avg(b);
  const v1 = Math.pow(stdDev(a), 2),
    v2 = Math.pow(stdDev(b), 2);

  const se = Math.sqrt(v1 / n1 + v2 / n2);
  const effectSize = cohensD(a, b);
  if (se === 0) return { t: 0, p: 1, significant: false, effectSize };

  const t = (m1 - m2) / se;

  // Welch-Satterthwaite degrees of freedom
  const df =
    Math.pow(v1 / n1 + v2 / n2, 2) /
    (Math.pow(v1 / n1, 2) / (n1 - 1) + Math.pow(v2 / n2, 2) / (n2 - 1));

  // p-value from t-distribution CDF (exact for any df)
  const p = 2 * (1 - tDistCDF(Math.abs(t), df));

  return { t, p, significant: p < 0.05, effectSize };
}

// Regularized incomplete beta function via continued fraction (Lentz's method)
function betaIncomplete(x: number, a: number, b: number): number {
  if (x === 0 || x === 1) return x;

  const lnBeta =
    lgamma(a) + lgamma(b) - lgamma(a + b);
  const front =
    Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta) / a;

  // Lentz's continued fraction
  let f = 1, c = 1, d = 0;
  for (let i = 0; i <= 200; i++) {
    const m = Math.floor(i / 2);
    let numerator: number;
    if (i === 0) {
      numerator = 1;
    } else if (i % 2 === 0) {
      numerator = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m));
    } else {
      numerator =
        -((a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));
    }
    d = 1 + numerator * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1 / d;
    c = 1 + numerator / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    f *= c * d;
    if (Math.abs(c * d - 1) < 1e-10) break;
  }

  return front * (f - 1);
}

// Log-gamma via Lanczos approximation
function lgamma(x: number): number {
  const g = 7;
  const coef = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) {
    return (
      Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x)
    );
  }
  x -= 1;
  let a = coef[0];
  for (let i = 1; i < g + 2; i++) {
    a += coef[i] / (x + i);
  }
  const t = x + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

// Student's t-distribution CDF
function tDistCDF(t: number, df: number): number {
  const x = df / (df + t * t);
  const iBeta = betaIncomplete(x, df / 2, 0.5);
  return 1 - 0.5 * iBeta;
}

function getSystemInfo() {
  const cpus = os.cpus();
  return {
    platform: `${os.type()} ${os.release()}`,
    arch: os.arch(),
    cpuModel: cpus[0]?.model || "Unknown",
    cpuCores: cpus.length,
    totalMemoryGB: Math.round((os.totalmem() / 1024 ** 3) * 10) / 10,
    freeMemoryGB: Math.round((os.freemem() / 1024 ** 3) * 10) / 10,
    bunVersion: process.versions.bun || "N/A",
  };
}

async function runBenchmark(
  script: string,
  target: number,
): Promise<BenchmarkResult | null> {
  return new Promise((resolve) => {
    const proc = spawn("bun", ["run", script], {
      env: {
        ...process.env,
        BENCHMARK_MODE: "true",
        BENCHMARK_TARGET: String(target),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    const timeout = setTimeout(() => {
      proc.kill();
      resolve(null);
    }, 60000); // 60s timeout

    proc.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        console.error(`  Error: ${stderr.slice(0, 200)}`);
        resolve(null);
        return;
      }

      const match = stdout.match(/BENCHMARK_RESULT:({.*})/);
      if (match) {
        try {
          resolve(JSON.parse(match[1]) as BenchmarkResult);
        } catch {
          resolve(null);
        }
      } else {
        resolve(null);
      }
    });

    proc.on("error", () => {
      clearTimeout(timeout);
      resolve(null);
    });
  });
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function aggregateResults(results: BenchmarkResult[]): AggregatedResult | null {
  if (results.length === 0) return null;

  const times = results.map((r) => r.totalTimeMs);
  const frameTimes = results.map((r) => r.frame.avgFrameTimeMs);
  const fps = results.map((r) => r.frame.throughputFps);
  const dropped = results.map((r) => r.frame.droppedFrames);
  const heaps = results.map((r) => r.memory.peakHeapUsedMB);
  const rssList = results.map((r) => r.memory.peakRssMB);
  const writes = results.map((r) => r.stdout.totalWrites);
  const bytes = results.map((r) => r.stdout.totalBytes);

  const avgFrameTime = avg(frameTimes);

  // Compute true P95/P99 from combined raw frame times across all runs
  const allRawFrameTimes = results.flatMap((r) => r.frame.rawFrameTimes);
  const combinedP95 = Math.round(percentile(allRawFrameTimes, 95) * 100) / 100;
  const combinedP99 = Math.round(percentile(allRawFrameTimes, 99) * 100) / 100;

  return {
    renderer: results[0].renderer,
    totalLines: results[0].totalLines,
    runs: results.length,
    // Time
    avgTimeMs: Math.round(avg(times)),
    stdDevTimeMs: Math.round(stdDev(times)),
    minTimeMs: Math.min(...times),
    maxTimeMs: Math.max(...times),
    ci95TimeMs: confidenceInterval95(times).map((x) => Math.round(x)) as [
      number,
      number,
    ],
    // Frame (CORE METRIC) — P95/P99 from combined distribution
    avgFrameTimeMs: Math.round(avgFrameTime * 100) / 100,
    stdDevFrameTimeMs: Math.round(stdDev(frameTimes) * 100) / 100,
    p95FrameTimeMs: combinedP95,
    p99FrameTimeMs: combinedP99,
    avgFps: Math.round(avg(fps)),
    target60FpsAchieved: combinedP99 <= 16.67,
    droppedFrames: Math.round(avg(dropped)),
    // Memory
    avgPeakHeapMB: Math.round(avg(heaps) * 10) / 10,
    stdDevPeakHeapMB: Math.round(stdDev(heaps) * 10) / 10,
    avgPeakRssMB: Math.round(avg(rssList) * 10) / 10,
    stdDevPeakRssMB: Math.round(stdDev(rssList) * 10) / 10,
    // Stdout
    avgWrites: Math.round(avg(writes)),
    avgBytes: Math.round(avg(bytes)),
  };
}

async function runBenchmarkWithIterations(
  script: string,
  target: number,
  name: string,
): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];

  // Warmup
  for (let i = 0; i < WARMUP_RUNS; i++) {
    process.stdout.write(`    [${name}] Warmup ${i + 1}/${WARMUP_RUNS}...`);
    await runBenchmark(script, target);
    process.stdout.write(" done\n");
  }

  // Actual runs
  for (let i = 0; i < ITERATIONS; i++) {
    process.stdout.write(`    [${name}] Run ${i + 1}/${ITERATIONS}...`);
    const result = await runBenchmark(script, target);
    if (result) {
      results.push(result);
      process.stdout.write(
        ` ${result.totalTimeMs}ms (${result.frame.avgFrameTimeMs.toFixed(1)}ms/frame)\n`,
      );
    } else {
      process.stdout.write(" FAILED\n");
    }
  }

  return results;
}

function printHeader(sysInfo: ReturnType<typeof getSystemInfo>) {
  const line = "═".repeat(90);
  console.log(`\n${line}`);
  console.log("  OPENTUI vs INK BENCHMARK - Statistical Analysis");
  console.log(line);
  console.log(`  Platform:     ${sysInfo.platform} | ${sysInfo.arch}`);
  console.log(
    `  CPU:          ${sysInfo.cpuModel} (${sysInfo.cpuCores} cores)`,
  );
  console.log(`  Memory:       ${sysInfo.totalMemoryGB} GB`);
  console.log(`  Runtime:      Bun ${sysInfo.bunVersion}`);
  console.log(
    `  Samples:      ${ITERATIONS} iterations | ${WARMUP_RUNS} warmup`,
  );
  console.log(line);
}

function printFrameMetricsTable(results: ComparisonResult[]) {
  console.log(
    "\n  ┌─ FRAME TIMING (Core 60fps Metric) ──────────────────────────────────────────────┐",
  );
  console.log(
    "  │ Dataset      │ Framework │ Avg (ms) │ StdDev │  P95   │  P99   │  FPS  │ 60fps? │",
  );
  console.log(
    "  ├──────────────┼───────────┼──────────┼────────┼────────┼────────┼───────┼────────┤",
  );

  for (const r of results) {
    if (r.opentui) {
      const fps60 = r.opentui.target60FpsAchieved ? "  YES " : "  NO  ";
      console.log(
        `  │ ${r.label.padEnd(12)} │ OpenTUI   │ ${String(r.opentui.avgFrameTimeMs).padStart(8)} │ ${String(r.opentui.stdDevFrameTimeMs).padStart(6)} │ ${String(r.opentui.p95FrameTimeMs).padStart(6)} │ ${String(r.opentui.p99FrameTimeMs).padStart(6)} │ ${String(r.opentui.avgFps).padStart(5)} │${fps60}│`,
      );
    }
    if (r.ink) {
      const fps60 = r.ink.target60FpsAchieved ? "  YES " : "  NO  ";
      console.log(
        `  │ ${" ".repeat(12)} │ Ink       │ ${String(r.ink.avgFrameTimeMs).padStart(8)} │ ${String(r.ink.stdDevFrameTimeMs).padStart(6)} │ ${String(r.ink.p95FrameTimeMs).padStart(6)} │ ${String(r.ink.p99FrameTimeMs).padStart(6)} │ ${String(r.ink.avgFps).padStart(5)} │${fps60}│`,
      );
    }
    console.log(
      "  ├──────────────┼───────────┼──────────┼────────┼────────┼────────┼───────┼────────┤",
    );
  }
  console.log(
    "  └──────────────┴───────────┴──────────┴────────┴────────┴────────┴───────┴────────┘",
  );
  console.log("  * Target: 16.67ms per frame = 60fps");
}

function printTimeTable(results: ComparisonResult[]) {
  console.log(
    "\n  ┌─ TOTAL TIME (with 95% Confidence Interval) ─────────────────────────────────────┐",
  );
  console.log(
    "  │ Dataset      │ Framework │  Avg (ms) │ StdDev │     95% CI      │   p-value    │",
  );
  console.log(
    "  ├──────────────┼───────────┼───────────┼────────┼─────────────────┼──────────────┤",
  );

  for (const r of results) {
    const tTest =
      r.rawOpentui.length > 1 && r.rawInk.length > 1
        ? welchTTest(
            r.rawOpentui.map((x) => x.totalTimeMs),
            r.rawInk.map((x) => x.totalTimeMs),
          )
        : null;

    if (r.opentui) {
      const ci = `[${r.opentui.ci95TimeMs[0]}, ${r.opentui.ci95TimeMs[1]}]`;
      const pVal = tTest
        ? tTest.significant
          ? `${tTest.p.toFixed(4)} *`
          : tTest.p.toFixed(4)
        : "-";
      console.log(
        `  │ ${r.label.padEnd(12)} │ OpenTUI   │ ${String(r.opentui.avgTimeMs).padStart(9)} │ ${String(r.opentui.stdDevTimeMs).padStart(6)} │ ${ci.padStart(15)} │ ${pVal.padStart(12)} │`,
      );
    }
    if (r.ink) {
      const ci = `[${r.ink.ci95TimeMs[0]}, ${r.ink.ci95TimeMs[1]}]`;
      console.log(
        `  │ ${" ".repeat(12)} │ Ink       │ ${String(r.ink.avgTimeMs).padStart(9)} │ ${String(r.ink.stdDevTimeMs).padStart(6)} │ ${ci.padStart(15)} │              │`,
      );
    }
    console.log(
      "  ├──────────────┼───────────┼───────────┼────────┼─────────────────┼──────────────┤",
    );
  }
  console.log(
    "  └──────────────┴───────────┴───────────┴────────┴─────────────────┴──────────────┘",
  );
  console.log("  * p < 0.05 indicates statistically significant difference");
}

function printMemoryTable(results: ComparisonResult[]) {
  console.log(
    "\n  ┌─ PEAK MEMORY (Heap & RSS) ──────────────────────────────────────────────────────────────┐",
  );
  console.log(
    "  │ Dataset      │ Framework │ Heap (MB) │ StdDev │ RSS (MB) │ StdDev │   Heap Ratio   │",
  );
  console.log(
    "  ├──────────────┼───────────┼───────────┼────────┼──────────┼────────┼────────────────┤",
  );

  for (const r of results) {
    const ratio =
      r.opentui && r.ink
        ? (r.ink.avgPeakHeapMB / r.opentui.avgPeakHeapMB).toFixed(2) + "x"
        : "-";

    if (r.opentui) {
      console.log(
        `  │ ${r.label.padEnd(12)} │ OpenTUI   │ ${String(r.opentui.avgPeakHeapMB).padStart(9)} │ ${String(r.opentui.stdDevPeakHeapMB).padStart(6)} │ ${String(r.opentui.avgPeakRssMB).padStart(8)} │ ${String(r.opentui.stdDevPeakRssMB).padStart(6)} │ ${ratio.padStart(14)} │`,
      );
    }
    if (r.ink) {
      console.log(
        `  │ ${" ".repeat(12)} │ Ink       │ ${String(r.ink.avgPeakHeapMB).padStart(9)} │ ${String(r.ink.stdDevPeakHeapMB).padStart(6)} │ ${String(r.ink.avgPeakRssMB).padStart(8)} │ ${String(r.ink.stdDevPeakRssMB).padStart(6)} │                │`,
      );
    }
    console.log(
      "  ├──────────────┼───────────┼───────────┼────────┼──────────┼────────┼────────────────┤",
    );
  }
  console.log(
    "  └──────────────┴───────────┴───────────┴────────┴──────────┴────────┴────────────────┘",
  );
}

function printSummary(results: ComparisonResult[]) {
  const line = "═".repeat(90);
  console.log(`\n${line}`);
  console.log("  STATISTICAL SUMMARY");
  console.log(line);

  let significantResults = 0;
  let opentuiFaster = 0;
  let inkFaster = 0;

  for (const r of results) {
    if (r.rawOpentui.length > 1 && r.rawInk.length > 1) {
      const tTest = welchTTest(
        r.rawOpentui.map((x) => x.totalTimeMs),
        r.rawInk.map((x) => x.totalTimeMs),
      );

      console.log(`\n  ${r.label}:`);
      console.log(
        `    OpenTUI: ${r.opentui?.avgTimeMs}ms ± ${r.opentui?.stdDevTimeMs}ms`,
      );
      console.log(
        `    Ink:     ${r.ink?.avgTimeMs}ms ± ${r.ink?.stdDevTimeMs}ms`,
      );

      const { effectSize } = tTest;
      const effectStr = `d=${effectSize.d} (${effectSize.interpretation})`;

      if (tTest.significant && effectSize.interpretation !== "negligible") {
        significantResults++;
        const faster =
          (r.opentui?.avgTimeMs ?? 0) < (r.ink?.avgTimeMs ?? 0)
            ? "OpenTUI"
            : "Ink";
        const ratio =
          faster === "OpenTUI"
            ? ((r.ink?.avgTimeMs ?? 0) / (r.opentui?.avgTimeMs ?? 1)).toFixed(2)
            : ((r.opentui?.avgTimeMs ?? 0) / (r.ink?.avgTimeMs ?? 1)).toFixed(
                2,
              );
        console.log(`    Result:  ${faster} is ${ratio}x faster`);
        console.log(
          `    Stats:   p=${tTest.p.toFixed(4)} (significant), ${effectStr}`,
        );
        if (faster === "OpenTUI") opentuiFaster++;
        else inkFaster++;
      } else if (
        tTest.significant &&
        effectSize.interpretation === "negligible"
      ) {
        console.log(
          `    Result:  Statistically significant but PRACTICALLY IRRELEVANT`,
        );
        console.log(
          `    Stats:   p=${tTest.p.toFixed(4)}, but ${effectStr} - difference too small to matter`,
        );
      } else {
        console.log(`    Result:  No statistically significant difference`);
        console.log(`    Stats:   p=${tTest.p.toFixed(4)}, ${effectStr}`);
      }

      // Frame metric analysis
      if (r.opentui && r.ink) {
        console.log(
          `    Frames:  OpenTUI ${r.opentui.avgFrameTimeMs}ms/frame (${r.opentui.target60FpsAchieved ? "60fps OK" : "60fps FAIL"})`,
        );
        console.log(
          `             Ink ${r.ink.avgFrameTimeMs}ms/frame (${r.ink.target60FpsAchieved ? "60fps OK" : "60fps FAIL"})`,
        );
      }
    }
  }

  console.log(`\n  ─────────────────────────────────────────`);
  console.log(
    `  Statistically significant results: ${significantResults}/${results.length}`,
  );
  console.log(`  OpenTUI faster (significant): ${opentuiFaster}`);
  console.log(`  Ink faster (significant):     ${inkFaster}`);
  console.log(
    `  No significant difference:    ${results.length - significantResults}`,
  );
  console.log(`\n${line}\n`);
}

async function main() {
  const sysInfo = getSystemInfo();
  printHeader(sysInfo);

  const results: ComparisonResult[] = [];

  for (const config of BENCHMARK_CONFIGS) {
    console.log(`\n  Running benchmark: ${config.label}`);
    console.log("  " + "─".repeat(60));

    // Randomize execution order per config to avoid ordering bias
    const runners = [
      { script: "benchmark/benchmark-opentui.ts", name: "OpenTUI" as const },
      { script: "benchmark/benchmark-ink.tsx", name: "Ink" as const },
    ];
    if (Math.random() > 0.5) runners.reverse();
    console.log(`    Execution order: ${runners.map((r) => r.name).join(" → ")}`);

    const rawResults: Record<string, BenchmarkResult[]> = {};
    for (const runner of runners) {
      rawResults[runner.name] = await runBenchmarkWithIterations(
        runner.script,
        config.target,
        runner.name,
      );
    }

    results.push({
      target: config.target,
      label: config.label,
      opentui: aggregateResults(rawResults["OpenTUI"]),
      ink: aggregateResults(rawResults["Ink"]),
      rawOpentui: rawResults["OpenTUI"],
      rawInk: rawResults["Ink"],
    });
  }

  // Clear and print results
  process.stdout.write("\x1b[2J\x1b[H");
  printHeader(sysInfo);
  printFrameMetricsTable(results); // Core 60fps metric FIRST
  printTimeTable(results);
  printMemoryTable(results);
  printSummary(results);
}

main().catch(console.error);
