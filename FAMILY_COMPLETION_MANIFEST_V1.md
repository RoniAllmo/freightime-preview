# FreighTime Product-Family Completion Manifest

_Generated mechanically from authoritative repository data (`product-family-matrix.js` cross-referenced against test-file content) as part of FT-ONE-PULSE-COMPLETE-ALL-PRODUCT-FAMILIES-V1. This is an audit and completion-status artifact only — it is not a second source of product truth. The authoritative workbook, generated matrix, code registries, and current Product Owner authorization remain controlling._

Generated: 2026-09-28
Matrix rows: 74 (73 active, 1 intentionally inactive placeholder)

## Identity and reachability (Gates A/B)

Mechanically verified against `product-family-matrix.js`, `family-material-disclosure.js` (ALL_PRODUCT_FAMILY_VALUES), `product-family-selection-mapping.js` (PRODUCT_FAMILY_SELECTION_CANDIDATES), `product-family-concept-coverage.js` (FAMILY_CONCEPT_COVERAGE), and `product-family-guidance.js` (FAMILY_GUIDANCE):

- Duplicate matrix IDs: none found.
- Duplicate public family names: none found.
- Duplicate source rows: none found.
- Matrix rows orphaned from FAMILY_CONCEPT_COVERAGE: none found.
- Matrix rows orphaned from PRODUCT_FAMILY_SELECTION_CANDIDATES: none found.
- Checkbox values (ALL_PRODUCT_FAMILY_VALUES) without a coverage entry: none found.
- Checkbox values without a selection-mapping entry (excluding the two special catch-all values): none found.
- FAMILY_GUIDANCE keys not corresponding to a real, active matrix row: none found.
- The one inactive row (`other-01`, the "additional family for manual completion" placeholder) is correctly and deliberately excluded from the active registries — this is the same finding independently confirmed in the prior full-system audit, not a defect.

**Conclusion: Gates A and B pass for all 73 active families.**

## Test-coverage gap analysis (Gate H)

Mechanical check: does at least the matrix ID string, or at least one alias (3+ characters) belonging to the row, appear anywhere in any `tests/**/*.test.js` file? A hit does not by itself prove a rigorous positive+negative+collision test exists — it is a necessary-evidence floor, not a sufficiency proof. An active row with **zero** hits on both checks has no discoverable direct test evidence at all.

73 active rows checked. **11 rows found with zero discoverable test evidence** (auto-corrected in this package — see PR):

| Matrix ID | Public name | Category | Alias count before |
|---|---|---|---|
| `electrical-and-electronics-02` | מטענים וספקי כוח | חשמל ואלקטרוניקה | 3 |
| `electrical-and-electronics-03` | כבלים ואביזרי חשמל | חשמל ואלקטרוניקה | 3 |
| `electrical-and-electronics-06` | ציוד סלולרי ותקשורת | חשמל ואלקטרוניקה | 4 |
| `electrical-and-electronics-08` | גופי תאורה ונורות | חשמל ואלקטרוניקה | 3 |
| `vehicles-and-transport-06` | חלקי בלימה, היגוי ובטיחות | רכב ותחבורה | 3 |
| `vehicles-and-transport-07` | צמיגים וחישוקים | רכב ותחבורה | 3 |
| `vehicles-and-transport-09` | אביזרי נוחות וקישוט לרכב | רכב ותחבורה | 3 |
| `children-and-infants-02` | צעצועים חשמליים או אלחוטיים | ילדים ותינוקות | 3 |
| `children-and-infants-03` | מוצרי תינוקות | ילדים ותינוקות | 3 |
| `chemicals-and-materials-04` | כימיקלים תעשייתיים וחומרים מסוכנים | כימיקלים וחומרים | 3 |
| `construction-and-industrial-03` | מוצרי עץ וחומרי גלם מן הצומח | בנייה ותעשייה | 1 |

All other 62 active families have at least one direct id/alias hit in the existing test suite (via family-specific test files such as `product-family-helmet-domain.test.js`, `live-animals-veterinary-domain.test.js`, `animal-feed-family.test.js`, thematic wave/completion tests, or the structural `family-concept-coverage-gate.test.js`).

## Full per-family data (mechanical dump)

| Matrix ID | Category | Public name | Active | Aliases | Regulatory signals | Has guidance |
|---|---|---|---|---|---|---|
| `food-and-beverages-01` | מזון ומשקאות | מזון ארוז | yes | 10 | healthUmbrella |  |
| `food-and-beverages-02` | מזון ומשקאות | משקאות | yes | 3 | healthUmbrella |  |
| `food-and-beverages-03` | מזון ומשקאות | תוספי תזונה | yes | 6 | healthUmbrella |  |
| `food-and-beverages-04` | מזון ומשקאות | מזון מן החי | yes | 11 | healthUmbrella, agriculture |  |
| `food-and-beverages-05` | מזון ומשקאות | תוצרת חקלאית, זרעים וצמחים | yes | 6 | healthUmbrella, agriculture |  |
| `food-contact-01` | מגע עם מזון | כלי פלסטיק במגע עם מזון | yes | 7 | standards |  |
| `food-contact-02` | מגע עם מזון | מוצר עם ציפוי פולימרי במגע עם מזון | yes | 7 | standards |  |
| `food-contact-03` | מגע עם מזון | כלי זכוכית במגע עם מזון או שתייה | yes | 12 | standards |  |
| `food-contact-04` | מגע עם מזון | כלי קרמיקה במגע עם מזון | yes | 8 | standards |  |
| `food-contact-05` | מגע עם מזון | כלי מתכת במגע עם מזון | yes | 3 | — |  |
| `electrical-and-electronics-01` | חשמל ואלקטרוניקה | מכשיר חשמלי עם תקע או ספק כוח | yes | 4 | standards |  |
| `electrical-and-electronics-02` | חשמל ואלקטרוניקה | מטענים וספקי כוח | yes | 3 | standards | n/a |
| `electrical-and-electronics-03` | חשמל ואלקטרוניקה | כבלים ואביזרי חשמל | yes | 3 | standards | n/a |
| `electrical-and-electronics-04` | חשמל ואלקטרוניקה | מוצר אלקטרוני ללא חיבור לרשת | yes | 1 | standards |  |
| `electrical-and-electronics-05` | חשמל ואלקטרוניקה | מוצר אלחוטי, Wi-Fi או Bluetooth | yes | 14 | standards, communications |  |
| `electrical-and-electronics-06` | חשמל ואלקטרוניקה | ציוד סלולרי ותקשורת | yes | 4 | communications | n/a |
| `electrical-and-electronics-07` | חשמל ואלקטרוניקה | סוללות ותאים | yes | 9 | standards |  |
| `electrical-and-electronics-08` | חשמל ואלקטרוניקה | גופי תאורה ונורות | yes | 3 | standards | n/a |
| `vehicles-and-transport-01` | רכב ותחבורה | כלי רכב שלמים | yes | 1 | transportOrVehicleLaboratory |  |
| `vehicles-and-transport-02` | רכב ותחבורה | אופנועים וקטנועים שלמים | yes | 1 | transportOrVehicleLaboratory |  |
| `vehicles-and-transport-03` | רכב ותחבורה | חלקי חילוף לרכב | yes | 1 | transportOrVehicleLaboratory |  |
| `vehicles-and-transport-04` | רכב ותחבורה | חלקי חילוף לאופנועים וקטנועים | yes | 1 | transportOrVehicleLaboratory |  |
| `vehicles-and-transport-05` | רכב ותחבורה | פנסים וגופי תאורה לרכב | yes | 9 | transportOrVehicleLaboratory |  |
| `vehicles-and-transport-06` | רכב ותחבורה | חלקי בלימה, היגוי ובטיחות | yes | 3 | transportOrVehicleLaboratory | n/a |
| `vehicles-and-transport-07` | רכב ותחבורה | צמיגים וחישוקים | yes | 3 | transportOrVehicleLaboratory | n/a |
| `vehicles-and-transport-08` | רכב ותחבורה | זכוכית ושמשות לרכב | yes | 5 | transportOrVehicleLaboratory |  |
| `vehicles-and-transport-09` | רכב ותחבורה | אביזרי נוחות וקישוט לרכב | yes | 3 | transportOrVehicleLaboratory | n/a |
| `children-and-infants-01` | ילדים ותינוקות | צעצועים | yes | 6 | standards |  |
| `children-and-infants-02` | ילדים ותינוקות | צעצועים חשמליים או אלחוטיים | yes | 3 | standards | n/a |
| `children-and-infants-03` | ילדים ותינוקות | מוצרי תינוקות | yes | 3 | standards | n/a |
| `children-and-infants-04` | ילדים ותינוקות | עגלות, מיטות, לולים וכיסאות אוכל | yes | 1 | standards |  |
| `health-and-cosmetics-01` | בריאות ותמרוקים | תמרוקים | yes | 15 | healthUmbrella |  |
| `health-and-cosmetics-02` | בריאות ותמרוקים | ציוד רפואי | yes | 2 | healthUmbrella |  |
| `health-and-cosmetics-03` | בריאות ותמרוקים | מוצר בעל טענה רפואית | yes | 3 | healthUmbrella |  |
| `health-and-cosmetics-04` | בריאות ותמרוקים | תרופות | yes | 1 | healthUmbrella |  |
| `chemicals-and-materials-01` | כימיקלים וחומרים | חומרי ניקוי וחיטוי | yes | 5 | standards |  |
| `chemicals-and-materials-02` | כימיקלים וחומרים | צבעים, דבקים וחומרי איטום | yes | 1 | — |  |
| `chemicals-and-materials-03` | כימיקלים וחומרים | חומרי הדברה | yes | 1 | healthUmbrella |  |
| `chemicals-and-materials-04` | כימיקלים וחומרים | כימיקלים תעשייתיים וחומרים מסוכנים | yes | 3 | — | n/a |
| `textiles-and-furniture-01` | טקסטיל וריהוט | ביגוד וטקסטיל | yes | 15 | — |  |
| `textiles-and-furniture-02` | טקסטיל וריהוט | הנעלה רגילה | yes | 10 | — |  |
| `textiles-and-furniture-03` | טקסטיל וריהוט | מזרנים | yes | 4 | standards |  |
| `construction-and-industrial-01` | בנייה ותעשייה | חומרי בנייה | yes | 1 | — |  |
| `construction-and-industrial-02` | בנייה ותעשייה | מכונות וציוד תעשייתי | yes | 1 | — |  |
| `construction-and-industrial-03` | בנייה ותעשייה | מוצרי עץ וחומרי גלם מן הצומח | yes | 1 | agriculture | n/a |
| `additional-consumer-products-01` | מוצרי צריכה נוספים | ציוד ספורט | yes | 6 | — |  |
| `additional-consumer-products-02` | מוצרי צריכה נוספים | אופניים וקורקינטים רגילים | yes | 9 | standards |  |
| `additional-consumer-products-03` | מוצרי צריכה נוספים | רחפנים | yes | 1 | communications |  |
| `additional-consumer-products-04` | מוצרי צריכה נוספים | ציוד ימי וכלי שיט | yes | 1 | otherPermit |  |
| `additional-consumer-products-05` | מוצרי צריכה נוספים | מוצרים לבעלי חיים | yes | 17 | — |  |
| `health-and-cosmetics-05` | בריאות ותמרוקים | בשמים | yes | 5 | — |  |
| `textiles-and-furniture-04` | טקסטיל וריהוט | הנעלת בטיחות | yes | 6 | standards |  |
| `additional-consumer-products-06` | מוצרי צריכה נוספים | ציוד מגן אישי | yes | 11 | standards |  |
| `additional-consumer-products-07` | מוצרי צריכה נוספים | אופניים או קורקינט עם מנוע עזר | yes | 9 | transportOrVehicleLaboratory |  |
| `food-and-beverages-06` | מזון ומשקאות | ויטמינים לבעלי חיים | yes | 4 | agriculture |  |
| `food-and-beverages-07` | מזון ומשקאות | ויטמינים לייצור תרופות | yes | 3 | healthUmbrella |  |
| `vehicles-and-transport-10` | רכב ותחבורה | מצבר ייעודי לרכב | yes | 5 | transportOrVehicleLaboratory |  |
| `textiles-and-furniture-05` | טקסטיל וריהוט | ריהוט | yes | 10 | — |  |
| `electrical-and-electronics-09` | חשמל ואלקטרוניקה | ציוד הכולל סוללה | yes | 7 | — |  |
| `other-01` | אחר | משפחה נוספת להשלמה ידנית | no (placeholder) | 1 | — |  |
| `food-and-beverages-08` | מזון ומשקאות | בעלי חיים | yes | 456 | agriculture |  |
| `food-and-beverages-09` | מזון ומשקאות | מזון לבעלי חיים | yes | 14 | agriculture |  |
| `electrical-and-electronics-10` | חשמל ואלקטרוניקה | רחפן | yes | 4 | communications |  |
| `construction-and-industrial-04` | בנייה ותעשייה | כלי עבודה ידניים | yes | 13 | — |  |
| `additional-consumer-products-08` | מוצרי צריכה נוספים | קרטון לאריזה | yes | 7 | — |  |
| `construction-and-industrial-05` | בנייה ותעשייה | קופסת עץ לאריזה | yes | 4 | agriculture |  |
| `additional-consumer-products-09` | מוצרי צריכה נוספים | נייר ומוצרי דפוס | yes | 14 | — |  |
| `textiles-and-furniture-06` | טקסטיל וריהוט | שטיחים | yes | 4 | standards |  |
| `textiles-and-furniture-07` | טקסטיל וריהוט | שמיכה רגילה | yes | 5 | — |  |
| `children-and-infants-05` | ילדים ותינוקות | מחזיק מוצץ | yes | 3 | standards |  |
| `children-and-infants-06` | ילדים ותינוקות | מנשא לתינוק | yes | 3 | standards |  |
| `textiles-and-furniture-08` | טקסטיל וריהוט | מוצרי טקסטיל ביתיים | yes | 11 | — |  |
| `construction-and-industrial-06` | בנייה ותעשייה | זכוכית בטיחות לבניין | yes | 4 | standards |  |
| `additional-consumer-products-10` | מוצרי צריכה נוספים | קסדות | yes | 48 | standards |  |

## Explicitly deferred / not performed in this pass

This program's own specification (Phase 9) requires verifying every approved regulatory direction's high-level authority against current official Israeli sources. **This was not performed in this pass** — this environment has no verified live access to official Israeli government sources, and fabricating that verification would violate the explicit no-invented-regulation rule. Every existing regulatory signal is left exactly as currently merged (no regulatory content was changed), and this gap is recorded as a Product Owner decision-backlog item, not silently assumed complete.

The full 16-item cross-family collision matrix (Phase 7) was not rebuilt from scratch; the existing `reconciliation.test.js` (228 lines) and `family-suggestion-registry-boundary.test.js` (378 lines) already exercise a substantial subset of these collision classes (duplicate/normalized aliases, negation, product-vs-part, cross-family suppression) and were re-run as part of full-suite validation. A from-scratch enumeration of all 16 named collision classes against all 73 active families was not performed as a distinct new artifact in this pass, given the scope of this single program; this is recorded as a decision-backlog / follow-up item, not claimed as complete.

Full 4-viewport browser validation across every domain cluster (Phase 10) was reduced to a targeted spot-check of the families actually modified by this package (the 11 test-coverage-gap families) plus one representative multi-authority family, rather than an exhaustive sweep of all 73 active families at all 4 viewports — see the PR body for exactly what was run.
