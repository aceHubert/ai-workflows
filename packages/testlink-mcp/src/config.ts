import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface TestLinkConnectionOptions {
  url?: string;
  apiKey?: string;
}

export type TestLinkConfigKey = keyof TestLinkConnectionOptions;
export type TestLinkConfigSource = "argument" | "config" | "env" | "unset";

export interface TestLinkConfigInspection {
  configFile: string;
  values: TestLinkConnectionOptions;
  sources: Record<TestLinkConfigKey, TestLinkConfigSource>;
}

export const configKeys = ["url", "apiKey"] as const;

export function getTestLinkConfigFilePath(): string {
  if (process.env.TESTLINK_CONFIG_FILE) {
    return process.env.TESTLINK_CONFIG_FILE;
  }

  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(configHome, "testlink", "config.json");
}

function toConfigValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

export function readSavedTestLinkConfig(): TestLinkConnectionOptions {
  const configFile = getTestLinkConfigFilePath();
  if (!fs.existsSync(configFile)) {
    return {};
  }

  const parsed = JSON.parse(fs.readFileSync(configFile, "utf8")) as unknown;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`配置文件格式错误: ${configFile}`);
  }

  const rawConfig = parsed as Record<string, unknown>;
  return {
    url: toConfigValue(rawConfig.url),
    apiKey: toConfigValue(rawConfig.apiKey),
  };
}

export function writeSavedTestLinkConfig(config: TestLinkConnectionOptions): void {
  const configFile = getTestLinkConfigFilePath();
  fs.mkdirSync(path.dirname(configFile), { recursive: true });
  fs.writeFileSync(`${configFile}.tmp`, `${JSON.stringify(config, null, 2)}\n`, {
    mode: 0o600,
  });
  fs.renameSync(`${configFile}.tmp`, configFile);
  fs.chmodSync(configFile, 0o600);
}

function resolveConfigValue(
  argumentValue: string | undefined,
  savedValue: string | undefined,
  envValue: string | undefined,
): { value?: string; source: TestLinkConfigSource } {
  if (argumentValue) return { value: argumentValue, source: "argument" };
  if (savedValue) return { value: savedValue, source: "config" };
  if (envValue) return { value: envValue, source: "env" };
  return { source: "unset" };
}

export function inspectTestLinkConfig(
  options: TestLinkConnectionOptions,
): TestLinkConfigInspection {
  const savedConfig = readSavedTestLinkConfig();
  const url = resolveConfigValue(options.url, savedConfig.url, process.env.TESTLINK_URL);
  const apiKey = resolveConfigValue(
    options.apiKey,
    savedConfig.apiKey,
    process.env.TESTLINK_API_KEY,
  );

  return {
    configFile: getTestLinkConfigFilePath(),
    values: {
      url: url.value,
      apiKey: apiKey.value,
    },
    sources: {
      url: url.source,
      apiKey: apiKey.source,
    },
  };
}

export function resolveTestLinkConfig(
  options: TestLinkConnectionOptions,
): Required<TestLinkConnectionOptions> {
  const inspection = inspectTestLinkConfig(options);

  if (!inspection.values.url || !inspection.values.apiKey) {
    throw new Error(
      [
        "请通过命令行参数、本地配置或环境变量提供 TestLink 连接配置:",
        "--url / config url / TESTLINK_URL - TestLink 服务地址",
        "--apiKey / config apiKey / TESTLINK_API_KEY - TestLink API Key",
        `配置文件: ${inspection.configFile}`,
      ].join("\n"),
    );
  }

  return inspection.values as Required<TestLinkConnectionOptions>;
}

export function updateSavedTestLinkConfig(
  key: TestLinkConfigKey,
  value: string,
): TestLinkConnectionOptions {
  if (!configKeys.includes(key)) {
    throw new Error(`不支持的配置项: ${key}`);
  }

  const nextConfig = {
    ...readSavedTestLinkConfig(),
    [key]: value,
  };
  writeSavedTestLinkConfig(nextConfig);
  return nextConfig;
}

export function removeSavedTestLinkConfig(key: TestLinkConfigKey): TestLinkConnectionOptions {
  if (!configKeys.includes(key)) {
    throw new Error(`不支持的配置项: ${key}`);
  }

  const nextConfig = {
    ...readSavedTestLinkConfig(),
    [key]: undefined,
  };
  writeSavedTestLinkConfig(nextConfig);
  return nextConfig;
}
