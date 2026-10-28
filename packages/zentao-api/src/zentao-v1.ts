import CryptoJS from "crypto-js";
import {
  ZentaoApiResponse,
  ZentaoBugBrowseType,
  ZentaoStoryBrowseType,
  RestEntity,
  ZentaoV1Options,
} from "./types";
import Zentao from "./helpers/zentao-restful";

/**
 * 禅道 REST API v1 客户端。
 *
 * 基于禅道官方 REST API v1 文档实现，统一使用 `/api.php/v1` 作为入口。
 * 参考文档：
 * https://www.zentao.net/book/api/1397.html
 */
export default class ZentaoV1 extends Zentao<ZentaoV1Options> {
  /**
   * 登录并获取 Token。
   */
  async login(): Promise<string> {
    const response = await this.http.post<ZentaoApiResponse<{ token?: string }>>(
      "/api.php/v1/tokens",
      {
        account: this.options.account,
        password: CryptoJS.MD5(this.options.password).toString(),
      },
    );

    const token = response.data.token ?? response.data.data?.token ?? response.data.data ?? "";

    if (!token || typeof token !== "string") {
      throw new Error("禅道 REST API v1 登录失败：未返回 Token");
    }

    this.setAuthToken(token, "Token");
    return token;
  }

  protected async putAction(path: string, data?: Record<string, any>): Promise<boolean> {
    return this.postAction(path, data);
  }

  // Bug
  async getBugs(
    productID: number,
    browseType?: ZentaoBugBrowseType,
    limit?: number,
  ): Promise<RestEntity[]> {
    return this.get(`/api.php/v1/products/${productID}/bugs`, { browseType, limit }, "bugs");
  }

  async getAssignedBugs(account: string, limit: number = 100): Promise<RestEntity[]> {
    return this.get("/api.php/v1/bugs", { assignedTo: account, limit }, "bugs");
  }

  async getBug(bugID: number): Promise<RestEntity | null> {
    try {
      return await this.get(`/api.php/v1/bugs/${bugID}`);
    } catch {
      return null;
    }
  }

  async createBug(params: Record<string, any>): Promise<RestEntity> {
    const { product, ...data } = params;
    return this.post(`/api.php/v1/products/${product}/bugs`, data);
  }

  async updateBug(params: Record<string, any>): Promise<RestEntity | null> {
    const { id, ...data } = params;
    try {
      return await this.put(`/api.php/v1/bugs/${id}`, data);
    } catch {
      return null;
    }
  }

  async deleteBug(bugID: number): Promise<boolean> {
    return this.delete(`/api.php/v1/bugs/${bugID}`);
  }

  async resolveBug(params: Record<string, any>): Promise<boolean> {
    const { id, ...data } = params;
    return this.putAction(`/api.php/v1/bugs/${id}/resolve`, data);
  }

  async closeBug(params: { id: number; comment?: string }): Promise<boolean> {
    return this.putAction(`/api.php/v1/bugs/${params.id}/close`, {
      comment: params.comment,
    });
  }

  async activateBug(params: {
    id: number;
    assignedTo?: string;
    comment?: string;
  }): Promise<boolean> {
    return this.putAction(`/api.php/v1/bugs/${params.id}/activate`, {
      assignedTo: params.assignedTo,
      comment: params.comment,
    });
  }

  async confirmBug(bugID: number, assignedTo?: string): Promise<boolean> {
    return this.putAction(`/api.php/v1/bugs/${bugID}/confirm`, { assignedTo });
  }

  // Story
  async getStories(
    productID: number,
    browseType?: ZentaoStoryBrowseType,
    limit?: number,
  ): Promise<RestEntity[]> {
    return this.get(`/api.php/v1/products/${productID}/stories`, { browseType, limit }, "stories");
  }

  async getProjectStories(
    projectID: number,
    browseType?: ZentaoStoryBrowseType,
    limit?: number,
  ): Promise<RestEntity[]> {
    return this.get(`/api.php/v1/projects/${projectID}/stories`, { browseType, limit }, "stories");
  }

  async getExecutionStories(
    executionID: number,
    browseType?: ZentaoStoryBrowseType,
    limit?: number,
  ): Promise<RestEntity[]> {
    return this.get(
      `/api.php/v1/executions/${executionID}/stories`,
      { browseType, limit },
      "stories",
    );
  }

  async getStory(storyID: number): Promise<RestEntity | null> {
    try {
      return await this.get(`/api.php/v1/stories/${storyID}`);
    } catch {
      return null;
    }
  }

  async createStory(params: Record<string, any>): Promise<RestEntity> {
    const { product, ...data } = params;
    return this.post(`/api.php/v1/products/${product}/stories`, data);
  }

  async updateStory(params: Record<string, any>): Promise<RestEntity | null> {
    const { id, ...data } = params;
    try {
      return await this.put(`/api.php/v1/stories/${id}`, data);
    } catch {
      return null;
    }
  }

  async changeStory(params: Record<string, any>): Promise<RestEntity | null> {
    const { id, ...data } = params;
    try {
      return await this.post(`/api.php/v1/stories/${id}/change`, data);
    } catch {
      return null;
    }
  }

  async closeStory(params: {
    id: number;
    closedReason?: string;
    comment?: string;
  }): Promise<boolean> {
    return this.putAction(`/api.php/v1/stories/${params.id}/close`, {
      closedReason: params.closedReason,
      comment: params.comment,
    });
  }

  async activateStory(params: { id: number; comment?: string }): Promise<boolean> {
    return this.putAction(`/api.php/v1/stories/${params.id}/activate`, { comment: params.comment });
  }

  async deleteStory(storyID: number): Promise<boolean> {
    return this.delete(`/api.php/v1/stories/${storyID}`);
  }

  // Product
  async getProducts(limit: number = 100): Promise<RestEntity[]> {
    return this.get("/api.php/v1/products", { limit }, "products");
  }

  async getProduct(productID: number): Promise<RestEntity | null> {
    try {
      return await this.get(`/api.php/v1/products/${productID}`);
    } catch {
      return null;
    }
  }

  async createProduct(params: Record<string, any>): Promise<RestEntity> {
    return this.post("/api.php/v1/products", params);
  }

  async updateProduct(params: Record<string, any>): Promise<RestEntity | null> {
    const { id, ...data } = params;
    try {
      return await this.put(`/api.php/v1/products/${id}`, data);
    } catch {
      return null;
    }
  }

  async deleteProduct(productID: number): Promise<boolean> {
    return this.delete(`/api.php/v1/products/${productID}`);
  }

  // Project & execution
  async getProjects(limit: number = 100): Promise<RestEntity[]> {
    return this.get("/api.php/v1/projects", { limit }, "projects");
  }

  async getProject(projectID: number): Promise<RestEntity | null> {
    try {
      return await this.get(`/api.php/v1/projects/${projectID}`);
    } catch {
      return null;
    }
  }

  async createProject(params: Record<string, any>): Promise<RestEntity> {
    return this.post("/api.php/v1/projects", params);
  }

  async updateProject(params: Record<string, any>): Promise<RestEntity | null> {
    const { id, ...data } = params;
    try {
      return await this.put(`/api.php/v1/projects/${id}`, data);
    } catch {
      return null;
    }
  }

  async deleteProject(projectID: number): Promise<boolean> {
    return this.delete(`/api.php/v1/projects/${projectID}`);
  }

  async getExecutions(projectID: number, status?: string, limit?: number): Promise<RestEntity[]> {
    return this.get(
      `/api.php/v1/projects/${projectID}/executions`,
      { status, limit },
      "executions",
    );
  }

  async getExecution(executionID: number): Promise<RestEntity | null> {
    try {
      return await this.get(`/api.php/v1/executions/${executionID}`);
    } catch {
      return null;
    }
  }

  async createExecution(params: Record<string, any>): Promise<RestEntity> {
    const { project, ...data } = params;
    return this.post(`/api.php/v1/projects/${project}/executions`, data);
  }

  async updateExecution(params: Record<string, any>): Promise<RestEntity | null> {
    const { id, ...data } = params;
    try {
      return await this.put(`/api.php/v1/executions/${id}`, data);
    } catch {
      return null;
    }
  }

  async deleteExecution(executionID: number): Promise<boolean> {
    return this.delete(`/api.php/v1/executions/${executionID}`);
  }

  // Task
  async getTasks(executionID: number, limit: number = 100): Promise<RestEntity[]> {
    return this.get(`/api.php/v1/executions/${executionID}/tasks`, { limit }, "tasks");
  }

  async getTask(taskID: number): Promise<RestEntity | null> {
    try {
      return await this.get(`/api.php/v1/tasks/${taskID}`);
    } catch {
      return null;
    }
  }

  async createTask(params: Record<string, any>): Promise<RestEntity> {
    const { execution, ...data } = params;
    return this.post(`/api.php/v1/executions/${execution}/tasks`, data);
  }

  async updateTask(params: Record<string, any>): Promise<RestEntity | null> {
    const { id, ...data } = params;
    try {
      return await this.put(`/api.php/v1/tasks/${id}`, data);
    } catch {
      return null;
    }
  }

  async startTask(params: { id: number; comment?: string }): Promise<boolean> {
    return this.putAction(`/api.php/v1/tasks/${params.id}/start`, { comment: params.comment });
  }

  async pauseTask(params: { id: number; comment?: string }): Promise<boolean> {
    return this.putAction(`/api.php/v1/tasks/${params.id}/pause`, { comment: params.comment });
  }

  async resumeTask(params: { id: number; comment?: string }): Promise<boolean> {
    return this.putAction(`/api.php/v1/tasks/${params.id}/continue`, { comment: params.comment });
  }

  async finishTask(params: { id: number; consumed?: number; comment?: string }): Promise<boolean> {
    return this.putAction(`/api.php/v1/tasks/${params.id}/finish`, {
      consumed: params.consumed,
      comment: params.comment,
    });
  }

  async closeTask(params: { id: number; comment?: string }): Promise<boolean> {
    return this.putAction(`/api.php/v1/tasks/${params.id}/close`, { comment: params.comment });
  }

  async getTaskLogs(taskID: number, limit: number = 100): Promise<RestEntity[]> {
    return this.get(`/api.php/v1/tasks/${taskID}/tasklogs`, { limit }, "taskLogs");
  }

  async createTaskLog(params: { id: number; comment: string }): Promise<RestEntity> {
    return this.post(`/api.php/v1/tasks/${params.id}/tasklogs`, {
      comment: params.comment,
    });
  }

  // Testcase
  async getTestCases(productID: number, limit: number = 100): Promise<RestEntity[]> {
    return this.get(`/api.php/v1/products/${productID}/testcases`, { limit }, "testcases");
  }

  async getTestCase(caseID: number): Promise<RestEntity | null> {
    try {
      return await this.get(`/api.php/v1/testcases/${caseID}`);
    } catch {
      return null;
    }
  }

  async createTestCase(params: Record<string, any>): Promise<RestEntity> {
    const { product, ...data } = params;
    return this.post(`/api.php/v1/products/${product}/testcases`, data);
  }

  async updateTestCase(params: Record<string, any>): Promise<RestEntity | null> {
    const { id, ...data } = params;
    try {
      return await this.put(`/api.php/v1/testcases/${id}`, data);
    } catch {
      return null;
    }
  }

  async deleteTestCase(caseID: number): Promise<boolean> {
    return this.delete(`/api.php/v1/testcases/${caseID}`);
  }

  async runTestCase(params: Record<string, any>): Promise<boolean> {
    const { id, ...data } = params;
    return this.putAction(`/api.php/v1/testcases/${id}/run`, data);
  }

  // Testtask
  async getTestTasks(productID: number, limit: number = 100): Promise<RestEntity[]> {
    return this.get(`/api.php/v1/products/${productID}/testtasks`, { limit }, "testtasks");
  }

  async getProjectTestTasks(projectID: number, limit: number = 100): Promise<RestEntity[]> {
    return this.get(`/api.php/v1/projects/${projectID}/testtasks`, { limit }, "testtasks");
  }

  async getExecutionTestTasks(executionID: number, limit: number = 100): Promise<RestEntity[]> {
    return this.get(`/api.php/v1/executions/${executionID}/testtasks`, { limit }, "testtasks");
  }

  async getTestTask(testtaskID: number): Promise<RestEntity | null> {
    try {
      return await this.get(`/api.php/v1/testtasks/${testtaskID}`);
    } catch {
      return null;
    }
  }

  // User
  async getUsers(limit: number = 100): Promise<RestEntity[]> {
    return this.get("/api.php/v1/users", { limit }, "users");
  }

  async getUser(userID: number): Promise<RestEntity | null> {
    try {
      return await this.get(`/api.php/v1/users/${userID}`);
    } catch {
      return null;
    }
  }

  async getMyProfile(): Promise<RestEntity | null> {
    try {
      return await this.get("/api.php/v1/users/me");
    } catch {
      return null;
    }
  }

  async createUser(params: Record<string, any>): Promise<RestEntity> {
    return this.post("/api.php/v1/users", params);
  }

  async updateUser(params: Record<string, any>): Promise<RestEntity | null> {
    const { id, ...data } = params;
    try {
      return await this.put(`/api.php/v1/users/${id}`, data);
    } catch {
      return null;
    }
  }

  async deleteUser(userID: number): Promise<boolean> {
    return this.delete(`/api.php/v1/users/${userID}`);
  }

  // Program
  async getPrograms(limit: number = 100): Promise<RestEntity[]> {
    return this.get("/api.php/v1/programs", { limit }, "programs");
  }

  async getProgram(programID: number): Promise<RestEntity | null> {
    try {
      return await this.get(`/api.php/v1/programs/${programID}`);
    } catch {
      return null;
    }
  }

  async createProgram(params: Record<string, any>): Promise<RestEntity> {
    return this.post("/api.php/v1/programs", params);
  }

  async updateProgram(params: Record<string, any>): Promise<RestEntity | null> {
    const { id, ...data } = params;
    try {
      return await this.put(`/api.php/v1/programs/${id}`, data);
    } catch {
      return null;
    }
  }

  // Plan
  async getPlans(productID: number, limit: number = 100): Promise<RestEntity[]> {
    return this.get(`/api.php/v1/products/${productID}/plans`, { limit }, "plans");
  }

  async getPlan(planID: number): Promise<RestEntity | null> {
    try {
      return await this.get(`/api.php/v1/plans/${planID}`);
    } catch {
      return null;
    }
  }

  async createPlan(params: Record<string, any>): Promise<RestEntity> {
    const { product, ...data } = params;
    return this.post(`/api.php/v1/products/${product}/plans`, data);
  }

  async updatePlan(params: Record<string, any>): Promise<RestEntity | null> {
    const { id, ...data } = params;
    try {
      return await this.put(`/api.php/v1/plans/${id}`, data);
    } catch {
      return null;
    }
  }

  async linkStoriesToPlan(planID: number, stories: number[]): Promise<boolean> {
    return this.putAction(`/api.php/v1/plans/${planID}/stories`, { stories });
  }

  async unlinkStoriesFromPlan(planID: number, stories: number[]): Promise<boolean> {
    return this.putAction(`/api.php/v1/plans/${planID}/unlinkStories`, { stories });
  }

  async linkBugsToPlan(planID: number, bugs: number[]): Promise<boolean> {
    return this.putAction(`/api.php/v1/plans/${planID}/bugs`, { bugs });
  }

  async unlinkBugsFromPlan(planID: number, bugs: number[]): Promise<boolean> {
    return this.putAction(`/api.php/v1/plans/${planID}/unlinkBugs`, { bugs });
  }

  // Release & build
  async getProjectReleases(projectID: number): Promise<RestEntity[]> {
    return this.get(`/api.php/v1/projects/${projectID}/releases`, undefined, "releases");
  }

  async getProductReleases(productID: number): Promise<RestEntity[]> {
    return this.get(`/api.php/v1/products/${productID}/releases`, undefined, "releases");
  }

  async getProjectBuilds(projectID: number, limit?: number): Promise<RestEntity[]> {
    return this.get(
      `/api.php/v1/projects/${projectID}/builds`,
      limit === undefined ? undefined : { limit },
      "builds",
    );
  }

  async getExecutionBuilds(executionID: number, limit?: number): Promise<RestEntity[]> {
    return this.get(
      `/api.php/v1/executions/${executionID}/builds`,
      limit === undefined ? undefined : { limit },
      "builds",
    );
  }

  async getBuild(buildID: number): Promise<RestEntity | null> {
    try {
      return await this.get(`/api.php/v1/builds/${buildID}`);
    } catch {
      return null;
    }
  }

  async createBuild(params: Record<string, any>): Promise<RestEntity> {
    const { project, ...data } = params;
    return this.post(`/api.php/v1/projects/${project}/builds`, data);
  }

  async updateBuild(params: Record<string, any>): Promise<RestEntity | null> {
    const { id, ...data } = params;
    try {
      return await this.put(`/api.php/v1/builds/${id}`, data);
    } catch {
      return null;
    }
  }

  async deleteBuild(buildID: number): Promise<boolean> {
    return this.delete(`/api.php/v1/builds/${buildID}`);
  }

  // Feedback
  async createFeedback(params: Record<string, any>): Promise<RestEntity> {
    return this.post("/api.php/v1/feedbacks", params);
  }

  async assignFeedback(params: {
    id: number;
    assignedTo: string;
    comment?: string;
  }): Promise<boolean> {
    return this.putAction(`/api.php/v1/feedbacks/${params.id}/assign`, {
      assignedTo: params.assignedTo,
      comment: params.comment,
    });
  }

  async closeFeedback(params: { id: number; comment?: string }): Promise<boolean> {
    return this.putAction(`/api.php/v1/feedbacks/${params.id}/close`, { comment: params.comment });
  }

  async deleteFeedback(feedbackID: number): Promise<boolean> {
    return this.delete(`/api.php/v1/feedbacks/${feedbackID}`);
  }

  async updateFeedback(params: Record<string, any>): Promise<RestEntity | null> {
    const { id, ...data } = params;
    try {
      return await this.put(`/api.php/v1/feedbacks/${id}`, data);
    } catch {
      return null;
    }
  }

  async getFeedback(feedbackID: number): Promise<RestEntity | null> {
    try {
      return await this.get(`/api.php/v1/feedbacks/${feedbackID}`);
    } catch {
      return null;
    }
  }

  async getFeedbacks(productID: number, limit: number = 100): Promise<RestEntity[]> {
    return this.get(`/api.php/v1/products/${productID}/feedbacks`, { limit }, "feedbacks");
  }

  // Ticket
  async getTickets(productID: number, limit: number = 100): Promise<RestEntity[]> {
    return this.get(`/api.php/v1/products/${productID}/tickets`, { limit }, "tickets");
  }

  async getTicket(ticketID: number): Promise<RestEntity | null> {
    try {
      return await this.get(`/api.php/v1/tickets/${ticketID}`);
    } catch {
      return null;
    }
  }

  async updateTicket(params: Record<string, any>): Promise<RestEntity | null> {
    const { id, ...data } = params;
    try {
      return await this.put(`/api.php/v1/tickets/${id}`, data);
    } catch {
      return null;
    }
  }

  async createTicket(params: Record<string, any>): Promise<RestEntity> {
    const { product, ...data } = params;
    return this.post(`/api.php/v1/products/${product}/tickets`, data);
  }

  async deleteTicket(ticketID: number): Promise<boolean> {
    return this.delete(`/api.php/v1/tickets/${ticketID}`);
  }

  // Token
  async getToken(): Promise<string> {
    return this.login();
  }

  // Department
  async getDepts(limit: number = 100): Promise<RestEntity[]> {
    return this.get("/api.php/v1/depts", { limit }, "depts");
  }

  async getDept(deptID: number): Promise<RestEntity | null> {
    try {
      return await this.get(`/api.php/v1/depts/${deptID}`, undefined, "dept");
    } catch {
      return null;
    }
  }
}
