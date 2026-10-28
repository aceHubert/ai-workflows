import axios from "axios";
import ZentaoLegacy from "../src/zentao-legacy";
import { Doc, DocSpaceData, ZentaoFileReadResult } from "../src/types";

jest.mock("axios");

describe("ZentaoLegacy", () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  const mockConfigResponse = {
    version: "18.0",
    requestType: "GET",
    moduleVar: "m",
    methodVar: "f",
    viewVar: "t",
    sessionVar: "zentaosid",
    sessionName: "zentaosid",
    sessionID: "mock-session-id",
    random: 1,
    expiredTime: 1440,
    serverTime: 1712736000,
  };

  const createMockClient = () =>
    new ZentaoLegacy({
      url: "https://pro.demo.zentao.net/",
      account: "demo",
      password: "123456",
      preserveToken: false,
    });

  const mockLoginSuccessOnce = () => {
    mockedAxios.request.mockResolvedValueOnce({
      data: {
        status: "success",
        message: "success",
        user: { account: "demo" },
      },
    } as any);
  };

  const mockApiSuccessOnce = (data: any) => {
    mockedAxios.request.mockResolvedValueOnce({
      data: {
        status: "success",
        message: "success",
        data,
      },
    } as any);
  };

  const mockApiResultOnce = (
    result: any,
    status: string = "success",
    message: string = "success",
  ) => {
    mockedAxios.request.mockResolvedValueOnce({
      data: {
        status,
        message,
        result,
      },
    } as any);
  };

  const expectNthRequest = (
    nth: number,
    urlIncludes: string,
    method: "GET" | "POST" = "GET",
    dataIncludes?: string[],
  ) => {
    expect(mockedAxios.request).toHaveBeenNthCalledWith(
      nth,
      expect.objectContaining({
        method,
        url: expect.stringContaining(urlIncludes),
      }),
    );

    if (dataIncludes?.length) {
      const requestConfig = mockedAxios.request.mock.calls[nth - 1][0] as {
        data?: string;
      };
      for (const expectedPart of dataIncludes) {
        expect(requestConfig.data ?? "").toContain(expectedPart);
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.get.mockResolvedValue({
      data: mockConfigResponse,
    } as any);
  });

  it("login 应调用登录接口并写入 token", async () => {
    mockLoginSuccessOnce();

    const client = createMockClient();
    const result = await client.login();

    expect(result.status).toBe(1);
    expect(result.result).toStrictEqual({ account: "demo" });
    expect(client.token).toBe("zentaosid=mock-session-id");
    expect(mockedAxios.get).toHaveBeenCalledWith("https://pro.demo.zentao.net//?mode=getconfig");
    expectNthRequest(1, "?m=user&f=login&t=json", "POST", ["account=demo", "password=123456"]);
  });

  it("getDeptList 应返回裁剪后的部门数据", async () => {
    mockLoginSuccessOnce();
    mockApiSuccessOnce({
      title: "部门",
      deptID: 1,
      sons: [{ id: 2, name: "研发部" }],
      ignored: "x",
    });

    const client = createMockClient();
    const res = await client.getDeptList();

    expect(res.status).toBe(1);
    expect(res.result).toStrictEqual({
      title: "部门",
      deptID: 1,
      parentDepts: undefined,
      sons: [{ id: 2, name: "研发部" }],
      tree: undefined,
    });
    expectNthRequest(2, "?m=dept&f=browse&deptID=0&t=json");
  });

  it("addDept 应使用显式 mock 数据", async () => {
    mockLoginSuccessOnce();
    mockApiResultOnce("reload");

    const client = createMockClient();
    const res = await client.addDept({
      parentDeptID: 3,
      depts: ["开发部", "测试部"],
    });

    expect(res.status).toBe(1);
    expect(res.result).toBe("reload");
    expectNthRequest(2, "?m=dept&f=manageChild&t=json", "POST", [
      "parentDeptID=3",
      "depts%5B0%5D=%E5%BC%80%E5%8F%91%E9%83%A8",
      "depts%5B1%5D=%E6%B5%8B%E8%AF%95%E9%83%A8",
    ]);
  });

  it("getUserList 应返回用户列表", async () => {
    mockLoginSuccessOnce();
    mockApiSuccessOnce({
      users: [{ account: "demo", realname: "演示用户" }],
      pager: { recTotal: 1 },
    });

    const client = createMockClient();
    const res = await client.getUserList();

    expect(res.status).toBe(1);
    expect(res.result).toEqual(
      expect.objectContaining({
        title: undefined,
        users: [{ account: "demo", realname: "演示用户" }],
      }),
    );
    expectNthRequest(
      2,
      "?m=company&f=browse&param=0&type=bydept&orderBy=id&recTotal=0&recPerPage=20&pageID=1&t=json",
    );
  });

  it("getUserCreateParams 应返回创建用户所需参数", async () => {
    mockLoginSuccessOnce();
    mockApiSuccessOnce({
      title: "创建用户",
      depts: [{ id: 1, name: "研发部" }],
      groupList: [{ id: 2, name: "开发组" }],
      roleGroup: { dev: "开发" },
      rand: "r1",
    });

    const client = createMockClient();
    const res = await client.getUserCreateParams();

    expect(res.status).toBe(1);
    expect(res.result).toEqual(
      expect.objectContaining({
        title: "创建用户",
        depts: [{ id: 1, name: "研发部" }],
        groupList: [{ id: 2, name: "开发组" }],
        roleGroup: { dev: "开发" },
      }),
    );
    expectNthRequest(2, "?m=user&f=create&t=json");
  });

  it("addUser 应先获取 rand 再提交创建请求", async () => {
    mockLoginSuccessOnce();
    mockApiSuccessOnce({ rand: "abc123" });
    mockApiSuccessOnce({ id: 11, account: "u1001" });

    const client = createMockClient();
    const res = await client.addUser({
      account: "u1001",
      realname: "用户1001",
      password: "Zentao-123456",
    });

    expect(res.status).toBe(1);
    expect(res.result).toStrictEqual({ id: 11, account: "u1001" });
    expectNthRequest(2, "?m=user&f=create&t=json");
    expectNthRequest(3, "?m=user&f=create&t=json", "POST", [
      "account=u1001",
      "realname=%E7%94%A8%E6%88%B71001",
      "passwordStrength=1",
      "verifyPassword=",
    ]);
  });

  it("getProductList 应返回产品列表", async () => {
    mockLoginSuccessOnce();
    mockApiSuccessOnce({
      products: [{ id: 1, name: "产品A" }],
      pager: { recTotal: 1 },
    });

    const client = createMockClient();
    const res = await client.getProductList();

    expect(res.status).toBe(1);
    expect(res.result).toEqual(
      expect.objectContaining({
        products: [{ id: 1, name: "产品A" }],
      }),
    );
    expectNthRequest(
      2,
      "?m=product&f=all&productID=0&line=0&status=noclosed&orderBy=order_desc&recTotal=0&recPerPage=10&pageID=1&t=json",
    );
  });

  it("getProduct 应返回产品详情", async () => {
    mockLoginSuccessOnce();
    mockApiSuccessOnce({
      title: "产品详情",
      product: { id: 1, name: "产品A" },
      branches: [{ id: 0, name: "主干" }],
      dynamics: [],
    });

    const client = createMockClient();
    const res = await client.getProduct({ productID: 1 });

    expect(res.status).toBe(1);
    expect(res.result).toStrictEqual({
      title: "产品详情",
      products: undefined,
      product: { id: 1, name: "产品A" },
      branches: [{ id: 0, name: "主干" }],
      dynamics: [],
    });
    expectNthRequest(2, "?m=product&f=view&productID=1&t=json");
  });

  it("getProductCreateParams 应返回创建产品参数", async () => {
    mockLoginSuccessOnce();
    mockApiSuccessOnce({
      title: "创建产品",
      lines: [{ id: 1, name: "产品线A" }],
      groups: [{ id: 2, name: "默认组" }],
      poUsers: [{ account: "po" }],
      qdUsers: [{ account: "qa" }],
      rdUsers: [{ account: "rd" }],
    });

    const client = createMockClient();
    const res = await client.getProductCreateParams();

    expect(res.status).toBe(1);
    expect(res.result).toEqual(
      expect.objectContaining({
        title: "创建产品",
        lines: [{ id: 1, name: "产品线A" }],
        groups: [{ id: 2, name: "默认组" }],
      }),
    );
    expectNthRequest(2, "?m=product&f=create&t=json");
  });

  it("addProduct 应提交产品创建请求", async () => {
    mockLoginSuccessOnce();
    mockApiSuccessOnce({ id: 3, name: "产品B" });

    const client = createMockClient();
    const res = await client.addProduct({
      code: "pro1001",
      name: "产品B",
    });

    expect(res.status).toBe(1);
    expect(res.result).toStrictEqual({ id: 3, name: "产品B" });
    expectNthRequest(2, "?m=product&f=create&t=json", "POST", [
      "code=pro1001",
      "name=%E4%BA%A7%E5%93%81B",
    ]);
  });

  it("getProjectList 应返回项目列表", async () => {
    mockLoginSuccessOnce();
    mockApiSuccessOnce({
      projects: [{ id: 5, name: "项目A" }],
      pager: { recTotal: 1 },
    });

    const client = createMockClient();
    const res = await client.getProjectList();

    expect(res.status).toBe(1);
    expect(res.result).toEqual(
      expect.objectContaining({
        projects: [{ id: 5, name: "项目A" }],
      }),
    );
    expectNthRequest(
      2,
      "?m=project&f=all&status=undone&projectID=0&orderBy=order_desc&productID=0&recTotal=0&recPerPage=10&pageID=1&t=json",
    );
  });

  it("getProject 应返回项目详情", async () => {
    mockLoginSuccessOnce();
    mockApiSuccessOnce({
      title: "项目详情",
      project: { id: 1, name: "项目A" },
      products: [{ id: 1, name: "产品A" }],
    });

    const client = createMockClient();
    const res = await client.getProject({ projectID: 1 });

    expect(res.status).toBe(1);
    expect(res.result).toEqual(
      expect.objectContaining({
        title: "项目详情",
        project: { id: 1, name: "项目A" },
      }),
    );
    expectNthRequest(2, "?m=product&f=view&projectID=1&t=json");
  });

  it("getProjectCreateParams 应返回项目创建参数", async () => {
    mockLoginSuccessOnce();
    mockApiSuccessOnce({
      title: "创建项目",
      projects: [{ id: 1, name: "项目模板" }],
      groups: [{ id: 2, name: "默认组" }],
      allProducts: [{ id: 1, name: "产品A" }],
    });

    const client = createMockClient();
    const res = await client.getProjectCreateParams();

    expect(res.status).toBe(1);
    expect(res.result).toEqual(
      expect.objectContaining({
        title: "创建项目",
        groups: [{ id: 2, name: "默认组" }],
        allProducts: [{ id: 1, name: "产品A" }],
      }),
    );
    expectNthRequest(2, "?m=project&f=create&t=json");
  });

  it("addProject 应提交项目创建请求", async () => {
    mockLoginSuccessOnce();
    mockApiSuccessOnce({ id: 9, name: "项目B" });

    const client = createMockClient();
    const res = await client.addProject({
      code: "prj1001",
      name: "项目B",
      begin: "2021-03-01",
      end: "2022-03-01",
    });

    expect(res.status).toBe(1);
    expect(res.result).toStrictEqual({ id: 9, name: "项目B" });
    expectNthRequest(2, "?m=project&f=create&t=json", "POST", [
      "code=prj1001",
      "name=%E9%A1%B9%E7%9B%AEB",
      "status=wait",
    ]);
  });

  it("call 应动态调用 getTaskList", async () => {
    mockLoginSuccessOnce();
    mockApiSuccessOnce({
      projects: [{ id: 1, name: "项目A" }],
      tasks: [{ id: 6, name: "任务A" }],
    });

    const client = createMockClient();
    const res = await client.call("getTaskList", {
      projectID: 1,
      status: "all",
    });

    expect(res.status).toBe(1);
    expect(res.result).toStrictEqual({
      title: undefined,
      projects: [{ id: 1, name: "项目A" }],
      project: undefined,
      products: undefined,
      tasks: [{ id: 6, name: "任务A" }],
    });
    expectNthRequest(
      2,
      "?m=project&f=task&projectID=1&status=all&param=0&orderBy=&recTotal=0&recPerPage=20&pageID=1&t=json",
    );
  });

  it("getTaskList 应返回任务列表", async () => {
    mockLoginSuccessOnce();
    mockApiSuccessOnce({
      tasks: [{ id: 8, name: "任务B" }],
      projects: [{ id: 1, name: "项目A" }],
    });

    const client = createMockClient();
    const res = await client.getTaskList({ projectID: 1, status: "all" });

    expect(res.status).toBe(1);
    expect(res.result.tasks).toStrictEqual([{ id: 8, name: "任务B" }]);
    expectNthRequest(
      2,
      "?m=project&f=task&projectID=1&status=all&param=0&orderBy=&recTotal=0&recPerPage=20&pageID=1&t=json",
    );
  });

  it("getTask 应返回任务详情", async () => {
    mockLoginSuccessOnce();
    mockApiSuccessOnce({
      task: { id: 1, name: "任务详情" },
      actions: [{ id: 1, action: "opened" }],
    });

    const client = createMockClient();
    const res = await client.getTask({ taskID: 1 });

    expect(res.status).toBe(1);
    expect(res.result.task).toStrictEqual({ id: 1, name: "任务详情" });
    expectNthRequest(2, "?m=task&f=view&taskID=1&t=json");
  });

  it("getTaskCreateParams 应返回任务创建参数", async () => {
    mockLoginSuccessOnce();
    mockApiSuccessOnce({
      projects: [{ id: 1, name: "项目A" }],
      assignedToList: [{ account: "demo" }],
    });

    const client = createMockClient();
    const res = await client.getTaskCreateParams();

    expect(res.status).toBe(1);
    expect(res.result.projects).toStrictEqual([{ id: 1, name: "项目A" }]);
    expectNthRequest(2, "?m=task&f=create&t=json");
  });

  it("addTask 应提交任务创建请求", async () => {
    mockLoginSuccessOnce();
    mockApiSuccessOnce({ id: 10, name: "任务C" });

    const client = createMockClient();
    const res = await client.addTask({
      project: 1,
      name: "任务C",
    });

    expect(res.status).toBe(1);
    expect(res.result).toStrictEqual({ id: 10, name: "任务C" });
    expectNthRequest(2, "?m=task&f=create&t=json", "POST", [
      "project=1",
      "name=%E4%BB%BB%E5%8A%A1C",
      "type=devl",
    ]);
  });

  it("getTaskFinishParams 应返回任务完成参数", async () => {
    mockLoginSuccessOnce();
    mockApiSuccessOnce({
      task: { id: 1, name: "任务A" },
      assignedToList: [{ account: "demo" }],
    });

    const client = createMockClient();
    const res = await client.getTaskFinishParams({ taskID: 1 });

    expect(res.status).toBe(1);
    expect(res.result.task).toStrictEqual({ id: 1, name: "任务A" });
    expectNthRequest(2, "?m=task&f=finish&taskID=1&t=json");
  });

  it("finishTask 应提交任务完成请求", async () => {
    mockLoginSuccessOnce();
    mockApiSuccessOnce({ id: 115, status: "done" });

    const client = createMockClient();
    const res = await client.finishTask({
      taskID: 115,
      consumed: 1,
      currentConsumed: 1,
    });

    expect(res.status).toBe(1);
    expect(res.result).toStrictEqual({ id: 115, status: "done" });
    expectNthRequest(2, "?m=task&f=finish&taskID=115&t=json", "POST", [
      "consumed=1",
      "currentConsumed=1",
    ]);
  });

  it("getBugList 应返回 Bug 列表", async () => {
    mockLoginSuccessOnce();
    mockApiSuccessOnce({
      bugs: [{ id: 1, title: "BugA" }],
      pager: { recTotal: 1 },
    });

    const client = createMockClient();
    const res = await client.getBugList({ productID: 1 });

    expect(res.status).toBe(1);
    expect(res.result.bugs).toStrictEqual([{ id: 1, title: "BugA" }]);
    expectNthRequest(
      2,
      "?m=bug&f=browse&productID=1&branch=0&browseType=unclosed&param=0&orderBy=&recTotal=0&recPerPage=20&pageID=1&t=json",
    );
  });

  it("getBugCreateParams 应返回创建 Bug 参数", async () => {
    mockLoginSuccessOnce();
    mockApiSuccessOnce({
      productID: 1,
      moduleOptionMenu: [{ id: 2, name: "模块A" }],
    });

    const client = createMockClient();
    const res = await client.getBugCreateParams({ productID: 1 });

    expect(res.status).toBe(1);
    expect(res.result.productID).toBe(1);
    expectNthRequest(2, "?m=bug&f=create&productID=1&t=json");
  });

  it("addBug 应提交 Bug 创建请求", async () => {
    mockLoginSuccessOnce();
    mockApiSuccessOnce({ id: 6, title: "BugB" });

    const client = createMockClient();
    const res = await client.addBug({
      product: 1,
      title: "BugB",
    });

    expect(res.status).toBe(1);
    expect(res.result).toStrictEqual({ id: 6, title: "BugB" });
    expectNthRequest(2, "?m=bug&f=create&productID=1&t=json", "POST", ["product=1", "title=BugB"]);
  });

  it("getBugResolveParams 应返回 Bug 解决参数", async () => {
    mockLoginSuccessOnce();
    mockApiSuccessOnce({
      bug: { id: 1, title: "BugA" },
      buildOptionMenu: [{ id: "trunk", name: "主干" }],
    });

    const client = createMockClient();
    const res = await client.getBugResolveParams({ bugID: 1 });

    expect(res.status).toBe(1);
    expect(res.result.bug).toStrictEqual({ id: 1, title: "BugA" });
    expectNthRequest(2, "?m=bug&f=resolve&bugID=1&t=json");
  });

  it("resolveBug 应提交 Bug 解决请求", async () => {
    mockLoginSuccessOnce();
    mockApiSuccessOnce({ id: 6, status: "resolved" });

    const client = createMockClient();
    const res = await client.resolveBug({
      bugID: 6,
      resolution: "bydesign",
    });

    expect(res.status).toBe(1);
    expect(res.result).toStrictEqual({ id: 6, status: "resolved" });
    expectNthRequest(2, "?m=bug&f=resolve&bugID=6&t=json", "POST", [
      "resolution=bydesign",
      "resolvedBuild=trunk",
      "status=resolved",
    ]);
  });

  it("getBug 应返回 Bug 详情", async () => {
    mockLoginSuccessOnce();
    mockApiSuccessOnce({
      bug: { id: 1, title: "Bug详情" },
      actions: [{ id: 1, action: "opened" }],
    });

    const client = createMockClient();
    const res = await client.getBug({ bugID: 1 });

    expect(res.status).toBe(1);
    expect(res.result.bug).toStrictEqual({ id: 1, title: "Bug详情" });
    expectNthRequest(2, "?m=bug&f=view&bugID=1&t=json");
  });

  it("getBuildList 应按执行请求 execution/build 版本列表", async () => {
    mockLoginSuccessOnce();
    mockApiSuccessOnce({
      title: "版本列表",
      executionBuilds: { 1852: [{ id: 50, name: "build1" }] },
      ignored: "x",
    });

    const client = createMockClient();
    const res = await client.getBuildList({ executionID: 2390 });

    expect(res.status).toBe(1);
    expect(res.result.title).toBe("版本列表");
    expect(res.result.executionBuilds).toStrictEqual({ 1852: [{ id: 50, name: "build1" }] });
    expectNthRequest(2, "?m=execution&f=build&executionID=2390&t=json");
  });

  it("getBuildList 应按项目请求 project/build 版本列表", async () => {
    mockLoginSuccessOnce();
    mockApiSuccessOnce({
      title: "版本列表",
      projectBuilds: { 1852: [{ id: 50 }, { id: 49 }] },
    });

    const client = createMockClient();
    const res = await client.getBuildList({ projectID: 2045 });

    expect(res.status).toBe(1);
    expect(res.result.projectBuilds).toStrictEqual({ 1852: [{ id: 50 }, { id: 49 }] });
    expectNthRequest(2, "?m=project&f=build&projectID=2045&t=json");
  });

  it("getBuildList 缺少 executionID 和 projectID 时应抛错", async () => {
    const client = createMockClient();

    await expect(client.getBuildList({})).rejects.toThrow(
      "getBuildList 需要提供 executionID 或 projectID",
    );
  });

  it("getBuild 应返回版本详情", async () => {
    mockLoginSuccessOnce();
    mockApiSuccessOnce({
      build: { id: 3, name: "build1" },
    });

    const client = createMockClient();
    const res = await client.getBuild({ buildID: 3 });

    expect(res.status).toBe(1);
    expect(res.result.build).toStrictEqual({ id: 3, name: "build1" });
    expectNthRequest(2, "?m=build&f=view&buildID=3&t=json");
  });

  it("addBuild 应提交版本创建请求", async () => {
    mockLoginSuccessOnce();
    mockApiSuccessOnce({ id: 6 });

    const client = createMockClient();
    const res = await client.addBuild({
      executionID: 5,
      product: 2,
      name: "build2",
      builder: "demo",
      date: "2026-10-28",
    });

    expect(res.status).toBe(1);
    expectNthRequest(2, "?m=build&f=create&executionID=5&productID=2&t=json", "POST", [
      "product=2",
      "name=build2",
      "builder=demo",
      "date=2026-10-28",
    ]);
  });

  it("getDocSpaceData 应返回文档空间数据", async () => {
    mockLoginSuccessOnce();
    const remoteData: DocSpaceData = {
      libs: [{ id: 1, name: "产品文档库", type: "product" }],
    };
    mockedAxios.request.mockResolvedValueOnce({
      data: remoteData,
    } as any);

    const client = createMockClient();
    const result = await client.getDocSpaceData({
      type: "product",
      spaceID: 1,
    });

    expect(result).toStrictEqual(remoteData);
    expectNthRequest(2, "?m=doc&f=ajaxGetSpaceData&type=product&spaceID=1&picks=&t=json");
  });

  it("createDoc 在接口未直接返回文档详情时应回退查询文档详情", async () => {
    mockLoginSuccessOnce();
    mockApiResultOnce({ result: "success", id: 101 });
    mockedAxios.request.mockResolvedValueOnce({
      data: {
        id: 101,
        lib: 1,
        title: "新文档",
        type: "text",
        content: "hello",
      } satisfies Doc,
    } as any);

    const client = createMockClient();
    const result = await client.createDoc({
      lib: 1,
      title: "新文档",
      content: "hello",
    });

    expect(result).toStrictEqual({
      id: 101,
      doc: {
        id: 101,
        lib: 1,
        title: "新文档",
        type: "text",
        content: "hello",
      },
    });
    expectNthRequest(
      2,
      "?m=doc&f=create&objectType=product&objectID=1&libID=1&moduleID=0&t=json",
      "POST",
      ["title=%E6%96%B0%E6%96%87%E6%A1%A3", "content=hello"],
    );
    expectNthRequest(3, "?m=doc&f=ajaxGetDoc&docID=101&version=0&t=json");
  });

  it("readFile 应返回 Buffer 文件内容及 MIME 类型", async () => {
    mockLoginSuccessOnce();
    const raw = Uint8Array.from([72, 101, 108, 108, 111]).buffer;
    mockedAxios.request.mockResolvedValueOnce({
      data: raw,
    } as any);

    const client = createMockClient();
    const result = await client.readFile({
      fileID: 9,
      fileType: "txt",
    });

    expect(result).toStrictEqual({
      fileID: 9,
      fileType: "txt",
      mimeType: "text/plain",
      data: Buffer.from("Hello"),
      size: 5,
    } satisfies ZentaoFileReadResult);
    expect(mockedAxios.request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        method: "GET",
        url: expect.stringContaining("?m=file&f=read&fileID=9&t=txt"),
        responseType: "arraybuffer",
      }),
    );
  });

  it("editDocModule 请求异常时应返回 false", async () => {
    mockLoginSuccessOnce();
    mockedAxios.request.mockRejectedValueOnce(new Error("network"));

    const client = createMockClient();
    const result = await client.editDocModule({
      moduleID: 3,
      name: "目录",
      root: 1,
    });

    expect(result).toBe(false);
    expectNthRequest(2, "?m=doc&f=editCatalog&moduleID=3&type=doc&t=json", "POST", [
      "name=%E7%9B%AE%E5%BD%95",
      "root=1",
      "parent=0",
    ]);
  });
});
