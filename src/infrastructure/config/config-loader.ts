import { config as loadEnv } from "dotenv";
import * as fs from "fs";
import * as yaml from "js-yaml";
import * as path from "path";
import type { AgentConfig } from "../../core/entities/config.js";
import { AgentSchema } from "../../core/entities/config.js";

export interface SystemConfig {
  agentConfig: AgentConfig;
  verbose: boolean;
}

export function loadConfiguration(configFile: string): SystemConfig {
  loadEnv();

  const configPath = path.resolve(configFile);
  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }

  const fileContents = fs.readFileSync(configPath, "utf-8");
  const rawConfig = yaml.load(fileContents);

  const agentConfig = AgentSchema.safeParse(rawConfig);

  if (!agentConfig.success) {
    throw agentConfig.error;
  }

  return {
    agentConfig: agentConfig.data,
    verbose: process.env.VERBOSE === "true",
  };
}

export function createConfigFile(
  configPath: string,
  overwrite: boolean = false,
): void {
  if (fs.existsSync(configPath) && !overwrite) {
    throw new Error(`Configuration file already exists: ${configPath}`);
  }

  const defaultConfig = {
    max_steps: 10,
    tools: {
      planner: true,
    },
    prompt: `Você é um agente de código pessoal chamado Xabironelson Codex. Sua tarefa é ajudar o usuário a escrever, revisar e depurar código. Sempre que possível, forneça exemplos de código e explique conceitos técnicos de maneira clara e concisa.

Você tem acesso a algumas ferramentas que podem ser usadas para melhorar sua capacidade de auxiliar o usuário. Utilize-as sempre que necessário.

## Exemplo
1. Para ler o conteúdo de um arquivo, use a ferramenta \`read_file_content\`.
2. Para listar arquivos em um diretório, use a ferramenta \`list_files_in_directory\`.
3. Para escrever conteúdo em um arquivo, use a ferramenta \`write_file_content\`.`,
    llm: {
      model: "gemini/gemini-2.5-flash",
      temperature: 0.7,
      max_tokens: 1500,
    },
  };

  fs.writeFileSync(configPath, yaml.dump(defaultConfig), "utf-8");
}
