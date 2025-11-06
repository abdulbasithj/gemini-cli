/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// ============================================================================
// GEMINI MODELS
// ============================================================================
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-pro';
export const DEFAULT_GEMINI_FLASH_MODEL = 'gemini-2.5-flash';
export const DEFAULT_GEMINI_FLASH_LITE_MODEL = 'gemini-2.5-flash-lite';

export const DEFAULT_GEMINI_MODEL_AUTO = 'auto';

export const DEFAULT_GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';

export const GEMINI_MODELS = [
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-exp',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
] as const;

// ============================================================================
// OPENAI MODELS
// ============================================================================
export const DEFAULT_OPENAI_MODEL = 'gpt-4-turbo';

export const OPENAI_MODELS = [
  'gpt-4-turbo',
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4',
  'gpt-3.5-turbo',
] as const;

// ============================================================================
// CLAUDE MODELS
// ============================================================================
export const DEFAULT_CLAUDE_MODEL = 'claude-3-5-sonnet-20241022';

export const CLAUDE_MODELS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20250219',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
] as const;

// ============================================================================
// VERTEX AI MODELS (Same as Gemini but via Vertex AI endpoint)
// ============================================================================
export const DEFAULT_VERTEX_AI_MODEL = 'gemini-2.5-pro';

export const VERTEX_AI_MODELS = GEMINI_MODELS;

// Cap the thinking at 8192 to prevent run-away thinking loops.
export const DEFAULT_THINKING_MODE = 8192;

/**
 * Get available models for a specific provider
 */
export function getModelsForProvider(
  provider: 'gemini' | 'openai' | 'claude' | 'vertex-ai',
): readonly string[] {
  switch (provider) {
    case 'openai':
      return OPENAI_MODELS;
    case 'claude':
      return CLAUDE_MODELS;
    case 'vertex-ai':
      return VERTEX_AI_MODELS;
    case 'gemini':
    default:
      return GEMINI_MODELS;
  }
}

/**
 * Get the default model for a specific provider
 */
export function getDefaultModelForProvider(
  provider: 'gemini' | 'openai' | 'claude' | 'vertex-ai',
): string {
  switch (provider) {
    case 'openai':
      return DEFAULT_OPENAI_MODEL;
    case 'claude':
      return DEFAULT_CLAUDE_MODEL;
    case 'vertex-ai':
      return DEFAULT_VERTEX_AI_MODEL;
    case 'gemini':
    default:
      return DEFAULT_GEMINI_MODEL;
  }
}

/**
 * Determines the effective model to use, applying fallback logic if necessary.
 *
 * When fallback mode is active, this function enforces the use of the standard
 * fallback model. However, it makes an exception for "lite" models (any model
 * with "lite" in its name), allowing them to be used to preserve cost savings.
 * This ensures that "pro" models are always downgraded, while "lite" model
 * requests are honored.
 *
 * @param isInFallbackMode Whether the application is in fallback mode.
 * @param requestedModel The model that was originally requested.
 * @returns The effective model name.
 */
export function getEffectiveModel(
  isInFallbackMode: boolean,
  requestedModel: string,
): string {
  // If we are not in fallback mode, simply use the requested model.
  if (!isInFallbackMode) {
    return requestedModel;
  }

  // If a "lite" model is requested, honor it. This allows for variations of
  // lite models without needing to list them all as constants.
  if (requestedModel.includes('lite')) {
    return requestedModel;
  }

  // Default fallback for Gemini CLI.
  return DEFAULT_GEMINI_FLASH_MODEL;
}
