# OpenCode 的 LMM OAuth 插件

最低插件 API 为 OpenCode **1.18.34**，这是本地已验证基线版本。CI 同时验证基线和 npm 最新稳定版，不人为拒绝更新版本。插件是独立 Git 仓库，已包含 `dist/index.js`，无需 npm 发布。

## 安装与登录

使用 LMM Scripts 的 OpenCode 安装配置脚本，或克隆本仓库后把下列配置合并到 `opencode.json`：

```json
{"plugin":["file:///绝对路径/opencode-lmm-auth/dist/index.js"]}
```

运行 `opencode auth login --provider lmm`，选择 OAuth 浏览器登录。OpenCode 1.18.34 的 TUI `/connect` 不展示未授权且没有模型的自定义提供方，所以首次登录使用此 CLI 命令。浏览器与 OpenCode 必须运行在同一台机器上，三分钟内完成授权。登录后重启 OpenCode，从 `/models` 选择 LMM 模型。无需复制 API Key。

服务端必须启用 OAuth CLI 功能并登记 `lmm-opencode` 客户端。插件不使用 Pi 的客户端 ID。

## 模型与安全

内置 models.dev 的 135 个明确能力配置。仅展示授权目录中匹配的模型，价格和计费组来自 LMM；不猜未知模型能力或把未知价格显示为零。支持 OpenAI Chat、Responses 和 Anthropic Messages，每个模型选择对应 SDK，调用时恢复真实模型名并附带授权计费组。

PKCE、回调 state/issuer 校验、刷新轮换、重复刷新阻止、流式输出和取消均已实现。OpenCode 保存凭据，插件在配置阶段读取其原生 `$XDG_DATA_HOME/opencode/auth.json`（默认 `~/.local/share/opencode/auth.json`），没有第二份凭据文件。刷新标记只保存摘要，位于 `~/.local/state/opencode-lmm-auth/refresh`；不要删除标记后重试刷新。移除本地凭据不等于服务端撤销授权。

## 验证

```sh
npm ci --ignore-scripts
npm run build
npm test
npm run typecheck
npm run pack:check
OPENCODE_BIN=/实际路径/opencode-1.18.34 npm run test:host
OPENCODE_BIN=/实际路径/opencode-1.18.34 npm run test:integration
```

真实宿主集成测试使用隔离的凭据目录与受信任的本地 TLS 服务，覆盖 PKCE 登录、回调、原生凭据保存、重启、授权目录、三种 SDK 和完整流式输出，同时核对真实模型名、授权组和凭据头。测试不会消费生产额度。生产浏览器登录及实际计费需要对应服务端版本部署后另行验收。

完整协议、限制与官方参考见 [English README](README.md)。许可证为 AGPL-3.0-only。

Windows 刷新使用独占创建并 fsync 的标记文件，阻止并发和进程重启后的重复交换。突然断电时目录持久性弱于 Linux/macOS 的目录 fsync；不要删除标记重试。

旧授权撤销、目录不可用或刷新被阻止时，仅停用 LMM 模型，保留 CLI 登录入口及其他提供方。重新运行上述登录命令后重启 OpenCode。
