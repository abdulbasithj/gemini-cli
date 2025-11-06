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
import OpenAI from 'openai';
import { debugLogger } from '../utils/debugLogger.js';
import { DEFAULT_OPENAI_MODEL } from '../config/models.js';
import type { ContentGenerator } from './contentGenerator.js';
import {
  convertToOpenAIMessages,
  convertOpenAIResponse,
  extractTextFromRequest,
} from './providerConverters.js';

/**
 * OpenAI Content Generator adapter that implements the ContentGenerator interface.
 */
export class OpenAIContentGenerator implements ContentGenerator {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = DEFAULT_OPENAI_MODEL) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async generateContent(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<GenerateContentResponse> {
    debugLogger.log(
      `[OpenAI] generateContent called with model: ${this.model}, prompt ID: ${_userPromptId}`,
    );

    try {
      const messages = convertToOpenAIMessages(request);
      const config =
        ((request as unknown as Record<string, unknown>)['config'] as Record<
          string,
          unknown
        >) || {};

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        max_tokens: (config['maxOutputTokens'] as number) || 4096,
        temperature: config['temperature'] as number,
        top_p: config['topP'] as number,
      });

      debugLogger.log(
        `[OpenAI] Response received: ${response.choices?.[0]?.finish_reason}`,
      );
      return convertOpenAIResponse(
        response as unknown as Record<string, unknown>,
      );
    } catch (error) {
      debugLogger.error('[OpenAI] Error in generateContent:', error);
      throw new Error(
        `OpenAI API error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async generateContentStream(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    debugLogger.log(
      `[OpenAI] generateContentStream called with model: ${this.model}, prompt ID: ${_userPromptId}`,
    );

    try {
      const messages = convertToOpenAIMessages(request);
      const config =
        ((request as unknown as Record<string, unknown>)['config'] as Record<
          string,
          unknown
        >) || {};

      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages,
        max_tokens: (config['maxOutputTokens'] as number) || 4096,
        temperature: config['temperature'] as number,
        top_p: config['topP'] as number,
        stream: true,
      });

      return this.streamOpenAIResponses(stream);
    } catch (error) {
      debugLogger.error('[OpenAI] Error in generateContentStream:', error);
      throw new Error(
        `OpenAI API error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async *streamOpenAIResponses(
    stream: AsyncIterable<unknown>,
  ): AsyncGenerator<GenerateContentResponse> {
    let currentText = '';

    for await (const chunk of stream) {
      const chunkRecord = chunk as unknown as Record<string, unknown>;
      const choices = chunkRecord['choices'] as
        | Array<Record<string, unknown>>
        | undefined;
      const delta = (choices?.[0]?.['delta'] as Record<string, unknown>)?.[
        'content'
      ];
      if (delta) {
        currentText += String(delta);
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

  async countTokens(
    request: CountTokensParameters,
  ): Promise<CountTokensResponse> {
    debugLogger.log('[OpenAI] countTokens called');

    try {
      // OpenAI doesn't provide a direct token counting API
      // We use a simple heuristic: ~4 characters per token for English
      const text = extractTextFromRequest(request);
      const estimatedTokens = Math.ceil(text.length / 4);

      debugLogger.log(
        `[OpenAI] Estimated tokens: ${estimatedTokens} (based on text length)`,
      );
      return {
        totalTokens: estimatedTokens,
      };
    } catch (error) {
      debugLogger.error('[OpenAI] Error in countTokens:', error);
      // Return a safe default on error
      return { totalTokens: 1000 };
    }
  }

  async embedContent(
    request: EmbedContentParameters,
  ): Promise<EmbedContentResponse> {
    debugLogger.log('[OpenAI] embedContent called');

    try {
      const requestRecord = request as unknown as Record<string, unknown>;
      const content = requestRecord['contents'] || requestRecord['content'];
      let text = '';

      if (typeof content === 'string') {
        text = content;
      } else if (Array.isArray(content)) {
        text = (content as unknown[])
          .map((p: unknown) =>
            typeof p === 'string'
              ? p
              : (p as Record<string, unknown>)['text']
                ? (p as Record<string, unknown>)['text']
                : '',
          )
          .join('');
      } else if (content && typeof content === 'object') {
        const contentObj = content as Record<string, unknown>;
        if (Array.isArray(contentObj['parts'])) {
          text = (contentObj['parts'] as unknown[])
            .map((p: unknown) =>
              typeof p === 'string'
                ? p
                : (p as Record<string, unknown>)['text']
                  ? (p as Record<string, unknown>)['text']
                  : '',
            )
            .join('');
        } else if ('text' in contentObj) {
          text = String(contentObj['text']);
        }
      }

      if (!text) {
        throw new Error('No text content to embed');
      }

      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      const embedding = response.data?.[0]?.embedding || [];

      return {
        embeddings: [
          {
            values: embedding,
          },
        ],
      } as EmbedContentResponse;
    } catch (error) {
      debugLogger.error('[OpenAI] Error in embedContent:', error);
      throw new Error(
        `OpenAI embedding error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
