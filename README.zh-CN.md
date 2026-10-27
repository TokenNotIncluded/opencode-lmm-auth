# OpenCode 与 Magpie 的 LMM OAuth 插件

<img src="https://raw.githubusercontent.com/TokenNotIncluded/opencode-lmm-auth/main/assets/icon.svg" alt="OpenCode 与 Magpie 的 LMM 插件标志" width="128" height="128" />

支持官方 **OpenCode 2.1.4**（`@opencode/cli`）与 Magpie。原生 V2 `/server` 入口遵循官方 `@opencode/plugin@2.1.4` 接口；默认入口供 Magpie 使用，并为旧版 OpenCode **1.18.34** 保留有限支持：授权目录、OAuth 登录和重新连接仍可用，但**所有旧版推理和自动 OAuth 刷新均已禁用，包括持有有效凭据时的推理**。插件独立维护，包内包含两个构建入口。本地 fixture 自测与独立验收分开，这个预览不代表生产验收完成。

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

## 在官方 OpenCode 2.1.4 中安装与登录

使用已经审查、构建的包目录（例如从已审查 npm tarball 安装的目录），把下列配置合并到 `opencode.json`：

```json
{
  "plugins": [{
    "package": "/绝对路径/opencode-lmm-auth",
    "options": {"issuer": "https://api.lmm.best"}
  }]
}
```

`package` 指向含 `package.json` 与 `server.js` 的目录。官方 2.1.4 优先解析服务端入口：npm 包使用 `./server` 导出，本地目录使用根目录 `server.js` 包装入口，两者都加载 `dist/opencode-v2.js`。默认 `dist/index.js` 继续供 Magpie/v1 使用。V2 配置键是复数 `plugins`，下面旧版示例才使用 `plugin`。

```sh
opencode auth login lmm --method oauth
```

三分钟内完成浏览器授权，浏览器与 OpenCode 服务端须位于同一台机器以接收回环回调。连接后选择 LMM 模型。原生宿主管理账号选择、凭据持久化和刷新；插件提供当前账号的模型目录并使用宿主内置的 Chat、Responses、Anthropic 传输。目录在凭据事件和每 60 秒重新读取。撤销后移除 LMM 模型，使用同一登录命令重新连接。V2 实现通过官方会话重试钩子为 LMM 设置 `retry: false`；这只是实现说明，本轮真实 V2 应用的重试行为为 **NOT_RUN（未运行）**。

`issuer` 可省略，默认 `https://api.lmm.best`。可信替代 HTTPS issuer 必须登记相同客户端，切换 issuer 后须重新登录。源码预览先运行 `npm ci --ignore-scripts` 和 `npm run build`；打包制品已经包含两个构建入口。运行时不导入开发 SDK，旧 SDK 为可选 peer，V2 安装不会自动拉入它。

## 在旧版 OpenCode 1.18.34 中安装与登录

**所有账号的旧版推理均已禁用，即使凭据有效且尚未过期；自动 OAuth 刷新也已禁用。** 该宿主没有按账号条件写入凭据的接口，也没有可靠关闭自动付费请求重试的受支持插件控制方式。插件会在刷新交换、凭据 PUT 或推理网络请求之前拒绝操作，不宣称旧版持久化具有原子性，也不改变宿主重试策略。

如需查看目录、OAuth 登录或重新连接，克隆本仓库已审查的提交，把下列默认入口配置合并到 `opencode.json`：

```json
{"plugin":["file:///绝对路径/opencode-lmm-auth/dist/index.js"]}
```

运行 `opencode auth login --provider lmm`，选择 OAuth 浏览器登录。OpenCode 1.18.34 的 TUI `/connect` 不展示未授权且没有模型的自定义提供方，所以首次登录使用此 CLI 命令。浏览器与 OpenCode 必须运行在同一台机器上，三分钟内完成授权。登录后重启 OpenCode 可加载授权目录。模型可能出现在 `/models`，但调用会返回明确的 assistant error（助手错误）。凭据过期或撤销后使用同一 CLI 命令重新登录；重新连接只恢复目录，不会启用旧版推理。推理请使用 Magpie 或 V2 集成，其应用验收另行进行。无需复制 API Key。

服务端必须启用 OAuth CLI 功能并登记 `lmm-opencode` 客户端。插件不使用 Pi 的客户端 ID。

## 模型与安全

内置 models.dev 的 135 个明确能力配置。展示授权目录中有精确能力资料的模型；静态价格使用 LMM 账户实际目录价格，动态/表达式计费的模型使用内置精确 models.dev 供应商参考价（宿主提供的精确价格会覆盖它），并明确标注“LMM 动态计费”，参考价不是 LMM 报价。未知、按请求计费且没有安全参考价的模型不会伪装成免费模型。Magpie/V2 传输实现支持 OpenAI Chat、Responses 和 Anthropic Messages，每个模型选择对应 SDK，调用时恢复真实模型名并附带授权计费组；这些目录配置不会启用旧版推理。Magpie 会在加载请求传输前调用按账号的模型目录钩子。

OAuth 登录实现 PKCE S256、issuer 绑定发现和回调 state/issuer 校验。刷新轮换、流式输出和取消属于 Magpie/V2 集成实现，旧版 1.18.34 不提供这些传输功能；本轮真实 Magpie 与 V2 应用验证均为 **NOT_RUN（未运行）**。OpenCode 保存原生凭据，Magpie 保存账号范围的 `plugin-auth.json`，插件不再写第二份凭据。V2 通过官方 integration connection API 获取当前凭据；旧版 OpenCode 1.18.34 读取 `$XDG_DATA_HOME/opencode/auth.json`（默认 `~/.local/share/opencode/auth.json`）；Magpie 模式下则由宿主传入当前账号。

刷新标记只保存摘要，位于 `~/.local/state/opencode-lmm-auth/refresh`；不要删除标记后重试刷新。标记用于阻止协作插件进程重复交换同一刷新令牌，不提供按账号条件比较并写入（CAS），也不保证账号选择与持久化的原子性。旧版自动刷新在交换和保存前直接拒绝。Magpie 显式账号 `input.auth` 与原生 `auth.refresh` 仅返回刷新字段的契约保持不变，钩子/SDK 检查不构成更广泛的宿主 CAS 保证。响应丢失、进程崩溃或宿主保存失败后需重新登录；移除本地凭据不等于服务端撤销授权。

## 验证

```sh
npm ci --ignore-scripts
npm run build
npm test
npm run typecheck
npm run pack:check
# 在临时 fixture HOME 外新建私有证据目录：
evidence=$(mktemp -d "$HOME/Backups/plugin-opencode-v2-XXXXXXXX")
chmod 700 "$evidence"
OPENCODE_V2_BIN=/绝对路径/原生opencode-2.1.4 \
  LMM_V2_TEST_OUTPUT="$evidence" npm run test:v2
# 旧版检查需要旧版程序，不能使用官方 2.1.4：
OPENCODE_BIN=/实际路径/opencode-1.18.34 npm run test:host
OPENCODE_BIN=/实际路径/opencode-1.18.34 npm run test:integration
# Magpie 隔离目录加载检查
sb=$(mktemp -d)
env HOME="$sb" XDG_CONFIG_HOME="$sb/.config" XDG_CACHE_HOME="$sb/.cache" \
  magpie plugin add @tokennotincluded/opencode-lmm-auth
env HOME="$sb" XDG_CONFIG_HOME="$sb/.config" XDG_CACHE_HOME="$sb/.cache" \
  magpie plugin --json
```

本轮真实 Magpie 与 V2 应用检查均为 **NOT_RUN（未运行）**。单元/钩子契约检查不能代替真实应用检查，也不证明宿主整体的 CAS 或重试保证。

`test:v2` 的设计范围是将当前构建文件打成实际 tgz，以 `--omit=dev --ignore-scripts` 安装到隔离 HOME，然后运行官方 2.1.4 原生宿主，检查 PKCE 登录、刷新轮换持久化与重启、三种协议的原生会话流式输出、撤销拒绝和重新连接。这是脚本设计范围，不是本轮已通过的结果。`LMM_V2_TEST_OUTPUT` 在临时 HOME 删除前保留实际使用的 tgz、SHA256、包元数据、安装日志、脱敏宿主日志和结果 JSON。指定原生二进制，避免包装脚本自动更新。

旧版宿主 smoke 检查未登录加载和原生 OAuth 菜单。本轮 `test:integration` 使用真实 1.18.34、隔离原生凭据库和可信本地 TLS fixture，验证 PKCE 回调、令牌持久化、重启和授权模型目录。对分别声明三种协议的模型，真实宿主均返回明确的 **assistant error（助手错误）**，没有成功文本或 `AbortError`；fixture 收到的**推理请求和刷新交换均为零**，原生凭据槽内容不变。测试还检查过期/撤销凭据的拒绝行为，以及真实原生 CLI PKCE 重新连接恢复目录。这验证的是安全拒绝，不是三协议完整流式推理成功；重新连接不会启用旧版推理。测试不消费生产额度。生产浏览器登录及实际计费需要对应服务端版本部署后另行验收。

开发依赖仍有四个 high npm audit 条目，根源是固定的旧版 `@opencode-ai/plugin@1.18.34` 及其 `effect`/`toml`、`zod` 依赖。npm 建议降级到 0.9.11，会破坏兼容接口，因此没有采用。旧 SDK 仅用于类型并声明为可选 peer；开发依赖审计与隔离安装后的实际依赖图分别核查。

完整协议、限制与官方参考见 [English README](README.md)。许可证为 AGPL-3.0-only。

Windows 刷新使用独占创建并 fsync 的标记文件，阻止并发和进程重启后的重复交换。突然断电时目录持久性弱于 Linux/macOS 的目录 fsync；不要删除标记重试。

旧版授权撤销或目录不可用时移除 LMM 模型；重新运行上述 CLI 登录命令并重启 OpenCode，可恢复有效凭据对应的目录。所有旧版 LMM 推理和自动刷新始终禁用，OAuth 登录、重新连接和其他提供方仍可用。
