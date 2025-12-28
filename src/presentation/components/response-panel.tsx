/**
 * Response panel components for displaying LLM responses.
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { TextResponseModel, FunctionCallResponseModel } from '../../domain/models/response.js';

interface TextResponsePanelProps {
  response: TextResponseModel;
  conversationTurns: number;
  totalTokens: number;
}

export const TextResponsePanel: React.FC<TextResponsePanelProps> = ({
  response,
  conversationTurns,
  totalTokens,
}) => {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
      <Box>
        <Text bold color="cyan">
          🤖 Xabiro
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text>{response.content}</Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>
          💬 Turno: {conversationTurns} | 🎫 Tokens: {response.tokensUsed} | 📊 Total: {totalTokens}
        </Text>
      </Box>
    </Box>
  );
};

interface FunctionCallResponsePanelProps {
  response: FunctionCallResponseModel;
  conversationTurns: number;
  totalTokens: number;
}

export const FunctionCallResponsePanel: React.FC<FunctionCallResponsePanelProps> = ({
  response,
  conversationTurns,
  totalTokens,
}) => {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
      <Box>
        <Text bold color="cyan">
          🤖 Xabiro
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text bold color="yellow">
          🛠️ Chamada de Função:
        </Text>
        <Text />
        <Text>
          - Nome da Função: <Text color="green">{response.functionName}</Text>
        </Text>
        <Text>
          - Argumentos: <Text color="green">{JSON.stringify(response.functionArguments, null, 2)}</Text>
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>
          💬 Turno: {conversationTurns} | 🎫 Tokens: {response.tokensUsed} | 📊 Total: {totalTokens}
        </Text>
      </Box>
    </Box>
  );
};
