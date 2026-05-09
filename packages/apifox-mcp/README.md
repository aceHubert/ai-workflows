# Apifox MCP + CLI

一个同时支持 `MCP` 和 `CLI` 的 Apifox/OpenAPI 文档工具。

## 开发安装

项目使用 `Yarn 3`。

```bash
yarn install
yarn build
```

常用开发命令：

```bash
yarn build
yarn typecheck
yarn lint
```

## 来源类型

工具支持三种来源，三选一：

- `--projectId`
- `--siteId`
- `--oas`

说明：

- 来源参数必须显式通过命令行传入
- 不支持通过环境变量传入 `projectId`、`siteId`、`oas`

## 环境变量

支持以下环境变量：

- `APIFOX_ACCESS_TOKEN`
- `APIFOX_API_BASE_URL`
- `APIFOX_API_VERSION`
- `APIFOX_API_PAGE_SIZE`
- `APIFOX_DATA_LOCATION`

示例：

```bash
export APIFOX_ACCESS_TOKEN="your_access_token"
export APIFOX_DATA_LOCATION="/tmp"
```

## MCP 用法

启动时如果已经传入来源参数，MCP 会注册带后缀的工具名，便于多实例区分。

示例：

```bash
apifox-mcp --projectId=12345
apifox-mcp --siteId=abcde
apifox-mcp --oas=https://petstore.swagger.io/v2/swagger.json
```

如果启动时没有传来源参数，MCP 会注册无后缀工具名：

- `read_apifox_oas`
- `read_apifox_oas_ref_resources`
- `refresh_apifox_oas`
- `get_apifox_cache_info`

同时这些工具的 schema 会带 `oneOf`，要求在调用时传入以下之一：

- `projectId`
- `siteId`
- `oas`

如果启动时传了来源参数，则工具 schema 不再要求重复传来源。

### MCP 配置示例

以 `projectId` 为例：

```json
{
  "mcpServers": {
    "api-docs": {
      "command": "npx",
      "args": ["-y", "@acehubert/apifox-mcp@latest", "--projectId=12345"],
      "env": {
        "APIFOX_ACCESS_TOKEN": "your_access_token"
      }
    }
  }
}
```

## CLI 用法

CLI 所有命令都要求显式传入来源参数。

### 查看文档

```bash
apifox oas view --projectId=12345
apifox oas view --siteId=abcde
apifox oas view --oas=/tmp/openapi.json
```

### 刷新缓存

```bash
apifox oas refresh --projectId=12345
apifox oas refresh --oas=https://petstore.swagger.io/v2/swagger.json
```

### 读取 `$ref` 资源

```bash
apifox refs read \
  --projectId=12345 \
  --path=/paths/_users.json \
  --path=/components/schemas/User.json
```

### 查看缓存信息

```bash
apifox cache info --projectId=12345
```

返回内容包括：

- `cacheDir`
- `cacheFile`
- `exists`
- `source`
- `lastUpdatedAt`

### CLI 帮助

```bash
apifox --help
apifox oas --help
apifox refs --help
apifox cache --help
```

## 缓存行为

拉取文档后会在本地生成缓存，并把 OpenAPI 文档拆成：

- 主索引 `index.json`
- `paths/*.json`
- `components/**/*.json`

`cache info` 中的 `lastUpdatedAt` 使用缓存文件 `index.json` 的修改时间。

## 当前目录约定

- `skills/` 是项目内 skills 源目录
- `.claude/skills` 已软链接到 `skills/`

## 备注

- 读取 `projectId` 来源时必须提供有效的 `APIFOX_ACCESS_TOKEN`
- `siteId` 与 `oas` 来源不要求 token
- `oas` 后缀命名会基于输入地址或路径生成稳定 hash
