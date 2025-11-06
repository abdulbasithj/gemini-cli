# Authentication Flow Diagrams

## 1. Complete Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GEMINI CLI AUTHENTICATION FLOW                       │
└─────────────────────────────────────────────────────────────────────────────┘

START (AppContainer mounts)
  │
  ├─→ useAuthCommand() hook initializes
  │   - authState = Unauthenticated
  │   - Checks: Is auth method already selected?
  │
  ├─ NO: Auth Method Not Selected
  │   │
  │   ├─→ DialogManager shows AuthDialog
  │   │   ┌───────────────────────────────────┐
  │   │   │ Select Authentication Method:     │
  │   │   │ • Login with Google               │
  │   │   │ • Use Cloud Shell                 │
  │   │   │ • Use Gemini API Key        ←─────┼─── User selects here
  │   │   │ • Vertex AI                       │
  │   │   │ • Custom Auth                     │
  │   │   └───────────────────────────────────┘
  │   │
  │   └─→ [Branch based on selection]
  │
  ├─ YES: Auth Method Selected
  │   │
  │   ├─→ Check: Is API key needed?
  │   │
  │   ├─ NO (OAuth/Cloud Shell/Vertex):
  │   │   │
  │   │   ├─→ config.refreshAuth(authType)
  │   │   │   │
  │   │   │   ├─→ createContentGeneratorConfig()
  │   │   │   │   - Reads env vars (GOOGLE_API_KEY, etc.)
  │   │   │   │   - Returns config
  │   │   │   │
  │   │   │   ├─→ createContentGenerator()
  │   │   │   │   - Creates GoogleGenAI or CodeAssist
  │   │   │   │   - Stores in config.contentGenerator
  │   │   │   │
  │   │   │   └─→ Initialize BaseLlmClient
  │   │   │
  │   │   └─→ setAuthState(Authenticated) ✓
  │   │
  │   └─ YES (Gemini/Custom):
  │       │
  │       ├─→ Check: Is API key stored?
  │       │
  │       ├─ NO:
  │       │   │
  │       │   ├─→ setAuthState(AwaitingApiKeyInput)
  │       │   │
  │       │   ├─→ DialogManager shows ApiAuthDialog
  │       │   │   ┌──────────────────────────────────┐
  │       │   │   │ Enter Gemini API Key:            │
  │       │   │   │ ┌──────────────────────────────┐ │
  │       │   │   │ │ [                          ]│ │ ← User types here
  │       │   │   │ └──────────────────────────────┘ │
  │       │   │   │ Press Enter to submit            │
  │       │   │   │ Press Esc to cancel              │
  │       │   │   └──────────────────────────────────┘
  │       │   │
  │       │   ├─→ handleApiKeySubmit(apiKey)
  │       │   │
  │       │   ├─→ saveApiKey(apiKey)
  │       │   │   - Wraps in OAuthCredentials format
  │       │   │   - Saves to HybridTokenStorage
  │       │   │   - Service: 'gemini-cli-api-key'
  │       │   │   - Entry: 'default-api-key'
  │       │   │   - Uses system keychain (secure)
  │       │   │
  │       │   ├─→ reloadApiKey()
  │       │   │   - Reads from storage to verify
  │       │   │   - Sets apiKeyDefaultValue in state
  │       │   │
  │       │   └─→ [Proceed to refreshAuth below]
  │       │
  │       └─ YES:
  │           │
  │           ├─→ reloadApiKey()
  │           │   - Loads from storage or env
  │           │   - Sets apiKeyDefaultValue
  │           │
  │           └─→ [Proceed to refreshAuth below]
  │
  ├─→ validateAuthMethodWithSettings(authType, settings)
  │   - Check enforced auth type
  │   - Check external auth
  │   - Call validateAuthMethod() from config/auth.ts
  │   │
  │   └─→ For CUSTOM_AUTH:
  │       ├─ Check: GEMINI_API_KEY === 'abc123'?
  │       ├─ YES → Validation passes
  │       └─ NO → Return error message
  │
  ├─→ config.refreshAuth(authType)
  │   │
  │   ├─→ createContentGeneratorConfig(config, authType)
  │   │   │
  │   │   ├─→ Load API key:
  │   │   │   ├─ Try: loadApiKey() from storage
  │   │   │   ├─ Fallback: process.env['GEMINI_API_KEY']
  │   │   │   └─ Result: geminiApiKey or undefined
  │   │   │
  │   │   ├─→ Based on authType, return:
  │   │   │
  │   │   ├─ LOGIN_WITH_GOOGLE / CLOUD_SHELL:
  │   │   │   └─ { authType, proxy }
  │   │   │
  │   │   ├─ USE_GEMINI / CUSTOM_AUTH (if key):
  │   │   │   └─ { authType, proxy, apiKey, vertexai: false }
  │   │   │
  │   │   └─ USE_VERTEX_AI (if key or project/location):
  │   │       └─ { authType, proxy, apiKey, vertexai: true }
  │   │
  │   ├─→ createContentGenerator(config, gcConfig, sessionId)
  │   │   │
  │   │   ├─→ Build headers:
  │   │   │   ├─ User-Agent: GeminiCLI/{version}
  │   │   │   └─ If usage stats enabled: x-gemini-api-privileged-user-id
  │   │   │
  │   │   ├─→ Based on authType:
  │   │   │
  │   │   ├─ LOGIN_WITH_GOOGLE / CLOUD_SHELL:
  │   │   │   ├─→ createCodeAssistContentGenerator()
  │   │   │   └─→ Wrap with LoggingContentGenerator
  │   │   │
  │   │   └─ USE_GEMINI / CUSTOM_AUTH / USE_VERTEX_AI:
  │   │       ├─→ new GoogleGenAI({
  │   │       │     apiKey: config.apiKey,
  │   │       │     vertexai: config.vertexai,
  │   │       │     httpOptions: { headers }
  │   │       │   })
  │   │       │
  │   │       └─→ Wrap GoogleGenAI.models with LoggingContentGenerator
  │   │
  │   ├─→ Store: this.contentGenerator = generator
  │   ├─→ Store: this.contentGeneratorConfig = newContentGeneratorConfig
  │   └─→ Initialize: this.baseLlmClient = new BaseLlmClient(generator, this)
  │
  └─→ setAuthState(Authenticated) ✓
      │
      └─→ DialogManager stops showing dialogs
          App component renders
          User can now:
          • Type prompts
          • Use slash commands (/model, etc.)
          • Make API calls via useGeminiStream
```

---

## 2. Custom Auth Validation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CUSTOM AUTH VALIDATION FLOW                             │
└─────────────────────────────────────────────────────────────────────────────┘

User selects "Custom Auth" in AuthDialog
  │
  └─→ handleAuthSelect(AuthType.CUSTOM_AUTH)
      │
      ├─→ validateAuthMethodWithSettings(CUSTOM_AUTH, settings)
      │   │
      │   ├─→ Check if auth is enforced?
      │   │   └─ NO → Continue
      │   │
      │   ├─→ Check if using external auth?
      │   │   └─ NO → Continue
      │   │
      │   ├─→ Is this USE_GEMINI?
      │   │   └─ NO → Continue
      │   │
      │   └─→ Call validateAuthMethod(CUSTOM_AUTH)
      │       │
      │       └─→ [File: packages/cli/src/config/auth.ts]
      │           │
      │           ├─→ Check authMethod === 'custom-auth'? ✓
      │           │
      │           ├─→ Get customApiKey from process.env['GEMINI_API_KEY']
      │           │   │
      │           │   └─→ Check: customApiKey === 'abc123'?
      │           │       │
      │           │       ├─ YES → Return null (validation passes)
      │           │       │
      │           │       └─ NO → Return error message:
      │           │           "Invalid custom API key.
      │           │            Please set GEMINI_API_KEY to 'abc123'."
      │           │
      │           └─→ Return result to handleAuthSelect
      │
      ├─→ If error message returned:
      │   └─→ onAuthError(error)
      │       └─→ Show error in AuthDialog
      │
      └─→ If no error:
          └─→ onSelect(CUSTOM_AUTH, SettingScope.User)
              │
              ├─→ settings.setValue(..., 'security.auth.selectedType', CUSTOM_AUTH)
              │
              └─→ [Continue with refreshAuth() flow]
                  └─→ createContentGeneratorConfig()
                      └─→ Config will use the API key from env
                      └─→ createContentGenerator()
                          └─→ new GoogleGenAI({ apiKey })
```

---

## 3. API Key Storage & Retrieval Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     API KEY STORAGE FLOW                                    │
└─────────────────────────────────────────────────────────────────────────────┘

SAVING API KEY:
  │
  User enters key in ApiAuthDialog and presses Enter
  │
  └─→ handleApiKeySubmit(apiKey)
      │
      ├─→ Validate: !apiKey.trim() && apiKey.length > 1
      │   └─ NO → Continue
      │
      └─→ saveApiKey(apiKey)
          │ [File: packages/core/src/core/apiKeyCredentialStorage.ts]
          │
          ├─→ If apiKey is empty/null:
          │   ├─→ storage.deleteCredentials('default-api-key')
          │   └─→ Return
          │
          └─→ If apiKey has content:
              ├─→ Wrap in OAuthCredentials format:
              │   {
              │     serverName: 'default-api-key',
              │     token: {
              │       accessToken: apiKey,
              │       tokenType: 'ApiKey'
              │     },
              │     updatedAt: Date.now()
              │   }
              │
              └─→ storage.setCredentials(credentials)
                  │
                  └─→ HybridTokenStorage
                      │
                      ├─ Service name: 'gemini-cli-api-key'
                      ├─ Entry name: 'default-api-key'
                      │
                      └─→ Stores in system keychain (platform-specific):
                          ├─ macOS: Keychain
                          ├─ Windows: Credential Manager
                          ├─ Linux: Pass / other backends
                          └─ Fallback: Encrypted file

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LOADING API KEY:
  │
  During authentication flow: reloadApiKey()
  │
  └─→ loadApiKey()
      │ [File: packages/core/src/core/apiKeyCredentialStorage.ts]
      │
      ├─→ Try: storage.getCredentials('default-api-key')
      │   │
      │   └─→ HybridTokenStorage reads from:
      │       ├─ System keychain first
      │       └─ Fallback: encrypted file
      │
      ├─→ If credentials found:
      │   ├─→ Extract: credentials.token.accessToken
      │   └─→ Return apiKey
      │
      ├─→ If not found or error:
      │   └─→ Return null
      │
      └─→ Back in AppContainer:
          ├─→ setApiKeyDefaultValue(key)
          └─→ Pass to ApiAuthDialog as defaultValue prop

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

USING STORED API KEY:
  │
  During refreshAuth(): createContentGeneratorConfig()
  │
  └─→ const geminiApiKey = (await loadApiKey()) || process.env['GEMINI_API_KEY']
      │
      ├─→ Tries stored key first
      └─→ Falls back to environment variable
          │
          └─→ Returns whichever is available
              │
              └─→ Passed to createContentGenerator()
                  │
                  └─→ new GoogleGenAI({ apiKey })
                      └─→ Authenticates API calls with this key
```

---

## 4. Model Selection Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     MODEL SELECTION FLOW                                    │
└─────────────────────────────────────────────────────────────────────────────┘

User is authenticated and using Gemini CLI
  │
  ├─→ User types: /model
  │   │
  │   └─→ SlashCommandProcessor recognizes "/model"
  │       │
  │       └─→ setAuthState(AuthState.Updating)
  │           └─→ Actually triggers model dialog (confusing naming)
  │
  └─→ DialogManager detects isModelDialogOpen = true
      │
      ├─→ Renders: <ModelDialog onClose={closeModelDialog} />
      │
      └─→ ModelDialog Component:
          │ [File: packages/cli/src/ui/components/ModelDialog.tsx]
          │
          ├─→ Read current model: config.getModel()
          │
          ├─→ Find initialIndex in MODEL_OPTIONS
          │
          ├─→ Render DescriptiveRadioButtonSelect with:
          │   │
          │   └─ Options:
          │       ├─ Auto (recommended) - DEFAULT_GEMINI_MODEL_AUTO
          │       ├─ Pro - DEFAULT_GEMINI_MODEL
          │       ├─ Flash - DEFAULT_GEMINI_FLASH_MODEL
          │       └─ Flash-Lite - DEFAULT_GEMINI_FLASH_LITE_MODEL
          │
          ├─→ User navigates with arrow keys / numbers
          │
          ├─→ User presses Enter to select
          │   │
          │   └─→ handleSelect(model)
          │       │
          │       ├─→ config.setModel(model)
          │       │   - Stores in Config instance
          │       │
          │       ├─→ logModelSlashCommand(config, event)
          │       │   - Logs telemetry
          │       │
          │       └─→ onClose()
          │           └─→ closeModelDialog()
          │               └─→ DialogManager hides ModelDialog
          │
          └─→ User presses Esc to cancel
              └─→ onClose()
                  └─→ ModelDialog closes without change

NEXT API CALL:
  │
  User types a prompt
  │
  └─→ useGeminiStream hook triggers
      │
      ├─→ Get current model: config.getModel()
      │   └─→ Returns the newly selected model
      │
      ├─→ Get ContentGenerator: config.getContentGenerator()
      │
      └─→ Call: contentGenerator.generateContentStream({
          ├─ model: selectedModel,
          ├─ contents: messages,
          ├─ tools: toolRegistry.getFunctionDeclarations(),
          └─ ...
        })
        │
        └─→ GoogleGenAI.models.generateContentStream()
            │
            └─→ Makes API call with new model
                └─→ Response streamed to UI
```

---

## 5. From API Key to API Request

```
┌─────────────────────────────────────────────────────────────────────────────┐
│            FROM API KEY STORAGE TO ACTUAL API REQUEST                      │
└─────────────────────────────────────────────────────────────────────────────┘

API KEY STORAGE (Keychain):
┌──────────────────────────────┐
│ Service: gemini-cli-api-key  │
│ Entry: default-api-key       │
│ Value: user's_api_key_here   │
└──────────────────────────────┘
          │
          │ (During authentication)
          │
          ▼
loadApiKey()
│
├─→ HybridTokenStorage.getCredentials()
│
└─→ Returns: {
      serverName: 'default-api-key',
      token: { accessToken: 'user_api_key', tokenType: 'ApiKey' },
      updatedAt: 1234567890
    }
          │
          │
          ▼
createContentGeneratorConfig():
│
├─→ Extract: credentials.token.accessToken
│
└─→ Return: {
      authType: 'gemini-api-key',
      apiKey: 'user_api_key',
      vertexai: false,
      proxy: undefined
    }
          │
          │
          ▼
createContentGenerator():
│
└─→ new GoogleGenAI({
      apiKey: 'user_api_key',
      vertexai: false,
      httpOptions: { headers: {...} }
    })
│
└─→ Returns: GoogleGenAI.models (ContentGenerator)
          │
          │
          ▼
useGeminiStream():
│
├─→ contentGenerator.generateContentStream({
│     model: 'selected-model',
│     contents: [{role: 'user', parts: [{text: 'user prompt'}]}],
│     tools: [...],
│     ...
│   })
│
└─→ GoogleGenAI internally uses stored apiKey for authentication
          │
          │
          ▼
HTTP Request to Google Gemini API:
│
├─ Header: Authorization: Bearer user_api_key
├─ Body: {
│   model: 'gemini-2.0-flash',
│   contents: [...],
│   tools: [...]
│ }
│
└─→ Google's servers verify API key
    └─→ If valid: Return streaming response
    └─→ If invalid: Return 401 Unauthorized
          │
          │
          ▼
Stream Response:
│
└─→ useGeminiStream receives chunks
    └─→ Updates UI with response
```

---

## 6. State Persistence Across Sessions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│               STATE PERSISTENCE ACROSS CLI SESSIONS                         │
└─────────────────────────────────────────────────────────────────────────────┘

SESSION 1 - First Time User:
  │
  ├─ No stored auth type
  ├─ No stored API key
  │
  ├─→ AuthDialog shown
  ├─→ User selects "Use Gemini API Key"
  ├─→ ApiAuthDialog shown
  ├─→ User enters API key
  ├─→ settings.setValue(..., 'security.auth.selectedType', 'gemini-api-key')
  │   └─ Saved to settings.json in home directory
  │
  ├─→ saveApiKey(apiKey)
  │   └─ Saved to system keychain
  │
  └─→ Authentication successful

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SESSION 2 - Same User, Minutes Later:
  │
  ├─→ AppContainer mounts
  │
  ├─→ useAuthCommand hook runs
  │
  ├─→ Checks: settings.merged.security?.auth?.selectedType
  │   └─ FOUND: 'gemini-api-key'
  │
  ├─→ Checks: Do we need API key?
  │   └─ YES (for USE_GEMINI)
  │
  ├─→ reloadApiKey()
  │   ├─→ Try: loadApiKey() from keychain
  │   │   └─ FOUND: 'user_api_key'
  │   │
  │   ├─→ setApiKeyDefaultValue('user_api_key')
  │   │
  │   └─→ Return key (non-empty)
  │
  ├─→ validateAuthMethodWithSettings('gemini-api-key', settings)
  │   └─ PASSES (Gemini API key skips validation)
  │
  ├─→ config.refreshAuth('gemini-api-key')
  │   ├─→ createContentGeneratorConfig()
  │   │   ├─→ loadApiKey() → Gets from keychain
  │   │   └─→ Returns config with apiKey
  │   │
  │   ├─→ createContentGenerator()
  │   │   └─→ new GoogleGenAI({ apiKey })
  │   │
  │   └─→ Store contentGenerator
  │
  ├─→ setAuthState(Authenticated)
  │
  └─→ No dialogs shown - User can immediately use Gemini CLI ✓

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SESSION 3 - User Changed API Key:
  │
  ├─→ AuthDialog shown again (via slash command /auth)
  │
  ├─→ User selects "Use Gemini API Key" again
  │   └─ (or changes from another auth type)
  │
  ├─→ ApiAuthDialog shows
  │   ├─ defaultValue: (old API key from keychain)
  │   └─ User can edit or replace
  │
  ├─→ User enters new key
  │
  ├─→ handleApiKeySubmit(newKey)
  │   ├─→ saveApiKey(newKey)
  │   │   └─ OVERWRITES old key in keychain
  │   │
  │   └─→ config.refreshAuth('gemini-api-key')
  │       └─→ Uses new key
  │
  └─→ Future sessions will use new key

Storage Locations:
┌─────────────────────────────────────────────────────────────────────────────┐
│ Settings (JSON):                                                            │
│ ~/.config/gemini-cli/settings.json (or platform equivalent)                │
│ Contains: auth method, user preferences, etc.                              │
│                                                                             │
│ API Key (Secure):                                                          │
│ Platform keychain (Keychain.app on macOS, Credential Manager on Windows,   │
│ Pass on Linux, etc.)                                                        │
│ Service name: gemini-cli-api-key                                           │
│ Entry name: default-api-key                                                │
└─────────────────────────────────────────────────────────────────────────────┘
```
