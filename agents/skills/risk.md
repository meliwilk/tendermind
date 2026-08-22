# Risk Matrix Agent — Specification

## Role

**Question the agent answers:** *What is our overall exposure, and should we walk away?*

This is the synthesis agent (§4 of [TENDER_ASSISTANT.md](../../TENDER_ASSISTANT.md): it runs downstream in the DAG and consumes other agents' outputs, not the raw tender documents directly). Per the [Tender Bid Agents Architecture Specification](../TenderMind_Agents_Specification.pdf) (§9), it is **a consolidator, not a content generator** — use synthesis/conflict prompting, not drafting prompting, when implementing it. It does not do its own document extraction, and per §3.3 of the charter, the same extract/compute split applies here as everywhere else: this agent proposes risk register entries with a likelihood and impact; a deterministic scoring function turns those into risk scores and the contingency recommendation. The agent must never state a score as a bare LLM judgment call.

## How TenderMind represents risk — resolving Open Question #1

An earlier version of this spec defined a single `overall_risk_pct` (0–100 composite index) for the whole tender. **That field is retired.** TenderMind instead adopts the per-risk scoring model from the [Architecture Specification](../TenderMind_Agents_Specification.pdf) (§9): every individual risk gets its own `likelihood × impact` score, and there is no single blended percentage for the tender as a whole.

Why: a single composite number has the same false-precision problem the charter warns about for win probability (§6) — it collapses eight-plus distinct exposure categories (legal, schedule, financial, counterparty...) into one figure, which invites a reader to treat it as a probability regardless of what the field is labeled, and it hides which specific risk actually drove the number. A scored, ranked register that a human can act on entry-by-entry is more honest about what the system actually knows. The decision-relevant aggregates that used to hang off `overall_risk_pct` (contingency sizing, the bid/no-bid recommendation) are now derived directly and traceably from the register instead — see [Deterministic aggregates](#deterministic-aggregates-computed-not-asserted).

## Scope — inputs this agent reads

- Legal agent output ([lawyer.md](lawyer.md): `findings[]`, `blocking_issues[]`, `overall_assessment`)
- Technical/civil agent output ([engineer.md](engineer.md): `technical_findings[]`, `capability_gaps[]`, `schedule_assessment`, `feasibility_rating`)
- Commercial/contracts agent output ([commercial.md](commercial.md): commercial deviations, cash-flow exposure, working-capital impact)
- Estimation/accounting agent output ([accountant.md](accountant.md): `cost_breakdown`, `assumptions[]`, `estimate_confidence`)
- Procurement agent output ([procurement.md](procurement.md): procurement risks, rate validity flags, sole-source/FX exposure)
- Bid history: hit rate by project type/size/owner, estimate-accuracy drift, competitiveness (gap to winning bid on past losses), and this owner's payment/dispute history where the bidder has prior experience with them
- Bid pipeline: other live opportunities competing for the same delivery capacity

It does **not** re-read the tender documents. Every risk register entry cites the *upstream agent finding ID* that produced it (`source_findings`), not a document page — traceability runs through the agent that actually found the underlying fact.

## Risk register categories

Each category below should always be evaluated, even when the answer is "no material risk identified" — silent omission is not allowed (charter §3.4).

1. **Contractual / legal** — from the legal agent's `findings[]`.
2. **Technical / constructability** — from the technical agent's `technical_findings[]` and `feasibility_rating`.
3. **Schedule** — from the technical agent's `schedule_assessment`, cross-referenced against the legal agent's liquidated-damages findings.
4. **Financial / cash flow** — from the commercial agent's payment-term and retention findings and the accounting agent's `cost_breakdown`/cash flow figures.
5. **Counterparty** — owner payment/dispute history from bid history; funding-source certainty from the tender intake extraction.
6. **Market** — escalation/currency exposure from the accounting agent's extraction, plus the procurement agent's FX exposure, sole-source, and lead-time flags.
7. **Capability fit** — from the technical agent's `capability_gaps[]` and the procurement agent's vendor/subcontractor availability findings, plus bonding/surety capacity remaining after concurrent commitments and reputational fit from bid history.
8. **Opportunity cost** — whether this bid consumes capacity a higher-probability or higher-margin pipeline opportunity would otherwise use. The one category with no upstream agent source; mark its `confidence` accordingly.

## Scoring methodology

Each risk register entry is scored on a 5×5 matrix, matching the [Architecture Specification](../TenderMind_Agents_Specification.pdf) (§9):

| Likelihood | Value |
|---|---|
| Rare (<10%) | 1 |
| Unlikely (10–30%) | 2 |
| Possible (30–50%) | 3 |
| Likely (50–70%) | 4 |
| Near-certain (>70%) | 5 |

| Impact | Value | Guide |
|---|---|---|
| Negligible | 1 | No material cost, schedule, or legal consequence |
| Minor | 2 | Absorbable within existing contingency |
| Moderate | 3 | Requires a specific mitigation or pricing response |
| Major | 4 | Materially affects margin or schedule; needs leadership visibility |
| Severe | 5 | Threatens the viability of the contract or the bidder's exposure is effectively unbounded |

`risk_score = likelihood × impact` (range 1–25), banded:

| Score | Band |
|---|---|
| 1–4 | Low |
| 5–9 | Moderate |
| 10–16 | High |
| 17–25 | Critical |

This agent assigns `likelihood` and `impact` per entry with a citation back to the source finding. It does not compute `risk_score` itself as free text — the multiplication and banding is deterministic and should be implemented as code, not trusted to the model's arithmetic (charter §3.3).

## Disagreement with upstream findings

Per the Architecture Specification (§9): *"The Risk Matrix may aggregate and prioritize; it must not silently override specialist conclusions. Material disagreement becomes a conflict."*

If this agent's likelihood/impact judgment would materially change the character of an upstream finding (e.g. the legal agent rated a clause `high`, but scoring it here would land at `impact: 5 / severe`), the agent does not just override that on its own authority. It raises a **conflict object** (§14 of the Architecture Specification) naming both positions and routes it to the Bid Manager for resolution, rather than quietly picking one.

## Hard overrides

Some findings should never be smoothed away by scoring. Regardless of individual risk scores:

- Any legal `blocking_issues[]` entry forces `recommendation` to at least `bid_with_conditions`, never `bid`, until resolved.
- Technical `feasibility_rating: not_feasible_as_scoped` forces `recommendation` to `no_bid` unless the technical agent's information requests are resolved and the tender re-analyzed.
- `overall_assessment: insufficient_information` from legal or technical forces `recommendation` to `escalate_for_review`.
- **Any single register entry scoring `Critical` (17–25)** forces `recommendation` to at least `bid_with_conditions`; two or more concurrent `Critical` entries force `escalate_for_review` as the floor.

## Deterministic aggregates (computed, not asserted)

These are derived from the risk register by code, not stated directly by the LLM:

- `top_risks[]` — the N highest `risk_score` entries.
- `heat_map` — a count of register entries per likelihood/impact cell, for the dashboard view described in the Architecture Specification (§9, "Risk Heat Map Data").
- `recommended_contingency_pct` — a base contingency banded to the highest `risk_band` present in the register, adjusted by the sum of each entry's `pricing_contingency` where set. This feeds the accounting agent's pricing engine (see [accountant.md](accountant.md)).
- `recommended_margin_pct` — similarly banded from the register's overall risk profile.
- `recommendation` — derived from the register plus the hard overrides above.

## Output schema

```json
{
  "agent": "risk",
  "schema_version": "2.0",
  "risk_register": [
    {
      "id": "RSK-002",
      "category": "financial",
      "description": "60-day payment terms with 10% retainage against a 14-month schedule.",
      "source_agent": "commercial",
      "source_findings": ["COM-011", "ACC-004"],
      "likelihood": 4,
      "likelihood_label": "likely",
      "impact": 3,
      "impact_label": "moderate",
      "risk_score": 12,
      "risk_band": "high",
      "financial_exposure_gbp": 1850000,
      "schedule_exposure_days": 0,
      "contractual_exposure": null,
      "mitigation": "Price working capital cost into indirects; negotiate retainage reduction at 50% completion.",
      "residual_risk_band": "moderate",
      "owner": "Finance Manager",
      "requires_leadership_decision": false,
      "pricing_contingency_pct": 1.2,
      "confidence": 0.85
    }
  ],
  "top_risks": ["RSK-002"],
  "heat_map": { "likelihood_4_impact_3": 1 },
  "recommended_contingency_pct": 8.5,
  "recommended_margin_pct": 12.0,
  "recommendation": "bid_with_conditions",
  "hard_overrides_applied": [],
  "conflicts_raised": [],
  "go_no_go_rationale": "...",
  "unknowns": []
}
```

`recommendation` is one of: `bid`, `bid_with_conditions`, `escalate_for_review`, `no_bid`.

## What this agent must never do

- Never compute `risk_score` itself as an LLM statement — it must be `likelihood × impact`, evaluated deterministically (charter §3.3).
- Never blend the register into a single tender-level percentage. If a decision-maker needs one number, that's a deterministic aggregate with a documented formula (contingency, margin), never an assertion of overall risk.
- Never silently override an upstream agent's severity judgment — raise a conflict object instead (see [Disagreement with upstream findings](#disagreement-with-upstream-findings)).
- Never let a `Critical`-banded entry be diluted by averaging against unrelated low-risk categories — see [Hard overrides](#hard-overrides).
- Never add a risk register entry without a `source_findings` reference, except for the opportunity-cost category, which must instead carry a lower `confidence` reflecting its lack of a citable source.
- Never silently omit one of the eight categories — report "no material risk identified" explicitly rather than leaving it out.
