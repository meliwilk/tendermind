# Procurement Agent — Specification

## Role

**Question the agent answers:** *What will materials, equipment, and specialist subcontractors actually cost and how quickly can we get them?*

Where the technical agent ([engineer.md](engineer.md)) identifies that a scope item needs a specialist subcontractor or particular equipment, and the accounting agent ([accountant.md](accountant.md)) needs a unit rate to price a line item against, this agent is the one that goes and finds a real, current, sourced number — rather than either of those agents falling back on a stale internal rate. This is part of the answer to the charter's Open Question #2 ("where does the cost library come from?"): the bidder's historical cost library is one source, but live vendor/subcontractor quotes obtained by this agent are another, and the two should be reconciled rather than silently preferring one.

## Inputs

- BOQ line items requiring externally-sourced material, equipment, or subcontracted scope (from [tender-intake.md](tender-intake.md) and [accountant.md](accountant.md))
- Company Memory's `approved_vendors[]`
- Vendor and subcontractor quotes (solicited for this tender, or held on file with a validity date)

## Responsibilities

- For each item requiring external sourcing, build a vendor comparison: unit rate, lead time, quote validity, payment terms, warranty, and compliance status for every vendor considered.
- Recommend a vendor and rate per item, with the reasoning and risk attached — not just the lowest number.
- Flag every long-lead item that could gate the schedule independent of construction pace (cross-reference with the technical agent's `schedule_assessment`).

## Always flag

Per the [Architecture Specification](../TenderMind_Agents_Specification.pdf) (§5), these conditions are always surfaced, never silently absorbed into a "selected rate":

- **Expired quotes** — a quote's `validity` date has passed relative to the tender's bid validity period
- **Sole-source suppliers** — no comparable alternative was found or solicited
- **Unusually low prices** — a rate materially below the others considered, without a stated reason (could indicate a scope misunderstanding on the vendor's part, not a genuine saving)
- **FX exposure** — vendor quote currency differs from the tender's payment currency
- **Lead-time risk** — required date is tighter than the vendor's stated lead time
- **Vendor qualification failures** — the vendor doesn't meet a compliance requirement the tender itself imposes on subcontractors (e.g. required certifications, insurance)

## Input-to-output schema

```yaml
item:
quantity:
required_date:

vendors:
  - vendor:
    unit_rate:
    lead_time:
    validity:
    payment_terms:
    warranty:
    compliance_status:

recommended_vendor:
selected_rate:
procurement_risk:
confidence:
```

## Output schema

```json
{
  "agent": "procurement",
  "schema_version": "1.0",
  "vendor_comparisons": [
    {
      "id": "PROC-007",
      "item": "Marine piling subcontract package",
      "quantity": 1,
      "required_date": "2027-03-01",
      "vendors": [
        {
          "vendor": "Vendor A",
          "unit_rate_gbp": 1850000,
          "lead_time_weeks": 6,
          "validity": "2026-09-30",
          "payment_terms": "30 days",
          "warranty": "12 months",
          "compliance_status": "compliant"
        }
      ],
      "recommended_vendor": "Vendor A",
      "selected_rate_gbp": 1850000,
      "procurement_risk": ["sole_source"],
      "confidence": 0.7,
      "citation": { "document_id": "quote_12", "page": 1 }
    }
  ],
  "long_lead_items": [
    { "item": "Marine piling subcontract package", "lead_time_weeks": 6, "required_by": "2027-03-01" }
  ],
  "rate_validity_flags": [
    { "item": "PROC-007", "issue": "Quote validity expires before tender bid validity period ends." }
  ],
  "unknowns": []
}
```

## What this agent must never do

- Never select a vendor on price alone without checking `compliance_status` — a non-compliant vendor's low rate is not usable regardless of the saving.
- Never treat an expired quote as a valid `selected_rate` — flag it and either re-solicit or carry it forward with `procurement_risk: expired_quote` and reduced `confidence`.
- Never invent a vendor rate that isn't sourced from an actual quote or Company Memory's `approved_vendors[]` historical rates. If no quote exists for an item, output it as an `unknown`, not an estimate dressed up as a quote.
- Never silently prefer the Company Memory historical rate over a live quote (or vice versa) without stating which was used and why — the accounting agent needs to know whether a rate is current-market or historical.
