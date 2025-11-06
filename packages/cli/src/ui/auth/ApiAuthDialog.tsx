/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../semantic-colors.js';
import { TextInput } from '../components/shared/TextInput.js';
import { useTextBuffer } from '../components/shared/text-buffer.js';
import { useUIState } from '../contexts/UIStateContext.js';

type Provider = 'gemini' | 'openai' | 'claude';

interface ApiAuthDialogProps {
  onSubmit: (apiKey: string) => void;
  onCancel: () => void;
  error?: string | null;
  defaultValue?: string;
  provider?: Provider;
}

const PROVIDER_CONFIG: Record<
  Provider,
  { title: string; description: string; url: string }
> = {
  gemini: {
    title: 'Enter Gemini API Key',
    description:
      'Please enter your Gemini API key. It will be securely stored in your system keychain.',
    url: 'https://aistudio.google.com/app/apikey',
  },
  openai: {
    title: 'Enter OpenAI API Key',
    description:
      'Please enter your OpenAI API key. It will be securely stored in your system keychain.',
    url: 'https://platform.openai.com/api-keys',
  },
  claude: {
    title: 'Enter Claude API Key',
    description:
      'Please enter your Claude API key. It will be securely stored in your system keychain.',
    url: 'https://console.anthropic.com/account/keys',
  },
};

export function ApiAuthDialog({
  onSubmit,
  onCancel,
  error,
  defaultValue = '',
  provider = 'gemini',
}: ApiAuthDialogProps): React.JSX.Element {
  const { mainAreaWidth } = useUIState();
  const viewportWidth = mainAreaWidth - 8;

  const buffer = useTextBuffer({
    initialText: defaultValue || '',
    initialCursorOffset: defaultValue?.length || 0,
    viewport: {
      width: viewportWidth,
      height: 4,
    },
    isValidPath: () => false, // No path validation needed for API key
    inputFilter: (text) =>
      text.replace(/[^a-zA-Z0-9_-]/g, '').replace(/[\r\n]/g, ''),
    singleLine: true,
  });

  const handleSubmit = (value: string) => {
    onSubmit(value);
  };

  const config = PROVIDER_CONFIG[provider];

  return (
    <Box
      borderStyle="round"
      borderColor={theme.border.focused}
      flexDirection="column"
      padding={1}
      width="100%"
    >
      <Text bold color={theme.text.primary}>
        {config.title}
      </Text>
      <Box marginTop={1} flexDirection="column">
        <Text color={theme.text.primary}>{config.description}</Text>
        <Text color={theme.text.secondary}>
          You can get an API key from{' '}
          <Text color={theme.text.link}>{config.url}</Text>
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="row">
        <Box
          borderStyle="round"
          borderColor={theme.border.default}
          paddingX={1}
          flexGrow={1}
        >
          <TextInput
            buffer={buffer}
            onSubmit={handleSubmit}
            onCancel={onCancel}
            placeholder="Paste your API key here"
          />
        </Box>
      </Box>
      {error && (
        <Box marginTop={1}>
          <Text color={theme.status.error}>{error}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text color={theme.text.secondary}>
          (Press Enter to submit, Esc to cancel)
        </Text>
      </Box>
    </Box>
  );
}
