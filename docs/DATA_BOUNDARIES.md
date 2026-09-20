# LS LAB Phase 2 Data Boundaries

## Required separation

LS LAB must maintain four data classes. The same display must never imply that all labels have equal authority or that a public source link grants permission to transform source content.

| Class | Permitted Phase 2 examples | Browser rule | Server rule | Current implementation |
| --- | --- | --- | --- | --- |
| `PUBLIC_METADATA` | University name, campus, region, year, public track label, source title, checked date, source status, canonical official URL. | May be sent to a public page with origin and source-status labels. | Future public API may return it with versioned provenance. | Five reviewed fixtures only. |
| `SYNTHETIC_CONTENT` | Mock question, short mock passages, draft text placeholder, mock feedback, mock pattern signals. | May be displayed only with durable mock labels. | May support UX tests; cannot become a model claim or official label. | Used for writing/evaluation UI. |
| `USER_PRIVATE_DATA` | Future student draft, attempt, revision, result, pattern signal, consent, retention/deletion status. | Only the authenticated owner may access their own record. | Must use explicit user scope, audit, deletion, and retention rules. | Not collected or stored. Current draft is local-only mock storage. |
| `PRIVATE_SOURCE_DERIVED_ASSET` / `PRIVATE_EVALUATION_ASSET` | Extracted source structure, source page ranges, answer key, rubric, benchmark, evaluator prompt, provider configuration. | Never serialized into client code, API response, log, analytics event, or page props. | Restricted server-only storage and review workflow. | Not created, not stored, not called. |

## Origin labels

| Display label | Meaning | Current use |
| --- | --- | --- |
| 공식 확인 | A public metadata field or official navigation record has an identified official source. | Public fixture metadata. |
| LS LAB 분석 | A future LS LAB normalization or learning criterion; never an official fact by default. | Reserved vocabulary only. |
| AI 평가 | A future provider output with a package/version and release gate. | Reserved vocabulary only. |
| 사람 검수 | A human reviewer has verified the declared scope. | Reserved vocabulary only. |
| 합성 예시 | UX-only fixture unrelated to an actual university question or student outcome. | Current question, passages, feedback, and pattern signals. |
| 자료 확인 필요 | A public navigation or taxonomy detail needs rechecking before a stronger claim. | Some source links and taxonomy labels. |

## Quick Link safety

A canonical official archive/notice link is preferred over a volatile direct attachment. `UNSTABLE_SESSION_LINK`, `BROKEN`, and `REVIEW_REQUIRED` do not authorize direct-file behavior. The UI makes recheck status visible and opens external sources in a new browser context. It does not embed remote documents, use a WebView, mirror files, make fetch requests to official sources, or transmit their content to another service.

## Temporary local draft policy

The `temporaryDraftStore` is marked `client-only` and writes to browser `localStorage`. It exists solely to make the editor interaction demonstrable. It is not an account feature, backup, sync, recovery mechanism, privacy promise, or durable student record. Replace it only after shared identity and personal-data policy approval.

## Static enforcement

`pnpm verify:boundaries` fails when a Client Component imports `src/server`, when a server module lacks `server-only`, when previous prototype runtime dependencies are reintroduced, or when common secret-like tokens appear in the TypeScript source. The audit is a defense-in-depth check; it does not substitute for a production secret-management and bundle-inspection review.
