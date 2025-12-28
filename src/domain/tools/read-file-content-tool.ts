/**
 * Tool to read the content of a file.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { Tool } from '../boundary/tool.js';

const MAX_CHARS_TO_READ = 10000;

export class ReadFileContentTool implements Tool {
  async execute(args: Record<string, unknown>): Promise<string> {
    this.executeValidations(args);

    const filePath = args.file_path as string;
    const workingDirectory = args.working_directory as string;

    const absWorkingDir = path.resolve(workingDirectory);
    const absFilePath = path.resolve(workingDirectory, filePath);

    // Security check: ensure file is within working directory
    if (!absFilePath.startsWith(absWorkingDir)) {
      return `Error: Cannot read "${filePath}" as it is outside the permitted working directory`;
    }

    try {
      const stats = await fs.stat(absFilePath);

      if (!stats.isFile()) {
        return `Error: File not found or is not a regular file: "${filePath}"`;
      }

      const handle = await fs.open(absFilePath, 'r');
      try {
        const buffer = Buffer.alloc(MAX_CHARS_TO_READ);
        const { bytesRead } = await handle.read(buffer, 0, MAX_CHARS_TO_READ, 0);
        let content = buffer.toString('utf-8', 0, bytesRead);

        if (stats.size > MAX_CHARS_TO_READ) {
          content += `\n[...File "${filePath}" truncated at ${MAX_CHARS_TO_READ} characters]`;
        }

        return content;
      } finally {
        await handle.close();
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return `Error: The file at ${absFilePath} was not found.`;
      }
      return `Error reading file at ${absFilePath}: ${(error as Error).message}`;
    }
  }

  private executeValidations(args: Record<string, unknown>): void {
    if (!('file_path' in args)) {
      throw new Error("The 'file_path' argument is required for ReadFileContentTool.");
    }
    if (!('working_directory' in args)) {
      throw new Error("The 'working_directory' argument is required for ReadFileContentTool.");
    }
  }
}
