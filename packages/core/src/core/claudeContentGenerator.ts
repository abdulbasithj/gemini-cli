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
import { DEFAULT_CLAUDE_MODEL } from '../config/models.js';
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

  constructor(apiKey: string, model: string = DEFAULT_CLAUDE_MODEL) {
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
      const config =
        ((request as unknown as Record<string, unknown>)['config'] as Record<
          string,
          unknown
        >) || {};

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: (config['maxOutputTokens'] as number) || 4096,
        messages,
      });

      debugLogger.log(`[Claude] Response received: ${response.stop_reason}`);
      return convertClaudeResponse(
        response as unknown as Record<string, unknown>,
      );
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
      const config =
        ((request as unknown as Record<string, unknown>)['config'] as Record<
          string,
          unknown
        >) || {};

      const stream = this.client.messages.stream({
        model: this.model,
        max_tokens: (config['maxOutputTokens'] as number) || 4096,
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
    stream: AsyncIterable<unknown>,
  ): AsyncGenerator<GenerateContentResponse> {
    for await (const event of stream) {
      if (
        (event as Record<string, unknown>)['type'] === 'content_block_delta'
      ) {
        const delta = (event as Record<string, unknown>)['delta'] as Record<
          string,
          unknown
        >;
        if (delta['type'] === 'text_delta') {
          const text = String(delta['text']);
          yield {
            candidates: [
              {
                content: {
                  parts: [{ text }],
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
      const clientRecord = this.client as unknown as Record<
        string,
        Record<string, Record<string, (...args: unknown[]) => unknown>>
      >;
      const responseObj = await (
        clientRecord['beta']['messages']['countTokens'] as (
          ...args: unknown[]
        ) => unknown
      )(
        {
          model: this.model,
          messages,
        },
        {
          headers: {
            'anthropic-beta': 'token-counting-2025-11-01',
          },
        },
      );
      const response = responseObj as Record<string, unknown>;

      debugLogger.log(`[Claude] Token count: ${response['input_tokens']}`);
      return {
        totalTokens: response['input_tokens'] as number,
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
