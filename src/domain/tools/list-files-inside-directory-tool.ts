/**
 * Tool to list files inside a directory.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { Tool } from '../boundary/tool.js';

export class ListFilesInsideDirectoryTool implements Tool {
  async execute(args: Record<string, unknown>): Promise<string> {
    this.executeValidations(args);

    const directoryPath = (args.directory_path as string | undefined) || '.';
    const workingDirectory = args.working_directory as string;

    const absWorkingDir = path.resolve(workingDirectory);
    const absDirectoryPath = path.resolve(workingDirectory, directoryPath);

    // Security check: ensure directory is within working directory
    if (!absDirectoryPath.startsWith(absWorkingDir)) {
      return `Error: Cannot list files in "${directoryPath}" as it is outside the permitted working directory`;
    }

    try {
      const stats = await fs.stat(absDirectoryPath);

      if (!stats.isDirectory()) {
        return `Error: Directory not found or is not a directory: "${directoryPath}"`;
      }

      const files = await fs.readdir(absDirectoryPath);

      if (files.length === 0) {
        return `No files found in directory "${directoryPath}".`;
      }

      return files.join('\n');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return `Error: The directory at ${absDirectoryPath} was not found.`;
      }
      return `Error listing files in directory at ${absDirectoryPath}: ${(error as Error).message}`;
    }
  }

  private executeValidations(args: Record<string, unknown>): void {
    if (!('working_directory' in args)) {
      throw new Error("The 'working_directory' argument is required for ListFilesInsideDirectoryTool.");
    }
  }
}
