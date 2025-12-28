/**
 * LLM client implementation using OpenAI SDK.
 */

import OpenAI from 'openai';
import type { ResponseDTO, MessageDTO } from '../dtos.js';
import type { LLMConfig } from '../../domain/models/config.js';
import type { ToolModel } from '../../domain/models/tool.js';
import type { Logger } from '../../utils/logger.js';
import {
  LLMAuthenticationError,
  LLMRateLimitError,
  LLMTimeoutError,
  LLMUnavailableError,
} from '../../domain/models/errors.js';

export interface LLMClient {
  complete(messages: MessageDTO[]): Promise<ResponseDTO>;
}

export class OpenAILLMClient implements LLMClient {
  private readonly client: OpenAI;
  private readonly llmConfig: LLMConfig;
  private readonly logger: Logger;
  private readonly prompt?: string;
  private readonly tools: Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters?: Record<string, unknown>;
    };
  }>;

  constructor(
    llmConfig: LLMConfig,
    logger: Logger,
    prompt?: string,
    tools?: ToolModel[]
  ) {
    const apiKey = process.env[llmConfig.api_key_env];
    if (!apiKey) {
      throw new Error(`API key not found in environment variable: ${llmConfig.api_key_env}`);
    }

    // Support both OpenAI and other providers via OpenAI-compatible API
    this.client = new OpenAI({
      apiKey,
      baseURL: this.getBaseURL(llmConfig.model),
    });

    this.llmConfig = llmConfig;
    this.logger = logger;
    this.prompt = prompt;
    this.tools = tools?.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    })) ?? [];
  }

  private getBaseURL(model: string): string | undefined {
    // Check if using Gemini or other non-OpenAI provider
    if (model.startsWith('gemini/')) {
      // For Gemini, we would typically use a proxy or adapter
      // For now, return undefined to use default OpenAI
      return undefined;
    }
    return undefined;
  }

  async complete(messages: MessageDTO[]): Promise<ResponseDTO> {
    try {
      this.logger.info('Calling LLM completion', {
        model: this.llmConfig.model,
        messageCount: messages.length,
        prompt: this.prompt,
      });

      const allMessages = this.prompt
        ? [{ role: 'system', content: this.prompt }, ...messages]
        : messages;

      const response = await this.client.chat.completions.create({
        model: this.llmConfig.model,
        messages: allMessages.map(m => ({
          role: m.role as 'system' | 'user' | 'assistant',
          content: m.content,
        })),
        tools: this.tools.length > 0 ? this.tools : undefined,
        max_tokens: this.llmConfig.max_tokens,
        temperature: this.llmConfig.temperature,
      });

      this.logger.info('LLM response received', { response });

      if (!response.choices || response.choices.length === 0) {
        this.logger.error('LLM completion returned no choices', { response });
        throw new LLMUnavailableError('O serviço LLM retornou nenhuma resposta.');
      }

      const choice = response.choices[0];
      if (!choice) {
        throw new LLMUnavailableError('No choice in response');
      }

      // Check for tool/function calls
      if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls) {
        const toolCall = choice.message.tool_calls[0];
        if (!toolCall) {
          throw new LLMUnavailableError('No tool call in response');
        }

        this.logger.info('LLM made a tool call', { toolCall });

        return {
          type: 'function_call',
          functionName: toolCall.function.name,
          functionArguments: JSON.parse(toolCall.function.arguments) as Record<string, unknown>,
          tokensUsed: response.usage?.total_tokens ?? 0,
          model: this.llmConfig.model,
          finishReason: choice.finish_reason ?? undefined,
          rawResponse: response as unknown as Record<string, unknown>,
        };
      }

      // Regular text response
      const content = choice.message.content ?? '';
      const tokensUsed = response.usage?.total_tokens ?? 0;
      const finishReason = choice.finish_reason ?? undefined;

      this.logger.info('LLM completion successful', {
        tokensUsed,
        finishReason,
      });

      return {
        type: 'text',
        content,
        tokensUsed,
        model: this.llmConfig.model,
        finishReason,
        rawResponse: response as unknown as Record<string, unknown>,
      };
    } catch (error) {
      if (error instanceof OpenAI.AuthenticationError) {
        this.logger.error('LLM authentication failed', { error: (error as Error).message });
        throw new LLMAuthenticationError(
          'Falha na autenticação com o serviço LLM. Verifique suas credenciais.',
          error
        );
      }

      if (error instanceof OpenAI.RateLimitError) {
        this.logger.error('LLM rate limit exceeded', { error: (error as Error).message });
        throw new LLMRateLimitError(
          'Limite de taxa excedido. Tente novamente mais tarde.',
          error
        );
      }

      if (error instanceof OpenAI.APIConnectionError) {
        this.logger.error('LLM request timed out', { error: (error as Error).message });
        throw new LLMTimeoutError('A requisição excedeu o tempo limite.', error as Error);
      }

      if (error instanceof OpenAI.APIError) {
        this.logger.error('LLM API error', { error: (error as Error).message });
        throw new LLMUnavailableError('O serviço LLM está indisponível no momento.', error);
      }

      this.logger.error('Unexpected error during LLM completion', {
        error: (error as Error).message,
        errorType: (error as Error).constructor.name,
      });

      throw new LLMUnavailableError(
        `Erro inesperado ao chamar o serviço LLM: ${(error as Error).message}`,
        error as Error
      );
    }
  }
}
