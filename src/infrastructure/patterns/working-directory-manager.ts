import * as fs from 'fs';
import * as path from 'path';

export class WorkingDirectoryManager {
  private static instance: WorkingDirectoryManager;
  private workingDirectory: string;

  private constructor() {
    this.workingDirectory = process.cwd();
  }

  static getInstance(): WorkingDirectoryManager {
    if (!WorkingDirectoryManager.instance) {
      WorkingDirectoryManager.instance = new WorkingDirectoryManager();
    }
    return WorkingDirectoryManager.instance;
  }

  getWorkingDirectory(): string {
    return this.workingDirectory;
  }

  setDirectory(directory: string): void {
    if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
      throw new Error(`Directory does not exist: ${directory}`);
    }
    this.workingDirectory = directory;
    process.chdir(directory);
  }

  changeToPath(relativePath: string): void {
    const newPath = path.join(this.workingDirectory, relativePath);
    this.setDirectory(newPath);
  }
}
