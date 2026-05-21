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
  type FetchProjectDocumentScope,
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

function getBoolean(args: CommandArgs, key: string): boolean | undefined {
  const value = args[key];
  return typeof value === "boolean" ? value : undefined;
}

function getStringArray(args: CommandArgs, key: string): string[] | undefined {
  const value = args[key];
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value.flatMap((item) =>
      item
        .split(",")
        .map((nestedItem) => nestedItem.trim())
        .filter((nestedItem) => nestedItem.length > 0),
    );
  }
  return undefined;
}

function getNumberArray(args: CommandArgs, key: string): number[] | undefined {
  const values = getStringArray(args, key);
  if (!values) {
    return undefined;
  }
  const numberValues = values
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isInteger(value));
  return numberValues.length > 0 ? numberValues : undefined;
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
    .option("locale", {
      type: "string",
      describe: "locale 查询参数；",
    });
}

function addSourceOptions(parser: Argv): Argv {
  return parser
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
    });
}

function addCacheOptions(parser: Argv): Argv {
  return parser.option("dataLocation", {
    type: "string",
    alias: "data-location",
    describe: "缓存根目录；",
  });
}

function addOasCacheOptions(parser: Argv): Argv {
  return addCacheOptions(
    parser.option("apiPageSize", {
      type: "number",
      alias: "api-page-size",
      describe: "paths 拆分页大小；",
    }),
  );
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
    locale: getString(args, "locale"),
  };
}

function getClient(args: CommandArgs): ApifoxAPI {
  return new ApifoxAPI(getApifoxCliOptions(args));
}

function printResult(result: unknown): void {
  if (typeof result === "string") {
    console.log(result);
    return;
  }
  console.log(JSON.stringify(result, null, 2));
}

function buildProjectScope(args: CommandArgs): FetchProjectDocumentScope {
  const excludedByTags = getStringArray(args, "excludedByTags");
  const selectedTags = getStringArray(args, "selectedTags");
  const selectedFolderIds = getNumberArray(args, "selectedFolderIds");
  const selectedEndpointIds = getNumberArray(args, "selectedEndpointIds");
  const selectedScopeCount = [
    selectedTags?.length,
    selectedFolderIds?.length,
    selectedEndpointIds?.length,
  ].filter((length) => length !== undefined && length > 0).length;

  if (selectedScopeCount > 1) {
    throw new Error(
      "--selected-tags、--selected-folder-ids、--selected-endpoint-ids 只能同时使用一种",
    );
  }

  if (selectedTags && selectedTags.length > 0) {
    return {
      type: "SELECTED_TAGS",
      selectedTags,
      ...(excludedByTags ? { excludedByTags } : {}),
    };
  }

  if (selectedFolderIds && selectedFolderIds.length > 0) {
    return {
      type: "SELECTED_FOLDERS",
      selectedFolderIds,
      ...(excludedByTags ? { excludedByTags } : {}),
    };
  }

  if (selectedEndpointIds && selectedEndpointIds.length > 0) {
    return {
      type: "SELECTED_ENDPOINTS",
      selectedEndpointIds,
      ...(excludedByTags ? { excludedByTags } : {}),
    };
  }

  throw new Error(
    "通过 project 读取时必须指定 --selected-tags、--selected-folder-ids 或 --selected-endpoint-ids 之一",
  );
}

function registerOasCommands(parser: Argv): Argv {
  return parser.command(
    "oas <action>",
    "OpenAPI 文档操作：view / refresh；",
    (command) =>
      addOasCacheOptions(
        addSourceOptions(
          command.positional("action", {
            choices: ["view", "refresh"] as const,
            describe: "操作类型",
          }),
        ),
      ),
    async (args: CommandArgs) => {
      const client = getClient(args);
      const action = getRequiredString(args, "action");

      switch (action) {
        case "view":
          printResult(JSON.parse(await client.readProjectOas()) as unknown);
          return;
        case "refresh":
          printResult(await client.refreshProjectOas());
          return;
        default:
          throw new Error(`未知操作类型: ${action}`);
      }
    },
  );
}

function registerProjectCommands(parser: Argv): Argv {
  return parser.command(
    "project <id>",
    "实时读取 Apifox 项目 OpenAPI 数据；不经过 OAS 缓存",
    (command) =>
      command
        .positional("id", {
          type: "string",
          describe: "Apifox 项目 ID",
        })
        .option("excludedByTags", {
          type: "array",
          string: true,
          alias: "excluded-by-tags",
          describe: "排除的标签；可重复传入或用逗号分隔；默认不排除",
        })
        .option("selectedTags", {
          type: "array",
          string: true,
          alias: "selected-tags",
          describe:
            "只返回指定标签；可重复传入或用逗号分隔；与 --selected-folder-ids、--selected-endpoint-ids 三选一必填",
        })
        .option("selectedFolderIds", {
          type: "array",
          string: true,
          alias: "selected-folder-ids",
          describe:
            "只返回指定目录 ID；可重复传入或用逗号分隔；与 --selected-tags、--selected-endpoint-ids 三选一必填",
        })
        .option("selectedEndpointIds", {
          type: "array",
          string: true,
          alias: "selected-endpoint-ids",
          describe:
            "只返回指定接口 ID；可重复传入或用逗号分隔；与 --selected-tags、--selected-folder-ids 三选一必填",
        })
        .option("includeApifoxExtensionProperties", {
          type: "boolean",
          alias: "include-apifox-extension-properties",
          describe: "是否包含 Apifox 扩展属性；可选 true/false；默认 false",
        })
        .option("addFoldersToTags", {
          type: "boolean",
          alias: "add-folders-to-tags",
          describe: "是否将目录加入 tags；可选 true/false；默认 false",
        })
        .option("oasVersion", {
          type: "string",
          alias: "oas-version",
          choices: ["2.0", "3.0", "3.1"] as const,
          describe: "OAS 版本；可选 2.0/3.0/3.1；默认 3.1",
        })
        .option("exportFormat", {
          type: "string",
          alias: "export-format",
          choices: ["JSON", "YAML"] as const,
          describe: "返回格式；可选 JSON/YAML；默认 JSON",
        })
        .option("branchId", {
          type: "number",
          alias: "branch-id",
          describe: "分支 ID；默认不传，读取当前默认分支",
        })
        .option("moduleId", {
          type: "number",
          alias: "module-id",
          describe: "模块 ID；默认不传，读取全部模块",
        })
        .option("environmentIds", {
          type: "array",
          string: true,
          alias: "environment-ids",
          describe: "环境 ID；可重复传入或用逗号分隔；默认不传",
        }),
    async (args: CommandArgs) => {
      const projectId = getRequiredString(args, "id");
      const client = getClient({
        ...args,
        projectId,
      });

      printResult(
        await client.fetchProjectDocument(projectId, {
          branchId: getNumber(args, "branchId"),
          moduleId: getNumber(args, "moduleId"),
          environmentIds: getNumberArray(args, "environmentIds"),
          scope: buildProjectScope(args),
          options: {
            includeApifoxExtensionProperties: getBoolean(args, "includeApifoxExtensionProperties"),
            addFoldersToTags: getBoolean(args, "addFoldersToTags"),
          },
          oasVersion: getString(args, "oasVersion"),
          exportFormat: getString(args, "exportFormat"),
        }),
      );
    },
  );
}

function registerRefCommands(parser: Argv): Argv {
  return parser.command(
    "refs <action>",
    "引用资源操作：read；",
    (command) =>
      addCacheOptions(
        addSourceOptions(
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
        ),
      ),
    async (args: CommandArgs) => {
      const client = getClient(args);
      const action = getRequiredString(args, "action");

      switch (action) {
        case "read": {
          const paths = args.path;
          if (!Array.isArray(paths) || paths.some((item) => typeof item !== "string")) {
            throw new Error("缺少必要参数: path");
          }
          printResult(await client.readProjectOasRefResources(paths as string[]));
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
      addCacheOptions(
        addSourceOptions(
          command.positional("action", {
            choices: ["info"] as const,
            describe: "操作类型",
          }),
        ),
      ),
    async (args: CommandArgs) => {
      const client = getClient(args);
      const action = getRequiredString(args, "action");

      switch (action) {
        case "info":
          printResult(await client.getResolvedCacheInfo());
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
  parser = registerProjectCommands(parser);
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
