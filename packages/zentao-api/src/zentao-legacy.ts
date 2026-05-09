import dayjs from "dayjs";
import {
  CreateDocModuleParams,
  CreateDocParams,
  Doc,
  DocSpaceData,
  EditDocModuleParams,
  EditDocParams,
  ZentaoLegacyApiResponse,
  ZentaoFileReadResult,
} from "./types";
import { md5 } from "./utils";
import Zentao from "./helpers/zentao";

/**
 * 禅道 API 请求类
 *
 * 基于禅道二次开发手册文档实现，统一使用 `/index.php?m=xxx&f=xxx` 作为入口。
 * 参考文档：
 * https://www.zentao.net/book/api/setting-369.html
 * @example
 * ```js
 * import {ZentaoApi} from 'zentao-api';
 * const zentao = new ZentaoApi({
 *     url: 'https://pro.demo.zentao.net/', account: 'demo', password: '123456'
 * });
 * // TODO: 使用 zentao 调用其他 API
 * ```
 */
export default class ZentaoLegacy extends Zentao {
  /**
   * 调用指定名称的 API
   * @param apiName API 名称
   * @param params 请求参数
   * @returns 调用结果
   * @example
   * ```js
   * import {ZentaoApi} from 'zentao-api';
   * const zentao = new ZentaoApi({
   *     url: 'https://pro.demo.zentao.net/', account: 'demo', password: '123456'
   * });
   *
   * const res = await zentao.call('getProductList', {status: 'noclosed'});
   * ```
   */
  call(
    apiName: Exclude<Extract<keyof ZentaoLegacy, string>, "call" | keyof Zentao>,
    params?: Record<string, any>,
  ): Promise<ZentaoLegacyApiResponse> {
    const func = this[apiName as keyof ZentaoLegacy] as (
      params?: Record<string, any>,
    ) => Promise<ZentaoLegacyApiResponse>;
    if (!func || typeof func !== "function") {
      throw new Error(`Api method named "${apiName}" undefined.`);
    }
    return func.call(this, params);
  }

  /**
   * 获取当前已添加部门列表数据
   *
   * @param {{deptID?: number, extraFields?: string[]}} [params] 请求参数，`params.deptID` 用于指定部门ID，`params.extraFields` 指定额外要返回的字段
   * @returns 请求结果
   * @example
   * ```js
   * import { ZentaoApi } from 'zentao-api';
   * const zentao = new ZentaoApi({
   *     url: 'https://pro.demo.zentao.net/', account: 'demo', password: '123456'
   * });
   * const result = await zentao.getDeptList({deptID: 1, extraFields: 'sons'});
   * if (result.status) {
   *     console.log('当前部门的直属下级部门列表', result.result.sons);
   * }
   * ```
   */
  getDeptList(params?: {
    deptID?: number;
    extraFields?: string[];
  }): Promise<ZentaoLegacyApiResponse> {
    return this.module("dept", "browse")
      .withParams([["deptID", params?.deptID ?? 0]])
      .filterFields("title", "deptID", "parentDepts", "sons", "tree", params?.extraFields)
      .get();
  }

  /**
   * 批量添加部门
   *
   * @param params 请求参数，其中 `params.parentDeptID` 为所属上级部门ID，`params.depts` 为新增部门名称列表
   * @returns 请求结果
   * @example
   * import { ZentaoApi } from 'zentao-api';
   * const zentao = new ZentaoApi({
   *     url: 'https://pro.demo.zentao.net/', account: 'demo', password: '123456'
   * });
   *
   * // 在部门 ID 为 3 的部门下添加两个子部门：开发部、测试部
   * const result = await zentao.addDept({parentDeptID: 3, depts: ['开发部', '测试部']});
   * if (result.status) {
   *     console.log('部门添加成功');
   * }
   */
  async addDept(params: {
    parentDeptID?: number;
    depts: string[];
  }): Promise<ZentaoLegacyApiResponse> {
    const res = await this.request("dept", "manageChild", {
      name: "addDept",
      method: "POST",
      data: { parentDeptID: params.parentDeptID ?? 0, depts: params.depts },
      resultConvertor: (_remoteData, result) => {
        if (!result.status && result.result.includes("reload")) {
          result.status = 1;
          result.msg = "success";
          result.result = null;
        }
        return result;
      },
    });
    return res;
  }

  /**
   * 获取用户列表，可以指定用户所属部门
   *
   * @param {{deptID?: number, orderBy?: string, recTotal?: number, recPerPage?: number, pageID?: number, extraFields?: string[]}} [params] 请求参数，`params.deptID` 用于指定部门ID（如果不指定则获取所有用户数据），`params.extraFields` 指定额外要返回的字段，其他字段指定分页信息
   * @returns 请求结果
   * @example
   * ```js
   * import { ZentaoApi } from 'zentao-api';
   * const zentao = new ZentaoApi({
   *     url: 'https://pro.demo.zentao.net/', account: 'demo', password: '123456'
   * });
   * const result = await zentao.getUserList({deptID: 1});
   * if (result.status) {
   *     console.log('当前部门的用户列表数据为', result.result.users);
   * }
   * ```
   */
  async getUserList(params?: {
    deptID?: number;
    orderBy?: string;
    recTotal?: number;
    recPerPage?: number;
    pageID?: number;
    extraFields?: string[];
  }): Promise<ZentaoLegacyApiResponse> {
    const res = await this.request("company", "browse", {
      name: "getUserList",
      params: [
        ["param", params?.deptID ?? 0],
        ["type", "bydept"],
        ["orderBy", params?.orderBy ?? "id"],
        ["recTotal", params?.recTotal ?? 0],
        ["recPerPage", params?.recPerPage ?? 20],
        ["pageID", params?.pageID ?? 1],
      ],
      fields: ["title", "users", ...(params?.extraFields ?? [])],
    });
    return res;
  }

  /**
   * 添加用户时如果需要为新用 户分配部门、职位、权限，请求该方法即可返回相关可用数据
   *
   * @param {{extraFields?: string[]}} [params] 请求参数，`params.extraFields` 指定额外要返回的字段
   * @returns 请求结果
   * @example
   * ```js
   * import { ZentaoApi } from 'zentao-api';
   * const zentao = new ZentaoApi({
   *     url: 'https://pro.demo.zentao.net/', account: 'demo', password: '123456'
   * });
   * const result = await zentao.getUserCreateParams();
   * ```
   */
  async getUserCreateParams(params?: { extraFields?: string[] }): Promise<ZentaoLegacyApiResponse> {
    const res = await this.request("user", "create", {
      name: "getUserCreateParams",
      fields: ["title", "depts", "groupList", "roleGroup", ...(params?.extraFields ?? [])],
    });
    return res;
  }

  /**
   * 向系统添加一个用户
   * @param params 用户信息参数
   * @returns
   * @example
   * ```js
   * import { ZentaoApi } from 'zentao-api';
   * const zentao = new ZentaoApi({
   *     url: 'https://pro.demo.zentao.net/', account: 'demo', password: '123456'
   * });
   * const result = await zentao.addUser({
   *     account:  'Jack10',         // 必填参数 用户名
   *     password: '123456',         // 必填参数 密码
   *     realname: 'Jack10',         // 必填参数 真实姓名
   *     dept:     1,                // 选填参数 所属部门【部门ID】
   *     join:     '2019-11-11',     // 选填参数 入职日期【格式：2019-11-19】
   *     role:     'dev',            // 选填参数 职位【权限标识，例如：'dev','qd'】
   *     group:    2,                // 选填参数 权限分组【分组ID】
   *     email:    'jack@gmail.com', // 选填参数 邮箱
   *     commiter: 'Jack10',         // 选填参数 源代码账号
   *     gender:   'm',              // 选填参数 性别【m:男|f:女】
   * });
   * if (result.status) {
   *     console.log('用户创建成功');
   * }
   * ```
   */
  async addUser(params: {
    account: string;
    password: string;
    realname: string;
    dept?: number;
    join?: string;
    role?: string;
    group?: number;
    email?: string;
    commiter?: string;
    gender?: "m" | "f";
  }): Promise<ZentaoLegacyApiResponse> {
    // Get the random number required for encryption.
    const paramsRes = await this.getUserCreateParams({
      extraFields: ["rand"],
    });
    const rand = paramsRes.result.rand;

    const password = md5(`${params.password}${rand}`);
    const data: Record<string, any> = {
      dept: params.dept ?? 0,
      account: params.account,
      password1: password,
      password2: password,
      realname: params.realname,
      join: params.join,
      role: params.role,
      group: params.group,
      email: params.email,
      commiter: params.commiter,
      passwordStrength: 1,
      verifyPassword: md5(`${md5(this.password)}${rand}`),
    };
    if (params.gender) {
      data.gender = params.gender;
    }
    const res = await this.request("user", "create", {
      name: "addUser",
      method: "POST",
      data,
      resultConvertor: (_remoteData, result) => {
        if (!result.status && result.result.includes("reload")) {
          result.status = 1;
          result.msg = "success";
          result.result = null;
        }
        return result;
      },
    });
    return res;
  }

  /**
   * 获取产品列表
   * @param {{productID?: number, line?: number, status?: 'noclosed'|'closed'|'involved'|'all', orderBy?: string, recTotal?: number, recPerPage?: number, pageID?: number, extraFields?: string[]}} [params] 请求参数，`params.productID` 用于指定所属产品，`params.status` 用于指定产品状态，`params.extraFields` 指定额外要返回的字段，其他字段指定分页信息
   * @returns 请求结果
   * @example
   * ```js
   * import { ZentaoApi } from 'zentao-api';
   * const zentao = new ZentaoApi({
   *     url: 'https://pro.demo.zentao.net/', account: 'demo', password: '123456'
   * });
   * const result = await zentao.getProductList({status: 'noclosed'});
   * if (result.status) {
   *     console.log('产品列表', result.result.products);
   * }
   * ```
   */
  async getProductList(params?: {
    productID?: number;
    line?: number;
    status?: "noclosed" | "closed" | "involved" | "all";
    orderBy?: string;
    recTotal?: number;
    recPerPage?: number;
    pageID?: number;
    extraFields?: string[];
  }): Promise<ZentaoLegacyApiResponse> {
    const res = await this.request("product", "all", {
      name: "getProductList",
      params: [
        ["productID", params?.productID ?? 0],
        ["line", params?.line ?? 0],
        ["status", params?.status ?? "noclosed"],
        ["orderBy", params?.orderBy ?? "order_desc"],
        ["recTotal", params?.recTotal ?? 0],
        ["recPerPage", params?.recPerPage ?? 10],
        ["pageID", params?.pageID ?? 1],
      ],
      fields: ["title", "products", "productStats", ...(params?.extraFields ?? [])],
    });
    return res;
  }

  /**
   * 获取指定的产品信息
   * @param {{productID: number, extraFields?: string[]}} [params] 请求参数，`params.productID` 用于指定产品 ID，params.extraFields` 指定额外要返回的字段，其他字段指定分页信息
   * @returns 请求结果
   * @example
   * ```js
   * import { ZentaoApi } from 'zentao-api';
   * const zentao = new ZentaoApi({
   *     url: 'https://pro.demo.zentao.net/', account: 'demo', password: '123456'
   * });
   * const result = await zentao.getProduct({productID: 1});
   * if (result.status) {
   *     console.log('产品信息为', result.result.product);
   * }
   * ```
   */
  async getProduct(params: {
    productID: number;
    extraFields?: string[];
  }): Promise<ZentaoLegacyApiResponse> {
    const res = await this.request("product", "view", {
      name: "getProduct",
      params: [["productID", params.productID]],
      fields: [
        "title",
        "products",
        "product",
        "branches",
        "dynamics",
        ...(params?.extraFields ?? []),
      ],
    });
    return res;
  }

  /**
   * 获取添加产品时所需要一些数据，例如产品线数据列表、产品负责人数据列表等数据，添加产品时，可以为其绑定这些信息
   *
   * @param {{extraFields?: string[]}} [params] 请求参数，`params.extraFields` 指定额外要返回的字段
   * @returns 请求结果
   * @example
   * ```js
   * import { ZentaoApi } from 'zentao-api';
   * const zentao = new ZentaoApi({
   *     url: 'https://pro.demo.zentao.net/', account: 'demo', password: '123456'
   * });
   * const result = await zentao.getProductCreateParams();
   * ```
   */
  async getProductCreateParams(params?: {
    extraFields?: string[];
  }): Promise<ZentaoLegacyApiResponse> {
    const res = await this.request("product", "create", {
      name: "getProductCreateParams",
      fields: [
        "title",
        "products",
        "lines",
        "poUsers",
        "qdUsers",
        "rdUsers",
        "groups",
        ...(params?.extraFields ?? []),
      ],
    });
    return res;
  }

  /**
   * 向系统添加一个产品，添加新产品时可以指定相关负责人，设置产品类型和访问权限。注意：假如参数 acl = custom ，可以额外传递参数，例如： 'whitelist' => array(1, 2) ，添加白名单为权限分组列表中 ID
   * @param params 产品信息参数
   * @returns
   * @example
   * ```js
   * import { ZentaoApi } from 'zentao-api';
   * const zentao = new ZentaoApi({
   *     url: 'https://pro.demo.zentao.net/', account: 'demo', password: '123456'
   * });
   * const result = await zentao.addProduct({
   *     name: '登月行动',         // 必填参数 产品名称
   *     code: 'to_the_moon',    // 必填参数 产品代号
   *     line: 0,                // 选填参数 产品线ID
   *     PO: 'admin',            // 选填参数 产品负责人账号
   *     QD: 'jim',              // 选填参数 测试负责人账号
   *     RD: 'lilei',            // 选填参数 发布负责人账号
   *     type: normal',          // 选填参数 产品类型【normal正常|branch多分支|platform多平台】
   *     desc: '登月行动，刻不容缓', // 选填参数 产品描述
   *     acl: 'custom',          // 选填参数 访问控制【open默认|private私有|custom白名单】
   *     whitelist: [],          // 选填参数 白名单，权限分组列表中 ID
   * });
   * if (result.status) {
   *     console.log('产品创建成功');
   * }
   * ```
   */
  async addProduct(params: {
    name: string;
    code: string;
    line?: number;
    PO?: string;
    QD?: string;
    RD?: string;
    type?: "normal" | "branch" | "platform";
    desc?: string;
    acl?: "open" | "custom" | "private";
    whitelist?: number[];
  }): Promise<ZentaoLegacyApiResponse> {
    const res = await this.request("product", "create", {
      name: "addProduct",
      method: "POST",
      data: {
        name: params.name,
        code: params.code,
        line: params.line ?? 0,
        PO: params.PO,
        QD: params.QD,
        RD: params.RD,
        type: params.type ?? "normal",
        desc: params.desc,
        acl: params.acl ?? "open",
        whitelist: params.whitelist,
      },
    });
    return res;
  }

  /**
   * 获取项目列表
   * @param {{status?: 'undone'|'wait'|'doing'|'suspended'|'closed'|'all', projectID?: number, orderBy?: string, productID?: number, recTotal?: number, recPerPage?: number, pageID?: number, extraFields?: string[]}} [params] 请求参数，`params.productID` 用于指定所属产品，`params.status` 用于指定项目状态，`params.extraFields` 指定额外要返回的字段，其他字段指定分页信息
   * @returns 请求结果
   * @example
   * ```js
   * import { ZentaoApi } from 'zentao-api';
   * const zentao = new ZentaoApi({
   *     url: 'https://pro.demo.zentao.net/', account: 'demo', password: '123456'
   * });
   * const result = await zentao.getProjectList({status: 'undone'});
   * if (result.status) {
   *     console.log('项目列表', result.result.products);
   * }
   * ```
   */
  async getProjectList(params?: {
    status?: "undone" | "wait" | "doing" | "suspended" | "closed" | "all";
    projectID?: number;
    orderBy?: string;
    productID?: number;
    recTotal?: number;
    recPerPage?: number;
    pageID?: number;
    extraFields?: string[];
  }): Promise<ZentaoLegacyApiResponse> {
    const res = await this.request("project", "all", {
      name: "getProjectList",
      params: [
        ["status", params?.status ?? "undone"],
        ["projectID", params?.projectID ?? 0],
        ["orderBy", params?.orderBy ?? "order_desc"],
        ["productID", params?.productID ?? 0],
        ["recTotal", params?.recTotal ?? 0],
        ["recPerPage", params?.recPerPage ?? 10],
        ["pageID", params?.pageID ?? 1],
      ],
      fields: [
        "title",
        "projects",
        "projectStats",
        "teamMembers",
        "users",
        ...(params?.extraFields ?? []),
      ],
    });
    return res;
  }

  /**
   * 获取指定的项目信息
   * @param {{projectID: number, extraFields?: string[]}} [params] 请求参数，`params.projectID` 用于指定项目 ID，params.extraFields` 指定额外要返回的字段，其他字段指定分页信息
   * @returns 请求结果
   * @example
   * ```js
   * import { ZentaoApi } from 'zentao-api';
   * const zentao = new ZentaoApi({
   *     url: 'https://pro.demo.zentao.net/', account: 'demo', password: '123456'
   * });
   * const result = await zentao.getProject({projectID: 1});
   * if (result.status) {
   *     console.log('项目信息为', result.result.project);
   * }
   * ```
   */
  async getProject(params: {
    projectID: number;
    extraFields?: string[];
  }): Promise<ZentaoLegacyApiResponse> {
    const res = await this.request("product", "view", {
      name: "getProduct",
      params: [["projectID", params.projectID]],
      fields: [
        "title",
        "products",
        "project",
        "teamMembers",
        "dynamics",
        ...(params?.extraFields ?? []),
      ],
    });
    return res;
  }

  /**
   * 获取添加项目时所需要一些数据，例如获取正常状态产品列表信息，用于添加项目时为其绑定产品，从而用于项目与产品需求关联。还可获取权限分组列表，用于项目绑定访问控制权限
   *
   * @param {{extraFields?: string[]}} [params] 请求参数，`params.extraFields` 指定额外要返回的字段
   * @returns 请求结果
   * @example
   * ```js
   * import { ZentaoApi } from 'zentao-api';
   * const zentao = new ZentaoApi({
   *     url: 'https://pro.demo.zentao.net/', account: 'demo', password: '123456'
   * });
   * const result = await zentao.getProjectCreateParams();
   * ```
   */
  async getProjectCreateParams(params?: {
    extraFields?: string[];
  }): Promise<ZentaoLegacyApiResponse> {
    const res = await this.request("project", "create", {
      name: "getProjectCreateParams",
      fields: ["title", "projects", "groups", "allProducts", ...(params?.extraFields ?? [])],
    });
    return res;
  }

  /**
   * 向系统添加一个项目，添加新项目时可以指定相关负责人，设置产品类型和访问权限
   * @param params 项目信息参数
   * @returns
   * @example
   * ```js
   * import { ZentaoApi } from 'zentao-api';
   * const zentao = new ZentaoApi({
   *     url: 'https://pro.demo.zentao.net/', account: 'demo', password: '123456'
   * });
   * const result = await zentao.addProject({
   *     name:         '禅道项目管理开发',       // 必填参数 项目名称
   *     code:         'zentao',              // 必填参数 项目代号
   *     begin:        '2020-01-01',          // 必填参数 起始日期【时间格式：2019-11-20】
   *     end:          '2020-06-06',          // 必填参数 结束日期【时间格式：2019-11-20】
   *     days:         '100',                 // 选填参数 可用工作日
   *     team:         '禅道开发团队',           // 选填参数 团队名称
   *     type:         'sprint',               // 选填参数 项目类型【sprint短期项目|waterfall长期项目|ops运维项目】
   *     desc:         '专业的研发项目管理软件。', // 选填参数 项目描述
   *     acl:          'custom',               // 选填参数 访问控制【open默认设置|private私有项目|custom白名单】
   *     whitelist:    [1, 2],                 // 选填参数 白名单中的权限分组 ID
   *     products:     [4, 5],                 // 选填参数 关联产品 ID
   *     plans:        [5, 6]                  // 选填参数 关联产品 ID 所属计划 ID
   * });
   * if (result.status) {
   *     console.log('项目创建成功');
   * }
   * ```
   */
  async addProject(params: {
    name: string;
    code: string;
    begin: string;
    end: string;
    days?: number;
    team?: string;
    type?: "sprint" | "waterfall" | "ops";
    desc?: string;
    acl?: "open" | "custom" | "private";
    whitelist?: number[];
    products?: number[];
    plans?: number[];
  }): Promise<ZentaoLegacyApiResponse> {
    const res = await this.request("project", "create", {
      name: "addProject",
      method: "POST",
      data: {
        name: params.name,
        code: params.code,
        begin: params.begin,
        end: params.end,
        days: params.days ?? 0,
        team: params.team,
        type: params.type ?? "sprint",
        desc: params.desc,
        acl: params.acl ?? "open",
        whitelist: params.whitelist,
        products: params.products ?? [0],
        plans: params.plans ?? [0],
        status: "wait",
      },
    });
    return res;
  }

  /**
   * 获取项目任务列表
   * @param {{projectID: number, status?: 'unclosed'|'assignedtome'|'myinvolved'|'delayed'|'needconfirm'|'wait'|'doing'|'undone'|'finishedbyme'|'done'|'closed'|'cancel'|'all', param?: number, orderBy?: string, recTotal?: number, recPerPage?: number, pageID?: number, extraFields?: string[]}} [params] 请求参数，`params.projectID` 用于指定所属项目，`params.status` 用于指定任务状态，`params.extraFields` 指定额外要返回的字段，其他字段指定分页信息
   * @returns 请求结果
   * @example
   * ```js
   * import { ZentaoApi } from 'zentao-api';
   * const zentao = new ZentaoApi({
   *     url: 'https://pro.demo.zentao.net/', account: 'demo', password: '123456'
   * });
   * const result = await zentao.getProjectList({projectID: 1, status: 'undone'});
   * if (result.status) {
   *     console.log('任务列表', result.result.tasks);
   * }
   * ```
   */
  async getTaskList(params: {
    projectID: number;
    status?:
      | "unclosed"
      | "assignedtome"
      | "myinvolved"
      | "delayed"
      | "needconfirm"
      | "wait"
      | "doing"
      | "undone"
      | "finishedbyme"
      | "done"
      | "closed"
      | "cancel"
      | "all";
    param?: number;
    orderBy?: string;
    recTotal?: number;
    recPerPage?: number;
    pageID?: number;
    extraFields?: string[];
  }): Promise<ZentaoLegacyApiResponse> {
    const res = await this.request("project", "task", {
      name: "getTaskList",
      params: [
        ["projectID", params.projectID],
        ["status", params?.status ?? "unclosed"],
        ["param", params?.param ?? 0],
        ["orderBy", params?.orderBy ?? ""],
        ["recTotal", params?.recTotal ?? 0],
        ["recPerPage", params?.recPerPage ?? 20],
        ["pageID", params?.pageID ?? 1],
      ],
      fields: ["title", "projects", "project", "products", "tasks", ...(params?.extraFields ?? [])],
    });
    return res;
  }

  /**
   * 获取指定的任务信息
   * @param {{taskID: number, extraFields?: string[]}} [params] 请求参数，`params.taskID` 用于指定任务 ID，params.extraFields` 指定额外要返回的字段，其他字段指定分页信息
   * @returns 请求结果
   * @example
   * ```js
   * import { ZentaoApi } from 'zentao-api';
   * const zentao = new ZentaoApi({
   *     url: 'https://pro.demo.zentao.net/', account: 'demo', password: '123456'
   * });
   * const result = await zentao.getTask({taskID: 1});
   * if (result.status) {
   *     console.log('任务信息为', result.result.products);
   * }
   * ```
   */
  async getTask(params: {
    taskID: number;
    extraFields?: string[];
  }): Promise<ZentaoLegacyApiResponse> {
    const res = await this.request("task", "view", {
      name: "getProduct",
      params: [["taskID", params.taskID]],
      fields: ["title", "task", "project", "product", ...(params?.extraFields ?? [])],
    });
    return res;
  }

  /**
   * 添加单个任务时，可以先通 过此方法，获取添加任务中所需要的相关信息
   *
   * @param {{extraFields?: string[]}} [params] 请求参数，`params.extraFields` 指定额外要返回的字段
   * @returns 请求结果
   * @example
   * ```js
   * import { ZentaoApi } from 'zentao-api';
   * const zentao = new ZentaoApi({
   *     url: 'https://pro.demo.zentao.net/', account: 'demo', password: '123456'
   * });
   * const result = await zentao.getTaskCreateParams();
   * ```
   */
  async getTaskCreateParams(params?: { extraFields?: string[] }): Promise<ZentaoLegacyApiResponse> {
    const res = await this.request("task", "create", {
      name: "getTaskCreateParams",
      fields: [
        "title",
        "projects",
        "users",
        "stories",
        "moduleOptionMenu",
        "project",
        ...(params?.extraFields ?? []),
      ],
    });
    return res;
  }

  /**
   * 向系统添加一个任务
   * @param params 任务信息参数
   * @returns
   * @example
   * ```js
   * import { ZentaoApi } from 'zentao-api';
   * const zentao = new ZentaoApi({
   *     url: 'https://pro.demo.zentao.net/', account: 'demo', password: '123456'
   * });
   * const result = await zentao.addTask({
   *     project:        1,           // 必填参数 所属项目ID
   *     type:           'ui',        // 必填参数 任务类型【design设计|devel开发|test测试|study研究|discuss讨论|ui界面|affair事务|misc其他】
   *     module:         0,           // 选填参数 所属模块ID
   *     assignedTo:     'lisa',      // 选填参数 指派用户，示例：'assignedTo' => array('zhangsan')
   *     color:          '',          // 选填参数 任务颜色【示例：#ff4e3e】
   *     name:           '设计界面',    // 必填参数 任务名称
   *     pri:            2,           // 选填参数 优先级【分为 1、2、3、4级】
   *     estimate:       1,           // 选填参数 预计时间【小时】
   *     desc:           '设计界面描述', // 选填参数 任务描述
   *     estStarted:     '2021-01-11', // 选填参数 日程规划开始【格式：2019-11-20】
   *     deadline:       '2021-11-12', // 选填参数 日程规划结束【格式：2019-11-28】
   *     mailto:         'lisa'        // 选填参数 抄送用户，示例：'mailto' => array('lisi', 'niuqi', 'zhangsan'), 代表同时抄送给 3 个用户。
   * });
   * if (result.status) {
   *     console.log('任务创建成功');
   * }
   * ```
   */
  async addTask(params: {
    project: number;
    name: string;
    type?: "design" | "devel" | "test" | "study" | "discuss" | "ui" | "affair" | "misc";
    module?: number;
    color?: string;
    pri?: number;
    estimate?: number;
    desc?: string;
    estStarted?: string;
    deadline?: string;
    assignedTo?: string[];
    mailto?: string[];
  }): Promise<ZentaoLegacyApiResponse> {
    const res = await this.request("task", "create", {
      name: "addTask",
      method: "POST",
      data: {
        project: params.project,
        type: params.type ?? "devl",
        name: params.name,
        module: params.module ?? 0,
        color: params.color,
        pri: params.pri ?? 3,
        estimate: params.estimate ?? 0,
        desc: params.desc,
        estStarted: params.estStarted,
        deadline: params.deadline,
        assignedTo: params.assignedTo ?? [""],
        mailto: params.mailto ?? [""],
      },
    });
    return res;
  }

  /**
   * 获取该任务的所属项目详情、任务详情、任务操作记录，同时获取用于指派完成的用户列表
   *
   * @param {{extraFields?: string[]}} [params] 请求参数，`params.extraFields` 指定额外要返回的字段
   * @returns 请求结果
   * @example
   * ```js
   * import { ZentaoApi } from 'zentao-api';
   * const zentao = new ZentaoApi({
   *     url: 'https://pro.demo.zentao.net/', account: 'demo', password: '123456'
   * });
   * const result = await zentao.getTaskFinishParams({taskID: 1});
   * ```
   */
  async getTaskFinishParams(params: {
    taskID: number;
    extraFields?: string[];
  }): Promise<ZentaoLegacyApiResponse> {
    const res = await this.request("task", "finish", {
      name: "getTaskFinishParams",
      params: [["taskID", params.taskID]],
      fields: ["title", "users", "task", "project", "actions", ...(params?.extraFields ?? [])],
    });
    return res;
  }

  /**
   * 完成一个任务
   * @param params 任务信息参数
   * @returns
   * @example
   * ```js
   * import { ZentaoApi } from 'zentao-api';
   * const zentao = new ZentaoApi({
   *     url: 'https://pro.demo.zentao.net/', account: 'demo', password: '123456'
   * });
   * const result = await zentao.finishTask({taskID: 1, currentConsumed: 1});
   * if (result.status) {
   *     console.log('任务完成');
   * }
   * ```
   */
  async finishTask(params: {
    taskID: number;
    currentConsumed: number;
    consumed?: number;
    assignedTo?: string;
    finishedDate?: string;
    comment?: string;
  }): Promise<ZentaoLegacyApiResponse> {
    let consumed = params.consumed;
    if (consumed === undefined) {
      const paramsRes = await this.getTaskFinishParams({
        taskID: params.taskID,
        extraFields: ["task"],
      });
      consumed = paramsRes.result.task.consumed;
    }

    const res = await this.request("task", "finish", {
      name: "finishTask",
      method: "POST",
      params: [["taskID", params.taskID]],
      data: {
        currentConsumed: params.currentConsumed,
        consumed,
        assignedTo: params.assignedTo,
        finishedDate: params.finishedDate ?? dayjs().format("YYYY-MM-DD"),
        comment: params.comment,
        status: "done",
      },
    });
    return res;
  }

  /**
   * 获取产品 Bug 列表
   * @param {{productID: number, branch?: number, browseType?: 'all'|'unclosed'|'openedbyme'|'assigntome'|'resolvedbyme'|'toclosed'|'unresolved'|'unconfirmed'|'longlifebugs'|'postponedbugs'|'overduebugs'|'needconfirm', param?: number, orderBy?: string, recTotal?: number, recPerPage?: number, pageID?: number, extraFields?: string[]}} [params] 请求参数，`params.productID` 用于指定所属产品，`params.browseType` 用于指定 bug 列表类型，`params.extraFields` 指定额外要返回的字段，其他字段指定分页信息
   * @returns 请求结果
   * @example
   * ```js
   * import { ZentaoApi } from 'zentao-api';
   * const zentao = new ZentaoApi({
   *     url: 'https://pro.demo.zentao.net/', account: 'demo', password: '123456'
   * });
   * const result = await zentao.getProjectList({projectID: 1, status: 'undone'});
   * if (result.status) {
   *     console.log('Bug列表', result.result.bugs);
   * }
   * ```
   */
  async getBugList(params: {
    productID: number;
    branch?: number;
    browseType?:
      | "all"
      | "unclosed"
      | "openedbyme"
      | "assigntome"
      | "resolvedbyme"
      | "toclosed"
      | "unresolved"
      | "unconfirmed"
      | "longlifebugs"
      | "postponedbugs"
      | "overduebugs"
      | "needconfirm";
    param?: number;
    orderBy?: string;
    recTotal?: number;
    recPerPage?: number;
    pageID?: number;
    extraFields?: string[];
  }): Promise<ZentaoLegacyApiResponse> {
    const res = await this.request("bug", "browse", {
      name: "getTaskList",
      params: [
        ["productID", params.productID],
        ["branch", params?.branch ?? 0],
        ["browseType", params?.browseType ?? "unclosed"],
        ["param", params?.param ?? 0],
        ["orderBy", params?.orderBy ?? ""],
        ["recTotal", params?.recTotal ?? 0],
        ["recPerPage", params?.recPerPage ?? 20],
        ["pageID", params?.pageID ?? 1],
      ],
      fields: [
        "title",
        "products",
        "productID",
        "productName",
        "product",
        "moduleName",
        "modules",
        "browseType",
        "bugs",
        ...(params?.extraFields ?? []),
      ],
    });
    return res;
  }

  /**
   * 获取指定的 Bug 信息
   * @param {{bugID: number, extraFields?: string[]}} [params] 请求参数，`params.bugID` 用于指定Bug ID，params.extraFields` 指定额外要返回的字段，其他字段指定分页信息
   * @returns 请求结果
   * ```js
   * import { ZentaoApi } from 'zentao-api';
   * const zentao = new ZentaoApi({
   *     url: 'https://pro.demo.zentao.net/', account: 'demo', password: '123456'
   * });
   * const result = await zentao.getBug({bugID: 1});
   * if (result.status) {
   *     console.log('Bug 信息为', result.result.bug);
   * }
   * ```
   */
  async getBug(params: {
    bugID: number;
    extraFields?: string[];
  }): Promise<ZentaoLegacyApiResponse> {
    const res = await this.request("bug", "view", {
      name: "getBug",
      params: [["bugID", params.bugID]],
      fields: ["title", "bug", "productName", ...(params?.extraFields ?? [])],
    });
    return res;
  }

  /**
   * 用 于为指定的产品添加 Bug 之前，获取添加 Bug 时可能需要用到的一些相关信息。
   *
   * @param {{extraFields?: string[]}} [params] 请求参数，`params.extraFields` 指定额外要返回的字段
   * @returns 请求结果
   * @example
   * ```js
   * import { ZentaoApi } from 'zentao-api';
   * const zentao = new ZentaoApi({
   *     url: 'https://pro.demo.zentao.net/', account: 'demo', password: '123456'
   * });
   * const result = await zentao.getBugCreateParams();
   * ```
   */
  async getBugCreateParams(params: {
    productID: number;
    extraFields?: string[];
  }): Promise<ZentaoLegacyApiResponse> {
    const res = await this.request("bug", "create", {
      name: "getBugCreateParams",
      params: [["productID", params.productID]],
      fields: [
        "title",
        "productID",
        "productName",
        "projects",
        "moduleOptionMenu",
        "users",
        "stories",
        "builds",
        ...(params?.extraFields ?? []),
      ],
    });
    return res;
  }

  /**
   * 向系统添加一个 Bug
   * @param params Bug 信息参数
   * @returns
   * @example
   * ```js
   * import { ZentaoApi } from 'zentao-api';
   * const zentao = new ZentaoApi({
   *     url: 'https://pro.demo.zentao.net/', account: 'demo', password: '123456'
   * });
   * const result = await zentao.addBug({
   *     product:         1,               // 必填参数 所属产品ID
   *     module:          2,               // 选填参数 所属模块ID
   *     project:         1,               // 选填参数 所属项目ID
   *     openedBuild:     ['trunk', 3, 2], // 选填参数 影响版本ID【添加单个 Bug 可选信息结果中 builds 记录的 key 值】
   *     assignedTo:      'lisi',          // 选填参数 当前指派【用户账号】
   *     deadline:        '2019-11-21',    // 选填参数 截止日期【格式示例：2019-11-11】
   *     type:            'codeerror',     // 选填参数 BUG类型【codeerror代码错误|config配置相关|install安装部署|security安全相关|performance性能问题|standard标准规范|automation测试脚本|designdefect设计缺陷|others其他
   *     os:              'windows',       // 选填参数 选填参数|操作系统【all-全部|windows-Windows|win10-Windows 10|win8-Windows 8|win7-Windows 7|vista-Windows Vista|winxp-Windows XP|win2012-Windows 2012|win2008-Windows 2008|win2003-Windows 2003|win2000-Windows 2000|android-Android|ios-IOS|wp8-WP8|wp7-WP7|symbian-Symbian|linux-Linux|freebsd-FreeBSD|osx-OS X|unix-Unix|others-其他】
   *     browser:         'ie11',          // 选填参数|浏览器【all-全部|ie-IE系列|ie11-IE11|ie10-IE10|ie9-IE9|ie8-IE8|ie7-IE7|ie6-IE6|chrome-Chrome|firefox-firefox系列|firefox4-firefox4|firefox3-firefox3|firefox2-firefox2|opera-opera系列|oprea11-oprea11|oprea10-opera10|opera9-opera9|safari-safari|maxthon-傲游|uc-UC|other-其他】
   *     title:           '添加bug测试四',   // BUG标题
   *     color:           '#2dbdb2',       // BUG颜色【示例：#2dbdb2】
   *     severity:        2,               // 严重程度【1~4】
   *     pri:             1,               // 优先级【1~4】
   *     steps:           '重现步骤描述',    // 重现步骤
   *     story:           0,               // 重现步骤描述
   *     task:            0,               // 相关需求ID
   *     mailto:          ['lisi', '张三'], // 抄送
   *     keywords:        'bug4'            // BUG关键词
   * });
   * if (result.status) {
   *     console.log('Bug 创建成功');
   * }
   * ```
   */
  async addBug(params: {
    product: number;
    title: string;
    module?: number;
    project?: number;
    openedBuild?: any[];
    assignedTo?: string;
    deadline?: string;
    type?:
      | "codeerror"
      | "config"
      | "install"
      | "security"
      | "performance"
      | "standard"
      | "automation"
      | "designdefect"
      | "others";
    os?:
      | "all"
      | "windows"
      | "win10"
      | "win8"
      | "win7"
      | "vista"
      | "winxp"
      | "win2012"
      | "win2008"
      | "win2003"
      | "win2000"
      | "android"
      | "ios"
      | "wp8"
      | "wp7"
      | "symbian"
      | "linux"
      | "freebsd"
      | "osx"
      | "unix"
      | "others";
    browser?:
      | "all"
      | "ie"
      | "ie11"
      | "ie10"
      | "ie9"
      | "ie8"
      | "ie7"
      | "ie6"
      | "chrome"
      | "firefox"
      | "firefox4"
      | "firefox3"
      | "firefox2"
      | "opera"
      | "oprea11"
      | "oprea10"
      | "opera"
      | "safari"
      | "maxthon"
      | "uc"
      | "other";
    color?: string;
    severity?: number;
    pri?: number;
    steps?: string;
    story?: number;
    task?: number;
    keywords?: string;
    mailto?: string[];
  }): Promise<ZentaoLegacyApiResponse> {
    const res = await this.request("bug", "create", {
      name: "addBug",
      method: "POST",
      params: [["productID", params.product]],
      data: {
        product: params.product,
        title: params.title,
        module: params.module ?? 0,
        project: params.project ?? 0,
        openedBuild: params.openedBuild ?? ["trunk"],
        assignedTo: params.assignedTo,
        deadline: params.deadline,
        type: params.type ?? "codeerror",
        os: params.os ?? "all",
        browser: params.browser ?? "all",
        color: params.color,
        severity: params.severity ?? 3,
        pri: params.pri ?? 3,
        steps: params.steps,
        story: params.story ?? 0,
        task: params.task ?? 0,
        keywords: params.keywords,
        mailto: params.mailto,
      },
    });
    return res;
  }

  /**
   * 获取当前 Bug 详细信息以及确认 Bug 解决时可能用到的信息。
   *
   * @param {{bugID: number, extraFields?: string[]}} params 请求参数，`params.extraFields` 指定额外要返回的字段
   * @returns 请求结果
   * @example
   * ```js
   * import { ZentaoApi } from 'zentao-api';
   * const zentao = new ZentaoApi({
   *     url: 'https://pro.demo.zentao.net/', account: 'demo', password: '123456'
   * });
   * const result = await zentao.getBugResolveParams({bugID: 1});
   * ```
   */
  async getBugResolveParams(params: {
    bugID: number;
    extraFields?: string[];
  }): Promise<ZentaoLegacyApiResponse> {
    const res = await this.request("bug", "resolve", {
      name: "getBugResolveParams",
      params: [["bugID", params.bugID]],
      fields: [
        "title",
        "products",
        "bug",
        "users",
        "builds",
        "actions",
        ...(params?.extraFields ?? []),
      ],
    });
    return res;
  }

  /**
   * 解决一个 Bug
   * @param params 任务信息参数
   * @returns
   * @example
   * ```js
   * import { ZentaoApi } from 'zentao-api';
   * const zentao = new ZentaoApi({
   *     url: 'https://pro.demo.zentao.net/', account: 'demo', password: '123456'
   * });
   * const result = await zentao.resolveBug({bugID: 1, resolution: 'fixed'});
   * if (result.status) {
   *     console.log('bug 已解决');
   * }
   * ```
   */
  async resolveBug(params: {
    bugID: number;
    resolution?:
      | "bydesign"
      | "duplicate"
      | "external"
      | "fixed"
      | "notrepro"
      | "postponed"
      | "willnotfix";
    resolvedBuild?: string;
    resolvedDate?: string;
    assignedTo?: string;
    comment?: string;
    buildProject?: number;
    buildName?: string;
    createBuild?: 0 | 1;
    duplicateBug?: number;
  }): Promise<ZentaoLegacyApiResponse> {
    const data: Record<string, any> = {
      resolution: params.resolution ?? "fixed",
      resolvedBuild: params.resolvedBuild ?? "trunk",
      resolvedDate: params.resolvedDate ?? dayjs().format("YYYY-MM-DD HH:mm:ss"),
      assignedTo: params.assignedTo,
      comment: params.comment,
      duplicateBug: params.duplicateBug,
      status: "resolved",
    };
    if (params.createBuild) {
      data.createBuild = 1;
      data.buildProject = params.buildProject;
      data.buildName = params.buildName;
    }
    const res = await this.request("bug", "resolve", {
      name: "resolveBug",
      method: "POST",
      params: [["bugID", params.bugID]],
      data,
      resultConvertor: (_remoteData, result) => {
        if (result.result.result === "fail") {
          result.status = 0;
          result.msg = result.result.message;
          result.result = null;
        }
        return result;
      },
    });
    return res;
  }

  /**
   * 获取文档空间数据，包括文档库、目录和文档列表。
   *
   * @param params 请求参数
   * @returns 文档空间数据
   */
  async getDocSpaceData(params: {
    type: "product" | "project";
    spaceID: number;
  }): Promise<DocSpaceData> {
    const result = await this.request("doc", "ajaxGetSpaceData", {
      params: [
        ["type", params.type],
        ["spaceID", params.spaceID],
        ["picks", ""],
      ],
      resultConvertor: (remoteData) => {
        return {
          status: 1,
          msg: "success",
          result: remoteData,
        };
      },
    });

    return result.result as DocSpaceData;
  }

  /**
   * 获取文档详情。
   *
   * @param params 请求参数，其中 `params.docID` 为文档 ID，`params.version` 为文档版本号
   * @returns 文档详情，不存在时返回 `null`
   */
  async getDoc(params: { docID: number; version?: number }): Promise<Doc | null> {
    try {
      const result = await this.request("doc", "ajaxGetDoc", {
        params: [
          ["docID", params.docID],
          ["version", params.version ?? 0],
        ],
        resultConvertor: (remoteData) => {
          return {
            status: 1,
            msg: "success",
            result: remoteData,
          };
        },
      });

      return result.result as Doc;
    } catch {
      return null;
    }
  }

  /**
   * 创建文档。
   *
   * @param params 创建文档参数
   * @returns 返回新建文档 ID 和文档详情
   */
  async createDoc(params: CreateDocParams): Promise<{ id: number; doc: Doc }> {
    const form: Record<string, unknown> = {
      title: params.title,
      content: params.content ?? "",
      lib: params.lib,
      module: params.module ?? 0,
      parent: "m_0",
      status: "normal",
      contentType: "doc",
      type: params.type ?? "text",
      acl: "open",
      space: "product",
      product: 1,
      uid: `doc${Date.now()}`,
      template: 0,
      contactList: "",
    };

    if (params.url) {
      form.url = params.url;
    }
    if (params.keywords) {
      form.keywords = params.keywords;
    }

    const result = await this.request("doc", "create", {
      method: "POST",
      params: [
        ["objectType", "product"],
        ["objectID", 1],
        ["libID", params.lib],
        ["moduleID", params.module ?? 0],
      ],
      data: form,
    });

    const payload = (result.result ?? {}) as {
      result?: string;
      message?: string;
      id?: number;
      doc?: Doc;
    };

    if (payload.result !== "success") {
      throw new Error(payload.message ?? "创建文档失败");
    }

    const doc = payload.doc ?? (await this.getDoc({ docID: payload.id ?? 0 }));
    if (!doc || !payload.id) {
      throw new Error("创建文档失败: 未返回文档详情");
    }

    return { id: payload.id, doc };
  }

  /**
   * 编辑文档。
   *
   * @param params 编辑参数
   * @returns 编辑后的文档详情，失败时返回 `null`
   */
  async editDoc(params: EditDocParams): Promise<Doc | null> {
    const form: Record<string, unknown> = {};
    if (params.title !== undefined) {
      form.title = params.title;
    }
    if (params.content !== undefined) {
      form.content = params.content;
    }
    if (params.keywords !== undefined) {
      form.keywords = params.keywords;
    }

    form.lib = 1;
    form.module = 0;
    form.parent = 0;
    form.status = "normal";
    form.contentType = "doc";
    form.type = "text";
    form.acl = "open";
    form.space = "product";
    form.uid = `doc${params.id}`;
    form.files = "";
    form.fromVersion = 1;

    try {
      const result = await this.request("doc", "edit", {
        method: "POST",
        params: [["docID", params.id]],
        data: form,
      });

      const payload = (result.result ?? {}) as {
        result?: string;
        message?: string;
        doc?: Doc;
      };

      if (payload.result !== "success") {
        throw new Error(payload.message ?? "编辑文档失败");
      }

      return payload.doc ?? (await this.getDoc({ docID: params.id }));
    } catch {
      return null;
    }
  }

  /**
   * 创建文档目录。
   *
   * @param params 创建目录参数
   * @returns 返回目录 ID 和名称
   */
  async createDocModule(params: CreateDocModuleParams): Promise<{ id: number; name: string }> {
    const result = await this.request("tree", "ajaxCreateModule", {
      method: "POST",
      data: {
        name: params.name,
        libID: params.libID,
        parentID: params.parentID ?? 0,
        objectID: params.objectID,
        moduleType: "doc",
        isUpdate: false,
        createType: "child",
      },
    });

    const payload = (result.result ?? {}) as {
      result?: string;
      message?: string;
      module?: { id: number; name: string };
    };

    if (payload.result !== "success") {
      throw new Error(payload.message ?? "创建文档目录失败");
    }

    return {
      id: payload.module?.id ?? 0,
      name: payload.module?.name ?? params.name,
    };
  }

  /**
   * 编辑文档目录。
   *
   * @param params 编辑目录参数
   * @returns 是否编辑成功
   */
  async editDocModule(params: EditDocModuleParams): Promise<boolean> {
    try {
      const result = await this.request("doc", "editCatalog", {
        method: "POST",
        params: [
          ["moduleID", params.moduleID],
          ["type", "doc"],
        ],
        data: {
          root: params.root,
          parent: params.parent ?? 0,
          name: params.name,
        },
      });

      const payload = (result.result ?? {}) as {
        result?: string;
      };

      return payload.result === "success";
    } catch {
      return false;
    }
  }

  /**
   * 读取附件或图片文件，并返回原始二进制内容。
   *
   * @param params 读取参数，其中 `params.fileID` 为文件 ID，`params.fileType` 为文件扩展名
   * @returns 文件读取结果
   */
  async readFile(params: { fileID: number; fileType: string }): Promise<ZentaoFileReadResult> {
    const result = await this.request("file", "read", {
      params: [["fileID", params.fileID]],
      viewType: params.fileType,
      responseType: "arraybuffer",
      resultConvertor: (remoteData) => {
        const buffer = Buffer.from(remoteData as ArrayBuffer);
        return {
          status: 1,
          msg: "success",
          result: {
            fileID: params.fileID,
            fileType: params.fileType,
            mimeType: this.resolveFileMimeType(params.fileType),
            data: buffer,
            size: buffer.byteLength,
          } satisfies ZentaoFileReadResult,
        };
      },
    });

    return result.result as ZentaoFileReadResult;
  }

  /**
   * 根据文件扩展名推断 MIME 类型。
   *
   * @param fileType 文件扩展名
   * @returns MIME 类型
   */
  private resolveFileMimeType(fileType: string): string {
    const normalized = fileType.trim().toLowerCase();
    const mimeMap: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      bmp: "image/bmp",
      pdf: "application/pdf",
      txt: "text/plain",
    };

    return mimeMap[normalized] ?? "application/octet-stream";
  }
}
