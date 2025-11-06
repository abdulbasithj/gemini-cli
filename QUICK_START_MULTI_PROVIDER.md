# Quick Start: Multi-Provider Authentication

## The Problem You Solved ✅

When custom auth failed in the CLI, you had no fallback. Now with this
implementation:

- **Gemini API key works by default** ← Preferred
- **If it fails, try OpenAI key** ← Automatic fallback
- **If that fails, try Claude key** ← Automatic fallback
- **Or manually select any provider** ← User choice

## 3-Minute Setup

### Step 1: Set Your API Keys

```bash
# In your .env or shell profile, set any or all:
export GEMINI_API_KEY="your-gemini-key"
export OPENAI_API_KEY="your-openai-key"
export CLAUDE_API_KEY="your-claude-key"
```

### Step 2: Launch Gemini CLI

```bash
gemini-cli
```

### Step 3: Choose Your Auth Method

**Option A - Use Specific Provider:**

```
? How would you like to authenticate?
  ▸ Use Gemini API Key
    Use OpenAI API Key         ← NEW
    Use Claude API Key         ← NEW
```

**Option B - Use Custom Auth (Automatic Fallback):**

```
? How would you like to authenticate?
  ▸ Custom Auth (with fallback to API keys)   ← ENHANCED
```

## Real-World Scenarios

### Scenario 1: Your Gemini quota is exhausted

```bash
# Set Gemini key (your primary)
export GEMINI_API_KEY="sk-gemini-key-123"

# Set OpenAI as backup
export OPENAI_API_KEY="sk-openai-key-456"

# Launch and select "Custom Auth"
gemini-cli
# → Will use Gemini first
# → If Gemini fails, automatically tries OpenAI
```

### Scenario 2: You prefer OpenAI

```bash
export OPENAI_API_KEY="sk-openai-key-456"

# Launch and select "Use OpenAI API Key"
gemini-cli
# → Uses OpenAI directly
```

### Scenario 3: Enterprise with specific provider requirements

```bash
# IT mandates Claude, but allow Gemini as fallback
export CLAUDE_API_KEY="sk-claude-key-789"
export GEMINI_API_KEY="sk-gemini-key-123"

gemini-cli
# → Select "Use Claude API Key"
# → All requests use Claude
```

## Key Changes in Your Codebase

| What           | Where                        | Change                              |
| -------------- | ---------------------------- | ----------------------------------- |
| New Auth Types | `AuthType` enum              | Added `USE_OPENAI`, `USE_CLAUDE`    |
| Key Storage    | `apiKeyCredentialStorage.ts` | Now per-provider in system keychain |
| UI Menu        | `AuthDialog.tsx`             | Added OpenAI and Claude options     |
| API Key Input  | `ApiAuthDialog.tsx`          | Shows provider-specific URLs        |
| Auth Logic     | `useAuth.ts`                 | Detects and loads per-provider keys |

## Environment Variables

| Variable                   | Purpose               | Example          |
| -------------------------- | --------------------- | ---------------- |
| `GEMINI_API_KEY`           | Gemini authentication | `sk-...`         |
| `OPENAI_API_KEY`           | OpenAI authentication | `sk-...`         |
| `CLAUDE_API_KEY`           | Claude authentication | `sk-...`         |
| `GEMINI_DEFAULT_AUTH_TYPE` | Default selection     | `gemini-api-key` |

## How the Fallback Works

When you select **"Custom Auth (with fallback)"**:

```
1. User clicks "Custom Auth"
2. CLI checks available keys: Gemini, OpenAI, Claude
3. Loads Gemini key first (default)
4. Stores securely in system keychain
5. Tries to authenticate with Gemini
6. ✅ If successful → Use Gemini
7. ❌ If fails → Try OpenAI
8. ✅ If successful → Use OpenAI
9. ❌ If fails → Try Claude
10. ✅ If successful → Use Claude
11. ❌ If all fail → Show error
```

## File Structure

```
packages/
├── core/
│   └── src/
│       └── core/
│           ├── contentGenerator.ts          (Updated: AuthType enum)
│           └── apiKeyCredentialStorage.ts   (Updated: Multi-provider storage)
└── cli/
    └── src/
        ├── config/
        │   └── auth.ts                      (Updated: Validation)
        └── ui/
            ├── auth/
            │   ├── AuthDialog.tsx           (Updated: UI menu)
            │   ├── ApiAuthDialog.tsx        (Updated: Provider-specific prompts)
            │   └── useAuth.ts               (Updated: Provider detection)
            ├── contexts/
            │   └── UIStateContext.tsx       (Updated: Add apiKeyProvider)
            ├── AppContainer.tsx             (Updated: API key handling)
            └── components/
                └── DialogManager.tsx        (Updated: Pass provider)
```

## Testing the Implementation

### Test 1: Gemini Works

```bash
export GEMINI_API_KEY="your-real-key"
unset OPENAI_API_KEY
unset CLAUDE_API_KEY
gemini-cli
# Select "Custom Auth"
# ✅ Should work with Gemini
```

### Test 2: OpenAI Fallback

```bash
export GEMINI_API_KEY="invalid-key"
export OPENAI_API_KEY="your-real-key"
unset CLAUDE_API_KEY
gemini-cli
# Select "Custom Auth"
# ✅ Should skip Gemini and use OpenAI
```

### Test 3: Direct Provider Selection

```bash
export OPENAI_API_KEY="your-real-key"
unset GEMINI_API_KEY
unset CLAUDE_API_KEY
gemini-cli
# Select "Use OpenAI API Key"
# ✅ Should use OpenAI directly
```

## Troubleshooting

| Issue                             | Solution                                                                            |
| --------------------------------- | ----------------------------------------------------------------------------------- |
| "No auth method selected"         | Set at least one API key in environment                                             |
| "Custom auth requires an API key" | Ensure `GEMINI_API_KEY`, `OPENAI_API_KEY`, or `CLAUDE_API_KEY` is set               |
| Keys not persisting               | Check system keychain/credential manager has "gemini-cli-api-key" service           |
| Wrong provider used               | Make sure only one key is set, or select specific provider instead of "Custom Auth" |

## Next Steps

1. **Build and test** - Run `npm run build && npm run start`
2. **Set your API keys** - Add to `.env` or shell profile
3. **Try authentication** - Test with each provider
4. **Verify fallback** - Set invalid Gemini key, valid OpenAI key, test fallback
5. **Deploy** - Commit changes and push

## Summary

✅ **Default**: Gemini (as you wanted) ✅ **Fallback**: OpenAI → Claude
(automatic) ✅ **Direct**: Can select any provider manually ✅ **Secure**: Keys
stored in system keychain per provider ✅ **Backward Compatible**: Existing
Gemini-only setup still works

**Status**: Ready for production testing and deployment
