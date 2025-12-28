/**
 * Exit panel component.
 */

import React from 'react';
import { Box, Text } from 'ink';

interface ExitPanelProps {
  conversationTurns: number;
  totalTokens: number;
  farewell?: boolean;
}

export const ExitPanel: React.FC<ExitPanelProps> = ({
  conversationTurns,
  totalTokens,
  farewell = false,
}) => {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="magenta" padding={1}>
      {farewell ? (
        <Text bold color="magenta">
          👋 Até mais!
        </Text>
      ) : (
        <Text color="magenta">🔴 Encerrando Xabiro...</Text>
      )}
      <Box marginTop={1}>
        <Text dimColor>
          📊 Conversas: {conversationTurns} | Tokens totais: {totalTokens}
        </Text>
      </Box>
    </Box>
  );
};
