/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import type { LoadedSettings } from '../../config/settings.js';
import {
  AuthType,
  type Config,
  loadApiKey,
  debugLogger,
} from '@google/gemini-cli-core';
import { getErrorMessage } from '@google/gemini-cli-core';
import { AuthState } from '../types.js';
import { SettingScope } from '../../config/settings.js';
import { validateAuthMethod } from '../../config/auth.js';

export function validateAuthMethodWithSettings(
  authType: AuthType,
  settings: LoadedSettings,
): string | null {
  const enforcedType = settings.merged.security?.auth?.enforcedType;
  if (enforcedType && enforcedType !== authType) {
    return `Authentication is enforced to be ${enforcedType}, but you are currently using ${authType}.`;
  }
  if (settings.merged.security?.auth?.useExternal) {
    return null;
  }
  // If using API keys, we don't validate them here as we might need to prompt for them.
  if (
    authType === AuthType.USE_GEMINI ||
    authType === AuthType.USE_OPENAI ||
    authType === AuthType.USE_CLAUDE
  ) {
    return null;
  }
  return validateAuthMethod(authType);
}

type Provider = 'gemini' | 'openai' | 'claude';

function getProviderFromAuthType(authType: AuthType): Provider {
  if (authType === AuthType.USE_OPENAI) {
    return 'openai';
  }
  if (authType === AuthType.USE_CLAUDE) {
    return 'claude';
  }
  return 'gemini';
}

function getEnvKeyForProvider(provider: Provider): string {
  if (provider === 'openai') {
    return process.env['OPENAI_API_KEY'] ?? '';
  }
  if (provider === 'claude') {
    return process.env['CLAUDE_API_KEY'] ?? '';
  }
  return process.env['GEMINI_API_KEY'] ?? '';
}

export const useAuthCommand = (settings: LoadedSettings, config: Config) => {
  const [authState, setAuthState] = useState<AuthState>(
    AuthState.Unauthenticated,
  );

  const [authError, setAuthError] = useState<string | null>(null);
  const [apiKeyDefaultValue, setApiKeyDefaultValue] = useState<
    string | undefined
  >(undefined);
  const [currentProvider, setCurrentProvider] = useState<Provider>('gemini');
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [isSelectingModel, setIsSelectingModel] = useState<boolean>(false);
  const [isSelectingProvider, setIsSelectingProvider] =
    useState<boolean>(false);

  const onAuthError = useCallback(
    (error: string | null) => {
      setAuthError(error);
      if (error) {
        setAuthState(AuthState.Updating);
      }
    },
    [setAuthError, setAuthState],
  );

  const reloadApiKey = useCallback(async (provider: Provider = 'gemini') => {
    const storedKey = (await loadApiKey(provider)) ?? '';
    const envKey = getEnvKeyForProvider(provider);
    const key = storedKey || envKey;
    setApiKeyDefaultValue(key);
    setCurrentProvider(provider);
    return key; // Return the key for immediate use
  }, []);

  const saveModelSelection = useCallback(
    async (model: string, provider: Provider) => {
      try {
        const providerModels = settings.merged.model?.providerModels || {};
        providerModels[provider] = model;
        await settings.setValue(
          SettingScope.User,
          'model.providerModels',
          providerModels,
        );
        setSelectedModel(model);
      } catch (error) {
        debugLogger.error('Failed to save model selection:', error);
      }
    },
    [settings],
  );

  useEffect(() => {
    (async () => {
      if (authState !== AuthState.Unauthenticated) {
        return;
      }

      const authType = settings.merged.security?.auth?.selectedType;
      if (!authType) {
        if (process.env['GEMINI_API_KEY']) {
          onAuthError(
            'Existing API key detected (GEMINI_API_KEY). Select "Gemini API Key" option to use it.',
          );
        } else {
          onAuthError('No authentication method selected.');
        }
        return;
      }

      if (
        authType === AuthType.USE_GEMINI ||
        authType === AuthType.USE_OPENAI ||
        authType === AuthType.USE_CLAUDE ||
        authType === AuthType.CUSTOM_AUTH
      ) {
        const provider = getProviderFromAuthType(authType);
        const key = await reloadApiKey(provider);
        if (!key) {
          setAuthState(AuthState.AwaitingApiKeyInput);
          return;
        }
      }

      const error = validateAuthMethodWithSettings(authType, settings);
      if (error) {
        onAuthError(error);
        return;
      }

      const defaultAuthType = process.env['GEMINI_DEFAULT_AUTH_TYPE'];
      if (
        defaultAuthType &&
        !Object.values(AuthType).includes(defaultAuthType as AuthType)
      ) {
        onAuthError(
          `Invalid value for GEMINI_DEFAULT_AUTH_TYPE: "${defaultAuthType}". ` +
            `Valid values are: ${Object.values(AuthType).join(', ')}.`,
        );
        return;
      }

      try {
        await config.refreshAuth(authType);

        debugLogger.log(`Authenticated via "${authType}".`);
        setAuthError(null);
        setAuthState(AuthState.Authenticated);
      } catch (e) {
        onAuthError(`Failed to login. Message: ${getErrorMessage(e)}`);
      }
    })();
  }, [
    settings,
    config,
    authState,
    setAuthState,
    setAuthError,
    onAuthError,
    reloadApiKey,
  ]);

  return {
    authState,
    setAuthState,
    authError,
    onAuthError,
    apiKeyDefaultValue,
    reloadApiKey,
    currentProvider,
    setCurrentProvider,
    selectedModel,
    saveModelSelection,
    isSelectingModel,
    setIsSelectingModel,
    isSelectingProvider,
    setIsSelectingProvider,
  };
};
