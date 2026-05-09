---
name: testlink
description: Uses TestLink via MCP for efficient test project, test suite, test case, test plan, build, execution result, and requirement operations through the configured @acehubert/testlink-mcp server tools.
---

## Core Concepts

**Server configuration**: The MCP server is provided by `@acehubert/testlink-mcp`
and requires TestLink XML-RPC connection settings: `TESTLINK_URL` and
`TESTLINK_API_KEY`. Start it from an MCP client with `npx`:

```json
{
  "mcpServers": {
    "testlink": {
      "command": "npx",
      "args": ["-y", "@acehubert/testlink-mcp@latest"],
      "env": {
        "TESTLINK_URL": "https://testlink.example.com",
        "TESTLINK_API_KEY": "your_api_key"
      }
    }
  }
}
```

**ID-driven operations**: Most TestLink operations require stable IDs. Use list
and read tools first to identify the exact `project_id`, `suite_id`,
`test_case_id`, `plan_id`, `build_id`, or `requirement_id`.

**Test case IDs**: Test case reads and writes support both numeric IDs such as
`123` and external IDs such as `PREFIX-123`. Prefer external IDs when users
provide them because they are easier to verify across TestLink screens.

**Deletion semantics**: `delete_test_case` does not physically delete a test
case. TestLink XML-RPC does not expose a direct delete method through the
client, so the MCP server marks the test case as obsolete.

**JSON output**: Tool responses are formatted JSON text. Inspect returned
fields before using IDs in follow-up write operations.

## Workflow Patterns

### Before writing TestLink data

1. Identify the target project with `list_projects`.
2. Identify the target suite, plan, build, or requirement with the appropriate
   list/read tool.
3. Inspect the current record with a read tool.
4. Confirm the ID, current state, and requested change.
5. Call the write tool.
6. Verify the result with another read/list call.

### Test Projects

- Use `list_projects` to discover available TestLink projects.
- Use project IDs from the response for suite, plan, and requirement queries.

### Test Suites

- Use `list_test_suites` with `project_id` to inspect top-level suites.
- Use `read_test_suite` before updating a suite.
- Use `create_test_suite` with `parent_id` only when creating nested suites.
- Use `list_test_cases_in_suite` to inspect suite coverage before adding or
  changing test cases.

### Test Cases

- Use `read_test_case` before updating or marking a case obsolete.
- Use `create_test_case` with `testprojectid`, `testsuiteid`, `name`, and
  `authorlogin`.
- Use structured `steps` arrays when creating or updating detailed cases.
- Use `delete_test_case` only when the user accepts that the case will be
  marked obsolete.

### Test Plans and Builds

- Use `list_test_plans` to find plan IDs for a project.
- Use `get_test_cases_for_test_plan` before adding duplicate coverage.
- Use `add_test_case_to_test_plan` with `testcaseid`, `testplanid`, and
  `testprojectid`.
- Use `list_builds` to find build IDs before recording execution results.
- Use `close_build` only after confirming no further executions should be
  recorded for the build.

### Executions

- Use `read_test_execution` to inspect existing plan or build execution
  results.
- Use `create_test_execution` with `test_case_id`, `plan_id`, `build_id`, and
  `status`.
- Common TestLink status values are `p` for passed, `f` for failed, and `b` for
  blocked. Confirm project-specific status rules when in doubt.

### Requirements

- Use `list_requirements` with `project_id` to find requirement IDs.
- Use `get_requirement` before linking decisions or reporting requirement
  details.

## Tool Selection

- **Projects**: `list_projects`
- **Suites**: `list_test_suites`, `read_test_suite`, `create_test_suite`,
  `update_test_suite`
- **Cases**: `read_test_case`, `create_test_case`, `update_test_case`,
  `delete_test_case`, `list_test_cases_in_suite`
- **Plans**: `list_test_plans`, `create_test_plan`, `delete_test_plan`,
  `get_test_cases_for_test_plan`, `add_test_case_to_test_plan`
- **Builds**: `list_builds`, `create_build`, `close_build`
- **Executions**: `read_test_execution`, `create_test_execution`
- **Requirements**: `list_requirements`, `get_requirement`

## Efficient Data Retrieval

- Start with the narrowest list tool that can identify the target ID.
- Prefer read tools after list tools because list responses can omit detail.
- Keep large `steps` payloads focused and avoid dumping broad test plan results
  unless the user needs them.
- Reuse IDs from verified responses instead of guessing IDs from names.

## Parallel Execution

Independent read-only calls can run in parallel, such as listing projects,
plans, builds, and requirements. Keep dependent operations ordered:

`list -> read -> create/update/delete/close/execute -> read/list`

Do not run parallel writes against the same TestLink object, plan, build, or
suite.

## Safety

- Never expose `TESTLINK_API_KEY` in user-facing output.
- Get explicit user confirmation before bulk writes, mass execution result
  updates, deleting plans, closing builds, or marking test cases obsolete.
- Inspect records before changing them, especially for update, delete, close,
  and execution result operations.
- Preserve TestLink workflow semantics. Do not close builds or overwrite plan
  assignments unless the user explicitly requests it.

## Troubleshooting

- **Server configuration errors**: Check that `TESTLINK_URL` and
  `TESTLINK_API_KEY` are configured for the MCP server.
- **Connection refused or timeout**: Confirm the TestLink URL is reachable from
  the MCP server environment.
- **Authentication failed**: Regenerate or verify the TestLink API key for the
  configured account.
- **Object not found**: Re-run the relevant list/read tool and confirm whether
  the ID should be numeric or external ID format.
