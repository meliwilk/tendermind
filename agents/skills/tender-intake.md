# Tender Intake / Parsing Agent — Specification

## Role

**Question the agent answers:** *What does this tender package actually say, structured so every other agent can work from the same facts?*

Per the [Architecture Specification](../TenderMind_Agents_Specification.pdf) (§1, §3), TenderMind does not go straight from "tender uploaded" to "specialist agents analyze." This agent runs first, converting raw documents into a structured **Tender Workspace** — the shared state object every other agent reads and writes against, so no two agents reconstruct the tender independently and a fact changing upstream can be traced to everyone who depended on it (see [Event-driven recalculation](bid-manager.md#event-driven-recalculation-and-staleness) in bid-manager.md).

**Guardrail (verbatim from the Architecture Specification, §3):** this agent performs extraction and classification, not qualification, pricing, legal interpretation, or bid decisions. It builds the Requirement Registry; it does not decide whether any requirement is satisfied.

## Inputs

- Tender PDF / RFP / RFQ documents
- BOQ spreadsheets
- Drawings and technical appendices
- General/special conditions of contract and draft contract
- Corrigenda / addenda
- Submission instructions

## Responsibilities

- Extract tender metadata and every deadline (submission, clarification, pre-bid meeting, bid validity).
- Parse technical scope and requirements into individual `Requirement` objects.
- Extract BOQ lines and quantities.
- Identify eligibility and qualification criteria.
- Extract mandatory forms and submission documents.
- Extract contractual and commercial clauses (raw extraction only — see [Scope boundary with downstream agents](#scope-boundary-with-downstream-agents)).
- Identify securities, guarantees, penalties, payment terms, and evaluation methodology.
- Preserve source location (document/page/section/clause) for every extracted requirement — nothing enters the workspace without a citation.
- Run the **Company Memory Match Engine** (below) to produce a first-pass compliance map before any specialist agent starts.

## Scope boundary with downstream agents

Several clause types (payment terms, LDs, warranty, licensing) get extracted here once into a single `Requirement` object, then read by multiple specialist agents that each add their own lens:

| Agent | Lens |
|---|---|
| [lawyer.md](lawyer.md) | Legal enforceability and risk exposure |
| [commercial.md](commercial.md) | Deviation from company standard commercial position, financial/negotiation impact |
| [accountant.md](accountant.md) | Cash-flow and pricing consequence |
| [engineer.md](engineer.md) | Constructability / technical feasibility |

This agent does not adjudicate which lens is "right" — it extracts the clause once, cites it once, and lets each specialist attach its own finding referencing the same `requirement_id`. This avoids the same clause being extracted three times with three slightly different quotations of the same text.

## Shared Tender Workspace

All agents read and write against this single structured state object.

```yaml
tender:
  tender_id:
  title:
  issuing_authority:
  tender_type:
  submission_deadline:
  clarification_deadline:
  pre_bid_meeting:
  bid_validity:
  estimated_contract_value:
  currency:
  submission_method:

requirements: []          # Requirement objects, below
technical_requirements: []
commercial_terms: []
legal_clauses: []
eligibility_requirements: []
boq_items: []
mandatory_documents: []
company_matches: []       # from the Match Engine, below
company_gaps: []
vendor_quotes: []
assumptions: []           # see bid-manager.md's Assumption object
clarifications: []        # see bid-manager.md's Clarification object
risks: []                 # populated by risk.md
decisions: []             # see bid-manager.md's Decision object
agent_outputs: {}

compliance_status:
  total_requirements:
  compliant:
  partial:
  non_compliant:
  unknown:

bid_status:
  stage:
  completion_percentage:
  blockers: []
```

## Requirement object

The atomic unit every specialist agent's finding attaches to. This agent creates it; specialists set `status` and `company_evidence` once they run.

```yaml
requirement_id: REQ-001
category: technical | commercial | legal | financial | eligibility | submission
requirement: "Bidder must demonstrate five years of similar project experience."
source:
  document:
  page:
  section:
  clause:
mandatory: true
response_required: true
company_evidence: []      # populated by the Match Engine and/or the responsible specialist
status: compliant | partial | non_compliant | unknown
responsible_agent:        # which specialist agent owns resolving this requirement
risk_if_unmet:
clarification_required: false
notes:
```

`status` starts as `unknown` when this agent creates the requirement. The Match Engine may resolve simple, objectively-computable requirements immediately (see below); anything requiring judgment is left `unknown` for the responsible specialist agent to set.

## Company Memory layer and Match Engine

Company Memory is a persistent intelligence layer underneath every tender-specific agent — populated via the "Add Company Knowledge" flow (see [frontend/src/components/AddCompanyKnowledgeDrawer](../../frontend/src/components/AddCompanyKnowledgeDrawer)), not rebuilt per tender. This section defines the logical schema; for how it's actually persisted before the real database exists (ingestion diff handling, coverage scoring, the Bid History Store, and the temporary storage contract), see [memory.md](../../memory.md).

```yaml
company:
  name:
  countries:
  industries:
  capabilities:
certifications:
  - name:
    certificate_number:
    issue_date:
    expiry_date:
    document_reference:
projects:
  - project_name:
    customer:
    scope:
    value:
    start_date:
    completion_date:
    similarity_tags:
    evidence:
equipment: []
employees: []
standard_rates: []
approved_vendors: []
legal_registrations: []
standard_contract_positions: []
risk_policy: []
```

**Match Engine:** every extracted requirement is automatically matched against Company Memory as soon as it's created, producing a first-pass compliance map before any specialist begins drafting.

```yaml
# Tender requirement:
# "Bidder must demonstrate at least three similar projects
#  above $10M completed during the last five years."

requirement: REQ-029
required:
  minimum_projects: 3
  minimum_value: 10000000
  period: 5 years
matching_projects:
  - Project Alpha
  - Project Delta
match_count: 2
status: NON_COMPLIANT
gap: "Only two qualifying projects found."
recommended_action: "Determine whether JV/consortium experience is permitted."
```

A gap the Match Engine surfaces routes automatically to [document-control.md](document-control.md), [lawyer.md](lawyer.md), [bid-manager.md](bid-manager.md), and [risk.md](risk.md) — a human should not have to re-enter it into each specialist's context by hand.

## Output schema

```json
{
  "agent": "tender_intake",
  "schema_version": "1.0",
  "tender_name": "Southern Region Maintenance Framework",
  "buyer": "Network Rail",
  "deadline": "2026-09-17T12:00:00Z",
  "contract_duration": "68 weeks",
  "estimated_value": { "amount": 42000000, "currency": "GBP" },
  "submission_method": "portal",
  "bid_security": { "type": "bond", "value_pct": 2.5 },
  "performance_security": { "type": "bond", "value_pct": 10 },
  "evaluation_method": "most_economically_advantageous_tender",
  "requirements": ["REQ-001", "REQ-002"],
  "clarification_questions": [],
  "unknowns": []
}
```

## What this agent must never do

- Never assess whether a requirement is satisfied beyond what the Match Engine can resolve from objective, structured Company Memory data (project count, certificate validity dates). Anything requiring judgment is `status: unknown` until a specialist agent runs.
- Never interpret legal enforceability, price anything, or make a bid recommendation — extraction and classification only (Architecture Specification §3).
- Never create a `Requirement` object without a `source` citation.
- Never let two agents extract the same clause independently into diverging text — extract once, let specialists attach findings to the shared `requirement_id`.
