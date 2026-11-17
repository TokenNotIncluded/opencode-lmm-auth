# Dynamic OAuth model catalog

The LMM account catalog determines model availability, exact upstream IDs, authorized groups, supported protocols and account pricing. Public metadata does not grant access or remove account routes.

## Runtime metadata

All supported plugin hosts use the same dependency-free implementation maintained in `lmm-api-source/scripts/shared/models-dev.ts`. Runtime copies are checked by `node scripts/sync-provider-metadata.mjs --check`.

The public endpoint is <https://models.dev/api.json?type=all>. It includes specialized model types that the default endpoint may omit. The plugin caches validated metadata for 24 hours, revalidates with ETag, writes atomically and retains valid stale data during network failures. Concurrent callers share the download. No OAuth token, API key, Cookie or account model list is sent to models.dev.

`LMM_MODELS_DEV_CACHE` selects the cache file. `LMM_MODELS_DEV_TTL_MS` selects its lifetime. Without overrides, the cache is `lmm/models-dev-v1.json` under the platform cache directory.

## Matching and precedence

Matching tolerates case, punctuation, provider prefixes, token order, dated aliases and minor spelling differences. Numeric model versions and sizes remain distinct. Ambiguous matches remain unknown. Matching only selects reference metadata: the exact authorized upstream model and billing group are always retained on the wire.

Server fields take precedence individually. Missing server fields may be completed from models.dev or explicit local configuration. Models without reference metadata remain selectable with conservative generic limits and visible unknown metadata. Unsupported wire protocols and explicitly non-chat types/modalities remain read-only; they are counted separately in catalog diagnostics.

Account prices take priority. A reference estimate never replaces a known account rate. Numeric fields required by the host may contain placeholders when estimates are absent, accompanied by a visible incomplete-estimate label and `lmmUnknownCostFields`. Actual billing remains on the LMM server.

Catalog responses permit up to 32 MiB, aligned with the bounded 20,000-route parser. Small authentication responses retain their stricter limits.
