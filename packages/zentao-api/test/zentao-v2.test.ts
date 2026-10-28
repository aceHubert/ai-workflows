import axios from "axios";
import ZentaoV2 from "../src/zentao-v2";

jest.mock("axios");

describe("ZentaoV2", () => {
  const get = jest.fn();
  const post = jest.fn();
  const put = jest.fn();
  const del = jest.fn();
  const defaults = { headers: { common: {} } };

  beforeEach(() => {
    jest.clearAllMocks();
    get.mockReset();
    post.mockReset();
    put.mockReset();
    del.mockReset();
    (axios.create as jest.Mock).mockReturnValue({
      get,
      post,
      put,
      delete: del,
      defaults,
    });
  });

  const createClient = () =>
    new ZentaoV2({
      url: "https://pro.demo.zentao.net/",
      account: "demo",
      password: "123456",
    });

  it("login 应调用 v2 登录接口并保存 token", async () => {
    post.mockResolvedValueOnce({ data: { token: "v2-token" } });

    const client = createClient();
    const token = await client.login();

    expect(token).toBe("v2-token");
    expect(post).toHaveBeenCalledWith("/api.php/v2/users/login", {
      account: "demo",
      password: "123456",
    });
    expect((defaults.headers.common as Record<string, string>).token).toBe("v2-token");
  });

  it("getBugs 应请求 v2 产品 Bug 列表", async () => {
    post.mockResolvedValueOnce({ data: { token: "v2-token" } });
    get.mockResolvedValueOnce({ data: { bugs: [{ id: 1 }] } });

    const client = createClient();
    const result = await client.getBugs(2, "unclosed", 50);

    expect(result).toStrictEqual([{ id: 1 }]);
    expect(get).toHaveBeenCalledWith(
      "/api.php/v2/products/2/bugs?browseType=unclosed&recPerPage=50&pageID=1",
    );
  });

  it("resolveBug 应调用 v2 解决接口", async () => {
    post.mockResolvedValueOnce({ data: { token: "v2-token" } });
    put.mockResolvedValueOnce({ data: { result: "success" } });

    const client = createClient();
    const result = await client.resolveBug({ id: 3, resolution: "fixed" });

    expect(result).toBe(true);
    expect(put).toHaveBeenCalledWith("/api.php/v2/bugs/3/resolve", {
      resolution: "fixed",
    });
  });

  it("runTestCase 应调用 v2 官方用例执行接口", async () => {
    post.mockResolvedValueOnce({ data: { token: "v2-token" } });
    post.mockResolvedValueOnce({ data: { result: "success" } });

    const client = createClient();
    const result = await client.runTestCase({
      id: 9,
      testtask: 3,
      version: 2,
      steps: [{ id: 1, result: "pass" }],
    });

    expect(result).toBe(true);
    expect(post).toHaveBeenNthCalledWith(
      2,
      "/api.php/v2/testcases/9/results?testtask=3&version=2",
      {
        steps: [{ id: 1, result: "pass" }],
      },
    );
  });

  it("runTestCase 缺少 steps 时应抛错", async () => {
    const client = createClient();

    await expect(client.runTestCase({ id: 9 })).rejects.toThrow(
      "执行用例失败：v2 接口要求请求体包含 steps 数组",
    );
    expect(post).not.toHaveBeenCalled();
  });

  it("getPlans 应请求 productplans 列表并提取 productplans 字段", async () => {
    post.mockResolvedValueOnce({ data: { token: "v2-token" } });
    get.mockResolvedValueOnce({ data: { productplans: [{ id: 11 }] } });

    const client = createClient();
    const result = await client.getPlans(2, 50);

    expect(result).toStrictEqual([{ id: 11 }]);
    expect(get).toHaveBeenCalledWith("/api.php/v2/products/2/productplans?recPerPage=50&pageID=1");
  });

  it("createPlan 应使用产品 productplans 端点", async () => {
    post.mockResolvedValueOnce({ data: { token: "v2-token" } });
    post.mockResolvedValueOnce({ data: { productplan: { id: 12, title: "计划" } } });

    const client = createClient();
    const result = await client.createPlan({
      product: 2,
      title: "计划",
      begin: "2026-04-10",
    });

    expect(result).toStrictEqual({ id: 12, title: "计划" });
    expect(post).toHaveBeenNthCalledWith(2, "/api.php/v2/products/2/productplans", {
      title: "计划",
      begin: "2026-04-10",
    });
  });

  it("getProductSystems 应请求 v2 产品应用列表", async () => {
    post.mockResolvedValueOnce({ data: { token: "v2-token" } });
    get.mockResolvedValueOnce({ data: { systems: [{ id: 8, name: "system" }] } });

    const client = createClient();
    const result = await client.getProductSystems(6, 20);

    expect(result).toStrictEqual([{ id: 8, name: "system" }]);
    expect(get).toHaveBeenCalledWith("/api.php/v2/products/6/systems?recPerPage=20&pageID=1");
  });

  it("getExecutionBuilds 应请求执行版本列表并传递分页参数", async () => {
    post.mockResolvedValueOnce({ data: { token: "v2-token" } });
    get.mockResolvedValueOnce({ data: { builds: [{ id: 3, name: "build1" }] } });

    const client = createClient();
    const result = await client.getExecutionBuilds(5, 20);

    expect(result).toStrictEqual([{ id: 3, name: "build1" }]);
    expect(get).toHaveBeenCalledWith("/api.php/v2/executions/5/builds?recPerPage=20&pageID=1");
  });

  it("getProjectBuilds 未传 limit 时不附加分页参数", async () => {
    post.mockResolvedValueOnce({ data: { token: "v2-token" } });
    get.mockResolvedValueOnce({ data: { builds: [{ id: 4, name: "build2" }] } });

    const client = createClient();
    const result = await client.getProjectBuilds(7);

    expect(result).toStrictEqual([{ id: 4, name: "build2" }]);
    expect(get).toHaveBeenCalledWith("/api.php/v2/projects/7/builds");
  });

  it("getBuild 应请求版本详情", async () => {
    post.mockResolvedValueOnce({ data: { token: "v2-token" } });
    get.mockResolvedValueOnce({ data: { build: { id: 3, name: "build1" } } });

    const client = createClient();
    const result = await client.getBuild(3);

    expect(result).toStrictEqual({ id: 3, name: "build1" });
    expect(get).toHaveBeenCalledWith("/api.php/v2/builds/3");
  });

  it("createBuild 应调用 v2 版本创建接口", async () => {
    post.mockResolvedValueOnce({ data: { token: "v2-token" } });
    post.mockResolvedValueOnce({ data: { build: { id: 6, name: "build3" } } });

    const client = createClient();
    const result = await client.createBuild({
      execution: 5,
      product: 2,
      name: "build3",
      builder: "demo",
    });

    expect(result).toStrictEqual({ build: { id: 6, name: "build3" } });
    expect(post).toHaveBeenNthCalledWith(2, "/api.php/v2/builds", {
      execution: 5,
      product: 2,
      name: "build3",
      builder: "demo",
    });
  });

  it("assignFeedback 应调用 v2 反馈指派接口", async () => {
    post.mockResolvedValueOnce({ data: { token: "v2-token" } });
    put.mockResolvedValueOnce({ data: { result: "success" } });

    const client = createClient();
    const result = await client.assignFeedback({
      id: 5,
      assignedTo: "admin",
    });

    expect(result).toBe(true);
    expect(put).toHaveBeenCalledWith("/api.php/v2/feedbacks/5/assign", {
      id: 5,
      assignedTo: "admin",
    });
  });
});
