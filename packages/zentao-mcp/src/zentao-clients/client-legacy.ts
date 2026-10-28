import { ZentaoLegacy } from "@acehubert/zentao-api";

import type { ZentaoFileReadResult } from "@acehubert/zentao-api";
import type {
  Build,
  Bug,
  CloseBugParams,
  CloseStoryParams,
  CreateBugParams,
  CreateBuildParams,
  CreateDocModuleParams,
  CreateDocParams,
  CreateStoryParams,
  CreateTestCaseParams,
  Doc,
  DocSpaceData,
  EditDocModuleParams,
  EditDocParams,
  Product,
  Project,
  ResolveBugParams,
  Story,
  TestCase,
  TestCaseListResponse,
  User,
  ZentaoClientConfig,
  ZentaoClientVersion,
  IZentaoClient,
} from "../types";

interface LegacyApiResult {
  status: 0 | 1;
  msg?: unknown;
  result?: unknown;
}

type MaybeRecord = Record<string, unknown>;

function isRecord(value: unknown): value is MaybeRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickRecord(value: unknown, ...keys: string[]): MaybeRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  for (const key of keys) {
    const candidate = value[key];
    if (isRecord(candidate)) {
      return candidate;
    }
  }

  return value;
}

function pickCollection<T>(value: unknown, ...keys: string[]): T[] {
  const record = pickRecord(value, ...keys);
  if (!record) {
    return Array.isArray(value) ? (value as T[]) : [];
  }

  for (const key of keys) {
    const candidate = record[key];
    if (Array.isArray(candidate)) {
      return candidate as T[];
    }
    if (isRecord(candidate)) {
      return Object.values(candidate) as T[];
    }
  }

  return [];
}

function pickEntity<T>(value: unknown, ...keys: string[]): T | null {
  if (!isRecord(value)) {
    return null;
  }

  for (const key of keys) {
    const candidate = value[key];
    if (isRecord(candidate)) {
      return candidate as T;
    }
  }

  return value as T;
}

/**
 * 展平 legacy 版本列表接口返回的按产品 ID 分组的 builds 对象
 * （executionBuilds / projectBuilds，组内为版本数组）。
 */
function flattenGroupedBuilds(value: unknown): Build[] {
  const record = isRecord(value) ? value : null;
  if (!record) {
    return Array.isArray(value) ? (value as Build[]) : [];
  }

  for (const key of ["executionBuilds", "projectBuilds"]) {
    const grouped = record[key];
    if (Array.isArray(grouped)) {
      return grouped as Build[];
    }
    if (isRecord(grouped)) {
      return Object.values(grouped).flatMap((group): Build[] => {
        if (Array.isArray(group)) {
          return group as Build[];
        }
        if (isRecord(group)) {
          return Object.values(group) as Build[];
        }
        return [];
      });
    }
  }

  return [];
}

function pickNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pickCreatedId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const patterns = [
      /(?:bugID|storyID|caseID|docID|id)=([0-9]+)/i,
      /(?:bug|story|testcase|case|doc)[-/]view[-/]([0-9]+)/i,
      /\/([0-9]+)(?:\.json|\.html)?$/i,
    ];

    for (const pattern of patterns) {
      const matched = value.match(pattern);
      if (matched) {
        return Number(matched[1]);
      }
    }

    return null;
  }

  if (!isRecord(value)) {
    return null;
  }

  for (const key of ["id", "bugID", "storyID", "caseID", "docID"]) {
    const directValue = pickNumber(value[key]);
    if (directValue !== null) {
      return directValue;
    }
  }

  for (const key of ["data", "result", "locate", "message"]) {
    const nestedValue = pickCreatedId(value[key]);
    if (nestedValue !== null) {
      return nestedValue;
    }
  }

  return null;
}

function unsupportedLegacyApi(methodName: string): never {
  throw new Error(`Legacy API 暂不支持 ${methodName}: @acehubert/zentao-api 未封装该方法`);
}

/**
 * MCP legacy 客户端适配器。
 * 实际接口调用统一委托给 @acehubert/zentao-api，当前类只负责参数和返回结构适配。
 */
export class ZentaoClientLegacy implements IZentaoClient {
  private readonly config: ZentaoClientConfig;
  private readonly api: ZentaoLegacy;

  constructor(config: ZentaoClientConfig) {
    this.config = config;
    this.api = new ZentaoLegacy({
      url: config.url,
      account: config.account,
      password: config.password,
      rejectUnauthorized: config.rejectUnauthorized,
      preserveToken: false,
    });
  }

  get version(): ZentaoClientVersion {
    return "legacy";
  }

  async login(): Promise<boolean> {
    const result = (await this.api.login()) as LegacyApiResult;
    return result.status === 1;
  }

  async getBugs(productID: number, browseType = "unclosed", limit = 100): Promise<Bug[]> {
    const result = (await this.api.getBugList({
      productID,
      browseType: browseType as Parameters<ZentaoLegacy["getBugList"]>[0]["browseType"],
      recPerPage: limit,
      pageID: 1,
    })) as LegacyApiResult;
    return pickCollection<Bug>(result.result, "bugs");
  }

  async getBug(bugID: number): Promise<Bug | null> {
    try {
      const result = (await this.api.getBug({ bugID })) as LegacyApiResult;
      return pickEntity<Bug>(result.result, "bug");
    } catch {
      return null;
    }
  }

  async createBug(params: CreateBugParams): Promise<Bug> {
    const result = (await this.api.addBug(
      params as Parameters<ZentaoLegacy["addBug"]>[0],
    )) as LegacyApiResult;
    const created = pickEntity<Bug>(result.result, "bug");
    if (created) {
      return created;
    }

    const bugID = pickCreatedId(result);
    if (bugID !== null) {
      const bug = await this.getBug(bugID);
      if (bug) {
        return bug;
      }
    }

    throw new Error(`创建 Legacy Bug 失败: ${String(result.msg ?? "未返回 Bug 数据")}`);
  }

  async resolveBug(params: ResolveBugParams): Promise<boolean> {
    const result = (await this.api.resolveBug({
      bugID: params.id,
      resolution: params.resolution,
      resolvedBuild: params.resolvedBuild ?? "trunk",
      comment: params.comment ?? "",
    })) as LegacyApiResult;

    return result.status === 1;
  }

  async closeBug(_params: CloseBugParams): Promise<boolean> {
    return unsupportedLegacyApi("closeBug");
  }

  async getStories(_productID: number, _browseType = "allstory", _limit = 100): Promise<Story[]> {
    return unsupportedLegacyApi("getStories");
  }

  async getStory(_storyID: number): Promise<Story | null> {
    return unsupportedLegacyApi("getStory");
  }

  async createStory(_params: CreateStoryParams): Promise<Story> {
    return unsupportedLegacyApi("createStory");
  }

  async closeStory(_params: CloseStoryParams): Promise<boolean> {
    return unsupportedLegacyApi("closeStory");
  }

  async getTestCases(_productID: number, _limit = 100): Promise<TestCaseListResponse> {
    return unsupportedLegacyApi("getTestCases");
  }

  async getTestCase(_caseID: number): Promise<TestCase | null> {
    return unsupportedLegacyApi("getTestCase");
  }

  async createTestCase(_params: CreateTestCaseParams): Promise<TestCase> {
    return unsupportedLegacyApi("createTestCase");
  }

  async getProducts(limit = 100): Promise<Product[]> {
    const result = (await this.api.getProductList({
      status: "all",
      orderBy: "id_desc",
      recPerPage: limit,
      pageID: 1,
    })) as LegacyApiResult;
    return pickCollection<Product>(result.result, "products");
  }

  async getProduct(productID: number): Promise<Product | null> {
    try {
      const result = (await this.api.getProduct({ productID })) as LegacyApiResult;
      return pickEntity<Product>(result.result, "product");
    } catch {
      return null;
    }
  }

  async getProjects(limit = 100): Promise<Project[]> {
    const result = (await this.api.getProjectList({
      status: "all",
      orderBy: "id_desc",
      recPerPage: limit,
      pageID: 1,
    })) as LegacyApiResult;
    return pickCollection<Project>(result.result, "projects");
  }

  async getProject(projectID: number): Promise<Project | null> {
    try {
      const result = (await this.api.getProject({ projectID })) as LegacyApiResult;
      return pickEntity<Project>(result.result, "project");
    } catch {
      return null;
    }
  }

  async getBuilds(executionID?: number, projectID?: number, limit = 100): Promise<Build[]> {
    if (!executionID && !projectID) {
      throw new Error("查询版本列表失败: 缺少 executionID 或 projectID");
    }
    // legacy 列表接口不支持服务端分页，取回后本地截断
    const result = (await this.api.getBuildList({
      executionID,
      projectID,
    })) as LegacyApiResult;
    return flattenGroupedBuilds(result.result).slice(0, limit);
  }

  async getBuild(buildID: number): Promise<Build | null> {
    try {
      const result = (await this.api.getBuild({ buildID })) as LegacyApiResult;
      return pickEntity<Build>(result.result, "build");
    } catch {
      return null;
    }
  }

  async createBuild(params: CreateBuildParams): Promise<Build> {
    const result = (await this.api.addBuild({
      executionID: params.execution,
      product: params.product,
      name: params.name,
      builder: params.builder,
      branch: params.branch,
      date: params.date,
      scmPath: params.scmPath,
      filePath: params.filePath,
      desc: params.desc,
    })) as LegacyApiResult;

    if (result.status !== 1) {
      throw new Error(`创建 Legacy 版本失败: ${String(result.msg ?? "未返回版本数据")}`);
    }

    // build-create 成功后禅道只返回版本列表跳转地址，需回读列表按名称定位新版本
    const builds = await this.getBuilds(params.execution, undefined, 100);
    const created = builds.find(
      (build) => build.name === params.name && Number(build.product) === params.product,
    );
    if (created) {
      return created;
    }

    throw new Error(`版本 ${params.name} 创建成功但回读失败，请通过版本列表确认结果`);
  }

  async getUsers(limit = 100): Promise<User[]> {
    const result = (await this.api.getUserList({
      recPerPage: limit,
      pageID: 1,
    })) as LegacyApiResult;
    return pickCollection<User>(result.result, "users");
  }

  async getUser(_userID: number): Promise<User | null> {
    return unsupportedLegacyApi("getUser");
  }

  async getMyProfile(): Promise<User | null> {
    const users = await this.getUsers(500);
    return users.find((user) => user.account === this.config.account) ?? null;
  }

  async getDocSpaceData(type: "product" | "project", spaceID: number): Promise<DocSpaceData> {
    return this.api.getDocSpaceData({ type, spaceID }) as Promise<DocSpaceData>;
  }

  async getDoc(docID: number, version?: number): Promise<Doc | null> {
    return this.api.getDoc({ docID, version }) as Promise<Doc | null>;
  }

  async createDoc(params: CreateDocParams): Promise<{ id: number; doc: Doc }> {
    return this.api.createDoc({
      lib: params.lib,
      title: params.title,
      type: params.type,
      content: params.content,
      url: params.url,
      keywords: params.keywords,
      module: params.module,
    }) as Promise<{ id: number; doc: Doc }>;
  }

  async editDoc(params: EditDocParams): Promise<Doc | null> {
    return this.api.editDoc({
      id: params.id,
      title: params.title,
      content: params.content,
      keywords: params.keywords,
    }) as Promise<Doc | null>;
  }

  async createDocModule(params: CreateDocModuleParams): Promise<{ id: number; name: string }> {
    return this.api.createDocModule({
      name: params.name,
      libID: params.libID,
      parentID: params.parentID,
      objectID: params.objectID,
    }) as Promise<{ id: number; name: string }>;
  }

  async editDocModule(params: EditDocModuleParams): Promise<boolean> {
    return this.api.editDocModule({
      moduleID: params.moduleID,
      name: params.name,
      root: params.root,
      parent: params.parent,
    });
  }

  async readFile(fileID: number, fileType: string): Promise<ZentaoFileReadResult> {
    return this.api.readFile({ fileID, fileType }) as Promise<ZentaoFileReadResult>;
  }
}
