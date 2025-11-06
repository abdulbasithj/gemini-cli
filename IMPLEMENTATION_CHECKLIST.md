# Multi-Provider Authentication - Implementation Checklist

## Completed ✅

### Core Authentication Types

- [x] Extended `AuthType` enum with `USE_OPENAI` and `USE_CLAUDE`
- [x] Updated `ContentGeneratorConfig` with provider field
- [x] Modified `createContentGeneratorConfig()` to load provider-specific API
      keys

### API Key Storage

- [x] Enhanced `apiKeyCredentialStorage.ts` for multi-provider support
- [x] `loadApiKey(provider)` - Load API key for specific provider
- [x] `saveApiKey(apiKey, provider)` - Save API key per provider
- [x] `clearApiKey(provider)` - Clear API key per provider
- [x] Backward compatibility for legacy Gemini key storage

### Authentication Validation

- [x] Updated `validateAuthMethod()` in `packages/cli/src/config/auth.ts`
- [x] Support for `USE_OPENAI` and `USE_CLAUDE` auth types
- [x] Enhanced `CUSTOM_AUTH` validation to check for any available API key
- [x] Clear error messages for missing keys

### User Interface

- [x] Added "Use OpenAI API Key" option to AuthDialog
- [x] Added "Use Claude API Key" option to AuthDialog
- [x] Updated Custom Auth description in AuthDialog
- [x] Made ApiAuthDialog provider-aware with dynamic titles and URLs
- [x] Provider configuration mapping (title, description, URL per provider)

### Authentication Logic

- [x] Created provider detection functions in `useAuth.ts`
- [x] Updated `reloadApiKey()` to accept provider parameter
- [x] Modified `useEffect` to handle all provider types
- [x] Added `currentProvider` state tracking
- [x] Updated `validateAuthMethodWithSettings()` for new auth types

### State Management

- [x] Added `apiKeyProvider` to `UIState` interface
- [x] Updated `AppContainer` to track and pass provider
- [x] Modified `handleApiKeySubmit` to use provider-specific logic
- [x] Updated `DialogManager` to pass provider to `ApiAuthDialog`

### API Key Handling

- [x] Provider-specific environment variable support:
  - [x] `GEMINI_API_KEY`
  - [x] `OPENAI_API_KEY`
  - [x] `CLAUDE_API_KEY`
- [x] Automatic provider detection from auth type
- [x] Proper key loading order (stored key → env variable)

## Testing Recommendations ⚠️

### Unit Tests Needed

- [ ] Test `loadApiKey()` for each provider
- [ ] Test `saveApiKey()` for each provider
- [ ] Test `clearApiKey()` for each provider
- [ ] Test `validateAuthMethod()` with new auth types
- [ ] Test provider detection functions

### Integration Tests Needed

- [ ] Test full auth flow with Gemini API key
- [ ] Test full auth flow with OpenAI API key
- [ ] Test full auth flow with Claude API key
- [ ] Test custom auth fallback (try Gemini first, then OpenAI, then Claude)
- [ ] Test auth selection UI with all options
- [ ] Test key storage persistence across sessions

### Manual Testing Needed

- [ ] Launch CLI with only `GEMINI_API_KEY` set
- [ ] Launch CLI with only `OPENAI_API_KEY` set
- [ ] Launch CLI with only `CLAUDE_API_KEY` set
- [ ] Launch CLI with all three keys set
- [ ] Select each provider option from menu
- [ ] Verify correct prompts/URLs shown for each provider
- [ ] Verify keys are stored in system keychain
- [ ] Test custom auth with different key combinations
- [ ] Test fallback behavior (custom auth trying multiple providers)

## API Calls to Handle 🚀

Once this is deployed, you'll need to:

1. **For OpenAI requests** - Create wrapper that uses OpenAI API format
   - Endpoint: `https://api.openai.com/v1/chat/completions`
   - Auth: Bearer token in header
   - Model format: `gpt-4`, `gpt-3.5-turbo`, etc.

2. **For Claude requests** - Create wrapper for Anthropic API
   - Endpoint: `https://api.anthropic.com/v1/messages`
   - Auth: Bearer token in header
   - Model format: `claude-3-opus-20240229`, etc.

3. **For Gemini requests** - Already implemented ✅

## Environment Variable Setup

Users should configure:

```bash
# For Gemini (default)
export GEMINI_API_KEY="your-gemini-api-key"

# For OpenAI (fallback option)
export OPENAI_API_KEY="your-openai-api-key"

# For Claude (fallback option)
export CLAUDE_API_KEY="your-claude-api-key"
```

## Files to Review/Test

Critical files modified:

1. ✅ `packages/core/src/core/contentGenerator.ts`
2. ✅ `packages/core/src/core/apiKeyCredentialStorage.ts`
3. ✅ `packages/cli/src/config/auth.ts`
4. ✅ `packages/cli/src/ui/auth/AuthDialog.tsx`
5. ✅ `packages/cli/src/ui/auth/ApiAuthDialog.tsx`
6. ✅ `packages/cli/src/ui/auth/useAuth.ts`
7. ✅ `packages/cli/src/ui/contexts/UIStateContext.tsx`
8. ✅ `packages/cli/src/ui/AppContainer.tsx`
9. ✅ `packages/cli/src/ui/components/DialogManager.tsx`

## Known Limitations & Considerations

1. **API Call Implementations**: OpenAI and Claude API wrappers still need to be
   created
   - This uses Gemini's `GoogleGenAI` client currently
   - Need separate clients for other providers

2. **Custom Auth Behavior**: Currently defaults to Gemini
   - Could enhance with user preference for default provider
   - Or auto-detect best available provider

3. **Error Handling**: Provider-specific error messages could be enhanced
   - Currently generic error messages
   - Consider provider-specific error codes/messages

4. **Model Compatibility**: Different providers have different model names
   - Gemini: `gemini-2.0-flash`, `gemini-1.5-pro`
   - OpenAI: `gpt-4`, `gpt-3.5-turbo`
   - Claude: `claude-3-opus-20240229`
   - May need model mapping layer

## Next Steps

1. ✅ **Completed**: Multi-provider auth system implemented
2. ⏳ **Next**: Run full test suite
3. ⏳ **Next**: Create API wrappers for OpenAI and Claude
4. ⏳ **Next**: Handle provider-specific API calls
5. ⏳ **Next**: Implement error handling per provider
6. ⏳ **Next**: Add user documentation
7. ⏳ **Next**: Deploy and monitor usage

## Quick Start for Testing

```bash
cd /root/geminicli/gemini-cli

# Set test keys
export GEMINI_API_KEY="test-gemini-key"
export OPENAI_API_KEY="test-openai-key"
export CLAUDE_API_KEY="test-claude-key"

# Build (if needed)
npm run build

# Run CLI
npm run start

# Then in the UI, try selecting each auth option
```

---

**Status**: Implementation Complete ✅ **Ready for**: Integration testing and
API wrapper implementation
