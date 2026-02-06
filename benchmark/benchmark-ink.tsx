import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { render, Box, Text, useApp } from "ink";
import { prepareTextStream } from "./data-provider";
import { FrameMeter, MemoryProfiler, StdoutMeter } from "./frame-meter";

const isBenchmark = process.env.BENCHMARK_MODE === "true";

// Pre-load text BEFORE any measurement
const { lines, stream: createTextStream } = prepareTextStream();
const TARGET_LINES = parseInt(
  process.env.BENCHMARK_TARGET || String(lines.length),
  10,
);

const stdoutMeter = new StdoutMeter();
stdoutMeter.start();

const App: React.FC = () => {
  const { exit } = useApp();
  const [textLines, setTextLines] = useState<string[]>([]);
  const linesMap = useRef<Map<number, string>>(new Map());
  const frameMeterRef = useRef<FrameMeter>(new FrameMeter());
  const memoryProfilerRef = useRef<MemoryProfiler>(new MemoryProfiler());
  const startTimeRef = useRef<number>(0);
  const renderStartRef = useRef<bigint>(BigInt(0));

  useLayoutEffect(() => {
    if (!isBenchmark) {
      console.clear();
    }
  }, []);

  // Measure render time
  useLayoutEffect(() => {
    if (renderStartRef.current !== BigInt(0)) {
      const renderEnd = process.hrtime.bigint();
      const frameTimeMs =
        Number(renderEnd - renderStartRef.current) / 1_000_000;
      frameMeterRef.current.recordFrameSync(frameTimeMs);
    }
  }, [textLines]);

  useEffect(() => {
    memoryProfilerRef.current.start(100);
    startTimeRef.current = Date.now();

    const processTokens = async () => {
      let processedLines = 0;

      // Stream text word by word like an LLM
      for await (const token of createTextStream()) {
        if (processedLines >= TARGET_LINES) break;

        // Update line content as words stream in
        linesMap.current.set(token.lineIndex, token.accumulated);

        if (token.isComplete) {
          processedLines++;
        }

        // Update React every 50 lines for smooth streaming
        if (processedLines % 50 === 0 && token.isComplete) {
          renderStartRef.current = process.hrtime.bigint();
          setTextLines(Array.from(linesMap.current.values()));
          await new Promise((resolve) => setImmediate(resolve));
        }
      }

      // Final update
      renderStartRef.current = process.hrtime.bigint();
      setTextLines(Array.from(linesMap.current.values()));

      // Done streaming
      setTimeout(() => {
        const elapsed = Date.now() - startTimeRef.current;

        memoryProfilerRef.current.stop();
        stdoutMeter.stop();

        const frameMetrics = frameMeterRef.current.getMetrics();
        const memoryMetrics = memoryProfilerRef.current.getMetrics();
        const stdoutMetrics = stdoutMeter.getMetrics();

        if (isBenchmark) {
          const result = JSON.stringify({
            renderer: "Ink",
            totalLines: processedLines,
            totalTimeMs: elapsed,
            frame: frameMetrics,
            memory: memoryMetrics,
            stdout: stdoutMetrics,
          });
          console.log(`\nBENCHMARK_RESULT:${result}\n`);
        } else {
          console.log("\n" + "=".repeat(50));
          console.log("Ink Benchmark Complete");
          console.log("=".repeat(50));
          console.log(`Total Lines: ${processedLines}`);
          console.log(`Total Time: ${elapsed}ms`);
          console.log(`\nFrame Metrics:`);
          console.log(`  Total Frames: ${frameMetrics.totalFrames}`);
          console.log(
            `  Avg Frame Time: ${frameMetrics.avgFrameTimeMs.toFixed(2)}ms`,
          );
          console.log(
            `  P95: ${frameMetrics.p95FrameTimeMs.toFixed(2)}ms | P99: ${frameMetrics.p99FrameTimeMs.toFixed(2)}ms`,
          );
          console.log(`  Throughput: ${frameMetrics.throughputFps} fps`);
          console.log(`\nMemory:`);
          console.log(
            `  Heap: ${memoryMetrics.heapUsedMB}MB / ${memoryMetrics.heapTotalMB}MB`,
          );
          console.log(`  Peak Heap: ${memoryMetrics.peakHeapUsedMB}MB`);
          console.log(
            `  RSS: ${memoryMetrics.rssMB}MB | Peak: ${memoryMetrics.peakRssMB}MB`,
          );
          console.log(`\nStdout:`);
          console.log(`  Writes: ${stdoutMetrics.totalWrites}`);
          console.log(
            `  Bytes: ${(stdoutMetrics.totalBytes / 1024).toFixed(1)}KB`,
          );
        }

        exit();
      }, 100);
    };

    processTokens();
  }, [exit]);

  return (
    <Box flexDirection="column">
      <Box borderStyle="round" borderColor="cyan" paddingX={1} marginBottom={1}>
        <Text color="cyan" bold>
          INK
        </Text>
        <Text> | Streaming text ({TARGET_LINES} lines)...</Text>
      </Box>
      {textLines.map((line, index) => (
        <Text key={index}>{line}</Text>
      ))}
    </Box>
  );
};

render(<App />, { patchConsole: false });
