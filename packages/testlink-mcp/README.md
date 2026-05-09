# TestLink MCP Server

让 AI 助手能够直接管理 TestLink 中的测试项目、测试套件、测试用例、测试计划、构建、执行结果和需求。通过 MCP (Model Context Protocol)，你可以用自然语言与 AI 交流来查询、创建、更新和维护 TestLink 测试资产。

## ✨ 功能特性

### 测试项目管理

- 📋 获取 TestLink 测试项目列表
- 🔎 为后续套件、计划、需求操作定位项目 ID

### 测试套件管理

- 📋 获取项目下的一级测试套件
- 🔍 查看测试套件详情
- ➕ 创建测试套件
- 🌲 创建嵌套测试套件
- ✏️ 更新测试套件名称和描述

### 测试用例管理

- 🔍 查看测试用例详情
- 📋 获取测试套件下的测试用例
- ➕ 创建测试用例
- ✏️ 更新测试用例名称、摘要、前置条件、步骤、重要性、执行类型和状态
- 🗑️ 标记测试用例为废弃
- 🆔 支持数字 ID 和外部 ID（如 `PREFIX-123`）

### 测试计划管理

- 📋 获取项目下的测试计划
- ➕ 创建测试计划
- 📋 获取测试计划中的测试用例
- 🔗 将测试用例加入测试计划
- 🗑️ 删除测试计划

### 构建与执行管理

- 📋 获取测试计划下的构建
- ➕ 创建构建
- 🔒 关闭构建
- 📊 获取测试执行结果
- ✅ 记录测试执行结果

### 需求管理

- 📋 获取项目下的需求
- 🔍 查看需求详情

## 🚀 快速开始

### 方式一：使用 npx（推荐）

无需安装，直接在 MCP 客户端配置中使用：

#### Cursor 配置

编辑 `~/.cursor/mcp.json`（Windows: `%USERPROFILE%\.cursor\mcp.json`）：

```json
{
  "mcpServers": {
    "testlink": {
      "command": "npx",
      "args": ["-y", "@acehubert/testlink-mcp"],
      "env": {
        "TESTLINK_URL": "https://your-testlink-server.com/testlink",
        "TESTLINK_API_KEY": "your_api_key"
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
    "testlink": {
      "command": "npx",
      "args": ["-y", "@acehubert/testlink-mcp"],
      "env": {
        "TESTLINK_URL": "https://your-testlink-server.com/testlink",
        "TESTLINK_API_KEY": "your_api_key"
      }
    }
  }
}
```

### 方式二：全局安装

```bash
npm install -g @acehubert/testlink-mcp
```

全局安装后会提供两个命令：

- `testlink-mcp`：启动 MCP Server，用于接入 MCP 客户端。
- `testlink`：命令行工具，用于在终端直接操作 TestLink。

然后在 MCP 配置中使用：

```json
{
  "mcpServers": {
    "testlink": {
      "command": "testlink-mcp",
      "env": {
        "TESTLINK_URL": "https://your-testlink-server.com/testlink",
        "TESTLINK_API_KEY": "your_api_key"
      }
    }
  }
}
```

### 方式三：从源码运行

1. 克隆项目并安装依赖：

```bash
git clone https://github.com/aceHuber/testlink-mcp.git
cd testlink-mcp
yarn install
yarn build
```

2. 在 MCP 配置中使用本地路径：

```json
{
  "mcpServers": {
    "testlink": {
      "command": "node",
      "args": ["/path/to/testlink-mcp/dist/index.js"],
      "env": {
        "TESTLINK_URL": "https://your-testlink-server.com/testlink",
        "TESTLINK_API_KEY": "your_api_key"
      }
    }
  }
}
```

## ⚙️ 环境变量说明

| 变量名             | 必填 | 说明                                                          |
| ------------------ | ---- | ------------------------------------------------------------- |
| `TESTLINK_URL`     | ✅   | TestLink 服务地址，通常包含 `/testlink` 路径                  |
| `TESTLINK_API_KEY` | ✅   | TestLink 个人 API Key，可在 TestLink 个人设置中获取或重新生成 |

也可以通过启动参数传入：

```bash
testlink-mcp \
  --url "https://your-testlink-server.com/testlink" \
  --apiKey "your_api_key"
```

## 💻 CLI 使用说明

`testlink` CLI 适合在终端中做一次性查询、脚本化检查和小批量维护。

安装：

```bash
npm install -g @acehubert/testlink-mcp
testlink --version
```

推荐使用本地配置或环境变量配置连接信息，避免 API Key 进入普通业务命令的 shell 历史：

```bash
testlink config set url "https://your-testlink-server.com/testlink"
testlink config set apiKey "your_api_key"
testlink config get
testlink config get url
testlink config remove apiKey
```

解析优先级为：命令行参数 > 本地配置 > 环境变量。
MCP Server 和 CLI 共用同一份本地配置，因此 `config set` 后无需再为 MCP 单独配置同样的值。

也可以使用环境变量配置连接信息：

```bash
export TESTLINK_URL="https://your-testlink-server.com/testlink"
export TESTLINK_API_KEY="your_api_key"
```

也可以在命令行中临时传入连接参数：

```bash
testlink projects list \
  --url "https://your-testlink-server.com/testlink" \
  --apiKey "your_api_key"
```

基本格式：

```bash
testlink <resource> <action> [arguments] [flags]
```

查看帮助：

```bash
testlink --help
testlink --version
testlink cases --help
testlink suites --help
testlink plans --help
```

CLI 输出为格式化 JSON，方便结合 `jq` 或脚本继续处理。

### 测试项目

```bash
testlink projects list
```

### 测试套件

查询：

```bash
testlink suites list --projectId 1
testlink suites view --suiteId 10
```

创建：

```bash
testlink suites create \
  --projectId 1 \
  --suiteName "登录模块" \
  --details "登录相关测试套件"
```

创建子套件：

```bash
testlink suites create \
  --projectId 1 \
  --suiteName "手机号验证码登录" \
  --parentId 10
```

更新：

```bash
testlink suites update \
  --suiteId 10 \
  --projectId 1 \
  --data '{"name":"登录测试套件","details":"更新后的套件说明"}'
```

### 测试用例

`data` 参数需要传入 JSON 对象字符串。测试用例 ID 支持数字 ID 和外部 ID。

查询：

```bash
testlink cases list-in-suite --suiteId 10
testlink cases view --testCaseId PREFIX-123
```

创建：

```bash
testlink cases create \
  --data '{"testprojectid":"1","testsuiteid":"10","name":"手机号验证码登录成功","authorlogin":"qa","summary":"验证手机号验证码登录流程","steps":[{"step_number":1,"actions":"输入手机号","expected_results":"手机号格式正确"},{"step_number":2,"actions":"输入验证码并提交","expected_results":"登录成功"}],"importance":2,"execution_type":1}'
```

更新：

```bash
testlink cases update \
  --testCaseId PREFIX-123 \
  --data '{"summary":"更新后的用例摘要","importance":3}'
```

标记为废弃：

```bash
testlink cases delete --testCaseId PREFIX-123
```

> TestLink XML-RPC 客户端不提供直接删除测试用例的方法，`cases delete` 会将用例状态标记为废弃。

### 测试计划

查询：

```bash
testlink plans list --projectId 1
testlink plans list-cases --planId 20
```

创建：

```bash
testlink plans create \
  --data '{"project_id":"PROJECT_PREFIX","name":"回归测试计划","notes":"主干回归测试计划","active":1,"is_public":1}'
```

添加测试用例：

```bash
testlink plans add-case \
  --data '{"testcaseid":"PREFIX-123","testplanid":"20","testprojectid":"1","version":1,"urgency":2}'
```

删除：

```bash
testlink plans delete --planId 20
```

### 构建

查询：

```bash
testlink builds list --planId 20
```

创建：

```bash
testlink builds create \
  --data '{"plan_id":"20","name":"2026.04.24","notes":"发布验证构建","active":1,"open":1}'
```

关闭：

```bash
testlink builds close --buildId 30
```

### 执行结果

查询：

```bash
testlink executions list --planId 20
testlink executions list --planId 20 --buildId 30
```

记录结果：

```bash
testlink executions create \
  --data '{"test_case_id":"PREFIX-123","plan_id":"20","build_id":"30","status":"p","notes":"测试环境验证通过"}'
```

常见执行状态：

- `p`：通过
- `f`：失败
- `b`：阻塞

### 需求

```bash
testlink requirements list --projectId 1
testlink requirements view --projectId 1 --requirementId 100
```

### 脚本化示例

```bash
testlink cases list-in-suite --suiteId 10 \
  | jq '.[] | {id, external_id, name}'
```

写操作建议遵循以下流程：

1. 使用 `list` 或 `view` 确认目标 ID。
2. 执行 `create`、`update`、`delete`、`close` 或 `create execution`。
3. 再次使用 `view` 或 `list` 验证结果。

## 💬 使用示例

配置完成后，你可以用自然语言与 AI 交流来管理 TestLink：

### 测试项目和套件

```text
> "帮我列出 TestLink 中所有测试项目"
> "查看项目 1 下有哪些测试套件"
> "在项目 1 下创建一个登录模块测试套件"
```

### 测试用例

```text
> "查看测试用例 PREFIX-123 的详细信息"
> "列出套件 10 下的所有测试用例"
> "创建一个手机号验证码登录成功的测试用例"
> "把测试用例 PREFIX-123 的重要性改成高"
```

### 测试计划和构建

```text
> "列出项目 1 的测试计划"
> "把用例 PREFIX-123 加入测试计划 20"
> "为测试计划 20 创建一个今天的构建"
> "关闭构建 30"
```

### 执行结果和需求

```text
> "查看测试计划 20 在构建 30 下的执行结果"
> "记录用例 PREFIX-123 在构建 30 中执行通过"
> "列出项目 1 下的需求"
> "查看需求 100 的详细信息"
```

## 🛠️ 可用工具列表

### 测试项目

| 工具名称        | 描述                   |
| --------------- | ---------------------- |
| `list_projects` | 获取所有 TestLink 项目 |

### 测试套件

| 工具名称                   | 描述                       |
| -------------------------- | -------------------------- |
| `list_test_suites`         | 获取项目下的一级测试套件   |
| `read_test_suite`          | 查看测试套件详情           |
| `list_test_cases_in_suite` | 获取测试套件下的测试用例   |
| `create_test_suite`        | 创建测试套件，支持父级套件 |
| `update_test_suite`        | 更新测试套件名称和描述     |

### 测试用例

| 工具名称                   | 描述                     |
| -------------------------- | ------------------------ |
| `read_test_case`           | 查看测试用例详情         |
| `create_test_case`         | 创建测试用例             |
| `update_test_case`         | 更新测试用例             |
| `delete_test_case`         | 将测试用例标记为废弃     |
| `list_test_cases_in_suite` | 获取测试套件下的测试用例 |

### 测试计划

| 工具名称                       | 描述                     |
| ------------------------------ | ------------------------ |
| `list_test_plans`              | 获取项目下的测试计划     |
| `create_test_plan`             | 创建测试计划             |
| `delete_test_plan`             | 删除测试计划             |
| `get_test_cases_for_test_plan` | 获取测试计划中的测试用例 |
| `add_test_case_to_test_plan`   | 将测试用例加入测试计划   |

### 构建和执行

| 工具名称                | 描述               |
| ----------------------- | ------------------ |
| `list_builds`           | 获取测试计划下构建 |
| `create_build`          | 创建构建           |
| `close_build`           | 关闭构建           |
| `read_test_execution`   | 获取测试执行结果   |
| `create_test_execution` | 记录测试执行结果   |

### 需求

| 工具名称            | 描述             |
| ------------------- | ---------------- |
| `list_requirements` | 获取项目下的需求 |
| `get_requirement`   | 查看需求详情     |

## 📝 参数说明

### 测试用例 ID

`read_test_case`、`update_test_case`、`delete_test_case`、`create_test_execution` 等操作支持两种用例 ID：

| 格式    | 示例         | 说明                 |
| ------- | ------------ | -------------------- |
| 数字 ID | `123`        | TestLink 内部用例 ID |
| 外部 ID | `PREFIX-123` | TestLink 外部用例 ID |

### 测试用例重要性

常见值：

| 值  | 描述 |
| --- | ---- |
| `1` | 低   |
| `2` | 中   |
| `3` | 高   |

### 测试执行类型

常见值：

| 值  | 描述 |
| --- | ---- |
| `1` | 手工 |
| `2` | 自动 |

### 执行状态

常见值：

| 状态 | 描述 |
| ---- | ---- |
| `p`  | 通过 |
| `f`  | 失败 |
| `b`  | 阻塞 |

## ⚠️ 注意事项

1. **权限**：确保配置的 TestLink 账号有足够权限进行相应操作。
2. **API Key 安全**：不要将 `TESTLINK_API_KEY` 提交到公开仓库、日志或脚本中。
3. **URL 路径**：`TESTLINK_URL` 通常需要包含 TestLink 部署路径，如 `https://example.com/testlink`。
4. **删除语义**：测试用例删除会标记为废弃；删除测试计划是真实删除操作，执行前请确认影响范围。
5. **构建关闭**：关闭构建会阻止继续记录新执行结果，生产环境操作前请确认。
6. **批量操作**：批量更新、关闭构建、删除计划或记录执行结果前，应先查询并确认目标 ID。

## 🧑‍💻 开发

安装依赖：

```bash
yarn install
```

类型检查：

```bash
yarn typecheck
```

代码检查：

```bash
yarn lint
```

构建：

```bash
yarn build
```

本地启动 MCP Server：

```bash
TESTLINK_URL="https://your-testlink-server.com/testlink" \
TESTLINK_API_KEY="your_api_key" \
yarn dev
```
