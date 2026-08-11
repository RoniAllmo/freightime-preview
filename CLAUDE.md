# CLAUDE.md — FreighTime Project Instructions

This file provides permanent, repository-specific operating instructions for Claude Code while working on the FreighTime project. It governs **how** Claude Code works. `PRODUCT_SPEC.md` governs **what** the product is.

## 1. Project identity

- The project name is FreighTime.
- **Update (Import Readiness Check V1 pivot, later corrected):** FreighTime's primary product is now a free Israel import-planning platform -- see `IMPORT_READINESS_V1.md`. A product-owner correction replaced the original single long technical questionnaire with a scenario-routed flow: three entry questions (personal vs. commercial import, import experience, product identity) route the user into one of five scenarios (personal import, first commercial import, existing importer, established operation, shipment-already-in-progress), each with its own focused follow-up and result -- never a universal readiness score. The Single-input tracking router described below is retained as a secondary utility, not the primary product promise.
- A user completes a short, local, deterministic Import Readiness Check to learn what information/documents/regulatory topics still need attention before purchasing, shipping, or clearing goods.
- The tracking search remains available: a user enters one shipment identifier into a central search field, the system attempts to identify the shipment type and possible carrier, and routes to an official carrier tracking page.
- Future versions may display approved API-based tracking information inside FreighTime.

## 2. Source of product truth

- `PRODUCT_SPEC.md` is the primary source of truth for product scope.
- Claude Code must read `PRODUCT_SPEC.md` before implementing any product feature.
- If a request conflicts with `PRODUCT_SPEC.md`, Claude Code must report the conflict before implementation.
- Claude Code must not silently expand product scope.
- Open product decisions must remain open unless explicitly decided by the project owner.
- `CLAUDE.md` governs how Claude Code works, while `PRODUCT_SPEC.md` governs what the product is.

## 3. Product boundaries

The first tracking MVP's customer-facing product is **not**:

- An operational chatbot
- An operational customer-facing AI assistant
- A freight quotation platform
- A freight booking platform
- A customs classification tool
- A customs brokerage application
- A general logistics information website

AI may be used to assist software development. Customer-facing AI is excluded from the first tracking MVP. `PRODUCT_SPEC.md` permits a supporting assistant in a future approved phase: such an assistant may support the shipment-tracking experience, but it must not replace the Single-input tracking router. Future assistant implementation requires explicit project-owner authorization through a separate approved development stage — it is not authorized by this file alone.

## 4. First MVP boundaries

The first MVP **may** include:

- One central shipment identifier input
- Input normalization
- Ocean container number detection
- Air waybill number detection
- Courier tracking number detection
- Possible carrier detection
- Manual shipment-type or carrier selection
- A link or routing action to the official carrier tracking page
- A clear unrecognized-identifier state

The first MVP **must not** include:

- Paid tracking APIs
- Carrier website scraping
- Live tracking milestones inside FreighTime
- Freight quotations
- Freight bookings
- User registration
- Shipment history storage
- Customer notifications
- Customs or regulatory advice
- An operational customer-facing chatbot
- An operational customer-facing AI assistant
- AI-generated tracking results
- Active assistant API integrations
- Browser-side AI API requests
- AI provider credentials in browser code

Claude Code must not implement assistant functionality unless a future task explicitly authorizes a separate approved assistant-development stage.

## 5. Incremental working method

- Work on one requested stage at a time.
- Do not implement future stages early.
- Do not create unrelated files or features.
- Before changing files, inspect the relevant existing files.
- Before implementation, provide a concise plan when requested.
- Keep changes small, focused, and reversible.
- Do not rename, move, or delete existing files unless explicitly instructed.
- Stop after completing the requested task.
- Report blockers instead of inventing workarounds that change product scope.
- Do not independently resolve decisions listed as open in `PRODUCT_SPEC.md`.
- Ask for a project-owner decision when an open decision blocks the requested task.

## 6. Legacy preview and chat interface protection

- The original static preview is stored at: `legacy/static-preview/freightime-original-preview.html`
- It is a visual and product reference only.
- It must not be edited, deleted, renamed, or moved unless explicitly instructed.
- Features shown in that preview are not automatically approved for implementation.
- Preview features involving AI assistance, quotations, documents, consultation, provider networks, or other services are outside the approved MVP unless `PRODUCT_SPEC.md` is updated.
- **Update (repository cleanup):** the live chat interface previously in `index.html` was removed by explicit product-owner direction during a repository cleanup task, because its actual implementation made an active, unauthenticated browser-side `fetch()` to `https://api.anthropic.com/v1/messages` on every message (violating the MVP restriction below) and rendered the external response with `innerHTML` (an XSS risk). It was not a "preserved but inactive" concept as originally documented — it was live and unsafe. The chat markup and script were deleted from `index.html`; no chatbot was substituted.
- The archived legacy preview file itself was **not** edited — it remains protected and unchanged, exactly as before.
- The future-assistant product concept (`PRODUCT_SPEC.md` Section 18) remains an open decision; nothing here changes that. Any future assistant implementation must still start from a secure, server-side architecture per Section 9 below — never a repeat of the removed browser-side pattern.

## 7. Language and localization strategy

- The first MVP user interface is Hebrew and RTL.
- The codebase must remain ready for a future English and LTR version.
- Technical code, variable names, configuration keys, and internal identifiers should use English.
- Interface text should remain separate from functional logic where technically reasonable.
- New visual components must avoid assumptions that make future LTR support unnecessarily difficult.
- Do not implement an English interface or language selector unless explicitly instructed.

## 8. Single-input tracking router architecture

- The tracking product must preserve separation between:
  - The visible single tracking input
  - The normalization layer
  - The identifier detector
  - The carrier/provider registry
  - The routing layer
  - Future API provider adapters
- Carrier-specific detection and routing data must not be embedded directly in visual interface code.
- Ambiguous matches must be represented honestly rather than forcing an unsupported carrier match.
- The first MVP routes users to appropriate official tracking pages.
- Future live tracking data requires separately approved authorized API integration.

This architecture is referred to as the **Single-input tracking router**.

## 9. Future assistant implementation rules

Any future assistant implementation must:

- Use a secure server-side architecture or another explicitly approved secure architecture.
- Never expose provider credentials in browser-side source code.
- Minimize the transmission and retention of shipment identifiers and conversation data.
- Follow separately approved privacy and data-retention requirements.
- Use only an explicitly approved provider and API.
- Be implemented and tested in a separate authorized stage.

Do not select an AI provider, API, backend architecture, or hosting service unless explicitly authorized in the current task.

## 10. Architecture principles

Without selecting or installing a framework yet:

- Separate user-interface code from shipment detection logic.
- Keep carrier rules and identifier patterns in dedicated configuration modules.
- Do not hardcode carrier-detection rules inside visual components.
- Design carrier integrations so providers can be replaced later.
- Preserve the original user input separately from normalized input.
- Return structured detection results.
- Allow ambiguous results rather than forcing an unsupported carrier match.
- Do not claim tracking information is real-time unless it comes from an approved source.
- Treat shipment identifiers as potentially sensitive operational data.
- Avoid logging shipment identifiers unnecessarily.
- Never commit credentials or API keys.
- Do not select a technology, framework, hosting provider, tracking provider, or external service unless authorized in the current task.

## 11. Quality requirements

Future implementation tasks must:

- Include tests for identifier normalization and detection logic.
- Test valid and invalid examples.
- Run relevant tests after code changes.
- Run lint and build checks when supported.
- Report failures honestly.
- Not claim success if tests or builds fail.
- Avoid unrelated refactoring.
- Verify that no unrelated file was changed.

## 12. Git and GitHub rules

- Work only on the branch specified in the current task.
- Do not change branches unless explicitly instructed.
- Do not merge unless explicitly instructed.
- Do not create a pull request unless explicitly instructed.
- Do not force push or rewrite Git history.
- Do not include unrelated changes in a commit.
- Use clear task-specific commit messages.
- If the Claude Code Web stop hook requires a commit and push, commit only authorized files and push only to the current branch.
- Report the commit hash.
- Never expose credentials or tokens.

## 13. Security and privacy rules

- Never print or commit secrets, tokens, private keys, cookies, passwords, or environment variable values.
- Do not inspect secret-file contents unless explicitly and safely authorized.
- Do not place API keys in source code.
- Do not send shipment identifiers to external services unless explicitly approved.
- Do not implement scraping without explicit approval and separate legal and technical review.
- Do not collect or retain user data unless approved.
- Do not make external network requests unless explicitly authorized.

## 14. Communication and completion report

After every task, report:

- Files created
- Files modified
- Files moved or deleted
- Tests or checks performed
- Test and build results
- Assumptions made
- Known limitations
- Git status
- Whether commit and push occurred
- Commit hash, if applicable
- Confirmation that no unrelated changes were made
