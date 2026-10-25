# OpenCode 与 Magpie 的 LMM OAuth 插件

最低插件 API 为 OpenCode **1.18.34**，这是本地已验证基线版本。CI 同时验证基线和 npm 最新稳定版，不人为拒绝更新版本。插件是独立 Git 仓库，已包含可直接加载的 `dist/index.js`，同时支持 Magpie。

## 在 Magpie 中安装与登录

```sh
magpie plugin add @tokennotincluded/opencode-lmm-auth
magpie plugin login lmm
magpie provider test lmm
```

仓库已经加上 `magpie-plugin` topic，根目录保留构建后的入口；如果 npm
策略暂时阻止包安装，也可以直接使用 GitHub：

```sh
magpie plugin add github:TokenNotIncluded/opencode-lmm-auth
```

Magpie 将 OAuth 凭据保存在私有的 `plugin-auth.json`，无需复制 API Key。登录后，LMM 账号授权的目录会按账号刷新，模型以 `lmm/<模型>` 形式提供给各个 Agent。插件会保留每个模型的协议、上下文/输出限制、能力和目录价格。桌面端也可以在 Settings → Plugins 添加它。

## 在 OpenCode 中安装与登录

使用 LMM Scripts 的 OpenCode 安装配置脚本，或克隆本仓库后把下列配置合并到 `opencode.json`：

```json
{"plugin":["file:///绝对路径/opencode-lmm-auth/dist/index.js"]}
```

运行 `opencode auth login --provider lmm`，选择 OAuth 浏览器登录。OpenCode 1.18.34 的 TUI `/connect` 不展示未授权且没有模型的自定义提供方，所以首次登录使用此 CLI 命令。浏览器与 OpenCode 必须运行在同一台机器上，三分钟内完成授权。登录后重启 OpenCode，从 `/models` 选择 LMM 模型。无需复制 API Key。

服务端必须启用 OAuth CLI 功能并登记 `lmm-opencode` 客户端。插件不使用 Pi 的客户端 ID。

## 模型与安全

内置 models.dev 的 135 个明确能力配置。展示授权目录中有精确能力资料的模型；静态价格使用 LMM 账户实际目录价格，动态/表达式计费的模型使用内置精确 models.dev 供应商参考价（宿主提供的精确价格会覆盖它），并明确标注“LMM 动态计费”，参考价不是 LMM 报价。未知、按请求计费且没有安全参考价的模型不会伪装成免费模型。支持 OpenAI Chat、Responses 和 Anthropic Messages，每个模型选择对应 SDK，调用时恢复真实模型名并附带授权计费组。Magpie 会在加载请求传输前调用按账号的模型目录钩子。

PKCE、回调 state/issuer 校验、刷新轮换、重复刷新阻止、流式输出和取消均已实现。OpenCode 保存原生凭据，Magpie 保存账号范围的 `plugin-auth.json`，插件不再写第二份凭据。OpenCode 模式下插件读取 `$XDG_DATA_HOME/opencode/auth.json`（默认 `~/.local/share/opencode/auth.json`）；Magpie 模式下则由宿主传入当前账号。刷新标记只保存摘要，位于 `~/.local/state/opencode-lmm-auth/refresh`；不要删除标记后重试刷新。移除本地凭据不等于服务端撤销授权。

## 验证

```sh
npm ci --ignore-scripts
npm run build
npm test
npm run typecheck
npm run pack:check
OPENCODE_BIN=/实际路径/opencode-1.18.34 npm run test:host
OPENCODE_BIN=/实际路径/opencode-1.18.34 npm run test:integration
# Magpie 隔离目录加载检查
sb=$(mktemp -d)
env HOME="$sb" XDG_CONFIG_HOME="$sb/.config" XDG_CACHE_HOME="$sb/.cache" \
  magpie plugin add @tokennotincluded/opencode-lmm-auth
env HOME="$sb" XDG_CONFIG_HOME="$sb/.config" XDG_CACHE_HOME="$sb/.cache" \
  magpie plugin --json
```

真实宿主集成测试使用隔离的凭据目录与受信任的本地 TLS 服务，覆盖 PKCE 登录、回调、原生凭据保存、重启、授权目录、三种 SDK 和完整流式输出，同时核对真实模型名、授权组和凭据头。测试不会消费生产额度。生产浏览器登录及实际计费需要对应服务端版本部署后另行验收。

完整协议、限制与官方参考见 [English README](README.md)。许可证为 AGPL-3.0-only。

Windows 刷新使用独占创建并 fsync 的标记文件，阻止并发和进程重启后的重复交换。突然断电时目录持久性弱于 Linux/macOS 的目录 fsync；不要删除标记重试。

旧授权撤销、目录不可用或刷新被阻止时，仅停用 LMM 模型，保留 CLI 登录入口及其他提供方。重新运行上述登录命令后重启 OpenCode。
