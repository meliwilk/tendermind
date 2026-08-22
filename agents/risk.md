# Business Risk Management Agent — Specification

## Role

**Question the agent answers:** *What is our overall exposure, and should we walk away?*

This is the synthesis agent (§4: it runs last in the DAG and consumes the other three agents' outputs, not the raw tender documents directly). It does not do its own document extraction — its job is to weigh what legal, civil, and accounting already found, combine it with bid history, and produce the one number and one recommendation a decision-maker actually needs. Per §3.3, the same extract/compute split applies here as everywhere else: **this agent emits weighted risk factors; a deterministic scoring function turns them into `overall_risk_pct`.** The agent must never state that percentage as a bare LLM judgment call.

## What `overall_risk_pct` means — resolving Open Question #1

The charter (§5.4, §10 Q1) flags that this number is meaningless until its definition is fixed. It is defined here as:

> **A weighted composite risk index, 0–100, built from the risk register's weighted factor scores, normalized across categories.**

It is explicitly **not**:
- A probability of losing money on the contract
- A predicted cost overrun percentage
- Any other statistically calibrated forecast

The reason is stated in §6 of the charter: with fewer than ~50 completed bids, TenderMind has no basis for calibrated probability estimates, and a fabricated probability is worse than none — it gets trusted and it's wrong. A composite index describes *how much and how severe* the flagged risk is, without pretending to predict an outcome. If bid history ever grows large enough to support real calibration (§6), that would be a new, separately-named field (e.g. `modeled_loss_probability`) — never a silent redefinition of `overall_risk_pct`.

## Scope — inputs this agent reads

- Legal agent output (`findings[]`, `blocking_issues[]`, `overall_assessment`)
- Civil agent output (`technical_findings[]`, `capability_gaps[]`, `schedule_assessment`, `feasibility_rating`)
- Accounting agent output (`cash_flow_profile`, `cost_breakdown`, `assumptions[]`, `estimate_confidence`)
- Bid history (§6): hit rate by project type/size/owner, estimate-accuracy drift, competitiveness (gap to winning bid on past losses), and — specifically for counterparty risk — this owner's payment history and prior dispute record if the bidder has worked with them before
- Bid pipeline: other live opportunities competing for the same delivery capacity

It does **not** re-read the tender documents. If a risk factor requires a citation, it cites the *upstream agent's finding ID*, not a document page — traceability runs through the agent that actually found it (see `source_findings` in the output schema).

## Risk register categories

Each category below should always be evaluated, even when the answer is "no material risk identified" — silent omission is not allowed (§3.4).

### 1. Contractual / legal
Pulled from the legal agent's `findings[]`. A `critical` or `high` legal finding becomes a risk register entry here; its severity is not re-judged by this agent, only re-expressed as likelihood × impact for scoring consistency.

### 2. Technical / constructability
Pulled from the civil agent's `technical_findings[]` and `feasibility_rating`. A `not_feasible_as_scoped` rating is a hard signal, not just one more weighted factor (see [Hard overrides](#hard-overrides)).

### 3. Schedule
From the civil agent's `schedule_assessment`, cross-referenced against the legal agent's liquidated-damages findings — a compressed schedule matters far more when LDs are uncapped than when they're capped at 5% of contract value.

### 4. Financial / cash flow
From the accounting agent's `cash_flow_profile` and `cost_breakdown` — working-capital exposure from payment terms and retention, not the bid price itself (that's an output of pricing, not a risk register input).

### 5. Counterparty
Owner's payment history and dispute record from bid history, where the bidder has prior experience with this owner. Funding source certainty (confirmed budget vs. contingent/subject-to-approval funding) if stated in the tender package via the legal or civil agent's extraction.

### 6. Market
Material and labor cost escalation exposure — read directly off the accounting agent's `escalation` extraction (fixed-price with no index-linking, in an inflationary market, is a market risk factor even though accounting itself doesn't flag it as one). Labor/plant availability constraints noted by the civil agent.

### 7. Capability fit
From the civil agent's `capability_gaps[]`, plus what civil doesn't have visibility into: the bidder's *bonding/surety capacity* remaining after concurrent commitments, and reputational fit (has the bidder successfully delivered this class of work before, per bid history).

### 8. Opportunity cost
Whether pursuing this bid consumes capacity that a higher-probability or higher-margin opportunity in the current pipeline would otherwise use. This is the one category with no upstream agent source — it's read directly from the bid pipeline and is inherently a judgment call; mark its `confidence` accordingly.

## Scoring methodology

1. Each risk register entry gets a `likelihood` (mapped from a qualitative band to a midpoint value) and an `impact` (mapped to a numeric weight):

| Likelihood band | Range | Midpoint |
|---|---|---|
| Rare | 0–10% | 0.05 |
| Unlikely | 10–30% | 0.20 |
| Possible | 30–50% | 0.40 |
| Likely | 50–70% | 0.60 |
| Near-certain | 70–100% | 0.85 |

| Impact band | Weight |
|---|---|
| Low | 1 |
| Medium | 2 |
| High | 3 |
| Severe | 4 |

2. `weighted_score = likelihood_midpoint × impact_weight` per entry (matches the charter's example, §5.4).
3. The **deterministic scoring function** (not this agent) sums weighted scores per category, normalizes across the eight categories, and produces `overall_risk_pct` on a 0–100 scale. This agent's job stops at producing well-formed risk register entries with defensible likelihood/impact assignments and citations back to source findings — the aggregation math lives in code that's unit-tested like the pricing engine.
4. `risk_band` is a fixed mapping from the resulting score:

| Score | Band |
|---|---|
| 0–20 | low |
| 21–40 | moderate |
| 41–60 | moderate-high |
| 61–80 | high |
| 81–100 | severe |

## Hard overrides

Some upstream findings should never be "averaged away" by a composite score. Regardless of the computed `overall_risk_pct`:

- Any legal `blocking_issues[]` entry forces `recommendation` to at least `bid_with_conditions`, never `bid`, until resolved.
- Civil `feasibility_rating: not_feasible_as_scoped` forces `recommendation` to `no_bid` unless the civil agent's information requests are resolved and the tender re-analyzed.
- `overall_assessment: insufficient_information` from either legal or civil forces `recommendation` to `escalate_for_review` — an incomplete package should not produce a confident number in either direction.

## Output schema

```json
{
  "agent": "risk",
  "schema_version": "1.0",
  "overall_risk_pct": 34,
  "risk_pct_definition": "weighted_composite_index",
  "risk_band": "moderate-high",
  "recommendation": "bid_with_conditions",
  "risk_register": [
    {
      "id": "RSK-002",
      "category": "financial",
      "description": "60-day payment terms with 10% retainage against a 14-month schedule.",
      "likelihood_band": "likely",
      "likelihood_midpoint": 0.6,
      "impact_band": "high",
      "impact_weight": 3,
      "weighted_score": 1.8,
      "source_findings": ["LGL-004", "ACC-011"],
      "mitigation": "Price working capital cost into indirects; negotiate retainage reduction at 50% completion.",
      "confidence": 0.85
    }
  ],
  "recommended_contingency_pct": 8.5,
  "recommended_margin_pct": 12.0,
  "hard_overrides_applied": [],
  "go_no_go_rationale": "...",
  "unknowns": []
}
```

`recommendation` is one of: `bid`, `bid_with_conditions`, `escalate_for_review`, `no_bid`.

`recommended_contingency_pct` and `recommended_margin_pct` feed forward into the accounting agent's pricing engine buildup (see [accountant.md](accountant.md)) — like `overall_risk_pct`, these should be derived by a documented, deterministic band-to-percentage mapping (e.g. `risk_band` → base contingency range), with this agent's LLM pass limited to selecting within a band and explaining why, not inventing the band itself.

## What this agent must never do

- Never state `overall_risk_pct` as a direct LLM judgment — it must be the output of the deterministic scoring function applied to this agent's risk register (§3.3).
- Never present `overall_risk_pct` as, or allow it to be described downstream as, a probability of loss or a win probability. Bid-history-based statistics (§6) belong in separate, explicitly-labeled fields once there's enough data to support them (~50+ completed bids) — and even then, they're presented as descriptive stats ("won 4 of 7 comparable projects"), not fabricated single-number probabilities.
- Never let a high composite score be smoothed into a `bid` recommendation by averaging against unrelated low-risk categories — see [Hard overrides](#hard-overrides).
- Never add a risk register entry without a `source_findings` reference into an upstream agent's output, except for category 8 (opportunity cost), which must instead carry a lower `confidence` reflecting its lack of a citable source.
- Never silently omit one of the eight categories — report "no material risk identified" explicitly rather than leaving it out.
