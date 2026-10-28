import { ZentaoV1 } from "@acehubert/zentao-api";
import { ZentaoClientLegacy } from "./client-legacy";

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

/**
 * MCP v1 客户端适配器。
 * 实际接口调用统一委托给 @acehubert/zentao-api，当前类只负责保持 MCP 层返回结构兼容。
 */
export class ZentaoClientV1 implements IZentaoClient {
  private readonly api: ZentaoV1;
  private readonly legacyClient: ZentaoClientLegacy;

  constructor(config: ZentaoClientConfig) {
    this.api = new ZentaoV1(config);
    this.legacyClient = new ZentaoClientLegacy(config);
  }

  get version(): ZentaoClientVersion {
    return "v1";
  }

  async login(): Promise<boolean> {
    await this.api.login();
    return true;
  }

  async getBugs(productID: number, browseType?: string, limit?: number): Promise<Bug[]> {
    return (await this.api.getBugs(
      productID,
      browseType as Parameters<ZentaoV1["getBugs"]>[1],
      limit,
    )) as Bug[];
  }

  async getAssignedBugs(account: string, limit = 100): Promise<Bug[]> {
    return (await this.api.getAssignedBugs(account, limit)) as Bug[];
  }

  async getBug(bugID: number): Promise<Bug | null> {
    return (await this.api.getBug(bugID)) as Bug | null;
  }

  async createBug(params: CreateBugParams): Promise<Bug> {
    return (await this.api.createBug(params)) as Bug;
  }

  async resolveBug(params: ResolveBugParams): Promise<boolean> {
    return this.api.resolveBug({
      id: params.id,
      resolution: params.resolution,
      resolvedBuild: params.resolvedBuild ?? "trunk",
      comment: params.comment ?? "",
    });
  }

  async closeBug(params: CloseBugParams): Promise<boolean> {
    return this.api.closeBug(params);
  }

  async getStories(productID: number, browseType?: string, limit?: number): Promise<Story[]> {
    return (await this.api.getStories(
      productID,
      browseType as Parameters<ZentaoV1["getStories"]>[1],
      limit,
    )) as Story[];
  }

  async getStory(storyID: number): Promise<Story | null> {
    return (await this.api.getStory(storyID)) as Story | null;
  }

  async createStory(params: CreateStoryParams): Promise<Story> {
    return (await this.api.createStory(params)) as Story;
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
    return (await this.api.createTestCase(params)) as TestCase;
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
      project: params.project,
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
