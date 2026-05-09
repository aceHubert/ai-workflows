---
name: apifox-cli
description: Use the apifox CLI to read, refresh, and inspect Apifox/OpenAPI caches directly from the terminal for one-off queries, scripting, and local debugging.
---

The `apifox` CLI exposes Apifox/OpenAPI document access directly in the
terminal. Use it for one-off queries, scripted checks, and local debugging
without starting an MCP client first.

## Setup

If this is your first time using the CLI, see
[references/installation.md](references/installation.md). Installation is a
one-time prerequisite rather than part of the normal workflow.

## AI Workflow

1. **Confirm source selection**: Pass one of `--projectId`, `--siteId`, or
   `--oas` explicitly. Project mode also requires `APIFOX_ACCESS_TOKEN`.
2. **Inspect cache state**: Start with `cache info` before deciding whether a
   refresh is necessary.
3. **Run the command**: Use `apifox <resource> <action>`.
4. **Verify the result**: Re-run `oas view` or `refs read` after refreshes or
   cache-related work.

## Command Usage

```bash
apifox <resource> <action> [arguments] [flags]
```

Example with explicit arguments:

```bash
apifox cache info \
  --projectId 12345 \
  --token "your_access_token"
```

Prefer putting only the token in the environment:

```bash
export APIFOX_ACCESS_TOKEN="your_access_token"
```

Use built-in help when needed:

```bash
apifox --help
apifox --version
apifox oas --help
apifox refs --help
apifox cache --help
```

## OpenAPI Documents

```bash
apifox oas view --projectId 12345
apifox oas refresh --projectId 12345
```

For local or remote OAS sources:

```bash
apifox oas view --oas /tmp/openapi.json
apifox oas refresh --oas https://example.com/openapi.json
```

## Referenced Resources

Repeat `--path` to read multiple `$ref` files:

```bash
apifox refs read \
  --projectId 12345 \
  --path /paths/_users.json \
  --path /components/schemas/User.json
```

## Cache

```bash
apifox cache info --projectId 12345
apifox cache info --oas /tmp/openapi.json
```

`cache info` returns JSON including:

- `cacheDir`
- `cacheFile`
- `exists`
- `source`
- `lastUpdatedAt`

## Scripting Patterns

CLI output is JSON and works well with `jq`:

```bash
apifox oas view --oas /tmp/openapi.json | jq '.paths'
```

A common incremental workflow:

```bash
apifox oas refresh --projectId 12345
apifox oas view --projectId 12345
apifox refs read --projectId 12345 --path /components/schemas/index.json
```

## Safety

- Do not put `APIFOX_ACCESS_TOKEN` into repository files, shell history, or
  logs.
- When only a subset of the document is needed, read specific `$ref` files
  instead of expanding everything.
- For large specs, read the main index first and then follow only relevant
  references.

## Troubleshooting

- **Missing required arguments**: Confirm the command includes `--projectId`,
  `--siteId`, or `--oas`.
- **Project read failure**: Confirm `APIFOX_ACCESS_TOKEN` matches the target
  project.
- **Cache path is not writable**: Set `--dataLocation` or
  `APIFOX_DATA_LOCATION`.
- **Referenced file missing**: Run `oas refresh` and then try reading the file
  again.
