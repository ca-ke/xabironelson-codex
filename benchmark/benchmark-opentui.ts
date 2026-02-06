import {
  BoxRenderable,
  createCliRenderer,
  TextRenderable,
} from "@opentui/core";
import { prepareTextStream } from "./data-provider";
import { FrameMeter, MemoryProfiler, StdoutMeter } from "./frame-meter";

const isBenchmark = process.env.BENCHMARK_MODE === "true";

// Pre-load text BEFORE any measurement
const { lines, stream: createTextStream } = prepareTextStream();
const TARGET_LINES = parseInt(
  process.env.BENCHMARK_TARGET || String(lines.length),
  10,
);

// Start stdout meter
const stdoutMeter = new StdoutMeter();
stdoutMeter.start();

if (!isBenchmark) process.stdout.write("\x1b[2J\x1b[H");

const renderer = await createCliRenderer({
  exitOnCtrlC: true,
  targetFps: 60,
  gatherStats: true,
});

const root = renderer.root;

const headerText = new TextRenderable(renderer, {
  content: `Streaming text (${TARGET_LINES} lines)...`,
});

const headerBox = new BoxRenderable(renderer, {
  borderColor: "cyan",
  marginBottom: 1,
  paddingX: 1,
});
headerBox.add(headerText);

const textContainer = new BoxRenderable(renderer, {
  flexDirection: "column",
});

root.add(headerBox);
root.add(textContainer);

// Streaming text lines (growing as words arrive)
const textLines: TextRenderable[] = [];

async function run() {
  const frameMeter = new FrameMeter();
  const memoryProfiler = new MemoryProfiler();

  memoryProfiler.start(100);

  const startTime = Date.now();

  // Stream text word by word like an LLM
  let currentLine: TextRenderable | null = null;
  let processedLines = 0;

  for await (const token of createTextStream()) {
    if (processedLines >= TARGET_LINES) break;

    // Create new line when we see a new lineIndex
    if (!textLines[token.lineIndex]) {
      currentLine = new TextRenderable(renderer, {
        content: "",
      });
      textLines[token.lineIndex] = currentLine;
      textContainer.add(currentLine);
    } else {
      currentLine = textLines[token.lineIndex];
    }

    // Update line content as words stream in
    currentLine.content = token.accumulated;

    if (token.isComplete) {
      processedLines++;
    }

    // Yield occasionally for smooth rendering
    if (processedLines % 50 === 0 && token.isComplete) {
      await new Promise((resolve) => setImmediate(resolve));
    }
  }

  // Wait for final render
  await new Promise((resolve) => setTimeout(resolve, 100));

  const elapsed = Date.now() - startTime;

  // Collect frame times from the renderer's built-in stats
  const rendererStats = renderer.getStats();
  for (const ft of rendererStats.frameTimes) {
    frameMeter.recordFrameSync(ft);
  }

  memoryProfiler.stop();
  stdoutMeter.stop();
  renderer.destroy();

  const frameMetrics = frameMeter.getMetrics();
  const memoryMetrics = memoryProfiler.getMetrics();
  const stdoutMetrics = stdoutMeter.getMetrics();

  if (isBenchmark) {
    const result = JSON.stringify({
      renderer: "OpenTUI",
      totalLines: processedLines,
      totalTimeMs: elapsed,
      frame: frameMetrics,
      memory: memoryMetrics,
      stdout: stdoutMetrics,
    });
    process.stdout.write(`\nBENCHMARK_RESULT:${result}\n`);
  } else {
    process.stdout.write("\n" + "=".repeat(50) + "\n");
    process.stdout.write("OpenTUI Benchmark Complete\n");
    process.stdout.write("=".repeat(50) + "\n");
    process.stdout.write(`Total Lines: ${processedLines}\n`);
    process.stdout.write(`Total Time: ${elapsed}ms\n`);
    process.stdout.write(`\nFrame Metrics:\n`);
    process.stdout.write(`  Total Frames: ${frameMetrics.totalFrames}\n`);
    process.stdout.write(
      `  Avg Frame Time: ${frameMetrics.avgFrameTimeMs.toFixed(2)}ms\n`,
    );
    process.stdout.write(
      `  P95: ${frameMetrics.p95FrameTimeMs.toFixed(2)}ms | P99: ${frameMetrics.p99FrameTimeMs.toFixed(2)}ms\n`,
    );
    process.stdout.write(`  Throughput: ${frameMetrics.throughputFps} fps\n`);
    process.stdout.write(`\nMemory:\n`);
    process.stdout.write(
      `  Heap: ${memoryMetrics.heapUsedMB}MB / ${memoryMetrics.heapTotalMB}MB\n`,
    );
    process.stdout.write(`  Peak Heap: ${memoryMetrics.peakHeapUsedMB}MB\n`);
    process.stdout.write(
      `  RSS: ${memoryMetrics.rssMB}MB | Peak: ${memoryMetrics.peakRssMB}MB\n`,
    );
    process.stdout.write(`\nStdout:\n`);
    process.stdout.write(`  Writes: ${stdoutMetrics.totalWrites}\n`);
    process.stdout.write(
      `  Bytes: ${(stdoutMetrics.totalBytes / 1024).toFixed(1)}KB\n`,
    );
  }

  process.exit(0);
}

renderer.start();
run();
