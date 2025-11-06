/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  GenerateContentResponse,
  GenerateContentParameters,
  CountTokensResponse,
  CountTokensParameters,
  EmbedContentResponse,
  EmbedContentParameters,
} from '@google/genai';
import Anthropic from '@anthropic-ai/sdk';
import { debugLogger } from '../utils/debugLogger.js';
import type { ContentGenerator } from './contentGenerator.js';
import {
  convertToClaudeMessages,
  convertClaudeResponse,
  extractTextFromRequest,
} from './providerConverters.js';

/**
 * Claude Content Generator adapter that implements the ContentGenerator interface.
 */
export class ClaudeContentGenerator implements ContentGenerator {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-3-5-sonnet-20241022') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async generateContent(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<GenerateContentResponse> {
    debugLogger.log(
      `[Claude] generateContent called with model: ${this.model}, prompt ID: ${_userPromptId}`,
    );

    try {
      const messages = convertToClaudeMessages(request);
      const config = (request as Record<string, unknown>).config || {};

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: config.maxOutputTokens || 4096,
        messages,
      });

      debugLogger.log(`[Claude] Response received: ${response.stop_reason}`);
      return convertClaudeResponse(response);
    } catch (error) {
      debugLogger.error('[Claude] Error in generateContent:', error);
      throw new Error(
        `Claude API error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async generateContentStream(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    debugLogger.log(
      `[Claude] generateContentStream called with model: ${this.model}, prompt ID: ${_userPromptId}`,
    );

    try {
      const messages = convertToClaudeMessages(request);
      const config = (request as Record<string, unknown>).config || {};

      const stream = this.client.messages.stream({
        model: this.model,
        max_tokens: config.maxOutputTokens || 4096,
        messages,
      });

      return this.streamClaudeResponses(stream);
    } catch (error) {
      debugLogger.error('[Claude] Error in generateContentStream:', error);
      throw new Error(
        `Claude API error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async *streamClaudeResponses(
    stream: AsyncIterable<Record<string, unknown>>,
  ): AsyncGenerator<GenerateContentResponse> {
    let currentText = '';

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta;
        if (delta.type === 'text_delta') {
          currentText += delta.text;
          yield {
            candidates: [
              {
                content: {
                  parts: [{ text: currentText }],
                  role: 'model',
                },
              },
            ],
          } as GenerateContentResponse;
        }
      }
    }
  }

  async countTokens(
    request: CountTokensParameters,
  ): Promise<CountTokensResponse> {
    debugLogger.log('[Claude] countTokens called');

    try {
      const messages = convertToClaudeMessages(request);

      // Use the count_tokens method on the model
      const response = (await (
        this.client as Record<string, unknown>
      ).beta.messages.countTokens(
        {
          model: this.model,
          messages,
        },
        {
          headers: {
            'anthropic-beta': 'token-counting-2025-11-01',
          },
        },
      )) as Record<string, number>;

      debugLogger.log(`[Claude] Token count: ${response.input_tokens}`);
      return {
        totalTokens: response.input_tokens,
      };
    } catch (error) {
      debugLogger.error('[Claude] Error in countTokens:', error);
      // Fallback to estimation
      const text = extractTextFromRequest(request);
      const estimatedTokens = Math.ceil(text.length / 4);
      return { totalTokens: estimatedTokens };
    }
  }

  async embedContent(
    _request: EmbedContentParameters,
  ): Promise<EmbedContentResponse> {
    debugLogger.log('[Claude] embedContent called');

    throw new Error(
      'Claude does not support embeddings. Consider using Gemini or OpenAI for embedding requests.',
    );
  }
}
