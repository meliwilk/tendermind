# Company Memory & Bid History — Temporary Storage Specification

## Purpose

The real backend datastore (Postgres + `pgvector`, per [TENDER_ASSISTANT.md](TENDER_ASSISTANT.md) §4.2) doesn't exist yet. This document defines a **temporary, file-based implementation** of the same read/write contract the agents and frontend already assume, so agent development and UI integration aren't blocked on the database build. The contract — function signatures and record shapes — is meant to outlive this implementation: when the real database lands, callers should not need to change, only the storage layer underneath them.

Sourced from three places that didn't previously agree on one name for this thing:
- [agents/skills/tender-intake.md](agents/skills/tender-intake.md) — already defines Company Memory's logical schema and Match Engine, referred to there as "Company Memory."
- [business_docs/TenderMind_PRD.docx](business_docs/TenderMind_PRD.docx) (v2.0, the current UI-aligned PRD) — calls it "Company Memory," and specifies the ingestion diff engine, coverage scoring, and provenance behavior the frontend's [AddCompanyKnowledgeDrawer](frontend/src/components/AddCompanyKnowledgeDrawer) already implements the UI for.
- [business_docs/Tendermind_Bid_NoBid_Advisor_PRD.docx](business_docs/Tendermind_Bid_NoBid_Advisor_PRD.docx) and its [Consolidated](business_docs/Tendermind_Bid_NoBid_Advisor_Consolidated.docx) companion (the earlier v1.0 framing) — call the per-run persistence layer the "Bid History Store." No current agent spec actually defines this store's schema, despite [risk.md](agents/skills/risk.md) and [accountant.md](agents/skills/accountant.md) both citing "bid history" as an input.

This document treats Company Memory and the Bid History Store as **two record types in one temporary store**, not two systems — they were described separately across three documents written at different times, but nothing about their actual usage requires separate infrastructure.

## What's already specified elsewhere (not duplicated here)

- Company Memory's logical schema (company profile, certifications, projects, equipment, employees, standard rates, approved vendors, legal registrations, standard contract positions, risk policy) and the Match Engine that scores tender requirements against it — see [tender-intake.md](agents/skills/tender-intake.md#company-memory-layer-and-match-engine).
- The `Requirement` object and shared Tender Workspace — see [tender-intake.md](agents/skills/tender-intake.md#requirement-object).

## What this document adds

### 1. Ingestion diff engine

Per the PRD (v2.0, FR-5/FR-6) and the non-functional requirement stated there — *"Contradictions are surfaced, never silently resolved... Company Memory must never merge or average conflicting source values without a human decision"* — every document ingested into Company Memory must be diffed against current memory before being merged in:

- **New** — a fact with no prior value on record.
- **Updated** — a fact that supersedes a prior value without conflict (e.g. a renewed certificate with a later expiry date replacing an expired one).
- **Contradictory** — two sourced values that disagree and can't both be true (e.g. two policy documents stating different payment-term maximums).

Contradictions are never auto-merged or averaged. They're held open, with both conflicting values and their sources shown side by side, until a human picks a resolution. This is exactly the interaction already built in [AddCompanyKnowledgeDrawer.tsx](frontend/src/components/AddCompanyKnowledgeDrawer/AddCompanyKnowledgeDrawer.tsx) — the `Contradiction` type's `sources[]` and `onUseSource`/`onReviewSources` callbacks are this diff engine's UI surface, already built ahead of the backend that will drive it.

### 2. Coverage scoring

Per the PRD (v2.0, FR-7): overall memory coverage as a percentage, plus per-category coverage across at least Contracting, Pricing, Operational, Compliance, and Cybersecurity. Missing-information gaps are listed in plain language (e.g. "no OT security control documentation on file"), not just as a bare percentage — a number alone doesn't tell a user what to go upload next.

### 3. Onboarding checklist

Per the PRD (v2.0, FR-8): a dismissible, re-openable checklist tracking N of 6 onboarding steps complete (company profile, commercial rules, legal standards, compliance evidence, cybersecurity posture, subcontractor pricing — per the mockup's `onboardingSteps` in [TenderMind.html](TenderMind.html)). This is UI-facing state, not a new fact type — it's derived from coverage scoring, not stored independently.

### 4. Fact provenance

Per the PRD (v2.0, FR-9) and the non-functional requirement that provenance is universal — *"every fact, commercial rule, and drafted response sentence resolves to a specific source document + page/section, no exceptions."* Every record this store returns must carry enough citation data to answer "where did this come from" without a second lookup. This is the same citation discipline [lawyer.md](agents/skills/lawyer.md), [engineer.md](agents/skills/engineer.md), and every other agent spec already enforces on their own findings (§3.2 of the charter) — Company Memory facts are held to the identical standard, since a drafted response citing an unsourced "fact" is exactly the fabrication the charter's core principles exist to prevent.

### 5. Bid History Store

Per both Bid/No-Bid Advisor PRDs (Consolidated FR-30–FR-35; full PRD §7.13, FR-13.1–FR-13.3), this store persists **every completed tender run**, not just Company Memory facts:

- Source documents for that run
- Every agent's output (legal, technical, accounting, commercial, procurement, risk, leadership)
- The pricing engine's computed figures
- The final recommendation and its rationale
- Any human override, with the stated reason
- The eventual real-world outcome (bid submitted / declined; won / lost), when it becomes known

Retrieval must support filtering by client, tender value band, and scope similarity — this is what feeds the "comparable past tenders" context the orchestrator passes to agents on future runs (both PRDs' FR-10/FR-6.4), and what [risk.md](agents/skills/risk.md#risk-register-categories)'s counterparty category and the win-probability heuristic (PRD v2.0 FR-13) actually read from. Right now nothing in `agents/skills/` defines this schema even though several agents assume it exists — this closes that gap.

## Temporary storage implementation

No server, no migrations, no new dependency — plain JSON files on disk, one workspace per bidder organization (single-tenant only; matches the charter's Non-Goals §2 and the PRD's explicit hackathon scoping).

```
data/
  company_memory.json          # single object: profile + certifications + projects + ... (see tender-intake.md)
  contradictions/
    <contradiction_id>.json    # open until a human resolves it; moved to company_memory.json's audit trail on resolution
  bid_history/
    <run_id>.json              # one file per completed tender run
```

This is deliberately the simplest thing that satisfies the contract: human-readable, diffable in git during development, trivial to seed with the two reference fixtures already in this repo — the EBTSL documents in [demo_files/](demo_files/) and the Network Rail data bundled in the [TenderMind.html](TenderMind.html) mockup. If concurrent writes ever become a real problem (multiple users editing Company Memory simultaneously), the next stop before a full Postgres migration is SQLite, not a bigger JSON-locking scheme — but that's a decision to make when it's actually needed, not now.

## Interface contract

Language-agnostic signatures — implement in whatever the backend ends up being (charter §4.2 suggests Python/FastAPI):

```
get_profile_facts() -> ProfileFacts
get_commercial_rules() -> CommercialRules
get_coverage() -> { overall_pct, by_category: { contracting, pricing, operational, compliance, cybersecurity }, gaps: [string] }

ingest_document(document, doc_type) -> IngestResult
  # IngestResult: { new_facts: [], updated_facts: [], contradictions: [Contradiction] }

resolve_contradiction(contradiction_id, chosen_source_id) -> void
list_open_contradictions() -> [Contradiction]

record_bid_run(run: BidRunRecord) -> run_id
get_bid_run(run_id) -> BidRunRecord
query_bid_history(filters: { client?, value_band?, scope_tags? }) -> [BidRunRecord]
record_outcome(run_id, outcome: won | lost | declined | no_bid, details?) -> void
```

## What this store must never do

- Never auto-merge or average a contradiction — every conflicting fact is held open until a named human resolves it (this is the single non-negotiable rule carried over from the PRD's non-functional requirements).
- Never return a fact, rule, or bid history record without enough citation data to trace it to its source document.
- Never diverge in field names or nesting from what the eventual Postgres schema will need — the migration should be a data copy, not a rewrite of every caller. If a field's shape is genuinely undecided, mark it `TBD` in this doc rather than guessing a shape that later has to change.
- Never treat this as multi-tenant-safe. It's explicitly single-workspace, matching the charter's Non-Goals (§2) and every PRD's hackathon scoping.

## Migration path

When the real database lands, the interface contract above stays fixed; only its implementation changes. What that unlocks that the temporary version can't do well:

- **Real vector similarity search** for "comparable past tenders," instead of the naive heuristic (same client + overlapping value band + shared scope tags) the temporary `query_bid_history` filter uses. The PRD (v2.0 FR-13) explicitly accepts this heuristic as good enough for now: *"a simple heuristic (e.g. similarity-weighted past win rate) is acceptable for the hackathon."*
- Concurrent multi-user writes to Company Memory without file-locking workarounds.
- The bid-history statistics described in the charter §6 (hit rate, estimate-accuracy drift) becoming genuinely queryable instead of requiring a full scan of `bid_history/*.json`.
