# TenderMind

Tender intelligence that remembers your business.

TenderMind ingests a construction tender package (multi-document PDF set) and produces a structured, source-cited bid recommendation — routed through four specialist agents (legal, civil, accounting, risk) with a deterministic pricing engine underneath. See [TENDER_ASSISTANT.md](TENDER_ASSISTANT.md) for the full project charter: problem statement, architecture, agent specs, and work breakdown.

## Status

Early build. The project charter is agreed; the frontend has a working scaffold with the first two components implemented against real state.

## Repository layout

```
TENDER_ASSISTANT.md   # project charter — architecture, agents, milestones, open questions
TenderMind.html        # UI design mockup (Claude Design canvas export)
demo_files/             # sample tender package used for local testing
frontend/               # React + TypeScript app (Vite)
```

## Frontend

Stack: React 19, TypeScript, Vite, CSS Modules.

```bash
cd frontend
npm install
npm run dev
```

Implemented so far:

- **Add Company Knowledge** (`src/components/AddCompanyKnowledgeDrawer`) — drag-and-drop / file-picker upload into Company Memory, document-type tagging, ingestion progress, and contradiction resolution between conflicting source documents.
- **New Tender** (`src/components/NewTenderModal`) — create a tender record (name, documents, deadline, owner) and trigger analysis against Company Memory.

Both are typed, prop-driven components (no hardcoded data) so they can be wired to a real backend as it comes online.

```bash
npm run lint   # oxlint
npx tsc -b     # typecheck
npm run build  # production build
```

## Data handling

Tender packages and company knowledge are commercially sensitive by default — see §9 of the charter for retention, encryption, and audit-logging expectations before handling real customer documents.
