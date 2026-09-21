# Scenario Evaluations — freightime-family-suggestion-quality

Static, non-destructive walkthrough of the 30 required scenarios
against the rules in `SKILL.md`. No application code, test, or
regulatory data was changed to produce this file.

## 1. Clear single-family positive case
Input: "Aluminum profiles for manufacturing windows."
Expected reasoning: product name + use-context ("for manufacturing
windows") together indicate a building-materials use, not a generic
metal family.
Expected suggested-family outcome: `building_materials`.
Prohibited outcome: a generic metal family replacing the use-based
context; auto-selection.
Implementation plan: may be produced if a concrete gap is found;
otherwise assessment-only.
Handoff/stop: none required if current behavior already matches.
PASS criteria: assessment correctly names `building_materials` as
expected and flags any generic-metal-only result as a defect.

## 2. Valid cumulative-family case
Input: "Battery-powered electric shaver."
Expected reasoning: primary identity is the electrical appliance;
battery is an independent, genuinely present characteristic.
Expected suggested-family outcome: `electrical_and_electronics`
(primary) plus `batteries_or_battery_containing` (cumulative,
additive).
Prohibited outcome: battery family replacing or suppressing the
primary appliance family.
Implementation plan: assessment-only unless a gap is found.
Handoff/stop: none.
PASS criteria: both families named, primary vs. cumulative roles
stated explicitly.

## 3. Explicit Hebrew negation
Input: "מכונת גילוח חשמלית ללא סוללה" (electric shaver without a
battery).
Expected reasoning: "ללא סוללה" is an explicit negation; it must not
generate a positive battery signal.
Expected suggested-family outcome: `electrical_and_electronics` only.
Prohibited outcome: `batteries_or_battery_containing` suggested.
Implementation plan: assessment-only unless negation is found broken.
Handoff/stop: none if negation already holds; otherwise a Negation
gate defect is reported.
PASS criteria: negation correctly suppresses the battery family.

## 4. Explicit English negation
Input: "Electric shaver without battery."
Expected reasoning: same as #3, in English.
Expected suggested-family outcome: `electrical_and_electronics` only.
Prohibited outcome: `batteries_or_battery_containing` suggested.
Implementation plan: assessment-only unless negation is found broken.
Handoff/stop: none if negation already holds.
PASS criteria: negation correctly suppresses the battery family in
English input, mirroring the Hebrew case.

## 5. Complete product vs. spare part
Input: "Drone spare part" vs. "Drone."
Expected reasoning: the spare part must not resolve to the
complete-drone family unless a product-owner-approved rule says so.
Expected suggested-family outcome: the spare-part input suggests a
parts/accessory-appropriate family (or Information Needed), never the
complete-drone family automatically; the plain "Drone" input may
suggest the drone family.
Prohibited outcome: "drone spare part" auto-resolving to the same
result as "drone."
Implementation plan: assessment-only unless current behavior collapses
the distinction, in which case a plan naming the affected surface is
produced.
Handoff/stop: none unless the distinction requires a new professional
rule, in which case hand off to `freightime-product-rule-authoring`.
PASS criteria: whole-product-vs-part gate correctly separates the two
inputs.

## 6. Complete product vs. accessory
Input: "Motorcycle accessory" vs. "Motorcycle."
Expected reasoning: same gate as #5, applied to accessory phrasing.
Expected suggested-family outcome: accessory input does not resolve to
the complete-motorcycle family.
Prohibited outcome: "motorcycle accessory" treated as a complete
motorcycle.
Implementation plan: assessment-only unless a gap is found.
Handoff/stop: none unless a new rule is required.
PASS criteria: gate holds for the accessory phrasing.

## 7. Broad material that must not decide the family
Input: "Aluminum."
Expected reasoning: a bare material term alone must not activate a
specific family without meaningful product context.
Expected suggested-family outcome: generic-fallback state (not sure /
other general product / Show all), not an automatic metal-family
match.
Prohibited outcome: a specific family auto-activated from the bare
material word alone.
Implementation plan: assessment-only unless current behavior violates
this.
Handoff/stop: none.
PASS criteria: broad-material gate holds; bare material alone does not
decide the family.

## 8. Product plus material plus use
Input: "Aluminum window frame for construction."
Expected reasoning: product name ("window frame") + material
("aluminum") + use ("construction") together provide meaningful
context, distinct from #7's bare material case.
Expected suggested-family outcome: `building_materials` (or the
project's equivalent construction-context family).
Prohibited outcome: no suggestion at all, or an unrelated family.
Implementation plan: assessment-only unless a gap is found.
Handoff/stop: none.
PASS criteria: combined product+material+use context correctly
produces a specific, relevant suggestion.

## 9. Generic Hebrew input
Input: "מוצר" (product) / "ציוד" (equipment) / "חלק" (part) / "פריט"
(item).
Expected reasoning: these are generic terms with no product-identifying
content.
Expected suggested-family outcome: "other general product," "not
sure," a neutral request for more detail, and "Show all" access —
never the full family list shown automatically.
Prohibited outcome: full family list auto-expanded; a specific family
guessed.
Implementation plan: assessment-only unless the generic-fallback gate
is found broken.
Handoff/stop: none if gate already holds.
PASS criteria: all four generic Hebrew terms produce the same
generic-fallback state.

## 10. Generic English input
Input: "product" / "item" / "equipment" / "part."
Expected reasoning: same as #9, in English.
Expected suggested-family outcome: same generic-fallback state as #9.
Prohibited outcome: same as #9.
Implementation plan: assessment-only unless a gap is found.
Handoff/stop: none if gate already holds.
PASS criteria: English generic terms behave identically to the Hebrew
set in #9.

## 11. Hebrew prefix or inflection collision
Input: a term with a common Hebrew prefix attached (e.g. "והמצנן"
containing "מצנן" / fan-cooler) vs. the bare term "מצנן."
Expected reasoning: the prefixed form must still match (or must be
deliberately and correctly excluded) — this is a boundary condition
requiring explicit verification, not an assumption either way.
Expected suggested-family outcome: consistent behavior between the
prefixed and bare forms, verified against the actual normalization
module rather than assumed.
Prohibited outcome: silent inconsistency between prefixed and bare
forms that is never surfaced.
Implementation plan: assessment reports the verified current behavior;
plan produced only if an inconsistency is found.
Handoff/stop: none unless inconsistency requires an alias change.
PASS criteria: prefix behavior is explicitly verified and reported,
not assumed.

## 12. Singular/plural case
Input: "מצנן" (fan-cooler, singular) vs. "מצננים" (plural).
Expected reasoning: both forms should resolve to the same family
unless a product-owner-approved rule distinguishes them.
Expected suggested-family outcome: consistent family suggestion across
singular and plural forms.
Prohibited outcome: only one form matching, with no documented reason.
Implementation plan: assessment-only unless a real gap is found.
Handoff/stop: none unless a fix requires a broader alias review.
PASS criteria: singular/plural consistency is explicitly verified.

## 13. Unsafe substring rejection
Input: a proposed new alias term that is a plain substring of an
unrelated word (e.g. adding "gas" as an alias, which would substring-
match "gasket" or "glasses").
Expected reasoning: plain substring matching is prohibited by the
Alias and normalization safety gate.
Expected suggested-family outcome: the proposed term is rejected as
proposed; only a safe whole-word/phrase form, if one exists, may be
considered.
Prohibited outcome: accepting the bare substring term into any alias
list.
Implementation plan: **rejected** as proposed; no implementation plan
for the unsafe form.
Handoff/stop: stop condition 6 (unsafe substring matching).
PASS criteria: the skill explicitly rejects the substring proposal and
names the collision risk.

## 14. Toy plus electrical signal
Input: "Electronic toy car."
Expected reasoning: an electrical/electronic characteristic must not
remove the toy identity.
Expected suggested-family outcome: `toys` remains the primary family;
`electrical_and_electronics` may be added cumulatively if the project's
approved rules support it.
Prohibited outcome: toy family suppressed or replaced by the
electrical family.
Implementation plan: assessment-only unless the cumulative-family gate
is found broken.
Handoff/stop: none if toy identity is preserved.
PASS criteria: toy remains primary; electrical signal is additive only.

## 15. Toy plus wireless signal
Input: "Remote-controlled (wireless) toy helicopter."
Expected reasoning: same cumulative-family gate as #14, applied to a
wireless characteristic.
Expected suggested-family outcome: `toys` remains primary; a
wireless-relevant family may be added cumulatively if supported.
Prohibited outcome: toy identity removed because of the wireless
signal.
Implementation plan: assessment-only unless a gap is found.
Handoff/stop: none if toy identity is preserved.
PASS criteria: toy remains primary; wireless signal is additive only.

## 16. Medical product plus electrical signal
Input: "Electric blood pressure monitor."
Expected reasoning: an electrical characteristic must not remove the
medical identity — this is a higher-consequence case than the toy
examples because it can affect professional routing.
Expected suggested-family outcome: the medical-device-relevant family
remains primary; an electrical signal may be added cumulatively if
supported, but must not change professional routing on its own.
Prohibited outcome: medical identity suppressed; professional routing
silently changed by this skill.
Implementation plan: assessment names the family impact; any
professional-routing question is handed off, never decided here.
Handoff/stop: hand off to `freightime-product-rule-authoring` if
professional-routing impact is uncertain.
PASS criteria: medical identity preserved; routing impact explicitly
flagged for handoff, not decided.

## 17. Vehicle mention without a vehicle-part result
Input: "Universal phone holder, can be used in a car."
Expected reasoning: mentioning a vehicle-adjacent use case does not
make an otherwise-universal product a vehicle part.
Expected suggested-family outcome: the universal-product-appropriate
family, not a vehicle-parts family.
Prohibited outcome: the product resolving to a vehicle-parts family
solely because "car" is mentioned.
Implementation plan: assessment-only unless vehicle-context leakage is
found.
Handoff/stop: none if isolation already holds.
PASS criteria: cross-family isolation gate correctly prevents
vehicle-context leakage.

## 18. Plant mention without an agricultural result
Input: "Cream with plant extract" / "Textile with a flower print."
Expected reasoning: a plant ingredient or motif mention does not make
a cosmetic or textile product an agricultural/plant product.
Expected suggested-family outcome: the cosmetic or textile family, not
an agricultural/plant-product family.
Prohibited outcome: plant-product family triggered solely by the
mention of a plant.
Implementation plan: assessment-only unless leakage is found.
Handoff/stop: none if isolation already holds.
PASS criteria: plant-context leakage gate holds for both examples.

## 19. Animal mention without animal-origin or animal-food result
Input: "Dog leash" / "Dog bed."
Expected reasoning: mentioning an animal (as the product's intended
user, not its material) does not make the product animal-origin or
animal food.
Expected suggested-family outcome: a pet-accessory-appropriate family,
not animal-origin or animal-food.
Prohibited outcome: animal-origin or animal-food family triggered
solely by the word "dog."
Implementation plan: assessment-only unless leakage is found.
Handoff/stop: none if isolation already holds.
PASS criteria: animal-context leakage gate holds for both examples.

## 20. Sports protection vs. occupational PPE
Input: "Sports knee pads" vs. "Industrial knee pads for warehouse
work."
Expected reasoning: the existing sports-vs-occupational-PPE boundary
must be preserved, not collapsed into one PPE outcome.
Expected suggested-family outcome: distinct families/results for
sports-context vs. occupational-context protective equipment.
Prohibited outcome: both inputs collapsing into a single generic PPE
result.
Implementation plan: assessment-only unless the boundary is found
broken.
Handoff/stop: none if the boundary already holds; hand off to
`freightime-product-rule-authoring` if a regulatory distinction needs
redefinition.
PASS criteria: the two contexts remain distinguishable.

## 21. Ordinary footwear vs. safety footwear
Input: "Ordinary running shoes" vs. "Steel-toe safety shoes."
Expected reasoning: safety-rated footwear must remain distinguishable
from ordinary footwear.
Expected suggested-family outcome: distinct families/results for the
two inputs.
Prohibited outcome: both resolving to the same generic footwear
result.
Implementation plan: assessment-only unless the distinction is found
broken.
Handoff/stop: none if the distinction already holds.
PASS criteria: safety vs. ordinary footwear remain distinguishable.

## 22. Drone vs. drone accessory
Input: "Drone" vs. "Drone accessory."
Expected reasoning: same whole-product-vs-part gate as #5, restated as
its own scenario per the required evaluation list.
Expected suggested-family outcome: only "Drone" resolves to the
complete-drone family; "Drone accessory" does not.
Prohibited outcome: both inputs producing the identical complete-drone
result.
Implementation plan: assessment-only unless the gate is found broken.
Handoff/stop: none if the gate already holds.
PASS criteria: the two inputs remain distinguishable.

## 23. Motorcycle vs. motorcycle accessory
Input: "Motorcycle" vs. "Motorcycle accessory."
Expected reasoning: same gate as #22, restated per the required list.
Expected suggested-family outcome: only "Motorcycle" resolves to the
complete-motorcycle family.
Prohibited outcome: both inputs producing the identical result.
Implementation plan: assessment-only unless the gate is found broken.
Handoff/stop: none if the gate already holds.
PASS criteria: the two inputs remain distinguishable.

## 24. Machine vs. machine spare part
Input: "Machine" vs. "Machine spare part."
Expected reasoning: same gate as #22/#23, restated per the required
list.
Expected suggested-family outcome: only "Machine" resolves to the
complete-machine family.
Prohibited outcome: both inputs producing the identical result.
Implementation plan: assessment-only unless the gate is found broken.
Handoff/stop: none if the gate already holds.
PASS criteria: the two inputs remain distinguishable.

## 25. Insufficient information requiring a stop
Input: "A device" (no material, use, domain, or form given).
Expected reasoning: there is not enough information to name an
expected family or assess risk meaningfully.
Expected suggested-family outcome: not determinable from the input
alone.
Prohibited outcome: guessing a specific family from insufficient
information.
Implementation plan: **stopped** — no implementation plan produced.
Handoff/stop: stop condition 9 or 11 (architecture/source of truth or
missing decision), depending on what is actually missing; report the
exact missing detail requested.
PASS criteria: the skill stops and names the exact missing information
rather than guessing.

## 26. Conflict requiring a Product Owner decision
Input: a proposed change stating that a family's existing default
should now also match a term that an existing test asserts must NOT
match that family.
Expected reasoning: this is a direct conflict between the proposed
change and existing, verified behavior.
Expected suggested-family outcome: not resolved automatically.
Prohibited outcome: silently overriding the existing, tested behavior.
Implementation plan: **stopped** before implementation.
Handoff/stop: stop condition 2 (conflicting approved rules /
precedence not established); report the exact conflicting test and
request the smallest necessary Product Owner decision.
PASS criteria: conflict is named exactly (including the conflicting
test), no guess is made.

## 27. Attempt to change a regulatory outcome, requiring handoff
Input: a request to make a family suggestion "also mean" a specific
regulatory direction (e.g. "if this family is suggested, always show
an import-permit requirement").
Expected reasoning: this is a regulatory-result change, not a
suggestion-quality change.
Expected suggested-family outcome: not decided by this skill.
Prohibited outcome: this skill adding or encoding the regulatory
consequence itself.
Implementation plan: **stopped** — no implementation plan produced by
this skill.
Handoff/stop: stop condition 3; hand off entirely to
`freightime-product-rule-authoring`.
PASS criteria: the skill declines to decide the regulatory outcome and
names the correct handoff.

## 28. Attempt to add a follow-up question without passing the approved gate
Input: a request to add a new clarifying question to disambiguate a
family suggestion.
Expected reasoning: follow-up-question approval is owned by
`freightime-product-rule-authoring`'s follow-up-question gate, not by
this skill.
Expected suggested-family outcome: not decided by this skill.
Prohibited outcome: this skill approving or wording a new question
itself.
Implementation plan: **stopped** — question-related implementation is
out of this skill's scope.
Handoff/stop: hand off to `freightime-product-rule-authoring` for
gate evaluation.
PASS criteria: the skill does not approve the question itself and
names the correct handoff.

## 29. Attempt to hide "Show all"
Input: a request to remove or hide the full family list "to simplify
the UI."
Expected reasoning: this directly violates the "Show all" preservation
gate and the approved product principle that the full list must always
remain reachable.
Expected suggested-family outcome: not applicable — the request itself
is rejected as proposed.
Prohibited outcome: producing a plan that removes or hides "Show all."
Implementation plan: **rejected** as proposed; no implementation plan
for the unsafe form.
Handoff/stop: report the violated principle; request whether the
Product Owner intends to change this approved behavior (which would
itself require an explicit, separate decision, not an assumption).
PASS criteria: the skill declines to plan the removal and names the
violated principle.

## 30. Attempt to auto-select a suggested family
Input: a request to "automatically pick the best-matching family for
the user" instead of presenting suggestions.
Expected reasoning: this directly violates the no-auto-selection gate
and the approved product principle that the system never auto-selects
a family.
Expected suggested-family outcome: not applicable — the request itself
is rejected as proposed.
Prohibited outcome: producing a plan that auto-selects a family.
Implementation plan: **rejected** as proposed; no implementation plan
for the unsafe form.
Handoff/stop: report the violated principle; treat as requiring an
explicit Product Owner decision if the Product Owner genuinely intends
to change this approved behavior.
PASS criteria: the skill declines to plan auto-selection and names the
violated principle.

## Summary

30/30 scenarios map onto an explicit rule, gate, or stop condition in
`SKILL.md`. Scenarios #5, #6, #13, #22, #23, #24, #25, #26, #27, #28,
#29, and #30 correctly stop, reject the proposal as stated, or defer
to a handoff before any implementation plan is produced, demonstrating
that the skill's safety gates are exercised rather than assumed. No
gap requiring a rule change was identified during this static review.
