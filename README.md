# MCP Tools Monorepo

AI 助手工具集 — 通过 MCP (Model Context Protocol) 让 AI 客户端管理禅道、TestLink、Apifox 等平台。

## 📦 Packages

| 包名                                               | 版本  | 说明                      |
| -------------------------------------------------- | ----- | ------------------------- |
| [@acehubert/zentao-api](./packages/zentao-api)     | 0.5.0 | 禅道 API 调用模块         |
| [@acehubert/zentao-mcp](./packages/zentao-mcp)     | 0.5.0 | 禅道 MCP Server & CLI     |
| [@acehubert/testlink-mcp](./packages/testlink-mcp) | 0.1.0 | TestLink MCP Server & CLI |
| [@acehubert/apifox-mcp](./packages/apifox-mcp)     | 0.1.0 | Apifox MCP Server & CLI   |

## 🛠 开发

```bash
yarn install
yarn build
yarn typecheck
yarn lint
yarn test
```

版本管理采用 **lerna independent** 模式，各包独立发版。

```bash
yarn release          # 交互式发布
yarn release:git      # 从 git tag 发布
yarn release:alpha    # 发布 alpha 预发版
```

## 📋 Changelog

详见各包目录下的 CHANGELOG.md，或查看根目录 [CHANGELOG.md](./CHANGELOG.md)。

## 📄 License

MIT
