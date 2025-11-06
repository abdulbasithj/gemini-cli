# Authentication Flow Architecture - Gemini CLI

## 1. User Authentication Selection Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Starts Gemini CLI                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Check Settings for stored authType                              │
│  (security.auth.selectedType)                                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
          ✓ Found             Not Found
              │                     │
              │         ┌───────────▼──────────────┐
              │         │  AuthDialog Shows Menu:  │
              │         │  1. Login with Google    │
              │         │  2. Use Gemini API Key   │
              │         │  3. Vertex AI            │
              │         │  4. Cloud Shell          │
              │         │  5. Custom Auth          │
              │         └───────────┬──────────────┘
              │                     │
              └──────────┬──────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │    User Selects Auth Type          │
        │    (validateAuthMethodWithSettings)│
        └────────────┬───────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
    ✓ Valid              ❌ Validation Error
         │                       │
         │            Show Error & Retry
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
        ┌──────────────────────────────────────────┐
        │  Save to Settings File                   │
        │  (.gemini/settings.json)                 │
        │  security.auth.selectedType = authType   │
        └──────────┬───────────────────────────────┘
                   │
                   ▼
        ┌──────────────────────────────────────────┐
        │  config.refreshAuth(authType)            │
        │  - Load existing credentials if present  │
        │  - Route to provider-specific auth       │
        └──────────┬───────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
    Needs Key/OAuth     Has Cached Creds
         │                   │
         ▼                   ▼
    Prompt for      Create ContentGenerator
    API Key/OAuth       (Ready to use)
         │                   │
         ▼                   │
    Save to Keychain        │
         │                   │
         └─────────┬─────────┘
                   │
                   ▼
        ┌──────────────────────────────────────────┐
        │    ✓ Authentication Successful           │
        │    User can start prompting              │
        └──────────────────────────────────────────┘
```

## 2. API Request & Authentication Flow

```
┌─────────────────────────────────────┐
│   User Sends Prompt to CLI          │
│   (e.g., /ask "What is AI?")        │
└────────────┬────────────────────────┘
             │
             ▼
    ┌────────────────────────────────────┐
    │  GeminiClient.sendMessageStream()  │
    │  Turn.run(model, request)          │
    └────────────┬─────────────────────┘
                 │
                 ▼
    ┌────────────────────────────────────┐
    │  contentGenerator.generateContent()│
    │  (Based on authType)               │
    └────────────┬─────────────────────┘
                 │
    ┌────────────┴───────────────────────┐
    │                                    │
    ▼ (If GoogleGenAI)                   ▼ (If OAuth)
    │                                    │
┌───────────────────┐         ┌──────────────────────┐
│ GoogleGenAI Client│         │CodeAssistGenerator   │
│ (Gemini/Vertex)  │         │(Uses OAuth tokens)   │
└───────┬───────────┘         └──────────┬──────────┘
        │                               │
        └───────────┬────────────────────┘
                    │
                    ▼
        ┌──────────────────────────────────────┐
        │  API Call to Provider                │
        │  (With API Key or OAuth Token)       │
        │  (With User-Agent, telemetry headers)│
        └────────────┬─────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
    ✓ 200 OK                     ❌ Error
        │                         │
        ▼                         ▼
    ┌──────────┐         ┌────────────────────┐
    │ Parse    │         │ Check Status Code  │
    │ Response │         └────────┬───────────┘
    │ (Stream) │                  │
    └────┬─────┘        ┌─────────┴────────┐
         │              │                  │
         ▼          401/403             429/5xx
    ┌─────────────┐     │                  │
    │ Return      │     ▼                  ▼
    │ Content to  │ ┌──────────┐    ┌──────────┐
    │ User        │ │ Auth     │    │  Retry   │
    │ (Display)   │ │ Failed   │    │  with    │
    └─────────────┘ │ Error    │    │Backoff   │
                    └──────────┘    └────┬─────┘
                                         │
                                    ┌────┴─────┐
                                    │           │
                                Success   Max Retries
                                    │      Exceeded
                                    │           │
                                    ▼           ▼
                              Continue   ┌─────────────┐
                                         │ Fallback    │
                                         │ Handler:    │
                                         │ - Switch    │
                                         │   model or  │
                                         │   auth      │
                                         └─────────────┘
```

## 3. Detailed Auth Type Handling

```
┌─────────────────────────────────────────────────────────────────┐
│  authType Specific Handling in createContentGeneratorConfig()   │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ LOGIN_WITH   │ │ USE_GEMINI   │ │ USE_VERTEX   │
│ GOOGLE       │ │ + CUSTOM_AUTH│ │     _AI      │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       ▼                ▼                ▼
  ┌──────────┐   ┌──────────┐    ┌──────────┐
  │ OAuth    │   │ Load API │    │Load GCP  │
  │ Bearer   │   │ Key from │    │Credentials
  │ Token    │   │Keychain: │    │(Project, │
  │From code │   │ GEMINI_  │    │Location, │
  │-assist   │   │ API_KEY  │    │API_KEY)  │
  └────┬─────┘   └────┬─────┘    └────┬─────┘
       │              │               │
       │              ├─Not Found─────┤
       │              │               │
       │              ▼               ▼
       │        Fallback to env    Fallback to env
       │        process.env        process.env
       │        GEMINI_API_KEY     GOOGLE_API_KEY
       │              │               │
       └──────┬───────┴───────┬───────┘
              │               │
              ▼               ▼
        ┌────────────────────────────────┐
        │ ContentGeneratorConfig:        │
        │ {                              │
        │   apiKey?: string,             │
        │   vertexai?: boolean,          │
        │   authType: AuthType,          │
        │   proxy?: string               │
        │ }                              │
        └────────────────────────────────┘
```

## 4. API Key Storage Architecture

```
┌────────────────────────────────────────────────────────────────┐
│              API Key Credential Storage                         │
└──────────────────────────┬─────────────────────────────────────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              ▼
      ┌──────────┐   ┌──────────┐   ┌──────────┐
      │Keychain  │   │Environment│   │.env File │
      │(Primary) │   │Variables  │   │(Project) │
      │          │   │(Fallback) │   │(Loaded)  │
      └────┬─────┘   └────┬─────┘   └────┬─────┘
           │              │              │
           │ HybridToken  │ process.env  │ loadEnvironment()
           │ Storage      │              │
           │              │              │
      Service: 'gemini-cli-api-key'
      Entry:   'default-api-key'
           │              │              │
           └──────────────┼──────────────┘
                          │
                          ▼
            ┌─────────────────────────────┐
            │ loadApiKey()                │
            │ Try order:                  │
            │ 1. Keychain (HybridStorage)│
            │ 2. GEMINI_API_KEY env var  │
            │ 3. GOOGLE_API_KEY env var  │
            │ Returns: string | null      │
            └──────────┬──────────────────┘
                       │
                ┌──────┴──────┐
                │             │
            ✓ Found       Not Found
                │             │
                │   Prompt user for API key
                │             │
                └──────┬──────┘
                       │
                       ▼
            ┌─────────────────────────────┐
            │ saveApiKey(apiKey)          │
            │ Wraps in OAuthCredentials:  │
            │ {                           │
            │   serverName: DEFAULT_...,  │
            │   token: {                  │
            │     accessToken: apiKey,    │
            │     tokenType: 'ApiKey'     │
            │   },                        │
            │   updatedAt: Date.now()     │
            │ }                           │
            │ Saves to Keychain           │
            └─────────────────────────────┘
```

## 5. Error Handling & Retry Logic

```
┌──────────────────────────────────────┐
│    API Call Returns Error Response    │
└────────────┬───────────────────────┐
             │                       │
             ▼ retryWithBackoff()    │
        ┌─────────────────────┐      │
        │ Check Status Code   │      │
        └────────┬────────────┘      │
                 │                   │
    ┌────────────┼────────────────────────┐
    │            │                        │
    ▼        ▼ 400          ▼ 401/403   ▼ 429/5xx
┌────────┐┌───────┐┌──────────────┐┌──────────┐
│ 4xx    ││Bad    ││ Auth Failed  ││ Rate     │
│(non-   ││Request││              ││ Limited  │
│ auth)  ││       ││ DON'T RETRY  ││ or 5xx   │
│        ││       ││              ││          │
│DON'T   │└───────┘└──────┬───────┘│ RETRY w/ │
│RETRY   │                │        │ Backoff  │
│        │            ┌───▼────────┤          │
└────────┘            │   │        └──────────┘
                      │   │              │
                      │   │         ┌────┴──────┐
                      │   │         │            │
                      │   ▼         ▼ Max       ▼ Success
                      │ Throw   Retries      Return 200
                      │ Error   Exceeded
                      │           │
                      │           ▼
                      │       Error Message:
                      │       - [API Error: <msg>]
                      │       - Status code
                      │       - Provider-specific
                      │         suggestions
                      │
    ┌─────────────────┴────────┐
    │                          │
    ▼                          ▼
parseAndFormatApiError() parseGoogleApiError()
    │                          │
    ├─ Detect 429             ├─ Parse nested
    ├─ Format error msg        │  error structures
    ├─ Add rate-limit help     ├─ Extract quota
    └─ Auth-type specific      │  failure details
       messaging               └─ Handle standard
                                  Google format
```

## 6. Provider Switching & Fallback

```
┌──────────────────────────────────────────────────────────────┐
│  Quota Exhausted or Auth Issue Detected                      │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
        ┌────────────────────────────┐
        │ handleFallback()           │
        │ (fallback/handler.ts)      │
        └────────┬───────────────────┘
                 │
        ┌────────┴──────────┐
        │                   │
        ▼                   ▼
    Model        Auth Method
    Fallback     Fallback (future)
        │                   │
        ▼                   ▼
  Switch to   Suggest user
  DEFAULT_    switch auth:
  GEMINI_     • From USE_GEMINI
  FLASH_        → USE_VERTEX_AI
  MODEL       • From USE_VERTEX_AI
        │       → USE_GEMINI
        │     • From both
        │       → LOGIN_WITH_GOOGLE
        │                   │
        └───────┬───────────┘
                │
                ▼
        Retry API call with
        appropriate fallback
```

## 7. Multi-Auth Support (Future State)

```
┌────────────────────────────────────────────────────────────┐
│  Extended AuthType Enum (After Implementation)             │
└────────────────┬───────────────────────────────────────────┘
                 │
    ┌────────────┼────────────┬─────────────┐
    │            │            │             │
    ▼            ▼            ▼             ▼
  GOOGLE_    OPENAI_        CLAUDE_      OLLAMA_
  AUTH       API_KEY        API_KEY      LOCAL
    │            │            │             │
    ▼            ▼            ▼             ▼
  OAuth      OPENAI_        ANTHROPIC_  Local API
  Token      API_KEY        API_KEY     (no key)
    │            │            │             │
  google.com  api.openai.com  api.          localhost:
              com            anthropic.com  11434
    │            │            │             │
  Bearer      Bearer        Bearer        Basic/None
  Token       Token         Token         Auth
    │            │            │             │
    └────────────┼────────────┼─────────────┘
                 │
                 ▼
        ┌───────────────────────┐
        │ Unified API Response  │
        │ ContentGenerator      │
        │ Interface             │
        │ (Same for all)        │
        └───────────────────────┘
                 │
                 ▼
        User gets consistent
        API regardless of
        provider/auth method
```

## 8. Complete Initialization Sequence

```
[CLI Start]
     │
     ▼
[Load Settings] (loadSettings)
     ├─ System defaults
     ├─ User settings
     ├─ Workspace settings
     └─ Load environment variables
            ├─ .gemini/.env
            ├─ .env (project)
            ├─ ~/.env
            └─ Shell environment
     │
     ▼
[Check Stored Auth]
     ├─ If settings.security.auth.selectedType exists
     │    └─ Use stored auth type
     └─ Else
        └─ Show AuthDialog
     │
     ▼
[Validate Auth Method] (validateAuthMethod)
     ├─ OAuth: No validation needed
     ├─ Gemini: Check GEMINI_API_KEY
     ├─ Vertex: Check GOOGLE_CLOUD_* or GOOGLE_API_KEY
     ├─ Cloud Shell: Check CLOUD_SHELL=true
     └─ Custom: Check GEMINI_API_KEY (extensible)
     │
     ▼
[Create Config Object]
     ├─ Initialize with all settings
     ├─ Prepare proxy if configured
     └─ Set up file discovery, telemetry, etc.
     │
     ▼
[Refresh Auth] (config.refreshAuth)
     ├─ createContentGeneratorConfig()
     │  └─ Load API keys from keychain/env
     ├─ createContentGenerator()
     │  └─ Instantiate provider client
     └─ Initialize BaseLlmClient
     │
     ▼
[Initialize Chat] (geminiClient.initialize)
     ├─ Register available tools
     ├─ Initialize tool registry
     └─ Start chat session
     │
     ▼
[Ready for User Input]
     └─ Accept prompts and send to API
```

---

## Key Files Reference

| Component       | File                                                | Responsibility                       |
| --------------- | --------------------------------------------------- | ------------------------------------ |
| Auth Types      | `packages/core/src/core/contentGenerator.ts`        | Define AuthType enum, config factory |
| Auth Validation | `packages/cli/src/config/auth.ts`                   | Validate auth method requirements    |
| Auth UI         | `packages/cli/src/ui/auth/AuthDialog.tsx`           | User auth selection interface        |
| Auth State      | `packages/cli/src/ui/auth/useAuth.ts`               | Auth state management hook           |
| API Key Storage | `packages/core/src/core/apiKeyCredentialStorage.ts` | Secure key storage/retrieval         |
| API Calls       | `packages/core/src/core/client.ts`                  | GeminiClient (API streaming)         |
| Retry Logic     | `packages/core/src/utils/retry.ts`                  | Retry with exponential backoff       |
| Error Handling  | `packages/core/src/utils/errorParsing.ts`           | Error message formatting             |
| Google Errors   | `packages/core/src/utils/googleErrors.ts`           | Structured Google error parsing      |
| Config          | `packages/core/src/config/config.ts`                | Central configuration object         |
| Settings        | `packages/cli/src/config/settings.ts`               | Settings loading and merging         |

---

## Configuration Precedence

```
Environment Override (HIGHEST)
    │
    ▼
System Settings (/etc/gemini-cli/)
    │
    ▼
Workspace Settings (.gemini/settings.json)
    │
    ▼
User Settings (~/.gemini/settings.json)
    │
    ▼
System Defaults (LOWEST)
```

For **API Keys** specifically:

```
Environment Variables (HIGHEST)
    │
    ▼
System Keychain (Primary)
    │
    ▼
.env File (Fallback)
    │
    ▼
User Input Prompt (LOWEST)
```
