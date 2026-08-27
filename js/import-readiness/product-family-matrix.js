/**
 * GENERATED FILE -- do not hand-edit.
 *
 * Produced by scripts/generate_product_family_matrix.py from the
 * product-owner-authored workbook at
 * data/FreighTime_Simple_Import_Requirements_Matrix.xlsx (sheet
 * "דרישות יבוא").
 * See docs/product-family-matrix-engine.md for the full interpretation
 * rules and the update workflow.
 *
 * Interpretation already applied during generation (not at runtime):
 *   "כן"    -> true  (positive regulatory signal)
 *   "לבדוק" -> false (definite negative signal, not "unknown")
 *
 * Regenerate with: python3 scripts/generate_product_family_matrix.py
 */

export const PRODUCT_FAMILY_MATRIX = Object.freeze(
  [
    {
      "id": "food-and-beverages-01",
      "category": "מזון ומשקאות",
      "publicFamilyName": "מזון ארוז",
      "aliases": [
        "מזון ארוז",
        "אוכל ארוז",
        "מוצר מזון ארוז",
        "חטיף ארוז",
        "שימורים",
        "שימורי ירקות",
        "קופסת שימורים",
        "מזון משומר",
        "canned food",
        "canned goods"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": true,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": "כמות לא מסחרית",
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 2
    },
    {
      "id": "food-and-beverages-02",
      "category": "מזון ומשקאות",
      "publicFamilyName": "משקאות",
      "aliases": [
        "משקאות",
        "משקה",
        "משקה ארוז"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": true,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": "כמות לא מסחרית",
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 3
    },
    {
      "id": "food-and-beverages-03",
      "category": "מזון ומשקאות",
      "publicFamilyName": "תוספי תזונה",
      "aliases": [
        "תוספי תזונה",
        "תוסף תזונה",
        "תוסף מזון",
        "תוסף תזונה לאדם",
        "ויטמינים למאכל אדם",
        "vitamins for human consumption"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": true,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": "כמות לא מסחרית",
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 4
    },
    {
      "id": "food-and-beverages-04",
      "category": "מזון ומשקאות",
      "publicFamilyName": "מזון מן החי",
      "aliases": [
        "מזון מן החי",
        "בשר",
        "עוף",
        "דגים",
        "מוצרי חלב",
        "גבינה",
        "דבש",
        "ביצים",
        "ביצים טריות",
        "ביצי מאכל",
        "מוצרי ביצים"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": true,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": true,
        "otherPermit": false
      },
      "personalImportNote": "כמות לא מסחרית",
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 5
    },
    {
      "id": "food-and-beverages-05",
      "category": "מזון ומשקאות",
      "publicFamilyName": "תוצרת חקלאית, זרעים וצמחים",
      "aliases": [
        "תוצרת חקלאית, זרעים וצמחים",
        "תוצרת חקלאית",
        "זרעים",
        "שתילים",
        "צמחים",
        "פירות וירקות"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": true,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": true,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 6
    },
    {
      "id": "food-contact-01",
      "category": "מגע עם מזון",
      "publicFamilyName": "כלי פלסטיק במגע עם מזון",
      "aliases": [
        "כלי פלסטיק במגע עם מזון",
        "קופסת פלסטיק לאוכל",
        "כלי אחסון מזון מפלסטיק",
        "כלי פלסטיק למזון",
        "קופסת אוכל",
        "בקבוק פלסטיק למזון",
        "בקבוק פלסטיק למשקה"
      ],
      "regulatorySignals": {
        "standards": true,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "existing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 7
    },
    {
      "id": "food-contact-02",
      "category": "מגע עם מזון",
      "publicFamilyName": "מוצר עם ציפוי פולימרי במגע עם מזון",
      "aliases": [
        "מוצר עם ציפוי פולימרי במגע עם מזון",
        "ציפוי פולימרי במגע עם מזון",
        "מחבת עם ציפוי לא נדבק",
        "כלי בישול מצופה",
        "קרטון מצופה פולימר למגע עם מזון",
        "אריזת קרטון בציפוי פולימרי למזון",
        "polymer-coated cardboard for food contact"
      ],
      "regulatorySignals": {
        "standards": true,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "existing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 8
    },
    {
      "id": "food-contact-03",
      "category": "מגע עם מזון",
      "publicFamilyName": "כלי זכוכית במגע עם מזון או שתייה",
      "aliases": [
        "כלי זכוכית במגע עם מזון או שתייה",
        "כלי זכוכית במגע עם מזון",
        "כוס זכוכית",
        "כלי זכוכית לשתייה",
        "צנצנת זכוכית למזון",
        "בקבוק זכוכית למשקה",
        "בקבוק זכוכית למזון",
        "בקבוק הבא במגע עם משקה",
        "food-contact bottle",
        "beverage bottle",
        "glass food jar",
        "glass drinking vessel"
      ],
      "regulatorySignals": {
        "standards": true,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "existing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 9
    },
    {
      "id": "food-contact-04",
      "category": "מגע עם מזון",
      "publicFamilyName": "כלי קרמיקה במגע עם מזון",
      "aliases": [
        "כלי קרמיקה במגע עם מזון",
        "צלחת קרמיקה",
        "כוס קרמיקה",
        "קערת קרמיקה",
        "ספל קרמיקה",
        "ceramic plate",
        "ceramic bowl",
        "ceramic mug"
      ],
      "regulatorySignals": {
        "standards": true,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 10
    },
    {
      "id": "food-contact-05",
      "category": "מגע עם מזון",
      "publicFamilyName": "כלי מתכת במגע עם מזון",
      "aliases": [
        "כלי מתכת במגע עם מזון",
        "סיר מתכת",
        "מחבת מתכת"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 11
    },
    {
      "id": "electrical-and-electronics-01",
      "category": "חשמל ואלקטרוניקה",
      "publicFamilyName": "מכשיר חשמלי עם תקע או ספק כוח",
      "aliases": [
        "מכשיר חשמלי עם תקע או ספק כוח",
        "מכשיר חשמלי",
        "מכשיר עם תקע",
        "מכשיר עם ספק כוח"
      ],
      "regulatorySignals": {
        "standards": true,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "existing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 12
    },
    {
      "id": "electrical-and-electronics-02",
      "category": "חשמל ואלקטרוניקה",
      "publicFamilyName": "מטענים וספקי כוח",
      "aliases": [
        "מטענים וספקי כוח"
      ],
      "regulatorySignals": {
        "standards": true,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 13
    },
    {
      "id": "electrical-and-electronics-03",
      "category": "חשמל ואלקטרוניקה",
      "publicFamilyName": "כבלים ואביזרי חשמל",
      "aliases": [
        "כבלים ואביזרי חשמל"
      ],
      "regulatorySignals": {
        "standards": true,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 14
    },
    {
      "id": "electrical-and-electronics-04",
      "category": "חשמל ואלקטרוניקה",
      "publicFamilyName": "מוצר אלקטרוני ללא חיבור לרשת",
      "aliases": [
        "מוצר אלקטרוני ללא חיבור לרשת"
      ],
      "regulatorySignals": {
        "standards": true,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 15
    },
    {
      "id": "electrical-and-electronics-05",
      "category": "חשמל ואלקטרוניקה",
      "publicFamilyName": "מוצר אלחוטי, Wi-Fi או Bluetooth",
      "aliases": [
        "מוצר אלחוטי, Wi-Fi או Bluetooth",
        "מוצר אלחוטי",
        "Wi-Fi",
        "Bluetooth",
        "בלוטות",
        "וויי פיי",
        "מוצר עם קליטה אלחוטית",
        "ווקי טוקי",
        "מכשיר קשר",
        "מכשירי קשר",
        "רדיו דו כיווני",
        "מקמ\"ש",
        "walkie talkie",
        "two-way radio"
      ],
      "regulatorySignals": {
        "standards": true,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": true,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 16
    },
    {
      "id": "electrical-and-electronics-06",
      "category": "חשמל ואלקטרוניקה",
      "publicFamilyName": "ציוד סלולרי ותקשורת",
      "aliases": [
        "ציוד סלולרי ותקשורת",
        "ציוד סלולרי",
        "ציוד תקשורת",
        "מכשיר סלולרי"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": true,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 17
    },
    {
      "id": "electrical-and-electronics-07",
      "category": "חשמל ואלקטרוניקה",
      "publicFamilyName": "סוללות ותאים",
      "aliases": [
        "סוללות ותאים",
        "סוללה",
        "סוללת ליתיום",
        "מארז סוללות",
        "מצבר",
        "battery",
        "lithium battery",
        "battery pack",
        "accumulator"
      ],
      "regulatorySignals": {
        "standards": true,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 18
    },
    {
      "id": "electrical-and-electronics-08",
      "category": "חשמל ואלקטרוניקה",
      "publicFamilyName": "גופי תאורה ונורות",
      "aliases": [
        "גופי תאורה ונורות"
      ],
      "regulatorySignals": {
        "standards": true,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 19
    },
    {
      "id": "vehicles-and-transport-01",
      "category": "רכב ותחבורה",
      "publicFamilyName": "כלי רכב שלמים",
      "aliases": [
        "כלי רכב שלמים"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": true,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 20
    },
    {
      "id": "vehicles-and-transport-02",
      "category": "רכב ותחבורה",
      "publicFamilyName": "אופנועים וקטנועים שלמים",
      "aliases": [
        "אופנועים וקטנועים שלמים"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": true,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 21
    },
    {
      "id": "vehicles-and-transport-03",
      "category": "רכב ותחבורה",
      "publicFamilyName": "חלקי חילוף לרכב",
      "aliases": [
        "חלקי חילוף לרכב"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": true,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "partial",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 22
    },
    {
      "id": "vehicles-and-transport-04",
      "category": "רכב ותחבורה",
      "publicFamilyName": "חלקי חילוף לאופנועים וקטנועים",
      "aliases": [
        "חלקי חילוף לאופנועים וקטנועים"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": true,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "partial",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 23
    },
    {
      "id": "vehicles-and-transport-05",
      "category": "רכב ותחבורה",
      "publicFamilyName": "פנסים וגופי תאורה לרכב",
      "aliases": [
        "פנסים וגופי תאורה לרכב",
        "פנס לרכב",
        "פנסים לרכב",
        "גוף תאורה לרכב",
        "פנס ראש לרכב",
        "פנס קדמי לרכב",
        "פנס אחורי לרכב",
        "פנס ראשי לרכב",
        "פנס איתות לרכב"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": true,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "existing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 24
    },
    {
      "id": "vehicles-and-transport-06",
      "category": "רכב ותחבורה",
      "publicFamilyName": "חלקי בלימה, היגוי ובטיחות",
      "aliases": [
        "חלקי בלימה, היגוי ובטיחות"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": true,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "partial",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 25
    },
    {
      "id": "vehicles-and-transport-07",
      "category": "רכב ותחבורה",
      "publicFamilyName": "צמיגים וחישוקים",
      "aliases": [
        "צמיגים וחישוקים"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": true,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 26
    },
    {
      "id": "vehicles-and-transport-08",
      "category": "רכב ותחבורה",
      "publicFamilyName": "זכוכית ושמשות לרכב",
      "aliases": [
        "זכוכית ושמשות לרכב",
        "זכוכית בטיחות לרכב",
        "זכוכית בטחון להתקנה ברכב",
        "vehicle safety glass",
        "automotive safety glass"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": true,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 27
    },
    {
      "id": "vehicles-and-transport-09",
      "category": "רכב ותחבורה",
      "publicFamilyName": "אביזרי נוחות וקישוט לרכב",
      "aliases": [
        "אביזרי נוחות וקישוט לרכב"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": true,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "partial",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 28
    },
    {
      "id": "children-and-infants-01",
      "category": "ילדים ותינוקות",
      "publicFamilyName": "צעצועים",
      "aliases": [
        "צעצועים",
        "ספר צעצוע",
        "ספר פעילות עם חלקי משחק",
        "ספר ילדים בעל ערך משחקי",
        "interactive play book for children",
        "toy book"
      ],
      "regulatorySignals": {
        "standards": true,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 29
    },
    {
      "id": "children-and-infants-02",
      "category": "ילדים ותינוקות",
      "publicFamilyName": "צעצועים חשמליים או אלחוטיים",
      "aliases": [
        "צעצועים חשמליים או אלחוטיים"
      ],
      "regulatorySignals": {
        "standards": true,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 30
    },
    {
      "id": "children-and-infants-03",
      "category": "ילדים ותינוקות",
      "publicFamilyName": "מוצרי תינוקות",
      "aliases": [
        "מוצרי תינוקות"
      ],
      "regulatorySignals": {
        "standards": true,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 31
    },
    {
      "id": "children-and-infants-04",
      "category": "ילדים ותינוקות",
      "publicFamilyName": "עגלות, מיטות, לולים וכיסאות אוכל",
      "aliases": [
        "עגלות, מיטות, לולים וכיסאות אוכל"
      ],
      "regulatorySignals": {
        "standards": true,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 32
    },
    {
      "id": "health-and-cosmetics-01",
      "category": "בריאות ותמרוקים",
      "publicFamilyName": "תמרוקים",
      "aliases": [
        "תמרוקים",
        "קוסמטיקה",
        "מוצר קוסמטי",
        "לק ג'ל",
        "ג'ל לק",
        "לק לציפורניים",
        "תמרוק",
        "קרם פנים",
        "דיאודורנט",
        "deodorant",
        "קרם לטיפול בעור",
        "תכשיר לשיער",
        "תכשיר איפור",
        "makeup product",
        "קרם לחות"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": true,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 33
    },
    {
      "id": "health-and-cosmetics-02",
      "category": "בריאות ותמרוקים",
      "publicFamilyName": "ציוד רפואי",
      "aliases": [
        "ציוד רפואי",
        "מכשור רפואי"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": true,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 34
    },
    {
      "id": "health-and-cosmetics-03",
      "category": "בריאות ותמרוקים",
      "publicFamilyName": "מוצר בעל טענה רפואית",
      "aliases": [
        "מוצר בעל טענה רפואית",
        "טענה רפואית",
        "מוצר עם טענה רפואית"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": true,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 35
    },
    {
      "id": "health-and-cosmetics-04",
      "category": "בריאות ותמרוקים",
      "publicFamilyName": "תרופות",
      "aliases": [
        "תרופות"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": true,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 36
    },
    {
      "id": "chemicals-and-materials-01",
      "category": "כימיקלים וחומרים",
      "publicFamilyName": "חומרי ניקוי וחיטוי",
      "aliases": [
        "חומרי ניקוי וחיטוי",
        "חומר ניקוי",
        "נוזל ניקוי",
        "אבקת כביסה",
        "cleaning product"
      ],
      "regulatorySignals": {
        "standards": true,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 37
    },
    {
      "id": "chemicals-and-materials-02",
      "category": "כימיקלים וחומרים",
      "publicFamilyName": "צבעים, דבקים וחומרי איטום",
      "aliases": [
        "צבעים, דבקים וחומרי איטום"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 38
    },
    {
      "id": "chemicals-and-materials-03",
      "category": "כימיקלים וחומרים",
      "publicFamilyName": "חומרי הדברה",
      "aliases": [
        "חומרי הדברה"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": true,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 39
    },
    {
      "id": "chemicals-and-materials-04",
      "category": "כימיקלים וחומרים",
      "publicFamilyName": "כימיקלים תעשייתיים וחומרים מסוכנים",
      "aliases": [
        "כימיקלים תעשייתיים וחומרים מסוכנים"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 40
    },
    {
      "id": "textiles-and-furniture-01",
      "category": "טקסטיל וריהוט",
      "publicFamilyName": "ביגוד וטקסטיל",
      "aliases": [
        "ביגוד וטקסטיל",
        "ביגוד",
        "בגד",
        "טקסטיל",
        "בגדים",
        "חולצה",
        "מכנס",
        "מכנסיים",
        "שמלה",
        "ג'קט",
        "מעיל",
        "גרביים",
        "גרב",
        "shirt",
        "t-shirt"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 41
    },
    {
      "id": "textiles-and-furniture-02",
      "category": "טקסטיל וריהוט",
      "publicFamilyName": "הנעלה רגילה",
      "aliases": [
        "הנעלה רגילה",
        "הנעלה",
        "נעליים",
        "מגפיים",
        "סנדלים",
        "נעלי ספורט",
        "shoes",
        "boots",
        "sandals",
        "sports shoes"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 42
    },
    {
      "id": "textiles-and-furniture-03",
      "category": "טקסטיל וריהוט",
      "publicFamilyName": "מזרנים",
      "aliases": [
        "מזרנים",
        "מזרן",
        "mattress",
        "mattresses"
      ],
      "regulatorySignals": {
        "standards": true,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 43
    },
    {
      "id": "construction-and-industrial-01",
      "category": "בנייה ותעשייה",
      "publicFamilyName": "חומרי בנייה",
      "aliases": [
        "חומרי בנייה"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 44
    },
    {
      "id": "construction-and-industrial-02",
      "category": "בנייה ותעשייה",
      "publicFamilyName": "מכונות וציוד תעשייתי",
      "aliases": [
        "מכונות וציוד תעשייתי"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 45
    },
    {
      "id": "construction-and-industrial-03",
      "category": "בנייה ותעשייה",
      "publicFamilyName": "מוצרי עץ וחומרי גלם מן הצומח",
      "aliases": [
        "מוצרי עץ וחומרי גלם מן הצומח"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": true,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 46
    },
    {
      "id": "additional-consumer-products-01",
      "category": "מוצרי צריכה נוספים",
      "publicFamilyName": "ציוד ספורט",
      "aliases": [
        "ציוד ספורט",
        "משקולות",
        "מכשיר אימון לא חשמלי",
        "non-electric training equipment",
        "weights",
        "ordinary sports equipment"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 47
    },
    {
      "id": "additional-consumer-products-02",
      "category": "מוצרי צריכה נוספים",
      "publicFamilyName": "אופניים וקורקינטים רגילים",
      "aliases": [
        "אופניים וקורקינטים רגילים",
        "אופניים וקורקינטים",
        "אופניים",
        "אופני הרים",
        "אופני ילדים",
        "קורקינט רגיל",
        "bicycle",
        "mountain bicycle",
        "non-motorized scooter"
      ],
      "regulatorySignals": {
        "standards": true,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 48
    },
    {
      "id": "additional-consumer-products-03",
      "category": "מוצרי צריכה נוספים",
      "publicFamilyName": "רחפנים",
      "aliases": [
        "רחפנים"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": true,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 49
    },
    {
      "id": "additional-consumer-products-04",
      "category": "מוצרי צריכה נוספים",
      "publicFamilyName": "ציוד ימי וכלי שיט",
      "aliases": [
        "ציוד ימי וכלי שיט"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": true
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 50
    },
    {
      "id": "additional-consumer-products-05",
      "category": "מוצרי צריכה נוספים",
      "publicFamilyName": "מוצרים לבעלי חיים",
      "aliases": [
        "מוצרים לבעלי חיים",
        "מוצר לבעלי חיים",
        "מוצרים לחיות מחמד",
        "רצועה לכלב",
        "קולר לחתול",
        "מיטה לחיית מחמד",
        "קערה לחיית מחמד",
        "צעצוע לחיית מחמד",
        "מברשת טיפוח לחיית מחמד",
        "אביזר לאקווריום",
        "pet leash",
        "pet collar",
        "pet bed",
        "pet bowl",
        "pet toy",
        "grooming brush for pets",
        "aquarium accessory"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 51
    },
    {
      "id": "health-and-cosmetics-05",
      "category": "בריאות ותמרוקים",
      "publicFamilyName": "בשמים",
      "aliases": [
        "בשמים",
        "בושם",
        "perfume",
        "eau de parfum",
        "eau de toilette"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 52
    },
    {
      "id": "textiles-and-furniture-04",
      "category": "טקסטיל וריהוט",
      "publicFamilyName": "הנעלת בטיחות",
      "aliases": [
        "הנעלת בטיחות",
        "נעלי בטיחות",
        "נעלי עבודה עם מיגון",
        "safety shoes",
        "safety boots",
        "protective footwear"
      ],
      "regulatorySignals": {
        "standards": true,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 53
    },
    {
      "id": "additional-consumer-products-06",
      "category": "מוצרי צריכה נוספים",
      "publicFamilyName": "ציוד מגן אישי",
      "aliases": [
        "ציוד מגן אישי",
        "קסדת מגן",
        "משקפי מגן",
        "כפפות מגן",
        "רתמת בטיחות",
        "ציוד הגנה נשימתית",
        "protective helmet",
        "protective eyewear",
        "protective gloves",
        "respiratory protection equipment",
        "safety harness",
        "sport protective equipment",
        "work protective equipment"
      ],
      "regulatorySignals": {
        "standards": true,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 54
    },
    {
      "id": "additional-consumer-products-07",
      "category": "מוצרי צריכה נוספים",
      "publicFamilyName": "אופניים או קורקינט עם מנוע עזר",
      "aliases": [
        "אופניים או קורקינט עם מנוע עזר",
        "אופניים חשמליים",
        "אופניים עם מנוע עזר",
        "קורקינט חשמלי",
        "קורקינט עם מנוע עזר",
        "electric bicycle",
        "bicycle with auxiliary motor",
        "electric scooter",
        "scooter with auxiliary motor"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": true,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 55
    },
    {
      "id": "food-and-beverages-06",
      "category": "מזון ומשקאות",
      "publicFamilyName": "ויטמינים לבעלי חיים",
      "aliases": [
        "ויטמינים לבעלי חיים",
        "תוסף ויטמינים לבעלי חיים",
        "animal vitamins",
        "veterinary feed vitamins"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": true,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 56
    },
    {
      "id": "food-and-beverages-07",
      "category": "מזון ומשקאות",
      "publicFamilyName": "ויטמינים לייצור תרופות",
      "aliases": [
        "ויטמינים לייצור תרופות",
        "חומר גלם ויטמיני לייצור תרופות",
        "vitamins for pharmaceutical manufacturing"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": true,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 57
    },
    {
      "id": "vehicles-and-transport-10",
      "category": "רכב ותחבורה",
      "publicFamilyName": "מצבר ייעודי לרכב",
      "aliases": [
        "מצבר ייעודי לרכב",
        "מצבר לרכב",
        "vehicle battery",
        "car battery",
        "vehicle accumulator"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": true,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 58
    },
    {
      "id": "textiles-and-furniture-05",
      "category": "טקסטיל וריהוט",
      "publicFamilyName": "ריהוט",
      "aliases": [
        "ריהוט",
        "שולחן",
        "כיסא",
        "ארון",
        "שידה",
        "ספה",
        "table",
        "chair",
        "cabinet",
        "ordinary furniture"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 59
    },
    {
      "id": "electrical-and-electronics-09",
      "category": "חשמל ואלקטרוניקה",
      "publicFamilyName": "ציוד הכולל סוללה",
      "aliases": [
        "ציוד הכולל סוללה",
        "מוצר הכולל סוללה פנימית",
        "ציוד נייד עם סוללה",
        "equipment containing an internal battery",
        "battery-powered device",
        "rechargeable device",
        "rechargeable equipment"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 60
    },
    {
      "id": "other-01",
      "category": "אחר",
      "publicFamilyName": "משפחה נוספת להשלמה ידנית",
      "aliases": [
        "משפחה נוספת להשלמה ידנית"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": false,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 61
    },
    {
      "id": "food-and-beverages-08",
      "category": "מזון ומשקאות",
      "publicFamilyName": "בעלי חיים",
      "aliases": [
        "בעלי חיים",
        "בעל חיים",
        "live animal",
        "live animals"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": true,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 62
    },
    {
      "id": "food-and-beverages-09",
      "category": "מזון ומשקאות",
      "publicFamilyName": "מזון לבעלי חיים",
      "aliases": [
        "מזון לבעלי חיים",
        "מזון לכלבים",
        "מזון לחתולים",
        "מזון לדגים",
        "מזון לציפורים",
        "מזון לחיות משק",
        "מזון לחיות מחמד",
        "animal feed",
        "dog food",
        "cat food",
        "fish food",
        "bird food",
        "livestock feed",
        "pet food"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": true,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 63
    },
    {
      "id": "electrical-and-electronics-10",
      "category": "חשמל ואלקטרוניקה",
      "publicFamilyName": "רחפן",
      "aliases": [
        "רחפן",
        "drone",
        "camera drone",
        "commercial drone"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": true,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 64
    },
    {
      "id": "construction-and-industrial-04",
      "category": "בנייה ותעשייה",
      "publicFamilyName": "כלי עבודה ידניים",
      "aliases": [
        "כלי עבודה ידניים",
        "פטיש",
        "מברג",
        "פלייר",
        "מפתח ברגים",
        "מסור ידני",
        "סט כלי עבודה ידניים",
        "hammer",
        "screwdriver",
        "pliers",
        "wrench",
        "hand saw",
        "hand tool set"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 65
    },
    {
      "id": "additional-consumer-products-08",
      "category": "מוצרי צריכה נוספים",
      "publicFamilyName": "קרטון לאריזה",
      "aliases": [
        "קרטון לאריזה",
        "קופסת קרטון",
        "ארגז קרטון",
        "קרטון גלי",
        "cardboard box",
        "corrugated carton",
        "shipping carton"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 66
    },
    {
      "id": "construction-and-industrial-05",
      "category": "בנייה ותעשייה",
      "publicFamilyName": "קופסת עץ לאריזה",
      "aliases": [
        "קופסת עץ לאריזה",
        "ארגז עץ",
        "wooden box",
        "wooden crate"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": true,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 67
    },
    {
      "id": "additional-consumer-products-09",
      "category": "מוצרי צריכה נוספים",
      "publicFamilyName": "נייר ומוצרי דפוס",
      "aliases": [
        "נייר ומוצרי דפוס",
        "נייר להדפסה",
        "מחברת",
        "ספר רגיל",
        "מדבקות",
        "תוויות",
        "שקית נייר",
        "נייר תרמי",
        "מוצר דפוס",
        "printing paper",
        "notebook",
        "ordinary book",
        "printed product",
        "paper label"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 68
    },
    {
      "id": "textiles-and-furniture-06",
      "category": "טקסטיל וריהוט",
      "publicFamilyName": "שטיחים",
      "aliases": [
        "שטיחים",
        "שטיח",
        "rug",
        "carpet"
      ],
      "regulatorySignals": {
        "standards": true,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 69
    },
    {
      "id": "textiles-and-furniture-07",
      "category": "טקסטיל וריהוט",
      "publicFamilyName": "שמיכה רגילה",
      "aliases": [
        "שמיכה רגילה",
        "שמיכה",
        "שמיכת בד",
        "blanket",
        "textile blanket"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 70
    },
    {
      "id": "children-and-infants-05",
      "category": "ילדים ותינוקות",
      "publicFamilyName": "מחזיק מוצץ",
      "aliases": [
        "מחזיק מוצץ",
        "pacifier holder",
        "pacifier clip"
      ],
      "regulatorySignals": {
        "standards": true,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 71
    },
    {
      "id": "children-and-infants-06",
      "category": "ילדים ותינוקות",
      "publicFamilyName": "מנשא לתינוק",
      "aliases": [
        "מנשא לתינוק",
        "baby carrier",
        "infant carrier"
      ],
      "regulatorySignals": {
        "standards": true,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 72
    },
    {
      "id": "textiles-and-furniture-08",
      "category": "טקסטיל וריהוט",
      "publicFamilyName": "מוצרי טקסטיל ביתיים",
      "aliases": [
        "מוצרי טקסטיל ביתיים",
        "מצעים",
        "וילונות",
        "מגבות",
        "בד לריפוד",
        "תיק בד",
        "bedding",
        "curtains",
        "towels",
        "upholstery fabric",
        "fabric bag"
      ],
      "regulatorySignals": {
        "standards": false,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 73
    },
    {
      "id": "construction-and-industrial-06",
      "category": "בנייה ותעשייה",
      "publicFamilyName": "זכוכית בטיחות לבניין",
      "aliases": [
        "זכוכית בטיחות לבניין",
        "זכוכית בטחון לשימוש בבניינים",
        "building safety glass",
        "architectural safety glass"
      ],
      "regulatorySignals": {
        "standards": true,
        "healthUmbrella": false,
        "transportOrVehicleLaboratory": false,
        "communications": false,
        "agriculture": false,
        "otherPermit": false
      },
      "personalImportNote": null,
      "commercialImportNote": null,
      "currentSystemCoverage": "missing",
      "shortNotes": null,
      "optionalSubdomain": null,
      "activeStatus": true,
      "version": 1,
      "productOwnerReviewedDate": "2026-08-18",
      "sourceRow": 74
    }
  ].map((family) => Object.freeze({ ...family, regulatorySignals: Object.freeze({ ...family.regulatorySignals }), aliases: Object.freeze([...family.aliases]) })));

export function findFamilyById(id) {
  return PRODUCT_FAMILY_MATRIX.find((family) => family.id === id) || null;
}

export function activeFamilies() {
  return PRODUCT_FAMILY_MATRIX.filter((family) => family.activeStatus);
}

export function familiesByCategory(category) {
  return activeFamilies().filter((family) => family.category === category);
}
