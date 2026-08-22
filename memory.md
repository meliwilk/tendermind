# Company Memory — Meridian Infra-EPC Private Limited

**Temporary memory store.** This file holds TenderMind's Company Memory until the real datastore (Postgres + `pgvector`, per [TENDER_ASSISTANT.md](TENDER_ASSISTANT.md) §4.2) is built. Agents read facts from here; the logical schema this maps onto is defined in [agents/skills/tender-intake.md](agents/skills/tender-intake.md#company-memory-layer-and-match-engine).

**Source:** [memory/Sample_Company_Profile_TenderMind.pdf](memory/Sample_Company_Profile_TenderMind.pdf) — "Company Profile & Corporate Capability Statement," Document Version 3.2, August 2026. Single source document; 17 pages.

> **This is fictional sample data.** The source document states it was generated for TenderMind evaluation/testing only — all company names, figures, projects, and personnel are invented, and it "should not be used for actual bid submission." Treat it as a fixture, never as a real bidder profile.

## Citation rule

Every fact below carries a `[p.N]` reference to the page of the source PDF it came from. Per [TENDER_ASSISTANT.md](TENDER_ASSISTANT.md) §3.2 and the PRD's universal-provenance requirement, an uncited fact is not usable by any agent — if something isn't in this file with a page reference, the correct answer is `UNKNOWN`, not an inference. Values labelled **derived** are computed from cited facts by fixed arithmetic (shown inline), never estimated.

---

## 1. Company identity

| Fact | Value | Source |
|---|---|---|
| Legal name | Meridian Infra-EPC Private Limited | [p.1] |
| Legal constitution | Private Limited Company, incorporated under the Companies Act, 2013 | [p.5] |
| Date of incorporation | 14 March 2009 | [p.5] |
| CIN | U45201PN2009PTC132456 | [p.1], [p.5] |
| PAN | ABCDE1234F | [p.5] |
| GST (Maharashtra) | 27ABCDE1234F1Z5 | [p.1], [p.5] |
| MSME / Udyam registration | UDYAM-MH-03-0045678 (Medium Enterprise) | [p.5] |
| Registered office | Plot 14, Industrial Estate Road, Pune, Maharashtra – 411019 | [p.1], [p.5] |
| Business type | Multi-disciplinary EPC contractor | [p.3] |
| Years in operation | 16 (as at document date, August 2026) | [p.3] |
| Permanent staff | ~640, plus subcontracted flexible labour pool at peak | [p.3] |
| Regional offices | Pune, Ahmedabad, Hyderabad, Bhubaneswar | [p.3] |
| Design office | Central engineering & design office, Pune — civil, structural, mechanical, electrical, instrumentation teams | [p.3] |
| Contracts executed since inception | 87, cumulative value > INR 2,340 crore | [p.3] |
| Contract terminations for default | None since inception | [p.3], [p.16] |

### 1.1 Business divisions [p.3]

Four divisions, each under a Divisional Head reporting to the Managing Director:

1. **Industrial & Process EPC** — factories, warehouses, process plants
2. **Water & Wastewater Infrastructure** — treatment plants, pipelines, pumping stations
3. **Roads, Bridges & Urban Infrastructure**
4. **Renewable Energy & Balance-of-Plant** — solar EPC, substations

### 1.2 Core competencies [p.3]

Pre-bid engineering and estimation · detailed engineering · procurement and vendor management · site construction and erection · commissioning · post-handover operations & maintenance support.

### 1.3 Operating geography

India, plus unspecified "select overseas markets" [p.3]. Registered/GST presence: Maharashtra, with additional state registrations held for Gujarat and at least one further state [p.5] — see [§14 Extraction notes](#14-extraction-notes) (field truncated in source).

---

## 2. Legal & registration status

| Registration | Detail | Source |
|---|---|---|
| PWD Maharashtra contractor class | Class I-A (Civil), Class I-B (Electrical/Mechanical) | [p.5] |
| Bankers | State Bank of India, Pune Industrial Estate Branch; HDFC Bank, Corporate Banking | [p.5] |
| Statutory notices / blacklisting / debarment | None unresolved as at document date; signed self-declaration at Annexure D | [p.5], [p.16] |

---

## 3. Financial standing [p.7]

All figures INR crore.

| Financial year | Gross annual turnover | Net worth | Net profit |
|---|---|---|---|
| FY 2020-21 | 212.4 | 68.1 | 9.8 |
| FY 2021-22 | 248.7 | 76.5 | 11.2 |
| FY 2022-23 | 289.3 | 88.9 | 13.6 |
| FY 2023-24 | 331.6 | 103.2 | 16.4 |
| FY 2024-25 | 368.9 | 119.8 | 18.9 |

Audited annually by a Chartered Accountancy firm empanelled with the ICAI; full statements at Annexure B [p.7].

### 3.1 Derived financial metrics

Computed from the table above by fixed arithmetic — these are the values most tender eligibility criteria are actually tested against.

| Metric | Value | Computation |
|---|---|---|
| Average annual turnover, last 5 FY | **INR 290.18 Cr** | (212.4 + 248.7 + 289.3 + 331.6 + 368.9) ÷ 5 |
| Average annual turnover, last 3 FY | **INR 329.93 Cr** | (289.3 + 331.6 + 368.9) ÷ 3 |
| Latest net worth (FY 2024-25) | **INR 119.8 Cr** | — |
| Latest net profit margin | **5.12%** | 18.9 ÷ 368.9 |
| Turnover CAGR, FY 2020-21 → FY 2024-25 | **14.80%** | (368.9 ÷ 212.4)^(1/4) − 1 |
| Average contract value since inception | **≈ INR 26.9 Cr** | 2,340 ÷ 87 [p.3] |

### 3.2 Banking & bonding capacity [p.7]

| Fact | Value |
|---|---|
| Working capital facility (fund + non-fund based) | INR 145 crore, consortium bankers — cash credit, bank guarantee, letter of credit limits |
| Undrawn bank guarantee limit | ≈ INR 62 crore as at document date |
| Stated supportable contract volume | Performance security and advance BG requirements for contracts up to **≈ INR 300 crore cumulative** |
| Banker's solvency certificate | Annexure C |

### 3.3 Statutory compliance [p.7]

Current on Provident Fund, ESI, Professional Tax, and Income Tax as at document date. Compliance certificates for the preceding financial year available on request.

---

## 4. Insurance coverage [p.8]

| Policy | Coverage | Insurer |
|---|---|---|
| Contractor's All Risk (CAR) | Project-specific, issued per contract value | National Insurance Co. Ltd. |
| Workmen Compensation | Per Workmen's Compensation Act, 1923 | National Insurance Co. Ltd. |
| Third Party Liability | INR 5 crore per occurrence (standing policy) | New India Assurance Co. Ltd. |
| Plant & Equipment | Owned major equipment, replacement value basis | New India Assurance Co. Ltd. |
| Professional Indemnity (Design) | INR 10 crore aggregate | ICICI Lombard |

Project-specific CAR and Workmen's Compensation policies are taken out at contract award, sized to the specific tender's insurance schedule, with copies furnished to client/consultant before mobilization [p.8].

> **Agent note:** only Third Party Liability (INR 5 Cr) and Professional Indemnity (INR 10 Cr) are standing limits. CAR and WC limits are `UNKNOWN` until a specific contract value is set — a tender demanding a *stated* CAR limit at bid stage cannot be answered from memory alone.

---

## 5. Key personnel [p.9]

| Name | Designation | Qualification | Experience | Specialization |
|---|---|---|---|---|
| R. Venkatesh | Director – Engineering | B.E. Civil, M.Tech Structures | 27 yrs | Industrial structures, EPC design coordination |
| S. Kulkarni | Head – QHSE | B.E. Mechanical, NEBOSH IGC | 19 yrs | Safety management systems, ISO 45001 audits |
| A. Fernandes | Sr. Project Manager | B.E. Civil, PMP | 22 yrs | Water treatment plants, pipeline projects |
| M. Reddy | Sr. Project Manager | B.Tech Electrical | 18 yrs | Substations, solar EPC balance-of-plant |
| P. Deshmukh | Head – Procurement | B.E. Mechanical, MBA | 16 yrs | Vendor development, long-lead procurement |
| N. Iyer | Planning Manager | B.E. Civil, Primavera P6 Certified | 14 yrs | Project scheduling, EVM reporting |

**Deployable bench** [p.9]: 34 qualified engineers (civil, mechanical, electrical, instrumentation) and 12 safety officers, available for new contracts within **15–30 days of award**, subject to concurrent site commitments.

**Corporate leadership roles** [p.6]: Managing Director (strategy, client relationships, contract approval authority) · Director – Operations · Director – Engineering · Chief Financial Officer · Head – QHSE · Head – Procurement · Head – Human Resources. Matrix organization; Project Managers hold full site execution authority subject to the delegation-of-authority policy. Detailed org chart at Annexure A.

---

## 6. Plant & equipment [p.10]

| Category | Owned units | Representative capacity |
|---|---|---|
| Excavators | 14 | 0.9–1.2 cum bucket |
| Concrete batching plants | 3 | 30 cum/hr & 60 cum/hr |
| Transit mixers | 9 | 6 cum |
| Tower cranes | 4 | up to 8 tonne, 50 m boom |
| Mobile cranes | 6 | 25–75 tonne |
| DG sets | 22 | 62.5 kVA – 500 kVA |
| Survey equipment | 11 total stations, 6 GPS/RTK units | — |
| Welding & fabrication sets | 40+ | Site fabrication yards at 3 locations |

Full asset register at Annexure F [p.10].

**In-house design software** [p.10]: AutoCAD, STAAD.Pro, ETABS, Primavera P6, SAP2000 — supporting detailed engineering and planning without external consultants for routine design verification.

---

## 7. Subcontractors, vendors & training

| Fact | Value | Source |
|---|---|---|
| Empanelled specialist subcontractors | 68 — structural steel fabrication, piling, HVAC, electrical finishing, instrumentation | [p.11] |
| Material vendors | 140+ | [p.11] |
| Vendor evaluation | Annual scorecard: quality, delivery, safety compliance, commercial competitiveness | [p.11] |
| Subcontractor onboarding | Documented pre-qualification review including site visit and reference checks | [p.11] |
| Training academy | In-house Skill Training Academy, Pune; affiliated to a State Skill Development scheme | [p.11] |
| Workers trained FY 2024-25 | 412 (masons, bar-benders, electricians, equipment operators) | [p.11] |

---

## 8. QHSE

Integrated Management System certified to ISO 9001:2015, ISO 14001:2015, and ISO 45001:2018. Audited internally quarterly, externally by the certifying body annually [p.12].

### 8.1 Safety performance [p.12]

| Metric | FY 2022-23 | FY 2023-24 | FY 2024-25 |
|---|---|---|---|
| Total man-hours worked | 2.1 million | 2.4 million | 2.6 million |
| LTIFR | 0.42 | 0.31 | 0.24 |
| Fatalities | 0 | 0 | 0 |
| Near-miss reports filed | 186 | 224 | 261 |
| Safety training man-hours | 9,400 | 11,200 | 13,050 |

LTIFR improving year-on-year; zero fatalities across all three reported years.

### 8.2 Quality & environmental framework [p.12]

- Project Quality Plan (PQP) per project, derived from the corporate Quality Manual, tailored to contract specs and applicable codes (IS, ASTM, or client standards).
- Inspection and Test Plans (ITPs) agreed with client/consultant at contract outset.
- Third-party testing through NABL-accredited laboratories (concrete, soil, material).
- Environmental controls: dust suppression, licensed-vendor debris disposal, rainwater harvesting at site offices where feasible, compliance with State Pollution Control Board Consent to Establish/Operate conditions.
- Incident reporting via site-level app → corporate dashboard, reviewed monthly by Head–QHSE and Director–Operations. Root cause via 5-Why and fishbone; corrective actions tracked to closure and circulated as lessons-learned bulletins.

---

## 9. Certifications & accreditations [p.14]

| Certification | Certifying body | Valid until |
|---|---|---|
| ISO 9001:2015 — Quality Management | TUV India | March 2027 |
| ISO 14001:2015 — Environmental Management | TUV India | March 2027 |
| ISO 45001:2018 — Occupational Health & Safety | TUV India | March 2027 |
| Contractor Class I-A (Civil), PWD Maharashtra | Public Works Department | **December 2026** |
| MSME (Udyam) registration | Ministry of MSME | Perpetual, subject to renewal |
| Approved Vendor — State Electricity Transmission Utility | State Utility Empanelment Cell | 2028 |

> **Expiry watch:** the PWD Maharashtra Class I-A registration expires **December 2026** — the nearest expiry on record, roughly four months after the document date. Any tender requiring PWD Class I-A with a submission or execution date beyond December 2026 needs renewal evidence, not this certificate. ISO certificates all expire March 2027.

---

## 10. Past project experience [p.13]

| Project | Client | Value (INR Cr) | Duration | Status |
|---|---|---|---|---|
| 48 MLD Water Treatment Plant, Nashik | Nashik Municipal Corporation | 62.4 | 22 months | Completed 2022 |
| Two-Lane Bridge over River Bhima | Public Works Department, Maharashtra | 51.3 | 24 months | Ongoing |
| 12 km Sewerage Pipeline Network, Solapur | Maharashtra Jeevan Pradhikaran | 44.2 | 18 months | Completed 2023 |
| Industrial Warehouse Complex, Chakan | Private auto-component manufacturer | 38.7 | 14 months | Completed 2023 |
| Rural Road Network Package (56 km) | State Rural Development Department | 34.5 | 20 months | Completed 2020 |
| 25 MW Solar EPC (BoP), Osmanabad | Independent Power Producer | 29.8 | 10 months | Completed 2024 |
| Grid Substation (132/33 kV), Bhubaneswar | State Electricity Transmission Utility | 22.1 | 16 months | Completed 2021 |
| Effluent Treatment Plant Upgrade, Ankleshwar | Private chemicals manufacturer | 18.6 | 12 months | Ongoing |

Representative selection only; complete list with completion certificates at Annexure G [p.13].

### 10.1 Sector-wise experience, last 7 years [p.13]

| Sector | Projects | Cumulative value (INR Cr) |
|---|---|---|
| Water & Wastewater Infrastructure | 11 | 412.6 |
| Industrial & Process EPC | 9 | 356.2 |
| Roads, Bridges & Urban Infrastructure | 7 | 298.4 |
| Renewable Energy / Substations | 6 | 187.9 |
| **Total** | **33** | **1,255.1** *(derived: sum of rows)* |

---

## 11. Client references [p.15]

Contacts have consented to be approached directly to verify performance.

| Client organization | Contact | Project reference |
|---|---|---|
| Nashik Municipal Corporation | Executive Engineer, Water Supply Dept. | 48 MLD WTP, Nashik |
| Maharashtra Jeevan Pradhikaran | Deputy Engineer, Solapur Division | Sewerage Pipeline Network |
| Independent Power Producer (name withheld — NDA) | Head – Project Execution | 25 MW Solar EPC |
| State Electricity Transmission Utility | Divisional Engineer (Civil) | Grid Substation, Bhubaneswar |

---

## 12. Litigation & debarment declaration [p.16]

As at the document date:

- **Not** blacklisted or debarred by any Central/State Government department, PSU, or autonomous body.
- **No** contract terminated for default in the last five years.
- **Not** under insolvency proceedings under the Insolvency and Bankruptcy Code, 2016.
- **One commercial arbitration pending** — a variation claim on a completed contract. Stated not to relate to workmanship or default; details available on request.

A signed declaration on company letterhead, in each tender's prescribed format, is prepared per bid submission.

> **Agent note:** the pending arbitration is disclosed only on p.16. Page 5 separately states there are "no unresolved statutory notices, blacklisting orders, or debarment" — which is consistent (an arbitration is none of those three things), but an agent reading only p.5 would answer a "declare all pending disputes" question incorrectly. Always resolve dispute-disclosure questions against §12, not §3.

---

## 13. Qualification-relevant summary

The values most frequently tested by tender eligibility criteria, consolidated so agents don't have to re-derive them. All trace to sections above.

| Criterion type | Meridian's position | Basis |
|---|---|---|
| Average annual turnover (5 yr) | INR 290.18 Cr | [§3.1](#31-derived-financial-metrics) |
| Net worth | INR 119.8 Cr | [§3](#3-financial-standing-p7) |
| Solvency / credit line | INR 62 Cr undrawn BG; INR 145 Cr total facility | [§3.2](#32-banking--bonding-capacity-p7) |
| **Largest single completed project** | **INR 62.4 Cr** (48 MLD WTP Nashik, 2022) | [§10](#10-past-project-experience-p13) |
| Largest project of any status | INR 51.3 Cr ongoing / 62.4 Cr completed | [§10](#10-past-project-experience-p13) |
| Quality/environment/safety certification | ISO 9001 + 14001 + 45001, all valid to March 2027 | [§9](#9-certifications--accreditations-p14) |
| Safety record | LTIFR 0.24, zero fatalities (FY 2024-25) | [§8.1](#81-safety-performance-p12) |
| Debarment status | Clean; one unrelated arbitration pending | [§12](#12-litigation--debarment-declaration-p16) |
| Mobilization lead time | 15–30 days from award | [§5](#5-key-personnel-p9) |

### 13.1 Known qualification ceiling — "similar work" criteria

Many EPC tenders require one completed project worth **≥ 50% of the bid value**. Meridian's largest completed project is INR 62.4 Cr, which sets a hard standalone ceiling:

> **Derived:** 62.4 ÷ 0.50 = **INR 124.8 Cr maximum bid value** qualifying standalone under a "≥50% of bid value, one completed project" rule.

Above that threshold, the technical/experience criterion **fails standalone** and can only be closed via a JV or consortium *where the tender permits one*. Bonding capacity implies a separate, higher ceiling (~INR 300 Cr cumulative, [§3.2](#32-banking--bonding-capacity-p7)), so experience — not finance — is this bidder's binding constraint on large tenders.

This is the gap the EBTSL reference fixture is designed to expose (see the Bid/No-Bid Advisor PRDs in [business_docs/](business_docs/), which target a `CONDITIONAL BID` outcome on exactly this reasoning). Agents should expect it, and must still cite it rather than asserting it from this note alone.

---

## 14. Coverage & known gaps

What this single source document does **not** establish. Per [tender-intake.md](agents/skills/tender-intake.md), these are `UNKNOWN` — not zero, not inferable, and not to be filled by assumption.

| Category | Coverage | Gap |
|---|---|---|
| Company profile & capability | Strong | — |
| Financial standing | Strong | No FY 2025-26 figures; document dated August 2026 |
| Compliance & certifications | Strong | PWD Class I-A expires Dec 2026 |
| Operational / plant / personnel | Strong | — |
| Contracting positions | **Absent** | No standard contract positions — no payment-term preference, no LD cap position, no liability-cap policy, no acceptable-deviation register. [commercial.md](agents/skills/commercial.md) requires these to assess deviations and **must return `UNKNOWN` rather than assume a default.** |
| Pricing / cost library | **Absent** | No unit rates, no rate card, no historical cost data, no margin floor, no contingency policy. [accountant.md](agents/skills/accountant.md) cannot price anything from this document — this is the charter's Open Question #2 still open. |
| Risk appetite | **Absent** | No stated risk policy or approval thresholds. Affects [risk.md](agents/skills/risk.md) and [leadership.md](agents/skills/leadership.md). |
| **Cybersecurity** | **Absent** | Nothing on data protection, IT/OT security controls, incident response, or security certification. Not a missed extraction — the source document has no such content. |
| Bid history / outcomes | **Absent** | Past projects are listed, but no bid-vs-won record, no losses, no realized-vs-estimated cost. Charter §6 calibration is not possible from this document. |

**Highest-value documents to add next**, in order of how much they unblock: (1) commercial policy / standard contract positions, (2) a rate card or historical cost data, (3) cybersecurity policy, (4) bid history with outcomes.

---

## 15. Extraction notes

Fidelity issues from parsing the source PDF, recorded so downstream agents don't mistake truncation for fact.

- **Truncated — GST state registrations** [p.5]: source table reads "27ABCDE1234F1Z5 (Maharashtra); additional state registrations held for Gujarat, Te…" — the row is cut off mid-word at the table boundary. Gujarat is confirmed; the third state is very likely Telangana (consistent with the Hyderabad regional office, [p.3]) but is **not confirmed** and must not be asserted.
- **Truncated — bankers** [p.5]: "State Bank of India, Pune Industrial Estate Branch; HDFC Bank, Corporate Banking, …" — branch detail for HDFC is cut off.
- **Overseas markets unspecified** [p.3]: "select overseas markets" is claimed with no countries named. Cannot answer a jurisdiction-specific experience question from this.
- **Annexures A–J not supplied** [p.17]: the profile references ten annexures (org chart, audited financials, solvency certificate, no-debarment declaration, CVs, asset register, completed-project list with certificates, ISO certificates, registration copies, power of attorney). **None are in the repository.** Every "evidence available at Annexure X" claim in this file is currently an unevidenced pointer — if a tender demands the underlying certificate, the answer is that it is not on file.
- **Single-source memory**: every fact here comes from one document. No contradictions exist yet because there is nothing to contradict against. The first second document ingested is what will make the contradiction-detection path meaningful.
