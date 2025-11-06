/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthType } from '@google/gemini-cli-core';
import { loadEnvironment, loadSettings } from './settings.js';

export function validateAuthMethod(authMethod: string): string | null {
  loadEnvironment(loadSettings().merged);
  if (
    authMethod === AuthType.LOGIN_WITH_GOOGLE ||
    authMethod === AuthType.CLOUD_SHELL
  ) {
    return null;
  }

  if (authMethod === AuthType.USE_GEMINI) {
    return null;
  }

  if (authMethod === AuthType.USE_OPENAI) {
    return null;
  }

  if (authMethod === AuthType.USE_CLAUDE) {
    return null;
  }

  if (authMethod === AuthType.USE_VERTEX_AI) {
    const hasVertexProjectLocationConfig =
      !!process.env['GOOGLE_CLOUD_PROJECT'] &&
      !!process.env['GOOGLE_CLOUD_LOCATION'];
    const hasGoogleApiKey = !!process.env['GOOGLE_API_KEY'];
    if (!hasVertexProjectLocationConfig && !hasGoogleApiKey) {
      return (
        'When using Vertex AI, you must specify either:\n' +
        '• GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION environment variables.\n' +
        '• GOOGLE_API_KEY environment variable (if using express mode).\n' +
        'Update your environment and try again (no reload needed if using .env)!'
      );
    }
    return null;
  }

  if (authMethod === AuthType.CUSTOM_AUTH) {
    // For custom auth, check if any API key is available for fallback
    const hasGeminiKey = !!process.env['GEMINI_API_KEY'];
    const hasOpenaiKey = !!process.env['OPENAI_API_KEY'];
    const hasClaudeKey = !!process.env['CLAUDE_API_KEY'];

    if (!hasGeminiKey && !hasOpenaiKey && !hasClaudeKey) {
      return (
        'Custom auth requires at least one API key to be set:\n' +
        '• GEMINI_API_KEY\n' +
        '• OPENAI_API_KEY\n' +
        '• CLAUDE_API_KEY\n' +
        'Update your environment and try again (no reload needed if using .env)!'
      );
    }
    return null;
  }

  return 'Invalid auth method selected.';
}
