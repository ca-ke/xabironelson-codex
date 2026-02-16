import { ExecuteToolUseCase } from "@/application/use-cases/execute-tool";
import { BoxRenderable, createCliRenderer } from "@opentui/core";
import * as path from "path";
import type { LLMRepository } from "../../application/ports/llm-repository";
import { CommandUseCase } from "../../application/use-cases/execute-command";
import { GenerateCompletionUseCase } from "../../application/use-cases/generate-completion";
import { CONFIG_FILE_NAME } from "../../constants";
import { loadConfiguration } from "../../infrastructure/config/config-loader";
import type { Logger } from "../../infrastructure/logging/logger";
import { BasicLogger } from "../../infrastructure/logging/logger";
import { WorkingDirectoryManager } from "../../infrastructure/patterns/working-directory-manager";
import { GeminiAdapter } from "../gemini/adapter";
import { LLMClientImpl } from "../llm/llm-client";
import { LLMRepositoryImpl } from "../llm/llm-repository";
import type { ProviderConfig } from "../llm/provider-adapter";
import { TOOL_REGISTRY } from "../tools/tool-registry";
import { COMMAND_REGISTRY } from "./commands/registry";
import { REPLContainer, WelcomePanel } from "./components";

export interface TuiDependencies {
  repository: LLMRepository;
  completionUseCase: GenerateCompletionUseCase;
  toolUseCase: ExecuteToolUseCase;
  commandUseCase: CommandUseCase;
  logger: Logger;
  initialModel: string;
}

export async function startTui(deps: TuiDependencies): Promise<void> {
  const {
    completionUseCase,
    commandUseCase,
    toolUseCase,
    logger,
    initialModel,
  } = deps;

  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
    targetFps: 60,
  });

  const root = renderer.root;

  const mainContainer = new BoxRenderable(renderer, {
    width: "100%",
    height: "100%",
    flexDirection: "column",
  });

  const welcomePanel = new WelcomePanel(renderer, {
    title: "Welcome to Xabiro TUI",
    subtitle: "Type a message and press Enter to send.",
  });

  const replContainer = new REPLContainer(renderer, {
    completionUseCase,
    commandUseCase,
    toolUseCase,
    logger,
    initialModel,
  });

  mainContainer.add(welcomePanel);
  mainContainer.add(replContainer);

  root.add(mainContainer);

  replContainer.focus();

  renderer.start();
}

async function main(): Promise<void> {
  try {
    const configPath = path.join(process.cwd(), CONFIG_FILE_NAME);
    const systemConfig = loadConfiguration(configPath);
    const logger = new BasicLogger();

    const agentConfig = systemConfig.agentConfig;
    const apiKeyEnv = agentConfig.llm.api_key_env;
    const apiKey = process.env[apiKeyEnv];

    if (!apiKey) {
      throw new Error(
        `API key not found! Set environment variable: ${apiKeyEnv}`,
      );
    }

    const providerConfig: ProviderConfig = {
      apiKey,
      model: agentConfig.llm.model,
      timeout: 30000,
      tools: agentConfig.tools,
    };

    const geminiAdapter = new GeminiAdapter(providerConfig, logger);

    const llmClient = new LLMClientImpl(
      geminiAdapter,
      providerConfig,
      logger,
      agentConfig.llm.prompt,
      agentConfig.tools,
      agentConfig.llm.temperature,
      agentConfig.llm.max_tokens,
    );

    const repository = new LLMRepositoryImpl(llmClient);
    const completionUseCase = new GenerateCompletionUseCase(repository, logger);
    const workingDirectoryManager = WorkingDirectoryManager.getInstance();
    const commandUseCase = new CommandUseCase(
      COMMAND_REGISTRY,
      agentConfig.llm,
      logger,
      workingDirectoryManager,
      repository,
    );
    const toolUseCase = new ExecuteToolUseCase(
      TOOL_REGISTRY,
      logger,
      workingDirectoryManager,
    );

    await startTui({
      repository,
      completionUseCase,
      commandUseCase,
      toolUseCase,
      logger,
      initialModel: agentConfig.llm.model,
    });
  } catch (error) {
    console.error("Failed to initialize TUI:", (error as Error).message);
    process.exit(1);
  }
}

main().catch(console.error);
