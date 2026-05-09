---
name: apifox
description: Use Apifox MCP tools to efficiently read, refresh, and inspect Apifox/OpenAPI caches and $ref resources for Apifox projects, docs sites, or local/remote OAS files.
---

## Core Concepts

**Server configuration**: The MCP server is provided by `@acehubert/apifox-mcp`.
Source selection must be passed explicitly as startup arguments. Provide one of:

- `--projectId`
- `--siteId`
- `--oas`

When the source is an Apifox project, `APIFOX_ACCESS_TOKEN` is also required.
Example MCP configuration:

```json
{
  "mcpServers": {
    "api-docs": {
      "command": "npx",
      "args": ["-y", "@acehubert/apifox-mcp@latest", "--projectId=12345"],
      "env": {
        "APIFOX_ACCESS_TOKEN": "your_access_token"
      }
    }
  }
}
```

**Source types**:

- `project`: export OpenAPI from an Apifox project
- `doc-site`: export MCP data from an Apifox docs site
- `oas`: read a local or remote OpenAPI file directly

**Cache model**: The tool stores a local cache of the full OpenAPI document and
splits `paths` and `components` into `$ref` files. For large specs, read the
main index first and then fetch only the referenced files you need.

**JSON output**: Tool responses are JSON text. Inspect fields, source settings,
and `$ref` paths before using the result in follow-up work.

## Workflow Patterns

### Before reading documentation

1. Confirm whether the source is a `project`, `site`, or `oas`.
2. If it is a `project`, confirm `APIFOX_ACCESS_TOKEN` is available.
3. Call `get_apifox_cache_info` to check cache state.
4. Call `refresh_apifox_oas` when you need the latest document.
5. Then use `read_apifox_oas` or `read_apifox_oas_ref_resources`.

### Document reading

- Use `read_apifox_oas` for the main document index.
- When the index contains `$ref`, use `read_apifox_oas_ref_resources` to load
  those files by path.
- For large specs, prefer reading only the relevant referenced files instead of
  expanding everything.

### Cache refresh

- Use `refresh_apifox_oas` when the user asks for the latest API documentation.
- Refresh first whenever the local cache may be stale.

### Source selection

- Prefer `project` when the user provides an Apifox project ID.
- Use `doc-site` when the user provides a docs site ID.
- Use `oas` when the user gives a Swagger/OpenAPI URL or local file path.
- Local and remote OAS sources do not require `APIFOX_ACCESS_TOKEN`.

## Tool Selection

- **Main document**: `read_apifox_oas`
- **Referenced resources**: `read_apifox_oas_ref_resources`
- **Refresh cache**: `refresh_apifox_oas`
- **Cache details**: `get_apifox_cache_info`

## Efficient Retrieval

- Read the main index first, then the required `$ref` files.
- Only load the path or schema resources needed for the current task.
- If the main document contains `x-pagination`, continue through the paginated
  path references instead of assuming all paths are inline.
- Reuse verified `$ref` paths instead of guessing filenames.

## Parallel Execution

Parallelize independent read-only work such as:

- loading multiple `$ref` files
- reading multiple schemas or paths after a refresh

Keep dependent operations ordered:

`get_apifox_cache_info -> refresh_apifox_oas -> read_apifox_oas -> read_apifox_oas_ref_resources`

Do not run multiple refresh operations against the same source in parallel.

## Safety

- Never expose `APIFOX_ACCESS_TOKEN` in user-facing output.
- Before loading many `$ref` files, confirm that full expansion is actually
  necessary.
- When the user only needs a small subset of endpoints or schemas, avoid
  over-fetching.

## Troubleshooting

- **Missing source config**: Confirm the startup command includes
  `--projectId`, `--siteId`, or `--oas`.
- **Project read failure**: Confirm `APIFOX_ACCESS_TOKEN` is valid and the
  project is accessible to that account.
- **Remote OAS failure**: Confirm the URL is reachable and returns valid JSON.
- **Local cache issues**: Inspect `get_apifox_cache_info`, then refresh the
  cache.
- **Referenced file missing**: The cache may be stale or the `$ref` paths may
  have changed; refresh and try again.
