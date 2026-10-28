import {
  ZentaoApiResponse,
  ZentaoBugBrowseType,
  ZentaoStoryBrowseType,
  RestEntity,
  ZentaoV2Options,
} from "./types";
import Zentao from "./helpers/zentao-restful";

/**
 * 禅道 REST API 2.0 客户端。
 *
 * 参考文档：
 * https://www.zentao.net/book/api/2309.html
 */
export default class ZentaoV2 extends Zentao<ZentaoV2Options> {
  async login(): Promise<string> {
    const response = await this.http.post<ZentaoApiResponse>("/api.php/v2/users/login", {
      account: this.options.account,
      password: this.options.password,
    });

    const payload = response.data ?? {};
    const token = payload.token ?? payload.data?.token ?? payload.data ?? "";

    if (!token || typeof token !== "string") {
      throw new Error("禅道 REST API 2.0 登录失败：未返回 Token");
    }

    this.setAuthToken(token, "token");
    return token;
  }

  async getToken(): Promise<string> {
    return this.login();
  }

  // Bug
  async getBugs(
    productID: number,
    browseType?: ZentaoBugBrowseType,
    limit?: number,
  ): Promise<RestEntity[]> {
    return this.get(
      `/api.php/v2/products/${productID}/bugs`,
      { browseType, recPerPage: limit, pageID: 1 },
      "bugs",
    );
  }

  async getAssignedBugs(account: string, limit: number = 100): Promise<RestEntity[]> {
    return this.get(
      "/api.php/v2/bugs",
      { assignedTo: account, recPerPage: limit, pageID: 1 },
      "bugs",
    );
  }

  async getBug(bugID: number): Promise<RestEntity | null> {
    try {
      return await this.get(`/api.php/v2/bugs/${bugID}`, undefined, "bug");
    } catch {
      return null;
    }
  }

  async createBug(params: Record<string, any>): Promise<RestEntity> {
    return this.post("/api.php/v2/bugs", params);
  }

  async updateBug(params: Record<string, any>): Promise<RestEntity | null> {
    const { id, ...data } = params;
    try {
      return await this.put(`/api.php/v2/bugs/${id}`, data);
    } catch {
      return null;
    }
  }

  async resolveBug(params: Record<string, any>): Promise<boolean> {
    const { id, ...data } = params;
    return this.putAction(`/api.php/v2/bugs/${id}/resolve`, data);
  }

  async closeBug(params: { id: number; comment?: string }): Promise<boolean> {
    return this.putAction(`/api.php/v2/bugs/${params.id}/close`, { comment: params.comment });
  }

  async activateBug(params: {
    id: number;
    comment?: string;
    assignedTo?: string;
  }): Promise<boolean> {
    return this.putAction(`/api.php/v2/bugs/${params.id}/activate`, params);
  }

  async deleteBug(bugID: number): Promise<boolean> {
    return this.delete(`/api.php/v2/bugs/${bugID}`);
  }

  // Story
  async getStories(
    productID: number,
    browseType?: ZentaoStoryBrowseType,
    limit?: number,
  ): Promise<RestEntity[]> {
    return this.get(
      `/api.php/v2/products/${productID}/stories`,
      { browseType, recPerPage: limit, pageID: 1 },
      "stories",
    );
  }

  async getStory(storyID: number): Promise<RestEntity | null> {
    try {
      return await this.get(`/api.php/v2/stories/${storyID}`, undefined, "story");
    } catch {
      return null;
    }
  }

  async createStory(params: Record<string, any>): Promise<RestEntity> {
    return this.post("/api.php/v2/stories", params);
  }

  async updateStory(params: Record<string, any>): Promise<RestEntity | null> {
    const { id, ...data } = params;
    try {
      return await this.put(`/api.php/v2/stories/${id}`, data);
    } catch {
      return null;
    }
  }

  async changeStory(params: Record<string, any>): Promise<RestEntity | null> {
    const { id, ...data } = params;
    try {
      return await this.post(`/api.php/v2/stories/${id}/change`, data);
    } catch {
      return null;
    }
  }

  async closeStory(params: {
    id: number;
    comment?: string;
    closedReason?: string;
  }): Promise<boolean> {
    return this.putAction(`/api.php/v2/stories/${params.id}/close`, params);
  }

  async activateStory(params: { id: number; comment?: string }): Promise<boolean> {
    return this.putAction(`/api.php/v2/stories/${params.id}/activate`, params);
  }

  async deleteStory(storyID: number): Promise<boolean> {
    return this.delete(`/api.php/v2/stories/${storyID}`);
  }

  // Product
  async getProducts(limit: number = 100): Promise<RestEntity[]> {
    return this.get("/api.php/v2/products", { recPerPage: limit, pageID: 1 }, "products");
  }

  async getProduct(productID: number): Promise<RestEntity | null> {
    try {
      return await this.get(`/api.php/v2/products/${productID}`, undefined, "product");
    } catch {
      return null;
    }
  }

  async createProduct(params: Record<string, any>): Promise<RestEntity> {
    return this.post("/api.php/v2/products", params);
  }

  async updateProduct(params: Record<string, any>): Promise<RestEntity | null> {
    const { id, ...data } = params;
    try {
      return await this.put(`/api.php/v2/products/${id}`, data);
    } catch {
      return null;
    }
  }

  async deleteProduct(productID: number): Promise<boolean> {
    return this.delete(`/api.php/v2/products/${productID}`);
  }

  // Project / execution
  async getProjects(limit: number = 100): Promise<RestEntity[]> {
    return this.get("/api.php/v2/projects", { recPerPage: limit, pageID: 1 }, "projects");
  }

  async getProject(projectID: number): Promise<RestEntity | null> {
    try {
      return await this.get(`/api.php/v2/projects/${projectID}`, undefined, "project");
    } catch {
      return null;
    }
  }

  async createProject(params: Record<string, any>): Promise<RestEntity> {
    return this.post("/api.php/v2/projects", params);
  }

  async updateProject(params: Record<string, any>): Promise<RestEntity | null> {
    const { id, ...data } = params;
    try {
      return await this.put(`/api.php/v2/projects/${id}`, data);
    } catch {
      return null;
    }
  }

  async deleteProject(projectID: number): Promise<boolean> {
    return this.delete(`/api.php/v2/projects/${projectID}`);
  }

  async getExecutions(projectID: number, status?: string, limit?: number): Promise<RestEntity[]> {
    return this.get(
      `/api.php/v2/projects/${projectID}/executions`,
      { status, recPerPage: limit, pageID: 1 },
      "executions",
    );
  }

  async getExecution(executionID: number): Promise<RestEntity | null> {
    try {
      return await this.get(`/api.php/v2/executions/${executionID}`, undefined, "execution");
    } catch {
      return null;
    }
  }

  async createExecution(params: Record<string, any>): Promise<RestEntity> {
    return this.post("/api.php/v2/executions", params);
  }

  async updateExecution(params: Record<string, any>): Promise<RestEntity | null> {
    const { id, ...data } = params;
    try {
      return await this.put(`/api.php/v2/executions/${id}`, data);
    } catch {
      return null;
    }
  }

  async deleteExecution(executionID: number): Promise<boolean> {
    return this.delete(`/api.php/v2/executions/${executionID}`);
  }

  // Task
  async getTasks(executionID: number, limit: number = 100): Promise<RestEntity[]> {
    return this.get(
      `/api.php/v2/executions/${executionID}/tasks`,
      { recPerPage: limit, pageID: 1 },
      "tasks",
    );
  }

  async getTask(taskID: number): Promise<RestEntity | null> {
    try {
      return await this.get(`/api.php/v2/tasks/${taskID}`, undefined, "task");
    } catch {
      return null;
    }
  }

  async createTask(params: Record<string, any>): Promise<RestEntity> {
    return this.post("/api.php/v2/tasks", params);
  }

  async updateTask(params: Record<string, any>): Promise<RestEntity | null> {
    const { id, ...data } = params;
    try {
      return await this.put(`/api.php/v2/tasks/${id}`, data);
    } catch {
      return null;
    }
  }

  async startTask(params: { id: number; comment?: string }): Promise<boolean> {
    return this.putAction(`/api.php/v2/tasks/${params.id}/start`, params);
  }

  async finishTask(params: { id: number; consumed?: number; comment?: string }): Promise<boolean> {
    return this.putAction(`/api.php/v2/tasks/${params.id}/finish`, params);
  }

  async closeTask(params: { id: number; comment?: string }): Promise<boolean> {
    return this.putAction(`/api.php/v2/tasks/${params.id}/close`, params);
  }

  async activateTask(params: { id: number; comment?: string }): Promise<boolean> {
    return this.putAction(`/api.php/v2/tasks/${params.id}/activate`, params);
  }

  async deleteTask(taskID: number): Promise<boolean> {
    return this.delete(`/api.php/v2/tasks/${taskID}`);
  }

  // Testcase / testtask
  async getTestCases(productID: number, limit: number = 100): Promise<RestEntity[]> {
    return this.get(
      `/api.php/v2/products/${productID}/testcases`,
      { recPerPage: limit, pageID: 1 },
      "testcases",
    );
  }

  async getTestCase(caseID: number): Promise<RestEntity | null> {
    try {
      return await this.get(`/api.php/v2/testcases/${caseID}`, undefined, "testcase");
    } catch {
      return null;
    }
  }

  async createTestCase(params: Record<string, any>): Promise<RestEntity> {
    return this.post("/api.php/v2/testcases", params);
  }

  async updateTestCase(params: Record<string, any>): Promise<RestEntity | null> {
    const { id, ...data } = params;
    try {
      return await this.put(`/api.php/v2/testcases/${id}`, data);
    } catch {
      return null;
    }
  }

  async deleteTestCase(caseID: number): Promise<boolean> {
    return this.delete(`/api.php/v2/testcases/${caseID}`);
  }

  async runTestCase(params: Record<string, any>): Promise<boolean> {
    const { id, testtask, version, ...data } = params;
    if (!Array.isArray(data.steps)) {
      throw new Error("执行用例失败：v2 接口要求请求体包含 steps 数组");
    }
    return this.postAction(
      this.withQuery(`/api.php/v2/testcases/${id}/results`, { testtask, version }),
      data,
    );
  }

  async getTestTasks(productID: number, limit: number = 100): Promise<RestEntity[]> {
    return this.get(
      `/api.php/v2/products/${productID}/testtasks`,
      { recPerPage: limit, pageID: 1 },
      "testtasks",
    );
  }

  async getProjectTestTasks(projectID: number, limit: number = 100): Promise<RestEntity[]> {
    return this.get(
      `/api.php/v2/projects/${projectID}/testtasks`,
      { recPerPage: limit, pageID: 1 },
      "testtasks",
    );
  }

  async getExecutionTestTasks(executionID: number, limit: number = 100): Promise<RestEntity[]> {
    return this.get(
      `/api.php/v2/executions/${executionID}/testtasks`,
      { recPerPage: limit, pageID: 1 },
      "testtasks",
    );
  }

  async getTestTask(testtaskID: number): Promise<RestEntity | null> {
    try {
      return await this.get(`/api.php/v2/testtasks/${testtaskID}`, undefined, "testtask");
    } catch {
      return null;
    }
  }

  async createTestTask(params: Record<string, any>): Promise<RestEntity> {
    return this.post("/api.php/v2/testtasks", params);
  }

  async updateTestTask(params: Record<string, any>): Promise<RestEntity | null> {
    const { id, ...data } = params;
    try {
      return await this.put(`/api.php/v2/testtasks/${id}`, data);
    } catch {
      return null;
    }
  }

  async deleteTestTask(testtaskID: number): Promise<boolean> {
    return this.delete(`/api.php/v2/testtasks/${testtaskID}`);
  }

  // User
  async getUsers(limit: number = 100): Promise<RestEntity[]> {
    return this.get("/api.php/v2/users", { recPerPage: limit, pageID: 1 }, "users");
  }

  async getUser(userID: number): Promise<RestEntity | null> {
    try {
      return await this.get(`/api.php/v2/users/${userID}`, undefined, "user");
    } catch {
      return null;
    }
  }

  async getMyProfile(): Promise<RestEntity | null> {
    try {
      return await this.get("/api.php/v2/users/me", undefined, "user");
    } catch {
      return null;
    }
  }

  async createUser(params: Record<string, any>): Promise<RestEntity> {
    return this.post("/api.php/v2/users", params);
  }

  async updateUser(params: Record<string, any>): Promise<RestEntity | null> {
    const { id, ...data } = params;
    try {
      return await this.put(`/api.php/v2/users/${id}`, data);
    } catch {
      return null;
    }
  }

  async deleteUser(userID: number): Promise<boolean> {
    return this.delete(`/api.php/v2/users/${userID}`);
  }

  // Program / plan / release / build / system
  async getPrograms(limit: number = 100): Promise<RestEntity[]> {
    return this.get("/api.php/v2/programs", { recPerPage: limit, pageID: 1 }, "programs");
  }

  async getProgram(programID: number): Promise<RestEntity | null> {
    try {
      return await this.get(`/api.php/v2/programs/${programID}`, undefined, "program");
    } catch {
      return null;
    }
  }

  async createProgram(params: Record<string, any>): Promise<RestEntity> {
    return this.post("/api.php/v2/programs", params);
  }

  async updateProgram(params: Record<string, any>): Promise<RestEntity | null> {
    const { id, ...data } = params;
    try {
      return await this.put(`/api.php/v2/programs/${id}`, data);
    } catch {
      return null;
    }
  }

  async deleteProgram(programID: number): Promise<boolean> {
    return this.delete(`/api.php/v2/programs/${programID}`);
  }

  async getPlans(productID: number, limit: number = 100): Promise<RestEntity[]> {
    return this.get(
      `/api.php/v2/products/${productID}/productplans`,
      { recPerPage: limit, pageID: 1 },
      "productplans",
    );
  }

  async getPlan(planID: number): Promise<RestEntity | null> {
    try {
      return await this.get(`/api.php/v2/productplans/${planID}`, undefined, "productplan");
    } catch {
      return null;
    }
  }

  async createPlan(params: Record<string, any>): Promise<RestEntity> {
    const { product, ...data } = params;
    return this.post(`/api.php/v2/products/${product}/productplans`, data, "productplan");
  }

  async updatePlan(params: Record<string, any>): Promise<RestEntity | null> {
    const { id, ...data } = params;
    try {
      return await this.put(`/api.php/v2/productplans/${id}`, data, "productplan");
    } catch {
      return null;
    }
  }

  async deletePlan(planID: number): Promise<boolean> {
    return this.delete(`/api.php/v2/productplans/${planID}`);
  }

  async linkStoriesToPlan(planID: number, stories: number[]): Promise<boolean> {
    return this.putAction(`/api.php/v2/productplans/${planID}/stories`, { stories });
  }

  async unlinkStoriesFromPlan(planID: number, stories: number[]): Promise<boolean> {
    return this.putAction(`/api.php/v2/productplans/${planID}/unlinkStories`, { stories });
  }

  async linkBugsToPlan(planID: number, bugs: number[]): Promise<boolean> {
    return this.putAction(`/api.php/v2/productplans/${planID}/bugs`, { bugs });
  }

  async unlinkBugsFromPlan(planID: number, bugs: number[]): Promise<boolean> {
    return this.putAction(`/api.php/v2/productplans/${planID}/unlinkBugs`, { bugs });
  }

  async getProjectReleases(projectID: number): Promise<RestEntity[]> {
    return this.get(`/api.php/v2/projects/${projectID}/releases`, undefined, "releases");
  }

  async getProductReleases(productID: number): Promise<RestEntity[]> {
    return this.get(`/api.php/v2/products/${productID}/releases`, undefined, "releases");
  }

  async createRelease(params: Record<string, any>): Promise<RestEntity> {
    return this.post("/api.php/v2/releases", params);
  }

  async updateRelease(params: Record<string, any>): Promise<RestEntity | null> {
    const { id, ...data } = params;
    try {
      return await this.put(`/api.php/v2/releases/${id}`, data);
    } catch {
      return null;
    }
  }

  async deleteRelease(releaseID: number): Promise<boolean> {
    return this.delete(`/api.php/v2/releases/${releaseID}`);
  }

  async getProjectBuilds(projectID: number, limit?: number): Promise<RestEntity[]> {
    return this.get(
      `/api.php/v2/projects/${projectID}/builds`,
      limit === undefined ? undefined : { recPerPage: limit, pageID: 1 },
      "builds",
    );
  }

  async getExecutionBuilds(executionID: number, limit?: number): Promise<RestEntity[]> {
    return this.get(
      `/api.php/v2/executions/${executionID}/builds`,
      limit === undefined ? undefined : { recPerPage: limit, pageID: 1 },
      "builds",
    );
  }

  async getBuild(buildID: number): Promise<RestEntity | null> {
    try {
      return await this.get(`/api.php/v2/builds/${buildID}`, undefined, "build");
    } catch {
      return null;
    }
  }

  async createBuild(params: Record<string, any>): Promise<RestEntity> {
    return this.post("/api.php/v2/builds", params);
  }

  async updateBuild(params: Record<string, any>): Promise<RestEntity | null> {
    const { id, ...data } = params;
    try {
      return await this.put(`/api.php/v2/builds/${id}`, data);
    } catch {
      return null;
    }
  }

  async createSystem(params: Record<string, any>): Promise<RestEntity> {
    return this.post("/api.php/v2/systems", params);
  }

  async updateSystem(params: Record<string, any>): Promise<RestEntity | null> {
    const { id, ...data } = params;
    try {
      return await this.put(`/api.php/v2/systems/${id}`, data);
    } catch {
      return null;
    }
  }

  async getProductSystems(productID: number, limit: number = 100): Promise<RestEntity[]> {
    return this.get(
      `/api.php/v2/products/${productID}/systems`,
      { recPerPage: limit, pageID: 1 },
      "systems",
    );
  }

  // Feedback / ticket
  async getFeedbacks(productID: number, limit: number = 100): Promise<RestEntity[]> {
    return this.get(
      `/api.php/v2/products/${productID}/feedbacks`,
      { recPerPage: limit, pageID: 1 },
      "feedbacks",
    );
  }

  async getFeedback(feedbackID: number): Promise<RestEntity | null> {
    try {
      return await this.get(`/api.php/v2/feedbacks/${feedbackID}`, undefined, "feedback");
    } catch {
      return null;
    }
  }

  async createFeedback(params: Record<string, any>): Promise<RestEntity> {
    return this.post("/api.php/v2/feedbacks", params);
  }

  async updateFeedback(params: Record<string, any>): Promise<RestEntity | null> {
    const { id, ...data } = params;
    try {
      return await this.put(`/api.php/v2/feedbacks/${id}`, data);
    } catch {
      return null;
    }
  }

  async assignFeedback(params: {
    id: number;
    assignedTo: string;
    comment?: string;
  }): Promise<boolean> {
    return this.putAction(`/api.php/v2/feedbacks/${params.id}/assign`, params);
  }

  async closeFeedback(params: { id: number; comment?: string }): Promise<boolean> {
    return this.putAction(`/api.php/v2/feedbacks/${params.id}/close`, params);
  }

  async deleteFeedback(feedbackID: number): Promise<boolean> {
    return this.delete(`/api.php/v2/feedbacks/${feedbackID}`);
  }

  async getTickets(productID: number, limit: number = 100): Promise<RestEntity[]> {
    return this.get(
      `/api.php/v2/products/${productID}/tickets`,
      { recPerPage: limit, pageID: 1 },
      "tickets",
    );
  }

  async getTicket(ticketID: number): Promise<RestEntity | null> {
    try {
      return await this.get(`/api.php/v2/tickets/${ticketID}`, undefined, "ticket");
    } catch {
      return null;
    }
  }

  async createTicket(params: Record<string, any>): Promise<RestEntity> {
    return this.post("/api.php/v2/tickets", params);
  }

  async updateTicket(params: Record<string, any>): Promise<RestEntity | null> {
    const { id, ...data } = params;
    try {
      return await this.put(`/api.php/v2/tickets/${id}`, data);
    } catch {
      return null;
    }
  }

  async closeTicket(params: { id: number; comment?: string }): Promise<boolean> {
    return this.putAction(`/api.php/v2/tickets/${params.id}/close`, params);
  }

  async activateTicket(params: { id: number; comment?: string }): Promise<boolean> {
    return this.putAction(`/api.php/v2/tickets/${params.id}/activate`, params);
  }

  async deleteTicket(ticketID: number): Promise<boolean> {
    return this.delete(`/api.php/v2/tickets/${ticketID}`);
  }
}
