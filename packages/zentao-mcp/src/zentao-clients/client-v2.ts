import { ZentaoV2 } from "@acehubert/zentao-api";

import type { ZentaoFileReadResult } from "@acehubert/zentao-api";
import type {
  Bug,
  Build,
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
import { ZentaoClientLegacy } from "./client-legacy";

type MaybeRecord = Record<string, unknown>;

function asRecord(value: unknown): MaybeRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as MaybeRecord)
    : null;
}

function pickCreatedId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const matched = value.match(
      /(?:id|bugID|storyID|caseID|docID)=([0-9]+)|\/([0-9]+)(?:\.json|\.html)?$/i,
    );
    return matched ? Number(matched[1] ?? matched[2]) : null;
  }

  const record = asRecord(value);
  if (!record) {
    return null;
  }

  for (const key of ["id", "bugID", "storyID", "caseID", "docID"]) {
    const parsed = Number(record[key]);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  for (const key of ["data", "result", "locate", "message"]) {
    const parsed = pickCreatedId(record[key]);
    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
}

function extractEntity<T>(value: unknown, ...keys: string[]): T | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  for (const key of keys) {
    const candidate = record[key];
    if (asRecord(candidate)) {
      return candidate as T;
    }
  }

  return record as T;
}

/**
 * MCP v2 客户端适配器。
 * 实际接口调用统一委托给 @acehubert/zentao-api，当前类只负责保持 MCP 层返回结构兼容。
 */
export class ZentaoClientV2 implements IZentaoClient {
  private readonly api: ZentaoV2;
  private readonly legacyClient: ZentaoClientLegacy;

  constructor(config: ZentaoClientConfig) {
    this.api = new ZentaoV2(config);
    this.legacyClient = new ZentaoClientLegacy(config);
  }

  get version(): ZentaoClientVersion {
    return "v2";
  }

  async login(): Promise<boolean> {
    await this.api.login();
    return true;
  }

  async getBugs(productID: number, browseType?: string, limit?: number): Promise<Bug[]> {
    return (await this.api.getBugs(
      productID,
      browseType as Parameters<ZentaoV2["getBugs"]>[1],
      limit,
    )) as Bug[];
  }

  async getBug(bugID: number): Promise<Bug | null> {
    return (await this.api.getBug(bugID)) as Bug | null;
  }

  async createBug(params: CreateBugParams): Promise<Bug> {
    const created = await this.api.createBug({
      productID: params.product,
      title: params.title,
      severity: params.severity,
      pri: params.pri,
      type: params.type,
      branch: params.branch,
      module: params.module,
      execution: params.execution,
      keywords: params.keywords,
      os: params.os,
      browser: params.browser,
      steps: params.steps,
      task: params.task,
      story: params.story,
      deadline: params.deadline,
      openedBuild: params.openedBuild,
      assignedTo: params.assignedTo,
      project: params.project,
    });

    const createdBug = extractEntity<Bug>(created, "bug");
    if (createdBug?.id) {
      return createdBug;
    }

    const bugID = pickCreatedId(created);
    if (bugID !== null) {
      const bug = await this.getBug(bugID);
      if (bug) {
        return bug;
      }
    }

    return created as Bug;
  }

  async resolveBug(params: ResolveBugParams): Promise<boolean> {
    return this.api.resolveBug({
      id: params.id,
      resolution: params.resolution,
      resolvedBuild: params.resolvedBuild,
      comment: params.comment ?? "",
    });
  }

  async closeBug(params: CloseBugParams): Promise<boolean> {
    return this.api.closeBug(params);
  }

  async getStories(productID: number, browseType?: string, limit?: number): Promise<Story[]> {
    return (await this.api.getStories(
      productID,
      browseType as Parameters<ZentaoV2["getStories"]>[1],
      limit,
    )) as Story[];
  }

  async getStory(storyID: number): Promise<Story | null> {
    return (await this.api.getStory(storyID)) as Story | null;
  }

  async createStory(params: CreateStoryParams): Promise<Story> {
    const created = await this.api.createStory({
      productID: params.product,
      title: params.title,
      category: params.category,
      pri: params.pri,
      spec: params.spec,
      reviewer: params.reviewer,
      verify: params.verify,
      estimate: params.estimate,
      module: params.module,
      plan: params.plan,
      source: params.source,
      sourceNote: params.sourceNote,
      keywords: params.keywords,
    });

    const story = extractEntity<Story>(created, "story");
    if (story?.id) {
      return story;
    }

    const storyID = pickCreatedId(created);
    if (storyID !== null) {
      const fetched = await this.getStory(storyID);
      if (fetched) {
        return fetched;
      }
    }

    return created as Story;
  }

  async closeStory(params: CloseStoryParams): Promise<boolean> {
    return this.api.closeStory({
      id: params.id,
      closedReason: params.closedReason,
      comment: params.comment ?? "",
    });
  }

  async getTestCases(productID: number, limit = 100): Promise<TestCaseListResponse> {
    const testcases = (await this.api.getTestCases(productID, limit)) as TestCase[];
    return {
      page: 1,
      total: testcases.length,
      limit,
      testcases,
    };
  }

  async getTestCase(caseID: number): Promise<TestCase | null> {
    return (await this.api.getTestCase(caseID)) as TestCase | null;
  }

  async createTestCase(params: CreateTestCaseParams): Promise<TestCase> {
    const created = await this.api.createTestCase({
      productID: params.product,
      title: params.title,
      type: params.type,
      steps: params.steps.map((step) => step.desc),
      expects: params.steps.map((step) => step.expect),
      stepType: "step",
      branch: params.branch,
      module: params.module,
      story: params.story,
      stage: params.stage,
      precondition: params.precondition,
      pri: params.pri,
      keywords: params.keywords,
    });

    const testcase = extractEntity<TestCase>(created, "testcase", "case");
    if (testcase?.id) {
      return testcase;
    }

    const caseID = pickCreatedId(created);
    if (caseID !== null) {
      const fetched = await this.getTestCase(caseID);
      if (fetched) {
        return fetched;
      }
    }

    return created as TestCase;
  }

  async getProducts(limit = 100): Promise<Product[]> {
    return (await this.api.getProducts(limit)) as Product[];
  }

  async getProduct(productID: number): Promise<Product | null> {
    return (await this.api.getProduct(productID)) as Product | null;
  }

  async getProjects(limit = 100): Promise<Project[]> {
    return (await this.api.getProjects(limit)) as Project[];
  }

  async getProject(projectID: number): Promise<Project | null> {
    return (await this.api.getProject(projectID)) as Project | null;
  }

  async getBuilds(executionID?: number, projectID?: number, limit = 100): Promise<Build[]> {
    if (executionID) {
      return (await this.api.getExecutionBuilds(executionID, limit)) as Build[];
    }
    if (projectID) {
      return (await this.api.getProjectBuilds(projectID, limit)) as Build[];
    }
    throw new Error("查询版本列表失败: 缺少 executionID 或 projectID");
  }

  async getBuild(buildID: number): Promise<Build | null> {
    return (await this.api.getBuild(buildID)) as Build | null;
  }

  async createBuild(params: CreateBuildParams): Promise<Build> {
    return (await this.api.createBuild({
      execution: params.execution,
      product: params.product,
      name: params.name,
      builder: params.builder,
      branch: params.branch,
      date: params.date,
      scmPath: params.scmPath,
      filePath: params.filePath,
      desc: params.desc,
    })) as Build;
  }

  async getUsers(limit = 100): Promise<User[]> {
    return (await this.api.getUsers(limit)) as User[];
  }

  async getUser(userID: number): Promise<User | null> {
    return (await this.api.getUser(userID)) as User | null;
  }

  async getMyProfile(): Promise<User | null> {
    return (await this.api.getMyProfile()) as User | null;
  }

  async getDocSpaceData(type: "product" | "project", spaceID: number): Promise<DocSpaceData> {
    return this.legacyClient.getDocSpaceData(type, spaceID);
  }

  async getDoc(docID: number, version?: number): Promise<Doc | null> {
    return this.legacyClient.getDoc(docID, version);
  }

  async createDoc(params: CreateDocParams): Promise<{ id: number; doc: Doc }> {
    return this.legacyClient.createDoc(params);
  }

  async editDoc(params: EditDocParams): Promise<Doc | null> {
    return this.legacyClient.editDoc(params);
  }

  async createDocModule(params: CreateDocModuleParams): Promise<{ id: number; name: string }> {
    return this.legacyClient.createDocModule(params);
  }

  async editDocModule(params: EditDocModuleParams): Promise<boolean> {
    return this.legacyClient.editDocModule(params);
  }

  async readFile(fileID: number, fileType: string): Promise<ZentaoFileReadResult> {
    return this.legacyClient.readFile(fileID, fileType);
  }
}
