# Product Owner Decision Registry — FreighTime

This registry records **approved, high-level Product Owner rules** that have
already been established and merged to `main`. It exists so that future
implementation and review work (including the `freightime-one-pulse-orchestrator`
Agent) can consult prior decisions without requiring the Product Owner to
restate them in every Master Prompt.

## Scope and boundaries

- This registry records **decisions**, not implementation details. It does not
  describe file names, functions, data structures, or generator mechanics.
- Only rules that are **already approved and merged to `main`** may be added.
  Do not add a rule that has not already been approved and merged.
- This registry is **not** a substitute for current Product Owner
  authorization. A genuinely new rule always requires a current, explicit
  Product Owner decision — it is never inferred from this registry.
- `PRODUCT_SPEC.md` remains the primary source of product truth. This
  registry is a durable index of decisions already reflected there and in
  merged history; if the two ever appear to disagree, that conflict must be
  reported rather than silently resolved.
- Additions to this registry happen only as part of recording a Product
  Owner rule that has itself just been approved and merged — never
  speculatively, and never as an implementation-only change.

## Approved rules

### Helmet family

1. Every complete helmet is a standalone helmet-family product.
2. Helmet purpose does not determine its transport family.
3. Complete helmets receive a preliminary Standards Institution check
   direction.
4. Helmet parts are not complete helmets.
5. Toy and decorative helmets are not automatically complete helmets.

### Live animals

6. Complete live animals receive a preliminary veterinary import direction.
7. Live-animal procedures vary by animal type and official procedure.
8. Animal feed is separate from live animals.
9. Pet accessories are separate from live animals.
10. Products of animal origin are separate from live animals.

### General UX / process

11. Suggested families are not automatically selected.
12. "Show all" must remain available.
13. Visitor-facing regulatory results remain preliminary and non-binding.
14. Multiple legitimate regulatory requirements remain distinct.
15. Professional referrals must not be duplicated.

## Change log

- 2026-09-28 — Registry created, seeded with rules 1–15 above (all already
  approved and merged prior to this entry, via PR #83, #84, #85, #86, #87).
  No new rule was introduced by this entry.
