import { Constants, TestLink } from "testlink-xmlrpc";

export type TestLinkRecord = Record<string, unknown>;

export interface TestLinkApiOptions {
  url: string;
  apiKey: string;
}

type TestLinkErrorResponse = {
  code?: number;
  message?: string;
};

function isRecord(value: unknown): value is TestLinkRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertRecord(value: unknown, fieldName: string): asserts value is TestLinkRecord {
  if (!isRecord(value)) {
    throw new Error(`${fieldName} must be an object`);
  }
}

function getRequiredString(data: TestLinkRecord, key: string, fieldName = key): string {
  const value = data[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }
  return value;
}

function getOptionalString(data: TestLinkRecord, key: string): string | undefined {
  const value = data[key];
  return typeof value === "string" ? value : undefined;
}

function getOptionalNumber(data: TestLinkRecord, key: string): number | undefined {
  const value = data[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getOptionalBoolean(data: TestLinkRecord, key: string): boolean | undefined {
  const value = data[key];
  return typeof value === "boolean" ? value : undefined;
}

function getOptionalArray(data: TestLinkRecord, key: string): unknown[] | undefined {
  const value = data[key];
  return Array.isArray(value) ? value : undefined;
}

function normalizeIntegerId(value: unknown, fieldName: string): number {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    return Number.parseInt(value, 10);
  }

  throw new Error(`${fieldName} must contain only digits`);
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }
}

function isExternalTestCaseId(id: string): boolean {
  return /^[A-Za-z0-9]+-\d+$/.test(id);
}

export function parseTestCaseId(id: string): string {
  if (!id || typeof id !== "string") {
    throw new Error("Test case ID must be a non-empty string");
  }

  const externalIdMatch = id.match(/^[A-Za-z0-9]+-(\d+)$/);
  if (externalIdMatch) {
    return externalIdMatch[1];
  }

  if (/^\d+$/.test(id)) {
    return id;
  }

  throw new Error("Test case ID must be either numeric (123) or external format (PREFIX-123)");
}

function validateTestCaseId(id: string): void {
  parseTestCaseId(id);
}

function normalizeRpcPath(pathname: string): string {
  const basePath = pathname.replace(/\/+$/, "");
  return `${basePath}/lib/api/xmlrpc/v1/xmlrpc.php`;
}

export class TestLinkAPI {
  private readonly client: any;

  constructor(url: string, apiKey: string) {
    validateNonEmptyString(url, "TestLink URL");
    validateNonEmptyString(apiKey, "TestLink API key");

    const parsedUrl = new URL(url);
    this.client = new TestLink({
      host: parsedUrl.hostname,
      port: parsedUrl.port ? Number.parseInt(parsedUrl.port, 10) : undefined,
      secure: parsedUrl.protocol === "https:",
      rpcPath: normalizeRpcPath(parsedUrl.pathname),
      apiKey,
    });
  }

  private async handleAPICall<T>(apiCall: () => Promise<T>): Promise<T> {
    try {
      const result = await apiCall();
      if (Array.isArray(result) && isRecord(result[0]) && typeof result[0].code === "number") {
        const errorResponse = result[0] as TestLinkErrorResponse;
        const errorCode = errorResponse.code;
        const errorMessage = errorResponse.message || "Unknown error";

        if (errorCode === 2000) {
          throw new Error("TestLink Authentication Failed: Invalid API key");
        } else if (errorCode === 3000) {
          throw new Error(`TestLink Permission Denied: ${errorMessage}`);
        } else if (errorCode === 7000) {
          throw new Error(`TestLink Object Not Found: ${errorMessage}`);
        } else {
          throw new Error(`TestLink API Error (${errorCode}): ${errorMessage}`);
        }
      }

      return result;
    } catch (error) {
      if (isRecord(error) && error.code === "ECONNREFUSED") {
        throw new Error("Cannot connect to TestLink. Please check TESTLINK_URL.");
      }
      if (isRecord(error) && error.code === "ETIMEDOUT") {
        throw new Error("TestLink API request timed out");
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`API call failed: ${message}`);
    }
  }

  async getTestCase(testCaseId: string): Promise<unknown> {
    validateTestCaseId(testCaseId);

    if (isExternalTestCaseId(testCaseId)) {
      return this.handleAPICall(() => this.client.getTestCase({ testcaseexternalid: testCaseId }));
    }

    return this.handleAPICall(() =>
      this.client.getTestCase({
        testcaseid: parseTestCaseId(testCaseId),
      }),
    );
  }

  async updateTestCase(testCaseId: string, data: unknown): Promise<unknown> {
    validateTestCaseId(testCaseId);
    assertRecord(data, "Update data");

    const updateParams: TestLinkRecord = isExternalTestCaseId(testCaseId)
      ? { testcaseexternalid: testCaseId }
      : { testcaseid: parseTestCaseId(testCaseId) };

    const name = getOptionalString(data, "name");
    const summary = getOptionalString(data, "summary");
    const preconditions = getOptionalString(data, "preconditions");
    const steps = getOptionalArray(data, "steps");
    const importance = getOptionalNumber(data, "importance");
    const executionType = getOptionalNumber(data, "execution_type");
    const status = getOptionalNumber(data, "status");

    if (name) updateParams.testcasename = name;
    if (summary) updateParams.summary = summary;
    if (preconditions) updateParams.preconditions = preconditions;
    if (steps) updateParams.steps = steps;
    if (importance !== undefined) updateParams.importance = importance;
    if (executionType !== undefined) updateParams.executiontype = executionType;
    if (status !== undefined) updateParams.status = status;

    return this.handleAPICall(() => this.client.updateTestCase(updateParams));
  }

  async createTestCase(data: unknown): Promise<unknown> {
    assertRecord(data, "Test case data");

    const testProjectId = normalizeIntegerId(data.testprojectid, "testprojectid");
    const testSuiteId = normalizeIntegerId(data.testsuiteid, "testsuiteid");
    const name = getRequiredString(data, "name", "Test case name");
    const authorLogin = getRequiredString(data, "authorlogin", "Author login");

    const createParams = {
      testprojectid: testProjectId,
      testsuiteid: testSuiteId,
      testcasename: name,
      authorlogin: authorLogin,
      summary: getOptionalString(data, "summary") || "",
      steps: getOptionalArray(data, "steps") || [],
      importance: getOptionalNumber(data, "importance") || 2,
      executiontype: getOptionalNumber(data, "execution_type") || 1,
      status: getOptionalNumber(data, "status") || 1,
    };

    return this.handleAPICall(() => this.client.createTestCase(createParams));
  }

  async deleteTestCase(testCaseId: string): Promise<unknown> {
    validateTestCaseId(testCaseId);
    return this.updateTestCase(testCaseId, { status: 7 });
  }

  async getTestProjects(): Promise<unknown> {
    return this.handleAPICall(() => this.client.getProjects());
  }

  async getTestSuites(projectId: string): Promise<unknown> {
    const testProjectId = normalizeIntegerId(projectId, "Project ID");
    return this.handleAPICall(() =>
      this.client.getFirstLevelTestSuitesForTestProject({
        testprojectid: testProjectId,
      }),
    );
  }

  async getTestSuiteByID(suiteId: string): Promise<unknown> {
    const testSuiteId = normalizeIntegerId(suiteId, "Suite ID");
    return this.handleAPICall(() =>
      this.client.getTestSuiteByID({
        testsuiteid: testSuiteId,
      }),
    );
  }

  async getTestCasesForTestSuite(suiteId: string): Promise<unknown> {
    const testSuiteId = normalizeIntegerId(suiteId, "Suite ID");
    return this.handleAPICall(() =>
      this.client.getTestCasesForTestSuite({
        testsuiteid: testSuiteId,
        deep: true,
        details: Constants.Details.FULL,
      }),
    );
  }

  async createTestSuite(
    projectId: string,
    suiteName: string,
    details = "",
    parentId?: string,
  ): Promise<unknown> {
    const testProjectId = normalizeIntegerId(projectId, "Project ID");
    validateNonEmptyString(suiteName, "Suite name");

    const params: TestLinkRecord = {
      testprojectid: testProjectId,
      testsuitename: suiteName,
      details,
    };

    if (parentId) {
      params.parentid = normalizeIntegerId(parentId, "Parent suite ID");
    }

    return this.handleAPICall(() => this.client.createTestSuite(params));
  }

  async updateTestSuite(suiteId: string, projectId: string, data: unknown): Promise<unknown> {
    assertRecord(data, "Update data");

    const updateParams: TestLinkRecord = {
      testsuiteid: normalizeIntegerId(suiteId, "Suite ID"),
      testprojectid: normalizeIntegerId(projectId, "Project ID"),
    };

    const name = getOptionalString(data, "name");
    const details = getOptionalString(data, "details");

    if (name) updateParams.testsuitename = name;
    if (details) updateParams.details = details;

    return this.handleAPICall(() => this.client.updateTestSuite(updateParams));
  }

  async getTestPlans(projectId: string): Promise<unknown> {
    const testProjectId = normalizeIntegerId(projectId, "Project ID");
    return this.handleAPICall(() =>
      this.client.getProjectTestPlans({
        testprojectid: testProjectId,
      }),
    );
  }

  async createTestPlan(data: unknown): Promise<unknown> {
    assertRecord(data, "Test plan data");

    const projectId = getRequiredString(data, "project_id", "Project ID/prefix");
    const name = getRequiredString(data, "name", "Test plan name");

    const createParams = {
      testprojectname: projectId,
      testplanname: name,
      notes: getOptionalString(data, "notes") || "",
      active: getOptionalNumber(data, "active") ?? 1,
      is_public: getOptionalNumber(data, "is_public") ?? 1,
    };

    return this.handleAPICall(() => this.client.createTestPlan(createParams));
  }

  async deleteTestPlan(planId: string): Promise<unknown> {
    const testPlanId = normalizeIntegerId(planId, "Plan ID");
    return this.handleAPICall(() =>
      this.client.deleteTestPlan({
        testplanid: testPlanId,
      }),
    );
  }

  async getTestCasesForTestPlan(planId: string): Promise<unknown> {
    const testPlanId = normalizeIntegerId(planId, "Plan ID");
    return this.handleAPICall(() =>
      this.client.getTestCasesForTestPlan({
        testplanid: testPlanId,
      }),
    );
  }

  async addTestCaseToTestPlan(data: unknown): Promise<unknown> {
    assertRecord(data, "Assignment data");

    const testCaseId = getRequiredString(data, "testcaseid", "Test case ID");
    validateTestCaseId(testCaseId);

    const params: TestLinkRecord = {
      testprojectid: normalizeIntegerId(data.testprojectid, "testprojectid"),
      testplanid: normalizeIntegerId(data.testplanid, "testplanid"),
      version: getOptionalNumber(data, "version") || 1,
      urgency: getOptionalNumber(data, "urgency") || 2,
      overwrite: getOptionalBoolean(data, "overwrite") || false,
    };

    if (isExternalTestCaseId(testCaseId)) {
      params.testcaseexternalid = testCaseId;
    } else {
      params.testcaseid = Number.parseInt(parseTestCaseId(testCaseId), 10);
    }

    const platformId = data.platformid;
    if (platformId !== undefined) {
      params.platformid = normalizeIntegerId(platformId, "platformid");
    }

    return this.handleAPICall(() => this.client.addTestCaseToTestPlan(params));
  }

  async getBuilds(planId: string): Promise<unknown> {
    const testPlanId = normalizeIntegerId(planId, "Plan ID");
    return this.handleAPICall(() =>
      this.client.getBuildsForTestPlan({
        testplanid: testPlanId,
      }),
    );
  }

  async createBuild(data: unknown): Promise<unknown> {
    assertRecord(data, "Build data");

    const createParams = {
      testplanid: normalizeIntegerId(data.plan_id, "plan_id"),
      buildname: getRequiredString(data, "name", "Build name"),
      buildnotes: getOptionalString(data, "notes") || "",
      active: getOptionalNumber(data, "active") ?? 1,
      open: getOptionalNumber(data, "open") ?? 1,
      releasedate:
        getOptionalString(data, "release_date") || new Date().toISOString().split("T")[0],
    };

    return this.handleAPICall(() => this.client.createBuild(createParams));
  }

  async closeBuild(buildId: string): Promise<unknown> {
    const parsedBuildId = normalizeIntegerId(buildId, "Build ID");
    return this.handleAPICall(() =>
      this.client.closeBuild({
        buildid: parsedBuildId,
      }),
    );
  }

  async getTestExecutions(planId: string, buildId?: string): Promise<unknown> {
    const params: TestLinkRecord = {
      testplanid: normalizeIntegerId(planId, "Plan ID"),
    };

    if (buildId) {
      params.buildid = normalizeIntegerId(buildId, "Build ID");
    }

    return this.handleAPICall(() => this.client.getAllExecutionsResults(params));
  }

  async createTestExecution(data: unknown): Promise<unknown> {
    assertRecord(data, "Test execution data");

    const testCaseId = getRequiredString(data, "test_case_id", "Test case ID");
    validateTestCaseId(testCaseId);

    const executionParams: TestLinkRecord = {
      testplanid: normalizeIntegerId(data.plan_id, "plan_id"),
      buildid: normalizeIntegerId(data.build_id, "build_id"),
      status: getRequiredString(data, "status", "Execution status"),
      notes: getOptionalString(data, "notes") || "",
      steps: getOptionalArray(data, "steps") || [],
    };

    if (isExternalTestCaseId(testCaseId)) {
      executionParams.testcaseexternalid = testCaseId;
    } else {
      executionParams.testcaseid = parseTestCaseId(testCaseId);
    }

    const platformId = getOptionalString(data, "platform_id");
    if (platformId) {
      executionParams.platformid = platformId;
    }

    return this.handleAPICall(() => this.client.setTestCaseExecutionResult(executionParams));
  }

  async getRequirements(projectId: string): Promise<unknown> {
    const testProjectId = normalizeIntegerId(projectId, "Project ID");
    return this.handleAPICall(() =>
      this.client.getRequirements({
        testprojectid: testProjectId,
      }),
    );
  }

  async getRequirement(requirementId: string, projectId: string): Promise<unknown> {
    return this.handleAPICall(() =>
      this.client.getRequirement({
        requirementid: normalizeIntegerId(requirementId, "Requirement ID"),
        testprojectid: normalizeIntegerId(projectId, "Project ID"),
      }),
    );
  }
}
