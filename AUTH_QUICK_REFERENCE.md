# Authentication & API Flow - Quick Reference Guide

## Question 1: How is custom authentication implemented? Where does it validate the API key?

### Custom Auth Validation Location

**File:** `/packages/cli/src/config/auth.ts` (Lines 39-46)

```typescript
if (authMethod === AuthType.CUSTOM_AUTH) {
  const customApiKey = process.env['GEMINI_API_KEY'] || undefined;
  if (customApiKey !== 'abc123') {
    return "Invalid custom API key. Please set GEMINI_API_KEY to 'abc123'.";
  }
  return null;
}
```

### What it validates:

- Checks if `GEMINI_API_KEY` environment variable equals exactly `'abc123'`
- Returns error message if invalid
- Returns null if valid

### How it's used:

1. User selects "Custom Auth" in AuthDialog
2. `validateAuthMethodWithSettings()` is called
3. This calls `validateAuthMethod()` which checks the above
4. If invalid, error shown to user in AuthDialog
5. If valid, proceeds to `config.refreshAuth()`

---

## Question 2: Where/how does the user select a model?

### Model Selection UI

**File:** `/packages/cli/src/ui/components/ModelDialog.tsx`

### When/How to Access:

- User types: `/model` (slash command)
- SlashCommandProcessor opens ModelDialog
- DialogManager renders it
- User sees radio button select with 4 options:
  1. **Auto (recommended)** - DEFAULT_GEMINI_MODEL_AUTO
  2. **Pro** - DEFAULT_GEMINI_MODEL
  3. **Flash** - DEFAULT_GEMINI_FLASH_MODEL
  4. **Flash-Lite** - DEFAULT_GEMINI_FLASH_LITE_MODEL

### Code Flow:

```
User types "/model"
  ↓
ModelDialog.handleSelect(selectedModel)
  ↓
config.setModel(selectedModel)
  ↓
Next API call uses selected model
```

### Key Code:

```typescript
const handleSelect = useCallback(
  (model: string) => {
    if (config) {
      config.setModel(model);
      const event = new ModelSlashCommandEvent(model);
      logModelSlashCommand(config, event);
    }
    onClose();
  },
  [config, onClose],
);
```

---

## Question 3: After authentication, how is API key passed to GoogleGenAI?

### The API Key Flow

```
saveApiKey(apiKey)
  ↓ (saves to keychain)
config.refreshAuth(AuthType.USE_GEMINI)
  ↓
createContentGeneratorConfig()
  ├─ const geminiApiKey = await loadApiKey()
  │   ↓ (reads from keychain)
  └─ Returns { apiKey, authType, ... }
  ↓
createContentGenerator(config)
  ├─ new GoogleGenAI({
  │   apiKey: config.apiKey,  ← API key passed here
  │   vertexai: config.vertexai,
  │   httpOptions: { headers }
  │ })
  ↓
GoogleGenAI.models (wrapped with LoggingContentGenerator)
  ↓
config.contentGenerator = generator
```

### Key Files:

- **Save:** `/packages/core/src/core/apiKeyCredentialStorage.ts` (saveApiKey)
- **Load:** `/packages/core/src/core/apiKeyCredentialStorage.ts` (loadApiKey)
- **Use:** `/packages/core/src/core/contentGenerator.ts`
  (createContentGenerator)

### Storage Details:

- Service: `'gemini-cli-api-key'`
- Entry: `'default-api-key'`
- Uses HybridTokenStorage (system keychain)

---

## Question 4: Is there a dialog for model selection? Can we integrate with it?

### Current Model Selection Dialog

**Yes!** `ModelDialog.tsx` provides:

- Accessible via `/model` slash command
- Radio button UI with descriptions
- Real-time selection and logging

### Integration Points:

#### 1. **To trigger model dialog from code:**

```typescript
const { openModelDialog } = useModelCommand();
openModelDialog(); // Opens dialog
```

#### 2. **To read selected model:**

```typescript
const selectedModel = config.getModel();
```

#### 3. **To set model programmatically:**

```typescript
config.setModel('gemini-2.0-flash');
```

#### 4. **To require auth before model selection:**

Edit `ModelDialog.tsx` handleSelect:

```typescript
const handleSelect = useCallback(
  (model: string) => {
    // Check if authenticated
    if (!config.getContentGenerator()) {
      // Show auth dialog first
      return;
    }
    config.setModel(model);
    // ...
  },
  [config, onClose],
);
```

---

## Question 5: What happens between auth validation and actual API calls?

### The Gap Filled

```
AUTHENTICATION VALIDATION (complete)
  ↓
setAuthState(AuthState.Authenticated)
  ↓
DialogManager stops showing auth dialogs
  ↓
App component renders main UI
  ↓
User can type prompts
  ↓
User can call slash commands (/model, etc.)
  ↓
User makes API call
  ↓
useGeminiStream hook:
  - Gets model: config.getModel()
  - Gets generator: config.getContentGenerator()
  - Calls: generator.generateContentStream({
      model, contents, tools, systemPrompt, ...
    })
  ↓
GoogleGenAI.models makes actual HTTP request
  ↓
API uses stored API key from initialization
```

### Key Transitions:

1. **Auth Complete → UI Ready:**
   - `/packages/cli/src/ui/AppContainer.tsx` line 376-383
   - `useAuthCommand()` returns authenticated state

2. **User Input → API Call:**
   - `/packages/cli/src/ui/hooks/useGeminiStream.ts`
   - Gets model and ContentGenerator from config
   - Makes generateContentStream() call

3. **ContentGenerator Ready → API Request:**
   - `/packages/core/src/core/contentGenerator.ts` lines 111-174
   - GoogleGenAI instance already has API key from refreshAuth()
   - generateContentStream() uses it directly

---

## File Reference Map

| Task                           | File                                                | Lines   | Function                       |
| ------------------------------ | --------------------------------------------------- | ------- | ------------------------------ |
| Validate custom auth           | `packages/cli/src/config/auth.ts`                   | 39-46   | validateAuthMethod()           |
| Show auth dialog               | `packages/cli/src/ui/auth/AuthDialog.tsx`           | 33-218  | AuthDialog()                   |
| Show API key input             | `packages/cli/src/ui/auth/ApiAuthDialog.tsx`        | 21-97   | ApiAuthDialog()                |
| Save API key                   | `packages/core/src/core/apiKeyCredentialStorage.ts` | 38-62   | saveApiKey()                   |
| Load API key                   | `packages/core/src/core/apiKeyCredentialStorage.ts` | 19-33   | loadApiKey()                   |
| Auth orchestration             | `packages/cli/src/ui/auth/useAuth.ts`               | 37-140  | useAuthCommand()               |
| Create ContentGenerator config | `packages/core/src/core/contentGenerator.ts`        | 62-109  | createContentGeneratorConfig() |
| Create ContentGenerator        | `packages/core/src/core/contentGenerator.ts`        | 111-174 | createContentGenerator()       |
| Initialize all                 | `packages/core/src/config/config.ts`                | 626-662 | refreshAuth()                  |
| Show model dialog              | `packages/cli/src/ui/components/ModelDialog.tsx`    | 54-115  | ModelDialog()                  |
| Manage dialogs                 | `packages/cli/src/ui/components/DialogManager.tsx`  | 38-214  | DialogManager()                |
| Main container                 | `packages/cli/src/ui/AppContainer.tsx`              | 141+    | AppContainer()                 |

---

## State Machine Quick View

```
Unauthenticated
  └─→ [No auth selected?] → Updating (show AuthDialog)
  └─→ [Auth selected + needs key?] → AwaitingApiKeyInput (show ApiAuthDialog)
  └─→ [Auth valid] → Authenticated ✓

Authenticated
  ├─→ User can type prompts
  ├─→ User can call /model
  └─→ API calls work
```

---

## Common Tasks

### To extend custom auth validation:

1. Edit: `/packages/cli/src/config/auth.ts`
2. Modify the check in the `CUSTOM_AUTH` block (lines 39-46)
3. Examples:
   - Validate API key format with regex
   - Check against a whitelist
   - Validate with remote endpoint

### To add pre-API-call validation:

1. Edit: `/packages/core/src/core/contentGenerator.ts`
2. Add checks around line 157-162 (before creating GoogleGenAI)
3. Throw error if validation fails

### To require auth before model selection:

1. Edit: `/packages/cli/src/ui/components/ModelDialog.tsx`
2. Add check in handleSelect (line 76-85)
3. Call auth dialog if not authenticated

### To intercept API key after model selection:

1. Modify ModelDialog.tsx handleSelect
2. Check if ContentGenerator exists
3. If not, trigger auth flow before allowing model change

---

## Key Constants

```typescript
// Auth types
enum AuthType {
  LOGIN_WITH_GOOGLE = 'oauth-personal',
  USE_GEMINI = 'gemini-api-key',
  USE_VERTEX_AI = 'vertex-ai',
  CLOUD_SHELL = 'cloud-shell',
  CUSTOM_AUTH = 'custom-auth',
}

// Auth states
enum AuthState {
  Unauthenticated = 'unauthenticated',
  Updating = 'updating',
  AwaitingApiKeyInput = 'awaiting-api-key-input',
  Authenticated = 'authenticated',
}

// Storage
const KEYCHAIN_SERVICE_NAME = 'gemini-cli-api-key';
const DEFAULT_API_KEY_ENTRY = 'default-api-key';

// Models
const DEFAULT_GEMINI_MODEL_AUTO = 'gemini-2.0-auto';
const DEFAULT_GEMINI_MODEL = 'gemini-2.0-pro';
const DEFAULT_GEMINI_FLASH_MODEL = 'gemini-2.0-flash';
const DEFAULT_GEMINI_FLASH_LITE_MODEL = 'gemini-2.0-flash-lite';
```
