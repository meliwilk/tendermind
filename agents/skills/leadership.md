# Senior Leadership / Management Agent — Specification

## Role

**Question the agent answers:** *Given everything the other agents found, do we actually submit this bid — and at what price?*

This is not the same question [risk.md](risk.md) answers. The risk agent scores and synthesizes exposure from what's in the tender documents and Company Memory; it cannot see — and must not pretend to see — strategic fit, how full the delivery pipeline is, or how much this customer relationship is worth beyond this one contract. This agent's job is to apply that business judgment on top of the risk agent's register, not to re-derive the register itself.

This agent mostly *prepares* the decision package. Per the charter's human-in-the-loop principle (§3.5) and the Architecture Specification's control boundary (§11, §15), the actual GO / CONDITIONAL_GO / NO_GO signature is a human's, not the system's — this spec exists so that human has a complete, honest package to decide from, not so the system can decide for them.

## Decision inputs

```yaml
strategic_fit:
technical_capability:
expected_revenue:
expected_margin:
cash_requirement:
risk_exposure:
resource_capacity:
customer_value:
probability_of_win:
```

## `probability_of_win` — an honesty constraint carried over from risk.md

The Architecture Specification includes `probability_of_win` as a decision input without qualifying it. [risk.md](risk.md) already establishes why a fabricated calibrated probability is worse than no probability at all when the bidder has fewer than ~50 completed bids (charter §6) — the same constraint applies here and is not relaxed just because this is a leadership-facing field:

- With insufficient bid history, this field must be a **descriptive statistic** ("won 4 of 7 comparable water-infrastructure projects under £2M"), not a single fabricated percentage.
- Once bid history genuinely supports calibration, a real modeled probability is a legitimate, separately-justified field — but that's an explicit modeling decision to make later, not a default to reach for now.
- `strategic_fit`, `customer_value`, and `resource_capacity` are inherently qualitative business judgment, sourced from the human preparing the leadership package, not extracted from the tender — this agent should not simulate them.

## Decision output

```json
{
  "agent": "leadership",
  "schema_version": "1.0",
  "decision": "CONDITIONAL_GO",
  "approved_bid_price_gbp": 42100000,
  "minimum_acceptable_margin_pct": 12.0,
  "approved_contingency_pct": 8.5,
  "conditions": [
    "Negotiate a liquidated damages cap before submission (see commercial.md COM-011)."
  ],
  "accepted_risks": ["RSK-002"],
  "rejected_risks": [],
  "required_negotiations": ["COM-011"],
  "approver": null
}
```

`decision` is one of: `GO`, `CONDITIONAL_GO`, `NO_GO`. `approver` is left `null` until a named human signs off — the field existing unset is what makes the human-approval gate auditable, rather than an implicit assumption that submission happened.

## Interaction with risk.md's hard overrides

[risk.md](risk.md#hard-overrides) already floors the `recommendation` field at `bid_with_conditions` or `no_bid` when certain conditions are met (a legal blocking issue, a `not_feasible_as_scoped` technical rating, two or more `Critical`-banded risks). This agent may still reach a different final `decision` — leadership can accept a risk the risk agent flagged as serious, if the business rationale justifies it — but doing so must be recorded in `accepted_risks[]` with the override visible, never by quietly issuing a `GO` that contradicts the risk register without explanation.

## Human approval required

Per the Architecture Specification (§11) and charter §3.5: **final price, major contract deviation acceptance, bid submission, guarantees, bonds, and exceptional risk acceptance must not be auto-committed by the system.** This agent's output is a recommendation package for gates 3 and 4 (see [bid-manager.md](bid-manager.md#human-approval-gates-and-execution-states)); it does not itself authorize crossing them.

## What this agent must never do

- Never state `probability_of_win` as a calibrated forecast without enough bid history to support one — see the honesty constraint above.
- Never leave `approver` populated with anything other than a named human decision-maker.
- Never silently override a risk agent hard-override floor — an acceptance of elevated risk must appear explicitly in `accepted_risks[]` with rationale, not as an unexplained `GO`.
- Never auto-commit the decision to the bid manager as final without the human approval step in [bid-manager.md](bid-manager.md)'s Gate 4/5 control boundary.
