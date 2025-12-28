/**
 * Error panel component.
 */

import React from 'react';
import { Box, Text } from 'ink';

interface ErrorPanelProps {
  title: string;
  message: string;
}

export const ErrorPanel: React.FC<ErrorPanelProps> = ({ title, message }) => {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="red" padding={1}>
      <Box>
        <Text bold color="red">
          ❌ {title}
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color="red">{message}</Text>
      </Box>
    </Box>
  );
};
