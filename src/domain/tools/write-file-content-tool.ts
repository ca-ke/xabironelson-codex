/**
 * Tool to write content to a file.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { Tool } from '../boundary/tool.js';

export class WriteFileContentTool implements Tool {
  async execute(args: Record<string, unknown>): Promise<string> {
    this.executeValidations(args);

    const filePath = args.file_path as string;
    const content = args.content as string;
    const workingDirectory = args.working_directory as string;

    const absWorkingDir = path.resolve(workingDirectory);
    const absFilePath = path.resolve(workingDirectory, filePath);

    // Security check: ensure file is within working directory
    if (!absFilePath.startsWith(absWorkingDir)) {
      return `Error: Cannot write to "${filePath}" as it is outside the permitted working directory`;
    }

    try {
      // Ensure directory exists
      const dir = path.dirname(absFilePath);
      await fs.mkdir(dir, { recursive: true });

      await fs.writeFile(absFilePath, content, 'utf-8');
      return `Success: Content written to "${filePath}".`;
    } catch (error) {
      return `Error writing to file at ${absFilePath}: ${(error as Error).message}`;
    }
  }

  private executeValidations(args: Record<string, unknown>): void {
    if (!('file_path' in args)) {
      throw new Error("The 'file_path' argument is required for WriteFileContentTool.");
    }
    if (!('content' in args)) {
      throw new Error("The 'content' argument is required for WriteFileContentTool.");
    }
    if (!('working_directory' in args)) {
      throw new Error("The 'working_directory' argument is required for WriteFileContentTool.");
    }
  }
}
