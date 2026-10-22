# WEB UI restoration — PHASE 1 deployment candidate

Base Production: 28c9dbbd961d33a22d97eca7022eccce3e766b17, deployment 8c234d9e-0129-4944-bafa-2771c3e95b5f. Separate Owner deployment approval required. APP and evaluation work remain gated on Owner WEB acceptance.

## Cause and change

- Hanyang slug/UUID is correct. Its logged-in selector used a separate published-question path and discarded the approved student PDF descriptor. Reuse SourceExamSelection/SourceExamWriter for both identities; merge approved content only for exact existing exam UUID and question UUID set.
- SWU and KAU catalog UUIDs were null. Populate the two UUIDs observed through the existing public 71701 RPC. No database rows/IDs changed.
- Combine year/type into 학년도·시험; always display 수시논술/모의논술 including singleton periods. Place selection before schedule information.
- Remove repeated official-material links and long internal-review notices. Preserve the university header link. Hanyang now uses the browser-verified official year-by-year question archive; old official post references are retained.
- Reuse existing writer/PDF component and local draft contract. All unready rows retain disabled 첨삭 서비스 준비 중. No evaluation or submission implementation changes. Synthetic demo routes remain separate and are not linked from this university selection path.

## Evidence and limits

Read-only 71701 capture: 25 universities / 188 question-bearing exams / 656 questions; target eleven: 128 / 468. The 42-entry Catalog/order remains unchanged. Existing historical records use the same selector. No data re-registration. Twenty existing questionless exams are outside the RPC's question-bearing result, not deleted.

- Public response snapshot integration: all 188 exams and 656 question selections tested locally. Six test files / 50 tests PASS.
- Existing writer, discovery, materials, canonical catalog, student asset regressions: six files / 19 tests PASS. Final affected twelve tests rechecked after official-link change.
- Typecheck, lint, static build, Boundary, GitHub Ready audits PASS. Node 22 direct execution used for final typecheck/lint/build.
- Production logged-in Hanyang before fix: missing approved writer/PDF path reproduced in actual browser.
- Local static build browser: Hanyang 2024 admission afternoon2 approved PDF descriptor, writer entry, typed synthetic draft/local save and disabled CTA confirmed. Local API served a captured public metadata fixture; this is NOT live Production/RPC/auth/PDF-render validation. Local auth guard was not relaxed. PDF authenticated rendering awaits approved deployment.
- Hanyang official archive actual page includes 2024, 2025 and 2026 admissions exams. Other official links retain prior evidence; not all year/question destinations have been verified anew.

All internal originals and evaluation evidence remain private. Missing public problem content still requires approved content or a verified official destination. Metadata selection PASS does not establish full problem access. Existing archive analysis (5,664 archive entries and 134 classified posts) is reused; complete original-to-UUID reconciliation is unfinished and no unregistered total is asserted.

Backend: functions/ and src/server/ source diff zero. Approved Gateway SHA256 d0640668a83904f966d98dd1da584734c09cad0fe4f12c7b72d3dba83a9020ab unchanged. No DB/Storage/71702/Provider/Credit/Payment/IAP/JWT/APP changes. Production runtime/AI HOLD untouched.

## Deployment and rollback

Approval requested only for this WEB selector/content-descriptor UI candidate and two Catalog UUIDs/Hanyang official link. Use existing Pages deployment path and preserve all current variables/bindings. Verify current known-good before deployment. After approval check guest/login representative paths for Hanyang, Sookmyung, Konkuk, SKKU, Kyunghee and SWU, approved Hanyang PDF rendering, selection/HOLD and list restoration. Roll back to 8c234d9e-0129-4944-bafa-2771c3e95b5f on regression. Do not roll back data. Owner WEB acceptance precedes PHASE 2.
