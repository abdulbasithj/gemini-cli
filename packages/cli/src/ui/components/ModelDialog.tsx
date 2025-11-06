/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { useCallback, useContext, useMemo } from 'react';
import { Box, Text } from 'ink';
import {
  DEFAULT_GEMINI_FLASH_LITE_MODEL,
  DEFAULT_GEMINI_FLASH_MODEL,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_MODEL_AUTO,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_CLAUDE_MODEL,
  OPENAI_MODELS,
  CLAUDE_MODELS,
  GEMINI_MODELS,
  ModelSlashCommandEvent,
  logModelSlashCommand,
  AuthType,
} from '@google/gemini-cli-core';
import { useKeypress } from '../hooks/useKeypress.js';
import { theme } from '../semantic-colors.js';
import { DescriptiveRadioButtonSelect } from './shared/DescriptiveRadioButtonSelect.js';
import { ConfigContext } from '../contexts/ConfigContext.js';
import { useSettings } from '../contexts/SettingsContext.js';

interface ModelDialogProps {
  onClose: () => void;
}

const GEMINI_MODEL_OPTIONS = [
  {
    value: DEFAULT_GEMINI_MODEL_AUTO,
    title: 'Auto (recommended)',
    description: 'Let the system choose the best model for your task',
    key: DEFAULT_GEMINI_MODEL_AUTO,
  },
  {
    value: DEFAULT_GEMINI_MODEL,
    title: 'Pro',
    description: 'For complex tasks that require deep reasoning and creativity',
    key: DEFAULT_GEMINI_MODEL,
  },
  {
    value: DEFAULT_GEMINI_FLASH_MODEL,
    title: 'Flash',
    description: 'For tasks that need a balance of speed and reasoning',
    key: DEFAULT_GEMINI_FLASH_MODEL,
  },
  {
    value: DEFAULT_GEMINI_FLASH_LITE_MODEL,
    title: 'Flash-Lite',
    description: 'For simple tasks that need to be done quickly',
    key: DEFAULT_GEMINI_FLASH_LITE_MODEL,
  },
];

function getOpenAIModelOptions() {
  return OPENAI_MODELS.map((model) => ({
    value: model,
    title: model === DEFAULT_OPENAI_MODEL ? `${model} (recommended)` : model,
    description: `OpenAI - ${model}`,
    key: model,
  }));
}

function getClaudeModelOptions() {
  return CLAUDE_MODELS.map((model) => ({
    value: model,
    title: model === DEFAULT_CLAUDE_MODEL ? `${model} (recommended)` : model,
    description: `Claude - ${model}`,
    key: model,
  }));
}

function getAllProviderModels() {
  return [
    ...GEMINI_MODEL_OPTIONS,
    ...getOpenAIModelOptions(),
    ...getClaudeModelOptions(),
  ];
}

export function ModelDialog({ onClose }: ModelDialogProps): React.JSX.Element {
  const config = useContext(ConfigContext);
  const settings = useSettings();

  // Determine the Preferred Model (read once when the dialog opens).
  const preferredModel = config?.getModel() || DEFAULT_GEMINI_MODEL_AUTO;

  // Get the current auth provider from the content generator config
  const currentProvider = config?.getContentGeneratorConfig()?.provider;

  // Check if using custom auth
  const isCustomAuth =
    settings.merged.security?.auth?.selectedType === AuthType.CUSTOM_AUTH;

  useKeypress(
    (key) => {
      if (key.name === 'escape') {
        onClose();
      }
    },
    { isActive: true },
  );

  // Get model options based on current provider and auth type
  const modelOptions = useMemo(() => {
    // If custom auth is enabled, show all models from all providers
    if (isCustomAuth) {
      return getAllProviderModels();
    }

    // Otherwise, show only models for the current provider
    if (currentProvider === 'openai') {
      return getOpenAIModelOptions();
    } else if (currentProvider === 'claude') {
      return getClaudeModelOptions();
    } else if (currentProvider === 'gemini') {
      return GEMINI_MODEL_OPTIONS;
    }
    // Default to all models if provider not recognized
    return getAllProviderModels();
  }, [currentProvider, isCustomAuth]);

  // Calculate the initial index based on the preferred model.
  const initialIndex = useMemo(() => {
    const index = modelOptions.findIndex(
      (option) => option.value === preferredModel,
    );
    return index >= 0 ? index : 0;
  }, [preferredModel, modelOptions]);

  // Handle selection internally (Autonomous Dialog).
  const handleSelect = useCallback(
    (model: string) => {
      if (config) {
        // If in custom auth mode and model is from a different provider, switch providers
        if (isCustomAuth) {
          let targetProvider: 'gemini' | 'openai' | 'claude' =
            currentProvider || 'gemini';

          if ((GEMINI_MODELS as readonly string[]).includes(model)) {
            targetProvider = 'gemini';
          } else if ((OPENAI_MODELS as readonly string[]).includes(model)) {
            targetProvider = 'openai';
          } else if ((CLAUDE_MODELS as readonly string[]).includes(model)) {
            targetProvider = 'claude';
          }

          // Switch provider in config if needed
          if (targetProvider !== currentProvider) {
            const authType =
              targetProvider === 'openai'
                ? AuthType.USE_OPENAI
                : targetProvider === 'claude'
                  ? AuthType.USE_CLAUDE
                  : AuthType.USE_GEMINI;
            config.refreshAuth(authType).catch((err) => {
              console.error('Failed to switch provider:', err);
            });
          }
        }

        config.setModel(model);
        const event = new ModelSlashCommandEvent(model);
        logModelSlashCommand(config, event);
      }
      onClose();
    },
    [config, onClose, isCustomAuth, currentProvider],
  );

  return (
    <Box
      borderStyle="round"
      borderColor={theme.border.default}
      flexDirection="column"
      padding={1}
      width="100%"
    >
      <Text bold>Select Model</Text>
      <Box marginTop={1}>
        <DescriptiveRadioButtonSelect
          items={modelOptions}
          onSelect={handleSelect}
          initialIndex={initialIndex}
          showNumbers={true}
        />
      </Box>
      <Box flexDirection="column">
        <Text color={theme.text.secondary}>
          {currentProvider === 'gemini'
            ? '> To use a specific Gemini model on startup, use the --model flag.'
            : `> Using ${currentProvider?.toUpperCase() || 'default'} models`}
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text color={theme.text.secondary}>(Press Esc to close)</Text>
      </Box>
    </Box>
  );
}
