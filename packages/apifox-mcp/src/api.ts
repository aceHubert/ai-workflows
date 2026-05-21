import { createHash } from "node:crypto";
import { mkdirSync, promises as fs, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export type JsonObject = Record<string, unknown>;

export interface ApifoxApiOptions {
  token?: string;
  projectId?: string;
  siteId?: string;
  oas?: string;
  apiBaseUrl?: string;
  apiVersion?: string;
  apiPageSize?: number;
  dataLocation?: string;
  locale?: string;
}

export type ApifoxConfigKey = keyof ApifoxApiOptions;
export type ApifoxConfigValue = string | number;
export type ApifoxConfig = Partial<Record<ApifoxConfigKey, ApifoxConfigValue>>;

export interface ResolvedApifoxApiOptions {
  token?: string;
  source: ApifoxSource;
  apiBaseUrl: string;
  apiVersion: string;
  apiPageSize: number;
  dataLocation: string;
  locale?: string;
}

export type ApifoxSource =
  | { name: "project"; identifier: string }
  | { name: "doc-site"; identifier: string }
  | { name: "remote-file"; identifier: string }
  | { name: "local-file"; identifier: string };

export interface CacheInfo {
  cacheDir: string;
  cacheFile: string;
  exists: boolean;
  source: ApifoxSource;
  lastUpdatedAt?: string;
}

export type FetchProjectDocumentScope =
  | {
      type?: "ALL";
      excludedByTags?: string[];
    }
  | {
      type: "SELECTED_TAGS";
      selectedTags: string[];
      excludedByTags?: string[];
    }
  | {
      type: "SELECTED_FOLDERS";
      selectedFolderIds: number[];
      excludedByTags?: string[];
    }
  | {
      type: "SELECTED_ENDPOINTS";
      selectedEndpointIds: number[];
      excludedByTags?: string[];
    };

export interface FetchProjectDocumentRequestOptions {
  includeApifoxExtensionProperties?: boolean;
  addFoldersToTags?: boolean;
}

export interface FetchProjectDocumentOptions {
  scope?: FetchProjectDocumentScope;
  options?: FetchProjectDocumentRequestOptions;
  oasVersion?: string;
  exportFormat?: string;
  environmentIds?: number[];
  branchId?: number;
  moduleId?: number;
}

export type OpenApiDocument = JsonObject & {
  paths?: Record<string, JsonObject>;
  components?: Record<string, Record<string, JsonObject>>;
  info?: JsonObject;
};

export type ProjectDocument = OpenApiDocument | string;

const DEFAULT_API_BASE_URL = "https://api.apifox.com";
const DEFAULT_API_VERSION = "2024-03-28";
const DEFAULT_API_PAGE_SIZE = Number.MAX_SAFE_INTEGER;
const DEFAULT_DATA_ROOT_NAME = ".apifox-mcp-server";
export const APIFOX_CONFIG_ROOT_NAME = DEFAULT_DATA_ROOT_NAME;
export const APIFOX_CONFIG_FILE = path.join(os.homedir(), APIFOX_CONFIG_ROOT_NAME, "config.json");
export const APIFOX_CONFIG_KEYS = [
  "token",
  "projectId",
  "siteId",
  "oas",
  "apiBaseUrl",
  "apiVersion",
  "apiPageSize",
  "dataLocation",
  "locale",
] as const satisfies readonly ApifoxConfigKey[];

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function getRequiredString(value: unknown, fieldName: string): string {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    throw new Error(`${fieldName} 必须是非空字符串`);
  }
  return normalized;
}

function normalizePageSize(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    return Number.parseInt(value, 10);
  }
  return DEFAULT_API_PAGE_SIZE;
}

function normalizeOptionalPageSize(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number.parseInt(value, 10);
    return parsed > 0 ? parsed : undefined;
  }
  return undefined;
}

export function isApifoxConfigKey(value: string): value is (typeof APIFOX_CONFIG_KEYS)[number] {
  return APIFOX_CONFIG_KEYS.includes(value as (typeof APIFOX_CONFIG_KEYS)[number]);
}

export function normalizeApifoxConfigValue(
  key: ApifoxConfigKey,
  value: unknown,
): ApifoxConfigValue {
  if (key === "apiPageSize") {
    const numberValue = normalizeOptionalPageSize(value);
    if (numberValue === undefined) {
      throw new Error("apiPageSize 必须是大于 0 的整数");
    }
    return numberValue;
  }

  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    throw new Error(`${key} 必须是非空字符串`);
  }

  return normalized;
}

export function readApifoxConfig(): ApifoxConfig {
  try {
    const content = readFileSync(APIFOX_CONFIG_FILE, "utf8");
    const parsed = JSON.parse(content) as unknown;
    if (!isRecord(parsed)) {
      return {};
    }

    const config: ApifoxConfig = {};
    for (const key of APIFOX_CONFIG_KEYS) {
      const value = parsed[key];
      if (value === undefined) {
        continue;
      }
      config[key] = normalizeApifoxConfigValue(key, value);
    }

    return config;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

export function writeApifoxConfig(config: ApifoxConfig): void {
  mkdirSync(path.dirname(APIFOX_CONFIG_FILE), { recursive: true });
  writeFileSync(APIFOX_CONFIG_FILE, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export function resolveApifoxInputOptions(options: ApifoxApiOptions): ApifoxApiOptions {
  const config = readApifoxConfig();

  return {
    token:
      normalizeOptionalString(options.token) ??
      (typeof config.token === "string" ? config.token : undefined) ??
      normalizeOptionalString(process.env.APIFOX_ACCESS_TOKEN),
    projectId:
      normalizeOptionalString(options.projectId) ??
      (typeof config.projectId === "string" ? config.projectId : undefined) ??
      normalizeOptionalString(process.env.APIFOX_PROJECT_ID),
    siteId:
      normalizeOptionalString(options.siteId) ??
      (typeof config.siteId === "string" ? config.siteId : undefined) ??
      normalizeOptionalString(process.env.APIFOX_SITE_ID),
    oas:
      normalizeOptionalString(options.oas) ??
      (typeof config.oas === "string" ? config.oas : undefined) ??
      normalizeOptionalString(process.env.APIFOX_OAS),
    apiBaseUrl:
      normalizeOptionalString(options.apiBaseUrl) ??
      (typeof config.apiBaseUrl === "string" ? config.apiBaseUrl : undefined) ??
      normalizeOptionalString(process.env.APIFOX_API_BASE_URL),
    apiVersion:
      normalizeOptionalString(options.apiVersion) ??
      (typeof config.apiVersion === "string" ? config.apiVersion : undefined) ??
      normalizeOptionalString(process.env.APIFOX_API_VERSION),
    apiPageSize:
      normalizeOptionalPageSize(options.apiPageSize) ??
      (typeof config.apiPageSize === "number" ? config.apiPageSize : undefined) ??
      normalizeOptionalPageSize(process.env.APIFOX_API_PAGE_SIZE),
    dataLocation:
      normalizeOptionalString(options.dataLocation) ??
      (typeof config.dataLocation === "string" ? config.dataLocation : undefined) ??
      normalizeOptionalString(process.env.APIFOX_DATA_LOCATION),
    locale:
      normalizeOptionalString(options.locale) ??
      (typeof config.locale === "string" ? config.locale : undefined) ??
      normalizeOptionalString(process.env.APIFOX_LOCALE),
  };
}

export function resolveApifoxEffectiveOptionValues(
  options: ApifoxApiOptions = {},
): Partial<Record<ApifoxConfigKey, ApifoxConfigValue>> {
  const resolvedInputs = resolveApifoxInputOptions(options);

  return {
    token: resolvedInputs.token,
    projectId: resolvedInputs.projectId,
    siteId: resolvedInputs.siteId,
    oas: resolvedInputs.oas,
    apiBaseUrl: resolvedInputs.apiBaseUrl ?? DEFAULT_API_BASE_URL,
    apiVersion: resolvedInputs.apiVersion ?? DEFAULT_API_VERSION,
    apiPageSize: normalizePageSize(resolvedInputs.apiPageSize),
    dataLocation: resolvedInputs.dataLocation ?? os.homedir(),
    locale: resolvedInputs.locale,
  };
}

function sanitizePathKey(key: string): string {
  return key.replace(/\//g, "_");
}

function getNestedValue(record: JsonObject, dotPath: string): unknown {
  return dotPath.split(".").reduce<unknown>((current, segment) => {
    if (!isRecord(current)) {
      return undefined;
    }
    return current[segment];
  }, record);
}

function setNestedValue(record: JsonObject, dotPath: string, value: unknown): void {
  const segments = dotPath.split(".");
  let current: JsonObject = record;
  for (const segment of segments.slice(0, -1)) {
    const existing = current[segment];
    if (!isRecord(existing)) {
      current[segment] = {};
    }
    current = current[segment] as JsonObject;
  }
  current[segments[segments.length - 1]] = value;
}

function collectComponentRefs(value: unknown, refs: string[]): void {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectComponentRefs(item, refs);
    }
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (
      key === "$ref" &&
      typeof nestedValue === "string" &&
      nestedValue.startsWith("#/components/")
    ) {
      refs.push(nestedValue.slice("#/components/".length));
      continue;
    }
    collectComponentRefs(nestedValue, refs);
  }
}

function minimizeComponents(document: OpenApiDocument): OpenApiDocument {
  if (!document.components) {
    return document;
  }

  const { components, ...rest } = document;
  const pickedComponents: JsonObject = {};
  const walk = (value: unknown): void => {
    const refs: string[] = [];
    collectComponentRefs(value, refs);

    for (const ref of refs) {
      const normalizedRef = ref.replace(/\//g, ".");

      if (getNestedValue(pickedComponents, normalizedRef) !== undefined) {
        continue;
      }
      const nextValue = getNestedValue(components, normalizedRef);
      if (nextValue !== undefined) {
        setNestedValue(pickedComponents, normalizedRef, nextValue);
        walk(nextValue);
      }
    }
  };

  walk(rest);

  const securitySchemes = components.securitySchemes;
  if (securitySchemes && getNestedValue(pickedComponents, "securitySchemes") === undefined) {
    setNestedValue(pickedComponents, "securitySchemes", securitySchemes);
  }

  return {
    ...rest,
    components: pickedComponents as OpenApiDocument["components"],
  };
}

async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function writePathRefs(
  cacheDir: string,
  document: OpenApiDocument,
  pageSize: number,
): Promise<Record<string, JsonObject>> {
  const pathsRecord = document.paths ?? {};
  const pathKeys = Object.keys(pathsRecord);
  const pathRefs: Record<string, JsonObject> = {};

  for (const pathKey of pathKeys) {
    const refPath = `/paths/${sanitizePathKey(pathKey)}.json`;
    const targetFile = path.join(cacheDir, refPath);
    const pathItem = pathsRecord[pathKey] ?? {};
    await writeJsonFile(targetFile, pathItem);

    const summaries = Object.keys(pathItem).reduce<Record<string, JsonObject>>((result, method) => {
      const methodValue = pathItem[method];
      if (isRecord(methodValue) && typeof methodValue.summary === "string") {
        result[method] = { summary: methodValue.summary };
      }
      return result;
    }, {});

    pathRefs[pathKey] = { $ref: refPath, ...summaries };
  }

  const pagination = {
    page: Math.ceil(pathKeys.length / pageSize),
    pageSize,
    otherPages: {} as Record<number, JsonObject>,
  };

  if (pagination.page > 1) {
    const firstPageEntries = pathKeys.slice(0, pageSize);
    const firstPageRecord: Record<string, JsonObject> = {};

    for (const pathKey of firstPageEntries) {
      firstPageRecord[pathKey] = pathRefs[pathKey];
    }

    for (let offset = pageSize, page = 2; offset < pathKeys.length; offset += pageSize, page += 1) {
      const pageKeys = pathKeys.slice(offset, offset + pageSize);
      const pageRecord: Record<string, JsonObject> = {};
      for (const pathKey of pageKeys) {
        pageRecord[pathKey] = pathRefs[pathKey];
      }

      const pageRef = `/pages/${page}.json`;
      await writeJsonFile(path.join(cacheDir, pageRef), pageRecord);
      pagination.otherPages[page] = { $ref: pageRef };
    }

    return {
      ...firstPageRecord,
      "x-pagination": pagination as unknown as JsonObject,
    };
  }

  return pathRefs;
}

async function writeComponentIndex(
  cacheDir: string,
  document: OpenApiDocument,
  componentName: string,
): Promise<string | undefined> {
  const componentRecord = document.components?.[componentName];
  if (!componentRecord) {
    return undefined;
  }

  const indexRecord: Record<string, JsonObject> = {};
  for (const key of Object.keys(componentRecord)) {
    const refPath = `/components/${componentName}/${key}.json`;
    await writeJsonFile(path.join(cacheDir, refPath), componentRecord[key]);
    indexRecord[key] = { $ref: refPath };
  }

  const indexPath = `/components/${componentName}/index.json`;
  await writeJsonFile(path.join(cacheDir, indexPath), indexRecord);
  return indexPath;
}

export function resolveApifoxApiOptions(options: ApifoxApiOptions): ResolvedApifoxApiOptions {
  const resolvedInputs = resolveApifoxInputOptions(options);
  const source = resolveSourceFromInputs(resolvedInputs);
  return {
    token: resolvedInputs.token,
    source,
    apiBaseUrl: resolvedInputs.apiBaseUrl ?? DEFAULT_API_BASE_URL,
    apiVersion: resolvedInputs.apiVersion ?? DEFAULT_API_VERSION,
    apiPageSize: normalizePageSize(resolvedInputs.apiPageSize),
    dataLocation: resolvedInputs.dataLocation ?? os.homedir(),
    locale: resolvedInputs.locale,
  };
}

export function resolveSource(options: ApifoxApiOptions): ApifoxSource {
  return resolveSourceFromInputs(resolveApifoxInputOptions(options));
}

function resolveSourceFromInputs(options: ApifoxApiOptions): ApifoxSource {
  const oas = options.oas;
  if (typeof oas === "string" && oas.trim().length > 0) {
    const normalized = oas.trim();
    return /^https?:\/\//.test(normalized)
      ? { name: "remote-file", identifier: normalized }
      : { name: "local-file", identifier: normalized };
  }

  const siteId = options.siteId;
  if (typeof siteId === "string" && siteId.trim().length > 0) {
    return { name: "doc-site", identifier: siteId.trim() };
  }

  const projectId = options.projectId;
  if (typeof projectId === "string" && projectId.trim().length > 0) {
    return { name: "project", identifier: projectId.trim() };
  }

  throw new Error("projectId、siteId 或 oas 至少有一个是必须的");
}

export class ApifoxAPI {
  readonly options: ResolvedApifoxApiOptions;
  readonly cacheDir: string;
  readonly cacheFile: string;

  constructor(options: ApifoxApiOptions) {
    this.options = resolveApifoxApiOptions(options);
    this.cacheDir = path.join(
      this.options.dataLocation,
      DEFAULT_DATA_ROOT_NAME,
      this.getSourceCacheKey(this.options.source),
    );
    this.cacheFile = path.join(this.cacheDir, "index.json");
  }

  getCacheInfo(): CacheInfo {
    return {
      cacheDir: this.cacheDir,
      cacheFile: this.cacheFile,
      exists: false,
      source: this.options.source,
    };
  }

  async getResolvedCacheInfo(): Promise<CacheInfo> {
    try {
      const stat = await fs.stat(this.cacheFile);
      return {
        ...this.getCacheInfo(),
        exists: true,
        lastUpdatedAt: stat.mtime.toISOString(),
      };
    } catch {
      return this.getCacheInfo();
    }
  }

  async readProjectOas(): Promise<string> {
    try {
      return await fs.readFile(this.cacheFile, "utf8");
    } catch {
      const document = await this.refreshProjectOas();
      return JSON.stringify(document, null, 2);
    }
  }

  async refreshProjectOas(): Promise<OpenApiDocument> {
    const originalDocument = await this.fetchSourceDocument();
    return this.materializeDocument(originalDocument);
  }

  async readProjectOasRefResources(pathsToRead: string[]): Promise<Record<string, string>> {
    const result: Record<string, string> = {};

    for (const refPath of pathsToRead) {
      const normalizedRef = getRequiredString(refPath, "path");
      const targetFile = path.join(this.cacheDir, normalizedRef);
      result[normalizedRef] = await fs.readFile(targetFile, "utf8");
    }

    return result;
  }

  getSource(): ApifoxSource {
    return this.options.source;
  }

  async getDocumentTitle(): Promise<string | undefined> {
    try {
      const document = JSON.parse(await this.readProjectOas()) as unknown;
      if (!isRecord(document)) {
        return undefined;
      }
      const info = document.info;
      if (!isRecord(info)) {
        return undefined;
      }
      const title = info.title;
      return typeof title === "string" && title.trim().length > 0 ? title : undefined;
    } catch {
      return undefined;
    }
  }

  private getSourceCacheKey(source: ApifoxSource): string {
    switch (source.name) {
      case "project":
        return `project-${source.identifier}`;
      case "doc-site":
        return `site-${source.identifier}`;
      case "remote-file":
      case "local-file":
        return `oas-${createHash("md5").update(source.identifier).digest("hex").slice(0, 8)}`;
      default:
        return "oas-unknown";
    }
  }

  private buildRequestHeaders(init?: RequestInit): Headers {
    const headers = new Headers(init?.headers);
    headers.set("User-Agent", "apifox-mcp-server/0.0.1");
    headers.set("X-Apifox-Api-Version", this.options.apiVersion);

    if (this.options.token) {
      headers.set("Authorization", `Bearer ${this.options.token}`);
    }

    if (init?.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    return headers;
  }

  private async requestJson(url: string, init?: RequestInit): Promise<unknown> {
    const headers = this.buildRequestHeaders(init);

    const response = await fetch(url, {
      ...init,
      headers,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `请求失败: ${response.status} ${response.statusText}${text ? ` - ${text}` : ""}`,
      );
    }

    return response.json();
  }

  private async requestBody(url: string, init?: RequestInit): Promise<unknown> {
    const headers = this.buildRequestHeaders(init);

    const response = await fetch(url, {
      ...init,
      headers,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `请求失败: ${response.status} ${response.statusText}${text ? ` - ${text}` : ""}`,
      );
    }

    const contentType = response.headers.get("Content-Type") ?? "";
    if (contentType.includes("json")) {
      return response.json();
    }
    return response.text();
  }

  private async fetchSourceDocument(): Promise<OpenApiDocument> {
    const { source } = this.options;

    switch (source.name) {
      case "project":
        if (!this.options.token) {
          throw new Error("读取 Apifox 项目时必须提供 APIFOX_ACCESS_TOKEN");
        }
        return this.assertOpenApi(await this.fetchProjectDocument(source.identifier));
      case "doc-site":
        return this.fetchDocSiteDocument(source.identifier);
      case "remote-file":
        return this.fetchRemoteOas(source.identifier);
      case "local-file":
        return this.fetchLocalOas(source.identifier);
      default:
        throw new Error("不支持的来源类型");
    }
  }

  async fetchProjectDocument(
    projectId: string,
    options: FetchProjectDocumentOptions = {},
  ): Promise<ProjectDocument> {
    const url = new URL(`/v1/projects/${projectId}/export-openapi`, this.options.apiBaseUrl);
    if (this.options.locale) {
      url.searchParams.set("locale", this.options.locale);
    }

    const result = await this.requestBody(url.toString(), {
      method: "POST",
      body: JSON.stringify(this.buildProjectRequestBody(options)),
    });
    if (typeof result === "string") {
      return result;
    }
    return this.assertOpenApi(result);
  }

  private buildProjectRequestBody(options: FetchProjectDocumentOptions): JsonObject {
    const {
      branchId,
      environmentIds,
      exportFormat,
      moduleId,
      oasVersion,
      options: requestOptions,
    } = options;

    const body: JsonObject = {
      scope: options.scope ?? { type: "ALL" },
    };

    if (
      requestOptions?.includeApifoxExtensionProperties !== undefined ||
      requestOptions?.addFoldersToTags !== undefined
    ) {
      body.options = {
        ...(requestOptions.includeApifoxExtensionProperties !== undefined
          ? { includeApifoxExtensionProperties: requestOptions.includeApifoxExtensionProperties }
          : {}),
        ...(requestOptions.addFoldersToTags !== undefined
          ? { addFoldersToTags: requestOptions.addFoldersToTags }
          : {}),
      };
    }

    if (oasVersion) {
      body.oasVersion = oasVersion;
    }
    if (exportFormat) {
      body.exportFormat = exportFormat;
    }
    if (branchId !== undefined) {
      body.branchId = branchId;
    }
    if (moduleId !== undefined) {
      body.moduleId = moduleId;
    }
    if (environmentIds && environmentIds.length > 0) {
      body.environmentIds = environmentIds;
    }

    return body;
  }
  private async fetchDocSiteDocument(siteId: string): Promise<OpenApiDocument> {
    const url = new URL(
      `/api/v1/docs-sites/${siteId}/export-mcp-data`,
      this.options.apiBaseUrl,
    ).toString();
    const result = await this.requestJson(url, {
      method: "POST",
      body: JSON.stringify({}),
    });
    return this.assertOpenApi(result);
  }

  private async fetchRemoteOas(oasUrl: string): Promise<OpenApiDocument> {
    const response = await fetch(oasUrl);
    if (!response.ok) {
      throw new Error(`读取远程 OAS 失败: ${response.status} ${response.statusText}`);
    }
    return this.assertOpenApi(await response.json());
  }

  private async fetchLocalOas(filePath: string): Promise<OpenApiDocument> {
    const content = await fs.readFile(filePath, "utf8");
    return this.assertOpenApi(JSON.parse(content) as unknown);
  }

  private assertOpenApi(value: unknown): OpenApiDocument {
    if (!isRecord(value)) {
      throw new Error("OpenAPI 文档不是合法对象");
    }
    return value as OpenApiDocument;
  }

  private async materializeDocument(document: OpenApiDocument): Promise<OpenApiDocument> {
    await fs.mkdir(this.cacheDir, { recursive: true });
    await writeJsonFile(path.join(this.cacheDir, "original.json"), document);

    const minimized = minimizeComponents(document);
    const pathsIndex = await writePathRefs(this.cacheDir, minimized, this.options.apiPageSize);
    const schemasIndex = await writeComponentIndex(this.cacheDir, minimized, "schemas");
    const securitySchemesIndex = await writeComponentIndex(
      this.cacheDir,
      minimized,
      "securitySchemes",
    );
    const requestBodiesIndex = await writeComponentIndex(this.cacheDir, minimized, "requestBodies");
    const responsesIndex = await writeComponentIndex(this.cacheDir, minimized, "responses");

    const info = {
      ...(minimized.info ?? {}),
      "x-download-time": new Date().toISOString(),
    };

    const output: OpenApiDocument = {
      ...minimized,
      info,
      paths: pathsIndex,
      components: {
        ...(minimized.components ?? {}),
      },
    };

    if (schemasIndex) {
      output.components = output.components ?? {};
      output.components.schemas = { $ref: schemasIndex } as unknown as Record<string, JsonObject>;
    }
    if (securitySchemesIndex) {
      output.components = output.components ?? {};
      output.components.securitySchemes = {
        $ref: securitySchemesIndex,
      } as unknown as Record<string, JsonObject>;
    }
    if (requestBodiesIndex) {
      output.components = output.components ?? {};
      output.components.requestBodies = {
        $ref: requestBodiesIndex,
      } as unknown as Record<string, JsonObject>;
    }
    if (responsesIndex) {
      output.components = output.components ?? {};
      output.components.responses = { $ref: responsesIndex } as unknown as Record<
        string,
        JsonObject
      >;
    }

    delete output.tags;

    await writeJsonFile(this.cacheFile, output);
    return output;
  }
}
