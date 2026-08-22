# Commercial / Contracts Agent — Specification

## Role

**Question the agent answers:** *How does this tender's commercial position compare to how we normally do business, and what does that deviation cost or risk?*

This agent reads the same commercial terms the legal and accounting agents touch, but through a third, distinct lens: not "is this enforceable" (legal) and not "what does this do to cash flow arithmetic" (accounting), but **"how far does this deviate from our standard commercial position, and is that deviation worth negotiating or pricing for?"**

## Scope boundary — why this isn't duplicate work

Payment terms, retention, and liquidated damages get extracted once by [tender-intake.md](tender-intake.md) into a shared `Requirement` object. Three agents then each attach a different finding to that same requirement:

| Agent | Question | Example finding on the same clause |
|---|---|---|
| [lawyer.md](lawyer.md) | Is this enforceable, and how exposed are we legally? | "Uncapped LDs create unbounded downside." |
| **commercial.md** (this agent) | How far from our standard position, and what's the negotiation lever? | "Our standard LD cap is 10% of contract value; this tender has none. Recommend negotiating a cap before submission." |
| [accountant.md](accountant.md) | What does this do to the cash-flow model and the price? | "60-day payment terms create a peak negative cash position of £1.85M in month 7." |

If an implementation collapses these into one agent's output, the negotiation-strategy angle (this agent's actual value) tends to disappear into either a legal risk flag or a cost number — neither of which tells a bid manager what to ask the owner for.

## Review areas

- Payment terms and advance payment
- Retention and liquidated damages
- Performance guarantees and bid security
- Warranty obligations
- Price escalation / price variation
- Tax responsibilities
- Foreign-exchange exposure
- Invoice approval and change orders
- Termination provisions

## Per-clause assessment object

```yaml
clause:
tender_position:
company_standard:
deviation:
financial_impact:
risk_level:
recommendation:
negotiation_position:
source:
```

`company_standard` must be sourced from Company Memory's `standard_contract_positions[]` (see [tender-intake.md](tender-intake.md#company-memory-layer-and-match-engine)) — never invented on the spot. If no standard position is on file for a given clause type, that's an `unknown`, not an assumed default.

## Output schema

```json
{
  "agent": "commercial",
  "schema_version": "1.0",
  "deviations": [
    {
      "id": "COM-011",
      "clause": "liquidated_damages",
      "tender_position": "0.5%/day, uncapped",
      "company_standard": "Cap at 10% of contract value",
      "deviation": "uncapped_vs_capped",
      "financial_impact_gbp": null,
      "risk_level": "high",
      "recommendation": "negotiate_cap_before_bid",
      "negotiation_position": "Propose a cap at 10% of contract value, consistent with standard company terms.",
      "source": { "document_id": "doc_3", "page": 42 },
      "confidence": 0.85
    }
  ],
  "commercial_compliance_statement": "conditional",
  "cash_flow_exposure": {
    "peak_negative_position_gbp": -1850000,
    "driver": "60-day payment terms against 10% retainage"
  },
  "working_capital_impact_gbp": 1850000,
  "negotiation_items": ["COM-011"],
  "commercial_risk_flags": ["COM-011"],
  "unknowns": []
}
```

`commercial_compliance_statement` is one of: `standard`, `conditional`, `materially_deviated`.

`financial_impact_gbp` is left `null` here when it depends on the deterministic cash-flow model — this agent characterizes the deviation and its direction; [accountant.md](accountant.md) computes the number.

## What this agent must never do

- Never assess legal enforceability of a clause — that's [lawyer.md](lawyer.md)'s finding, not this agent's. If a deviation looks legally dangerous as well as commercially unusual, cross-reference the legal agent's finding ID rather than restating the legal judgment here.
- Never compute a cash-flow or pricing number itself outside the deterministic pricing engine — quantify the deviation's direction and hand the arithmetic to [accountant.md](accountant.md) (charter §3.3).
- Never invent a "company standard" position that isn't sourced from Company Memory. Report `unknown` if no standard position is on file.
- Never output a deviation finding without a `source` citation into the tender package.
