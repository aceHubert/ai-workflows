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

During setup, automatically check whether the installed CLI is older than the
latest published package so the user can stay on the newest version. Follow
[references/version-check.md](references/version-check.md) and prompt the user
to update when a newer version is available.

## AI Workflow

1. **Choose command mode**: Use `project <id>` for a live Apifox project export
   without cache. Use `oas`, `refs`, or `cache` when working with cached
   OpenAPI data.
2. **Check version freshness when behavior matters**: Compare the installed CLI
   version with the latest published package version before debugging unknown
   commands, missing flags, or behavior that may have changed recently. If a
   newer version exists, tell the user to update before continuing.
3. **Confirm source selection for cache commands**: For `oas`, `refs`, and
   `cache`, pass one of `--projectId`, `--siteId`, or `--oas` explicitly.
   Project sources require `APIFOX_ACCESS_TOKEN`.
4. **Inspect cache state when relevant**: Start cached workflows with
   `cache info` before deciding whether a refresh is necessary.
5. **Run the command**: Use `apifox <resource> <action>`.
6. **Verify the result**: Re-run `oas view` or `refs read` after refreshes or
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
apifox project --help
apifox oas --help
apifox refs --help
apifox cache --help
```

## Live Project Export

Use `project <id>` when you need live OpenAPI data from an Apifox project and
do not want to read or write the local OAS cache:

```bash
apifox project 12345 \
  --selected-tags User \
  --oas-version 3.1
```

Rules for `project <id>`:

- Put the Apifox project ID in the positional `<id>` argument.
- Do not pass `--projectId`, `--siteId`, or `--oas`; those source flags are
  only for cache-backed commands.
- Do not pass `--apiPageSize` or `--dataLocation`; `project <id>` does not
  materialize the OAS cache.
- Provide exactly one scope selector:
  - `--selected-tags`
  - `--selected-folder-ids`
  - `--selected-endpoint-ids`
- Optional project export flags include `--excluded-by-tags`,
  `--include-apifox-extension-properties`, `--add-folders-to-tags`,
  `--oas-version`, `--export-format`, `--branch-id`, `--module-id`, and
  `--environment-ids`.
- `APIFOX_ACCESS_TOKEN` or `--token` is required for Apifox project access.

## OpenAPI Documents

```bash
apifox oas view --projectId 12345
apifox oas refresh --projectId 12345
```

`oas` is cache-backed. Use `--apiPageSize` only here when controlling how
`paths` are split into paginated cache files. Use `--dataLocation` here only
when overriding the cache root.

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

`refs read` reads existing cache files. It accepts `--dataLocation` to locate a
non-default cache root, but it does not accept `--apiPageSize`.

## Cache

```bash
apifox cache info --projectId 12345
apifox cache info --oas /tmp/openapi.json
```

`cache info` accepts `--dataLocation` to inspect a non-default cache root, but
it does not accept `--apiPageSize`.

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

A live project export workflow:

```bash
apifox project 12345 \
  --selected-endpoint-ids 1001,1002 \
  --export-format JSON
```

## Safety

- Do not put `APIFOX_ACCESS_TOKEN` into repository files, shell history, or
  logs.
- When only a subset of the document is needed, read specific `$ref` files
  instead of expanding everything.
- For large specs, read the main index first and then follow only relevant
  references.

## Troubleshooting

- **Potentially outdated CLI**: Compare `apifox --version` with
  the latest published package version. See
  [references/version-check.md](references/version-check.md).
- **Missing required arguments for cache commands**: Confirm `oas`, `refs`, and
  `cache` include `--projectId`, `--siteId`, or `--oas`.
- **Unknown argument on `project <id>`**: Remove cache/source flags such as
  `--projectId`, `--siteId`, `--oas`, `--apiPageSize`, and `--dataLocation`.
- **Missing project scope**: `project <id>` requires exactly one of
  `--selected-tags`, `--selected-folder-ids`, or `--selected-endpoint-ids`.
- **Project read failure**: Confirm `APIFOX_ACCESS_TOKEN` matches the target
  project.
- **Cache path is not writable**: Set `--dataLocation` or
  `APIFOX_DATA_LOCATION`.
- **Referenced file missing**: Run `oas refresh` and then try reading the file
  again.
