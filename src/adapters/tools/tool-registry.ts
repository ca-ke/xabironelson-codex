import { ReadFileContentTool } from "../persistence/read-file-tool.js";
import { WriteFileContentTool } from "../persistence/write-file-tool.js";
import { ListFilesInsideDirectoryTool } from "../persistence/list-files-tool.js";
import type { Tool } from "../../application/ports/tool.js";

export const TOOL_REGISTRY: Record<string, Tool> = {
  read_file_content: new ReadFileContentTool(),
  write_file_content: new WriteFileContentTool(),
  list_files: new ListFilesInsideDirectoryTool(),
};
