# CLAUDE.md — FreighTime Project Instructions

This file provides permanent, repository-specific operating instructions for Claude Code while working on the FreighTime project. It governs **how** Claude Code works. `PRODUCT_SPEC.md` governs **what** the product is.

## 1. Project identity

- The project name is FreighTime.
- FreighTime is a universal shipment tracking search engine.
- A user enters one shipment identifier into one central search field.
- The system attempts to identify the shipment type and possible carrier.
- The first MVP routes users to an official carrier tracking page.
- Future versions may display approved API-based tracking information inside FreighTime.

## 2. Source of product truth

- `PRODUCT_SPEC.md` is the primary source of truth for product scope.
- Claude Code must read `PRODUCT_SPEC.md` before implementing any product feature.
- If a request conflicts with `PRODUCT_SPEC.md`, Claude Code must report the conflict before implementation.
- Claude Code must not silently expand product scope.
- Open product decisions must remain open unless explicitly decided by the project owner.
- `CLAUDE.md` governs how Claude Code works, while `PRODUCT_SPEC.md` governs what the product is.

## 3. Product boundaries

The customer-facing product is **not**:

- A chatbot
- A customer-facing AI assistant
- A freight quotation platform
- A freight booking platform
- A customs classification tool
- A customs brokerage application
- A general logistics information website

AI may be used to assist software development, but customer-facing AI functionality must not be added unless the project owner explicitly changes `PRODUCT_SPEC.md`.

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

## 6. Legacy preview protection

- The original static preview is stored at: `legacy/static-preview/freightime-original-preview.html`
- It is a visual and product reference only.
- It must not be edited, deleted, renamed, or moved unless explicitly instructed.
- Features shown in that preview are not automatically approved for implementation.
- Preview features involving AI assistance, quotations, documents, consultation, provider networks, or other services are outside the approved MVP unless `PRODUCT_SPEC.md` is updated.

## 7. Architecture principles

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

## 8. Quality requirements

Future implementation tasks must:

- Include tests for identifier normalization and detection logic.
- Test valid and invalid examples.
- Run relevant tests after code changes.
- Run lint and build checks when supported.
- Report failures honestly.
- Not claim success if tests or builds fail.
- Avoid unrelated refactoring.
- Verify that no unrelated file was changed.

## 9. Git and GitHub rules

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

## 10. Security and privacy rules

- Never print or commit secrets, tokens, private keys, cookies, passwords, or environment variable values.
- Do not inspect secret-file contents unless explicitly and safely authorized.
- Do not place API keys in source code.
- Do not send shipment identifiers to external services unless explicitly approved.
- Do not implement scraping without explicit approval and separate legal and technical review.
- Do not collect or retain user data unless approved.
- Do not make external network requests unless explicitly authorized.

## 11. Communication and completion report

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
