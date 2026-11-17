# Native LMM provider for Magpie

The `./magpie` entry uses `client_id=lmm-magpie` and an independent installation,
grant and finite budget. It does not read OpenCode, Pi, CC Switch or browser
credentials. The existing default OpenCode entry remains separate.

Build this package, then install the explicit entry in the intended Magpie instance:

```sh
npm run build
magpie plugin add /absolute/path/to/opencode-lmm-auth/dist/magpie.js
magpie plugin login lmm-magpie
```

Use Magpie's plugin options to set `issuer` when connecting to a different trusted
HTTPS Core. Core must explicitly enable the Magpie budget ceiling, managed refresh
recovery keyring, model gateway and database permissions before advertising it.
The browser consent page selects a finite budget and groups; a copied API key is
not a native Magpie authorization.

`auth.usage` reads the current grant's consumed, reserved and remaining credits.
This is a lifetime authorization budget, with no invented daily or monthly reset.
Unavailable or inconsistent evidence produces an error and no usage window.

Before each rotation, the plugin persists one random operation ID under
`$XDG_STATE_HOME/lmm-magpie/refresh` (or `~/.local/state/lmm-magpie/refresh`).
Directories are private, records are mode 0600 and symlinks are refused. Records
contain no tokens. A lost response, host save failure or restart reuses that same
operation for up to 600 seconds; it never generates a second operation for the
same refresh token. Requests using an unresolved old token remain blocked.
After the recovery window expires, reconnect the account. Magpie owns the
account-level credential store and saves refreshed credentials to that account.

The protocol target is Magpie `0.1.2512`, upstream commit
`7da5b34aa497858bef9b6823a72d499ab375e055`. This entry implements the documented
provider lifecycle; it does not copy upstream Magpie implementation code.
Local hook tests and actual host loading are distinct from full Core/PostgreSQL,
trusted TLS, browser consent, crash recovery and physical-client acceptance.

Run `node --experimental-strip-types --test test/magpie.test.ts` for the focused
hook and local callback tests, and `node scripts/test-magpie-host.mjs` after
building for an isolated real-host loading check. Neither uses production
accounts or makes paid model calls.
