#!/usr/bin/env node
/**
 * TestLink MCP Server
 * 提供 TestLink 测试资产的常用操作给 AI 助手使用。
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { TestLinkAPI } from "./api.js";
import { resolveTestLinkConfig, type TestLinkConnectionOptions } from "./config.js";

export { TestLinkAPI } from "./api.js";
export type { TestLinkApiOptions } from "./api.js";

dotenv.config({ quiet: true });

type CommandArgs = Record<string, unknown>;

type TestLinkMcpOptions = TestLinkConnectionOptions;

function getString(args: CommandArgs, key: string): string | undefined {
  const value = args[key];
  return typeof value === "string" ? value : undefined;
}

function addConnectionOptions(parser: ReturnType<typeof yargs>): ReturnType<typeof yargs> {
  return parser
    .option("url", {
      type: "string",
      describe: "服务地址；",
    })
    .option("apiKey", {
      type: "string",
      alias: "api-key",
      describe: "API Key；",
    });
}

export function resolveTestLinkMcpOptions(
  options: TestLinkMcpOptions,
): Required<TestLinkMcpOptions> {
  return resolveTestLinkConfig(options);
}

function parseMcpOptions(): TestLinkMcpOptions {
  const args = addConnectionOptions(
    yargs(hideBin(process.argv)).scriptName("npx @acehubert/testlink-mcp@latest"),
  )
    .help(false)
    .version(false)
    .exitProcess(false)
    .showHelpOnFail(false)
    .fail((message, error) => {
      throw error ?? new Error(message);
    })
    .parseSync() as CommandArgs;

  return {
    url: getString(args, "url"),
    apiKey: getString(args, "apiKey"),
  };
}

const tools: Tool[] = [
  {
    name: "read_test_case",
    description: "读取 TestLink 测试用例，支持数字 ID 或外部 ID（如 PREFIX-123）",
    inputSchema: {
      type: "object",
      properties: {
        test_case_id: { type: "string", description: "测试用例 ID" },
      },
      required: ["test_case_id"],
    },
  },
  {
    name: "update_test_case",
    description: "更新 TestLink 测试用例",
    inputSchema: {
      type: "object",
      properties: {
        test_case_id: { type: "string", description: "测试用例 ID" },
        data: {
          type: "object",
          description: "测试用例更新内容",
          properties: {
            name: { type: "string" },
            summary: { type: "string" },
            preconditions: { type: "string" },
            steps: { type: "array" },
            importance: { type: "number" },
            execution_type: { type: "number" },
            status: { type: "number" },
          },
        },
      },
      required: ["test_case_id", "data"],
    },
  },
  {
    name: "create_test_case",
    description: "创建 TestLink 测试用例",
    inputSchema: {
      type: "object",
      properties: {
        data: {
          type: "object",
          properties: {
            testprojectid: { type: "string", description: "测试项目 ID" },
            testsuiteid: { type: "string", description: "测试套件 ID" },
            name: { type: "string", description: "测试用例名称" },
            authorlogin: { type: "string", description: "作者账号" },
            summary: { type: "string" },
            steps: { type: "array" },
            importance: { type: "number" },
            execution_type: { type: "number" },
            status: { type: "number" },
          },
          required: ["testprojectid", "testsuiteid", "name", "authorlogin"],
        },
      },
      required: ["data"],
    },
  },
  {
    name: "delete_test_case",
    description: "删除测试用例。TestLink XML-RPC 无直接删除能力，实际会标记为 obsolete",
    inputSchema: {
      type: "object",
      properties: {
        test_case_id: { type: "string", description: "测试用例 ID" },
      },
      required: ["test_case_id"],
    },
  },
  {
    name: "list_projects",
    description: "列出所有 TestLink 测试项目",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_test_suites",
    description: "列出测试项目下的一级测试套件",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "测试项目 ID" },
      },
      required: ["project_id"],
    },
  },
  {
    name: "read_test_suite",
    description: "读取测试套件详情",
    inputSchema: {
      type: "object",
      properties: {
        suite_id: { type: "string", description: "测试套件 ID" },
      },
      required: ["suite_id"],
    },
  },
  {
    name: "list_test_cases_in_suite",
    description: "列出测试套件中的测试用例",
    inputSchema: {
      type: "object",
      properties: {
        suite_id: { type: "string", description: "测试套件 ID" },
      },
      required: ["suite_id"],
    },
  },
  {
    name: "create_test_suite",
    description: "创建测试套件",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "测试项目 ID" },
        suite_name: { type: "string", description: "测试套件名称" },
        details: { type: "string", description: "测试套件描述" },
        parent_id: { type: "string", description: "父级测试套件 ID" },
      },
      required: ["project_id", "suite_name"],
    },
  },
  {
    name: "update_test_suite",
    description: "更新测试套件",
    inputSchema: {
      type: "object",
      properties: {
        suite_id: { type: "string", description: "测试套件 ID" },
        project_id: { type: "string", description: "测试项目 ID" },
        data: {
          type: "object",
          properties: {
            name: { type: "string" },
            details: { type: "string" },
          },
        },
      },
      required: ["suite_id", "project_id", "data"],
    },
  },
  {
    name: "list_test_plans",
    description: "列出测试项目下的测试计划",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "测试项目 ID" },
      },
      required: ["project_id"],
    },
  },
  {
    name: "create_test_plan",
    description: "创建测试计划",
    inputSchema: {
      type: "object",
      properties: {
        data: {
          type: "object",
          properties: {
            project_id: { type: "string", description: "项目名称或前缀" },
            name: { type: "string", description: "测试计划名称" },
            notes: { type: "string" },
            active: { type: "number" },
            is_public: { type: "number" },
          },
          required: ["project_id", "name"],
        },
      },
      required: ["data"],
    },
  },
  {
    name: "delete_test_plan",
    description: "删除测试计划",
    inputSchema: {
      type: "object",
      properties: {
        plan_id: { type: "string", description: "测试计划 ID" },
      },
      required: ["plan_id"],
    },
  },
  {
    name: "get_test_cases_for_test_plan",
    description: "列出测试计划中的测试用例",
    inputSchema: {
      type: "object",
      properties: {
        plan_id: { type: "string", description: "测试计划 ID" },
      },
      required: ["plan_id"],
    },
  },
  {
    name: "add_test_case_to_test_plan",
    description: "将测试用例加入测试计划",
    inputSchema: {
      type: "object",
      properties: {
        data: {
          type: "object",
          properties: {
            testcaseid: { type: "string", description: "测试用例 ID 或外部 ID" },
            testplanid: { type: "string", description: "测试计划 ID" },
            testprojectid: { type: "string", description: "测试项目 ID" },
            version: { type: "number" },
            platformid: { type: "string" },
            urgency: { type: "number" },
            overwrite: { type: "boolean" },
          },
          required: ["testcaseid", "testplanid", "testprojectid"],
        },
      },
      required: ["data"],
    },
  },
  {
    name: "list_builds",
    description: "列出测试计划下的构建",
    inputSchema: {
      type: "object",
      properties: {
        plan_id: { type: "string", description: "测试计划 ID" },
      },
      required: ["plan_id"],
    },
  },
  {
    name: "create_build",
    description: "创建构建",
    inputSchema: {
      type: "object",
      properties: {
        data: {
          type: "object",
          properties: {
            plan_id: { type: "string", description: "测试计划 ID" },
            name: { type: "string", description: "构建名称" },
            notes: { type: "string" },
            active: { type: "number" },
            open: { type: "number" },
            release_date: { type: "string" },
          },
          required: ["plan_id", "name"],
        },
      },
      required: ["data"],
    },
  },
  {
    name: "close_build",
    description: "关闭构建",
    inputSchema: {
      type: "object",
      properties: {
        build_id: { type: "string", description: "构建 ID" },
      },
      required: ["build_id"],
    },
  },
  {
    name: "read_test_execution",
    description: "读取测试计划执行结果",
    inputSchema: {
      type: "object",
      properties: {
        plan_id: { type: "string", description: "测试计划 ID" },
        build_id: { type: "string", description: "构建 ID" },
      },
      required: ["plan_id"],
    },
  },
  {
    name: "create_test_execution",
    description: "记录测试执行结果",
    inputSchema: {
      type: "object",
      properties: {
        data: {
          type: "object",
          properties: {
            test_case_id: { type: "string", description: "测试用例 ID" },
            plan_id: { type: "string", description: "测试计划 ID" },
            build_id: { type: "string", description: "构建 ID" },
            status: { type: "string", description: "执行状态，如 p/f/b" },
            notes: { type: "string" },
            platform_id: { type: "string" },
            steps: { type: "array" },
          },
          required: ["test_case_id", "plan_id", "build_id", "status"],
        },
      },
      required: ["data"],
    },
  },
  {
    name: "list_requirements",
    description: "列出测试项目下的需求",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "测试项目 ID" },
      },
      required: ["project_id"],
    },
  },
  {
    name: "get_requirement",
    description: "读取需求详情",
    inputSchema: {
      type: "object",
      properties: {
        requirement_id: { type: "string", description: "需求 ID" },
        project_id: { type: "string", description: "测试项目 ID" },
      },
      required: ["requirement_id", "project_id"],
    },
  },
];

function toJsonText(result: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
  };
}

function getRequiredArg(args: CommandArgs, key: string): string {
  const value = args[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`缺少必要参数: ${key}`);
  }
  return value;
}

export function createTestLinkMcpServer(testlinkAPI: TestLinkAPI): Server {
  const server = new Server(
    {
      name: "@acehubert/testlink-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const args = (request.params.arguments ?? {}) as CommandArgs;

    try {
      switch (request.params.name) {
        case "read_test_case":
          return toJsonText(await testlinkAPI.getTestCase(getRequiredArg(args, "test_case_id")));
        case "update_test_case":
          return toJsonText(
            await testlinkAPI.updateTestCase(getRequiredArg(args, "test_case_id"), args.data),
          );
        case "create_test_case":
          return toJsonText(await testlinkAPI.createTestCase(args.data));
        case "delete_test_case":
          return toJsonText(await testlinkAPI.deleteTestCase(getRequiredArg(args, "test_case_id")));
        case "list_projects":
          return toJsonText(await testlinkAPI.getTestProjects());
        case "list_test_suites":
          return toJsonText(await testlinkAPI.getTestSuites(getRequiredArg(args, "project_id")));
        case "read_test_suite":
          return toJsonText(await testlinkAPI.getTestSuiteByID(getRequiredArg(args, "suite_id")));
        case "list_test_cases_in_suite":
          return toJsonText(
            await testlinkAPI.getTestCasesForTestSuite(getRequiredArg(args, "suite_id")),
          );
        case "create_test_suite":
          return toJsonText(
            await testlinkAPI.createTestSuite(
              getRequiredArg(args, "project_id"),
              getRequiredArg(args, "suite_name"),
              getString(args, "details") || "",
              getString(args, "parent_id"),
            ),
          );
        case "update_test_suite":
          return toJsonText(
            await testlinkAPI.updateTestSuite(
              getRequiredArg(args, "suite_id"),
              getRequiredArg(args, "project_id"),
              args.data,
            ),
          );
        case "list_test_plans":
          return toJsonText(await testlinkAPI.getTestPlans(getRequiredArg(args, "project_id")));
        case "create_test_plan":
          return toJsonText(await testlinkAPI.createTestPlan(args.data));
        case "delete_test_plan":
          return toJsonText(await testlinkAPI.deleteTestPlan(getRequiredArg(args, "plan_id")));
        case "get_test_cases_for_test_plan":
          return toJsonText(
            await testlinkAPI.getTestCasesForTestPlan(getRequiredArg(args, "plan_id")),
          );
        case "add_test_case_to_test_plan":
          return toJsonText(await testlinkAPI.addTestCaseToTestPlan(args.data));
        case "list_builds":
          return toJsonText(await testlinkAPI.getBuilds(getRequiredArg(args, "plan_id")));
        case "create_build":
          return toJsonText(await testlinkAPI.createBuild(args.data));
        case "close_build":
          return toJsonText(await testlinkAPI.closeBuild(getRequiredArg(args, "build_id")));
        case "read_test_execution":
          return toJsonText(
            await testlinkAPI.getTestExecutions(
              getRequiredArg(args, "plan_id"),
              getString(args, "build_id"),
            ),
          );
        case "create_test_execution":
          return toJsonText(await testlinkAPI.createTestExecution(args.data));
        case "list_requirements":
          return toJsonText(await testlinkAPI.getRequirements(getRequiredArg(args, "project_id")));
        case "get_requirement":
          return toJsonText(
            await testlinkAPI.getRequirement(
              getRequiredArg(args, "requirement_id"),
              getRequiredArg(args, "project_id"),
            ),
          );
        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  });

  return server;
}

async function main(): Promise<void> {
  const options = resolveTestLinkMcpOptions(parseMcpOptions());
  const testlinkAPI = new TestLinkAPI(options.url, options.apiKey);
  const server = createTestLinkMcpServer(testlinkAPI);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "MCP Server 启动失败");
  process.exit(1);
});
