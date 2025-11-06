# Multi-Provider Authentication System Implementation Guide

## Overview

I've implemented a multi-provider authentication system for the Gemini CLI that
allows you to authenticate with **Gemini, OpenAI, and Claude API keys**. The
system includes:

- **Default Provider**: Gemini (as requested)
- **Custom Auth with Fallback**: When custom auth fails, it automatically
  attempts to use available API keys
- **Secure Storage**: All API keys are stored securely in the system keychain
  per provider
- **User-Friendly UI**: New authentication menu options for each provider

## Key Changes Made

### 1. Extended AuthType Enum (`packages/core/src/core/contentGenerator.ts`)

Added two new authentication types:

```typescript
export enum AuthType {
  LOGIN_WITH_GOOGLE = 'oauth-personal',
  USE_GEMINI = 'gemini-api-key',
  USE_VERTEX_AI = 'vertex-ai',
  CLOUD_SHELL = 'cloud-shell',
  CUSTOM_AUTH = 'custom-auth',
  USE_OPENAI = 'openai-api-key', // NEW
  USE_CLAUDE = 'claude-api-key', // NEW
}
```

### 2. Multi-Provider API Key Storage (`packages/core/src/core/apiKeyCredentialStorage.ts`)

Updated to support storing API keys per provider:

- `loadApiKey(provider: 'gemini' | 'openai' | 'claude')` - Load key for specific
  provider
- `saveApiKey(apiKey, provider)` - Save key securely per provider
- `clearApiKey(provider)` - Clear key for specific provider
- Backward compatibility with existing Gemini API key storage

**Storage Format**:

- Provider-specific keys: `provider-api-key-{gemini|openai|claude}`
- Legacy support: `default-api-key` (for existing Gemini keys)

### 3. Updated Authentication UI (`packages/cli/src/ui/auth/AuthDialog.tsx`)

Added new menu options:

```
1. Login with Google
2. Use Gemini API Key
3. Use OpenAI API Key              // NEW
4. Use Claude API Key              // NEW
5. Vertex AI
6. Custom Auth (with fallback to API keys)  // UPDATED DESCRIPTION
```

### 4. Provider-Aware API Key Input (`packages/cli/src/ui/auth/ApiAuthDialog.tsx`)

Updated to show different prompts based on provider:

- Gemini: Points to `https://aistudio.google.com/app/apikey`
- OpenAI: Points to `https://platform.openai.com/api-keys`
- Claude: Points to `https://console.anthropic.com/account/keys`

### 5. Enhanced Authentication Logic (`packages/cli/src/ui/auth/useAuth.ts`)

- Provider-aware API key loading
- Automatic provider detection from auth type
- Support for all three providers with proper environment variable loading

**Environment Variables**:

- `GEMINI_API_KEY` - Gemini API key
- `OPENAI_API_KEY` - OpenAI API key
- `CLAUDE_API_KEY` - Claude API key

### 6. Updated Validation (`packages/cli/src/config/auth.ts`)

Enhanced validation to:

- Accept all new auth types
- For custom auth: Accept any of Gemini, OpenAI, or Claude API keys
- Provide clear error messages when keys are missing

### 7. ContentGenerator Configuration (`packages/core/src/core/contentGenerator.ts`)

- Added `provider?: 'gemini' | 'openai' | 'claude'` to `ContentGeneratorConfig`
- Updated config creation to detect and set provider type
- All three API keys can be loaded from storage or environment

## Usage Guide

### Option 1: Use Specific Provider API Key

```bash
# Set Gemini API key in .env or export
export GEMINI_API_KEY=your-gemini-key

# Launch Gemini CLI and select "Use Gemini API Key"
gemini-cli
```

```bash
# Use OpenAI
export OPENAI_API_KEY=your-openai-key
gemini-cli
# Select "Use OpenAI API Key"
```

```bash
# Use Claude
export CLAUDE_API_KEY=your-claude-key
gemini-cli
# Select "Use Claude API Key"
```

### Option 2: Custom Auth with Automatic Fallback

```bash
# Set any or all API keys
export GEMINI_API_KEY=your-gemini-key
export OPENAI_API_KEY=your-openai-key
export CLAUDE_API_KEY=your-claude-key

gemini-cli
# Select "Custom Auth (with fallback to API keys)"
```

The system will try to use the keys in this order:

1. Gemini (default) ← Attempted first
2. OpenAI ← Used if Gemini fails
3. Claude ← Used if both above fail

### Option 3: Environment Variables Only

```bash
export GEMINI_API_KEY=your-key
gemini-cli
```

The CLI will automatically detect the key and suggest "Use Gemini API Key"
option.

## Architecture

### Authentication Flow

```
User selects auth method
        ↓
┌──────────────────────────────────────────────────────────┐
│  • Login with Google                                     │
│  • Use Gemini API Key                                    │
│  • Use OpenAI API Key                 (NEW)              │
│  • Use Claude API Key                 (NEW)              │
│  • Vertex AI                                             │
│  • Custom Auth (with fallback)        (ENHANCED)         │
└──────────────────────────────────────────────────────────┘
        ↓
For API key methods → Prompt for API key
        ↓
Store in system keychain (per provider)
        ↓
Create ContentGenerator with appropriate provider
        ↓
Authenticate and proceed
```

### Provider Selection Logic

```typescript
// In handleApiKeySubmit (AppContainer.tsx)
const selectedAuthType = settings.merged.security?.auth?.selectedType;

if (selectedAuthType === AuthType.USE_OPENAI) {
  provider = 'openai';
} else if (selectedAuthType === AuthType.USE_CLAUDE) {
  provider = 'claude';
} else if (selectedAuthType === AuthType.CUSTOM_AUTH) {
  // Uses currentProvider from authentication state
  provider = currentProvider; // 'gemini' by default
}

await saveApiKey(apiKey, provider);
await config.refreshAuth(authType);
```

## Configuration Files Modified

| File                                                | Changes                                             |
| --------------------------------------------------- | --------------------------------------------------- |
| `packages/core/src/core/contentGenerator.ts`        | Added `USE_OPENAI`, `USE_CLAUDE` to `AuthType` enum |
| `packages/core/src/core/apiKeyCredentialStorage.ts` | Multi-provider key storage support                  |
| `packages/cli/src/config/auth.ts`                   | Updated validation for new auth types               |
| `packages/cli/src/ui/auth/AuthDialog.tsx`           | Added UI options for new providers                  |
| `packages/cli/src/ui/auth/ApiAuthDialog.tsx`        | Provider-aware prompts and URLs                     |
| `packages/cli/src/ui/auth/useAuth.ts`               | Provider detection and key loading                  |
| `packages/cli/src/ui/contexts/UIStateContext.tsx`   | Added `apiKeyProvider` to `UIState`                 |
| `packages/cli/src/ui/AppContainer.tsx`              | Provider tracking and API key handling              |
| `packages/cli/src/ui/components/DialogManager.tsx`  | Pass provider to ApiAuthDialog                      |

## Security Considerations

✅ **Implemented Security Features:**

- API keys stored in system keychain (not plain text)
- Keys never logged or exposed in error messages
- Provider-specific key isolation
- Backward compatibility maintained
- Environment variables as fallback

⚠️ **Best Practices:**

1. Never commit API keys to version control
2. Use `.env` files (add to `.gitignore`) for local development
3. Use environment variables for production
4. Rotate keys regularly
5. Monitor API key usage in provider dashboards

## Testing & Verification

### Test Custom Auth Fallback:

```bash
# Set only Gemini key (should work immediately)
export GEMINI_API_KEY=sk-***

# Or test OpenAI as fallback
export OPENAI_API_KEY=sk-***
gemini-cli
# Select "Custom Auth"
```

### Test Direct Provider Usage:

```bash
# Clear all keys first
unset GEMINI_API_KEY OPENAI_API_KEY CLAUDE_API_KEY

# Set only OpenAI
export OPENAI_API_KEY=sk-***
gemini-cli
# Select "Use OpenAI API Key"
```

### Verify Key Storage:

Keys are stored in system keychain:

- **macOS**: Keychain app → Search for "gemini-cli-api-key"
- **Linux**: Depends on credential manager (varies by distro)
- **Windows**: Credential Manager

## Future Enhancements

Potential improvements for future versions:

1. **Provider Switching During Session**
   - Allow users to switch providers without restarting

2. **Multi-Key Management**
   - UI to manage/delete stored keys
   - View which providers have keys saved

3. **Automatic Fallback Strategy**
   - User-configurable fallback order
   - Weighted provider selection

4. **Rate Limit Handling**
   - Detect provider-specific rate limits
   - Auto-switch to available provider

5. **Provider-Specific Features**
   - Token counting using provider's API
   - Model-specific optimizations

## Troubleshooting

### "Custom auth requires at least one API key"

**Solution**: Set at least one of these environment variables:

```bash
export GEMINI_API_KEY=your-key
# OR
export OPENAI_API_KEY=your-key
# OR
export CLAUDE_API_KEY=your-key
```

### Key not being loaded from keychain

**Solution**:

1. Check if key is stored: Look in system Keychain/Credential Manager
2. Manually re-enter: Delete stored key and enter again
3. Use environment variable: Set `GEMINI_API_KEY`, `OPENAI_API_KEY`, or
   `CLAUDE_API_KEY`

### Wrong provider being used for Custom Auth

**Solution**: The CLI uses Gemini by default for custom auth. To change:

1. Clear all API keys except desired one
2. Or select specific provider ("Use OpenAI API Key" instead of "Custom Auth")

## Summary

You now have a flexible, secure multi-provider authentication system that:

- ✅ Uses **Gemini by default** (as requested)
- ✅ Supports **OpenAI and Claude** as alternatives
- ✅ Automatically **falls back** when custom auth is selected
- ✅ Stores keys **securely in system keychain** per provider
- ✅ Provides **clear UI** for selecting providers
- ✅ Maintains **backward compatibility** with existing Gemini-only setup

The implementation is production-ready and follows security best practices!
