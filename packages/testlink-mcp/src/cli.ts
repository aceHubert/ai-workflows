#!/usr/bin/env node
/**
 * TestLink 命令行工具
 * 将 MCP 能力按资源和 action 平铺为可直接执行的 CLI commands。
 */

import dotenv from "dotenv";
import yargs, { type Argv, type ArgumentsCamelCase } from "yargs";
import { hideBin } from "yargs/helpers";
import { TestLinkAPI, type TestLinkRecord } from "./api.js";
import {
  configKeys,
  inspectTestLinkConfig,
  removeSavedTestLinkConfig,
  resolveTestLinkConfig,
  updateSavedTestLinkConfig,
  type TestLinkConfigKey,
  type TestLinkConnectionOptions,
} from "./config.js";

dotenv.config({ quiet: true });

type CommandArgs = ArgumentsCamelCase<Record<string, unknown>>;

type TestLinkCliOptions = TestLinkConnectionOptions;

function getString(args: CommandArgs, key: string): string | undefined {
  const value = args[key];
  return typeof value === "string" ? value : undefined;
}

function addConnectionOptions(parser: Argv): Argv {
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

export function getTestLinkCliOptions(args: CommandArgs): TestLinkCliOptions {
  return {
    url: getString(args, "url"),
    apiKey: getString(args, "apiKey"),
  };
}

export function resolveTestLinkCliOptions(
  options: TestLinkCliOptions,
): Required<TestLinkCliOptions> {
  return resolveTestLinkConfig(options);
}

function getRequiredString(args: CommandArgs, key: string): string {
  const value = getString(args, key);
  if (!value) {
    throw new Error(`缺少必要参数: ${key}`);
  }
  return value;
}

function getJsonObject(args: CommandArgs, key: string): TestLinkRecord | undefined {
  const value = args[key];
  if (value === undefined) return undefined;

  if (typeof value !== "string") {
    throw new Error(`参数 ${key} 必须是 JSON 对象字符串`);
  }

  const parsed = JSON.parse(value) as unknown;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`参数 ${key} 必须是 JSON 对象`);
  }

  return parsed as TestLinkRecord;
}

function printJsonResult(result: unknown): void {
  console.log(JSON.stringify(result, null, 2));
}

function printConfigValue(key: TestLinkConfigKey, value: string | undefined): void {
  console.log(`${key}: ${value ?? "null"}`);
}

function printConfigValues(config: TestLinkCliOptions): void {
  printConfigValue("url", config.url);
  printConfigValue("apiKey", config.apiKey);
}

function getClient(args: CommandArgs): TestLinkAPI {
  const options = resolveTestLinkCliOptions(getTestLinkCliOptions(args));
  return new TestLinkAPI(options.url, options.apiKey);
}

function normalizeConfigKey(key: string): TestLinkConfigKey {
  if (key === "url") return "url";
  if (key === "apiKey" || key === "api-key") return "apiKey";
  throw new Error(`不支持的配置项: ${key}，可用配置项: url, apiKey`);
}

function registerConfigCommands(parser: Argv): Argv {
  return parser.command(
    "config <action> [key] [value]",
    "连接配置操作：get / set / remove",
    (command) =>
      command
        .positional("action", {
          choices: ["get", "set", "remove"] as const,
          describe: "操作类型",
        })
        .positional("key", {
          type: "string",
          choices: configKeys,
          describe: "配置项：url / apiKey",
        })
        .positional("value", {
          type: "string",
          describe: "配置值",
        }),
    async (args: CommandArgs) => {
      const action = getRequiredString(args, "action");

      switch (action) {
        case "get": {
          const inspection = inspectTestLinkConfig(getTestLinkCliOptions(args));
          const rawKey = getString(args, "key");

          if (rawKey) {
            const key = normalizeConfigKey(rawKey);
            printConfigValue(key, inspection.values[key]);
            return;
          }

          printConfigValues(inspection.values);
          return;
        }
        case "set": {
          const key = normalizeConfigKey(getRequiredString(args, "key"));
          const value = getRequiredString(args, "value");
          updateSavedTestLinkConfig(key, value);
          printConfigValue(key, value);
          return;
        }
        case "remove": {
          const key = normalizeConfigKey(getRequiredString(args, "key"));
          removeSavedTestLinkConfig(key);
          console.log(`${key} removed`);
          return;
        }
        default:
          throw new Error(`未知操作类型: ${action}`);
      }
    },
  );
}

function registerProjectCommands(parser: Argv): Argv {
  return parser.command(
    "projects <action>",
    "测试项目操作：list",
    (command) =>
      command.positional("action", {
        choices: ["list"] as const,
        describe: "操作类型",
      }),
    async (args: CommandArgs) => {
      const api = getClient(args);
      const action = getRequiredString(args, "action");

      switch (action) {
        case "list":
          printJsonResult(await api.getTestProjects());
          return;
        default:
          throw new Error(`未知操作类型: ${action}`);
      }
    },
  );
}

function registerCaseCommands(parser: Argv): Argv {
  return parser.command(
    "cases <action>",
    "测试用例操作：view / create / update / delete / list-in-suite",
    (command) =>
      command
        .positional("action", {
          choices: ["view", "create", "update", "delete", "list-in-suite"] as const,
          describe: "操作类型",
        })
        .option("testCaseId", { type: "string", describe: "测试用例 ID 或外部 ID" })
        .option("suiteId", { type: "string", describe: "测试套件 ID" })
        .option("data", { type: "string", describe: 'JSON 对象，例如 \'{"name":"用例名"}\'' }),
    async (args: CommandArgs) => {
      const api = getClient(args);
      const action = getRequiredString(args, "action");

      switch (action) {
        case "view":
          printJsonResult(await api.getTestCase(getRequiredString(args, "testCaseId")));
          return;
        case "create":
          printJsonResult(await api.createTestCase(getJsonObject(args, "data")));
          return;
        case "update":
          printJsonResult(
            await api.updateTestCase(
              getRequiredString(args, "testCaseId"),
              getJsonObject(args, "data"),
            ),
          );
          return;
        case "delete":
          printJsonResult(await api.deleteTestCase(getRequiredString(args, "testCaseId")));
          return;
        case "list-in-suite":
          printJsonResult(await api.getTestCasesForTestSuite(getRequiredString(args, "suiteId")));
          return;
        default:
          throw new Error(`未知操作类型: ${action}`);
      }
    },
  );
}

function registerSuiteCommands(parser: Argv): Argv {
  return parser.command(
    "suites <action>",
    "测试套件操作：list / view / create / update",
    (command) =>
      command
        .positional("action", {
          choices: ["list", "view", "create", "update"] as const,
          describe: "操作类型",
        })
        .option("projectId", { type: "string", describe: "测试项目 ID" })
        .option("suiteId", { type: "string", describe: "测试套件 ID" })
        .option("suiteName", { type: "string", describe: "测试套件名称" })
        .option("details", { type: "string", describe: "测试套件描述" })
        .option("parentId", { type: "string", describe: "父级测试套件 ID" })
        .option("data", { type: "string", describe: 'JSON 对象，例如 \'{"name":"套件名"}\'' }),
    async (args: CommandArgs) => {
      const api = getClient(args);
      const action = getRequiredString(args, "action");

      switch (action) {
        case "list":
          printJsonResult(await api.getTestSuites(getRequiredString(args, "projectId")));
          return;
        case "view":
          printJsonResult(await api.getTestSuiteByID(getRequiredString(args, "suiteId")));
          return;
        case "create":
          printJsonResult(
            await api.createTestSuite(
              getRequiredString(args, "projectId"),
              getRequiredString(args, "suiteName"),
              getString(args, "details") || "",
              getString(args, "parentId"),
            ),
          );
          return;
        case "update":
          printJsonResult(
            await api.updateTestSuite(
              getRequiredString(args, "suiteId"),
              getRequiredString(args, "projectId"),
              getJsonObject(args, "data") ?? {
                name: getString(args, "suiteName"),
                details: getString(args, "details"),
              },
            ),
          );
          return;
        default:
          throw new Error(`未知操作类型: ${action}`);
      }
    },
  );
}

function registerPlanCommands(parser: Argv): Argv {
  return parser.command(
    "plans <action>",
    "测试计划操作：list / create / delete / list-cases / add-case",
    (command) =>
      command
        .positional("action", {
          choices: ["list", "create", "delete", "list-cases", "add-case"] as const,
          describe: "操作类型",
        })
        .option("projectId", { type: "string", describe: "测试项目 ID" })
        .option("planId", { type: "string", describe: "测试计划 ID" })
        .option("data", { type: "string", describe: "JSON 对象" }),
    async (args: CommandArgs) => {
      const api = getClient(args);
      const action = getRequiredString(args, "action");

      switch (action) {
        case "list":
          printJsonResult(await api.getTestPlans(getRequiredString(args, "projectId")));
          return;
        case "create":
          printJsonResult(await api.createTestPlan(getJsonObject(args, "data")));
          return;
        case "delete":
          printJsonResult(await api.deleteTestPlan(getRequiredString(args, "planId")));
          return;
        case "list-cases":
          printJsonResult(await api.getTestCasesForTestPlan(getRequiredString(args, "planId")));
          return;
        case "add-case":
          printJsonResult(await api.addTestCaseToTestPlan(getJsonObject(args, "data")));
          return;
        default:
          throw new Error(`未知操作类型: ${action}`);
      }
    },
  );
}

function registerBuildCommands(parser: Argv): Argv {
  return parser.command(
    "builds <action>",
    "构建操作：list / create / close",
    (command) =>
      command
        .positional("action", {
          choices: ["list", "create", "close"] as const,
          describe: "操作类型",
        })
        .option("planId", { type: "string", describe: "测试计划 ID" })
        .option("buildId", { type: "string", describe: "构建 ID" })
        .option("data", { type: "string", describe: "JSON 对象" }),
    async (args: CommandArgs) => {
      const api = getClient(args);
      const action = getRequiredString(args, "action");

      switch (action) {
        case "list":
          printJsonResult(await api.getBuilds(getRequiredString(args, "planId")));
          return;
        case "create":
          printJsonResult(await api.createBuild(getJsonObject(args, "data")));
          return;
        case "close":
          printJsonResult(await api.closeBuild(getRequiredString(args, "buildId")));
          return;
        default:
          throw new Error(`未知操作类型: ${action}`);
      }
    },
  );
}

function registerExecutionCommands(parser: Argv): Argv {
  return parser.command(
    "executions <action>",
    "执行结果操作：list / create",
    (command) =>
      command
        .positional("action", {
          choices: ["list", "create"] as const,
          describe: "操作类型",
        })
        .option("planId", { type: "string", describe: "测试计划 ID" })
        .option("buildId", { type: "string", describe: "构建 ID" })
        .option("data", { type: "string", describe: "JSON 对象" }),
    async (args: CommandArgs) => {
      const api = getClient(args);
      const action = getRequiredString(args, "action");

      switch (action) {
        case "list":
          printJsonResult(
            await api.getTestExecutions(
              getRequiredString(args, "planId"),
              getString(args, "buildId"),
            ),
          );
          return;
        case "create":
          printJsonResult(await api.createTestExecution(getJsonObject(args, "data")));
          return;
        default:
          throw new Error(`未知操作类型: ${action}`);
      }
    },
  );
}

function registerRequirementCommands(parser: Argv): Argv {
  return parser.command(
    "requirements <action>",
    "需求操作：list / view",
    (command) =>
      command
        .positional("action", {
          choices: ["list", "view"] as const,
          describe: "操作类型",
        })
        .option("projectId", { type: "string", describe: "测试项目 ID" })
        .option("requirementId", { type: "string", describe: "需求 ID" }),
    async (args: CommandArgs) => {
      const api = getClient(args);
      const action = getRequiredString(args, "action");

      switch (action) {
        case "list":
          printJsonResult(await api.getRequirements(getRequiredString(args, "projectId")));
          return;
        case "view":
          printJsonResult(
            await api.getRequirement(
              getRequiredString(args, "requirementId"),
              getRequiredString(args, "projectId"),
            ),
          );
          return;
        default:
          throw new Error(`未知操作类型: ${action}`);
      }
    },
  );
}

async function runCli(): Promise<void> {
  let parser = addConnectionOptions(yargs(hideBin(process.argv)).scriptName("testlink"));
  parser = registerConfigCommands(parser);
  parser = registerProjectCommands(parser);
  parser = registerCaseCommands(parser);
  parser = registerSuiteCommands(parser);
  parser = registerPlanCommands(parser);
  parser = registerBuildCommands(parser);
  parser = registerExecutionCommands(parser);
  parser = registerRequirementCommands(parser);

  await parser
    .demandCommand(1, "请指定一个命令")
    .strict()
    .help()
    .alias("h", "help")
    .version()
    .alias("v", "version")
    .parseAsync();
}

runCli().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
