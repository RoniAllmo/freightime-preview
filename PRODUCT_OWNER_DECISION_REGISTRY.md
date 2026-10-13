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

### Domain rules (recorded from the project handover, 2026-10-13)

These general directions were approved by the Product Owner over the
course of the project and are listed in the project handover document
(section 5). The Product Owner explicitly instructed that they be
recorded here (2026-10-13). They are preliminary check directions, not a
substitute for a current official check. Helmet and live-animal rules
are already recorded above and are not repeated.

16. Animal feed and products of animal origin receive a veterinary
    direction. Pet accessories that are not food generally receive no
    requirement.
17. Drones and wireless equipment receive a Ministry of Communications
    check direction.
18. Sports equipment generally has no standard requirement; equipment
    with electrical wiring receives a Standards Institution check
    direction.
19. Plastic items and coated items in contact with food receive a
    standards direction according to material and purpose. There is no
    blanket requirement for all household items.
20. Mattresses, baby cots, cradles and baby walkers receive a standards
    direction. Ordinary furniture receives one only when it has
    electrical wiring.
21. Perfume has no general requirement. Deodorant, cream, hair products,
    make-up and nail polish receive a Ministry of Health cosmetics
    direction.
22. Batteries/accumulators and mains-connected chargers receive a
    standards direction. A vehicle battery is also directed to the
    vehicle lab / vehicle division -- see the vehicle-battery conflict
    resolution under rule 37.
23. Vehicle accessories start from a vehicle division or vehicle lab
    check; exceptions go to professional review.
24. Plants, seeds and agricultural produce receive a plant-protection
    direction.
25. Food supplements and vitamins for human use go to the Ministry of
    Health; for animals, to the veterinary services; for pharmaceutical
    manufacturing, to the Pharmaceutical Division.
26. Pesticides require a poisons permit. An aerosol or pressure
    container may add a Standards Institution direction.
27. Protective equipment receives a Standards Institution check
    direction, without the questionnaire splitting work and sports use.
28. Medical equipment generally receives a Medical Devices Division
    (AMAR) direction. Defibrillators and incubators may add a standards
    direction.
29. Building materials and machinery generally have no blanket
    requirement. Exceptions are checked by a professional, without
    unnecessary questions.
30. Every toy receives a standards direction. Bows and arrow-shooting
    games may also require an import administration licence.
31. Ordinary cardboard has no requirement. Food-contact items with a
    polymer coating and food-contact bottles receive a standards
    direction. Wooden boxes are directed to the Ministry of Agriculture.
32. Hand tools have no general requirement. Mains-connected tools
    receive a standards direction.
33. Carpets, pacifier holders and baby carriers receive a standards
    direction. A blanket does only when it is electric. Ordinary
    textiles have no blanket requirement.

### P2 decision backlog (Product Owner decisions, 2026-10-13)

34. Paints, adhesives and sealants receive a primary direction to a
    poisons permit from the Ministry of Environmental Protection
    (workbook column "אישור / רישיון אחר").
35. Industrial chemicals and hazardous materials receive no standard
    regulatory authority. The result states that the exact purpose and
    material composition must be checked before any determination, and
    refers the user to a customs classifier.
36. Metal items in contact with food receive a primary Standards
    Institution direction.
37. Vehicle battery conflict resolution: the "exactly one primary
    direction" rule prevails over rule 22. A vehicle battery's primary
    direction is the vehicle lab / vehicle division only; no separate
    standards direction is shown for it.
38. Clothing and textiles keep the general no-requirement result, with
    a warning that children's clothing and sleepwear require a
    Standards Institution check.
39. The approved exceptions in rules 26, 28 and 30 are shown as cautious
    warning sentences in the family guidance: bows and arrow-shooting
    toys (import administration, Ministry of Economy), defibrillators
    and incubators (Standards Institution), and aerosol or
    pressure-container pesticides (Standards Institution).
40. The pesticides poisons-permit direction names the Ministry of
    Environmental Protection, aligned with rule 34.
41. The duplicate drone row "רחפנים" is retired: it stays in the
    workbook and keeps its id, but is inactive. Plural drone text
    resolves to the single active drone row "רחפן".

## Change log

- 2026-09-28 — Registry created, seeded with rules 1–15 above (all already
  approved and merged prior to this entry, via PR #83, #84, #85, #86, #87).
  No new rule was introduced by this entry.
- 2026-10-13 — Added rules 16–33 (domain rules from the project handover,
  recorded on explicit Product Owner instruction) and rules 34–41 (P2
  decision backlog decisions, implemented in the same change).
