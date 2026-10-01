# LMM OAuth for OpenCode

An independently versioned OpenCode OAuth plugin. Uses the OpenCode plugin API available since **1.18.34**, the last locally
verified version. Baseline and current stable npm versions run in CI. Newer
versions are accepted; an actually missing runtime API produces a specific error. [中文](README.zh-CN.md).

Sign in to [LMM](https://api.lmm.best) through OpenCode's native OAuth menu; no API
key needs to be copied. The provider supports catalog-advertised OpenAI chat,
OpenAI Responses and Anthropic Messages protocols with explicit model/group
routing. PKCE S256, issuer-bound discovery, state/issuer callback checks,
refresh-token rotation and streaming/cancellation are supported.

## Install

Use the LMM Scripts OpenCode installer, or clone this repository at a reviewed
commit and merge its built entry into your `opencode.json`:

```jsonc
{
  "plugin": ["file:///ABSOLUTE/PATH/opencode-lmm-auth/dist/index.js"]
}
```

Run `opencode auth login --provider lmm`, then select **Sign in with LMM (OAuth)**. Complete browser sign-in and consent within three minutes.
The browser and OpenCode server must run on the same machine for the loopback
callback. Restart OpenCode after connecting, then select LMM under `/models`.
No npm publication is required: this repository includes the built plugin.

The API server must register public OAuth client `lmm-opencode` and enable its
issuer, CLI feature flags and group allowlists. The Pi client cannot substitute
for the OpenCode registration.

135 exact model capability profiles from models.dev are bundled, with source
URLs and explicit limits. Only matching entries from your authorized LMM catalog
are advertised; the catalog supplies billing groups and current prices. Unknown
models or unsupported pricing are omitted. Additional verified profiles can be
merged under `provider.lmm.models` with context/output limits, capability booleans
and `options.lmmApi` (`openai-completions`, `openai-responses` or
`anthropic-messages`). The plugin chooses the matching SDK per catalog model.

A trusted alternative issuer can be supplied with the plugin tuple
`["file:///…/dist/index.js", {"issuer":"https://YOUR-ISSUER"}]`; it must register
the same client. Issuer changes require a fresh CLI login.

## Credentials and limitations

OpenCode owns the persisted OAuth access and refresh credentials. The plugin
reads OpenCode 1.18.34's native `$XDG_DATA_HOME/opencode/auth.json` (default
`~/.local/share/opencode/auth.json`) during configuration because this host
passes a deep copy to auth.loader; loader model mutations cannot register models.
It never writes a second credential file. The `refresh`
field is a versioned JSON envelope containing the actual refresh token, trusted
issuer/resource and granted scopes. It is still a secret; never paste or log it.
The credential-free rotation journal is under
`~/.local/state/opencode-lmm-auth/refresh/`. Do not delete its markers to retry a
failed refresh. Concurrent processes cannot exchange the same refresh token.
A lost response, crash or failed host save requires a fresh `opencode auth login --provider lmm`.

Only static USD per-million-token prices with a complete `native_cost` are
admitted. Unknown, dynamic, expression-based and request-based prices are
excluded instead of shown as zero. Prices already include group/trust
multipliers and are not locked quotes. Configure no API keys for this provider;
the plugin strips alternate credential headers and refuses redirects, URL
credentials, unsupported endpoints, unknown models and group substitutions.
There is no credential fallback, cross-group retry, MCP or marketplace support.

Removing credentials from OpenCode does not itself revoke the server's grant.
Server revocation uses the registered client's `/api/oauth2/revoke` endpoint;
server revocation/billing behavior is covered by the backend tests. This preview
does not add a dedicated OpenCode revoke UI.

## Verify

```sh
npm test
npm run typecheck
npm run build
npm run pack:check
OPENCODE_BIN=/path/to/opencode-1.18.34 npm run test:host
OPENCODE_BIN=/path/to/opencode-1.18.34 npm run test:integration
# From apps/api-go in the parent checkout:
go test ./router -run 'TestOAuthOpenCode|TestOAuthHTTPDiscoveryAndDisabled|TestOAuthCLI' -count=1
```

The host smoke verifies unauthenticated loading and the native OAuth menu.
`npm run test:integration` starts the real OpenCode 1.18.34 binary with an
isolated native credential store and trusted local TLS fixture. It performs
PKCE OAuth callback/token persistence, restart, authorized model catalog,
per-model SDK selection and complete streamed responses for all three protocols.
The fixture asserts upstream model IDs, billing group headers and credentials.
No paid inference is performed by this test. Live production OAuth/inference
acceptance is separate and depends on the deployed server revision.

Reference APIs: [OpenCode 1 plugins](https://opencode.ai/docs/plugins/),
[OpenCode providers](https://opencode.ai/docs/providers/),
[official plugin types](https://github.com/anomalyco/opencode/blob/dev/packages/plugin/src/index.ts).
The standalone callback, HTTP and refresh-journal primitives were adapted from
this project's AGPL Pi provider. This package retains AGPL-3.0-only; see LICENSE.

Windows refresh uses an exclusive, fsynced marker file. Concurrency and process-crash replay are fenced; sudden-power-loss directory durability is weaker than the directory-fsync path on Linux/macOS. Never remove marker files to retry.

OpenCode 1.18.34 does not list an unconnected model-less provider in its TUI `/connect` dialog. Use the native CLI login command above. Revoked or unavailable LMM credentials disable only LMM models, leaving login and other providers available.
