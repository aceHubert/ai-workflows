#!/usr/bin/env node
/**
 * 禅道 MCP Server
 * 提供 Bug 和需求的增删改查工具给 AI 使用
 */

// 重写 stdout/stderr，过滤非 MCP 协议的输出（如 npx/dotenv 的日志）
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const originalStderrWrite = process.stderr.write.bind(process.stderr);

/** 检查是否为 MCP 协议消息 */
const isMcpMessage = (str: string): boolean => {
  const trimmed = str.trimStart();
  return trimmed.startsWith("{") || trimmed.startsWith("Content-Length:");
};

// stdout: 只允许 MCP 协议消息通过，其他静默丢弃
process.stdout.write = (chunk: any, encodingOrCallback?: any, callback?: any): boolean => {
  const str = typeof chunk === "string" ? chunk : chunk.toString();
  if (isMcpMessage(str)) {
    return originalStdoutWrite(chunk, encodingOrCallback, callback);
  }
  // 静默丢弃非协议消息
  if (typeof encodingOrCallback === "function") encodingOrCallback();
  else if (callback) callback();
  return true;
};

// stderr: 过滤掉 dotenv 等第三方库的输出
process.stderr.write = (chunk: any, encodingOrCallback?: any, callback?: any): boolean => {
  const str = typeof chunk === "string" ? chunk : chunk.toString();
  // 过滤掉 dotenv 的日志
  if (str.includes("dotenv") || str.includes("injecting env") || str.includes("dotenvx")) {
    if (typeof encodingOrCallback === "function") encodingOrCallback();
    else if (callback) callback();
    return true;
  }
  return originalStderrWrite(chunk, encodingOrCallback, callback);
};

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import dotenv from "dotenv";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { createZentaoClient } from "./zentao-clients";
import {
  resolveZentaoConfig,
  toConfigBoolean,
  toConfigString,
  type ZentaoConfigSpec,
} from "./config";
import {
  normalizeZentaoVersion,
  addZentaoConnectionOptions,
  verifyZentaoClientOptions,
  getZentaoClientVersionDescription,
  getBoolean,
  getString,
  type ZentaoCommandArgs,
} from "./utils";

import type { ZentaoFileReadResult } from "@acehubert/zentao-api";
import type {
  ZentaoMcpOptions,
  BugType,
  BugSeverity,
  TestCaseType,
  TestCaseStep,
  StoryCategory,
  IZentaoClient,
  ZentaoClientVersion,
} from "./types";

// 加载环境变量
dotenv.config({ quiet: true });

const mcpConfigSpecs: readonly ZentaoConfigSpec<ZentaoMcpOptions>[] = [
  { key: "url", env: "ZENTAO_URL", parse: toConfigString },
  { key: "account", env: "ZENTAO_ACCOUNT", parse: toConfigString },
  { key: "password", env: "ZENTAO_PASSWORD", parse: toConfigString },
  { key: "version", env: "ZENTAO_VERSION", parse: toConfigString },
  { key: "skipSSL", env: "ZENTAO_SKIP_SSL", parse: toConfigBoolean },
];

export function getZentaoMcpOptions(args: ZentaoCommandArgs): ZentaoMcpOptions {
  return {
    url: getString(args, "url"),
    account: getString(args, "account"),
    password: getString(args, "password"),
    version: getString(args, "version"),
    skipSSL: getBoolean(args, "skipSSL"),
  };
}

function normalizeFileExtension(fileType: string): string {
  const normalized = fileType.trim().toLowerCase().replace(/^\.+/, "");
  return normalized || "bin";
}

async function saveFileToTempDirectory(file: ZentaoFileReadResult): Promise<{
  fileID: number;
  fileType: string;
  mimeType: string;
  size: number;
  filePath: string;
}> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "zentao-mcp-"));
  const fileName = `zentao-file-${file.fileID}-${randomUUID()}.${normalizeFileExtension(file.fileType)}`;
  const filePath = path.join(tempDir, fileName);

  await fs.writeFile(filePath, file.data);

  return {
    fileID: file.fileID,
    fileType: file.fileType,
    mimeType: file.mimeType,
    size: file.size,
    filePath,
  };
}

/** 命令参数优先，未传入时回退到环境变量。 */
function resolveZentaoMcpOptions(options: ZentaoMcpOptions): ZentaoMcpOptions {
  return resolveZentaoConfig(options, mcpConfigSpecs);
}

/** 解析 MCP Server 启动参数。 */
function parseMcpOptions(): ZentaoMcpOptions {
  const args = addZentaoConnectionOptions(
    yargs(hideBin(process.argv)).scriptName("npx @acehubert/zentao-mcp@latest"),
  )
    .help(false)
    .version(false)
    .exitProcess(false)
    .showHelpOnFail(false)
    .fail((message, error) => {
      throw error ?? new Error(message);
    })
    .parseSync();

  return getZentaoMcpOptions(args);
}

let zentaoClient: IZentaoClient;

try {
  const options = verifyZentaoClientOptions(resolveZentaoMcpOptions(parseMcpOptions()), "启动参数");
  zentaoClient = createZentaoClient(
    {
      url: options.url,
      account: options.account,
      password: options.password,
      rejectUnauthorized: options.skipSSL ? false : undefined,
    },
    normalizeZentaoVersion(options.version),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : "MCP Server 配置错误");
  process.exit(1);
}

// ==================== 工具定义 ====================

type ZentaoTool = Tool & {
  /** 支持的禅道客户端版本。为空或未配置时表示全版本支持。 */
  supportVersions?: ZentaoClientVersion[];
};

function isToolSupported(tool: ZentaoTool, version: ZentaoClientVersion): boolean {
  return !tool.supportVersions?.length || tool.supportVersions.includes(version);
}

function toMcpTool(tool: ZentaoTool): Tool {
  const { supportVersions: _supportVersions, ...mcpTool } = tool;
  return mcpTool;
}

const tools: ZentaoTool[] = [
  // 客户端工具
  {
    name: "zentao_client",
    supportVersions: [],
    description: "客户端信息查询。支持：获取当前禅道客户端版本",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["getVersion"],
          description: "操作类型: getVersion-获取当前禅道客户端版本",
        },
      },
      required: ["action"],
    },
  },

  // Bug 工具
  {
    name: "zentao_bugs",
    supportVersions: [],
    description: "Bug 操作。支持：查询列表、查询详情、创建、解决、关闭",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["list", "view", "create", "resolve", "close"],
          description: "操作类型: list-列表, view-详情, create-创建, resolve-解决, close-关闭",
        },
        // 查询参数
        bugID: {
          type: "number",
          description: "Bug ID（view/resolve/close 时使用）",
        },
        productID: {
          type: "number",
          description: "产品 ID（list/create 时使用）",
        },
        browseType: {
          type: "string",
          enum: [
            "all",
            "unclosed",
            "assignedtome",
            "openedbyme",
            "assignedbyme",
            "assigntome",
            "resolvedbyme",
            "toclosed",
            "unresolved",
            "unconfirmed",
            "longlifebugs",
            "postponedbugs",
            "overduebugs",
            "needconfirm",
          ],
          description:
            "Bug 状态(list)，默认 unclosed。v1/v2: all-全部, unclosed-未关闭, assignedtome-指派给我, openedbyme-我创建, assignedbyme-由我指派。legacy: all-所有, unclosed-未关闭, openedbyme-由我创建, assigntome-指派给我, resolvedbyme-由我解决, toclosed-待关闭, unresolved-未解决, unconfirmed-未确认, longlifebugs-久未处理, postponedbugs-被延期, overduebugs-过期BUG, needconfirm-需求变动",
        },
        limit: { type: "number", description: "返回数量限制，默认 20" },
        // 创建参数
        title: { type: "string", description: "Bug 标题（create 时必填）" },
        severity: {
          type: "number",
          enum: [1, 2, 3, 4],
          description: "严重程度: 1-致命, 2-严重, 3-一般, 4-轻微",
        },
        pri: {
          type: "number",
          enum: [1, 2, 3, 4],
          description: "优先级: 1-紧急, 2-高, 3-中, 4-低",
        },
        type: {
          type: "string",
          enum: [
            "codeerror",
            "config",
            "install",
            "security",
            "performance",
            "standard",
            "automation",
            "designdefect",
            "others",
          ],
          description:
            "Bug 类型: codeerror-代码错误, config-配置相关, install-安装部署, security-安全相关, performance-性能问题, standard-标准规范, automation-测试脚本, designdefect-设计缺陷, others-其他",
        },
        steps: { type: "string", description: "重现步骤 (支持 HTML 格式)" },
        assignedTo: { type: "string", description: "指派给（用户账号）" },
        openedBuild: {
          type: "array",
          items: { type: "string" },
          description: '影响版本，如 ["trunk"]',
        },
        module: { type: "number", description: "模块 ID" },
        story: { type: "number", description: "相关需求 ID" },
        project: { type: "number", description: "项目 ID" },
        // 解决/关闭参数
        resolution: {
          type: "string",
          enum: [
            "bydesign",
            "duplicate",
            "external",
            "fixed",
            "notrepro",
            "postponed",
            "willnotfix",
          ],
          description:
            "解决方案（resolve 时必填）: fixed-已修复, bydesign-设计如此, duplicate-重复, external-外部原因, notrepro-无法重现, postponed-延期, willnotfix-不予解决",
        },
        comment: {
          type: "string",
          description: "备注（resolve/close 时使用）",
        },
      },
      required: ["action"],
    },
  },

  // 需求工具
  {
    name: "zentao_stories",
    supportVersions: ["v1", "v2"],
    description: "需求操作。支持：查询列表、查询详情、创建、关闭",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["list", "view", "create", "close"],
          description: "操作类型: list-列表, view-详情, create-创建, close-关闭",
        },
        // 查询参数
        storyID: {
          type: "number",
          description: "需求 ID（view/close 时使用）",
        },
        productID: {
          type: "number",
          description: "产品 ID（list/create 时使用）",
        },
        browseType: {
          type: "string",
          enum: ["all", "unclosed", "assignedtome", "openedbyme", "assignedbyme"],
          description:
            "需求状态(list)，默认 unclosed。v1/v2: all-全部, unclosed-未关闭, assignedtome-指派给我, openedbyme-我创建, assignedbyme-由我指派",
        },
        limit: { type: "number", description: "返回数量限制，默认 20" },
        // 创建参数
        title: { type: "string", description: "需求标题（create 时必填）" },
        category: {
          type: "string",
          enum: ["feature", "interface", "performance", "safe", "experience", "improve", "other"],
          description:
            "需求类型: feature-功能, interface-接口, performance-性能, safe-安全, experience-体验, improve-改进, other-其他",
        },
        pri: {
          type: "number",
          enum: [1, 2, 3, 4],
          description: "优先级: 1-紧急, 2-高, 3-中, 4-低",
        },
        spec: {
          type: "string",
          description: `需求描述（create 时必填）。建议按以下禅道模板格式填写：

【目标】要达到的结果（例如：用户能在X页面完成Y操作）

【范围】包含/不包含（例如：仅支持A端，不支持B端）

【约束】兼容性、权限、性能、依赖系统、上线时间等限制条件

【验收标准】可检查的标准（尽量可量化/可点检）

【风险点】可能翻车的地方（初版可先写1-2条）

【信息来源】相关文档/截图/旧需求链接/接口文档链接`,
        },
        reviewer: {
          type: "array",
          items: { type: "string" },
          description: '评审人账号列表（create 时必填），如 ["york", "admin"]',
        },
        verify: { type: "string", description: "验收标准" },
        estimate: { type: "number", description: "预估工时（小时）" },
        module: { type: "number", description: "模块 ID" },
        // 关闭参数
        closedReason: {
          type: "string",
          enum: ["done", "subdivided", "duplicate", "postponed", "willnotdo", "cancel", "bydesign"],
          description:
            "关闭原因（close 时必填）: done-已完成, subdivided-已细分, duplicate-重复, postponed-延期, willnotdo-不做, cancel-取消, bydesign-设计如此",
        },
        comment: { type: "string", description: "备注（close 时使用）" },
      },
      required: ["action"],
    },
  },

  // 测试用例工具
  {
    name: "zentao_testcases",
    supportVersions: ["v1", "v2"],
    description: "测试用例操作。支持：查询列表、查询详情、创建",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["list", "view", "create"],
          description: "操作类型: list-列表, view-详情, create-创建",
        },
        // 查询参数
        caseID: { type: "number", description: "用例 ID（view 时使用）" },
        productID: {
          type: "number",
          description: "产品 ID（list/create 时使用）",
        },
        limit: { type: "number", description: "返回数量限制，默认 100" },
        // 创建参数
        title: { type: "string", description: "用例标题（create 时必填）" },
        type: {
          type: "string",
          enum: [
            "feature",
            "performance",
            "config",
            "install",
            "security",
            "interface",
            "unit",
            "other",
          ],
          description:
            "用例类型: feature-功能测试, performance-性能测试, config-配置相关, install-安装部署, security-安全相关, interface-接口测试, unit-单元测试, other-其他",
        },
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              desc: { type: "string", description: "步骤描述" },
              expect: { type: "string", description: "期望结果" },
            },
            required: ["desc", "expect"],
          },
          description: "用例步骤（create 时必填）",
        },
        pri: {
          type: "number",
          enum: [1, 2, 3, 4],
          description: "优先级: 1-高, 2-中, 3-低, 4-最低",
        },
        precondition: { type: "string", description: "前置条件" },
        story: { type: "number", description: "相关需求 ID" },
      },
      required: ["action"],
    },
  },

  // 产品工具
  {
    name: "zentao_products",
    supportVersions: [],
    description: "产品操作。支持：查询列表、查询详情",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["list", "view"],
          description: "操作类型: list-列表, view-详情",
        },
        productID: { type: "number", description: "产品 ID（view 时使用）" },
        limit: { type: "number", description: "返回数量限制，默认 100" },
      },
      required: ["action"],
    },
  },

  // 项目工具
  {
    name: "zentao_projects",
    supportVersions: [],
    description: "项目操作。支持：查询列表、查询详情",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["list", "view"],
          description: "操作类型: list-列表, view-详情",
        },
        projectID: { type: "number", description: "项目 ID（view 时使用）" },
        limit: { type: "number", description: "返回数量限制，默认 100" },
      },
      required: ["action"],
    },
  },

  // 版本工具
  {
    name: "zentao_builds",
    supportVersions: [],
    description: "版本（Build）操作。支持：查询列表、查询详情、创建",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["list", "view", "create"],
          description: "操作类型: list-列表, view-详情, create-创建",
        },
        executionID: {
          type: "number",
          description: "执行 ID（list/create 时使用，legacy 版本 list 仅支持按执行查询）",
        },
        projectID: {
          type: "number",
          description: "项目 ID（list 时与 executionID 至少提供一个；create 时 v1 版本必填）",
        },
        buildID: { type: "number", description: "版本 ID（view 时使用）" },
        limit: { type: "number", description: "返回数量限制，默认 100" },
        product: { type: "number", description: "产品 ID（create 时必填）" },
        name: { type: "string", description: "版本名称，如 build1（create 时必填）" },
        builder: { type: "string", description: "构建者账号（create 时必填）" },
        branch: { type: "number", description: "分支 ID（create 时使用）" },
        date: {
          type: "string",
          description: "构建日期，格式 YYYY-MM-DD（create 时使用，默认当天）",
        },
        scmPath: { type: "string", description: "源代码标签地址（create 时使用）" },
        filePath: { type: "string", description: "下载地址（create 时使用）" },
        desc: { type: "string", description: "版本描述（create 时使用）" },
      },
      required: ["action"],
    },
  },

  // 用户工具
  {
    name: "zentao_users",
    supportVersions: [],
    description: "用户操作。支持：查询列表、查询详情、查询当前用户",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["list", "view", "me"],
          description: "操作类型: list-列表, view-详情, me-当前用户",
        },
        userID: { type: "number", description: "用户 ID（view 时使用）" },
        limit: { type: "number", description: "返回数量限制，默认 100" },
      },
      required: ["action"],
    },
  },

  // 文档工具
  {
    name: "zentao_docs",
    supportVersions: [],
    description:
      "文档操作。支持：获取文档空间树、获取文档详情、创建/编辑文档、创建/编辑目录、读取附件/图片",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["tree", "view", "create", "edit", "createModule", "editModule", "readFile"],
          description:
            "操作类型: tree-获取文档空间树（包含目录和文档）, view-文档详情, create-创建文档, edit-编辑文档, createModule-创建目录, editModule-编辑目录, readFile-读取附件/图片内容",
        },
        // 空间查询参数
        spaceType: {
          type: "string",
          enum: ["product", "project"],
          description: "空间类型（tree 时使用）",
        },
        spaceID: {
          type: "number",
          description: "空间 ID - 产品或项目 ID（tree 时使用）",
        },
        // 文档参数
        libID: {
          type: "number",
          description: "文档库 ID（create/createModule 时使用）",
        },
        docID: { type: "number", description: "文档 ID（view/edit 时使用）" },
        moduleID: {
          type: "number",
          description: "目录 ID（editModule/create 时指定所属目录）",
        },
        fileID: { type: "number", description: "文件 ID（readFile 时使用）" },
        fileType: {
          type: "string",
          description: "文件类型扩展名（readFile 时使用，默认 png）",
        },
        // 创建/编辑文档参数
        title: {
          type: "string",
          description: "文档标题（create/edit 时使用）",
        },
        content: { type: "string", description: "文档内容（HTML 格式）" },
        keywords: { type: "string", description: "关键词" },
        type: {
          type: "string",
          enum: ["text", "url"],
          description: "文档类型: text-富文本(默认), url-链接",
        },
        url: { type: "string", description: "外部链接（type=url 时使用）" },
        // 目录参数
        moduleName: {
          type: "string",
          description: "目录名称（createModule/editModule 时使用）",
        },
        parentID: {
          type: "number",
          description: "父目录 ID（createModule 时使用，0 表示根目录）",
        },
      },
      required: ["action"],
    },
  },

  // 文件工具
  {
    name: "zentao_file",
    supportVersions: [],
    description: "文件读取。支持：读取附件/图片内容，保存到系统临时目录并返回文件路径",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["read"],
          description: "操作类型: read-读取文件内容",
        },
        fileID: {
          type: "number",
          description: "文件 ID（read 时必填）",
        },
        fileType: {
          type: "string",
          description: "文件类型扩展名（read 时必填）",
        },
      },
      required: ["action", "fileID", "fileType"],
    },
  },
];

// ==================== 创建 MCP Server ====================

const server = new Server(
  {
    name: "@acehubert/zentao-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// 列出所有可用工具
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.filter((tool) => isToolSupported(tool, zentaoClient.version)).map(toMcpTool),
  };
});

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const requestedTool = tools.find((tool) => tool.name === name);
    if (requestedTool && !isToolSupported(requestedTool, zentaoClient.version)) {
      return {
        content: [
          { type: "text", text: `当前禅道版本 ${zentaoClient.version} 不支持工具: ${name}` },
        ],
        isError: true,
      };
    }

    let result: unknown;

    switch (name) {
      // 客户端操作
      case "zentao_client": {
        const { action } = args as {
          action: string;
        };

        switch (action) {
          case "getVersion":
            result = {
              clientVersion: zentaoClient.version,
              description: getZentaoClientVersionDescription(zentaoClient.version),
            };
            break;

          default:
            return {
              content: [{ type: "text", text: `未知操作类型: ${action}` }],
              isError: true,
            };
        }
        break;
      }

      // Bug 操作
      case "zentao_bugs": {
        const {
          action,
          bugID,
          productID,
          browseType,
          limit,
          title,
          severity,
          pri,
          type,
          steps,
          assignedTo,
          openedBuild,
          module,
          story,
          project,
          resolution,
          comment,
        } = args as {
          action: string;
          bugID?: number;
          productID?: number;
          browseType?: string;
          limit?: number;
          title?: string;
          severity?: BugSeverity;
          pri?: number;
          type?: BugType;
          steps?: string;
          assignedTo?: string;
          openedBuild?: string[];
          module?: number;
          story?: number;
          project?: number;
          resolution?:
            | "bydesign"
            | "duplicate"
            | "external"
            | "fixed"
            | "notrepro"
            | "postponed"
            | "willnotfix";
          comment?: string;
        };

        switch (action) {
          case "list":
            if (!productID) {
              return {
                content: [{ type: "text", text: "缺少必要参数: productID" }],
                isError: true,
              };
            }
            result = await zentaoClient.getBugs(productID, browseType, limit);
            break;

          case "view":
            if (!bugID) {
              return {
                content: [{ type: "text", text: "缺少必要参数: bugID" }],
                isError: true,
              };
            }
            result = await zentaoClient.getBug(bugID);
            if (!result) {
              return {
                content: [{ type: "text", text: `Bug #${bugID} 不存在或无权限查看` }],
                isError: true,
              };
            }
            break;

          case "create":
            if (!productID || !title || !severity || !pri || !type) {
              return {
                content: [
                  {
                    type: "text",
                    text: "缺少必要参数: productID, title, severity, pri, type",
                  },
                ],
                isError: true,
              };
            }
            result = await zentaoClient.createBug({
              product: productID,
              title,
              severity,
              pri,
              type,
              steps,
              assignedTo,
              openedBuild,
              module,
              story,
              project,
            });
            break;

          case "resolve":
            if (!bugID) {
              return {
                content: [{ type: "text", text: "缺少必要参数: bugID" }],
                isError: true,
              };
            }
            if (!resolution) {
              return {
                content: [{ type: "text", text: "缺少必要参数: resolution" }],
                isError: true,
              };
            }
            const resolveSuccess = await zentaoClient.resolveBug({
              id: bugID,
              resolution,
              comment,
            });
            result = {
              success: resolveSuccess,
              message: resolveSuccess ? `Bug #${bugID} 已解决` : `Bug #${bugID} 解决失败`,
            };
            break;

          case "close":
            if (!bugID) {
              return {
                content: [{ type: "text", text: "缺少必要参数: bugID" }],
                isError: true,
              };
            }
            const closeSuccess = await zentaoClient.closeBug({
              id: bugID,
              comment,
            });
            result = {
              success: closeSuccess,
              message: closeSuccess ? `Bug #${bugID} 已关闭` : `Bug #${bugID} 关闭失败`,
            };
            break;

          default:
            return {
              content: [{ type: "text", text: `未知操作类型: ${action}` }],
              isError: true,
            };
        }
        break;
      }

      // 需求操作
      case "zentao_stories": {
        const {
          action,
          storyID,
          productID,
          browseType,
          limit,
          title,
          category,
          pri,
          spec,
          reviewer,
          verify,
          estimate,
          module,
          closedReason,
          comment,
        } = args as {
          action: string;
          storyID?: number;
          productID?: number;
          browseType?: string;
          limit?: number;
          title?: string;
          category?: StoryCategory;
          pri?: number;
          spec?: string;
          reviewer?: string[];
          verify?: string;
          estimate?: number;
          module?: number;
          closedReason?:
            | "done"
            | "subdivided"
            | "duplicate"
            | "postponed"
            | "willnotdo"
            | "cancel"
            | "bydesign";
          comment?: string;
        };

        switch (action) {
          case "list":
            if (!productID) {
              return {
                content: [{ type: "text", text: "缺少必要参数: productID" }],
                isError: true,
              };
            }
            result = await zentaoClient.getStories(productID, browseType, limit);
            break;

          case "view":
            if (!storyID) {
              return {
                content: [{ type: "text", text: "缺少必要参数: storyID" }],
                isError: true,
              };
            }
            result = await zentaoClient.getStory(storyID);
            if (!result) {
              return {
                content: [{ type: "text", text: `需求 #${storyID} 不存在或无权限查看` }],
                isError: true,
              };
            }
            break;

          case "create":
            if (!productID || !title || !category || !pri || !spec || !reviewer) {
              return {
                content: [
                  {
                    type: "text",
                    text: "缺少必要参数: productID, title, category, pri, spec, reviewer",
                  },
                ],
                isError: true,
              };
            }
            result = await zentaoClient.createStory({
              product: productID,
              title,
              category,
              pri,
              spec,
              reviewer,
              verify,
              estimate,
              module,
            });
            break;

          case "close":
            if (!storyID) {
              return {
                content: [{ type: "text", text: "缺少必要参数: storyID" }],
                isError: true,
              };
            }
            if (!closedReason) {
              return {
                content: [{ type: "text", text: "缺少必要参数: closedReason" }],
                isError: true,
              };
            }
            const success = await zentaoClient.closeStory({
              id: storyID,
              closedReason,
              comment,
            });
            result = {
              success,
              message: success ? `需求 #${storyID} 已关闭` : `需求 #${storyID} 关闭失败`,
            };
            break;

          default:
            return {
              content: [{ type: "text", text: `未知操作类型: ${action}` }],
              isError: true,
            };
        }
        break;
      }

      // 测试用例操作
      case "zentao_testcases": {
        const { action, caseID, productID, limit, title, type, steps, pri, precondition, story } =
          args as {
            action: string;
            caseID?: number;
            productID?: number;
            limit?: number;
            title?: string;
            type?: TestCaseType;
            steps?: TestCaseStep[];
            pri?: number;
            precondition?: string;
            story?: number;
          };

        switch (action) {
          case "list":
            if (!productID) {
              return {
                content: [{ type: "text", text: "缺少必要参数: productID" }],
                isError: true,
              };
            }
            result = await zentaoClient.getTestCases(productID, limit);
            break;

          case "view":
            if (!caseID) {
              return {
                content: [{ type: "text", text: "缺少必要参数: caseID" }],
                isError: true,
              };
            }
            result = await zentaoClient.getTestCase(caseID);
            if (!result) {
              return {
                content: [
                  {
                    type: "text",
                    text: `测试用例 #${caseID} 不存在或无权限查看`,
                  },
                ],
                isError: true,
              };
            }
            break;

          case "create":
            if (!productID || !title || !type || !steps) {
              return {
                content: [
                  {
                    type: "text",
                    text: "缺少必要参数: productID, title, type, steps",
                  },
                ],
                isError: true,
              };
            }
            result = await zentaoClient.createTestCase({
              product: productID,
              title,
              type,
              steps,
              pri,
              precondition,
              story,
            });
            break;

          default:
            return {
              content: [{ type: "text", text: `未知操作类型: ${action}` }],
              isError: true,
            };
        }
        break;
      }

      // 产品操作
      case "zentao_products": {
        const { action, productID, limit } = args as {
          action: string;
          productID?: number;
          limit?: number;
        };

        switch (action) {
          case "list":
            result = await zentaoClient.getProducts(limit);
            break;

          case "view":
            if (!productID) {
              return {
                content: [{ type: "text", text: "缺少必要参数: productID" }],
                isError: true,
              };
            }
            result = await zentaoClient.getProduct(productID);
            if (!result) {
              return {
                content: [
                  {
                    type: "text",
                    text: `产品 #${productID} 不存在或无权限查看`,
                  },
                ],
                isError: true,
              };
            }
            break;

          default:
            return {
              content: [{ type: "text", text: `未知操作类型: ${action}` }],
              isError: true,
            };
        }
        break;
      }

      // 项目操作
      case "zentao_projects": {
        const { action, projectID, limit } = args as {
          action: string;
          projectID?: number;
          limit?: number;
        };

        switch (action) {
          case "list":
            result = await zentaoClient.getProjects(limit);
            break;

          case "view":
            if (!projectID) {
              return {
                content: [{ type: "text", text: "缺少必要参数: projectID" }],
                isError: true,
              };
            }
            result = await zentaoClient.getProject(projectID);
            if (!result) {
              return {
                content: [
                  {
                    type: "text",
                    text: `项目 #${projectID} 不存在或无权限查看`,
                  },
                ],
                isError: true,
              };
            }
            break;

          default:
            return {
              content: [{ type: "text", text: `未知操作类型: ${action}` }],
              isError: true,
            };
        }
        break;
      }

      // 版本操作
      case "zentao_builds": {
        const {
          action,
          executionID,
          projectID,
          buildID,
          limit,
          product,
          name,
          builder,
          branch,
          date,
          scmPath,
          filePath,
          desc,
        } = args as {
          action: string;
          executionID?: number;
          projectID?: number;
          buildID?: number;
          limit?: number;
          product?: number;
          name?: string;
          builder?: string;
          branch?: number;
          date?: string;
          scmPath?: string;
          filePath?: string;
          desc?: string;
        };

        switch (action) {
          case "list":
            if (!executionID && !projectID) {
              return {
                content: [
                  { type: "text", text: "缺少必要参数: executionID 或 projectID（至少提供一个）" },
                ],
                isError: true,
              };
            }
            result = await zentaoClient.getBuilds(executionID, projectID, limit);
            break;

          case "view":
            if (!buildID) {
              return {
                content: [{ type: "text", text: "缺少必要参数: buildID" }],
                isError: true,
              };
            }
            result = await zentaoClient.getBuild(buildID);
            if (!result) {
              return {
                content: [{ type: "text", text: `版本 #${buildID} 不存在或无权限查看` }],
                isError: true,
              };
            }
            break;

          case "create":
            if (!executionID || !projectID || !product || !name || !builder) {
              return {
                content: [
                  {
                    type: "text",
                    text: "缺少必要参数: executionID, projectID, product, name, builder",
                  },
                ],
                isError: true,
              };
            }
            result = await zentaoClient.createBuild({
              project: projectID,
              execution: executionID,
              product,
              name,
              builder,
              branch,
              date,
              scmPath,
              filePath,
              desc,
            });
            break;

          default:
            return {
              content: [{ type: "text", text: `未知操作类型: ${action}` }],
              isError: true,
            };
        }
        break;
      }

      // 用户操作
      case "zentao_users": {
        const { action, userID, limit } = args as {
          action: string;
          userID?: number;
          limit?: number;
        };

        switch (action) {
          case "list":
            result = await zentaoClient.getUsers(limit);
            break;

          case "view":
            if (!userID) {
              return {
                content: [{ type: "text", text: "缺少必要参数: userID" }],
                isError: true,
              };
            }
            result = await zentaoClient.getUser(userID);
            if (!result) {
              return {
                content: [{ type: "text", text: `用户 #${userID} 不存在或无权限查看` }],
                isError: true,
              };
            }
            break;

          case "me":
            result = await zentaoClient.getMyProfile();
            if (!result) {
              return {
                content: [{ type: "text", text: "获取当前用户信息失败" }],
                isError: true,
              };
            }
            break;

          default:
            return {
              content: [{ type: "text", text: `未知操作类型: ${action}` }],
              isError: true,
            };
        }
        break;
      }

      // 文档操作
      case "zentao_docs": {
        const {
          action,
          spaceType,
          spaceID,
          libID,
          docID,
          moduleID,
          fileID,
          fileType,
          title,
          content,
          keywords,
          type,
          url,
          moduleName,
          parentID,
        } = args as {
          action: string;
          spaceType?: "product" | "project";
          spaceID?: number;
          libID?: number;
          docID?: number;
          moduleID?: number;
          fileID?: number;
          fileType?: string;
          title?: string;
          content?: string;
          keywords?: string;
          type?: string;
          url?: string;
          moduleName?: string;
          parentID?: number;
        };

        switch (action) {
          case "tree":
            // 获取文档空间树（包含文档库、目录和文档）
            if (!spaceType || !spaceID) {
              return {
                content: [{ type: "text", text: "缺少必要参数: spaceType 和 spaceID" }],
                isError: true,
              };
            }
            result = await zentaoClient.getDocSpaceData(spaceType, spaceID);
            break;

          case "view":
            if (!docID) {
              return {
                content: [{ type: "text", text: "缺少必要参数: docID（文档 ID）" }],
                isError: true,
              };
            }
            result = await zentaoClient.getDoc(docID);
            if (!result) {
              return {
                content: [{ type: "text", text: `文档 #${docID} 不存在或无权限查看` }],
                isError: true,
              };
            }
            break;

          case "create":
            if (!libID || !title) {
              return {
                content: [
                  {
                    type: "text",
                    text: "缺少必要参数: libID（文档库 ID）和 title（标题）",
                  },
                ],
                isError: true,
              };
            }
            result = await zentaoClient.createDoc({
              lib: libID,
              title,
              type: type as "text" | "url" | undefined,
              content,
              url,
              keywords,
              module: moduleID,
            });
            break;

          case "edit":
            if (!docID) {
              return {
                content: [{ type: "text", text: "缺少必要参数: docID（文档 ID）" }],
                isError: true,
              };
            }
            result = await zentaoClient.editDoc({
              id: docID,
              title,
              content,
              keywords,
            });
            if (!result) {
              return {
                content: [{ type: "text", text: `编辑文档 #${docID} 失败` }],
                isError: true,
              };
            }
            break;

          case "createModule":
            // 创建文档目录
            if (!libID || !moduleName || !spaceID) {
              return {
                content: [
                  {
                    type: "text",
                    text: "缺少必要参数: libID（文档库 ID）、moduleName（目录名称）和 spaceID（产品/项目 ID）",
                  },
                ],
                isError: true,
              };
            }
            result = await zentaoClient.createDocModule({
              name: moduleName,
              libID,
              parentID: parentID || 0,
              objectID: spaceID,
            });
            break;

          case "editModule":
            // 编辑文档目录
            if (!moduleID || !moduleName || !libID) {
              return {
                content: [
                  {
                    type: "text",
                    text: "缺少必要参数: moduleID（目录 ID）、moduleName（目录名称）和 libID（文档库 ID）",
                  },
                ],
                isError: true,
              };
            }
            result = await zentaoClient.editDocModule({
              moduleID,
              name: moduleName,
              root: libID,
              parent: parentID,
            });
            if (!result) {
              return {
                content: [{ type: "text", text: `编辑目录 #${moduleID} 失败` }],
                isError: true,
              };
            }
            break;

          case "readFile":
            if (!fileID) {
              return {
                content: [{ type: "text", text: "缺少必要参数: fileID（文件 ID）" }],
                isError: true,
              };
            }
            if (!fileType) {
              return {
                content: [{ type: "text", text: "缺少必要参数: fileType（文件类型）" }],
                isError: true,
              };
            }
            result = await saveFileToTempDirectory(await zentaoClient.readFile(fileID, fileType));
            break;

          default:
            return {
              content: [{ type: "text", text: `未知操作类型: ${action}` }],
              isError: true,
            };
        }
        break;
      }

      // 文件操作
      case "zentao_file": {
        const { action, fileID, fileType } = args as {
          action: string;
          fileID?: number;
          fileType?: string;
        };

        switch (action) {
          case "read":
            if (!fileID) {
              return {
                content: [{ type: "text", text: "缺少必要参数: fileID（文件 ID）" }],
                isError: true,
              };
            }
            if (!fileType) {
              return {
                content: [{ type: "text", text: "缺少必要参数: fileType（文件类型）" }],
                isError: true,
              };
            }
            result = await saveFileToTempDirectory(await zentaoClient.readFile(fileID, fileType));
            break;

          default:
            return {
              content: [{ type: "text", text: `未知操作类型: ${action}` }],
              isError: true,
            };
        }
        break;
      }

      default:
        return {
          content: [{ type: "text", text: `未知工具: ${name}` }],
          isError: true,
        };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return {
      content: [{ type: "text", text: `操作失败: ${errorMessage}` }],
      isError: true,
    };
  }
});

// ==================== 启动服务器 ====================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("启动失败:", error);
  process.exit(1);
});
