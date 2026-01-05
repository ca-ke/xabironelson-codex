import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { WelcomePanel } from './components/welcome-panel.js';
import { TextResponsePanel, FunctionCallResponsePanel } from './components/response-panel.js';
import { CommandPanel } from './components/command-panel.js';
import { ErrorPanel } from './components/error-panel.js';
import { ExitPanel } from './components/exit-panel.js';
import { LoadingSpinner } from './components/loading-spinner.js';
import type { GenerateCompletionUseCase } from '../../application/use-cases/generate-completion.js';
import type { CommandUseCase } from '../../application/use-cases/execute-command.js';
import type { ExecuteToolUseCase } from '../../application/use-cases/execute-tool.js';
import { isTextResponse, isFunctionCallResponse } from '../../core/entities/response.js';
import { LLMError } from '../../core/errors/domain-errors.js';

interface REPLProps {
  completionUseCase: GenerateCompletionUseCase;
  commandUseCase: CommandUseCase;
  executeToolUseCase: ExecuteToolUseCase;
}

type Message =
  | { type: 'text_response'; data: { response: unknown; turns: number; tokens: number } }
  | { type: 'function_call'; data: { response: unknown; turns: number; tokens: number } }
  | { type: 'command'; data: { message: string } }
  | { type: 'error'; data: { title: string; message: string } }
  | { type: 'success'; data: { message: string } };

export const REPL: React.FC<REPLProps> = ({
  completionUseCase,
  commandUseCase,
  executeToolUseCase,
}) => {
  const { exit } = useApp();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationTurns, setConversationTurns] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const [shouldExit, setShouldExit] = useState(false);
  const [farewell, setFarewell] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [pendingFunctionCall, setPendingFunctionCall] = useState<{
    name: string;
    args: Record<string, unknown>;
  } | null>(null);

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      setShouldExit(true);
    }
  });

  useEffect(() => {
    if (shouldExit) {
      exit();
    }
  }, [shouldExit, exit]);

  const handleSubmit = useCallback(
    async (value: string) => {
      if (!value.trim()) {
        setInput('');
        return;
      }

      // Handle awaiting confirmation for function calls
      if (awaitingConfirmation && pendingFunctionCall) {
        setAwaitingConfirmation(false);
        const confirmed = value.toLowerCase().trim();

        if (confirmed === 'y' || confirmed === 'yes' || confirmed === 's' || confirmed === 'sim') {
          setIsLoading(true);
          try {
            const result = await executeToolUseCase.execute(
              pendingFunctionCall.name,
              pendingFunctionCall.args
            );

            setMessages((prev) => [
              ...prev,
              { type: 'success', data: { message: '✅ Função executada com sucesso!' } },
            ]);

            const response = await completionUseCase.execute(
              `A função '${pendingFunctionCall.name}' foi executada com o seguinte resultado:\n${result}`
            );

            const newTurns = conversationTurns + 1;
            const newTokens = totalTokens + response.tokensUsed;
            setConversationTurns(newTurns);
            setTotalTokens(newTokens);

            if (isTextResponse(response)) {
              setMessages((prev) => [
                ...prev,
                { type: 'text_response', data: { response, turns: newTurns, tokens: newTokens } },
              ]);
            }
          } catch (error) {
            setMessages((prev) => [
              ...prev,
              { type: 'error', data: { title: 'ERRO', message: (error as Error).message } },
            ]);
          } finally {
            setIsLoading(false);
            setPendingFunctionCall(null);
          }
        } else {
          setMessages((prev) => [
            ...prev,
            { type: 'success', data: { message: '⚠️ Função não executada.' } },
          ]);
          setPendingFunctionCall(null);
        }

        setInput('');
        return;
      }

      // Check for exit commands
      if (['sair', 'exit', 'quit'].includes(value.toLowerCase().trim())) {
        setFarewell(true);
        setShouldExit(true);
        setInput('');
        return;
      }

      // Handle commands starting with /
      if (value.startsWith('/')) {
        try {
          const result = commandUseCase.execute(value);
          setMessages((prev) => [...prev, { type: 'command', data: { message: result.message } }]);

          if (result.shouldExit) {
            setShouldExit(true);
          }
        } catch (error) {
          setMessages((prev) => [
            ...prev,
            {
              type: 'error',
              data: { title: 'ERRO AO PROCESSAR COMANDO', message: (error as Error).message },
            },
          ]);
        }

        setInput('');
        return;
      }

      // Handle regular input
      setIsLoading(true);
      try {
        const response = await completionUseCase.execute(value);
        const newTurns = conversationTurns + 1;
        const newTokens = totalTokens + response.tokensUsed;
        setConversationTurns(newTurns);
        setTotalTokens(newTokens);

        if (isTextResponse(response)) {
          setMessages((prev) => [
            ...prev,
            { type: 'text_response', data: { response, turns: newTurns, tokens: newTokens } },
          ]);
        } else if (isFunctionCallResponse(response)) {
          setMessages((prev) => [
            ...prev,
            { type: 'function_call', data: { response, turns: newTurns, tokens: newTokens } },
          ]);
          setPendingFunctionCall({
            name: response.functionName,
            args: response.functionArguments,
          });
          setAwaitingConfirmation(true);
        }
      } catch (error) {
        if (error instanceof LLMError) {
          setMessages((prev) => [
            ...prev,
            { type: 'error', data: { title: 'ERRO LLM', message: (error as LLMError).message } },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              type: 'error',
              data: { title: 'ERRO INESPERADO', message: (error as Error).message },
            },
          ]);
        }
      } finally {
        setIsLoading(false);
      }

      setInput('');
    },
    [
      awaitingConfirmation,
      pendingFunctionCall,
      conversationTurns,
      totalTokens,
      completionUseCase,
      commandUseCase,
      executeToolUseCase,
    ]
  );

  if (shouldExit) {
    return (
      <Box flexDirection="column">
        <ExitPanel
          conversationTurns={conversationTurns}
          totalTokens={totalTokens}
          farewell={farewell}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <WelcomePanel />
      <Box marginTop={1} />

      {messages.map((msg, idx) => {
        if (msg.type === 'text_response') {
          const data = msg.data as { response: unknown; turns: number; tokens: number };
          return <TextResponsePanel key={idx} response={data.response as never} conversationTurns={data.turns} totalTokens={data.tokens} />;
        } else if (msg.type === 'function_call') {
          const data = msg.data as { response: unknown; turns: number; tokens: number };
          return <FunctionCallResponsePanel key={idx} response={data.response as never} conversationTurns={data.turns} totalTokens={data.tokens} />;
        } else if (msg.type === 'command') {
          return <CommandPanel key={idx} message={msg.data.message} />;
        } else if (msg.type === 'error') {
          return <ErrorPanel key={idx} title={msg.data.title} message={msg.data.message} />;
        } else if (msg.type === 'success') {
          return (
            <Box key={idx} borderStyle="round" borderColor="green" padding={1}>
              <Text color="green">{msg.data.message}</Text>
            </Box>
          );
        }
        return null;
      })}

      {isLoading && (
        <Box marginTop={1}>
          <LoadingSpinner />
        </Box>
      )}

      {!isLoading && (
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>╭─[</Text>
          <Text dimColor bold color="yellow">
            👤 Usuário
          </Text>
          <Text dimColor>]</Text>
          <Box>
            <Text dimColor>╰─➤ </Text>
            <TextInput
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              placeholder={awaitingConfirmation ? 'Deseja executar esta função? (y/n)' : ''}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};
