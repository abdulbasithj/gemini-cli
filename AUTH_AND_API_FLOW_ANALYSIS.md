# Gemini CLI: Authentication & API Call Flow Analysis

## Executive Summary

This document details the custom authentication implementation, model selection
mechanism, and how API keys flow from user input through to the GoogleGenAI API
calls in Gemini CLI.

---

## 1. Custom Authentication Implementation & API Key Validation

### 1.1 Where Custom Auth is Implemented

**File: `/packages/cli/src/config/auth.ts`** (Lines 39-46)

```typescript
if (authMethod === AuthType.CUSTOM_AUTH) {
  // For custom auth, we expect the API key to be 'abc123'
  const customApiKey = process.env['GEMINI_API_KEY'] || undefined;
  if (customApiKey !== 'abc123') {
    return "Invalid custom API key. Please set GEMINI_API_KEY to 'abc123'.";
  }
  return null;
}
```

**Key Points:**

- Custom auth validates that `GEMINI_API_KEY` environment variable is exactly
  `'abc123'`
- This is a **hardcoded validation** specifically for testing/demo purposes
- Returns an error message if validation fails
- Part of `validateAuthMethod()` function

### 1.2 Available Authentication Types

**File: `/packages/core/src/core/contentGenerator.ts`** (Lines 47-53)

```typescript
export enum AuthType {
  LOGIN_WITH_GOOGLE = 'oauth-personal',
  USE_GEMINI = 'gemini-api-key',
  USE_VERTEX_AI = 'vertex-ai',
  CLOUD_SHELL = 'cloud-shell',
  CUSTOM_AUTH = 'custom-auth',
}
```

### 1.3 Authentication Flow Validation

**File: `/packages/cli/src/ui/auth/useAuth.ts`** (Lines 19-35)

The `validateAuthMethodWithSettings()` function provides comprehensive
validation:

```typescript
export function validateAuthMethodWithSettings(
  authType: AuthType,
  settings: LoadedSettings,
): string | null {
  // 1. Check if auth type is enforced
  const enforcedType = settings.merged.security?.auth?.enforcedType;
  if (enforcedType && enforcedType !== authType) {
    return `Authentication is enforced to be ${enforcedType}...`;
  }

  // 2. Allow external auth
  if (settings.merged.security?.auth?.useExternal) {
    return null;
  }

  // 3. Skip validation for Gemini API key (will prompt for it)
  if (authType === AuthType.USE_GEMINI) {
    return null;
  }

  // 4. Validate using config-level auth.ts
  return validateAuthMethod(authType);
}
```

---

## 2. Model Selection Mechanism

### 2.1 Model Selection UI Dialog

**File: `/packages/cli/src/ui/components/ModelDialog.tsx`**

The ModelDialog provides a radio button interface for model selection:

```typescript
const MODEL_OPTIONS = [
  {
    value: DEFAULT_GEMINI_MODEL_AUTO,
    title: 'Auto (recommended)',
    description: 'Let the system choose the best model for your task',
  },
  {
    value: DEFAULT_GEMINI_MODEL,
    title: 'Pro',
    description: 'For complex tasks that require deep reasoning...',
  },
  {
    value: DEFAULT_GEMINI_FLASH_MODEL,
    title: 'Flash',
    description: 'For tasks that need a balance of speed and reasoning',
  },
  {
    value: DEFAULT_GEMINI_FLASH_LITE_MODEL,
    title: 'Flash-Lite',
    description: 'For simple tasks that need to be done quickly',
  },
];
```

**Key Features:**

- Accessible via slash command `/model`
- Shows descriptive options with explanations
- Stores selection in config via `config.setModel(model)`
- Logs usage via `logModelSlashCommand(config, event)`

### 2.2 Model Selection State Management

**File: `/packages/cli/src/ui/AppContainer.tsx`** (Lines 509-510)

```typescript
const { isModelDialogOpen, openModelDialog, closeModelDialog } =
  useModelCommand();
```

The model dialog can be opened anytime during the session and:

1. Reads the current model preference with `config.getModel()`
2. User selects a new model
3. Selection is saved with `config.setModel(model)`
4. Dialog closes

---

## 3. API Key Flow: From User Input to GoogleGenAI

### 3.1 High-Level Flow Diagram

```
User Selection (AuthDialog)
    ↓
User selects "Use Gemini API Key"
    ↓
AuthState.AwaitingApiKeyInput
    ↓
ApiAuthDialog shows text input
    ↓
User enters API key
    ↓
handleApiKeySubmit()
    ↓
saveApiKey(apiKey) → HybridTokenStorage
    ↓
config.refreshAuth(AuthType.USE_GEMINI)
    ↓
createContentGeneratorConfig() reads saved key
    ↓
createContentGenerator() creates GoogleGenAI instance
    ↓
API calls use GoogleGenAI.models
```

### 3.2 Step-by-Step: API Key Collection

#### Step 1: User Selects Authentication Method

**File: `/packages/cli/src/ui/auth/AuthDialog.tsx`** (Lines 106-143)

```typescript
const onSelect = useCallback(
  async (authType: AuthType | undefined, scope: SettingScope) => {
    if (authType) {
      await clearCachedCredentialFile();
      settings.setValue(scope, 'security.auth.selectedType', authType);
      // ... Google auth handling ...
    }

    // TRIGGER API KEY INPUT DIALOG
    if (authType === AuthType.USE_GEMINI) {
      setAuthState(AuthState.AwaitingApiKeyInput);
      return;
    }

    setAuthState(AuthState.Unauthenticated);
  },
  [settings, config, setAuthState],
);
```

#### Step 2: Show API Key Input Dialog

**File: `/packages/cli/src/ui/components/DialogManager.tsx`** (Lines 154-164)

```typescript
if (uiState.isAwaitingApiKeyInput) {
  return (
    <Box flexDirection="column">
      <ApiAuthDialog
        onSubmit={uiActions.handleApiKeySubmit}
        onCancel={uiActions.handleApiKeyCancel}
        error={uiState.authError}
        defaultValue={uiState.apiKeyDefaultValue}
      />
    </Box>
  );
}
```

**File: `/packages/cli/src/ui/auth/ApiAuthDialog.tsx`**

The dialog component:

- Displays a text input field
- Shows helpful text about where to get API keys
- Filters input to alphanumeric + underscore/dash only
- Submits on Enter, cancels on Esc

### 3.3 API Key Storage

**File: `/packages/core/src/core/apiKeyCredentialStorage.ts`** (Lines 38-62)

```typescript
export async function saveApiKey(
  apiKey: string | null | undefined,
): Promise<void> {
  if (!apiKey || apiKey.trim() === '') {
    // Delete if empty
    try {
      await storage.deleteCredentials(DEFAULT_API_KEY_ENTRY);
    } catch (error: unknown) {
      debugLogger.warn('Failed to delete API key from storage:', error);
    }
    return;
  }

  // Wrap API key in OAuthCredentials format
  const credentials: OAuthCredentials = {
    serverName: DEFAULT_API_KEY_ENTRY,
    token: {
      accessToken: apiKey,
      tokenType: 'ApiKey',
    },
    updatedAt: Date.now(),
  };

  await storage.setCredentials(credentials);
}
```

**Storage Details:**

- Uses `HybridTokenStorage` with service name: `'gemini-cli-api-key'`
- Entry name: `'default-api-key'`
- Stores in system keychain (secure storage)
- Wrapped in OAuthCredentials format for compatibility

### 3.4 API Key Submission Handler

**File: `/packages/cli/src/ui/AppContainer.tsx`** (Lines 432-454)

```typescript
const handleApiKeySubmit = useCallback(
  async (apiKey: string) => {
    try {
      onAuthError(null);
      if (!apiKey.trim() && apiKey.length > 1) {
        onAuthError(
          'API key cannot be empty string with length greater than 1.',
        );
        return;
      }

      // 1. Save the key
      await saveApiKey(apiKey);

      // 2. Reload key from storage
      await reloadApiKey();

      // 3. Refresh auth with the saved key
      await config.refreshAuth(AuthType.USE_GEMINI);

      // 4. Mark as authenticated
      setAuthState(AuthState.Authenticated);
    } catch (e) {
      onAuthError(
        `Failed to save API key: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  },
  [setAuthState, onAuthError, reloadApiKey, config],
);
```

---

## 4. ContentGenerator Creation & Initialization

### 4.1 The refreshAuth() Method - Where API Key Meets GoogleGenAI

**File: `/packages/core/src/config/config.ts`** (Lines 626-662)

```typescript
async refreshAuth(authMethod: AuthType) {
  this.useModelRouter = this.initialUseModelRouter;
  // ... model router setup ...

  // Create new content generator config
  const newContentGeneratorConfig = await createContentGeneratorConfig(
    this,
    authMethod,
  );

  // CREATE CONTENT GENERATOR WITH THE CONFIG
  this.contentGenerator = await createContentGenerator(
    newContentGeneratorConfig,
    this,
    this.getSessionId(),
  );

  // Store the config for later reference
  this.contentGeneratorConfig = newContentGeneratorConfig;

  // Initialize BaseLlmClient now that ContentGenerator is available
  this.baseLlmClient = new BaseLlmClient(this.contentGenerator, this);

  // Reset fallback mode
  this.inFallbackMode = false;
}
```

### 4.2 ContentGeneratorConfig Creation

**File: `/packages/core/src/core/contentGenerator.ts`** (Lines 62-109)

```typescript
export async function createContentGeneratorConfig(
  config: Config,
  authType: AuthType | undefined,
): Promise<ContentGeneratorConfig> {
  // Try to load saved API key from keychain or env
  const geminiApiKey =
    (await loadApiKey()) || process.env['GEMINI_API_KEY'] || undefined;
  const googleApiKey = process.env['GOOGLE_API_KEY'] || undefined;
  const googleCloudProject = process.env['GOOGLE_CLOUD_PROJECT'] || undefined;
  const googleCloudLocation = process.env['GOOGLE_CLOUD_LOCATION'] || undefined;

  const contentGeneratorConfig: ContentGeneratorConfig = {
    authType,
    proxy: config?.getProxy(),
  };

  // OAuth and Cloud Shell don't need additional config
  if (
    authType === AuthType.LOGIN_WITH_GOOGLE ||
    authType === AuthType.CLOUD_SHELL
  ) {
    return contentGeneratorConfig;
  }

  // GEMINI API KEY and CUSTOM AUTH: include the API key
  if (
    (authType === AuthType.USE_GEMINI || authType === AuthType.CUSTOM_AUTH) &&
    geminiApiKey
  ) {
    contentGeneratorConfig.apiKey = geminiApiKey;
    contentGeneratorConfig.vertexai = false;
    return contentGeneratorConfig;
  }

  // VERTEX AI: use Google API key or project/location
  if (
    authType === AuthType.USE_VERTEX_AI &&
    (googleApiKey || (googleCloudProject && googleCloudLocation))
  ) {
    contentGeneratorConfig.apiKey = googleApiKey;
    contentGeneratorConfig.vertexai = true;
    return contentGeneratorConfig;
  }

  return contentGeneratorConfig;
}
```

### 4.3 ContentGenerator Instantiation

**File: `/packages/core/src/core/contentGenerator.ts`** (Lines 111-174)

```typescript
export async function createContentGenerator(
  config: ContentGeneratorConfig,
  gcConfig: Config,
  sessionId?: string,
): Promise<ContentGenerator> {
  const generator = await (async () => {
    if (gcConfig.fakeResponses) {
      return FakeContentGenerator.fromFile(gcConfig.fakeResponses);
    }

    const version = process.env['CLI_VERSION'] || process.version;
    const userAgent = `GeminiCLI/${version} (${process.platform}; ${process.arch})`;
    const baseHeaders: Record<string, string> = {
      'User-Agent': userAgent,
    };

    // OAuth and Cloud Shell use CodeAssist generator
    if (
      config.authType === AuthType.LOGIN_WITH_GOOGLE ||
      config.authType === AuthType.CLOUD_SHELL
    ) {
      const httpOptions = { headers: baseHeaders };
      return new LoggingContentGenerator(
        await createCodeAssistContentGenerator(
          httpOptions,
          config.authType,
          gcConfig,
          sessionId,
        ),
        gcConfig,
      );
    }

    // GEMINI API KEY, VERTEX AI, CUSTOM AUTH: use GoogleGenAI
    if (
      config.authType === AuthType.USE_GEMINI ||
      config.authType === AuthType.USE_VERTEX_AI ||
      config.authType === AuthType.CUSTOM_AUTH
    ) {
      let headers: Record<string, string> = { ...baseHeaders };
      if (gcConfig?.getUsageStatisticsEnabled()) {
        const installationManager = new InstallationManager();
        const installationId = installationManager.getInstallationId();
        headers = {
          ...headers,
          'x-gemini-api-privileged-user-id': `${installationId}`,
        };
      }
      const httpOptions = { headers };

      // KEY LINE: GoogleGenAI is created with the API key here
      const googleGenAI = new GoogleGenAI({
        apiKey: config.apiKey === '' ? undefined : config.apiKey,
        vertexai: config.vertexai,
        httpOptions,
      });

      return new LoggingContentGenerator(googleGenAI.models, gcConfig);
    }

    throw new Error(
      `Error creating contentGenerator: Unsupported authType: ${config.authType}`,
    );
  })();

  // Optional: wrap with RecordingContentGenerator for testing
  if (gcConfig.recordResponses) {
    return new RecordingContentGenerator(generator, gcConfig.recordResponses);
  }

  return generator;
}
```

### 4.4 The GoogleGenAI Connection

**File: `/packages/core/src/core/contentGenerator.ts`** (Lines 15)

```typescript
import { GoogleGenAI } from '@google/genai';
```

The flow connects to GoogleGenAI library:

1. API key is passed to `new GoogleGenAI({ apiKey: ... })`
2. GoogleGenAI.models is wrapped with LoggingContentGenerator
3. This becomes the ContentGenerator used for all API calls

---

## 5. Authentication State Machine

### 5.1 AuthState Enum

**File: `/packages/cli/src/ui/types.ts`**

```typescript
enum AuthState {
  Unauthenticated = 'unauthenticated',
  Updating = 'updating',
  AwaitingApiKeyInput = 'awaiting-api-key-input',
  Authenticated = 'authenticated',
}
```

### 5.2 State Transitions

```
START
  ↓
Unauthenticated
  ↓ (on mount, check for existing auth)
[Is auth method selected?]
  ├─ NO → Updating (show AuthDialog)
  │         └─ User selects auth type
  │           ├─ OAuth → Unauthenticated (retry)
  │           ├─ Cloud Shell → Unauthenticated (retry)
  │           ├─ Vertex AI → Unauthenticated (validate env vars)
  │           ├─ Gemini API Key → AwaitingApiKeyInput (show input dialog)
  │           └─ Custom Auth → Unauthenticated (validate env vars)
  │
  └─ YES → [Check if API key needed?]
             ├─ NO (OAuth/Cloud Shell/Vertex) → Unauthenticated (call refreshAuth)
             │                                    → Authenticated ✓
             └─ YES (Gemini/Custom) → [Is key stored?]
                                      ├─ NO → AwaitingApiKeyInput
                                      │        └─ User enters key
                                      │          └─ saveApiKey()
                                      │            └─ refreshAuth()
                                      │              └─ Authenticated ✓
                                      └─ YES → Unauthenticated
                                              └─ refreshAuth()
                                                └─ Authenticated ✓
```

### 5.3 useAuthCommand Hook

**File: `/packages/cli/src/ui/auth/useAuth.ts`** (Lines 37-140)

This hook orchestrates the authentication flow:

```typescript
export const useAuthCommand = (settings: LoadedSettings, config: Config) => {
  const [authState, setAuthState] = useState<AuthState>(
    AuthState.Unauthenticated,
  );
  const [authError, setAuthError] = useState<string | null>(null);
  const [apiKeyDefaultValue, setApiKeyDefaultValue] = useState<string | undefined>(
    undefined,
  );

  const reloadApiKey = useCallback(async () => {
    const storedKey = (await loadApiKey()) ?? '';
    const envKey = process.env['GEMINI_API_KEY'] ?? '';
    const key = storedKey || envKey;
    setApiKeyDefaultValue(key);
    return key;
  }, []);

  useEffect(() => {
    (async () => {
      if (authState !== AuthState.Unauthenticated) {
        return;
      }

      const authType = settings.merged.security?.auth?.selectedType;
      if (!authType) {
        // No auth method selected → show dialog
        if (process.env['GEMINI_API_KEY']) {
          onAuthError(
            'Existing API key detected (GEMINI_API_KEY). Select "Gemini API Key" option to use it.',
          );
        } else {
          onAuthError('No authentication method selected.');
        }
        return;
      }

      // If using Gemini or Custom auth, check if we have a key
      if (
        authType === AuthType.USE_GEMINI ||
        authType === AuthType.CUSTOM_AUTH
      ) {
        const key = await reloadApiKey();
        if (!key) {
          // No key found → prompt for it
          setAuthState(AuthState.AwaitingApiKeyInput);
          return;
        }
      }

      // Validate the auth method
      const error = validateAuthMethodWithSettings(authType, settings);
      if (error) {
        onAuthError(error);
        return;
      }

      // Attempt to authenticate
      try {
        await config.refreshAuth(authType);
        debugLogger.log(`Authenticated via "${authType}".`);
        setAuthError(null);
        setAuthState(AuthState.Authenticated);
      } catch (e) {
        onAuthError(`Failed to login. Message: ${getErrorMessage(e)}`);
      }
    })();
  }, [settings, config, authState, ...]);

  return {
    authState,
    setAuthState,
    authError,
    onAuthError,
    apiKeyDefaultValue,
    reloadApiKey,
  };
};
```

---

## 6. Between Auth Validation and Actual API Calls

### 6.1 What Happens After Authentication

After `setAuthState(AuthState.Authenticated)`:

1. **AppContainer** receives the authenticated state
2. **DialogManager** stops showing auth dialogs
3. **App** component mounts and can now use `config.getContentGenerator()`
4. **GeminiClient** is initialized with the ContentGenerator
5. User can now:
   - Type messages/prompts
   - Call slash commands (including `/model` to change model)
   - Trigger API calls via useGeminiStream hook

### 6.2 Model Selection Integration Point

**File: `/packages/cli/src/ui/hooks/useGeminiStream.ts`**

Once authenticated, when user changes model:

1. User opens `/model` dialog
2. Selects a model
3. `config.setModel(model)` updates the config
4. Next API call uses the new model

The model is retrieved at API call time:

```typescript
const model = config.getModel();
// Model is used in subsequent API calls
```

### 6.3 API Call Flow After Authentication

```
User Input (authenticated)
  ↓
useGeminiStream hook activated
  ↓
Get current model: config.getModel()
  ↓
Get ContentGenerator: config.getContentGenerator()
  ↓
Call generateContentStream() with:
  - Model name
  - User message
  - Tools
  - System prompt
  - etc.
  ↓
GoogleGenAI.models.generateContentStream()
  ↓ (uses saved API key from constructor)
API Request to Google Gemini API
  ↓
Stream response back to UI
```

---

## 7. Key Integration Points for Custom Requirements

### 7.1 To Intercept API Key After Model Selection

**Current Flow:**

```
Auth Dialog → API Key Input → Content Generator Created → Ready
```

**To Modify (if needed):**

1. After model selection in ModelDialog (lines 76-85 of ModelDialog.tsx)
2. Add a check: if `config.getContentGenerator()` is null, show API key dialog
3. Only proceed with model change after authentication

**Relevant Files to Modify:**

- `/packages/cli/src/ui/components/ModelDialog.tsx` - Add pre-model-change
  validation
- `/packages/cli/src/ui/auth/useAuth.ts` - Adjust state machine
- `/packages/cli/src/ui/AppContainer.tsx` - Handle mixed auth/model flows

### 7.2 Custom Auth Validation Extension

To extend custom auth validation beyond the hardcoded 'abc123':

1. **File to Modify:** `/packages/cli/src/config/auth.ts` (lines 39-46)
2. **Options:**
   - Check API key format/pattern
   - Validate against a remote endpoint
   - Add custom environment variable
   - Use a config file

### 7.3 Where to Add Pre-API-Call Validations

**File:** `/packages/core/src/core/contentGenerator.ts` (lines 157-162)

Currently:

```typescript
const googleGenAI = new GoogleGenAI({
  apiKey: config.apiKey === '' ? undefined : config.apiKey,
  vertexai: config.vertexai,
  httpOptions,
});
```

Could add validation here:

- Validate API key format before creating GoogleGenAI
- Check rate limits or quotas
- Validate user tier permissions

---

## Summary Table

| Component                | Location                          | Purpose                           |
| ------------------------ | --------------------------------- | --------------------------------- |
| Auth Types               | `contentGenerator.ts`             | Defines available auth methods    |
| Auth Validation          | `packages/cli/src/config/auth.ts` | Validates auth settings           |
| API Key Input UI         | `ApiAuthDialog.tsx`               | Text input for API key            |
| API Key Storage          | `apiKeyCredentialStorage.ts`      | Saves/loads from keychain         |
| Auth State Machine       | `useAuth.ts`                      | Orchestrates auth flow            |
| ContentGenerator Factory | `contentGenerator.ts`             | Creates GoogleGenAI instance      |
| Config Integration       | `config.ts`                       | Stores/retrieves ContentGenerator |
| Model Selection          | `ModelDialog.tsx`                 | UI for model choice               |
| Actual API Calls         | `useGeminiStream.ts`              | Uses ContentGenerator for API     |
