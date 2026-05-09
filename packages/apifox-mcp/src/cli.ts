#!/usr/bin/env node

import dotenv from "dotenv";
import yargs, { type Argv, type ArgumentsCamelCase } from "yargs";
import { hideBin } from "yargs/helpers";
import {
  APIFOX_CONFIG_KEYS,
  ApifoxAPI,
  isApifoxConfigKey,
  normalizeApifoxConfigValue,
  readApifoxConfig,
  resolveApifoxEffectiveOptionValues,
  writeApifoxConfig,
  type ApifoxApiOptions,
} from "./api.js";

dotenv.config({ quiet: true });

type CommandArgs = ArgumentsCamelCase<Record<string, unknown>>;

function getString(args: CommandArgs, key: string): string | undefined {
  const value = args[key];
  return typeof value === "string" ? value : undefined;
}

function getNumber(args: CommandArgs, key: string): number | undefined {
  const value = args[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getRequiredString(args: CommandArgs, key: string): string {
  const value = getString(args, key);
  if (!value) {
    throw new Error(`缺少必要参数: ${key}`);
  }
  return value;
}

function addConnectionOptions(parser: Argv): Argv {
  return parser
    .option("token", {
      type: "string",
      describe: "Access Token；",
    })
    .option("projectId", {
      type: "string",
      alias: "project-id",
      describe: "项目 ID；与 --siteId、--oas 三选一显式传入",
    })
    .option("siteId", {
      type: "string",
      alias: "site-id",
      describe: "文档站点 ID；与 --projectId、--oas 三选一显式传入",
    })
    .option("oas", {
      type: "string",
      describe: "远程或本地 OpenAPI 文件地址；与 --projectId、--siteId 三选一显式传入",
    })
    .option("apiBaseUrl", {
      type: "string",
      alias: "apifox-api-base-url",
      describe: "API 基础地址；",
    })
    .option("apiVersion", {
      type: "string",
      alias: "api-version",
      describe: "API 版本头；",
    })
    .option("apiPageSize", {
      type: "number",
      alias: "api-page-size",
      describe: "paths 拆分页大小；",
    })
    .option("dataLocation", {
      type: "string",
      alias: "data-location",
      describe: "缓存根目录；",
    });
}

function getApifoxCliOptions(args: CommandArgs): ApifoxApiOptions {
  return {
    token: getString(args, "token"),
    projectId: getString(args, "projectId"),
    siteId: getString(args, "siteId"),
    oas: getString(args, "oas"),
    apiBaseUrl: getString(args, "apiBaseUrl"),
    apiVersion: getString(args, "apiVersion"),
    apiPageSize: getNumber(args, "apiPageSize"),
    dataLocation: getString(args, "dataLocation"),
  };
}

function getClient(args: CommandArgs): ApifoxAPI {
  return new ApifoxAPI(getApifoxCliOptions(args));
}

function printJsonResult(result: unknown): void {
  console.log(JSON.stringify(result, null, 2));
}

function registerOasCommands(parser: Argv): Argv {
  return parser.command(
    "oas <action>",
    "OpenAPI 文档操作：view / refresh；",
    (command) =>
      command.positional("action", {
        choices: ["view", "refresh"] as const,
        describe: "操作类型",
      }),
    async (args: CommandArgs) => {
      const client = getClient(args);
      const action = getRequiredString(args, "action");

      switch (action) {
        case "view":
          printJsonResult(JSON.parse(await client.readProjectOas()) as unknown);
          return;
        case "refresh":
          printJsonResult(await client.refreshProjectOas());
          return;
        default:
          throw new Error(`未知操作类型: ${action}`);
      }
    },
  );
}

function registerRefCommands(parser: Argv): Argv {
  return parser.command(
    "refs <action>",
    "引用资源操作：read；",
    (command) =>
      command
        .positional("action", {
          choices: ["read"] as const,
          describe: "操作类型",
        })
        .option("path", {
          type: "array",
          string: true,
          describe: "一个或多个 $ref 文件路径，可重复传入",
        }),
    async (args: CommandArgs) => {
      const client = getClient(args);
      const action = getRequiredString(args, "action");

      switch (action) {
        case "read": {
          const paths = args.path;
          if (!Array.isArray(paths) || paths.some((item) => typeof item !== "string")) {
            throw new Error("缺少必要参数: path");
          }
          printJsonResult(await client.readProjectOasRefResources(paths as string[]));
          return;
        }
        default:
          throw new Error(`未知操作类型: ${action}`);
      }
    },
  );
}

function registerCacheCommands(parser: Argv): Argv {
  return parser.command(
    "cache <action>",
    "缓存操作：info；返回缓存路径、来源与最后更新时间",
    (command) =>
      command.positional("action", {
        choices: ["info"] as const,
        describe: "操作类型",
      }),
    async (args: CommandArgs) => {
      const client = getClient(args);
      const action = getRequiredString(args, "action");

      switch (action) {
        case "info":
          printJsonResult(await client.getResolvedCacheInfo());
          return;
        default:
          throw new Error(`未知操作类型: ${action}`);
      }
    },
  );
}

function registerConfigCommands(parser: Argv): Argv {
  return parser.command(
    "config <action> <key> [value]",
    "本地 CLI 配置操作：get / set / remove；配置文件位于 ~/.apifox-mcp-server/config.json",
    (command) =>
      command
        .positional("action", {
          choices: ["get", "set", "remove"] as const,
          describe: "操作类型",
        })
        .positional("key", {
          choices: APIFOX_CONFIG_KEYS,
          describe: "配置项名称",
        })
        .positional("value", {
          type: "string",
          describe: "配置项值；仅 set 时必填",
        }),
    async (args: CommandArgs) => {
      const action = getRequiredString(args, "action");
      const key = getRequiredString(args, "key");
      if (!isApifoxConfigKey(key)) {
        throw new Error(`不支持的配置项: ${key}`);
      }

      switch (action) {
        case "get": {
          const value = resolveApifoxEffectiveOptionValues()[key] ?? null;
          console.log(value === null ? "null" : String(value));
          return;
        }
        case "set": {
          const value = normalizeApifoxConfigValue(key, getRequiredString(args, "value"));
          const config = readApifoxConfig();
          config[key] = value;
          writeApifoxConfig(config);

          console.log(`${key}: ${String(value)}`);
          return;
        }
        case "remove": {
          const config = readApifoxConfig();
          delete config[key];
          writeApifoxConfig(config);

          console.log(`${key}: removed`);
          return;
        }
        default:
          throw new Error(`未知操作类型: ${action}`);
      }
    },
  );
}

async function runCli(): Promise<void> {
  let parser = addConnectionOptions(yargs(hideBin(process.argv)).scriptName("apifox"));
  parser = registerOasCommands(parser);
  parser = registerRefCommands(parser);
  parser = registerCacheCommands(parser);
  parser = registerConfigCommands(parser);

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
