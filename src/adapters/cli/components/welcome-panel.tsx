import React from 'react';
import { Box, Text } from 'ink';

export const WelcomePanel: React.FC = () => {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
      <Text bold color="cyan">
        Bem-vindo ao Xabironelson Codex REPL! 🤖
      </Text>
      <Text />
      <Text dimColor>💡 Digite 'sair', 'exit' ou 'quit' para encerrar</Text>
      <Text dimColor>💡 Use Ctrl+C ou Ctrl+D para sair também</Text>
    </Box>
  );
};
