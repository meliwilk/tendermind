# Civil Engineering Agent — Specification

## Role

**Question the agent answers:** *Can we actually build this, with our people and equipment, in the stated time?*

This agent reads the tender the way a senior estimator/construction manager would during a constructability review: hunting for the gap between what the documents assume and what building the project actually requires. Per [TENDER_ASSISTANT.md](../TENDER_ASSISTANT.md) §3.3, it extracts and assesses — it does not price anything (that's the accounting agent) and it does not decide go/no-go (that's the risk agent). Its most valuable output is often not a risk flag at all but a well-formed question back to the owner (§5.2): ambiguity caught before the bid is a free RFI; caught after award, it's a claim or a loss.

## Scope — documents this agent reads

- Technical specifications (all sections/divisions)
- Scope of works / employer's requirements
- Drawings — text, annotations, general arrangement and key details (not full CAD takeoff; that's out of scope per the charter's Non-Goals §2)
- Site investigation reports, geotechnical/ground condition surveys
- Existing utilities/services information
- Schedule, milestone dates, and sectional completion requirements
- Pre-construction health & safety information (e.g. CDM Pre-Construction Information pack)
- Addenda affecting any of the above

It does **not** read commercial/pricing schedules or legal conditions — those belong to the accounting and legal agents. Where a technical finding has cost or liability consequences (e.g. "this spec conflict will require a variation"), the agent notes the cross-reference and lets the accounting/legal agents own that side.

## Assessment checklist

### 1. Scope & document consistency
- Completeness and clarity of the scope of works — anything described only in general terms with no measurable boundary
- Specification vs. drawing conflicts: dimensional mismatches, material call-outs that don't match, quantities implied by drawings that don't match the BOQ item descriptions
- Drawings or spec sections marked "for information only," "indicative," or otherwise not for construction
- Conflicts introduced by addenda against the base issue

### 2. Site conditions & access
- Geotechnical/ground condition data: present, adequate, or absent (absent ground data on a project with foundations or earthworks is a material unknown, not a minor gap)
- Contamination surveys and remediation obligations
- Site access constraints — restricted hours, single point of access, live traffic/rail possessions, urban site limits on laydown area
- Existing buried services and required diversions
- Environmental constraints: protected species, flood zone designation, noise/vibration limits, working-hour restrictions
- Adjacent structures, party wall exposure, or structures requiring monitoring during works

### 3. Constructability
- Unusual construction methods or materials specified relative to the bidder's normal practice
- Sequencing that appears to conflict with a logical build order
- Temporary works implied by the design (shoring, propping, crane reach/capacity, falsework) and whether they're addressed in the package or left to the contractor
- Specialist trade requirements (piling, tunneling, marine works, rail possessions) and whether the bidder holds that capability directly or needs a specialist subcontractor
- Safety hazards flagged in the Pre-Construction Information that drive method or sequencing constraints

### 4. Schedule feasibility
- Stated duration against the scope's realistic productivity — flag where the schedule appears compressed relative to comparable past projects (cite the comparison; don't assert a productivity rate without a stated basis and confidence)
- Milestone and sectional completion dates, and whether they're achievable given the sequencing above
- Weather-sensitive or seasonal-window activities (e.g. concrete pours, marine works tidal windows)
- Long-lead procurement items (specialist equipment, custom fabrication) that could gate the schedule regardless of construction pace
- Interface dependencies on other contractors, statutory undertakers, or the owner's own supply items

### 5. Capability & resource fit
- Required plant/equipment against the bidder's fleet (owned vs. needs hiring)
- Labor/trade headcount required against the bidder's capacity and its other concurrent commitments (this is where bid history — §6 of the charter — is the input, not a guess)
- Certifications/accreditations the scope requires that the bidder may not currently hold
- Track record on genuinely comparable scope, pulled from bid history where available
- Subcontractor/supplier relationships needed — existing relationships vs. new sourcing required, and how much lead time that sourcing needs

### 6. Design maturity
- Design stage/maturity of the issued information (concept vs. detailed design) — earlier-stage design on a lump-sum tender is itself a risk signal, independent of any single spec conflict
- Provisional sums or undefined scope items that indicate design is incomplete, not just unpriced
- Elements issued as performance-specified (contractor to complete the design) vs. fully designed — flag for the legal agent, since this usually carries a design liability shift

### 7. Quality & compliance requirements
- Testing/inspection regime and hold points that affect sequencing or schedule float
- Applicable codes and standards, and their edition/version (a superseded standard cited in the spec is worth flagging)
- Digital delivery requirements (BIM level of information need, model formats) if they exceed the bidder's normal delivery method

## Output schema

```json
{
  "agent": "civil",
  "schema_version": "1.0",
  "feasibility_rating": "feasible_with_conditions",
  "technical_findings": [
    {
      "id": "CIV-011",
      "category": "site_conditions",
      "severity": "high",
      "summary": "No geotechnical survey included; foundation design assumes bearing capacity not evidenced in the package.",
      "why_it_matters": "Foundation redesign or ground improvement, if required, would not be reflected in the tendered price or programme.",
      "citation": { "document_id": "doc_2", "page": 14, "excerpt": "..." },
      "confidence": 0.8
    }
  ],
  "capability_gaps": [
    {
      "id": "CAP-003",
      "requirement": "Marine piling for jetty foundations",
      "bidder_status": "no_direct_capability",
      "basis": "Not present in bid history for the last 5 years",
      "mitigation": "Specialist subcontractor required; sourcing lead time ~4 weeks"
    }
  ],
  "schedule_assessment": {
    "stated_duration_weeks": 68,
    "estimated_duration_range_weeks": [72, 84],
    "basis": "Comparable scope on 3 prior projects in bid history",
    "confidence": 0.65,
    "key_drivers": ["marine piling mobilization", "possession windows limited to 8 per year"]
  },
  "information_requests": [
    {
      "id": "RFI-004",
      "question": "Please confirm whether a geotechnical survey exists for the jetty foundation area and, if so, provide it.",
      "reason": "Foundation design in the package assumes bearing capacity not evidenced by any included survey.",
      "citation": { "document_id": "doc_2", "page": 14 }
    }
  ],
  "unknowns": [
    "Drawing set references 'Structural GA Rev C' which was not included in the package."
  ]
}
```

`feasibility_rating` is one of: `feasible`, `feasible_with_conditions`, `not_feasible_as_scoped`, `insufficient_information`.

`bidder_status` (capability gaps) is one of: `no_direct_capability`, `partial_capability`, `capable_but_stretched`, `capable`.

## Severity rubric

| Severity | Meaning |
|---|---|
| `critical` | Missing information or a conflict that makes the scope unbuildable as documented, or a capability gap with no available mitigation |
| `high` | Material risk to cost, schedule, or safety that must be priced, mitigated, or resolved via RFI before submission |
| `medium` | Worth flagging and pricing a contingency for, but not bid-blocking on its own |
| `low` | Minor inconsistency, unlikely to affect cost or schedule |

Any `critical` finding, or three or more `high` findings concentrated in one category, should push `feasibility_rating` to `not_feasible_as_scoped` or `feasible_with_conditions` rather than a plain `feasible`.

## What this agent must never do

- Never assert a productivity rate, duration estimate, or capability judgment without citing its basis (bid history, or an explicit "no comparable basis — low confidence" statement per §3.4).
- Never output a finding without a `citation` into the tender package itself. An unsourced finding is dropped at validation (§3.2).
- Never fold cost consequence into a technical finding — describe the technical fact and let the accounting agent price it (§3.3: the LLM extracts, deterministic code computes).
- Never suppress an `information_requests[]` entry because the answer seems "probably fine" — an RFI is cheap before the bid and expensive after.
