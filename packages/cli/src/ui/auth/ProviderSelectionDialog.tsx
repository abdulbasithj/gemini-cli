/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../semantic-colors.js';
import { RadioButtonSelect } from '../components/shared/RadioButtonSelect.js';

interface ProviderSelectionDialogProps {
  onSelect: (provider: 'gemini' | 'openai' | 'claude') => void;
  onCancel: () => void;
}

export function ProviderSelectionDialog({
  onSelect,
}: ProviderSelectionDialogProps): React.JSX.Element {
  const providers = [
    {
      label: 'Gemini',
      value: 'gemini' as const,
      key: 'gemini',
    },
    {
      label: 'OpenAI',
      value: 'openai' as const,
      key: 'openai',
    },
    {
      label: 'Claude (Anthropic)',
      value: 'claude' as const,
      key: 'claude',
    },
  ];

  const handleSelect = (provider: 'gemini' | 'openai' | 'claude') => {
    onSelect(provider);
  };

  return (
    <Box
      borderStyle="round"
      borderColor={theme.border.focused}
      flexDirection="column"
      padding={1}
      width="100%"
    >
      <Text bold color={theme.text.primary}>
        Select AI Provider
      </Text>
      <Box marginTop={1}>
        <Text color={theme.text.primary}>
          Which AI provider would you like to use for custom authentication?
        </Text>
      </Box>
      <Box marginTop={1}>
        <RadioButtonSelect
          items={providers}
          initialIndex={0}
          onSelect={handleSelect}
          onHighlight={() => {
            // Clear any error messages on highlight
          }}
        />
      </Box>
      <Box marginTop={1}>
        <Text color={theme.text.secondary}>(Use Enter to select)</Text>
      </Box>
    </Box>
  );
}
