import React from 'react';
import { Box, Text } from 'ink';

interface CommandPanelProps {
  message: string;
}

export const CommandPanel: React.FC<CommandPanelProps> = ({ message }) => {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="blue" padding={1}>
      <Box>
        <Text bold color="blue">
          💻 Comando
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text>{message}</Text>
      </Box>
    </Box>
  );
};
