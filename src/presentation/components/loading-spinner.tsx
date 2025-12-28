/**
 * Loading spinner component.
 */

import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Processando sua solicitação...'
}) => {
  return (
    <Box>
      <Text dimColor>
        <Spinner type="dots" />
        {' '}
        {message}
      </Text>
    </Box>
  );
};
