import { createCliRenderer, BoxRenderable } from "@opentui/core";
import { WelcomePanel, REPLContainer } from "./components";
import { GenerateCompletionUseCase } from "../../application/use-cases/generate-completion";
import { BasicLogger } from "../../infrastructure/logging/logger";
import { LLMRepositoryImpl } from "../llm/llm-repository";
import { LLMClientImpl } from "../llm/llm-client";
import { GeminiAdapter } from "../gemini/adapter";
import type { ProviderConfig } from "../llm/provider-adapter";
import { loadConfiguration } from "../../infrastructure/config/config-loader";
import type { LLMRepository } from "../../application/ports/llm-repository";
import type { Logger } from "../../infrastructure/logging/logger";
import * as path from "path";
import { CONFIG_FILE_NAME } from "../../constants";

export interface TuiDependencies {
  repository: LLMRepository;
  completionUseCase: GenerateCompletionUseCase;
  logger: Logger;
}

export async function startTui(deps: TuiDependencies): Promise<void> {
  const { completionUseCase, logger } = deps;

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
    logger,
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

    const llmConfig = systemConfig.agentConfig.llm;
    const apiKeyEnv = llmConfig.api_key_env;
    const apiKey = process.env[apiKeyEnv];

    if (!apiKey) {
      throw new Error(
        `API key not found! Set environment variable: ${apiKeyEnv}`,
      );
    }

    const providerConfig: ProviderConfig = {
      apiKey,
      model: llmConfig.model,
      timeout: 30000,
    };

    const geminiAdapter = new GeminiAdapter(providerConfig);

    const llmClient = new LLMClientImpl(
      geminiAdapter,
      providerConfig,
      logger,
      systemConfig.prompt,
      undefined,
      llmConfig.temperature,
      llmConfig.max_tokens,
    );

    const repository = new LLMRepositoryImpl(llmClient);
    const completionUseCase = new GenerateCompletionUseCase(repository, logger);

    await startTui({ repository, completionUseCase, logger });
  } catch (error) {
    console.error("Failed to initialize TUI:", (error as Error).message);
    process.exit(1);
  }
}

main().catch(console.error);
