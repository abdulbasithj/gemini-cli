/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SlashCommand } from './types.js';
import { CommandKind } from './types.js';
import { MessageType } from '../types.js';

export const helloWorldCommand: SlashCommand = {
  name: 'helloWorld',
  description: 'Testing Hello World command',
  kind: CommandKind.BUILT_IN,
  action: async (context, _args) => {
    const geminiClient = context.services.config?.getGeminiClient();

    const messageContent = geminiClient
      ? 'Hai Abdul! The Hello World Command is working!'
      : 'No Gemini client found.';
    context.ui.addItem(
      {
        type: MessageType.INFO,
        text: messageContent,
      },
      Date.now(),
    );
  },
};
