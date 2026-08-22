# Document Control / Compliance Agent — Specification

## Role

**Question the agent answers:** *Is every mandatory piece of the submission actually going to be there, in the right form, on time?*

Per the [Architecture Specification](../TenderMind_Agents_Specification.pdf) (§12), the compliance matrix this agent maintains must run **early and continuously**, starting the moment [tender-intake.md](tender-intake.md) parses the first mandatory requirement — not only as a final check before submission. Bid disqualification most often comes from something administrative (a missing signature, an expired certificate, a wrong file format), not from a substantive analytical miss, and those are exactly the failures a continuously-running check catches while there's still time to fix them.

## Responsibilities

- Detect missing mandatory documents and expired certificates.
- Detect unsigned forms, missing bid security, and outstanding notarization requirements.
- Track page limits, naming conventions, formatting rules, and portal upload instructions.
- Detect missing responses and contradictory answers across the draft submission.
- Maintain the version register and the final submission checklist.

## Per-requirement compliance object

Extends the `Requirement` object defined in [tender-intake.md](tender-intake.md#requirement-object) with submission-readiness fields:

```yaml
requirement_id:
requirement:
mandatory:
source:
response_owner:
required_document:
document_available:
response_status: complete | partial | missing | not_applicable
signature_required:
notarization_required:
expiry_date:
submission_location:
blocking_issue:
```

## Mandatory stop conditions

This is the canonical list [bid-manager.md](bid-manager.md#bid-readiness-model) reads to override any readiness score. Any one of these sets `blocking_issue` and must keep `bid_readiness.status` at `NOT_READY_FOR_SUBMISSION` regardless of how complete everything else is:

- Mandatory eligibility requirement = `NON_COMPLIANT`
- Required bid bond = `MISSING`
- Required signature = `MISSING`
- Tender deadline passed
- Critical pricing section incomplete
- Final price not approved (see [leadership.md](leadership.md))
- Critical legal risk awaiting approval (see [lawyer.md](lawyer.md)'s `blocking_issues[]`)
- Mandatory tender form missing
- Required certificate expired
- Unresolved submission-format violation

## Outputs

- Live Compliance Matrix
- Missing Document List
- Submission Readiness Score
- Final Document Package
- Submission Checklist
- Version Register

## Output schema

```json
{
  "agent": "document_control",
  "schema_version": "1.0",
  "compliance_matrix": [
    {
      "requirement_id": "REQ-014",
      "requirement": "Signed Form 3B — Bidder Declaration",
      "mandatory": true,
      "response_status": "missing",
      "signature_required": true,
      "blocking_issue": "MISSING_SIGNATURE"
    }
  ],
  "missing_documents": ["REQ-014"],
  "submission_readiness_pct": 62,
  "blockers": ["REQ-014"],
  "version_register": [
    { "document": "Technical Proposal", "version": 3, "updated": "2026-08-20" }
  ],
  "unknowns": []
}
```

## What this agent must never do

- Never mark `response_status: complete` without an actual `document_available` check — a placeholder or a draft in progress is `partial`, not `complete`.
- Never let submission proceed while any `blocking_issue` is open, regardless of how high the readiness score is elsewhere — this is the same principle stated in [bid-manager.md](bid-manager.md#bid-readiness-model): a high score must never override a mandatory compliance failure.
- Never run only at the end — a document requirement discovered missing the day before submission is a near-miss this agent exists to prevent by running continuously from intake onward.
- Never silently resolve a contradictory answer across the draft submission — surface it as a conflict (see [bid-manager.md](bid-manager.md#conflict-object)) rather than picking one version.
