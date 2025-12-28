#!/usr/bin/env node
/**
 * CLI entry point for Xabironelson Codex.
 */

import React from "react";
import { render } from "ink";
import { program } from "commander";
import * as path from "path";
import { CONFIG_FILE_NAME } from "./constants.js";
import { loadConfiguration, createConfigFile } from "./config.js";
import { BasicLogger } from "./utils/logger.js";
import { OpenAILLMClient } from "./data/client/llm-client.js";
import { LLMRepositoryImpl } from "./data/repository/llm-repository.js";
import { GenerateCompletionUseCase } from "./domain/use-case/generate-completion-use-case.js";
import { CommandUseCase } from "./domain/use-case/command-use-case.js";
import { COMMAND_REGISTRY } from "./domain/commands/registry.js";
import { WorkingDirectoryManager } from "./domain/pattern/working-directory-manager.js";
import { ReadFileContentTool } from "./domain/tools/read-file-content-tool.js";
import { WriteFileContentTool } from "./domain/tools/write-file-content-tool.js";
import { ListFilesInsideDirectoryTool } from "./domain/tools/list-files-inside-directory-tool.js";
import { createToolModel } from "./domain/models/tool.js";
import { REPL } from "./presentation/repl.js";
import { ExecuteToolUseCase } from "./domain/use-case/execute-tool-use-case";

program
  .name("xabiro")
  .description("Xabironelson Codex - AI Coding Assistant")
  .version("1.0.0");

program
  .command("test")
  .description("Test command")
  .action(() => {
    console.log("Hello from Xabironelson Codex");
  });

program
  .command("init")
  .description("Initialize configuration file")
  .action(() => {
    const configPath = path.join(process.cwd(), CONFIG_FILE_NAME);
    try {
      createConfigFile(configPath);
      console.log(
        `Configuration file '${CONFIG_FILE_NAME}' created successfully!`,
      );
    } catch (error) {
      console.error((error as Error).message);
      process.exit(1);
    }
  });

program
  .command("repl")
  .description("Start interactive REPL")
  .option("-c, --config <path>", "Path to configuration file", CONFIG_FILE_NAME)
  .action(async (options: { config: string }) => {
    try {
      console.log("Loading environment variables...");
      console.log(`Loading configuration from: ${options.config}`);

      const systemConfig = loadConfiguration(options.config);
      const logger = new BasicLogger();

      console.log("\nLoaded Configuration:");
      console.log(`  Model: ${systemConfig.agentConfig.llm.model}`);
      console.log(`  Temperature: ${systemConfig.agentConfig.llm.temperature}`);
      console.log(`  Max Tokens: ${systemConfig.agentConfig.llm.max_tokens}`);
      console.log(
        `  API Key: ${systemConfig.agentConfig.llm.api_key_env} (OK)`,
      );
      console.log("\nInitializing system...");

      // Create tools
      const tools = [
        createToolModel(
          "write_file_content",
          "Write content to a specified file path.",
          {
            type: "object",
            properties: {
              file_path: { type: "string" },
              content: { type: "string" },
            },
            required: ["file_path", "content"],
          },
          new WriteFileContentTool(),
        ),
        createToolModel(
          "list_files_in_directory",
          "List all files in a given directory path.",
          {
            type: "object",
            properties: {
              directory_path: { type: "string" },
            },
          },
          new ListFilesInsideDirectoryTool(),
        ),
        createToolModel(
          "read_file_content",
          "Read the content of a text file given its path.",
          {
            type: "object",
            properties: {
              file_path: { type: "string" },
            },
            required: ["file_path"],
          },
          new ReadFileContentTool(),
        ),
      ];

      // Create LLM client and repository
      const llmClient = new OpenAILLMClient(
        systemConfig.agentConfig.llm,
        logger,
        systemConfig.prompt,
        tools,
      );

      const repository = new LLMRepositoryImpl(llmClient, logger);

      // Create use cases
      const completionUseCase = new GenerateCompletionUseCase(
        repository,
        logger,
      );

      const workingDirectoryManager = WorkingDirectoryManager.getInstance();
      const commandUseCase = new CommandUseCase(
        COMMAND_REGISTRY,
        systemConfig.agentConfig.llm,
        logger,
        workingDirectoryManager,
      );

      const toolMapping: Record<string, never> = {};
      for (const tool of tools) {
        if (tool.instance) {
          toolMapping[tool.name] = tool.instance as never;
        }
      }

      const executeToolUseCase = new ExecuteToolUseCase(
        toolMapping,
        logger,
        workingDirectoryManager.getWorkingDirectory(),
      );

      console.log("System initialized successfully!\n");

      // Render the REPL
      render(
        <REPL
          completionUseCase={completionUseCase}
          commandUseCase={commandUseCase}
          executeToolUseCase={executeToolUseCase}
        />,
      );
    } catch (error) {
      console.error("\nError:", (error as Error).message);
      process.exit(1);
    }
  });

program
  .command("solve <task>")
  .description("Execute a single task")
  .option("-c, --config <path>", "Path to configuration file", CONFIG_FILE_NAME)
  .action(async (task: string, options: { config: string }) => {
    try {
      const systemConfig = loadConfiguration(options.config);
      const logger = new BasicLogger();

      const tools = [
        createToolModel(
          "write_file_content",
          "Write content to a specified file path.",
          {
            type: "object",
            properties: {
              file_path: { type: "string" },
              content: { type: "string" },
            },
            required: ["file_path", "content"],
          },
          new WriteFileContentTool(),
        ),
        createToolModel(
          "list_files_in_directory",
          "List all files in a given directory path.",
          {
            type: "object",
            properties: {
              directory_path: { type: "string" },
            },
          },
          new ListFilesInsideDirectoryTool(),
        ),
        createToolModel(
          "read_file_content",
          "Read the content of a text file given its path.",
          {
            type: "object",
            properties: {
              file_path: { type: "string" },
            },
            required: ["file_path"],
          },
          new ReadFileContentTool(),
        ),
      ];

      const llmClient = new OpenAILLMClient(
        systemConfig.agentConfig.llm,
        logger,
        systemConfig.prompt,
        tools,
      );

      const repository = new LLMRepositoryImpl(llmClient, logger);
      const completionUseCase = new GenerateCompletionUseCase(
        repository,
        logger,
      );

      console.log("\n[EXECUTING TASK]");
      console.log("Processing...\n");

      const result = await completionUseCase.execute(task);

      console.log("[RESULT]");
      if (result.type === "text") {
        console.log(result.content);
        console.log(`\nTokens used: ${result.tokensUsed}`);
      } else {
        console.log("Function call received - not supported in solve mode");
      }
    } catch (error) {
      console.error(`\n[ERROR] ${(error as Error).message}`);
      process.exit(1);
    }
  });

program.parse();
