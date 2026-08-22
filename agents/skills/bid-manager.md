# Business Development / Bid Manager Agent — Specification

## Role

**Question the agent answers:** *Where does this bid actually stand, what's blocking it, and what needs a human decision right now?*

Per the [Architecture Specification](../TenderMind_Agents_Specification.pdf) (§10), this agent — like the risk agent ([risk.md](risk.md)) — is primarily a **coordinator and synthesizer, not a free-form content generator**. It doesn't extract from tender documents and doesn't draft response content. It tracks progress across every other agent, detects when their outputs conflict, and assembles what a human decision-maker actually needs to see. This file also documents the cross-cutting mechanisms this agent owns on behalf of the whole system: inter-agent messaging, conflict handling, execution state tracking, and bid readiness.

## Progress tracking state

```yaml
bid_sections:
  technical:
  commercial:
  legal:
  pricing:
  eligibility:
  forms:
  approvals:

# each section:
status:
owner:
deadline:
blockers:
completion:
```

## Conflict detection

This agent is where a mismatch between two other agents' outputs becomes visible instead of silently resolving in whichever agent happened to run last. Examples from the Architecture Specification (§7, §10):

```
Technical Agent: 12-month project duration
Commercial Agent: contract requires 9 months
Estimation Agent: priced 10 months
=> Escalate schedule/cost inconsistency

Procurement: vendor quote valid for 30 days
Tender: bid validity is 180 days
=> Pricing exposure detected

Technical: requires 3 cranes for 12 months
Estimation: priced 2 cranes for 8 months
=> Must become a conflict, not a silent correction (see accountant.md)
```

Every other agent spec in this project ([lawyer.md](lawyer.md), [engineer.md](engineer.md), [accountant.md](accountant.md), [commercial.md](commercial.md), [procurement.md](procurement.md), [risk.md](risk.md)) is written to raise a conflict here rather than resolve a cross-agent disagreement on its own authority.

## Inter-agent contracts

### Message object

```yaml
message_id:
from_agent:
to_agent:
type: information | request | conflict | risk | clarification | decision_required | completed_output
priority: low | medium | high | critical
related_requirement_ids: []
payload:
source_references: []
requires_response:
deadline:
```

### Conflict object

```yaml
conflict_id:
agents: [Technical, Estimation]
issue:
agent_positions:
financial_impact:
schedule_impact:
compliance_impact:
recommended_resolution:
decision_owner:
status: open | resolved
```

### Assumption object

Every agent that has to assume something to keep moving (rather than blocking on a clarification) logs it here rather than embedding it silently in a finding.

```yaml
assumption_id:
agent:
assumption:
reason:
financial_impact:
risk_if_wrong:
requires_validation:
validation_owner:
status: open | confirmed | rejected
```

### Clarification question object

The RFI mechanism referenced throughout [engineer.md](engineer.md) and [tender-intake.md](tender-intake.md) is formalized here so every agent's clarification requests land in one place instead of being drafted ad hoc per-agent.

```yaml
clarification_id:
tender_clause:
question:
reason:
related_agents:
impact_if_unanswered:
deadline:
priority:
```

## Confidence system — a known inconsistency to reconcile

The Architecture Specification uses a four-band qualitative confidence system:

| Band | Meaning |
|---|---|
| `HIGH` | Direct tender/company evidence exists |
| `MEDIUM` | Reasonable interpretation supported by partial evidence |
| `LOW` | Insufficient information, or an assumption is required |
| `UNKNOWN` | No reliable evidence |

This agent and the four newly-added agents ([tender-intake.md](tender-intake.md), [procurement.md](procurement.md), [commercial.md](commercial.md), [leadership.md](leadership.md), [document-control.md](document-control.md)) use this band system. **The original four agents ([lawyer.md](lawyer.md), [engineer.md](engineer.md), [accountant.md](accountant.md), [risk.md](risk.md)) instead use a numeric `confidence` float from 0–1.** This wasn't reconciled as part of adding these agents — flagging it here rather than silently picking one. Whoever implements the orchestration layer needs to either standardize on one system or define a documented mapping between them before confidence values are compared across agents (e.g. in the Bid Manager dashboard's low-confidence visibility rule, below).

**Visibility rule (unaffected by which system is chosen):** low-confidence conclusions from any agent should automatically surface in this agent's dashboard rather than requiring a human to go hunting per-agent for them.

## Human approval gates and execution states

*Approval gates:*

| Gate | Question |
|---|---|
| 1 — Bid Qualification | Pursue / do not pursue, after initial tender analysis |
| 2 — Technical & Eligibility Feasibility | Can we realistically comply before significant bid effort? |
| 3 — Commercial & Legal Risk | Are the deviations acceptable? |
| 4 — Pricing Approval | Approve final price, margin, and contingency |
| 5 — Submission Approval | Authorize final bid submission |

**Control boundary:** TenderMind must not cross Gate 4 or Gate 5 without explicit authorization from an approved human decision-maker (charter §3.5; see [leadership.md](leadership.md) for who holds that authority).

*Agent execution states:*

```
WAITING → READY → RUNNING → COMPLETED
                 ↘ BLOCKED / NEEDS_INPUT / NEEDS_APPROVAL / FAILED
(any COMPLETED state) → STALE, on upstream invalidation
```

`STALE` is the critical state in a dependency-driven system: if an upstream fact changes, every downstream conclusion built on it may no longer be valid and must be visibly marked as such rather than silently left looking current.

## Event-driven recalculation and staleness

```
Procurement updates a steel price
  → Procurement: COMPLETED
  → Estimation: STALE
  → Risk Matrix: STALE
  → Bid Manager Summary: STALE
  → Leadership Pricing Approval: STALE
```

A change anywhere in the dependency chain — a vendor quote update, an addendum, a corrected quantity — cascades forward. A prior Leadership approval built on now-stale inputs must be re-surfaced for re-approval, not left standing on outdated numbers.

## Bid readiness model

```json
{
  "bid_readiness": {
    "overall": 78,
    "technical": 94,
    "commercial": 82,
    "legal": 100,
    "pricing": 87,
    "documents": 62,
    "eligibility": 91,
    "critical_blockers": 2,
    "status": "NOT_READY_FOR_SUBMISSION"
  }
}
```

**A high readiness score must never override a mandatory compliance failure.** `critical_blockers > 0` forces `status: NOT_READY_FOR_SUBMISSION` regardless of how high `overall` scores — see [document-control.md](document-control.md#mandatory-stop-conditions) for the canonical blocker list this agent reads.

## Decision object

Where a conflict or a low-confidence finding needs a human call rather than an agent-level resolution:

```yaml
decision_id:
topic:
options:
recommended_option:
financial_effect:
risk_effect:
deadline:
decision_owner:
status:
```

## Outputs

- Master Bid Tracker
- Agent Conflict Register
- Outstanding Decisions
- Missing Information
- Bid Readiness Score
- Leadership Review Pack
- Consolidated Draft Bid

## What this agent must never do

- Never resolve a material cross-agent conflict silently by picking a side — raise a `Conflict` object with a `decision_owner` instead.
- Never let a high `bid_readiness.overall` score suppress or outrank a mandatory compliance blocker.
- Never advance the bid past Gate 4 or Gate 5 without a recorded human approver.
- Never draft tender response content itself — that's downstream of this agent's coordination role, not part of it.
- Never leave a `STALE` agent output presented to a human as if it were current.
