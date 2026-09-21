# Collision and Isolation Checklist — FreighTime Family Suggestion Quality

Check each relevant area before accepting a proposed family-suggestion
change, or before concluding a review found no risk. Full rules live
in `SKILL.md`; this is a quick-reference checklist.

- [ ] Unsafe substring matches — does the term match as a plain
      substring instead of a safe whole-word/phrase boundary?
- [ ] Partial-token collisions — does the term match part of an
      unrelated token?
- [ ] Common-word collisions — is the term a common word used across
      unrelated contexts?
- [ ] Broad-material collisions — does the term activate a family
      solely because a broad material is mentioned?
- [ ] Broad-property collisions — does the term activate a family
      solely because of a generic property or characteristic?
- [ ] Hebrew-prefix collisions — does a Hebrew prefix (e.g. ה/ו/ב/ל/מ)
      change whether the term matches?
- [ ] Singular/plural collisions — does the singular or plural form
      fail to match, or match something unintended?
- [ ] Transliteration collisions, where relevant — does a transliterated
      term collide with an unrelated word?
- [ ] Negation failures — does an explicit negation still produce a
      positive signal?
- [ ] Whole-product vs. part/accessory confusion — does a part or
      accessory resolve to the complete-product family?
- [ ] Raw-material vs. finished-product confusion — does a raw
      material resolve to a finished-product family, or vice versa?
- [ ] Universal product vs. domain-specific product confusion — does
      an ordinary/universal product resolve to a domain-specific
      family solely because of context?
- [ ] Vehicle-context leakage — does mentioning a vehicle turn an
      unrelated product into a vehicle part?
- [ ] Medical-context leakage — does mentioning a medical setting
      incorrectly add or remove a medical signal?
- [ ] Baby-context leakage — does mentioning a baby/child context leak
      into or out of an unrelated family?
- [ ] Plant-context leakage — does mentioning a plant ingredient or
      motif incorrectly trigger a plant/agricultural family?
- [ ] Animal-context leakage — does mentioning an animal incorrectly
      trigger an animal-origin or animal-food family?
- [ ] Food-contact leakage — does a food-adjacent mention incorrectly
      trigger or suppress a food-contact signal?
- [ ] Electrical-context leakage — does an electrical mention
      incorrectly override or replace the primary family?
- [ ] Wireless-context leakage — same check for wireless/communications
      mentions.
- [ ] Battery-context leakage — does a battery mention appear as a
      positive signal despite an explicit negation, or leak into an
      unrelated family?
- [ ] Sport-vs.-occupational-PPE leakage — does sports protective
      equipment collapse into occupational PPE, or vice versa?
- [ ] Cumulative-family erasure — does an additional signal remove or
      replace the product's primary identity instead of adding to it?
- [ ] Unrelated-family activation — does the term activate a family
      with no meaningful relationship to the input?
- [ ] Generic-fallback failure — does a generic input show more than
      "other general product," "not sure," and "Show all" access?
- [ ] Accidental auto-selection — does any proposed change cause a
      family to be selected without user action?
- [ ] Loss of "Show all" access — does any proposed change remove or
      hide the full family list?
- [ ] Presentation logic encoding regulatory results — does a
      presentation-only suggestion change carry a regulatory
      consequence that was never reviewed by
      `freightime-product-rule-authoring`?

If any checked item reveals a real risk: stop, report the exact risk,
and request only the smallest necessary product-owner decision or
handoff — do not guess a resolution.
