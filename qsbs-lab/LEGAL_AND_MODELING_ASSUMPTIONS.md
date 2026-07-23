# Legal and Modeling Assumptions
## BrightPath QSBS & Business Strategy Lab
## Version 1.0 | June 2026

---

## DISCLAIMER

This application is a strategic planning and educational tool. It is **not** a tax return preparer, legal opinion, valuation opinion, appraisal, or substitute for licensed tax counsel, corporate counsel, a CPA, or a qualified valuation professional.

Every eligibility conclusion in this application is qualified. No conclusion is guaranteed, IRS-approved, or certain. All results reflect assumptions entered by the user and rules modeled as of the law-set review date shown in the application. Tax law changes frequently. The application may not reflect the most recent law. No conclusion should be acted upon without review by a qualified tax attorney or CPA.

---

## PRIMARY LEGAL SOURCES

All rules modeled in this application are sourced from or derived from:

| Citation | Title | Proposition Modeled |
|---|---|---|
| 26 U.S.C. § 1202 | Partial exclusion for gain from certain small business stock | Core QSBS eligibility, exclusion percentages, aggregate gross assets, active business requirements, excluded categories |
| 26 U.S.C. § 1202(a) | Exclusion general rule | Noncorporate taxpayer requirement, exclusion percentage |
| 26 U.S.C. § 1202(b) | Limitations | $10M/$15M fixed-dollar limit, 10-times-basis limit |
| 26 U.S.C. § 1202(c) | Qualified small business stock definition | C-corporation requirement, original issue, money/property/services |
| 26 U.S.C. § 1202(d) | Qualified small business | Aggregate gross assets test, $50M/$75M threshold |
| 26 U.S.C. § 1202(e) | Active business requirement | 80% active use, startup period, R&E, working capital |
| 26 U.S.C. § 1202(e)(3) | Excluded service businesses | Enumerated excluded categories |
| 26 U.S.C. § 1202(f)-(k) | Special rules | Redemptions, controlled groups, contributed property, basis rules |
| 26 U.S.C. § 351 | Transfer to corporation controlled by transferor | Property contributions in exchange for stock, basis carryover |
| 26 U.S.C. § 368 | Definitions relating to corporate reorganizations | Reorganization types, basis treatment |
| 26 U.S.C. § 1045 | Rollover of gain from qualified small business stock | Rollover treatment |
| 26 U.S.C. § 1411 | Imposition of tax (NIIT) | Net investment income tax, 3.8% rate |
| IRS Schedule D Instructions (current year) | Capital Gains and Losses | Reporting, rate tiers, exclusion mechanics |

**Law-set last reviewed: June 2026**

The application includes a law configuration panel showing the review date. If the review date is more than 6 months old, treat all conclusions as stale pending re-verification.

---

## POST-JULY 4, 2025 STATUTORY CHANGES

The application models a statutory change effective for stock acquired after July 4, 2025. The modeled changes include:

- Aggregate gross assets threshold: $50 million (historical) → $75 million (post-change)
- Fixed-dollar limitation baseline: $10 million (historical) → $15 million (post-change)
- Exclusion schedule for post-change stock: 50% at 3 years / 75% at 4 years / 100% at 5+ years

**These changes are modeled based on publicly reported legislative information as of the law-set review date. Users must verify current law before relying on these figures. The application's law configuration panel is editable so users can update these values if the law differs.**

The application applies rules based on the acquisition date of the stock — not the sale date or the current date. Stock acquired on or before July 4, 2025 is modeled under historical rules. Stock acquired after July 4, 2025 is modeled under post-change rules. This distinction is critical and is preserved throughout all calculations.

---

## KEY DISTINCTIONS MODELED

### Entity Form vs. Tax Classification

A **limited liability company (LLC)** is a state-law entity. It does not have a fixed federal tax classification. A single-member LLC is classified as a disregarded entity by default. A multi-member LLC is classified as a partnership by default. Either can elect to be taxed as an S corporation or C corporation.

A **C corporation** is a federal tax classification — not solely a state-law entity type. Both LLCs and corporations can be classified as C corporations for federal tax purposes.

**QSBS under Section 1202 generally requires the issuer to be a C corporation.** An LLC taxed as a C corporation may qualify, but this is a complex area requiring professional review. The application flags this as requiring professional review rather than assuming automatic qualification.

### S Corporation vs. C Corporation

S corporation status is a federal tax election — not a separate state-law entity. A corporation can revoke its S election and become a C corporation. The date of revocation determines when the C-corporation period begins for QSBS purposes. Prior S-corporation period does not automatically disqualify later-issued stock, but the holding period runs only from the issuance date of the stock (or the conversion date, whichever applies).

### Enterprise Value vs. Aggregate Gross Assets

**Enterprise value** is a market concept reflecting what a willing buyer would pay for the entire business. It incorporates goodwill, brand value, future cash flows, synergies, and other factors.

**Aggregate gross assets** under Section 1202 is a statutory concept meaning cash plus the aggregate adjusted bases of other property held by the corporation. It is not enterprise value. A company with $5 million in cash and $2 million in equipment bases has aggregate gross assets of approximately $7 million even if its enterprise value is $50 million.

The application computes these separately. **Users who confuse enterprise value with aggregate gross assets will generate incorrect results.**

### Shareholder Basis vs. Section 1202 Basis vs. Inside Basis

**Shareholder stock basis** is the shareholder's tax basis in the stock — generally equal to the amount paid, increased by certain items, and decreased by distributions.

**Section 1202 basis** is a special basis concept used only for purposes of the ten-times-basis limitation under Section 1202(b)(1)(B). For contributed property, the basis used in the Section 1202 limitation is the fair market value of the property at contribution — not the carryover basis. This is a significant distinction for founders who contribute appreciated IP or other property.

**Inside basis** is the corporation's tax basis in its assets — not the shareholder's basis in the stock.

These concepts are computed and displayed separately in the application. The application never treats them as interchangeable.

### Stock Sale vs. Asset Sale

A stock sale transfers ownership of the corporate entity. The shareholder recognizes gain equal to proceeds minus stock basis. QSBS exclusion applies at the shareholder level.

An asset sale involves the corporation selling its underlying assets. The corporation recognizes gain, pays corporate tax, and then distributes after-tax proceeds to shareholders (who may owe additional tax on the distribution or liquidation). **QSBS exclusion generally does not protect corporate-level gain in an asset sale.** The application models both structures and shows the different tax results.

### Conversion Does Not Automatically Create QSBS

Converting an LLC to a C corporation, revoking an S election, or reorganizing into a C corporation does not automatically create qualifying small business stock. The stock must be:

- originally issued by a C corporation (at the time of issuance, not merely at conversion)
- acquired in exchange for money, eligible property, or qualifying services
- held for the required period
- issued when aggregate gross assets were below the threshold

The application flags conversion scenarios as requiring professional review, particularly regarding original-issue status, the tax consequences of the conversion itself, and basis treatment.

### Business Category — Labels Do Not Decide

The application does not determine QSBS qualification from a business label. The fact that a company is described as "SaaS," "EdTech," "tutoring," "consulting," or "mixed" does not decide whether it is an excluded business.

The relevant question is whether the business is a trade or business involving the performance of services in an excluded field listed in Section 1202(e)(3). The application evaluates this through a structured interview examining revenue composition, delivery mechanism, asset composition, founder dependence, scalability, and other factors. The result is a scored matrix, not a binary label.

---

## EXCLUDED BUSINESS CATEGORIES

The following categories are flagged as potentially excluded from QSBS qualification based on Section 1202(e)(3). Inclusion in this list does not guarantee disqualification. Businesses with mixed revenue or ambiguous facts are labeled uncertain pending professional review.

- Health (including medicine, dentistry, veterinary services)
- Law
- Engineering
- Architecture
- Accounting
- Actuarial science
- Performing arts
- Consulting
- Athletics
- Financial services
- Brokerage services
- Business whose principal asset is the reputation or skill of one or more employees or owners
- Banking, insurance, financing, leasing, investing, or similar businesses
- Farming
- Business involving production or extraction of certain natural resources
- Hotels, motels, restaurants, or similar businesses

The **"reputation or skill" category** is the most uncertain and most relevant for founder-led businesses. The IRS has interpreted this narrowly (requiring that the business's principal asset be the individual's reputation), but the application flags founder-dependent revenue as a risk factor.

---

## BRIGHTPATH-SPECIFIC ANALYSIS

The application includes a preloaded BrightPath profile that analyzes BrightPath as a **multilingual education-technology and SaaS platform**. The analysis distinguishes between:

- Revenue derived from proprietary software subscriptions, curriculum licensing, automated diagnostic delivery, and platform access (software-oriented revenue)
- Revenue derived from human tutoring, consulting, implementation, or founder-dependent services (service-oriented revenue)

The qualification assessment for BrightPath specifically considers:

1. Whether BrightPath's principal asset is proprietary software, algorithms, curriculum, question banks, misconception databases, and diagnostic systems (supporting qualification)
2. Whether BrightPath's principal asset is the reputation, skill, or time of the founder or tutors (risk factor)
3. Whether BrightPath's subscriptions can scale without proportional growth in direct human service delivery (supporting qualification)
4. Whether any revenue is derived from consulting, implementation, or custom services (risk factor)

**The application does not conclude that BrightPath qualifies merely because it is labeled SaaS or EdTech. The conclusion depends on the facts entered by the user and is always qualified.**

---

## VALUATION DISCLAIMER

Valuation estimates in this application are illustrative planning inputs. They are not appraisals. They are not opinions of value. No valuation method in this application has been reviewed or approved by any valuation professional.

For QSBS purposes, aggregate gross assets are measured using the corporation's cash plus adjusted bases of other property — not estimated fair market values (except for contributed property). The application computes aggregate gross assets separately from the valuation estimates.

A higher estimated valuation does not help the user exceed the ten-times-basis limitation by inserting a larger number. The application warns that choosing a higher valuation number does not make it supportable and may actually push aggregate gross assets above the threshold.

---

## CALCULATION METHODOLOGY

All calculations are deterministic. The rule engine does not use machine learning or probabilistic inference to determine eligibility. Every result is derived from rules modeled in the `lawConfig` object applied to user inputs.

Every calculation result includes a visible trace showing:
- inputs used
- rules applied
- intermediate calculations
- final result
- source citations for each rule

---

## WHAT THIS APPLICATION CANNOT DO

This application cannot:
- Provide a legal opinion
- Provide a tax opinion
- Determine the actual fair market value of any asset, company, or stock
- Determine whether a specific conversion or transaction is valid under state law
- Determine whether a specific Section 351 exchange is valid
- Determine whether a specific reorganization qualifies under Section 368
- Guarantee any tax result
- Replace a qualified tax attorney or CPA

Every result generated by this application should be reviewed by a qualified tax professional before any planning decisions are made.
