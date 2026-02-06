import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

export interface StreamToken {
  lineIndex: number;
  word: string;
  accumulated: string;
  isComplete: boolean;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEXT_FILE = join(__dirname, "gutenberg.txt");

/**
 * Loads text from Gutenberg file and prepares a word-by-word stream.
 * Simulates streaming text like an LLM response.
 */
export function prepareTextStream(): {
  lines: string[];
  stream: () => AsyncGenerator<StreamToken>;
} {
  if (!existsSync(TEXT_FILE)) {
    throw new Error(
      `Text file not found: ${TEXT_FILE}\nRun: curl -L "https://www.gutenberg.org/cache/epub/77862/pg77862.txt" -o benchmark/gutenberg.txt`,
    );
  }

  const content = readFileSync(TEXT_FILE, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim().length > 0);

  const stream = async function* (): AsyncGenerator<StreamToken> {
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const words = line.split(/\s+/).filter((w) => w.length > 0);

      let accumulated = "";
      for (let w = 0; w < words.length; w++) {
        accumulated += (w > 0 ? " " : "") + words[w];

        yield {
          lineIndex,
          word: words[w],
          accumulated,
          isComplete: false,
        };
      }

      yield {
        lineIndex,
        word: "",
        accumulated: line,
        isComplete: true,
      };
    }
  };

  return { lines, stream };
}
