/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../semantic-colors.js';
import { RadioButtonSelect } from '../components/shared/RadioButtonSelect.js';
import {
  GEMINI_MODELS,
  OPENAI_MODELS,
  CLAUDE_MODELS,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_CLAUDE_MODEL,
} from '@google/gemini-cli-core';

interface ModelSelectionDialogProps {
  provider: 'gemini' | 'openai' | 'claude';
  onSelect: (model: string, provider?: 'gemini' | 'openai' | 'claude') => void;
  onCancel: () => void;
  showAllProviders?: boolean;
}

const PROVIDER_INFO: Record<
  'gemini' | 'openai' | 'claude',
  { title: string; description: string }
> = {
  gemini: {
    title: 'Select Gemini Model',
    description: 'Choose which Gemini model to use for your conversations.',
  },
  openai: {
    title: 'Select OpenAI Model',
    description: 'Choose which OpenAI model to use for your conversations.',
  },
  claude: {
    title: 'Select Claude Model',
    description: 'Choose which Claude model to use for your conversations.',
  },
};

function getModelsForProvider(
  provider: 'gemini' | 'openai' | 'claude',
): Array<{ label: string; value: string }> {
  let models: readonly string[] = [];
  let defaultModel = '';

  switch (provider) {
    case 'gemini':
      models = GEMINI_MODELS;
      defaultModel = DEFAULT_GEMINI_MODEL;
      break;
    case 'openai':
      models = OPENAI_MODELS;
      defaultModel = DEFAULT_OPENAI_MODEL;
      break;
    case 'claude':
      models = CLAUDE_MODELS;
      defaultModel = DEFAULT_CLAUDE_MODEL;
      break;
    default: {
      // Ensure exhaustiveness check
      const _exhaustive: never = provider;
      return [{ label: _exhaustive as never, value: '' }];
    }
  }

  return models.map((model) => ({
    label: model === defaultModel ? `${model} (recommended)` : model,
    value: model,
  }));
}

function getAllModels(): Array<{ label: string; value: string }> {
  const allModels: Array<{ label: string; value: string }> = [];

  // Add Gemini models
  GEMINI_MODELS.forEach((model) => {
    allModels.push({
      label:
        model === DEFAULT_GEMINI_MODEL
          ? `[Gemini] ${model} (recommended)`
          : `[Gemini] ${model}`,
      value: model,
    });
  });

  // Add OpenAI models
  OPENAI_MODELS.forEach((model) => {
    allModels.push({
      label:
        model === DEFAULT_OPENAI_MODEL
          ? `[OpenAI] ${model} (recommended)`
          : `[OpenAI] ${model}`,
      value: model,
    });
  });

  // Add Claude models
  CLAUDE_MODELS.forEach((model) => {
    allModels.push({
      label:
        model === DEFAULT_CLAUDE_MODEL
          ? `[Claude] ${model} (recommended)`
          : `[Claude] ${model}`,
      value: model,
    });
  });

  return allModels;
}

export function ModelSelectionDialog({
  provider,
  onSelect,
  showAllProviders = false,
}: ModelSelectionDialogProps): React.JSX.Element {
  const info = PROVIDER_INFO[provider];
  const models = showAllProviders
    ? getAllModels()
    : getModelsForProvider(provider);

  // Find the index of a recommended model
  let defaultIndex = models.findIndex((m) => m.label.includes('(recommended)'));
  // If no recommended model, start at 0
  if (defaultIndex === -1) {
    defaultIndex = 0;
  }

  const handleSelect = (model: string) => {
    // Extract provider from model label if showing all providers
    let selectedProvider = provider;
    if (showAllProviders) {
      if (GEMINI_MODELS.includes(model as string)) {
        selectedProvider = 'gemini';
      } else if (OPENAI_MODELS.includes(model as string)) {
        selectedProvider = 'openai';
      } else if (CLAUDE_MODELS.includes(model as string)) {
        selectedProvider = 'claude';
      }
    }
    onSelect(model, selectedProvider);
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
        {showAllProviders ? 'Select AI Model (All Providers)' : info.title}
      </Text>
      <Box marginTop={1}>
        <Text color={theme.text.primary}>
          {showAllProviders
            ? 'Choose a model from any available AI provider'
            : info.description}
        </Text>
      </Box>

      <Box marginTop={1}>
        <RadioButtonSelect
          items={models.map((m) => ({
            label: m.label,
            value: m.value,
            key: m.value,
          }))}
          initialIndex={Math.max(0, defaultIndex)}
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
