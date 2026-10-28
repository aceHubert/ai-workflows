import type { ZentaoFileReadResult } from "@acehubert/zentao-api";

export interface ZentaoClientBaseOptions {
  url?: string;
  account?: string;
  password?: string;
}

export interface ZentaoMcpOptions extends ZentaoClientBaseOptions {
  version?: string;
  skipSSL?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ZentaoCliOptions extends ZentaoMcpOptions {}

export interface ZentaoClientConfig {
  url: string;
  account: string;
  password: string;
  rejectUnauthorized?: boolean;
}

export type ZentaoClientVersion = "legacy" | "v1" | "v2";

export type BugStatus = "active" | "resolved" | "closed";

export type BugSeverity = 1 | 2 | 3 | 4;

export interface Bug {
  id: number;
  title: string;
  status: BugStatus;
  severity: BugSeverity;
  pri: number;
  product: number;
  productName?: string;
  project?: number;
  projectName?: string;
  module?: number;
  moduleName?: string;
  openedBy: string;
  openedDate: string;
  assignedTo: string;
  resolvedBy?: string;
  resolvedDate?: string;
  resolution?: string;
  closedBy?: string;
  closedDate?: string;
  steps?: string;
  type?: string;
  confirmed?: number;
}

export type BugType =
  | "codeerror"
  | "config"
  | "install"
  | "security"
  | "performance"
  | "standard"
  | "automation"
  | "designdefect"
  | "others";

export interface CreateBugParams {
  product: number;
  title: string;
  severity: BugSeverity;
  pri: number;
  type: BugType;
  branch?: number;
  module?: number;
  execution?: number;
  keywords?: string;
  os?: string;
  browser?: string;
  steps?: string;
  task?: number;
  story?: number;
  deadline?: string;
  openedBuild?: string[];
  assignedTo?: string;
  project?: number;
}

export interface ResolveBugParams {
  id: number;
  resolution:
    | "bydesign"
    | "duplicate"
    | "external"
    | "fixed"
    | "notrepro"
    | "postponed"
    | "willnotfix";
  resolvedBuild?: string;
  comment?: string;
}

export interface CloseBugParams {
  id: number;
  comment?: string;
}

export interface ActivateBugParams {
  id: number;
  assignedTo?: string;
  comment?: string;
}

export type StoryStatus = "draft" | "active" | "changed" | "reviewing" | "closed";

export interface Story {
  id: number;
  title: string;
  status: StoryStatus;
  stage: string;
  pri: number;
  estimate?: number;
  product: number;
  productName?: string;
  module?: number;
  moduleName?: string;
  plan?: number;
  source?: string;
  sourceNote?: string;
  openedBy: string;
  openedDate: string;
  assignedTo?: string;
  assignedDate?: string;
  closedBy?: string;
  closedDate?: string;
  closedReason?: string;
  spec?: string;
  verify?: string;
}

export type StoryCategory =
  | "feature"
  | "interface"
  | "performance"
  | "safe"
  | "experience"
  | "improve"
  | "other";

export interface CreateStoryParams {
  product: number;
  title: string;
  category: StoryCategory;
  pri: number;
  spec: string;
  reviewer: string[];
  verify?: string;
  estimate?: number;
  module?: number;
  plan?: number;
  source?: string;
  sourceNote?: string;
  keywords?: string;
}

export interface CloseStoryParams {
  id: number;
  closedReason:
    | "done"
    | "subdivided"
    | "duplicate"
    | "postponed"
    | "willnotdo"
    | "cancel"
    | "bydesign";
  comment?: string;
}

export interface Product {
  id: number;
  name: string;
  code: string;
  status: string;
  desc?: string;
}

export interface Project {
  id: number;
  name: string;
  code?: string;
  status: string;
  begin?: string;
  end?: string;
}

export interface ApiResponse<T = unknown> {
  status?: string;
  data?: T;
  error?: string;
  message?: string;
}

export type TestCaseType =
  | "feature"
  | "performance"
  | "config"
  | "install"
  | "security"
  | "interface"
  | "unit"
  | "other";

export type TestCaseStage = "unittest" | "feature" | "intergrate" | "system" | "smoke" | "bvt";

export type TestCaseStatus = "wait" | "normal" | "blocked" | "investigate";

export interface TestCaseStep {
  id?: number;
  desc: string;
  expect: string;
}

export interface TestCase {
  id: number;
  product: number;
  branch?: number;
  module?: number;
  story?: number;
  storyVersion?: number;
  title: string;
  precondition?: string;
  keywords?: string;
  pri: number;
  type: TestCaseType;
  stage?: TestCaseStage;
  status: TestCaseStatus;
  openedBy:
    | {
        id: number;
        account: string;
        avatar: string;
        realname: string;
      }
    | string;
  openedDate: string;
  fromBug?: number;
  fromCaseID?: number;
  steps?: TestCaseStep[];
  lastRunner?: string;
  lastRunDate?: string;
  lastRunResult?: string;
  statusName?: string;
}

export interface CreateTestCaseParams {
  product: number;
  title: string;
  type: TestCaseType;
  steps: TestCaseStep[];
  branch?: number;
  module?: number;
  story?: number;
  stage?: TestCaseStage;
  precondition?: string;
  pri?: number;
  keywords?: string;
}

export interface TestCaseListResponse {
  page: number;
  total: number;
  limit: number;
  testcases: TestCase[];
}

export interface UpdateBugParams {
  id: number;
  title?: string;
  severity?: BugSeverity;
  pri?: number;
  type?: string;
  module?: number;
  execution?: number;
  keywords?: string;
  os?: string;
  browser?: string;
  steps?: string;
  task?: number;
  story?: number;
  deadline?: string;
  openedBuild?: string[];
}

export interface UpdateStoryParams {
  id: number;
  module?: number;
  source?: string;
  sourceNote?: string;
  pri?: number;
  category?: string;
  estimate?: number;
  keywords?: string;
}

export interface ChangeStoryParams {
  id: number;
  title?: string;
  spec?: string;
  verify?: string;
}

export type TaskType =
  | "design"
  | "devel"
  | "request"
  | "test"
  | "study"
  | "discuss"
  | "ui"
  | "affair"
  | "misc";

export type TaskStatus = "wait" | "doing" | "done" | "closed" | "cancel";

export interface Task {
  id: number;
  project: number;
  execution: number;
  module?: number;
  story?: number;
  fromBug?: number;
  name: string;
  type: TaskType;
  pri: number;
  estimate?: number;
  consumed?: number;
  left?: number;
  deadline?: string;
  status: TaskStatus;
  desc?: string;
  openedBy?: { id: number; account: string; realname: string } | string;
  openedDate?: string;
  assignedTo?: { id: number; account: string; realname: string } | string;
  assignedDate?: string;
  estStarted?: string;
  realStarted?: string;
  finishedBy?: string;
  finishedDate?: string;
  closedBy?: string;
  closedDate?: string;
  progress?: number;
}

export interface CreateTaskParams {
  execution: number;
  name: string;
  type: TaskType;
  assignedTo: string[];
  estStarted: string;
  deadline: string;
  module?: number;
  story?: number;
  fromBug?: number;
  pri?: number;
  estimate?: number;
  desc?: string;
}

export interface UpdateTaskParams {
  id: number;
  name?: string;
  type?: TaskType;
  assignedTo?: string[];
  module?: number;
  story?: number;
  fromBug?: number;
  pri?: number;
  estimate?: number;
  estStarted?: string;
  deadline?: string;
  desc?: string;
}

export interface User {
  id: number;
  account: string;
  realname?: string;
  avatar?: string;
  gender?: "m" | "f";
  role?: string;
  dept?: number;
  email?: string;
  mobile?: string;
  phone?: string;
  weixin?: string;
  qq?: string;
  address?: string;
  join?: string;
  visits?: number;
  last?: string;
  fails?: number;
  locked?: string;
  deleted?: boolean;
}

export interface CreateUserParams {
  account: string;
  password: string;
  realname?: string;
  gender?: "m" | "f";
  visions?: string[];
  role?: string;
  dept?: number;
  email?: string;
  mobile?: string;
  phone?: string;
  weixin?: string;
  qq?: string;
  address?: string;
  join?: string;
}

export interface UpdateUserParams {
  id: number;
  realname?: string;
  role?: string;
  dept?: number;
  email?: string;
  gender?: "m" | "f";
  mobile?: string;
  phone?: string;
  weixin?: string;
  qq?: string;
  address?: string;
  join?: string;
  password?: string;
}

export interface Program {
  id: number;
  name: string;
  parent?: number;
  PM?: string;
  budget?: number;
  budgetUnit?: string;
  begin: string;
  end: string;
  status?: string;
  desc?: string;
  openedBy?: string;
  openedDate?: string;
  acl?: string;
}

export interface CreateProgramParams {
  name: string;
  begin: string;
  end: string;
  parent?: number;
  PM?: string;
  budget?: number;
  budgetUnit?: string;
  desc?: string;
  acl?: string;
  whitelist?: string[];
}

export interface UpdateProgramParams {
  id: number;
  name?: string;
  parent?: number;
  PM?: string;
  budget?: number;
  budgetUnit?: string;
  desc?: string;
  begin?: string;
  end?: string;
  acl?: string;
  whitelist?: string[];
}

export interface Plan {
  id: number;
  product: number;
  branch?: number;
  parent?: number;
  title: string;
  desc?: string;
  begin?: string;
  end?: string;
  stories?: number;
  bugs?: number;
  status?: string;
}

export interface CreatePlanParams {
  product: number;
  title: string;
  begin?: string;
  end?: string;
  branch?: number;
  parent?: number;
  desc?: string;
}

export interface UpdatePlanParams {
  id: number;
  title?: string;
  begin?: string;
  end?: string;
  branch?: number;
  desc?: string;
}

export interface Release {
  id: number;
  project?: number;
  product: number;
  branch?: number;
  build?: number;
  name: string;
  date?: string;
  desc?: string;
  status?: string;
  productName?: string;
  buildID?: number;
  buildName?: string;
  projectName?: string;
}

export interface Build {
  id: number;
  project: number;
  product: number;
  branch?: number;
  execution?: number;
  name: string;
  scmPath?: string;
  filePath?: string;
  date?: string;
  builder?: string;
  desc?: string;
  deleted?: boolean;
  executionName?: string;
  productName?: string;
}

export interface CreateBuildParams {
  project: number;
  name: string;
  execution: number;
  product: number;
  builder: string;
  branch?: number;
  date?: string;
  scmPath?: string;
  filePath?: string;
  desc?: string;
}

export interface UpdateBuildParams {
  id: number;
  name?: string;
  scmPath?: string;
  filePath?: string;
  desc?: string;
  builder?: string;
  date?: string;
}

export interface Execution {
  id: number;
  project: number;
  name: string;
  code?: string;
  type?: string;
  parent?: number;
  begin: string;
  end: string;
  days?: number;
  status?: string;
  PO?: string;
  PM?: string;
  QD?: string;
  RD?: string;
  team?: string;
  acl?: string;
  whitelist?: string;
  openedBy?: string;
  openedDate?: string;
  progress?: number;
}

export interface CreateExecutionParams {
  project: number;
  name: string;
  code: string;
  begin: string;
  end: string;
  days?: number;
  lifetime?: string;
  PO?: string;
  PM?: string;
  QD?: string;
  RD?: string;
  teamMembers?: string[];
  desc?: string;
  acl?: string;
  whitelist?: string[];
}

export interface UpdateExecutionParams {
  id: number;
  name?: string;
  code?: string;
  begin?: string;
  end?: string;
  days?: number;
  lifetime?: string;
  PO?: string;
  PM?: string;
  QD?: string;
  RD?: string;
  teamMembers?: string[];
  desc?: string;
  acl?: string;
  whitelist?: string[];
}

export interface CreateProductParams {
  name: string;
  code: string;
  program?: number;
  line?: number;
  PO?: string;
  QD?: string;
  RD?: string;
  type?: "normal" | "branch" | "platform";
  desc?: string;
  acl?: "open" | "private";
  whitelist?: string[];
}

export interface UpdateProductParams {
  id: number;
  name?: string;
  code?: string;
  program?: number;
  line?: number;
  type?: "normal" | "branch" | "platform";
  status?: string;
  desc?: string;
  PO?: string;
  QD?: string;
  RD?: string;
  acl?: "open" | "private";
  whitelist?: string[];
}

export interface CreateProjectParams {
  name: string;
  code: string;
  begin: string;
  end: string;
  products: number[];
  model?: "scrum" | "waterfall";
  parent?: number;
}

export interface UpdateProjectParams {
  id: number;
  name?: string;
  code?: string;
  parent?: number;
  PM?: string;
  budget?: number;
  budgetUnit?: string;
  days?: number;
  desc?: string;
  acl?: string;
  whitelist?: string[];
  auth?: string;
}

export type DocType = "text" | "url" | "word" | "ppt" | "excel";

export interface Doc {
  id: number;
  lib: number;
  module?: number;
  title: string;
  type: DocType;
  content?: string;
  url?: string;
  keywords?: string;
  addedBy?: string;
  addedDate?: string;
  editedBy?: string;
  editedDate?: string;
  version?: number;
  acl?: string;
  views?: number;
}

export type DocLibType = "product" | "project" | "execution" | "custom" | "api";

export interface DocLib {
  id: number;
  name: string;
  type: DocLibType;
  product?: number;
  project?: number;
  acl?: string;
  deleted?: boolean;
}

export interface CreateDocParams {
  lib: number;
  title: string;
  type?: DocType;
  content?: string;
  url?: string;
  keywords?: string;
  module?: number;
}

export interface EditDocParams {
  id: number;
  title?: string;
  content?: string;
  keywords?: string;
}

export interface DocModule {
  id: number;
  name: string;
  parent: number;
  root: number;
  path?: string;
  grade?: number;
  order?: number;
  children?: DocModule[];
}

export interface DocSpaceData {
  libs?: DocLib[];
  modules?: DocModule[];
  docs?: Doc[];
}

export interface CreateDocModuleParams {
  name: string;
  libID: number;
  parentID?: number;
  objectID: number;
}

export interface EditDocModuleParams {
  moduleID: number;
  name: string;
  root: number;
  parent?: number;
}

export interface IZentaoClient {
  readonly version: ZentaoClientVersion;
  getBugs(productID: number, browseType?: string, limit?: number): Promise<Bug[]>;
  getBug(bugID: number): Promise<Bug | null>;
  createBug(params: CreateBugParams): Promise<Bug>;
  resolveBug(params: ResolveBugParams): Promise<boolean>;
  closeBug(params: CloseBugParams): Promise<boolean>;
  getStories(productID: number, browseType?: string, limit?: number): Promise<Story[]>;
  getStory(storyID: number): Promise<Story | null>;
  createStory(params: CreateStoryParams): Promise<Story>;
  closeStory(params: CloseStoryParams): Promise<boolean>;
  getTestCases(productID: number, limit?: number): Promise<TestCaseListResponse>;
  getTestCase(caseID: number): Promise<TestCase | null>;
  createTestCase(params: CreateTestCaseParams): Promise<TestCase>;
  getProducts(limit?: number): Promise<Product[]>;
  getProduct(productID: number): Promise<Product | null>;
  getProjects(limit?: number): Promise<Project[]>;
  getProject(projectID: number): Promise<Project | null>;
  getBuilds(executionID?: number, projectID?: number, limit?: number): Promise<Build[]>;
  getBuild(buildID: number): Promise<Build | null>;
  createBuild(params: CreateBuildParams): Promise<Build>;
  getUsers(limit?: number): Promise<User[]>;
  getUser(userID: number): Promise<User | null>;
  getMyProfile(): Promise<User | null>;
  getDocSpaceData(type: "product" | "project", spaceID: number): Promise<DocSpaceData>;
  getDoc(docID: number, version?: number): Promise<Doc | null>;
  createDoc(params: CreateDocParams): Promise<{ id: number; doc: Doc }>;
  editDoc(params: EditDocParams): Promise<Doc | null>;
  createDocModule(params: CreateDocModuleParams): Promise<{ id: number; name: string }>;
  editDocModule(params: EditDocModuleParams): Promise<boolean>;
  readFile(fileID: number, fileType: string): Promise<ZentaoFileReadResult>;
}
