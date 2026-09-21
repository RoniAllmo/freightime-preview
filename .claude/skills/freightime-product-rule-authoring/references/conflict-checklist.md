# Conflict Checklist — FreighTime Product Rule Authoring

Check each relevant area before producing an implementation plan.
Full rules live in `SKILL.md`; this is a quick-reference checklist.

- [ ] Existing family default — does the proposed rule silently
      override it?
- [ ] Subtype precedence — is there already a more specific subtype
      rule this would collide with?
- [ ] Material and composition — does another rule key off the same
      material with a different outcome?
- [ ] Intended use — domestic/commercial/industrial/medical/baby/
      animal distinction already governs a related rule?
- [ ] Complete product vs. part — does an existing part/accessory
      exclusion already cover this family?
- [ ] Electrical context — does an existing electrical-characteristic
      rule already apply here?
- [ ] Wireless context — same check for wireless/communications.
- [ ] Battery context — standalone vs. vehicle vs. containing-equipment
      distinction already exists; does the new rule respect it?
- [ ] Pressure or aerosol context — existing pressurized-container
      handling.
- [ ] Food contact — existing food-contact material/vessel rules.
- [ ] Medical use — medicines vs. medical devices boundary.
- [ ] Baby use — dedicated baby-product context vs. broad textile/
      furniture/toy fallback.
- [ ] Animal or plant origin — existing animal-origin/plant-origin/
      pet-accessory boundaries.
- [ ] Sports vs. occupational use — existing sports-equipment vs. PPE
      boundary.
- [ ] Domestic vs. industrial use — existing consumer vs. industrial
      distinction.
- [ ] Professional overlap — does another rule already supply the same
      professional category for this family?
- [ ] Document duplication — does the proposed document already exist
      via another rule or the centralized dedup point?
- [ ] Duplicate question — is the same information already asked
      elsewhere in the questionnaire?
- [ ] Alias collision — does the proposed term collide with another
      family's alias, or an unrelated word containing it?
- [ ] Negative phrase — does the proposed positive term also appear
      inside an existing negated/excluded phrase?
- [ ] No-positive outcome — is an existing "no positive requirement"
      result being silently overridden?
- [ ] Information Needed — does the proposed rule remove an existing,
      still-necessary Information Needed state?
- [ ] Cumulative approvals — does adding this direction suppress or
      duplicate an existing cumulative direction for the same family?

If any checked item reveals a real conflict: stop, report the exact
conflict, and request only the smallest necessary product-owner
decision — do not guess a resolution.
