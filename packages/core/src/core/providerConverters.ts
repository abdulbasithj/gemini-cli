/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  GenerateContentParameters,
  GenerateContentResponse,
} from '@google/genai';

/**
 * Convert Gemini GenerateContentParameters to OpenAI message format
 */
export function convertToOpenAIMessages(
  request: GenerateContentParameters,
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  if (request.contents) {
    const contents = Array.isArray(request.contents)
      ? request.contents
      : [request.contents];

    for (const content of contents) {
      // Handle different content formats
      const text = extractTextFromContent(content);

      if (text) {
        // Determine role - if content has 'role' property, use it
        const role =
          typeof content === 'object' && 'role' in content
            ? (content as Record<string, unknown>)['role'] === 'model'
              ? 'assistant'
              : 'user'
            : 'user';

        messages.push({
          role,
          content: text,
        });
      }
    }
  }

  return messages;
}

/**
 * Helper function to extract text from various content formats
 */
function extractTextFromContent(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (!content) return '';

  const contentObj = content as Record<string, unknown>;

  // Handle content with parts array
  if (Array.isArray(contentObj['parts'])) {
    return (contentObj['parts'] as unknown[])
      .map((p: unknown) => {
        if (typeof p === 'string') return p;
        if (
          p &&
          typeof p === 'object' &&
          'text' in (p as Record<string, unknown>)
        )
          return String((p as Record<string, unknown>)['text']);
        return '';
      })
      .join('');
  }

  // Handle direct text property
  if (typeof contentObj['text'] === 'string') {
    return contentObj['text'] as string;
  }

  return '';
}

/**
 * Convert OpenAI response to Gemini GenerateContentResponse format
 */
export function convertOpenAIResponse(
  response: Record<string, unknown>, // OpenAI ChatCompletion response
): GenerateContentResponse {
  const choice = (response['choices'] as Array<Record<string, unknown>>)?.[0];
  const text =
    ((choice?.['message'] as Record<string, unknown>)?.['content'] as string) ||
    '';

  return {
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

/**
 * Convert Gemini GenerateContentParameters to Claude message format
 */
export function convertToClaudeMessages(
  request: GenerateContentParameters,
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  if (request.contents) {
    const contents = Array.isArray(request.contents)
      ? request.contents
      : [request.contents];

    for (const content of contents) {
      const text = extractTextFromContent(content);

      if (text) {
        const role =
          typeof content === 'object' &&
          'role' in (content as Record<string, unknown>)
            ? (content as Record<string, unknown>)['role'] === 'model'
              ? 'assistant'
              : 'user'
            : 'user';

        messages.push({
          role,
          content: text,
        });
      }
    }
  }

  return messages;
}

/**
 * Convert Claude response to Gemini GenerateContentResponse format
 */
export function convertClaudeResponse(
  response: Record<string, unknown>, // Anthropic Message response
): GenerateContentResponse {
  const content = response['content'] as
    | Array<Record<string, unknown>>
    | undefined;
  const text =
    content?.[0]?.['type'] === 'text' ? String(content[0]['text']) : '';

  return {
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

/**
 * Extract text content from a GenerateContentParameters request
 */
export function extractTextFromRequest(
  request: GenerateContentParameters,
): string {
  const parts: string[] = [];

  if (request.contents) {
    const contents = Array.isArray(request.contents)
      ? request.contents
      : [request.contents];

    for (const content of contents) {
      const text = extractTextFromContent(content);
      if (text) parts.push(text);
    }
  }

  return parts.join('\n');
}
