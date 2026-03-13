# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn dev          # Start dev server (also starts mask:watch)
yarn build        # Production build (standalone mode)
yarn start        # Run production server
yarn lint         # Run ESLint
yarn test         # Run Jest tests (watch mode)
yarn test:ci      # Run Jest tests (CI, single run)
yarn mask         # Build prompt mask templates
```

**Package manager: Yarn** (not npm or bun).

To run a single test file:
```bash
yarn test path/to/file.test.ts
```

## Architecture

### Multi-Provider LLM Pattern

The app proxies requests to 15+ LLM providers (OpenAI, Anthropic, Google, Azure, Baidu, DeepSeek, etc.).

- **Client-side**: `app/client/api.ts` defines the `ClientApi` abstract interface. Each provider has a concrete implementation in `app/client/platforms/` (e.g., `openai.ts`, `anthropic.ts`).
- **Server-side**: `app/api/[provider]/[...path]/route.ts` is the dynamic catch-all API route. Provider-specific auth/request handling lives in `app/api/{provider}.ts`. Shared logic is in `app/api/common.ts`.
- **Data flow**: Chat component → Zustand store → `ClientApi` (platform-specific) → Next.js API route → external LLM API → streaming response → store update → UI re-render.

### State Management (Zustand)

All stores are in `app/store/`. Each uses a custom `createPersistStore()` wrapper (`app/utils/store.ts`) that persists to IndexedDB via `app/utils/indexedDB-storage.ts`.

Key stores:
- `chat.ts` — conversations, messages, MCP tool calls
- `config.ts` — user preferences, model selection, UI settings
- `access.ts` — API keys, access control
- `mask.ts` — prompt templates ("masks")

### API Routes

Server routes live in `app/api/`:
- `[provider]/[...path]/route.ts` — dynamic proxy for all providers
- `config/route.ts` — server config exposed to client
- `webdav/` and `upstash/` — cloud sync backends
- `read_file/` — file reading service proxy (used by `nextchat-readfile` container)

### Key Files

- `app/constant.ts` — central constants file (model lists, provider configs, etc.)
- `app/typing.ts` — shared TypeScript types
- `app/utils.ts` — core utilities
- `app/utils/chat.ts` — chat-specific utilities (context compression, token counting)
- `app/utils/sync.ts` — sync logic (Upstash Redis and WebDAV)
- `app/mcp/` — Model Context Protocol integration (`ENABLE_MCP=true` to enable)
- `app/masks/` — prompt template definitions (compiled via `yarn mask`)

### Components

`app/components/chat.tsx` (~2400 lines) is the main chat UI. Notable sub-features have their own directories: `realtime-chat/` (WebSocket audio), `sd/` (Stable Diffusion image gen), `voice-print/`.

### Build Modes

Controlled by `BUILD_MODE` env var:
- `standalone` (default) — self-contained Next.js server
- `export` — static export for CDN/static hosting (`yarn export`)

## Local Development Setup

1. Copy `.env.local.example` to `.env.local` (or create it) and add API keys.
2. `yarn install`
3. `yarn dev`

Minimum `.env.local` for Azure deployment:
```
AZURE_API_KEY=...
AZURE_URL=...
AZURE_API_VERSION=2024-12-01-preview
```

## Docker

The `docker-compose.yml` runs two services:
- `nextchat` — the main app (port 3001 locally)
- `nextchat-readfile` — file reading sidecar service (internal port 8000, accessed via `FILE_READING_SERVER` env var)

The production image is `na2cucl4/nextchat:latest`.
