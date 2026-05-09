---
name: testlink-cli
description: Use this skill to query, create, and maintain TestLink projects, suites, cases, plans, builds, execution results, and requirements through the testlink CLI.
---

The `testlink` CLI exposes TestLink operations directly in the terminal. Use it
for one-off queries, batch checks, and scripted maintenance without starting an
MCP client.

## Setup

_Note: If this is your first time using the CLI, see
[references/installation.md](references/installation.md) to install the command
and configure the connection. Installation is a one-time prerequisite and is
not part of the regular AI workflow._

## AI Workflow

1. **Confirm configuration**: Prefer environment variables `TESTLINK_URL` and
   `TESTLINK_API_KEY` so API keys are not written into shell history.
2. **Inspect before writing**: Before create, update, delete, close, or
   execution actions, use `view` or `list` to confirm the target object exists
   and is in the expected state.
3. **Execute**: Run `testlink <resource> <action>` directly. Output defaults to
   formatted JSON and can be piped into `jq`, scripts, or later analysis.
4. **Verify**: After a write action, run `view` or `list` again to confirm the
   state, title, content, assignment, or execution result changed as expected.

## Command Usage

```bash
testlink <resource> <action> [arguments] [flags]
```

Common global connection options:

```bash
testlink projects list \
  --url "https://testlink.example.com" \
  --apiKey "your_api_key"
```

Prefer configuring connection details in the shell environment:

```bash
export TESTLINK_URL="https://testlink.example.com"
export TESTLINK_API_KEY="your_api_key"
```

Use `--help` on any command:

```bash
testlink --help
testlink --version
testlink cases --help
testlink suites --help
testlink plans --help
```

## Projects

```bash
testlink projects list
```

Use returned project IDs for suite, plan, and requirement operations.

## Test Suites

```bash
testlink suites list --projectId 1
testlink suites view --suiteId 10

testlink suites create \
  --projectId 1 \
  --suiteName "Login" \
  --details "Login-related test suites"

testlink suites create \
  --projectId 1 \
  --suiteName "Password Login" \
  --parentId 10

testlink suites update \
  --suiteId 10 \
  --projectId 1 \
  --data '{"name":"Login Suite","details":"Updated details"}'
```

## Test Cases

`data` must be passed as a JSON object string.

```bash
testlink cases list-in-suite --suiteId 10
testlink cases view --testCaseId PREFIX-123

testlink cases create \
  --data '{"testprojectid":"1","testsuiteid":"10","name":"Successful login","authorlogin":"qa","summary":"Verify login succeeds","steps":[{"step_number":1,"actions":"Enter valid credentials","expected_results":"Login succeeds"}]}'

testlink cases update \
  --testCaseId PREFIX-123 \
  --data '{"summary":"Updated summary","importance":2}'

testlink cases delete --testCaseId PREFIX-123
```

`cases delete` marks the case obsolete; it does not physically delete the case.

## Test Plans

```bash
testlink plans list --projectId 1

testlink plans create \
  --data '{"project_id":"PROJECT_PREFIX","name":"Regression Plan","notes":"Main regression plan"}'

testlink plans list-cases --planId 20

testlink plans add-case \
  --data '{"testcaseid":"PREFIX-123","testplanid":"20","testprojectid":"1","version":1}'

testlink plans delete --planId 20
```

## Builds

```bash
testlink builds list --planId 20

testlink builds create \
  --data '{"plan_id":"20","name":"2026.04.24","notes":"Release validation build"}'

testlink builds close --buildId 30
```

## Executions

```bash
testlink executions list --planId 20
testlink executions list --planId 20 --buildId 30

testlink executions create \
  --data '{"test_case_id":"PREFIX-123","plan_id":"20","build_id":"30","status":"p","notes":"Passed on staging"}'
```

Common TestLink status values are `p` for passed, `f` for failed, and `b` for
blocked. Confirm project-specific status rules when in doubt.

## Requirements

```bash
testlink requirements list --projectId 1
testlink requirements view --projectId 1 --requirementId 100
```

## Scripting Patterns

Read commands output JSON and work well with `jq` filters:

```bash
testlink cases list-in-suite --suiteId 10 \
  | jq '.[] | {id, external_id, name}'
```

Before batch writes, perform inspection-style queries first and confirm each
target ID:

```bash
testlink cases view --testCaseId PREFIX-123
testlink cases update --testCaseId PREFIX-123 --data '{"importance":3}'
testlink cases view --testCaseId PREFIX-123
```

## Safety

- Do not write `TESTLINK_API_KEY` into repository files, scripts, or logs.
- Before production writes, inspect the target object and explicitly confirm
  the ID, current state, and impact scope.
- Get explicit user confirmation before batch updates, plan deletion, build
  closing, execution result updates, or marking test cases obsolete.
