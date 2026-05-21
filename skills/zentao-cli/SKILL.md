---
name: zentao-cli
description: Use this skill to query, create, and maintain Zentao bugs, stories, test cases, products, projects, users, and documents through the zentao CLI.
---

The `zentao` CLI exposes Zentao operations directly in the terminal. Use it for
one-off queries, batch checks, and scripted maintenance without starting an MCP
client.

## Setup

If this is your first time using the CLI, see
[references/installation.md](references/installation.md). Installation is a
one-time prerequisite rather than part of the normal workflow.

During setup, automatically check whether the installed CLI is older than the
latest published package so the user can stay on the newest version. Follow
[references/version-check.md](references/version-check.md) and prompt the user
to update when a newer version is available.

## AI Workflow

1. **Confirm configuration**: Prefer environment variables
   `ZENTAO_URL`, `ZENTAO_ACCOUNT`, `ZENTAO_PASSWORD`, `ZENTAO_VERSION`, and
   `ZENTAO_SKIP_SSL` so passwords are not written into shell history.
2. **Check version freshness when behavior matters**: Compare the installed CLI
   version with the latest published package version before debugging unknown
   commands, missing flags, or behavior that may have changed recently. If a
   newer version exists, tell the user to update before continuing.
3. **Confirm client version**: Before using version-sensitive commands or
   arguments, run `zentao client getVersion`. Use the returned `clientVersion`
   value (`legacy`, `v1`, or `v2`) to choose supported argument values, such as
   `browseType`.
4. **Inspect before writing**: Before create, resolve, close, or edit actions,
   use `view` or `list` to confirm the target object exists and is in the
   expected state.
5. **Execute**: Run `zentao <resource> <action>` directly. Output defaults to
   formatted JSON and can be piped into `jq`, scripts, or later analysis.
6. **Verify**: After a write action, run `view` again to confirm the state,
   title, content, or comment changed as expected.

## Command Usage

```bash
zentao <resource> <action> [arguments] [flags]
```

Common global connection options:

```bash
zentao users me \
  --url "https://zentao.example.com" \
  --account "user" \
  --password "password" \
  --version "v2" \
  --skipSSL
```

Prefer configuring connection details in the shell environment:

```bash
export ZENTAO_URL="https://zentao.example.com"
export ZENTAO_ACCOUNT="user"
export ZENTAO_PASSWORD="password"
export ZENTAO_VERSION="v2"
export ZENTAO_SKIP_SSL="true"
```

Use `--help` on any command:

```bash
zentao --help
zentao client --help
zentao bugs --help
zentao docs --help
```

## Client Version

Before choosing version-sensitive arguments, use the client command to confirm
the effective Zentao client version:

```bash
zentao client getVersion
```

The JSON result includes `clientVersion`. Use that value to choose arguments:

- `v1` / `v2`: Bug `browseType` supports `all`, `unclosed`,
  `assignedtome`, `openedbyme`, and `assignedbyme`.
- `legacy`: Bug `browseType` supports `all`, `unclosed`, `openedbyme`,
  `assigntome`, `resolvedbyme`, `toclosed`, `unresolved`, `unconfirmed`,
  `longlifebugs`, `postponedbugs`, `overduebugs`, and `needconfirm`.

## Bugs

```bash
zentao bugs list --productID 1 --browseType unclosed --limit 20
zentao bugs view --bugID 123

zentao bugs create \
  --productID 1 \
  --title "Login submit button does not respond" \
  --severity 2 \
  --pri 2 \
  --type code \
  --steps "Precondition: test environment is open\nSteps: click Submit\nExpected: form is submitted\nActual: no response"

zentao bugs resolve --bugID 123 --resolution fixed --comment "Fixed and ready for QA"
zentao bugs close --bugID 123 --comment "Verified"
```

## Stories

```bash
zentao stories list --productID 1 --browseType unclosed --limit 20
zentao stories view --storyID 456

zentao stories create \
  --productID 1 \
  --title "Improve login flow" \
  --category feature \
  --pri 2 \
  --spec "Users can log in with a phone number and verification code" \
  --reviewer "zhangsan"

zentao stories close --storyID 456 --closedReason done --comment "Story completed"
```

## Test Cases

`steps` must be passed as a JSON array string.

```bash
zentao testcases list --productID 1 --limit 20
zentao testcases view --caseID 789

zentao testcases create \
  --productID 1 \
  --title "Successful phone verification code login" \
  --type feature \
  --pri 2 \
  --steps '[{"desc":"Enter phone number","expect":"Phone number is valid"},{"desc":"Enter verification code and submit","expect":"Login succeeds"}]'
```

## Products, Projects, Users

```bash
zentao products list --limit 20
zentao products view --productID 1

zentao projects list --limit 20
zentao projects view --projectID 1

zentao users me
zentao users list --limit 20
zentao users view --userID 1
```

## Docs

Document commands use Zentao built-in APIs. Before writing documents, fetch the
space tree to confirm the `libID`, `moduleID`, and directory structure.

```bash
zentao docs tree --spaceType product --spaceID 1
zentao docs view --docID 1001

zentao docs createModule \
  --libID 1 \
  --spaceID 1 \
  --moduleName "API Documentation"

zentao docs create \
  --libID 1 \
  --moduleID 111 \
  --title "Login API Documentation" \
  --content "Endpoint, request parameters, response format..."

zentao docs edit \
  --docID 1001 \
  --title "Login API Documentation" \
  --content "Updated document content"

zentao docs editModule \
  --moduleID 111 \
  --libID 1 \
  --moduleName "Login APIs"
```

## Scripting Patterns

Read commands output JSON and work well with `jq` filters:

```bash
zentao bugs list --productID 1 --browseType unclosed --limit 50 \
  | jq '.[] | {id, title, severity, pri, assignedTo}'
```

Before batch writes, perform inspection-style queries first and confirm each
target ID:

```bash
zentao bugs view --bugID 123
zentao bugs resolve --bugID 123 --resolution fixed --comment "Batch fix verified"
zentao bugs view --bugID 123
```

## Safety

- Do not write `ZENTAO_PASSWORD` into repository files, scripts, or logs.
- Before production writes, inspect the target object and explicitly confirm
  the ID, current state, and impact scope.
- Use `ZENTAO_SKIP_SSL=true` or `--skipSSL` only for self-signed certificate
  environments.
- Get explicit user confirmation before batch close, resolve, or edit actions.
