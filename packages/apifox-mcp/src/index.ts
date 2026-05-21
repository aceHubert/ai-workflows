#!/usr/bin/env node

import { createHash } from "node:crypto";
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
import {
  ApifoxAPI,
  resolveApifoxInputOptions,
  type ApifoxApiOptions,
  type ApifoxSource,
  type FetchProjectDocumentScope,
} from "./api.js";

export { ApifoxAPI } from "./api.js";
export type { ApifoxApiOptions } from "./api.js";

dotenv.config({ quiet: true });

type CommandArgs = Record<string, unknown>;

interface ToolNames {
  readOas: string;
  readRefs: string;
  refreshOas: string;
  readProject: string;
  cacheInfo: string;
}

interface ToolMetadata {
  names: ToolNames;
  tools: Tool[];
}

function hasExplicitSource(options: ApifoxApiOptions): boolean {
  return [options.projectId, options.siteId, options.oas].some(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
}

function getString(args: CommandArgs, key: string): string | undefined {
  const value = args[key];
  return typeof value === "string" ? value : undefined;
}

function getOptionalNumber(args: CommandArgs, key: string): number | undefined {
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
  const value = args[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return [value];
  }

  const values = getStringArray(args, key);
  if (values) {
    const numberValues = values
      .map((item) => Number.parseInt(item, 10))
      .filter((item) => Number.isInteger(item));
    return numberValues.length > 0 ? numberValues : undefined;
  }

  if (Array.isArray(value)) {
    const numberValues = value
      .map((item) => {
        if (typeof item === "number") {
          return item;
        }
        if (typeof item === "string") {
          return Number.parseInt(item, 10);
        }
        return Number.NaN;
      })
      .filter((item) => Number.isInteger(item));
    return numberValues.length > 0 ? numberValues : undefined;
  }

  return undefined;
}

function addConnectionOptions(parser: ReturnType<typeof yargs>): ReturnType<typeof yargs> {
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
    })
    .option("locale", {
      type: "string",
      describe: "Apifox OpenAPI 请求 locale 查询参数；",
    });
}

export function getApifoxMcpOptions(args: CommandArgs): ApifoxApiOptions {
  return {
    token: getString(args, "token"),
    projectId: getString(args, "projectId"),
    siteId: getString(args, "siteId"),
    oas: getString(args, "oas"),
    apiBaseUrl: getString(args, "apiBaseUrl"),
    apiVersion: getString(args, "apiVersion"),
    apiPageSize: getOptionalNumber(args, "apiPageSize"),
    dataLocation: getString(args, "dataLocation"),
    locale: getString(args, "locale"),
  };
}

function parseMcpOptions(): ApifoxApiOptions {
  const args = addConnectionOptions(yargs(hideBin(process.argv)).scriptName("apifox-mcp"))
    .help(false)
    .version(false)
    .exitProcess(false)
    .showHelpOnFail(false)
    .fail((message, error) => {
      throw error ?? new Error(message);
    })
    .parseSync() as CommandArgs;

  return getApifoxMcpOptions(args);
}

function getRequiredStringArray(args: CommandArgs, key: string): string[] {
  const value = args[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`缺少必要参数: ${key}`);
  }
  return value as string[];
}

function toResultText(result: unknown) {
  if (typeof result === "string") {
    return {
      content: [{ type: "text" as const, text: result }],
    };
  }

  return {
    content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
  };
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
    throw new Error("selectedTags、selectedFolderIds、selectedEndpointIds 只能同时使用一种");
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
    "通过 project 读取时必须指定 selectedTags、selectedFolderIds 或 selectedEndpointIds 之一",
  );
}

function createSourceSchemaProperties() {
  return {
    projectId: {
      type: "string",
      description: "项目 ID；与 siteId、oas 三选一显式传入",
    },
    siteId: {
      type: "string",
      description: "文档站点 ID；与 projectId、oas 三选一显式传入",
    },
    oas: {
      type: "string",
      description: "远程或本地 OpenAPI 文件地址；与 projectId、siteId 三选一显式传入",
    },
  };
}

function createProjectIdSchemaProperties(startupOptions: ApifoxApiOptions): Record<string, object> {
  if (startupOptions.projectId) {
    return {};
  }

  return {
    projectId: {
      type: "string",
      description: "Apifox 项目 ID",
    },
  };
}

function createProjectDocumentSchemaProperties(startupOptions: ApifoxApiOptions) {
  return {
    ...createProjectIdSchemaProperties(startupOptions),
    branchId: {
      type: "number",
      description: "分支 ID；默认不传，读取当前默认分支",
    },
    moduleId: {
      type: "number",
      description: "模块 ID；默认不传，读取全部模块",
    },
    environmentIds: {
      type: "array",
      items: { type: "number" },
      description: "环境 ID；可重复传入或用逗号分隔；默认不传",
    },
    excludedByTags: {
      type: "array",
      items: { type: "string" },
      description: "排除的标签；可重复传入或用逗号分隔；默认不排除",
    },
    selectedTags: {
      type: "array",
      items: { type: "string" },
      description:
        "只返回指定标签；可重复传入或用逗号分隔；与 selectedFolderIds、selectedEndpointIds 三选一必填",
    },
    selectedFolderIds: {
      type: "array",
      items: { type: "number" },
      description:
        "只返回指定目录 ID；可重复传入或用逗号分隔；与 selectedTags、selectedEndpointIds 三选一必填",
    },
    selectedEndpointIds: {
      type: "array",
      items: { type: "number" },
      description:
        "只返回指定接口 ID；可重复传入或用逗号分隔；与 selectedTags、selectedFolderIds 三选一必填",
    },
    includeApifoxExtensionProperties: {
      type: "boolean",
      description: "是否包含 Apifox 扩展属性；可选 true/false；默认 false",
    },
    addFoldersToTags: {
      type: "boolean",
      description: "是否将目录加入 tags；可选 true/false；默认 false",
    },
    oasVersion: {
      type: "string",
      enum: ["2.0", "3.0", "3.1"],
      description: "OAS 版本；可选 2.0/3.0/3.1；默认 3.1",
    },
    exportFormat: {
      type: "string",
      enum: ["JSON", "YAML"],
      description: "返回格式；可选 JSON/YAML；默认 JSON",
    },
  };
}

const projectScopeOneOf = [
  { required: ["selectedTags"] },
  { required: ["selectedFolderIds"] },
  { required: ["selectedEndpointIds"] },
];

function getSourceLabel(source: ApifoxSource): string {
  switch (source.name) {
    case "project":
      return `Apifox 项目 ${source.identifier}`;
    case "doc-site":
      return `Apifox 文档站点 ${source.identifier}`;
    case "remote-file":
      return `远程 OAS ${source.identifier}`;
    case "local-file":
      return `本地 OAS ${source.identifier}`;
    default:
      return "当前来源";
  }
}

function sanitizeToolSuffix(value: string): string {
  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || "default";
}

function getToolSuffixFromStartupOptions(startupOptions: ApifoxApiOptions): string {
  if (startupOptions.projectId) {
    return sanitizeToolSuffix(startupOptions.projectId);
  }

  if (startupOptions.siteId) {
    return `site_${sanitizeToolSuffix(startupOptions.siteId)}`;
  }

  if (startupOptions.oas) {
    return `oas_${createHash("md5").update(startupOptions.oas).digest("hex").slice(0, 8)}`;
  }

  return "default";
}

function buildToolNames(startupOptions: ApifoxApiOptions): ToolNames {
  if (!hasExplicitSource(startupOptions)) {
    return {
      readOas: "read_apifox_oas",
      readRefs: "read_apifox_oas_ref_resources",
      refreshOas: "refresh_apifox_oas",
      cacheInfo: "get_apifox_cache_info",
      readProject: "read_apifox_project",
    };
  }

  const suffix = getToolSuffixFromStartupOptions(startupOptions);
  return {
    readOas: `read_apifox_oas_${suffix}`,
    readRefs: `read_apifox_oas_ref_resources_${suffix}`,
    refreshOas: `refresh_apifox_oas_${suffix}`,
    cacheInfo: `get_apifox_cache_info_${suffix}`,
    readProject: `read_apifox_project_${suffix}`,
  };
}

function getDescriptionTarget(title: string | undefined, sourceLabel: string): string {
  if (title) {
    return `「${title}」`;
  }
  return `来源「${sourceLabel}」`;
}

async function buildToolMetadata(
  startupOptions: ApifoxApiOptions,
  apifoxApi?: ApifoxAPI,
): Promise<ToolMetadata> {
  const needsProjectId = !hasExplicitSource(startupOptions);
  const names = buildToolNames(startupOptions);
  const sourceLabel = apifoxApi
    ? getSourceLabel(apifoxApi.getSource())
    : "运行时指定的 Apifox 来源";
  const title = apifoxApi ? await apifoxApi.getDocumentTitle() : undefined;
  const target = needsProjectId
    ? "运行时指定的 Apifox 来源"
    : getDescriptionTarget(title, sourceLabel);
  const baseProperties = needsProjectId ? createSourceSchemaProperties() : {};
  const baseRequired = needsProjectId ? [] : [];
  const baseOneOf = needsProjectId
    ? [{ required: ["projectId"] }, { required: ["siteId"] }, { required: ["oas"] }]
    : undefined;
  const projectRequired = startupOptions.projectId ? [] : ["projectId"];

  return {
    names,
    tools: [
      {
        name: names.readOas,
        description: `读取${target}的 OpenAPI 文档缓存；若本地无缓存会自动拉取并生成`,
        inputSchema: {
          type: "object",
          properties: baseProperties,
          required: baseRequired,
          ...(baseOneOf ? { oneOf: baseOneOf } : {}),
        },
      },
      {
        name: names.readRefs,
        description: `按 $ref 路径读取${target}拆分后的 OpenAPI 资源文件`,
        inputSchema: {
          type: "object",
          properties: {
            ...baseProperties,
            path: {
              type: "array",
              items: { type: "string" },
              description:
                '多个引用路径，例如 ["/paths/_users.json", "/components/schemas/User.json"]',
            },
          },
          required: [...baseRequired, "path"],
          ...(baseOneOf ? { oneOf: baseOneOf } : {}),
        },
      },
      {
        name: names.refreshOas,
        description: `强制重新拉取${target}的 OpenAPI 文档并刷新本地缓存`,
        inputSchema: {
          type: "object",
          properties: baseProperties,
          required: baseRequired,
          ...(baseOneOf ? { oneOf: baseOneOf } : {}),
        },
      },
      {
        name: names.cacheInfo,
        description: `读取${target}的缓存目录与缓存文件信息`,
        inputSchema: {
          type: "object",
          properties: baseProperties,
          required: baseRequired,
          ...(baseOneOf ? { oneOf: baseOneOf } : {}),
        },
      },
      {
        name: names.readProject,
        description:
          "实时读取 Apifox 项目 OpenAPI 数据；不经过 OAS 缓存；必须提供一个 scope：selectedTags、selectedFolderIds 或 selectedEndpointIds 三选一",
        inputSchema: {
          type: "object",
          properties: createProjectDocumentSchemaProperties(startupOptions),
          required: projectRequired,
          oneOf: projectScopeOneOf,
        },
      },
    ],
  };
}

function getProjectIdForTool(startupOptions: ApifoxApiOptions, args: CommandArgs): string {
  const projectId = getString(args, "projectId") ?? startupOptions.projectId;
  if (!projectId) {
    throw new Error("缺少必要参数: projectId");
  }
  return projectId;
}

function resolveRequestApi(startupOptions: ApifoxApiOptions, args: CommandArgs): ApifoxAPI {
  if (hasExplicitSource(startupOptions)) {
    return new ApifoxAPI(startupOptions);
  }

  return new ApifoxAPI({
    ...startupOptions,
    projectId: getString(args, "projectId"),
    siteId: getString(args, "siteId"),
    oas: getString(args, "oas"),
  });
}

export function createApifoxMcpServer(
  startupOptions: ApifoxApiOptions,
  toolMetadata: ToolMetadata,
): Server {
  const server = new Server(
    {
      name: "@acehubert/apifox-mcp",
      version: "0.0.1",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: toolMetadata.tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const args = (request.params.arguments ?? {}) as CommandArgs;
    const toolNames = toolMetadata.names;

    try {
      const apifoxApi = resolveRequestApi(startupOptions, args);

      switch (request.params.name) {
        case toolNames.readOas:
          return toResultText(JSON.parse(await apifoxApi.readProjectOas()) as unknown);
        case toolNames.readRefs:
          return toResultText(
            await apifoxApi.readProjectOasRefResources(getRequiredStringArray(args, "path")),
          );
        case toolNames.refreshOas:
          return toResultText(await apifoxApi.refreshProjectOas());
        case toolNames.readProject: {
          const projectId = getProjectIdForTool(startupOptions, args);
          return toResultText(
            await apifoxApi.fetchProjectDocument(projectId, {
              scope: buildProjectScope(args),
              options: {
                includeApifoxExtensionProperties: getBoolean(
                  args,
                  "includeApifoxExtensionProperties",
                ),
                addFoldersToTags: getBoolean(args, "addFoldersToTags"),
              },
              oasVersion: getString(args, "oasVersion"),
              exportFormat: getString(args, "exportFormat"),
              environmentIds: getNumberArray(args, "environmentIds"),
              branchId: getOptionalNumber(args, "branchId"),
              moduleId: getOptionalNumber(args, "moduleId"),
            }),
          );
        }
        case toolNames.cacheInfo:
          return toResultText(await apifoxApi.getResolvedCacheInfo());
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
  const startupOptions = resolveApifoxInputOptions(parseMcpOptions());
  const apifoxApi = hasExplicitSource(startupOptions) ? new ApifoxAPI(startupOptions) : undefined;
  const toolMetadata = await buildToolMetadata(startupOptions, apifoxApi);
  const server = createApifoxMcpServer(startupOptions, toolMetadata);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "MCP Server 启动失败");
  process.exit(1);
});
