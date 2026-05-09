# 禅道 MCP Server

让 AI 助手能够直接管理禅道中的 Bug、需求和测试用例。通过 MCP (Model Context Protocol)，你可以用自然语言与 AI 交流来查询、创建、更新和关闭各种禅道数据。

## ✨ 功能特性

### Bug 管理

- 📋 获取 Bug 列表（支持按状态筛选）
- 🔍 查看 Bug 详情
- ➕ 创建新 Bug
- ✅ 解决 Bug（标记为已修复）
- 🔒 关闭 Bug
- 🔄 激活 Bug（重新打开）
- ✔️ 确认 Bug

### 需求管理

- 📋 获取需求列表（支持按状态筛选）
- 🔍 查看需求详情
- ➕ 创建新需求
- 🔒 关闭需求
- 🔄 激活需求

### 测试用例管理

- 📋 获取测试用例列表
- 🔍 查看测试用例详情
- ➕ 创建测试用例
- ✏️ 修改测试用例
- 🗑️ 删除测试用例

### 其他功能

- 📦 获取产品列表
- 📁 获取项目列表
- 🔄 获取执行（迭代）列表

## 🚀 快速开始

### 方式一：使用 npx（推荐）

无需安装，直接在 MCP 客户端配置中使用：

#### Cursor 配置

编辑 `~/.cursor/mcp.json`（Windows: `%USERPROFILE%\.cursor\mcp.json`）：

```json
{
  "mcpServers": {
    "zentao": {
      "command": "npx",
      "args": ["-y", "@acehubert/zentao-mcp"],
      "env": {
        "ZENTAO_URL": "https://your-zentao-server.com",
        "ZENTAO_ACCOUNT": "your_username",
        "ZENTAO_PASSWORD": "your_password",
        "ZENTAO_VERSION": "v1",
        "ZENTAO_SKIP_SSL": "true"
      }
    }
  }
}
```

#### Claude Desktop 配置

编辑 `claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "zentao": {
      "command": "npx",
      "args": ["-y", "@acehubert/zentao-mcp"],
      "env": {
        "ZENTAO_URL": "https://your-zentao-server.com",
        "ZENTAO_ACCOUNT": "your_username",
        "ZENTAO_PASSWORD": "your_password",
        "ZENTAO_VERSION": "v1",
        "ZENTAO_SKIP_SSL": "true"
      }
    }
  }
}
```

### 方式二：全局安装

```bash
npm install -g @acehubert/zentao-mcp
```

全局安装后会提供两个命令：

- `zentao-mcp`：启动 MCP Server，用于接入 MCP 客户端。
- `zentao`：命令行工具，用于在终端直接操作禅道。

然后在 MCP 配置中使用：

```json
{
  "mcpServers": {
    "zentao": {
      "command": "zentao-mcp",
      "env": {
        "ZENTAO_URL": "https://your-zentao-server.com",
        "ZENTAO_ACCOUNT": "your_username",
        "ZENTAO_PASSWORD": "your_password",
        "ZENTAO_VERSION": "v1",
        "ZENTAO_SKIP_SSL": "true"
      }
    }
  }
}
```

### 方式三：从源码运行

1. 克隆项目并安装依赖：

```bash
git clone https://github.com/aceHubert/ai-workflows.git
cd zentao
yarn install
yarn build
```

2. 在 MCP 配置中使用本地路径：

```json
{
  "mcpServers": {
    "zentao": {
      "command": "node",
      "args": ["/path/to/zentao/packages/zentao-mcp/dist/index.js"],
      "env": {
        "ZENTAO_URL": "https://your-zentao-server.com",
        "ZENTAO_ACCOUNT": "your_username",
        "ZENTAO_PASSWORD": "your_password",
        "ZENTAO_VERSION": "v1",
        "ZENTAO_SKIP_SSL": "true"
      }
    }
  }
}
```

## ⚙️ 环境变量说明

| 变量名            | 必填 | 说明                                                                                      |
| ----------------- | ---- | ----------------------------------------------------------------------------------------- |
| `ZENTAO_URL`      | ✅   | 禅道服务器地址（包含协议，如 `https://zentao.example.com`）                               |
| `ZENTAO_ACCOUNT`  | ✅   | 禅道登录账号                                                                              |
| `ZENTAO_PASSWORD` | ✅   | 禅道登录密码                                                                              |
| `ZENTAO_VERSION`  | ❌   | 客户端版本，支持 `legacy`（旧 API 实现）、`v1`（REST API V1）和 `v2`（REST API V2，默认） |
| `ZENTAO_SKIP_SSL` | ❌   | 是否跳过 SSL 证书验证（自签名证书时设为 `true`）                                          |

## 💻 CLI 使用说明

`zentao` CLI 适合在终端中做一次性查询、脚本化检查和小批量维护。

安装：

```bash
npm install -g @acehubert/zentao-mcp
zentao --version
```

推荐使用本地配置或环境变量配置连接信息，避免密码进入普通业务命令的 shell 历史：

```bash
zentao config set
```

也可以逐项设置：

```bash
zentao config set url "https://your-zentao-server.com"
zentao config set account "your_username"
zentao config set password "your_password"
zentao config set version "v2"
zentao config set skipSSL "false"
zentao config get
zentao config get url
zentao config remove password
```

解析优先级为：命令行参数 > 本地配置 > 环境变量。
MCP Server 和 CLI 共用同一份本地配置，因此 `config set` 后无需再为 MCP 单独配置同样的值。

也可以使用环境变量配置连接信息：

```bash
export ZENTAO_URL="https://your-zentao-server.com"
export ZENTAO_ACCOUNT="your_username"
export ZENTAO_PASSWORD="your_password"
export ZENTAO_VERSION="v2"
export ZENTAO_SKIP_SSL="false"
```

也可以在命令行中临时传入连接参数：

```bash
zentao users me \
  --url "https://your-zentao-server.com" \
  --account "your_username" \
  --password "your_password" \
  --version "v2" \
  --skipSSL
```

基本格式：

```bash
zentao <resource> <action> [arguments] [flags]
```

查看帮助：

```bash
zentao --help
zentao bugs --help
zentao docs --help
```

CLI 输出为格式化 JSON，方便结合 `jq` 或脚本继续处理。

### Bug

查询：

```bash
zentao bugs list --productID 1 --browseType unclosed --limit 20
zentao bugs view --bugID 123
```

创建：

```bash
zentao bugs create \
  --productID 1 \
  --title "登录按钮点击后无响应" \
  --severity 2 \
  --pri 2 \
  --type codeerror \
  --steps "【前置条件】进入登录页\n【操作步骤】点击登录按钮\n【预期结果】正常提交\n【实际结果】无响应"
```

解决和关闭：

```bash
zentao bugs resolve --bugID 123 --resolution fixed --comment "已修复，待验证"
zentao bugs close --bugID 123 --comment "验证通过"
```

### 需求

查询：

```bash
zentao stories list --productID 1 --browseType unclosed --limit 20
zentao stories view --storyID 456
```

需求列表的 `browseType` 默认 `unclosed`。v1/v2 可用值：`all` 全部、`unclosed` 未关闭、`assignedtome` 指派给我、`openedbyme` 我创建、`assignedbyme` 由我指派。

创建：

```bash
zentao stories create \
  --productID 1 \
  --title "优化登录流程" \
  --category feature \
  --pri 2 \
  --spec "用户可以通过手机号和验证码登录" \
  --reviewer "zhangsan" \
  --verify "输入正确验证码后登录成功"
```

关闭：

```bash
zentao stories close --storyID 456 --closedReason done --comment "需求已完成"
```

### 测试用例

`steps` 参数需要传入 JSON 数组字符串。

```bash
zentao testcases list --productID 1 --limit 20
zentao testcases view --caseID 789

zentao testcases create \
  --productID 1 \
  --title "手机号验证码登录成功" \
  --type feature \
  --pri 2 \
  --precondition "测试账号已存在" \
  --steps '[{"desc":"输入手机号","expect":"手机号格式正确"},{"desc":"输入验证码并提交","expect":"登录成功"}]'
```

### 产品、项目、用户

```bash
zentao products list --limit 20
zentao products view --productID 1

zentao projects list --limit 20
zentao projects view --projectID 1

zentao users me
zentao users list --limit 20
zentao users view --userID 1
```

### 文档

文档写入依赖文档库 ID 和目录 ID。创建或编辑前，先查询空间树确认目标位置。

```bash
zentao docs tree --spaceType product --spaceID 1
zentao docs view --docID 1001
```

创建目录和文档：

```bash
zentao docs createModule \
  --libID 1 \
  --spaceID 1 \
  --moduleName "接口文档"

zentao docs create \
  --libID 1 \
  --moduleID 111 \
  --title "登录接口文档" \
  --content "接口地址、请求参数、响应格式..."
```

编辑文档和目录：

```bash
zentao docs edit \
  --docID 1001 \
  --title "登录接口文档" \
  --content "更新后的文档内容"

zentao docs editModule \
  --moduleID 111 \
  --libID 1 \
  --moduleName "登录接口"
```

### 附件和图片

读取附件或图片内容：

```bash
zentao file read --fileID 100 --fileType png
```

### 脚本化示例

```bash
zentao bugs list --productID 1 --browseType unclosed --limit 50 \
  | jq '.[] | {id, title, severity, pri, assignedTo}'
```

写操作建议遵循以下流程：

1. 使用 `list` 或 `view` 确认目标 ID。
2. 执行 `create`、`resolve`、`close` 或 `edit`。
3. 再次使用 `view` 验证结果。

## 💬 使用示例

配置完成后，你可以用自然语言与 AI 交流来管理禅道：

### Bug 相关

```
> "帮我看下有哪些 Bug 还没修复"
> "查看 Bug #123 的详细信息"
> "我已经修复了 Bug #123，帮我关闭它"
> "在产品 1 创建一个 Bug：登录页面按钮点击无响应"
```

### 需求相关

```
> "列出产品 1 的需求"
> "有哪些正在进行中的需求？"
> "创建一个新需求：用户登录功能优化"
```

### 测试用例相关

```
> "帮我看下有哪些测试用例"
> "创建一个登录功能的测试用例"
> "删除测试用例 #5"
```

## 🛠️ 可用工具列表

### Bug 管理

| 工具名称                   | 描述                        |
| -------------------------- | --------------------------- |
| `zentao_get_bugs`          | 获取 Bug 列表，支持状态筛选 |
| `zentao_get_active_bugs`   | 获取未解决的 Bug 列表       |
| `zentao_get_assigned_bugs` | 获取指派给某人的 Bug        |
| `zentao_get_bug`           | 获取 Bug 详情               |
| `zentao_create_bug`        | 创建新 Bug                  |
| `zentao_resolve_bug`       | 解决 Bug                    |
| `zentao_close_bug`         | 关闭 Bug                    |
| `zentao_activate_bug`      | 激活 Bug                    |
| `zentao_confirm_bug`       | 确认 Bug                    |

### 需求管理

| 工具名称                    | 描述             |
| --------------------------- | ---------------- |
| `zentao_get_stories`        | 获取需求列表     |
| `zentao_get_active_stories` | 获取进行中的需求 |
| `zentao_get_story`          | 获取需求详情     |
| `zentao_create_story`       | 创建新需求       |
| `zentao_close_story`        | 关闭需求         |
| `zentao_activate_story`     | 激活需求         |

### 测试用例管理

| 工具名称                 | 描述             |
| ------------------------ | ---------------- |
| `zentao_get_testcases`   | 获取测试用例列表 |
| `zentao_get_testcase`    | 获取测试用例详情 |
| `zentao_create_testcase` | 创建测试用例     |
| `zentao_update_testcase` | 修改测试用例     |
| `zentao_delete_testcase` | 删除测试用例     |

### 产品和项目

| 工具名称                | 描述         |
| ----------------------- | ------------ |
| `zentao_get_products`   | 获取产品列表 |
| `zentao_get_projects`   | 获取项目列表 |
| `zentao_get_executions` | 获取执行列表 |

## 📝 状态说明

### Bug 状态

| 状态       | 描述            |
| ---------- | --------------- |
| `active`   | 未解决/激活状态 |
| `resolved` | 已解决，待验证  |
| `closed`   | 已关闭          |

### 需求状态

| 状态        | 描述        |
| ----------- | ----------- |
| `draft`     | 草稿        |
| `active`    | 激活/进行中 |
| `changed`   | 已变更      |
| `reviewing` | 评审中      |
| `closed`    | 已关闭      |

### 测试用例状态

| 状态          | 描述   |
| ------------- | ------ |
| `wait`        | 待评审 |
| `normal`      | 正常   |
| `blocked`     | 被阻塞 |
| `investigate` | 研究中 |

## ⚠️ 注意事项

1. **权限**：确保配置的账号有足够的权限进行相应操作
2. **SSL 证书**：如果禅道使用自签名证书，需要设置 `ZENTAO_SKIP_SSL=true`
3. **密码安全**：不要将配置文件提交到公开的版本控制系统
