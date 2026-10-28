---
name: zentao
description: Uses Zentao via MCP for efficient product, project, build, bug, story, test case, document, user, and file operations through the configured @acehubert/zentao-mcp server tools.
---

## Core Concepts

**Server configuration**: The MCP server is provided by `@acehubert/zentao-mcp` and
requires Zentao connection settings such as `ZENTAO_URL`, `ZENTAO_ACCOUNT`,
`ZENTAO_PASSWORD`, `ZENTAO_VERSION`, and optionally `ZENTAO_SKIP_SSL`.
Start it from an MCP client with `npx`:

```json
{
  "mcpServers": {
    "zentao": {
      "command": "npx",
      "args": ["-y", "@acehubert/zentao-mcp@latest"],
      "env": {
        "ZENTAO_URL": "https://zentao.example.com",
        "ZENTAO_ACCOUNT": "your_account",
        "ZENTAO_PASSWORD": "your_password",
        "ZENTAO_VERSION": "v2",
        "ZENTAO_SKIP_SSL": "false"
      }
    }
  }
}
```

**Unified action tools**: Each MCP tool groups related operations under an
`action` argument. Choose the resource tool first, then choose the action, such
as `list`, `view`, `create`, `resolve`, `close`, `tree`, or `edit`.

**Client version confirmation**: Before using version-sensitive tools or
arguments, call `zentao_client` with `action: "getVersion"`. Use the returned
`clientVersion` value (`legacy`, `v1`, or `v2`) to choose the correct argument
values. For example, Bug `browseType` values differ between `legacy` and
`v1`/`v2`.

**ID-driven operations**: Most write actions require stable Zentao IDs. Use
`list`, `view`, or `tree` first to identify the exact `productID`, `projectID`,
`executionID`, `bugID`, `storyID`, `caseID`, `buildID`, `docID`, `libID`,
`moduleID`, or `fileID`.

**Document tree workflow**: Document writes depend on library and module IDs.
Use `zentao_docs` with `action: "tree"` before creating or editing documents
or modules.

**File reads**: Use `zentao_file` or `zentao_docs` with `action: "readFile"` to
read attachments or images. Results may contain base64 content, so keep output
small when possible.

## Workflow Patterns

### Before writing Zentao data

1. When arguments depend on the API version, confirm the effective client
   version with `zentao_client` and `action: "getVersion"`.
2. Identify the target scope with `zentao_products`, `zentao_projects`, or
   `zentao_docs` tree queries.
3. Inspect the target record with `view` or a filtered `list`.
4. Confirm the ID, current state, and requested change.
5. Call the write action.
6. Verify the result with another `view`.

### Bugs

- Use `zentao_bugs` with `action: "list"` to inspect bugs for a product.
- Use `action: "view"` before resolving or closing a bug.
- Use `action: "create"` with complete reproduction steps.
- Use `action: "resolve"` before `action: "close"` unless the target workflow
  explicitly allows direct closing.

### Stories

- Use `zentao_stories` with `action: "list"` to find product stories.
- Use `action: "view"` before closing a story.
- Use `action: "create"` with clear scope, constraints, acceptance criteria,
  and reviewer accounts.

### Test Cases

- Use `zentao_testcases` with `action: "list"` or `action: "view"` before
  creating related coverage.
- Use `action: "create"` with structured step objects that include both `desc`
  and `expect`.

### Builds

- Use `zentao_builds` with `action: "list"` and `executionID` (or `projectID`
  on `v1` / `v2`) to list builds; `legacy` only supports `executionID`.
- Use `action: "view"` with `buildID` to confirm a build before referencing it
  in bugs (`openedBuild`) or test flows.
- Use `action: "create"` with `executionID`, `projectID`, `product`, `name`,
  and `builder` to register a build. `date` defaults to today when omitted.

### Documents

1. Use `zentao_docs` with `action: "tree"` and `spaceType` set to `product` or
   `project`.
2. Select the correct `libID` and optional `moduleID`.
3. Use `action: "create"` or `action: "edit"` for documents.
4. Use `action: "createModule"` or `action: "editModule"` for directories.
5. Verify the final document with `action: "view"`.

## Tool Selection

- **Client version and metadata**: `zentao_client`
- **Bugs**: `zentao_bugs`
- **Stories**: `zentao_stories`
- **Test cases**: `zentao_testcases`
- **Products**: `zentao_products`
- **Projects**: `zentao_projects`
- **Builds**: `zentao_builds`
- **Users and current profile**: `zentao_users`
- **Documents and document trees**: `zentao_docs`
- **Attachments and images**: `zentao_file`

## Efficient Data Retrieval

- Call `zentao_client` with `action: "getVersion"` before choosing
  version-sensitive argument values.
- Use `limit` on list tools to keep responses focused.
- Use filtered browse types when available instead of fetching broad lists.
- For Bug `browseType`, use `all`, `unclosed`, `assignedtome`, `openedbyme`,
  or `assignedbyme` on `v1` / `v2`; use `all`, `unclosed`, `openedbyme`,
  `assigntome`, `resolvedbyme`, `toclosed`, `unresolved`, `unconfirmed`,
  `longlifebugs`, `postponedbugs`, `overduebugs`, or `needconfirm` on
  `legacy`.
- Use `view` after finding a candidate ID to avoid acting on incomplete list
  data.
- Avoid reading large file attachments unless the user specifically needs the
  content.

## Parallel Execution

Independent read-only calls can run in parallel, such as fetching products,
projects, users, and unrelated bug lists. Keep dependent operations ordered:

`list/tree -> view -> create/edit/resolve/close -> view`

Do not run parallel writes against the same Zentao object or the same document
module.

## Safety

- Never expose `ZENTAO_PASSWORD` in user-facing output.
- Get explicit user confirmation before bulk writes or production-impacting
  changes.
- Inspect records before changing them, especially for close, resolve, edit,
  and module operations.
- Preserve Zentao workflow semantics. Do not skip required review, resolve, or
  verification steps unless the user explicitly requests it.

## Troubleshooting

- **Server configuration errors**: Check that `ZENTAO_URL`, `ZENTAO_ACCOUNT`,
  and `ZENTAO_PASSWORD` are configured for the MCP server.
- **API version mismatch**: Try `ZENTAO_VERSION` values `legacy`, `v1`, or `v2`
  according to the target Zentao deployment.
- **Self-signed certificate errors**: Set `ZENTAO_SKIP_SSL=true` only for
  trusted internal environments that use self-signed certificates.
- **Permission errors**: Confirm the configured Zentao account has access to
  the target product, project, document library, or file.
