# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Monorepo of MCP (Model Context Protocol) servers and CLIs for AI assistants to manage Zentao, TestLink, and Apifox platforms. Uses lerna with **independent versioning**.

## Commands

```bash
yarn install --mode=skip-build   # Install dependencies (skip build during install)
yarn build                       # Build all packages
yarn typecheck                   # Type-check all packages
yarn lint                        # Lint all packages
yarn test                        # Run tests across all packages
yarn release                     # Interactive publish (independent versions)
```

Single-package commands use `run -T` to access root toolchain:

```bash
cd packages/zentao-api && yarn build
cd packages/zentao-mcp && yarn typecheck
```

Run a single test file:

```bash
cd packages/zentao-api && yarn test -- --testPathPattern="test/foo.spec.ts"
```

## Architecture

```
packages/
├── zentao-api/       # Zentao HTTP client library (axios-based, supports legacy/v1/v2 APIs)
├── zentao-mcp/       # Zentao MCP Server + CLI (depends on zentao-api via workspace:*)
├── testlink-mcp/     # TestLink MCP Server + CLI (uses testlink-xmlrpc)
└── apifox-mcp/       # Apifox MCP Server + CLI (OpenAPI cache reader)
```

Each MCP package produces three outputs via esbuild:

- `dist/index.js` — ESM entry (MCP server)
- `dist/index.cjs` — CJS entry (MCP server, for npx)
- `dist/cli.cjs` — CJS CLI binary

`zentao-api` is a pure library (no CLI, no MCP) consumed by `zentao-mcp`.

## MCP Tool Design Pattern

All tools use a **unified action pattern** — one tool per resource with an `action` enum:

```typescript
{ name: "zentao_bugs", inputSchema: { properties: { action: { enum: ["list", "view", "create", "resolve", "close"] } } } }
```

## Zentao API Versions

- `v2` — REST API, preferred for newer deployments
- `v1` — REST API at `/api.php/v1/...`
- `legacy` — Built-in API at `/index.php?m=xxx&f=xxx` (used for docs, requires session/cookie handling)

The `zentao-api` package exposes `ZentaoLegacy`, `ZentaoV1`, `ZentaoV2` classes. The `zentao-mcp` package wraps these with MCP-compatible client adapters in `src/zentao-clients/`.

## Code Conventions

- Tool names: `zentao_` prefix, plural resource names
- TypeScript strict mode, no unused locals
- Imports: Node builtins → third-party → local
- Each package's `tsconfig.json` extends `../../tsconfig.base.json`
- Built-in API (legacy) uses FormData + `X-Requested-With: XMLHttpRequest` header
- stdout is filtered in MCP servers to only pass protocol messages (JSON-RPC / Content-Length)

## Skills

Located in `skills/` and symlinked from `.claude/skills/`. Each skill has a `SKILL.md` and optional `references/` directory. Available skills: zentao, zentao-cli, testlink, testlink-cli, apifox, apifox-cli.
