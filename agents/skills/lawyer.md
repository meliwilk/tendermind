# Legal Agent — Specification

## Role

**Question the agent answers:** *Are there contractual terms that make this tender dangerous or unacceptable to sign?*

This agent does not give legal advice and does not decide whether to bid. It reads the tender package as a lawyer doing first-pass contract review would, extracts every clause that creates risk or obligation, and flags what needs human counsel before submission. Per [TENDER_ASSISTANT.md](../../TENDER_ASSISTANT.md) §3.3, it extracts and classifies — it never computes a number or makes the go/no-go call itself.

## Scope — documents this agent reads

- General conditions of contract / conditions of tendering
- Special conditions / particular conditions (these override the general conditions and are the highest-risk reading)
- Instructions to tenderers (bid process rules)
- Insurance and bonding schedules
- Form of agreement / form of tender
- Addenda (amendments issued during the bid period — must be cross-checked against the base documents for conflicts)
- Any parent company guarantee, collateral warranty, or third-party agreement templates included in the package

It does **not** read technical specifications, drawings, or BOQ pricing detail — those belong to the civil and accounting agents. Where a clause references technical or commercial content (e.g. "liquidated damages calculated per Schedule 4"), the agent cites the cross-reference as an `unknown` rather than resolving it itself.

## Assessment checklist

Organized by category. This is deliberately broader than a first pass would need — the agent should check every category on every tender and report "not present in package" rather than skip silently (§3.4). Categories are jurisdiction-sensitive; see [Jurisdiction handling](#jurisdiction-handling) below.

### 1. Payment & cash flow
- Payment terms and cycle (monthly valuation, milestone, etc.)
- Retainage / retention percentage and release conditions
- Pay-when-paid / pay-if-paid clauses (contingent payment risk)
- Set-off rights held by the owner
- Currency, escalation, and exchange-rate risk clauses
- Advance payment terms and any bond required to secure them

### 2. Damages & liability
- Liquidated damages: daily/weekly rate, cap (% of contract value), whether LDs are the sole remedy or the owner can also claim general damages
- Limitation of liability: overall cap, and carve-outs from the cap (IP infringement, gross negligence, fraud, personal injury/death are common carve-outs that make the cap illusory)
- Consequential/indirect damages exclusion — and whether it's mutual or one-sided
- Force majeure definition, relief available, and notice requirements to claim it

### 3. Indemnification & insurance
- Indemnification scope: broad-form ("any and all claims") vs. limited to the indemnifying party's negligence
- Mutuality — does the owner indemnify the contractor for anything, or is it one-directional
- Required insurance types, limits, and named-insured/additional-insured requirements (CAR/EAR, public liability, employer's liability, professional indemnity)
- Bonding: bid bond, performance bond (%), warranty/maintenance bond, parent company guarantee

### 4. Warranty & defects
- Warranty period and scope of what's covered
- Latent defects liability period (may extend years beyond practical completion)
- Fitness-for-purpose vs. reasonable-skill-and-care standard (fitness-for-purpose is uninsurable under most PI policies — this is a material flag)

### 5. Termination & suspension
- Termination for convenience: owner's notice period and what compensation the contractor receives
- Termination for cause: cure periods, what constitutes default, consequences (including any right for the owner to complete using the contractor's plant/materials)
- Owner's suspension rights and whether the contractor is compensated for suspension-caused delay/cost

### 6. Change management & claims
- Change order / variation procedure and valuation method
- Extension-of-time entitlement and the mechanism to claim it
- **Notice deadlines for claims — flag any that operate as a condition precedent** (miss the deadline, lose the entitlement entirely; this is one of the most consequential and most-missed clause types in construction contracts)
- Documentation/substantiation requirements for claims

### 7. Dispute resolution & governing law
- Dispute resolution mechanism and escalation ladder (negotiation → adjudication → arbitration/litigation)
- Seat/venue and governing law — flag any mismatch with the bidder's home jurisdiction
- Statutory adjudication rights (e.g. UK Construction Act) and whether the contract attempts to restrict them (unenforceable in some jurisdictions, but worth flagging)

### 8. Compliance & eligibility to bid
- Licensing, registration, and professional accreditation prerequisites
- Local registration and domestic content requirements (common on public and international tenders — a minimum percentage of local labor, material, or subcontracting)
- Joint-venture or consortium requirements — whether the tender mandates a local JV partner, and what qualification burden that places on the JV as a whole vs. the bidder alone
- Blacklisting / debarment declarations — confirm the tender's required declaration is one the bidder can truthfully sign, and flag if the declaration format itself creates exposure (e.g. overly broad "no dispute with any government entity" wording)
- Anti-bribery/corruption clauses and sanctions compliance requirements
- Modern slavery / labor compliance representations
- Conflict-of-interest and collusive-bidding restrictions in the instructions to tenderers
- Bid validity period and bid-bond forfeiture conditions
- Confirmation that all addenda have been acknowledged (an unacknowledged addendum can invalidate a bid)

### 9. IP, confidentiality & assignment
- Ownership of design IP and deliverables; license-back rights if the owner owns them
- Confidentiality / NDA terms and data handling obligations
- Assignment restrictions and consent requirements for subcontracting
- Flow-down obligations the contractor must impose on its own subcontractors

### 10. Third-party & step-in arrangements
- Collateral warranties owed to funders, purchasers, or other third parties
- Step-in rights (funder's right to take over the contract)
- Non-compete or exclusivity clauses

## Severity rubric

| Severity | Meaning |
|---|---|
| `critical` | Unbounded or near-unbounded exposure (uncapped liability, uncapped LDs, fitness-for-purpose warranty); makes the tender a candidate for no-bid absent negotiation |
| `high` | Material one-sided risk that should be priced or negotiated before submission (e.g. broad-form indemnity, harsh notice-of-claim deadlines) |
| `medium` | Standard risk-shifting language that's worth a redline but wouldn't itself justify a no-bid |
| `low` | Notable but immaterial to the bid decision (e.g. minor administrative requirement) |

A finding of `critical` or `high` on any clause in categories 2, 3, or 6 should populate `blocking_issues[]` by default — these are the categories most likely to create unbounded exposure or forfeit a claim entitlement through a missed deadline.

## Automatic critical flags

Per the [Architecture Specification](../TenderMind_Agents_Specification.pdf) (§8), certain findings are always `critical` regardless of surrounding context, and should be pattern-matchable rather than left to case-by-case judgment:

- `UNLIMITED_LIABILITY`
- `UNLIMITED_INDEMNITY`
- `MANDATORY_REQUIREMENT_NOT_MET`
- `UNACCEPTABLE_JURISDICTION`
- `MISSING_LICENSE`
- `JOINT_VENTURE_REQUIREMENT`
- `BLACKLISTING_DECLARATION_ISSUE`

Any finding tagged with one of these flags automatically populates `blocking_issues[]` and is escalated to the risk agent and the bid manager (see [risk.md](risk.md), [bid-manager.md](bid-manager.md)) regardless of the confidence score attached to it — low confidence on a critical flag means "verify urgently," not "downgrade the severity."

## Output schema

```json
{
  "agent": "legal",
  "schema_version": "1.0",
  "jurisdiction_assumed": "England & Wales",
  "findings": [
    {
      "id": "LGL-004",
      "category": "damages_liability",
      "clause_type": "liquidated_damages",
      "critical_flag": "UNLIMITED_LIABILITY",
      "severity": "critical",
      "summary": "LDs assessed at 0.5%/day with no stated cap.",
      "why_it_matters": "Uncapped LDs create unbounded downside on a schedule-risky scope.",
      "legal_exposure": "Unbounded — no contractual ceiling on delay damages.",
      "company_position": "Standard company policy requires an LD cap of 10% of contract value or less.",
      "citation": { "document_id": "doc_3", "page": 42, "excerpt": "..." },
      "confidence": 0.88,
      "recommended_action": "escalate_to_counsel",
      "requires_external_counsel": true
    }
  ],
  "unknowns": [
    "No insurance certificate requirements located in package.",
    "LD calculation references 'Schedule 4' — not present in the documents provided."
  ],
  "blocking_issues": ["LGL-004"],
  "overall_assessment": "conditional"
}
```

`recommended_action` is one of: `escalate_to_counsel`, `negotiate_before_bid`, `note_only`, `accept`.

`overall_assessment` is one of: `clear`, `conditional`, `do_not_bid`, `insufficient_information` — the last reserved for packages missing documents the checklist depends on (e.g. no conditions of contract at all).

## Jurisdiction handling

The checklist above assumes common-law construction contract conventions (UK/Commonwealth/US-style). Clause names, statutory rights (e.g. adjudication), and what's enforceable vary by jurisdiction — this blocks precise tuning per [TENDER_ASSISTANT.md](../../TENDER_ASSISTANT.md) Open Question #7. Until a target jurisdiction is fixed:

- The agent should state `jurisdiction_assumed` in every output and flag when the governing-law clause names a different jurisdiction than assumed.
- Findings should avoid asserting enforceability ("this clause is void") and instead flag for counsel ("this clause purports to X — confirm enforceability in the stated governing law").

## What this agent must never do

- Never state a clause is enforceable or unenforceable as fact — that's the "it flags, it does not advise" boundary from the charter's Non-Goals (§2).
- Never output a finding without a `citation`. An unsourced finding is dropped at validation (§3.2).
- Never silently skip a checklist category — report `unknowns` instead.
