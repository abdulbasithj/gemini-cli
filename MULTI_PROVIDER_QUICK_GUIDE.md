# Multi-Provider Support - Quick Developer Guide

## Quick Start for Adding Full OpenAI Integration

### 1. Install OpenAI SDK

```bash
cd packages/core
npm install openai
```

### 2. Update `openaiContentGenerator.ts`

Replace the stub implementation with actual API calls:

```typescript
import OpenAI from 'openai';

export class OpenAIContentGenerator implements ContentGenerator {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-4-turbo') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async generateContent(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<GenerateContentResponse> {
    // Convert request to OpenAI format
    const messages = convertToOpenAIMessages(request);

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      max_tokens: request.maxOutputTokens,
    });

    // Convert OpenAI response back to GenerateContentResponse
    return convertOpenAIResponse(response);
  }

  async generateContentStream(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const messages = convertToOpenAIMessages(request);

    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages,
      max_tokens: request.maxOutputTokens,
      stream: true,
    });

    return streamOpenAIResponses(stream);
  }

  async countTokens(
    request: CountTokensParameters,
  ): Promise<CountTokensResponse> {
    // Use tiktoken or OpenAI's token counting API
    const encoding = getEncoding('cl100k_base');
    const tokens = encoding.encode(request.contents.toString());
    return { totalTokens: tokens.length };
  }
}
```

### 3. Test OpenAI Integration

```bash
cd packages/cli
OPENAI_API_KEY=sk-... npm run start
# Select "Use OpenAI API Key" auth method
# Select "gpt-4-turbo" model
# Try a prompt
```

---

## Quick Start for Adding Full Claude Integration

### 1. Install Claude SDK

```bash
cd packages/core
npm install @anthropic-ai/sdk
```

### 2. Update `claudeContentGenerator.ts`

Replace the stub implementation with actual API calls:

```typescript
import Anthropic from '@anthropic-ai/sdk';

export class ClaudeContentGenerator implements ContentGenerator {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-3-5-sonnet-20241022') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async generateContent(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<GenerateContentResponse> {
    // Convert request to Claude format
    const messages = convertToClaudeMessages(request);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: request.maxOutputTokens,
      messages,
    });

    // Convert Claude response back to GenerateContentResponse
    return convertClaudeResponse(response);
  }

  async generateContentStream(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const messages = convertToClaudeMessages(request);

    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: request.maxOutputTokens,
      messages,
    });

    return streamClaudeResponses(stream);
  }

  async countTokens(
    request: CountTokensParameters,
  ): Promise<CountTokensResponse> {
    const response = await this.client.messages.countTokens({
      model: this.model,
      messages: convertToClaudeMessages(request),
    });
    return { totalTokens: response.input_tokens };
  }
}
```

### 3. Test Claude Integration

```bash
cd packages/cli
CLAUDE_API_KEY=sk-ant-... npm run start
# Select "Use Claude API Key" auth method
# Select "claude-3-5-sonnet-20241022" model
# Try a prompt
```

---

## File Structure Reference

### Model Definitions

- `packages/core/src/config/models.ts` - Provider model constants and utilities

### Content Generators

- `packages/core/src/core/contentGenerator.ts` - Factory and routing
- `packages/core/src/core/openaiContentGenerator.ts` - OpenAI adapter
- `packages/core/src/core/claudeContentGenerator.ts` - Claude adapter

### Authentication UI

- `packages/cli/src/ui/auth/AuthDialog.tsx` - Provider selection
- `packages/cli/src/ui/auth/ApiAuthDialog.tsx` - API key input
- `packages/cli/src/ui/auth/ModelSelectionDialog.tsx` - Model selection
- `packages/cli/src/ui/auth/useAuth.ts` - Auth state management

### Settings

- `packages/cli/src/config/settingsSchema.ts` - Settings definition with
  `providerModels`

---

## Key Data Structures

### AuthType Enum

```typescript
export enum AuthType {
  LOGIN_WITH_GOOGLE = 'oauth-personal',
  USE_GEMINI = 'gemini-api-key',
  USE_OPENAI = 'openai-api-key',
  USE_CLAUDE = 'claude-api-key',
  USE_VERTEX_AI = 'vertex-ai',
  CLOUD_SHELL = 'cloud-shell',
  CUSTOM_AUTH = 'custom-auth',
}
```

### ContentGeneratorConfig

```typescript
export type ContentGeneratorConfig = {
  apiKey?: string;
  vertexai?: boolean;
  authType?: AuthType;
  proxy?: string;
  provider?: 'gemini' | 'openai' | 'claude';
  model?: string; // NEW: Selected model
};
```

### AuthState Enum

```typescript
export enum AuthState {
  Unauthenticated = 'unauthenticated',
  Updating = 'updating',
  AwaitingApiKeyInput = 'awaiting_api_key_input',
  SelectingModel = 'selecting_model', // NEW
  Authenticated = 'authenticated',
}
```

---

## Model Lookup Functions

### Get models for a provider

```typescript
import { getModelsForProvider } from '@google/gemini-cli-core';

const openaiModels = getModelsForProvider('openai');
// Returns: ['gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini', ...]
```

### Get default model for a provider

```typescript
import { getDefaultModelForProvider } from '@google/gemini-cli-core';

const defaultClaude = getDefaultModelForProvider('claude');
// Returns: 'claude-3-5-sonnet-20241022'
```

---

## Settings Access

### Get saved model selection

```typescript
// In React component with settings
const savedOpenAIModel = settings.merged.model?.providerModels?.['openai'];
```

### Save model selection

```typescript
import { SettingScope } from './config/settings';

const providerModels = settings.merged.model?.providerModels || {};
providerModels['openai'] = 'gpt-4o';
await settings.setValue(
  SettingScope.User,
  'model.providerModels',
  providerModels,
);
```

---

## Testing Patterns

### Test Model Selection

```typescript
// In auth flow test
const { getByText } = render(<ModelSelectionDialog
  provider="openai"
  onSelect={jest.fn()}
  onCancel={jest.fn()}
/>);

expect(getByText('gpt-4-turbo (recommended)')).toBeInTheDocument();
```

### Test Content Generator Routing

```typescript
const config: ContentGeneratorConfig = {
  authType: AuthType.USE_OPENAI,
  apiKey: 'test-key',
  model: 'gpt-4o',
  provider: 'openai',
};

const generator = await createContentGenerator(config, gcConfig);
expect(generator).toBeInstanceOf(LoggingContentGenerator);
```

---

## Common Issues & Solutions

### Issue: Model not saving to settings

**Solution:** Ensure `SettingScope.User` is used and settings.setValue() is
awaited

### Issue: Wrong provider being selected

**Solution:** Check `getProviderFromAuthType()` returns correct mapping

### Issue: Content generator type mismatch

**Solution:** Verify `CreateContentGeneratorConfig` has `model` field populated

### Issue: Model not available in dropdown

**Solution:** Check if model is defined in the provider's model constant array

---

## Environment Variables for Testing

```bash
# Gemini
export GEMINI_API_KEY=your-gemini-key

# OpenAI
export OPENAI_API_KEY=sk-your-openai-key

# Claude
export CLAUDE_API_KEY=sk-ant-your-claude-key

# Default provider
export GEMINI_DEFAULT_AUTH_TYPE=openai-api-key
```

---

## Next Phase: CUSTOM_AUTH Enhancement

For enabling runtime provider selection with CUSTOM_AUTH:

1. Add provider selection to CUSTOM_AUTH flow in `AuthDialog.tsx`
2. Update `useAuth.ts` to handle provider selection in CUSTOM_AUTH mode
3. Create new `ProviderSelectionDialog.tsx` component
4. Update `createContentGeneratorConfig()` to check for selected provider in
   CUSTOM_AUTH

See TODO section in main IMPLEMENTATION_SUMMARY.md for details.
