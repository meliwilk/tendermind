# Accounting / Estimating Agent — Specification

## Role

**Question the agent answers:** *What does this cost us, and what do we submit?*

This agent is the one place in the system where the "LLM extracts, deterministic code computes" rule (§3.3 of [TENDER_ASSISTANT.md](../TENDER_ASSISTANT.md)) is load-bearing rather than a nice-to-have. **The agent must never be asked "what should we bid?" and hand back a number.** It extracts structured cost records from the tender package; a separate, unit-tested pricing engine turns those records into a price; the agent's only job afterward is to narrate what the engine computed. If an implementation collapses these into one LLM call that "estimates the bid," it has violated the core design principle of the whole project — treat that as a build defect, not a shortcut.

## Pipeline

1. **Extract** (this agent, LLM): line items, quantities, units, allowances, provisional sums, exclusions, payment terms, escalation clauses — structured records, no arithmetic performed by the model.
2. **Price** (pricing engine, deterministic): bidder's cost library unit rates × extracted quantities → direct cost.
3. **Build up** (pricing engine, deterministic): direct cost → indirects → overhead → contingency → margin → bid price. Contingency and margin percentages are **inputs the pricing engine receives from the risk agent's output** (§5.3) — this agent does not set them and must not embed a guessed contingency into any output.
4. **Explain** (this agent, LLM, second pass over the engine's output): narrate the buildup in plain language, identify the largest cost drivers, and flag the assumptions most likely to be wrong.

Steps 1 and 4 are this agent's responsibility. Steps 2 and 3 belong to the pricing engine (Appendix A: `/backend/pricing`) and are out of scope here except as a consumer of their output.

## Scope — documents this agent reads

- Bill of quantities (BOQ) / pricing schedule
- Payment terms and commercial schedule
- Scope of works, to the extent needed to reconcile BOQ line items against described scope
- Escalation, index-linking, and currency clauses
- Dayworks / variation rate schedules
- Alternates or options requiring separate pricing

It does **not** interpret legal enforceability of payment terms (legal agent) or judge constructability (civil agent) — it extracts the commercial facts those terms represent. Where a BOQ quantity conflicts with what the civil agent would expect from the drawings, that conflict is the civil agent's finding to raise; this agent notes the extraction as-is and flags the ambiguity as an `unknown` rather than resolving it.

## Extraction checklist

### 1. Line items
- Description, quantity, unit of measure for every priced item
- Items described but left unquantified ("as required," "to be confirmed") — extract as a line item with `quantity_stated: false` rather than inventing a number
- Alternates/options the tender requires pricing separately from the base bid

### 2. Provisional sums & prime cost sums
- Value and scope description of every provisional/PC sum — these represent undefined scope the bidder is not pricing in detail, and the buildup must carry them at face value, not attempt to "improve" the estimate underneath them
- Whether provisional sums are included in or excluded from the bidder's overhead/margin base (contract-specific and often stated in the conditions — cross-reference with the legal agent if ambiguous)

### 3. Dayworks & variation pricing
- Labor, plant, and material dayworks rates required in the submission
- Any pre-agreed uplift/discount percentages on dayworks rates

### 4. Payment & cash flow terms
- Payment cycle and valuation dates
- Retention percentage and release trigger(s) (practical completion, defects period end, etc.)
- Advance payment terms and any bond required to secure them
- Pay-when-paid/pay-if-paid mechanics (extract the mechanic; the legal agent assesses its enforceability)

### 5. Escalation & currency
- Fixed-price vs. index-linked pricing, and which index applies
- Currency of payment vs. currency of major cost inputs (labor, imported materials) — a mismatch is FX exposure
- Material price fluctuation clauses and their trigger thresholds

### 6. Exclusions & qualifications
- Everything the tender documents explicitly exclude from scope
- Anywhere the bidder is expected to state assumptions or qualifications in the submission — extract these as required outputs, not optional ones

### 7. Preliminaries / indirect cost drivers
- Site establishment requirements (office, welfare facilities, security) and stated duration
- Mobilization/demobilization requirements
- Named insurance and bonding costs (sourced from the legal agent's findings on required cover)

## Output schema

Two outputs: the extraction record that feeds the pricing engine, and the post-pricing explanation returned to the user.

### Extraction record (input to pricing engine)

```json
{
  "agent": "accounting",
  "schema_version": "1.0",
  "stage": "extraction",
  "line_items": [
    {
      "id": "LI-014",
      "description": "Reinforced concrete pile caps",
      "quantity": 42,
      "unit": "no.",
      "quantity_stated": true,
      "citation": { "document_id": "doc_4", "page": 8, "excerpt": "..." },
      "confidence": 0.92
    }
  ],
  "provisional_sums": [
    { "id": "PS-002", "description": "Utility diversions", "value_gbp": 180000, "citation": { "document_id": "doc_4", "page": 11 } }
  ],
  "payment_terms": {
    "cycle": "monthly",
    "retention_pct": 5,
    "retention_release": "50% at practical completion, 50% at end of defects period",
    "citation": { "document_id": "doc_5", "page": 3 }
  },
  "escalation": { "type": "fixed_price", "index": null },
  "exclusions": ["Off-site utility connections beyond the site boundary"],
  "required_qualifications": ["Bidder must state assumed ground conditions if no survey is provided"],
  "unknowns": ["Dayworks rate schedule referenced in Section 6 but not included in the package."]
}
```

### Explanation output (after the pricing engine has run)

```json
{
  "agent": "accounting",
  "schema_version": "1.0",
  "stage": "explanation",
  "cost_breakdown": {
    "direct_cost_gbp": 31200000,
    "indirects_gbp": 2400000,
    "overhead_gbp": 1580000,
    "contingency_gbp": 2860000,
    "contingency_pct_applied": 8.5,
    "margin_gbp": 4080000,
    "margin_pct_applied": 12.0
  },
  "recommended_bid_range": { "low_gbp": 40800000, "target_gbp": 42100000, "high_gbp": 43600000 },
  "expected_margin_pct": 12.0,
  "cash_flow_profile": {
    "peak_negative_position_gbp": -1850000,
    "peak_month": 7,
    "driver": "60-day payment terms against upfront plant mobilization and material procurement"
  },
  "cost_drivers": [
    { "line_item_id": "LI-014", "share_of_direct_cost_pct": 14.2, "note": "Largest single driver; quantity extracted with high confidence." }
  ],
  "assumptions": [
    "Pile cap quantity assumes ground conditions per Section 3; no geotechnical survey was included in the package."
  ],
  "estimate_confidence": 0.74
}
```

`contingency_pct_applied` and `margin_pct_applied` are echoed from the risk agent's output for traceability — this agent reports them, it does not set them.

## Confidence & unknowns

Every extracted line item, provisional sum, and term carries its own `confidence`. Low-confidence extractions (ambiguous quantity, conflicting figures between BOQ and drawings, a referenced schedule not included in the package) must appear in `unknowns[]` rather than being silently defaulted to a best guess (§3.4). The pricing engine should treat an unresolved `unknown` that maps to a required line item as a reason to hold `estimate_confidence` down, not as a zero.

## What this agent must never do

- Never compute or state a bid price, margin, or contingency percentage itself — those come from the deterministic pricing engine and the risk agent respectively (§3.3).
- Never invent a unit cost. Unit costs come from the bidder's cost library (Open Question #2 in the charter — resolve where that library comes from before this agent can price anything).
- Never fill an unquantified line item with an assumed quantity — extract it as `quantity_stated: false` and let a human resolve it.
- Never output a line item, provisional sum, or term without a `citation`. An unsourced finding is dropped at validation (§3.2).
- Never treat a provisional sum as an opportunity to estimate the underlying scope in more detail than the tender documents themselves support.
