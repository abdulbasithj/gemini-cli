/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { HybridTokenStorage } from '../mcp/token-storage/hybrid-token-storage.js';
import type { OAuthCredentials } from '../mcp/token-storage/types.js';
import { debugLogger } from '../utils/debugLogger.js';

const KEYCHAIN_SERVICE_NAME = 'gemini-cli-api-key';
const DEFAULT_API_KEY_ENTRY = 'default-api-key';
const PROVIDER_API_KEY_PREFIX = 'provider-api-key';

const storage = new HybridTokenStorage(KEYCHAIN_SERVICE_NAME);

type Provider = 'gemini' | 'openai' | 'claude';

/**
 * Get the storage entry key for a provider
 */
function getProviderEntryKey(provider: Provider = 'gemini'): string {
  return `${PROVIDER_API_KEY_PREFIX}-${provider}`;
}

/**
 * Load cached API key
 */
export async function loadApiKey(
  provider: Provider = 'gemini',
): Promise<string | null> {
  try {
    // Try new provider-specific entry first
    const entryKey = getProviderEntryKey(provider);
    const credentials = await storage.getCredentials(entryKey);

    if (credentials?.token?.accessToken) {
      return credentials.token.accessToken;
    }

    // Fallback to default entry for backward compatibility (only for gemini)
    if (provider === 'gemini') {
      const defaultCredentials = await storage.getCredentials(
        DEFAULT_API_KEY_ENTRY,
      );
      if (defaultCredentials?.token?.accessToken) {
        return defaultCredentials.token.accessToken;
      }
    }

    return null;
  } catch (error: unknown) {
    // Log other errors but don't crash, just return null so user can re-enter key
    debugLogger.error(
      `Failed to load API key for ${provider} from storage:`,
      error,
    );
    return null;
  }
}

/**
 * Save API key
 */
export async function saveApiKey(
  apiKey: string | null | undefined,
  provider: Provider = 'gemini',
): Promise<void> {
  if (!apiKey || apiKey.trim() === '') {
    try {
      const entryKey = getProviderEntryKey(provider);
      await storage.deleteCredentials(entryKey);

      // Also clean up default entry if this is gemini
      if (provider === 'gemini') {
        await storage.deleteCredentials(DEFAULT_API_KEY_ENTRY);
      }
    } catch (error: unknown) {
      // Ignore errors when deleting, as it might not exist
      debugLogger.warn(
        `Failed to delete ${provider} API key from storage:`,
        error,
      );
    }
    return;
  }

  // Wrap API key in OAuthCredentials format as required by HybridTokenStorage
  const entryKey = getProviderEntryKey(provider);
  const credentials: OAuthCredentials = {
    serverName: entryKey,
    token: {
      accessToken: apiKey,
      tokenType: 'ApiKey',
    },
    updatedAt: Date.now(),
  };

  await storage.setCredentials(credentials);
}

/**
 * Clear cached API key
 */
export async function clearApiKey(
  provider: Provider = 'gemini',
): Promise<void> {
  try {
    const entryKey = getProviderEntryKey(provider);
    await storage.deleteCredentials(entryKey);

    // Also clean up default entry if this is gemini
    if (provider === 'gemini') {
      await storage.deleteCredentials(DEFAULT_API_KEY_ENTRY);
    }
  } catch (error: unknown) {
    debugLogger.error(
      `Failed to clear ${provider} API key from storage:`,
      error,
    );
  }
}
