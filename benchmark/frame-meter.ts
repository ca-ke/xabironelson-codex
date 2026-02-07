export interface FrameMetrics {
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
}

export interface MemoryMetrics {
  heapUsedMB: number;
  heapTotalMB: number;
  externalMB: number;
  rssMB: number;
  peakHeapUsedMB: number;
  peakRssMB: number;
}

export interface BenchmarkMetrics {
  frame: FrameMetrics;
  memory: MemoryMetrics;
  stdout?: StdoutMetrics;
}

export class FrameMeter {
  private frameTimes: number[] = [];
  private droppedFrames = 0;
  private backpressureEvents = 0;
  private pendingFrame = false;
  private totalFrames = 0;

  async recordFrame(writeFn: () => boolean): Promise<void> {
    if (this.pendingFrame) {
      this.droppedFrames++;
      return;
    }

    this.pendingFrame = true;
    this.totalFrames++;
    const frameStart = process.hrtime.bigint();

    const flushed = writeFn();

    if (!flushed) {
      this.backpressureEvents++;
      await new Promise<void>((resolve) => {
        process.stdout.once("drain", resolve);
      });
    }

    const frameEnd = process.hrtime.bigint();
    const frameTimeMs = Number(frameEnd - frameStart) / 1_000_000;

    this.frameTimes.push(frameTimeMs);
    this.pendingFrame = false;
  }

  recordFrameSync(frameTimeMs: number): void {
    this.totalFrames++;
    this.frameTimes.push(frameTimeMs);
  }

  recordDroppedFrame(): void {
    this.droppedFrames++;
  }

  recordBackpressure(): void {
    this.backpressureEvents++;
  }

  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  getMetrics(): FrameMetrics {
    if (this.frameTimes.length === 0) {
      return {
        avgFrameTimeMs: 0,
        minFrameTimeMs: 0,
        maxFrameTimeMs: 0,
        p95FrameTimeMs: 0,
        p99FrameTimeMs: 0,
        throughputFps: 0,
        droppedFrames: this.droppedFrames,
        totalFrames: this.totalFrames,
        backpressureEvents: this.backpressureEvents,
        rawFrameTimes: [],
      };
    }

    const sum = this.frameTimes.reduce((a, b) => a + b, 0);
    const avg = sum / this.frameTimes.length;

    return {
      avgFrameTimeMs: Math.round(avg * 100) / 100,
      minFrameTimeMs: Math.round(Math.min(...this.frameTimes) * 100) / 100,
      maxFrameTimeMs: Math.round(Math.max(...this.frameTimes) * 100) / 100,
      p95FrameTimeMs:
        Math.round(this.percentile(this.frameTimes, 95) * 100) / 100,
      p99FrameTimeMs:
        Math.round(this.percentile(this.frameTimes, 99) * 100) / 100,
      throughputFps: Math.round(1000 / avg),
      droppedFrames: this.droppedFrames,
      totalFrames: this.totalFrames,
      backpressureEvents: this.backpressureEvents,
      rawFrameTimes: [...this.frameTimes],
    };
  }

  reset(): void {
    this.frameTimes = [];
    this.droppedFrames = 0;
    this.backpressureEvents = 0;
    this.pendingFrame = false;
    this.totalFrames = 0;
  }
}

export class MemoryProfiler {
  private samples: { heapUsed: number; rss: number }[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private peakHeapUsed = 0;
  private peakRss = 0;

  start(intervalMs: number = 100): void {
    this.sample();
    this.intervalId = setInterval(() => this.sample(), intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private sample(): void {
    const mem = process.memoryUsage();
    this.samples.push({
      heapUsed: mem.heapUsed,
      rss: mem.rss,
    });
    this.peakHeapUsed = Math.max(this.peakHeapUsed, mem.heapUsed);
    this.peakRss = Math.max(this.peakRss, mem.rss);
  }

  getMetrics(): MemoryMetrics {
    const mem = process.memoryUsage();
    const toMB = (bytes: number) =>
      Math.round((bytes / (1024 * 1024)) * 10) / 10;

    return {
      heapUsedMB: toMB(mem.heapUsed),
      heapTotalMB: toMB(mem.heapTotal),
      externalMB: toMB(mem.external),
      rssMB: toMB(mem.rss),
      peakHeapUsedMB: toMB(this.peakHeapUsed),
      peakRssMB: toMB(this.peakRss),
    };
  }

  reset(): void {
    this.samples = [];
    this.peakHeapUsed = 0;
    this.peakRss = 0;
  }
}

export interface StdoutMetrics {
  totalWrites: number;
  totalBytes: number;
  avgWriteTimeMs: number;
  maxWriteTimeMs: number;
  p95WriteTimeMs: number;
  p99WriteTimeMs: number;
  backpressureEvents: number;
}

export class StdoutMeter {
  private originalWrite: typeof process.stdout.write;
  private writeTimes: number[] = [];
  private totalBytes = 0;
  private totalWrites = 0;
  private backpressureEvents = 0;
  private isHooked = false;

  constructor() {
    this.originalWrite = process.stdout.write.bind(process.stdout);
  }

  start(): void {
    if (this.isHooked) return;

    this.isHooked = true;

    const self = this;

    process.stdout.write = function (
      chunk: string | Uint8Array,
      encodingOrCallback?: BufferEncoding | ((err?: Error) => void),
      callback?: (err?: Error) => void,
    ): boolean {
      const start = process.hrtime.bigint();

      let encoding: BufferEncoding | undefined;
      let cb: ((err?: Error) => void) | undefined;

      if (typeof encodingOrCallback === "function") {
        cb = encodingOrCallback;
      } else {
        encoding = encodingOrCallback;
        cb = callback;
      }

      const result = self.originalWrite(
        chunk,
        encoding as BufferEncoding,
        cb as (err?: Error) => void,
      );

      const end = process.hrtime.bigint();
      const writeTimeMs = Number(end - start) / 1_000_000;

      self.totalWrites++;
      self.writeTimes.push(writeTimeMs);

      if (typeof chunk === "string") {
        self.totalBytes += Buffer.byteLength(chunk);
      } else {
        self.totalBytes += chunk.length;
      }

      if (!result) {
        self.backpressureEvents++;
      }

      return result;
    } as typeof process.stdout.write;
  }

  stop(): void {
    if (!this.isHooked) return;
    process.stdout.write = this.originalWrite;
    this.isHooked = false;
  }

  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  getWriteTimes(): number[] {
    return [...this.writeTimes];
  }

  getMetrics(): StdoutMetrics {
    const sum = this.writeTimes.reduce((a, b) => a + b, 0);
    const avg = this.writeTimes.length > 0 ? sum / this.writeTimes.length : 0;

    return {
      totalWrites: this.totalWrites,
      totalBytes: this.totalBytes,
      avgWriteTimeMs: Math.round(avg * 1000) / 1000,
      maxWriteTimeMs:
        this.writeTimes.length > 0
          ? Math.round(Math.max(...this.writeTimes) * 1000) / 1000
          : 0,
      p95WriteTimeMs:
        Math.round(this.percentile(this.writeTimes, 95) * 1000) / 1000,
      p99WriteTimeMs:
        Math.round(this.percentile(this.writeTimes, 99) * 1000) / 1000,
      backpressureEvents: this.backpressureEvents,
    };
  }

  reset(): void {
    this.writeTimes = [];
    this.totalBytes = 0;
    this.totalWrites = 0;
    this.backpressureEvents = 0;
  }
}

export function formatMetrics(metrics: BenchmarkMetrics): string {
  const { frame, memory, stdout } = metrics;

  const lines = [
    `Frame Timing:`,
    `  Avg: ${frame.avgFrameTimeMs}ms | Min: ${frame.minFrameTimeMs}ms | Max: ${frame.maxFrameTimeMs}ms`,
    `  P95: ${frame.p95FrameTimeMs}ms | P99: ${frame.p99FrameTimeMs}ms`,
    `  Throughput: ${frame.throughputFps} fps`,
    `  Total Frames: ${frame.totalFrames} | Dropped: ${frame.droppedFrames} | Backpressure: ${frame.backpressureEvents}`,
    `Memory:`,
    `  Heap: ${memory.heapUsedMB}MB / ${memory.heapTotalMB}MB | Peak: ${memory.peakHeapUsedMB}MB`,
    `  RSS: ${memory.rssMB}MB | Peak: ${memory.peakRssMB}MB`,
  ];

  if (stdout) {
    lines.push(
      `Stdout (métrica comparável):`,
      `  Writes: ${stdout.totalWrites} | Bytes: ${(stdout.totalBytes / 1024).toFixed(1)}KB`,
      `  Avg: ${stdout.avgWriteTimeMs}ms | Max: ${stdout.maxWriteTimeMs}ms`,
      `  P95: ${stdout.p95WriteTimeMs}ms | P99: ${stdout.p99WriteTimeMs}ms`,
      `  Backpressure: ${stdout.backpressureEvents}`,
    );
  }

  return lines.join("\n");
}
